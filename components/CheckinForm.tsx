'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CheckinData, SessionIntent, LastSessionOutcome } from '@/lib/types';

interface CheckinFormProps {
  onSubmit: (data: CheckinData) => Promise<void>;
  loading?: boolean;
}

export function CheckinForm({ onSubmit, loading }: CheckinFormProps) {
  const t = useTranslations('checkin');
  const [mood, setMood] = useState<number>(3);
  const [tension, setTension] = useState<number>(3);
  const [selfCritical, setSelfCritical] = useState<boolean>(false);
  const [intent, setIntent] = useState<SessionIntent>('calming');
  const [lastSessionOutcome, setLastSessionOutcome] = useState<LastSessionOutcome | ''>('');
  const [freeText, setFreeText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit({
        mood: mood as CheckinData['mood'],
        tension: tension as CheckinData['tension'],
        selfCritical,
        intent,
        lastSessionOutcome: lastSessionOutcome || undefined,
        freeText: freeText.trim() || undefined,
      });
    } catch (err) {
      setError(t('error'));
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-lg mx-auto">
      {/* Mood */}
      <div className="space-y-3">
        <label className="block text-sm text-stone-600">{t('moodLabel')}</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setMood(v)}
              className={`flex-1 py-2 text-sm rounded transition-colors ${
                mood === v ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400 text-center">
          1 = {t('moodLow')} · 5 = {t('moodHigh')}
        </p>
      </div>

      {/* Tension */}
      <div className="space-y-3">
        <label className="block text-sm text-stone-600">{t('tensionLabel')}</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setTension(v)}
              className={`flex-1 py-2 text-sm rounded transition-colors ${
                tension === v ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400 text-center">
          1 = {t('tensionLow')} · 5 = {t('tensionHigh')}
        </p>
      </div>

      {/* Self-critical */}
      <div className="space-y-2">
        <label className="block text-sm text-stone-600">{t('selfCriticalLabel')}</label>
        <div className="flex gap-3">
          {([false, true] as const).map(v => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setSelfCritical(v)}
              className={`flex-1 py-2 text-sm rounded transition-colors ${
                selfCritical === v ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {v ? t('yes') : t('no')}
            </button>
          ))}
        </div>
      </div>

      {/* Intent */}
      <div className="space-y-2">
        <label className="block text-sm text-stone-600">{t('intentLabel')}</label>
        <div className="flex gap-2">
          {(['calming', 'grounding', 'checkin'] as SessionIntent[]).map(i => (
            <button
              key={i}
              type="button"
              onClick={() => setIntent(i)}
              className={`flex-1 py-2 text-sm rounded transition-colors ${
                intent === i ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {i === 'calming' ? t('intentCalming') : i === 'grounding' ? t('intentGrounding') : t('intentCheckin')}
            </button>
          ))}
        </div>
      </div>

      {/* Last session */}
      <div className="space-y-2">
        <label className="block text-sm text-stone-600">
          {t('lastSessionLabel')} <span className="text-stone-400">{t('optional')}</span>
        </label>
        <div className="flex gap-2">
          {([
            { value: '', labelKey: 'skip' },
            { value: 'relieving', labelKey: 'relieving' },
            { value: 'neutral', labelKey: 'neutral' },
            { value: 'pressuring', labelKey: 'pressuring' },
          ] as const).map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLastSessionOutcome(value as LastSessionOutcome | '')}
              className={`flex-1 py-2 text-xs rounded transition-colors ${
                lastSessionOutcome === value ? 'bg-[#6b8271] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Free text */}
      <div className="space-y-2">
        <label className="block text-sm text-stone-600">
          {t('freeTextLabel')} <span className="text-stone-400">{t('optional')}</span>
        </label>
        <textarea
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="..."
          className="w-full px-3 py-2 text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded resize-none focus:outline-none focus:border-stone-400 placeholder:text-stone-300"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-sm text-white bg-[#6b8271] rounded hover:bg-[#5a7060] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? t('checking') : t('continue')}
      </button>
    </form>
  );
}
