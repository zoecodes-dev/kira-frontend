'use client';

// STEP 4 — 최종 검증. 환경성적서(탄소발자국, EU 배터리법 Art7)를 핵심으로
// 연결 협력사의 실데이터를 가져와 검증한다.
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, FileSignature, Leaf, Loader2, Paperclip, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import ModalShell from './ModalShell';
import type { RequestGapItem } from './DataRequestModal';
import { downloadSupplyChainExcel, getDataConsents, getSupplierCarbonDeclarations, getValidationSummary, listFilesByContext, uploadFile, type CarbonDeclaration, type DataConsent, type SupplierBrief, type ValidationSummary } from '@/lib/api';

type EpdStatus = 'verified' | 'declared' | 'expired' | 'missing';

const epdContext = (supplierId: string) => `carbon-epd:${supplierId}`;

interface ConsentState { agreed: boolean; label: string }

interface VerifyRow {
  supplier: SupplierBrief;
  epd: EpdStatus;
  carbonIntensity: number | null;
  epdDocs: number; // 첨부된 환경성적서 PDF 건수
  consent: ConsentState; // 제3자 정보제공 동의(데이터 계약) 상태
}

/** 데이터 계약 동의 상태: 동의완료(agreed·유효) / 동의만료 / 발송됨 / 미발송 등 */
function consentStateOf(consents: DataConsent[]): ConsentState {
  if (!consents.length) return { agreed: false, label: '미발송' };
  const latest = consents[0]; // 최신순
  const expired = !!latest.validTo && new Date(latest.validTo).getTime() < Date.now();
  if (latest.status === 'agreed') return expired ? { agreed: false, label: '동의만료' } : { agreed: true, label: '동의완료' };
  const map: Record<string, string> = { requested: '발송됨', returned: '회신', rejected: '거절', revoked: '철회', expired: '만료' };
  return { agreed: false, label: map[latest.status] ?? latest.status };
}

/** 환경성적서(탄소) 상태: 미제출 / 만료 / 자기선언 / 제3자검증완료 */
function epdStatusOf(decls: CarbonDeclaration[]): EpdStatus {
  if (decls.length === 0) return 'missing';
  const now = Date.now();
  const valid = decls.filter(d => !d.validTo || new Date(d.validTo).getTime() >= now);
  if (valid.length === 0) return 'expired';
  if (valid.some(d => d.source === 'third_party_verified')) return 'verified';
  return 'declared';
}

const EPD_META: Record<EpdStatus, { label: string; cls: string; pass: boolean }> = {
  verified: { label: '검증완료', cls: 'border-ok-border bg-ok-bg text-ok-text', pass: true },
  declared: { label: '자기선언', cls: 'border-warn-border bg-warn-bg text-warn-text', pass: true },
  expired:  { label: '만료',     cls: 'border-alert-border bg-alert-bg text-alert-text', pass: false },
  missing:  { label: '미제출',   cls: 'border-alert-border bg-alert-bg text-alert-text', pass: false },
};

