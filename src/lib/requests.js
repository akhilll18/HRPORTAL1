// Leave, expense, advance and loan rules. Used live by the forms and again by the store on submit.
import { DAY, isoDate } from "./utils.js";

export const REQUEST_TYPES = {
  leave: { label: "Leave", prefix: "LV-", module: "leave" },
  expense: { label: "Expense claim", prefix: "EXP-", module: "expense" },
  advance: { label: "Advance", prefix: "ADV-", module: "advance" },
  loan: { label: "Salary loan", prefix: "LN-", module: "loan" },
  regularize: { label: "Attendance correction", prefix: "REG-", module: "attendance" },
  asset: { label: "Asset request", prefix: "AST-", module: "assets" },
  screenoff: { label: "Screen-off time claim", prefix: "SOF-", module: "attendance" },
};

// Why the screen was off while the employee was working (screen-off claim → manager approval → added to worked hours).
export const SCREENOFF_REASONS = [
  ["meeting", "Meeting / discussion away from the desk"],
  ["call", "Client or team phone call"],
  ["training", "Training, workshop or interview panel"],
  ["field", "Site visit / field work"],
  ["offline", "Offline work (whiteboard, reading, paperwork)"],
  ["system", "System / network / power issue"],
  ["other", "Other"],
];
export const fmtMins = (m) => `${Math.floor((Number(m) || 0) / 60)}h ${String(Math.round(Number(m) || 0) % 60).padStart(2, "0")}m`;

/** available: minutes of screen-off time on that day not yet approved or pending in another claim. */
export function validateScreenOff(form, { settings, available }) {
  const errors = {};
  const today = isoDate();
  const window = Number(settings?.regularize_window_days) || 30;
  if (!form.date) errors.date = "Choose the day.";
  else if (form.date > today) errors.date = "You can only claim past or current days.";
  else if ((toDate(today) - toDate(form.date)) / DAY > window) errors.date = `Claims are allowed for the last ${window} days.`;
  const m = Math.round(Number(form.minutes));
  if (!Number.isFinite(m) || m < 5) errors.minutes = "Claim at least 5 minutes.";
  else if (available != null && m > Math.floor(available)) errors.minutes = available < 5 ? "There is no unclaimed screen-off time on this day." : `Only ${fmtMins(Math.floor(available))} of screen-off time is left to claim on this day.`;
  if (!form.reason_code) errors.reason_code = "Choose a reason.";
  if ((form.reason || "").trim().length < 10) errors.reason = "Say what you were working on (at least 10 characters).";
  return { errors };
}

export const ASSET_CATEGORIES = ["Laptop", "Monitor", "Phone", "SIM", "Headset", "Access card", "Vehicle", "Other"];
export const REG_REASONS = [
  ["forgot_punch", "Forgot to punch"],
  ["device_issue", "Biometric device not working"],
  ["client_site", "Working at a client site"],
  ["network", "No mobile network / GPS"],
  ["wfh", "Worked from home (approved)"],
  ["other", "Other"],
];

export function validateRegularize(form, { settings, punches = [], emp }) {
  const errors = {};
  const today = isoDate();
  if (!form.date) errors.date = "Choose the day to correct.";
  else if (form.date > today) errors.date = "You can only correct past or current days.";
  else if ((toDate(today) - toDate(form.date)) / DAY > settings.regularize_window_days) errors.date = `Corrections are allowed for the last ${settings.regularize_window_days} days.`;
  if (!/^\d{2}:\d{2}$/.test(form.in_time || "")) errors.in_time = "Enter the in time.";
  if (!/^\d{2}:\d{2}$/.test(form.out_time || "")) errors.out_time = "Enter the out time.";
  else if (form.in_time && form.out_time <= form.in_time) errors.out_time = "Out time must be after in time.";
  if (!form.reason_code) errors.reason_code = "Choose a reason.";
  if (!(form.reason || "").trim()) errors.reason = "Explain what happened.";
  if (form.date && emp && punches.some((p) => p.employee_code === emp.employee_code && p.source === "regularized" && p.ts.startsWith(form.date))) errors.date = "This day was already corrected.";
  return { errors };
}

