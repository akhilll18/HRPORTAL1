// Feature coverage (v10): every point of the "all-in-one HR & payroll" checklist and every reference module, mapped
// to the screen that delivers it and the roles that use it — plus what each role (Employee, Finance, HR, Super Admin) gets.
import React, { useState } from "react";
import { Box, Button, Card, Chip, Stack, Tab, Tabs, Typography } from "@mui/material";
import { CheckCircleRounded, OpenInNew } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/AppStore.jsx";
import { SectionCard } from "../../components/kit/UI.jsx";
import { ModuleHub, Pill, C, tabSx } from "../../components/suite/Hub.jsx";
import { navFor } from "../../data/roleNav.js";

const E = "Employee", F = "Finance", H = "HR", S = "Super Admin";
// [requirement, [[label, route]], roles]
export const COVERAGE = [
  ["1. Payroll that just works", [
    ["Automatic pay for salary, hourly, overtime, bonuses and commissions", [["Payroll Agent", "/payroll-agent"], ["Variable pay", "/variable-pay"], ["Timesheets → payroll", "/timesheets"]], [F, S]],
    ["Automatic tax & statutory deductions per country — India PF, ESI, PT, TDS, LWF; PAYE, Social Security, pension elsewhere", [["Payroll Agent", "/payroll-agent"], ["Payroll (country engines)", "/payroll?tab=run"]], [F, S]],
    ["Payslips sent automatically and direct bank transfers", [["Payroll Agent → approve", "/payroll-agent"], ["Bank payouts", "/payouts"], ["Payslips", "/payslips"]], [F, H, S]],
    ["Returns and year-end forms (Form 16, W-2, P60…) without manual work", [["Filings & year-end", "/filings"], ["Form 16 / 130", "/payroll?tab=form16"]], [F, S]],
    ["Multiple currencies and countries in one system", [["Global & FX", "/global-payroll"], ["Country space", "/country"]], [F, S]],
  ]],
  ["2. Compliance without worry", [
    ["Rules that update themselves when tax or labour laws change", [["Rule updates", "/rule-updates"]], [F, S]],
    ["Alerts before filing deadlines", [["Deadlines & alerts", "/compliance-alerts"], ["Compliance calendar", "/compliance-calendar"]], [F, H, S]],
    ["Audit trails and ready-to-submit reports", [["Audit pack & trail", "/audit-pack"], ["Audit log", "/audit"], ["Reports", "/reports"]], [F, S]],
    ["Data privacy compliance (GDPR, India DPDP Act and similar)", [["Data privacy", "/privacy-center"], ["Privacy & my data", "/my-privacy"]], [E, H, S]],
  ]],
  ["3. Core HR in the same place", [
    ["One employee record used everywhere", [["Employee database", "/employees"], ["People", "/people"]], [H, S]],
    ["Onboarding with digital documents and e-signatures", [["Onboarding", "/onboarding"], ["Offer letters", "/offers"], ["Documents", "/documents"]], [H, S, E]],
    ["Offboarding and final settlement", [["Exits & F&F", "/exits"], ["Resignation & exit", "/my-exit"]], [E, H, F, S]],
    ["Leave, holidays and attendance with biometric, mobile or GPS check-in", [["Live board", "/live-board"], ["Leave rule-sets", "/leave-rules"], ["Attendance", "/attendance"], ["Leave", "/leave"]], [E, H, S]],
    ["Shift scheduling and timesheets that feed payroll", [["Shift roster", "/shifts"], ["Timesheets → payroll", "/timesheets"], ["My shifts", "/my-shifts"]], [E, H, F, S]],
  ]],
  ["4. Employee self-service", [
    ["Mobile app — payslips, leave, expenses, tax declarations", [["Mobile app", "/my-app"], ["My pay & payslips", "/finances"], ["Expenses", "/expenses"]], [E]],
    ["Fewer “where's my payslip?” questions to HR", [["Payslip-ready alerts", "/notifications"], ["Ask AI", "/home"]], [E, H]],
  ]],
  ["5. Ease of use", [
    ["Setup in days with help moving data from spreadsheets or the old system", [["Setup & import", "/setup"]], [S]],
    ["A clean, simple screen for non-technical HR staff", [["AI summary on every page", "/home"], ["Classic / glass views", "/home"]], [E, H, F, S]],
    ["Payroll run in a few clicks", [["Payroll Agent — one tap", "/payroll-agent"]], [F, S]],
  ]],
  ["6. Extras that grow with the business", [
    ["Benefits, insurance and reimbursements", [["Benefits administration", "/benefits-admin"], ["Component claims", "/payroll?tab=claims"], ["Spend cards", "/spend-cards"]], [E, F, S]],
    ["Performance reviews, goals and appraisals", [["Performance", "/performance"], ["Talent management", "/talent"], ["Performance & goals", "/performance-me"]], [E, H, S]],
    ["Recruitment and applicant tracking", [["Recruitment (ATS)", "/recruitment"], ["Background verification", "/bgv"]], [H, S]],
    ["EOR and contractor payments where there's no legal entity", [["Global hiring — EOR / CoR", "/global-hiring"], ["Contract management", "/contracts"], ["Relocation & visas", "/relocation"]], [F, H, S]],
  ]],
  ["7. Connections and reports", [
    ["Accounting (Tally, QuickBooks, Xero, Zoho Books, SAP), banks and ERP", [["Integrations & API", "/integrations"]], [F, S]],
    ["Dashboards for headcount, payroll cost and attrition", [["Workforce intelligence", "/insights"], ["HR analytics", "/analytics"]], [F, H, S]],
  ]],
  ["8. Trust and support", [
    ["Clear per-employee monthly pricing, no hidden fees", [["Plan & billing", "/billing"]], [S]],
    ["Local-language support from people who know local payroll law", [["Expert support", "/expert-support"], ["Translate (top bar)", "/home"]], [F, H, S]],
    ["Strong security: encryption, role-based access and backups", [["Security & backups", "/security"], ["Users & access", "/users"]], [S]],
  ]],
  ["Reference modules (screenshots & solutions menu)", [
    ["Payroll Agent — the month from start to one-tap approval", [["Payroll Agent", "/payroll-agent"]], [F, S]],
    ["Attendance live — “X of Y in office right now”, check-in density, live team pulse", [["Live board", "/live-board"]], [H, S]],
    ["Leave policies — 50+ controls bundled into rule-sets per team", [["Leave rule-sets", "/leave-rules"]], [H, S]],
    ["Performance review cycle with calibration", [["Talent management", "/talent"]], [H, S]],
    ["Compliance & reports — health score, due list, applicable laws by class", [["Compliance health", "/compliance-autopilot"]], [F, S]],
    ["Employee app & PeopleXP — culture feed, recognition, pulse, vouchers", [["PeopleXP", "/people-xp"], ["Mobile app", "/my-app"]], [E, H, S]],
    ["AI Copilot & workforce intelligence (attrition risk)", [["Ask AI", "/home"], ["Workforce intelligence", "/insights"]], [E, H, F, S]],
    ["Expense claims & payouts; SpendCards", [["Expenses & travel", "/expenses"], ["Spend cards", "/spend-cards"], ["My spend card", "/my-card"]], [E, F, S]],
    ["Contractor management, Contractor of Record, Employer of Record, local payroll", [["Contract management", "/contracts"], ["Global hiring", "/global-hiring"]], [F, H, S]],
    ["Relocation (visa & work permit) and background checks", [["Relocation & visas", "/relocation"], ["Background verification", "/bgv"]], [H, S]],
    ["APIs and integrations", [["Integrations & API", "/integrations"]], [F, S]],
  ]],
];

