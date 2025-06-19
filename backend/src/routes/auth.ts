import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';

const router = express.Router();
const prisma = new PrismaClient();

const generateToken = (userId: string, email: string, userType: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { userId, email, userType },
    secret,
    { expiresIn: '7d' }
  );
};

// Register
router.post('/register', validateRegistration, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, userType, phone } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      userType,
      phone,
      emailVerified: false,
      verificationStatus: 'PENDING'
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      userType: true,
      verificationStatus: true,
      emailVerified: true,
      createdAt: true
    }
  });

  // Send verification email
  try {
    await emailService.sendVerificationEmail({
      id: user.id,
      email: user.email,
      firstName: user.firstName
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't fail registration if email fails
  }

  const token = generateToken(user.id, user.email, user.userType);

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    user,
    token
  });
}));

// Login
router.post('/login', validateLogin, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const token = generateToken(user.id, user.email, user.userType);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    user: userWithoutPassword,
    token,
    emailVerified: user.emailVerified
  });
}));

// Email Verification
router.get('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const { token, userId } = req.query;

  if (!token || !userId) {
    return res.status(400).json({ error: 'Token and user ID are required' });
  }

  const verified = await emailService.verifyEmail(token as string, userId as string);

  if (verified) {
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } else {
    res.status(400).json({
      error: 'Invalid or expired verification token'
    });
  }
}));

// Resend Verification Email
router.post('/resend-verification', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      emailVerified: true
    }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.status(400).json({ error: 'Email is already verified' });
  }

  try {
    await emailService.sendVerificationEmail(user);
    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
}));

// Forgot Password
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      isActive: true
    }
  });

  if (!user || !user.isActive) {
    // Don't reveal if user exists for security
    return res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  }

  try {
    await emailService.sendPasswordResetEmail(user);
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
}));

// Reset Password
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, userId, newPassword } = req.body;

  if (!token || !userId || !newPassword) {
    return res.status(400).json({ error: 'Token, user ID, and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Verify reset token
  const isValidToken = await emailService.verifyPasswordReset(token, userId);
  if (!isValidToken) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password and mark token as used
  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    }),
    emailService.usePasswordResetToken(token, userId)
  ]);

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

// Verify Token
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        verificationStatus: true,
        emailVerified: true,
        phoneVerified: true,
        profileImage: true,
        isActive: true,
        lastLoginAt: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}));

// Logout (optionally invalidate token - for now just client-side)
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // In a more advanced implementation, you might want to maintain a blacklist of tokens
  // For now, the client will simply remove the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Check email availability
router.get('/check-email', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email as string },
    select: { id: true }
  });

  res.json({
    success: true,
    available: !existingUser
  });
}));

export default router;