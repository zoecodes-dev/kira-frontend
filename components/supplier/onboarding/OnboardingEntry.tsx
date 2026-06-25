'use client';

// STEP 0 — 메일 URL 진입/동의 확인. 기존 등록 회사면 getSupplierDetail로 pre-fill(SRM I/F).
import { useEffect, useState } from 'react';
import { FileCheck2, Info, Loader2, Mail } from 'lucide-react';
import { ApiError, getSupplierDetail, type SupplierDetail } from '@/lib/api';
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
  onPrefill: (detail: SupplierDetail) => void;
  onNext: () => void;
}) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(supplierId));
  const [prefillFailed, setPrefillFailed] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPrefillFailed(false);
      try {
        const d = await getSupplierDetail(supplierId);
        if (!cancelled) {
          setDetail(d);
          onPrefill(d);
        }
      } catch (err) {
        // 백엔드/토큰 없으면 graceful — 빈 폼으로 진행 (에러 박스 없음)
        if (!cancelled) setPrefillFailed(err instanceof ApiError ? true : true);
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* 초대 안내 */}
      <div className="flex items-start gap-3 rounded-md border border-emerald-100 bg-emerald-50/60 p-4">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div>
          <div className="text-sm font-bold text-ink-100">원청으로부터 공급망 정보 입력 요청을 받았습니다.</div>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {type === 'firstTier'
              ? '1차 협력사로서 하위 협력사의 담당자(PIC) 정보를 등록해 주세요.'
              : '아래 회원가입 절차에 따라 기본 정보와 필요 문서를 등록해 주세요.'}
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
                <span className="font-semibold text-ink-100">{typeLabel[detail.supplierType] ?? detail.supplierType}</span>
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
          <FileCheck2 className="h-4 w-4 text-[#046949]" />
          제3자 정보 확인 동의서
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          원청이 보낸 메일에 첨부된 제3자 정보 확인 동의서를 확인해 주세요. 동의서 확인 후 정보 입력을 진행할 수 있습니다.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-300">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={e => onConsentChange(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          메일로 받은 제3자 정보 확인 동의서를 확인했습니다.
        </label>
      </div>

      <StepFooter onNext={onNext} nextDisabled={!consentChecked} nextLabel="정보 입력 시작" />
    </div>
  );
}
