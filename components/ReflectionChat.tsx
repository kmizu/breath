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

export function ReflectionChat({ locale, onDone, loading: externalLoading }: ReflectionChatProps) {
  const t = useTranslations('reflection');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [crisis, setCrisis] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Kick off the conversation with an empty message list to get the opening question
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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
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

      const withAgent: ConversationMessage[] = [
        ...updated,
        { role: 'agent', content: result.agentMessage },
      ];
      setMessages(withAgent);

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

  if (crisis) {
    return <CrisisBanner />;
  }

  const busy = loading || (externalLoading ?? false);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="space-y-4 min-h-[180px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'agent'
                  ? 'bg-stone-50 text-stone-700 rounded-tl-sm border border-stone-100'
                  : 'bg-[#6b8271] text-white rounded-tr-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && messages.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-stone-50 border border-stone-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <span className="inline-flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {loading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-stone-50 border border-stone-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <span className="inline-flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          rows={2}
          disabled={busy}
          className="flex-1 px-4 py-3 text-sm text-stone-700 bg-white border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-300 disabled:opacity-50 transition-opacity"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || busy}
          className="px-4 py-3 text-sm text-white bg-[#6b8271] rounded-xl hover:bg-[#5a7060] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('send')}
        </button>
      </div>
    </div>
  );
}
