import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  addVoiceListener,
  cancelVoiceListening,
  cancelVoiceRecording,
  isVoiceModulePresent,
  isVoiceSupported,
  startVoiceListening,
  startVoiceRecording,
  stopVoiceListening,
  stopVoiceRecording,
} from "voice-input";
import { loadApiKeys } from "../../ide/services/configService";
import { transcribeVoiceAudio } from "./voiceTranscribe";

interface UseVoiceInputOpts {
  /** Current chatbox text (kept in a ref internally — never stale). */
  input: string;
  /** Chat session setInput: dictated text lands here. */
  onText: (text: string) => void;
  /** Async failures (no API key, transcription errors). */
  onError?: (message: string) => void;
}

/**
 * Dictation for the chatbox, two engines:
 * - Devices with a system SpeechRecognizer: free on-device streaming with
 *   live partial transcripts.
 * - Everyone else: records a clip and transcribes it with the user's own
 *   Gemini key (already configured for chat).
 *
 * Partial/final results only claim an untouched box — they never clobber
 * typed text; finals append with a separating space.
 */
export function useVoiceInput({ input, onText, onError }: UseVoiceInputOpts) {
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const engineRef = useRef<"speech" | "record" | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const appendText = useCallback((t: string) => {
    const clean = t.trim();
    if (!clean) return;
    const cur = inputRef.current;
    onTextRef.current(cur && !cur.endsWith(" ") ? cur + " " + clean : cur + clean);
  }, []);

  useEffect(() => {
    let alive = true;
    isVoiceSupported()
      .then((v) => {
        if (alive) setSpeechSupported(v);
      })
      .catch(() => {});
    const subs = [
      addVoiceListener("onVoiceState", (e: any) => {
        if (engineRef.current === "speech") {
          setListening(e?.state === "listening");
        }
      }),
      addVoiceListener("onVoicePartial", (e: any) => {
        const t = String(e?.text ?? "");
        if (t && !inputRef.current) onTextRef.current(t);
      }),
      addVoiceListener("onVoiceFinal", (e: any) => {
        appendText(String(e?.text ?? ""));
        engineRef.current = null;
        setListening(false);
      }),
      addVoiceListener("onVoiceError", () => {
        engineRef.current = null;
        setListening(false);
      }),
    ];
    return () => {
      alive = false;
      subs.forEach((s) => s.remove());
      cancelVoiceListening();
      cancelVoiceRecording();
    };
  }, [appendText]);

  const finishRecording = useCallback(async () => {
    const path = await stopVoiceRecording();
    engineRef.current = null;
    setListening(false);
    if (!path) return;
    setTranscribing(true);
    try {
      const keys = await loadApiKeys();
      if (!keys.length) {
        onErrorRef.current?.(
          "Add a Gemini API key in Settings to use voice input."
        );
        return;
      }
      const text = await transcribeVoiceAudio(path, keys[0]);
      if (text) appendText(text);
      else onErrorRef.current?.("Couldn't hear anything — try again.");
    } catch (e: any) {
      onErrorRef.current?.(e?.message || "Voice transcription failed.");
    } finally {
      setTranscribing(false);
    }
  }, [appendText]);

  const toggleVoice = useCallback(async (): Promise<string | null> => {
    if (transcribing) return null;
    if (listening) {
      if (engineRef.current === "record") await finishRecording();
      else {
        stopVoiceListening();
        engineRef.current = null;
        setListening(false);
      }
      return null;
    }
    if (Platform.OS === "android") {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        return "Microphone permission denied — enable it in system settings.";
      }
    }
    if (speechSupported) {
      const ok = await startVoiceListening();
      if (!ok) return "Voice input isn't available on this device.";
      engineRef.current = "speech";
      return null;
    }
    const path = await startVoiceRecording();
    if (!path) return "Couldn't access the microphone.";
    engineRef.current = "record";
    setListening(true);
    return null;
  }, [listening, transcribing, speechSupported, finishRecording]);

  return {
    // Mic shows whenever the native module is compiled in — speech-capable
    // devices stream on-device, the rest record + transcribe via Gemini key.
    voiceSupported: isVoiceModulePresent(),
    voiceListening: listening,
    voiceTranscribing: transcribing,
    toggleVoice,
  };
}
