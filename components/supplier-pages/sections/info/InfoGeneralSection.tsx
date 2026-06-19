import { Globe, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { Section, InfoRow, StatTile } from './InfoSection';
import type { getSupplierName, supplierExtended, getCtiDetails } from '@/lib/supplier-detail-data';
import type { suppliers } from '@/lib/data';

type Supplier = NonNullable<(typeof suppliers)[number]>;
type Name = ReturnType<typeof getSupplierName>;
type Ext = (typeof supplierExtended)[number] | undefined;
type CtiDetails = ReturnType<typeof getCtiDetails>;

export function InfoGeneralSection({ supplier, name, ext, ctiDetails }: {
  supplier: Supplier;
  name: Name;
  ext: Ext;
  ctiDetails: CtiDetails;
}) {
  return (
    <>
      <Section title="기업 기본정보" subtitle="영문 공식 명칭 기준 관리">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <InfoRow label="영문 정식명칭" value={name?.nameEn ?? supplier.name} mono={false} />
            <InfoRow label="한글 명칭"     value={name?.nameKo ?? '—'} />
            <InfoRow label="영문 약칭"     value={name?.shortNameEn ?? '—'} />
            <InfoRow label="한글 약칭"     value={name?.shortNameKo ?? '—'} />
          </div>
          <div className="space-y-3">
            {ext && (
              <>
                <InfoRow label="사업자 등록번호" value={ext.businessRegNo} mono />
                <InfoRow label="법인 등록번호"   value={ext.corporateRegNo} mono />
                <InfoRow label="DUNS 번호"       value={ext.dunsNumber} mono />
                <InfoRow label="Tax Number"      value={ext.taxNumber} mono />
              </>
            )}
          </div>
        </div>

        {ext && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="설립연도" value={String(ext.establishedYear)} />
            <StatTile label="임직원 수" value={`${ext.employeeCount.toLocaleString()}명`} />
            <StatTile label="주요 역할" value={ext.providerType === 'manufacturer' ? '제조업체' : ext.providerType === 'miner' ? '광산' : ext.providerType} />
            <StatTile label="대표자" value={ext.ceoName} />
          </div>
        )}

        {ext?.website && (
          <a href={ext.website} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {ext.website}
          </a>
        )}
      </Section>

      {/* CTI 상세는 detail 엔드포인트로 백킹 — ext(사업자정보, API 없음) 유무와 무관하게 표시 */}
      {ctiDetails && (
        <Section title="업종별 CTI 상세" subtitle="supplier_type별 필수 상세 필드">
          <ProviderTypeDetails providerType={ctiDetails.providerType} details={ctiDetails} />
        </Section>
      )}
    </>
  );
}

function ProviderTypeDetails({
  providerType,
  details,
}: {
  providerType: 'manufacturer' | 'recycler' | 'trader' | 'miner';
  details: CtiDetails;
}) {
  if (!details) {
    return (
      <div className="text-xs text-ink-500 border border-ink-700/40 border-dashed rounded-xs p-4">
        {providerType} 상세 데이터가 아직 연결되지 않았습니다.
      </div>
    );
  }

  if (details.providerType === 'trader') {
    const isLowDisclosure = details.disclosureCompleteness < 75;
    return (
      <div className={clsx(
        'rounded-xs border p-4',
        isLowDisclosure ? 'border-amber-700/40 bg-amber-500/5' : 'border-ink-700/60 bg-ink-900/20',
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="상위 공급망 공개율" value={`${details.disclosureCompleteness}%`} mono />
          <InfoRow label="공개 업체 수" value={`${details.disclosedUpstreamCount}개`} mono />
          <InfoRow label="신고 물질 범위" value={details.declaredMaterialScope} />
          <InfoRow label="Readiness 입력값" value={details.readinessInput} />
        </div>
        {isLowDisclosure && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600">
            <AlertCircle className="w-3 h-3 shrink-0" />
            공개율 75% 미만입니다. FEOC gray-zone 및 DPP readiness 보완 항목으로 표시됩니다.
          </div>
        )}
      </div>
    );
  }

  if (details.providerType === 'miner') {
    return (
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow label="광권 ID" value={details.concessionId} mono />
          <InfoRow
            label="광산 좌표"
            value={details.mineCoordinates ? `${details.mineCoordinates[0]}, ${details.mineCoordinates[1]}` : '미제출'}
            mono
          />
          <InfoRow label="채굴 광물" value={details.extractedMinerals.join(', ')} />
          <InfoRow label="Geo 검증" value={details.geoVerificationStatus} />
        </div>
        <div className="mt-3 text-[11px] text-ink-500">
          위성 이미지·광권 대조 판정은 백엔드 검증 결과를 기다리며, 화면에서 직접 판단하지 않습니다.
        </div>
      </div>
    );
  }

  if (details.providerType === 'recycler') {
    return (
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow label="재활용 방식" value={details.recyclingMethod} />
        <InfoRow label="연 회수량" value={details.annualRecoveredMaterial} mono />
        <InfoRow label="폐기물 허가번호" value={details.wastePermitId} mono />
        <InfoRow label="회수율" value={`${details.recoveryRate}%`} mono />
      </div>
    );
  }

  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InfoRow label="생산 라인" value={details.productionLine} />
      <InfoRow label="연간 생산능력" value={details.annualCapacity} mono />
      <InfoRow label="품질 시스템" value={details.qualitySystem} />
      <InfoRow label="공정 추적성" value={details.processTraceability} />
    </div>
  );
}
