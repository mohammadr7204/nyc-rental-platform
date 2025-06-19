import request from 'supertest';
import app from '../../server';
import { testUtils } from '../setup';

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'securepassword123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'RENTER'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        userType: userData.userType
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not register user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'securepassword123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'RENTER'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should not register user with short password', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'short',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'RENTER'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'securepassword123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'RENTER'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await testUtils.createTestUser({
        email: 'logintest@example.com',
        userType: 'RENTER'
      });
    });

    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        email: loginData.email
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should not login inactive user', async () => {
      // Create inactive user
      await testUtils.createTestUser({
        email: 'inactive@example.com',
        isActive: false
      });

      const loginData = {
        email: 'inactive@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid JWT token', async () => {
      const user = await testUtils.createTestUser();
      const token = testUtils.generateTestToken(user.id, user.userType);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(user.id);
    });

    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await testUtils.createTestUser({
        email: 'forgotpass@example.com'
      });
    });

    it('should send password reset email for valid user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgotpass@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should not reveal if user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should require email parameter', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    beforeEach(async () => {
      await testUtils.createTestUser({
        email: 'unverified@example.com',
        emailVerified: false
      });
    });

    it('should resend verification email for unverified user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Verification email sent');
    });

    it('should not resend for already verified user', async () => {
      await testUtils.createTestUser({
        email: 'verified@example.com',
        emailVerified: true
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'verified@example.com' })
        .expect(400);

      expect(response.body.error).toContain('already verified');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'ratetest@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // This should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });
  });
});
