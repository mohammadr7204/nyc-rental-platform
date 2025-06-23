# NYC Rental Platform - Production Deployment Guide

> **Production-Ready NYC FARE Act Compliant Rental Platform**
> Complete with mobile app infrastructure, monitoring, and enterprise-grade features

## 🚀 Quick Start Production Deployment

```bash
# 1. Clone and configure
git clone https://github.com/mohammadr7204/nyc-rental-platform.git
cd nyc-rental-platform

# 2. Configure production environment
cp .env.production.example .env.production
# Edit .env.production with your production values

# 3. Deploy to production
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy --backup

# 4. Verify deployment
./scripts/deploy.sh health
```

## 📋 Production Features Completed

### ✅ **Core Platform Features (100% Complete)**
- **Complete Tenant Portal** - Self-service dashboard with payment processing
- **Advanced Lease Management** - Automated renewals and compliance monitoring
- **Maintenance Management** - Full workflow with vendor assignment
- **Payment Processing** - Stripe Connect with FARE Act compliance
- **Property Analytics** - Comprehensive reporting and market insights
- **Vendor Management** - Contractor management with reviews and ratings
- **Property Inspections** - Scheduling, documentation, and reporting
- **Real-time Messaging** - Landlord-tenant communication system

### ✅ **Production Infrastructure (100% Complete)**
- **Health Monitoring System** - Comprehensive health checks and metrics
- **Production Analytics Dashboard** - Real-time system monitoring
- **API Performance Monitoring** - Response times, error rates, endpoint analytics
- **SSL Certificate Management** - Automated Let's Encrypt with Traefik
- **Database Backups** - Automated PostgreSQL backups with retention
- **Container Orchestration** - Production Docker Compose with monitoring
- **Load Balancing** - Traefik reverse proxy with health checks

