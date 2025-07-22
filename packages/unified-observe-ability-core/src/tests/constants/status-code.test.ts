

import {
  UnifiedSpanStatusCode,
  UnifiedHttpStatusCodeRange,
  getSpanStatusFromHttpCode,
  getHttpStatusRange
} from '../../constants/status-code';

describe('status-code', () => {
  describe('UnifiedSpanStatusCode constants', () => {
    it('should have correct status code values', () => {
      expect(UnifiedSpanStatusCode.UNSET).toBe('UNSET');
      expect(UnifiedSpanStatusCode.OK).toBe('OK');
      expect(UnifiedSpanStatusCode.ERROR).toBe('ERROR');
    });
  });

  describe('UnifiedHttpStatusCodeRange constants', () => {
    it('should have correct range values', () => {
      expect(UnifiedHttpStatusCodeRange.SUCCESS).toBe('2xx');
      expect(UnifiedHttpStatusCodeRange.CLIENT_ERROR).toBe('4xx');
      expect(UnifiedHttpStatusCodeRange.SERVER_ERROR).toBe('5xx');
    });
  });

  describe('getSpanStatusFromHttpCode', () => {
    it('should return OK for success status codes', () => {
      const successCodes = [200, 201, 202, 204, 206, 299];
      successCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(UnifiedSpanStatusCode.OK);
      });
    });

    it('should return OK for redirection status codes', () => {
      const redirectCodes = [300, 301, 302, 304, 307, 308, 399];
      redirectCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(UnifiedSpanStatusCode.OK);
      });
    });

    it('should return ERROR for client error status codes', () => {
      const clientErrorCodes = [400, 401, 403, 404, 409, 422, 429, 499];
      clientErrorCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(UnifiedSpanStatusCode.ERROR);
      });
    });

    it('should return ERROR for server error status codes', () => {
      const serverErrorCodes = [500, 501, 502, 503, 504, 599];
      serverErrorCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(UnifiedSpanStatusCode.ERROR);
      });
    });

    it('should return OK for informational status codes', () => {
      const informationalCodes = [100, 101, 102, 199];
      informationalCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(UnifiedSpanStatusCode.OK);
      });
    });

    it('should handle edge cases', () => {
      expect(getSpanStatusFromHttpCode(399)).toBe(UnifiedSpanStatusCode.OK);
      expect(getSpanStatusFromHttpCode(400)).toBe(UnifiedSpanStatusCode.ERROR);
      expect(getSpanStatusFromHttpCode(499)).toBe(UnifiedSpanStatusCode.ERROR);
      expect(getSpanStatusFromHttpCode(500)).toBe(UnifiedSpanStatusCode.ERROR);
    });
  });

  describe('getHttpStatusRange', () => {
    it('should return SUCCESS for 2xx status codes', () => {
      const successCodes = [200, 201, 202, 204, 206, 299];
      successCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBe(UnifiedHttpStatusCodeRange.SUCCESS);
      });
    });

    it('should return CLIENT_ERROR for 4xx status codes', () => {
      const clientErrorCodes = [400, 401, 403, 404, 409, 422, 429, 499];
      clientErrorCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBe(UnifiedHttpStatusCodeRange.CLIENT_ERROR);
      });
    });

    it('should return SERVER_ERROR for 5xx status codes', () => {
      const serverErrorCodes = [500, 501, 502, 503, 504, 599];
      serverErrorCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBe(UnifiedHttpStatusCodeRange.SERVER_ERROR);
      });
    });

    it('should return undefined for other status codes', () => {
      const otherCodes = [100, 101, 199, 300, 301, 399, 600, 700];
      otherCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBeUndefined();
      });
    });

    it('should handle edge cases', () => {
      expect(getHttpStatusRange(199)).toBeUndefined();
      expect(getHttpStatusRange(200)).toBe(UnifiedHttpStatusCodeRange.SUCCESS);
      expect(getHttpStatusRange(299)).toBe(UnifiedHttpStatusCodeRange.SUCCESS);
      expect(getHttpStatusRange(300)).toBeUndefined();
      expect(getHttpStatusRange(399)).toBeUndefined();
      expect(getHttpStatusRange(400)).toBe(UnifiedHttpStatusCodeRange.CLIENT_ERROR);
      expect(getHttpStatusRange(499)).toBe(UnifiedHttpStatusCodeRange.CLIENT_ERROR);
      expect(getHttpStatusRange(500)).toBe(UnifiedHttpStatusCodeRange.SERVER_ERROR);
      expect(getHttpStatusRange(599)).toBe(UnifiedHttpStatusCodeRange.SERVER_ERROR);
      expect(getHttpStatusRange(600)).toBeUndefined();
    });
  });
});
