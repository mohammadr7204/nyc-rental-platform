import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      userType: 'RENTER',
      phone: '(555) 123-4567',
      emailVerified: true,
      isActive: true,
      verificationStatus: 'VERIFIED'
    },
  });

  // Create a test landlord
  const testLandlord = await prisma.user.upsert({
    where: { email: 'landlord@example.com' },
    update: {},
    create: {
      email: 'landlord@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Landlord',
      userType: 'LANDLORD',
      phone: '(555) 987-6543',
      emailVerified: true,
      isActive: true,
      verificationStatus: 'VERIFIED'
    },
  });

  console.log('Test users created:');
  console.log('Renter:', testUser.email);
  console.log('Landlord:', testLandlord.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });