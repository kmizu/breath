'use client';

import { useTranslations } from 'next-intl';
import type { SupervisorDecision, CheckinData } from '@/lib/types';
import { CrisisBanner } from './CrisisBanner';

interface SupervisorReviewProps {
  decision: SupervisorDecision;
  checkin: CheckinData;
  onStart: () => Promise<void>;
  onDecline: () => void;
  loading?: boolean;
}

const RISK_COLORS = {
  none: 'border-stone-200',
  low: 'border-stone-200',
  moderate: 'border-amber-200',
  high: 'border-orange-300',
  crisis: 'border-stone-300',
};

export function SupervisorReview({ decision, checkin, onStart, onDecline, loading }: SupervisorReviewProps) {
  const t = useTranslations('review');

  if (decision.riskLevel === 'crisis') {
    return <CrisisBanner message={decision.message} />;
  }

  const borderColor = RISK_COLORS[decision.riskLevel] ?? 'border-stone-200';
  const modeLabel = t(`modes.${decision.recommendedMode}` as Parameters<typeof t>[0], { default: decision.recommendedMode });
  const durationLabel = t(`durations.${decision.guidanceDuration}` as Parameters<typeof t>[0], { default: String(decision.guidanceDuration) });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className={`border rounded-lg p-6 space-y-4 ${borderColor}`}>
        <p className="text-stone-700 leading-relaxed">{decision.message}</p>

        {decision.action !== 'proceed' && (
          <div className="flex gap-4 text-sm text-stone-500">
            <span>
              {t('mode')}: <span className="text-stone-700">{modeLabel}</span>
            </span>
            <span>
              {t('duration')}: <span className="text-stone-700">{durationLabel}</span>
            </span>
          </div>
        )}

        {decision.patterns.length > 0 && (
          <div className="text-xs text-stone-400">
            {t('noticed')}: {decision.patterns.join(', ').replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {decision.action !== 'stop' && decision.action !== 'crisis' ? (
        <div className="flex gap-3">
          <button
            onClick={onStart}
            disabled={loading}
            className="flex-1 py-3 text-sm text-white bg-[#6b8271] rounded hover:bg-[#5a7060] disabled:opacity-50 transition-colors"
          >
            {loading ? t('starting') : t('begin')}
          </button>
          <button
            onClick={onDecline}
            className="px-4 py-3 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {t('notToday')}
          </button>
        </div>
      ) : (
        <button
          onClick={onDecline}
          className="w-full py-3 text-sm text-stone-600 bg-stone-100 rounded hover:bg-stone-200 transition-colors"
        >
          {t('okayStop')}
        </button>
      )}
    </div>
  );
}
