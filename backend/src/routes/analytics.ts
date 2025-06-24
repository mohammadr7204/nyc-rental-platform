import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Property analytics for landlords
router.get('/property/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = (req as any).user.id;

    // Verify property ownership
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: userId
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Get analytics data
    const [
      applicationStats,
      maintenanceStats,
      paymentStats,
      viewsData,
      leaseHistory
    ] = await Promise.all([
      // Application analytics
      prisma.application.groupBy({
        by: ['status'],
        where: { propertyId },
        _count: { status: true }
      }),

      // Maintenance analytics
      prisma.maintenanceRequest.groupBy({
        by: ['status', 'priority'],
        where: { propertyId },
        _count: { status: true },
        _avg: { cost: true },
        _sum: { cost: true }
      }),

      // Payment analytics
      prisma.payment.aggregate({
        where: {
          application: {
            propertyId: propertyId
          }
        },
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true }
      }),

      // Recent activity (mock for now - would need to implement view tracking)
      Promise.resolve({ weeklyViews: Math.floor(Math.random() * 100) + 20 }),

      // Lease history
      prisma.lease.findMany({
        where: { propertyId },
        include: {
          tenant: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate occupancy rate
    const currentLease = await prisma.lease.findFirst({
      where: {
        propertyId,
        status: 'ACTIVE'
      }
    });

    // Calculate average time to rent (mock calculation)
    const avgTimeToRent = 14; // Would calculate from actual data

    // Format response
    const analytics = {
      property: {
        id: property.id,
        title: property.title,
        address: property.address,
        rentAmount: property.rentAmount,
        status: property.status
      },
      applications: {
        total: applicationStats.reduce((sum, stat) => sum + stat._count.status, 0),
        byStatus: applicationStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count.status;
          return acc;
        }, {} as Record<string, number>)
      },
      maintenance: {
        total: maintenanceStats.reduce((sum, stat) => sum + stat._count.status, 0),
        totalCost: maintenanceStats.reduce((sum, stat) => sum + (stat._sum.cost || 0), 0),
        averageCost: maintenanceStats.length > 0
          ? maintenanceStats.reduce((sum, stat) => sum + (stat._avg.cost || 0), 0) / maintenanceStats.length
          : 0,
        byStatus: maintenanceStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count.status;
          return acc;
        }, {} as Record<string, number>),
        byPriority: maintenanceStats.reduce((acc, stat) => {
          acc[stat.priority.toLowerCase()] = (acc[stat.priority.toLowerCase()] || 0) + stat._count.status;
          return acc;
        }, {} as Record<string, number>)
      },
      payments: {
        total: paymentStats._count.id || 0,
        totalAmount: paymentStats._sum.amount || 0,
        averageAmount: paymentStats._avg.amount || 0
      },
      occupancy: {
        isOccupied: !!currentLease,
        currentTenant: currentLease ? leaseHistory[0]?.tenant : null,
        averageTimeToRent: avgTimeToRent
      },
      performance: {
        weeklyViews: viewsData.weeklyViews,
        monthlyRevenue: currentLease ? property.rentAmount : 0,
        yearlyRevenue: currentLease ? property.rentAmount * 12 : 0
      },
      leaseHistory: leaseHistory.slice(0, 5).map(lease => ({
        id: lease.id,
        tenant: lease.tenant,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent: lease.monthlyRent,
        status: lease.status
      }))
    };

    res.json(analytics);
  } catch (error) {
    console.error('Property analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch property analytics' });
  }
});

