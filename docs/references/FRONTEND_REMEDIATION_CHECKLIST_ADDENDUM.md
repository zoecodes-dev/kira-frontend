# KIRA 프론트엔드 보강 체크리스트 — 추가 부록 (ADDENDUM · core 4장 대조 발견분)

> **목적**: `FRONTEND_REMEDIATION_CHECKLIST_FULL.md`(이하 본 체크리스트)를 `PROJECT_CORE.md` 4장(재설계 방향)·`KIRA_backend_team_spec.md` G/H절과 재대조한 결과, **enum·점수공식·개별 GAP은 정합**하나 **화면 재구조화/통합 작업이 누락**되어 이 부록으로 보완한다.
> **이 부록도 자기완결적이다.** 각 항목에 [현재]·[근거]·[데이터 소스]·[작업]·[완료 기준]을 담는다.
> **선결 판단 필요**: 아래 항목 중 일부는 "의도적 제외"일 가능성이 있다. 본 체크리스트 부록 B(제외 사유)에 종결 기록이 없으므로, **코딩 전 사용자 확정**이 필요한 것은 🔶로 표시한다. 확정 작업은 ✅로 표시한다.

---

## E-0. 권위 순서 보정 (선행)

- [ ] 🔶 본 체크리스트 line 5 권위 순서에 **`PROJECT_CORE.md` 4장(재설계 방향)을 추가**한다. 현재 `STATE_DICTIONARY > spec > 화면코드`만 명시되어, 아래 E-1~E-4의 core발 재구조화 지시가 권위 체인 밖에 있다.
  - 결정 필요: 4장의 "화면 통합" 지시를 (a) 정식 작업으로 승격할지, (b) 본 체크리스트 부록 B로 제외 처리할지.

---

## E-1. 부품 5계층 정의 확정 — 3-1 선행 BLOCKER

- [ ] 🔶 **부품 계층(`tiers[]`) 정의가 core와 불일치 → 코딩 전 확정 필수.**
  - [현재] 본 체크리스트 3-1: `5 원광 / 4 전구체·정제 / 3 활물질 / 2 Module·Cell / 1 Pack` (Module·Cell을 한 컬럼으로 묶고 활물질 층 신설).
  - [근거 충돌] `PROJECT_CORE.md` 3-1 #3: `Pack → Module → Cell → 전구체 → 광물` — Module/Cell을 **별개 2계층**으로 보고 활물질 층이 없음. carbon_rule(spec 6-2)은 `cathode/anode/cell`을 구분하므로 활물질(=cathode/anode) 층은 실무상 타당.
  - [작업] 둘 중 하나로 확정: (A) 체크리스트 5컬럼 유지(활물질 신설, Module·Cell 통합) → core 3-1 #3 텍스트를 함께 갱신, 또는 (B) core 트리 유지(Module/Cell 분리, 활물질 제거).
  - [완료 기준] 확정 정의를 본 체크리스트 3-1과 core 3-1 #3 **양쪽에 동일하게 반영**. 이후 product-map/request-map/due-diligence 3화면 컬럼이 동일 정의로 렌더.

---

## E-2. 대시보드 탭 구조 — 13절 보강 (high-risk·dpp 병합)

- [ ] 🔶 **`/risk/high-risk` · `/dpp` → `/dashboard` 탭 병합 여부 결정.**
  - [현재] 본 체크리스트는 9-1(high-risk)·11(dpp)을 **독립 화면**으로 다룸. 대시보드 탭 구조 없음.
  - [근거] core 4-1 "주요 통합": `/risk/high-risk`, `/dpp → /dashboard 탭 병합`. spec G-2가 대시보드 5탭 엔드포인트를 이미 정의.
  - [데이터 소스] spec G-2:
    - Overview → `GET /dashboard/summary` (KPI 6개 + 공급망 요약)
    - High Risk → `GET /dashboard/high-risk` (risk_level=high/critical 목록)
    - Pending Submission → `GET /dashboard/pending-submissions` (SLA 초과·미응답)
    - DPP Ready → `GET /dashboard/dpp-ready` (readiness ≥ 1.0 product)
    - HITL Queue → `GET /hitl/queue` (hitl_pending)
  - [작업] 병합 결정 시: 5탭 셸을 dashboard에 구성하고 9-1·11의 위젯을 탭 콘텐츠로 이식. 비병합 결정 시: 본 체크리스트 부록 B에 제외 사유 적재.
  - [완료 기준] (병합 시) dashboard 5탭 렌더 + 각 탭이 해당 엔드포인트(현재 mock 가능) 소비. 독립 high-risk/dpp 라우트 중복 제거 또는 리다이렉트.

