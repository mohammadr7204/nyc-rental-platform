import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create a landlord
  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@example.com' },
    update: {},
    create: {
      email: 'landlord@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Landlord',
      userType: 'LANDLORD',
      phone: '+1234567890',
      verificationStatus: 'VERIFIED'
    }
  });

  // Create a renter
  const renter = await prisma.user.upsert({
    where: { email: 'renter@example.com' },
    update: {},
    create: {
      email: 'renter@example.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Renter',
      userType: 'RENTER',
      phone: '+1234567891',
      verificationStatus: 'VERIFIED'
    }
  });

  // Create sample properties
  const properties = [
    {
      title: 'Spacious 2BR in Manhattan',
      description: 'Beautiful 2-bedroom apartment in the heart of Manhattan. Features modern kitchen, large living room, and great views. Perfect for professionals or couples. Walking distance to subway and all amenities.',
      address: '123 Broadway',
      city: 'New York',
      borough: 'MANHATTAN',
      zipCode: '10001',
      propertyType: 'APARTMENT',
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 1200,
      rentAmount: 4500,
      securityDeposit: 4500,
      availableDate: new Date('2024-02-01'),
      amenities: ['Dishwasher', 'Laundry in Building', 'Doorman', 'Elevator', 'Gym'],
      photos: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
      ],
      ownerId: landlord.id
    },
    {
      title: 'Cozy Studio in Brooklyn',
      description: 'Charming studio apartment in trendy Brooklyn neighborhood. Recently renovated with modern fixtures and appliances. Great natural light and close to parks.',
      address: '456 Atlantic Avenue',
      city: 'New York',
      borough: 'BROOKLYN',
      zipCode: '11201',
      propertyType: 'STUDIO',
      bedrooms: 0,
      bathrooms: 1,
      squareFeet: 600,
      rentAmount: 2800,
      securityDeposit: 2800,
      availableDate: new Date('2024-01-15'),
      amenities: ['Hardwood Floors', 'Updated Kitchen', 'Near Subway'],
      photos: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
      ],
      ownerId: landlord.id
    },
    {
      title: 'Large 3BR in Queens',
      description: 'Spacious 3-bedroom family apartment in Queens. Perfect for families with children. Near good schools and parks. Quiet residential neighborhood.',
      address: '789 Northern Boulevard',
      city: 'New York',
      borough: 'QUEENS',
      zipCode: '11372',
      propertyType: 'APARTMENT',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      rentAmount: 3200,
      securityDeposit: 3200,
      availableDate: new Date('2024-03-01'),
      amenities: ['Parking', 'Balcony', 'Dishwasher', 'Near Schools'],
      photos: [
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
      ],
      isRentStabilized: true,
      ownerId: landlord.id
    }
  ];

  for (const propertyData of properties) {
    await prisma.property.upsert({
      where: {
        // Use a combination that should be unique
        address: propertyData.address
      },
      update: {},
      create: propertyData
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('📧 Landlord login: landlord@example.com / password123');
  console.log('📧 Renter login: renter@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });