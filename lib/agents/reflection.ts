import type { ConversationMessage, ReflectionProfile, UserMemory } from './types';
import { detectCrisis } from '@/lib/supervisor/rules';
import { completeChat, complete, isLLMConfigured } from '@/lib/llm/client';
import { buildReflectionSystemPrompt, buildExtractionPrompt } from '@/prompts/reflection';

export interface ReflectionTurnResult {
  readonly agentMessage: string;
  readonly userTurnCount: number;
  readonly done: boolean;
  readonly crisis: boolean;
  readonly profile?: ReflectionProfile;
}

// ── Scripted fallback (no LLM) ────────────────────────────────────────────────

const SCRIPTED = {
  en: [
    "Hi. How are you feeling right now? Take a moment — there's no rush.",
    "Thanks for sharing. Is there anything weighing on you today — something in your body, your mind, or just a general feeling?",
    "One last thing — what would feel most useful right now? Calming down, grounding, or just checking in?",
  ],
  ja: [
    "こんにちは。今、どんな気持ちですか？ゆっくり教えてください。",
    "ありがとう。今日、特に気になっていることはありますか？体の感覚でも、気持ちのことでも、なんとなくでも。",
    "最後にひとつ — 今日は何が一番役立ちそうですか？落ち着くこと、グラウンディング、それとも確認するだけ？",
  ],
} as const;

const SCRIPTED_DONE = {
  en: "Thanks for sharing. Let me check what might work well for you today.",
  ja: "ありがとう、話してくれて。今日の練習を確認しますね。",
} as const;

function scriptedTurn(
  messages: readonly ConversationMessage[],
  locale: string
): ReflectionTurnResult {
  const questions = SCRIPTED[locale as keyof typeof SCRIPTED] ?? SCRIPTED.en;
  const userTurnCount = countUserTurns(messages);

  if (userTurnCount < questions.length) {
    return {
      agentMessage: questions[userTurnCount],
      userTurnCount,
      done: false,
      crisis: false,
    };
  }

  const profile = heuristicProfile(messages, locale);
  const closingMsg = SCRIPTED_DONE[locale as keyof typeof SCRIPTED_DONE] ?? SCRIPTED_DONE.en;
  return { agentMessage: closingMsg, userTurnCount, done: true, crisis: false, profile };
}

function heuristicProfile(
  messages: readonly ConversationMessage[],
  locale: string
): ReflectionProfile {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  const HIGH_TENSION = ['stress', 'anxious', 'anxiety', 'worried', 'nervous', 'overwhelm',
    'exhaust', 'tired', 'heavy', 'ストレス', '不安', '疲れ', '心配', 'しんどい', 'きつい'];
  const LOW_TENSION = ['good', 'fine', 'okay', 'calm', 'peaceful', 'comfortable',
    '元気', '大丈夫', '落ち着き', 'いい', 'のんびり'];
  const SELF_CRITICAL = ['fail', 'bad', 'wrong', 'should have', 'must', 'ダメ', 'できない', 'だめ', '失敗'];

  const tensionHits = HIGH_TENSION.filter(w => userText.includes(w)).length;
  const calmHits = LOW_TENSION.filter(w => userText.includes(w)).length;
  const criticalHits = SELF_CRITICAL.filter(w => userText.includes(w)).length;

  let tension: 1 | 2 | 3 | 4 | 5 = 3;
  if (tensionHits >= 3) tension = 5;
  else if (tensionHits >= 1) tension = 4;
  else if (calmHits >= 2) tension = 2;
  else if (calmHits >= 1) tension = 2;

  const mood = Math.max(1, Math.min(5, 6 - tension)) as 1 | 2 | 3 | 4 | 5;

  const lastUser = messages.filter(m => m.role === 'user').at(-1)?.content.toLowerCase() ?? '';
  let intent: ReflectionProfile['intent'] = 'checkin';
  if (/calm|breath|relax|落ち着|呼吸/.test(lastUser)) intent = 'calming';
  else if (/ground|body|earth|体|グラウンド/.test(lastUser)) intent = 'grounding';

  return {
    mood,
    tension,
    selfCritical: criticalHits > 0,
    intent,
    freeText: messages.filter(m => m.role === 'user').map(m => m.content).join(' ').slice(0, 300),
    themes: [],
    anchors: [],
    emotionalTone: tension >= 4 ? 'distressed' : mood >= 4 ? 'positive' : 'neutral',
  };
}

// ── Main turn function ─────────────────────────────────────────────────────────

