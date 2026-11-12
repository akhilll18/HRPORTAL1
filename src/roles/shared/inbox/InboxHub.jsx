// Inbox & notifications in one place (v10.1): tab 1 "Inbox" — what is waiting on you and your own requests
// (employees: team approvals + my requests; admins: approvals for their modules; Super Admin: escalated / all requests);
// tab 2 "Notifications" — every update posted to you. /inbox and /notifications both open this page on the right tab,
// so the bell, notification links and AI shortcuts keep working.
import React from "react";
import { Box, Chip, Stack, Tab, Tabs } from "@mui/material";
import { InboxRounded, NotificationsRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../../store/AppStore.jsx";
import { PageHeader } from "../../../components/kit/UI.jsx";
import InboxPage from "./InboxPage.jsx";
import NotificationsPage from "../pages/NotificationsPage.jsx";
import ApprovalsPage from "../requests/ApprovalsPage.jsx";
import { tabSx } from "../../../components/suite/Hub.jsx";

export function inboxCount(data, user, { pendingForManager, pendingForAdmin }) {
  if (user.role === "emp") { const p = pendingForManager(user.employee_code); return p.requests.length + p.points.length; }
  if (user.role === "admin") { const p = pendingForAdmin(user); return p.requests.length + p.points.length + p.accounts.length + p.payouts.length; }
  return data.requests.filter((r) => r.status === "Pending" && !r.steps.some((st) => st.status === "pending" && st.approver)).length;
}

function Label({ icon, text, count, tone }) {
  return (
    <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
      {icon}
      <span>{text}</span>
      {count > 0 && <Chip size="small" label={count} sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, bgcolor: tone, color: "#fff" }} />}
    </Stack>
  );
}

export default function InboxHub({ tab = "inbox" }) {
  const store = useStore();
  const { data, user } = store;
  const navigate = useNavigate();
  const pending = inboxCount(data, user, store);
  const unread = data.notifications.filter((n) => n.to === user.code && !n.read).length;
  const subtitle = tab === "inbox"
    ? user.role === "emp" ? "Approvals waiting on you and every request you have made — who it is with and what happened."
      : user.role === "admin" ? "Everything that has reached you for a decision: leave, expenses, advances, loans, corrections, assets and new accounts."
        : "Requests that need Super Admin sign-off, and every request across the company."
    : "Every change to your requests, approvals, payslips, filings and accounts is posted here.";
  return (
    <>
      <PageHeader eyebrow={`INBOX · ${tab === "inbox" ? `${pending} WAITING` : `${unread} UNREAD`}`} title="Inbox" subtitle={subtitle} />
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => navigate(v === "inbox" ? "/inbox" : "/notifications", { replace: true })} sx={tabSx}>
          <Tab value="inbox" label={<Label icon={<InboxRounded sx={{ fontSize: 18 }} />} text="Inbox" count={pending} tone="#004A77" />} />
          <Tab value="notifications" label={<Label icon={<NotificationsRounded sx={{ fontSize: 18 }} />} text="Notifications" count={unread} tone="#F48A3E" />} />
        </Tabs>
      </Box>
      {tab === "inbox" && (user.role === "emp" ? <InboxPage embedded /> : <ApprovalsPage mode={user.role === "admin" ? "admin" : "super"} />)}
      {tab === "notifications" && <NotificationsPage embedded />}
    </>
  );
}
