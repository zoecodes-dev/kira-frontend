# Context notes

- 2026-06-12: Corrected `/dashboard` reference image is an operations dashboard. Keep the top KPI cards unchanged and replace the mistaken supply-map block below KPI with task, product, DPP, changes, customer request, and AI insight sections.
- 2026-06-12: `/dashboard` redesign request keeps the top KPI cards unchanged and replaces only the overview content below them with the reference supply-map layout.
- 2026-06-12: Redesign request for `/supply-chain/map` references a light ESG Supply Chain layout. Preserve the bottom audit/submission table and only restyle the upper map/filter/detail/stat area.
- 2026-06-12: `/supply-chain/map` should keep its existing explorer/detail/table design. New product-map node information is split between always-visible tree summary fields and click-driven right-panel details.
- 2026-06-11: DPP Center should be a monitoring and entry-point page, not an action execution surface.
- 2026-06-11: The page will use the new `docs/references/schema.sql` and `docs/references/seed.sql` scenario shape as reference data, especially the four seeded product scenarios: BMW iX3, BMW i4, Mercedes GLC EV, and Mercedes EQS.
- 2026-06-11: Route choice is `/dpp/center` because `/dpp` already exists as issuance history and `/dpp/readiness` already exists as readiness detail.
- 2026-06-11: KPI and blocker interactions open read-only product-list modals. Product rows route to `/dpp/readiness`, `/hitl`, or `/dpp` rather than executing work from the center page.
- 2026-06-11: KPI cards were reduced to compact horizontal status cards and page typography was toned down so tables and blocker lists carry the visual weight.
- 2026-06-11: Header and panel controls now have concrete behavior: refresh updates the timestamp, all-view controls open filtered modals, the recent period selector updates panel copy, and the full issuance-history button links to `/dpp`.
- 2026-06-11: DPP issuance history should be a table-first lookup page. The detail area starts empty until the user selects a row.
- 2026-06-12: `/suppliers/general` is a standalone OEM review surface, not the existing supplier detail tab. Keep the change page-local and prioritize section collection status, missing items, and OEM comments over profile-style cards.
- 2026-06-12: Supplier collection review visual target is a compact OEM dashboard: top back/action bar, horizontal supplier summary, one-row collection summary cards, accordion rows, and bottom metadata strip.
