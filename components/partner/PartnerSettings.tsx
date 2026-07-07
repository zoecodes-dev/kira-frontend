'use client';

// 계정 설정 (/partner/settings) — app/supplier/page.tsx의 activeView==='edit-info'(어제 리워크본)을 이관.
//  · 블록1 계정 보안: 이메일(마스킹·읽기전용) + 비밀번호 변경(수직 폼 + 유효성 검사).
//  · 블록2 주 담당자 정보: 읽기 / 편집 / 승인대기 3-모드. 헤더 우측 단일 '담당자 정보 수정' 버튼.
//    - 담당자명: 읽기=한/영 병기('김지수 (Kim Jisu)'), 편집=한글/영문 2필드 분리.
//    - 부서: 드롭다운(오타 방지). 연락처: 국가코드 select + 숫자전용·실시간 하이픈 포맷.
//  · 이메일은 블록1에만 노출. 연락처는 읽기 모드에서만 마스킹, 편집 모드는 원문 노출.
//  · 비밀번호 변경/담당자 승인요청은 실 API 없이 로컬 상태 흐름 — 원본 로직 100% 유지.
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Badge from '@/components/Badge';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';
import {
  maskEmail,
  maskPhone,
  splitContactName,
  matchDepartment,
  DEPARTMENT_OPTIONS,
  PHONE_COUNTRY_CODES,
  formatPhoneInput,
  phoneToDomesticFormatted,
} from './partnerFormatters';

const INPUT_CLS =
  'w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-base text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors';
const DISABLED_CLS =
  'w-full cursor-not-allowed rounded-xs border border-ink-700 bg-gray-50 px-3 py-2 text-base text-ink-400';
const COUNTRY_CLS =
  'w-36 shrink-0 rounded-xs border border-ink-700 bg-white px-3 py-2 text-base text-ink-100 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors';
const COUNTRY_DISABLED_CLS =
  'w-36 shrink-0 cursor-not-allowed rounded-xs border border-ink-700 bg-gray-50 px-3 py-2 text-base text-ink-400';

