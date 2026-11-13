// Employee home: glass dashboard with the punch orb, today's picture, balances, team view for managers.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { EventAvailableRounded, ReceiptLongRounded, StarsRounded, FlagRounded, PhoneInTalkRounded, InsightsRounded, ScheduleRounded, InventoryRounded, AddRounded, HistoryEduRounded, PlaceRounded, ViewQuiltRounded, CakeRounded } from "@mui/icons-material";
import { useStore } from "../../../store/AppStore.jsx";
import { G, GlassCard, GlassStat, GlassGrid, GlassBars, GlassButton, GlassRow, GlassPill, GlassAvatar, Ring, SplitBar, DemoClockNote } from "../../../components/glass/Glass.jsx";
import PunchPanel from "../../../components/workforce/PunchPanel.jsx";
import { lastNDays, dayAttendance, callStats, productivity, isWeekend } from "../../../lib/hrcalc.js";
import { register, registerCounts, activityFor } from "../../../lib/workforce.js";
import { isoDate, fmtNum, timeAgo } from "../../../lib/utils.js";
import { REQUEST_TYPES } from "../../../lib/requests.js";
import { AiInsight } from "../../../components/ai/AiInsight.jsx";
import { holidaysFor } from "../../../country/countryPacks.js";
import { HOLIDAY_GREETINGS_KEY, readHolidayGreetings } from "../../../data/holidayGreetings.js";

