import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const prisma = new PrismaClient();

// Advanced property search
router.get('/properties', asyncHandler(async (req: Request, res: Response) => {
  const {
    q, // search query
    borough,
    minRent,
    maxRent,
    bedrooms,
    bathrooms,
    propertyType,
    amenities,
    isRentStabilized,
    isBrokerFee,
    availableFrom,
    minSquareFeet,
    maxSquareFeet,
    latitude,
    longitude,
    radius, // in miles
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Build where clause
  const where: any = {
    status: 'AVAILABLE'
  };

  if (q) {
    where.OR = [
      { title: { contains: q as string, mode: 'insensitive' } },
      { description: { contains: q as string, mode: 'insensitive' } },
      { address: { contains: q as string, mode: 'insensitive' } }
    ];
  }

  if (borough) {
    where.borough = { in: Array.isArray(borough) ? borough : [borough] };
  }

  if (minRent || maxRent) {
    where.rentAmount = {};
    if (minRent) where.rentAmount.gte = Number(minRent);
    if (maxRent) where.rentAmount.lte = Number(maxRent);
  }

  if (bedrooms) {
    where.bedrooms = { in: Array.isArray(bedrooms) ? bedrooms.map(Number) : [Number(bedrooms)] };
  }

  if (bathrooms) {
    where.bathrooms = { gte: Number(bathrooms) };
  }

  if (propertyType) {
    where.propertyType = { in: Array.isArray(propertyType) ? propertyType : [propertyType] };
  }

  if (amenities) {
    const amenitiesList = Array.isArray(amenities) ? amenities : [amenities];
    where.amenities = {
      hasSome: amenitiesList
    };
  }

  if (isRentStabilized !== undefined) {
    where.isRentStabilized = isRentStabilized === 'true';
  }

  if (isBrokerFee !== undefined) {
    where.isBrokerFee = isBrokerFee === 'true';
  }

  if (availableFrom) {
    where.availableDate = {
      gte: new Date(availableFrom as string)
    };
  }

  if (minSquareFeet || maxSquareFeet) {
    where.squareFeet = {};
    if (minSquareFeet) where.squareFeet.gte = Number(minSquareFeet);
    if (maxSquareFeet) where.squareFeet.lte = Number(maxSquareFeet);
  }

  // Geographic search (simplified - in production, use PostGIS)
  if (latitude && longitude && radius) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radiusInDegrees = Number(radius) / 69; // Rough conversion

    where.latitude = {
      gte: lat - radiusInDegrees,
      lte: lat + radiusInDegrees
    };
    where.longitude = {
      gte: lng - radiusInDegrees,
      lte: lng + radiusInDegrees
    };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            verificationStatus: true
          }
        },
        _count: {
          select: {
            applications: true,
            savedBy: true
          }
        }
      },
      skip,
      take,
      orderBy: {
        [sortBy as string]: sortOrder
      }
    }),
    prisma.property.count({ where })
  ]);

  res.json({
    success: true,
    data: properties,
    filters: {
      q,
      borough,
      minRent,
      maxRent,
      bedrooms,
      bathrooms,
      propertyType,
      amenities,
      isRentStabilized,
      isBrokerFee
    },
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Get search suggestions
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const { q, type = 'all' } = req.query;

  if (!q || (q as string).length < 2) {
    return res.json({
      success: true,
      data: []
    });
  }

  const suggestions: any[] = [];

  if (type === 'all' || type === 'properties') {
    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { title: { contains: q as string, mode: 'insensitive' } },
          { address: { contains: q as string, mode: 'insensitive' } }
        ],
        status: 'AVAILABLE'
      },
      select: {
        id: true,
        title: true,
        address: true,
        borough: true,
        rentAmount: true
      },
      take: 5
    });

    suggestions.push(...properties.map(p => ({
      type: 'property',
      id: p.id,
      title: p.title,
      subtitle: `${p.address}, ${p.borough}`,
      value: `$${p.rentAmount}/month`
    })));
  }

  // Add neighborhood suggestions
  const neighborhoods = [
    'East Village', 'West Village', 'SoHo', 'Tribeca', 'Chelsea', 'Midtown',
    'Upper East Side', 'Upper West Side', 'Harlem', 'Washington Heights',
    'Williamsburg', 'DUMBO', 'Park Slope', 'Brooklyn Heights', 'Astoria',
    'Long Island City', 'Flushing', 'Forest Hills'
  ];

  const matchingNeighborhoods = neighborhoods
    .filter(n => n.toLowerCase().includes((q as string).toLowerCase()))
    .slice(0, 3)
    .map(n => ({
      type: 'neighborhood',
      title: n,
      subtitle: 'Neighborhood',
      value: n
    }));

  suggestions.push(...matchingNeighborhoods);

  res.json({
    success: true,
    data: suggestions.slice(0, 10)
  });
}));

// Get search filters options
router.get('/filters', asyncHandler(async (req: Request, res: Response) => {
  // Get available options for filters
  const [boroughs, propertyTypes, amenities, priceRanges] = await Promise.all([
    prisma.property.groupBy({
      by: ['borough'],
      where: { status: 'AVAILABLE' },
      _count: { borough: true }
    }),
    prisma.property.groupBy({
      by: ['propertyType'],
      where: { status: 'AVAILABLE' },
      _count: { propertyType: true }
    }),
    // Get all unique amenities
    prisma.property.findMany({
      where: { status: 'AVAILABLE' },
      select: { amenities: true }
    }).then(properties => {
      const allAmenities = new Set<string>();
      properties.forEach(p => {
        p.amenities.forEach(a => allAmenities.add(a));
      });
      return Array.from(allAmenities).sort();
    }),
    // Get price statistics
    prisma.property.aggregate({
      where: { status: 'AVAILABLE' },
      _min: { rentAmount: true },
      _max: { rentAmount: true },
      _avg: { rentAmount: true }
    })
  ]);

  res.json({
    success: true,
    data: {
      boroughs: boroughs.map(b => ({
        value: b.borough,
        label: b.borough.replace('_', ' '),
        count: b._count.borough
      })),
      propertyTypes: propertyTypes.map(pt => ({
        value: pt.propertyType,
        label: pt.propertyType,
        count: pt._count.propertyType
      })),
      amenities: amenities.map(a => ({ value: a, label: a })),
      priceRange: {
        min: priceRanges._min.rentAmount || 0,
        max: priceRanges._max.rentAmount || 10000,
        avg: Math.round(priceRanges._avg.rentAmount || 0)
      }
    }
  });
}));

export default router;