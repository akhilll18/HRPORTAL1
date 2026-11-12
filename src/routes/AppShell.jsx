import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCountryFilter } from "../country/CountryContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";

import PortalShell from "../components/PortalShell.jsx";
import PortalDialog from "../components/PortalDialog.jsx";
import { ToastHost, PageHeader } from "../components/kit/UI.jsx";
import AiLayer from "../components/ai/AiLayer.jsx";

// Original PeopleHub pages
import OverviewPage from "../roles/employee/pages/OverviewPage.jsx";
import PeoplePage from "../roles/shared/pages/PeoplePage.jsx";
import DocumentsPage from "../roles/shared/pages/DocumentsPage.jsx";
import LearningHub from "../roles/shared/learning/LearningHub.jsx";
import AssetsAndIt from "../roles/employee/workforce/AssetsAndIt.jsx";
import SupportPage from "../roles/shared/pages/SupportPage.jsx";
import OrganizationPage from "../roles/shared/pages/OrganizationPage.jsx";

// Employee (Keka / PeopleHR modules)
import InboxPage from "../roles/shared/inbox/InboxPage.jsx";
import InboxHub from "../roles/shared/inbox/InboxHub.jsx";
import NotificationsPage from "../roles/shared/pages/NotificationsPage.jsx";
import LeavePage from "../roles/employee/pages/LeavePage.jsx";
import ExpensesPage from "../roles/employee/pages/ExpensesPage.jsx";
import FinancesPage from "../roles/employee/pages/FinancesPage.jsx";
import ProfilePage from "../roles/employee/pages/ProfilePage.jsx";
import MyTeamPage from "../roles/employee/team/MyTeamPage.jsx";

// Admin
import AdminDashboard from "../roles/admin/pages/AdminDashboard.jsx";
import AdminReports from "../roles/admin/pages/AdminReports.jsx";
import AdminProfile from "../roles/admin/pages/AdminProfile.jsx";
import ApprovalsPage from "../roles/shared/requests/ApprovalsPage.jsx";

// Super Admin
import SuperDashboard from "../roles/superadmin/SuperDashboard.jsx";
import EmployeeMaster, { EmployeeFormDialog } from "../roles/superadmin/EmployeeMaster.jsx";
import FieldReference from "../roles/superadmin/FieldReference.jsx";
import UsersAccess from "../roles/superadmin/UsersAccess.jsx";
import PoliciesPage from "../roles/superadmin/PoliciesPage.jsx";
import AllRequests from "../roles/superadmin/AllRequests.jsx";
import SuperReports from "../roles/superadmin/SuperReports.jsx";
import AuditLog from "../roles/superadmin/AuditLog.jsx";
import SystemSettings from "../roles/superadmin/SystemSettings.jsx";

