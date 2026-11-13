import React, { useEffect, useState } from "react";
import { Alert, Box, Typography, Stack } from "@mui/material";
import {
  SouthEast as ArrowDownRight,
  NorthEast as ArrowUpRight,
  CalendarMonth as CalendarDays,
  Check,
  AccessTime as Clock3,
  Description as FileText,
  AutoAwesome as Sparkles,
  Groups as UsersRound,
  AccountBalanceWallet as WalletCards,
  EventAvailable,
  Cake as CakeIcon,
  CardGiftcard as GiftIcon,
} from "@mui/icons-material";
import { holidays } from "../../../data/peopleHubData.js";
import { HOLIDAY_GREETINGS_KEY, readHolidayGreetings } from "../../../data/holidayGreetings.js";
import HoursRangeCard from "../../../components/workforce/HoursRangeCard.jsx";
import PunchPanel from "../../../components/workforce/PunchPanel.jsx";
import { theme } from "../../../theme.js";
import {
  Avatar,
  Button,
  ChevronAction,
  Panel,
  StatCard,
} from "../../../components/PortalUI.jsx";

const tasks = [
  {
    title: "Complete your profile",
    detail: "Add an emergency contact",
    icon: UsersRound,
    route: "people",
    status: "5 min",
  },
  {
    title: "Review your leave requests",
    detail: "Check the status of time away",
    icon: CalendarDays,
    route: "timeoff",
    status: "View requests",
  },
  {
    title: "Read the updated handbook",
    detail: "People policies · Updated Sep 12",
    icon: FileText,
    route: "documents",
    status: "New",
  },
];

function formatClockTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
}

function getDaysUntilBirthday(birthDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const [, month, day] = birthDate.split("-").map(Number);
  const next = new Date(now.getFullYear(), month - 1, day);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next - now) / (1000 * 60 * 60 * 24));
}

