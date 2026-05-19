"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, Trash2, Loader2, Mic, MicOff, Volume2, VolumeX,
  BookOpen, CheckCircle, Circle, GraduationCap, MessageSquare,
  PenLine, Headphones, Library, X, ChevronDown, ChevronUp,
} from "lucide-react";

type Mode = "conversation" | "writing" | "speaking" | "vocabulary";

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: string;
}

interface VocabWord {
  word: string;
  definition: string;
  example: string;
  level: string;
}

interface ParsedResponse {
  message: string;
  corrections: Correction[];
  vocabulary: VocabWord[];
  encouragement?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  rawResponse?: string;
  parsed?: ParsedResponse;
  createdAt: string;
}

interface SavedWord {
  id: string;
  word: string;
  definition: string;
  example?: string;
  level: string;
  mastered: boolean;
}

const MODES: { key: Mode; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "conversation", label: "Conversation", icon: MessageSquare, desc: "Free chat with corrections" },
  { key: "writing", label: "Writing", icon: PenLine, desc: "Grammar & writing drills" },
  { key: "speaking", label: "Speaking", icon: Headphones, desc: "Speak aloud, get feedback" },
  { key: "vocabulary", label: "Vocabulary", icon: Library, desc: "Learn new words in context" },
];

const MODE_STARTERS: Record<Mode, string> = {
  conversation: "Let's have a conversation! Tell me something about yourself — your interests, what you do, or anything on your mind.",
  writing: "Welcome to writing practice! I'll give you prompts and correct your grammar in detail. Let's start: Write 3 sentences about your morning routine.",
  speaking: "Speaking mode is active! Press the microphone button 🎤, speak in English, and I'll give you feedback on your spoken English. Go ahead — introduce yourself!",
  vocabulary: "Vocabulary session! Tell me a topic you're interested in (e.g. technology, travel, food, business) and I'll teach you 5 useful words and phrases related to it.",
};