// Glass dashboards, workforce, talent, pay and global modules
import EmployeeGlassHome from "../roles/employee/glass/EmployeeGlassHome.jsx";
import OpsGlassHome from "../roles/shared/glass/OpsGlassHome.jsx";
import MyAttendance from "../roles/employee/workforce/MyAttendance.jsx";
import MyActivity from "../roles/employee/workforce/MyActivity.jsx";
import MyBenefits from "../roles/employee/workforce/MyBenefits.jsx";
import MyOnboarding from "../roles/employee/workforce/MyOnboarding.jsx";
import MyPerformance, { TeamReviews } from "../roles/employee/talent/MyPerformance.jsx";
import CallTracker from "../components/workforce/CallTracker.jsx";
import { ModulePage, TeamModulePage, MODULE_PAGES } from "../roles/shared/modules/ModulePages.jsx";
import { GeofencesDevices, MonitoringPolicy, Territory, Compliance, HRAnalytics } from "../roles/superadmin/OpsSuper.jsx";
import { getPosition } from "../lib/geo.js";
import { PayslipsAdminPage } from "../components/pay/PayslipViews.jsx";
import { OffersPage } from "../components/offers/OfferViews.jsx";
import CountryWorkspace from "../country/CountryWorkspace.jsx";
// v8: BGV, applicant tracking, compliance calendar, chat, meetings, AI calendar
import { BgvAdminPage, MyBgvPage, TeamBgvPage, useBgvLookup } from "../components/collab/BgvViews.jsx";
import { RecruitmentHub } from "../components/collab/AtsViews.jsx";
import ComplianceCalendarPage from "../components/collab/ComplianceCalendar.jsx";
import ChatPage from "../roles/shared/collab/ChatPage.jsx";
import CalendarPage from "../roles/shared/collab/CalendarViews.jsx";
import MeetingsPage from "../roles/shared/collab/MeetingsViews.jsx";
import ItSupportPage, { ItHelpdeskPage } from "../components/collab/ItSupport.jsx";
import { MyDocumentChecklist, EmployeeDocReview, canReviewDocs } from "../components/collab/MyDocuments.jsx";
import { bgvStatus, canSeeBgvColumn } from "../lib/collab.js";
// v8.7: contract management
import ContractsHub from "../components/contracts/ContractViews.jsx";
import MyContractPage, { TeamTimesheetsPage } from "../components/contracts/MyContract.jsx";
// v10: all-in-one suite — Payroll Agent, compliance autopilot, exits & F&F, shifts, leave rule-sets, PeopleXP,
// global hiring, relocation, spend cards, integrations, insights, setup, billing, security, expert support, coverage.
import PayrollAgent from "../roles/admin/suite/PayrollAgent.jsx";
import ComplianceAutopilot, { MyPrivacy } from "../roles/shared/suite/ComplianceAutopilot.jsx";
import Exits, { MyExit } from "../roles/shared/suite/Exits.jsx";
import { LiveBoard, Shifts, MyShifts } from "../roles/shared/suite/Workforce.jsx";
import LeaveRules from "../roles/admin/suite/LeaveRules.jsx";
import PeopleXP, { MyApp } from "../roles/shared/suite/PeopleXP.jsx";
import { GlobalHiring, Relocation, MyRelocation, SpendCards, MyCard } from "../roles/shared/suite/GlobalTeams.jsx";
import { Integrations, Insights, SetupImport, Billing, Security, ExpertSupport } from "../roles/admin/suite/Platform.jsx";
import Coverage from "../roles/superadmin/Coverage.jsx";
// v10.2: companies & locations, expense hub
import CompaniesLocations from "../roles/admin/pages/CompaniesLocations.jsx";
import ExpenseHub from "../roles/admin/suite/ExpenseHub.jsx";

function ContractsPageWrap() {
  const { user } = useStore();
  const who = user.role === "superadmin" ? "SUPER ADMIN" : user.modules?.includes("payroll") ? "FINANCE · APPROVES & PAYS" : "HR · PREPARES";
  return (
    <>
      <PageHeader eyebrow={`CORE HR · CONTINGENT WORKFORCE · ${who}`} title="Contract management" subtitle="Contracts and work orders for contract, freelance, consultant, agency, intern, temporary and apprentice workers — approvals, e-signature, amendments and renewals, timesheets and milestones, the month-end contractor pay run into payslips and invoices, vendors and compliance." />
      <ContractsHub />
    </>
  );
}

function OffersPageWrap() {
  return (
    <>
      <PageHeader eyebrow="HIRE & ONBOARD · OFFER LETTERS" title="Offer letters" subtitle="Prepare offers from your company template by hand or by CSV upload, add your own fields and clauses, preview, print or download as Word, then issue and email the candidate." />
      <OffersPage />
    </>
  );
}

function PayslipsPageWrap() {
  const { user } = useStore();
  const who = user.role === "superadmin" ? "Super Admin · final approval" : user.modules?.includes("payroll") ? "Finance · approves runs and fields" : "HR · prepares and releases";
  return (
    <>
      <PageHeader eyebrow={`PAY & BENEFITS · ${who.toUpperCase()}`} title="Payslips" subtitle="Payslip fields from your company template, monthly payslip runs from payroll or a CSV upload, approval by Finance and Super Admin, then release to employees with an email." />
      <PayslipsAdminPage />
    </>
  );
}

import { tickets as ticketSeed } from "../data/peopleHubData.js";
import { theme } from "../theme.js";
import { useStore } from "../store/AppStore.jsx";
import { workerRoleOf } from "../data/employeeFields.js";
import { APP_CONFIG } from "../data/seed.js";
import { initials, isoDate } from "../lib/utils.js";

