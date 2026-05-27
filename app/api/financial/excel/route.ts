import { NextResponse } from "next/server";
import { generateExcelData } from "@/lib/excel";

export async function GET() {
  const data = await generateExcelData();

  // Build CSV content for each sheet (we'll use CSV since xlsx isn't installed)
  const today = new Date().toLocaleDateString("he-IL");

  // Create a simple but structured HTML that looks like Excel
  const html = buildExcelHtml(data, today);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="financial-report-${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}

function buildExcelHtml(data: Awaited<ReturnType<typeof generateExcelData>>, today: string): string {
  const categoryColors: Record<string, string> = {
    "מזון": "#d4edda",
    "תחבורה": "#cce5ff",
    "בידור": "#fff3cd",
    "בריאות": "#d1ecf1",
    "ביגוד": "#f8d7da",
    "חינוך": "#e2d9f3",
    "מנוי": "#ffeeba",
    "אחר": "#f8f9fa",
  };

  const rows = data.transactions.map((t) => {
    const isExpense = t.type === "הוצאה";
    const bg = isExpense ? categoryColors[t.category] || "#fff" : "#d4edda";
    return `<tr style="background:${bg}">
      <td style="padding:6px 10px;border:1px solid #dee2e6">${t.date}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;font-weight:bold;color:${isExpense ? "#dc3545" : "#28a745"}">${t.type}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6">${t.category}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6">${t.description}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;text-align:left;font-weight:bold;color:${isExpense ? "#dc3545" : "#28a745"}">${isExpense ? "-" : "+"}${t.amount.toLocaleString("he-IL")} ₪</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;color:#6c757d;font-size:12px">${t.note}</td>
    </tr>`;
  }).join("");

  const subRows = data.subscriptions.map((sub) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #dee2e6">${sub.name}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;font-weight:bold;color:#dc3545">${sub.amount.toLocaleString("he-IL")} ₪</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6">${sub.category}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6">כל ${sub.billingDay} לחודש</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;color:#dc3545;font-weight:bold">${sub.yearlyTotal.toLocaleString("he-IL")} ₪ / שנה</td>
    </tr>`).join("");

  const summaryRows = data.summary.map((s) => {
    const bg = s.balance >= 0 ? "#d4edda" : "#f8d7da";
    return `<tr style="background:${bg}">
      <td style="padding:6px 10px;border:1px solid #dee2e6;font-weight:bold">${s.month}</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;color:#28a745;font-weight:bold">+${s.income.toLocaleString("he-IL")} ₪</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;color:#dc3545;font-weight:bold">-${s.expenses.toLocaleString("he-IL")} ₪</td>
      <td style="padding:6px 10px;border:1px solid #dee2e6;font-weight:bold;color:${s.balance >= 0 ? "#28a745" : "#dc3545"}">${s.balance >= 0 ? "+" : ""}${s.balance.toLocaleString("he-IL")} ₪</td>
    </tr>`;
  }).join("");

  const goalHtml = data.goal ? `
    <div style="background:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:20px;margin:20px 0">
      <h2 style="color:#856404;margin:0 0 10px">🎯 יעד חיסכון: ${data.goal.title}</h2>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px">
        <div style="text-align:center;background:#fff;border-radius:8px;padding:12px">
          <div style="font-size:22px;font-weight:bold;color:#856404">${data.goal.targetAmount.toLocaleString("he-IL")} ₪</div>
          <div style="font-size:12px;color:#6c757d">יעד</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:12px">
          <div style="font-size:22px;font-weight:bold;color:#28a745">${data.goal.currentAmount.toLocaleString("he-IL")} ₪</div>
          <div style="font-size:12px;color:#6c757d">חסך</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:12px">
          <div style="font-size:22px;font-weight:bold;color:#dc3545">${data.goal.remaining.toLocaleString("he-IL")} ₪</div>
          <div style="font-size:12px;color:#6c757d">נותר</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:12px">
          <div style="font-size:22px;font-weight:bold;color:#007bff">${data.goal.progress.toFixed(1)}%</div>
          <div style="font-size:12px;color:#6c757d">התקדמות</div>
        </div>
      </div>
      <div style="background:#e9ecef;border-radius:100px;height:16px;margin:15px 0;overflow:hidden">
        <div style="background:linear-gradient(90deg,#28a745,#20c997);height:100%;width:${Math.min(data.goal.progress, 100)}%;transition:width 0.5s"></div>
      </div>
    </div>
  ` : `<p style="color:#6c757d">לא הוגדר יעד חיסכון</p>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<title>דוח פיננסי - ${today}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; background: #f8f9fa; direction: rtl; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
  .section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  h1 { margin: 0; font-size: 28px; }
  h2 { color: #343a40; margin-top: 0; font-size: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #343a40; color: white; padding: 10px; text-align: right; font-size: 13px; }
  .stat-box { display: inline-block; background: #f8f9fa; border-radius: 8px; padding: 15px 25px; margin: 5px; text-align: center; border: 1px solid #dee2e6; }
  .stat-value { font-size: 24px; font-weight: bold; }
  .green { color: #28a745; }
  .red { color: #dc3545; }
  .blue { color: #007bff; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<div class="header">
  <h1>📊 דוח פיננסי אישי</h1>
  <p style="margin:8px 0 0;opacity:0.9">נוצר בתאריך: ${today} | היעד: חיסכון של 10,000 ₪</p>
  ${data.bankBalance !== null ? `<p style="margin:4px 0 0;opacity:0.9">💳 יתרת חשבון: <strong>${data.bankBalance.toLocaleString("he-IL")} ₪</strong></p>` : ""}
</div>

${goalHtml}

<div class="section">
  <h2>📅 סיכום חודשי</h2>
  <table>
    <thead><tr><th>חודש</th><th>הכנסות</th><th>הוצאות</th><th>מאזן</th></tr></thead>
    <tbody>${summaryRows || "<tr><td colspan='4' style='text-align:center;padding:20px;color:#6c757d'>אין נתונים</td></tr>"}</tbody>
  </table>
</div>

<div class="section">
  <h2>🔄 מנויים חודשיים (סה"כ: ${data.totalSubscriptions.toLocaleString("he-IL")} ₪/חודש = ${(data.totalSubscriptions * 12).toLocaleString("he-IL")} ₪/שנה)</h2>
  ${data.subscriptions.length > 0 ? `
  <table>
    <thead><tr><th>שם המנוי</th><th>עלות חודשית</th><th>קטגוריה</th><th>מועד חיוב</th><th>עלות שנתית</th></tr></thead>
    <tbody>${subRows}</tbody>
  </table>` : "<p style='color:#6c757d'>אין מנויים רשומים</p>"}
</div>

<div class="section">
  <h2>📝 כל העסקאות</h2>
  ${data.transactions.length > 0 ? `
  <table>
    <thead><tr><th>תאריך</th><th>סוג</th><th>קטגוריה</th><th>תיאור</th><th>סכום</th><th>הערה</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : "<p style='color:#6c757d'>אין עסקאות רשומות</p>"}
</div>

<div style="text-align:center;padding:20px;color:#6c757d;font-size:13px">
  דוח זה נוצר אוטומטית על ידי GrowthOS • ${today}
</div>
</body>
</html>`;
}