function CorrectionPanel({ corrections }: { corrections: Correction[] }) {
  if (!corrections.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Corrections</p>
      {corrections.map((c, i) => (
        <div key={i} className="text-sm space-y-0.5">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-red-400 line-through opacity-70">"{c.original}"</span>
            <span className="text-gray-500">→</span>
            <span className="text-green-400 font-medium">"{c.corrected}"</span>
            <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded capitalize">{c.type}</span>
          </div>
          <p className="text-gray-400 text-xs pl-1">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function VocabPanel({ words }: { words: VocabWord[] }) {
  if (!words.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">New Words</p>
      {words.map((v, i) => (
        <div key={i} className="text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">📚 {v.word}</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">{v.level}</span>
          </div>
          <p className="text-gray-300 text-xs mt-0.5">{v.definition}</p>
          {v.example && <p className="text-gray-500 text-xs italic mt-0.5">"{v.example}"</p>}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  msg,
  onSpeak,
  isSpeaking,
}: {
  msg: Message;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}) {
  const isUser = msg.role === "user";
  const parsed: ParsedResponse | null = msg.parsed ??
    (msg.rawResponse ? (() => { try { return JSON.parse(msg.rawResponse!); } catch { return null; } })() : null);
  const [showDetails, setShowDetails] = useState(true);

  const hasExtras = parsed && (parsed.corrections?.length > 0 || parsed.vocabulary?.length > 0);

  return (
    <div dir="ltr" className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
          isUser ? "bg-emerald-600 text-white" : "bg-gradient-to-br from-blue-600 to-cyan-600 text-white"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>

      <div className="max-w-[80%] space-y-1">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-emerald-600 text-white rounded-tr-sm"
              : "bg-gray-800 text-gray-100 rounded-tl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap">{msg.content}</p>
          {!isUser && parsed?.encouragement && (
            <p className="mt-2 text-xs text-cyan-300 italic">✨ {parsed.encouragement}</p>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <button
              onClick={() => onSpeak(msg.content)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                isSpeaking
                  ? "bg-cyan-600/30 text-cyan-400"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
              }`}
            >
              {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{isSpeaking ? "Stop" : "Listen"}</span>
            </button>
            {hasExtras && (
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{showDetails ? "Hide details" : "Show details"}</span>
              </button>
            )}
          </div>
        )}

        {!isUser && parsed && showDetails && (
          <>
            <CorrectionPanel corrections={parsed.corrections ?? []} />
            <VocabPanel words={parsed.vocabulary ?? []} />
          </>
        )}

        <p className="text-xs text-gray-600 px-1">
          {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function WordCard({ word, onToggle }: { word: SavedWord; onToggle: () => void }) {
  return (
    <div className={`rounded-xl p-3 border transition-colors ${word.mastered ? "border-green-500/30 bg-green-500/5" : "border-gray-700 bg-gray-800/50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{word.word}</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">{word.level}</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{word.definition}</p>
          {word.example && <p className="text-gray-600 text-xs italic mt-0.5">"{word.example}"</p>}
        </div>
        <button onClick={onToggle} className="flex-shrink-0 mt-0.5">
          {word.mastered
            ? <CheckCircle size={16} className="text-green-400" />
            : <Circle size={16} className="text-gray-600 hover:text-gray-400" />}
        </button>
      </div>
    </div>
  );
}

export default function EnglishTutorPage() {
  const [mode, setMode] = useState<Mode>("conversation");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `english_${Date.now()}`);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [showWordList, setShowWordList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/english/words").then((r) => r.json()).then(setSavedWords).catch(() => {});
  }, []);

  const refreshWords = useCallback(() => {
    fetch("/api/english/words").then((r) => r.json()).then(setSavedWords).catch(() => {});
  }, []);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");

    const tempUser: Message = {
      id: `temp_${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);
    setLoading(true);

    try {
      const res = await fetch("/api/english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId, mode }),
      });
      const data = await res.json();
      const aiMessage: Message = {
        id: data.id,
        role: "assistant",
        content: data.content,
        rawResponse: data.rawResponse,
        parsed: data.parsed,
        createdAt: data.createdAt,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUser.id), tempUser, aiMessage]);
      if (data.parsed?.vocabulary?.length) refreshWords();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
    } finally {
      setLoading(false);
    }
  };

  const startMode = (newMode: Mode) => {
    setMode(newMode);
    // Send a system starter message to AI to set the context
    const starter = MODE_STARTERS[newMode];
    const aiMessage: Message = {
      id: `starter_${newMode}`,
      role: "assistant",
      content: starter,
      createdAt: new Date().toISOString(),
    };
    setMessages([aiMessage]);
  };

  const clearChat = async () => {
    if (!confirm("Clear this conversation?")) return;
    await fetch(`/api/english?sessionId=${sessionId}`, { method: "DELETE" });
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speak = (msgId: string, text: string) => {
    window.speechSynthesis.cancel();
    if (speakingId === msgId) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const toggleWordMastered = async (word: SavedWord) => {
    await fetch("/api/english/words", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: word.id, mastered: !word.mastered }),
    });
    refreshWords();
  };

  const masteredCount = savedWords.filter((w) => w.mastered).length;

  return (
    <div className="flex flex-col h-screen" dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-xl">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">English Tutor</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-xs text-gray-400">AI-powered • Reach native level faster</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWordList((v) => !v)}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition-colors ${
              showWordList ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Words</span>
            <span className="bg-blue-500/30 text-blue-300 text-xs px-1.5 py-0.5 rounded-full">
              {savedWords.length}
            </span>
          </button>
          {messages.length > 1 && (
            <button onClick={clearChat} className="text-gray-500 hover:text-red-400 p-2 rounded-xl hover:bg-gray-800 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1.5 px-4 py-3 border-b border-gray-800 flex-shrink-0 overflow-x-auto">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => startMode(key)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
              mode === key
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Chat */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-20">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 rounded-3xl">
                  <GraduationCap size={40} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Ready to practice English?</h2>
                  <p className="text-gray-400 text-sm max-w-md">
                    Choose a mode above to get started. You'll get real-time corrections,
                    vocabulary tips, and personalized feedback to accelerate your progress.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {MODES.map(({ key, label, icon: Icon, desc }) => (
                    <button
                      key={key}
                      onClick={() => startMode(key)}
                      className="bg-gray-800 hover:bg-gray-700 text-left px-4 py-3 rounded-xl transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} className="text-blue-400 group-hover:text-blue-300" />
                        <span className="text-sm font-semibold text-white">{label}</span>
                      </div>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSpeak={(text) => speak(msg.id, text)}
                isSpeaking={speakingId === msg.id}
              />
            ))}

            {loading && (
              <div dir="ltr" className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                  AI
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-800 flex-shrink-0">
            <div className="flex gap-2 items-end max-w-3xl mx-auto">
              <button
                onClick={toggleRecording}
                className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 ${
                  isRecording
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title={isRecording ? "Stop recording" : "Speak in English"}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <div className="flex-1 bg-gray-800 rounded-2xl flex items-end gap-2 px-4 py-3 border border-gray-700 focus-within:border-blue-500 transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "speaking" ? "Press 🎤 to speak, or type here..." : "Type in English..."}
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder-gray-600 leading-relaxed"
                  style={{ maxHeight: "120px" }}
                />
              </div>

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-center text-xs text-gray-700 mt-2">Enter to send • Shift+Enter for new line • 🎤 to speak</p>
          </div>
        </div>

        {/* Word List Panel */}
        {showWordList && (
          <div className="w-72 border-l border-gray-800 flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h2 className="text-sm font-bold text-white">My Vocabulary</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {masteredCount}/{savedWords.length} mastered
                </p>
              </div>
              <button onClick={() => setShowWordList(false)} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {savedWords.length === 0 && (
                <p className="text-gray-500 text-xs text-center mt-8">
                  New words will appear here as you practice
                </p>
              )}
              {savedWords.map((word) => (
                <WordCard key={word.id} word={word} onToggle={() => toggleWordMastered(word)} />
              ))}
            </div>

            {savedWords.length > 0 && (
              <div className="p-3 border-t border-gray-800">
                <div className="bg-gray-800 rounded-xl p-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Progress</span>
                    <span>{Math.round((masteredCount / savedWords.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(masteredCount / savedWords.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