export default function EmployeeGlassHome({ classic, view = "glass", onView = () => {}, restrictedWorker = false, workerRole = "employee", birthdayEmployees = [] }) {
  const store = useStore();
  const { data, user, leaveBalanceOf, balanceOf, reportsOf, pendingForManager, nameOf } = store;
  const [greetingState, setGreetingState] = useState(readHolidayGreetings);
  useEffect(() => {
    const refresh = (event) => {
      if (!event.key || event.key === HOLIDAY_GREETINGS_KEY) setGreetingState(readHolidayGreetings());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const navigate = useNavigate();
  const e = data.employees.find((x) => x.employee_code === user.employee_code);
  const today = isoDate();
  const hour = new Date().getHours();
  const team = reportsOf(e.employee_code).filter((x) => x.status === "active");
  const isManager = team.length > 0;

  const week = useMemo(
    () =>
      lastNDays(7).map((d) => {
        const a = dayAttendance(data.punches.filter((p) => p.employee_code === e.employee_code && p.ts.startsWith(d)), { grace: data.settings.late_after });
        return { label: new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" }), short: new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { weekday: "narrow" }), value: +a.hours.toFixed(1), weekend: isWeekend(d) };
      }),
    [data.punches, e.employee_code, data.settings.late_after],
  );
  const weekHours = week.reduce((s, d) => s + d.value, 0);
  const el = leaveBalanceOf(e.employee_code).find((b) => b.code === "EL");
  const cl = leaveBalanceOf(e.employee_code).find((b) => b.code === "CL");
  const myGoals = data.goals.filter((g) => g.employee_code === e.employee_code);
  const goalPct = myGoals.length ? Math.round(myGoals.reduce((s, g) => s + g.progress * g.weight, 0) / Math.max(1, myGoals.reduce((s, g) => s + g.weight, 0))) : 0;
  const myCalls = data.calls.filter((c) => c.employee_code === e.employee_code && c.ts.startsWith(today));
  const cs = callStats(myCalls);
  const act = activityFor(data, e.employee_code, today);
  const prod = productivity(act);
  const consent = data.consents[e.employee_code];
  const openReqs = data.requests.filter((r) => r.employee_code === e.employee_code && r.status === "Pending");
  const myAssets = data.assets.filter((a) => a.assigned_to === e.employee_code);
  const toAck = myAssets.filter((a) => !a.acknowledged);
  const countryHolidays = holidaysFor(data, e);
  const configuredHolidays = Object.entries(greetingState.greetings)
    .filter(([name, greeting]) => greeting.date && !countryHolidays.some((holiday) => holiday.name === name))
    .map(([name, greeting]) => ({ name, date: greeting.date, type: "holiday" }));
  const nextHoliday = [...countryHolidays.map((holiday) => ({
    ...holiday,
    date: greetingState.greetings[holiday.name]?.date || holiday.date,
  })), ...configuredHolidays]
    .filter((holiday) => holiday.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const daysUntilHoliday = nextHoliday ? Math.ceil((new Date(`${nextHoliday.date}T12:00:00`) - new Date(`${today}T00:00:00`)) / 86400000) : Infinity;
  const holidayGreeting = nextHoliday && daysUntilHoliday <= 7 ? greetingState.greetings[nextHoliday.name] : null;
  const birthdays = birthdayEmployees
    .filter((employee) => employee.status === "active" && employee.date_of_birth && employee.employee_code !== e.employee_code)
    .map((employee) => {
      const [, month, day] = employee.date_of_birth.split("-").map(Number);
      const now = new Date();
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let nextDate = new Date(now.getFullYear(), month - 1, day);
      if (nextDate < todayDate) nextDate = new Date(now.getFullYear() + 1, month - 1, day);
      return { employee, days: Math.round((nextDate - todayDate) / 86400000) };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);
  const contingent = restrictedWorker || workerRole === "intern";
  const workerTitle = { employee: "Permanent Employee", intern: "Intern", freelancer: "Freelancer", contractor: "Contract Worker" }[workerRole];
  const onb = data.onboarding.find((o) => o.employee_code === e.employee_code);
  const praise = data.feedback.filter((f) => f.to === e.employee_code && (f.visibility === "public" || f.to === e.employee_code)).slice(0, 2);
  const live = data.locations[e.employee_code];
  const review = data.reviews[e.employee_code];
  const teamRows = isManager ? register(data, team) : [];
  const tc = registerCounts(teamRows);
  const pend = isManager ? pendingForManager(e.employee_code) : { requests: [], points: [] };

  const upcoming = [
    data.cycle.stage === "self_review" && !review?.self && { icon: <HistoryEduRounded />, title: "Self review is open", sub: `Due ${data.cycle.self_due} · ${data.cycle.name}`, to: "/performance-me" },
    toAck.length > 0 && { icon: <InventoryRounded />, title: `Confirm receipt of ${toAck.length} asset${toAck.length > 1 ? "s" : ""}`, sub: toAck.map((a) => a.asset_id).join(", "), to: "/assets" },
    onb && onb.done.some((d) => !d) && { icon: <ScheduleRounded />, title: "Finish your onboarding", sub: `${onb.done.filter(Boolean).length} of ${onb.done.length} steps done`, to: "/onboarding-me" },
    !consent && { icon: <PlaceRounded />, title: "Choose your monitoring settings", sub: "Location while clocked in and work activity", to: "/my-activity" },
    nextHoliday && { kind: "holiday", icon: <EventAvailableRounded />, title: nextHoliday.name, sub: `${new Date(`${nextHoliday.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}${nextHoliday.type === "floater" ? " · floater" : ""}`, to: "/leave" },
  ].filter(Boolean);
  const visibleUpcoming = upcoming;

  if (view === "classic" && classic) {
    return (
      <Box>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1.5 }}>
          <GlassButton sx={{ color: "#1e493a", background: "#e8f2ec", border: "1px solid #d5e5da" }} startIcon={<ViewQuiltRounded />} onClick={() => onView("glass")}>Glass dashboard</GlassButton>
        </Stack>
        {classic}
      </Box>
    );
  }

  return (
    <Box sx={{ color: G.fog }}>
      <Stack direction={{ xs: "column", md: "row" }} sx={{ justifyContent: "space-between", alignItems: { md: "flex-end" }, mb: 2.5, gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: "0.7rem", color: G.muted }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</Typography>
          <Typography component="h1" sx={{ fontFamily: "Manrope", fontWeight: 800, fontSize: { xs: "1.6rem", md: "2.1rem" }, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            {hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, {e.full_name.split(" ")[0]}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: G.muted, mt: 0.5 }}>{workerTitle} · {e.designation} in {e.department}{e.reporting_manager ? `, reporting to ${nameOf(e.reporting_manager)}` : ""}</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {!restrictedWorker && <GlassButton variant="solid" startIcon={<AddRounded />} onClick={() => navigate("/leave?new=1")}>Apply leave</GlassButton>}
          <GlassButton startIcon={<ReceiptLongRounded />} onClick={() => navigate("/expenses")}>Claim expense</GlassButton>
          {classic && <GlassButton startIcon={<ViewQuiltRounded />} onClick={() => onView("classic")}>Classic view</GlassButton>}
        </Stack>
      </Stack>

      {!restrictedWorker && <AiInsight
        variant="glass"
        title="Your AI daily brief"
        audience={`${e.full_name.split(" ")[0]}, an employee${isManager ? " who manages a team" : ""}`}
        sx={{ mb: 1.6 }}
        facts={[
          upcoming[0] && `Top item for today: ${upcoming[0].title} (${upcoming[0].sub})`,
          `${weekHours.toFixed(1)} hours worked over the last 7 days`,
          el && `Earned leave: ${el.available} day(s) available`,
          cl && `Casual leave: ${cl.available} day(s) available`,
          openReqs.length > 0 && `${openReqs.length} of your request(s) are pending: ${openReqs.map((r) => `${REQUEST_TYPES[r.type]?.label} ${r.request_id}`).join(", ")}`,
          myGoals.length > 0 && `Goal progress ${goalPct}% overall; ${myGoals.filter((g) => g.status === "at_risk").length} goal(s) at risk`,
          toAck.length > 0 && `${toAck.length} asset(s) waiting for your acknowledgement`,
          nextHoliday && `Next holiday: ${nextHoliday.name} on ${nextHoliday.date}`,
          isManager && `Team today: ${tc.present} on time, ${tc.late} late, ${tc.leave} on leave, ${tc.absent + tc.not_in} not in`,
          isManager && pend.requests.length + pend.points.length > 0 && `${pend.requests.length + pend.points.length} team approval(s) waiting for you`,
        ]}
      />}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.55fr 1fr" }, gap: 1.6, mb: 1.6 }}>
        <GlassCard level={2} pad={2.6} radius="26px">
          <PunchPanel dark />
        </GlassCard>
        <GlassCard title="Today" subtitle={data.demo_clock ? `Demo clock ${data.demo_clock.at}` : undefined}>
          <Stack spacing={1.4}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Ring value={weekHours} max={40} label={`${weekHours.toFixed(0)} h`} sub="this week" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <GlassBars data={week} height={70} format={(v) => `${v} h`} />
              </Box>
            </Stack>
            <GlassRow left={<PlaceRounded sx={{ color: live ? G.mint : G.faint, fontSize: 20 }} />} title={live ? "Sharing location while clocked in" : consent?.location ? "Location shares after you clock in" : "Live location is off"} sub={consent ? `Activity tracking ${consent.activity ? "on" : "off"} · change in My activity` : "You have not chosen your monitoring settings"} onClick={() => navigate("/my-activity")} right={<GlassPill tone={live ? "good" : "fog"}>{live ? "Live" : "Off"}</GlassPill>} />
            {!restrictedWorker && openReqs.length > 0 && <GlassRow left={<ScheduleRounded sx={{ color: G.saffron, fontSize: 20 }} />} title={`${openReqs.length} request${openReqs.length > 1 ? "s" : ""} waiting`} sub={openReqs.map((r) => `${REQUEST_TYPES[r.type].label} with ${nameOf(r.steps.find((s) => s.status === "pending")?.approver)}`).slice(0, 2).join(" · ")} onClick={() => navigate("/inbox")} />}
            <DemoClockNote clock={data.demo_clock} />
          </Stack>
        </GlassCard>
      </Box>

      <GlassGrid min={170} sx={{ mb: 1.6 }}>
        <GlassStat label={workerRole === "intern" ? "Request leave" : contingent ? "Available balance" : "Earned leave"} value={contingent ? "0" : el?.available ?? "—"} hint={contingent ? "Available balance · 0" : `Casual ${cl?.available ?? 0} · pending ${el?.pending ?? 0}`} icon={<EventAvailableRounded />} onClick={() => navigate("/leave")} />
        {!restrictedWorker && <GlassStat label="Goal progress" value={`${goalPct}%`} hint={`${myGoals.filter((g) => g.status === "at_risk").length} at risk · ${data.cycle.name}`} icon={<FlagRounded />} onClick={() => navigate("/performance-me")} />}
        {e.call_tracking === "yes" && <GlassStat label="Calls today" value={`${cs.total}/${data.settings.call_daily_target}`} hint={`${cs.connectRate}% connected · ${cs.talkMin} min talk`} icon={<PhoneInTalkRounded />} tone="info" onClick={() => navigate("/calls")} />}
        <GlassStat label="Focus today" value={consent?.activity ? `${prod.productivePct}%` : "Off"} hint={consent?.activity ? `${Math.round(prod.active / 60 * 10) / 10} h active · ${prod.idlePct}% idle` : "Activity tracking needs your consent"} icon={<InsightsRounded />} tone="fog" onClick={() => navigate("/my-activity")} />
        {restrictedWorker && <GlassStat label="Open leave requests" value="0" hint="Leave is not included in your contract" icon={<ScheduleRounded />} onClick={() => navigate("/leave")} />}
      </GlassGrid>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: isManager && !restrictedWorker ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))" }, gap: 1.6 }}>
        {isManager && !restrictedWorker && (
          <GlassCard title="My team today" subtitle={`${team.length} direct reports`} action={<GlassButton onClick={() => navigate("/inbox")}>{pend.requests.length + pend.points.length} to approve</GlassButton>}>
            <SplitBar parts={[{ label: "On time", value: tc.present, color: G.mint }, { label: "Late", value: tc.late, color: G.saffron }, { label: "On leave", value: tc.leave, color: G.info }, { label: "Not in", value: tc.absent + tc.not_in, color: "rgba(255,255,255,0.35)" }, { label: "Out", value: tc.out, color: "#6FA48F" }]} />
            <Box sx={{ mt: 1.4 }}>
              {teamRows.slice(0, 5).map((r) => (
                <GlassRow key={r.e.employee_code} left={<GlassAvatar name={r.e.full_name} />} title={r.e.full_name} sub={r.inT ? `In ${r.inT}${r.outT ? ` · out ${r.outT}` : ""} · ${(r.source || "").replace("_", " ")}` : r.status === "leave" ? "On leave" : "No punch yet"} right={<GlassPill tone={{ present: "good", late: "warn", leave: "info", absent: "bad" }[r.status] || "fog"}>{{ present: "On time", late: "Late", leave: "Leave", absent: "Not in", not_in: "Not in yet", out: "Out", weekend: "Off" }[r.status]}</GlassPill>} onClick={() => navigate("/team-live")} />
              ))}
            </Box>
          </GlassCard>
        )}
        <GlassCard title="Coming up" subtitle="Things that need you">
          {greetingState.error && <Typography sx={{ fontSize: "0.62rem", color: G.saffron, mb: 1 }}>{greetingState.error}</Typography>}
          {holidayGreeting && <Box component="img" src={holidayGreeting.image} alt={`${nextHoliday.name} greeting`} sx={{ display: "block", width: "100%", maxHeight: 160, mb: 1, borderRadius: 2, objectFit: "cover" }} />}
          {visibleUpcoming.filter((item) => !holidayGreeting || item.kind !== "holiday").length === 0 ? <Typography sx={{ fontSize: "0.68rem", color: G.muted }}>Nothing pending. Enjoy your day.</Typography> : visibleUpcoming.filter((item) => !holidayGreeting || item.kind !== "holiday").map((u) => <GlassRow key={u.title} left={<Box sx={{ color: G.mint, display: "grid", "& svg": { fontSize: 20 } }}>{u.icon}</Box>} title={u.title} sub={u.sub} onClick={() => navigate(u.to)} />)}
        </GlassCard>
        <GlassCard title="Upcoming birthdays" subtitle="Celebrate your teammates">
          {birthdays.length ? birthdays.map(({ employee, days }) => <GlassRow key={employee.employee_code} left={<CakeRounded sx={{ color: G.saffron, fontSize: 20 }} />} title={employee.full_name} sub={days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`} onClick={!restrictedWorker ? () => navigate("/people") : undefined} />) : <Typography sx={{ fontSize: "0.68rem", color: G.muted }}>No upcoming birthdays.</Typography>}
        </GlassCard>
        <GlassCard title="Recognition and assets">
          {praise.map((f) => <GlassRow key={f.id} left={<GlassAvatar name={nameOf(f.from)} />} title={f.text} sub={`${nameOf(f.from)} · ${timeAgo(f.at)}`} onClick={() => navigate("/performance-me")} />)}
          {myAssets.slice(0, 3).map((a) => <GlassRow key={a.asset_id} left={<InventoryRounded sx={{ color: G.faint, fontSize: 20 }} />} title={`${a.category} · ${a.model}`} sub={`${a.asset_id} · ${a.acknowledged ? "receipt confirmed" : "confirm receipt"}`} right={!a.acknowledged ? <GlassPill tone="warn">Action</GlassPill> : null} onClick={() => navigate("/assets")} />)}
          {praise.length + myAssets.length === 0 && <Typography sx={{ fontSize: "0.68rem", color: G.muted }}>Praise from colleagues and your assigned assets show here.</Typography>}
        </GlassCard>
      </Box>
    </Box>
  );
}
