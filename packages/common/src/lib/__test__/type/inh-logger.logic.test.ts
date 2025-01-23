import { createFrom } from '../../type/inh-logger.logic';
import { InhLogContext, InhLogger } from '../../type/inh-logger';
import { v4 as uuid } from 'uuid';

jest.mock('uuid');

describe('createFrom', () => {
    let logger: InhLogger;
    let logContext: InhLogContext;

    beforeEach(() => {
        logger = {
            trace: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn()
        };
        (uuid as jest.Mock).mockReturnValue('mocked-uuid');
        logContext = new InhLogContext(logger);
    });

    it('should create a new InhLogContext with a new eventId and originEventId from the original context', () => {
        const newLogContext = createFrom(logContext);

        expect(newLogContext.context.eventId).toBe('mocked-uuid');
        expect(newLogContext.context.originEventId).toBe(logContext.context.eventId);
    });

    it('should use the same logger instance', () => {
        const newLogContext = createFrom(logContext);

        expect(newLogContext.logger).toBe(logContext.logger);
    });

    it('should call uuid to generate new eventId', () => {
        createFrom(logContext);
        expect(uuid).toHaveBeenCalled();
    });
});