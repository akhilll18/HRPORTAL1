// Employee profile (Keka header + PeopleHR sections). HR-master fields are read-only; self fields are editable.
import React, { useRef, useState } from "react";
import { Box, Button, Card, LinearProgress, List, ListItemButton, ListItemText, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { PhotoCameraRounded, SaveRounded } from "@mui/icons-material";
import { useStore } from "../store/AppStore.jsx";
import { useNavigate } from "react-router-dom";
import { ProfileBgvCard } from "../components/collab/BgvViews.jsx";
import { Avatar, PageHeader, SectionCard, StatusChip, Mono, TableWrap, Tag } from "../components/kit/UI.jsx";
import FieldInput, { fieldOptions } from "../components/kit/FieldInput.jsx";
import { EMPLOYEE_SECTIONS, COUNTRIES, sectionApplies, fieldApplies, isRequired, workerLabel, isContingent, WORKER_TYPE_BY, workerTypeOf } from "../data/employeeFields.js";
import { fmtDate, fmtDateTime, fmtNum, readFileAsDataUrl, maskAccount } from "../lib/utils.js";

function display(f, rec, ctx) {
  const v = rec[f.key];
  if (f.key === "annual_ctc") return `₹${fmtNum((rec.monthly_gross || 0) * 12)}`;
  if (f.key === "pay_rate") return `${fmtNum(v)}`;
  if (v === "" || v == null) return "—";
  if (f.type === "date") return fmtDate(v);
  if (f.key === "bank_account") return maskAccount(v);
  if (f.key === "monthly_gross" || f.key === "recruitment_cost") return `₹${fmtNum(v)}`;
  if (f.type === "select") return fieldOptions(f, rec, ctx).find(([k]) => String(k) === String(v))?.[1] || v;
  return String(v);
}

export default function ProfilePage() {
  const { user, data, nameOf, updateProfile, notifyToast, reportsOf } = useStore();
  const [section, setSection] = useState("core");
  const [draft, setDraft] = useState({});
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const ctx = { orgUnits: data.orgUnits, employees: data.employees, geofences: data.geofences || [], vendors: data.contractVendors || [] };
  const mySections = EMPLOYEE_SECTIONS.filter((s) => sectionApplies(s, user)).map((s) => ({ ...s, fields: s.fields.filter((f) => fieldApplies(f, user)) }));
  const sec = mySections.find((s) => s.id === section);
  const allFields = mySections.flatMap((s) => s.fields).filter((f) => f.type !== "calc");
  const filled = allFields.filter((f) => user[f.key] !== "" && user[f.key] != null).length;
  const pct = Math.round((filled / allFields.length) * 100);
  const logins = data.audit.filter((a) => a.user_code === user.employee_code && a.action.startsWith("LOGIN")).slice(0, 8);
  const editable = sec?.fields.filter((f) => f.editableBy.includes("self")) || [];

  function save() {
    const patch = {};
    editable.forEach((f) => {
      if (f.key in draft) patch[f.key] = typeof draft[f.key] === "string" ? draft[f.key].trim() : draft[f.key];
    });
    if (!Object.keys(patch).length) return notifyToast("No changes to save.", "info");
    const r = updateProfile(patch);
    if (!r.ok) {
      setErrors(r.errors);
      return notifyToast("Fix the highlighted fields.", "error");
    }
    setErrors({});
    setDraft({});
    notifyToast("Profile saved.");
  }

  return (
    <>
      <PageHeader eyebrow="ME · PROFILE" title="My profile" subtitle="Fields from the HR master are read-only; ask HR to correct them. You can update your contact, bank and personal details." />
      <Card sx={{ p: 2.5, mb: 2.5, background: "linear-gradient(120deg,#1e493a,#27614e 60%,#3b7a63)", color: "#fff", border: 0 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} sx={{ alignItems: { sm: "center" } }}>
          <Box sx={{ position: "relative", width: 76 }}>
            <Avatar name={user.full_name} size={76} src={user.profile_photo} />
            <Button size="small" variant="contained" color="secondary" aria-label="Change photo" onClick={() => fileRef.current?.click()} sx={{ position: "absolute", right: -6, bottom: -6, minWidth: 0, width: 30, height: 30, borderRadius: "50%", p: 0 }}><PhotoCameraRounded sx={{ fontSize: 16 }} /></Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 1048576) return notifyToast("Photos must be under 1 MB.", "error"); updateProfile({ profile_photo: await readFileAsDataUrl(f) }); notifyToast("Photo updated."); }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontFamily: "Manrope", fontWeight: 800, fontSize: "1.3rem" }}>{user.full_name}</Typography>
            <Typography sx={{ fontSize: "0.7rem", opacity: 0.85 }}>{user.designation} · {user.city} · {user.department}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center", flexWrap: "wrap" }} useFlexGap>
              <Box sx={{ px: 1, py: 0.2, borderRadius: 1, background: "rgba(255,255,255,0.15)", fontSize: "0.6rem", fontFamily: "monospace" }}>{user.employee_code}</Box>
              <Box sx={{ px: 1, py: 0.2, borderRadius: 1, background: isContingent(user) ? "rgba(255,214,140,0.3)" : "rgba(255,255,255,0.15)", fontSize: "0.6rem", fontWeight: 700 }}>{WORKER_TYPE_BY[workerTypeOf(user)]?.label}</Box>
              <Box sx={{ px: 1, py: 0.2, borderRadius: 1, background: "rgba(255,255,255,0.15)", fontSize: "0.6rem" }}>Reports to {user.reporting_manager ? nameOf(user.reporting_manager) : "—"}</Box>
              {reportsOf(user.employee_code).length > 0 && <Box sx={{ px: 1, py: 0.2, borderRadius: 1, background: "rgba(255,255,255,0.15)", fontSize: "0.6rem" }}>{reportsOf(user.employee_code).length} direct reports</Box>}
            </Stack>
          </Box>
          <Box sx={{ minWidth: 160 }}>
            <Typography sx={{ fontSize: "0.65rem", opacity: 0.85 }}>{pct}% profile complete</Typography>
            <LinearProgress variant="determinate" value={pct} color="secondary" sx={{ height: 6, borderRadius: 3, mt: 0.5, background: "rgba(255,255,255,0.2)" }} />
          </Box>
        </Stack>
      </Card>

      <Box sx={{ mb: 2.5 }}><ProfileBgvCard onOpen={() => navigate("/bgv-me")} /></Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "200px minmax(0,1fr)" }, gap: 2.5, alignItems: "start" }}>
        <Card sx={{ p: 0.5 }}>
          <List dense>
            {[...mySections.map((s) => [s.id, s.title]), ["activity", "Sign-in activity"]].map(([id, t]) => (
              <ListItemButton key={id} selected={section === id} onClick={() => { setSection(id); setDraft({}); setErrors({}); }} sx={{ borderRadius: 1 }}>
                <ListItemText primary={t} slotProps={{ primary: { sx: { fontSize: "0.72rem", fontWeight: section === id ? 700 : 500 } } }} />
              </ListItemButton>
            ))}
          </List>
        </Card>
        {sec ? (
          <SectionCard title={sec.title} subtitle={`Source: ${sec.source}`} action={editable.length > 0 && <Button size="small" variant="contained" startIcon={<SaveRounded />} onClick={save}>Save changes</Button>}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2, rowGap: 1.5 }}>
              {sec.fields.map((f) =>
                f.editableBy.includes("self") ? (
                  <Box key={f.key} sx={{ gridColumn: f.type === "textarea" ? "1 / -1" : undefined }}>
                    <FieldInput f={f} rec={{ ...user, ...draft }} ctx={ctx} value={f.key in draft ? draft[f.key] : user[f.key]} error={errors[f.key]} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                  </Box>
                ) : (
                  <Box key={f.key} sx={{ pb: 1, gridColumn: f.type === "textarea" ? "1 / -1" : undefined }}>
                    <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                      <Typography sx={{ fontSize: "0.6rem", color: "#78827b" }}>{f.label}{isRequired(f, user) && <Box component="span" sx={{ color: "#b66868" }}> *</Box>}</Typography>
                      <Tag tone="neutral" sx={{ height: 15, fontSize: "0.5rem" }}>{f.editableBy.length ? "HR edits" : "System"}</Tag>
                    </Stack>
                    <Typography sx={{ fontSize: "0.72rem", mt: 0.3, overflowWrap: "anywhere" }}>{f.key === "status" ? <StatusChip status={user.status} /> : f.key === "country_code" ? COUNTRIES.find((c) => c.code === user.country_code)?.name : display(f, user, ctx)}</Typography>
                  </Box>
                ),
              )}
            </Box>
          </SectionCard>
        ) : (
          <SectionCard title="Sign-in activity" subtitle={`Login ID ${user.login_id} · last sign-in ${fmtDateTime(user.last_login)}`} noPad>
            <TableWrap>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead><TableRow><TableCell>When</TableCell><TableCell>Event</TableCell><TableCell>IP</TableCell><TableCell>Device</TableCell></TableRow></TableHead>
                <TableBody>
                  {logins.map((l) => <TableRow key={l.log_id}><TableCell>{fmtDateTime(l.timestamp)}</TableCell><TableCell>{l.action === "LOGIN_SUCCESS" ? "Signed in" : l.action === "LOGIN_BLOCKED" ? "Blocked" : "Failed attempt"}</TableCell><TableCell><Mono>{l.ip}</Mono></TableCell><TableCell>{l.device}</TableCell></TableRow>)}
                  {logins.length === 0 && <TableRow><TableCell colSpan={4}>No sign-ins recorded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableWrap>
          </SectionCard>
        )}
      </Box>
    </>
  );
}
