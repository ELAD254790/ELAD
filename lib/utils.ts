import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function getStreakCount(logs: { date: string; completed: boolean }[]): number {
  const completedDates = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  if (completedDates.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (completedDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    health: "#10b981",
    fitness: "#f59e0b",
    mindfulness: "#8b5cf6",
    learning: "#3b82f6",
    career: "#ef4444",
    relationships: "#ec4899",
    finance: "#14b8a6",
    personal: "#6366f1",
    general: "#6b7280",
  };
  return colors[category] || colors.general;
}
