
import { createEventLogFormatFn } from '../../type/inh-logger';
import { InhLogContext, InhLogger } from '../../type/inh-logger';
import * as uuid from 'uuid';

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-uuid')
}));

// jest.mock('../../type/inh-logger.logic', () => ({
//     createFrom: jest.fn()
// }));

// jest.mock('../../type/inh-logger', () => ({
//     createEventLogFormatFn: jest.fn()
// }));

describe('createEventLogFormatFn', () => {
    beforeEach(() => {
        jest.unmock('../../type/inh-logger');
    });

    it('should return a function', () => {
        const eventName = 'testEvent';
        const eventLogContext = { eventId: 'mocked-event-id', originEventId: 'mocked-origin-event-id' };
        const formatFn = createEventLogFormatFn(eventName, eventLogContext);
        expect(typeof formatFn).toBe('function');
    });

    it('should format the log correctly', () => {
        const eventName = 'testEvent';
        const eventLogContext = { eventId: 'mocked-event-id', originEventId: 'mocked-origin-event-id' };
        const formatFn = createEventLogFormatFn(eventName, eventLogContext);
        const message = 'This is a test message';
        const data = { key: 'value' };
        const result = formatFn(message, data);
        expect(result).toEqual({
            originEventId: 'mocked-origin-event-id',
            eventId: 'mocked-event-id',
            eventName: eventName,
            message: message,
            data: data
        });
    });

    it('should format the log correctly when it has only message', () => {
        const eventName = 'testEvent';
        const eventLogContext = { eventId: 'mocked-event-id', originEventId: 'mocked-origin-event-id' };
        const formatFn = createEventLogFormatFn(eventName, eventLogContext);
        const message = 'This is a test message';
        
        const result = formatFn(message);
        expect(result).toEqual({
            originEventId: 'mocked-origin-event-id',
            eventId: 'mocked-event-id',
            eventName: eventName,
            message: message,
            data: undefined
        });
    });

    it('should handle different data types', () => {
        const eventName = 'testEvent';
        const eventLogContext = { eventId: 'mocked-event-id', originEventId: 'mocked-origin-event-id' };
        const formatFn = createEventLogFormatFn(eventName, eventLogContext);
        const message = 'This is a test message';
        const data = 12345;
        const result = formatFn(message, data);
        expect(result).toEqual({
            originEventId: 'mocked-origin-event-id',
            eventId: 'mocked-event-id',
            eventName: eventName,
            message: message,
            data: data
        });
    });

});

describe('InhLogContext', () => {
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
        logContext = new InhLogContext(logger);
    });

    it('should initialize with a logger and context', () => {
        expect(logContext.logger).toBe(logger);
        expect(logContext.context.eventId).toBe('mocked-uuid');
        expect(logContext.context.originEventId).toBeUndefined();
    });

    it('should create a child context with a new eventId', () => {
        (uuid.v4 as jest.Mock).mockReturnValueOnce('mocked-uuid2');
        const childLogContext = logContext.createChild();
        expect(childLogContext.context.eventId).toBe('mocked-uuid2');
        expect(childLogContext.context.originEventId).toBe(logContext.context.eventId);
    });

  

    it('should handle multiple child contexts', () => {
        const childLogContext1 = logContext.createChild();
        const childLogContext2 = logContext.createChild();
        expect(childLogContext1.context.eventId).toBe('mocked-uuid');
        expect(childLogContext1.context.originEventId).toBe(logContext.context.eventId);
        expect(childLogContext2.context.eventId).toBe('mocked-uuid');
        expect(childLogContext2.context.originEventId).toBe(logContext.context.eventId);
    });
});
