"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useCallback } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const LOGS_STORAGE_KEY = "refund-agent-logs";

interface StoredLog {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
  status: "in_progress" | "completed" | "error";
}

function saveLogsToStorage(logs: StoredLog[]): void {
  try {
    const existing = getLogsFromStorage();
    const existingById = new Map(existing.map((l) => [l.id, l]));
    for (const log of logs) {
      existingById.set(log.id, log);
    }
    const merged = Array.from(existingById.values()).slice(-200);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // localStorage may be full or unavailable
  }
}

function getLogsFromStorage(): StoredLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function extractToolLogs(messages: { role: string; parts: { type: string; [key: string]: unknown }[] }[]): StoredLog[] {
  const logs: StoredLog[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) continue;
      const toolName = part.type.replace("tool-", "");
      const state = part.state as string;
      const input = (part.input ?? {}) as Record<string, unknown>;
      const output = part.output ?? null;
      const toolCallId = (part.toolCallId as string) ?? "";
      logs.push({
        id: `client-${toolCallId}`,
        toolName,
        input,
        output,
        timestamp: new Date().toISOString(),
        status: state === "output-available" ? "completed" : state === "output-error" ? "error" : "in_progress",
      });
    }
  }
  return logs;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  if (window.SpeechRecognition) return window.SpeechRecognition;
  if (window.webkitSpeechRecognition) return window.webkitSpeechRecognition;
  return null;
}

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isGenerating = status === "streaming" || status === "submitted";
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() !== null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognitionAPI = getSpeechRecognition();
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }, [isListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (document.activeElement === inputRef.current) return;
      e.preventDefault();
      toggleListening();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const logs = extractToolLogs(messages);
    if (logs.length > 0) {
      saveLogsToStorage(logs);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (isListening) stopListening();
    sendMessage({ text: input });
    setInput("");
  };

  const getTextFromParts = (parts: { type: string; text?: string }[]) => {
    return parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Refund Support Agent
            </h1>
            <p className="text-sm text-gray-500">
              Ask about your refund request
            </p>
          </div>
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Admin Dashboard
          </a>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg font-medium">How can I help you today?</p>
              <p className="text-sm mt-2">
                Try: &quot;I want a refund for customer C001&quot;
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  {isUser ? (
                    <p>{getTextFromParts(message.parts)}</p>
                  ) : (
                    <div className="space-y-1">
                      {message.parts.filter((part) => part.type === "text").length > 0 && (
                        <p className="whitespace-pre-wrap">
                          {message.parts
                            .filter((part) => part.type === "text")
                            .map((part) => part.text)
                            .join("")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-sm">Agent is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex gap-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your refund request..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isGenerating}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="bg-blue-600 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
          {isListening && (
            <p className="text-xs text-red-500 mt-2 ml-1">Listening...</p>
          )}
        </div>
      </footer>
    </div>
  );
}
