import request from 'supertest';
import app from '../server';
import { testUtils } from './setup';

describe('Application Routes', () => {
  let landlord: any;
  let renter: any;
  let property: any;
  let application: any;

  beforeEach(async () => {
    // Create test users
    landlord = await testUtils.createTestUser({
      email: 'landlord@test.com',
      userType: 'LANDLORD'
    });
    
    renter = await testUtils.createTestUser({
      email: 'renter@test.com',
      userType: 'RENTER'
    });

    // Create test property
    property = await testUtils.createTestProperty(landlord.id);
  });

  describe('POST /api/applications', () => {
    it('should create application for authenticated renter', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);
      const applicationData = {
        propertyId: property.id,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        employmentInfo: {
          employer: 'Test Company',
          position: 'Software Engineer',
          salary: 80000,
          startDate: '2020-01-01'
        },
        references: [
          {
            name: 'John Doe',
            relationship: 'Previous Landlord',
            phone: '555-1234',
            email: 'john@example.com'
          }
        ],
        monthlyIncome: 6000,
        notes: 'I am a responsible tenant'
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(applicationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.applicantId).toBe(renter.id);
      expect(response.body.data.propertyId).toBe(property.id);
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should not allow landlord to apply', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);
      const applicationData = {
        propertyId: property.id,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        employmentInfo: {},
        references: [],
        monthlyIncome: 6000
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(applicationData)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should not allow duplicate applications', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);
      const applicationData = {
        propertyId: property.id,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        employmentInfo: {},
        references: [],
        monthlyIncome: 6000
      };

      // First application
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(applicationData)
        .expect(201);

      // Duplicate application
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(applicationData)
        .expect(400);

      expect(response.body.error).toContain('already applied');
    });

    it('should not allow application to unavailable property', async () => {
      // Update property status
      await testUtils.prisma.property.update({
        where: { id: property.id },
        data: { status: 'RENTED' }
      });

      const token = testUtils.generateTestToken(renter.id, renter.userType);
      const applicationData = {
        propertyId: property.id,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        employmentInfo: {},
        references: [],
        monthlyIncome: 6000
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(applicationData)
        .expect(400);

      expect(response.body.error).toContain('not available');
    });

    it('should validate required fields', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);
      const invalidData = {
        propertyId: property.id
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/applications/my-applications', () => {
    beforeEach(async () => {
      // Create test application
      application = await testUtils.prisma.application.create({
        data: {
          applicantId: renter.id,
          propertyId: property.id,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          employmentInfo: {},
          references: [],
          monthlyIncome: 6000
        }
      });
    });

    it('should return renter\'s applications', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .get('/api/applications/my-applications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(application.id);
      expect(response.body.data[0].property).toBeDefined();
    });

    it('should not allow landlord to access renter applications', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get('/api/applications/my-applications')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/applications/property-applications', () => {
    beforeEach(async () => {
      application = await testUtils.prisma.application.create({
        data: {
          applicantId: renter.id,
          propertyId: property.id,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          employmentInfo: {},
          references: [],
          monthlyIncome: 6000
        }
      });
    });

    it('should return landlord\'s property applications', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get('/api/applications/property-applications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(application.id);
      expect(response.body.data[0].applicant).toBeDefined();
    });

    it('should filter by property ID', async () => {
      // Create another property and application
      const anotherProperty = await testUtils.createTestProperty(landlord.id, {
        title: 'Another Property'
      });
      await testUtils.prisma.application.create({
        data: {
          applicantId: renter.id,
          propertyId: anotherProperty.id,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          employmentInfo: {},
          references: [],
          monthlyIncome: 6000
        }
      });

      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get(`/api/applications/property-applications?propertyId=${property.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].propertyId).toBe(property.id);
    });

    it('should filter by status', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get('/api/applications/property-applications?status=PENDING')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((app: any) => {
        expect(app.status).toBe('PENDING');
      });
    });

    it('should not allow renter to access landlord applications', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .get('/api/applications/property-applications')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/applications/:id', () => {
    beforeEach(async () => {
      application = await testUtils.prisma.application.create({
        data: {
          applicantId: renter.id,
          propertyId: property.id,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          employmentInfo: {},
          references: [],
          monthlyIncome: 6000
        }
      });
    });

    it('should return application details to applicant', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .get(`/api/applications/${application.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(application.id);
      expect(response.body.data.applicant).toBeDefined();
      expect(response.body.data.property).toBeDefined();
    });

    it('should return application details to property owner', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get(`/api/applications/${application.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(application.id);
    });

    it('should not allow unauthorized user to view application', async () => {
      const otherUser = await testUtils.createTestUser({
        email: 'other@test.com',
        userType: 'RENTER'
      });
      const token = testUtils.generateTestToken(otherUser.id, otherUser.userType);

      const response = await request(app)
        .get(`/api/applications/${application.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .get('/api/applications/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/applications/:id/status', () => {
    beforeEach(async () => {
      application = await testUtils.prisma.application.create({
        data: {
          applicantId: renter.id,
          propertyId: property.id,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          employmentInfo: {},
          references: [],
          monthlyIncome: 6000
        }
      });
    });

    it('should allow landlord to approve application', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'APPROVED', notes: 'Great applicant!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.notes).toBe('Great applicant!');
    });

    it('should allow landlord to reject application', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'REJECTED', notes: 'Income too low' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('REJECTED');
    });

    it('should update property status when approved', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      await request(app)
        .put(`/api/applications/${application.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      // Check property status was updated
      const updatedProperty = await testUtils.prisma.property.findUnique({
        where: { id: property.id }
      });
      expect(updatedProperty?.status).toBe('PENDING');
    });

    it('should not allow invalid status', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body.error).toContain('Invalid status');
    });

    it('should not allow renter to update status', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'APPROVED' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should not allow non-owner to update application', async () => {
      const otherLandlord = await testUtils.createTestUser({
        email: 'other@test.com',
        userType: 'LANDLORD'
      });
      const token = testUtils.generateTestToken(otherLandlord.id, otherLandlord.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'APPROVED' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/applications/:id/withdraw', () => {
    beforeEach(async () => {
      application = await testUtils.prisma.application.create({
        data: {
          applicantId: renter.id,
          propertyId: property.id,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          employmentInfo: {},
          references: [],
          monthlyIncome: 6000
        }
      });
    });

    it('should allow renter to withdraw application', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('withdrawn');
    });

    it('should not allow withdrawal of non-pending application', async () => {
      // Update application status
      await testUtils.prisma.application.update({
        where: { id: application.id },
        data: { status: 'APPROVED' }
      });

      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toContain('pending');
    });

    it('should not allow non-applicant to withdraw', async () => {
      const otherRenter = await testUtils.createTestUser({
        email: 'other@test.com',
        userType: 'RENTER'
      });
      const token = testUtils.generateTestToken(otherRenter.id, otherRenter.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should not allow landlord to withdraw application', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .put(`/api/applications/${application.id}/withdraw`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});
