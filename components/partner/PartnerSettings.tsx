'use client';

// 계정 설정 (/partner/settings) — app/supplier/page.tsx의 activeView==='edit-info' 분기를 이관.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Factory } from 'lucide-react';
import Badge from '@/components/Badge';
import { usePartnerWorkspace } from './PartnerWorkspaceContext';

export default function PartnerSettings() {
  const router = useRouter();
  const { supplier, name, factories, primaryOverride } = usePartnerWorkspace();

  // 5-3. 정보 수정 승인 요청 상태 — true면 company-info에 "정보 변경 검토 중" 표시(예정).
  // app/supplier/page.tsx 원본에서도 값만 세팅되고 화면에서 읽어 쓰이지는 않던 상태 — 동작 그대로 이관.
  const [isProfilePending, setIsProfilePending] = useState(false);

  function requestApproval() {
    setIsProfilePending(true);
    alert('원청사에 변경 승인 요청이 전송되었습니다.');
    router.push('/partner/company-info');
  }

  return (
    <div className="space-y-5">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink-100">계정 설정 · 정보 수정 요청</h2>
          <p className="mt-1 text-xs text-ink-500">
            변경할 내용을 입력 후 [수정 승인 요청하기]를 누르면 원청사 검토 후 반영됩니다.
          </p>
        </div>
        {/* 5-2. Primary Action 버튼 — 우측 상단 */}
        <button
          type="button"
          onClick={requestApproval}
          className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-4 py-2.5 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
          원청사에 수정 승인 요청하기
        </button>
      </div>

      {/* ── 기업 기본 정보 ── */}
      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="border-b border-ink-700 px-6 py-4">
          <div className="text-sm font-bold text-ink-100">기업 기본 정보</div>
          <div className="mt-0.5 text-[10px] text-ink-500">회사명, 사업자 등록 번호 등 법인 정보</div>
        </div>
        <div className="grid grid-cols-2 gap-5 px-6 py-5">
          {[
            { label: '기업명 (영문)', key: 'nameEn', value: name?.nameEn ?? supplier?.name ?? '', placeholder: 'Sulawesi Nickel Mine Corp.' },
            { label: '기업명 (한글)', key: 'nameKo', value: name?.nameKo ?? '', placeholder: '술라웨시 니켈광산(주)' },
            { label: '사업자 등록 번호', key: 'bizNum', value: '', placeholder: '000-00-00000' },
            { label: '국가 / 지역', key: 'region', value: supplier?.region ?? '', placeholder: 'ID · 술라웨시' },
            { label: '대표자명', key: 'ceo', value: '', placeholder: '대표자 이름 입력' },
            { label: '본사 주소', key: 'address', value: '', placeholder: '본사 주소 입력' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-[10px] font-bold text-ink-500 mb-1.5">{field.label}</label>
              <input
                type="text"
                defaultValue={field.value}
                placeholder={field.placeholder}
                className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── 담당자 정보 ── */}
      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="border-b border-ink-700 px-6 py-4">
          <div className="text-sm font-bold text-ink-100">주 담당자 정보</div>
          <div className="mt-0.5 text-[10px] text-ink-500">ESG 업무 담당자 연락처 및 역할</div>
        </div>
        <div className="grid grid-cols-2 gap-5 px-6 py-5">
          {[
            { label: '담당자명', key: 'name', value: primaryOverride?.name ?? '', placeholder: 'Kim ESG' },
            { label: '직책', key: 'jobTitle', value: primaryOverride?.jobTitle ?? '', placeholder: 'ESG 컴플라이언스 팀장' },
            { label: '부서', key: 'department', value: primaryOverride?.department ?? '', placeholder: 'ESG · 지속가능경영팀' },
            { label: '이메일', key: 'email', value: primaryOverride?.email ?? '', placeholder: 'esg@hanyangcell.com' },
            { label: '연락처', key: 'phone', value: primaryOverride?.phone ?? '', placeholder: '+82-10-1234-5678' },
            { label: '비밀번호 변경', key: 'password', value: '', placeholder: '새 비밀번호 (변경 시에만 입력)' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-[10px] font-bold text-ink-500 mb-1.5">{field.label}</label>
              <input
                type={field.key === 'password' ? 'password' : field.key === 'email' ? 'email' : 'text'}
                defaultValue={field.value}
                placeholder={field.placeholder}
                className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── 사업장 정보 ── */}
      <section className="rounded-sm border border-ink-700 bg-white shadow-control">
        <div className="border-b border-ink-700 px-6 py-4">
          <div className="text-sm font-bold text-ink-100">사업장 정보</div>
          <div className="mt-0.5 text-[10px] text-ink-500">{factories.length}개소 · 납품처별 규제 자동</div>
        </div>
        <div className="divide-y divide-ink-800 px-6">
          {factories.map(factory => (
            <div key={factory.factoryId} className="py-5">
              <div className="mb-4 flex items-center gap-2">
                <Factory className="h-4 w-4 text-accent-600" />
                <span className="text-xs font-bold text-ink-100">{factory.factoryName}</span>
                <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                  {factory.destination === 'BOTH' ? 'EU + US' : factory.destination ?? 'KR'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: '사업장명 (영문)', value: factory.factoryNameEn ?? factory.factoryName, placeholder: 'Sulawesi Nickel Mine' },
                  { label: '주소', value: factory.address ?? '', placeholder: '사업장 주소' },
                  { label: '월 처리량', value: factory.capacity ?? '', placeholder: '예: 850 t Ni' },
                  { label: '납품 흐름', value: factory.destinationDetail ?? '', placeholder: '예: QZ 전구체 → 전 시장' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-bold text-ink-500 mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      defaultValue={f.value}
                      placeholder={f.placeholder}
                      className="w-full rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 Primary Action 버튼 (하단에도 배치) */}
      <div className="flex items-center justify-between rounded-xs border border-ink-700 bg-white px-5 py-4 shadow-control">
        <div className="text-[11px] text-ink-500">
          수정 요청 후 원청사 검토가 완료되면 정보가 자동으로 업데이트됩니다.
        </div>
        <button
          type="button"
          onClick={requestApproval}
          className="inline-flex items-center gap-2 rounded-xs bg-accent-700 px-5 py-2.5 text-xs font-bold text-white shadow-control hover:bg-accent-900 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
          원청사에 수정 승인 요청하기
        </button>
      </div>

    </div>
  );
}
