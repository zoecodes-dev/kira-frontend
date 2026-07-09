'use client';

// 제출 완료 — 원청 승인 대기 상태 + 제출 요약. (write 엔드포인트 없어 제출은 로컬 mock)
import Link from 'next/link';
import { CheckCircle2, Clock, Pencil } from 'lucide-react';
import type { OnboardingType, PicContact, SignupData } from './SupplierOnboarding';

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-ink-100">{value || '-'}</span>
    </div>
  );
}

export default function OnboardingComplete({
  type,
  signup,
  pics,
  onEdit,
}: {
  type: OnboardingType;
  signup: SignupData;
  pics: PicContact[];
  onEdit: () => void;
}) {
  const isFirstTier = type === 'firstTier';
  // 하위협력사 등록은 선택 — 실제 입력된 행만 요약에 표시한다.
  const filledPics = pics.filter(p => p.company.trim() || p.name.trim() || p.email.trim() || p.phone.trim());

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
      {/* 제출 완료 배너 */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-bg">
          <CheckCircle2 className="h-7 w-7 text-ok-text" />
        </div>
        <h2 className="mt-3 text-lg font-bold text-ink-100">제출이 완료되었습니다</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-warn-border bg-warn-bg px-3 py-1 text-xs font-bold text-warn-text">
          <Clock className="h-3.5 w-3.5" />
          원청 승인 대기 중
        </p>
        <p className="mt-3 max-w-md text-sm text-slate-500">
          제출하신 정보를 원청사가 검토합니다. 승인되면 담당자 이메일로 안내가 발송되며,
          등록하신 하위 협력사 담당자에게는 회원가입 요청 메일이 발송됩니다.
          {signup.unverified && ' (미확인 상태로 등록되어 원청/상위의 추가 검증이 진행됩니다.)'}
        </p>
      </div>

      {/* 요약 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-4">
          <div className="mb-2 text-xs font-bold text-slate-500">회사 정보</div>
          <SummaryRow label="회사명" value={signup.companyName} />
          <SummaryRow label="소재 국가" value={signup.country} />
          <SummaryRow label="사업자 등록번호" value={signup.businessRegNo} />
          <SummaryRow label="DUNS" value={signup.dunsNumber} />
          <SummaryRow label="주소" value={signup.address} />
          <SummaryRow label="필요 문서" value={signup.unverified ? '미확인 등록' : signup.registrationDocName} />
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <div className="mb-2 text-xs font-bold text-slate-500">본인(담당자)</div>
          <SummaryRow label="이름" value={signup.contactName} />
          <SummaryRow label="부서" value={signup.department} />
          <SummaryRow label="이메일" value={signup.contactEmail} />
          <SummaryRow label="연락처" value={signup.contactPhone} />
          {!isFirstTier && <SummaryRow label="로그인 계정" value={signup.accountEmail} />}
        </div>

        <div className="rounded-md border border-slate-200 p-4 sm:col-span-2">
          <div className="mb-2 text-xs font-bold text-slate-500">
            {filledPics.length > 0 ? `등록한 하위 협력사 담당자 · ${filledPics.length}명` : '등록한 하위 협력사 담당자'}
          </div>
          {filledPics.length > 0 ? (
            <div className="space-y-2">
              {filledPics.map((p, i) => (
                <div key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div className="font-semibold text-ink-100">
                    {p.company ? `${p.company} · ` : ''}
                    {p.name || '-'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{p.email || '-'} · {p.phone || '-'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">등록한 하위 협력사가 없습니다.</div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" />
          수정하기
        </button>
        <Link
          href="/login"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          로그인 화면으로
        </Link>
      </div>
    </div>
  );
}
