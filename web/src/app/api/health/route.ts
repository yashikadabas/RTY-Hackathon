import { isDemo } from "@/lib/demo";
import { hasElevenLabs } from "@/lib/elevenlabs";
import { hasFal } from "@/lib/fal";
import { hasGoogleKey } from "@/lib/google";
import { llmProvider } from "@/lib/openai";

export const runtime = "nodejs";

/** Which providers are configured (booleans only, never key values). */
export async function GET() {
  return Response.json(
    {
      demo: isDemo(),
      llm: llmProvider(),
      providers: {
        llm: llmProvider() !== null,
        google: hasGoogleKey(),
        streetViewInteractive: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY),
        fal: hasFal(),
        elevenlabs: hasElevenLabs(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
