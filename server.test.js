const request = require('supertest');
const app = require('./server');

describe('--- TESTS DE SÉCURITÉ ET LOGIN ---', () => {

  describe('POST /api/login', () => {
    test('Devrait refuser une requête sans mot de passe ou email', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@example.com' });

      expect(response.statusCode).toBe(400);
    });

    test('Ne doit pas exposer l\'en-tête X-Powered-By', async () => {
      const response = await request(app).post('/api/login');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

});
