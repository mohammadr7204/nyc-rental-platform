import request from 'supertest';
import app from '../server';
import { testUtils } from './setup';

describe('Properties Routes', () => {
  let landlord: any;
  let renter: any;
  let property: any;

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
  });

  describe('GET /api/properties', () => {
    beforeEach(async () => {
      // Create test properties
      property = await testUtils.createTestProperty(landlord.id);
    });

    it('should return all available properties without authentication', async () => {
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter properties by borough', async () => {
      const response = await request(app)
        .get('/api/properties?borough=MANHATTAN')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((prop: any) => {
        expect(prop.borough).toBe('MANHATTAN');
      });
    });

    it('should filter properties by price range', async () => {
      const response = await request(app)
        .get('/api/properties?minRent=2000&maxRent=5000')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((prop: any) => {
        expect(prop.rentAmount).toBeGreaterThanOrEqual(2000);
        expect(prop.rentAmount).toBeLessThanOrEqual(5000);
      });
    });

    it('should paginate results correctly', async () => {
      // Create multiple properties
      for (let i = 0; i < 25; i++) {
        await testUtils.createTestProperty(landlord.id, {
          title: `Test Property ${i}`,
          rentAmount: 3000 + i * 100
        });
      }

      const response = await request(app)
        .get('/api/properties?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/properties/:id', () => {
    beforeEach(async () => {
      property = await testUtils.createTestProperty(landlord.id);
    });

    it('should return property details', async () => {
      const response = await request(app)
        .get(`/api/properties/${property.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(property.id);
      expect(response.body.data.title).toBe(property.title);
      expect(response.body.data.owner).toBeDefined();
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .get('/api/properties/non-existent-id')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/properties', () => {
    it('should create property for authenticated landlord', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);
      const propertyData = {
        title: 'New Test Property',
        description: 'A beautiful property for testing',
        address: '456 Test Avenue',
        borough: 'BROOKLYN',
        zipCode: '11201',
        propertyType: 'APARTMENT',
        bedrooms: 3,
        bathrooms: 2,
        rentAmount: 4000,
        securityDeposit: 4000,
        availableDate: new Date().toISOString(),
        amenities: ['Gym', 'Pool'],
        photos: []
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(propertyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(propertyData.title);
      expect(response.body.data.ownerId).toBe(landlord.id);
    });

    it('should not allow renter to create property', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);
      const propertyData = {
        title: 'New Test Property',
        description: 'A beautiful property for testing',
        address: '456 Test Avenue',
        borough: 'BROOKLYN',
        zipCode: '11201',
        propertyType: 'APARTMENT',
        bedrooms: 3,
        bathrooms: 2,
        rentAmount: 4000,
        securityDeposit: 4000,
        availableDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(propertyData)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);
      const invalidData = {
        title: 'Test',
        description: 'Short'
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/properties/:id', () => {
    beforeEach(async () => {
      property = await testUtils.createTestProperty(landlord.id);
    });

    it('should update property for owner', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);
      const updateData = {
        title: 'Updated Property Title',
        rentAmount: 3500
      };

      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.rentAmount).toBe(updateData.rentAmount);
    });

    it('should not allow non-owner to update property', async () => {
      const otherLandlord = await testUtils.createTestUser({
        email: 'other@test.com',
        userType: 'LANDLORD'
      });
      const token = testUtils.generateTestToken(otherLandlord.id, otherLandlord.userType);
      
      const response = await request(app)
        .put(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Hacked Title' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/properties/:id', () => {
    beforeEach(async () => {
      property = await testUtils.createTestProperty(landlord.id);
    });

    it('should delete property for owner', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not allow non-owner to delete property', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .delete(`/api/properties/${property.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/properties/:id/save', () => {
    beforeEach(async () => {
      property = await testUtils.createTestProperty(landlord.id);
    });

    it('should allow renter to save property', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .post(`/api/properties/${property.id}/save`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.saved).toBe(true);
    });

    it('should toggle saved status on repeated calls', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      // First save
      await request(app)
        .post(`/api/properties/${property.id}/save`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Second save (unsave)
      const response = await request(app)
        .post(`/api/properties/${property.id}/save`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.saved).toBe(false);
    });

    it('should not allow landlord to save property', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .post(`/api/properties/${property.id}/save`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/properties/owner/my-properties', () => {
    beforeEach(async () => {
      await testUtils.createTestProperty(landlord.id);
      await testUtils.createTestProperty(landlord.id, { title: 'Second Property' });
    });

    it('should return landlord\'s properties', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get('/api/properties/owner/my-properties')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((prop: any) => {
        expect(prop.ownerId).toBe(landlord.id);
      });
    });

    it('should not allow renter to access endpoint', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .get('/api/properties/owner/my-properties')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/properties/saved/my-saved', () => {
    beforeEach(async () => {
      property = await testUtils.createTestProperty(landlord.id);
      
      // Save the property for the renter
      await testUtils.prisma.savedProperty.create({
        data: {
          userId: renter.id,
          propertyId: property.id
        }
      });
    });

    it('should return renter\'s saved properties', async () => {
      const token = testUtils.generateTestToken(renter.id, renter.userType);

      const response = await request(app)
        .get('/api/properties/saved/my-saved')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(property.id);
    });

    it('should not allow landlord to access endpoint', async () => {
      const token = testUtils.generateTestToken(landlord.id, landlord.userType);

      const response = await request(app)
        .get('/api/properties/saved/my-saved')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});
