// examples/integration.ts

import { UnifiedRoutePipeline } from '../core/unified-route-pipeline';
import { ProcessPipeline } from '../core/process-pipeline';
import { UnifiedPreHandlerFn, UnifiedHandlerFn } from '../types/unified-context';
import { ProcessMiddlewareFn } from '../types/process-pipeline';
import { complete, fail } from '../utils/process-helpers';

// ========================================
// Business Logic Pipeline
// ========================================

interface PaymentInput {
  amount: number;
  currency: string;
  paymentMethod: string;
}

interface PaymentOutput {
  transactionId: string;
  status: string;
  processedAmount: number;
}

const validateAmountMiddleware: ProcessMiddlewareFn<PaymentInput, PaymentOutput> = (ctx) => {
  if (ctx.input.amount <= 0) {
    fail(ctx, 'Amount must be positive');
  }
};

const processPaymentHandler: ProcessMiddlewareFn<PaymentInput, PaymentOutput> = async (ctx) => {
  // Simulate payment processing
  await new Promise(resolve => setTimeout(resolve, 100));

  complete(ctx, {
    transactionId: `txn-${Date.now()}`,
    status: 'success',
    processedAmount: ctx.input.amount
  });
};

const paymentPipeline = new ProcessPipeline<PaymentInput, PaymentOutput>()
  .use(validateAmountMiddleware)
  .setHandler(processPaymentHandler);

// ========================================
// HTTP Pipeline
// ========================================

const authPreHandler: UnifiedPreHandlerFn = (ctx) => {
  const token = ctx.request.headers['authorization'];

  if (!token) {
    ctx.response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  ctx.registry['userId'] = 'user-123';
};

const processPaymentHandler: UnifiedHandlerFn = async (ctx) => {
  const amount = ctx.request.body['amount'] as number;
  const currency = ctx.request.body['currency'] as string;
  const paymentMethod = ctx.request.body['paymentMethod'] as string;

  // ✅ เรียก business pipeline
  const result = await paymentPipeline.execute({
    amount,
    currency,
    paymentMethod
  });

  if (!result.success) {
    ctx.response.status(400).json({
      error: 'Payment failed',
      message: result.error?.message
    });
    return;
  }

  ctx.response.status(200).json({
    success: true,
    payment: result.output
  });
};

// Setup HTTP pipeline
const httpPipeline = new UnifiedRoutePipeline();
httpPipeline
  .addPreHandler(authPreHandler)
  .setHandler(processPaymentHandler);