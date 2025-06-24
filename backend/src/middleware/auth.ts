import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    userType: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Development fallback for mock tokens
    if (process.env.NODE_ENV === 'development' && token.includes('mock')) {
      req.user = {
        userId: '1',
        email: 'test@example.com',
        userType: 'RENTER'
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, userType: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      userType: user.userType
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireUserType = (userTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!userTypes.includes(req.user.userType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};