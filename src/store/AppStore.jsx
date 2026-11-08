// Central client store: masters, points, leave/expense/advance/loan requests, approvals,
// notifications, audit and the auth session. Each action mirrors one REST endpoint (README).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_CONFIG, HR_FEED, buildSeed } from "../data/seed.js";
import { validateSubmission, OPEN_STATUSES } from "../lib/validation.js";
import { validateLeave, validateExpense, validateAdvance, validateLoan, validateRegularize, validateAssetRequest, validateScreenOff, fmtMins, expenseTotal, REQUEST_TYPES, leaveBalances } from "../lib/requests.js";
import { hoursInRange } from "../lib/hrcalc.js";
import { makeOpsActions } from "./opsActions.js";
import { makePayslipActions } from "./payslipActions.js";
import { makeOfferActions } from "./offerActions.js";
import { makeCollabActions } from "./collabActions.js";
import { makeItActions } from "./itActions.js";
import { makeDocActions } from "./docActions.js";
import { makePayrollSuiteActions } from "./payrollSuiteActions.js";
import { makeSuiteActions } from "./suiteActions.js";
import { makeContractActions } from "./contractActions.js";
import { makePayslipDesignActions } from "./payslipDesignActions.js";
import { CONTRACT_COMPONENT_CODES } from "../data/payslipFields.js";
import { isoDate } from "../lib/utils.js";
import { validateEmployee, isContingent, monthlyEquivalent, workerTypeOf } from "../data/employeeFields.js";
import { leaveTypesFor, holidaysFor, withCountryData } from "../country/countryPacks.js";
import { deviceFingerprint, deviceLabel, demoIp, makeOtp, nowIso, sha256, nextSeq, maskAccount, fmtNum } from "../lib/utils.js";

