import { PrismaClient } from '@prisma/client';
import { config } from '../config';

// Mock external services for testing
jest.mock('../services/emailService');
jest.mock('../services/backgroundCheckService');
jest.mock('@aws-sdk/client-s3');
jest.mock('stripe');
jest.mock('twilio');
jest.mock('nodemailer');

// Global test setup
let prisma: PrismaClient;

beforeAll(async () => {
  // Ensure we're in test environment
  process.env.NODE_ENV = 'test';
  
  // Initialize test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      }
    }
  });
  
  // Wait for database connection
  await prisma.$connect();
  
  // Clean database before all tests
  await cleanDatabase();
});

afterAll(async () => {
  // Clean up after all tests
  await cleanDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
});

afterEach(async () => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Helper function to clean the database
async function cleanDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
}

// Test utilities
export const testUtils = {
  prisma,
  cleanDatabase,
  
  // Helper to create test user
  createTestUser: async (overrides = {}) => {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    return prisma.user.create({
      data: {
        email: `test${Date.now()}@example.com`,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        userType: 'RENTER',
        emailVerified: true,
        verificationStatus: 'VERIFIED',
        ...overrides
      }
    });
  },
  
  // Helper to create test property
  createTestProperty: async (ownerId: string, overrides = {}) => {
    return prisma.property.create({
      data: {
        title: 'Test Property',
        description: 'A beautiful test property for rent in Manhattan.',
        address: '123 Test Street',
        city: 'New York',
        borough: 'MANHATTAN',
        zipCode: '10001',
        propertyType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 1,
        rentAmount: 3000,
        securityDeposit: 3000,
        availableDate: new Date(),
        photos: [],
        amenities: ['Dishwasher', 'Laundry'],
        ownerId,
        ...overrides
      }
    });
  },
  
  // Helper to generate JWT token for testing
  generateTestToken: (userId: string, userType: string = 'RENTER') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, userType },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },
  
  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to mock Redis operations
  mockRedis: () => {
    const mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      ping: jest.fn().mockResolvedValue('PONG'),
      disconnect: jest.fn().mockResolvedValue(undefined)
    };
    return mockRedisClient;
  }
};

// Mock console methods in test environment
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
