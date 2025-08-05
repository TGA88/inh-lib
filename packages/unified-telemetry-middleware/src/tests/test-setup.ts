/**
 * Jest test setup file
 */

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.hrtime for consistent testing
const mockHrtime = Object.assign(
  jest.fn(() => [1, 2000000] as [number, number]),
  {
    bigint: jest.fn(() => BigInt(1002000000))
  }
);
process.hrtime = mockHrtime as unknown as NodeJS.HRTime;

// Mock process.memoryUsage for consistent testing  
const mockMemoryUsage = jest.fn(() => ({
  rss: 50 * 1024 * 1024,      // 50MB
  heapTotal: 30 * 1024 * 1024, // 30MB  
  heapUsed: 20 * 1024 * 1024,  // 20MB
  external: 5 * 1024 * 1024,   // 5MB
  arrayBuffers: 1 * 1024 * 1024, // 1MB
}));
process.memoryUsage = mockMemoryUsage as unknown as NodeJS.MemoryUsageFn;

// Mock process.cpuUsage for consistent testing
const mockCpuUsage = jest.fn(() => ({
  user: 1000000, // 1 second in microseconds
  system: 500000, // 0.5 seconds in microseconds
}));
process.cpuUsage = mockCpuUsage;

// Mock os module
jest.mock('os', () => ({
  totalmem: () => 8 * 1024 * 1024 * 1024, // 8GB
  freemem: () => 4 * 1024 * 1024 * 1024,  // 4GB
  cpus: () => [
    {
      model: 'Mock CPU',
      speed: 2400,
      times: {
        user: 1000000,
        nice: 0,
        sys: 500000,
        idle: 3000000,
        irq: 0,
      },
    },
    {
      model: 'Mock CPU',
      speed: 2400,
      times: {
        user: 1200000,
        nice: 0,
        sys: 600000,
        idle: 2800000,
        irq: 0,
      },
    },
  ],
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockHrtime.mockReturnValue([1, 2000000]);
  mockHrtime.bigint.mockReturnValue(BigInt(1002000000));
  mockMemoryUsage.mockReturnValue({
    rss: 50 * 1024 * 1024,
    heapTotal: 30 * 1024 * 1024,
    heapUsed: 20 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024,
  });
  mockCpuUsage.mockReturnValue({
    user: 1000000,
    system: 500000,
  });
});

// Global test timeout
jest.setTimeout(10000);