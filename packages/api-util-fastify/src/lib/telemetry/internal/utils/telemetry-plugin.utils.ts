import { randomUUID } from 'crypto';
import { FastifyRequest } from 'fastify';
import * as os from 'os';
import { ResourceUsageSnapshot, RequestResourceMetrics } from '../../types/telemetry.types';
import { SystemMetricsSnapshot } from '../types/telemetry-plugin.types';

export const generateRequestId = (): string => {
  return randomUUID();
};

export const extractRoutePattern = (request: FastifyRequest): string => {
  return request.routerPath || request.url;
};

export const extractUserAgent = (request: FastifyRequest): string => {
  return request.headers['user-agent'] || 'unknown';
};

export const shouldSkipTelemetry = (url: string, skipRoutes: string[]): boolean => {
  return skipRoutes.some(route => url.startsWith(route));
};

export const createSpanName = (method: string, route: string): string => {
  return `${method} ${route}`;
};

export const getStatusCodeCategory = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'redirect';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  if (statusCode >= 500) return 'server_error';
  return 'unknown';
};

export const sanitizeUrl = (url: string): string => {
  return url.split('?')[0];
};

export const extractContentType = (request: FastifyRequest): string => {
  return request.headers['content-type'] || 'unknown';
};

export const calculateResponseSize = (payload: unknown): number => {
  if (typeof payload === 'string') {
    return Buffer.byteLength(payload, 'utf8');
  }
  if (Buffer.isBuffer(payload)) {
    return payload.length;
  }
  if (payload) {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  }
  return 0;
};

// Resource tracking utilities
export const captureResourceSnapshot = (): ResourceUsageSnapshot => {
  return {
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    timestamp: Date.now()
  };
};

export const calculateResourceMetrics = (
  start: ResourceUsageSnapshot, 
  end: ResourceUsageSnapshot
): RequestResourceMetrics => {
  const memoryDelta = end.memoryUsage.heapUsed - start.memoryUsage.heapUsed;
  const cpuDelta = process.cpuUsage(start.cpuUsage);
  const cpuTimeMs = (cpuDelta.user + cpuDelta.system) / 1000; // Convert microseconds to milliseconds
  const duration = end.timestamp - start.timestamp;

  return {
    memoryDelta,
    cpuTimeMs,
    duration,
    heapUsed: end.memoryUsage.heapUsed,
    heapTotal: end.memoryUsage.heapTotal
  };
};

// System metrics utilities
export const getSystemMemoryUsage = (): number => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  return (usedMemory / totalMemory) * 100;
};

export const getSystemCpuUsage = (): Promise<number> => {
  return new Promise((resolve) => {
    const cpus = os.cpus();
    
    // Calculate initial CPU times
    let idleStart = 0;
    let totalStart = 0;
    
    cpus.forEach((cpu) => {
      Object.values(cpu.times).forEach((time) => {
        totalStart += time;
      });
      idleStart += cpu.times.idle;
    });

    // Wait 100ms and calculate again
    setTimeout(() => {
      const cpusEnd = os.cpus();
      let idleEnd = 0;
      let totalEnd = 0;
      
      cpusEnd.forEach((cpu) => {
        Object.values(cpu.times).forEach((time) => {
          totalEnd += time;
        });
        idleEnd += cpu.times.idle;
      });

      const idleDiff = idleEnd - idleStart;
      const totalDiff = totalEnd - totalStart;
      const cpuPercent = 100 - (idleDiff / totalDiff * 100);
      
      resolve(Math.max(0, Math.min(100, cpuPercent)));
    }, 100);
  });
};

export const createSystemMetricsSnapshot = async (hostname?: string): Promise<SystemMetricsSnapshot> => {
  const memoryUsagePercent = getSystemMemoryUsage();
  const cpuUsagePercent = await getSystemCpuUsage();
  
  return {
    memoryUsagePercent,
    cpuUsagePercent,
    timestamp: Date.now(),
    processId: process.pid,
    instanceId: hostname || os.hostname()
  };
};

// Metric categorization utilities
export const categorizeMemoryUsage = (memoryBytes: number): string => {
  const memoryMB = memoryBytes / (1024 * 1024);
  if (memoryMB < 1) return 'low';
  if (memoryMB < 10) return 'medium';
  if (memoryMB < 50) return 'high';
  return 'very_high';
};

export const categorizeCpuTime = (cpuTimeMs: number): string => {
  if (cpuTimeMs < 10) return 'low';
  if (cpuTimeMs < 50) return 'medium';
  if (cpuTimeMs < 100) return 'high';
  return 'very_high';
};

export const categorizeDuration = (duration: number): string => {
  if (duration < 100) return 'fast';
  if (duration < 500) return 'medium';
  if (duration < 1000) return 'slow';
  return 'very_slow';
};