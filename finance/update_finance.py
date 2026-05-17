#!/usr/bin/env python3
"""
Finance Updater - Add expenses/income and recalculate scores.
Usage: python3 update_finance.py <command> [args]
"""

import json
import os
import sys
from datetime import datetime, date

DATA_FILE   = "/home/user/ELAD/finance/data.json"
EXCEL_FILE  = "/home/user/ELAD/finance/מעקב_פיננסי.xlsx"
TRACKER_SCRIPT = "/home/user/ELAD/finance/create_tracker.py"

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def calc_health_score(data):
    income = data.get("month_income", 0)
    expenses = data.get("month_expenses", 0)
    if income == 0:
        return 0, {}

    savings = income - expenses
    savings_pct = savings / income

    # Score components (out of 100 total)
    # 1. Savings rate (30 pts): 20%+ = 30, 10-20% = 20, 0-10% = 10, negative = 0
    if savings_pct >= 0.20:
        savings_score = 30
    elif savings_pct >= 0.10:
        savings_score = int(20 + (savings_pct - 0.10) / 0.10 * 10)
    elif savings_pct >= 0:
        savings_score = int(savings_pct / 0.10 * 20)
    else:
        savings_score = 0

    # 2. Budget adherence (25 pts): how many categories are within budget
    budgets = data.get("budgets", {})
    if budgets:
        within = sum(1 for v in budgets.values() if v.get("actual", 0) <= v.get("planned", 0) * 1.05)
        budget_score = int((within / len(budgets)) * 25)
    else:
        budget_score = 12  # neutral if no budget set

    # 3. Expense diversity (20 pts): not spending >50% on one category
    cat_totals = data.get("category_totals", {})
    if cat_totals and expenses > 0:
        max_cat_pct = max(v.get("total", 0) for v in cat_totals.values()) / expenses
        if max_cat_pct <= 0.30:
            diversity_score = 20
        elif max_cat_pct <= 0.50:
            diversity_score = 14
        elif max_cat_pct <= 0.70:
            diversity_score = 8
        else:
            diversity_score = 3
    else:
        diversity_score = 10

    # 4. Emergency fund (15 pts) + general (10 pts)
    emergency_score = data.get("score_breakdown", {}).get("emergency", 8)
    general_score = min(10, int(savings_pct * 50)) if savings_pct > 0 else 0

    total = savings_score + budget_score + diversity_score + emergency_score + general_score
    total = min(100, max(0, total))

    breakdown = {
        "savings":   savings_score,
        "budget":    budget_score,
        "diversity": diversity_score,
        "emergency": emergency_score,
    }
    return total, breakdown

def generate_tips(data):
    tips = []
    income = data.get("month_income", 0)
    expenses = data.get("month_expenses", 0)
    savings_pct = (income - expenses) / income if income > 0 else 0

    if savings_pct < 0:
        tips.append("🚨 הוצאת יותר ממה שהרווחת החודש! חשוב לצמצם הוצאות מיד")
    elif savings_pct < 0.10:
        tips.append("⚠️ שיעור החיסכון שלך נמוך מ-10% - נסה להגיע ל-20%")
    elif savings_pct >= 0.20:
        tips.append("🏆 כל הכבוד! חוסך יותר מ-20% - המשך כך!")

    cat_totals = data.get("category_totals", {})
    if cat_totals:
        top_cat = max(cat_totals.items(), key=lambda x: x[1].get("total", 0))
        if top_cat[1].get("total", 0) > 0:
            pct = top_cat[1]["total"] / expenses * 100 if expenses > 0 else 0
            if pct > 40:
                tips.append(f"💡 {pct:.0f}% מהוצאותיך הולכות ל'{top_cat[0]}' - שקול לצמצם")

    budgets = data.get("budgets", {})
    over_budget = [k for k, v in budgets.items() if v.get("actual", 0) > v.get("planned", 0) * 1.1]
    if over_budget:
        tips.append(f"🔴 חרגת מהתקציב ב: {', '.join(over_budget[:2])}")

    fixed_total = sum(e.get("amount", 0) for e in data.get("fixed_expenses", []))
    if income > 0 and fixed_total / income > 0.60:
        tips.append("📋 הוצאות קבועות > 60% מהכנסתך - שקול לבטל מנויים מיותרים")

    if len(tips) < 4:
        tips.append("💰 הגדר חיסכון אוטומטי ביום קבלת המשכורת")
    if len(tips) < 4:
        tips.append("📊 עדכן את הוצאותיך מדי יום לדיוק מקסימלי")

    return tips[:6]

def add_expense(date_str, category, description, amount, method="מזומן", essential=True, notes=""):
    data = load_data()
    expense = {
        "date": date_str,
        "category": category,
        "description": description,
        "amount": float(amount),
        "method": method,
        "essential": essential,
        "notes": notes
    }
    data["daily_expenses"].append(expense)

    # Update category totals
    if category not in data["category_totals"]:
        data["category_totals"][category] = {"total": 0, "count": 0, "max": 0}
    data["category_totals"][category]["total"] += float(amount)
    data["category_totals"][category]["count"] += 1
    data["category_totals"][category]["max"] = max(
        data["category_totals"][category]["max"], float(amount)
    )

    # Update month expenses (current month only)
    cur_month = datetime.now().strftime("%Y-%m")
    if date_str.startswith(cur_month):
        data["month_expenses"] = data.get("month_expenses", 0) + float(amount)
        # Update budget actuals
        if category in data["budgets"]:
            data["budgets"][category]["actual"] = data["budgets"][category].get("actual", 0) + float(amount)

    # Recalculate score and tips
    score, breakdown = calc_health_score(data)
    data["health_score"] = score
    data["score_breakdown"] = breakdown
    data["tips"] = generate_tips(data)

    save_data(data)
    return data

def update_monthly_summary(data):
    """Rebuild monthly_data from daily_expenses."""
    from collections import defaultdict
    monthly = defaultdict(lambda: {"income": 0, "expenses": 0})

    for exp in data.get("daily_expenses", []):
        try:
            d = exp["date"][:7]  # "YYYY-MM"
            monthly[d]["expenses"] += exp.get("amount", 0)
        except Exception:
            pass

    for inc in data.get("income_sources", []):
        try:
            d = inc.get("month", "")[:7]
            monthly[d]["income"] += inc.get("net", 0)
        except Exception:
            pass

    result = []
    for month_key in sorted(monthly.keys()):
        m = monthly[month_key]
        try:
            dt = datetime.strptime(month_key, "%Y-%m")
            month_name = dt.strftime("%B %Y")
        except Exception:
            month_name = month_key
        savings = m["income"] - m["expenses"]
        savings_pct = savings / m["income"] * 100 if m["income"] > 0 else 0
        result.append({
            "month": month_name,
            "income": m["income"],
            "expenses": m["expenses"],
            "score": 0
        })
    data["monthly_data"] = result
    return data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: update_finance.py <rebuild|add_expense> [args...]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "rebuild":
        data = load_data()
        data = update_monthly_summary(data)
        score, breakdown = calc_health_score(data)
        data["health_score"] = score
        data["score_breakdown"] = breakdown
        data["tips"] = generate_tips(data)
        save_data(data)
        print("✅ נתונים עודכנו")
