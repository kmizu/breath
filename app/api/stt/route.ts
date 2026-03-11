import { NextRequest, NextResponse } from 'next/server';
import { isSTTConfigured, speechToText } from '@/lib/stt/client';

export async function POST(req: NextRequest) {
  if (!isSTTConfigured()) {
    return NextResponse.json({ success: false, error: 'STT not configured' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as Blob | null;
    const locale = formData.get('locale') as string | null;

    if (!audio) {
      return NextResponse.json({ success: false, error: 'No audio provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const language = locale === 'ja' ? 'ja' : 'en';
    const text = await speechToText(buffer, language);

    return NextResponse.json({ success: true, data: { text } });
  } catch (err) {
    console.error('[stt] Error:', err);
    return NextResponse.json({ success: false, error: 'Transcription failed' }, { status: 500 });
  }
}