export function validateAssetRequest(form) {
  const errors = {};
  if (!form.category) errors.category = "Choose what you need.";
  if (!(form.reason || "").trim()) errors.reason = "Say why you need it.";
  if (!form.needed_by) errors.needed_by = "When do you need it?";
  else if (form.needed_by < isoDate()) errors.needed_by = "Choose today or later.";
  return { errors };
}

const toDate = (s) => new Date(`${s}T12:00:00`);

export function workingDays(from, to, holidays = []) {
  if (!from || !to || to < from) return 0;
  const hol = new Set(holidays.filter((h) => h.type === "holiday").map((h) => h.date));
  let n = 0;
  for (let d = toDate(from); d <= toDate(to); d = new Date(d.getTime() + DAY)) {
    const iso = isoDate(d);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6 && !hol.has(iso)) n += 1;
  }
  return n;
}

export function leaveDays(form, holidays) {
  const base = workingDays(form.from_date, form.to_date, holidays);
  if (form.half_day && form.half_day !== "none" && form.from_date === form.to_date && base === 1) return 0.5;
  return base;
}

// Entitlement is pro-rated for joiners this year. Pending requests count as booked.
export function leaveBalances(emp, leaveTypes, requests, { excludeId } = {}) {
  const year = new Date().getFullYear();
  const doj = toDate(emp.date_of_joining);
  const monthsThisYear = doj.getFullYear() < year ? 12 : 12 - doj.getMonth();
  const mine = requests.filter((r) => r.type === "leave" && r.employee_code === emp.employee_code && r.request_id !== excludeId && r.from_date?.startsWith(String(year)));
  return leaveTypes
    .filter((t) => t.active)
    .map((t) => {
      const entitled = t.annual == null ? null : emp.leave_policy === "intern" && ["EL", "FL"].includes(t.code) ? 0 : Math.round(((emp.leave_policy === "intern" ? t.annual / 2 : t.annual) * monthsThisYear) / 12 * 2) / 2;
      const taken = mine.filter((r) => r.leave_type === t.code && r.status === "Approved").reduce((s, r) => s + r.days, 0);
      const pending = mine.filter((r) => r.leave_type === t.code && r.status === "Pending").reduce((s, r) => s + r.days, 0);
      return { ...t, entitled, taken, pending, available: entitled == null ? null : entitled - taken - pending };
    });
}

