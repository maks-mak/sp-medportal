# MedPortal V2 — Product & Security Direction

## Visual concept

V2 builds around a premium clinical aesthetic: deep midnight blues, muted mineral glass surfaces, soft gold guidance accents, and restrained emerald safety signals. The interface should feel calm, expensive, and medically credible rather than sterile or “hospital white”. Typography stays on modern grotesks and display contrast is used sparingly to create hierarchy without visual noise.

## Security direction

For the current deployed static shell, the safest practical model is a split architecture: presentation on GitHub Pages, identity and data on Supabase Auth + Postgres + RLS + Edge Functions with strict validation, allow-listed origins, and fail-closed routes. For the true enterprise target state, the portal should move behind a server edge (Next.js/Cloudflare Workers/Vercel) with short-lived access tokens, refresh handled in httpOnly secure cookies, bot protection on auth flows, audit trails, and centralized rate limiting / WAF.

## Preferred production stack

- Frontend: Next.js App Router + TypeScript
- UI: Tailwind CSS + tokenized design system + motion primitives
- Auth: server-mediated Supabase Auth or Clerk/NextAuth with httpOnly cookies
- Data: Postgres with strict Row Level Security and migration discipline
- Validation: shared schemas with Zod on client and server
- Abuse protection: Cloudflare Turnstile, rate limiting, origin restrictions, CSP/HSTS/XFO
- Observability: structured audit logs for auth, role changes, notices, and adverse-event actions

## Immediate UX priorities

1. Make the employee dashboard feel like a living work surface, not a grid of links
2. Make the auth experience premium, trustworthy, and self-explanatory
3. Make the ОКК / adverse-event workflow feel operational and role-driven
4. Reduce friction while increasing safety defaults everywhere
