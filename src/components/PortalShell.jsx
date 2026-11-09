import React, { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton as MuiIconButton,
  InputBase,
  Badge as MuiBadge,
  Popover,
  Divider,
  Stack,
  Menu as MuiMenu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Home as HomeIcon,
  Inbox as InboxIcon,
  Notifications as NotificationsIcon,
  AccessTime as AccessTimeIcon,
  EventAvailable as EventAvailableIcon,
  Receipt as ReceiptIcon,
  Stars as StarsIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Badge as BadgeIcon,
  AccountTree as AccountTreeIcon,
  Folder as FolderIcon,
  School as SchoolIcon,
  Support as SupportIcon,
  Dashboard as DashboardIcon,
  FactCheck as FactCheckIcon,
  Insights as InsightsIcon,
  ListAlt as ListAltIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Rule as RuleIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Circle as CircleIcon,
  Fingerprint as FingerprintIcon,
  PhoneInTalk as PhoneInTalkIcon,
  Flag as FlagIcon,
  HealthAndSafety as HealthAndSafetyIcon,
  Inventory as InventoryIcon,
  Checklist as ChecklistIcon,
  Place as PlaceIcon,
  Business as BusinessIcon,
  RateReview as RateReviewIcon,
  Work as WorkIcon,
  AutoGraph as AutoGraphIcon,
  VideoLibrary as VideoLibraryIcon,
  Monitor as MonitorIcon,
  Payments as PaymentsIcon,
  Spa as SpaIcon,
  Radar as RadarIcon,
  Shield as ShieldIcon,
  Public as PublicIcon,
  Gavel as GavelIcon,
  ReceiptLong as ReceiptLongIcon,
  HistoryEdu as HistoryEduIcon,
  Forum as ForumIcon,
  CalendarMonth as CalendarMonthIcon,
  Handshake as HandshakeIcon,
  VerifiedUser as VerifiedUserIcon,
  EventNote as EventNoteIcon,
  SupportAgent as SupportAgentIcon,
  Computer as ComputerIcon,
  Assignment as AssignmentIcon,
  PendingActions as PendingActionsIcon,
} from "@mui/icons-material";
const Icons = { Home: HomeIcon, Inbox: InboxIcon, Notifications: NotificationsIcon, AccessTime: AccessTimeIcon, EventAvailable: EventAvailableIcon, Receipt: ReceiptIcon, Stars: StarsIcon, AccountBalanceWallet: AccountBalanceWalletIcon, Person: PersonIcon, Groups: GroupsIcon, Badge: BadgeIcon, AccountTree: AccountTreeIcon, Folder: FolderIcon, School: SchoolIcon, Support: SupportIcon, Dashboard: DashboardIcon, FactCheck: FactCheckIcon, Insights: InsightsIcon, ListAlt: ListAltIcon, AdminPanelSettings: AdminPanelSettingsIcon, Rule: RuleIcon, History: HistoryIcon, Settings: SettingsIcon, Circle: CircleIcon, Fingerprint: FingerprintIcon, PhoneInTalk: PhoneInTalkIcon, Flag: FlagIcon, HealthAndSafety: HealthAndSafetyIcon, Inventory: InventoryIcon, Checklist: ChecklistIcon, Place: PlaceIcon, RateReview: RateReviewIcon, Work: WorkIcon, AutoGraph: AutoGraphIcon, VideoLibrary: VideoLibraryIcon, Monitor: MonitorIcon, Payments: PaymentsIcon, Spa: SpaIcon, Radar: RadarIcon, Shield: ShieldIcon, Public: PublicIcon, Gavel: GavelIcon, ReceiptLong: ReceiptLongIcon, HistoryEdu: HistoryEduIcon, Forum: ForumIcon, CalendarMonth: CalendarMonthIcon, Handshake: HandshakeIcon, VerifiedUser: VerifiedUserIcon, EventNote: EventNoteIcon, SupportAgent: SupportAgentIcon, Computer: ComputerIcon, Assignment: AssignmentIcon, PendingActions: PendingActionsIcon, PhoneIphone: PhoneIphoneIcon, EmojiEvents: EmojiEventsIcon, Schedule: ScheduleIcon, CreditCard: CreditCardIcon, PrivacyTip: PrivacyTipIcon, FlightTakeoff: FlightTakeoffIcon, ExitToApp: ExitToAppIcon, QueryStats: QueryStatsIcon, Policy: PolicyIcon, Tune: TuneIcon, SmartToy: SmartToyIcon, Hub: HubIcon, TaskAlt: TaskAltIcon, RocketLaunch: RocketLaunchIcon, Lock: LockIcon, Business: BusinessIcon };
import { Notifications as Bell, Logout as LogOut, Menu, Search, Close as X, TimerOutlined, Key } from "@mui/icons-material";
import { PhoneIphone as PhoneIphoneIcon, EmojiEvents as EmojiEventsIcon, Schedule as ScheduleIcon, CreditCard as CreditCardIcon, PrivacyTip as PrivacyTipIcon, FlightTakeoff as FlightTakeoffIcon, ExitToApp as ExitToAppIcon, QueryStats as QueryStatsIcon, Policy as PolicyIcon, Tune as TuneIcon, SmartToy as SmartToyIcon, Hub as HubIcon, TaskAlt as TaskAltIcon, RocketLaunch as RocketLaunchIcon, Lock as LockIcon } from "@mui/icons-material";
import { theme } from "../theme.js";
import { Avatar } from "./PortalUI.jsx";
import { meshBackground } from "./glass/Glass.jsx";
import { useStore, ROLE_LABEL } from "../store/AppStore.jsx";
import { inboxCount } from "../pages/inbox/InboxHub.jsx";
import { navFor } from "../data/roleNav.js";
import { timeAgo } from "../lib/utils.js";
import { IT_OPEN, slaState } from "../lib/itdesk.js";
import { docChecklist } from "../lib/empdocs.js";
import { totalUnread, bgvStatus, bgvAccessLevel, bgvFor, complianceCalendar } from "../lib/collab.js";
import { payslipWaiting } from "./pay/PayslipViews.jsx";
import { contractsWaiting } from "./contracts/ContractViews.jsx";
import { myContractBadge, approverBadge } from "./contracts/MyContract.jsx";
import ChangePasswordDialog from "./kit/ChangePasswordDialog.jsx";
// ONAS: country mode + AI page translation in the header, ONAS logo in the sidebar
import CountrySwitcher from "../country/CountrySwitcher.jsx";
import EntitySwitcher from "./EntitySwitcher.jsx";
import AiPageLocalizer from "../country/AiPageLocalizer.jsx";
import { COMPANY_LOGO } from "../data/companyLogo.js";

