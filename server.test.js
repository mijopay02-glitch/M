const request = require('supertest');
const app = require('./server'); // Importe ton serveur Express

describe('--- TESTS DE LOGIQUE MÉTIER ET SÉCURITÉ ---', () => {

  // ==========================================
  // 1. TESTS D'AUTHENTIFICATION & SÉCURITÉ
  // ==========================================
  describe('POST /api/login', () => {
    
    test('Devrait refuser une requête sans mot de passe ou email', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'test@example.com' }); // Mot de passe manquant

      // Attendu : Le serveur doit rejeter la demande (ex: Code 400 Bad Request)
      expect(response.statusCode).not.toBe(200);
    });

    test('Ne doit pas exposer l\'en-tête X-Powered-By', async () => {
      const response = await request(app).post('/api/login');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ==========================================
  // 2. TESTS DE TRANSACTION & CALCULS DE SOLDE
  // ==========================================
  describe('POST /api/payout (Validation des montants)', () => {

    test('Devrait REJETER les montants négatifs (ex: -500 HTG)', async () => {
      const response = await request(app)
        .post('/api/payout')
        .send({
          userId: 'usr_123',
          amount: -500, // Tentative de fraude avec montant négatif
          currency: 'HTG'
        });

      // Le serveur doit retourner une erreur de validation
      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/montant invalide/i);
    });

    test('Devrait REJETER les montants égaux à zéro (0 HTG)', async () => {
      const response = await request(app)
        .post('/api/payout')
        .send({
          userId: 'usr_123',
          amount: 0,
          currency: 'HTG'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Devrait REJETER les valeurs non numériques (ex: "cinq cents")', async () => {
      const response = await request(app)
        .post('/api/payout')
        .send({
          userId: 'usr_123',
          amount: "500_hacked",
          currency: 'HTG'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

});
