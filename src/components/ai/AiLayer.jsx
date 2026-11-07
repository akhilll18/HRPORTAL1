// Mounts the portal-wide generative AI layer: field assist on every text box, explain-any-selection, and the copilot.
import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore, ROLE_LABEL } from "../../store/AppStore.jsx";
import { navFor } from "../../data/roleNav.js";
import AiFieldAssist from "./AiFieldAssist.jsx";
import AiSelection from "./AiSelection.jsx";
import AiCopilot from "./AiCopilot.jsx";

export default function AiLayer() {
  const store = useStore();
  const { user, data, reportsOf } = store;
  const location = useLocation();
  const navigate = useNavigate();
  const route = `${location.pathname}${location.search}`;
  const pageId = location.pathname.split("/")[1] || "";
  const page = useMemo(() => {
    if (!user) return { title: "PeopleHub", who: "" };
    const isManager = user.role === "emp" && reportsOf(user.employee_code).length > 0;
    const label = navFor(user.role, isManager, { user, data }).flatMap((g) => g.items).find((i) => i.id === pageId)?.label || "Home";
    return { title: label, who: `${user.full_name}, ${user.designation || ROLE_LABEL[user.role]}${user.department ? `, ${user.department}` : ""}` };
  }, [user, data, pageId, reportsOf]);
  if (!user) return null;
  return (
    <>
      <AiFieldAssist page={page} />
      <AiSelection page={page} />
      <AiCopilot store={store} route={route} onNavigate={(to) => navigate(to.startsWith("/") ? to : `/${to}`)} />
    </>
  );
}