export const ROLE_NEEDS = {
  [E]: ["See payslips, Form 16 and tax on the phone", "Apply for leave in a tap; see balances", "Clock in with GPS + selfie, face or biometric", "Claim expenses with a receipt; spend card if issued", "Submit tax declarations and proofs", "See shifts, ask for swaps, see timesheet hours", "Resign, follow clearance and see the F&F estimate", "Recognise colleagues, daily pulse, redeem points", "Download my data and make privacy requests", "Track relocation / visa", "Ask AI any HR or pay question"],
  [F]: ["Run payroll with the Payroll Agent and approve in one tap", "Enter hourly, overtime, bonus and commission", "Bank payout files per country and mark paid", "Generate and file statutory returns and year-end forms", "Consolidated multi-currency payroll cost", "Approve full & final settlements", "Issue and control spend cards; export to accounting", "Salary journal to Tally / QuickBooks / Xero / Zoho / SAP", "Compliance health, deadlines and alerts", "Contractor and EOR payments", "Headcount, payroll cost and attrition dashboards"],
  [H]: ["One employee record used everywhere", "Onboarding with e-sign; offboarding with clearance", "Live attendance board and corrections", "Shift roster and swap approvals", "Leave rule-sets with 50+ controls", "Performance, goals, calibration", "Recruitment (ATS), offers and background checks", "Relocation & visa cases", "PeopleXP insights and manager nudges", "Privacy requests"],
  [S]: ["Everything Finance and HR can do", "Users, roles and module access (RBAC)", "Statutory rule updates and auto-apply", "Audit pack and the full audit trail", "Data privacy set-up, retention, breach register", "Setup checklist and data import", "Integrations, API keys and webhooks", "Plan & billing", "Security, encryption status and backups", "Feature coverage map"],
};