function load(key, fallback) {
  try {
    const value = localStorage.getItem(`peoplehub-${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(`peoplehub-${key}`, JSON.stringify(value));
  } catch {
    /* Browser storage may be disabled. */
  }
}

export default function AppShell() {
  const store = useStore();
  const { user, data, notifyToast, removeEmployee } = store;
  const navigate = useNavigate();
  const location = useLocation();
  const page = location.pathname.split("/")[1] || "";
  const code = user?.code || "anon";

  // PeopleHub's own browser-stored workspace data (attendance and documents per user; library and tickets shared)
  const [trainingVideos, setTrainingVideos] = useState(() => load("training-videos", []));
  const [supportTickets, setSupportTickets] = useState(() => load("tickets", ticketSeed));
  const [userDocuments, setUserDocuments] = useState(() => load(`${code}-user-documents`, []));
  const [attendanceRecords, setAttendanceRecords] = useState(() => load(`${code}-attendance-records`, []));
  const [dialog, setDialog] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(false);
  const [homeView, setHomeView] = useState(() => load(`${code}-home-view`, "glass"));
  useEffect(() => { save(`${code}-home-view`, homeView); }, [homeView, code]);

  useEffect(() => { save("training-videos", trainingVideos); }, [trainingVideos]);
  useEffect(() => { save("tickets", supportTickets); }, [supportTickets]);
  useEffect(() => { save(`${code}-user-documents`, userDocuments); }, [userDocuments, code]);
  useEffect(() => { save(`${code}-attendance-records`, attendanceRecords); }, [attendanceRecords, code]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  // Keep PeopleHub's theme user (used by the original pages) in step with the signed-in account.
  if (user) {
    theme.workspaceName = APP_CONFIG.companyName;
    theme.companyName = APP_CONFIG.companyName;
    Object.assign(theme.currentUser, {
      name: user.full_name,
      shortName: user.full_name.split(" ")[0],
      role: user.designation || (user.role === "admin" ? "Administrator" : "Super Admin"),
      employeeId: user.employee_code || user.code,
      department: user.department || "Administration",
      email: user.email,
      initials: initials(user.full_name),
    });
  }

  const today = isoDate();
  const bgvOf = useBgvLookup();
  // Employees see only the people they work with (their manager, teammates under the same manager and their own
  // direct reports), and personal details (leave status, joining date) only for themselves and their direct reports.
  const empSelf = user?.role === "emp" ? data.employees.find((e) => e.employee_code === user.employee_code) : null;
  const inCountry = useCountryFilter();
  const people = useMemo(() => {
    const mine = empSelf
      ? new Set([empSelf.employee_code, empSelf.reporting_manager, ...data.employees.filter((e) => e.reporting_manager === empSelf.employee_code || (empSelf.reporting_manager && e.reporting_manager === empSelf.reporting_manager)).map((e) => e.employee_code)].filter(Boolean))
      : null;
    const detailFor = (e) => !empSelf || e.employee_code === empSelf.employee_code || e.reporting_manager === empSelf.employee_code;
    return data.employees
      .filter((e) => e.status !== "rejected" && (!mine || (mine.has(e.employee_code) && e.status === "active")) && (!!mine || inCountry(e)))
      .map((e) => ({
        id: e.employee_code,
        name: e.full_name,
        role: e.designation,
        department: e.department,
        email: e.email,
        relation: empSelf ? (e.employee_code === empSelf.employee_code ? "You" : e.employee_code === empSelf.reporting_manager ? "Your manager" : e.reporting_manager === empSelf.employee_code ? "Reports to you" : "Teammate") : undefined,
        status: !detailFor(e) ? "Active" : data.requests.some((r) => r.type === "leave" && r.status === "Approved" && r.employee_code === e.employee_code && r.from_date <= today && r.to_date >= today) ? "On leave" : e.status === "active" ? "Active" : e.status === "pending_approval" ? "Pending approval" : e.status[0].toUpperCase() + e.status.slice(1),
        joined: detailFor(e) ? new Date(`${e.date_of_joining}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "",
        bgv: !empSelf && bgvOf(e.employee_code) ? bgvStatus(bgvOf(e.employee_code)) : null,
      }));
  }, [data.employees, data.requests, today, bgvOf, empSelf, inCountry]); // eslint-disable-line react-hooks/exhaustive-deps
  const departments = data.orgUnits.filter((o) => o.parent_unit).map((o) => o.name);

  if (!user) return null;
  const canManagePeople = user.role === "superadmin" || (user.role === "admin" && user.permissions_scope.includes("people"));
  const workerRole = user.role === "emp" ? workerRoleOf(user) : null;
  const restrictedWorker = ["contractor", "freelancer"].includes(workerRole);
  const go = (id) => {
    const path = id.startsWith("/") ? id : `/${id}`;
    navigate(path);
  };

  function submitAction(type, values) {
    if (type === "delete-employee") {
      const r = removeEmployee(dialog.data.id);
      notifyToast(r.ok ? `${dialog.data.name} was removed from the directory.` : r.error, r.ok ? "success" : "error");
    } else if (type === "ticket") {
      setSupportTickets((current) => [{ id: `HR-${1025 + current.length}`, subject: values.subject, category: values.category, created: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }), status: "Open", by: user.code }, ...current]);
      notifyToast("Your HR support request was created.");
    }
    setDialog(null);
  }

  function pageAction(type, data2) {
    if (type === "leave") return go("/leave?new=1");
    if (type === "employee") return canManagePeople ? setEmployeeForm(true) : notifyToast("Only HR can add employees.", "info");
    return setDialog({ type, data: data2 });
  }

  function toggleCheckIn() {
    const last = attendanceRecords[0];
    const type = last?.type === "Tap in" ? "Tap out" : "Tap in";
    setAttendanceRecords((current) => [{ id: `ATT-${Date.now()}`, type, timestamp: new Date().toISOString() }, ...current]);
    notifyToast(type === "Tap in" ? "You are now clocked in." : "You are now clocked out.");
  }
  const checkedIn = attendanceRecords[0]?.type === "Tap in";
  const clockInAt = attendanceRecords.find((r) => r.type === "Tap in")?.timestamp || null;
  const clockOutAt = checkedIn ? null : attendanceRecords.find((r) => r.type === "Tap out")?.timestamp || null;

  function uploadTrainingVideo(file, details) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return notifyToast("Choose an image or video file to upload.", "error");
    const storedBytes = trainingVideos.reduce((total, v) => total + (v.size || 0), 0);
    if (storedBytes + file.size > 2 * 1024 * 1024) return notifyToast("Training media is limited to 2 MB in this browser demo.", "error");
    const reader = new FileReader();
    reader.onload = () => {
      setTrainingVideos((current) => [{ id: `TRAIN-${Date.now()}`, title: details.title, description: details.description, category: details.category, fileName: file.name, size: file.size, type: file.type, data: reader.result, uploaded: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) }, ...current]);
      notifyToast(`"${details.title}" was added to the learning library.`);
    };
    reader.readAsDataURL(file);
  }

  const shared = {
    people: <PeoplePage people={people} myTeamOnly={user.role === "emp"} departments={departments} onAction={pageAction} canManage={canManagePeople} showBgv={canSeeBgvColumn(data, user)} />,
    organization: <OrganizationPage people={people} myTeamOnly={user.role === "emp"} departments={departments} onAction={pageAction} canManage={canManagePeople} />,
    documents: (
      <DocumentsPage
        topSlot={user.role === "emp" ? <MyDocumentChecklist /> : canReviewDocs(user) ? <EmployeeDocReview /> : null}
        key={code}
        user={user}
        canManageShared={user.role === "superadmin" || user.role === "admin"}
        notify={notifyToast}
        legacyDocuments={userDocuments}
        onLegacyImported={() => setUserDocuments([])}
      />
    ),
    learning: <LearningHub libraryProps={{ videos: trainingVideos, canUpload: user.role !== "emp", onUpload: uploadTrainingVideo, onDelete: (id) => (user.role === "emp" ? notifyToast("Only admins can remove library items.", "info") : setTrainingVideos((c) => c.filter((v) => v.id !== id))) }} />,
    support: <SupportPage tickets={user.role === "emp" ? supportTickets.filter((t) => !t.by || t.by === user.code) : supportTickets} onAction={(type) => setDialog({ type })} onItSupport={() => go("/it-support")} />,
    notifications: <InboxHub tab="notifications" />,
    inbox: <InboxHub tab="inbox" />,
    country: <CountryWorkspace />,
    chat: <ChatPage />,
    calendar: <CalendarPage />,
    meetings: <MeetingsPage />,
    bgv: <BgvAdminPage />,
    recruitment: <RecruitmentHub />,
    "compliance-calendar": <ComplianceCalendarPage />,
    "it-support": <ItSupportPage />,
    "it-helpdesk": <ItHelpdeskPage />,
    contracts: <ContractsPageWrap />,
    // v10 suite (role access is decided by the sidebar; actions are guarded in the store)
    "people-xp": <PeopleXP />,
    "payroll-agent": <PayrollAgent tab="run" />,
    "variable-pay": <PayrollAgent tab="variable" />,
    payouts: <PayrollAgent tab="payouts" />,
    filings: <PayrollAgent tab="filings" />,
    "global-payroll": <PayrollAgent tab="global" />,
    "compliance-autopilot": <ComplianceAutopilot tab="health" />,
    "compliance-alerts": <ComplianceAutopilot tab="alerts" />,
    "rule-updates": <ComplianceAutopilot tab="rules" />,
    "audit-pack": <ComplianceAutopilot tab="audit" />,
    "privacy-center": <ComplianceAutopilot tab="privacy" />,
    exits: <Exits />,
    "live-board": <LiveBoard />,
    shifts: <Shifts tab="shifts" />,
    timesheets: <Shifts tab="timesheets" />,
    "leave-rules": <LeaveRules />,
    "global-hiring": <GlobalHiring />,
    relocation: <Relocation />,
    "spend-cards": <SpendCards />,
    integrations: <Integrations />,
    "expense-hub": <ExpenseHub />,
    companies: <CompaniesLocations />,
    insights: <Insights />,
    setup: <SetupImport />,
    billing: <Billing />,
    security: <Security />,
    "expert-support": <ExpertSupport />,
    coverage: <Coverage />,
  };

  const byRole = {
    emp: {
      home: (
        <EmployeeGlassHome view={homeView} onView={setHomeView} restrictedWorker={restrictedWorker} classic={
        <OverviewPage
          onNavigate={go}
          onAction={pageAction}
          role={workerRole}
          checkedIn={checkedIn}
          onToggle={toggleCheckIn}
          employeeCount={people.length}
          pendingLeaves={data.requests.filter((r) => r.type === "leave" && r.employee_code === user.employee_code && r.status === "Pending").length}
          departmentCount={departments.length}
          attendanceRecords={attendanceRecords}
        />} />
      ),

      attendance: <MyAttendance />,
      "my-activity": <MyActivity />,
      assets: <AssetsAndIt />,
      "it-support": <AssetsAndIt />,
      "benefits-me": <MyBenefits />,
      "onboarding-me": <MyOnboarding />,
      "performance-me": <MyPerformance />,
      calls: (
        <>
          <PageHeader eyebrow="ME · CALLS" title="My calls" subtitle={`Your calls, talk time and follow-ups. Daily target ${data.settings.call_daily_target} calls.`} />
          <CallTracker employees={data.employees.filter((e) => e.employee_code === user.employee_code)} self />
        </>
      ),
      "team-live": <TeamModulePage id="team-live" />,
      "team-calls": <TeamModulePage id="team-calls" />,
      "team-activity": <TeamModulePage id="team-activity" />,
      "team-reviews": <TeamReviews />,
      "team-bgv": <TeamBgvPage />,
      "bgv-me": <MyBgvPage />,
      leave: <LeavePage />,
      expenses: <ExpensesPage />,
      finances: <FinancesPage />,
      profile: <ProfilePage />,
      team: <MyTeamPage />,
      "my-contract": <MyContractPage />,
      "team-timesheets": <TeamTimesheetsPage />,
      "my-app": <MyApp />,
      "my-shifts": <MyShifts />,
      "my-card": <MyCard />,
      "my-privacy": <MyPrivacy />,
      "my-relocation": <MyRelocation />,
      "my-exit": <MyExit />,
    },
    admin: {
      admin: <OpsGlassHome view={homeView} onView={setHomeView} classic={<AdminDashboard />} />,
      payslips: <PayslipsPageWrap />,
      offers: <OffersPageWrap />,
      approvals: (
        <>
          <PageHeader eyebrow={`ADMIN · ${user.modules?.join(" · ").toUpperCase()}`} title="All approvals" subtitle="Every leave, expense, advance, loan, attendance correction, asset request and new account that has reached you. Managers approve first; your decision is final." />
          <ApprovalsPage mode="admin" />
        </>
      ),
      reports: <AdminReports />,
      profile: <AdminProfile />,
    },
    superadmin: {
      super: <OpsGlassHome view={homeView} onView={setHomeView} classic={<SuperDashboard />} />,
      geofences: <GeofencesDevices />,
      "monitoring-policy": <MonitoringPolicy />,
      territory: <Territory />,
      offers: <OffersPageWrap />,
      payslips: <PayslipsPageWrap />,
      compliance: <Compliance />,
      analytics: <HRAnalytics />,
      employees: <EmployeeMaster />,
      fields: <FieldReference />,
      users: <UsersAccess />,
      policies: <PoliciesPage />,
      requests: <AllRequests />,
      reports: <SuperReports />,
      audit: <AuditLog />,
      settings: <SystemSettings />,
    },
  };
  // Older links from notifications in the original workspace
  const content = byRole[user.role][page] || (page === "recruitment" ? shared.recruitment : null) || (user.role !== "emp" && MODULE_PAGES[page] ? <ModulePage id={page} /> : null) || shared[page] || null;
  const glassStage = ["home", "admin", "super"].includes(page) && homeView === "glass";

  return (
    <>
      <LocationBeacon />
      <ActivityMeter />
      <PortalShell
        page={page}
        stage={glassStage ? "glass" : undefined}
        onNavigate={go}
      >
        {content}
      </PortalShell>
      <PortalDialog dialog={dialog} onClose={() => setDialog(null)} onSubmit={submitAction} departments={departments} onDeleteEmployee={canManagePeople ? (person) => setDialog({ type: "delete-employee", data: person }) : undefined} />
      <EmployeeFormDialog open={employeeForm} rec={null} onClose={() => setEmployeeForm(false)} />
      <ToastHost />
      <AiLayer />
    </>
  );
}