### ✅ **Mobile App Infrastructure (100% Complete)**
- **Push Notification Service** - Firebase Cloud Messaging integration
- **Mobile API Endpoints** - Versioned mobile-optimized APIs (/api/v1/*)
- **Offline Data Sync** - Complete offline support with conflict resolution
- **Device Token Management** - Registration, validation, and lifecycle management
- **Mobile Rate Limiting** - Optimized rate limits for mobile usage patterns
- **Reference Data Caching** - Static data caching for offline browsing

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Native  │    │    Next.js Web   │    │   Admin Panel   │
│   Mobile App    │    │    Frontend      │    │   (Grafana)     │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────┬───────────┼───────────────────────┘
                     │           │
                ┌────▼───────────▼────┐
                │    Traefik Proxy    │
                │   (SSL + Routing)   │
                └─────────┬───────────┘
                          │
                ┌─────────▼───────────┐
                │   Express.js API    │
                │  (Health + Mobile)  │
                └─────────┬───────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
         ┌────▼───┐  ┌───▼────┐  ┌───▼────┐
         │PostgreSQL│ │ Redis  │  │Firebase│
         │Database│ │ Cache  │  │  FCM   │
         └────────┘  └────────┘  └────────┘
```

## 📱 Mobile App Development Ready

### Push Notifications
```javascript
// Register device token
POST /api/v1/notifications/register-token
{
  "token": "firebase-device-token",
  "platform": "ios|android|web",
  "deviceInfo": { "model": "iPhone 14", "os": "iOS 16" }
}

// Send templated notification
POST /api/v1/notifications/payment-reminder
{
  "amount": 2500,
  "dueDate": "2025-07-01",
  "userIds": ["user-123"]
}
```

### Offline Data Sync
```javascript
// Sync offline changes
POST /api/v1/mobile/sync
{
  "lastSyncTimestamp": "2025-06-22T10:00:00Z",
  "deviceId": "device-123",
  "clientChanges": {
    "maintenanceRequests": [...],
    "payments": [...]
  }
}

// Get offline bundle
GET /api/v1/mobile/offline-bundle
// Returns essential data for offline operation
```

### Reference Data Caching
```javascript
// Get cacheable reference data
GET /api/v1/mobile/reference-data
// Returns NYC neighborhoods, amenities, FARE Act info, etc.
```

## 🔧 Production Deployment

### Prerequisites
- Docker & Docker Compose
- Domain with DNS pointing to your server
- SSL certificate email for Let's Encrypt

### Environment Configuration
1. **Copy environment template:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Configure required variables:**
   ```env
   # Database
   DATABASE_URL=postgresql://user:pass@postgres:5432/nyc_rental_platform_prod
   
   # Redis
   REDIS_URL=redis://:password@redis:6379
   
   # Security
   JWT_SECRET=your_strong_jwt_secret_64_chars_min
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret
   
   # AWS S3
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_S3_BUCKET=your-bucket-name
   
   # Firebase (for push notifications)
   FIREBASE_PROJECT_ID=your-firebase-project
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   
   # SSL
   ACME_EMAIL=ssl@yourdomain.com
   ```

### Deployment Commands
```bash
# Full production deployment
./scripts/deploy.sh deploy --backup

# Update existing deployment
./scripts/deploy.sh update --force

# Create manual backup
./scripts/deploy.sh backup

# Check system health
./scripts/deploy.sh health

# View service logs
./scripts/deploy.sh logs backend
./scripts/deploy.sh logs frontend

# Restart services
./scripts/deploy.sh restart
```

## 📊 Monitoring & Analytics

### Health Check Endpoints
- **Overall Health:** `https://api.yourdomain.com/health`
- **Liveness Probe:** `https://api.yourdomain.com/health/live`
- **Readiness Probe:** `https://api.yourdomain.com/health/ready`
- **System Metrics:** `https://api.yourdomain.com/health/metrics`
- **Detailed Analytics:** `https://api.yourdomain.com/health/metrics/detailed`

### Production Analytics Dashboard
Access the production analytics dashboard at:
```
https://yourdomain.com/admin/production-dashboard
```

Features:
- Real-time service health monitoring
- API performance metrics and response times
- System resource usage (memory, CPU, disk)
- Error analysis and recent error tracking
- Database performance and query metrics

### Monitoring Stack
- **Grafana:** `https://grafana.yourdomain.com` - Metrics visualization
- **Prometheus:** `https://prometheus.yourdomain.com` - Metrics collection
- **Traefik Dashboard:** `https://traefik.yourdomain.com` - Load balancer stats

## 🔒 Security Features

### API Security
- **Rate Limiting:** Endpoint-specific with mobile optimization
- **CORS Configuration:** Production-ready with mobile app support
- **Security Headers:** Comprehensive security policy implementation
- **Authentication:** JWT-based with session management
- **Input Validation:** SQL injection and XSS protection

### Mobile Security
- **Device Token Validation:** Firebase token verification
- **API Versioning:** Backward compatibility with security updates
- **Offline Security:** Secure data caching and conflict resolution
- **Push Notification Security:** Encrypted FCM with user preferences

## 📱 React Native Mobile App Development

### Getting Started
1. **Backend is Ready:** All mobile endpoints are implemented and tested
2. **Push Notifications:** Firebase FCM integration complete
3. **Offline Support:** Data sync and caching APIs available
4. **Reference Data:** NYC-specific data endpoints for offline browsing

### Mobile API Endpoints
All web APIs are available with mobile optimization at `/api/v1/*`:

- **Authentication:** `/api/v1/auth/*`
- **Tenant Portal:** `/api/v1/tenant/*`
- **Payments:** `/api/v1/payments/*`
- **Maintenance:** `/api/v1/maintenance/*`
- **Messages:** `/api/v1/messages/*`
- **Notifications:** `/api/v1/notifications/*`
- **Mobile Offline:** `/api/v1/mobile/*`

### Recommended Mobile App Structure
```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   │   ├── tenant/         # Tenant portal screens
│   │   ├── landlord/       # Landlord management screens
│   │   └── shared/         # Shared screens (auth, search)
│   ├── services/           # API service layer
│   │   ├── api.js          # Base API configuration
│   │   ├── sync.js         # Offline sync service
│   │   └── notifications.js # Push notification handling
│   ├── utils/              # Utility functions
│   │   ├── storage.js      # Offline storage management
│   │   └── validation.js   # Form validation
│   └── navigation/         # React Navigation setup
├── firebase.json           # Firebase configuration
└── package.json
```

## 🚀 Production URLs

After deployment, your platform will be available at:

- **Frontend:** `https://yourdomain.com`
- **API:** `https://api.yourdomain.com`
- **Production Dashboard:** `https://yourdomain.com/admin/production-dashboard`
- **Grafana Monitoring:** `https://grafana.yourdomain.com`
- **API Documentation:** `https://api.yourdomain.com/api/docs`

## 📈 Performance Benchmarks

### Production Performance Targets
- **API Response Time:** < 200ms average
- **Database Query Time:** < 100ms average
- **Page Load Time:** < 2 seconds
- **Mobile Sync Time:** < 5 seconds
- **Push Notification Delivery:** < 10 seconds

### Monitoring Metrics
- **System Health:** 99.9% uptime target
- **Error Rate:** < 0.1% of requests
- **Memory Usage:** < 80% of allocated resources
- **Database Connections:** Efficient connection pooling
- **Cache Hit Rate:** > 90% for cached data

## 🛠️ Maintenance & Operations

### Database Management
```bash
# Create backup
./scripts/deploy.sh backup

# List backups
ls -la backups/

# Restore from backup
./scripts/deploy.sh restore 20250622_143000

# View database logs
./scripts/deploy.sh logs postgres
```

### Log Management
```bash
# View all service logs
./scripts/deploy.sh logs

# View specific service logs
./scripts/deploy.sh logs backend
./scripts/deploy.sh logs frontend
./scripts/deploy.sh logs redis

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Performance Optimization
```bash
# Clean up unused Docker resources
./scripts/deploy.sh cleanup

# Restart services for updates
./scripts/deploy.sh restart

# Check system health
./scripts/deploy.sh health
```

## 🎯 Next Steps: Mobile App Development

With this production infrastructure complete, you're ready to:

1. **Initialize React Native App:**
   ```bash
   npx react-native init NYCRentalMobile
   cd NYCRentalMobile
   npm install @react-native-firebase/app @react-native-firebase/messaging
   ```

2. **Implement Core Features:**
   - User authentication with JWT tokens
   - Tenant portal with offline support
   - Push notification handling
   - Payment processing integration
   - Maintenance request management
   - Real-time messaging

3. **Configure Firebase:**
   - Add `google-services.json` (Android)
   - Add `GoogleService-Info.plist` (iOS)
   - Configure push notification permissions

4. **Implement Offline Sync:**
   - Use the `/api/v1/mobile/sync` endpoint
   - Implement local SQLite storage
   - Handle conflict resolution

## 🏆 Production Readiness Checklist

- ✅ **Complete Platform Features** - All landlord and tenant functionality
- ✅ **Production Infrastructure** - SSL, monitoring, backups, health checks
- ✅ **Mobile App Backend** - Push notifications, offline sync, versioned APIs
- ✅ **Security Implementation** - Rate limiting, authentication, input validation
- ✅ **Monitoring & Analytics** - Real-time system monitoring and performance tracking
- ✅ **Deployment Automation** - Comprehensive deployment scripts and documentation
- ✅ **Database Management** - Automated backups and recovery procedures
- ✅ **Performance Optimization** - Caching, compression, and resource management

## 📞 Support & Documentation

- **API Documentation:** Available at `/api/docs` (development only)
- **Health Endpoints:** Monitor system status and performance
- **Monitoring Dashboards:** Grafana for detailed metrics
- **Log Analysis:** Centralized logging with Loki and Promtail

---

**The NYC Rental Platform is now production-ready with complete mobile app infrastructure!** 🎉

*Built with ❤️ for NYC landlords and tenants, fully compliant with the FARE Act and ready for enterprise deployment.*