export async function reflectionTurn(
  messages: readonly ConversationMessage[],
  locale: string,
  hasHistory: boolean,
  memory: UserMemory | null
): Promise<ReflectionTurnResult> {
  // Crisis check on latest user message — synchronous, before any LLM call
  if (messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === 'user' && detectCrisis(last.content)) {
      return {
        agentMessage: locale === 'ja'
          ? 'このアプリは今必要なサポートを提供できません。信頼できる人や危機相談窓口に連絡してください。'
          : "This app isn't the right support for what you're going through. Please reach out to someone you trust or a crisis line.",
        userTurnCount: countUserTurns(messages),
        done: false,
        crisis: true,
      };
    }
  }

  // Scripted fallback when LLM not available
  if (!isLLMConfigured()) {
    return scriptedTurn(messages, locale);
  }

  const systemPrompt = buildReflectionSystemPrompt(locale, hasHistory, memory ?? undefined);
  const chatHistory = messages.map(m => ({
    role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  try {
    const raw = await completeChat(systemPrompt, chatHistory, 200);
    const userTurnCount = countUserTurns(messages);

    if (raw.includes('[CRISIS_DETECTED]')) {
      return {
        agentMessage: locale === 'ja'
          ? 'このアプリは今必要なサポートを提供できません。信頼できる人や危機相談窓口に連絡してください。'
          : "This app isn't the right support for what you're going through. Please reach out to someone you trust or a crisis line.",
        userTurnCount,
        done: false,
        crisis: true,
      };
    }

    const cleanMessage = raw
      .replace('[REFLECTION_COMPLETE]', '')
      .replace('[CRISIS_DETECTED]', '')
      .trim();

    const isDone = raw.includes('[REFLECTION_COMPLETE]') || userTurnCount >= 3;

    if (isDone) {
      const fullConversation: readonly ConversationMessage[] = [
        ...messages,
        { role: 'agent', content: cleanMessage },
      ];
      const profile = await extractProfile(fullConversation, locale);
      return { agentMessage: cleanMessage, userTurnCount, done: true, crisis: false, profile };
    }

    return { agentMessage: cleanMessage, userTurnCount, done: false, crisis: false };
  } catch {
    // LLM call failed — fall back to scripted
    return scriptedTurn(messages, locale);
  }
}

async function extractProfile(
  messages: readonly ConversationMessage[],
  locale: string
): Promise<ReflectionProfile> {
  try {
    const prompt = buildExtractionPrompt(messages, locale);
    const raw = await complete('You extract structured data from conversations. Return only valid JSON.', prompt, 400);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return heuristicProfile(messages, locale);

    const p = JSON.parse(jsonMatch[0]);
    const clamp = (v: unknown, fallback: number): 1 | 2 | 3 | 4 | 5 =>
      Math.max(1, Math.min(5, typeof v === 'number' ? Math.round(v) : fallback)) as 1 | 2 | 3 | 4 | 5;

    return {
      mood: clamp(p.mood, 3),
      tension: clamp(p.tension, 3),
      selfCritical: Boolean(p.selfCritical),
      intent: ['calming', 'grounding', 'checkin'].includes(p.intent) ? p.intent : 'checkin',
      emotionalTone: ['distressed', 'neutral', 'positive', 'mixed'].includes(p.emotionalTone)
        ? p.emotionalTone : 'neutral',
      freeText: typeof p.freeText === 'string' ? p.freeText : '',
      themes: Array.isArray(p.themes) ? p.themes : [],
      anchors: Array.isArray(p.anchors) ? p.anchors : [],
    };
  } catch {
    return heuristicProfile(messages, locale);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function checkinToProfile(data: {
  mood: 1 | 2 | 3 | 4 | 5;
  tension: 1 | 2 | 3 | 4 | 5;
  selfCritical: boolean;
  intent: 'calming' | 'grounding' | 'checkin';
  lastSessionOutcome?: 'relieving' | 'neutral' | 'pressuring';
  freeText?: string;
}): ReflectionProfile {
  const tone = data.tension >= 4 ? 'distressed' : data.mood >= 4 ? 'positive' : 'neutral';
  return {
    mood: data.mood,
    tension: data.tension,
    selfCritical: data.selfCritical,
    intent: data.intent,
    lastSessionOutcome: data.lastSessionOutcome,
    freeText: data.freeText ?? '',
    themes: [],
    anchors: [],
    emotionalTone: tone as ReflectionProfile['emotionalTone'],
  };
}

function countUserTurns(messages: readonly ConversationMessage[]): number {
  return messages.filter(m => m.role === 'user').length;
}
