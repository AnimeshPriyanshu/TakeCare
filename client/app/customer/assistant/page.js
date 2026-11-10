"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Info,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/ToastContext";
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

const WELCOME = {
  id: "welcome",
  role: "ASSISTANT",
  content:
    "Hello! I am the TakeCare demo assistant. I read your live inventory, requests and the pharmacy directory.\n\nTry asking about your stock, low-stock medicines, pending requests or pharmacy availability. I will always ask before saving an inventory change, and I never give dosage or medical advice.",
};

let localId = 0;
const nextId = () => `local-${++localId}`;

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
  const scrollRef = useRef(null);

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
  }, [messages, sending]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput("");
    setSuggestions([]);
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
            Demo mode · not a live LLM
          </Badge>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p className="text-xs leading-relaxed text-sky-800">
          This assistant is a deterministic demo engine that reads live TakeCare data. It is
          not a live AI model and does not fabricate stock, availability or statuses. It
          never changes inventory without an explicit confirmation and never provides
          medical or dosage advice.
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
          {suggestions.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={sending}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
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
              disabled={!input.trim() || sending}
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
