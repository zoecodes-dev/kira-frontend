# KIRA 상태 어휘 사전 (STATE_DICTIONARY)

모든 status / state / verdict 칼럼의 **허용값 SSOT**입니다.
일괄 수정 시 enum 값은 이 파일을 기준으로 합니다.
DECISION_LOG.md의 #1~#9 결정을 반영한 최종 상태값입니다.


## 명명 원칙

1. 접두어 일괄 적용 — 모든 워크플로우 상태값에 테이블별 접두어(supplier_ / submission_ 등)를 붙인다.
   같은 단어(pending 등)가 테이블마다 의미가 달라서, 값만 봐도 출신을 알 수 있게 한다.
   짧은 약어 대신 명확한 전체 단어를 쓴다.
2. 각 값에 한글 설명 필수.
3. 삭제 시 행선지 필수 — 상태값을 빼거나 줄일 때는 아래 "이동 추적"에 행선지를 적는다.
   행선지 없는 삭제는 금지 (기능이 조용히 사라지는 것을 방지).


====================================================================
 이동 추적 — 상태값에서 빠졌지만 다른 곳에서 처리되는 것
====================================================================

상태값을 정리하며 뺀 것은 반드시 행선지를 남긴다. 신규 정리 시 계속 추가한다.

[1] submission_status 의 pending (발송 전 대기)
    → 삭제 (대체 없음)
    이유: 데이터 요청은 "바로 발송"이라 발송 전 대기가 찰나여서 무의미. 기능 손실 없음.

[2] submission_status 의 archived
    → is_archived (BOOL 플래그로 분리)
    이유: approved/rejected 모두 보관되므로, 상태축이 아니라 그 위에 얹히는 플래그.

