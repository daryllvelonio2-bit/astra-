import * as FileSystem from "expo-file-system/legacy";

// Cheap, fast, audio-capable — pinned so chat model changes can't break mic.
const TRANSCRIBE_MODEL = "gemini-3.1-flash-lite";

/**
 * Transcribes a recorded voice clip with the user's own Gemini key (the same
 * keys already configured for chat). Audio goes to Google's Generative
 * Language API as multimodal input; only the returned transcript is kept.
 */
export async function transcribeVoiceAudio(
  filePath: string,
  apiKey: string
): Promise<string> {
  // Native returns a raw absolute path; Expo FileSystem requires a URI.
  const uri = filePath.startsWith("file://") ? filePath : `file://${filePath}`;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (_) {
    // Best-effort cache cleanup; transcription proceeds regardless.
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TRANSCRIBE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Transcribe the speech in this audio clip exactly, in its original language. Output only the transcription, no commentary or quotation marks.",
              },
              { inlineData: { mimeType: "audio/mp4", data: base64 } },
            ],
          },
        ],
      }),
    }
  );
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson: any = await res.json();
      const msg = errJson?.error?.message;
      if (msg) detail += ` — ${msg}`;
    } catch (_) {
      // Fall through with the bare status.
    }
    throw new Error(`Transcription failed (${detail})`);
  }
  const json: any = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}
