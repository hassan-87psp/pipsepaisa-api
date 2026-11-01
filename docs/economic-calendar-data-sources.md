# PipSePaisa Economic Calendar — rolling weekly sync

Last reviewed: 2 November 2026.

## Sources and order

1. Finance Calendar provides the broad timestamped schedule, with published Forecast, Previous and Actual and visible attribution.
2. Forex Factory *thisweek* JSON supplies published names, impact and figures. When published, its exact-matched values win.
3. For the *nextweek* window, the service attempts the dated Forex Factory calendar, then a current-week-locked verified snapshot, then the FF nextweek JSON. The dated page may respond with Cloudflare 403 and the nextweek JSON may respond with 404; those are unavailable, not zero-event weeks.
4. **Optional licensed backup:** Trading Economics Calendar API, enabled by setting `TRADING_ECONOMICS_API_KEY` as a secure **Vercel server-side environment variable**. Never place the key in frontend JS or GitHub source. A Trading Economics calendar license and valid key are required; the optional integration is not active without them.
5. If the FF and licensed backup sources are unavailable, Finance Calendar remains the attributed fallback. Do not label it as a Forex Factory match.

## How to enable licensed backup

- Confirm the Trading Economics plan permits website/public redistribution and desired call volume.
- Add `TRADING_ECONOMICS_API_KEY` in Vercel Project Settings → Environment Variables (Production; Preview if needed).
- Redeploy the API after setting it.
- Verify API response headers `X-Calendar-FF-NextWeek-Status`, `X-Calendar-TE-Status`, `X-Calendar-NextWeek-Backup`, and `X-Calendar-Feed-Checked-At`.
- Never expose secret values in test logs or network responses.

TE calendar data is distinguished by `source: "Trading Economics"` and field source URLs. Its title **may differ** from Forex Factory; no exact FF parity is claimed unless the FF feed is independently verified.

## Automation and monitoring

`.github/workflows/economic-calendar-weekly-sync.yml` runs daily at 01:17, 07:17, 13:17 and 19:17 UTC. It runs all backend tests, compares the deployed calendar with published FF dates/values, checks all 4 frontend routes, and tries to update the verified nextweek snapshot.

The parity check intentionally **fails** when the published FF *nextweek* feed cannot be verified; such an incomplete check is not marked green. This escalates via [GitHub issue #2](https://github.com/hassan-87psp/pipsepaisa-api/issues/2) with at most one issue comment per UTC day. It remains unresolved until an actual published next-week source comparison passes.

Do not fabricate unpublished numeric Actual, Forecast or Previous values; tentative or estimated event times must not appear as precise scheduled releases.

## Quality checks

- `npm test` includes release gating, weekly rollover/DST, strict FF event matching, HTML parser, Trading Economics provider normalization, and optional backup end-to-end simulation.
- `node scripts/calendar-week-parity.cjs` validates live source parity. Exit code nonzero means incomplete/failing parity, not necessarily a broken site.
- `node scripts/live-calendar-frontend-smoke.cjs` checks deployed routes, mobile date filter CSS, shared asset version and basic HTTP timings.

**Known blocker:** On 2 Nov 2026, current-week FF 116/116 matched, but 8–14 Nov next-week FF source remained inaccessible (dated HTML 403 / nextweek JSON 404). Optional TE integration has been coded and tested but production credentials have not been supplied.