export default function Coverage() {
  const navigate = useNavigate();
  const { user, data } = useStore();
  const allowed = new Set(navFor(user.role, true, { user, data }).flatMap((g) => g.items.flatMap((i) => [i.id, ...(i.alias || [])])));
  const canOpen = (r) => allowed.has(r.slice(1).split(/[?/]/)[0]);
  const [tab, setTab] = useState("checklist");
  const total = COVERAGE.reduce((s, [, l]) => s + l.length, 0);
  return (
    <ModuleHub eyebrow="CONTROL · FEATURE COVERAGE" title="Everything in one system" subtitle="Add employee → attendance flows in → payroll runs itself → taxes filed → employee gets the payslip on their phone. Every requirement below maps to a live screen."
      brief={{ text: <><b>{total}</b> of {total} requirements are covered, across 8 priority groups and the reference modules. Click any screen to open it.</> }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}><Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}><Tab value="checklist" label="Checklist → screens" /><Tab value="roles" label="What each role gets" /></Tabs></Box>
      {tab === "checklist" && (
        <Stack spacing={2}>
          {COVERAGE.map(([g, list]) => (
            <SectionCard key={g} title={g} subtitle={`${list.length} of ${list.length} covered`} noPad>
              {list.map(([req, screens, roles]) => (
                <Stack key={req} direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ px: 2, py: 1.2, borderBottom: 1, borderColor: "divider", alignItems: { md: "center" } }}>
                  <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}><CheckCircleRounded sx={{ color: C.mintDeep, fontSize: 18, mt: 0.2 }} /><Typography variant="body2">{req}</Typography></Stack>
                  <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap", maxWidth: { md: 480 } }}>{screens.map(([l, r]) => canOpen(r) ? <Chip key={l} size="small" label={l} onClick={() => navigate(r)} icon={<OpenInNew sx={{ fontSize: "14px !important" }} />} variant="outlined" /> : <Chip key={l} size="small" label={l} variant="outlined" title="Opens for the role shown on the right" sx={{ opacity: 0.6 }} />)}</Stack>
                  <Stack direction="row" spacing={0.5} sx={{ width: { md: 230 }, flexWrap: "wrap" }} useFlexGap>{roles.map((r) => <Pill key={r} tone={r === E ? "mint" : r === F ? "glob" : r === H ? "purple" : "navy"}>{r}</Pill>)}</Stack>
                </Stack>
              ))}
            </SectionCard>
          ))}
        </Stack>
      )}
      {tab === "roles" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)", xl: "repeat(4,1fr)" }, gap: 2 }}>
          {Object.entries(ROLE_NEEDS).map(([r, list], i) => (
            <Card key={r} sx={{ p: 2, borderTop: `4px solid ${[C.mintDeep, C.glob, "#5B4BB7", C.navy][i]}` }}>
              <Typography variant="h3">{r}</Typography>
              <Typography variant="caption" color="text.secondary">{r === E ? "Self-service on web and phone" : r === F ? "Admin with payroll / expense modules" : r === H ? "Admin with people modules" : "Full control"}</Typography>
              <Stack spacing={0.6} sx={{ mt: 1.2 }}>{list.map((t) => <Stack key={t} direction="row" spacing={0.8}><CheckCircleRounded sx={{ fontSize: 16, color: C.mintDeep, mt: 0.2 }} /><Typography variant="body2">{t}</Typography></Stack>)}</Stack>
            </Card>
          ))}
        </Box>
      )}
    </ModuleHub>
  );
}