const Ctx = createContext(null);
const SESSION_KEY = `${APP_CONFIG.storageKey}-session`;
const REMEMBER_KEY = `${APP_CONFIG.storageKey}-remember`;
const clone = (o) => (typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

function loadData() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Fill any collections added since this browser saved its copy.
      if (parsed?.version === 3) {
        const fresh = clone(buildSeed());
        return migrateV88b(migrateV88(migrateV87(migrateV8(withCountryData({ ...fresh, ...parsed, settings: { ...fresh.settings, ...parsed.settings } }, fresh)), fresh)));
      }
    }
  } catch {
    /* storage unavailable */
  }
  return clone(buildSeed());
}
// v8: browsers holding older data get the new admin modules once (new collections are filled by the merge above).
function migrateV8(d) {
  if (!d.v8it) {
    const ch = { id: "CH-it", kind: "channel", name: "it-help", topic: "IT service desk: quick questions. For anything that blocks you, raise a ticket under IT support.", members: "all", created_by: "ADM02", created_at: new Date().toISOString() };
    d = { ...d, v8it: true, chatChannels: (d.chatChannels || []).some((c) => c.id === "CH-it") ? d.chatChannels : [...(d.chatChannels || []), ch], admins: d.admins };
  }
  if (d.v8) return d;
  const add = { ADM01: ["bgv", "compliance"], ADM02: ["compliance"] };
  return { ...d, v8: true, admins: d.admins.map((a) => (add[a.admin_code] ? { ...a, modules: [...new Set([...(a.modules || []), ...add[a.admin_code]])] } : a)) };
}
// v8.8: Sahayog points removed; Finance admin (ADM02) no longer works the IT service desk or sees BGV.
function migrateV88(d) {
  if (d.v88) return d;
  const wf = { ...(d.settings?.workflow || {}) };
  delete wf.points;
  return {
    ...d,
    v88: true,
    settings: { ...d.settings, workflow: wf },
    admins: d.admins.map((a) => ({ ...a, modules: (a.modules || []).filter((m) => m !== "points" && !(a.admin_code === "ADM02" && (m === "it" || m === "bgv"))) })),
    itTickets: (d.itTickets || []).map((t) => (t.assigned_to === "ADM02" ? { ...t, assigned_to: "SA001" } : t)),
    bgvAccess: (d.bgvAccess || []).map((g) => (g.code === "ADM02" && !g.revoked ? { ...g, revoked: true, revoked_at: new Date().toISOString(), revoked_by: "SYSTEM" } : g)),
  };
}
// v8.8b: drop leftover Sahayog points notifications (their pages no longer exist).
function migrateV88b(d) {
  if (d.v88b) return d;
  return { ...d, v88b: true, settings: { ...d.settings, workflow: { screenoff: "manager", ...(d.settings?.workflow || {}) } }, notifications: (d.notifications || []).filter((n) => !String(n.link || "").startsWith("/points") && !/\bSUB-\d{4}-\d+|\bpoints\b/i.test(n.text || "")) };
}
// v8.7: worker types, contract management and payslip designs for browsers holding v8.6 data.
function migrateV87(d, fresh) {
  if (d.v87) return d;
  const have = new Set(d.employees.map((e) => e.employee_code));
  const add = fresh.employees.filter((e) => e.worker_type && e.worker_type !== "permanent" && !have.has(e.employee_code));
  const comps = fresh.payslipComponents.filter((k) => CONTRACT_COMPONENT_CODES.includes(k.code) && !(d.payslipComponents || []).some((x) => x.code === k.code));
  return {
    ...d,
    v87: true,
    employees: [...d.employees.map((e) => ({ ...e, worker_type: e.worker_type || (e.employment_type === "contract" ? "contract" : e.employment_type === "intern" ? "intern" : "permanent") })), ...add],
    admins: d.admins.map((a) => (["ADM01", "ADM02"].includes(a.admin_code) ? { ...a, modules: [...new Set([...(a.modules || []), "contracts"])] } : a)),
    payslipComponents: [...(d.payslipComponents || []), ...comps],
  };
}
function persistData(data) {
  try {
    // Large attachments stay in memory only so browser storage does not overflow.
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(data, (k, v) => (k === "data_url" && typeof v === "string" && v.length > 350000 ? null : v)));
  } catch {
    /* quota or storage disabled */
  }
}
function loadSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return null;
}
function saveSession(s) {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  if (!s) return;
  try {
    (s.remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const ROLE_LABEL = { emp: "Employee", admin: "Admin", superadmin: "Super Admin", system: "System" };
export const ROLE_HOME = { emp: "/home", admin: "/admin", superadmin: "/super" };

function listFor(data, role) {
  return role === "emp" ? data.employees : role === "admin" ? data.admins : data.superAdmins;
}
export function codeOf(role, rec) {
  return role === "emp" ? rec.employee_code : role === "admin" ? rec.admin_code : rec.superadmin_code;
}
function roleOfCode(code) {
  if (code?.startsWith("EMP")) return "emp";
  if (code?.startsWith("ADM")) return "admin";
  if (code?.startsWith("SA")) return "superadmin";
  return "system";
}

export function AppStoreProvider({ children }) {
  const [data, setData] = useState(loadData);
  const dataRef = useRef(data);
  const [session, setSession] = useState(() => {
    const s = loadSession();
    if (!s) return null;
    const idleMs = Date.now() - new Date(s.last_active).getTime();
    return idleMs > dataRef.current.settings.session_timeout_min * 60000 ? null : s;
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [pending, setPending] = useState(null);
  const [toast, setToast] = useState(null);
  const [logoutReason, setLogoutReason] = useState("");

  useEffect(() => { persistData(data); }, [data]);
  // Keep tabs in step (chat, meetings, approvals) when another tab of this browser saves.
  useEffect(() => {
    const onStorage = (ev) => {
      if (ev.key !== APP_CONFIG.storageKey || !ev.newValue) return;
      try {
        const next = JSON.parse(ev.newValue);
        if (next?.version !== 3) return;
        dataRef.current = next;
        setData(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { saveSession(session); }, [session]);

  const notifyToast = useCallback((text, tone = "success") => setToast({ text, tone, id: Date.now() }), []);
  const mutate = useCallback((recipe) => {
    const draft = clone(dataRef.current);
    const result = recipe(draft);
    dataRef.current = draft;
    setData(draft);
    return result;
  }, []);

  const fp = useMemo(() => deviceFingerprint(), []);
  const device = useMemo(() => deviceLabel(), []);
  const pushAudit = (d, user_code, role, action, details) => {
    d.audit.unshift({ log_id: nextSeq(d.audit, "AUD-", "log_id"), user_code, role, action, timestamp: nowIso(), ip: demoIp(fp), device, fingerprint: fp, details });
  };
  const pushNote = (d, to, text, link) => {
    if (!to) return;
    d.notifications.unshift({ id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, to, text, at: nowIso(), read: false, link });
  };

  const user = useMemo(() => {
    if (!session) return null;
    const rec = listFor(data, session.role).find((r) => codeOf(session.role, r) === session.code);
    return rec ? { ...rec, role: session.role, code: session.code } : null;
  }, [session, data]);

  // ── AUTH ─────────────────────────────────────────────
  function completeLogin(p) {
    const now = nowIso();
    mutate((x) => {
      const r = listFor(x, p.role).find((u) => codeOf(p.role, u) === p.code);
      r.failed_attempts = 0;
      r.last_login = now;
      if (p.role === "admin" && r.mfa_status === "pending_setup") {
        r.mfa_status = "enabled";
        pushAudit(x, p.code, p.role, "MFA_ENROLLED", "Authenticator verified at sign-in");
      }
      pushAudit(x, p.code, p.role, "LOGIN_SUCCESS", `Signed in${p.remember ? " (remember me)" : ""}`);
    });
    try {
      if (p.remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ role: p.role, login_id: listFor(dataRef.current, p.role).find((u) => codeOf(p.role, u) === p.code).login_id }));
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
    setPending(null);
    setLogoutReason("");
    setSession({ role: p.role, code: p.code, remember: !!p.remember, started_at: now, last_active: now, fingerprint: fp });
  }

  const beginLogin = useCallback(
    async ({ role, login_id, password, entered_code, remember }) => {
      const d = dataRef.current;
      const s = d.settings;
      const id = login_id.trim().toLowerCase();
      const rec = listFor(d, role).find((r) => r.login_id.toLowerCase() === id);
      const hash = await sha256(password);
      if (!rec) {
        mutate((x) => pushAudit(x, id || "unknown", role, "LOGIN_FAILED", "Unknown login ID"));
        return { ok: false, error: "Those sign-in details do not match." };
      }
      const code = codeOf(role, rec);
      if (rec.status === "locked") return { ok: false, error: `This account is locked after ${s.max_failed_attempts} failed attempts. Ask your Super Admin to unlock it.` };
      const codeMismatch = (role === "emp" || role === "admin") && (entered_code || "").trim().toUpperCase() !== code;
      if (hash !== rec.password_hash || codeMismatch) {
        return mutate((x) => {
          const r = listFor(x, role).find((u) => codeOf(role, u) === code);
          r.failed_attempts = (r.failed_attempts || 0) + 1;
          const left = s.max_failed_attempts - r.failed_attempts;
          pushAudit(x, code, role, "LOGIN_FAILED", `${codeMismatch && hash === rec.password_hash ? "Code did not match" : "Wrong password"} (attempt ${r.failed_attempts} of ${s.max_failed_attempts})`);
          if (left <= 0) {
            r.status = "locked";
            pushAudit(x, code, role, "ACCOUNT_LOCKED", `${s.max_failed_attempts} failed sign-in attempts`);
            x.superAdmins.forEach((sa) => pushNote(x, sa.superadmin_code, `${rec.full_name} (${code}) was locked after ${s.max_failed_attempts} failed sign-ins.`, "/users"));
            return { ok: false, error: `Account locked after ${s.max_failed_attempts} failed attempts. Ask your Super Admin to unlock it.` };
          }
          return { ok: false, error: `Those sign-in details do not match. ${left} attempt${left === 1 ? "" : "s"} left before the account locks.` };
        });
      }
      if (rec.status !== "active") {
        mutate((x) => pushAudit(x, code, role, "LOGIN_BLOCKED", `Status: ${rec.status}`));
        if (rec.status === "suspended") return { ok: false, error: "This account is suspended. Contact your HR administrator." };
        if (rec.status === "pending_approval") return { ok: false, error: "Your account is waiting for approval by HR. You will be notified when it is activated." };
        return { ok: false, error: "This account request was declined. Contact HR." };
      }
      const needsMfa = (role === "admin" && s.mfa_admin_required) || role === "superadmin";
      const p = { role, code, remember, started: nowIso() };
      if (needsMfa) {
        p.otp = makeOtp();
        p.otp_expires = Date.now() + s.otp_ttl_sec * 1000;
        p.step = "mfa";
        setPending(p);
        mutate((x) => pushAudit(x, code, role, "MFA_CHALLENGE", "Password accepted; one-time code issued"));
        return { ok: true, next: "mfa", otp: p.otp };
      }
      if (rec.must_reset) {
        setPending({ ...p, step: "reset" });
        return { ok: true, next: "reset" };
      }
      completeLogin(p);
      return { ok: true, next: "done" };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutate],
  );

  const resendOtp = useCallback(() => {
    if (!pending) return null;
    const otp = makeOtp();
    setPending({ ...pending, otp, otp_expires: Date.now() + dataRef.current.settings.otp_ttl_sec * 1000 });
    return otp;
  }, [pending]);

  const verifyMfa = useCallback(
    async ({ otp, pin }) => {
      if (!pending) return { ok: false, error: "Your sign-in expired. Start again." };
      const d = dataRef.current;
      const { role, code } = pending;
      if (Date.now() > pending.otp_expires) return { ok: false, error: "That code has expired. Send a new one." };
      if (otp.trim() !== pending.otp) {
        mutate((x) => pushAudit(x, code, role, "MFA_FAILED", "Wrong one-time code"));
        return { ok: false, error: "That code is not right. Check your authenticator and try again." };
      }
      if (role === "superadmin") {
        const rec = d.superAdmins.find((r) => r.superadmin_code === code);
        if ((await sha256(pin || "")) !== rec.security_pin_hash) {
          return mutate((x) => {
            const r = x.superAdmins.find((u) => u.superadmin_code === code);
            r.failed_attempts = (r.failed_attempts || 0) + 1;
            pushAudit(x, code, role, "PIN_FAILED", `Wrong security PIN (attempt ${r.failed_attempts})`);
            if (r.failed_attempts >= d.settings.max_failed_attempts) {
              r.status = "locked";
              setPending(null);
              return { ok: false, error: "Account locked after repeated security PIN failures.", locked: true };
            }
            return { ok: false, error: "That security PIN is not right." };
          });
        }
      }
      const rec = listFor(d, role).find((r) => codeOf(role, r) === code);
      if (rec.must_reset) {
        setPending({ ...pending, step: "reset" });
        return { ok: true, next: "reset" };
      }
      completeLogin(pending);
      return { ok: true, next: "done" };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, mutate],
  );

  const completeReset = useCallback(
    async (newPassword) => {
      if (!pending) return { ok: false, error: "Your sign-in expired. Start again." };
      const { role, code } = pending;
      const hash = await sha256(newPassword);
      const rec = listFor(dataRef.current, role).find((r) => codeOf(role, r) === code);
      if (hash === rec.password_hash) return { ok: false, error: "Choose a password different from the temporary one." };
      mutate((x) => {
        const r = listFor(x, role).find((u) => codeOf(role, u) === code);
        r.password_hash = hash;
        r.must_reset = false;
        r.password_changed_at = nowIso();
        pushAudit(x, code, role, "PASSWORD_RESET", "First-time password set");
      });
      completeLogin(pending);
      return { ok: true };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, mutate],
  );

  const cancelPending = useCallback(() => setPending(null), []);
  const logout = useCallback(
    (reason = "") => {
      if (session) mutate((x) => pushAudit(x, session.code, session.role, reason ? "SESSION_TIMEOUT" : "LOGOUT", reason || "Signed out"));
      setSession(null);
      setLogoutReason(reason);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );
  const touch = useCallback(() => setSession((s) => (s ? { ...s, last_active: nowIso() } : s)), []);
  const rememberedLogin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null");
    } catch {
      return null;
    }
  }, []);

  // ── derived helpers ──────────────────────────────────
  const helpers = useMemo(() => {
    const empBy = Object.fromEntries(data.employees.map((e) => [e.employee_code, e]));
    const adminBy = Object.fromEntries(data.admins.map((a) => [a.admin_code, a]));
    const saBy = Object.fromEntries(data.superAdmins.map((a) => [a.superadmin_code, a]));
    const catBy = Object.fromEntries(data.categories.map((c) => [c.category_id, c]));
    const ruleBy = Object.fromEntries(data.rules.map((r) => [r.rule_id, r]));
    const orgBy = Object.fromEntries(data.orgUnits.map((o) => [o.org_unit_id, o]));
    const leaveTypeBy = Object.fromEntries(data.leaveTypes.map((t) => [t.code, t]));
    const expCatBy = Object.fromEntries(data.expenseCategories.map((c) => [c.code, c]));
    const nameOf = (code) => empBy[code]?.full_name || adminBy[code]?.full_name || saBy[code]?.full_name || (code === "SYSTEM" ? "System" : code || "—");
    const balanceOf = (empCode) => {
      const entries = data.ledger.filter((l) => l.employee_code === empCode);
      const earned = entries.filter((l) => l.points > 0).reduce((s, l) => s + l.points, 0);
      const used = -entries.filter((l) => l.points < 0).reduce((s, l) => s + l.points, 0);
      const pendingPts = data.submissions.filter((s) => s.employee_code === empCode && OPEN_STATUSES.includes(s.status)).reduce((sum, s) => sum + Number(s.points_requested || 0), 0);
      return { earned, used, pending: pendingPts, available: earned - used };
    };
    const scopeUnits = (admin) => {
      const set = new Set(admin?.org_units || []);
      let grew = true;
      while (grew) {
        grew = false;
        data.orgUnits.forEach((o) => {
          if (o.parent_unit && set.has(o.parent_unit) && !set.has(o.org_unit_id)) {
            set.add(o.org_unit_id);
            grew = true;
          }
        });
      }
      return set;
    };
    const reportsOf = (code) => data.employees.filter((e) => e.reporting_manager === code);
    const leaveBalanceOf = (empCode) => leaveBalances(empBy[empCode], leaveTypesFor(data, empBy[empCode]), data.requests);
    // Items waiting on a manager (employee code) or an admin (admin record)
    const pendingForManager = (code) => ({
      requests: data.requests.filter((r) => r.status === "Pending" && r.stage === "manager" && r.steps[0]?.approver === code),
      points: [], // Sahayog points removed (v8.8)
    });
    const pendingForAdmin = (admin) => {
      const scope = scopeUnits(admin);
      const inScope = (empCode) => scope.has(empBy[empCode]?.department);
      return {
        requests: data.requests.filter((r) => r.status === "Pending" && r.stage === "admin" && admin.modules.includes(REQUEST_TYPES[r.type].module) && inScope(r.employee_code)),
        payouts: data.requests.filter((r) => r.status === "Approved" && ["expense", "advance", "loan", "asset"].includes(r.type) && admin.modules.includes(r.type === "asset" ? "assets" : r.type) && inScope(r.employee_code)),
        points: [], // Sahayog points removed (v8.8)
        accounts: admin.modules.includes("accounts") ? data.employees.filter((e) => e.status === "pending_approval" && scope.has(e.department)) : [],
      };
    };
    return { empBy, adminBy, saBy, catBy, ruleBy, orgBy, leaveTypeBy, expCatBy, nameOf, balanceOf, scopeUnits, reportsOf, leaveBalanceOf, pendingForManager, pendingForAdmin, roleOfCode };
  }, [data]);

  function adminFor(d, deptId, module) {
    let unit = deptId;
    while (unit) {
      const a = d.admins.find((ad) => ad.status === "active" && ad.org_units.includes(unit) && ad.modules.includes(module) && ad.permissions_scope.includes("approve"));
      if (a) return a.admin_code;
      unit = d.orgUnits.find((o) => o.org_unit_id === unit)?.parent_unit;
    }
    return null;
  }
  function activeManager(d, emp) {
    const m = d.employees.find((e) => e.employee_code === emp.reporting_manager);
    return m && m.status === "active" ? m.employee_code : null;
  }

  // ── POINTS (employee) ────────────────────────────────
  const saveSubmission = useCallback(
    (form, { submit }) => {
      const d = dataRef.current;
      const me = d.employees.find((e) => e.employee_code === session.code);
      const { errors, flags } = validateSubmission(form, { ...d, employee: me }, { forDraft: !submit });
      if (Object.keys(errors).length) return { ok: false, errors };
      return mutate((x) => {
        let s = form.submission_id && x.submissions.find((i) => i.submission_id === form.submission_id);
        const now = nowIso();
        if (!s) {
          s = { submission_id: nextSeq(x.submissions, `SUB-${new Date().getFullYear()}-`, "submission_id"), employee_code: me.employee_code, status: "Draft", created_at: now, history: [{ status: "Draft", at: now, by: me.employee_code, note: "" }], steps: [], approved_points: null, admin_decision: null, rejection_reason: "", admin_remarks: "", approval_timestamp: null, approver_admin_code: null, flagged: null, escalation: null, override: null };
          x.submissions.unshift(s);
        }
        Object.assign(s, { category_id: form.category_id, rule_id: form.rule_id, description: form.description.trim(), points_requested: form.points_requested === "" ? "" : Number(form.points_requested), activity_date: form.activity_date, supporting_document: form.supporting_document, witness: form.witness, remarks: form.remarks, declaration: !!form.declaration, flags });
        if (submit) {
          const wf = x.settings.workflow.points;
          const mgr = wf !== "admin" ? activeManager(x, me) : null;
          s.status = "Submitted";
          s.submitted_at = now;
          s.manager_code = mgr;
          s.assigned_admin = adminFor(x, me.department, "points");
          s.stage = mgr ? "manager" : "admin";
          s.steps = [{ level: "manager", approver: mgr, status: mgr ? "pending" : "skipped", at: null, note: "" }, { level: "admin", approver: s.assigned_admin, status: mgr ? "waiting" : "pending", at: null, note: "" }];
          s.history.push({ status: "Submitted", at: now, by: me.employee_code, note: flags.length ? `Auto-validation passed with ${flags.length} flag(s)` : "Auto-validation passed" });
          pushNote(x, me.employee_code, `${s.submission_id} was submitted for ${s.points_requested} points.`, "/points/claims");
          if (mgr) pushNote(x, mgr, `${me.full_name} claimed ${s.points_requested} points (${s.submission_id}). Your approval is needed.`, "/inbox");
          else if (s.assigned_admin) pushNote(x, s.assigned_admin, `New claim ${s.submission_id} from ${me.full_name} (${s.points_requested} pts).`, "/approvals");
          pushAudit(x, me.employee_code, "emp", "SUBMIT", `${s.submission_id} · ${s.rule_id} · ${s.points_requested} pts${flags.length ? ` · flags: ${flags.map((f) => f.code).join(", ")}` : ""}`);
        } else pushAudit(x, me.employee_code, "emp", "SAVE_DRAFT", s.submission_id);
        return { ok: true, submission: s };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  const withdrawSubmission = useCallback(
    (id) =>
      mutate((x) => {
        const s = x.submissions.find((i) => i.submission_id === id);
        if (!s || s.status !== "Submitted") return { ok: false, error: "Only claims not yet approved by anyone can be withdrawn." };
        s.status = "Withdrawn";
        s.stage = null;
        s.history.push({ status: "Withdrawn", at: nowIso(), by: s.employee_code, note: "Withdrawn by employee" });
        pushAudit(x, s.employee_code, "emp", "WITHDRAW", id);
        return { ok: true };
      }),
    [mutate],
  );
  const deleteDraft = useCallback(
    (id) =>
      mutate((x) => {
        x.submissions = x.submissions.filter((s) => !(s.submission_id === id && s.status === "Draft"));
        pushAudit(x, session.code, session.role, "DELETE_DRAFT", id);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  // Manager step on a points claim
  const managerDecidePoints = useCallback(
    (id, { approve, note }) =>
      mutate((x) => {
        const s = x.submissions.find((i) => i.submission_id === id);
        if (!s || s.status !== "Submitted" || s.stage !== "manager" || s.manager_code !== session.code) return { ok: false, error: "This claim is not waiting for you." };
        if (!approve && !(note || "").trim()) return { ok: false, error: "Give a reason so the employee knows what to fix." };
        const now = nowIso();
        s.steps[0] = { ...s.steps[0], status: approve ? "approved" : "rejected", at: now, note: note || "" };
        const me = x.employees.find((e) => e.employee_code === session.code);
        if (approve) {
          const final = x.settings.workflow.points === "manager";
          s.history.push({ status: "Manager Approved", at: now, by: session.code, note: note || "" });
          if (final) {
            // Manager-only workflow: credit straight away.
            const pts = Number(s.points_requested);
            Object.assign(s, { status: "Credited", stage: null, admin_decision: "Approve", approved_points: pts, approval_timestamp: now, approver_admin_code: session.code });
            x.ledger.unshift({ entry_id: nextSeq(x.ledger, "LED-", "entry_id"), employee_code: s.employee_code, type: "credit", points: pts, ref: s.submission_id, note: "Approved claim", at: now });
            s.history.push({ status: "Credited", at: now, by: "SYSTEM", note: `${pts} points credited` });
            pushNote(x, s.employee_code, `${s.submission_id} approved by ${me.full_name}: ${pts} points credited.`, "/points/ledger");
          } else {
            s.status = "Manager Approved";
            s.stage = "admin";
            s.steps[1] = { ...s.steps[1], status: "pending" };
            pushNote(x, s.employee_code, `${me.full_name} approved ${s.submission_id}; it is now with HR.`, "/points/claims");
            pushNote(x, s.assigned_admin, `${s.submission_id} was approved by ${me.full_name} and needs your decision.`, "/approvals");
          }
        } else {
          Object.assign(s, { status: "Rejected", stage: null, rejection_reason: note.trim(), approval_timestamp: now, approver_admin_code: session.code });
          s.history.push({ status: "Rejected", at: now, by: session.code, note: note.trim() });
          pushNote(x, s.employee_code, `${s.submission_id} was rejected by ${me.full_name}: ${note.trim()}`, "/points/claims");
        }
        pushAudit(x, session.code, "emp", approve ? "MANAGER_APPROVE" : "MANAGER_REJECT", `${id}${note ? ` · ${note}` : ""}`);
        return { ok: true };
      }),
    [session, mutate],
  );

  const redeem = useCallback(
    (points) => {
      const d = dataRef.current;
      const me = d.employees.find((e) => e.employee_code === session.code);
      const bal = helpers.balanceOf(me.employee_code);
      const p = Number(points);
      if (!Number.isInteger(p) || p < d.settings.min_redeem_points) return { ok: false, error: `Redeem at least ${d.settings.min_redeem_points} points.` };
      if (p > bal.available) return { ok: false, error: `You have ${bal.available} points available.` };
      if (!me.bank_account) return { ok: false, error: "Add your bank account in My profile first." };
      return mutate((x) => {
        const ref = nextSeq(x.redemptions, "RDM-", "ref");
        x.redemptions.push({ ref, employee_code: me.employee_code, points: p, amount_inr: p * x.settings.point_value_inr, status: "Payout queued", at: nowIso() });
        x.ledger.unshift({ entry_id: nextSeq(x.ledger, "LED-", "entry_id"), employee_code: me.employee_code, type: "redeem", points: -p, ref, note: `Payout to bank ${maskAccount(me.bank_account)}`, at: nowIso() });
        pushNote(x, me.employee_code, `${p} points redeemed (₹${p * x.settings.point_value_inr}). Paid with the next payroll.`, "/points/ledger");
        pushAudit(x, me.employee_code, "emp", "REDEEM", `${ref} · ${p} pts`);
        return { ok: true, ref };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, helpers, mutate],
  );

  // ── REQUESTS: leave / expense / advance / loan ───────
  const createRequest = useCallback(
    (type, form) => {
      const d = dataRef.current;
      const me = d.employees.find((e) => e.employee_code === session.code);
      let v;
      if (type === "leave") v = validateLeave(form, { emp: me, leaveTypes: leaveTypesFor(d, me), holidays: holidaysFor(d, me), requests: d.requests });
      if (type === "expense") v = validateExpense(form, { emp: me, expenseCategories: d.expenseCategories, settings: d.settings });
      if (type === "advance") v = validateAdvance(form, { settings: d.settings, requests: d.requests, emp: me });
      if (type === "loan") v = validateLoan(form, { settings: d.settings, emp: me, requests: d.requests });
      if (type === "regularize") v = validateRegularize(form, { settings: d.settings, punches: d.punches, emp: me });
      if (type === "asset") v = validateAssetRequest(form);
      if (type === "screenoff") v = validateScreenOff(form, { settings: d.settings, available: form.date ? (hoursInRange(d, me.employee_code, form.date, form.date).days[0]?.claimable || 0) * 60 : null });
      if (Object.keys(v.errors).length) return { ok: false, errors: v.errors, itemErrors: v.itemErrors };
      return mutate((x) => {
        const now = nowIso();
        // Screen-off claims are approved by the reporting manager only (HR admin when there is no manager).
        const wf = x.settings.workflow?.[type] || (type === "screenoff" ? "manager" : "manager_admin");
        const mgr = wf !== "admin" ? activeManager(x, me) : null;
        const adminCode = wf === "manager" && mgr ? null : adminFor(x, me.department, REQUEST_TYPES[type].module);
        const id = nextSeq(x.requests.filter((r) => r.type === type), REQUEST_TYPES[type].prefix, "request_id");
        const payload = { ...form };
        delete payload.declaration;
        if (type === "leave") payload.days = v.days;
        if (type === "loan") payload.emi = v.emi;
        if (type === "expense") payload.items = form.items.map((i) => ({ ...i, amount: Number(i.amount) }));
        if (type === "advance") payload.request_amount = Number(form.request_amount);
        if (type === "loan") payload.amount = Number(form.amount);
        if (type === "screenoff") { payload.minutes = Math.round(Number(form.minutes)); payload.reason = form.reason.trim(); }
        const r = {
          ...payload,
          request_id: id,
          type,
          employee_code: me.employee_code,
          status: "Pending",
          stage: mgr ? "manager" : "admin",
          flags: v.flags || [],
          steps: [
            { level: "manager", approver: mgr, status: mgr ? "pending" : "skipped", at: null, note: "" },
            ...(wf === "manager" && mgr ? [] : [{ level: "admin", approver: adminCode, status: mgr ? "waiting" : "pending", at: null, note: "" }]),
          ],
          history: [{ status: "Submitted", at: now, by: me.employee_code, note: "" }],
          created_at: now,
        };
        x.requests.unshift(r);
        const label = REQUEST_TYPES[type].label.toLowerCase();
        const amount = type === "leave" ? `${v.days} day(s)` : type === "expense" ? `₹${fmtNum(v.total)}` : type === "regularize" ? payload.date : type === "screenoff" ? `${fmtMins(payload.minutes)} on ${payload.date}` : type === "asset" ? payload.category : `₹${fmtNum(payload.request_amount || payload.amount)}`;
        pushNote(x, me.employee_code, `Your ${label} ${id} (${amount}) was sent for approval.`, linkFor(r));
        if (mgr) pushNote(x, mgr, `${me.full_name} sent a ${label} ${id} (${amount}) for your approval.`, "/inbox");
        else pushNote(x, adminCode, `${me.full_name} sent a ${label} ${id} (${amount}).`, "/approvals");
        pushAudit(x, me.employee_code, "emp", `${type.toUpperCase()}_SUBMIT`, `${id} · ${amount}`);
        return { ok: true, id };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  const cancelRequest = useCallback(
    (id) =>
      mutate((x) => {
        const r = x.requests.find((i) => i.request_id === id);
        if (!r || r.employee_code !== session.code) return { ok: false, error: "Not your request." };
        const futureLeave = r.type === "leave" && r.status === "Approved" && r.from_date > new Date().toISOString().slice(0, 10);
        if (r.status !== "Pending" && !futureLeave) return { ok: false, error: "Only pending requests (or approved future leave) can be cancelled." };
        r.status = "Cancelled";
        r.stage = null;
        r.history.push({ status: "Cancelled", at: nowIso(), by: session.code, note: "Cancelled by employee" });
        const notify = r.steps.find((st) => st.status === "pending" || st.status === "approved")?.approver;
        pushNote(x, notify, `${id} was cancelled by ${x.employees.find((e) => e.employee_code === session.code).full_name}.`, notify?.startsWith("ADM") ? "/approvals" : "/inbox");
        pushAudit(x, session.code, "emp", "REQUEST_CANCEL", id);
        return { ok: true };
      }),
    [session, mutate],
  );

  // Decide the current step. Managers act on stage "manager"; admins on stage "admin".
  function applyRequestDecision(x, r, { approve, note, approved_amount }) {
    const now = nowIso();
    const role = session.role;
    const isMgr = role === "emp";
    if (r.status !== "Pending") return { ok: false, error: "This request is no longer pending." };
    if (isMgr && (r.stage !== "manager" || r.steps[0].approver !== session.code)) return { ok: false, error: "This request is not waiting for you." };
    if (!isMgr && r.stage !== "admin") return { ok: false, error: "This request is still with the manager." };
    if (!approve && !(note || "").trim()) return { ok: false, error: "A reason is required to reject." };
    const idx = isMgr ? 0 : r.steps.findIndex((st) => st.level === "admin");
    const label = REQUEST_TYPES[r.type].label;
    const actorName = isMgr ? x.employees.find((e) => e.employee_code === session.code).full_name : x.admins.find((a) => a.admin_code === session.code)?.full_name || "Super Admin";
    r.steps[idx] = { ...r.steps[idx], approver: session.code, status: approve ? "approved" : "rejected", at: now, note: note || "" };
    if (!approve) {
      r.status = "Rejected";
      r.stage = null;
      r.history.push({ status: "Rejected", at: now, by: session.code, note: note.trim() });
      pushNote(x, r.employee_code, `${label} ${r.request_id} was rejected by ${actorName}: ${note.trim()}`, linkFor(r));
      return { ok: true };
    }
    if (!isMgr && ["expense", "advance", "loan"].includes(r.type) && approved_amount != null && approved_amount !== "") {
      const asked = r.type === "expense" ? expenseTotal(r.items) : r.request_amount || r.amount;
      const amt = Number(approved_amount);
      if (Number.isNaN(amt) || amt <= 0 || amt > asked) return { ok: false, error: `Approved amount must be between 1 and ₹${fmtNum(asked)}.` };
      if (amt < asked && !(note || "").trim()) return { ok: false, error: "Explain why you are approving less than claimed." };
      r.approved_amount = amt;
      if (r.type === "loan") r.emi = Math.ceil(amt / r.tenure_months);
    }
    const nextIdx = r.steps.findIndex((st, i) => i > idx && st.status === "waiting");
    if (nextIdx > -1) {
      r.steps[nextIdx].status = "pending";
      r.stage = "admin";
      r.history.push({ status: "Manager approved", at: now, by: session.code, note: note || "" });
      pushNote(x, r.employee_code, `${actorName} approved ${r.request_id}; it is now with ${["leave", "regularize", "screenoff"].includes(r.type) ? "HR" : r.type === "asset" ? "the asset team" : "Finance"}.`, linkFor(r));
      pushNote(x, r.steps[nextIdx].approver, `${label} ${r.request_id} from ${x.employees.find((e) => e.employee_code === r.employee_code).full_name} needs your approval.`, "/approvals");
    } else {
      r.status = "Approved";
      r.stage = null;
      r.history.push({ status: "Approved", at: now, by: session.code, note: note || "" });
      const tail = r.type === "expense" ? " Reimbursement will follow." : r.type === "advance" || r.type === "loan" ? " Disbursement will follow." : r.type === "asset" ? " The asset team will assign it from stock." : r.type === "regularize" ? " Your attendance for that day is corrected." : r.type === "screenoff" ? ` ${fmtMins(r.minutes)} was moved from screen-off time into your worked hours for ${r.date}.` : "";
      if (r.type === "regularize") {
        // Replace that day's punches with the approved times.
        const keep = x.punches.filter((p) => !(p.employee_code === r.employee_code && p.ts.startsWith(r.date)));
        const mk = (type, t) => ({ id: `PN-R${r.request_id}-${type}`, employee_code: r.employee_code, ts: new Date(`${r.date}T${t}:00`).toISOString(), type, source: "regularized", device_id: null, verified: "approval", lat: null, lng: null, accuracy: null, geofence_id: null, inside: true, flag: null, ref: r.request_id });
        x.punches = [...keep, mk("in", r.in_time), mk("out", r.out_time)];
      }
      pushNote(x, r.employee_code, `${label} ${r.request_id} was approved by ${actorName}.${tail}`, linkFor(r));
    }
    return { ok: true };
  }
  const linkFor = (r) => ({ leave: "/leave", loan: "/finances", regularize: "/attendance", asset: "/assets", screenoff: "/home" })[r.type] || "/expenses";

  const decideRequest = useCallback(
    (id, payload) =>
      mutate((x) => {
        const r = x.requests.find((i) => i.request_id === id);
        const res = applyRequestDecision(x, r, payload);
        if (res.ok) pushAudit(x, session.code, session.role, `${r.type.toUpperCase()}_${payload.approve ? "APPROVE" : "REJECT"}`, `${id}${payload.approved_amount ? ` · ₹${payload.approved_amount}` : ""}${payload.note ? ` · ${payload.note}` : ""}`);
        return res;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  const bulkDecideRequests = useCallback(
    (ids, approve, note = "") =>
      mutate((x) => {
        let done = 0;
        const skipped = [];
        ids.forEach((id) => {
          const r = x.requests.find((i) => i.request_id === id);
          const res = r ? applyRequestDecision(x, r, { approve, note }) : { ok: false };
          if (res.ok) done += 1;
          else skipped.push(id);
        });
        pushAudit(x, session.code, session.role, approve ? "BULK_APPROVE" : "BULK_REJECT", `${done} request(s); skipped ${skipped.length}`);
        return { ok: true, done, skipped };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  // Finance: mark an approved expense paid, or an advance / loan disbursed.
  const payoutRequest = useCallback(
    (id, { ref, date }) =>
      mutate((x) => {
        const r = x.requests.find((i) => i.request_id === id);
        if (!r || r.status !== "Approved") return { ok: false, error: "Only approved requests can be paid." };
        if (!(ref || "").trim() || !date) return { ok: false, error: "Enter the payment reference and date." };
        const amount = r.approved_amount ?? (r.type === "expense" ? expenseTotal(r.items) : r.request_amount || r.amount);
        r.approved_amount = amount;
        r.payment_ref = ref.trim();
        if (r.type === "expense") {
          r.status = "Paid";
          r.paid_on = date;
        } else {
          r.status = "Disbursed";
          r.disbursed_date = date;
          if (r.type === "advance") r.settle_by = new Date(new Date(date).getTime() + x.settings.advance_settle_days * 86400000).toISOString().slice(0, 10);
        }
        r.history.push({ status: r.status, at: nowIso(), by: session.code, note: ref.trim() });
        pushNote(x, r.employee_code, `${REQUEST_TYPES[r.type].label} ${id}: ₹${fmtNum(amount)} ${r.status === "Paid" ? "reimbursed" : "disbursed"} (${ref.trim()}).`, linkFor(r));
        pushAudit(x, session.code, session.role, r.status === "Paid" ? "EXPENSE_PAID" : "DISBURSED", `${id} · ₹${amount} · ${ref.trim()}`);
        return { ok: true };
      }),
    [session, mutate],
  );

  // ── ADMIN: points decisions ──────────────────────────
  const openForReview = useCallback(
    (id) => {
      const s0 = dataRef.current.submissions.find((i) => i.submission_id === id);
      if (!s0 || !(s0.status === "Manager Approved" || (s0.status === "Submitted" && s0.stage === "admin"))) return;
      mutate((x) => {
        const s = x.submissions.find((i) => i.submission_id === id);
        s.status = "Under Review";
        s.history.push({ status: "Under Review", at: nowIso(), by: session.code, note: "" });
        pushNote(x, s.employee_code, `${id} is now under review by HR.`, "/points/claims");
        pushAudit(x, session.code, session.role, "REVIEW_OPEN", id);
      });
    },
    [session, mutate],
  );

  function applyDecision(x, s, { decision, approved_points, rejection_reason, admin_remarks }, by, role) {
    const now = nowIso();
    const rule = x.rules.find((r) => r.rule_id === s.rule_id);
    const adminStep = s.steps?.find((st) => st.level === "admin");
    if (decision === "Approve") {
      const pts = Number(approved_points);
      if (!Number.isInteger(pts) || pts < 1) return { ok: false, error: "Approved points must be a whole number of 1 or more." };
      if (pts > rule.points) return { ok: false, error: `Approved points cannot exceed the rule maximum (${rule.points}).` };
      Object.assign(s, { admin_decision: "Approve", approved_points: pts, rejection_reason: "", admin_remarks: admin_remarks || "", approval_timestamp: now, approver_admin_code: by, status: "Approved", stage: null });
      if (adminStep) Object.assign(adminStep, { status: "approved", at: now, approver: by, note: admin_remarks || "" });
      s.history.push({ status: "Approved", at: now, by, note: admin_remarks || (pts !== Number(s.points_requested) ? `Approved ${pts} of ${s.points_requested}` : "") });
      if (x.settings.auto_credit_on_approval) {
        x.ledger.unshift({ entry_id: nextSeq(x.ledger, "LED-", "entry_id"), employee_code: s.employee_code, type: "credit", points: pts, ref: s.submission_id, note: "Approved claim", at: now });
        s.status = "Credited";
        s.history.push({ status: "Credited", at: now, by: "SYSTEM", note: `${pts} points credited` });
        pushNote(x, s.employee_code, `${s.submission_id} approved: ${pts} points credited${pts !== Number(s.points_requested) ? ` (you asked for ${s.points_requested})` : ""}.`, "/points/ledger");
      }
      pushAudit(x, by, role, "APPROVE", `${s.submission_id} · ${pts} of ${s.points_requested} pts${admin_remarks ? ` · ${admin_remarks}` : ""}`);
    } else if (decision === "Reject") {
      if (!(rejection_reason || "").trim()) return { ok: false, error: "A rejection reason is required." };
      Object.assign(s, { admin_decision: "Reject", approved_points: 0, rejection_reason: rejection_reason.trim(), admin_remarks: admin_remarks || "", approval_timestamp: now, approver_admin_code: by, status: "Rejected", stage: null });
      if (adminStep) Object.assign(adminStep, { status: "rejected", at: now, approver: by, note: rejection_reason.trim() });
      s.history.push({ status: "Rejected", at: now, by, note: rejection_reason.trim() });
      pushNote(x, s.employee_code, `${s.submission_id} was rejected: ${rejection_reason.trim()}`, "/points/claims");
      pushAudit(x, by, role, "REJECT", `${s.submission_id} · ${rejection_reason.trim()}`);
    } else if (decision === "Hold") {
      if (!(admin_remarks || "").trim()) return { ok: false, error: "Add a remark telling the employee what is needed." };
      Object.assign(s, { admin_decision: "Hold", admin_remarks: admin_remarks.trim(), status: "On Hold" });
      s.history.push({ status: "On Hold", at: now, by, note: admin_remarks.trim() });
      pushNote(x, s.employee_code, `${s.submission_id} is on hold: ${admin_remarks.trim()}`, "/points/claims");
      pushAudit(x, by, role, "HOLD", `${s.submission_id} · ${admin_remarks.trim()}`);
    }
    return { ok: true };
  }

  const decide = useCallback(
    (id, payload) =>
      mutate((x) => {
        const s = x.submissions.find((i) => i.submission_id === id);
        if (!s || !OPEN_STATUSES.includes(s.status) || s.stage === "manager") return { ok: false, error: "This claim is not open for an admin decision." };
        if (s.status !== "Under Review") s.history.push({ status: "Under Review", at: nowIso(), by: session.code, note: "" });
        return applyDecision(x, s, payload, session.code, session.role);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  const bulkDecide = useCallback(
    (ids, decision, reason = "") =>
      mutate((x) => {
        let done = 0;
        const skipped = [];
        ids.forEach((id) => {
          const s = x.submissions.find((i) => i.submission_id === id);
          if (!s || !OPEN_STATUSES.includes(s.status) || s.status === "Escalated" || s.stage === "manager") return skipped.push(id);
          if (decision === "Approve" && (s.flagged || s.flags?.some((f) => f.level === "warn"))) return skipped.push(id);
          const r = applyDecision(x, s, { decision, approved_points: s.points_requested, rejection_reason: reason, admin_remarks: decision === "Approve" ? "Bulk approved" : "" }, session.code, session.role);
          if (r.ok) done += 1;
          else skipped.push(id);
        });
        return { ok: true, done, skipped };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  const escalate = useCallback(
    (id, note) =>
      mutate((x) => {
        if (!note.trim()) return { ok: false, error: "Say why you are escalating." };
        const s = x.submissions.find((i) => i.submission_id === id);
        const now = nowIso();
        s.status = "Escalated";
        s.escalation = { by: session.code, at: now, note: note.trim() };
        s.history.push({ status: "Escalated", at: now, by: session.code, note: note.trim() });
        x.superAdmins.forEach((sa) => pushNote(x, sa.superadmin_code, `${id} escalated by ${session.code}: ${note.trim()}`, "/requests"));
        pushAudit(x, session.code, session.role, "ESCALATE", `${id} · ${note.trim()}`);
        return { ok: true };
      }),
    [session, mutate],
  );
  const setFlag = useCallback(
    (id, reason) =>
      mutate((x) => {
        const s = x.submissions.find((i) => i.submission_id === id);
        s.flagged = reason ? { by: session.code, at: nowIso(), reason } : null;
        pushAudit(x, session.code, session.role, reason ? "FLAG" : "UNFLAG", `${id}${reason ? ` · ${reason}` : ""}`);
        if (reason) x.superAdmins.forEach((sa) => pushNote(x, sa.superadmin_code, `${id} was flagged as suspicious by ${session.code}.`, "/reports"));
        return { ok: true };
      }),
    [session, mutate],
  );
  const reassign = useCallback(
    (id, adminCode, note) =>
      mutate((x) => {
        const s = x.submissions.find((i) => i.submission_id === id);
        const from = s.assigned_admin;
        s.assigned_admin = adminCode;
        const st = s.steps?.find((t) => t.level === "admin");
        if (st) st.approver = adminCode;
        s.history.push({ status: s.status, at: nowIso(), by: session.code, note: `Reassigned from ${from || "—"} to ${adminCode}${note ? `: ${note}` : ""}` });
        pushNote(x, adminCode, `${id} was reassigned to you by ${session.code}.`, "/approvals");
        pushAudit(x, session.code, session.role, "REASSIGN", `${id} · ${from || "—"} → ${adminCode}`);
        return { ok: true };
      }),
    [session, mutate],
  );

  const decideAccount = useCallback(
    (empCode, approve, note = "") =>
      mutate((x) => {
        const e = x.employees.find((i) => i.employee_code === empCode);
        if (e.status !== "pending_approval") return { ok: false, error: "This account is not waiting for approval." };
        e.status = approve ? "active" : "rejected";
        e.account_decided_by = session.code;
        e.account_decided_at = nowIso();
        pushAudit(x, session.code, session.role, approve ? "ACCOUNT_APPROVE" : "ACCOUNT_REJECT", `${empCode}${note ? ` · ${note}` : ""}`);
        if (approve) pushNote(x, empCode, "Your account is active. Sign in with your temporary password; you will be asked to set a new one.", "/home");
        return { ok: true };
      }),
    [session, mutate],
  );

  // ── EMPLOYEES (master) ───────────────────────────────
  const upsertEmployee = useCallback(
    (rec) => {
      const d = dataRef.current;
      const role = session.role === "superadmin" ? "super" : session.role === "admin" ? "admin" : "self";
      const isNew = !rec.employee_code;
      const code = isNew ? nextSeq(d.employees, "EMP", "employee_code", 3) : rec.employee_code;
      const base = isNew ? {} : d.employees.find((e) => e.employee_code === code);
      const merged = { ...base, ...rec, employee_code: code, login_id: (rec.login_id || rec.email || "").trim().toLowerCase() };
      merged.worker_type = workerTypeOf(merged);
      // Contingent workers: monthly gross is the monthly equivalent of the contract rate, so CTC, budgets and analytics stay right.
      if (isContingent(merged)) merged.monthly_gross = monthlyEquivalent(merged);
      const errors = validateEmployee(merged, { role: role === "admin" ? "super" : role, employees: d.employees });
      if (Object.keys(errors).length) return { ok: false, errors };
      return mutate((x) => {
        if (isNew) {
          x.employees.push({ ...merged, status: "pending_approval", must_reset: true, failed_attempts: 0, password_hash: "c75f28325cfa028ea13872f977a29e0e87c99a4f390fe260f24d7e1f05fb8d75", last_login: null, hr_synced_at: nowIso(), profile_photo: null });
          const adm = adminFor(x, merged.department, "accounts");
          pushNote(x, adm, `New employee ${merged.full_name} (${code}) is waiting for account approval.`, "/approvals");
          pushAudit(x, session.code, session.role, "EMPLOYEE_CREATE", `${code} · ${merged.full_name} · ${merged.department}`);
        } else {
          const e = x.employees.find((i) => i.employee_code === code);
          const changed = Object.keys(rec).filter((k) => JSON.stringify(e[k]) !== JSON.stringify(merged[k]));
          Object.assign(e, merged);
          pushAudit(x, session.code, session.role, "EMPLOYEE_UPDATE", `${code} · ${changed.join(", ") || "no changes"}`);
        }
        return { ok: true, code };
      });
    },
    [session, mutate],
  );
  const removeEmployee = useCallback(
    (code) =>
      mutate((x) => {
        const e = x.employees.find((i) => i.employee_code === code);
        if (!e) return { ok: false };
        if (x.employees.some((i) => i.reporting_manager === code && i.status === "active")) return { ok: false, error: `${e.full_name} still has direct reports. Move them to another manager first.` };
        e.status = "rejected";
        e.exited_at = nowIso();
        x.employees = x.employees.filter((i) => i.employee_code !== code);
        pushAudit(x, session.code, session.role, "EMPLOYEE_REMOVE", `${code} · ${e.full_name}`);
        return { ok: true };
      }),
    [session, mutate],
  );

  const updateProfile = useCallback(
    (patch) => {
      const d = dataRef.current;
      const me = d.employees.find((i) => i.employee_code === session.code);
      const errors = validateEmployee({ ...me, ...patch }, { role: "self" });
      Object.keys(errors).forEach((k) => {
        if (!(k in patch)) delete errors[k];
      });
      if (Object.keys(errors).length) return { ok: false, errors };
      return mutate((x) => {
        const e = x.employees.find((i) => i.employee_code === session.code);
        const changed = Object.keys(patch).filter((k) => e[k] !== patch[k]);
        Object.assign(e, patch);
        pushAudit(x, e.employee_code, "emp", "PROFILE_UPDATE", `Changed: ${changed.join(", ") || "nothing"}`);
        return { ok: true };
      });
    },
    [session, mutate],
  );

  const changePassword = useCallback(
    async (current, next) => {
      const rec = listFor(dataRef.current, session.role).find((r) => codeOf(session.role, r) === session.code);
      if ((await sha256(current)) !== rec.password_hash) return { ok: false, error: "Your current password is not right." };
      const h = await sha256(next);
      if (h === rec.password_hash) return { ok: false, error: "Choose a different password." };
      mutate((x) => {
        const r = listFor(x, session.role).find((u) => codeOf(session.role, u) === session.code);
        r.password_hash = h;
        r.password_changed_at = nowIso();
        pushAudit(x, session.code, session.role, "PASSWORD_CHANGE", "Password changed");
      });
      return { ok: true };
    },
    [session, mutate],
  );

  // ── SUPER ADMIN ──────────────────────────────────────
  const override = useCallback(
    (id, { decision, approved_points, note }) =>
      mutate((x) => {
        if (!(note || "").trim()) return { ok: false, error: "An audit note is required for overrides." };
        const s = x.submissions.find((i) => i.submission_id === id);
        const prevCredited = x.ledger.filter((l) => l.ref === s.submission_id).reduce((a, l) => a + l.points, 0);
        const now = nowIso();
        const rule = x.rules.find((r) => r.rule_id === s.rule_id);
        let newCredit = 0;
        if (decision === "Approve") {
          newCredit = Number(approved_points);
          if (!Number.isInteger(newCredit) || newCredit < 1 || newCredit > rule.points) return { ok: false, error: `Points must be 1 to ${rule.points}.` };
        }
        const diff = newCredit - prevCredited;
        if (diff !== 0) x.ledger.unshift({ entry_id: nextSeq(x.ledger, "LED-", "entry_id"), employee_code: s.employee_code, type: "adjust", points: diff, ref: s.submission_id, note: `Super Admin override: ${note.trim()}`, at: now });
        Object.assign(s, { status: decision === "Approve" ? "Credited" : "Rejected", stage: null, admin_decision: decision, approved_points: decision === "Approve" ? newCredit : 0, rejection_reason: decision === "Reject" ? note.trim() : "", approval_timestamp: now, approver_admin_code: session.code, override: { by: session.code, at: now, note: note.trim(), previous_status: s.status } });
        s.history.push({ status: decision === "Approve" ? "Approved" : "Rejected", at: now, by: session.code, note: `Override: ${note.trim()}` });
        if (decision === "Approve") s.history.push({ status: "Credited", at: now, by: "SYSTEM", note: `${newCredit} points credited` });
        pushNote(x, s.employee_code, `${id} was ${decision === "Approve" ? `approved for ${newCredit} points` : "rejected"} by a Super Admin: ${note.trim()}`, "/points/claims");
        pushAudit(x, session.code, "superadmin", "OVERRIDE", `${id} · ${decision}${decision === "Approve" ? ` ${newCredit} pts` : ""} · ${note.trim()}`);
        return { ok: true };
      }),
    [session, mutate],
  );

  const overrideRequest = useCallback(
    (id, { approve, note }) =>
      mutate((x) => {
        if (!(note || "").trim()) return { ok: false, error: "An audit note is required for overrides." };
        const r = x.requests.find((i) => i.request_id === id);
        const now = nowIso();
        const prev = r.status;
        r.status = approve ? "Approved" : "Rejected";
        r.stage = null;
        r.override = { by: session.code, at: now, note: note.trim(), previous_status: prev };
        r.history.push({ status: r.status, at: now, by: session.code, note: `Override: ${note.trim()}` });
        pushNote(x, r.employee_code, `${REQUEST_TYPES[r.type].label} ${id} was ${approve ? "approved" : "rejected"} by a Super Admin: ${note.trim()}`, linkFor(r));
        pushAudit(x, session.code, "superadmin", "OVERRIDE", `${id} · ${prev} → ${r.status} · ${note.trim()}`);
        return { ok: true };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );

  const upsertAdmin = useCallback(
    async (rec, tempPassword) => {
      const hash = tempPassword ? await sha256(tempPassword) : null;
      return mutate((x) => {
        const id = rec.login_id.trim().toLowerCase();
        if (x.admins.some((a) => a.login_id.toLowerCase() === id && a.admin_code !== rec.admin_code)) return { ok: false, error: "Another admin already uses that login ID." };
        const existing = x.admins.find((a) => a.admin_code === rec.admin_code);
        if (existing) {
          Object.assign(existing, { full_name: rec.full_name, email: rec.email, login_id: id, org_units: rec.org_units, permissions_scope: rec.permissions_scope, modules: rec.modules });
          pushAudit(x, session.code, "superadmin", "ADMIN_UPDATE", `${rec.admin_code} · scope ${rec.org_units.join(", ")} · modules ${rec.modules.join(", ")}`);
          return { ok: true };
        }
        const code = nextSeq(x.admins, "ADM", "admin_code", 2);
        x.admins.push({ ...rec, admin_code: code, login_id: id, mfa_status: "pending_setup", status: "active", failed_attempts: 0, must_reset: true, password_hash: hash, last_login: null, created_at: nowIso() });
        pushAudit(x, session.code, "superadmin", "ADMIN_CREATE", `${code} · ${rec.full_name} · modules ${rec.modules.join(", ")}`);
        return { ok: true, code };
      });
    },
    [session, mutate],
  );
  const setUserStatus = useCallback(
    (role, code, status) =>
      mutate((x) => {
        const r = listFor(x, role).find((u) => codeOf(role, u) === code);
        const prev = r.status;
        r.status = status;
        if (status === "active") r.failed_attempts = 0;
        pushAudit(x, session.code, "superadmin", status === "active" && prev === "locked" ? "ACCOUNT_UNLOCK" : "STATUS_OVERRIDE", `${code}: ${prev} → ${status}`);
        return { ok: true };
      }),
    [session, mutate],
  );
  const forceReset = useCallback(
    async (role, code) => {
      const hash = await sha256("Welcome@123");
      return mutate((x) => {
        const r = listFor(x, role).find((u) => codeOf(role, u) === code);
        Object.assign(r, { must_reset: true, password_hash: hash, failed_attempts: 0 });
        if (r.status === "locked") r.status = "active";
        pushAudit(x, session.code, "superadmin", "FORCE_RESET", `${code} must set a new password at next sign-in`);
        return { ok: true };
      });
    },
    [session, mutate],
  );
  const resetMfa = useCallback(
    (code) =>
      mutate((x) => {
        x.admins.find((i) => i.admin_code === code).mfa_status = "pending_setup";
        pushAudit(x, session.code, "superadmin", "MFA_RESET", `${code} must re-enrol MFA`);
        return { ok: true };
      }),
    [session, mutate],
  );
  const hrSync = useCallback(
    () =>
      mutate((x) => {
        const added = HR_FEED.filter((e) => !x.employees.some((i) => i.employee_code === e.employee_code)).map((e) => ({ ...clone(e), hr_synced_at: nowIso() }));
        x.employees.push(...added);
        x.employees.forEach((e) => {
          e.hr_synced_at = nowIso();
        });
        added.forEach((e) => pushNote(x, adminFor(x, e.department, "accounts"), `New employee ${e.full_name} (${e.employee_code}) is waiting for account approval.`, "/approvals"));
        pushAudit(x, session?.code || "SYSTEM", session?.role || "system", "HR_SYNC", `${x.employees.length} records checked; ${added.length} new (pending approval)`);
        return { ok: true, added: added.length };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, mutate],
  );
  const upsertCategory = useCallback(
    (c) =>
      mutate((x) => {
        const ex = x.categories.find((i) => i.category_id === c.category_id);
        if (ex) Object.assign(ex, c);
        else x.categories.push({ ...c, category_id: `CAT-${c.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${x.categories.length + 1}` });
        pushAudit(x, session.code, "superadmin", "CONFIG_CHANGE", `Category ${c.category_id || c.name}: max ${c.max_points}`);
        return { ok: true };
      }),
    [session, mutate],
  );
  const upsertRule = useCallback(
    (r) =>
      mutate((x) => {
        const cat = x.categories.find((c) => c.category_id === r.category);
        if (Number(r.points) > cat.max_points) return { ok: false, error: `Points cannot exceed the category maximum (${cat.max_points}).` };
        const ex = x.rules.find((i) => i.rule_id === r.rule_id);
        const clean = { ...r, points: Number(r.points), validity_days: Number(r.validity_days) };
        if (ex) Object.assign(ex, clean);
        else x.rules.push({ ...clean, rule_id: nextSeq(x.rules, "RULE-", "rule_id", 2) });
        pushAudit(x, session.code, "superadmin", "CONFIG_CHANGE", `Rule ${r.rule_id || "new"} · ${r.sub_category}: ${r.points} pts, ${r.validity_days} days`);
        return { ok: true };
      }),
    [session, mutate],
  );
  const updateMaster = useCallback(
    (key, list) =>
      mutate((x) => {
        x[key] = list;
        pushAudit(x, session.code, "superadmin", "CONFIG_CHANGE", `${key} updated (${list.length} rows)`);
        return { ok: true };
      }),
    [session, mutate],
  );
  const updateSettings = useCallback(
    (patch) =>
      mutate((x) => {
        const changes = Object.keys(patch).filter((k) => JSON.stringify(x.settings[k]) !== JSON.stringify(patch[k])).map((k) => `${k}: ${JSON.stringify(x.settings[k])} → ${JSON.stringify(patch[k])}`);
        Object.assign(x.settings, patch);
        if (changes.length) pushAudit(x, session.code, "superadmin", "CONFIG_CHANGE", changes.join("; "));
        return { ok: true, changed: changes.length };
      }),
    [session, mutate],
  );
  const adjustPoints = useCallback(
    (empCode, points, note) =>
      mutate((x) => {
        const p = Number(points);
        if (!Number.isInteger(p) || p === 0) return { ok: false, error: "Enter a non-zero whole number." };
        if (!note.trim()) return { ok: false, error: "An audit note is required." };
        x.ledger.unshift({ entry_id: nextSeq(x.ledger, "LED-", "entry_id"), employee_code: empCode, type: "adjust", points: p, ref: "MANUAL", note: note.trim(), at: nowIso() });
        pushNote(x, empCode, `${p > 0 ? "+" : ""}${p} points adjusted by a Super Admin: ${note.trim()}`, "/points/ledger");
        pushAudit(x, session.code, "superadmin", "POINTS_ADJUST", `${empCode} · ${p} · ${note.trim()}`);
        return { ok: true };
      }),
    [session, mutate],
  );

  const markRead = useCallback((id) => mutate((x) => { const n = x.notifications.find((i) => i.id === id); if (n) n.read = true; }), [mutate]);
  const markAllRead = useCallback(() => mutate((x) => x.notifications.forEach((n) => { if (n.to === session?.code) n.read = true; })), [session, mutate]);
  const resetDemo = useCallback(() => {
    const fresh = clone(buildSeed());
    dataRef.current = fresh;
    setData(fresh);
    setSession(null);
    setPending(null);
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ops = useMemo(() => makeOpsActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const offerOps = useMemo(() => makeOfferActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const payslipOps = useMemo(() => makePayslipActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const docOps = useMemo(() => makeDocActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const itOps = useMemo(() => makeItActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const collabOps = useMemo(() => makeCollabActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const payrollSuiteOps = useMemo(() => makePayrollSuiteActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const suiteOps = useMemo(() => makeSuiteActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const contractOps = useMemo(() => makeContractActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);
  const designOps = useMemo(() => makePayslipDesignActions({ mutate, dataRef, sessionRef, pushAudit, pushNote }), [mutate]);

  const value = {
    ...ops,
    ...payslipOps,
    ...offerOps,
    ...collabOps,
    ...itOps,
    ...docOps,
    ...payrollSuiteOps,
    ...suiteOps,
    ...contractOps,
    ...designOps,
    data, session, user, pending, toast, setToast, notifyToast, logoutReason, rememberedLogin, fingerprint: fp, device, ...helpers,
    beginLogin, resendOtp, verifyMfa, completeReset, cancelPending, logout, touch,
    saveSubmission, withdrawSubmission, deleteDraft, managerDecidePoints, redeem,
    createRequest, cancelRequest, decideRequest, bulkDecideRequests, payoutRequest,
    openForReview, decide, bulkDecide, escalate, setFlag, reassign, decideAccount,
    upsertEmployee, removeEmployee, updateProfile, changePassword,
    override, overrideRequest, upsertAdmin, setUserStatus, forceReset, resetMfa, hrSync, upsertCategory, upsertRule, updateMaster, updateSettings, adjustPoints,
    markRead, markAllRead, resetDemo,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside AppStoreProvider");
  return v;
}
