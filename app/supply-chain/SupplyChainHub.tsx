'use client';

// 원청 공급망 맵 허브 — 8단계 흐름과 팝업을 오케스트레이션하는 컨테이너
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, Database, Loader2, Network, Pencil, X } from 'lucide-react';
import type { SelectedNode, SupplyChainDataset } from '@/lib/supply-chain-mock';
import { apiProductsToDataset, emptyDataset, mergeBomVersions, mergeProductBom, mergeSupplyChainMap, mockDataset, supplierDetailIdMap } from '@/lib/supply-chain-mock';
import { ApiError, confirmPool, createDataRequest, getSupplyChainGaps, getSupplyChainMaps, getToken, getProductBom, getProductBomVersions, getProductSupplyChainMap, getProducts, getValidationSummary, verifySupplier, type SupplierBrief, type SupplyChainGapsResult, type ValidationSummary } from '@/lib/api';
import { SupplyChainMapPageContent } from './SupplyChainMapPageContent';
import { SupplierGeneralReviewContent } from '@/app/suppliers/check-info/SupplierGeneralReview';
import PageHeader from '@/components/PageHeader';
import HubStepBar from '@/components/supply-chain/HubStepBar';
import ModalShell from '@/components/supply-chain/ModalShell';
import PoolModal from '@/components/supply-chain/PoolModal';
import ConnectedSuppliersModal from '@/components/supply-chain/ConnectedSuppliersModal';
import DataReviewModal from '@/components/supply-chain/DataReviewModal';
import DataRequestModal from '@/components/supply-chain/DataRequestModal';
import InviteMailModal from '@/components/supply-chain/InviteMailModal';
import MapManageModal from '@/components/supply-chain/MapManageModal';

export type HubModal = null | 'mapCreate' | 'pool' | 'suppliers' | 'dataReview' | 'dataRequest' | 'invite' | 'mapManage';

// 진입 게이트 통합 목록의 한 행 = (제품 × 고객사 × BOM 버전). 각 BOM은 생산기간(period)을 가진다.
// 단위기간은 이 BOM들과 분리된 광범위 시간창이며, 그 안에 여러 BOM이 편입된다.
interface EntryChainRow {
  productId: string;
  productName: string;
  productCode: string;
  customerName: string;
  bomVersionId?: string;
  versionNumber: string;
  periodFrom: string | null;
  periodTo: string | null;
}

// 날짜 문자열 → <input type="date"> 값(YYYY-MM-DD). null/빈값은 ''.
const toDateInput = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

// 주어진 행들의 생산기간을 모두 감싸는 최소~최대 경계(단위기간 기본값).
function periodBounds(rows: EntryChainRow[]): { from: string; to: string } {
  const froms = rows.map(r => toDateInput(r.periodFrom)).filter(Boolean);
  const tos = rows.map(r => toDateInput(r.periodTo)).filter(Boolean);
  return {
    from: froms.length ? froms.reduce((a, b) => (a < b ? a : b)) : '',
    to: tos.length ? tos.reduce((a, b) => (a > b ? a : b)) : '',
  };
}

// BOM(봄)의 생산기간이 선택 단위기간 [from,to]와 겹치면 그 기간에 편입된 것으로 본다.
// 기간 미입력(빈값)이면 제한 없음, BOM 날짜가 null이면 경계를 열어(±무한) 항상 포함.
function bomInPeriod(r: EntryChainRow, from: string, to: string): boolean {
  const bf = toDateInput(r.periodFrom);
  const bt = toDateInput(r.periodTo);
  if (from && bt && bt < from) return false; // BOM이 기간 시작 전에 끝남
  if (to && bf && bf > to) return false; //     BOM이 기간 종료 후에 시작함
  return true;
}

