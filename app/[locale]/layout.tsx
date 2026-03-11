import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Nav } from '@/components/Nav';

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return {
    title: t('brand'),
    description: 'A supervision-first mindfulness app — not a teacher, a safety monitor.',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${geist.variable} font-sans antialiased`} style={{ backgroundColor: '#faf7f2', color: '#3d3530' }}>
        <NextIntlClientProvider messages={messages}>
          <Nav />
          <main className="max-w-2xl mx-auto px-6 py-12">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
