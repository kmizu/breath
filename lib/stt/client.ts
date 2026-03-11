export function isSTTConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export async function speechToText(audioBuffer: Buffer, language?: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model_id', 'scribe_v1');
  if (language) formData.append('language_code', language);

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`ElevenLabs STT error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.text ?? '').trim();
}
