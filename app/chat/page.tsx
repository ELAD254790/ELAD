"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Bot, User, Loader2, Sparkles, Search } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string;
  createdAt: string;
}

const SUGGESTED_PROMPTS = [
  "איך לבנות שגרת בוקר יעילה?",
  "תן לי תכנית 30 יום לשיפור עצמי",
  "מה המחקר אומר על שינה ובריאות?",
  "איך להגביר מוטיבציה ארוכת טווח?",
  "תכנית תזונה בריאה למתחילים",
  "טכניקות להפחתת סטרס וחרדה",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const sources = msg.sources ? JSON.parse(msg.sources) : [];

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isUser ? "bg-indigo-600" : "bg-gradient-to-br from-violet-600 to-purple-700"}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={`max-w-[80%] space-y-2`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-indigo-600 text-white rounded-tr-sm" : "glass text-gray-200 rounded-tl-sm"}`}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        {sources.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Search size={10} />
            <span>מקורות: {sources.join(", ")}</span>
          </div>
        )}
        <p className="text-xs text-gray-600 px-1">
          {new Date(msg.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUser.id), tempUser, data]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!confirm("לנקות את השיחה?")) return;
    await fetch(`/api/chat?sessionId=${sessionId}`, { method: "DELETE" });
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-2 rounded-xl">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">יועץ AI לפיתוח אישי</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-xs text-gray-400">מחובר • יכול לגשת לאינטרנט</p>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-gray-500 hover:text-red-400 p-2 rounded-xl hover:bg-gray-800 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-20">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6 rounded-3xl">
              <Bot size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">שלום! אני יועץ ה-AI שלך</h2>
              <p className="text-gray-400 text-sm max-w-md">
                אני כאן לעזור לך בפיתוח אישי. שאל אותי על הרגלים, מטרות, בריאות, קריירה, ועוד.
                אני יכול לחפש מידע עדכני מהאינטרנט.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="glass text-sm text-gray-300 hover:text-white px-4 py-3 rounded-xl text-right hover:bg-white/10 transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm">חושב...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1 glass rounded-2xl flex items-end gap-2 px-4 py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל אותי על פיתוח אישי... (Enter לשליחה)"
              rows={1}
              className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder-gray-600 leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-700 mt-2">Enter לשליחה • Shift+Enter לשורה חדשה</p>
      </div>
    </div>
  );
}
