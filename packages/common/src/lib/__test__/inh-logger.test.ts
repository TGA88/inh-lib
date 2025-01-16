import { createEventLogFormatFn } from '../type/inh-logger';

describe('createEventLogFormatFn', () => {
    it('should return a function', () => {
        const eventName = 'testEvent';
        const formatFn = createEventLogFormatFn(eventName);
        expect(typeof formatFn).toBe('function');
    });

    it('should format the log correctly', () => {
        const eventName = 'testEvent';
        const formatFn = createEventLogFormatFn(eventName);
        const message = 'This is a test message';
        const data = { key: 'value' };
        const result = formatFn(message, data);
        expect(result).toEqual({
            eventName: eventName,
            message: message,
            data: data
        });
    });

    it('should handle different data types', () => {
        const eventName = 'testEvent';
        const formatFn = createEventLogFormatFn(eventName);
        const message = 'This is a test message';
        const data = 12345;
        const result = formatFn(message, data);
        expect(result).toEqual({
            eventName: eventName,
            message: message,
            data: data
        });
    });
});