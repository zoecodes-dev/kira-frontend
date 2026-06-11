# Context notes

- 2026-06-11: DPP Center should be a monitoring and entry-point page, not an action execution surface.
- 2026-06-11: The page will use the new `docs/references/schema.sql` and `docs/references/seed.sql` scenario shape as reference data, especially the four seeded product scenarios: BMW iX3, BMW i4, Mercedes GLC EV, and Mercedes EQS.
- 2026-06-11: Route choice is `/dpp/center` because `/dpp` already exists as issuance history and `/dpp/readiness` already exists as readiness detail.
- 2026-06-11: KPI and blocker interactions open read-only product-list modals. Product rows route to `/dpp/readiness`, `/hitl`, or `/dpp` rather than executing work from the center page.
- 2026-06-11: KPI cards were reduced to compact horizontal status cards and page typography was toned down so tables and blocker lists carry the visual weight.
- 2026-06-11: Header and panel controls now have concrete behavior: refresh updates the timestamp, all-view controls open filtered modals, the recent period selector updates panel copy, and the full issuance-history button links to `/dpp`.
- 2026-06-11: DPP issuance history should be a table-first lookup page. The detail area starts empty until the user selects a row.