// Portfolio overview for landlords
router.get('/portfolio', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    // Get all properties for the landlord
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      include: {
        applications: {
          include: {
            payments: true
          }
        },
        maintenanceRequests: true,
        leases: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (properties.length === 0) {
      return res.json({
        overview: {
          totalProperties: 0,
          totalRevenue: 0,
          occupancyRate: 0,
          averageRent: 0
        },
        properties: [],
        trends: {
          monthlyRevenue: Array(12).fill(0),
          applicationTrends: Array(12).fill(0)
        }
      });
    }

    // Calculate portfolio metrics
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.leases.length > 0).length;
    const occupancyRate = (occupiedProperties / totalProperties) * 100;

    const totalRevenue = properties.reduce((sum, property) => {
      return sum + (property.leases.length > 0 ? property.rentAmount : 0);
    }, 0);

    const averageRent = properties.reduce((sum, p) => sum + p.rentAmount, 0) / totalProperties;

    // Calculate maintenance costs
    const totalMaintenanceCost = properties.reduce((sum, property) => {
      return sum + property.maintenanceRequests.reduce((reqSum, req) => reqSum + (req.cost || 0), 0);
    }, 0);

    // Calculate application metrics
    const totalApplications = properties.reduce((sum, property) => sum + property.applications.length, 0);
    const pendingApplications = properties.reduce((sum, property) => {
      return sum + property.applications.filter(app => app.status === 'PENDING').length;
    }, 0);

    // Property performance ranking
    const propertyPerformance = properties.map(property => ({
      id: property.id,
      title: property.title,
      address: property.address,
      rentAmount: property.rentAmount,
      isOccupied: property.leases.length > 0,
      applicationCount: property.applications.length,
      maintenanceCount: property.maintenanceRequests.length,
      maintenanceCost: property.maintenanceRequests.reduce((sum, req) => sum + (req.cost || 0), 0),
      monthlyRevenue: property.leases.length > 0 ? property.rentAmount : 0,
      roi: property.leases.length > 0 ?
        ((property.rentAmount * 12) - property.maintenanceRequests.reduce((sum, req) => sum + (req.cost || 0), 0)) / (property.rentAmount * 12) * 100
        : 0
    })).sort((a, b) => b.roi - a.roi);

    // Mock trend data (in production, this would be calculated from historical data)
    const monthlyRevenue = Array(12).fill(0).map((_, index) => {
      const month = new Date().getMonth();
      if (index <= month) {
        return totalRevenue + (Math.random() * 1000 - 500);
      }
      return 0;
    });

    const applicationTrends = Array(12).fill(0).map((_, index) => {
      const month = new Date().getMonth();
      if (index <= month) {
        return Math.floor(Math.random() * 20) + 5;
      }
      return 0;
    });

    const portfolio = {
      overview: {
        totalProperties,
        totalRevenue,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        averageRent: Math.round(averageRent),
        totalMaintenanceCost,
        totalApplications,
        pendingApplications,
        yearlyRevenue: totalRevenue * 12
      },
      properties: propertyPerformance,
      trends: {
        monthlyRevenue,
        applicationTrends,
        maintenanceCosts: Array(12).fill(0).map(() => Math.floor(Math.random() * 500) + 100)
      },
      topPerformers: propertyPerformance.slice(0, 3),
      lowPerformers: propertyPerformance.slice(-3).reverse()
    };

    res.json(portfolio);
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio analytics' });
  }
});

