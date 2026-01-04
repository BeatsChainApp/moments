# Issue: Implement user-facing PWA app (per `frontend/routes_map.md`)

Priority: P0

Summary:
Implement the subscriber-facing application using Next.js App Router. The admin dashboard remains in `public/`.

Acceptance criteria:
- `app/` contains pages matching `frontend/routes_map.md` (dashboard, moments, sponsors, broadcasts, moderation, subscribers, analytics).
- Client app is a PWA: `manifest.json` in `public/` and service worker caching working for offline read.
- API proxies available at `app/api/*` that proxy to legacy Express endpoints when `NEXT_PUBLIC_API_BASE` is set.
- Basic smoke tests verifying pages render.

Notes:
- See `app/` scaffolded files.
