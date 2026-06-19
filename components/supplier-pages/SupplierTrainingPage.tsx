'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GraduationCap, CheckCircle2, AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import {
  ApiError,
  getSupplierTraining,
  getSupplierFactories,
  type SupplierFactory,
  type TrainingRecord,
} from '@/lib/api';
import { KpiTile } from './shared/KpiTile';
import { TrainingRecordCard } from './sections/training/TrainingRecordCard';

export default function SupplierTrainingPage() {
  const { id } = useParams<{ id: string }>();

  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [factories, setFactories] = useState<SupplierFactory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [training, fac] = await Promise.all([
          getSupplierTraining(id),
          // 공장 정보는 보조 — 실패해도 교육 화면은 표시
          getSupplierFactories(id).catch(() => ({ supplierId: id, factories: [] })),
        ]);
        if (cancelled) return;
        setRecords(training.records ?? []);
        setFactories(fac.factories ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError && err.status === 404
              ? '협력사를 찾을 수 없습니다'
              : '교육 데이터를 불러오지 못했습니다',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const totalRecords   = records.length;
  const completedCount = records.filter(r => r.status === 'completed').length;
  const overdueCount   = records.filter(r => r.status === 'overdue').length;
  const avgCompletion  = totalRecords > 0
    ? Math.round(records.reduce((acc, r) => acc + r.completionRate, 0) / totalRecords)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        교육 데이터를 불러오는 중…
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-xs text-ink-500">{error}</div>;
  }

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
              const factory = factories.find(f => f.factoryId === record.factoryId);
              return (
                <TrainingRecordCard
                  key={record.recordId}
                  record={record}
                  factory={factory}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── 교육 자료 목록 ── */}
      {/* 전역 교육자료 카탈로그 API 미제공 — 백엔드 추가 전까지 비표시 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-ink-100">사용 가능한 교육 자료</h2>
          <span className="text-xs text-ink-500">0건</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-500 border border-ink-700/40 border-dashed rounded-xs">
          <BookOpen className="w-4 h-4" />
          교육 자료 카탈로그 연동 대기 중입니다
        </div>
      </div>

    </div>
  );
}