[3] submission_status 의 violation
    → compliance_results.verdict 로 이동 (결정 #4)
    이유: 위반 판정은 검증이 담당. 제출 상태와 위반은 다른 축.

[4] compliance_results.verdict 의 gray_zone
    → needs_human_review (BOOL 플래그) (결정 #8-B)
    이유: 회색지대는 위반정도(verdict) 축이 아니라 "사람 검토 필요" 축.

[5] supply_chain_map.link_status 의 requested
    → consent_status 로 이동 (결정 #9-여파4)
    이유: 초대-로그인은 공급망 엣지 상태가 아니라 협력사 온보딩 상태.


====================================================================
 A. 워크플로우 상태 (전이 매트릭스 대상 — state_machine 통해서만 전이)
====================================================================

-------------------------------------------------
 A-1. supplier_status  (suppliers.status)
      협력사의 검증·활성 상태 (원청 관점)
-------------------------------------------------
  supplier_pending       협력사로 등록만 됨, 아직 미검증          [시스템]
  supplier_requested     협력사에게 등록/온보딩 요청 발송됨        [원청]
  supplier_in_progress   협력사가 온보딩(정보 등록) 진행 중        [협력사]
  supplier_review        원청이 협력사 정보 검토 중               [원청]
  supplier_verified      검증 완료 — 정상 거래처로 확정           [원청]
  supplier_violation     위반 협력사로 표시됨                    [시스템/원청]
  supplier_suspended     거래 정지된 협력사                      [원청]

  ⚠ 검토필요: in_progress/review 가 A-2 submission 과 단어가 겹침.
     supplier=협력사 자체 온보딩, submission=데이터 제출 건. 의미는 다르나
     일괄수정 시 supplier 쪽 단순화 여부 재검토.

-------------------------------------------------
 A-2. submission_status  (data_request_log.submission_status)
      협력사 데이터 제출 흐름   (결정 #3)
-------------------------------------------------
  submission_requested     원청이 협력사에게 데이터 요청 발송함 (협력사가 알림 받음)  [원청]
  submission_in_progress   협력사가 데이터 입력/파일 업로드 진행 중                 [협력사]
  submission_submitted     협력사가 제출·확정 완료 (AI 파싱결과 확인 포함)          [협력사]
  submission_review        원청이 제출물 검토 중                                 [원청]
  submission_approved      원청이 승인 — 데이터 통과                             [원청]
  submission_rejected      원청이 반려 — 재제출 요구                             [원청]
  (+ is_archived BOOL)     종료 후 보관 여부 (상태 아님, 플래그)                  [시스템]

  참고: pending/archived/violation 은 제거됨 (위 이동추적 [1][2][3] 참조).
       submitted = AI 파싱결과까지 확인한 확정 시점 (결정 #3).

-------------------------------------------------
 A-3. response_status  (data_request_log.response_status)
      SLA 이메일 응답 추적   (결정 #9-여파3)
-------------------------------------------------
  response_pending     요청 보냈으나 아직 협력사 응답 없음                  [시스템]
  response_responded   협력사가 응답함                                   [시스템]
  response_overdue     SLA 기한 초과 (리마인드 대상, 전 차수 적용)         [시스템/스케줄러]
  response_escalated   기한 한참 초과 → 원청 보고 (1차[tier=1]만 적용)     [시스템/스케줄러]

-------------------------------------------------
 A-4. link_status  (supply_chain_map.link_status)
      공급망 연결(엣지) 상태   (신설, 결정 #2 / #9)
-------------------------------------------------
  supplychain_declared    상위 협력사가 하위 공급사를 신고함 (연결 주장됨, 미검증)  [상위 협력사]
  supplychain_confirmed   검증 완료된 확정 연결 (1차 ERP 자동 포함)              [시스템/원청]

  참고: 신고자(상위) ≠ 데이터 입력자(하위 본인). requested 는 consent_status 로 이동(이동추적 [5]).

-------------------------------------------------
 A-5. consent_status  (supplier_onboarding.consent_status)
      협력사 포털 접근 동의 (개인정보 처리 동의 = 접근 게이트)   (결정 #9)
-------------------------------------------------
  consent_pending     초대 발송됨, 아직 로그인/동의 안 함            [시스템(초대 시)]
  consent_agreed      협력사가 로그인·동의 완료 → 포털 접근 허용      [협력사]
  consent_rejected    협력사가 동의 거부                          [협력사]

  참고: N차 자동초대 시 "초대됨→로그인 대기"가 여기서 표현됨 (결정 #9).
       agreement_status(약관 동의)는 이것과 별개 — B 속성상태 참조.

-------------------------------------------------
 A-6. batch_status  (batches.status)
      AI 파이프라인 처리 국면 (거친 단위)
-------------------------------------------------
  batch_processing    파이프라인 처리 중                        [시스템(Supervisor)]
  batch_hitl_wait     HITL 대기로 정지됨 (사람 결정 필요, #6)     [시스템]
  batch_completed     처리 완료                                [시스템]
  batch_rejected      처리 거부됨                              [시스템]

-------------------------------------------------
 A-7. batch_stage  (batches.current_stage)
      파이프라인 노드 위치 (세밀 단위 — status 와 다른 축)
-------------------------------------------------
  stage_queued        큐 대기
  stage_extraction    문서 파싱 중 (#3, 은진)
  stage_verification  검증 룰 실행 중 (#4)
  stage_geo           좌표/지리 판정 중 (영수)
  stage_compliance    규제 판정 중 (은지)
  stage_risk          리스크 스코어링 중 (#5)
  stage_readiness     DPP Readiness 계산 중 (#7)
  stage_issuance      DPP 발행 중 (#7, 차윤)

  참고: status = "전체 국면(거침)", current_stage = "지금 어느 노드(세밀)". 둘 다 필요.

-------------------------------------------------
 A-8. compliance_verdict  (compliance_results.verdict)
      규제 검증 판정   (결정 #4)
-------------------------------------------------
  compliance_passed      규제 통과
  compliance_violation   위반 — 발행 차단 사유
  compliance_warning     경고 — 통과시키되 주의 (예: 탄소 범위 이탈)
  compliance_reject      반려 — 문서 자체 불일치 (재제출 필요)
  (+ needs_human_review BOOL)  회색지대 = 사람 검토 필요 (verdict 와 직교, #8-B)

  참고: gray_zone 제거됨 → needs_human_review BOOL 로 (이동추적 [4]).

-------------------------------------------------
 A-9. hitl_status  (hitl_reviews.status)
      원청 HITL 검토 상태   (신설, 결정 #6)
-------------------------------------------------
  hitl_pending      검토 항목 생성됨, 담당자가 아직 결정 안 내림 (미처리 큐)  [시스템]
  hitl_in_review    ESG 담당자가 검토 중                                 [원청]
  hitl_resolved     결정 완료 (결과는 resolution 필드 참조)               [원청]

  resolution (별도 필드)   approve / reject / escalate — 검토 결정 내용   [원청]

  참고: 상태는 3종, 승인/반려는 resolution 으로 분리(2차검토 결과).
       hitl_pending 의 "결정 전 대기"는 submission_pending(발송 전)과 전혀 다른 뜻.

-------------------------------------------------
 A-10. dpp_status  (dpp_records.status)
       DPP 발행 상태   (결정 #7)
-------------------------------------------------
  dpp_issued     발행됨 (이후 수정 불가 — immutable 이중잠금)
  dpp_revoked    폐기됨 (정정 시 신규 발행으로 대체)

-------------------------------------------------
 A-11. submission_status_history.from_status / to_status
-------------------------------------------------
  submission_status 와 동일 어휘 사용 (전이 이력 추적용 거울).


====================================================================
 B. 속성 상태 (단순 플래그 — 전이 매트릭스 아님, 접두어 미적용)
====================================================================

단일 테이블에서만 쓰여 충돌이 없으므로 접두어를 붙이지 않는다.
단, origin_certificates / training_records 등은 Readiness(#7) 입력으로 쓰이므로 값 변경 시 영향 확인.

  risk_level (suppliers / supplier_risk_profiles)
    low / medium / high / critical          리스크 등급 (#5 스코어링 산출)

  feoc_status (suppliers / supplier_risk_profiles)
    eligible / ineligible / under_review / unknown   FEOC 적격 여부 (#4)

  origin_certificates.status
    valid / expiring_soon / expired / under_review   원산지증명 유효성
    (#7 Readiness 입력, OriginCertExpiring 이벤트 연결)

  training_records.status
    completed / in_progress / overdue / not_started  교육 이수
    (#7 Readiness 입력, TrainingOverdue 이벤트 연결)

  bom_versions.status
    draft / active / deprecated             BOM 버전 (#1)

  regulations.embedding_status
    pending / indexed                       규제 RAG 임베딩 (#7)
    (stub judge 규제도 row 는 indexed 필요)

  supplier_human_rights_issues.status
    open / in_remediation / resolved / monitoring    인권 이슈 (Readiness 입력)

  supplier_industrial_accidents.status
    reported / investigating / closed       산재 (Readiness 입력)

  notifications.status
    pending / sent / failed / read          알림 발송

  supplier_onboarding.agreement_status
    pending / agreed / rejected             약관 동의 (consent_status 와 별개)

  tenants.subscription_status
    active / suspended / trial              테넌트 구독 상태 (active 외에는 API 접근 차단)


====================================================================
 (문서 끝)
====================================================================

워크플로우 상태 11종 (A-1 ~ A-11) + 속성 상태 11종 (B) = 총 22개 상태 칼럼 정리 완료.
일괄 수정 시 이 파일의 값을 enum SSOT 로 사용한다.
