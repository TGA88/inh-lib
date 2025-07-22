
import {
  UnifiedLogLevel,
  getLogLevelPriority,
  isLogLevelEnabled
} from '../../constants/log-level';

describe('log-level', () => {
  describe('UnifiedLogLevel constants', () => {
    it('should have correct log level values', () => {
      expect(UnifiedLogLevel.TRACE).toBe('trace');
      expect(UnifiedLogLevel.DEBUG).toBe('debug');
      expect(UnifiedLogLevel.INFO).toBe('info');
      expect(UnifiedLogLevel.WARN).toBe('warn');
      expect(UnifiedLogLevel.ERROR).toBe('error');
      expect(UnifiedLogLevel.FATAL).toBe('fatal');
    });
  });

  describe('getLogLevelPriority', () => {
    it('should return correct priorities', () => {
      expect(getLogLevelPriority(UnifiedLogLevel.TRACE)).toBe(0);
      expect(getLogLevelPriority(UnifiedLogLevel.DEBUG)).toBe(1);
      expect(getLogLevelPriority(UnifiedLogLevel.INFO)).toBe(2);
      expect(getLogLevelPriority(UnifiedLogLevel.WARN)).toBe(3);
      expect(getLogLevelPriority(UnifiedLogLevel.ERROR)).toBe(4);
      expect(getLogLevelPriority(UnifiedLogLevel.FATAL)).toBe(5);
    });

    it('should maintain priority order', () => {
      const levels = [
        UnifiedLogLevel.TRACE,
        UnifiedLogLevel.DEBUG,
        UnifiedLogLevel.INFO,
        UnifiedLogLevel.WARN,
        UnifiedLogLevel.ERROR,
        UnifiedLogLevel.FATAL
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
      expect(isLogLevelEnabled(UnifiedLogLevel.INFO, UnifiedLogLevel.INFO)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.INFO, UnifiedLogLevel.WARN)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.INFO, UnifiedLogLevel.ERROR)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.INFO, UnifiedLogLevel.FATAL)).toBe(true);
    });

    it('should return false when target level is lower than current level', () => {
      expect(isLogLevelEnabled(UnifiedLogLevel.INFO, UnifiedLogLevel.TRACE)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.INFO, UnifiedLogLevel.DEBUG)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.WARN, UnifiedLogLevel.INFO)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.ERROR, UnifiedLogLevel.WARN)).toBe(false);
    });

    it('should work with all level combinations', () => {
      // When current level is TRACE (lowest), all levels should be enabled
      expect(isLogLevelEnabled(UnifiedLogLevel.TRACE, UnifiedLogLevel.TRACE)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.TRACE, UnifiedLogLevel.DEBUG)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.TRACE, UnifiedLogLevel.INFO)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.TRACE, UnifiedLogLevel.WARN)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.TRACE, UnifiedLogLevel.ERROR)).toBe(true);
      expect(isLogLevelEnabled(UnifiedLogLevel.TRACE, UnifiedLogLevel.FATAL)).toBe(true);

      // When current level is FATAL (highest), only FATAL should be enabled
      expect(isLogLevelEnabled(UnifiedLogLevel.FATAL, UnifiedLogLevel.TRACE)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.FATAL, UnifiedLogLevel.DEBUG)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.FATAL, UnifiedLogLevel.INFO)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.FATAL, UnifiedLogLevel.WARN)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.FATAL, UnifiedLogLevel.ERROR)).toBe(false);
      expect(isLogLevelEnabled(UnifiedLogLevel.FATAL, UnifiedLogLevel.FATAL)).toBe(true);
    });
  });
});