const DRAWER_WIDTH = 250;

// Signs the user out after the configured idle time, with a 60-second warning.
function IdleGuard() {
  const { data, touch, logout, session } = useStore();
  const timeoutMs = data.settings.session_timeout_min * 60000;
  const warnMs = Math.min(60000, timeoutMs / 3);
  const last = useRef(Date.now());
  const lastTouch = useRef(0);
  const [left, setLeft] = useState(timeoutMs);
  useEffect(() => {
    const onAct = () => {
      last.current = Date.now();
      if (Date.now() - lastTouch.current > 20000) {
        lastTouch.current = Date.now();
        touch();
      }
    };
    const evs = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    const t = setInterval(() => {
      const remaining = timeoutMs - (Date.now() - last.current);
      setLeft(remaining);
      if (remaining <= 0) logout(`You were signed out after ${data.settings.session_timeout_min} minutes of inactivity.`);
    }, 1000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onAct));
      clearInterval(t);
    };
  }, [timeoutMs, touch, logout, data.settings.session_timeout_min]);
  const mins = Math.max(0, Math.floor(left / 60000));
  const secs = Math.max(0, Math.floor((left % 60000) / 1000));
  return (
    <>
      <Tooltip title={`Session ends after ${data.settings.session_timeout_min} min without activity`}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: left < warnMs ? "warning.main" : "#8a948d", display: { xs: "none", sm: "flex" } }}>
          <TimerOutlined sx={{ fontSize: 15 }} />
          <Typography sx={{ fontSize: "0.6rem", fontVariantNumeric: "tabular-nums" }}>
            {mins}:{String(secs).padStart(2, "0")}
          </Typography>
        </Stack>
      </Tooltip>
      <Dialog open={!!session && left > 0 && left < warnMs} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Still there?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.75rem" }}>For your security you will be signed out in {secs} seconds.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton color="inherit" onClick={() => logout("")}>
            Sign out
          </MuiButton>
          <MuiButton
            variant="contained"
            onClick={() => {
              last.current = Date.now();
              touch();
              setLeft(timeoutMs);
            }}
          >
            Stay signed in
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function PortalShell({ page, onNavigate, onSearch, children, stage }) {
  const glass = stage === "glass";
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const store = useStore();
  const { user, data, logout, markRead, markAllRead, reportsOf, pendingForManager, pendingForAdmin } = store;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);

  if (!user) return null;
  const isManager = user.role === "emp" && reportsOf(user.employee_code).length > 0;
  const groups = navFor(user.role, isManager, { user, data });
  const mine = data.notifications.filter((n) => n.to === user.code);
  const unread = mine.filter((n) => !n.read).length;
  const badgeValue = (key) => {
    if (key === "unread") return unread;
    if (key === "inbox-all") return unread + inboxCount(data, user, { pendingForManager, pendingForAdmin });
    if (key === "inbox" && user.role === "emp") {
      const p = pendingForManager(user.employee_code);
      return p.requests.length + p.points.length;
    }
    if (key === "admin" && user.role === "admin") {
      const p = pendingForAdmin(user);
      return p.requests.length + p.points.length + p.accounts.length + p.payouts.length;
    }
    if (key === "locked") return [...data.employees, ...data.admins].filter((u) => u.status === "locked").length;
    if (key === "payslips") return payslipWaiting(data, user);
    if (key === "contracts") return contractsWaiting(data, user);
    if (key === "contract-me") return myContractBadge(data, user.employee_code);
    if (key === "ts-approve") return approverBadge(data, user.employee_code);
    if (key === "escalated") return data.requests.filter((r) => r.status === "Pending" && !r.steps.some((st) => st.status === "pending" && st.approver)).length;
    if (key === "chat") return totalUnread(data, user);
    if (key === "docs-me") return docChecklist(data, data.employees.find((e) => e.employee_code === user.employee_code)).missing;
    if (key === "it-me") return (data.itTickets || []).filter((t) => t.requester === user.code && (t.status === "waiting_user" || t.status === "resolved")).length;
    if (key === "it-desk") return (data.itTickets || []).filter((t) => IT_OPEN.includes(t.status) && (!t.assigned_to || slaState(t) === "breached" || (t.assigned_to === user.code && t.status === "in_progress" && t.comments.slice(-1)[0]?.by === t.requester))).length;
    if (key === "bgv") return (data.bgv || []).filter((c) => !c.cancelled && ["insufficient", "discrepancy", "consent_pending"].includes(bgvStatus(c)) && bgvAccessLevel(data, user, c) === "full").length;
    if (key === "bgv-me") { const c = bgvFor(data, user.employee_code); return c && (c.consent?.status !== "given" || c.checks.some((k) => k.status === "insufficient")) ? 1 : 0; }
    if (key === "compliance") return complianceCalendar(data).filter((c) => c.status === "overdue" || (c.status === "due_soon" && (user.role === "superadmin" || c.owner === user.code))).length;
    return 0;
  };
  const allItems = groups.flatMap((g) => g.items);
  const subtitle = user.role === "emp" ? user.designation : user.role === "admin" ? `Admin · ${user.modules.join(", ")}` : "Super Admin · global";

  function submitSearch(e) {
    e.preventDefault();
    onSearch(search.trim());
    setMobileOpen(false);
  }

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: collapsed ? "21px 9px 13px" : "21px 14px 13px", background: "#fbfcfa", overflowY: "auto" }}>
      <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", px: 1, pb: 2.5 }}>
        {collapsed ? (
          <Box sx={{ width: 34, height: 34, overflow: "hidden", flexShrink: 0 }}><Box component="img" src={COMPANY_LOGO} alt="ONAS" sx={{ height: 34, display: "block" }} /></Box>
        ) : (
          <Box>
            <Box component="img" src={COMPANY_LOGO} alt="ONAS" sx={{ height: 30, display: "block" }} />
            <Typography sx={{ fontSize: "0.6rem", color: "#78827b", mt: 0.6, fontWeight: 600, letterSpacing: "0.04em" }}>{theme.productName} · AI-enabled HRMS</Typography>
          </Box>
        )}
        {isMobile && (
          <MuiIconButton size="small" onClick={() => setMobileOpen(false)} sx={{ ml: "auto" }} aria-label="Close menu">
            <X sx={{ fontSize: 17 }} />
          </MuiIconButton>
        )}
      </Stack>
      {!collapsed && (
        <Box sx={{ mx: 1, mb: 2, px: 1, py: 0.5, borderRadius: 1, background: "#eaf2ed", color: "primary.main", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.8px", alignSelf: "flex-start" }}>
          {ROLE_LABEL[user.role].toUpperCase()} VIEW{isManager ? " · MANAGER" : ""}
        </Box>
      )}

      {groups.map((group) => (
        <Box key={group.group} sx={{ mb: 1.6 }}>
          {!collapsed && <Typography sx={{ px: 1.2, pb: 0.8, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "1.1px", color: "#a1aaa3" }}>{group.group}</Typography>}
          <List disablePadding>
            {group.items.map((item) => {
              const Icon = Icons[item.icon] || Icons.Circle;
              const active = page === item.id || (item.alias || []).includes(page);
              const count = item.badge ? badgeValue(item.badge) : 0;
              return (
                <ListItemButton
                  key={item.id}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileOpen(false);
                  }}
                  sx={{ position: "relative", minHeight: 35, px: 1.2, borderRadius: 1, color: active ? "primary.main" : "#66716a", background: active ? "#eaf2ed" : "transparent", "&:hover": { background: active ? "#eaf2ed" : "#f0f4f0", color: active ? "primary.main" : "#202922" }, mb: 0.3 }}
                >
                  {active && <Box sx={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 2, borderRadius: 1, background: "#27614e" }} />}
                  <ListItemIcon sx={{ minWidth: 30, color: "inherit" }}>
                    <MuiBadge color="secondary" variant="dot" invisible={!collapsed || !count}>
                      <Icon sx={{ fontSize: 17 }} />
                    </MuiBadge>
                  </ListItemIcon>
                  <ListItemText sx={{ display: collapsed ? "none" : "block" }} primary={item.label} slotProps={{ primary: { sx: { fontSize: "0.75rem", fontWeight: active ? 700 : 500 } } }} />
                  {!collapsed && count > 0 && <Box sx={{ minWidth: 18, height: 18, px: 0.6, borderRadius: 9, background: "#d77654", color: "#fff", fontSize: "0.55rem", fontWeight: 700, display: "grid", placeItems: "center" }}>{count}</Box>}
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      ))}

      <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1.2, pt: 1 }}>
        <Divider />
        <ListItemButton onClick={() => onNavigate(user.role === "superadmin" ? "super" : "profile")} sx={{ px: 1, borderRadius: 1, gap: 1 }}>
          <Avatar name={user.full_name} />
          {!collapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</Typography>
              <Typography sx={{ fontSize: "0.55rem", color: "#78827b", mt: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</Typography>
            </Box>
          )}
        </ListItemButton>
        <ListItemButton onClick={() => logout("")} sx={{ px: 1.2, minHeight: 37, borderRadius: 1, color: "#66716a", "&:hover": { background: "#f0f4f0", color: "#202922" } }}>
          <ListItemIcon sx={{ minWidth: 30, color: "inherit" }}>
            <LogOut sx={{ fontSize: 17 }} />
          </ListItemIcon>
          <ListItemText sx={{ display: collapsed ? "none" : "block" }} primary="Sign out" slotProps={{ primary: { sx: { fontSize: "0.75rem" } } }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box component="nav" sx={{ width: { md: collapsed ? 72 : DRAWER_WIDTH }, flexShrink: { md: 0 }, transition: "width .18s ease" }}>
        {isMobile ? (
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ "& .MuiDrawer-paper": { width: "min(280px, 84vw)", boxSizing: "border-box" } }}>
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer variant="permanent" open sx={{ "& .MuiDrawer-paper": { width: collapsed ? 72 : DRAWER_WIDTH, boxSizing: "border-box", borderRight: "1px solid #e7ebe6" } }}>
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, pr: { md: "var(--ai-pad, 0px)" }, transition: "padding-right .2s ease" }}>
        <AppBar position="sticky" elevation={0} sx={{ background: "rgba(255,255,255,0.93)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e9ede8", color: "#202922" }}>
          <Toolbar sx={{ minHeight: { xs: 57, md: 62 }, px: { xs: 1.5, md: 3.5 }, gap: 1.5 }}>
            <MuiIconButton size="small" aria-label={isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((v) => !v))}>
              <Menu sx={{ fontSize: 20 }} />
            </MuiIconButton>
            <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: "0.65rem", color: "#8a948d", display: { xs: "none", sm: "block" } }}>{theme.workspaceName}</Typography>
              <Typography sx={{ color: "#c8cec9", display: { xs: "none", sm: "block" } }}>/</Typography>
              <Typography noWrap sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#3d4941" }}>{allItems.find((i) => i.id === page || (i.alias || []).includes(page))?.label || "Home"}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <EntitySwitcher />
              <CountrySwitcher />
              <AiPageLocalizer />
              <Box component="form" onSubmit={submitSearch} sx={{ display: { xs: "none", lg: "flex" }, width: 230, height: 34, alignItems: "center", gap: 1, px: 1.2, border: "1px solid #e8ece8", borderRadius: 1, background: "#fafbf9", color: "#8a948d", "&:focus-within": { borderColor: "#9eb9a7", boxShadow: "0 0 0 3px rgba(78,129,96,0.09)" } }}>
                <Search sx={{ fontSize: 16 }} />
                <InputBase placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ fontSize: "0.65rem", flex: 1 }} slotProps={{ input: { "aria-label": "Search people" } }} />
              </Box>
              <IdleGuard />
              <MuiIconButton size="small" aria-label={`Notifications, ${unread} unread`} onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: "#66716a", "&:hover": { background: "#f1f4f0" } }}>
                <MuiBadge color="secondary" badgeContent={unread} overlap="circular">
                  <Bell sx={{ fontSize: 18 }} />
                </MuiBadge>
              </MuiIconButton>
              <Popover open={Boolean(notifAnchor)} anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 340, maxWidth: "calc(100vw - 24px)", mt: 1, borderRadius: 1.5 } } }}>
                <Box sx={{ p: 2, pb: 1.5, borderBottom: "1px solid #edf0ec", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>Notifications</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: "#78827b", mt: 0.3 }}>Latest updates for you</Typography>
                  </Box>
                  <MuiButton size="small" onClick={markAllRead} disabled={!unread} sx={{ fontSize: "0.6rem" }}>
                    Mark all read
                  </MuiButton>
                </Box>
                <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
                  {mine.length === 0 && <Typography sx={{ p: 2, fontSize: "0.65rem", color: "#78827b" }}>Nothing yet.</Typography>}
                  {mine.slice(0, 10).map((item) => (
                    <Box
                      key={item.id}
                      onClick={() => {
                        markRead(item.id);
                        setNotifAnchor(null);
                        if (item.link) onNavigate(item.link.replace(/^\//, ""));
                      }}
                      sx={{ display: "flex", gap: 1.2, p: "12px 15px", borderBottom: "1px solid #f0f2ef", cursor: "pointer", background: item.read ? "#fff" : "#f4f9f5", "&:hover": { background: "#eef5f0" } }}
                    >
                      <Box sx={{ width: 27, height: 27, borderRadius: 1, background: "#edf3ee", color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Bell sx={{ fontSize: 15 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.65rem", fontWeight: item.read ? 500 : 700 }}>{item.text}</Typography>
                        <Typography sx={{ fontSize: "0.6rem", color: "#78827b", mt: 0.4 }}>{timeAgo(item.at)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box onClick={() => { setNotifAnchor(null); onNavigate("notifications"); }} sx={{ p: 1.4, textAlign: "center", background: "#fbfcfa", color: "primary.main", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}>
                  Open all notifications
                </Box>
              </Popover>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />
              <Stack direction="row" spacing={1} onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ alignItems: "center", cursor: "pointer" }} role="button" aria-label="Account menu">
                <Avatar name={user.full_name} />
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, lineHeight: 1.2 }}>{user.full_name}</Typography>
                  <Typography sx={{ fontSize: "0.55rem", color: "#8a948d" }}>{ROLE_LABEL[user.role]}</Typography>
                </Box>
              </Stack>
              <MuiMenu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700 }}>{user.full_name}</Typography>
                  <Typography sx={{ fontSize: "0.6rem", color: "#78827b" }}>{user.code} · {user.login_id}</Typography>
                </Box>
                <Divider />
                {user.role !== "superadmin" && <MenuItem sx={{ fontSize: "0.7rem" }} onClick={() => { setMenuAnchor(null); onNavigate("profile"); }}>My profile</MenuItem>}
                <MenuItem sx={{ fontSize: "0.7rem" }} onClick={() => { setMenuAnchor(null); setPwOpen(true); }}>
                  <Key sx={{ fontSize: 15, mr: 1 }} /> Change password
                </MenuItem>
                <MenuItem sx={{ fontSize: "0.7rem" }} onClick={() => { setMenuAnchor(null); logout(""); }}>
                  <LogOut sx={{ fontSize: 15, mr: 1 }} /> Sign out
                </MenuItem>
              </MuiMenu>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, width: "100%", ...(glass ? meshBackground : { backgroundImage: "radial-gradient(#dfe5df 0.55px, transparent 0.55px)", backgroundSize: "19px 19px" }) }}>
        <Box component="main" data-ai-page sx={{ width: "100%", maxWidth: glass ? 1480 : 1370, mx: "auto", p: { xs: "21px 14px 10px", md: "29px 34px 12px" } }}>
          {children}
          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 3.5, pt: 2, borderTop: glass ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e5eae4", color: glass ? "rgba(242,247,244,0.5)" : "#9ba49d", fontSize: "0.55rem", gap: 2, flexWrap: "wrap" }}>
            <span>{theme.productName} workspace · {ROLE_LABEL[user.role]} view</span>
            <span>Demo data · Changes are saved in this browser</span>
          </Stack>
        </Box>
        </Box>
      </Box>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </Box>
  );
}
