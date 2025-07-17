

import {
  SpanStatusCode,
  HttpStatusCodeRange,
  getSpanStatusFromHttpCode,
  getHttpStatusRange
} from '../../constants/status-code';

describe('status-code', () => {
  describe('SpanStatusCode constants', () => {
    it('should have correct status code values', () => {
      expect(SpanStatusCode.UNSET).toBe('UNSET');
      expect(SpanStatusCode.OK).toBe('OK');
      expect(SpanStatusCode.ERROR).toBe('ERROR');
    });
  });

  describe('HttpStatusCodeRange constants', () => {
    it('should have correct range values', () => {
      expect(HttpStatusCodeRange.SUCCESS).toBe('2xx');
      expect(HttpStatusCodeRange.CLIENT_ERROR).toBe('4xx');
      expect(HttpStatusCodeRange.SERVER_ERROR).toBe('5xx');
    });
  });

  describe('getSpanStatusFromHttpCode', () => {
    it('should return OK for success status codes', () => {
      const successCodes = [200, 201, 202, 204, 206, 299];
      successCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(SpanStatusCode.OK);
      });
    });

    it('should return OK for redirection status codes', () => {
      const redirectCodes = [300, 301, 302, 304, 307, 308, 399];
      redirectCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(SpanStatusCode.OK);
      });
    });

    it('should return ERROR for client error status codes', () => {
      const clientErrorCodes = [400, 401, 403, 404, 409, 422, 429, 499];
      clientErrorCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(SpanStatusCode.ERROR);
      });
    });

    it('should return ERROR for server error status codes', () => {
      const serverErrorCodes = [500, 501, 502, 503, 504, 599];
      serverErrorCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(SpanStatusCode.ERROR);
      });
    });

    it('should return OK for informational status codes', () => {
      const informationalCodes = [100, 101, 102, 199];
      informationalCodes.forEach(code => {
        expect(getSpanStatusFromHttpCode(code)).toBe(SpanStatusCode.OK);
      });
    });

    it('should handle edge cases', () => {
      expect(getSpanStatusFromHttpCode(399)).toBe(SpanStatusCode.OK);
      expect(getSpanStatusFromHttpCode(400)).toBe(SpanStatusCode.ERROR);
      expect(getSpanStatusFromHttpCode(499)).toBe(SpanStatusCode.ERROR);
      expect(getSpanStatusFromHttpCode(500)).toBe(SpanStatusCode.ERROR);
    });
  });

  describe('getHttpStatusRange', () => {
    it('should return SUCCESS for 2xx status codes', () => {
      const successCodes = [200, 201, 202, 204, 206, 299];
      successCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBe(HttpStatusCodeRange.SUCCESS);
      });
    });

    it('should return CLIENT_ERROR for 4xx status codes', () => {
      const clientErrorCodes = [400, 401, 403, 404, 409, 422, 429, 499];
      clientErrorCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBe(HttpStatusCodeRange.CLIENT_ERROR);
      });
    });

    it('should return SERVER_ERROR for 5xx status codes', () => {
      const serverErrorCodes = [500, 501, 502, 503, 504, 599];
      serverErrorCodes.forEach(code => {
        expect(getHttpStatusRange(code)).toBe(HttpStatusCodeRange.SERVER_ERROR);
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
      expect(getHttpStatusRange(200)).toBe(HttpStatusCodeRange.SUCCESS);
      expect(getHttpStatusRange(299)).toBe(HttpStatusCodeRange.SUCCESS);
      expect(getHttpStatusRange(300)).toBeUndefined();
      expect(getHttpStatusRange(399)).toBeUndefined();
      expect(getHttpStatusRange(400)).toBe(HttpStatusCodeRange.CLIENT_ERROR);
      expect(getHttpStatusRange(499)).toBe(HttpStatusCodeRange.CLIENT_ERROR);
      expect(getHttpStatusRange(500)).toBe(HttpStatusCodeRange.SERVER_ERROR);
      expect(getHttpStatusRange(599)).toBe(HttpStatusCodeRange.SERVER_ERROR);
      expect(getHttpStatusRange(600)).toBeUndefined();
    });
  });
});
