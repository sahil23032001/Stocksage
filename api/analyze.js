export default async function handler(req, res) {
  // ---------------- CORS ----------------
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---------------- RATE LIMIT ----------------
  const rateLimit = global.rateLimitMap || new Map();
  global.rateLimitMap = rateLimit;

  const ip =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 15;

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }

  const timestamps = rateLimit.get(ip).filter(t => now - t < windowMs);
  timestamps.push(now);
  rateLimit.set(ip, timestamps);

  if (timestamps.length > limit) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // ---------------- API KEY ----------------
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: 'GROQ_API_KEY is not configured on the server.'
    });
  }

  // ---------------- BODY VALIDATION ----------------
  const { messages, type } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Invalid request body. Expected { messages: [...] }'
    });
  }

  // ---------------- SANITIZE INPUT ----------------
  const cleanMessages = messages.slice(0, 20).map(m => ({
    role: m.role,
    content: String(m.content).slice(0, 1000)
  }));

  // ---------------- SYSTEM PROMPT ----------------
  const systemPrompt = {
    role: "system",
    content: `
You are an AI-powered stock research assistant.

STRICT RULES:
- DO NOT give direct buy/sell recommendations
- Provide only analytical insights
- Mention both positives and risks
- Keep response structured and concise

FORMAT:

Stock: <Name>
Trend: Bullish / Bearish / Neutral

Key Insights:
- ...
- ...

Risk Factors:
- ...

Confidence: Low / Medium / High

Always end with:
"This is not financial advice."
`
  };

  const finalMessages = [systemPrompt, ...cleanMessages];

  // ---------------- API CALL ----------------
  try {
    console.log("Incoming request:", {
      ip,
      type,
      messageCount: cleanMessages.length
    });

    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: type === 'followup' ? 400 : 700,
          temperature: 0.5,
          messages: finalMessages
        })
      }
    );

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({
        error:
          errData?.error?.message ||
          `Groq returned ${groqRes.status}`
      });
    }

    const data = await groqRes.json();
    const content =
      data.choices?.[0]?.message?.content ?? '';

    // ---------------- RESPONSE ----------------
    return res.status(200).json({ content });

  } catch (err) {
    console.error('Groq API error:', err);
    return res.status(500).json({
      error: 'Failed to reach Groq API.'
    });
  }
}
