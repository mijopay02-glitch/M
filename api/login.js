import fetch from 'node-fetch';

export default async (req, res) => {
    // Définit les en-têtes CORS pour autoriser l'accès depuis votre site
    res.setHeader('Access-Control-Allow-Origin', 'https://mijopay02-glitch.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Gère la requête "preflight" (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { email, password } = req.body;
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbx-VYg-sA7fPEgSIZ9jCoihqcaYnzGi5KhwOJX6-CWqIKCwl0GAFp7xiV_k4vIT4nJbGg/exec';

    try {
        const response = await fetch(googleScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Erreur du proxy:', error);
        res.status(500).json({ success: false, message: 'Erreur de connexion au serveur.' });
    }
};
