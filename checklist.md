# Supply-chain map node detail checklist

- [x] Preserve `/supply-chain/map` layout while adding product-map node information.
- [x] Add always-visible tree fields for product/part, tier, provider type, mineral, supply ratio, verification progress, and status.
- [x] Add click-detail fields for supplier, factory, country, specs, composition, applicable rules, missing documents, BOM version, connected products, and certificate status.
- [x] Run typecheck and browser verification for `/supply-chain/map`.

# Supply-chain map visual redesign checklist

- [x] Rework only the upper `/supply-chain/map` area to match the provided design.
- [x] Keep the bottom audit/submission tracking table unchanged.
- [x] Add reference-style filters, status legend, tree table, right detail panel, and summary stats.
- [x] Run typecheck and browser verification for `/supply-chain/map`.

# Supply-chain map tree typography checklist

- [x] Make the top product node label larger and heavier than child nodes.
- [x] Lower child node names, supplier names, supply ratio, and verification rate weights.
- [x] Run typecheck and browser verification for `/supply-chain/map`.

# Dashboard below-KPI supply map checklist

- [x] Keep the `/dashboard` top KPI cards unchanged.
- [x] Replace only the overview content below KPI cards with the supplied supply-map layout.
- [x] Preserve existing dashboard tabs outside the overview body.
- [x] Run typecheck and browser verification for `/dashboard`.

# Dashboard below-KPI operations layout checklist

- [x] Keep the `/dashboard` top KPI cards unchanged.
- [x] Replace the mistaken supply-map block with the corrected operations dashboard layout.
- [x] Add today tasks, product status, DPP status, recent changes, customer request, and AI insight sections.
- [x] Run typecheck and browser verification for `/dashboard`.

# Product Map workspace extension checklist

- [x] Keep the existing Product Map layout, tree, visualization, and right detail panel.
- [x] Add top product action area for map generation, supply-chain request send, and expansion status.
- [x] Add product-level Tier1, Tier2, Tier3, and completeness collection status.
- [x] Add selected supplier node workflow status and downstream request action in the right panel.
- [x] Run typecheck and browser verification for `/supply-chain/product-map`.

# Product Map typography softening checklist

- [x] Lower heavy font weights on `/supply-chain/product-map` by one step without changing layout.
- [x] Verify no `font-black` renders in the Product Map workspace.
- [x] Run typecheck and browser verification for `/supply-chain/product-map`.

# DPP Center checklist

- [x] Create `/dpp/center` as a status-only control-center page.
- [x] Add clickable KPI cards that open filtered product-list modals.
- [x] Show held products, blocker list, HITL queue, and recent DPP issuance history.
- [x] Add `DPP Center` to the existing DPP navigation group.
- [x] Run typecheck and verify the page in the browser.

# DPP History checklist

- [x] Replace card grid with KPI, filter, table, and selected detail layout.
- [x] Add period and destination filters, including direct date inputs.
- [x] Add expanded status badges for issued, reissued, corrected, and revoked.
- [x] Add tracing fields and related links in the detail panel.
- [x] Run typecheck and verify the page in the browser.

# Supplier collection review checklist

- [x] Replace `/suppliers/check-info` redirect with a supplier data collection review page.
- [x] Add top supplier summary with collection rate and review status.
- [x] Add section-level collection progress summary.
- [x] Add accordion sections in supplier input order with review comments.
- [x] Convert factories and certificates to table-based review sections.
- [x] Run typecheck and verify the page in the browser.

# Supplier collection visual refinement checklist

- [x] Match the reference layout with a back link, compact action buttons, and one horizontal supplier summary card.
- [x] Rework collection summary cards into one dense row with icons, progress bars, and status legend.
- [x] Make accordion rows visually closer to the reference, with only company information expanded by default.
- [x] Add a compact bottom metadata strip for data source, last update, and next submission due date.
- [x] Run typecheck and verify the refined page in the browser.

# Suppliers list restoration checklist

- [x] Restore `/suppliers` as the active supplier list entry point.
- [x] Update the sidebar under 협력사 관리 to show 협력사 목록, contextual 협력사 세부 정보, and 협력사 입력 현황.
- [x] Make supplier list rows navigate to the selected supplier detail page.
- [x] Run typecheck and browser verification for `/suppliers`.

# Supplier input route rename checklist

- [x] Rename `/suppliers/general` route to `/suppliers/check-info`.
- [x] Update sidebar and dashboard links to the new route.
- [x] Run typecheck and browser verification for `/suppliers/check-info`.

# Supply-chain invitation workflow checklist

- [x] Keep the existing `/supply-chain/map` layout while adding a lower-tier connection confirmation flow.
- [x] Route confirmed lower-tier connection requests to `/suppliers/invitations` with selected node context.
- [x] Create `/suppliers/invitations` as a supplier invitation preparation workspace, separate from `/suppliers/check-info`.
- [x] Add mock invitation list, selectable mail preparation detail, status actions, and supplier search modal.
- [x] Run typecheck and browser verification for `/supply-chain/map` and `/suppliers/invitations`.

# AGENTS token reduction checklist

- [x] Create a shorter root `AGENTS.md` with the essential behavioral rules.
- [x] Preserve the user name, agent name, minimal-edit preference, Korean sentence rule, evidence-before-edits rule, and verification reporting rule.
- [x] Verify the markdown change by reading the created file and checking the diff.
