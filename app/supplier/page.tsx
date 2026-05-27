'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Factory,
  FileCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Network,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import KpiCard from '@/components/KpiCard';
import { suppliers, supplyEdges } from '@/lib/data';
import {
  getCertifications,
  getCompleteness,
  getContacts,
  getFactories,
  getRiskProfile,
  getSupplierName,
  parts,
  purchaseOrders,
  regulationMeta,
} from '@/lib/supplier-detail-data';

const supplierId = 'S-MINE-001';

const riskLabel: Record<string, string> = {
  low: '저위험',
  medium: '중위험',
  high: '고위험',
  critical: '최고위험',
};

const certStatusLabel: Record<string, string> = {
  active: '유효',
  expiring_soon: '만료 임박',
  expired: '만료',
};

type SupplierView =
  | 'dashboard'
  | 'company-info'
  | 'submit-documents'
  | 'submission-status'
  | 'supply-chain'
  | 'notifications'
  | 'edit-info';

function RelationRow({
  supplier,
  detail,
  selected,
  onSelect,
}: {
  supplier: NonNullable<(typeof suppliers)[number]>;
  detail: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const name = getSupplierName(supplier.id);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? 'flex w-full items-center justify-between gap-3 rounded-xs border border-accent-600 bg-accent-50 px-3 py-3 text-left'
          : 'flex w-full items-center justify-between gap-3 rounded-xs border border-transparent px-3 py-3 text-left transition-colors hover:border-accent-100 hover:bg-white'
      }
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
        <div className="mt-0.5 truncate text-xs text-ink-500">{name?.nameKo ?? supplier.region}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[11px] font-semibold text-ink-200">T{supplier.tier}</div>
        <div className="text-[10px] text-ink-500">{detail}</div>
      </div>
    </button>
  );
}