export default function SupplyChainHub() {
  // 공급망 목록에서 특정 공급망을 누르고 들어오면 productId(+bomVersionId)로 해당 Lot을 선택해 연다.
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId') ?? undefined;
  const initialBomVersionId = searchParams.get('bomVersionId') ?? undefined;
  const [pool, setPool] = useState<SupplierBrief[]>([]);
  // STEP 2 Pool 후보 — 선택된 제품의 §10.2a 맵 tier-1 협력사만. 제품 미선택이면 빈 배열.
  const [tier1Pool, setTier1Pool] = useState<SupplierBrief[]>([]);
  // 순차 게이팅용 — STEP 1(제품 선택) 완료 여부. URL productId로 진입 시 초기값.
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(initialProductId);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeModal, setActiveModal] = useState<HubModal>(null);
  // 맵 표에서 협력사 행 클릭 시 general review를 팝업으로 — 닫으면 맵으로 바로 복귀(페이지 이탈 X).
  const [reviewSupplier, setReviewSupplier] = useState<{ id: string; name: string } | null>(null);
  // STEP3에서 특정 협력사 '메일' 클릭 시 초대 메일 팝업을 그 협력사로 미리 선택해 연다.
  const [mailInitialSupplierId, setMailInitialSupplierId] = useState<string | null>(null);
  // 사용자가 수행한 액션 단계(STEP 4 검증). STEP 1·2는 데이터, STEP 3은 협력사 확인 완료로 판정.
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set());
  // STEP 3 — 연결 협력사별 '확인' 처리 집합 + 일괄 자료요청 진행중 플래그 + 활성 BOM 버전(verify 대상).
  const [confirmedSuppliers, setConfirmedSuppliers] = useState<Set<string>>(new Set());
  const [activeBomVersionId, setActiveBomVersionId] = useState<string | undefined>(undefined);
  // 맵 관리에서 시작한 자료요청은 협력사명을 직접 지정 (없으면 선택 노드 기준)
  const [requestLabel, setRequestLabel] = useState<string | null>(null);

  // 트리에 주입할 데이터셋 — 기본 빈 상태. 제품은 API, 공급망은 형성으로 채운다.
  const [dataset, setDataset] = useState<SupplyChainDataset>(emptyDataset);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  // 조회 상태 알림: 'auth'=토큰 없음/401·403, 'error'=그 외 실패, null=정상
  const [loadStatus, setLoadStatus] = useState<'auth' | 'error' | null>(null);
  // 규제 갭 — 제품 선택 시 fetch. null=미로드, nodes=[]이면 갭 없음.
  const [gaps, setGaps] = useState<SupplyChainGapsResult | null>(null);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);  // [R1] 데이터 완성도 rollup
  const [requestingGaps, setRequestingGaps] = useState(false);             // [R2] 미완성 일괄요청 진행중

  // 이 공급망 맵에 편입된 협력사 id 집합(parent/child, 현재 BOM 버전) — 스코프/대상 산출의 기준.
  const mapSupplierIds = useMemo(() => {
    const ids = new Set<string>();
    dataset.supply_chain_map
      .filter(r => !activeBomVersionId || r.bom_version_id === activeBomVersionId)
      .forEach(r => {
        if (r.child_supplier_id) ids.add(r.child_supplier_id);
        if (r.parent_supplier_id) ids.add(r.parent_supplier_id);
      });
    return ids;
  }, [dataset.supply_chain_map, activeBomVersionId]);

  // 이 공급망 맵에 편입된 협력사 전부(1~n차) — STEP3 확인/메일 대상. dataset.suppliers(맵 병합 시 전 차수 포함)에서 도출.
  const mapSuppliers = useMemo<SupplierBrief[]>(
    () =>
      dataset.suppliers
        .filter(s => mapSupplierIds.has(s.supplier_id))
        .map(s => ({
          supplierId: s.supplier_id,
          companyName: s.company_name,
          providerType: s.provider_type as SupplierBrief['providerType'],
          status: (s.status || 'active') as SupplierBrief['status'],
          riskLevel: (s.risk_level ?? 'low') as SupplierBrief['riskLevel'],
        }))
        .sort((a, b) => {
          const ta = dataset.suppliers.find(s => s.supplier_id === a.supplierId)?.tier ?? 99;
          const tb = dataset.suppliers.find(s => s.supplier_id === b.supplierId)?.tier ?? 99;
          return ta - tb || a.companyName.localeCompare(b.companyName);
        }),
    [dataset.suppliers, mapSupplierIds],
  );

  // STEP3 완료 = 이 맵에 편입된 협력사 '전부' 확인. (Pool=1차만이 아니라 전 차수 기준)
  const step3Done = mapSuppliers.length > 0 && mapSuppliers.every(p => confirmedSuppliers.has(p.supplierId));

  // 완료 공급망 = 전 차수 협력사 확인(step3Done) + 데이터 완성도 준비 완료(readyForFinal).
  //   요약이 없으면(데모 등) 완성도 게이트는 적용하지 않는다.
  const dataReady = summary ? summary.readyForFinal : true;
  const chainComplete = step3Done && dataReady;
  // 완료 공급망은 '수정'을 누르기 전까지 전체 완료·잠금 상태로 본다.
  const [editMode, setEditMode] = useState(false);
  const locked = chainComplete && !editMode;

  // 완료 단계 — STEP1(제품)·2(Pool)는 상태 기반, 3(전부 확인)·4(검증)는 완료 공급망이면 done.
  const completed = useMemo(() => {
    const s = new Set<number>(visitedSteps);
    if (selectedProductId) s.add(1);
    if (pool.length > 0) s.add(2);
    if (step3Done) s.add(3);          // STEP3(협력사 전부 확인) 완료 → 완료 색
    if (chainComplete) s.add(4);      // STEP5(최종 검증) 완료
    return s;
  }, [visitedSteps, selectedProductId, pool.length, step3Done, chainComplete]);
  const markVisited = (n: number) => setVisitedSteps(prev => (prev.has(n) ? prev : new Set(prev).add(n)));

  // STEP 3 — 협력사 확인 토글 / 전체 확인 / 자료 일괄 요청. 확인은 supply-chain/verify로 백엔드 영속.
  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
  const persistVerify = (id: string, verified: boolean) => {
    if (activeBomVersionId && isUuid(id)) {
      verifySupplier({ bomVersionId: activeBomVersionId, supplierId: id, verified }).catch(() => {});
    }
  };
  const toggleConfirm = (id: string) =>
    setConfirmedSuppliers(prev => {
      const n = new Set(prev);
      const willConfirm = !n.has(id);
      willConfirm ? n.add(id) : n.delete(id);
      persistVerify(id, willConfirm);
      return n;
    });
  const confirmAll = () => {
    // 이 맵에 편입된 협력사 전부 확인(전 차수). mapSuppliers는 아래에서 도출되지만 호출 시점엔 이미 초기화됨.
    setConfirmedSuppliers(new Set(mapSuppliers.map(p => p.supplierId)));
    mapSuppliers.forEach(p => persistVerify(p.supplierId, true));
  };
  // STEP4 최종 검증 결과 영속 — 환경성적서 통과=verified, 실패=unverified로 백엔드 반영.
  const onStep4Verified = (results: { supplierId: string; passed: boolean }[]) => {
    setConfirmedSuppliers(prev => {
      const n = new Set(prev);
      results.forEach(r => {
        if (r.passed) n.add(r.supplierId); else n.delete(r.supplierId);
        persistVerify(r.supplierId, r.passed);
      });
      return n;
    });
  };
  // ④ 진입 게이트 — 첫 진입 시 빈 상태에서 고객사 → 제품 → 단위기간 → BOM(봄)을 골라 맵을 연다.
  // URL 제품 진입·데모는 게이트 스킵.
  const [mapStarted, setMapStarted] = useState(Boolean(initialProductId));
  const [entryProductId, setEntryProductId] = useState(initialProductId ?? '');
  const [entryCustomer, setEntryCustomer] = useState('');
  const [entryBomVersionId, setEntryBomVersionId] = useState<string | undefined>(undefined);
  // 단위기간 — BOM(봄)과 분리된 광범위 시간창. 이 범위에 겹치는 BOM들만 봄 드롭다운에 뜬다.
  const [entryPeriodFrom, setEntryPeriodFrom] = useState('');
  const [entryPeriodTo, setEntryPeriodTo] = useState('');
  // 통합 목록 행 = (제품 × 고객사 × BOM 버전). 제품마다 BOM 버전을 조회해 구성.
  const [entryRows, setEntryRows] = useState<EntryChainRow[]>([]);
  const [entryRowsLoading, setEntryRowsLoading] = useState(false);

  // 진입 시 제품 목록 조회. 토큰 없음/401·403은 알림으로 표면화(조용한 빈 화면 방지).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProductsLoading(true);
      setLoadStatus(null);
      if (!getToken()) {
        // 토큰 자체가 없음 — 로그인 필요
        if (!cancelled) {
          setLoadStatus('auth');
          setProductsLoading(false);
        }
        return;
      }
      try {
        const apiProducts = await getProducts();
        if (!cancelled) setDataset({ ...emptyDataset, products: apiProductsToDataset(apiProducts) });
      } catch (e) {
        if (!cancelled) {
          setLoadStatus(e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'auth' : 'error');
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 제품 선택 시 규제 갭 + 데이터 완성도(요약/판정) 조회 — 협력사들이 자료를 채워갈수록 갱신.
  //   confirmedSuppliers(협력사 확인/자료제출 반영)가 바뀔 때도 재조회해 완성도를 최신화.
  useEffect(() => {
    if (!selectedProductId || isDemo) { setGaps(null); setSummary(null); return; }
    getSupplyChainGaps(selectedProductId).then(setGaps).catch(() => {});
    getValidationSummary(selectedProductId, activeBomVersionId).then(setSummary).catch(() => setSummary(null));
  }, [selectedProductId, activeBomVersionId, isDemo, confirmedSuppliers]);

  // 진입 게이트 통합 목록 — 제품마다 BOM 버전(단위기간 Lot)을 조회해 (제품×고객사×기간) 행으로 펼친다.
  // 게이트가 떠 있을 때만(맵 미시작·실데이터) 1회 구성.
  useEffect(() => {
    if (isDemo || mapStarted) return;
    const products = dataset.products;
    if (!products.length) return;
    let cancelled = false;
    (async () => {
      setEntryRowsLoading(true);
      const rows: EntryChainRow[] = [];
      for (const p of products) {
        let versions: Awaited<ReturnType<typeof getProductBomVersions>> = [];
        try {
          versions = await getProductBomVersions(p.product_id);
        } catch {
          // 구버전 백엔드 — 버전 없이 제품 1행만
        }
        if (versions.length) {
          for (const v of versions) {
            rows.push({
              productId: p.product_id,
              productName: p.product_name,
              productCode: p.product_code,
              customerName: p.customer_name,
              bomVersionId: v.bomVersionId,
              versionNumber: v.versionNumber,
              periodFrom: v.productionFrom ?? null,
              periodTo: v.productionTo ?? null,
            });
          }
        } else {
          rows.push({
            productId: p.product_id,
            productName: p.product_name,
            productCode: p.product_code,
            customerName: p.customer_name,
            bomVersionId: undefined,
            versionNumber: '',
            periodFrom: null,
            periodTo: null,
          });
        }
      }
      if (!cancelled) {
        // 고객사 → 제품 → 기간 순으로 정렬해 통합 목록을 읽기 쉽게.
        rows.sort(
          (a, b) =>
            a.customerName.localeCompare(b.customerName) ||
            a.productName.localeCompare(b.productName) ||
            (a.periodFrom ?? '').localeCompare(b.periodFrom ?? ''),
        );
        setEntryRows(rows);
        setEntryRowsLoading(false);
        // 기본 선택값 — 첫 행(고객사→제품→기간 정렬 기준). 이미 고른 값은 유지.
        const first = rows[0];
        const defProductId = entryProductId || first?.productId || '';
        setEntryCustomer(c => c || first?.customerName || '');
        setEntryProductId(p => p || first?.productId || '');
        // 단위기간 기본값 = 그 제품 BOM 전체를 감싸는 범위. 그 안 첫 BOM을 봄으로 선택.
        const prodRows = rows.filter(r => r.productId === defProductId);
        const b = periodBounds(prodRows);
        setEntryPeriodFrom(prev => prev || b.from);
        setEntryPeriodTo(prev => prev || b.to);
        const firstBom = prodRows.find(r => bomInPeriod(r, b.from, b.to));
        setEntryBomVersionId(bv => bv ?? firstBom?.bomVersionId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset.products, isDemo, mapStarted]);

  // 진입 게이트 3개 드롭다운 파생 목록 — 고객사 → (그 고객사) 제품 → (그 제품) 단위기간(Lot).
  const entryCustomers = Array.from(
    new Map(entryRows.filter(r => r.customerName).map(r => [r.customerName, r.customerName])).keys(),
  );
  const entryProducts = Array.from(
    new Map(
      entryRows
        .filter(r => !entryCustomer || r.customerName === entryCustomer)
        .map(r => [r.productId, r]),
    ).values(),
  );
  // 선택 제품의 모든 BOM 행 → 그중 단위기간에 겹치는 BOM만 봄 드롭다운 후보.
  const entryProductRows = entryRows.filter(r => r.productId === entryProductId);
  const entryBoms = entryProductRows.filter(r => bomInPeriod(r, entryPeriodFrom, entryPeriodTo));

  // 제품 확정 시 공통 — 단위기간을 그 제품 BOM 전체를 감싸는 범위로 리셋하고 첫 봄 선택.
  function applyProduct(productId: string) {
    setEntryProductId(productId);
    const prodRows = entryRows.filter(r => r.productId === productId);
    const b = periodBounds(prodRows);
    setEntryPeriodFrom(b.from);
    setEntryPeriodTo(b.to);
    const firstBom = prodRows.find(r => bomInPeriod(r, b.from, b.to));
    setEntryBomVersionId(firstBom?.bomVersionId);
  }
  // 고객사 변경 → 그 고객사의 첫 제품으로 리셋 + 그 제품 기준 단위기간/봄 재설정.
  function onEntryCustomerChange(name: string) {
    setEntryCustomer(name);
    const firstProd = entryRows.find(r => !name || r.customerName === name);
    applyProduct(firstProd?.productId ?? '');
  }
  // 제품 변경 → 그 제품의 고객사 자동 반영 + 단위기간/봄 재설정.
  function onEntryProductChange(productId: string) {
    const row = entryRows.find(r => r.productId === productId);
    if (row?.customerName) setEntryCustomer(row.customerName);
    applyProduct(productId);
  }
  // 단위기간 변경 → 선택된 봄이 새 범위 밖이면 범위 내 첫 봄으로 옮긴다.
  function onPeriodChange(from: string, to: string) {
    setEntryPeriodFrom(from);
    setEntryPeriodTo(to);
    const inRange = entryProductRows.filter(r => bomInPeriod(r, from, to));
    if (!inRange.some(r => r.bomVersionId === entryBomVersionId)) {
      setEntryBomVersionId(inRange[0]?.bomVersionId);
    }
  }

  // '맵 생성' → 선택한 제품·단위기간(Lot)으로 맵 생성/진입(페이지 전환).
  function startMapFromSelection() {
    if (!entryProductId) return;
    const versionId = entryBomVersionId ?? entryBoms[0]?.bomVersionId;
    setEntryBomVersionId(versionId);
    setMapStarted(true);
    handleProductChange(entryProductId, versionId);
  }

  // 제품 선택 시: BOM(버전·트리) + §10.2a 공급망 맵을 조회해 데이터셋에 병합.
  // 각 호출은 graceful — 미구현/미배포 백엔드면 해당 부분만 건너뛴다(데모 모드면 mock 유지).
  async function handleProductChange(productId: string, explicitVersionId?: string) {
    if (isDemo) return;

    // STEP 1 완료 표시. 제품이 바뀌면 이전 제품 기준 Pool 후보·확정 선택은 무효이므로 초기화.
    setSelectedProductId(productId);
    setTier1Pool([]);
    setPool([]);
    setConfirmedSuppliers(new Set());
    setEditMode(false); // 새 공급망 진입 — 완료면 다시 잠금 상태로.

    // 1) BOM 버전 목록(실 bomVersionId) — 없으면 트리 합성 버전으로 폴백
    let versions: Awaited<ReturnType<typeof getProductBomVersions>> = [];
    try {
      versions = await getProductBomVersions(productId);
    } catch {
      // 구버전 백엔드 — 합성 버전 사용
    }
    // 목록에서 특정 Lot으로 진입했으면(URL bomVersionId) 그 버전을 우선 사용 — 단, 이 제품의 버전일 때만.
    const preferredVersionId =
      initialBomVersionId && versions.some(v => v.bomVersionId === initialBomVersionId)
        ? initialBomVersionId
        : undefined;
    // 통합 목록에서 특정 Lot(단위기간)을 골라 진입하면 그 버전을 최우선으로 사용.
    const chosenVersionId =
      explicitVersionId && versions.some(v => v.bomVersionId === explicitVersionId) ? explicitVersionId : undefined;
    const activeVersionId =
      chosenVersionId ?? preferredVersionId ?? versions.find(v => v.isCurrent)?.bomVersionId ?? versions[0]?.bomVersionId;

    // 2) BOM 버전 목록(드롭다운)은 트리 조회 성공 여부와 무관하게 먼저 등록.
    //    백엔드 /bom 트리가 404("active BOM 없음")여도 /bom-versions는 버전을 주므로 BOM 정보는 떠야 한다.
    setDataset(ds => mergeBomVersions(ds, productId, versions));

    // 3) BOM 트리 → 평면(부품/항목). 트리가 없으면 버전만 유지.
    try {
      const bom = await getProductBom(productId, activeVersionId);
      setDataset(ds => mergeProductBom(ds, productId, bom, versions));
    } catch {
      // BOM 트리 없음/404 — 버전 목록은 위에서 이미 반영됨
    }

    // 4) §10.2a 공급망 맵(협력사·공장·비율). 미구현/빈 데이터면 건너뜀.
    if (activeVersionId) {
      try {
        const map = await getProductSupplyChainMap(productId, { bomVersionId: activeVersionId });
        setDataset(ds => mergeSupplyChainMap(ds, productId, activeVersionId, map));
        // STEP 2 Pool 후보 = 이 제품의 '1차 협력사'(OEM 바로 아래 단계) 협력사만 (전역 목록 금지).
        // 1차 정의: 차수 SSOT = supply_chain_map.hop_level(원청=0, 1차=1). 스키마 보장 축.
        //   hop_level 미배포(undefined) 백엔드면 tierLevel 최소 비-0으로 폴백.
        const hasHop = map.supplyChainMap.some(n => typeof n.hopLevel === 'number');
        let tier1Ids: Set<string>;
        if (hasHop) {
          tier1Ids = new Set(
            map.supplyChainMap.filter(n => n.hopLevel === 1).map(n => n.supplierId),
          );
        } else {
          const levels = map.supplyChainMap.map(n => n.tierLevel).filter((t): t is number => typeof t === 'number');
          const nonZero = levels.filter(t => t > 0);
          const firstTier = nonZero.length ? Math.min(...nonZero) : (levels.length ? Math.min(...levels) : null);
          tier1Ids = new Set(
            map.supplyChainMap.filter(n => n.tierLevel === firstTier).map(n => n.supplierId),
          );
        }
        const tier1List = map.suppliers
          .filter(s => tier1Ids.has(s.supplierId))
          .map(s => ({
            supplierId: s.supplierId,
            companyName: s.companyName,
            providerType: s.providerType,
            status: s.status as SupplierBrief['status'],
            riskLevel: s.riskLevel ?? 'low',
          }));
        setTier1Pool(tier1List);
        // 이미 검증된 협력사가 있는 기존 공급망만 Pool 자동 하이드레이션(STEP2 완료 표시).
        // 신규/building 공급망(전부 unverified)은 사용자가 직접 Pool 구성해야 함.
        const hasVerified = map.supplyChainMap.some(n => n.verificationStatus === 'verified');
        if (hasVerified) setPool(tier1List);
        // STEP3 verify 대상 BOM 버전 저장 + 백엔드 verification_status로 '확인' 상태 하이드레이션.
        setActiveBomVersionId(activeVersionId);
        setConfirmedSuppliers(new Set(
          map.supplyChainMap.filter(n => n.verificationStatus === 'verified').map(n => n.supplierId),
        ));
      } catch {
        // 공급망 맵 없음 — 협력사 빈 상태 유지
      }
    }
  }

  function loadDemo() {
    setIsDemo(true);
    setMapStarted(true); // 데모는 진입 게이트 건너뛰고 바로 맵 표시
    setDataset(mockDataset);
    setSelectedProductId(mockDataset.products[0]?.product_id);
    // 데모도 동일 규칙 — tier-1 협력사만 Pool 후보로.
    setTier1Pool(
      mockDataset.suppliers
        .filter(s => s.tier === 1)
        .map(s => ({
          supplierId: s.supplier_id,
          companyName: s.company_name,
          providerType: s.provider_type,
          status: s.status as SupplierBrief['status'],
          riskLevel: s.risk_level,
        })),
    );
  }

  // 선택 노드의 mock supplier_id → 실 supplierId 브리지 (매핑 없으면 undefined)
  const activeMockSupplierId = selectedNode
    ? selectedNode.type === 'product'
      ? selectedNode.rows[0]?.supplier_id
      : selectedNode.row.supplier_id
    : undefined;
  // mock 브리지에 매핑이 있으면 그걸, 없으면(실데이터 UUID) supplier_id 자체를 사용 → STEP4가 실 협력사로 조회.
  const activeSupplierId = activeMockSupplierId
    ? supplierDetailIdMap[activeMockSupplierId] ?? activeMockSupplierId
    : undefined;
  const activeNodeLabel = selectedNode
    ? selectedNode.type === 'product'
      ? selectedNode.product.product_name
      : selectedNode.row.part_name
    : '선택 노드';

  const close = () => setActiveModal(null);

  // [P1] 맵 생성 시 고른 기준(고객사·제품·BOM버전·단위기간) — 흐름상 이후 화면에서도 고정 표출.
  const ctxRow = entryRows.find(
    r => r.productId === entryProductId && (!entryBomVersionId || r.bomVersionId === entryBomVersionId),
  );
  const mapContext = mapStarted
    ? {
        customer: ctxRow?.customerName || entryCustomer || '—',
        product: ctxRow?.productName || '—',
        productCode: ctxRow?.productCode,
        bomVersion: ctxRow?.versionNumber || '—',
        periodFrom: entryPeriodFrom || ctxRow?.periodFrom || '',
        periodTo: entryPeriodTo || ctxRow?.periodTo || '',
      }
    : null;

  const scopedGapNodes = useMemo(
    () =>
      (gaps?.nodes ?? []).filter(
        n => !n.is_root_anchor && (mapSupplierIds.size === 0 || mapSupplierIds.has(n.supplier_id)),
      ),
    [gaps, mapSupplierIds],
  );

  // [R2] hop(차수)별 진행 구획 — 공급망은 원청→1차→…→n차로 edge가 연결되며 내려간다.
  //   depth(=hop)마다 칸을 하나씩 만들어, 지금 어느 차수까지 진행됐는지 한눈에 보이게 한다.
  //   각 칸: 그 차수 협력사 중 완비(미보유 0) 비율. 100%면 완료(초록), 일부면 진행(브랜드), 0이면 대기(회색).
  const depthStats = useMemo(() => {
    const byDepth = new Map<number, { depth: number; total: number; complete: number; confirmed: number; gaps: number }>();
    for (const n of scopedGapNodes) {
      const s = byDepth.get(n.depth) ?? { depth: n.depth, total: 0, complete: 0, confirmed: 0, gaps: 0 };
      s.total += 1;
      if (n.gap_count === 0) {
        s.complete += 1;
        if (confirmedSuppliers.has(n.supplier_id)) s.confirmed += 1;
      } else {
        s.gaps += n.gap_count;
      }
      byDepth.set(n.depth, s);
    }
    return [...byDepth.values()].sort((a, b) => a.depth - b.depth);
  }, [scopedGapNodes, confirmedSuppliers]);

  // 현재 진행 중인 차수 = 아직 완비되지 않은 가장 얕은 차수(위에서부터 채워 내려가므로).
  //   전 차수 완비면 가장 깊은 차수(도달한 최전선)를 '완료' 표시로 쓴다.
  const activeDepth = useMemo(() => {
    const pending = depthStats.find(s => s.complete < s.total);
    return pending ? pending.depth : (depthStats.length ? depthStats[depthStats.length - 1].depth : null);
  }, [depthStats]);

  // [R2] 데이터 완성도 요약 — '이 공급망 맵'(scopedGapNodes) 기준으로 집계한다.
  //   summary(getValidationSummary)는 제품+BOM 롤업이라 이 맵과 범위가 다를 수 있으므로, 맵 스코프로 다시 센다.
  const mapStats = useMemo(() => {
    const supplierCount = scopedGapNodes.length;
    const nodesWithGaps = scopedGapNodes.filter(n => n.gap_count > 0).length;
    const totalGapCount = scopedGapNodes.reduce((sum, n) => sum + n.gap_count, 0);
    return { supplierCount, nodesWithGaps, complete: supplierCount - nodesWithGaps, totalGapCount };
  }, [scopedGapNodes]);

  // 완성도(%) — 맵 협력사 중 미보유 없는 곳 비율. 맵 노드가 없으면(gaps 미로드 등) summary로 폴백.
  const completePct = mapStats.supplierCount > 0
    ? Math.round((mapStats.complete / mapStats.supplierCount) * 100)
    : (summary && summary.supplierCount > 0
        ? Math.round(((summary.supplierCount - summary.nodesWithGaps) / summary.supplierCount) * 100)
        : (summary ? 0 : null));

  // 맵 표(협력사별 진행 사항 확인)의 '진행 단계' 배지 — supplier_id → {label, tone}. gaps + 확인 상태 기준.
  const progressBySupplier = useMemo(() => {
    const m: Record<string, { label: string; tone: 'ok' | 'warn' | 'accent' }> = {};
    for (const n of scopedGapNodes) {
      const complete = n.gap_count === 0;
      const confirmed = confirmedSuppliers.has(n.supplier_id);
      m[n.supplier_id] = complete
        ? (confirmed ? { label: '승인', tone: 'ok' } : { label: '데이터 완비', tone: 'accent' })
        : { label: `미보유 ${n.gap_count}건`, tone: 'warn' };
    }
    return m;
  }, [scopedGapNodes, confirmedSuppliers]);

  // 맵 표 행 클릭 → 해당 협력사 general review를 팝업으로 표시(mock S-ID면 실 detail id로 브리지).
  //   페이지 이동 대신 모달이라 닫으면 곧바로 이 공급망 맵으로 복귀한다.
  function openSupplierReview(supplierId: string, name: string) {
    const realId = supplierDetailIdMap[supplierId] ?? supplierId;
    setReviewSupplier({ id: realId, name });
  }

  // [R2] 미완성(미보유 필드 보유) 협력사에 자료 일괄 요청 → 완성도 재조회.
  async function requestIncomplete() {
    if (!summary) return;
    setRequestingGaps(true);
    try {
      await Promise.all(
        summary.gapsBySupplier
          .filter(n => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(n.supplierId))
          // 이 공급망 맵에 편입된 협력사에만 요청(맵 스코프 밖 협력사 제외).
          .filter(n => mapSupplierIds.size === 0 || mapSupplierIds.has(n.supplierId))
          .map(n => createDataRequest({ targetSupplierId: n.supplierId, requestedDataType: 'general_info' }).catch(() => {})),
      );
      if (selectedProductId) {
        getValidationSummary(selectedProductId, activeBomVersionId).then(setSummary).catch(() => {});
      }
    } finally {
      setRequestingGaps(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-ink-100">
      <PageHeader
        title="공급망 맵 허브"
        description="고객사·제품·BOM버전·단위기간 기준으로 맵을 생성하고, 1차 협력사 확인·Pool 확정·자료 요청·초대·최종 검증까지 이어갑니다."
        tabs={[
          { label: '공급망 목록', href: '/supply-chain' },
          { label: '공급망 맵', href: '/supply-chain/map', active: true },
        ]}
      >
        <HubStepBar
          poolCount={pool.length}
          hasProduct={Boolean(selectedProductId)}
          completed={completed}
          locked={locked}
          step3Done={step3Done}
          readyForFinal={summary?.readyForFinal ?? false}
          completePct={completePct}
          onOpenPool={() => setActiveModal('pool')}
          onOpenSuppliers={() => setActiveModal('suppliers')}
          onOpenDataReview={() => setActiveModal('dataReview')}
          onOpenVerify={() => { markVisited(4); setActiveModal('mapManage'); }}
        />
      </PageHeader>

      {/* [P1] 맵 기준(고객사/제품/BOM/단위기간)은 별도 고정 바가 아니라 아래 맵 필터 칸(STEP2)에 표시된다.
          — 진입 게이트에서 고른 값이 initialProductId/BomVersionId/PeriodFrom·To로 필터 칸에 채워진다. */}

      {loadStatus === null && !productsLoading && dataset.products.length > 0 && mapStarted && !locked && (
        <FlowGuide
          hasProduct={Boolean(selectedProductId)}
          poolCount={pool.length}
          tier1Count={tier1Pool.length}
          hasSelection={Boolean(selectedNode)}
          onOpenPool={() => setActiveModal('pool')}
        />
      )}

      {/* 완료 공급망 — 전체 완료·잠금 상태. '수정'을 눌러야 단계 편집 가능. */}
      {loadStatus === null && !productsLoading && mapStarted && locked && (
        <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-ok-border bg-ok-bg px-4 py-3 text-ok-text">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">이 공급망은 완료되었습니다</p>
              <p className="mt-0.5 text-sm opacity-90">연결 협력사 {pool.length}개사 확인·검증 완료. 변경하려면 수정을 누르세요.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-ok-border bg-white px-3 py-1.5 text-sm font-bold text-ok-text hover:bg-ok-bg"
          >
            <Pencil className="h-4 w-4" />
            수정
          </button>
        </div>
      )}

      {/* [R2] 데이터 완성도 + 다음 단계(최종검증) 이동 게이트 — STEP3~4 반복 자료수집 구간 */}
      {mapContext && summary && !locked && (
        <div className="mx-6 mt-3 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-100">데이터 완성도</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  summary.readyForFinal ? 'border border-ok-border bg-ok-bg text-ok-text' : 'border border-warn-border bg-warn-bg text-warn-text'
                }`}>
                  {summary.readyForFinal
                    ? '최종 검증 준비 완료'
                    : activeDepth != null ? `${activeDepth}차 진행 중` : '입력 진행 중'}
                </span>
              </div>
              {depthStats.length > 0 ? (
                <div className="mt-2 flex items-center gap-3">
                  {/* hop(차수)별 구획 — edge가 한 단계 더 연결될 때마다 칸이 하나씩 늘어난다. */}
                  <div className="flex w-full max-w-md gap-1.5">
                    {depthStats.map(s => {
                      const pct = s.total > 0 ? Math.round((s.complete / s.total) * 100) : 0;
                      const done = pct === 100;
                      const isActive = s.depth === activeDepth && !summary.readyForFinal;
                      return (
                        <div
                          key={s.depth}
                          className="flex-1"
                          title={`${s.depth}차 · 완비 ${s.complete}/${s.total}곳${s.confirmed ? ` · 승인 ${s.confirmed}곳` : ''}${s.gaps ? ` · 미보유 ${s.gaps}건` : ''}`}
                        >
                          <div className={`flex items-center justify-between text-[10px] font-bold ${isActive ? 'text-brand' : 'text-slate-500'}`}>
                            <span>{s.depth}차{isActive ? ' ●' : ''}</span>
                            <span className="num-mono">{s.complete}/{s.total}</span>
                          </div>
                          <div className={`mt-1 h-2 overflow-hidden rounded-full bg-slate-100 ${isActive ? 'ring-1 ring-brand/40' : ''}`}>
                            <div
                              className={`h-full rounded-full transition-all ${done ? 'bg-ok-text' : s.complete > 0 ? 'bg-brand' : 'bg-slate-200'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <span className="num-mono text-sm font-bold text-ink-100">{completePct ?? 0}%</span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${completePct === 100 ? 'bg-ok-text' : 'bg-brand'}`} style={{ width: `${completePct ?? 0}%` }} />
                  </div>
                  <span className="num-mono text-sm font-bold text-ink-100">{completePct ?? 0}%</span>
                </div>
              )}
              <div className="mt-1.5 text-[11px] text-slate-500">
                협력사 {mapStats.supplierCount}곳 · 완비 {mapStats.complete}곳 · 미보유 {mapStats.totalGapCount}건 · 비율검증 {summary.ratioValid ? 'OK' : '불일치'}
                <span className="ml-1 text-slate-400">
                  — {activeDepth != null && !summary.readyForFinal
                    ? `현재 ${activeDepth}차 자료 수집 중, 하위(n차)가 제출하면 다음 칸이 채워집니다.`
                    : '협력사·하위(n차)가 자료를 제출하면 완성도가 채워집니다.'}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {!summary.readyForFinal && mapStats.nodesWithGaps > 0 && (
                <button
                  type="button"
                  onClick={requestIncomplete}
                  disabled={requestingGaps}
                  className="inline-flex items-center gap-1.5 rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-sm font-semibold text-warn-text hover:opacity-90 disabled:opacity-50"
                >
                  {requestingGaps ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  미완성 {mapStats.nodesWithGaps}개사 자료 일괄 요청
                </button>
              )}
              <button
                type="button"
                onClick={() => { markVisited(4); setActiveModal('mapManage'); }}
                disabled={!summary.readyForFinal}
                title={summary.readyForFinal ? '' : '모든 협력사 데이터가 채워지면 이동할 수 있어요'}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                최종 검증으로 이동
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {loadStatus === 'auth' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">로그인이 필요합니다</p>
            <p className="text-red-700/90">
              인증 토큰이 없거나 만료됐습니다(401/403). 다시 로그인한 뒤 새로고침하세요. 제품·BOM·협력사 데이터는 인증 후 표시됩니다.
            </p>
          </div>
        </div>
      )}
      {loadStatus === 'error' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">제품을 불러오지 못했습니다</p>
            <p className="text-amber-700/90">백엔드 응답 오류 또는 네트워크 문제입니다. 잠시 후 다시 시도하거나 데모 데이터로 확인하세요.</p>
          </div>
        </div>
      )}
      {!productsLoading && loadStatus === null && !isDemo && dataset.products.length === 0 && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">표시할 제품이 없습니다</p>
            <p className="text-amber-700/90">
              로그인 계정의 테넌트에 연결된 제품이 없습니다(<code>products.tenant_id</code>). 백엔드 시드/테넌트 매핑을 확인하세요.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-6 pt-4">
        {productsLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            제품 불러오는 중…
          </span>
        )}
        <button
          type="button"
          onClick={loadDemo}
          disabled={isDemo}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <Database className="h-3.5 w-3.5" />
          {isDemo ? '데모 데이터 로드됨' : '데모 데이터 불러오기'}
        </button>
      </div>

      {/* ④ 진입 게이트: 고객사·제품·단위기간·BOM(봄)을 골라 '맵 생성'으로 진입. */}
      {!mapStarted && loadStatus === null && !productsLoading && dataset.products.length > 0 && (
        <div className="mx-6 mt-6 rounded-md border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-ok-text">
            <Network className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink-100">공급망 맵 생성</h2>
          <p className="mt-1 text-sm text-slate-500">
            고객사 · 제품 · 단위기간을 고르고, 그 기간에 편입된 BOM(생산 Lot) 하나를 선택해 맵을 생성하면, 해당 공급망의 1차 협력사부터 자동 맵핑됩니다.
          </p>

          {entryRowsLoading ? (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          ) : (
            // 필터는 STEP2(협력사 Pool)와 동일한 모달(ModalShell) 양식으로 연다.
            // 모달에서 고른 고객사/제품/단위기간/BOM이 그대로 다음 화면(맵 필터 칸)으로 승계된다.
            <button
              type="button"
              onClick={() => setActiveModal('mapCreate')}
              className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover"
            >
              <ArrowRight className="h-4 w-4" />
              맵 생성 조건 선택
            </button>
          )}
        </div>
      )}

      {mapStarted && (
        <SupplyChainMapPageContent
          dataset={dataset}
          embedded
          initialProductId={initialProductId ?? entryProductId}
          initialBomVersionId={initialBomVersionId ?? entryBomVersionId}
          initialPeriodFrom={entryPeriodFrom}
          initialPeriodTo={entryPeriodTo}
          highlightSupplierIds={new Set(pool.map(s => s.supplierId))}
          onNodeSelect={setSelectedNode}
          onConnectClick={() => setActiveModal('invite')}
          onProductChange={handleProductChange}
          progressBySupplier={progressBySupplier}
          onRowClick={row => openSupplierReview(row.supplier_id, row.supplier_name)}
        />
      )}

      {/* 협력사 상세(general review) 팝업 — 맵 표 행 클릭 시. 닫으면 이 공급망 맵으로 바로 복귀. */}
      {reviewSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 md:p-8"
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
              <SupplierGeneralReviewContent supplierId={reviewSupplier.id} supplierName={reviewSupplier.name} embedded mode="oem" />
            </div>
          </div>
        </div>
      )}

      {/* STEP1 맵 생성 조건 — STEP2(Pool)와 동일한 ModalShell 양식. 여기서 고른 값이 맵 필터 칸으로 승계된다. */}
      {activeModal === 'mapCreate' && (
        <ModalShell
          title="공급망 맵 생성"
          subtitle="고객사 · 제품 · 단위기간 · BOM(생산 Lot)을 고르면 1차 협력사부터 자동 맵핑됩니다."
          onClose={close}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => { startMapFromSelection(); close(); }}
                disabled={!entryProductId || entryBoms.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                맵 생성하기
              </button>
            </div>
          }
        >
          <div className="grid gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">고객사</span>
              <select
                value={entryCustomer}
                onChange={e => onEntryCustomerChange(e.target.value)}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-100 shadow-sm outline-none focus:border-ok-border"
              >
                {entryCustomers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">제품</span>
              <select
                value={entryProductId}
                onChange={e => onEntryProductChange(e.target.value)}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink-100 shadow-sm outline-none focus:border-ok-border"
              >
                {entryProducts.map(p => (
                  <option key={p.productId} value={p.productId}>{p.productName}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">단위기간</span>
              <div className="flex h-11 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm focus-within:border-ok-border">
                <input
                  type="date"
                  value={entryPeriodFrom}
                  max={entryPeriodTo || undefined}
                  onChange={e => onPeriodChange(e.target.value, entryPeriodTo)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                  aria-label="단위기간 시작일"
                />
                <span className="text-xs font-bold text-slate-400">~</span>
                <input
                  type="date"
                  value={entryPeriodTo}
                  min={entryPeriodFrom || undefined}
                  onChange={e => onPeriodChange(entryPeriodFrom, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink-400 outline-none"
                  aria-label="단위기간 종료일"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">BOM</span>
              <select
                value={entryBomVersionId ?? ''}
                onChange={e => setEntryBomVersionId(e.target.value || undefined)}
                disabled={entryBoms.length === 0}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-ink-400 shadow-sm outline-none focus:border-ok-border disabled:opacity-50"
              >
                {entryBoms.length === 0 && <option value="">해당 기간에 편입된 BOM 없음</option>}
                {entryBoms.map(r => (
                  <option key={r.bomVersionId ?? 'na'} value={r.bomVersionId ?? ''}>
                    {r.versionNumber ? `v${r.versionNumber}` : 'BOM'}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </ModalShell>
      )}

      {activeModal === 'pool' && (
        <PoolModal
          candidates={tier1Pool}
          initialPool={pool}
          onClose={close}
          onConfirm={async selected => {
            setPool(selected);
            close();
            // Pool 확정 영속화(P4/F1) — 선택 Tier-1 엣지 link_status=confirmed.
            // 실 UUID 협력사 + 해당 맵이 있을 때만 호출(데모/mock S-ID는 상태만 유지).
            const ids = selected
              .map(s => s.supplierId)
              .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id));
            if (ids.length === 0) return;
            try {
              const maps = await getSupplyChainMaps();
              const header = maps.find(
                m => (activeBomVersionId && m.bomVersionId === activeBomVersionId) || m.productId === selectedProductId,
              );
              if (header?.mapId) await confirmPool(header.mapId, ids);
            } catch {
              /* 영속화 실패는 흐름을 막지 않음 — 프론트 상태(pool)는 이미 반영됨 */
            }
          }}
        />
      )}

      {/* STEP 3 — 연결 협력사 확인 + 자료 일괄 요청 */}
      {activeModal === 'suppliers' && (
        <ConnectedSuppliersModal
          suppliers={mapSuppliers}
          confirmed={confirmedSuppliers}
          onToggleConfirm={toggleConfirm}
          onConfirmAll={confirmAll}
          onOpenMail={() => { setMailInitialSupplierId(null); setActiveModal('invite'); }}
          onOpenMailFor={id => { setMailInitialSupplierId(id); setActiveModal('invite'); }}
          onClose={close}
        />
      )}

      {/* STEP4 — 자료 수집·보완 검토: 편입 협력사의 입력 누락·문서 문제 확인·요청·AI 파싱 검토 */}
      {activeModal === 'dataReview' && (
        <DataReviewModal
          suppliers={mapSuppliers}
          gapNodes={scopedGapNodes}
          onRequest={id =>
            createDataRequest({ targetSupplierId: id, requestedDataType: 'general_info' })
              .then(() => { if (selectedProductId) getValidationSummary(selectedProductId, activeBomVersionId).then(setSummary).catch(() => {}); })
              .catch(() => {})
          }
          onClose={close}
        />
      )}

      {activeModal === 'dataRequest' && (
        <DataRequestModal
          supplierLabel={requestLabel ?? (activeSupplierId ? `${activeNodeLabel} · ${activeSupplierId}` : activeNodeLabel)}
          supplierId={activeSupplierId}
          onClose={() => {
            setRequestLabel(null);
            close();
          }}
          onBack={() => setActiveModal('mapManage')}
        />
      )}

      {activeModal === 'invite' && (
        <InviteMailModal pool={mapSuppliers} initialSupplierId={mailInitialSupplierId ?? undefined} onClose={close} />
      )}

      {activeModal === 'mapManage' && (
        <MapManageModal
          pool={pool}
          {...(selectedProductId ? { productId: selectedProductId } : {})}
          {...(activeBomVersionId ? { bomVersionId: activeBomVersionId } : {})}
          onClose={close}
          onVerified={onStep4Verified}
          onRequestUpdate={supplier => {
            setRequestLabel(supplier.companyName);
            setActiveModal('dataRequest');
          }}
        />
      )}
    </div>
  );
}

// 흐름 안내 배너 — 현재 단계와 '다음 할 일'을 상태 기반으로 명시(사용자가 다음 액션을 알 수 있게).
function FlowGuide({
  hasProduct, poolCount, tier1Count, hasSelection, onOpenPool,
}: {
  hasProduct: boolean; poolCount: number; tier1Count: number; hasSelection: boolean; onOpenPool: () => void;
}) {
  let step: string, title: string, desc: string, tone: 'info' | 'warn' | 'ok', cta = false;
  if (!hasProduct) {
    step = 'STEP 1'; tone = 'info';
    title = '대표 제품을 선택하세요';
    desc = '아래 표의 "제품" 드롭다운에서 대표 제품을 고르면 공급망 맵 구성이 시작됩니다.';
  } else if (poolCount === 0 && tier1Count === 0) {
    step = 'STEP 2'; tone = 'warn';
    title = '이 제품은 다음 단계로 진행할 수 없습니다';
    desc = '등록된 1차 협력사가 없어 협력사 Pool을 구성할 수 없습니다. 다른 제품을 선택하세요.';
  } else if (poolCount === 0) {
    step = 'STEP 2'; tone = 'info'; cta = true;
    title = '협력사 Pool을 구성하세요';
    desc = `상단 "STEP 2 협력사 Pool 구성"을 눌러 1차 협력사 ${tier1Count}개사 중 작업 대상을 선택·확정하면 STEP 3~5가 열립니다.`;
  } else {
    step = 'STEP 3'; tone = 'ok';
    title = '맵 구성 완료 — 협력사를 확인하세요';
    desc = '상단 "STEP 3 협력사 확인·자료 요청"에서 연결 협력사를 확인하거나 자료를 일괄 요청하세요. 협력사 노드를 클릭하면 상세 정보가 맵에 바로 표시됩니다.';
  }
  const toneCls =
    tone === 'ok' ? 'border-ok-border bg-ok-bg text-ok-text'
    : tone === 'warn' ? 'border-warn-border bg-warn-bg text-warn-text'
    : 'border-info-border bg-info-bg text-info-text';
  return (
    <div className={`mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 ${toneCls}`}>
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-full border border-current/30 bg-white/60 px-2.5 py-1 text-[11px] font-bold">{step}</span>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-0.5 text-sm opacity-90">{desc}</p>
        </div>
      </div>
      {cta && (
        <button
          type="button"
          onClick={onOpenPool}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-hover"
        >
          협력사 Pool 구성
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