function getBirthdayDayLabel(birthDate) {
  const [, month, day] = birthDate.split("-").map(Number);
  return new Date(2000, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function OverviewPage({
  onNavigate,
  onAction,
  employeeCount,
  pendingLeaves,
  departmentCount = 0,
  attendanceRecords = [],
  employees = [],
  currentEmployeeCode,
  role = "employee",
}) {
  const restrictedWorker = role === "contractor" || role === "freelancer";
  const intern = role === "intern";
  const [greetingState, setGreetingState] = useState(readHolidayGreetings);
  useEffect(() => {
    const refresh = (event) => {
      if (!event.key || event.key === HOLIDAY_GREETINGS_KEY) setGreetingState(readHolidayGreetings());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const hour = new Date().getHours();
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingHoliday = holidays
    .map((holiday) => {
      const date = greetingState.greetings[holiday.name]?.date;
      return { ...holiday, dateValue: date ? new Date(`${date}T12:00:00`) : new Date(`${holiday.date} 12:00:00`) };
    })
    .filter((holiday) => holiday.dateValue >= startOfToday)
    .sort((first, second) => first.dateValue - second.dateValue)[0];

  const todayEntries = attendanceRecords.filter(r => {
    const d = new Date(r.timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const nearestBirthday = employees
    .filter((employee) => employee.status === "active" && employee.date_of_birth && employee.employee_code !== currentEmployeeCode)
    .map((employee) => ({
      id: employee.employee_code,
      name: employee.full_name,
      role: employee.designation,
      birthDate: employee.date_of_birth,
      daysUntil: getDaysUntilBirthday(employee.date_of_birth),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];
  const holidayGreeting = upcomingHoliday && Math.ceil((upcomingHoliday.dateValue - new Date()) / (1000 * 60 * 60 * 24)) <= 7
    ? greetingState.greetings[upcomingHoliday.name]
    : null;

  return (
    <>
      {/* Welcome banner */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          minHeight: 198,
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
          p: { xs: 3, md: "25px 35px" },
          border: "1px solid #244d3d",
          borderRadius: 1.5,
          background:
            "radial-gradient(ellipse at 78% 125%, rgba(113,151,108,0.42) 0, transparent 42%), linear-gradient(112deg, #234d3d 0%, #315f49 57%, #466d50 100%)",
          color: "#fff",
          boxShadow: "0 7px 20px rgba(36,77,61,0.12)",
          "&::before": {
            content: '""',
            position: "absolute",
            top: -102,
            right: 115,
            width: 300,
            height: 300,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "50%",
            boxShadow:
              "0 0 0 34px rgba(255,255,255,0.03), 0 0 0 70px rgba(255,255,255,0.03)",
          },
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
            <Box
              sx={{
                width: 22,
                height: 22,
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 1,
                color: "#d6e2c7",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Sparkles sx={{ fontSize: 14 }} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "1.1px",
                color: "#c4d7c9",
              }}
            >
              {todayLabel.toUpperCase()}
            </Typography>
          </Stack>

          <Typography
            sx={{
              fontFamily: "Manrope",
              fontWeight: 600,
              fontSize: { xs: "1.55rem", md: "1.75rem" },
              lineHeight: 1.1,
              color: "#fff",
              mb: 0.6,
            }}
          >
            {greeting},
            <br />
            {theme.currentUser.shortName}
            <Box component="span" sx={{ color: "#f0a07e" }}>
              .
            </Box>
          </Typography>

          <Typography sx={{ fontSize: "0.7rem", color: "#d4e0d7", mb: 2.5 }}>
            Your workday, your people, all in one place.
          </Typography>

          {/* Today's Entries Chips in Banner */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              pb: 1,
              "&::-webkit-scrollbar": { height: 6 },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: 3 },
            }}
          >
            {todayEntries.length > 0 ? (
              todayEntries.map((record) => {
                const isIn = record.type.toLowerCase().includes("in");
                return (
                  <Box
                    key={record.id}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      px: 1.2,
                      py: 0.5,
                      borderRadius: 1,
                      background: "#fff",
                      border: `1px solid ${isIn ? "#c8e6c9" : "#ffcdd2"}`,
                      color: isIn ? "#2e7d32" : "#c62828",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isIn ? "#4caf50" : "#f44336",
                      }}
                    />
                    {formatClockTime(record.timestamp)}
                  </Box>
                );
              })
            ) : (
              <Typography sx={{ fontSize: "0.65rem", color: "#d4e0d7", fontStyle: "italic" }}>
                No entries yet today.
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ position: "relative", zIndex: 1, mt: { xs: 2, sm: 0 }, ml: { sm: 2.5 }, pl: { sm: 2.5 }, pt: { xs: 1.5, sm: 0 }, borderLeft: { sm: "1px solid rgba(255,255,255,0.24)" }, borderTop: { xs: "1px solid rgba(255,255,255,0.24)", sm: "none" }, minWidth: { sm: 290 }, flexShrink: 0 }}>
          <PunchPanel dark compact />
        </Box>
      </Box>

      {/* Section intro */}
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-end", mt: 3.5, mb: 1.4 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 700,
              letterSpacing: "1.15px",
              color: "#89948c",
              mb: 0.4,
            }}
          >
            {todayLabel.split(",")[0].toUpperCase()} SNAPSHOT
          </Typography>
          <Typography
            sx={{
              fontFamily: "Manrope",
              fontWeight: 700,
              fontSize: "1rem",
              color: "#202922",
            }}
          >
            Your overview
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#64a37a",
              boxShadow: "0 0 0 3px #e7f3e9",
            }}
          />
          <Typography sx={{ fontSize: "0.6rem", color: "#838e86" }}>
            Updated just now
          </Typography>
        </Stack>
      </Stack>

      {/* Stats grid (Team members, leave today, payday, balance, open requests) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            lg: restrictedWorker ? "repeat(3, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        {!restrictedWorker && <StatCard label="Team members" value={employeeCount} note={`Across ${departmentCount || 0} departments`} icon={UsersRound} tone="green" onClick={() => onNavigate("people")} />}
        <StatCard
          label={intern ? "Request leave" : "Available balance"}
          value={intern || restrictedWorker ? "0" : "8 days"}
          note={intern ? "Available balance · 0" : restrictedWorker ? "Leave is not included in your contract" : "Request leave"}
          icon={CalendarDays}
          tone="orange"
          onClick={() => onNavigate("timeoff")}
        />
        {!restrictedWorker && !intern && <StatCard
          label="Next payday"
          value="Oct 30"
          note="October payroll"
          icon={WalletCards}
          tone="blue"
          onClick={() => onNavigate("pay")}
        />}
        <StatCard
          label="Upcoming holidays"
          value={upcomingHoliday ? upcomingHoliday.dateValue.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "--"}
          note={upcomingHoliday ? upcomingHoliday.name : "No upcoming holidays"}
          icon={EventAvailable}
          tone="blue"
        />
        <StatCard
          label="Open leave requests"
          value={restrictedWorker ? "0" : String(pendingLeaves).padStart(2, "0")}
          note={restrictedWorker ? "Leave is not included in your contract" : "Leave awaiting review"}
          icon={Clock3}
          tone="rose"
          onClick={() => onNavigate("timeoff")}
        />
      </Box>

      {/* ---------- Half-width birthday + half-width holiday (now BELOW the 5 cards) ---------- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 1.6,
          mt: 1.6,
        }}
      >
        {/* LEFT: Nearest upcoming birthday (half card) */}
        <Panel
          title="Upcoming birthdays"
          subtitle="Celebrate your teammates"
          action={!restrictedWorker &&
            <ChevronAction onClick={() => onNavigate("people")}>
              View all
            </ChevronAction>
          }
        >
          {nearestBirthday ? (
            <Box sx={{ p: 1.5 }}>
              <Box
                onClick={restrictedWorker ? undefined : () => onNavigate("people")}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.6,
                  borderRadius: 1.5,
                  border: "1px solid #edf0ec",
                  background: nearestBirthday.daysUntil === 0 ? "#fdf7f2" : "#fbfdfb",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                  "&:hover": {
                    borderColor: "#c9d8cd",
                    background: nearestBirthday.daysUntil === 0 ? "#fbf1e8" : "#fbfdfb",
                  },
                }}
              >
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                  <Avatar name={nearestBirthday.name} size="large" />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: -2,
                      right: -4,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: nearestBirthday.daysUntil === 0 ? "#f0a07e" : "#c6dfaa",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      border: "2px solid #fff",
                    }}
                  >
                    <GiftIcon sx={{ fontSize: 12 }} />
                  </Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#202922",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nearestBirthday.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.62rem",
                      color: "#8a948d",
                      mt: 0.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nearestBirthday.role}
                  </Typography>
                  <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mt: 0.8 }}>
                    <CakeIcon sx={{ fontSize: 14, color: "#bf7955" }} />
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: nearestBirthday.daysUntil === 0 ? "#c25e3a" : "#5f6b63",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {nearestBirthday.daysUntil === 0
                        ? "Today"
                        : nearestBirthday.daysUntil === 1
                          ? "Tomorrow"
                          : `${getBirthdayDayLabel(nearestBirthday.birthDate)} · in ${nearestBirthday.daysUntil} days`}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: "0.65rem", color: "#8a948d", fontStyle: "italic", p: 1.5 }}>
              No upcoming birthdays.
            </Typography>
          )}
        </Panel>

        {/* RIGHT: Single upcoming holiday (half card) — no action heading */}
        <Panel title="Upcoming holidays" subtitle="Time to look forward to">
          {greetingState.error && <Alert severity="warning" sx={{ mx: 1.5, mt: 1 }}>{greetingState.error}</Alert>}
          {holidayGreeting ? (
            <Box sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: "0.68rem", color: "#5f6b63", mb: 1 }}>A greeting for {upcomingHoliday.name}</Typography>
              <Box component="img" src={holidayGreeting.image} alt={`${upcomingHoliday.name} greeting`} sx={{ display: "block", width: "100%", maxHeight: 240, borderRadius: 1.5, objectFit: "cover" }} />
            </Box>
          ) : upcomingHoliday ? (
            <Box sx={{ p: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.4,
                  p: 1.6,
                  borderRadius: 1.5,
                  border: "1px solid #edf0ec",
                  background: "#fbfdfb",
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 64,
                    border: "1px solid #e6ece5",
                    borderRadius: 1,
                    background: "#fff",
                    color: "#416b4d",
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{ fontFamily: "Manrope", fontWeight: 700, fontSize: "1.35rem", lineHeight: 1 }}
                  >
                    {upcomingHoliday.dateValue.getDate()}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.55rem", fontWeight: 700, mt: 0.3, letterSpacing: "0.5px" }}
                  >
                    {upcomingHoliday.dateValue
                      .toLocaleDateString("en-US", { month: "short" })
                      .toUpperCase()}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#202922",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {upcomingHoliday.name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.62rem", color: "#8a948d", mt: 0.4 }}>
                    {upcomingHoliday.dateValue.toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
                    {" · "}
                    in{" "}
                    {Math.max(
                      0,
                      Math.ceil(
                        (upcomingHoliday.dateValue - new Date()) / (1000 * 60 * 60 * 24)
                      )
                    )}{" "}
                    day
                    {Math.max(
                      0,
                      Math.ceil(
                        (upcomingHoliday.dateValue - new Date()) / (1000 * 60 * 60 * 24)
                      )
                    ) === 1
                      ? ""
                      : "s"}
                  </Typography>
                </Box>
                <EventAvailable sx={{ fontSize: 24, color: "#64a37a", flexShrink: 0 }} />
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: "0.65rem", color: "#8a948d", fontStyle: "italic", p: 1.5 }}>
              No upcoming holidays.
            </Typography>
          )}
        </Panel>
      </Box>

      {/* Row 1 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: restrictedWorker ? "1fr" : { xs: "1fr", md: "1fr 1.1fr" },
          gap: 1.6,
          mt: 1.6,
        }}
      >
        <HoursRangeCard />

        {!restrictedWorker && <Panel
          title="Coming up"
          subtitle="A few things on your radar"
          action={
            <ChevronAction onClick={() => onNavigate("timeoff")}>
              View requests
            </ChevronAction>
          }
        >
          <Box sx={{ px: 1.5, pb: 0.5 }}>
            {tasks.map((task, i) => {
              const Icon = task.icon;
              return (
                <Box
                  key={task.title}
                  onClick={() => onNavigate(task.route)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.1,
                    py: 1.2,
                    px: 0.2,
                    borderBottom: i < tasks.length - 1 ? "1px solid #f0f2ef" : "none",
                    cursor: "pointer",
                    "&:hover .task-title": { color: "primary.main" },
                    "&:hover .task-arrow": { color: "primary.main" },
                  }}
                >
                  <Box
                    sx={{
                      width: 29,
                      height: 29,
                      borderRadius: 1,
                      background: "#f2f5f1",
                      color: "#64806a",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      className="task-title"
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: "#39443c",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        transition: "color 0.15s",
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        color: "#929b94",
                        mt: 0.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.detail}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: "0.6rem", color: "#8d978f", whiteSpace: "nowrap" }}
                  >
                    {task.status}
                  </Typography>
                  <ArrowUpRight
                    className="task-arrow"
                    sx={{
                      fontSize: 15,
                      color: "#b2bbb3",
                      flexShrink: 0,
                      transition: "color 0.15s",
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        </Panel>}
      </Box>

      {/* Row 2 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "0.92fr 1.08fr" },
          gap: 1.6,
          mt: 1.6,
        }}
      >
        <Panel title="Quick links" subtitle="The things you do most">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              p: 1.5,
            }}
          >
            {[
              {
                label: "Request time off",
                icon: CalendarDays,
                onClick: () => onAction("leave"),
                bg: "#ebf3ec",
                color: "#4a7a59",
              },
              {
                label: "View pay details",
                icon: WalletCards,
                onClick: () => onNavigate("pay"),
                bg: "#edf3f8",
                color: "#5b84a2",
              },
              {
                label: "Find a teammate",
                icon: UsersRound,
                onClick: () => onNavigate("people"),
                bg: "#fbf0e9",
                color: "#bf7955",
              },
              {
                label: "Contact HR",
                icon: FileText,
                onClick: () => onNavigate("support"),
                bg: "#f7eded",
                color: "#a9686d",
              },
            ].filter((item) => !restrictedWorker || !["Request time off", "View pay details", "Find a teammate"].includes(item.label)).map((item) => {
              const Icon = item.icon;
              return (
                <Box
                  key={item.label}
                  onClick={item.onClick}
                  sx={{
                    display: "flex",
                    minHeight: 55,
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    border: "1px solid #edf0ec",
                    borderRadius: 1,
                    background: "#fff",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    "&:hover": { borderColor: "#c9d8cd", background: "#fbfdfb" },
                  }}
                >
                  <Box
                    sx={{
                      width: 31,
                      height: 31,
                      borderRadius: 1,
                      background: item.bg,
                      color: item.color,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: 17 }} />
                  </Box>
                  <Typography
                    sx={{ flex: 1, fontSize: "0.6rem", fontWeight: 600, color: "#4c584f" }}
                  >
                    {item.label}
                  </Typography>
                  <ArrowUpRight sx={{ fontSize: 14, color: "#a3ada5" }} />
                </Box>
              );
            })}
          </Box>
        </Panel>

        <Panel
          title="From the People team"
          subtitle="Company notes for you"
          action={
            <ChevronAction onClick={() => onNavigate("documents")}>
              All updates
            </ChevronAction>
          }
        >
          {[
            {
              day: "12",
              month: "OCT",
              title: "October payroll calendar",
              detail: "Timesheets close Friday, October 23.",
              muted: false,
            },
            {
              day: "09",
              month: "OCT",
              title: "Mid-year check-in is open",
              detail: "Set aside a few minutes to reflect and plan.",
              muted: true,
            },
          ].map((a, i) => (
            <Box
              key={a.title}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                p: "11px 15px",
                borderBottom: i === 0 ? "1px solid #f0f2ef" : "none",
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 39,
                  border: "1px solid #e6ece5",
                  borderRadius: 0.6,
                  background: "#f8faf7",
                  color: a.muted ? "#8c9890" : "#416b4d",
                  display: "grid",
                  alignContent: "center",
                  justifyItems: "center",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ fontFamily: "Manrope", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  {a.day}
                </Typography>
                <Typography sx={{ fontSize: "0.45rem", fontWeight: 700, mt: 0.1 }}>
                  {a.month}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 600 }}>
                  {a.title}
                </Typography>
                <Typography sx={{ fontSize: "0.6rem", color: "#8a948d", mt: 0.4 }}>
                  {a.detail}
                </Typography>
              </Box>
              <ArrowDownRight sx={{ fontSize: 16, color: "#a5aea7", flexShrink: 0 }} />
            </Box>
          ))}
        </Panel>
      </Box>
    </>
  );
}