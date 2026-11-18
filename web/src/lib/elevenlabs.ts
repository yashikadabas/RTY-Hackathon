import "server-only";

export function hasElevenLabs() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

// "Rachel": a warm default narration voice.
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

/** Speak the whole monologue in one request. Returns null on any failure. */
export async function tts(text: string): Promise<Buffer | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !text.trim()) return null;
  const voice = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 0.97,
          },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