export default function MapManageModal({
  pool,
  onClose,
  onRequestUpdate,
  onVerified,
  productId,
  bomVersionId,
}: {
  pool: SupplierBrief[];
  onClose: () => void;
  // 자료 요청 — 그 협력사의 미흡 항목(gaps)을 함께 넘겨 결손 항목만 요청하도록 한다.
  onRequestUpdate: (supplier: SupplierBrief, gaps: RequestGapItem[]) => void;
  // 검증 완료 시 협력사별 환경성적서 통과 여부를 백엔드(verification_status)에 영속.
  onVerified?: (results: { supplierId: string; passed: boolean }[]) => void;
  productId?: string;         // [P7] 최종 검증 요약/판정 + 고객사 엑셀용
  bomVersionId?: string;
}) {
  const [rows, setRows] = useState<VerifyRow[]>([]);
  const [loading, setLoading] = useState(pool.length > 0);
  const [finalConfirmed, setFinalConfirmed] = useState(false);
  const [reload, setReload] = useState(0);       // 업로드 후 재조회 트리거
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);   // [P7]
  const [downloading, setDownloading] = useState(false);

  // [P7] 최종 검증 요약/판정 조회 (get_gaps + 비율검증 롤업).
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    getValidationSummary(productId, bomVersionId)
      .then(s => { if (!cancelled) setSummary(s); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [productId, bomVersionId, reload]);

  // [P7] 고객사 제출용 엑셀(서버 생성) 다운로드.
  async function handleDownloadExcel() {
    if (!productId) return;
    setDownloading(true);
    try {
      const blob = await downloadSupplyChainExcel(productId, bomVersionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `공급망_고객사제출_${productId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('엑셀 다운로드에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (pool.length === 0) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await Promise.all(
        pool.map(async supplier => {
          // 환경성적서(핵심) + 제3자 동의(핵심) + 환경성적서 첨부 동시 조회.
          const [carbonRes, docs, consents] = await Promise.all([
            getSupplierCarbonDeclarations(supplier.supplierId).catch(() => null),
            listFilesByContext(epdContext(supplier.supplierId)).catch(() => []),
            getDataConsents(supplier.supplierId).catch(() => []),
          ]);
          const decls = carbonRes?.declarations ?? [];
          const epd = epdStatusOf(decls);
          const carbonIntensity = decls[0]?.carbonIntensity ?? null;
          return { supplier, epd, carbonIntensity, epdDocs: (docs ?? []).length, consent: consentStateOf(consents ?? []) } as VerifyRow;
        }),
      );
      if (!cancelled) { setRows(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pool, reload]);

  // 환경성적서 PDF 업로드 → POST /files(context=carbon-epd:supplierId) → 재조회.
  async function handleUpload(supplierId: string, file: File) {
    setUploadingId(supplierId);
    setUploadError(null);
    try {
      await uploadFile(file, epdContext(supplierId));
      setReload(n => n + 1);
    } catch {
      setUploadError('업로드 실패 — 환경/자격증명(S3)을 확인하세요.');
    } finally {
      setUploadingId(null);
    }
  }

  // 그 협력사의 공급망 필수필드 누락 수(최종 검증 3축 중 ③). summary 미로드면 0으로 중립 처리.
  const supplyGapCount = (r: VerifyRow) =>
    summary?.gapsBySupplier.find(s => s.supplierId === r.supplier.supplierId)?.missingFields.length ?? 0;
  // 검증 통과 = 환경성적서 통과 AND 데이터 계약 동의 AND 공급망 필수필드 완비 (3축 모두 충족).
  const rowPass = (r: VerifyRow) => EPD_META[r.epd].pass && r.consent.agreed && supplyGapCount(r) === 0;
  const failed = rows.filter(r => !rowPass(r));
  const allPass = rows.length > 0 && failed.length === 0;

  // 그 협력사의 미흡 항목(최종 검증 3축) — 자료 요청에 그대로 실어 보낸다.
  //   ① 환경성적서 미검증(미제출/만료)  ② 데이터 제공 동의 미완료  ③ 공급망 필수필드 누락(summary.gaps)
  function buildGaps(r: VerifyRow): RequestGapItem[] {
    const gaps: RequestGapItem[] = [];
    if (!EPD_META[r.epd].pass) gaps.push({ key: 'epd', label: `환경성적서 ${EPD_META[r.epd].label}` });
    if (!r.consent.agreed) gaps.push({ key: 'consent', label: `데이터 제공 동의 ${r.consent.label}` });
    const node = summary?.gapsBySupplier.find(s => s.supplierId === r.supplier.supplierId);
    (node?.missingFields ?? []).forEach(f =>
      gaps.push({ key: `field:${f.fieldName}`, label: `공급망 필수필드: ${f.fieldLabel || f.fieldName}` }),
    );
    return gaps;
  }

  return (
    <ModalShell
      title="최종 검증"
      subtitle="연결 협력사의 환경성적서(EU 배터리법 Art7 탄소발자국)를 핵심으로 실데이터를 검증합니다."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-300">
            <input type="checkbox" checked={finalConfirmed} onChange={e => setFinalConfirmed(e.target.checked)} className="h-4 w-4 accent-brand" />
            검증 결과를 확인했습니다.
          </label>
          <button
            type="button"
            onClick={() => {
              // 환경성적서 검증 결과를 협력사별로 영속(통과=verified, 실패=unverified).
              onVerified?.(rows.map(r => ({ supplierId: r.supplier.supplierId, passed: rowPass(r) })));
              onClose();
            }}
            disabled={!finalConfirmed}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            검증 완료
          </button>
        </div>
      }
    >
      {/* [P7] 공급망 최종 검증 요약 + 고객사 제출용 엑셀 */}
      {summary && (
        <section className="mb-4 rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink-100">공급망 최종 검증 요약</span>
              <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-bold',
                summary.readyForFinal ? 'border border-ok-border bg-ok-bg text-ok-text' : 'border border-warn-border bg-warn-bg text-warn-text')}>
                {summary.readyForFinal ? '최종 검증 준비 완료' : '입력 미흡'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              고객사 제출용 엑셀
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {([
              ['협력사', summary.supplierCount],
              ['최대 차수', summary.maxTier],
              ['미보유 필드', summary.totalGapCount],
              ['비율 검증', summary.ratioValid ? 'OK' : '불일치'],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className="num-mono mt-0.5 text-lg font-bold text-ink-100">{value}</div>
              </div>
            ))}
          </div>
          {summary.gapsBySupplier.length > 0 && (
            <ul className="mt-3 space-y-1">
              {summary.gapsBySupplier.map(n => (
                <li key={n.supplierId} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-ink-100">{n.companyName}</span>
                  <span className="text-alert-text">미보유 {n.gapCount}건</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">Pool 협력사</div>
          <div className="num-mono mt-1 text-2xl font-bold text-ink-100">{pool.length}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">검증 미통과</div>
          <div className={clsx('num-mono mt-1 text-2xl font-bold', failed.length > 0 ? 'text-alert-text' : 'text-ok-text')}>{failed.length}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-xs font-semibold text-slate-500">검증 결과</div>
          <div className={clsx('mt-1 text-2xl font-bold', loading ? 'text-slate-400' : allPass ? 'text-ok-text' : 'text-alert-text')}>
            {loading ? '검증 중' : allPass ? '통과' : '실패'}
          </div>
        </div>
      </section>

      <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink-100">
        <Leaf className="h-4 w-4 text-ok-text" />
        환경성적서(탄소발자국) 검증 · 협력사별
      </div>
      {pool.length === 0 ? (
        <div className="rounded-md border border-dashed border-warn-border bg-warn-bg px-3 py-6 text-center text-sm text-warn-text">
          먼저 협력사 Pool을 구성하세요.
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div className="text-sm font-semibold">실데이터(환경성적서)를 가져오는 중…</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const meta = EPD_META[r.epd];
            const gapN = supplyGapCount(r);   // 공급망 필수필드 누락 수(3축 중 ③)
            const needsRequest = !rowPass(r);
            return (
              <div key={r.supplier.supplierId} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink-100">{r.supplier.companyName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-bold', meta.cls)}>
                      {meta.pass ? <ShieldCheck className="h-3 w-3" /> : <Leaf className="h-3 w-3" />}
                      환경성적서 {meta.label}
                    </span>
                    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-bold',
                      r.consent.agreed ? 'border-ok-border bg-ok-bg text-ok-text' : 'border-alert-border bg-alert-bg text-alert-text')}>
                      <FileSignature className="h-3 w-3" />
                      데이터 동의 {r.consent.label}
                    </span>
                    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-bold',
                      gapN === 0 ? 'border-ok-border bg-ok-bg text-ok-text' : 'border-alert-border bg-alert-bg text-alert-text')}>
                      <ShieldCheck className="h-3 w-3" />
                      공급망 데이터 {gapN === 0 ? '완비' : `미보유 ${gapN}건`}
                    </span>
                    {r.carbonIntensity != null && (
                      <span className="text-slate-500">{r.carbonIntensity} kgCO₂e/kWh</span>
                    )}
                    <span className={clsx('inline-flex items-center gap-1', r.epdDocs > 0 ? 'text-ok-text' : 'text-slate-400')}>
                      <Paperclip className="h-3 w-3" />환경성적서 첨부 {r.epdDocs}건
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-400 hover:border-ok-border hover:text-ok-text">
                    {uploadingId === r.supplier.supplierId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    환경성적서 업로드
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(r.supplier.supplierId, f); e.target.value = ''; }}
                    />
                  </label>
                  {needsRequest && (
                    <button
                      type="button"
                      onClick={() => onRequestUpdate(r.supplier, buildGaps(r))}
                      className="inline-flex items-center gap-1.5 rounded-md border border-brand bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-ok-bg"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      자료 요청
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {uploadError && <p className="px-1 pt-1 text-xs font-semibold text-alert-text">{uploadError}</p>}
        </div>
      )}
    </ModalShell>
  );
}
