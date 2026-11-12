import React from "react";
import { PageHeader } from "../../components/kit/UI.jsx";
import ApprovalsPage from "../shared/requests/ApprovalsPage.jsx";

export default function AllRequests() {
  return (
    <>
      <PageHeader eyebrow="SUPER ADMIN · OVERSIGHT" title="All requests" subtitle="Leave, expenses, advances, loans, attendance corrections and asset requests across the organisation. “Needs you” holds escalations and requests with no available approver. Any request can be overridden with an audit note." />
      <ApprovalsPage mode="super" />
    </>
  );
}
