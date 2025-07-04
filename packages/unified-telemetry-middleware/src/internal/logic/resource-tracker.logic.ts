// src/internal/logic/resource-tracker.logic.ts
/**
 * Resource tracking logic for CPU and memory monitoring
 */

import type { InternalResourceMeasurement } from '../types/middleware.types';
import { 
  getCurrentResourceMeasurement,
  calculateMemoryDelta,
  calculateCpuTimeDelta,
  microsecondsToSeconds,
  getSystemMemoryUsagePercent,
  getSystemCpuUsagePercent
} from '../utils/performance.utils';

/**
 * Resource tracker for monitoring CPU and memory usage per request
 */
export function createResourceTracker() {
  return {
    startTracking,
    stopTracking,
    getSystemMetrics,
  };
}

/**
 * Start resource tracking for a request
 */
export function startTracking(): InternalResourceMeasurement {
  return getCurrentResourceMeasurement();
}

/**
 * Stop resource tracking and calculate deltas
 */
export function stopTracking(startMeasurement: InternalResourceMeasurement): {
  memoryUsageBytes: number;
  cpuTimeSeconds: number;
  durationMs: number;
  endMeasurement: InternalResourceMeasurement;
} {
  const endMeasurement = getCurrentResourceMeasurement();
  
  const memoryUsageBytes = calculateMemoryDelta(startMeasurement, endMeasurement);
  const cpuTimeMicroseconds = calculateCpuTimeDelta(startMeasurement, endMeasurement);
  const cpuTimeSeconds = microsecondsToSeconds(cpuTimeMicroseconds);
  const durationMs = endMeasurement.timestamp - startMeasurement.timestamp;

  return {
    memoryUsageBytes,
    cpuTimeSeconds,
    durationMs,
    endMeasurement,
  };
}

/**
 * Get current system-wide metrics
 */
export function getSystemMetrics(): {
  memoryUsagePercent: number;
  cpuUsagePercent: number;
} {
  return {
    memoryUsagePercent: getSystemMemoryUsagePercent(),
    cpuUsagePercent: getSystemCpuUsagePercent(),
  };
}

/**
 * Create a continuous system metrics monitor
 */
export function createSystemMetricsMonitor(intervalMs = 10000): {
  start: () => void;
  stop: () => void;
  getCurrentMetrics: () => { memoryUsagePercent: number; cpuUsagePercent: number };
} {
  let interval: NodeJS.Timeout | null = null;
  let lastMetrics = { memoryUsagePercent: 0, cpuUsagePercent: 0 };

  return {
    start: () => {
      if (interval) return;
      
      interval = setInterval(() => {
        lastMetrics = getSystemMetrics();
      }, intervalMs);
      
      // Get initial metrics
      lastMetrics = getSystemMetrics();
    },
    
    stop: () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
    
    getCurrentMetrics: () => lastMetrics,
  };
}

/**
 * Analyze resource usage pattern
 */
export function analyzeResourceUsage(measurements: InternalResourceMeasurement[]): {
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageCpuTime: number;
  peakCpuTime: number;
  duration: number;
} {
  if (measurements.length === 0) {
    return {
      averageMemoryUsage: 0,
      peakMemoryUsage: 0,
      averageCpuTime: 0,
      peakCpuTime: 0,
      duration: 0,
    };
  }

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  
  let totalMemoryDelta = 0;
  let totalCpuDelta = 0;
  let peakMemory = 0;
  let peakCpu = 0;

  for (let i = 1; i < measurements.length; i++) {
    const prev = measurements[i - 1];
    const current = measurements[i];
    
    const memoryDelta = calculateMemoryDelta(prev, current);
    const cpuDelta = calculateCpuTimeDelta(prev, current);
    
    totalMemoryDelta += memoryDelta;
    totalCpuDelta += cpuDelta;
    
    if (memoryDelta > peakMemory) peakMemory = memoryDelta;
    if (cpuDelta > peakCpu) peakCpu = cpuDelta;
  }

  const count = measurements.length - 1;
  
  return {
    averageMemoryUsage: count > 0 ? totalMemoryDelta / count : 0,
    peakMemoryUsage: peakMemory,
    averageCpuTime: count > 0 ? microsecondsToSeconds(totalCpuDelta / count) : 0,
    peakCpuTime: microsecondsToSeconds(peakCpu),
    duration: last.timestamp - first.timestamp,
  };
}

/**
 * Check if resource usage exceeds thresholds
 */
export function checkResourceThresholds(
  memoryUsageBytes: number,
  cpuTimeSeconds: number,
  thresholds: {
    maxMemoryBytes: number;
    maxCpuSeconds: number;
  }
): {
  memoryExceeded: boolean;
  cpuExceeded: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const memoryExceeded = memoryUsageBytes > thresholds.maxMemoryBytes;
  const cpuExceeded = cpuTimeSeconds > thresholds.maxCpuSeconds;

  if (memoryExceeded) {
    warnings.push(`Memory usage ${memoryUsageBytes} bytes exceeds threshold ${thresholds.maxMemoryBytes} bytes`);
  }

  if (cpuExceeded) {
    warnings.push(`CPU time ${cpuTimeSeconds}s exceeds threshold ${thresholds.maxCpuSeconds}s`);
  }

  return {
    memoryExceeded,
    cpuExceeded,
    warnings,
  };
}

/**
 * Format resource usage for logging
 */
export function formatResourceUsage(
  memoryUsageBytes: number,
  cpuTimeSeconds: number,
  durationMs: number
): {
  memoryFormatted: string;
  cpuFormatted: string;
  durationFormatted: string;
} {
  return {
    memoryFormatted: formatBytes(memoryUsageBytes),
    cpuFormatted: `${(cpuTimeSeconds * 1000).toFixed(2)}ms`,
    durationFormatted: `${durationMs.toFixed(2)}ms`,
  };
}

/**
 * Format bytes in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}