// 제3자 정보 제공 동의서 = 데이터 계약(Data Contract)의 "콘텐츠 레이어".
//
// 설계: 완제품(조합별 최종 문서)을 저장하지 않는다. 조합은 목적4 × 항목63 × 옵션 …
// 거기에 날짜·재공유대상·회사명 같은 자유값까지 곱해지면 사실상 무한이라 저장·유지가 불가능하다.
// 대신 ①파편(아래 상수들)을 100% 미리 확정해 두고, ②고정 스켈레톤(제목 + 조항 순서)에
// buildConsentDocument()가 선택값을 기계적으로 끼워 넣는다. 같은 입력이면 항상 동일한 결과(결정적).
//
// 이 파일이 파편의 단일 출처(SSOT)다. UI 라벨(SCOPE_LABEL 등)도 여기서 export하며,
// ConsentReplyForm/ConsentDetailView는 이 파일을 재사용한다.

// ── UI 라벨 (기존 ConsentReplyForm에서 이관) ──
export const SCOPE_LABEL: Record<string, string> = {
  company: '기업 기본정보',
  contacts: '담당자 연락처',
  factories: '공장·사업장',
  carbon_epd: '환경성적서(탄소)',
  origin: '원산지/규제',
  sub_suppliers: '하위 협력사',
};

export const PURPOSE_LABEL: Record<string, string> = {
  EU_BATTERY: 'EU 배터리 규정 대응',
  SUPPLY_CHAIN_DD: '공급망 실사(Due Diligence)',
  CSDDD: 'CSDDD(기업 지속가능성 실사 지침)',
  CONFLICT_MINERALS: '분쟁광물 대응',
};

export const SIGNATURE_METHODS: { key: string; label: string }[] = [
  { key: 'email_form', label: '이메일 양식 회신' },
  { key: 'e_sign', label: '전자서명' },
  { key: 'wet_signature', label: '자필 서명(스캔본)' },
];

// 발송 시 표준 순서를 고정하기 위한 항목 나열 순서.
export const SCOPE_ORDER = ['company', 'contacts', 'factories', 'carbon_epd', 'origin', 'sub_suppliers'] as const;
export const PURPOSE_ORDER = ['EU_BATTERY', 'SUPPLY_CHAIN_DD', 'CSDDD', 'CONFLICT_MINERALS'] as const;

// ── B. 데이터 항목별 원문 (SCOPE) ──
// 개인정보 포함 여부 — contacts는 「개인정보 보호법」 제17조 대상이라 별도 고지가 필요.
export const SCOPE_IS_PERSONAL: Record<string, boolean> = {
  company: false,
  contacts: true,
  factories: false,
  carbon_epd: false,
  origin: false,
  sub_suppliers: false,
};

export const SCOPE_CLAUSE: Record<string, string> = {
  company:
    '기업 기본정보 — 상호, 사업자등록번호, 본사 소재지, 업종 등 귀사의 식별·자격 확인에 필요한 기본 정보',
  contacts:
    '담당자 연락처(개인정보) — 업무 담당자의 성명, 부서·직위, 이메일, 전화번호',
  factories:
    '공장·사업장 정보 — 생산 사업장의 명칭, 소재지 주소 및 위치좌표, 생산 품목, 가동 현황',
  carbon_epd:
    '환경성적·탄소 데이터 — 제품 탄소발자국(PCF), 환경성적표지(EPD), 전과정평가(LCA) 및 온실가스 배출량(Scope 1·2·3) 관련 정보',
  origin:
    '원산지·규제 정보 — 제품·원자재의 원산지(국가·지역), HS 코드, 관련 규제(REACH·RoHS 등) 준수 증빙 정보',
  sub_suppliers:
    '하위 협력사 정보 — 하위(n차) 협력사 명단, 소재지, 공급 품목 등 공급망 추적에 필요한 정보',
};

// ── A. 목적별 원문 (PURPOSE) ──
export const PURPOSE_CLAUSE: Record<string, { legalBasis: string; body: string }> = {
  EU_BATTERY: {
    legalBasis: 'Regulation (EU) 2023/1542',
    body:
      '본 정보는 귀사가 공급하는 부품·소재가 포함된 배터리에 대하여 EU 배터리 규정에 따른 탄소발자국 신고, 재활용 원료 함량 공개, 공급망 실사 의무 이행 및 배터리 여권(Battery Passport) 등록을 위한 목적으로만 수집·이용됩니다.',
  },
  SUPPLY_CHAIN_DD: {
    legalBasis: 'OECD Due Diligence Guidance',
    body:
      '본 정보는 원청의 공급망 내 환경·인권·안전 리스크를 식별·평가·완화하기 위한 공급망 실사(Due Diligence) 수행 목적으로만 수집·이용됩니다.',
  },
  CSDDD: {
    legalBasis: 'Directive (EU) 2024/1760',
    body:
      '본 정보는 EU 기업 지속가능성 실사 지침(CSDDD)에 따라 원청이 자사 및 협력사의 활동사슬(chain of activities) 상 인권·환경에 대한 실제적·잠재적 부정적 영향을 식별·예방·완화·보고하기 위한 목적으로만 수집·이용됩니다.',
  },
  CONFLICT_MINERALS: {
    legalBasis: 'Regulation (EU) 2017/821, Dodd-Frank Act §1502',
    body:
      '본 정보는 주석·탄탈륨·텅스텐·금(3TG) 등 분쟁·고위험지역(CAHRAs) 광물의 원산지 및 제련소(smelter) 정보를 확인하여 분쟁광물 규정을 준수하기 위한 목적으로만 수집·이용됩니다.',
  },
};

