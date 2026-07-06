// 시스템이 제공하는 협력사 정보 입력 요청 표준 메일 템플릿
export const INVITE_MAIL_SUBJECT = 'KIRA ESG 관리 시스템 — 공급망 정보 입력 요청';

export function buildInviteMailBody(companyName: string, supplierId?: string): string {
  // 초대 링크는 supplierId 쿼리로 키잉(무토큰, decision #8) — 가입 화면이 이 id로
  // 회사·담당자(PIC) 정보를 prefill 한다. 실발송(SES) 메일도 동일한 링크를 담는다.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = supplierId ? `${origin}/partner/onboarding?supplierId=${supplierId}` : `${origin}/partner/onboarding`;
  return [
    `${companyName} 담당자님께`,
    '',
    '안녕하세요. KIRA 공급망 ESG 관리 시스템입니다.',
    'EU 배터리 규정 및 공급망 실사 대응을 위해, 아래 링크에서 공급망 정보를 입력해 주시기 바랍니다.',
    '',
    '· 입력 항목: 자재 spec / 공장별 공급비율 / 원산지 / 인증서 / 규제 증빙(탄소발자국·실사)',
    '· 동의 사항: 첨부된 제3자 정보 확인 동의서 확인 후 진행해 주세요.',
    '· 본인인증: 담당자 정보가 정확한지 확인 후 로그인해 주세요.',
    '',
    `[공급망 정보 입력 바로가기] → ${link}`,
    '',
    '문의 사항은 본 메일로 회신 부탁드립니다. 감사합니다.',
    'KIRA ESG 관리팀 드림',
  ].join('\n');
}

// 정보 입력 요청 메일에 항상 첨부되는 표준 동의서
export const CONSENT_ATTACHMENT = '제3자_정보_확인_동의서.pdf';