---

## E-3. 공급망 맵 운영 컨트롤 타워화 — 3절 보강

- [ ] 🔶 **맵 노드 운영 액션(요청 발송·리마인드·반려) 화면 작업 누락.**
  - [현재] 본 체크리스트 3절은 Tier 시각화(3-1) + 상태 매핑(3-2)만. 운영 액션 없음.
  - [근거] core 4-3 매트릭스 최대 변화: "공급망 맵: 단순 시각화 → 운영 컨트롤 타워(요청 발송·리마인드·반려·DPP 확인까지)".
  - [데이터 소스] spec 5-4: `POST /supply-chain/{map_id}/request`(긴급 입력 요청) · `POST /supply-chain/{map_id}/remind`(SLA 리마인드 재발송) · `POST /supply-chain/{map_id}/reject`(연결 기각).
  - [작업] 기존 구현 유무 확인 후, 미구현이면 노드 컨텍스트 메뉴/Drawer에 3액션 버튼 추가(상태 전이는 백엔드 위임, 화면은 호출+낙관적 갱신만).
  - [완료 기준] 노드에서 request/remind/reject 호출 → `submission_status`/`response_status` 변화가 노드 컬러(`v_supply_chain_node_status` 우선순위)에 반영.

- [ ] 🔶 **노드 클릭 Drawer(Supplier workspace-summary) 연동 확인.**
  - [현재] 7절은 `suppliers/[id]/*` 상세 탭을 다루나, 맵 노드 클릭 시 뜨는 **요약 Drawer** 작업이 명시 안 됨.
  - [데이터 소스] spec G-1: `GET /suppliers/{id}/workspace-summary` — supplier/primary_contact/factories[].applicable_regulations/submission(status·completion_rate·due_date)/certifications(total·expired·expiring_soon)/origin_certs/feoc(status·direct_ownership)/risk(overall_score·is_high_risk·open_issues)/dpp_readiness 단일 JSON.
  - [작업] 노드 클릭 → 단일 엔드포인트 호출하는 요약 Drawer. 병렬 다중 호출 금지(spec 명시). 상세 진입 시 7절 탭으로 라우팅.
  - [완료 기준] 노드 클릭 1회 = workspace-summary 1콜로 Drawer 채움. 표시 필드 ⊇ G-1 응답 필드.

---

## E-4. submission-status 화면 흡수 — 1절·7-8 보강

- [ ] 🔶 **`/submission-status` → suppliers 리스트 컬럼 + 워크스페이스 Timeline 흡수.**
  - [현재] 본 체크리스트 1절(GAP 426)은 submission-status 파생상태 **매핑만**. 7-8은 Timeline 구현. **기존 화면 흡수/제거**는 어디에도 없음.
  - [근거] core 4-1 "주요 통합": `/submission-status → /suppliers 리스트 컬럼 + 워크스페이스 Timeline으로 흡수`.
  - [데이터 소스] 리스트 컬럼: `GET /suppliers`(spec 3-6 단일 JOIN, submission status·completion_rate 포함) / Timeline: `GET /suppliers/{id}/submission-timeline`(7-8과 동일).
  - [작업] suppliers 리스트에 제출상태/완성도 컬럼 추가. Timeline은 7-8로 처리. 독립 submission-status 화면은 제거 또는 리다이렉트.
  - [완료 기준] suppliers 리스트에서 제출 진행 파악 가능 + 상세 Timeline 도달. 독립 화면 중복 없음.

