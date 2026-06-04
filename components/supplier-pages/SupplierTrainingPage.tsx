'use client';

import { useParams } from 'next/navigation';
import { getTrainingRecords, trainingMaterials, getFactories } from '@/lib/supplier-detail-data';
import { GraduationCap, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { KpiTile } from './shared/KpiTile';
import { TrainingRecordCard } from './sections/training/TrainingRecordCard';
import { TrainingMaterialCard } from './sections/training/TrainingMaterialCard';

export default function SupplierTrainingPage() {
  const { id }    = useParams<{ id: string }>();
  const records   = getTrainingRecords(id);
  const factories = getFactories(id);

  const totalRecords   = records.length;
  const completedCount = records.filter(r => r.status === 'completed').length;
  const overdueCount   = records.filter(r => r.status === 'overdue').length;
  const avgCompletion  = totalRecords > 0
    ? Math.round(records.reduce((acc, r) => acc + r.completionRate, 0) / totalRecords)
    : 0;

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile icon={GraduationCap} label="전체 과정"   value={totalRecords}   unit="건" tone="neutral" />
        <KpiTile icon={CheckCircle2}  label="이수 완료"   value={completedCount} unit="건" tone="ok" />
        <KpiTile icon={AlertCircle}   label="기한 초과"   value={overdueCount}   unit="건" tone={overdueCount > 0 ? 'warn' : 'ok'} />
        <KpiTile icon={BookOpen}      label="평균 이수율" value={avgCompletion}  unit="%" tone={avgCompletion >= 80 ? 'ok' : 'warn'} />
      </div>

      {/* ── 교육 이수 현황 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-ink-100">교육 이수 현황</h2>
          <span className="text-xs text-ink-500">{totalRecords}건</span>
        </div>

        {records.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-500 border border-ink-700/40 border-dashed rounded-xs">
            <GraduationCap className="w-4 h-4" />
            등록된 교육 기록이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => {
              const material = trainingMaterials.find(m => m.materialId === record.materialId);
              const factory  = factories.find(f => f.factoryId === record.factoryId);
              return (
                <TrainingRecordCard
                  key={record.recordId}
                  record={record}
                  material={material}
                  factory={factory}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── 교육 자료 목록 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-ink-100">사용 가능한 교육 자료</h2>
          <span className="text-xs text-ink-500">{trainingMaterials.length}건</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {trainingMaterials.map(m => (
            <TrainingMaterialCard
              key={m.materialId}
              material={m}
              isAssigned={records.some(r => r.materialId === m.materialId)}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
