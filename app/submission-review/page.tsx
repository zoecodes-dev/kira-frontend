'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import TopStatCard from '@/components/TopStatCard';
import {
  getSupplierName, getContacts, purchaseOrders, parts, remindLogs,
} from '@/lib/supplier-detail-data';
import { AlertCircle, CheckCircle2, FileSearch, RefreshCw, Send, XCircle } from 'lucide-react';
import clsx from 'clsx';

const submissions = [
  {
    id: 'SUB-2026-0514-001',
    supplierId: 'S-CAM-001',
    type: '물질 인증평가',
    status: 'review',
    dueDate: '2026-05-21',
    submittedAt: '2026-05-14 13:42',
    requestId: 'REQ-MAT-001',
    source: '협력사 수기 + OCR',
    files: ['MSDS_NCM811_2026.pdf', 'CoA_POS_260415.pdf', 'Recycled_content_report.pdf'],
    checks: [
      { label: '필수 파일 제출', result: 'pass' },
      { label: 'OCR 추출값 일치', result: 'pass' },
      { label: 'Conflict Minerals 원산지', result: 'review' },
    ],
  },
  {
    id: 'SUB-2026-0514-002',
    supplierId: 'S-CELL-001',
    type: '회사 일반정보',
    status: 'approved',
    dueDate: '2026-05-18',
    submittedAt: '2026-05-13 10:20',
    requestId: 'REQ-GEN-002',
    source: '협력사 수기',
    files: ['business_registration.pdf', 'factory_license_cheongju.pdf'],
    checks: [
      { label: '사업자 정보 형식', result: 'pass' },
      { label: '담당자 이메일 확인', result: 'pass' },
      { label: '공장 주소 확인', result: 'pass' },
    ],
  },
  {
    id: 'SUB-2026-0512-003',
    supplierId: 'S-REF-002',
    type: 'FEOC 지분 공시',
    status: 'rework',
    dueDate: '2026-05-05',
    submittedAt: '2026-05-12 09:10',
    requestId: 'REQ-FEOC-004',
    source: 'OCR',
    files: ['ownership_structure_scan.pdf'],
    checks: [
      { label: '직접 지분 25% 미만', result: 'fail' },
      { label: '최종 수익자 정보', result: 'review' },
      { label: '공시 서명 유효성', result: 'pass' },
    ],
  },
  {
    id: 'SUB-2026-0509-004',
    supplierId: 'S-MINE-002',
    type: '공급망 인권 실사',
    status: 'review',
    dueDate: '2026-04-30',
    submittedAt: '2026-05-09 16:05',
    requestId: 'REQ-HR-005',
    source: '협력사 수기',
    files: ['human_rights_self_assessment.xlsx', 'site_audit_summary.pdf'],
    checks: [
      { label: '아동노동 감사 보고서', result: 'review' },
      { label: '행동강령 서약서', result: 'pass' },
      { label: '개선조치 계획', result: 'review' },
    ],
  },
];

const statusMeta = {
  review: { label: '검토 중', tone: 'info' as const },
  approved: { label: '승인', tone: 'ok' as const },
  rework: { label: '보완 요청', tone: 'warn' as const },
  rejected: { label: '반려', tone: 'alert' as const },
};

const resultMeta = {
  pass: { label: '통과', tone: 'ok' as const },
  review: { label: '확인 필요', tone: 'warn' as const },
  fail: { label: '실패', tone: 'alert' as const },
};

