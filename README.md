# NYC Direct Rental Platform

A comprehensive rental platform built specifically for New York City, connecting landlords and tenants directly while maintaining full FARE Act compliance. Built with modern web technologies for scale, security, and user experience.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- Redis 6+
- Docker (optional, for easy development setup)
- Git

### Automated Setup

```bash
# Clone the repository
git clone https://github.com/mohammadr7204/nyc-rental-platform.git
cd nyc-rental-platform

# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

### Manual Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Copy environment configuration
cp .env.example .env
# Update .env with your actual configuration values

# Setup database
npx prisma db push
npx prisma generate

# Start development servers
npm run dev              # Frontend (http://localhost:3000)
cd backend && npm run dev # Backend (http://localhost:8000)
```

## 🏗️ Architecture

### Tech Stack

**Frontend**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Authentication**: JWT-based custom auth
- **Real-time**: Socket.IO client

**Backend**
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO server
- **File Storage**: AWS S3

**External Services**
- **Payments**: Stripe Connect
- **Maps**: Google Maps API
- **Background Checks**: Checkr API
- **Credit Checks**: Experian API
- **Document Signing**: DocuSign
- **Email**: SendGrid
- **SMS**: Twilio

## 🎯 Features

### Core Features (MVP)
- ✅ User authentication and authorization
- ✅ Property listing and search
- ✅ Real-time messaging between landlords and tenants
- ✅ Rental application system
- ✅ Payment processing with Stripe Connect
- ✅ Document management and e-signatures

### NYC-Specific Features
- ✅ FARE Act compliance
- ✅ NYC rental law integration
- ✅ Rent-stabilized property indicators
- ✅ No-fee property filtering

## 🚀 Deployment

### Production Environment Variables

```bash
# Essential production variables
NODE_ENV=production
DATABASE_URL=your_production_db_url
JWT_SECRET=secure_random_string_32_chars_min
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=prod_access_key
AWS_SECRET_ACCESS_KEY=prod_secret_key
FRONTEND_URL=https://yourdomain.com
```

### Recommended Platforms
- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Render, AWS EC2
- **Database**: Supabase, PlanetScale, AWS RDS
- **File Storage**: AWS S3, Cloudinary

## 📊 Business Model

### Revenue Streams

1. **Landlord Subscriptions**
   - Basic: $29/month (1 listing)
   - Professional: $49/month (5 listings)
   - Enterprise: $99/month (unlimited)

2. **Transaction Fees**
   - 2.9% on rent payments
   - Background check fees: $35/applicant

3. **Premium Services**
   - Professional photography: $150
   - Legal documents: $50
   - Insurance products: Variable

## 🛡️ Security & Compliance

### Security Measures
- JWT-based authentication
- bcrypt password hashing
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers

### Compliance
- **FARE Act**: Full compliance with NYC's FARE Act
- **PCI DSS**: Stripe handles payment processing
- **GDPR/CCPA**: Data protection compliance
- **Fair Housing Act**: Non-discriminatory practices

## 📚 Documentation

For detailed setup and development instructions, see:
- [Development Setup Guide](DEVELOPMENT_SETUP.md)
- [Project Status](PROJECT_STATUS.md)
- [API Documentation](docs/api.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ for NYC renters and landlords**

🚀 **Ready for launch!** This platform can immediately compete with existing players while offering unique advantages through technology and compliance.
