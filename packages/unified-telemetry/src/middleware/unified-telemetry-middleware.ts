// middleware/unified-telemetry-middleware.ts
import { UnifiedMiddleware } from '@inh-lib/unified-route';
import { UnifiedHttpContextWithTelemetry, UnifiedTelemetryMiddlewareOptions } from '../types/unified-telemetry-context';
import { UnifiedTelemetryService } from '../services/unified-telemetry-service';

export class UnifiedTelemetryMiddleware {
  private readonly telemetryService: UnifiedTelemetryService;
  private readonly options: UnifiedTelemetryMiddlewareOptions;

  constructor(telemetryService: UnifiedTelemetryService, options: UnifiedTelemetryMiddlewareOptions = {}) {
    this.telemetryService = telemetryService;
    this.options = options;
  }

  createMiddleware(): UnifiedMiddleware {
    return async (context, next) => {
      // Start telemetry
      const telemetryContext = this.telemetryService.startRequestTelemetry(context, this.options);
      
      if (!telemetryContext) {
        // If telemetry is disabled or request should be skipped, just continue
        await next();
        return;
      }

      // Extend context with telemetry
      const contextWithTelemetry = context as UnifiedHttpContextWithTelemetry;
      contextWithTelemetry.telemetry = telemetryContext;

      let statusCode = 200; // Default status code

      try {
        // Capture original response methods to intercept status codes
        const originalStatus = context.response.status;
        context.response.status = (code: number) => {
          statusCode = code;
          return originalStatus.call(context.response, code);
        };

        await next();

      } catch (error) {
        // Record exception
        this.telemetryService.recordException(
          telemetryContext,
          error instanceof Error ? error : new Error(String(error)),
          this.options
        );

        statusCode = 500; // Set error status code
        throw error; // Re-throw to maintain error handling flow
      } finally {
        // Finish telemetry
        this.telemetryService.finishRequestTelemetry(
          telemetryContext,
          statusCode,
          this.options
        );
      }
    };
  }

  // Static factory method for easier usage
  static create(telemetryService: UnifiedTelemetryService, options?: UnifiedTelemetryMiddlewareOptions): UnifiedMiddleware {
    const middleware = new UnifiedTelemetryMiddleware(telemetryService, options);
    return middleware.createMiddleware();
  }
}