export default function SubmissionReviewPage() {
  const [selectedId, setSelectedId] = useState(submissions[0].id);
  const selected = submissions.find(item => item.id === selectedId) ?? submissions[0];
  const supplier = getSupplierName(selected.supplierId);
  const primary = getContacts(selected.supplierId).find(c => c.isPrimary) ?? getContacts(selected.supplierId)[0];
  const relatedPOs = purchaseOrders.filter(po => po.supplierId === selected.supplierId).slice(0, 3);
  const overdueLogs = remindLogs.filter(log => log.supplierId === selected.supplierId && log.status === 'overdue');

  const stats = useMemo(() => ({
    review: submissions.filter(item => item.status === 'review').length,
    approved: submissions.filter(item => item.status === 'approved').length,
    rework: submissions.filter(item => item.status === 'rework').length,
    failedChecks: submissions.flatMap(item => item.checks).filter(check => check.result === 'fail').length,
  }), []);

  return (
    <>
      <PageHeader
        title="제출 자료 검토"
        description="협력사가 업로드한 자료를 원청사가 승인, 반려, 보완 요청하는 화면"
        badge="P0"
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric label="검토 중" value={stats.review} unit="건" tone="info" />
          <Metric label="승인 완료" value={stats.approved} unit="건" tone="ok" />
          <Metric label="보완 요청" value={stats.rework} unit="건" tone="warn" />
          <Metric label="실패 체크" value={stats.failedChecks} unit="건" tone="alert" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6">
          <Card title="제출 건 목록" subtitle="요청 ID, 협력사, 유형, 마감일 기준 검토">
            <div className="space-y-2">
              {submissions.map(item => {
                const name = getSupplierName(item.supplierId);
                const failed = item.checks.some(check => check.result === 'fail');
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={clsx(
                      'w-full rounded-xs border p-3 text-left transition-colors',
                      selectedId === item.id
                        ? 'border-accent-500/70 bg-accent-500/8'
                        : 'border-ink-700/60 bg-ink-900/30 hover:bg-ink-800/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink-100 num-mono">{item.id}</div>
                        <div className="text-sm text-ink-100 mt-1 truncate">{name?.nameEn ?? item.supplierId}</div>
                        <div className="text-[11px] text-ink-500 truncate">{item.type} · {item.requestId}</div>
                      </div>
                      <Badge tone={failed ? 'alert' : statusMeta[item.status as keyof typeof statusMeta].tone}>
                        {failed ? '확인 필요' : statusMeta[item.status as keyof typeof statusMeta].label}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Mini label="마감일" value={item.dueDate} />
                      <Mini label="파일" value={`${item.files.length}건`} />
                      <Mini label="원천" value={item.source} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card
              title={supplier?.nameEn ?? selected.supplierId}
              subtitle={`${selected.type} · ${selected.requestId}`}
              action={<Badge tone={statusMeta[selected.status as keyof typeof statusMeta].tone}>{statusMeta[selected.status as keyof typeof statusMeta].label}</Badge>}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <Mini label="제출 시각" value={selected.submittedAt} />
                <Mini label="데이터 원천" value={selected.source} />
                <Mini label="기한 초과" value={`${overdueLogs.length}건`} />
              </div>

              <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-4 mb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-ink-100">협력사 담당자</div>
                    <div className="text-[11px] text-ink-400 mt-1">{primary ? `${primary.name} · ${primary.email}` : '담당자 없음'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-ink-500">review owner</div>
                    <div className="text-xs text-ink-200">원청사 ESG 담당자</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">업로드 파일</div>
                  <div className="space-y-2">
                    {selected.files.map(file => (
                      <div key={file} className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSearch className="w-3.5 h-3.5 text-accent-500 shrink-0" />
                          <span className="text-xs text-ink-200 truncate">{file}</span>
                        </div>
                        <Badge tone="info">OCR</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">자동 검증 결과</div>
                  <div className="space-y-2">
                    {selected.checks.map(check => (
                      <div key={check.label} className="flex items-center justify-between rounded-xs border border-ink-700/60 bg-ink-900/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          {check.result === 'pass' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : check.result === 'fail' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                          <span className="text-xs text-ink-200">{check.label}</span>
                        </div>
                        <Badge tone={resultMeta[check.result as keyof typeof resultMeta].tone}>{resultMeta[check.result as keyof typeof resultMeta].label}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="관련 PO" subtitle="승인 결과가 영향을 주는 납품 항목">
                <div className="space-y-2">
                  {relatedPOs.length > 0 ? relatedPOs.map(po => {
                    const part = parts.find(item => item.id === po.partId);
                    return (
                      <div key={po.poId} className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink-100 num-mono">{po.poId}</span>
                          <Badge tone={po.status === 'verified' ? 'ok' : po.status === 'pending' ? 'warn' : 'info'}>{po.status}</Badge>
                        </div>
                        <div className="text-[11px] text-ink-400 mt-1">{part?.partName ?? po.partId}</div>
                        <div className="text-[10px] text-ink-500 mt-1 num-mono">{po.quantity.toLocaleString()} {po.unit} · {po.originCountry}</div>
                      </div>
                    );
                  }) : (
                    <div className="text-xs text-ink-500">연결된 PO가 없습니다.</div>
                  )}
                </div>
              </Card>

              <Card title="검토 결정" subtitle="판단 사유는 감사 로그에 남습니다">
                <textarea
                  className="w-full h-28 rounded-xs border border-ink-700 bg-ink-900/60 p-3 text-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:border-accent-500"
                  placeholder="승인/반려/보완 요청 사유를 입력"
                  defaultValue={selected.status === 'rework' ? 'FEOC 직접 지분 25% 초과 가능성이 있어 최종 수익자 구조와 서명된 지분 공시 원본을 재제출 요청합니다.' : ''}
                />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <ActionButton icon={CheckCircle2} label="승인" tone="ok" />
                  <ActionButton icon={RefreshCw} label="보완 요청" tone="warn" />
                  <ActionButton icon={XCircle} label="반려" tone="alert" />
                  <ActionButton icon={Send} label="HITL 요청" tone="neutral" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'info' | 'ok' | 'warn' | 'alert' }) {
  return <TopStatCard label={label} value={value} unit={unit} tone={tone} />;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-2">
      <div className="text-[10px] text-ink-500">{label}</div>
      <div className="text-xs font-semibold text-ink-100 mt-1 truncate">{value}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, tone }: { icon: any; label: string; tone: 'ok' | 'warn' | 'alert' | 'neutral' }) {
  const style = {
    ok: 'border-emerald-700/40 text-emerald-500 hover:bg-emerald-500/10',
    warn: 'border-amber-700/40 text-amber-400 hover:bg-amber-500/10',
    alert: 'border-red-700/40 text-red-400 hover:bg-red-500/10',
    neutral: 'border-ink-700 text-ink-300 hover:bg-ink-800',
  }[tone];
  return (
    <button className={clsx('inline-flex items-center justify-center gap-2 rounded-xs border px-3 py-2 text-xs font-semibold transition-colors', style)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