export default function PartnerSettings() {
  const { primaryOverride } = usePartnerWorkspace();

  // 비밀번호 변경 폼 상태 (유효성 검사용 controlled input)
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordChangedAt, setPasswordChangedAt] = useState('');
  // 상단 비밀번호 경고 카드 표시 여부 — 변경 완료 시 영구 숨김.
  const [showPasswordWarning, setShowPasswordWarning] = useState(true);

  // 담당자 정보 읽기 / 편집 / 승인대기 모드
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);

  // 연락처 — 국가코드 + 실시간 포맷(숫자만). 저장값에서 초기화.
  const [phoneCountry, setPhoneCountry] = useState(() => phoneToDomesticFormatted(primaryOverride?.phone).country);
  const [phoneNumber, setPhoneNumber] = useState(() => phoneToDomesticFormatted(primaryOverride?.phone).formatted);

  function handlePasswordChangeSubmit() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setPasswordChangedAt(
      `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    );
    setIsPasswordFormOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordChanged(true);
    setShowPasswordWarning(false); // 변경 완료 → 상단 경고 카드 영구 숨김
    setTimeout(() => setPasswordChanged(false), 3000);
  }

  // 편집/승인대기 공용 담당자 폼 — disabled로 잠금 여부만 분기.
  const nameParts = splitContactName(primaryOverride?.name);
  const deptDefault = matchDepartment(primaryOverride?.department);

  function renderContactForm(disabled: boolean) {
    const fieldCls = disabled ? DISABLED_CLS : INPUT_CLS;
    const countryCls = disabled ? COUNTRY_DISABLED_CLS : COUNTRY_CLS;
    return (
      <div className="grid grid-cols-2 gap-5 px-6 py-5">
        <div>
          <label className="block text-base font-bold text-ink-500 mb-1.5">담당자명 (한글)</label>
          <input type="text" defaultValue={nameParts.ko} placeholder="김지수" disabled={disabled} className={fieldCls} />
        </div>
        <div>
          <label className="block text-base font-bold text-ink-500 mb-1.5">담당자명 (영문)</label>
          <input type="text" defaultValue={nameParts.en} placeholder="Kim Jisu" disabled={disabled} className={fieldCls} />
        </div>
        <div>
          <label className="block text-base font-bold text-ink-500 mb-1.5">직책</label>
          <input type="text" defaultValue={primaryOverride?.jobTitle ?? ''} placeholder="ESG 컴플라이언스 팀장" disabled={disabled} className={fieldCls} />
        </div>
        <div>
          <label className="block text-base font-bold text-ink-500 mb-1.5">부서</label>
          <select defaultValue={deptDefault} disabled={disabled} className={fieldCls}>
            {DEPARTMENT_OPTIONS.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-base font-bold text-ink-500 mb-1.5">연락처</label>
          <div className="flex gap-2">
            <select
              value={phoneCountry}
              disabled={disabled}
              onChange={e => {
                const next = e.target.value;
                setPhoneCountry(next);
                setPhoneNumber(prev => formatPhoneInput(prev, next));
              }}
              className={countryCls}
            >
              {PHONE_COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.label})</option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              disabled={disabled}
              onChange={e => setPhoneNumber(formatPhoneInput(e.target.value, phoneCountry))}
              placeholder="010-1234-5678"
              className={fieldCls}
            />
          </div>
        </div>
      </div>
    );
  }

  // 읽기 모드 목록 — 담당자명 한/영 병기 그대로, 연락처 마스킹.
  const readFields = [
    { label: '담당자명', value: primaryOverride?.name ?? '', mask: false },
    { label: '직책',     value: primaryOverride?.jobTitle ?? '', mask: false },
    { label: '부서',     value: primaryOverride?.department ?? '', mask: false },
    { label: '연락처',   value: primaryOverride?.phone ?? '', mask: true },
  ];

  return (
    <div className="space-y-5">

      {/* ── 비밀번호 변경 권장 — 순수 경고 알림(CTA 없음). 변경 완료 시 자동 숨김 ── */}
      {showPasswordWarning && (
        <div className="flex items-start gap-3 rounded-sm border border-warn-border bg-warn-bg px-5 py-4 shadow-control">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn-text" />
          <div>
            <div className="text-base font-bold text-warn-text">비밀번호 변경 권장</div>
            <div className="mt-0.5 text-base text-warn-text">
              마지막 변경 후 183일이 지났습니다. 계정 보호를 위해 아래 계정 보안 항목에서 비밀번호를 변경해 주세요.
            </div>
          </div>
        </div>
      )}

      {/* ── 블록 1: 계정 보안 (세로형 리스트) ── */}
      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="border-b border-ink-700 px-6 py-4">
          <div className="text-base font-bold text-ink-100">계정 보안</div>
          <div className="mt-0.5 text-base text-ink-500">로그인 이메일 및 비밀번호 관리</div>
        </div>

        {/* 리스트: 라벨(좌) · 마스킹 데이터(중) · 액션(우) */}
        <div className="divide-y divide-ink-800">
          {/* 이메일 — 읽기 전용 + 마스킹 */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="w-32 shrink-0 text-base font-bold text-ink-500">이메일</div>
            <div className="min-w-0 flex-1 truncate text-base font-semibold text-ink-100">
              {maskEmail(primaryOverride?.email ?? 'esg@hanyangcell.com')}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-base text-ink-500">
              <span>변경은 원청사에 문의</span>
              <a
                href="mailto:esg-support@hanyang-motor.com"
                className="inline-flex items-center rounded-xs border border-ink-600 bg-white px-2.5 py-1 text-base font-semibold text-accent-700 transition-colors hover:border-accent-600 hover:bg-accent-50"
              >
                문의하기
              </a>
            </div>
          </div>

          {/* 비밀번호 — 상태 + 변경 버튼 */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="w-32 shrink-0 text-base font-bold text-ink-500">비밀번호</div>
            <div className="min-w-0 flex-1 text-base font-semibold text-ink-100">••••••••</div>
            <div className="shrink-0">
              {passwordChanged ? (
                <div className="flex items-center gap-2 rounded-xs border border-ok-border bg-ok-bg px-3 py-2 text-base font-bold text-ok-text">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  비밀번호가 변경되었습니다 · {passwordChangedAt}
                </div>
              ) : !isPasswordFormOpen ? (
                <button
                  type="button"
                  onClick={() => setIsPasswordFormOpen(true)}
                  className="rounded-xs border border-ink-600 bg-ink-800 px-4 py-2 text-base font-semibold text-ink-300 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
                >
                  비밀번호 변경
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* 비밀번호 변경 폼 — 수직(Vertical) 레이아웃, 전체 너비 */}
        {isPasswordFormOpen && (() => {
          const newPasswordTooShort = newPassword.length > 0 && newPassword.length < 8;
          const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
          const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;
          return (
            <div className="border-t border-ink-700 px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-bold text-ink-500 mb-1.5">현재 비밀번호</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-ink-500 mb-1.5">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호"
                    className={INPUT_CLS}
                  />
                  {newPasswordTooShort && (
                    <p className="mt-1.5 text-base font-semibold text-alert-text">비밀번호는 8자리 이상이어야 합니다.</p>
                  )}
                </div>
                <div>
                  <label className="block text-base font-bold text-ink-500 mb-1.5">비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 확인"
                    className={INPUT_CLS}
                  />
                  {passwordsMismatch && (
                    <p className="mt-1.5 text-base font-semibold text-alert-text">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasswordChangeSubmit}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2.5 text-base font-bold text-white shadow-control transition-colors hover:bg-accent-900 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:hover:bg-ink-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  변경 완료
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordFormOpen(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="rounded-xs border border-ink-600 bg-white px-5 py-2.5 text-base font-semibold text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-200"
                >
                  취소
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ── 블록 2: 주 담당자 정보 ── */}
      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="flex items-center justify-between gap-4 border-b border-ink-700 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-ink-100">주 담당자 정보</span>
              {/* 원청사 승인 상태 — 승인대기(검토 중) 모드에서는 숨김(모순 방지) */}
              {!isPendingReview && <Badge tone="ok">✓ 원청사 승인완료</Badge>}
            </div>
            <div className="mt-0.5 text-base text-ink-500">ESG 업무 담당자 연락처 및 역할</div>
          </div>
          {/* 단일 편집 진입 버튼 — 읽기 모드에서만 노출 */}
          {!isEditingContact && !isPendingReview && (
            <button
              type="button"
              onClick={() => setIsEditingContact(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-ink-600 bg-ink-800 px-4 py-2 text-base font-semibold text-ink-300 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-700"
            >
              담당자 정보 수정 →
            </button>
          )}
        </div>

        {isPendingReview ? (
          /* ── 잠금 상태: 승인 요청 처리 중 ── */
          <>
            {renderContactForm(true)}
            <div className="mx-6 mb-6 flex items-center justify-between gap-3 rounded-xs border border-warn-border bg-warn-bg px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-warn-text" />
                <span className="text-base font-semibold text-warn-text">
                  ⏱ 검토 요청 중 · 2026.07.03 제출 · 원청사 승인 후 반영됩니다
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPendingReview(false)}
                className="shrink-0 rounded-xs border border-warn-border bg-white px-3 py-1.5 text-base font-semibold text-warn-text transition-colors hover:bg-warn-bg"
              >
                요청 취소
              </button>
            </div>
          </>
        ) : isEditingContact ? (
          /* ── 편집 모드: 2단 그리드 입력 폼 (연락처 원문 노출) ── */
          <>
            {renderContactForm(false)}
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={() => setIsEditingContact(false)}
                className="rounded-xs border border-ink-600 bg-white px-5 py-2.5 text-base font-semibold text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingContact(false);
                  setIsPendingReview(true);
                }}
                className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2.5 text-base font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                원청사에 수정 승인 요청하기
              </button>
            </div>
          </>
        ) : (
          /* ── 읽기 모드(기본): 세로형 리스트 · 연락처 마스킹 ── */
          <div className="divide-y divide-ink-800">
            {readFields.map(field => (
              <div key={field.label} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="w-32 shrink-0 text-base font-bold text-ink-500">{field.label}</div>
                <div className="min-w-0 flex-1 text-base font-semibold text-ink-100">
                  {field.mask ? maskPhone(field.value) : field.value || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
