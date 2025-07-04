// src/internal/utils/perfomance.utils.ts
/**
 * Performance measurement utilities
 */

import * as os from 'os';
import type { InternalResourceMeasurement } from '../types/middleware.types';

/**
 * Get current resource usage measurement
 */
export function getCurrentResourceMeasurement(): InternalResourceMeasurement {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    timestamp: Date.now(),
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
  };
}

/**
 * Calculate memory delta between two measurements
 */
export function calculateMemoryDelta(
  start: InternalResourceMeasurement,
  end: InternalResourceMeasurement
): number {
  return Math.max(0, end.memory.heapUsed - start.memory.heapUsed);
}

/**
 * Calculate CPU time delta between two measurements (in microseconds)
 */
export function calculateCpuTimeDelta(
  start: InternalResourceMeasurement,
  end: InternalResourceMeasurement
): number {
  const userDelta = end.cpu.user - start.cpu.user;
  const systemDelta = end.cpu.system - start.cpu.system;
  return userDelta + systemDelta;
}

/**
 * Convert microseconds to seconds for metrics
 */
export function microsecondsToSeconds(microseconds: number): number {
  return microseconds / 1_000_000;
}

/**
 * Calculate duration in seconds from start time
 */
export function calculateDurationSeconds(startTime: number): number {
  return (Date.now() - startTime) / 1000;
}

/**
 * Get system memory usage percentage
 */
export function getSystemMemoryUsagePercent(): number {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  return (usedMemory / totalMemory) * 100;
}

/**
 * Get system CPU usage percentage (approximation)
 */
export function getSystemCpuUsagePercent(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  
  return 100 - (100 * idle / total);
}

/**
 * Generate high-resolution timestamp for precise measurements
 */
export function getHighResolutionTime(): number {
  const [seconds, nanoseconds] = process.hrtime();
  return seconds * 1000 + nanoseconds / 1_000_000;
}

/**
 * Calculate high-resolution duration in milliseconds
 */
export function calculateHighResDuration(startTime: number): number {
  return getHighResolutionTime() - startTime;
}