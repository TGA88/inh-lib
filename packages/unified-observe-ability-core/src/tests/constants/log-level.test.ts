
import {
  LogLevel,
  getLogLevelPriority,
  isLogLevelEnabled
} from '../../constants/log-level';

describe('log-level', () => {
  describe('LogLevel constants', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.TRACE).toBe('trace');
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.FATAL).toBe('fatal');
    });
  });

  describe('getLogLevelPriority', () => {
    it('should return correct priorities', () => {
      expect(getLogLevelPriority(LogLevel.TRACE)).toBe(0);
      expect(getLogLevelPriority(LogLevel.DEBUG)).toBe(1);
      expect(getLogLevelPriority(LogLevel.INFO)).toBe(2);
      expect(getLogLevelPriority(LogLevel.WARN)).toBe(3);
      expect(getLogLevelPriority(LogLevel.ERROR)).toBe(4);
      expect(getLogLevelPriority(LogLevel.FATAL)).toBe(5);
    });

    it('should maintain priority order', () => {
      const levels = [
        LogLevel.TRACE,
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.FATAL
      ];

      for (let i = 0; i < levels.length - 1; i++) {
        const currentPriority = getLogLevelPriority(levels[i]);
        const nextPriority = getLogLevelPriority(levels[i + 1]);
        expect(currentPriority).toBeLessThan(nextPriority);
      }
    });
  });

  describe('isLogLevelEnabled', () => {
    it('should return true when target level is higher or equal to current level', () => {
      expect(isLogLevelEnabled(LogLevel.INFO, LogLevel.INFO)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.INFO, LogLevel.WARN)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.INFO, LogLevel.ERROR)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.INFO, LogLevel.FATAL)).toBe(true);
    });

    it('should return false when target level is lower than current level', () => {
      expect(isLogLevelEnabled(LogLevel.INFO, LogLevel.TRACE)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.INFO, LogLevel.DEBUG)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.WARN, LogLevel.INFO)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.ERROR, LogLevel.WARN)).toBe(false);
    });

    it('should work with all level combinations', () => {
      // When current level is TRACE (lowest), all levels should be enabled
      expect(isLogLevelEnabled(LogLevel.TRACE, LogLevel.TRACE)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.TRACE, LogLevel.DEBUG)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.TRACE, LogLevel.INFO)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.TRACE, LogLevel.WARN)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.TRACE, LogLevel.ERROR)).toBe(true);
      expect(isLogLevelEnabled(LogLevel.TRACE, LogLevel.FATAL)).toBe(true);

      // When current level is FATAL (highest), only FATAL should be enabled
      expect(isLogLevelEnabled(LogLevel.FATAL, LogLevel.TRACE)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.FATAL, LogLevel.DEBUG)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.FATAL, LogLevel.INFO)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.FATAL, LogLevel.WARN)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.FATAL, LogLevel.ERROR)).toBe(false);
      expect(isLogLevelEnabled(LogLevel.FATAL, LogLevel.FATAL)).toBe(true);
    });
  });
});
