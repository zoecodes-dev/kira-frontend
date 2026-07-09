'use client';

// 공급망 맵과 M-BOM 형성 화면이 공유하는 원본 화면 컴포넌트입니다.
import { useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { SupplierGeneralReviewContent } from '@/app/suppliers/check-info/SupplierGeneralReview';
import { getSupplierDetail, getSupplierContacts, getSupplierFactories, getSupplierRiskProfile, getSupplyChainEvaluation, type SupplyChainEvaluation } from '@/lib/api';
import EvaluationReportCard, { evaluationTextLines } from '@/components/supply-chain/EvaluationReportCard';
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
  emptyDataset,
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

// 공급사 유형(provider_type enum) → 한글 라벨.
const PROVIDER_LABEL: Record<string, string> = {
  manufacturer: '제조사', recycler: '재활용', trader: '유통', miner: '광산', smelter: '제련소',
};
const providerKo = (t: string) => PROVIDER_LABEL[t] ?? t;

// 고객사 엑셀(대외 제출본) 전용 영문 라벨. statusMeta.label(화면 표시용, 한글)은 그대로 두고
// 여기서만 별도 매핑한다 — 화면 UI에 영향 없이 엑셀만 영어로 통일하기 위함.
const RISK_STATUS_LABEL_EN: Record<RiskStatus, string> = {
  verified: 'Verified',
  watch: 'Watch',
  high: 'High Risk',
  audit_required: 'Audit Required',
};
// PIC 직책은 대부분 이미 영문이고, 자유입력으로 들어온 한글 값 몇 종만 매핑한다.
//   매핑에 없는 값(신규 한글 직책 등)은 원문 그대로 통과시킨다 — 무리하게 기계번역하지 않음.
const PIC_TITLE_EN: Record<string, string> = {
  '구매 담당자': 'Purchasing Officer',
  'ESG 담당자': 'ESG Officer',
};

export function SupplyChainMapPageContent({
  formationMode = false,
  dataset = emptyDataset,
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
  focusSupplierId,
  maxVisibleTier = 1,
  visibleSupplierIds,
  evaluationReport,
}: {
  formationMode?: boolean;
  // 허브 안에 임베드될 때 true — 중복 헤더와 별도 "맵 형성하기" 링크를 숨긴다.
  embedded?: boolean;
  // 공급망 목록에서 넘어온 초기 선택 제품(선택). 제품 목록 로드 후 이 제품을 우선 선택한다.
  initialProductId?: string;
  // 공급망 목록에서 넘어온 초기 BOM 버전. 해당 버전을 드롭다운에서 우선 선택한다.
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
  // 알림 딥링크 진입 시 포커스할 협력사 id(선택). 맵/표 로드 후 해당 행으로 스크롤·하이라이트하고
  // (실 협력사면) onRowClick으로 상세 모달까지 연다. 한 번만 적용된다.
  focusSupplierId?: string;
  // 노출할 최대 차수. 안전 기본값 = 1(Tier0·Tier1만 노출) — Pool 확정 전엔 하위 차수를
  // 아직 모르는 상태라 숨긴다. 허브가 Pool 확정 후 undefined(무제한)로 넘긴다.
  maxVisibleTier?: number;
  // [FIX] STEP2 Pool에서 체크 안 한 1차 후보(형제)가 트리에 그대로 섞여 나오던 문제.
  //   허브가 pool에서 도달 가능한 협력사 id만 담아 넘긴다. 미전달(undefined)이면 필터 없음
  //   (completed 맵 등 — 기존 동작 유지).
  visibleSupplierIds?: Set<string>;
  // 공급망 맵 평가 리포트(종합 판정 문구). 허브(embedded)가 조회해 넘긴다. 단독 사용 시엔
  //   이 컴포넌트가 자체 조회한다(아래 selfEvaluation). 카드 표시 + 엑셀/CSV 문구에 쓰인다.
  evaluationReport?: SupplyChainEvaluation | null;
}) {
  // 허브가 고른 제품(initialProductId)이 이미 로드된 데이터셋에 있으면 그걸로 시작한다.
  //   (허브는 products 전체가 로드된 뒤 이 컴포넌트를 마운트하므로 products[0]로 초기화하면
  //    고른 제품이 아닌 첫 제품을 보게 되고, 그 제품 BOM은 미로드라 'BOM 비어있음'으로 뜬다.)
  const preferredInitialProductId =
    (initialProductId && dataset.products.some(p => p.product_id === initialProductId)
      ? initialProductId
      : dataset.products[0]?.product_id) ?? '';
  const [selectedProductId, setSelectedProductId] = useState(preferredInitialProductId);
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
  const [selectedNodeKey, setSelectedNodeKey] = useState(preferredInitialProductId ? `product:${preferredInitialProductId}` : '');
  const [collapsedNodeKeys, setCollapsedNodeKeys] = useState<Set<string>>(() => new Set());
  const [generatedAt, setGeneratedAt] = useState('');
  const [showConnectConfirm, setShowConnectConfirm] = useState(false);
  const [formationGenerated, setFormationGenerated] = useState(!formationMode);
  const [customerDownloading, setCustomerDownloading] = useState(false);  // 고객사 데이터(하이브리드 xlsx) 생성중
  // onRowClick 미전달(허브 없이 이 화면 단독 사용, 예: 기본 export 페이지) 시 표 행 클릭에 대한 폴백 —
  //   실 협력사(UUID)면 이 화면 안에서 바로 general review 팝업을 띄운다(SupplyChainHub의 openSupplierReview와 동일 패턴).
  const [reviewSupplier, setReviewSupplier] = useState<{ id: string; name: string } | null>(null);
  // 단독 사용(허브 밖)일 때만 평가 리포트를 자체 조회. 허브 임베드면 evaluationReport prop을 그대로 쓴다.
  const [selfEvaluation, setSelfEvaluation] = useState<SupplyChainEvaluation | null>(null);

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
  // maxVisibleTier로 점진 노출 — Pool 확정 전(기본 1)엔 Tier0·1까지만, 확정 후엔 허브가 큰 값을 넘겨 전체 노출.
  const traceRows = useMemo(() => {
    const rows = selectedBomVersion ? buildTraceRows(dataset, selectedBomVersionId, ' ~ ', selectedFactoryId, 'ALL') : [];
    return rows.filter(row => {
      const tierNum = parseInt(String(row.tier).replace(/[^0-9]/g, ''), 10);
      const tierOk = Number.isNaN(tierNum) || tierNum <= maxVisibleTier;
      // tierNum이 0(원청) 또는 파싱 불가(제품 행)면 Pool 필터 대상에서 제외 — 항상 노출.
      const poolOk = !visibleSupplierIds || Number.isNaN(tierNum) || tierNum <= 0 || visibleSupplierIds.has(row.supplier_id);
      return tierOk && poolOk;
    });
  }, [dataset, selectedBomVersion, selectedBomVersionId, selectedFactoryId, maxVisibleTier, visibleSupplierIds]);

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

  // 허브가 고른 제품(initialProductId)에 내부 선택을 맞춘다 — 현재 선택이 유효해도 전환한다.
  //   (예전엔 selectedProductId 가 '무효'일 때만 전환해, 허브가 products 전체를 먼저 로드해 두면
  //    products[0]로 초기화된 채 고른 제품으로 넘어가지 않아 트리가 비었다.)
  //   전환은 setState 로만 — onProductChange(허브 재로드·Pool 리셋)를 다시 부르면 안 되므로.
  useEffect(() => {
    if (dataset.products.length === 0) return;
    const hasInitial = initialProductId && dataset.products.some(p => p.product_id === initialProductId);
    if (hasInitial && initialProductId !== selectedProductId) {
      setSelectedProductId(initialProductId!);
      setSelectedNodeKey(`product:${initialProductId}`);
      return;
    }
    // initialProductId 가 없거나 이미 맞으면, 현재 선택이 무효일 때만 첫 제품으로 폴백.
    if (!dataset.products.some(p => p.product_id === selectedProductId)) {
      handleProductChange(dataset.products[0].product_id);
    }
    // dataset.products / initialProductId 변화에 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.products, initialProductId]);

  // 선택 제품의 BOM이 도착하면 BOM 버전을 선택.
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

  // 단독 사용(허브 밖)일 때 평가 리포트 자체 조회 — 선택 제품×BOM 기준. 허브 임베드면 prop을 쓰므로 스킵.
  useEffect(() => {
    if (evaluationReport !== undefined) return;               // 허브가 넘겨준 값 사용
    if (!selectedProductId || !isUuid(selectedProductId)) { setSelfEvaluation(null); return; }
    let cancelled = false;
    getSupplyChainEvaluation(selectedProductId, selectedBomVersionId || undefined)
      .then(r => { if (!cancelled) setSelfEvaluation(r); })
      .catch(() => { if (!cancelled) setSelfEvaluation(null); });
    return () => { cancelled = true; };
  }, [evaluationReport, selectedProductId, selectedBomVersionId]);

  // 표시/엑셀에 쓸 평가 리포트 — 허브 임베드면 prop, 단독이면 자체 조회분.
  const evaluation = evaluationReport !== undefined ? evaluationReport : selfEvaluation;

  // 알림 딥링크(focusSupplierId)로 진입 시: 표가 그 협력사 행을 렌더한 순간
  //   ① 행 하이라이트 ② 그 행으로 스크롤 ③ (실 협력사면) 상세 모달 오픈.
  // 제품·BOM 자동 선택 → traceRows 생성이 비동기라, traceRows 변화에 반응하고 focusSupplierId당 1회만 적용.
  const supplierRowsRef = useRef<HTMLTableSectionElement>(null);
  const appliedFocusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!focusSupplierId || appliedFocusRef.current === focusSupplierId) return;
    const row = traceRows.find(r => r.supplier_id === focusSupplierId);
    if (!row) return; // 아직 미로드거나 현재 노출 차수(maxVisibleTier) 밖 — 다음 렌더에서 재시도
    appliedFocusRef.current = focusSupplierId;
    setSelectedNodeKey(row.node_key); // 행 하이라이트(bg-accent-50/60)
    // 커밋·페인트 후 스크롤 (행은 이 시점 이미 DOM에 존재).
    requestAnimationFrame(() => {
      const rows = supplierRowsRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-supplier-id]');
      const el = rows && Array.from(rows).find(r => r.dataset.supplierId === focusSupplierId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // 허브에 상세 모달을 위임(openSupplierReview) — 실/데모 id 모두 처리된다.
    onRowClick?.(row);
  }, [focusSupplierId, traceRows, onRowClick]);

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
  //   평가 리포트(종합 판정 문구)가 있으면 표 위에 문구 블록을 먼저 적는다.
  async function writeXlsx(filename: string, sheetName: string, dataRows: (string | number)[][]) {
    const thin = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    ws.columns = exportHeaders.map((_, i) => ({ width: COL_WIDTHS[i] }));

    // 평가 리포트 문구 블록 — 표 헤더 위에.
    const introLines = evaluation?.available ? evaluationTextLines(evaluation) : [];
    introLines.forEach((line, i) => {
      const r = ws.addRow([line]);
      r.getCell(1).font = { bold: i === 0, color: { argb: 'FF14532D' }, size: i === 0 ? 12 : 11 };
    });
    if (introLines.length) ws.addRow([]);

    const headerRow = ws.addRow(exportHeaders);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    });
    const headerRowNum = headerRow.number;
    const dataFrom = ws.rowCount + 1;

    dataRows.forEach(r => ws.addRow(r));
    for (let i = dataFrom; i <= ws.rowCount; i++) {
      ws.getRow(i).eachCell(cell => {
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        cell.alignment = { vertical: 'middle' };
      });
    }
    ws.getColumn(12).numFmt = '0"%"'; // 공급비율(%) — PO 번호 제거로 한 칸 당겨짐
    ws.views = [{ state: 'frozen', ySplit: headerRowNum }];
    ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum, column: exportHeaders.length } };

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
  // 대외 제출본(고객사 전달용)이라 전부 영어로 통일한다. 실제 영문 필드가 있으면 그걸 쓰고
  // (companyNameEn/factoryNameEn/contact.nameEn), 없는 값(직책 등 일부 한글 자유입력)은
  // 아래 *_EN 매핑으로 변환한다. 담당자 성명(factoryManagerName)은 영문 필드가 아예 없어
  // 원문 그대로 둔다(고유명사라 임의 번역이 오히려 오해를 부를 수 있음).
  const CUSTOMER_HEADERS = [
    'Tier', 'Part/Component', 'Material/Mineral', 'Supplier', 'Site', 'Country of Origin', 'Supply Period', 'Risk Status',
    'HQ Country', 'Type', 'Smelter Type', 'Core Minerals (%)',
    'PIC Name', 'PIC Title', 'PIC Email', 'PIC Phone',
    'Factory Country', 'Factory Ratio (%)', 'Factory Manager',
    'Carbon Intensity', 'Energy Source', 'Self-Assessed Risk',
  ];
  const CUSTOMER_WIDTHS = [
    8, 22, 16, 22, 16, 10, 20, 12,
    10, 12, 12, 18,
    14, 12, 24, 16,
    10, 10, 14,
    12, 14, 12,
  ];
  const FACTORY_RATIO_COL = 18; // Factory Ratio (%) 열 번호 — 공장별로 행이 나뉘므로 셀당 값 하나뿐이라 숫자 서식 적용 가능

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
    const ws = wb.addWorksheet('Supply Chain Submission');
    ws.columns = CUSTOMER_WIDTHS.map(w => ({ width: w }));

    // 상단 제품 정보 헤더 블록.
    ([
      ['Product', selectedProduct?.product_name ?? '-'],
      ['Product Code', selectedProduct?.product_code ?? '-'],
      ['Customer', customerName],
      ['BOM Version', selectedBomVersion?.version_number ?? '-'],
      ['Period', (periodFrom || periodTo) ? `${periodFrom || '…'} ~ ${periodTo || '…'}` : 'All'],
      ['Generated At', stamp],
    ] as [string, string][]).forEach(([k, v]) => {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = { bold: true, color: { argb: 'FF14532D' } };
    });

    // 평가 리포트 문구 블록(있으면) — 제품 정보 아래, 표 위에.
    const introLines = evaluation?.available ? evaluationTextLines(evaluation) : [];
    if (introLines.length) {
      ws.addRow([]);
      introLines.forEach((line, i) => {
        const r = ws.addRow([line]);
        r.getCell(1).font = { bold: i === 0, color: { argb: 'FF14532D' } };
      });
    }
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
      // 공장별 원산지·비율·담당자 — 사업장(row.factory_name, 이 맵 행이 지정한 특정 공장)과 달리
      // 협력사가 등록한 전체 공장 목록(general review)이다. 공장이 여러 곳이면 그만큼 행을 나눠 각각 찍는다.
      const activeFactories = (b?.factories ?? []).filter(f => f.isActive !== false);
      const factoryList = activeFactories.length > 0 ? activeFactories : [null];
      factoryList.forEach(f => {
        ws.addRow([
          // ── 맵 정보 ──
          // 공급사/사업장명은 영문 필드(companyNameEn/factoryNameEn)를 우선한다 — 대외 제출본은
          // 전부 영어로 통일. 사업장명은 f(이 행이 실제로 다루는 공장)을 우선한다 — row.factory_name
          // (맵 대표 공장) 고정값을 그대로 쓰면 공장이 여러 곳인 협력사는 모든 행에 같은 사업장명이
          // 찍히고 비율·담당자만 바뀌어 보여서, 실제로는 다른 공장인데 같은 곳처럼 오인된다.
          row.tier, row.part_name, row.material_or_mineral, (dt?.companyNameEn as string) ?? row.supplier_name,
          f?.factoryNameEn ?? f?.factoryName ?? row.factory_name, row.country, row.supply_period, RISK_STATUS_LABEL_EN[row.risk_status],
          // ── 협력사 general review ──
          (dt?.country as string) ?? '-',
          (dt?.providerType as string) ?? '-',
          (dt?.smelterType as string) ?? '-',
          // 있는 광물 키만 직렬화(흑연 등 포함) — 예: "Li 7.2 / Ni 80 / graphite_natural 88"
          Object.entries(cm).filter(([k, v]) => k !== 'hazardous_substances' && v != null)
            .map(([k, v]) => `${k} ${v}`).join(' / ') || '-',
          pic?.nameEn ?? pic?.name ?? '-',
          (pic?.role ? (PIC_TITLE_EN[pic.role] ?? pic.role) : '-'),
          pic?.email ?? '-',
          pic?.mobile ?? pic?.phone ?? '-',
          f?.country ?? '-',
          f?.supplyRatioPercent != null ? f.supplyRatioPercent : '-',
          // 담당자 성명은 영문 필드가 없는 고유명사라 원문 그대로 둔다(임의 로마자 표기는 오히려 혼선).
          f?.factoryManagerName ?? '-',
          md.carbonIntensity != null ? (md.carbonIntensity as number) : '-',
          (md.energySource as string) ?? '-',
          sr && sr !== 'unknown' ? sr : '-',
        ]);
      });
    });

    for (let i = dataFrom; i <= ws.rowCount; i++) {
      ws.getRow(i).eachCell(cell => {
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        cell.alignment = { vertical: 'middle' };
      });
    }
    ws.getColumn(FACTORY_RATIO_COL).numFmt = '0"%"';
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
    // 평가 리포트 문구(있으면)를 상단에 먼저, 그다음 빈 줄, 표 헤더/데이터.
    const introRows = (evaluation?.available ? evaluationTextLines(evaluation) : []).map(l => [l]);
    const rows = [...introRows, ...(introRows.length ? [[]] : []), exportHeaders, ...getExportRows(traceRows, periodLabel)];
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
              : '제품이 동기화되면 표시됩니다.'}
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

      {showConnectConfirm && invitationContext && (
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

      {/* 공급망 맵 평가 리포트(종합 판정 문구) — 표/엑셀과 같은 화면에 노출.
          임베드(허브 안)일 땐 허브가 이미 상단에 같은 카드를 보여주므로 중복 방지로 건너뛴다. */}
      {!embedded && !formationMode && evaluation?.available && (
        <EvaluationReportCard report={evaluation} className="mt-4" />
      )}

      {formationGenerated && hasSelection && (
        <section id="supplier-progress-section" className="mt-4 overflow-hidden rounded-sm border border-ink-700 bg-white shadow-control">
          <div className="flex items-start justify-between gap-4 border-b border-ink-700 bg-ink-800/40 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-ink-100">협력사별 진행 사항 확인</h2>
              <p className="mt-0.5 text-xs text-ink-500">이 공급망 맵에 편입된 협력사 진행 단계 확인. 누르면 해당 협력사 상세로 이동.</p>
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
              <tbody ref={supplierRowsRef} className="divide-y divide-ink-700/40">
                {traceRows.map(row => {
                  const progress = formationMode ? null : progressBySupplier?.[row.supplier_id];
                  return (
                  <tr
                    key={row.node_key}
                    data-supplier-id={row.supplier_id}
                    className={`cursor-pointer hover:bg-ink-800/30 ${selectedNodeKey === row.node_key ? 'bg-accent-50/60' : ''}`}
                    onClick={() => {
                      if (onRowClick) { onRowClick(row); return; }
                      if (isUuid(row.supplier_id)) { setReviewSupplier({ id: row.supplier_id, name: row.supplier_name }); return; }
                      setSelectedNodeKey(row.node_key);
                    }}
                    title={!formationMode && (onRowClick || isUuid(row.supplier_id)) ? `${row.supplier_name} 상세 보기` : undefined}
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

      {/* onRowClick 미전달(허브 없이 단독 사용) 폴백 — 실 협력사 행 클릭 시 general review 팝업.
          닫으면 이 공급망 맵으로 바로 복귀. */}
      {reviewSupplier && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 md:p-8"
          onClick={() => setReviewSupplier(null)}
        >
          <div
            className="relative w-full max-w-5xl rounded-sm border border-ink-700 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-700 bg-white px-5 py-3">
              <div className="text-sm font-bold text-ink-100">협력사 상세 — {reviewSupplier.name}</div>
              <button
                type="button"
                onClick={() => setReviewSupplier(null)}
                aria-label="닫기"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <SupplierGeneralReviewContent supplierId={reviewSupplier.id} supplierName={reviewSupplier.name} embedded mode="prime" />
            </div>
          </div>
        </div>
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
      {/* 헤더와 행을 같은 가로 스크롤 컨테이너에 두어 가로 스크롤 시 함께 움직이고 컬럼이 어긋나지 않게 한다.
          헤더는 sticky top-0 으로 세로 스크롤에도 위에 고정. */}
      <div className="max-h-[70vh] overflow-auto">
        <div className="min-w-[890px]">
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(270px,1.35fr)_80px_120px_minmax(170px,.85fr)_90px_132px_54px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
            <span>제품/부품명</span>
            <span>Tier</span>
            <span>공급사 유형</span>
            <span>공급사 / 광산명</span>
            <span>공급 비율</span>
            <span>리스크 상태</span>
            <span>상세</span>
          </div>
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
    <div className="relative min-w-[890px]">
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
        className={`grid min-h-[72px] w-full grid-cols-[minmax(270px,1.35fr)_80px_120px_minmax(170px,.85fr)_90px_132px_54px] items-center border-b border-slate-100 px-4 text-left transition ${
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
        <span className="text-sm font-medium text-ink-400">{hideFormationValues || isProduct ? '-' : providerKo(node.providerType)}</span>
        <span className={`flex min-w-0 items-center gap-1.5 truncate text-sm font-medium ${isProduct || hideFormationValues ? 'text-ink-400' : 'text-ink-100'}`}>
          <span className="truncate">{hideFormationValues || isProduct ? '-' : node.supplierName}</span>
        </span>
        <span className="text-sm font-medium text-ink-100">{hideFormationValues ? '-' : node.supplyRatio}</span>
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