export function validateLeave(form, { emp, leaveTypes, holidays, requests }) {
  const errors = {};
  const flags = [];
  const today = isoDate();
  const type = leaveTypes.find((t) => t.code === form.leave_type);
  if (!type) errors.leave_type = "Choose a leave type.";
  if (!form.from_date) errors.from_date = "Choose the first day.";
  if (!form.to_date) errors.to_date = "Choose the last day.";
  else if (form.from_date && form.to_date < form.from_date) errors.to_date = "The last day must be on or after the first day.";
  const days = leaveDays(form, holidays);
  if (form.from_date && form.to_date && !errors.to_date && days === 0) errors.to_date = "These dates are all weekends or holidays.";
  if (form.half_day !== "none" && form.from_date !== form.to_date) errors.half_day = "Half days apply to single-day leave only.";
  if (type && form.from_date && !errors.from_date) {
    const notice = Math.round((toDate(form.from_date) - toDate(today)) / DAY);
    if (type.code !== "SL" && form.from_date < today) errors.from_date = "Only sick leave can be applied for past dates.";
    else if (type.code === "SL" && notice < -7) errors.from_date = "Sick leave can be applied up to 7 days after.";
    else if (notice >= 0 && notice < type.min_notice_days) flags.push({ code: "SHORT_NOTICE", level: "warn", text: `${type.name} needs ${type.min_notice_days} day(s) notice; this is ${notice}.` });
    if (type.floater_only) {
      const floaters = new Set(holidays.filter((h) => h.type === "floater").map((h) => h.date));
      for (let d = toDate(form.from_date); form.to_date && d <= toDate(form.to_date); d = new Date(d.getTime() + DAY)) {
        if (d.getDay() % 6 && !floaters.has(isoDate(d))) {
          errors.leave_type = "Floater leave can only be taken on a floater holiday.";
          break;
        }
      }
    }
    if (type.doc_after_days && days > type.doc_after_days && !form.attachment) errors.attachment = `Attach a medical certificate for more than ${type.doc_after_days} days of ${type.name.toLowerCase()}.`;
  }
  if (type && type.annual != null && emp && days) {
    const bal = leaveBalances(emp, leaveTypes, requests, { excludeId: form.request_id }).find((b) => b.code === type.code);
    if (bal && days > bal.available) errors.leave_type = `You have ${bal.available} day(s) of ${type.name.toLowerCase()} left; this needs ${days}. Choose Loss of pay for the rest.`;
  }
  if (form.from_date && form.to_date && emp) {
    const overlap = requests.find((r) => r.type === "leave" && r.employee_code === emp.employee_code && r.request_id !== form.request_id && ["Pending", "Approved"].includes(r.status) && !(r.to_date < form.from_date || r.from_date > form.to_date));
    if (overlap) errors.from_date = `Overlaps ${overlap.request_id} (${overlap.from_date} to ${overlap.to_date}).`;
  }
  if (!(form.reason || "").trim()) errors.reason = "Add a reason for your manager.";
  else if (form.reason.length > 300) errors.reason = "Keep it under 300 characters.";
  return { errors, flags, days };
}

export function expenseTotal(items = []) {
  return items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
}

export function validateExpense(form, { emp, expenseCategories, settings }) {
  const errors = {};
  const itemErrors = [];
  const flags = [];
  const today = isoDate();
  if (emp?.expense_policy === "none") errors.title = "No expense policy is assigned to you. Ask HR to assign one.";
  if (!(form.title || "").trim()) errors.title = errors.title || "Give the claim a title, like the trip or event.";
  if (!(form.purpose || "").trim()) errors.purpose = "Say what the spend was for.";
  if (!form.items?.length) errors.items = "Add at least one expense line.";
  (form.items || []).forEach((it, i) => {
    const e = {};
    const cat = expenseCategories.find((c) => c.code === it.category);
    const amt = Number(it.amount);
    if (!it.date) e.date = "Date required.";
    else if (it.date > today) e.date = "Cannot be in the future.";
    else if ((toDate(today) - toDate(it.date)) / DAY > settings.expense_claim_window_days) e.date = `Older than ${settings.expense_claim_window_days} days.`;
    if (!cat) e.category = "Choose a category.";
    if (!(it.description || "").trim()) e.description = "Describe it.";
    if (!it.amount || Number.isNaN(amt) || amt <= 0) e.amount = "Enter an amount.";
    else if (cat && amt > cat.limit) e.amount = `Policy limit is ₹${cat.limit.toLocaleString("en-IN")}.`;
    if (cat && amt > 0 && !it.receipt && (cat.receipt_always || amt > settings.receipt_required_above)) e.receipt = "Receipt required.";
    if (it.receipt && it.receipt.size > settings.max_file_mb * 1024 * 1024) e.receipt = `Over ${settings.max_file_mb} MB.`;
    if (cat && amt >= cat.limit * 0.9 && amt <= cat.limit) flags.push({ code: "NEAR_LIMIT", level: "info", text: `Line ${i + 1} is within 10% of the ${cat.name} limit.` });
    itemErrors[i] = e;
  });
  if (itemErrors.some((e) => e && Object.keys(e).length)) errors.items = errors.items || "Fix the highlighted lines.";
  if (!form.declaration) errors.declaration = "Confirm the declaration.";
  return { errors, itemErrors, flags, total: expenseTotal(form.items) };
}

