export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const { messages, type } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body. Expected { messages: [...] }' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: type === 'followup' ? 400 : 700,
        temperature: 0.7,
        messages
      })
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({
        error: errData?.error?.message || `Groq returned ${groqRes.status}`
      });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ content });

  } catch (err) {
    console.error('Groq API error:', err);
    return res.status(500).json({ error: 'Failed to reach Groq API.' });
  }
}
