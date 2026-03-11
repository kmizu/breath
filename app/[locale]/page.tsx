import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { isLLMConfigured } from '@/lib/llm/client';
import { isTTSConfigured } from '@/lib/tts/client';

export default async function Home() {
  const t = await getTranslations('home');
  const llmOk = isLLMConfigured();
  const ttsOk = isTTSConfigured();

  const watchItems = t.raw('watchItems') as string[];
  const doesNotItems = t.raw('doesNotItems') as string[];

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h1 className="text-2xl font-light text-stone-800">{t('title')}</h1>
        <p className="text-stone-500 leading-relaxed max-w-md">{t('subtitle')}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-stone-600">{t('watchesFor')}</p>
        <ul className="space-y-1.5 text-sm text-stone-500">
          {watchItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-stone-600">{t('doesNotDo')}</p>
        <ul className="space-y-1.5 text-sm text-stone-500">
          {doesNotItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>

      <div>
        <Link
          href="/session"
          className="inline-block px-6 py-3 text-sm text-white bg-[#6b8271] rounded hover:bg-[#5a7060] transition-colors"
        >
          {t('startSession')}
        </Link>
      </div>

      <div className="border-t border-stone-100 pt-6 space-y-1">
        <p className="text-xs text-stone-400">
          {llmOk ? t('llmActive') : t('llmInactive')}
        </p>
        <p className="text-xs text-stone-400">
          {ttsOk ? t('ttsActive') : t('ttsInactive')}
        </p>
      </div>
    </div>
  );
}