// ── 조립 입력 계약 ──
export interface ConsentDocInput {
  providerCompany: string; // 정보제공자(협력사)
  recipientCompany?: string; // 제공받는 자(원청) — 미상이면 '원청(당사)'
  purpose: string; // PURPOSE key
  dataScope: string[]; // SCOPE keys
  thirdPartySharing: boolean;
  allowedRecipients?: string[] | null;
  validFrom?: string | null;
  validTo?: string | null;
  retentionYears?: number | null;
  revocable?: boolean; // 기본 true
  issuedDate?: string | null; // 작성일 — 기본 오늘
}

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── 조립 함수: 파편을 고정 스켈레톤에 끼워 넣어 결정적 문서를 생성 ──
// 조 번호는 "포함된 조항만" 세서 자동 매김 → 항목을 빼도 번호에 구멍이 없다.
export function buildConsentDocument(input: ConsentDocInput): string {
  const {
    providerCompany,
    recipientCompany = '원청(당사)',
    purpose,
    dataScope,
    thirdPartySharing,
    allowedRecipients,
    validFrom,
    validTo,
    retentionYears,
    revocable = true,
    issuedDate,
  } = input;

  const issued = issuedDate || todayStr();
  const purposeClause =
    PURPOSE_CLAUSE[purpose] ?? { legalBasis: '', body: `본 정보는 명시된 목적(${purpose}) 범위 내에서만 수집·이용됩니다.` };

  // 표준 순서로 정렬(입력 순서에 무관하게 문서가 항상 동일하도록).
  const orderedScope = SCOPE_ORDER.filter(k => dataScope.includes(k));
  const extraScope = dataScope.filter(k => !SCOPE_ORDER.includes(k as (typeof SCOPE_ORDER)[number]));
  const scopeKeys = [...orderedScope, ...extraScope];

  const articles: { title: string; body: string }[] = [];

  // 제1조 제공받는 자
  articles.push({
    title: '제공받는 자',
    body: `본 동의에 따라 정보를 제공받는 자는 ${recipientCompany}이며, 정보를 제공하는 자는 ${providerCompany}입니다.`,
  });

  // 제2조 제공 목적
  articles.push({
    title: '제공 목적',
    body: purposeClause.legalBasis ? `${purposeClause.body} (근거: ${purposeClause.legalBasis})` : purposeClause.body,
  });

  // 제3조 제공 항목
  const scopeLines = scopeKeys.map((k, i) => `  ${i + 1}. ${SCOPE_CLAUSE[k] ?? SCOPE_LABEL[k] ?? k}`).join('\n');
  const hasPersonal = scopeKeys.some(k => SCOPE_IS_PERSONAL[k]);
  articles.push({
    title: '제공 항목',
    body:
      `정보제공자가 제공하는 정보 항목은 다음과 같습니다.\n${scopeLines || '  (선택된 항목 없음)'}` +
      (hasPersonal
        ? '\n  ※ 위 항목에는 개인정보가 포함되어 있으며, 「개인정보 보호법」 제17조에 따라 정보주체의 동의를 받아 제공됩니다.'
        : ''),
  });

  // 제4조 보유·이용 기간
  const period = validFrom || validTo ? `${validFrom ?? '동의일'} ~ ${validTo ?? '이용 목적 달성 시'}` : '동의일부터 이용 목적 달성 시까지';
  articles.push({
    title: '보유·이용 기간',
    body:
      `본 정보는 ${period} 기간 동안 보유·이용되며, ` +
      (retentionYears
        ? `보유기간(${retentionYears}년) 경과 또는 이용 목적 달성 시 지체 없이 파기됩니다.`
        : '이용 목적 달성 또는 관계 법령에서 정한 기간 경과 시 지체 없이 파기됩니다.'),
  });

  // 제5조 제3자 재공유
  if (thirdPartySharing) {
    const recipients = (allowedRecipients ?? []).map(r => r.trim()).filter(Boolean);
    const targetText = recipients.length ? recipients.join(', ') : '고객사·규제기관 등';
    articles.push({
      title: '제3자 재공유',
      body: `원청은 제공받은 정보를 재공유 대상(${targetText})에게 본 동의 목적 범위 내에서 제공할 수 있습니다.`,
    });
  } else {
    articles.push({
      title: '제3자 재공유',
      body: '원청은 본 동의 없이 제공받은 정보를 제3자에게 재공유할 수 없습니다.',
    });
  }

  // 제6조 동의 철회
  articles.push({
    title: '동의 철회',
    body: revocable
      ? '본 동의는 유효 기간 동안 유지되며, 정보주체는 언제든지 동의를 철회할 수 있습니다.'
      : '본 동의는 유효 기간 동안 유지됩니다.',
  });

  // 제7조 동의 거부 권리 (필수 고지 — 항상 포함)
  articles.push({
    title: '동의 거부 권리',
    body:
      '정보제공자는 본 정보 제공에 대한 동의를 거부할 권리가 있습니다. 다만 동의를 거부하는 경우 해당 규제 대응에 필요한 공급망 정보 확인이 제한되어 거래 관계에 영향을 줄 수 있습니다.',
  });

  const body = articles.map((a, i) => `제${i + 1}조 (${a.title})\n${a.body}`).join('\n\n');

  return [
    '제3자 정보 제공 동의서',
    '',
    `${recipientCompany}(이하 "원청")와 ${providerCompany}(이하 "정보제공자")는 아래와 같이 제3자 정보 제공에 관하여 동의합니다.`,
    `(작성일: ${issued})`,
    '',
    body,
    '',
    '── 위 동의서의 내용을 모두 확인하였으며, 이에 동의합니다. ──',
    '',
    `정보제공자: ${providerCompany}`,
    '동의 담당자: ____________________  (로그인 후 시스템에서 동의 체크)',
    `동의일: ${issued}`,
  ].join('\n');
}
