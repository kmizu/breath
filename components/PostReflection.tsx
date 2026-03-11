'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PostOutcome } from '@/lib/types';

interface PostReflectionProps {
  sessionId: string;
  onSubmit: (sessionId: string, outcome: PostOutcome) => Promise<void>;
  loading?: boolean;
}

export function PostReflection({ sessionId, onSubmit, loading }: PostReflectionProps) {
  const t = useTranslations('post');
  const [feltBetter, setFeltBetter] = useState<boolean | null>(null);
  const [wouldContinue, setWouldContinue] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feltBetter === null || wouldContinue === null) {
      setError(t('requiredError'));
      return;
    }
    setError('');
    try {
      await onSubmit(sessionId, {
        feltBetter,
        wouldContinue,
        notes: notes.trim() || undefined,
      });
    } catch {
      setError(t('submitError'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7 max-w-lg mx-auto">
      <div>
        <p className="text-sm text-stone-600 mb-2">{t('pressureQuestion')}</p>
        <div className="flex gap-3">
          {([
            { value: true, labelKey: 'reducedIt' as const },
            { value: false, labelKey: 'addedToIt' as const },
          ]).map(({ value, labelKey }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setFeltBetter(value)}
              className={`flex-1 py-2 text-sm rounded transition-colors ${
                feltBetter === value ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-stone-600 mb-2">{t('continueQuestion')}</p>
        <div className="flex gap-3">
          {([
            { value: true, labelKey: 'yes' as const },
            { value: false, labelKey: 'no' as const },
          ]).map(({ value, labelKey }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setWouldContinue(value)}
              className={`flex-1 py-2 text-sm rounded transition-colors ${
                wouldContinue === value ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-stone-600 mb-2">
          {t('notesLabel')} <span className="text-stone-400">{t('optional')}</span>
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="..."
          rows={2}
          maxLength={400}
          className="w-full px-3 py-2 text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded resize-none focus:outline-none focus:border-stone-400 placeholder:text-stone-300"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-sm text-white bg-[#6b8271] rounded hover:bg-[#5a7060] disabled:opacity-50 transition-colors"
      >
        {loading ? t('saving') : t('done')}
      </button>
    </form>
  );
}
