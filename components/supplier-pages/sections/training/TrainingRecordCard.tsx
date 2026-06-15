import type { ComponentType } from 'react';
import type { TrainingRecord, TrainingMaterial, Factory } from '@/lib/supplier-detail-data';
import { BookOpen, Video, Monitor, Users, FileText, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: '이수 완료', color: 'text-emerald-600', bg: 'border-emerald-700/30 bg-emerald-500/5' },
  in_progress: { label: '진행 중',  color: 'text-blue-600',    bg: 'border-blue-700/30 bg-blue-500/5' },
  overdue:     { label: '기한 초과', color: 'text-red-600',    bg: 'border-red-700/30 bg-red-500/5' },
  not_started: { label: '미시작',   color: 'text-ink-400',     bg: 'border-ink-700 bg-ink-800/30' },
};

export const formatIcon: Record<string, ComponentType<{ className?: string }>> = {
  pdf:    FileText,
  video:  Video,
  online: Monitor,
  onsite: Users,
};

export const categoryLabel: Record<string, string> = {
  human_rights:      '인권',
  safety:            '산업안전',
  environmental:     '환경',
  anti_corruption:   '반부패',
  conflict_minerals: '분쟁광물',
  data_protection:   '개인정보',
  esg_general:       'ESG 일반',
};

interface Props {
  record:   TrainingRecord;
  material: TrainingMaterial | undefined;
  factory:  Factory | undefined;
}

export function TrainingRecordCard({ record, material, factory }: Props) {
  const sm         = statusMeta[record.status];
  const FormatIcon = material ? (formatIcon[material.format] ?? BookOpen) : BookOpen;

  return (
    <div className={clsx('p-4 rounded-xs border', sm.bg)}>
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

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-ink-700 rounded-xs overflow-hidden max-w-[160px]">
              <div
                className="h-full rounded-xs"
                style={{
                  width: `${record.completionRate}%`,
                  backgroundColor: record.completionRate === 100 ? '#10B981' :
                                   record.completionRate >= 50  ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
            <span className="text-[10px] num-mono text-ink-300 font-medium">{record.completionRate}%</span>
            <span className="text-[10px] text-ink-500 num-mono">({record.traineeCount}/{record.totalEligible}명)</span>
          </div>

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
            {record.instructor && <span>강사: {record.instructor}</span>}
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
}