export function validateAdvance(form, { settings, requests, emp }) {
  const errors = {};
  const amt = Number(form.request_amount);
  if (!form.request_amount || Number.isNaN(amt) || amt <= 0) errors.request_amount = "Enter the amount you need.";
  else if (amt > settings.max_advance_inr) errors.request_amount = `The most you can request is ₹${settings.max_advance_inr.toLocaleString("en-IN")}.`;
  if (!form.request_date) errors.request_date = "Request date required.";
  if (!form.required_by) errors.required_by = "When do you need it?";
  else if (form.required_by < isoDate()) errors.required_by = "Choose today or a later date.";
  if (!(form.purpose || "").trim()) errors.purpose = "Say what the advance is for.";
  const open = requests.find((r) => r.type === "advance" && r.employee_code === emp?.employee_code && (r.status === "Pending" || (r.status === "Disbursed" && !r.settled)));
  if (open) errors.request_amount = `Settle ${open.request_id} before asking for another advance.`;
  return { errors };
}

export function validateLoan(form, { settings, emp, requests }) {
  const errors = {};
  const amt = Number(form.amount);
  const max = (emp?.monthly_gross || 0) * settings.loan_max_multiple;
  if (!form.amount || Number.isNaN(amt) || amt <= 0) errors.amount = "Enter the loan amount.";
  else if (amt > max) errors.amount = `The most you can borrow is ₹${max.toLocaleString("en-IN")} (${settings.loan_max_multiple}× monthly gross).`;
  const t = Number(form.tenure_months);
  if (!t || t < 1 || t > settings.loan_max_tenure_months) errors.tenure_months = `1 to ${settings.loan_max_tenure_months} months.`;
  if (!(form.reason || "").trim()) errors.reason = "Add a reason.";
  if (requests.some((r) => r.type === "loan" && r.employee_code === emp?.employee_code && ["Pending", "Approved", "Disbursed"].includes(r.status) && !r.closed)) errors.amount = "You already have an open loan.";
  return { errors, emi: amt && t ? Math.ceil(amt / t) : 0 };
}

export function requestSummary(r, { leaveTypes = [], fmt = (n) => n } = {}) {
  if (r.type === "leave") return { title: `${leaveTypes.find((t) => t.code === r.leave_type)?.name || r.leave_type}`, detail: `${r.from_date === r.to_date ? r.from_date : `${r.from_date} → ${r.to_date}`}`, amount: `${r.days} day${r.days === 1 ? "" : "s"}` };
  if (r.type === "expense") return { title: r.title, detail: `${r.items.length} line(s) · ${r.project || "No project"}`, amount: `₹${fmt(r.approved_amount ?? expenseTotal(r.items))}` };
  if (r.type === "advance") return { title: r.purpose, detail: `Needed by ${r.required_by}`, amount: `₹${fmt(r.approved_amount ?? r.request_amount)}` };
  if (r.type === "regularize") return { title: `Correct ${r.date}`, detail: `${r.in_time} – ${r.out_time} · ${(REG_REASONS.find((x) => x[0] === r.reason_code) || [])[1] || ""}`, amount: "1 day" };
  if (r.type === "asset") return { title: `${r.category}${r.priority === "high" ? " · urgent" : ""}`, detail: r.reason, amount: r.assigned_asset || "—" };
  if (r.type === "screenoff") return { title: `Screen-off on ${r.date}`, detail: `${(SCREENOFF_REASONS.find((x) => x[0] === r.reason_code) || [])[1] || ""}${r.from_time ? ` · ${r.from_time}–${r.to_time}` : ""}`, amount: fmtMins(r.approved_minutes ?? r.minutes) };
  if (r.type === "loan") return { title: r.reason, detail: `${r.tenure_months} months · EMI ₹${fmt(r.emi)}`, amount: `₹${fmt(r.approved_amount ?? r.amount)}` };
  return { title: "", detail: "", amount: "" };
}
