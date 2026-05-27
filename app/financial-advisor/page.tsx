"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, Trash2, Bot, User, Loader2, TrendingDown, TrendingUp,
  Plus, Download, CreditCard, DollarSign, Target, Bell, X,
  ChevronDown, ChevronUp, Calendar, AlertTriangle, CheckCircle2,
  PiggyBank, ShoppingCart, Repeat, BarChart3, MessageCircle, Receipt,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage { id: string; role: "user" | "assistant"; content: string; createdAt: string }
interface Transaction { id: string; date: string; type: string; category: string; description: string; amount: number; note?: string }
interface Subscription { id: string; name: string; amount: number; billingDay: number; category: string; active: boolean }
interface Summary {
  balance: number | null; balanceUpdatedAt: string | null;
  monthIncome: number; monthExpenses: number; monthBalance: number;
  recentTransactions: Transaction[]; subscriptions: Subscription[];
  totalSubscriptions: number;
  goal: { id: string; title: string; targetAmount: number; currentAmount: number } | null;
  todayCheckIn: { completed: boolean } | null;
  expenseByCategory: Record<string, number>;
  today: string; isAfter20h: boolean;
}

const EXPENSE_CATEGORIES = ["מזון", "תחבורה", "בידור", "בריאות", "ביגוד", "חינוך", "מנוי", "חשמל/מים/גז", "שכירות", "אחר"];
const INCOME_CATEGORIES = ["משכורת", "פרילנס", "השקעות", "מתנה", "אחר"];
const SUB_CATEGORIES = ["בידור", "תקשורת", "ספורט", "מוסיקה", "תוכנה", "אחר"];

// ─── Quick Prompts ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "🔍 נתח את ההוצאות שלי החודש",
  "💡 איך אחסוך 10,000 ₪ מהר יותר?",
  "📊 מה הסטטוס שלי ביחס ליעד?",
  "⚠️ אילו הוצאות מיותרות יש לי?",
  "🗓️ תן לי תכנית חיסכון לחודש הבא",
  "📉 מה המנויים הכי יקרים שלי?",
];

