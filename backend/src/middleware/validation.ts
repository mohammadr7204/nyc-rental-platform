import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('userType')
    .isIn(['RENTER', 'LANDLORD', 'PROPERTY_MANAGER'])
    .withMessage('User type must be RENTER, LANDLORD, or PROPERTY_MANAGER'),
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

export const validateProperty = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Title must be between 10 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Description must be between 50 and 2000 characters'),
  body('address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  body('borough')
    .isIn(['MANHATTAN', 'BROOKLYN', 'QUEENS', 'BRONX', 'STATEN_ISLAND'])
    .withMessage('Borough must be a valid NYC borough'),
  body('zipCode')
    .matches(/^\d{5}$/)
    .withMessage('ZIP code must be 5 digits'),
  body('propertyType')
    .isIn(['APARTMENT', 'HOUSE', 'CONDO', 'STUDIO', 'TOWNHOUSE', 'LOFT'])
    .withMessage('Property type must be valid'),
  body('bedrooms')
    .isInt({ min: 0, max: 10 })
    .withMessage('Bedrooms must be between 0 and 10'),
  body('bathrooms')
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Bathrooms must be between 0.5 and 10'),
  body('rentAmount')
    .isInt({ min: 500, max: 50000 })
    .withMessage('Rent amount must be between $500 and $50,000'),
  body('securityDeposit')
    .isInt({ min: 0, max: 100000 })
    .withMessage('Security deposit must be between $0 and $100,000'),
  body('availableDate')
    .isISO8601()
    .withMessage('Available date must be a valid date'),
  handleValidationErrors
];

export const validateApplication = [
  body('moveInDate')
    .isISO8601()
    .withMessage('Move-in date must be a valid date'),
  body('monthlyIncome')
    .isInt({ min: 1000 })
    .withMessage('Monthly income must be at least $1,000'),
  body('employmentInfo')
    .isObject()
    .withMessage('Employment info must be provided'),
  handleValidationErrors
];