// Financial report for a specific time period
router.get('/financial-report', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { startDate, endDate, propertyId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build where clause
    const whereClause: any = {
      property: {
        ownerId: userId
      },
      createdAt: {
        gte: start,
        lte: end
      }
    };

    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    // Get financial data
    const [
      payments,
      maintenanceExpenses,
      properties
    ] = await Promise.all([
      prisma.payment.findMany({
        where: {
          application: whereClause,
          status: 'COMPLETED'
        },
        include: {
          application: {
            include: {
              property: {
                select: { title: true, address: true }
              }
            }
          }
        }
      }),

      prisma.maintenanceRequest.findMany({
        where: {
          ...whereClause,
          cost: { not: null }
        },
        include: {
          property: {
            select: { title: true, address: true }
          }
        }
      }),

      prisma.property.findMany({
        where: {
          ownerId: userId,
          ...(propertyId ? { id: propertyId as string } : {})
        }
      })
    ]);

    // Calculate totals
    const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalExpenses = maintenanceExpenses.reduce((sum, expense) => sum + (expense.cost || 0), 0);
    const netIncome = totalIncome - totalExpenses;

    // Group by payment type
    const incomeByType = payments.reduce((acc, payment) => {
      acc[payment.type] = (acc[payment.type] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

    // Group expenses by priority
    const expensesByPriority = maintenanceExpenses.reduce((acc, expense) => {
      acc[expense.priority] = (acc[expense.priority] || 0) + (expense.cost || 0);
      return acc;
    }, {} as Record<string, number>);

    const report = {
      period: {
        startDate: start,
        endDate: end
      },
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        profitMargin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
      },
      income: {
        total: totalIncome,
        byType: incomeByType,
        transactions: payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          type: payment.type,
          date: payment.paidDate || payment.createdAt,
          property: payment.application?.property?.title || 'N/A',
          description: payment.description
        }))
      },
      expenses: {
        total: totalExpenses,
        byPriority: expensesByPriority,
        transactions: maintenanceExpenses.map(expense => ({
          id: expense.id,
          amount: expense.cost,
          priority: expense.priority,
          date: expense.completedAt || expense.createdAt,
          property: expense.property.title,
          description: expense.title
        }))
      },
      properties: properties.map(property => {
        const propertyPayments = payments.filter(p => p.application?.property &&
          // @ts-ignore
          p.application.property.title === property.title);
        const propertyExpenses = maintenanceExpenses.filter(e => e.property.title === property.title);

        const income = propertyPayments.reduce((sum, p) => sum + p.amount, 0);
        const expenses = propertyExpenses.reduce((sum, e) => sum + (e.cost || 0), 0);

        return {
          id: property.id,
          title: property.title,
          address: property.address,
          income,
          expenses,
          netIncome: income - expenses,
          rentAmount: property.rentAmount
        };
      })
    };

    res.json(report);
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

// Market insights and comparisons
router.get('/market-insights', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { borough, propertyType } = req.query;

    // Get user's properties for comparison
    const userProperties = await prisma.property.findMany({
      where: {
        ownerId: userId,
        ...(borough ? { borough: borough as any } : {}),
        ...(propertyType ? { propertyType: propertyType as any } : {})
      }
    });

    // Get market data (all properties for comparison)
    const marketProperties = await prisma.property.findMany({
      where: {
        status: 'AVAILABLE',
        ...(borough ? { borough: borough as any } : {}),
        ...(propertyType ? { propertyType: propertyType as any } : {})
      }
    });

    if (marketProperties.length === 0) {
      return res.json({
        marketData: {
          averageRent: 0,
          medianRent: 0,
          priceRange: { min: 0, max: 0 },
          totalListings: 0
        },
        userComparison: {
          aboveMarket: 0,
          atMarket: 0,
          belowMarket: 0
        },
        recommendations: []
      });
    }

    // Calculate market statistics
    const rents = marketProperties.map(p => p.rentAmount).sort((a, b) => a - b);
    const averageRent = rents.reduce((sum, rent) => sum + rent, 0) / rents.length;
    const medianRent = rents[Math.floor(rents.length / 2)];
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);

    // Compare user properties to market
    const userComparison = userProperties.reduce(
      (acc, property) => {
        const marketDiff = ((property.rentAmount - averageRent) / averageRent) * 100;

        if (marketDiff > 5) acc.aboveMarket++;
        else if (marketDiff < -5) acc.belowMarket++;
        else acc.atMarket++;

        return acc;
      },
      { aboveMarket: 0, atMarket: 0, belowMarket: 0 }
    );

    // Generate recommendations
    const recommendations = [];

    if (userComparison.belowMarket > 0) {
      recommendations.push({
        type: 'PRICE_INCREASE',
        title: 'Consider Rent Increase',
        description: `${userComparison.belowMarket} of your properties are priced below market average. Consider increasing rent by 5-10%.`,
        priority: 'HIGH'
      });
    }

    if (userComparison.aboveMarket > userComparison.atMarket + userComparison.belowMarket) {
      recommendations.push({
        type: 'PRICE_ADJUSTMENT',
        title: 'Review Pricing Strategy',
        description: 'Most of your properties are priced above market. Consider market positioning strategy.',
        priority: 'MEDIUM'
      });
    }

    recommendations.push({
      type: 'MARKET_TREND',
      title: 'Market Analysis',
      description: `Average rent in this market is $${Math.round(averageRent)}. Your portfolio average is $${Math.round(userProperties.reduce((sum, p) => sum + p.rentAmount, 0) / userProperties.length)}.`,
      priority: 'INFO'
    });

    const insights = {
      marketData: {
        averageRent: Math.round(averageRent),
        medianRent: Math.round(medianRent),
        priceRange: {
          min: minRent,
          max: maxRent
        },
        totalListings: marketProperties.length,
        borough: borough || 'All Boroughs',
        propertyType: propertyType || 'All Types'
      },
      userComparison,
      recommendations,
      priceDistribution: {
        under2000: rents.filter(r => r < 2000).length,
        between2000and3000: rents.filter(r => r >= 2000 && r < 3000).length,
        between3000and4000: rents.filter(r => r >= 3000 && r < 4000).length,
        over4000: rents.filter(r => r >= 4000).length
      }
    };

    res.json(insights);
  } catch (error) {
    console.error('Market insights error:', error);
    res.status(500).json({ error: 'Failed to fetch market insights' });
  }
});

export default router;
