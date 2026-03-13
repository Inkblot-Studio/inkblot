# Industry-Leading Technical Stack for Inkblot Website

## Core Stack (Implemented Foundation)

- Frontend shell: Astro + TypeScript
- Interaction layer: React islands
- 3D experience: Three.js via React Three Fiber + Drei
- Motion system: GSAP (ready to integrate)
- Styling system: Tailwind CSS v4 + custom design tokens
- Validation primitives: Zod

## Why This Stack

- Astro minimizes JavaScript by default, keeping baseline speed high.
- React islands allow advanced interaction only where business value is clear.
- R3F + Drei provide production-grade control for cinematic 3D scenes.
- Tailwind tokens keep visual consistency while remaining fast to iterate.

## Integration + Data Layer (Next Build Step)

- API layer: Hono on Bun runtime
- CRM integration: HubSpot or Pipedrive connector via background jobs
- Queue/cache: Redis or Valkey
- Relational store: PostgreSQL

## Performance Operating Rules

- Build for three render tiers:
  - Tier A: full 3D scene quality
  - Tier B: reduced effects and geometry
  - Tier C: static or pre-rendered fallback
- Enforce performance budget checks in CI before each release.
- Keep conversion flow available even when 3D is disabled.

## Immediate Technical Next Steps

1. Add Hono API service and lead qualification endpoint.
2. Add structured events for CTA and conversion funnel.
3. Implement strategy-call form with manual-review pipeline.
4. Add device-capability detection and render-tier switching.
5. Add observability (error + performance + funnel analytics).
