export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Helper function for level comparison
export function getLogLevelPriority(level: LogLevel): number {
  const priorities = {
    [LogLevel.TRACE]: 0,
    [LogLevel.DEBUG]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.WARN]: 3,
    [LogLevel.ERROR]: 4,
    [LogLevel.FATAL]: 5
  };
  return priorities[level];
}

export function isLogLevelEnabled(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return getLogLevelPriority(targetLevel) >= getLogLevelPriority(currentLevel);
}