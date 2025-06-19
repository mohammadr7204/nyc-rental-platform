import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    prisma = new PrismaClient();
    
    // Disconnect from database
    await prisma.$disconnect();
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    throw error;
  }
}