// While an employee is clocked in and has agreed to share location, send a position every few minutes.
function LocationBeacon() {
  const { user, data, pingLocation } = useStore();
  const ref = useRef({ data, pingLocation });
  ref.current = { data, pingLocation };
  const isEmp = user?.role === "emp";
  useEffect(() => {
    if (!isEmp) return undefined;
    const tick = () => {
      const { data: d, pingLocation: ping } = ref.current;
      const c = d.consents[user.employee_code];
      const open = d.punches.filter((p) => p.employee_code === user.employee_code && p.ts.startsWith(isoDate())).sort((a, b) => a.ts.localeCompare(b.ts)).pop();
      if (!c?.location || d.settings.location_tracking === "off" || open?.type !== "in") return;
      getPosition({ timeout: 6000 }).then((pos) => { if (pos) ping(pos); }).catch(() => {});
    };
    tick();
    const minutes = Math.max(1, Number(data.settings.location_ping_min) || 5);
    const t = setInterval(tick, minutes * 60000);
    return () => clearInterval(t);
  }, [isEmp, user?.employee_code, data.settings.location_ping_min]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Counts active vs idle minutes inside this portal only (no other apps, no content), for consenting employees.
function ActivityMeter() {
  const { user, recordMyActivity } = useStore();
  const ref = useRef({ recordMyActivity, lastInput: Date.now() });
  ref.current.recordMyActivity = recordMyActivity;
  const isEmp = user?.role === "emp";
  useEffect(() => {
    if (!isEmp) return undefined;
    const mark = () => { ref.current.lastInput = Date.now(); };
    ["pointerdown", "keydown", "scroll", "pointermove"].forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    const t = setInterval(() => {
      if (document.hidden) return;
      const idle = Date.now() - ref.current.lastInput > 5 * 60000;
      ref.current.recordMyActivity(idle ? 0 : 1, idle ? 1 : 0);
    }, 60000);
    return () => {
      clearInterval(t);
      ["pointerdown", "keydown", "scroll", "pointermove"].forEach((ev) => window.removeEventListener(ev, mark));
    };
  }, [isEmp]);
  return null;
}
