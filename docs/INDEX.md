# TicketCue — Docs Index

Design decisions, build plans, and phase tracking.

## Backend phases (original 5-phase plan)

| Document | What it covers |
|---|---|
| [BACKEND_PLAN.md](BACKEND_PLAN.md) | Full 5-phase backend build plan — stack choices, phase breakdown, deliverables |
| [PHASE3_PLAN.md](PHASE3_PLAN.md) | Phase 3 detailed plan — push notifications + updates feed |
| [PHASE3_IMPLEMENTATION.md](PHASE3_IMPLEMENTATION.md) | Phase 3 implementation notes |
| [PHASE3_STATUS.md](PHASE3_STATUS.md) | Phase 3 completion status |

**Current status:** Phases 1–4 complete. Phase 5 (external event ingestion) not started.

## Social features (next up)

| Document | What it covers |
|---|---|
| [SOCIAL_FEATURES_REQUIREMENTS.md](SOCIAL_FEATURES_REQUIREMENTS.md) | Full requirements — friends, shared calendars, notifications, event URL import |
| [SOCIAL_FEATURES_PLAN.md](SOCIAL_FEATURES_PLAN.md) | Phased implementation plan — schema, API routes, frontend, build order |
| [SOCIAL_FEATURES_TECH_SPEC.md](SOCIAL_FEATURES_TECH_SPEC.md) | **Developer-ready technical spec** — exact Prisma schema, Zod validators, route contracts, hooks, integration points, test checklist |

**Build order:**
```
Phase A → Friends system
Phase B → Event URL import (independent)
Phase C → Friend calendar overlay
Phase D → Social notifications
Phase E → Group calendars
```
