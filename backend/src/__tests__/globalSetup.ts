import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { config } from '../config';

let prisma: PrismaClient;

export default async function globalSetup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/nyc_rental_platform_test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  
  console.log('🧪 Setting up test environment...');
  
  try {
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    // Reset database schema
    console.log('📄 Resetting database schema...');
    execSync('npx prisma db push --force-reset --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    
    // Generate Prisma client
    execSync('npx prisma generate', {
      stdio: 'inherit'
    });
    
    console.log('✅ Test environment setup complete');
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}