---

## E-5. CBAM Stub 처리 — 7-3·7-5 보강

- [ ] ✅ **CBAM stub 표시 추가(현재 누락).**
  - [현재] 7-5·부록 D는 **CRMA/Conflict만** 언급. CBAM 누락.
  - [근거] core 1-2 / spec 4-2: stub 규제는 **CBAM·CONFLICT_MINERALS·CRMA 3종** (`stub_passed_judge` — 항시 `compliance_passed` 반환).
  - [작업] ai-verify(7-3) 규제 이행 목록 및 stub 표시 섹션(7-5)에서 CBAM을 CRMA/Conflict와 **동일 패턴**으로 처리(stub/예시 표기는 부록 D 시연 전략 따름).
  - [완료 기준] 3개 stub 규제가 화면에서 일관된 stub 표시. EU 목적지 8종(EU_BATTERY/ART7/ART47/EUDR/CSDDD/CBAM/CONFLICT_MINERALS/CRMA) 누락 0건.

---

## E-6. Provider Type CTI 상세 표시 — 7절 보강

- [ ] ✅ **업종별(CTI) 상세가 상세 탭에 표시되는지 확인·보강.**
  - [현재] 포털(5절)은 "1차=업종별 풀입력"으로 입력측만 다룸. `suppliers/[id]` **조회측 provider type별 상세**는 명시 안 됨.
  - [근거] core 차별점 #2 / 3-1 #1: `manufacturer/recycler/trader/miner` 4종 CTI는 받는 데이터가 완전히 다름.
  - [작업] 상세 탭이 supplier_type에 따라 분기:
    - `trader` → **공개율(`trader_disclosure_obligation.disclosure_completeness`)** 표시. <75% 시 경고 마킹(spec feoc_rule), Readiness #8(≥75%) 입력값임을 주석.
    - `miner` → `supplier_miner_details.mine_coordinates` 유무/좌표(geo 판정 대기 패턴 유지).
    - `recycler`/`manufacturer` → 각 details 테이블 필드.
  - [완료 기준] 4종 타입별로 고유 상세 필드 표시. trader 공개율 < 75% 경고가 readiness/feoc와 일관.

---

## E-7. 잔여 경미 항목 (저위험, 점검 수준)

- [ ] **batch_stage 전수 매핑(8절 보강)**: 8절 queue가 5단계만 예시. STATE_DICTIONARY A-7은 **8종**(`stage_queued`/extraction/verification/geo/compliance/`stage_risk`/readiness/`stage_issuance`). 누락 3종(queued/risk/issuance) 포함해 매핑.
- [ ] **actions 매핑 SQL 대조(9-2 보강)**: 9-2 요약에 `submission_rework → review`가 빠짐. 권위는 spec 2-5 `v_action_items` SQL이므로 화면 매핑을 SQL과 직접 대조(rework→review, hitl_pending→open, audit failed→blocked 등).
- [ ] 🔶 **규제 개정 영향분석 화면 유무 판단**: spec `GET /audit/gap-analysis/{regulation_id}`(affected_supplier_ids, newly_required_fields) + `gap_analysis_results` 테이블 존재. auditor 전용이면 범위 밖 처리, 아니면 audit 영역에 작업 신설.

---

## 작업 순서 권장 (부록 한정)

E-0(권위 보정) → E-1(부품계층 확정, **3-1 선행 BLOCKER**) → E-2·E-3·E-4(재구조화 결정, 일괄 사용자 확인) → E-5·E-6(stub·CTI, 저위험 확정작업) → E-7(점검).

> 🔶 표시 항목은 **사용자 결정 후** 착수. 결정이 "제외"면 본 체크리스트 부록 B에 사유와 함께 이관한다.
