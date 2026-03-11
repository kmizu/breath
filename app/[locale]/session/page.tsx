'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSessionMachine } from '@/hooks/useSessionMachine';
import { ReflectionChat } from '@/components/ReflectionChat';
import { SupervisorReview } from '@/components/SupervisorReview';
import { GuidancePlayer } from '@/components/GuidancePlayer';
import { PostReflection } from '@/components/PostReflection';
import { Link } from '@/i18n/navigation';
import type { ReflectionProfile } from '@/lib/types';

export default function SessionPage() {
  const t = useTranslations('session');
  const locale = useLocale();

  const {
    state,
    personalize,
    startSession,
    reportWorse,
    endSession,
    submitPost,
    reset,
  } = useSessionMachine(locale);

  const [loading, setLoading] = useState(false);

  const withLoading = <T,>(fn: () => Promise<T>) => async () => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  };

  const handleReflectionDone = async (profile: ReflectionProfile) => {
    setLoading(true);
    try {
      await personalize(profile);
    } finally {
      setLoading(false);
    }
  };

  const stepKeys = ['checkin', 'review', 'practice', 'reflect'] as const;
  const stepOrder = ['reflecting', 'review', 'session', 'post', 'done'];

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex gap-2 items-center text-xs text-stone-400">
        {stepKeys.map((key, i) => {
          const currentIdx = stepOrder.indexOf(state.step);
          const done = currentIdx > i;
          const active = stepOrder[i] === state.step;
          return (
            <span
              key={key}
              className={`${active ? 'text-stone-700' : done ? 'text-stone-400' : 'text-stone-200'}`}
            >
              {i > 0 && <span className="mr-2">·</span>}
              {t(`steps.${key}`)}
            </span>
          );
        })}
      </div>

      {state.step === 'reflecting' && (
        <ReflectionChat
          locale={locale}
          onDone={handleReflectionDone}
          loading={loading}
        />
      )}

      {state.step === 'review' && (
        <SupervisorReview
          decision={state.decision}
          checkin={{
            mood: state.profile.mood,
            tension: state.profile.tension,
            selfCritical: state.profile.selfCritical,
            intent: state.profile.intent,
            lastSessionOutcome: state.profile.lastSessionOutcome,
            freeText: state.profile.freeText,
          }}
          loading={loading}
          onStart={withLoading(() => startSession(state.decision, state.profile))}
          onDecline={() => reset()}
        />
      )}

      {state.step === 'session' && (
        <GuidancePlayer
          guidance={state.guidance}
          decision={state.decision}
          checkin={{
            mood: state.profile.mood,
            tension: state.profile.tension,
            selfCritical: state.profile.selfCritical,
            intent: state.profile.intent,
            lastSessionOutcome: state.profile.lastSessionOutcome,
            freeText: state.profile.freeText,
          }}
          onEnd={endSession}
          onWorse={async (report) => {
            await reportWorse(report, state.profile);
          }}
        />
      )}

      {state.step === 'post' && (
        <PostReflection
          sessionId={state.sessionId}
          loading={loading}
          onSubmit={async (id, outcome) => {
            setLoading(true);
            try {
              await submitPost(id, outcome);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {state.step === 'done' && (
        <div className="space-y-6 max-w-lg mx-auto text-center">
          <p className="text-stone-600">{t('done')}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-5 py-2.5 text-sm text-white bg-[#6b8271] rounded hover:bg-[#5a7060] transition-colors"
            >
              {t('anotherSession')}
            </button>
            <Link
              href="/history"
              className="px-5 py-2.5 text-sm text-stone-600 bg-stone-100 rounded hover:bg-stone-200 transition-colors"
            >
              {t('viewHistory')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
