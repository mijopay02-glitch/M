import fetch from 'node-fetch';

export default async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Gère la requête "preflight" (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Répond à une requête GET pour éviter l'erreur 405
    if (req.method === 'GET') {
        return res.status(200).send('API is running.');
    }

    // Gère la requête de connexion POST
    if (req.method === 'POST') {
        const { email, password } = req.body;
        const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbx-VYg-sA7fPEgSIZ9jCoihqcaYnzGi5KhwOJX6-CWqIKCwl0GAFp7xiV_k4vIT4nJbGg/exec';

        try {
            const response = await fetch(googleScriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            console.error('Erreur du proxy:', error);
            return res.status(500).json({ success: false, message: 'Erreur de connexion au serveur.' });
        }
    }

    // Réponse par défaut si la méthode n'est pas gérée
    return res.status(405).send('Method Not Allowed');
};
