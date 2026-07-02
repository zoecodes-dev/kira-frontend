'use client';

// 공급망 맵과 M-BOM 형성 화면이 공유하는 원본 화면 컴포넌트입니다.
import { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { SupplierGeneralReviewContent } from '@/app/suppliers/check-info/SupplierGeneralReview';
import { getSupplierDetail, getSupplierContacts, getSupplierFactories, getSupplierRiskProfile } from '@/lib/api';
import {
  Box,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Gem,
  Info,
  Package,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  mockDataset,
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

// 실 협력사(백엔드 UUID) 여부 — general review 조회/이동 대상 판별.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

// 진행 단계 배지 색조.
const progressToneCls: Record<'ok' | 'warn' | 'accent', string> = {
  ok: 'border-ok-border bg-ok-bg text-ok-text',
  accent: 'border-accent-100 bg-accent-50 text-accent-700',
  warn: 'border-warn-border bg-warn-bg text-warn-text',
};

export function SupplyChainMapPageContent({
  formationMode = false,
  dataset = mockDataset,
  embedded = false,
  initialProductId,
  initialBomVersionId,
  initialPeriodFrom,
  initialPeriodTo,
  highlightSupplierIds,
  progressBySupplier,
  onRowClick,
  onNodeSelect,
  onConnectClick,
  onProductChange,
}: {
  formationMode?: boolean;
  // 허브 안에 임베드될 때 true — 중복 헤더와 별도 "맵 형성하기" 링크를 숨긴다.
  embedded?: boolean;
  // 공급망 목록에서 넘어온 초기 선택 제품(선택). 제품 목록 로드 후 이 제품을 우선 선택한다.
  initialProductId?: string;
  // 공급망 목록에서 넘어온 초기 BOM 버전(생산 Lot). 해당 버전을 드롭다운에서 우선 선택한다.
  initialBomVersionId?: string;
  // 진입 게이트에서 고른 단위기간(선택). 전달되면 단위기간 필터 칸의 초기값으로 채운다.
  initialPeriodFrom?: string;
  initialPeriodTo?: string;
  // STEP 2에서 확정된 Pool의 supplierId 집합(선택). 해당 협력사 행을 맵에서 하이라이트한다.
  highlightSupplierIds?: Set<string>;
  // 협력사별 진행 단계(supplier_id → 배지). 허브가 gaps 기준으로 계산해 넘긴다. 표의 '진행 단계' 컬럼에 표시.
  progressBySupplier?: Record<string, { label: string; tone: 'ok' | 'warn' | 'accent' }>;
  // 표 행 클릭 위임(선택). 허브가 해당 협력사 general review 페이지로 이동시킨다. 미전달 시 노드 선택으로 폴백.
  onRowClick?: (row: TraceRow) => void;
  // 데이터 주입(선택): 미전달 시 데모 mockDataset. 허브는 빈/API/데모 dataset을 넘긴다.
  dataset?: SupplyChainDataset;
  // 허브 연동용(선택): 노드 선택 변화 통지 / "하위 공급망 연결" 클릭을 허브 모달로 위임
  onNodeSelect?: (node: SelectedNode | null) => void;
  onConnectClick?: (context: ReturnType<typeof getInvitationContext> & { supplierId: string }) => void;
  // 제품 선택 변화 통지 (허브가 해당 제품 BOM을 API로 불러오도록)
  onProductChange?: (productId: string) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState(dataset.products[0]?.product_id ?? '');
  const availableBomVersions = useMemo(
    () => dataset.bom_versions.filter(version => version.product_id === selectedProductId),
    [dataset, selectedProductId],
  );
  const [selectedBomVersionId, setSelectedBomVersionId] = useState(availableBomVersions[0]?.bom_version_id ?? '');
  // 단위기간(period) — BOM(봄)의 생산기간이 겹치는지로 BOM 드롭다운 후보를 거른다. 기본은 '전체'(빈 값).
  // 진입 게이트에서 고른 단위기간이 넘어오면 그 값으로 초기화해 필터 칸에 그대로 표시한다.
  const [period, setPeriod] = useState(
    initialPeriodFrom || initialPeriodTo ? `${initialPeriodFrom ?? ''} ~ ${initialPeriodTo ?? ''}` : ' ~ ',
  );
  const [selectedFactoryId, setSelectedFactoryId] = useState('ALL');
  const [selectedNodeKey, setSelectedNodeKey] = useState(dataset.products[0] ? `product:${dataset.products[0].product_id}` : '');
  const [collapsedNodeKeys, setCollapsedNodeKeys] = useState<Set<string>>(() => new Set());
  const [generatedAt, setGeneratedAt] = useState('');
  const [showConnectConfirm, setShowConnectConfirm] = useState(false);
  const [formationGenerated, setFormationGenerated] = useState(!formationMode);
  const [customerDownloading, setCustomerDownloading] = useState(false);  // 고객사 데이터(하이브리드 xlsx) 생성중

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

  // 단위기간(period) 창에 생산기간이 겹치는 BOM 버전만 BOM 드롭다운 후보로 — 한 단위기간에 여러 봄이 있을 수 있다.
  const bomOptions = useMemo(() => {
    if (!periodFrom || !periodTo) return availableBomVersions;
    return availableBomVersions.filter(
      v => v.effective_from <= periodTo && (v.effective_to ?? '9999-12-31') >= periodFrom,
    );
  }, [availableBomVersions, periodFrom, periodTo]);

  // 단위기간은 BOM 후보를 거르는 용도 — 선택된 BOM의 맵은 전체 행을 보여준다(맵 생성과 동일 의미).
  const traceRows = useMemo(
    () => (selectedBomVersion ? buildTraceRows(dataset, selectedBomVersionId, ' ~ ', selectedFactoryId, 'ALL') : []),
    [dataset, selectedBomVersion, selectedBomVersionId, selectedFactoryId],
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
    setPeriod(' ~ ');  // 단위기간 전체
    setSelectedFactoryId('ALL');
    setSelectedNodeKey(`product:${productId}`);
    setCollapsedNodeKeys(new Set());
    onProductChange?.(productId);
  }

  // 맵 화면에서도 게이트와 동일 기준(제품·고객사·단위기간)을 노출.
  // 고객사 목록 = 제품의 customer_name 고유값.
  const customerOptions = useMemo(
    () => Array.from(new Map(dataset.products.filter(p => p.customer_name).map(p => [p.customer_name, p.customer_name])).keys()),
    [dataset.products],
  );
  // 제품 드롭다운은 선택 고객사의 제품만(게이트와 동일 cascading).
  const productOptions = useMemo(
    () => dataset.products.filter(p => !selectedProduct?.customer_name || p.customer_name === selectedProduct.customer_name),
    [dataset.products, selectedProduct?.customer_name],
  );
  // 고객사 변경 → 그 고객사의 첫 제품으로 전환.
  function handleCustomerChange(name: string) {
    const prod = dataset.products.find(p => p.customer_name === name);
    if (prod) handleProductChange(prod.product_id);
  }

  // 제품 목록이 로드되면(또는 데이터셋 교체 시) 유효한 제품을 자동 선택.
  // 목록에서 넘어온 initialProductId 가 현재 목록에 있으면 그 제품을 우선 선택한다.
  useEffect(() => {
    if (dataset.products.length > 0 && !dataset.products.some(p => p.product_id === selectedProductId)) {
      const preferred = initialProductId && dataset.products.find(p => p.product_id === initialProductId);
      handleProductChange((preferred || dataset.products[0]).product_id);
    }
    // dataset.products 변화에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.products]);

  // 선택 제품의 BOM이 도착하면 BOM 버전(단위기간 Lot)을 선택.
  // 게이트/목록에서 넘어온 initialBomVersionId 는 1회 '강제 적용'해 고정한다 — 기본 첫 버전으로
  // 덮이면(예: GLC 2024가 첫 버전) 게이트에서 고른 2025 Lot이 사라지는 문제를 막는다.
  const appliedInitialBom = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (availableBomVersions.length === 0) return;
    const validInitial =
      initialBomVersionId && availableBomVersions.some(v => v.bom_version_id === initialBomVersionId);
    if (validInitial && initialBomVersionId !== appliedInitialBom.current) {
      appliedInitialBom.current = initialBomVersionId;
      setSelectedBomVersionId(initialBomVersionId!);
      return;
    }
    if (!availableBomVersions.some(v => v.bom_version_id === selectedBomVersionId)) {
      setSelectedBomVersionId(availableBomVersions[0].bom_version_id);
    }
  }, [availableBomVersions, selectedBomVersionId, initialBomVersionId]);

  function handleGenerate() {
    setGeneratedAt(new Date().toLocaleString('ko-KR'));
    setFormationGenerated(true);
    if (selectedProduct) setSelectedNodeKey(`product:${selectedProduct.product_id}`);
    setCollapsedNodeKeys(new Set());
  }

  // 단위기간 창에 안 맞는 BOM이 선택돼 있으면 창 안 첫 BOM으로 옮긴다.
  function reselectBomForPeriod(from: string, to: string) {
    const inWindow = availableBomVersions.filter(
      v => !from || !to || (v.effective_from <= to && (v.effective_to ?? '9999-12-31') >= from),
    );
    if (!inWindow.some(v => v.bom_version_id === selectedBomVersionId)) {
      setSelectedBomVersionId(inWindow[0]?.bom_version_id ?? '');
    }
  }

  function handlePeriodFromChange(value: string) {
    const to = periodTo || value;
    setPeriod(`${value} ~ ${to}`);
    reselectBomForPeriod(value, to);
  }

  function handlePeriodToChange(value: string) {
    const from = periodFrom || value;
    setPeriod(`${from} ~ ${value}`);
    reselectBomForPeriod(from, value);
  }

  // 필터 초기화 — 단위기간/BOM/선택 노드를 기본값으로 되돌린다.
  function handleReset() {
    setPeriod(' ~ ');
    setSelectedFactoryId('ALL');
    setSelectedBomVersionId(availableBomVersions[0]?.bom_version_id ?? '');
    if (selectedProduct) setSelectedNodeKey(`product:${selectedProduct.product_id}`);
    setCollapsedNodeKeys(new Set());
  }

  function toggleNode(key: string) {
    setCollapsedNodeKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // 고객사명 — 선택 제품의 실 고객사(getProducts customer_name). 없으면 '-'.
  const customerName = selectedProduct?.customer_name || '-';
  // 기간 컬럼 표기 — 필터 비어있으면 '전체'.
  const periodLabel = period.replace(/[\s~]/g, '') ? period : '전체';

  const exportHeaders = ['고객사', '단위기간', '제품', 'BOM 버전', 'Tier', '품목/부품', '원재료/광물', '공급사', '사업장', '국가', '공급기간', '공급비율(%)', '리스크 상태'];
  const COL_WIDTHS = [16, 12, 26, 12, 8, 22, 18, 24, 18, 8, 22, 12, 12];

  function getExportRows(rows: TraceRow[], periodCol: string): (string | number)[][] {
    return rows.map(row => [
      customerName,
      periodCol,
      selectedProduct?.product_name ?? '-',
      row.bom_version,
      row.tier,
      row.part_name,
      row.material_or_mineral,
      formationMode ? '-' : row.supplier_name,
      formationMode ? '-' : row.factory_name,
      formationMode ? '-' : row.country,
      formationMode ? '-' : row.supply_period,
      formationMode ? '-' : row.supply_ratio, // 숫자 유지 — 공급비율 % 서식용
      formationMode ? '-' : statusMeta[row.risk_status].label,
    ]);
  }

  // 실 .xlsx 생성(exceljs) — 헤더 강조(굵은 흰글씨+브랜드 배경)·테두리·헤더 고정·자동필터·공급비율 % 서식.
  async function writeXlsx(filename: string, sheetName: string, dataRows: (string | number)[][]) {
    const thin = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = exportHeaders.map((h, i) => ({ header: h, width: COL_WIDTHS[i] }));

    const headerRow = ws.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    });

    dataRows.forEach(r => ws.addRow(r));
    for (let i = 2; i <= ws.rowCount; i++) {
      ws.getRow(i).eachCell(cell => {
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        cell.alignment = { vertical: 'middle' };
      });
    }
    ws.getColumn(12).numFmt = '0"%"'; // 공급비율(%) — PO 번호 제거로 한 칸 당겨짐
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: exportHeaders.length } };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const code = selectedProduct?.product_code ?? 'export';

  // 고객사 제출용(단일 시트) — 맵 행마다 그 협력사의 general review 컬럼을 오른쪽에 붙인 넓은 표(+상단 제품 헤더 블록).
  // 필터 무시하고 이 BOM의 전체 공급망을 내보낸다. general review는 맵에 편입된 실 협력사(UUID)를 API로 조회해 합친다.
  const CUSTOMER_HEADERS = [
    '차수', '품목/부품', '원재료/광물', '공급사', '사업장', '국가(원산지)', '공급기간', '공급비율(%)', '리스크 상태',
    '영문명', '사업자등록번호', '본사 국가', '업종', 'smelter 구분', '핵심광물(Li/Co/Ni %)',
    'PIC 이름', 'PIC 직책', 'PIC 이메일', 'PIC 연락처', '공장(원산지·비율·담당자)',
    '탄소집약도', '에너지원', '실사 자가진단', '사업자등록증', '환경성적서',
  ];
  const CUSTOMER_WIDTHS = [
    8, 22, 16, 22, 16, 10, 20, 12, 12,
    18, 16, 10, 12, 12, 18,
    14, 12, 24, 16, 40,
    12, 14, 12, 12, 12,
  ];
  const RATIO_COL = 8; // 공급비율(%) 열 번호

  async function downloadCustomerExcel() {
    if (!selectedBomVersion || customerDownloading) return;
    setCustomerDownloading(true);
    try {
      const fullRows = buildTraceRows(dataset, selectedBomVersionId, ' ~ ', 'ALL', 'ALL');
      // 맵에 편입된 실 협력사(UUID)별 general review 조회 — supplier_id → 상세 번들.
      const uniqIds = [...new Set(fullRows.filter(r => isUuid(r.supplier_id)).map(r => r.supplier_id))];
      const bundles = await Promise.all(
        uniqIds.map(async id => {
          const [detail, contactsRes, factoriesRes, risk] = await Promise.all([
            getSupplierDetail(id).catch(() => null),
            getSupplierContacts(id).catch(() => null),
            getSupplierFactories(id).catch(() => null),
            getSupplierRiskProfile(id).catch(() => null),
          ]);
          return [id, { detail, contacts: contactsRes?.contacts ?? [], factories: factoriesRes?.factories ?? [], risk }] as const;
        }),
      );
      await writeCustomerWorkbook(fullRows, new Map(bundles));
    } finally {
      setCustomerDownloading(false);
    }
  }

  async function writeCustomerWorkbook(
    rows: TraceRow[],
    bySupplier: Map<string, {
      detail: Awaited<ReturnType<typeof getSupplierDetail>> | null;
      contacts: Awaited<ReturnType<typeof getSupplierContacts>>['contacts'];
      factories: Awaited<ReturnType<typeof getSupplierFactories>>['factories'];
      risk: Awaited<ReturnType<typeof getSupplierRiskProfile>> | null;
    }>,
  ) {
    const thin = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('공급망 제출');
    ws.columns = CUSTOMER_WIDTHS.map(w => ({ width: w }));

    // 상단 제품 정보 헤더 블록.
    ([
      ['제품', selectedProduct?.product_name ?? '-'],
      ['제품 코드', selectedProduct?.product_code ?? '-'],
      ['고객사', customerName],
      ['BOM 버전', selectedBomVersion?.version_number ?? '-'],
      ['단위기간', (periodFrom || periodTo) ? `${periodFrom || '…'} ~ ${periodTo || '…'}` : '전체'],
      ['생성일', stamp],
    ] as [string, string][]).forEach(([k, v]) => {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = { bold: true, color: { argb: 'FF14532D' } };
    });
    ws.addRow([]);

    // 표 헤더.
    const headerRow = ws.addRow(CUSTOMER_HEADERS);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    });
    const headerRowNum = headerRow.number;
    const dataFrom = ws.rowCount + 1;

    // 맵 행 + 협력사 general review 병합(같은 협력사 행마다 상세 반복).
    rows.forEach(row => {
      const b = bySupplier.get(row.supplier_id);
      const dt = b?.detail as unknown as Record<string, unknown> | null;
      const cm = (dt?.coreMinerals ?? {}) as Record<string, number | undefined>;
      const md = (dt?.manufacturerDetail ?? {}) as Record<string, unknown>;
      const pic = b?.contacts.find(c => c.isPrimary) ?? b?.contacts[0];
      const sr = b?.risk?.selfReportedRiskLevel;
      const factoryStr = (b?.factories ?? [])
        .filter(f => f.isActive !== false)
        .map(f => `${f.factoryName ?? '-'}(${f.country ?? '-'}·${f.supplyRatioPercent != null ? `${f.supplyRatioPercent}%` : '-'}·${f.factoryManagerName ?? '-'})`)
        .join(' / ');
      ws.addRow([
        // ── 맵 정보 ──
        row.tier, row.part_name, row.material_or_mineral, row.supplier_name,
        row.factory_name, row.country, row.supply_period, row.supply_ratio, statusMeta[row.risk_status].label,
        // ── 협력사 general review ──
        (dt?.companyNameEn as string) ?? '-',
        (dt?.businessRegNo as string) ?? '-',
        (dt?.country as string) ?? '-',
        (dt?.providerType as string) ?? '-',
        (dt?.smelterType as string) ?? '-',
        [cm.Li, cm.Co, cm.Ni].map(v => (v != null ? v : '-')).join(' / '),
        pic?.name ?? '-',
        pic?.role ?? '-',
        pic?.email ?? '-',
        pic?.mobile ?? pic?.phone ?? '-',
        factoryStr || '-',
        md.carbonIntensity != null ? (md.carbonIntensity as number) : '-',
        (md.energySource as string) ?? '-',
        sr && sr !== 'unknown' ? sr : '-',
        (dt?.businessRegDocUrl as string) ? '있음' : '없음',
        (dt?.environmentalReportUrl as string) ? '있음' : '없음',
      ]);
    });

    for (let i = dataFrom; i <= ws.rowCount; i++) {
      ws.getRow(i).eachCell(cell => {
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        cell.alignment = { vertical: 'middle' };
      });
    }
    ws.getColumn(RATIO_COL).numFmt = '0"%"';
    ws.views = [{ state: 'frozen', ySplit: headerRowNum }];
    ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum, column: CUSTOMER_HEADERS.length } };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `고객사제출_${code}_${stamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadExcel() {
    // 현재 화면(필터 적용) 기준 .xlsx.
    await writeXlsx(`공급망_추적_${code}_${stamp}.xlsx`, '공급망 추적', getExportRows(traceRows, periodLabel));
  }

  function downloadCsv() {
    const rows = [exportHeaders, ...getExportRows(traceRows, periodLabel)];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `공급망_추적_${code}_${stamp}.csv`;
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
    // 레거시 경로 — 허브에서는 onConnectClick(초대 메일 팝업)로 처리된다.
    setShowConnectConfirm(false);
  }

  return (
    <div className="min-h-screen bg-white p-6 text-ink-100">
      {!embedded && (
        <header className="mb-5">
          <h1 className="text-2xl font-black tracking-tight text-ink-100">{formationMode ? '공급망 맵 형성하기' : '공급망 맵'}</h1>
          <p className="mt-2 text-sm font-medium text-ink-500">
            {formationMode
              ? 'M-BOM 구조를 먼저 펼쳐 보고, 공급망 연결 전 단계의 맵 형성 상태를 확인하세요.'
              : '제품에서 원자재까지 공급망 구조와 리스크 현황을 한눈에 확인하세요.'}
          </p>
        </header>
      )}

      {/* 맵 화면 필터 바 — 허브(embedded)에선 숨긴다. 기준은 STEP1 필터 모달에서 고르고 '맵 기준·고정' 바로 표출된다.
          형성(formationMode)/단독 페이지에선 그대로 노출한다. */}
      {!embedded && (
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="고객사">
            <select value={selectedProduct?.customer_name ?? ''} onChange={event => handleCustomerChange(event.target.value)} className="h-11 min-w-[180px] rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-100 shadow-sm outline-none focus:border-ok-border">
              {customerOptions.length === 0 && <option value="">-</option>}
              {customerOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="제품">
            <select value={selectedProductId} onChange={event => handleProductChange(event.target.value)} className="h-11 min-w-[210px] rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-100 shadow-sm outline-none focus:border-ok-border">
              {productOptions.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </FilterSelect>
          <FilterSelect label="단위기간">
            <div className="flex h-11 min-w-[300px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm focus-within:border-ok-border">
              <input
                type="date"
                value={periodFrom}
                max={periodTo || undefined}
                onChange={event => handlePeriodFromChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                aria-label="단위기간 시작일"
              />
              <span className="text-xs font-bold text-slate-400">~</span>
              <input
                type="date"
                value={periodTo}
                min={periodFrom || undefined}
                onChange={event => handlePeriodToChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                aria-label="단위기간 종료일"
              />
            </div>
          </FilterSelect>
          <FilterSelect label="BOM">
            <select
              value={selectedBomVersionId}
              onChange={event => setSelectedBomVersionId(event.target.value)}
              disabled={bomOptions.length === 0}
              className="h-11 min-w-[160px] rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-ok-border disabled:opacity-50"
            >
              {bomOptions.length === 0 && <option value="">해당 단위기간에 편입된 BOM 없음</option>}
              {bomOptions.map(version => (
                <option key={version.bom_version_id} value={version.bom_version_id}>
                  {version.version_number}
                </option>
              ))}
            </select>
          </FilterSelect>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-400 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            필터 초기화
          </button>
        </div>
        <div className="flex items-center gap-2">
          {formationMode && (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-ok-border bg-ok-bg px-4 text-sm font-bold text-ok-text shadow-sm hover:bg-ok-bg"
            >
              <Plus className="h-4 w-4" />
              맵 형성하기
            </button>
          )}
        </div>
      </section>
      )}

      {generatedAt && (
        <div className="mb-4 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-xs font-semibold text-ok-text">
          {selectedProduct?.product_name} / {selectedBomVersion?.version_number} 기준으로 갱신되었습니다.
          <span className="ml-2 font-medium text-ok-text">{generatedAt}</span>
        </div>
      )}

      {!hasSelection && (
        <section className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
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
          <section id="supply-node-detail" className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] scroll-mt-4">
            <div className="flex flex-col">
              <div className="border-b border-slate-200 p-4">
                <SupplyMapTree
                  root={explorerTree}
                  selectedNodeKey={selectedNodeKey}
                  collapsedNodeKeys={collapsedNodeKeys}
                  onSelect={setSelectedNodeKey}
                  onToggle={toggleNode}
                  formationMode={formationMode}
                  highlightSupplierIds={highlightSupplierIds}
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
            </div>
          </section>
        </>
      )}

      {showConnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4">
          <div className="w-full max-w-[360px] rounded-sm border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
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
                className="h-10 rounded-md bg-brand text-sm font-semibold text-white hover:bg-brand-hover"
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
              <h2 className="text-base font-bold text-ink-100">협력사별 진행 사항 확인</h2>
              <p className="mt-0.5 text-xs text-ink-500">이 공급망 맵에 편입된 협력사·품목별 공급 정보와 진행 단계입니다. 행을 누르면 해당 협력사 상세(general review)로 이동합니다.</p>
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
                <button type="button" onClick={downloadCustomerExcel} disabled={customerDownloading} className="inline-flex items-center gap-1.5 rounded-xs border border-ok-border bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {customerDownloading ? '생성 중…' : '고객사 데이터 다운로드'}
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-800/30">
                  {['Tier', '품목/부품', '원재료/광물', '공급사', '사업장', '국가', '공급기간', '공급비율', '규제/리스크 상태', '진행 단계'].map(header => (
                    <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-ink-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/40">
                {traceRows.map(row => {
                  const progress = formationMode ? null : progressBySupplier?.[row.supplier_id];
                  return (
                  <tr
                    key={row.node_key}
                    className={`cursor-pointer hover:bg-ink-800/30 ${selectedNodeKey === row.node_key ? 'bg-accent-50/60' : ''}`}
                    onClick={() => (onRowClick ? onRowClick(row) : setSelectedNodeKey(row.node_key))}
                    title={onRowClick && !formationMode ? `${row.supplier_name} 상세 보기` : undefined}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-ink-400">{row.tier}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-100">
                      {row.part_name}
                      {row.function_purpose && (
                        <span className="mt-0.5 block text-xs font-normal text-ink-500" title={row.function_purpose}>
                          {row.function_purpose}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{row.material_or_mineral}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-300">{formationMode ? '-' : row.supplier_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.factory_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.country}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formationMode ? '-' : row.supply_period}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-ink-300">{formationMode ? '-' : `${row.supply_ratio}%`}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formationMode ? <span className="text-sm font-medium text-ink-400">-</span> : <StatusBadge status={row.risk_status} />}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {progress
                        ? <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${progressToneCls[progress.tone]}`}>{progress.label}</span>
                        : <span className="text-sm font-medium text-ink-400">-</span>}
                    </td>
                  </tr>
                  );
                })}
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
  highlightSupplierIds,
}: {
  root: ExplorerNode;
  selectedNodeKey: string;
  collapsedNodeKeys: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  formationMode?: boolean;
  highlightSupplierIds?: Set<string>;
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
          highlightSupplierIds={highlightSupplierIds}
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
  highlightSupplierIds,
}: {
  node: ExplorerNode;
  selectedNodeKey: string;
  collapsedNodeKeys: Set<string>;
  onSelect: (key: string) => void;
  onToggle: (key: string) => void;
  formationMode?: boolean;
  highlightSupplierIds?: Set<string>;
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
            className="pointer-events-none absolute top-0 h-full w-px bg-ok-solid"
            style={{ left: `${28 + (node.depth - 1) * 24}px` }}
          />
          <div
            className="pointer-events-none absolute top-[34px] h-px w-5 bg-ok-solid"
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
            ? 'bg-ok-bg'
            : rowTone === 'danger'
              ? 'bg-white hover:bg-alert-bg'
              : 'bg-white hover:bg-slate-50'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3" style={{ paddingLeft: `${node.depth * 24}px` }}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isProduct ? 'bg-ok-solid' : rowTone === 'danger' ? 'bg-alert-solid' : 'bg-ok-solid'}`} />
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${rowTone === 'danger' ? 'text-alert-text' : 'text-ink-400'}`}>
            <NodeIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className={`block truncate ${isProduct ? 'text-[15px] font-bold text-ink-100' : `text-sm font-medium ${rowTone === 'danger' ? 'text-alert-text' : 'text-ink-100'}`}`}>{node.label}</span>
            <span className="mt-1 block truncate text-xs font-medium text-slate-500">{node.meta}</span>
          </span>
        </div>
        <span className={`text-sm text-ink-400 ${isProduct ? 'font-semibold' : 'font-medium'}`}>{hideFormationValues ? '-' : node.tier}</span>
        <span className="text-sm font-medium text-ink-400">{hideFormationValues || isProduct ? '-' : node.providerType}</span>
        <span className={`flex min-w-0 items-center gap-1.5 truncate text-sm font-medium ${isProduct || hideFormationValues ? 'text-ink-400' : 'text-ink-100'}`}>
          <span className="truncate">{hideFormationValues || isProduct ? '-' : node.supplierName}</span>
        </span>
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
              highlightSupplierIds={highlightSupplierIds}
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

function StatCell({ label, value, suffix, tone = 'default' }: { label: string; value: string; suffix: string; tone?: 'default' | 'danger' | 'warning' | 'success' }) {
  const color = tone === 'danger' ? 'text-alert-text' : tone === 'warning' ? 'text-warn-text' : tone === 'success' ? 'text-ok-text' : 'text-ink-100';
  return (
    <div className="px-5 text-center first:pl-0 last:pr-0">
      <div className={`text-xs font-bold ${tone === 'danger' ? 'text-alert-text' : tone === 'warning' ? 'text-warn-text' : 'text-ink-400'}`}>{label}</div>
      <div className={`mt-2 text-3xl font-black ${color}`}>
        {value}
        <span className="ml-1 text-sm font-bold text-ink-400">{suffix}</span>
      </div>
    </div>
  );
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
