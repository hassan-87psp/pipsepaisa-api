# PipSePaisa API

Vercel serverless proxies for the PipSePaisa platform.

Endpoints:
- GET /api/news      -> { success, items: [{title, desc, date, url, source}] }   (News Hub)
- GET /api/calendar  -> [{date, title, currency, impact, forecast, previous, actual, time}]  (Economic News)
- GET /api/strength  -> { strengths: [{currency, strength}], latest_date }  (Currency Strength)

## Deploy
1. Create a new project on vercel.com
2. Upload this folder (or connect a GitHub repo)
3. Name the project: pipsepaisa-api  (so URL becomes https://pipsepaisa-api.vercel.app)
4. Deploy. No env vars needed.

Sources used (all free, no API key):
- News: Google News RSS
- Calendar: faireconomy.media (Forex Factory weekly JSON)
- Strength: frankfurter.app FX rates
