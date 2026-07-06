'use client';

// STEP 0 — 메일 URL 진입/동의 확인. 기존 등록 회사면 getSupplierDetail로 pre-fill(SRM I/F).
import { useEffect, useState } from 'react';
import { FileCheck2, Info, Loader2, Mail } from 'lucide-react';
import { getOnboardingPrefill, type OnboardingPrefill } from '@/lib/api';
import { buildConsentDocument } from '@/lib/consent-clauses';
import type { OnboardingType } from './SupplierOnboarding';
import StepFooter from './StepFooter';

const typeLabel: Record<string, string> = {
  manufacturer: '제조사',
  recycler: '재활용',
  trader: '트레이더',
  miner: '광산',
};

export default function OnboardingEntry({
  type,
  supplierId,
  invitedCompany,
  consentChecked,
  onConsentChange,
  onPrefill,
  onNext,
}: {
  type: OnboardingType;
  supplierId?: string;
  invitedCompany?: string;
  consentChecked: boolean;
  onConsentChange: (v: boolean) => void;
  onPrefill: (detail: OnboardingPrefill) => void;
  onNext: () => void;
}) {
  const [detail, setDetail] = useState<OnboardingPrefill | null>(null);
  const [loading, setLoading] = useState(Boolean(supplierId));
  const [prefillFailed, setPrefillFailed] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPrefillFailed(false);
      try {
        const d = await getOnboardingPrefill(supplierId);
        if (!cancelled) {
          setDetail(d);
          onPrefill(d);
        }
      } catch {
        // 백엔드 없거나 supplierId 미존재면 graceful — 빈 폼으로 진행 (에러 박스 없음)
        if (!cancelled) setPrefillFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onPrefill은 매 렌더 새로 생성되므로 의존성 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const companyName = detail?.companyName ?? invitedCompany;

  // 원청이 보낸 대기중 동의서가 있으면, 그 조건으로 원문을 재조립해 그대로 보여준다
  // (메일에 담겨 나간 문서와 동일). 없으면 기존 안내 문구로 폴백.
  const consent = detail?.consent ?? null;
  const consentDoc = consent
    ? buildConsentDocument({
        providerCompany: companyName ?? '정보제공자',
        purpose: consent.purpose,
        dataScope: consent.dataScope,
        thirdPartySharing: consent.thirdPartySharing,
        allowedRecipients: consent.allowedRecipients,
        validFrom: consent.validFrom,
        validTo: consent.validTo,
        revocable: consent.revocable,
      })
    : null;

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
      {/* 초대 안내 */}
      <div className="flex items-start gap-3 rounded-md border border-ok-border bg-ok-bg p-4">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-ok-text" />
        <div>
          <div className="text-sm font-bold text-ink-100">원청 또는 직상위 협력사로부터 공급망 정보 입력 요청을 받았습니다.</div>
          <p className="mt-1 text-xs leading-5 text-ok-text">
            아래 절차에 따라 회사 정보를 확인·입력하고, 하위 협력사 담당자를 등록해 주세요.
          </p>
        </div>
      </div>

      {/* pre-fill (SRM I/F) */}
      {supplierId && (
        <div className="mt-4 rounded-md border border-slate-200 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Info className="h-4 w-4" />
            기존 등록 정보 (SRM 연동)
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              회사 정보를 확인하는 중…
            </div>
          ) : detail ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">회사명</span>
                <span className="font-semibold text-ink-100">{detail.companyName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">유형</span>
                <span className="font-semibold text-ink-100">{typeLabel[detail.providerType] ?? detail.providerType}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              {prefillFailed ? '기존 정보를 불러오지 못해 직접 입력으로 진행합니다.' : '연동된 기존 정보가 없습니다.'}
            </div>
          )}
        </div>
      )}

      {companyName && !loading && (
        <div className="mt-4 text-sm text-ink-300">
          대상: <span className="font-bold text-ink-100">{companyName}</span>
        </div>
      )}

      {/* 제3자 정보 확인 동의서 */}
      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-ink-100">
          <FileCheck2 className="h-4 w-4 text-brand" />
          제3자 정보 확인 동의서
        </div>
        {/* 유효한 초대(대기중 동의서)가 있을 때만 원문+동의 체크를 노출한다.
            없으면 안내문만 → 체크박스가 없어 다음 단계로 넘어갈 수 없다(무단 진입 차단). */}
        {loading ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">동의서를 확인하는 중…</p>
        ) : consentDoc ? (
          <>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              직상위 협력사가 요청한 아래 제3자 정보 제공 동의서를 확인하고 동의해 주세요. 동의해야 다음 단계를 진행할 수 있으며, 동의 내역은 이력으로 기록됩니다.
            </p>
            <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-[11px] leading-5 text-ink-200">
              {consentDoc}
            </pre>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-300">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => onConsentChange(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              위 제3자 정보 제공 동의서의 내용을 확인하였으며, 이에 동의합니다.
            </label>
          </>
        ) : (
          <div className="mt-2 rounded-md border border-warn-border bg-warn-bg px-3 py-2.5 text-xs leading-5 text-warn-text">
            메일의 초대 링크를 통해 접속하시면, 원청 또는 직상위 협력사가 요청한 동의서 내용을 확인·동의하신 후 다음 단계를 진행하실 수 있습니다.
          </div>
        )}
      </div>

      {/* 제3자 정보제공 동의 게이트 — 동의서를 확인·동의하지 않으면 다음 단계로 진입 불가.
          (process.md L14·34 "동의하지 않으면 시스템 진입 금지") */}
      <StepFooter onNext={onNext} nextDisabled={!consentDoc || !consentChecked} nextLabel="정보 입력 시작" />
    </div>
  );
}