function SupplierSidebar({
  supplierName,
  activeView,
  onSelect,
}: {
  supplierName: string;
  activeView: SupplierView;
  onSelect: (view: SupplierView) => void;
}) {
  const menu = [
    { id: 'dashboard' as const, label: '홈', subtitle: '요약 · 우선 조치', icon: LayoutDashboard },
    { id: 'company-info' as const, label: '내 기업 정보', subtitle: '기본정보 · 사업장', icon: Building2 },
    { id: 'submit-documents' as const, label: '자료 제출', subtitle: '요청 자료 업로드', icon: Upload },
    { id: 'submission-status' as const, label: '제출/검토 현황', subtitle: '검토 결과 · 재요청', icon: ClipboardList },
    { id: 'supply-chain' as const, label: '공급망 연결', subtitle: '직접 연결 업체', icon: Network },
    { id: 'notifications' as const, label: '원청사 알림', subtitle: '요청 · 기한', icon: Bell },
    { id: 'edit-info' as const, label: '계정 설정', subtitle: '비밀번호 · 등록정보', icon: KeyRound },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-ink-700 bg-white shadow-control">
      <div className="border-b border-ink-700 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-700 text-white">
            <Factory className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink-100">협력사 업무공간</div>
            <div className="truncate text-[11px] text-ink-500">{supplierName}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map(item => {
          const Icon = item.icon;
          const active = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={
                active
                  ? 'flex w-full items-center gap-3 rounded-sm border border-accent-100 bg-accent-50 px-3 py-2.5 text-left text-accent-900'
                  : 'flex w-full items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 text-left text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100'
              }
            >
              <div className={
                active
                  ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-accent-700 bg-accent-700 text-white'
                  : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-ink-700 bg-white text-ink-400'
              }>
                <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.9} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{item.label}</div>
                <div className="truncate text-[10px] text-ink-500">{item.subtitle}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-ink-700 bg-ink-800 p-4">
        <div className="text-[11px] font-semibold text-ink-500">접속 권한</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-ok" />
          <span className="text-xs font-semibold text-ink-200">내 회사 기준 보기</span>
        </div>
      </div>
    </aside>
  );
}

function SupplierInfoPreview({ supplierId, self = false }: { supplierId: string; self?: boolean }) {
  const supplier = suppliers.find(item => item.id === supplierId);
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId);
  const factories = getFactories(supplierId);
  const production = factories.filter(factory => factory.factoryRole !== 'headquarters');
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const certs = getCertifications(supplierId);

  if (!supplier) {
    return <div className="rounded-xs border border-ink-700 bg-white p-4 text-xs text-ink-500">협력사를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-ink-500">{self ? '내 기업 기본정보' : '직접 연결 업체 정보'}</div>
            <div className="mt-2 text-xl font-bold text-ink-100">{name?.nameEn ?? supplier.name}</div>
            <div className="mt-1 text-sm text-ink-500">{name?.nameKo ?? supplier.role} · {supplier.region}</div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2 text-right">
            <div className="text-[10px] font-bold text-ink-500">Tier</div>
            <div className="num-mono text-2xl font-bold text-accent-700">T{supplier.tier}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">역할</div>
            <div className="mt-1 text-sm font-bold text-ink-100">{supplier.role}</div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">국가/지역</div>
            <div className="mt-1 text-sm font-bold text-ink-100">{supplier.country} · {supplier.region}</div>
          </div>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
            <div className="text-[11px] font-semibold text-ink-500">상태</div>
            <div className="mt-1 text-sm font-bold text-accent-700">{supplier.status}</div>
          </div>
        </div>
      </div>

      {primary && (
        <Card title={self ? '담당자 정보' : '공개 담당 창구'} subtitle={self ? '내 계정 기준 담당자' : '직접 연결 업무에 필요한 범위만 표시'}>
          <div className="rounded-xs border border-ink-700 bg-ink-800 p-4">
            <div className="text-sm font-bold text-ink-100">{primary.name}</div>
            <div className="mt-1 text-xs text-ink-500">{primary.role}{primary.department ? ` · ${primary.department}` : ''}</div>
            <div className="mt-3 text-xs font-semibold text-accent-700">{primary.email}</div>
          </div>
        </Card>
      )}

      <Card title={self ? '내 사업장 정보' : '사업장 정보'} subtitle={`${production.length}개소 · 납품처별 규제 차등`}>
        <div className="space-y-3">
          {production.map(factory => (
            <div key={factory.factoryId} className="rounded-xs border border-ink-700 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-ink-100">{factory.factoryName}</div>
                  {factory.factoryNameEn && factory.factoryNameEn !== factory.factoryName && (
                    <div className="mt-0.5 text-[11px] text-ink-500">{factory.factoryNameEn}</div>
                  )}
                </div>
                <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                  {factory.destination === 'BOTH' ? 'EU + US' : factory.destination ?? 'KR'}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-ink-500">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{factory.address}</span>
                </div>
                <div className="flex items-center gap-1.5 num-mono">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{factory.operatingPeriodFrom} ~ {factory.operatingPeriodTo ?? '현재'}</span>
                </div>
                {factory.monthlyCapacity && <div>월 처리량: {factory.monthlyCapacity}</div>}
                {factory.destinationDetail && <div>납품 흐름: {factory.destinationDetail}</div>}
              </div>
              {factory.applicableRegulations && factory.applicableRegulations.length > 0 && (
                <div className="mt-3 border-t border-ink-700 pt-3">
                  <div className="mb-1.5 text-[10px] font-bold text-ink-500">적용 규제</div>
                  <div className="flex flex-wrap gap-1.5">
                    {factory.applicableRegulations.map(reg => (
                      <span key={reg} className="rounded-xs border border-accent-100 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-900">
                        {regulationMeta[reg]?.label ?? reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="인증서" subtitle={`${certs.length}건 · 제출/검토 기준`}>
        <div className="grid grid-cols-2 gap-2">
          {certs.map(cert => (
            <div key={cert.certId} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-ink-100">{cert.certName}</div>
                <div className="truncate text-[10px] text-ink-500">{cert.issuingBody}</div>
              </div>
              <Badge tone={cert.status === 'active' ? 'ok' : cert.status === 'expired' ? 'alert' : 'warn'}>
                {certStatusLabel[cert.status]}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function SupplierPage() {
  const [activeView, setActiveView] = useState<SupplierView>('dashboard');
  const [selectedRelatedId, setSelectedRelatedId] = useState('S-PRE-001');
  const supplier = suppliers.find(item => item.id === supplierId);
  const name = getSupplierName(supplierId);
  const contacts = getContacts(supplierId);
  const completeness = getCompleteness(supplierId);
  const risk = getRiskProfile(supplierId);
  const factories = getFactories(supplierId).filter(factory => factory.factoryRole !== 'headquarters');
  const certifications = getCertifications(supplierId);
  const myPOs = purchaseOrders.filter(po => po.supplierId === supplierId);
  const downstreamEdges = supplyEdges.filter(edge => edge.from === supplierId);
  const upstreamEdges = supplyEdges.filter(edge => edge.to === supplierId);
  const downstream = downstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.to) }))
    .filter((item): item is { edge: typeof downstreamEdges[number]; supplier: NonNullable<typeof supplier> } => Boolean(item.supplier));
  const upstream = upstreamEdges
    .map(edge => ({ edge, supplier: suppliers.find(item => item.id === edge.from) }))
    .filter((item): item is { edge: typeof upstreamEdges[number]; supplier: NonNullable<typeof supplier> } => Boolean(item.supplier));
  const primary = contacts.find(contact => contact.isPrimary) ?? contacts[0];
  const missing = completeness?.missingFields ?? [];
  const certRisk = certifications.filter(cert => cert.status !== 'active').length;
  const pendingRequests = missing.length + certRisk;
  const requestItems = [
    { label: '광산 폴리곤 좌표 등록', due: '2026-05-31', status: '제출 필요', tone: 'warn' as const },
    { label: '환경영향평가 갱신본 업로드', due: '2026-06-03', status: '재요청', tone: 'alert' as const },
    { label: '커뮤니티 합의서 제출', due: '2026-06-07', status: '대기', tone: 'neutral' as const },
    { label: '광권 갱신 증빙', due: '2026-06-12', status: '대기', tone: 'neutral' as const },
  ];
  const guideItems = [
    { title: '광산 좌표 제출 가이드', detail: 'EUDR 검증용 폴리곤 좌표 형식' },
    { title: 'FEOC 자료 작성법', detail: '원산지·소유구조 증빙 제출 기준' },
    { title: '탄소 배출 보고서 기준', detail: 'Scope 1/2/3 산정 근거 예시' },
  ];
  const reviewResults = [
    { label: '원산지 증명서', result: '승인', reason: 'NORI-NCL-RAW 원산지 증빙 확인', tone: 'ok' as const },
    { label: '탄소 배출 보고서', result: '재요청', reason: 'Scope 3 산정 근거 보완 필요', tone: 'warn' as const },
    { label: '광산 폴리곤 좌표', result: '미제출', reason: 'EUDR 검증 필수 좌표 누락', tone: 'alert' as const },
  ];
  const reviewTimeline = [
    { label: '원산지 증명서', step: '승인 완료', date: '2026-05-16', tone: 'ok' as const },
    { label: '탄소 배출 보고서', step: '재요청 확인 필요', date: '2026-05-19', tone: 'warn' as const },
    { label: '광산 폴리곤 좌표', step: '자료 미제출', date: '2026-05-31', tone: 'alert' as const },
    { label: '환경영향평가 보고서', step: '검토 대기', date: '2026-06-03', tone: 'info' as const },
  ];
  const selectedRelation = [...upstream, ...downstream].find(item => item.supplier.id === selectedRelatedId);

  return (
    <main className="min-h-screen bg-[#F4F7F9] text-ink-100">
      <div className="flex min-h-screen">
        <SupplierSidebar
          supplierName={name?.shortNameKo ?? name?.shortNameEn ?? supplier?.name ?? supplierId}
          activeView={activeView}
          onSelect={setActiveView}
        />
        <div className="min-w-0 flex-1">
          <header className="border-b border-ink-700 bg-white px-8 py-5 shadow-control">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent-700 text-white">
                  <Factory className="h-5 w-5" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">협력사 업무공간</h1>
                    <Badge tone="info">내 회사 기준</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    내 회사 정보, 원청 요청 자료, 직접 연결된 공급망만 확인합니다.
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xs border border-ink-700 bg-white px-3 py-2 text-xs font-bold text-ink-400 hover:border-accent-600 hover:text-accent-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </Link>
            </div>
          </header>

          <div className="space-y-6 p-8">
        {activeView === 'company-info' && (
        <>
        <section className="grid grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-sm border border-ink-700 bg-white p-5 shadow-control">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-ink-500">로그인 협력사</div>
                <div className="mt-2 text-2xl font-bold text-ink-100">{name?.nameEn ?? supplier?.name}</div>
                <div className="mt-1 text-sm text-ink-500">{name?.nameKo} · {supplier?.region}</div>
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 px-3 py-2 text-right">
                <div className="text-[10px] font-bold text-ink-500">Tier</div>
                <div className="num-mono text-2xl font-bold text-accent-700">T{supplier?.tier}</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-[11px] font-semibold text-ink-500">주 담당자</div>
                <div className="mt-1 text-sm font-bold">{primary?.name ?? '미등록'}</div>
                <div className="mt-0.5 text-[11px] text-ink-500">{primary?.email}</div>
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-[11px] font-semibold text-ink-500">사업장</div>
                <div className="mt-1 num-mono text-2xl font-bold">{factories.length}</div>
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="text-[11px] font-semibold text-ink-500">공개 범위</div>
                  <div className="mt-1 text-sm font-bold text-accent-700">내 회사 + 직접 연결</div>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-amber-300 bg-amber-50 p-5 shadow-control">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-800" />
              <div>
                <div className="text-sm font-bold text-amber-900">표시 범위 안내</div>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  내 회사와 직접 연결된 공급망만 표시합니다. 타 협력사 연락처, PO 단가, 내부 판단 로그는 표시하지 않습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SupplierInfoPreview supplierId={supplierId} self />
        </>
        )}

        {activeView === 'dashboard' && (
        <>
        <section className="grid grid-cols-4 gap-4">
          <KpiCard
            label="제출 완성도"
            value={completeness?.completionRate ?? 0}
            unit="%"
            icon={CheckCircle2}
            tone={(completeness?.completionRate ?? 0) >= 90 ? 'ok' : 'warn'}
            hint={`${completeness?.filledFieldCount ?? 0}/${completeness?.requiredFieldCount ?? 0} 항목`}
          />
          <KpiCard
            label="보완 요청"
            value={pendingRequests}
            unit="건"
            icon={AlertCircle}
            tone={pendingRequests > 0 ? 'warn' : 'ok'}
            hint="누락 항목 + 인증서"
          />
          <KpiCard
            label="현재 리스크"
            value={risk ? riskLabel[risk.riskLevel] : '미확인'}
            icon={ShieldCheck}
            tone={risk?.riskLevel === 'low' ? 'ok' : risk?.riskLevel === 'medium' ? 'warn' : 'alert'}
            hint={risk?.feocStatus === 'eligible' ? 'FEOC 적격' : 'FEOC 검토 필요'}
          />
          <KpiCard
            label="직접 연결"
            value={upstream.length + downstream.length}
            unit="개사"
            icon={Network}
            tone="info"
            hint={`상위 ${upstream.length} · 하위 ${downstream.length}`}
          />
        </section>

        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <Card title="오늘 먼저 처리할 일" subtitle="제출 기한이 가까운 원청 요청만 모았습니다">
            <div className="space-y-2">
              {requestItems.slice(0, 3).map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveView('submit-documents')}
                  className="flex w-full items-center justify-between gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3 text-left transition-colors hover:border-accent-600 hover:bg-ink-800"
                >
                  <div>
                    <div className="text-sm font-bold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">제출 기한 {item.due}</div>
                  </div>
                  <Badge tone={item.tone}>{item.status}</Badge>
                </button>
              ))}
            </div>
          </Card>

          <Card title="내 리스크/보완 필요 항목" subtitle="내 자료 기준으로만 표시합니다">
            <div className="space-y-2">
              {missing.slice(0, 3).map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
              {certifications.filter(cert => cert.status !== 'active').slice(0, 2).map(cert => (
                <div key={cert.certId} className="flex items-center gap-2 rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  <FileCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>{cert.certName} · {certStatusLabel[cert.status]}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-[0.9fr_1.1fr] gap-4">
          <Card title="직접 연결 공급망" subtitle="내 회사와 직접 연결된 업체만 표시합니다">
            <div className="space-y-3">
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="mb-2 text-xs font-bold text-ink-500">Parent / 상위 관계</div>
                {upstream.length === 0 ? (
                  <div className="rounded-xs border border-dashed border-ink-700 bg-white p-4 text-xs text-ink-500">
                    등록된 직접 상위 공급사가 없습니다.
                  </div>
                ) : upstream.map(({ edge, supplier: related }) => (
                  <RelationRow
                    key={edge.from}
                    supplier={related}
                    detail={`${edge.material} · ${edge.volume}`}
                    selected={selectedRelatedId === related.id}
                    onSelect={() => setSelectedRelatedId(related.id)}
                  />
                ))}
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="mb-2 text-xs font-bold text-ink-500">Child / 하위 관계</div>
                {downstream.map(({ edge, supplier: related }) => (
                  <RelationRow
                    key={edge.to}
                    supplier={related}
                    detail={`${edge.material} · ${edge.volume}`}
                    selected={selectedRelatedId === related.id}
                    onSelect={() => setSelectedRelatedId(related.id)}
                  />
                ))}
              </div>
            </div>
          </Card>

          <SupplierInfoPreview supplierId={selectedRelatedId} />
        </section>
        </>
        )}

        {activeView === 'edit-info' && (
        <section className="grid grid-cols-[0.95fr_1.05fr] gap-4">
          <Card title="계정 설정" subtitle="비밀번호, 사업자 등록 번호, 담당자 정보를 변경 요청합니다">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '비밀번호 변경', detail: '계정 보안 정보', icon: KeyRound },
                { label: '사업자 등록 번호', detail: '원청사 승인 후 반영', icon: FileText },
                { label: '담당자 연락처', detail: primary?.email ?? '미등록', icon: Building2 },
                { label: '공장 정보', detail: `${factories.length}개 사업장`, icon: Factory },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label} className="rounded-xs border border-ink-700 bg-white p-3 text-left transition-colors hover:border-accent-600 hover:bg-ink-800">
                    <Icon className="h-4 w-4 text-accent-700" />
                    <div className="mt-2 text-sm font-bold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">{item.detail}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="내 사업장 정보" subtitle="협력사 본인 사업장만 표시합니다">
            <div className="grid grid-cols-2 gap-3">
              {factories.map(factory => (
                <div key={factory.factoryId} className="rounded-xs border border-ink-700 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold">{factory.factoryName}</div>
                      <div className="mt-1 text-xs text-ink-500">{factory.region}</div>
                    </div>
                    <Badge tone={factory.destination === 'US' ? 'warn' : factory.destination === 'EU' ? 'ok' : 'info'}>
                      {factory.destination ?? 'KR'}
                    </Badge>
                  </div>
                  <div className="mt-3 text-[11px] leading-5 text-ink-500">
                    {factory.destinationDetail ?? '제출 대상 시장 정보 미등록'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
        )}

        {activeView === 'submit-documents' && (
        <>
        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <Card title="원청 요청사항" subtitle="원청사가 협력사에 요청한 제출·보완 항목">
            <div className="space-y-2">
              {requestItems.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-ink-500" />
                    <div>
                      <div className="text-sm font-semibold text-ink-100">{item.label}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">제출 기한 {item.due}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={item.tone}>{item.status}</Badge>
                    <button className="rounded-xs border border-accent-100 bg-white px-2.5 py-1.5 text-[11px] font-bold text-accent-700 hover:border-accent-600">
                      {item.status === '재요청' ? '재제출' : item.status === '제출 필요' ? '업로드' : '확인'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="내 제출 자료" subtitle="원청사에 제출할 자료만 표시합니다">
            <div className="space-y-2">
              {[
                { label: '원산지 증명서', status: '승인', tone: 'ok' as const },
                { label: '탄소 배출 보고서', status: '검토 중', tone: 'info' as const },
                { label: '광산 폴리곤 좌표', status: '미제출', tone: 'alert' as const },
                { label: '환경영향평가 보고서', status: '재요청', tone: 'warn' as const },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-ink-500" />
                    <span className="text-sm font-semibold text-ink-100">{item.label}</span>
                  </div>
                  <Badge tone={item.tone}>{item.status}</Badge>
                </div>
              ))}
              <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xs bg-accent-700 px-4 py-3 text-sm font-bold text-white shadow-control hover:bg-accent-900">
                새 서류 업로드
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-[0.95fr_1.05fr] gap-4">
          <Card title="자료 작성 가이드" subtitle="원청사가 공유한 제출 기준만 표시합니다">
            <div className="grid grid-cols-3 gap-3">
              {guideItems.map(item => (
                <button key={item.title} className="rounded-xs border border-ink-700 bg-white p-3 text-left transition-colors hover:border-accent-600 hover:bg-ink-800">
                  <BookOpen className="h-4 w-4 text-accent-700" />
                  <div className="mt-2 text-sm font-bold text-ink-100">{item.title}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-ink-500">{item.detail}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="제출 기준 메모" subtitle="자료별로 자주 반려되는 항목">
            <div className="grid grid-cols-2 gap-2">
              {['좌표계 누락', '서명본 미첨부', '기간 불일치', '배출 산정 근거 부족'].map(item => (
                <div key={item} className="rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>
        </>
        )}

        {activeView === 'submission-status' && (
        <>
        <section className="grid grid-cols-[1fr_1fr] gap-4">
          <Card title="자료 검토 상태 타임라인" subtitle="제출됨 → 검토 중 → 재요청 → 승인 흐름">
            <div className="space-y-2">
              {reviewTimeline.map((item, index) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-ink-700 bg-ink-800 num-mono text-[11px] font-bold text-ink-400">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">{item.date}</div>
                  </div>
                  <Badge tone={item.tone}>{item.step}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="내 제출 데이터 완성도" subtitle="필수 항목 충족률과 누락 필드">
            <div className="rounded-xs border border-ink-700 bg-ink-800 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-bold text-ink-500">완성도</div>
                  <div className="mt-1 num-mono text-3xl font-bold text-ink-100">{completeness?.completionRate ?? 0}%</div>
                </div>
                <div className="text-right text-xs font-semibold text-ink-500">
                  {completeness?.filledFieldCount ?? 0}/{completeness?.requiredFieldCount ?? 0} 항목
                </div>
              </div>
              <div className="mt-4 h-2 rounded-xs bg-white">
                <div className="h-full rounded-xs bg-accent-700" style={{ width: `${completeness?.completionRate ?? 0}%` }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {missing.map(item => (
                <div key={item} className="flex items-center gap-2 rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <Card title="내 제출 요청" subtitle="내 회사가 원청사에 제출해야 하는 PO 기반 자료">
            <div className="space-y-2">
              {myPOs.map(po => {
                const part = parts.find(item => item.id === po.partId);
                return (
                  <div key={po.poId} className="rounded-xs border border-ink-700 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="num-mono text-xs font-bold text-ink-100">{po.originalPoNumber}</div>
                        <div className="mt-1 text-sm font-semibold">{part?.partName ?? po.partId}</div>
                        <div className="mt-1 text-[11px] text-ink-500">납기 {po.deliveryDate} · 원산지 {po.originCountry}</div>
                      </div>
                      <Badge tone={po.status === 'verified' ? 'ok' : po.status === 'delivered' ? 'neutral' : 'warn'}>
                        {po.status === 'verified' ? '검증 완료' : po.status === 'delivered' ? '납품 완료' : '제출 필요'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="검토 결과 및 재요청 사유" subtitle="원청사 검토 결과 중 내 자료에 대한 결과만 표시합니다">
            <div className="space-y-3">
              {reviewResults.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                  <div>
                    <div className="text-sm font-semibold text-ink-100">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">{item.reason}</div>
                  </div>
                  <Badge tone={item.tone}>{item.result}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </section>
        </>
        )}

        {activeView === 'supply-chain' && (
        <section className="grid grid-cols-[0.9fr_1.1fr] gap-4">
          <Card title="직접 연결 공급망" subtitle="자신의 Tier 기준 parent/child 관계만 표시합니다">
            <div className="space-y-3">
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="mb-2 text-xs font-bold text-ink-500">Parent / 상위 관계</div>
                {upstream.length === 0 ? (
                  <div className="rounded-xs border border-dashed border-ink-700 bg-white p-4 text-xs text-ink-500">
                    등록된 직접 상위 공급사가 없습니다.
                  </div>
                ) : upstream.map(({ edge, supplier: related }) => (
                  <RelationRow
                    key={edge.from}
                    supplier={related}
                    detail={`${edge.material} · ${edge.volume}`}
                    selected={selectedRelatedId === related.id}
                    onSelect={() => setSelectedRelatedId(related.id)}
                  />
                ))}
              </div>
              <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                <div className="mb-2 text-xs font-bold text-ink-500">Child / 하위 관계</div>
                {downstream.map(({ edge, supplier: related }) => (
                  <RelationRow
                    key={edge.to}
                    supplier={related}
                    detail={`${edge.material} · ${edge.volume}`}
                    selected={selectedRelatedId === related.id}
                    onSelect={() => setSelectedRelatedId(related.id)}
                  />
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {selectedRelation && (
              <Card title="연결 관계 요약" subtitle="선택한 업체와 내 회사 사이의 직접 거래 정보">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                    <div className="text-[11px] font-semibold text-ink-500">관계 유형</div>
                    <div className="mt-1 text-sm font-bold text-ink-100">
                      {selectedRelation.edge.from === supplierId ? 'Child / 하위' : 'Parent / 상위'}
                    </div>
                  </div>
                  <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                    <div className="text-[11px] font-semibold text-ink-500">품목</div>
                    <div className="mt-1 text-sm font-bold text-ink-100">{selectedRelation.edge.material}</div>
                  </div>
                  <div className="rounded-xs border border-ink-700 bg-ink-800 p-3">
                    <div className="text-[11px] font-semibold text-ink-500">물량</div>
                    <div className="mt-1 text-sm font-bold text-ink-100">{selectedRelation.edge.volume}</div>
                  </div>
                </div>
              </Card>
            )}
            <SupplierInfoPreview supplierId={selectedRelatedId} />
          </div>
        </section>
        )}

        {activeView === 'notifications' && (
        <section className="grid grid-cols-[0.95fr_1.05fr] gap-4">
          <Card title="원청사 알림" subtitle="원청사에서 보낸 요청과 안내">
            <div className="space-y-2">
              {[
                { label: '광산 폴리곤 좌표 제출 요청', date: '2026-05-21', tone: 'warn' as const },
                { label: '환경영향평가 갱신본 확인 필요', date: '2026-05-19', tone: 'warn' as const },
                { label: 'NORI-NCL-RAW 원산지 증빙 승인', date: '2026-05-16', tone: 'ok' as const },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-ink-800 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-ink-500" />
                    <span className="text-sm font-semibold text-ink-100">{item.label}</span>
                  </div>
                  <Badge tone={item.tone}>{item.date}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="자료 제출 기한" subtitle="다가오는 기한만 정리해서 보여줍니다">
            <div className="space-y-2">
              {requestItems.map(item => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xs border border-ink-700 bg-white px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-ink-500" />
                    <span className="text-sm font-semibold text-ink-100">{item.label}</span>
                  </div>
                  <span className="num-mono text-xs font-bold text-ink-400">{item.due}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
        )}

        <div className="rounded-sm border border-ink-700 bg-white p-4 text-xs leading-5 text-ink-500 shadow-control">
          이 협력사 화면은 전체 공급망 구조, 다른 협력사의 상세 연락처, PO 단가 비교, FEOC 세부 판정 근거, 내부 HITL 판단 로그, 감사 추적 로그, 경쟁 협력사 비교 지표를 표시하지 않습니다.
        </div>
          </div>
        </div>
      </div>
    </main>
  );
}
