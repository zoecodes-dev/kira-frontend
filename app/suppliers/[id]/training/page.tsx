'use client';

import { useParams } from 'next/navigation';
import { getTrainingRecords, trainingMaterials, getFactories } from '@/lib/supplier-detail-data';
import {
  GraduationCap, CheckCircle2, Clock, AlertCircle,
  BookOpen, Video, Monitor, Users, FileText,
} from 'lucide-react';
import clsx from 'clsx';

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: '이수 완료', color: 'text-emerald-600', bg: 'border-emerald-700/30 bg-emerald-500/5' },
  in_progress: { label: '진행 중',  color: 'text-blue-600',    bg: 'border-blue-700/30 bg-blue-500/5' },
  overdue:     { label: '기한 초과', color: 'text-red-600',    bg: 'border-red-700/30 bg-red-500/5' },
  not_started: { label: '미시작',   color: 'text-ink-400',     bg: 'border-ink-700 bg-ink-800/30' },
};

const formatIcon: Record<string, any> = {
  pdf:    FileText,
  video:  Video,
  online: Monitor,
  onsite: Users,
};

const categoryLabel: Record<string, string> = {
  human_rights:      '인권',
  safety:            '산업안전',
  environmental:     '환경',
  anti_corruption:   '반부패',
  conflict_minerals: '분쟁광물',
  data_protection:   '개인정보',
  esg_general:       'ESG 일반',
};

export default function SupplierTrainingPage() {
  const { id } = useParams<{ id: string }>();
  const records  = getTrainingRecords(id);
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
        <KpiTile icon={CheckCircle2} label="이수 완료"   value={completedCount} unit="건" tone="ok" />
        <KpiTile icon={AlertCircle}  label="기한 초과"   value={overdueCount}   unit="건" tone={overdueCount > 0 ? 'warn' : 'ok'} />
        <KpiTile icon={BookOpen}     label="평균 이수율" value={avgCompletion}  unit="%" tone={avgCompletion >= 80 ? 'ok' : 'warn'} />
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
              const sm       = statusMeta[record.status];
              const FormatIcon = material ? formatIcon[material.format] ?? BookOpen : BookOpen;

              return (
                <div key={record.recordId} className={clsx('p-4 rounded-xs border', sm.bg)}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xs bg-ink-700/50 flex items-center justify-center shrink-0">
                      <FormatIcon className="w-4 h-4 text-ink-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-ink-100 truncate">
                            {material?.title ?? record.materialId}
                          </div>
                          {material?.titleEn && (
                            <div className="text-[10px] text-ink-500 truncate">{material.titleEn}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {material?.category && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                              {categoryLabel[material.category] ?? material.category}
                            </span>
                          )}
                          <span className={clsx('text-[10px] font-semibold', sm.color)}>{sm.label}</span>
                        </div>
                      </div>

                      {/* 이수율 바 */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-ink-700 rounded-xs overflow-hidden max-w-[160px]">
                          <div
                            className="h-full rounded-xs"
                            style={{
                              width: `${record.completionRate}%`,
                              backgroundColor: record.completionRate === 100 ? '#10B981' :
                                               record.completionRate >= 50 ? '#F59E0B' : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="text-[10px] num-mono text-ink-300 font-medium">
                          {record.completionRate}%
                        </span>
                        <span className="text-[10px] text-ink-500 num-mono">
                          ({record.traineeCount}/{record.totalEligible}명)
                        </span>
                      </div>

                      {/* 메타 정보 */}
                      <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono flex-wrap">
                        {factory && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {factory.factoryName}
                          </span>
                        )}
                        {material?.durationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {material.durationMinutes}분
                          </span>
                        )}
                        <span className={clsx(record.status === 'overdue' && 'text-red-500')}>
                          기한 {record.dueDate}
                        </span>
                        {record.completedAt && (
                          <span className="text-emerald-600">완료 {record.completedAt.slice(0, 10)}</span>
                        )}
                        {record.instructor && (
                          <span>강사: {record.instructor}</span>
                        )}
                      </div>

                      {record.notes && (
                        <div className="mt-2 text-[11px] text-amber-600 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          {record.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
          {trainingMaterials.map(m => {
            const FmtIcon = formatIcon[m.format] ?? BookOpen;
            const isAssigned = records.some(r => r.materialId === m.materialId);
            return (
              <div key={m.materialId} className={clsx(
                'p-3 rounded-xs border',
                isAssigned ? 'border-accent-700/30 bg-accent-500/5' : 'border-ink-700/60 bg-ink-900/20'
              )}>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xs bg-ink-700/50 flex items-center justify-center shrink-0">
                    <FmtIcon className="w-3.5 h-3.5 text-ink-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-ink-200 truncate">{m.title}</div>
                        <div className="text-[10px] text-ink-500 num-mono mt-0.5">
                          {m.durationMinutes}분 · {m.version} · {m.updatedAt.slice(0, 10)}
                        </div>
                      </div>
                      {isAssigned && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-accent-700/20 border border-accent-700/30 text-accent-500 shrink-0">
                          배정됨
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-400">
                        {categoryLabel[m.category] ?? m.category}
                      </span>
                      {m.requiredFor.slice(0, 3).map(reg => (
                        <span key={reg} className="text-[9px] px-1.5 py-0.5 rounded-xs bg-ink-700/50 text-ink-500">
                          {reg}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function KpiTile({ icon: Icon, label, value, unit, tone }: {
  icon: any; label: string; value: number; unit: string;
  tone: 'ok' | 'warn' | 'neutral';
}) {
  const s = {
    ok:      { border: 'border-emerald-700/30', val: 'text-emerald-600' },
    warn:    { border: 'border-amber-700/30',   val: 'text-amber-600' },
    neutral: { border: 'border-ink-700',        val: 'text-ink-200' },
  }[tone];
  return (
    <div className={clsx('rounded-xs border p-3 bg-ink-800/30', s.border)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
        <Icon className="w-3.5 h-3.5 text-ink-500" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-2xl font-semibold num-mono', s.val)}>{value}</span>
        <span className="text-xs text-ink-500">{unit}</span>
      </div>
    </div>
  );
}
