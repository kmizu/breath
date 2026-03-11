'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { ConversationMessage, ReflectionProfile } from '@/lib/types';
import { CrisisBanner } from './CrisisBanner';

interface ReflectionChatProps {
  locale: string;
  onDone: (profile: ReflectionProfile) => void;
  loading?: boolean;
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={i === 0 ? 'dot-pulse' : i === 1 ? 'dot-pulse-2' : 'dot-pulse-3'}
          style={{
            display: 'inline-block',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'var(--sage)',
            opacity: 0.5,
          }}
        />
      ))}
    </span>
  );
}

function AgentMessage({ content }: { content: string }) {
  return (
    <div className="animate-fade-up" style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', marginBottom: '1.6rem' }}>
      <div style={{
        flexShrink: 0,
        marginTop: '0.2rem',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'var(--sage-l)',
        border: '1px solid #c8d9ca',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--sage)', lineHeight: 1 }}>●</span>
      </div>
      <div style={{ flex: 1, paddingTop: '0.15rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.85, fontWeight: 300 }}>
          {content}
        </p>
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.6rem' }}>
      <div style={{
        maxWidth: '78%',
        padding: '0.7rem 1.1rem',
        background: 'var(--warm-l)',
        borderRadius: '1.2rem 1.2rem 0.3rem 1.2rem',
        border: '1px solid #e0d8ce',
      }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.75, fontWeight: 300 }}>
          {content}
        </p>
      </div>
    </div>
  );
}

// ── Mic button ─────────────────────────────────────────────────────────────────

type RecordingState = 'idle' | 'recording' | 'transcribing';

function MicButton({ state, onToggle }: { state: RecordingState; onToggle: () => void }) {
  const isRecording = state === 'recording';
  const isTranscribing = state === 'transcribing';

  return (
    <button
      onClick={onToggle}
      disabled={isTranscribing}
      title={isRecording ? 'Stop recording' : 'Speak your response'}
      style={{
        flexShrink: 0,
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: isRecording ? '#c97070' : isTranscribing ? 'var(--cream-d)' : 'var(--warm-l)',
        border: isRecording ? 'none' : '1px solid #e0d8ce',
        cursor: isTranscribing ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
        position: 'relative',
      }}
    >
      {isRecording && (
        <span style={{
          position: 'absolute',
          inset: '-3px',
          borderRadius: '50%',
          border: '2px solid #c97070',
          opacity: 0.5,
          animation: 'mic-pulse 1.2s ease-out infinite',
        }} />
      )}
      {isTranscribing ? (
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ink-soft)' }} />
      ) : isRecording ? (
        // Stop icon (square)
        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fff' }} />
      ) : (
        // Mic icon
        <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
          <rect x="4" y="1" width="6" height="9" rx="3" fill="var(--ink-soft)" />
          <path d="M1 8c0 3.3 2.7 6 6 6s6-2.7 6-6" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <line x1="7" y1="14" x2="7" y2="15.5" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ReflectionChat({ locale, onDone, loading: externalLoading }: ReflectionChatProps) {
  const t = useTranslations('reflection');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [crisis, setCrisis] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const callReflect = useCallback(async (msgs: ConversationMessage[]) => {
    const res = await fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, locale }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'Reflection failed');
    return json.data as {
      agentMessage: string;
      done: boolean;
      crisis: boolean;
      profile?: ReflectionProfile;
    };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callReflect([])
      .then(result => {
        if (cancelled) return;
        setMessages([{ role: 'agent', content: result.agentMessage }]);
      })
      .catch(() => { if (!cancelled) setError(t('error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading || externalLoading) return;

    const userMsg: ConversationMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const result = await callReflect(updated);

      if (result.crisis) {
        setCrisis(true);
        return;
      }

      setMessages([...updated, { role: 'agent', content: result.agentMessage }]);

      if (result.done && result.profile) {
        onDone(result.profile);
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, externalLoading, messages, callReflect, onDone, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Recording ────────────────────────────────────────────────────────────────

  const toggleRecording = useCallback(async () => {
    if (recordingState === 'recording') {
      // Stop
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordingState('transcribing');

        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const form = new FormData();
          form.append('audio', blob, 'audio.webm');
          form.append('locale', locale);

          const res = await fetch('/api/stt', { method: 'POST', body: form });
          const json = await res.json();

          if (json.success && json.data.text) {
            await sendMessage(json.data.text);
          } else if (res.status === 503) {
            setError(t('sttUnavailable'));
          } else {
            setError(t('sttError'));
          }
        } catch {
          setError(t('sttError'));
        } finally {
          setRecordingState('idle');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
    } catch {
      setError(t('micError'));
    }
  }, [recordingState, locale, sendMessage, t]);

  if (crisis) return <CrisisBanner />;

  const busy = loading || (externalLoading ?? false);

  return (
    <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
      {/* Messages */}
      <div style={{ minHeight: '200px', paddingBottom: '0.5rem' }}>
        {messages.map((msg, i) =>
          msg.role === 'agent'
            ? <AgentMessage key={i} content={msg.content} />
            : <UserMessage key={i} content={msg.content} />
        )}

        {loading && (
          <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
            <div style={{
              flexShrink: 0,
              marginTop: '0.2rem',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--sage-l)',
              border: '1px solid #c8d9ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '10px', color: 'var(--sage)', lineHeight: 1 }}>●</span>
            </div>
            <div style={{ paddingTop: '0.4rem' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p style={{ fontSize: '0.8rem', color: '#b87070', margin: '0 0 1rem' }}>{error}</p>
      )}

      {/* Input area */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-end',
        padding: '0.75rem 1rem',
        background: '#fff',
        borderRadius: '1rem',
        border: recordingState === 'recording' ? '1px solid #e0b8b8' : '1px solid #e8e1d8',
        boxShadow: '0 1px 8px rgba(107, 130, 113, 0.06)',
        transition: 'border-color 0.2s',
      }}>
        <textarea
          ref={inputRef}
          value={recordingState === 'recording' ? '' : input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            recordingState === 'recording' ? (locale === 'ja' ? '話しています...' : 'Listening...') :
            recordingState === 'transcribing' ? (locale === 'ja' ? '文字起こし中...' : 'Transcribing...') :
            t('placeholder')
          }
          rows={2}
          disabled={busy || recordingState !== 'idle'}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '0.88rem',
            lineHeight: 1.7,
            color: 'var(--ink)',
            fontFamily: 'inherit',
            fontWeight: 300,
            opacity: (busy || recordingState !== 'idle') ? 0.5 : 1,
          }}
        />

        {/* Mic button */}
        <MicButton
          state={recordingState}
          onToggle={busy ? () => {} : toggleRecording}
        />

        {/* Send button */}
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || busy || recordingState !== 'idle'}
          style={{
            flexShrink: 0,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: (!input.trim() || busy || recordingState !== 'idle') ? 'var(--cream-d)' : 'var(--sage)',
            border: 'none',
            cursor: (!input.trim() || busy || recordingState !== 'idle') ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M7 1l6 6-6 6" stroke={(!input.trim() || busy || recordingState !== 'idle') ? '#b0a89e' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textAlign: 'center', marginTop: '0.75rem', opacity: 0.6 }}>
        {recordingState === 'recording'
          ? (locale === 'ja' ? 'マイクボタンで停止' : 'Tap mic to stop')
          : `Enter ↵ ${locale === 'ja' ? 'で送信' : 'to send'}`
        }
      </p>
    </div>
  );
}