// ─── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isUser ? "bg-emerald-600" : "bg-gradient-to-br from-emerald-600 to-teal-700"}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="max-w-[82%]">
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700"}`}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        <p className="text-xs text-gray-600 px-1 mt-1">{new Date(msg.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function FinancialAdvisorPage() {
  const [tab, setTab] = useState<"chat" | "transactions" | "subscriptions" | "reports">("chat");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ date: new Date().toISOString().split("T")[0], type: "expense", category: "מזון", description: "", amount: "", note: "" });

  // Subscription state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState({ name: "", amount: "", billingDay: "1", category: "בידור" });

  // Balance state
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  // Daily check-in
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "חיסכון להשקעה ראשונה", targetAmount: "10000", currentAmount: "0", deadline: "" });

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/financial/summary");
    const data = await res.json();
    setSummary(data);
    setSummaryLoading(false);
    if (data.isAfter20h && !data.todayCheckIn?.completed) setShowCheckIn(true);
  }, []);

  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/financial/chat");
    setMessages(await res.json());
  }, []);

  const loadTransactions = useCallback(async () => {
    const res = await fetch("/api/financial/transactions");
    setTransactions(await res.json());
  }, []);

  const loadSubscriptions = useCallback(async () => {
    const res = await fetch("/api/financial/subscriptions");
    setSubscriptions(await res.json());
  }, []);

  useEffect(() => {
    loadSummary();
    loadMessages();
  }, [loadSummary, loadMessages]);

  useEffect(() => {
    if (tab === "transactions") loadTransactions();
    if (tab === "subscriptions") loadSubscriptions();
  }, [tab, loadTransactions, loadSubscriptions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Chat ──
  const sendMessage = async (text?: string) => {
    const content = (text || chatInput).trim();
    if (!content || chatLoading) return;
    setChatInput("");
    const temp: ChatMessage = { id: `temp_${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    setMessages((p) => [...p, temp]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/financial/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content }) });
      const saved = await res.json();
      setMessages((p) => [...p.filter((m) => m.id !== temp.id), temp, saved]);
    } catch { setMessages((p) => p.filter((m) => m.id !== temp.id)); }
    finally { setChatLoading(false); }
  };

  const clearChat = async () => {
    if (!confirm("למחוק את כל השיחה?")) return;
    await fetch("/api/financial/chat", { method: "DELETE" });
    setMessages([]);
  };

  // ── Transactions ──
  const addTransaction = async () => {
    if (!txForm.description || !txForm.amount) return;
    setTxLoading(true);
    await fetch("/api/financial/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(txForm) });
    setShowTxForm(false);
    setTxForm({ date: new Date().toISOString().split("T")[0], type: "expense", category: "מזון", description: "", amount: "", note: "" });
    await Promise.all([loadTransactions(), loadSummary()]);
    setTxLoading(false);
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("למחוק עסקה זו?")) return;
    await fetch(`/api/financial/transactions?id=${id}`, { method: "DELETE" });
    await Promise.all([loadTransactions(), loadSummary()]);
  };

  // ── Subscriptions ──
  const addSubscription = async () => {
    if (!subForm.name || !subForm.amount) return;
    await fetch("/api/financial/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subForm) });
    setShowSubForm(false);
    setSubForm({ name: "", amount: "", billingDay: "1", category: "בידור" });
    await Promise.all([loadSubscriptions(), loadSummary()]);
  };

  const toggleSubscription = async (id: string, active: boolean) => {
    await fetch("/api/financial/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !active }) });
    await Promise.all([loadSubscriptions(), loadSummary()]);
  };

  const deleteSubscription = async (id: string) => {
    if (!confirm("למחוק מנוי זה?")) return;
    await fetch(`/api/financial/subscriptions?id=${id}`, { method: "DELETE" });
    await Promise.all([loadSubscriptions(), loadSummary()]);
  };

  // ── Balance ──
  const updateBalance = async () => {
    if (!balanceInput) return;
    await fetch("/api/financial/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ balance: balanceInput }) });
    setShowBalanceForm(false);
    setBalanceInput("");
    loadSummary();
  };

  // ── Goal ──
  const createGoal = async () => {
    await fetch("/api/financial/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goalForm) });
    setShowGoalForm(false);
    loadSummary();
  };

  // ── Check-in ──
  const submitCheckIn = async () => {
    setCheckInSubmitting(true);
    const todayTx = transactions.filter((t) => t.date === summary?.today && t.type === "expense");
    const totalSpent = todayTx.reduce((s, t) => s + t.amount, 0);
    await fetch("/api/financial/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ totalSpent, note: checkInNote }) });
    setShowCheckIn(false);
    setCheckInSubmitting(false);
    loadSummary();
    // Auto-send to chat
    if (checkInNote) {
      sendMessage(`📋 צ'ק-אין יומי ${summary?.today}: ${checkInNote}. סה"כ הוצאתי היום: ${totalSpent.toLocaleString("he-IL")} ₪`);
    }
  };

  const goalProgress = summary?.goal ? (summary.goal.currentAmount / summary.goal.targetAmount) * 100 : 0;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Daily Check-In Banner ── */}
      {showCheckIn && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <Bell size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-300 font-semibold text-sm">⏰ צ&#39;ק-אין ערב | 20:00</p>
              <p className="text-amber-200 text-xs mt-0.5">מה הוצאת היום? כתוב פירוט ואשלח ליועץ שלך.</p>
              <div className="flex gap-2 mt-2">
                <input
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  placeholder="למשל: קפה 18₪, ארוחת צהריים 45₪, סופר 120₪..."
                  className="flex-1 bg-gray-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  onKeyDown={(e) => e.key === "Enter" && submitCheckIn()}
                />
                <button onClick={submitCheckIn} disabled={checkInSubmitting} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                  {checkInSubmitting ? "שולח..." : "שלח"}
                </button>
                <button onClick={() => setShowCheckIn(false)} className="text-amber-400 hover:text-amber-300 p-1.5"><X size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-2.5 rounded-xl">
                <PiggyBank size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">יועץ פיננסי אישי</h1>
                <p className="text-xs text-gray-400">דני היועץ • ביקורת כנה, תוצאות אמיתיות</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!summary?.balance && !summaryLoading && (
                <button onClick={() => setShowBalanceForm(true)} className="text-xs bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/50 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors">
                  + עדכן יתרת עו&#34;ש
                </button>
              )}
              {summary?.balance !== null && summary?.balance !== undefined && (
                <button onClick={() => setShowBalanceForm(true)} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                  💳 {summary.balance.toLocaleString("he-IL")} ₪
                </button>
              )}
            </div>
          </div>

          {/* Balance form */}
          {showBalanceForm && (
            <div className="mb-4 p-3 bg-gray-800 rounded-xl border border-gray-700 flex gap-2 items-center">
              <span className="text-sm text-gray-400 flex-shrink-0">יתרת עו&#34;ש:</span>
              <input type="number" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} placeholder="הכנס יתרה בשקלים" className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" onKeyDown={(e) => e.key === "Enter" && updateBalance()} />
              <button onClick={updateBalance} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium">שמור</button>
              <button onClick={() => setShowBalanceForm(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
          )}

          {/* Stats row */}
          {!summaryLoading && summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={13} className="text-emerald-400" />
                  <span className="text-xs text-gray-500">הכנסה החודש</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">+{summary.monthIncome.toLocaleString("he-IL")} ₪</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown size={13} className="text-red-400" />
                  <span className="text-xs text-gray-500">הוצאות החודש</span>
                </div>
                <p className="text-lg font-bold text-red-400">-{summary.monthExpenses.toLocaleString("he-IL")} ₪</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <Repeat size={13} className="text-amber-400" />
                  <span className="text-xs text-gray-500">מנויים/חודש</span>
                </div>
                <p className="text-lg font-bold text-amber-400">{summary.totalSubscriptions.toLocaleString("he-IL")} ₪</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target size={13} className="text-purple-400" />
                  <span className="text-xs text-gray-500">יעד חיסכון</span>
                </div>
                {summary.goal ? (
                  <div>
                    <p className="text-lg font-bold text-purple-400">{goalProgress.toFixed(1)}%</p>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all" style={{ width: `${Math.min(goalProgress, 100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowGoalForm(true)} className="text-xs text-purple-400 underline">הגדר יעד</button>
                )}
              </div>
            </div>
          )}

          {/* Goal form */}
          {showGoalForm && (
            <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-purple-800">
              <p className="text-sm font-semibold text-purple-300 mb-3">🎯 הגדרת יעד חיסכון</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={goalForm.title} onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))} placeholder="שם היעד" className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white col-span-2" />
                <input type="number" value={goalForm.targetAmount} onChange={(e) => setGoalForm((p) => ({ ...p, targetAmount: e.target.value }))} placeholder="סכום יעד (₪)" className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                <input type="number" value={goalForm.currentAmount} onChange={(e) => setGoalForm((p) => ({ ...p, currentAmount: e.target.value }))} placeholder="חסך עד כה (₪)" className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={createGoal} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium">שמור יעד</button>
                <button onClick={() => setShowGoalForm(false)} className="text-gray-500 text-sm hover:text-gray-300">ביטול</button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
            {[
              { id: "chat", label: "💬 יועץ", icon: MessageCircle },
              { id: "transactions", label: "📝 עסקאות", icon: Receipt },
              { id: "subscriptions", label: "🔄 מנויים", icon: Repeat },
              { id: "reports", label: "📊 דוחות", icon: BarChart3 },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id as typeof tab)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${tab === id ? "bg-emerald-600 text-white shadow-md" : "text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-hidden">

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-10">
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl shadow-xl">
                    <PiggyBank size={36} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">שלום! אני דני היועץ הפיננסי שלך 💰</h2>
                    <p className="text-gray-400 text-sm max-w-md">אני כאן כדי לעזור לך לחסוך 10,000 ₪ ולהתחיל להשקיע. אני אהיה ישיר ולא אפחד לבקר – כי זה מה שיעזור לך.</p>
                    <p className="text-gray-500 text-xs mt-2">📌 עדכן יתרת עו&#34;ש → הוסף עסקאות → שאל אותי!</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    {QUICK_PROMPTS.map((p) => (
                      <button key={p} onClick={() => sendMessage(p)} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-gray-300 hover:text-white px-3 py-2.5 rounded-xl text-right transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                    <Bot size={14} />
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">דני חושב...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-gray-900">
              <div className="flex gap-3 items-end max-w-4xl mx-auto">
                {messages.length > 0 && (
                  <button onClick={clearChat} className="text-gray-600 hover:text-red-400 p-2.5 rounded-xl hover:bg-gray-800 transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl flex items-end gap-2 px-4 py-3">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="שאל את דני... (Enter לשליחה)"
                    rows={1}
                    className="flex-1 bg-transparent text-white text-sm resize-none focus:outline-none placeholder-gray-600 leading-relaxed"
                    style={{ maxHeight: "120px" }}
                  />
                </div>
                <button onClick={() => sendMessage()} disabled={!chatInput.trim() || chatLoading} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-3 rounded-xl transition-all hover:scale-105 active:scale-95">
                  {chatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {tab === "transactions" && (
          <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">עסקאות</h2>
              <button onClick={() => setShowTxForm(!showTxForm)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                {showTxForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                {showTxForm ? "סגור" : "הוסף עסקה"}
              </button>
            </div>

            {showTxForm && (
              <div className="mb-4 p-4 bg-gray-800 rounded-2xl border border-gray-700 space-y-3">
                <p className="text-sm font-semibold text-emerald-400">✏️ עסקה חדשה</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">תאריך</label>
                    <input type="date" value={txForm.date} onChange={(e) => setTxForm((p) => ({ ...p, date: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">סוג</label>
                    <select value={txForm.type} onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value, category: e.target.value === "income" ? "משכורת" : "מזון" }))} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="expense">הוצאה 🔴</option>
                      <option value="income">הכנסה 💚</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">קטגוריה</label>
                    <select value={txForm.category} onChange={(e) => setTxForm((p) => ({ ...p, category: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                      {(txForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">סכום (₪)</label>
                    <input type="number" value={txForm.amount} onChange={(e) => setTxForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">תיאור</label>
                    <input value={txForm.description} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} placeholder="למשל: קפה בוקר, משכורת חודש מאי..." className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">הערה (אופציונלי)</label>
                    <input value={txForm.note} onChange={(e) => setTxForm((p) => ({ ...p, note: e.target.value }))} placeholder="הערה נוספת..." className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <button onClick={addTransaction} disabled={txLoading || !txForm.description || !txForm.amount} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                  {txLoading ? "שומר..." : "💾 שמור עסקה"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                  <p>אין עסקאות עדיין</p>
                  <p className="text-xs mt-1">הוסף את ההוצאות וההכנסות שלך</p>
                </div>
              ) : transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 hover:border-gray-600 transition-colors group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === "income" ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400"}`}>
                    {tx.type === "income" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.date} • {tx.category}</p>
                  </div>
                  <p className={`text-base font-bold flex-shrink-0 ${tx.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString("he-IL")} ₪
                  </p>
                  <button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1 transition-all">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {tab === "subscriptions" && (
          <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">מנויים חודשיים</h2>
                {summary && <p className="text-xs text-gray-500 mt-0.5">סה&#34;כ: <span className="text-amber-400 font-bold">{summary.totalSubscriptions.toLocaleString("he-IL")} ₪/חודש</span> = <span className="text-red-400">{(summary.totalSubscriptions * 12).toLocaleString("he-IL")} ₪/שנה</span></p>}
              </div>
              <button onClick={() => setShowSubForm(!showSubForm)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                {showSubForm ? <X size={16} /> : <Plus size={16} />}
                {showSubForm ? "סגור" : "הוסף מנוי"}
              </button>
            </div>

            {showSubForm && (
              <div className="mb-4 p-4 bg-gray-800 rounded-2xl border border-gray-700 space-y-3">
                <p className="text-sm font-semibold text-amber-400">🔄 מנוי חדש</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input value={subForm.name} onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))} placeholder="שם המנוי (Netflix, Spotify...)" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <input type="number" value={subForm.amount} onChange={(e) => setSubForm((p) => ({ ...p, amount: e.target.value }))} placeholder="עלות חודשית (₪)" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <input type="number" min="1" max="31" value={subForm.billingDay} onChange={(e) => setSubForm((p) => ({ ...p, billingDay: e.target.value }))} placeholder="יום חיוב בחודש" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="col-span-2">
                    <select value={subForm.category} onChange={(e) => setSubForm((p) => ({ ...p, category: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
                      {SUB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={addSubscription} disabled={!subForm.name || !subForm.amount} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                  💾 שמור מנוי
                </button>
              </div>
            )}

            <div className="space-y-2">
              {subscriptions.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Repeat size={40} className="mx-auto mb-3 opacity-30" />
                  <p>אין מנויים רשומים</p>
                  <p className="text-xs mt-1">הוסף את המנויים החודשיים שלך</p>
                </div>
              ) : subscriptions.map((sub) => (
                <div key={sub.id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-all group ${sub.active ? "bg-gray-800 border-gray-700" : "bg-gray-900 border-gray-800 opacity-60"}`}>
                  <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Repeat size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{sub.name}</p>
                    <p className="text-xs text-gray-500">{sub.category} • כל {sub.billingDay} לחודש</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-amber-400">{sub.amount.toLocaleString("he-IL")} ₪</p>
                    <p className="text-xs text-gray-600">{(sub.amount * 12).toLocaleString("he-IL")} ₪/שנה</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => toggleSubscription(sub.id, sub.active)} className={`text-xs px-2 py-1 rounded-lg ${sub.active ? "bg-gray-700 text-gray-400 hover:bg-red-900/40 hover:text-red-400" : "bg-emerald-900/40 text-emerald-400"}`}>
                      {sub.active ? "השבת" : "הפעל"}
                    </button>
                    <button onClick={() => deleteSubscription(sub.id)} className="text-gray-600 hover:text-red-400 p-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {subscriptions.length > 0 && summary && summary.totalSubscriptions > 0 && (
              <div className="mt-6 p-4 bg-red-950/30 border border-red-900/50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-sm font-semibold text-red-300">ניתוח עלות מנויים</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-red-400">{summary.totalSubscriptions.toLocaleString("he-IL")} ₪</p>
                    <p className="text-xs text-gray-500">לחודש</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">{(summary.totalSubscriptions * 12).toLocaleString("he-IL")} ₪</p>
                    <p className="text-xs text-gray-500">לשנה</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-400">{Math.ceil(10000 / Math.max(summary.totalSubscriptions, 1))}</p>
                    <p className="text-xs text-gray-500">חודשים לחסוך רק ממנויים</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === "reports" && (
          <div className="h-full overflow-y-auto p-4 max-w-4xl mx-auto space-y-4">
            <h2 className="text-lg font-bold text-white">דוחות וניתוח</h2>

            {/* Excel Download */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-800/50 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-600/20 p-3 rounded-xl">
                  <Download size={22} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">📊 דוח שבועי מלא</h3>
                  <p className="text-sm text-gray-400 mb-3">הורד דוח HTML מפורט עם כל העסקאות, המנויים, וסיכום חודשי. כולל דגשים וניתוח אוטומטי.</p>
                  <p className="text-xs text-gray-500 mb-4">💡 הדוח נשלח גם ביום שישי בעת כניסה לאפליקציה בשעה 10:00.</p>
                  <a href="/api/financial/excel" download className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    <Download size={16} />
                    הורד דוח עכשיו
                  </a>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            {summary && Object.keys(summary.expenseByCategory).length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">💸 הוצאות לפי קטגוריה (החודש)</h3>
                <div className="space-y-3">
                  {Object.entries(summary.expenseByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => {
                      const pct = (amount / summary.monthExpenses) * 100;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{cat}</span>
                            <span className="text-white font-medium">{amount.toLocaleString("he-IL")} ₪ ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Goal Progress */}
            {summary?.goal && (
              <div className="bg-gray-800 border border-purple-800/50 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4">🎯 {summary.goal.title}</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">{summary.goal.currentAmount.toLocaleString("he-IL")} ₪</p>
                    <p className="text-xs text-gray-500 mt-0.5">חסך</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{summary.goal.targetAmount.toLocaleString("he-IL")} ₪</p>
                    <p className="text-xs text-gray-500 mt-0.5">יעד</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{(summary.goal.targetAmount - summary.goal.currentAmount).toLocaleString("he-IL")} ₪</p>
                    <p className="text-xs text-gray-500 mt-0.5">נותר</p>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div className="h-4 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 transition-all duration-700 flex items-center justify-end pr-2" style={{ width: `${Math.min(goalProgress, 100)}%` }}>
                    {goalProgress > 10 && <span className="text-xs font-bold text-white">{goalProgress.toFixed(0)}%</span>}
                  </div>
                </div>
                {goalProgress < 100 && summary.monthBalance > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    <CheckCircle2 size={12} className="inline mr-1 text-emerald-400" />
                    בקצב הנוכחי ({summary.monthBalance.toLocaleString("he-IL")} ₪/חודש) תגיע ליעד בעוד ~{Math.ceil((summary.goal.targetAmount - summary.goal.currentAmount) / Math.max(summary.monthBalance, 1))} חודשים
                  </p>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-3">💡 תזכורות חשובות</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2"><Bell size={14} className="text-amber-400 mt-0.5 flex-shrink-0" /> צ&#39;ק-אין יומי בשעה 20:00 – כתוב מה הוצאת היום</li>
                <li className="flex items-start gap-2"><Calendar size={14} className="text-purple-400 mt-0.5 flex-shrink-0" /> דוח שישי מורד אוטומטית בשעה 10:00</li>
                <li className="flex items-start gap-2"><DollarSign size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" /> עדכן יתרת עו&#34;ש לפחות פעם בשבוע</li>
                <li className="flex items-start gap-2"><CreditCard size={14} className="text-red-400 mt-0.5 flex-shrink-0" /> בדוק כל מנוי – האם אתה באמת משתמש בו?</li>
                <li className="flex items-start gap-2"><ShoppingCart size={14} className="text-blue-400 mt-0.5 flex-shrink-0" /> המטרה: לחסוך 10,000 ₪ ולהתחיל להשקיע</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
