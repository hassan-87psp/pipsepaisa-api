// api/ai-report.js
// PipSePaisa — authenticated AI Trade Report endpoint
// Provider keys stay server-side in Vercel Environment Variables.

const SUPABASE_URL = 'https://etfolhinohgmskbfjoyh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_LgmfuH2ePiY8fxNGs7nTTA_FSS_oPBw';

const ALLOWED_ORIGINS = new Set([
  'https://www.pipsepaisa.com',
  'https://pipsepaisa.com',
  'https://hassan-87psp.github.io'
]);

function applyCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  return !origin || ALLOWED_ORIGINS.has(origin);
}

async function consumeAiAllowance(authHeader) {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/psp_ai_rate_limit_v475', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': authHeader
      },
      body: '{}'
    });
    if (!r.ok) return { ok: false, status: 401 };
    const allowed = await r.json();
    return { ok: allowed === true, status: allowed === true ? 200 : 429 };
  } catch (_) {
    return { ok: false, status: 503 };
  }
}

export default async function handler(req, res) {
  const corsOk = applyCors(req, res);
  if (req.method === 'OPTIONS') return corsOk ? res.status(204).end() : res.status(403).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > 20000) return res.status(413).json({ error: 'Request too large' });

  const authHeader = String(req.headers.authorization || '');
  if (!/^Bearer\s+\S+$/i.test(authHeader)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const allowance = await consumeAiAllowance(authHeader);
  if (!allowance.ok) {
    if (allowance.status === 429) return res.status(429).json({ error: 'AI request limit reached. Please try again later.' });
    if (allowance.status === 503) return res.status(503).json({ error: 'Security check temporarily unavailable.' });
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    const prompt = (body && body.prompt ? String(body.prompt) : '').slice(0, 8000);
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_KEY) {
      try {
        const r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.6, maxOutputTokens: 3000, thinkingConfig: { thinkingBudget: 0 } }
            })
          }
        );
        if (r.ok) {
          const data = await r.json();
          const txt = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (txt.trim()) return res.status(200).json({ report: txt.trim(), provider: 'gemini' });
        }
      } catch (_) {}
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (GROQ_KEY) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 3000,
            messages: [
              { role: 'system', content: 'You are a professional forex trading coach. Be clear, specific and encouraging.' },
              { role: 'user', content: prompt }
            ]
          })
        });
        if (r.ok) {
          const data = await r.json();
          const txt = data?.choices?.[0]?.message?.content || '';
          if (txt.trim()) return res.status(200).json({ report: txt.trim(), provider: 'groq' });
        }
      } catch (_) {}
    }

    return res.status(503).json({ error: 'AI temporarily unavailable. Please try again later.' });
  } catch (_) {
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
