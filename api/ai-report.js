// api/ai-report.js
// PipSePaisa — AI Trade Report endpoint (Gemini free -> Groq free fallback)
// Keys are read from Vercel Environment Variables: GEMINI_API_KEY, GROQ_API_KEY
// Frontend sends POST { prompt: "..." }  -> returns { report: "...", provider: "gemini|groq" }

export default async function handler(req, res) {
  // --- CORS (allow your site to call this) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // body may arrive as string on some setups
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const prompt = (body && body.prompt ? String(body.prompt) : '').slice(0, 12000);
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // ---------- 1) Try Google Gemini (free Flash) ----------
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
              generationConfig: { temperature: 0.6, maxOutputTokens: 1200 }
            })
          }
        );
        if (r.ok) {
          const data = await r.json();
          const txt = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (txt.trim()) return res.status(200).json({ report: txt.trim(), provider: 'gemini' });
        }
        // if not ok (e.g. 429 quota), fall through to Groq
      } catch (e) { /* fall through */ }
    }

    // ---------- 2) Fallback: Groq (free, Llama) ----------
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (GROQ_KEY) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 1200,
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
      } catch (e) { /* fall through */ }
    }

    // ---------- Both failed ----------
    return res.status(503).json({ error: 'AI temporarily unavailable. Please try again later.' });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message || err) });
  }
}
