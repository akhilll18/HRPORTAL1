// Sidebar per role. `id` is the route path (without the leading slash).
// Groups follow the Sahayog HRMS modules (Core HR · Hire & onboard · Talent · Time & workforce · Pay & benefits · Global · Insight · Self-service),
// with Keka-style Me / My team groups for employees.
// `module`: an admin sees the item only when they hold that module. `when(ctx)`: extra condition.
import { isContingent } from "./employeeFields.js";
export const ROLE_NAV = {
  emp: [
    { group: "SELF-SERVICE", items: [
      { id: "home", label: "Home", icon: "Home" },
      { id: "inbox", label: "Inbox & notifications", icon: "Inbox", badge: "inbox-all", alias: ["notifications"] },
      { id: "profile", label: "My profile", icon: "Person" },
      { id: "my-contract", label: "My contract", icon: "Assignment", badge: "contract-me", when: ({ me }) => isContingent(me) },
      { id: "country", label: "Country space", icon: "Public" },
      { id: "my-app", label: "Mobile app", icon: "PhoneIphone" },
    ] },
    { group: "COLLABORATE", items: [
      { id: "chat", label: "Chat", icon: "Forum", badge: "chat" },
      { id: "calendar", label: "Calendar", icon: "CalendarMonth" },
      { id: "meetings", label: "Client meetings", icon: "Handshake" },
      { id: "people-xp", label: "PeopleXP · recognition", icon: "EmojiEvents" },
    ] },
    { group: "TIME & ATTENDANCE", items: [
      { id: "attendance", label: "Attendance", icon: "Fingerprint" },
      { id: "leave", label: "Leave", icon: "EventAvailable" },
      { id: "my-shifts", label: "My shifts & timesheet", icon: "Schedule" },
      { id: "calls", label: "My calls", icon: "PhoneInTalk", when: ({ me }) => me?.call_tracking === "yes" },
      { id: "my-activity", label: "My activity & privacy", icon: "Insights" },
      { id: "team-timesheets", label: "Contractor timesheets", icon: "PendingActions", badge: "ts-approve", when: ({ data, me }) => (data.contracts || []).some((c) => ["active", "suspended", "pending_approval"].includes(c.status) && (c.timesheet_approver || data.employees.find((e) => e.employee_code === c.employee_code)?.reporting_manager) === me?.employee_code) },
    ] },
    { group: "TALENT", items: [
      { id: "performance-me", label: "Performance & goals", icon: "Flag" },
      { id: "learning", label: "Learning", icon: "School" },
    ] },
    { group: "PAY & BENEFITS", items: [
      { id: "finances", label: "My pay & payslips", icon: "AccountBalanceWallet" },
      { id: "expenses", label: "Expenses & travel", icon: "Receipt" },
      { id: "benefits-me", label: "Benefits & wellness", icon: "HealthAndSafety" },
      { id: "my-card", label: "My spend card", icon: "CreditCard", when: ({ data, me }) => (data.suite?.cards || []).some((c) => c.employee_code === me?.employee_code) },
    ] },
    { group: "CORE HR", items: [
      { id: "assets", label: "My assets & IT support", icon: "Inventory", badge: "it-me", alias: ["it-support"] },
      { id: "onboarding-me", label: "My onboarding", icon: "Checklist", when: ({ data, me }) => data.onboarding.some((o) => o.employee_code === me?.employee_code) },
      { id: "bgv-me", label: "My background check", icon: "VerifiedUser", badge: "bgv-me", when: ({ data, me }) => (data.bgv || []).some((c) => c.employee_code === me?.employee_code && !c.cancelled) },
      { id: "documents", label: "Documents", icon: "Folder", badge: "docs-me" },
      { id: "people", label: "People", icon: "Badge" },
      { id: "organization", label: "Org chart", icon: "AccountTree" },
      { id: "support", label: "HR support", icon: "Support" },
      { id: "my-privacy", label: "Privacy & my data", icon: "PrivacyTip" },
      { id: "my-relocation", label: "Relocation & visa", icon: "FlightTakeoff" },
      { id: "my-exit", label: "Resignation & exit", icon: "ExitToApp" },
    ] },
    { group: "MY TEAM", managerOnly: true, items: [
      { id: "team", label: "Team summary", icon: "Groups" },
      { id: "team-live", label: "Team live location", icon: "Place" },
      { id: "team-calls", label: "Team calls", icon: "PhoneInTalk", when: ({ data, me }) => data.employees.some((e) => e.reporting_manager === me?.employee_code && e.call_tracking === "yes") },
      { id: "team-reviews", label: "Team reviews", icon: "RateReview" },
      { id: "team-bgv", label: "Team BGV status", icon: "VerifiedUser" },
      { id: "team-activity", label: "Team activity", icon: "Insights", when: ({ data }) => data.settings.managers_see_team_activity },
    ] },
  ],
  admin: [
    { group: "ADMIN", items: [
      { id: "admin", label: "Dashboard", icon: "Dashboard" },
      { id: "inbox", label: "Inbox & notifications", icon: "Inbox", badge: "inbox-all", alias: ["notifications"] },
      { id: "approvals", label: "All approvals", icon: "FactCheck", badge: "admin" },
      { id: "country", label: "Country space", icon: "Public" },
      { id: "reports", label: "Reports", icon: "Insights" },
      { id: "insights", label: "Workforce intelligence", icon: "QueryStats" },
    ] },
    { group: "COLLABORATE", items: [
      { id: "chat", label: "Chat", icon: "Forum", badge: "chat" },
      { id: "calendar", label: "Calendar", icon: "CalendarMonth" },
      { id: "meetings", label: "Meetings", icon: "Handshake" },
      { id: "people-xp", label: "PeopleXP · recognition", icon: "EmojiEvents" },
    ] },
    { group: "CORE HR", items: [
      { id: "people", label: "Employee database", icon: "Badge" },
      { id: "exits", label: "Exits & F&F settlement", icon: "ExitToApp", modules: ["accounts", "payroll", "onboarding", "leave"] },
      { id: "contracts", label: "Contract management", icon: "Assignment", badge: "contracts", modules: ["contracts", "payroll"] },
      { id: "organization", label: "Org chart", icon: "AccountTree" },
      { id: "assets-admin", label: "Assets", icon: "Inventory", module: "assets" },
      { id: "it-helpdesk", label: "IT service desk", icon: "Computer", badge: "it-desk", module: "it" },
      { id: "documents", label: "Documents", icon: "Folder" },
    ] },
    { group: "HIRE & ONBOARD", items: [
      { id: "recruitment", label: "Recruitment (ATS)", icon: "Work", module: "recruitment" },
      { id: "offers", label: "Offer letters", icon: "HistoryEdu", module: "offers" },
      { id: "bgv", label: "Background verification", icon: "VerifiedUser", badge: "bgv", when: ({ data, user }) => user?.modules?.includes("bgv") || (data.bgvAccess || []).some((g) => g.code === user?.code && !g.revoked) },
      { id: "onboarding", label: "Onboarding", icon: "Checklist", module: "onboarding" },
      { id: "global-hiring", label: "Global hiring · EOR & CoR", icon: "Public", modules: ["contracts", "payroll", "recruitment"] },
      { id: "relocation", label: "Relocation & visas", icon: "FlightTakeoff", modules: ["onboarding", "accounts"] },
    ] },
    { group: "COMPLIANCE", items: [
      { id: "compliance-autopilot", label: "Compliance autopilot", icon: "Policy", modules: ["compliance", "payroll"], alias: ["compliance-alerts", "rule-updates", "audit-pack", "privacy-center"] },
      { id: "compliance-calendar", label: "Compliance calendar", icon: "EventNote", badge: "compliance", modules: ["compliance", "payroll"] },
    ] },
    { group: "TALENT", items: [
      { id: "performance", label: "Performance", icon: "Flag", module: "performance" },
      { id: "talent", label: "Talent management", icon: "AutoGraph", module: "performance" },
      { id: "succession", label: "Succession planning", icon: "AccountTree", module: "performance" },
      { id: "learning-admin", label: "Learning & development", icon: "School", module: "learning" },
      { id: "learning", label: "Learning library", icon: "VideoLibrary" },
    ] },
    { group: "TIME & WORKFORCE", items: [
      { id: "workforce", label: "Workforce management", icon: "Groups", module: "workforce" },
      { id: "live-board", label: "Live board, shifts & timesheets", icon: "Schedule", modules: ["attendance", "workforce", "payroll"], alias: ["shifts", "timesheets"] },
      { id: "attendance-admin", label: "Time & attendance", icon: "Fingerprint", module: "attendance" },
      { id: "leave-rules", label: "Leave rule-sets", icon: "Tune", module: "leave" },
      { id: "live-map", label: "Geofencing & live location", icon: "Place", module: "location" },
      { id: "calls-admin", label: "Team call tracker", icon: "PhoneInTalk", module: "calls" },
      { id: "monitoring", label: "Employee monitoring", icon: "Monitor", module: "monitoring" },
    ] },
    { group: "PAY & BENEFITS", items: [
      { id: "payroll-agent", label: "Payroll Agent", icon: "SmartToy", module: "payroll", alias: ["variable-pay", "payouts", "filings", "global-payroll"] },
      { id: "payroll", label: "Payroll", icon: "Payments", module: "payroll" },
      { id: "payslips", label: "Payslips", icon: "ReceiptLong", modules: ["payslips", "payroll"], badge: "payslips" },
      { id: "spend-cards", label: "Spend cards", icon: "CreditCard", modules: ["expense", "payroll"] },
      { id: "benefits-admin", label: "Benefits administration", icon: "HealthAndSafety", module: "benefits" },
      { id: "wellness", label: "Employee wellness", icon: "Spa", module: "wellness" },
    ] },
    { group: "PLATFORM", items: [
      { id: "integrations", label: "Integrations & API", icon: "Hub", modules: ["payroll", "expense"] },
      { id: "expert-support", label: "Expert support", icon: "SupportAgent" },
    ] },
    { group: "ACCOUNT", items: [
      { id: "support", label: "HR support", icon: "Support" },
      { id: "it-support", label: "IT support", icon: "SupportAgent", badge: "it-me" },
      { id: "profile", label: "My profile", icon: "Person" },
    ] },
  ],
  superadmin: [
    { group: "CONTROL", items: [
      { id: "super", label: "Dashboard", icon: "Dashboard" },
      { id: "inbox", label: "Inbox & notifications", icon: "Inbox", badge: "inbox-all", alias: ["notifications"] },
      { id: "users", label: "Users & access", icon: "AdminPanelSettings", badge: "locked" },
      { id: "policies", label: "Policies & rules", icon: "Rule" },
      { id: "settings", label: "System settings", icon: "Settings" },
      { id: "coverage", label: "Feature coverage", icon: "TaskAlt" },
      { id: "setup", label: "Setup & data import", icon: "RocketLaunch" },
      { id: "security", label: "Security & backups", icon: "Lock" },
      { id: "billing", label: "Plan & billing", icon: "Receipt" },
    ] },
    { group: "COLLABORATE", items: [
      { id: "chat", label: "Chat", icon: "Forum", badge: "chat" },
      { id: "calendar", label: "Calendar", icon: "CalendarMonth" },
      { id: "meetings", label: "Meetings", icon: "Handshake" },
      { id: "people-xp", label: "PeopleXP · recognition", icon: "EmojiEvents" },
    ] },
    { group: "CORE HR", items: [
      { id: "employees", label: "Employee database", icon: "Badge" },
      { id: "exits", label: "Exits & F&F settlement", icon: "ExitToApp" },
      { id: "contracts", label: "Contract management", icon: "Assignment", badge: "contracts" },
      { id: "fields", label: "Field reference", icon: "ListAlt" },
      { id: "organization", label: "Org chart", icon: "AccountTree" },
      { id: "assets-admin", label: "Assets", icon: "Inventory" },
      { id: "it-helpdesk", label: "IT service desk", icon: "Computer", badge: "it-desk" },
    ] },
    { group: "HIRE & ONBOARD", items: [
      { id: "recruitment", label: "Recruitment (ATS)", icon: "Work" },
      { id: "offers", label: "Offer letters", icon: "HistoryEdu" },
      { id: "bgv", label: "Background verification", icon: "VerifiedUser", badge: "bgv" },
      { id: "onboarding", label: "Onboarding", icon: "Checklist" },
    ] },
    { group: "TALENT", items: [
      { id: "performance", label: "Performance", icon: "Flag" },
      { id: "talent", label: "Talent management", icon: "AutoGraph" },
      { id: "succession", label: "Succession planning", icon: "AccountTree" },
      { id: "learning-admin", label: "Learning & development", icon: "School" },
    ] },
    { group: "TIME & WORKFORCE", items: [
      { id: "workforce", label: "Workforce management", icon: "Groups" },
      { id: "live-board", label: "Live board, shifts & timesheets", icon: "Schedule", alias: ["shifts", "timesheets"] },
      { id: "attendance-admin", label: "Time & attendance", icon: "Fingerprint" },
      { id: "leave-rules", label: "Leave rule-sets", icon: "Tune" },
      { id: "geofences", label: "Geofences & devices", icon: "Radar" },
      { id: "live-map", label: "Live location", icon: "Place" },
      { id: "calls-admin", label: "Team call tracker", icon: "PhoneInTalk" },
      { id: "monitoring", label: "Employee monitoring", icon: "Monitor" },
      { id: "monitoring-policy", label: "Monitoring policy", icon: "Shield" },
    ] },
    { group: "PAY & BENEFITS", items: [
      { id: "payroll-agent", label: "Payroll Agent", icon: "SmartToy", alias: ["variable-pay", "payouts", "filings", "global-payroll"] },
      { id: "payroll", label: "Payroll", icon: "Payments" },
      { id: "payslips", label: "Payslips", icon: "ReceiptLong", badge: "payslips" },
      { id: "spend-cards", label: "Spend cards", icon: "CreditCard" },
      { id: "benefits-admin", label: "Benefits & wellness", icon: "HealthAndSafety" },
    ] },
    { group: "GLOBAL", items: [
      { id: "country", label: "Country space", icon: "Public" },
      { id: "territory", label: "Multi-territory workforce", icon: "Public" },
      { id: "global-hiring", label: "Global hiring · EOR & CoR", icon: "Public" },
      { id: "relocation", label: "Relocation & visas", icon: "FlightTakeoff" },
      { id: "compliance-autopilot", label: "Compliance autopilot", icon: "Policy", alias: ["compliance-alerts", "rule-updates", "audit-pack", "privacy-center"] },
      { id: "compliance-calendar", label: "Compliance calendar", icon: "EventNote", badge: "compliance" },
      { id: "compliance", label: "Local policies & compliance", icon: "Gavel" },
    ] },
    { group: "INSIGHT", items: [
      { id: "insights", label: "Workforce intelligence", icon: "QueryStats" },
      { id: "analytics", label: "HR analytics", icon: "AutoGraph" },
      { id: "reports", label: "Reports", icon: "Insights" },
    ] },
    { group: "PLATFORM", items: [
      { id: "integrations", label: "Integrations & API", icon: "Hub" },
      { id: "expert-support", label: "Expert support", icon: "SupportAgent" },
    ] },
    { group: "OVERSIGHT", items: [
      { id: "requests", label: "All requests", icon: "FactCheck", badge: "escalated" },
      { id: "audit", label: "Audit log", icon: "History" },
    ] },
  ],
};

export function navFor(role, isManager, ctx = {}) {
  const { user, data } = ctx;
  const me = role === "emp" && data && user ? data.employees.find((e) => e.employee_code === user.employee_code) : null;
  return (ROLE_NAV[role] || [])
    .filter((g) => !g.managerOnly || isManager)
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (i.module && role === "admin" && !(user?.modules || []).includes(i.module)) return false;
        if (i.modules && role === "admin" && !i.modules.some((m) => (user?.modules || []).includes(m))) return false;
        if (i.when && data && !i.when({ data, me, user })) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length);
}
