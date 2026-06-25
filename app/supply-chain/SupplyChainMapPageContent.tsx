'use client';

// 공급망 맵과 E-BOM 형성 화면이 공유하는 원본 화면 컴포넌트입니다.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Gem,
  Info,
  Maximize2,
  Package,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  mockDataset,
  supplierDetailIdMap,
  statusMeta,
  getRiskTone,
  buildTraceRows,
  buildExplorerTree,
  getSelectedNode,
  getInvitationContext,
  type SupplyChainDataset,
  type TraceRow,
  type SelectedNode,
  type ExplorerNode,
  type RiskStatus,
} from '@/lib/supply-chain-mock';

export function SupplyChainMapPageContent({
  formationMode = false,
  dataset = mockDataset,
  onNodeSelect,
  onConnectClick,
  onProductChange,
}: {
  formationMode?: boolean;
  // 데이터 주입(선택): 미전달 시 데모 mockDataset. 허브는 빈/API/데모 dataset을 넘긴다.
  dataset?: SupplyChainDataset;
  // 허브 연동용(선택): 노드 선택 변화 통지 / "하위 공급망 연결" 클릭을 허브 모달로 위임
  onNodeSelect?: (node: SelectedNode | null) => void;
  onConnectClick?: (context: ReturnType<typeof getInvitationContext> & { supplierId: string }) => void;
  // 제품 선택 변화 통지 (허브가 해당 제품 BOM을 API로 불러오도록)
  onProductChange?: (productId: string) => void;
}) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState(dataset.products[0]?.product_id ?? '');
  const availableBomVersions = useMemo(
    () => dataset.bom_versions.filter(version => version.product_id === selectedProductId),
    [dataset, selectedProductId],
  );
  const [selectedBomVersionId, setSelectedBomVersionId] = useState(availableBomVersions[0]?.bom_version_id ?? '');
  const [period, setPeriod] = useState('2026-05-01 ~ 2026-05-31');
  const [selectedFactoryId, setSelectedFactoryId] = useState('ALL');
  const [selectedPoNumber, setSelectedPoNumber] = useState('ALL');
  const [selectedNodeKey, setSelectedNodeKey] = useState(dataset.products[0] ? `product:${dataset.products[0].product_id}` : '');
  const [collapsedNodeKeys, setCollapsedNodeKeys] = useState<Set<string>>(() => new Set());
  const [generatedAt, setGeneratedAt] = useState('');
  const [showConnectConfirm, setShowConnectConfirm] = useState(false);
  const [formationGenerated, setFormationGenerated] = useState(!formationMode);

  const selectedProduct = dataset.products.find(product => product.product_id === selectedProductId) ?? dataset.products[0];
  const selectedBomVersion = dataset.bom_versions.find(version => version.bom_version_id === selectedBomVersionId) ?? availableBomVersions[0];
  const hasProducts = dataset.products.length > 0;
  const hasSelection = Boolean(selectedProduct && selectedBomVersion);
  const [periodFrom, periodTo] = period.split(' ~ ');

  const factoryOptions = useMemo(() => {
    const mapRows = dataset.supply_chain_map.filter(row => row.bom_version_id === selectedBomVersionId);
    const factoryIds = new Set(
      mapRows.flatMap(row => dataset.supply_chain_ratios.filter(ratio => ratio.map_id === row.map_id).map(ratio => ratio.factory_id)),
    );
    return dataset.supplier_factories.filter(factory => factoryIds.has(factory.factory_id));
  }, [dataset, selectedBomVersionId]);

  const poOptions = useMemo(
    () => Array.from(new Set(dataset.supply_chain_map.filter(row => row.bom_version_id === selectedBomVersionId).map(row => row.po_number))),
    [dataset, selectedBomVersionId],
  );

  const traceRows = useMemo(
    () => (selectedBomVersion ? buildTraceRows(dataset, selectedBomVersionId, period, selectedFactoryId, selectedPoNumber) : []),
    [dataset, selectedBomVersion, selectedBomVersionId, period, selectedFactoryId, selectedPoNumber],
  );

  const explorerTree = useMemo(
    () => (selectedProduct && selectedBomVersion ? buildExplorerTree(dataset, selectedProduct, selectedBomVersion, traceRows) : null),
    [dataset, selectedProduct, selectedBomVersion, traceRows],
  );

  const selectedNode = selectedProduct && selectedBomVersion
    ? getSelectedNode(selectedNodeKey, selectedProduct, selectedBomVersion, traceRows)
    : null;
  const invitationContext = selectedNode ? getInvitationContext(selectedNode) : null;

  // 허브가 현재 선택 노드를 추적할 수 있도록 통지 (미전달 시 무동작)
  useEffect(() => {
    onNodeSelect?.(selectedNode);
    // selectedNodeKey 변화에만 반응 (selectedNode는 매 렌더 새로 파생되므로 의존성에서 제외)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeKey, selectedBomVersionId, selectedProductId]);

  function handleProductChange(productId: string) {
    const nextVersions = dataset.bom_versions.filter(version => version.product_id === productId);
    setSelectedProductId(productId);
    setSelectedBomVersionId(nextVersions[0]?.bom_version_id ?? '');
    setPeriod('2026-05-01 ~ 2026-05-31');
    setSelectedFactoryId('ALL');
    setSelectedPoNumber('ALL');
    setSelectedNodeKey(`product:${productId}`);
    setCollapsedNodeKeys(new Set());
    onProductChange?.(productId);
  }

  // 제품 목록이 로드되면(또는 데이터셋 교체 시) 유효한 제품을 자동 선택
  useEffect(() => {
    if (dataset.products.length > 0 && !dataset.products.some(p => p.product_id === selectedProductId)) {
      handleProductChange(dataset.products[0].product_id);
    }
    // dataset.products 변화에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.products]);

  // 선택 제품의 BOM이 도착하면 첫 BOM 버전을 자동 선택
  useEffect(() => {
    if (availableBomVersions.length > 0 && !availableBomVersions.some(v => v.bom_version_id === selectedBomVersionId)) {
      setSelectedBomVersionId(availableBomVersions[0].bom_version_id);
    }
  }, [availableBomVersions, selectedBomVersionId]);

  function handleGenerate() {
    setGeneratedAt(new Date().toLocaleString('ko-KR'));
    setFormationGenerated(true);
    if (selectedProduct) setSelectedNodeKey(`product:${selectedProduct.product_id}`);
    setCollapsedNodeKeys(new Set());
  }

  function handlePeriodFromChange(value: string) {
    setPeriod(`${value} ~ ${periodTo || value}`);
  }

  function handlePeriodToChange(value: string) {
    setPeriod(`${periodFrom || value} ~ ${value}`);
  }

  function toggleNode(key: string) {
    setCollapsedNodeKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // 고객사는 백엔드 미연동 — mock 고정값 (추후 고객사 마스터 연동)
  const customerName = '고객사 A (EU)';

  const exportHeaders = ['고객사', '단위기간', '제품', 'BOM 버전', 'Tier', '품목/부품', '원재료/광물', '공급사', '사업장', '국가', 'PO 번호', '공급기간', '공급비율(%)', '리스크 상태'];

  function getExportRows() {
    return traceRows.map(row => [
      customerName,
      period,
      selectedProduct?.product_name ?? '-',
      row.bom_version,
      row.tier,
      row.part_name,
      row.material_or_mineral,
      formationMode ? '-' : row.supplier_name,
      formationMode ? '-' : row.factory_name,
      formationMode ? '-' : row.country,
      formationMode ? '-' : row.po_number,
      formationMode ? '-' : row.supply_period,
      formationMode ? '-' : String(row.supply_ratio),
      formationMode ? '-' : statusMeta[row.risk_status].label,
    ]);
  }

  function downloadCustomerExcel() {
    // 고객사 제출용: 추적 테이블 전체(고객사·단위기간·BOM·PO 구분 포함)
    const rows = [exportHeaders, ...getExportRows()];
    const tableHtml = `<table>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/></head><body>${tableHtml}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `고객사제출_${selectedProduct?.product_code ?? 'export'}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const rows = [exportHeaders, ...getExportRows()];
    const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '﻿';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `공급망_추적_${selectedProduct?.product_code ?? 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadExcel() {
    const rows = [exportHeaders, ...getExportRows()];
    const tableHtml = `<table>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/></head><body>${tableHtml}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `공급망_추적_${selectedProduct?.product_code ?? 'export'}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConnectClick() {
    if (!selectedNode || !invitationContext) return;
    if (onConnectClick) {
      const supplierId = selectedNode.type === 'product'
        ? (selectedNode.rows[0]?.supplier_id ?? '')
        : selectedNode.row.supplier_id;
      onConnectClick({ ...invitationContext, supplierId });
      return;
    }
    setShowConnectConfirm(true);
  }

  function handleConfirmInvitation() {
    if (!invitationContext) return;
    const params = new URLSearchParams({
      node: invitationContext.nodeLabel,
      item: invitationContext.itemName,
      supplier: invitationContext.supplierName,
      type: invitationContext.nodeType,
    });
    setShowConnectConfirm(false);
    router.push(`/suppliers/invitations?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white p-6 text-ink-100">
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-ink-100">{formationMode ? '공급망 맵 형성하기' : '공급망 맵'}</h1>
        <p className="mt-2 text-sm font-medium text-ink-500">
          {formationMode
            ? 'E-BOM 구조를 먼저 펼쳐 보고, 공급망 연결 전 단계의 맵 형성 상태를 확인하세요.'
            : '제품에서 원자재까지 공급망 구조와 리스크 현황을 한눈에 확인하세요.'}
        </p>
      </header>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="제품">
            <select value={selectedProductId} onChange={event => handleProductChange(event.target.value)} className="h-11 min-w-[210px] rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-100 shadow-sm outline-none focus:border-emerald-400">
              {dataset.products.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="BOM 정보">
            <select value={selectedBomVersionId} onChange={event => setSelectedBomVersionId(event.target.value)} className="h-11 min-w-[170px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-emerald-400">
              {availableBomVersions.map(version => (
                <option key={version.bom_version_id} value={version.bom_version_id}>
                  BOM {version.version_number} · {version.status}
                </option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="단위기간">
            <div className="flex h-11 min-w-[300px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm focus-within:border-emerald-400">
              <input
                type="date"
                value={periodFrom}
                onChange={event => handlePeriodFromChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                aria-label="단위기간 시작일"
              />
              <span className="text-xs font-bold text-slate-400">~</span>
              <input
                type="date"
                value={periodTo}
                onChange={event => handlePeriodToChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                aria-label="단위기간 종료일"
              />
            </div>
          </FilterSelect>
          <FilterSelect label="PO 상태">
            <select value={selectedPoNumber} onChange={event => setSelectedPoNumber(event.target.value)} className="h-11 min-w-[150px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-emerald-400">
              <option value="ALL">전체 상태</option>
              {poOptions.map(poNumber => (
                <option key={poNumber} value={poNumber}>{poNumber}</option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="사업장/리스크">
            <select value={selectedFactoryId} onChange={event => setSelectedFactoryId(event.target.value)} className="h-11 min-w-[190px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-emerald-400">
              <option value="ALL">전체 리스크</option>
              {factoryOptions.map(factory => (
                <option key={factory.factory_id} value={factory.factory_id}>
                  {factory.factory_name}
                </option>
              ))}
            </select>
          </FilterSelect>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            필터 초기화
          </button>
        </div>
        <div className="flex items-center gap-2">
          {formationMode ? (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" />
              맵 형성하기
            </button>
          ) : (
            <Link href="/supply-chain/bom-trace" className="inline-flex h-11 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100">
              <Plus className="h-4 w-4" />
              맵 형성하기
            </Link>
          )}
          <button
            type="button"
            onClick={downloadExcel}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel 저장
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50">
            <Maximize2 className="h-4 w-4" />
            전체 화면
          </button>
        </div>
      </section>

      {generatedAt && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {selectedProduct?.product_name} / {selectedBomVersion?.version_number} 기준으로 갱신되었습니다.
          <span className="ml-2 font-medium text-emerald-700">{generatedAt}</span>
        </div>
      )}

      {!hasSelection && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <div className="text-base font-bold text-ink-100">
            {hasProducts ? '대표 제품의 BOM이 비어 있습니다.' : '등록된 제품이 없습니다.'}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {hasProducts
              ? '상단에서 대표 제품을 선택하면 MBOM 자재 구조가 표시됩니다.'
              : '제품이 동기화되면 표시됩니다. 시연하려면 "데모 데이터 불러오기"를 사용하세요.'}
          </p>
        </section>
      )}

      {formationGenerated && hasSelection && explorerTree && selectedNode && (
        <>
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 bg-white px-4 py-3">
              <LegendBadge status="verified" />
              <LegendBadge status="watch" />
              <LegendBadge status="feoc_review" />
              <LegendBadge status="audit_required" />
              <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500">
                <Info className="h-3.5 w-3.5" />
                정보 부족
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_360px]">
              <div className="border-r border-slate-200 p-4">
                <SupplyMapTree
                  root={explorerTree}
                  selectedNodeKey={selectedNodeKey}
                  collapsedNodeKeys={collapsedNodeKeys}
                  onSelect={setSelectedNodeKey}
                  onToggle={toggleNode}
                  formationMode={formationMode}
                />
                <button
                  type="button"
                  onClick={handleConnectClick}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-50 text-sm font-bold text-ink-400 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  하위 공급망 연결
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <MapDetailPanel selectedNode={selectedNode} formationMode={formationMode} />
            </div>
          </section>

          {!formationMode && <SupplyMapStats rows={traceRows} />}
        </>
      )}

      {showConnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4">
          <div className="w-full max-w-[360px] rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-bold text-ink-100">하위 공급망 연결</div>
                <p className="mt-2 text-sm text-ink-500">하위 공급망을 추가하시겠습니까?</p>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectConfirm(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              <div className="font-semibold text-slate-700">{invitationContext.itemName}</div>
              <div>{invitationContext.supplierName} 기준으로 하위 협력사 Invitation을 준비합니다.</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConfirmInvitation}
                className="h-10 rounded-md bg-[#046949] text-sm font-semibold text-white hover:bg-[#03563c]"
              >
                예
              </button>
              <button
                type="button"
                onClick={() => setShowConnectConfirm(false)}
                className="h-10 rounded-md bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}

      {formationGenerated && hasSelection && (
        <section className="mt-4 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/40 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-ink-100">감사/제출용 추적 테이블</h2>
              <p className="mt-0.5 text-xs text-ink-500">트리와 동일한 join 결과를 표 형태로 제공합니다.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-1.5 rounded-xs border border-ink-700 bg-white px-3 py-1.5 text-xs font-semibold text-ink-400 hover:bg-ink-800">
                <Download className="h-3.5 w-3.5" />
                CSV 다운로드
              </button>
              <button type="button" onClick={downloadExcel} className="inline-flex items-center gap-1.5 rounded-xs border border-accent-100 bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel 다운로드
              </button>
              {!formationMode && (
                <button type="button" onClick={downloadCustomerExcel} className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-600 bg-[#046949] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#03563c]">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  고객사 데이터 다운로드
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-800/30">
                  {['Tier', '품목/부품', '원재료/광물', '공급사', '사업장', '국가', 'PO 번호', '공급기간', '공급비율', '규제/리스크 상태'].map(header => (
                    <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-ink-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/40">
                {traceRows.map(row => (
                  <tr
                    key={row.node_key}
                    className={`cursor-pointer hover:bg-ink-800/30 ${selectedNodeKey === row.node_key ? 'bg-accent-50/60' : ''}`}
                    onClick={() => setSelectedNodeKey(row.node_key)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-ink-400">{row.tier}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-100">{row.part_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{row.material_or_mineral}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-300">{formationMode ? '-' : row.supplier_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.factory_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.country}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">{formationMode ? '-' : row.po_number}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.supply_period}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-300">{formationMode ? '-' : `${row.supply_ratio}%`}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formationMode ? <span className="text-sm font-medium text-ink-400">-</span> : <StatusBadge status={row.risk_status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function FilterSelect({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SupplyMapTree({
  root,
  selectedNodeKey,
  collapsedNodeKeys,
  onSelect,
  onToggle,
  formationMode = false,
}: {
  root: ExplorerNode;
  selectedNodeKey: string;
  collapsedNodeKeys: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  formationMode?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="grid min-w-[980px] grid-cols-[minmax(270px,1.35fr)_80px_120px_minmax(170px,.85fr)_90px_90px_132px_54px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
        <span>제품/부품명</span>
        <span>Tier</span>
        <span>공급사 유형</span>
        <span>공급사 / 광산명</span>
        <span>공급 비율</span>
        <span>검증률</span>
        <span>리스크 상태</span>
        <span>상세</span>
      </div>
      <div className="overflow-x-auto">
        <SupplyMapRow
          node={root}
          selectedNodeKey={selectedNodeKey}
          collapsedNodeKeys={collapsedNodeKeys}
          onSelect={onSelect}
          onToggle={onToggle}
          formationMode={formationMode}
        />
      </div>
    </div>
  );
}

function SupplyMapRow({
  node,
  selectedNodeKey,
  collapsedNodeKeys,
  onSelect,
  onToggle,
  formationMode = false,
}: {
  node: ExplorerNode;
  selectedNodeKey: string;
  collapsedNodeKeys: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  formationMode?: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = !collapsedNodeKeys.has(node.key);
  const selected = selectedNodeKey === node.key;
  const NodeIcon = getExplorerIcon(node.type);
  const rowTone = getRiskTone(node.status);
  const isProduct = node.type === 'product';
  const hideFormationValues = formationMode;

  return (
    <div className="relative min-w-[980px]">
      {node.depth > 0 && (
        <>
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-emerald-300"
            style={{ left: `${28 + (node.depth - 1) * 24}px` }}
          />
          <div
            className="pointer-events-none absolute top-[34px] h-px w-5 bg-emerald-300"
            style={{ left: `${28 + (node.depth - 1) * 24}px` }}
          />
        </>
      )}
      <button
        type="button"
        data-testid={node.row ? `supply-map-node-${node.row.part_id}` : `supply-map-node-${node.key}`}
        onClick={() => onSelect(node.key)}
        className={`grid min-h-[72px] w-full grid-cols-[minmax(270px,1.35fr)_80px_120px_minmax(170px,.85fr)_90px_90px_132px_54px] items-center border-b border-slate-100 px-4 text-left transition ${
          selected || isProduct
            ? 'bg-emerald-50/70'
            : rowTone === 'danger'
              ? 'bg-white hover:bg-red-50/40'
              : 'bg-white hover:bg-slate-50'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3" style={{ paddingLeft: `${node.depth * 24}px` }}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isProduct ? 'bg-emerald-400' : rowTone === 'danger' ? 'bg-red-400' : 'bg-emerald-300'}`} />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${rowTone === 'danger' ? 'text-red-500' : 'text-ink-400'}`}>
            <NodeIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className={`block truncate ${isProduct ? 'text-[15px] font-bold text-ink-100' : `text-sm font-medium ${rowTone === 'danger' ? 'text-red-900' : 'text-ink-100'}`}`}>{node.label}</span>
            <span className="mt-1 block truncate text-xs font-medium text-slate-500">{node.meta}</span>
          </span>
        </div>
        <span className={`text-sm text-ink-400 ${isProduct ? 'font-semibold' : 'font-medium'}`}>{hideFormationValues ? '-' : node.tier}</span>
        <span className="text-sm font-medium text-ink-400">{hideFormationValues || isProduct ? '-' : node.providerType}</span>
        <span className={`truncate text-sm font-medium ${isProduct || hideFormationValues ? 'text-ink-400' : 'text-ink-100'}`}>{hideFormationValues || isProduct ? '-' : node.supplierName}</span>
        <span className="text-sm font-medium text-ink-100">{hideFormationValues ? '-' : node.supplyRatio}</span>
        <span className="text-sm font-medium text-ink-100">{hideFormationValues ? '-' : node.verificationProgress}</span>
        {hideFormationValues ? <span className="text-sm font-medium text-ink-400">-</span> : <StatusBadge status={node.status} />}
        <span
          role="button"
          tabIndex={0}
          onClick={event => {
            event.stopPropagation();
            if (hasChildren) onToggle(node.key);
          }}
          onKeyDown={event => {
            if ((event.key === 'Enter' || event.key === ' ') && hasChildren) {
              event.preventDefault();
              event.stopPropagation();
              onToggle(node.key);
            }
          }}
          className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-md border border-slate-200 bg-white text-ink-400"
          aria-label={hasChildren && isExpanded ? '접기' : '펼치기'}
        >
          <ChevronDown className={`h-4 w-4 transition ${hasChildren && !isExpanded ? '-rotate-90' : ''}`} />
        </span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <SupplyMapRow
              key={child.key}
              node={child}
              selectedNodeKey={selectedNodeKey}
              collapsedNodeKeys={collapsedNodeKeys}
              onSelect={onSelect}
              onToggle={onToggle}
              formationMode={formationMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupplyChainMapPage() {
  return <SupplyChainMapPageContent />;
}

function MapDetailPanel({ selectedNode, formationMode = false }: { selectedNode: SelectedNode; formationMode?: boolean }) {
  if (formationMode && selectedNode.type === 'product') {
    const detailRows = [
      ['제품 코드', selectedNode.product.product_code],
      ['제품 유형', selectedNode.product.type],
      ['용량', selectedNode.product.specs.capacity],
      ['출고 정보', selectedNode.product.specs.shipment_info],
      ['광물 구성', selectedNode.product.specs.mineral_composition],
    ];

    return (
      <aside className="bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-100">
            선택 노드 상세 정보
            <Info className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-start gap-3">
            <Gem className="mt-1 h-5 w-5 shrink-0 text-ink-400" />
            <div>
              <h3 className="text-base font-bold text-ink-100">{selectedNode.product.product_name}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">BOM {selectedNode.bomVersion.version_number}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-500">{label}</span>
                <span className="text-right font-semibold text-ink-100">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-500">최종 업데이트</span>
              <span className="text-right font-semibold text-ink-100">-</span>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-ink-400">
            <div className="mb-2 font-bold text-ink-100">리스크 요약</div>
            <ul className="space-y-1 text-xs font-medium leading-5">
              <li>· -</li>
            </ul>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-100">연결 제품</h3>
            <span className="text-xs font-semibold text-slate-500">연결된 제품 수 1개</span>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-bold text-ink-100">{selectedNode.product.product_name}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{selectedNode.product.product_code}</div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const row = selectedNode.type === 'product'
    ? selectedNode.rows.find(item => item.risk_status === 'feoc_review') ?? selectedNode.rows.find(item => getRiskTone(item.risk_status) === 'danger') ?? selectedNode.rows[0]
    : selectedNode.row;
  const badge = row?.risk_status ?? (selectedNode.type === 'product' ? selectedNode.product.specs.regulation_status : 'verified');
  const hideFormationValues = formationMode && selectedNode.type !== 'product';

  if (!row) {
    return (
      <aside className="bg-white p-6">
        <h2 className="text-sm font-bold text-ink-100">선택 노드 상세 정보</h2>
      </aside>
    );
  }

  const detailRows = [
    ['Tier', hideFormationValues ? '-' : row.tier],
    ['공급사 유형', hideFormationValues ? '-' : row.provider_type],
    ['공급사', hideFormationValues ? '-' : row.supplier_name],
    ['공급 비율', hideFormationValues ? '-' : `${row.supply_ratio}%`],
    ['검증률', hideFormationValues ? '-' : row.verification_progress],
  ];

  return (
    <aside className="bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-100">
          선택 노드 상세 정보
          <Info className="h-4 w-4 text-slate-400" />
        </div>
        <div className="flex items-start gap-3">
          <Gem className={`mt-1 h-5 w-5 shrink-0 ${getRiskTone(badge) === 'danger' ? 'text-red-500' : 'text-ink-400'}`} />
          <div>
            <h3 className="text-base font-bold text-ink-100">{row.part_name}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">{row.material_or_mineral}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {detailRows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-slate-500">{label}</span>
              <span className="text-right font-semibold text-ink-100">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-500">리스크 상태</span>
            {hideFormationValues ? <span className="text-right font-semibold text-ink-100">-</span> : <StatusBadge status={row.risk_status} />}
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-500">최종 업데이트</span>
            <span className="text-right font-semibold text-ink-100">{hideFormationValues ? '-' : '2025.05.14 09:30'}</span>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-ink-400">
          <div className="mb-2 font-bold text-ink-100">리스크 요약</div>
          <ul className="space-y-1 text-xs font-medium leading-5">
            {hideFormationValues ? (
              <li>· -</li>
            ) : (
              <>
                <li>· 원산지: 중국 발생 가능성 있음</li>
                <li>· FEOC 관련 규제 검토 필요</li>
                <li>· 추가 증빙 서류 요청됨</li>
              </>
            )}
          </ul>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-100">연결 제품</h3>
          <span className="text-xs font-semibold text-slate-500">연결된 제품 수 {hideFormationValues ? '-' : '3개'}</span>
        </div>
        <div className="space-y-3 text-sm">
          {hideFormationValues ? (
            <div>
              <div className="font-bold text-ink-100">-</div>
              <div className="mt-1 text-xs font-medium text-slate-500">-</div>
            </div>
          ) : (
            [
              ['Battery Cell A', 'BAT-NCM811-100Ah'],
              ['Battery Module B', 'BOM-MODULE-B'],
              ['ESS Pack C', 'ESS-PACK-C'],
            ].map(([name, code]) => (
              <div key={name}>
                <div className="font-bold text-ink-100">{name}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{code}</div>
              </div>
            ))
          )}
        </div>
        {!hideFormationValues && supplierDetailIdMap[row.supplier_id] ? (
          <Link
            href={`/suppliers/${supplierDetailIdMap[row.supplier_id]}/info`}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-ink-400 hover:bg-slate-50"
          >
            공급사 상세 페이지로 이동
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : (
          <button disabled className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400 cursor-not-allowed">
            공급사 상세 페이지로 이동
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

function SupplyMapStats({ rows }: { rows: TraceRow[] }) {
  const verifiedCount = rows.filter(row => row.risk_status === 'verified').length;
  return (
    <section className="mt-4 grid grid-cols-6 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
      <StatCell label="전체 공급망 노드" value="128" suffix="개" />
      <StatCell label="공급사" value="42" suffix="개" />
      <StatCell label="원자재 / 광산" value="57" suffix="개" />
      <StatCell label="FEOC 검토 필요" value="7" suffix="개" tone="danger" />
      <StatCell label="실사 필요" value="3" suffix="개" tone="warning" />
      <StatCell label="검증완료" value={`${Math.max(96, verifiedCount)}`} suffix="개" tone="success" />
    </section>
  );
}

function StatCell({ label, value, suffix, tone = 'default' }: { label: string; value: string; suffix: string; tone?: 'default' | 'danger' | 'warning' | 'success' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-orange-500' : tone === 'success' ? 'text-emerald-600' : 'text-ink-100';
  return (
    <div className="px-5 text-center first:pl-0 last:pr-0">
      <div className={`text-xs font-bold ${tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-orange-500' : 'text-ink-400'}`}>{label}</div>
      <div className={`mt-2 text-3xl font-black ${color}`}>
        {value}
        <span className="ml-1 text-sm font-bold text-ink-400">{suffix}</span>
      </div>
    </div>
  );
}

function LegendBadge({ status }: { status: RiskStatus }) {
  return <StatusBadge status={status} />;
}

function getExplorerIcon(type: ExplorerNode['type']) {
  if (type === 'product') return Box;
  if (type === 'part') return Package;
  return Gem;
}

function StatusBadge({ status }: { status: RiskStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
