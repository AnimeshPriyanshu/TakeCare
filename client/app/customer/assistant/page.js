"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Info,
  Mic,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
import {
  convertToWav,
  MAX_RECORDING_SECONDS,
  pickRecordingMimeType,
} from "@/lib/audio";
import { timeAgo } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormattedText from "@/components/ui/FormattedText";
import Spinner from "@/components/ui/Spinner";

const STARTERS = [
  "How many tablets do I have left?",
  "Which medicines are running low?",
  "Show my pending requests",
  "Find a pharmacy listing Amoxicillin",
  "I purchased 10 more tablets of Metformin",
];

const VOICE_LANGUAGES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "हिन्दी / Hinglish" },
];

const WELCOME = {
  id: "welcome",
  role: "ASSISTANT",
  content:
    "Hello! I am the TakeCare demo assistant. I read your live inventory, requests and the pharmacy directory.\n\nTry asking about your stock, low-stock medicines, pending requests or pharmacy availability. I will always ask before saving an inventory change, and I never give dosage or medical advice.",
};

let localId = 0;
const nextId = () => `local-${++localId}`;

function formatDuration(seconds) {
  return `0:${String(Math.min(seconds, MAX_RECORDING_SECONDS)).padStart(2, "0")}`;
}

function ActionCard({ message, onResolve }) {
  const toast = useToast();
  const [working, setWorking] = useState("");
  const action = message.action;
  if (!action) return null;

  if (message.resolved) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        {message.resolved}
      </div>
    );
  }

  async function resolve(kind) {
    setWorking(kind);
    try {
      const result = await api.post(`/ai/actions/${action.id}/${kind}`);
      onResolve(message.id, kind, result);
    } catch (err) {
      toast.error(
        kind === "confirm" ? "Could not confirm" : "Could not cancel",
        err.message,
      );
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-white p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        Needs your confirmation
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{action.summary}</p>
      <p className="mt-1 text-xs text-slate-500">
        Nothing is saved until you confirm. This action expires in 15 minutes.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="success"
          loading={working === "confirm"}
          disabled={Boolean(working)}
          onClick={() => resolve("confirm")}
          icon={CheckCircle2}
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={working === "cancel"}
          disabled={Boolean(working)}
          onClick={() => resolve("cancel")}
          icon={X}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const toast = useToast();
  const historyApi = useApi("/ai/history");
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState(STARTERS);
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const autoStopRef = useRef(null);

  useEffect(() => {
    if (historyApi.error) {
      setMessages((current) => current ?? [WELCOME]);
      return;
    }
    if (!historyApi.data) return;
    const persisted = historyApi.data.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }));
    setMessages(persisted.length > 0 ? persisted : [WELCOME]);
  }, [historyApi.data, historyApi.error]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, recording, transcribing]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(autoStopRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
    };
  }, []);

  function cleanupRecording() {
    clearInterval(timerRef.current);
    clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
  }

  async function transcribeBlob(blob, filename) {
    setTranscribing(true);
    setTranscription(null);
    try {
      const converted = await convertToWav(blob);
      if (converted.trimmed) {
        toast.info(
          "Audio trimmed",
          `Only the first ${MAX_RECORDING_SECONDS} seconds were transcribed.`,
        );
      }
      const form = new FormData();
      form.append("audio_file", converted.blob, filename || "voice-message.wav");
      form.append("language_code", voiceLanguage);
      const result = await api.postForm("/ai/transcribe", form);
      setInput((current) => {
        const existing = current.trim();
        const combined = existing ? `${existing} ${result.transcript}` : result.transcript;
        return combined.slice(0, 500);
      });
      setTranscription({
        model: result.model,
        languageCode: result.languageCode,
        provider: result.provider,
      });
      toast.success("Voice added", "Review and edit the transcript before sending.");
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      toast.error("Could not transcribe audio", err.message);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleAudioFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Audio is too large", "Choose a file smaller than 25 MB.");
      return;
    }
    await transcribeBlob(file, file.name || "audio-upload");
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupRecording();
    }
  }

  async function startRecording() {
    if (recording || transcribing || sending) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(
        "Recording unavailable",
        "Use the audio upload button instead.",
      );
      return;
    }

    setTranscription(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        cleanupRecording();
        if (!chunks.length) return;
        transcribeBlob(new Blob(chunks, { type: blobType }), "voice-message.wav");
      };

      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) =>
          Math.min(seconds + 1, MAX_RECORDING_SECONDS),
        );
      }, 1000);
      autoStopRef.current = setTimeout(
        stopRecording,
        MAX_RECORDING_SECONDS * 1000,
      );
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      cleanupRecording();
      toast.error(
        "Microphone unavailable",
        "Allow microphone access or upload an audio file.",
      );
    }
  }

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending || recording || transcribing) return;
    setInput("");
    setSuggestions([]);
    setTranscription(null);
    const userMessage = {
      id: nextId(),
      role: "USER",
      content: value,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...(current ?? []), userMessage]);
    setSending(true);
    try {
      const result = await api.post("/ai/chat", { message: value });
      setMessages((current) => [
        ...(current ?? []),
        {
          id: result.messageId || nextId(),
          role: "ASSISTANT",
          content: result.reply,
          createdAt: new Date().toISOString(),
          action: result.action,
        },
      ]);
      if (result.suggestions?.length) setSuggestions(result.suggestions);
    } catch (err) {
      setMessages((current) => [
        ...(current ?? []),
        {
          id: nextId(),
          role: "ASSISTANT",
          content: `I could not reach the TakeCare API. ${err.message}`,
          createdAt: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleActionResolved(messageId, kind, result) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              resolved:
                kind === "confirm"
                  ? result.message || "Saved."
                  : result.message || "Cancelled. Inventory unchanged.",
            }
          : message,
      ),
    );
    toast.success(
      kind === "confirm" ? "Confirmed" : "Cancelled",
      result.message || "No inventory was changed.",
    );
    if (kind === "confirm") {
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "ASSISTANT",
          content: `Done. ${result.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Grounded assistant"
        title="TakeCare assistant"
        description="Ask questions about your own inventory, requests and registered pharmacy availability."
        actions={
          <Badge tone="amber">
            <Info className="h-3.5 w-3.5" />
            Demo reasoning · live Prisma STT
          </Badge>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p className="text-xs leading-relaxed text-sky-800">
          Text answers come from a deterministic demo engine over live TakeCare data. Voice
          messages are transcribed by <strong>Gnani Prisma v2.5</strong> and inserted into
          the input for you to review and edit. A transcript never changes inventory on its
          own; every stock update still requires explicit confirmation. The assistant never
          provides medical or dosage advice.
        </p>
      </div>

      <Card className="flex h-[calc(100vh-19rem)] min-h-[32rem] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles className="h-4.5 w-4.5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">TakeCare assistant</p>
              <p className="text-[11px] text-slate-400">Live data · confirmation required</p>
            </div>
          </div>
          <Badge tone="brand">Demo</Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {messages === null ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "USER";
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isUser
                        ? "bg-slate-900 text-white"
                        : message.error
                          ? "bg-rose-100 text-rose-600"
                          : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {isUser ? "You" : <Sparkles className="h-4 w-4" />}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
                      isUser
                        ? "rounded-tr-sm bg-brand-600 text-white"
                        : message.error
                          ? "rounded-tl-sm border border-rose-200 bg-rose-50 text-slate-700"
                          : "rounded-tl-sm border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    ) : (
                      <FormattedText text={message.content} />
                    )}
                    {!isUser && message.action ? (
                      <ActionCard message={message} onResolve={handleActionResolved} />
                    ) : null}
                    {!isUser && message.createdAt ? (
                      <p className="mt-2 text-[10px] text-slate-400">
                        {timeAgo(message.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}

          {sending ? (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3.5">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${dot * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <label
              htmlFor="voice-language"
              className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
            >
              Voice
            </label>
            <select
              id="voice-language"
              value={voiceLanguage}
              onChange={(event) => setVoiceLanguage(event.target.value)}
              disabled={recording || transcribing}
              className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none transition focus:border-brand-500 disabled:opacity-60"
            >
              {VOICE_LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400">
              {recording ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                  Recording {formatDuration(recordingSeconds)} / 0:30
                </span>
              ) : transcribing ? (
                "Transcribing with Prisma v2.5…"
              ) : transcription ? (
                <span className="font-medium text-brand-700">
                  {transcription.model} · review before sending
                </span>
              ) : (
                "Max 30s · converted locally to WAV"
              )}
            </span>
          </div>

          {suggestions.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={sending || recording || transcribing}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/wav,audio/mpeg,audio/ogg,audio/flac,audio/aac,audio/mp4,.wav,.mp3,.ogg,.flac,.aac,.m4a"
              className="hidden"
              onChange={handleAudioFile}
            />
            <Button
              variant={recording ? "danger" : "secondary"}
              size="md"
              className="h-11 w-11 shrink-0 px-0"
              onClick={recording ? stopRecording : startRecording}
              disabled={sending || transcribing}
              aria-label={recording ? "Stop recording and transcribe" : "Record voice message"}
              title={recording ? "Stop recording and transcribe" : "Record voice message"}
            >
              {recording ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="h-11 w-11 shrink-0 px-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={recording || sending || transcribing}
              loading={transcribing}
              aria-label="Upload audio file"
              title="Upload audio file"
            >
              {transcribing ? null : <Paperclip className="h-4 w-4" />}
            </Button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              placeholder="Ask about your medicines, requests or a pharmacy…"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />
            <Button
              size="md"
              className="h-11 w-11 shrink-0 px-0"
              onClick={() => send()}
              disabled={!input.trim() || sending || recording || transcribing}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-400">
            Not medical advice. TakeCare never recommends or changes a prescribed dosage.
          </p>
        </div>
      </Card>
    </div>
  );
}
