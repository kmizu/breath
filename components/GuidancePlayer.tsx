'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { GuidanceScript, CheckinData, SupervisorDecision } from '@/lib/types';

interface GuidancePlayerProps {
  guidance: GuidanceScript;
  decision: SupervisorDecision;
  checkin: CheckinData;
  onEnd: () => void;
  onWorse: (report: string) => Promise<void>;
}

export function GuidancePlayer({ guidance, decision, checkin, onEnd, onWorse }: GuidancePlayerProps) {
  const t = useTranslations('guidance');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [showWorseForm, setShowWorseForm] = useState(false);
  const [worseText, setWorseText] = useState('');
  const [escalating, setEscalating] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadAudio = useCallback(async () => {
    setLoadingAudio(true);
    setAudioError('');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: guidance.text }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'TTS request failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audio unavailable';
      if (msg.includes('not configured')) {
        setAudioError(t('audioUnavailable'));
      } else {
        setAudioError(t('audioError'));
      }
    } finally {
      setLoadingAudio(false);
    }
  }, [guidance.text, t]);

  const handleWorse = async () => {
    setEscalating(true);
    try {
      await onWorse(worseText || 'This is making things worse.');
    } catch {
      // continue regardless
    } finally {
      setEscalating(false);
      setShowWorseForm(false);
      setWorseText('');
    }
  };

  const durLabel = guidance.duration === 30 ? t('dur30') : guidance.duration === 60 ? t('dur60') : t('dur180');

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
        <p className="text-stone-700 leading-relaxed text-sm whitespace-pre-wrap">{guidance.text}</p>
        {guidance.isPreset && (
          <p className="text-xs text-stone-400 mt-4">{durLabel}</p>
        )}
      </div>

      <div className="space-y-2">
        {!audioUrl ? (
          <button
            onClick={loadAudio}
            disabled={loadingAudio}
            className="w-full py-2.5 text-sm text-stone-600 bg-stone-100 rounded hover:bg-stone-200 disabled:opacity-50 transition-colors"
          >
            {loadingAudio ? t('loadingAudio') : t('playAudio')}
          </button>
        ) : (
          <audio ref={audioRef} src={audioUrl} controls className="w-full" onEnded={() => {}} />
        )}
        {audioError && <p className="text-xs text-stone-400">{audioError}</p>}
      </div>

      {!showWorseForm ? (
        <button
          onClick={() => setShowWorseForm(true)}
          className="w-full py-2.5 text-sm text-stone-500 border border-stone-200 rounded hover:border-stone-400 hover:text-stone-700 transition-colors"
        >
          {t('worseBtn')}
        </button>
      ) : (
        <div className="border border-stone-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-stone-600">{t('worseTitle')}</p>
          <textarea
            value={worseText}
            onChange={e => setWorseText(e.target.value)}
            placeholder={t('worsePlaceholder')}
            rows={2}
            maxLength={300}
            className="w-full px-3 py-2 text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded resize-none focus:outline-none focus:border-stone-400 placeholder:text-stone-300"
          />
          <div className="flex gap-2">
            <button
              onClick={handleWorse}
              disabled={escalating}
              className="flex-1 py-2 text-sm text-white bg-[#6b8271] rounded hover:bg-[#5a7060] disabled:opacity-50 transition-colors"
            >
              {escalating ? t('adjusting') : t('adjustOrStop')}
            </button>
            <button
              onClick={() => setShowWorseForm(false)}
              className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onEnd}
        className="w-full py-3 text-sm text-stone-600 hover:text-stone-800 transition-colors"
      >
        {t('done')}
      </button>
    </div>
  );
}
