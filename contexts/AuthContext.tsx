'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'RENTER' | 'LANDLORD' | 'PROPERTY_MANAGER';
  profileImage?: string;
  verificationStatus: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await authService.verifyToken();
        setUser(userData.user);
      }
    } catch (error) {
      localStorage.removeItem('token');
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      localStorage.setItem('token', response.token);
      setUser(response.user);
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.response?.data?.error || 'An error occurred during login.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authService.register(userData);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      toast({
        title: 'Account Created!',
        description: 'Welcome to NYC Rental Platform. Your account has been created successfully.',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.response?.data?.error || 'An error occurred during registration.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
      variant: 'default'
    });
    window.location.href = '/';
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}