const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Installez aussi 'node-fetch'
const app = express();

// 1. SÉCURITÉ : Masquer l'en-tête X-Powered-By pour satisfaire Snyk
app.disable('x-powered-by');

app.use(cors()); // Active CORS pour votre site web
app.use(express.json());

// API du proxy pour le login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Validation minimale des champs reçus
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email et mot de passe requis.' 
    });
  }

  const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbx-VYg-sA7fPEgSIZ9jCoihqcaYnzGi5KhwOJX6-CWqIKCwl0GAFp7xiV_k4vIT4nJbGg/exec';

  try {
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    res.status(response.status).json(data); // Renvoie la réponse de Google
  } catch (error) {
    console.error('Erreur du proxy:', error);
    res.status(500).json({ success: false, message: 'Erreur de connexion au serveur.' });
  }
});

// 2. ADAPTATION POUR LES TESTS :
// N'écouter sur le port que si le fichier est exécuté directement (node server.js),
// mais pas lors de l'exécution des tests unitaires (Jest/Supertest).
if (require.main === module) {
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Votre proxy est prêt sur le port ' + listener.address().port);
  });
}

// Exporter l'application Express pour permettre son importation dans server.test.js
module.exports = app;
