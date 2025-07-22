export const UnifiedLogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export type UnifiedLogLevel = typeof UnifiedLogLevel[keyof typeof UnifiedLogLevel];

// Helper function for level comparison
export function getLogLevelPriority(level: UnifiedLogLevel): number {
  const priorities = {
    [UnifiedLogLevel.TRACE]: 0,
    [UnifiedLogLevel.DEBUG]: 1,
    [UnifiedLogLevel.INFO]: 2,
    [UnifiedLogLevel.WARN]: 3,
    [UnifiedLogLevel.ERROR]: 4,
    [UnifiedLogLevel.FATAL]: 5
  };
  return priorities[level];
}

export function isLogLevelEnabled(currentLevel: UnifiedLogLevel, targetLevel: UnifiedLogLevel): boolean {
  return getLogLevelPriority(targetLevel) >= getLogLevelPriority(currentLevel);
}