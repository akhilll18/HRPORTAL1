// Background verification (BGV): HR case management, access control, employee self-service and status on employee screens.
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, FormControlLabel, IconButton, InputLabel, LinearProgress, MenuItem, Select, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { AddRounded, CloseRounded, UploadFileRounded, NotificationsActiveRounded, LockRounded, VerifiedUserRounded, AttachFileRounded, DownloadRounded } from "@mui/icons-material";
import { useStore } from "../../store/AppStore.jsx";
import { PageHeader, SectionCard, StatCard, Grid, Tag, TableWrap, Mono, PersonCell, EmptyState, KeyVal, ConfirmDialog } from "../kit/UI.jsx";
import { AiInsight } from "../ai/AiInsight.jsx";
import { AiButton, AiResult, useAiRun } from "./aiKit.jsx";
import { BGV_CHECKS, BGV_CHECK_LABEL, BGV_PACKAGES, BGV_STATUS, CHECK_STATUS, bgvStatus, bgvProgress, bgvFor, bgvAccessLevel, canManageBgv, directory } from "../../lib/collab.js";
import { fmtDate, fmtDateTime, isoDate, readFileAsDataUrl, downloadCsv, timeAgo } from "../../lib/utils.js";

export function BgvChip({ c, status, sx }) {
  const s = status || bgvStatus(c);
  const def = BGV_STATUS[s] || BGV_STATUS.not_started;
  return <Tag tone={def.tone} sx={sx}>{def.label}</Tag>;
}
const CheckChip = ({ s }) => <Tag tone={CHECK_STATUS[s]?.tone || "neutral"}>{CHECK_STATUS[s]?.label || s}</Tag>;

function overdue(c) {
  const s = bgvStatus(c);
  return !["clear", "cleared_with_remarks", "cancelled"].includes(s) && c.due_date < isoDate();
}
function subjectOf(data, c) {
  if (c.employee_code) {
    const e = data.employees.find((x) => x.employee_code === c.employee_code);
    return { name: c.name, sub: `${c.employee_code} · ${e?.designation || ""}`, dept: e?.department, country: e?.country_code };
  }
  const k = data.candidates.find((x) => x.id === c.candidate_id);
  const r = k && data.reqs.find((q) => q.id === k.req_id);
  return { name: c.name, sub: `Candidate · ${r?.role || ""}`, dept: r?.dept, country: "IN" };
}

// ── Admin / Super Admin: Background verification ───────
export function BgvAdminPage() {
  const { data, user } = useStore();
  const [tab, setTab] = useState("cases");
  const manage = canManageBgv(user);
  return (
    <>
      <PageHeader eyebrow={`HIRE & ONBOARD · BACKGROUND VERIFICATION${manage ? "" : " · READ ONLY"}`} title="Background verification" subtitle="Consent, checks, vendor turnaround and discrepancies for employees and candidates. Every view of a case is written to the audit log; access beyond status needs a grant." />
      <Box sx={{ mb: 2, borderBottom: "1px solid #e5eae4" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="cases" label="Cases" sx={{ fontSize: "0.7rem" }} />
          <Tab value="vendors" label="Vendors & packages" sx={{ fontSize: "0.7rem" }} />
          <Tab value="access" label="Access & permissions" sx={{ fontSize: "0.7rem" }} />
        </Tabs>
      </Box>
      {tab === "cases" && <BgvCases />}
      {tab === "vendors" && <BgvVendors />}
      {tab === "access" && <BgvAccessPanel />}
    </>
  );
}

function BgvCases() {
  const { data, user, nameOf } = useStore();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [start, setStart] = useState(false);
  const manage = canManageBgv(user);
  const visible = data.bgv.filter((c) => !c.cancelled && bgvAccessLevel(data, user, c));
  const rows = visible.filter((c) => (!status || bgvStatus(c) === status || (status === "overdue" && overdue(c))) && (!kind || c.subject_type === kind) && (!q || `${c.name} ${c.id} ${c.employee_code || ""}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s) => visible.filter((c) => bgvStatus(c) === s).length;
  const tat = visible.filter((c) => c.closed_at).map((c) => (new Date(c.closed_at) - new Date(c.initiated_at)) / 86400000);
  const facts = [
    `${visible.length} cases: ${count("clear") + count("cleared_with_remarks")} clear, ${count("in_progress")} in progress, ${count("insufficient")} waiting for documents, ${count("discrepancy")} with a discrepancy, ${count("consent_pending")} waiting for consent`,
    `${visible.filter(overdue).length} case(s) past their due date: ${visible.filter(overdue).map((c) => `${c.name} (due ${c.due_date})`).join(", ") || "none"}`,
    ...visible.filter((c) => bgvStatus(c) === "discrepancy").map((c) => `Discrepancy – ${c.name}: ${c.checks.filter((k) => k.status === "discrepancy").map((k) => `${BGV_CHECK_LABEL[k.type]}: ${k.remarks}`).join("; ")}`),
    ...visible.filter((c) => bgvStatus(c) === "insufficient").map((c) => `Insufficient – ${c.name}: ${c.checks.filter((k) => k.status === "insufficient").map((k) => BGV_CHECK_LABEL[k.type]).join(", ")}`),
    tat.length ? `Average turnaround of closed cases: ${Math.round(tat.reduce((a, b) => a + b, 0) / tat.length)} days` : "",
    `Active employees with status pending in the master: ${data.employees.filter((e) => e.status === "active" && e.background_check !== "clear").map((e) => e.full_name).join(", ") || "none"}`,
  ];
  return (
    <Stack spacing={2.5}>
      <Grid min={150}>
        <StatCard label="Open cases" value={visible.filter((c) => !c.closed_status).length} hint={`${count("consent_pending")} need consent`} onClick={() => setStatus("")} />
        <StatCard label="Insufficient docs" value={count("insufficient")} tone="warn" onClick={() => setStatus("insufficient")} />
        <StatCard label="Discrepancies" value={count("discrepancy")} tone="bad" onClick={() => setStatus("discrepancy")} />
        <StatCard label="Past due date" value={visible.filter(overdue).length} tone="bad" onClick={() => setStatus("overdue")} />
        <StatCard label="Clear" value={count("clear") + count("cleared_with_remarks")} tone="good" onClick={() => setStatus("clear")} />
      </Grid>
      <AiInsight title="AI verification brief" audience="the HR background-verification team" facts={facts} />
      <SectionCard
        title="Cases"
        subtitle="Click a case to see checks, documents and the timeline"
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<DownloadRounded />} onClick={() => downloadCsv("bgv-cases.csv", ["case", "name", "subject", "package", "vendor", "consent", "status", "progress", "initiated", "due"], rows.map((c) => [c.id, c.name, c.subject_type, BGV_PACKAGES[c.package]?.label, data.bgvVendors.find((v) => v.id === c.vendor_id)?.name, c.consent?.status, BGV_STATUS[bgvStatus(c)].label, `${bgvProgress(c)}%`, c.initiated_at.slice(0, 10), c.due_date]))}>Export</Button>
            {manage && <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={() => setStart(true)}>Start verification</Button>}
          </Stack>
        }
        noPad
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ p: 1.5 }}>
          <TextField size="small" placeholder="Search name, code or case" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 220 }} />
          <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel>Status</InputLabel><Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><MenuItem value="">All</MenuItem><MenuItem value="overdue">Past due date</MenuItem>{Object.entries(BGV_STATUS).filter(([k]) => k !== "cancelled").map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}</Select></FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Subject</InputLabel><Select label="Subject" value={kind} onChange={(e) => setKind(e.target.value)}><MenuItem value="">Employees & candidates</MenuItem><MenuItem value="employee">Employees</MenuItem><MenuItem value="candidate">Candidates</MenuItem></Select></FormControl>
        </Stack>
        <TableWrap>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead><TableRow><TableCell>Case</TableCell><TableCell>Person</TableCell><TableCell>Package · vendor</TableCell><TableCell>Consent</TableCell><TableCell sx={{ minWidth: 140 }}>Progress</TableCell><TableCell>Due</TableCell><TableCell>Status</TableCell><TableCell>Your access</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((c) => {
                const s = subjectOf(data, c);
                const lvl = bgvAccessLevel(data, user, c);
                return (
                  <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => setOpen(c.id)}>
                    <TableCell><Mono>{c.id}</Mono></TableCell>
                    <TableCell><PersonCell name={s.name} sub={s.sub} /></TableCell>
                    <TableCell><Typography sx={{ fontSize: "0.68rem", fontWeight: 600 }}>{BGV_PACKAGES[c.package]?.label}</Typography><Typography sx={{ fontSize: "0.58rem", color: "#78827b" }}>{data.bgvVendors.find((v) => v.id === c.vendor_id)?.name}</Typography></TableCell>
                    <TableCell>{c.consent?.status === "given" ? <Tag tone="good">Signed</Tag> : <Tag tone="warn">Pending</Tag>}</TableCell>
                    <TableCell><LinearProgress variant="determinate" value={bgvProgress(c)} sx={{ height: 6, borderRadius: 3 }} /><Typography sx={{ fontSize: "0.56rem", color: "#78827b" }}>{c.checks.filter((k) => k.status === "verified").length}/{c.checks.length} verified</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", color: overdue(c) ? "error.main" : undefined, fontWeight: overdue(c) ? 700 : 400 }}>{fmtDate(c.due_date)}</TableCell>
                    <TableCell><BgvChip c={c} /></TableCell>
                    <TableCell><Tag tone={lvl === "full" ? "info" : "neutral"}>{lvl}</Tag></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrap>
        {!rows.length && <EmptyState title="No cases match" text="Change the filters or start a new verification." />}
      </SectionCard>
      <BgvCaseDrawer id={open} onClose={() => setOpen(null)} />
      <StartBgvDialog open={start} onClose={() => setStart(false)} onStarted={(id) => { setStart(false); setOpen(id); }} />
    </Stack>
  );
}

export function StartBgvDialog({ open, onClose, onStarted, preset = {} }) {
  const { data, initiateBgv, notifyToast } = useStore();
  const [f, setF] = useState({ subject: "employee", employee_code: "", candidate_id: "", package: "standard", vendor_id: "VND-1", note: "" });
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setF({ subject: preset.candidate_id ? "candidate" : "employee", employee_code: preset.employee_code || "", candidate_id: preset.candidate_id || "", package: preset.package || "standard", vendor_id: "VND-1", note: "" });
      setError("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const vendor = data.bgvVendors.find((v) => v.id === f.vendor_id);
  const pkg = BGV_PACKAGES[f.package];
  const openFor = new Set(data.bgv.filter((c) => !c.cancelled && !c.closed_status).flatMap((c) => [c.employee_code, c.candidate_id]));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Start background verification</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1}>
            {["employee", "candidate"].map((k) => <Button key={k} size="small" variant={f.subject === k ? "contained" : "outlined"} onClick={() => setF({ ...f, subject: k })}>{k === "employee" ? "Employee" : "Candidate"}</Button>)}
          </Stack>
          {f.subject === "employee" ? (
            <FormControl size="small"><InputLabel>Employee *</InputLabel><Select label="Employee *" value={f.employee_code} onChange={(e) => setF({ ...f, employee_code: e.target.value })}>{data.employees.filter((e) => e.status !== "rejected").map((e) => <MenuItem key={e.employee_code} value={e.employee_code} disabled={openFor.has(e.employee_code)}>{e.full_name} · {e.employee_code}{openFor.has(e.employee_code) ? " (open case)" : ""}</MenuItem>)}</Select></FormControl>
          ) : (
            <FormControl size="small"><InputLabel>Candidate *</InputLabel><Select label="Candidate *" value={f.candidate_id} onChange={(e) => setF({ ...f, candidate_id: e.target.value })}>{data.candidates.filter((c) => ["interview", "offer", "hired"].includes(c.stage)).map((c) => <MenuItem key={c.id} value={c.id} disabled={openFor.has(c.id)}>{c.name} · {data.reqs.find((r) => r.id === c.req_id)?.role} · {c.stage}{openFor.has(c.id) ? " (open case)" : ""}</MenuItem>)}</Select></FormControl>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl size="small" fullWidth><InputLabel>Package</InputLabel><Select label="Package" value={f.package} onChange={(e) => setF({ ...f, package: e.target.value })}>{Object.entries(BGV_PACKAGES).map(([k, p]) => <MenuItem key={k} value={k}>{p.label} · {p.checks.length} checks · {p.tat} days</MenuItem>)}</Select></FormControl>
            <FormControl size="small" fullWidth><InputLabel>Vendor</InputLabel><Select label="Vendor" value={f.vendor_id} onChange={(e) => setF({ ...f, vendor_id: e.target.value })}>{data.bgvVendors.map((v) => <MenuItem key={v.id} value={v.id}>{v.name} · ₹{v.cost[f.package] ?? "—"}</MenuItem>)}</Select></FormControl>
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">Checks in this package</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.6, mt: 0.5 }}>{pkg.checks.map((k) => <Tag key={k} tone={vendor?.checks.includes(k) ? "info" : "bad"}>{BGV_CHECK_LABEL[k]}{vendor?.checks.includes(k) ? "" : " – not offered"}</Tag>)}</Stack>
          </Box>
          <TextField label="Note for the vendor (optional)" multiline minRows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <Alert severity="info" sx={{ fontSize: "0.65rem" }}>The person is asked to e-sign consent first (DPDP Act 2023 / FCRA / GDPR as applicable). Checks start only after consent.</Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => { const r = initiateBgv({ employee_code: f.subject === "employee" ? f.employee_code : null, candidate_id: f.subject === "candidate" ? f.candidate_id : null, package: f.package, vendor_id: f.vendor_id, note: f.note }); if (!r.ok) return setError(r.error); notifyToast("Verification started; consent request sent."); onStarted?.(r.id); }}>Start & request consent</Button>
      </DialogActions>
    </Dialog>
  );
}

export function BgvCaseDrawer({ id, onClose }) {
  const store = useStore();
  const { data, user, nameOf, logBgvView, updateBgvCheck, closeBgv, reopenBgv, cancelBgv, remindBgv, giveBgvConsent, notifyToast } = store;
  const c = id ? data.bgv.find((x) => x.id === id) : null;
  const lvl = c ? bgvAccessLevel(data, user, c) : null;
  const [edit, setEdit] = useState(null);
  const [close, setClose] = useState(null);
  const [cancelDlg, setCancelDlg] = useState(null);
  const ai = useAiRun();
  useEffect(() => {
    if (id) logBgvView(id);
    setEdit(null);
    ai.clear();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <Drawer anchor="right" open={false} onClose={onClose} />;
  const manage = lvl === "full" && canManageBgv(user);
  const s = subjectOf(data, c);
  const vendor = data.bgvVendors.find((v) => v.id === c.vendor_id);
  const status = bgvStatus(c);
  const caseFacts = () => [
    `Case ${c.id} for ${c.name} (${c.subject_type}); package ${BGV_PACKAGES[c.package].label}; vendor ${vendor?.name}; initiated ${c.initiated_at.slice(0, 10)}; due ${c.due_date}${overdue(c) ? " (OVERDUE)" : ""}`,
    `Consent: ${c.consent?.status}${c.consent?.at ? ` on ${c.consent.at.slice(0, 10)}` : ""}`,
    ...c.checks.map((k) => `${BGV_CHECK_LABEL[k.type]}: ${CHECK_STATUS[k.status].label}${k.remarks ? ` – ${k.remarks}` : ""}${k.docs?.length ? ` (${k.docs.length} document(s))` : ""}`),
    `Overall status: ${BGV_STATUS[status].label}`,
  ];
  const offlineSummary = () => {
    const disc = c.checks.filter((k) => k.status === "discrepancy");
    const ins = c.checks.filter((k) => k.status === "insufficient");
    const open = c.checks.filter((k) => ["pending", "in_progress"].includes(k.status));
    return [
      `**${c.name} – ${BGV_STATUS[status].label}.** ${c.checks.filter((k) => k.status === "verified").length} of ${c.checks.length} checks verified${overdue(c) ? `; the case is past its due date (${fmtDate(c.due_date)})` : `; due ${fmtDate(c.due_date)}`}.`,
      disc.length ? `- **Risk:** ${disc.map((k) => `${BGV_CHECK_LABEL[k.type]} – ${k.remarks}`).join("; ")}. Ask the person for an explanation and supporting proof before deciding; a gap or date mismatch alone is usually not disqualifying if it is explained.` : "- No discrepancies found so far.",
      ins.length ? `- **Waiting on the person:** ${ins.map((k) => `${BGV_CHECK_LABEL[k.type]} (${k.candidate_note})`).join("; ")}.` : "",
      open.length ? `- **With the vendor:** ${open.map((k) => BGV_CHECK_LABEL[k.type]).join(", ")}.` : "",
      c.consent?.status !== "given" ? "- Consent is not signed yet – no checks can run. Send a reminder." : "",
      `\n**Suggested next step:** ${disc.length ? "Review the discrepancy with the hiring manager and record a decision (Clear with remarks or Discrepancy)." : ins.length ? "Send a reminder for the missing documents." : open.length ? `Follow up with ${vendor?.name} on the open checks.` : "Close the case as Clear."}`,
    ].filter(Boolean).join("\n");
  };
  const offlineEmail = () => {
    const ins = c.checks.filter((k) => k.status === "insufficient");
    return `Subject: Documents needed for your background verification\n\nDear ${c.name.split(" ")[0]},\n\nThank you for completing your consent. To finish your background verification we need the following:\n\n${ins.length ? ins.map((k) => `- **${BGV_CHECK_LABEL[k.type]}:** ${k.candidate_note}`).join("\n") : "- (no documents are pending right now)"}\n\nYou can upload them under **My background check** in PeopleHub. Please share them by ${fmtDate(isoDate(Date.now() + 3 * 86400000))} so we can complete the check on time.\n\nIf you have any questions, reply to this message or post in #hr-help.\n\nRegards,\nHR – Background verification`;
  };
  return (
    <Drawer anchor="right" open={!!c} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 620 } } }}>
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="primary"><Mono>{c.id}</Mono> · {c.subject_type === "employee" ? "Employee" : "Candidate"}</Typography>
            <Typography variant="h2" sx={{ fontSize: "1.1rem" }}>{c.name}</Typography>
            <Typography variant="caption" color="text.secondary">{s.sub}{s.dept ? ` · ${s.dept}` : ""}</Typography>
          </Box>
          <BgvChip c={c} />
          <IconButton onClick={onClose} aria-label="Close"><CloseRounded /></IconButton>
        </Stack>
        <Alert icon={<LockRounded fontSize="small" />} severity="info" sx={{ mt: 1.5, fontSize: "0.62rem", py: 0 }}>Your access: <b>{lvl}</b>. This view was recorded in the audit log.</Alert>
        {lvl === "status" ? (
          <Box sx={{ mt: 2 }}>
            <KeyVal items={[["Overall status", BGV_STATUS[status].label], ["Due", fmtDate(c.due_date)], ["Progress", `${bgvProgress(c)}%`], ["Consent", c.consent?.status === "given" ? "Signed" : "Pending"]]} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Check-level details need summary or full access. Ask the Super Admin or the BGV team for a grant.</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mt: 2 }}>
              <KeyVal cols={3} items={[["Package", BGV_PACKAGES[c.package].label], ["Vendor", vendor?.name], ["Initiated", `${fmtDate(c.initiated_at)} by ${nameOf(c.initiated_by)}`], ["Due", <span key="d" style={{ color: overdue(c) ? "#b0291f" : undefined, fontWeight: overdue(c) ? 700 : 400 }}>{fmtDate(c.due_date)}{overdue(c) ? " · overdue" : ""}</span>], ["Consent", c.consent?.status === "given" ? `Signed ${fmtDate(c.consent.at)}${c.consent.method ? ` (${c.consent.method})` : ""}` : "Pending"], ["Progress", `${bgvProgress(c)}%`]]} />
              <LinearProgress variant="determinate" value={bgvProgress(c)} sx={{ mt: 1.5, height: 6, borderRadius: 3 }} />
            </Box>
            {lvl === "full" && (
              <Stack direction="row" sx={{ mt: 2, gap: 1, flexWrap: "wrap" }}>
                <AiButton busy={ai.busy} onClick={() => ai.run({ task: "bgv-summary", instruction: "Summarise this background verification case for HR: overall risk, what is pending and with whom, and one recommended next step. Be fair: explain that gaps can have legitimate reasons. Use short bullets.", input: caseFacts().join("\n"), offline: offlineSummary() })}>AI risk summary</AiButton>
                {c.employee_code && !c.closed_status && c.checks.some((k) => k.status === "insufficient") && <AiButton busy={ai.busy} onClick={() => ai.run({ task: "bgv-email", instruction: "Write a short, friendly email to the employee listing exactly which documents are still needed for background verification and where to upload them (My background check in PeopleHub). Include a subject line.", input: caseFacts().join("\n"), offline: offlineEmail() })}>Draft document request</AiButton>}
              </Stack>
            )}
            <AiResult ai={ai} title="AI · background verification" />
            <Typography variant="h3" sx={{ mt: 2.5, mb: 1 }}>Checks</Typography>
            <Stack spacing={1}>
              {c.checks.map((k) => (
                <Box key={k.type} sx={{ p: 1.3, border: "1px solid #e5eae5", borderRadius: 1.5 }}>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, flex: 1 }}>{BGV_CHECK_LABEL[k.type]}</Typography>
                    {k.verified_at && <Typography sx={{ fontSize: "0.56rem", color: "#78827b" }}>{fmtDate(k.verified_at)}</Typography>}
                    <CheckChip s={k.status} />
                    {manage && !c.closed_status && <Button size="small" onClick={() => setEdit({ type: k.type, status: k.status, remarks: k.remarks || "", candidate_note: k.candidate_note || "" })}>Update</Button>}
                  </Stack>
                  {lvl === "full" && k.remarks && <Typography sx={{ fontSize: "0.62rem", color: k.status === "discrepancy" ? "#a54e45" : "#5c675f", mt: 0.5 }}>{k.remarks}</Typography>}
                  {lvl === "full" && k.status === "insufficient" && k.candidate_note && <Typography sx={{ fontSize: "0.6rem", color: "#8A5200", mt: 0.3 }}>Asked the person: {k.candidate_note}</Typography>}
                  {lvl === "full" && (k.docs || []).map((doc, i) => <Button key={i} size="small" startIcon={<AttachFileRounded sx={{ fontSize: 14 }} />} href={doc.data_url || undefined} download={doc.name} disabled={!doc.data_url} sx={{ fontSize: "0.58rem", mt: 0.3 }}>{doc.name} · {timeAgo(doc.at)}</Button>)}
                  {edit?.type === k.type && (
                    <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                      <FormControl size="small"><InputLabel>Status</InputLabel><Select label="Status" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.entries(CHECK_STATUS).map(([v, d]) => <MenuItem key={v} value={v}>{d.label}</MenuItem>)}</Select></FormControl>
                      <TextField size="small" label={edit.status === "discrepancy" ? "What was declared vs verified *" : "Internal remarks"} multiline minRows={2} value={edit.remarks} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} />
                      {edit.status === "insufficient" && <TextField size="small" label="What should the person upload? *" value={edit.candidate_note} onChange={(e) => setEdit({ ...edit, candidate_note: e.target.value })} />}
                      <Stack direction="row" spacing={1}><Button size="small" variant="contained" onClick={() => { const r = updateBgvCheck(c.id, k.type, edit); if (!r.ok) return notifyToast(r.error, "error"); setEdit(null); notifyToast("Check updated."); }}>Save</Button><Button size="small" color="inherit" onClick={() => setEdit(null)}>Cancel</Button></Stack>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
            {manage && (
              <Stack direction="row" sx={{ mt: 2, gap: 1, flexWrap: "wrap" }}>
                {!c.closed_status && <Button variant="contained" startIcon={<VerifiedUserRounded />} onClick={() => setClose({ decision: c.checks.some((k) => k.status === "discrepancy") ? "cleared_with_remarks" : "clear", remarks: "" })}>Close case</Button>}
                {c.closed_status && <Button variant="outlined" onClick={() => { const r = reopenBgv(c.id); notifyToast(r.ok ? "Case reopened." : r.error, r.ok ? "success" : "error"); }}>Reopen</Button>}
                {!c.closed_status && c.employee_code && <Button variant="outlined" startIcon={<NotificationsActiveRounded />} onClick={() => { const r = remindBgv(c.id); notifyToast(r.ok ? "Reminder sent." : r.error, r.ok ? "success" : "error"); }}>Send reminder</Button>}
                {!c.closed_status && c.consent?.status !== "given" && <Button variant="outlined" onClick={() => { const r = giveBgvConsent(c.id); notifyToast(r.ok ? "Paper consent recorded." : r.error, r.ok ? "success" : "error"); }}>Record paper consent</Button>}
                {!c.closed_status && <Button color="error" onClick={() => setCancelDlg("")}>Cancel case</Button>}
              </Stack>
            )}
            {lvl === "full" && (
              <>
                <Typography variant="h3" sx={{ mt: 2.5, mb: 1 }}>Timeline</Typography>
                <Stack spacing={0.6}>
                  {[...c.history].reverse().map((h, i) => (
                    <Stack key={i} direction="row" spacing={1}>
                      <Typography sx={{ fontSize: "0.58rem", color: "#78827b", minWidth: 120 }}>{fmtDateTime(h.at)}</Typography>
                      <Typography sx={{ fontSize: "0.62rem" }}>{h.action} <span style={{ color: "#78827b" }}>· {h.by === "CANDIDATE" ? "candidate" : nameOf(h.by)}</span></Typography>
                    </Stack>
                  ))}
                </Stack>
                {c.remarks && <Alert severity="info" sx={{ mt: 1.5, fontSize: "0.62rem" }}>{c.remarks}</Alert>}
              </>
            )}
          </>
        )}
      </Box>
      <Dialog open={!!close} onClose={() => setClose(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Close verification</DialogTitle>
        <DialogContent>
          {close && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl size="small"><InputLabel>Decision</InputLabel><Select label="Decision" value={close.decision} onChange={(e) => setClose({ ...close, decision: e.target.value })}><MenuItem value="clear">Clear</MenuItem><MenuItem value="cleared_with_remarks">Clear with remarks (accepted)</MenuItem><MenuItem value="discrepancy">Discrepancy (not accepted)</MenuItem></Select></FormControl>
              <TextField label="Remarks" multiline minRows={3} value={close.remarks} onChange={(e) => setClose({ ...close, remarks: e.target.value })} helperText="Required unless Clear. Shown to HR and the Super Admin only." />
              <Alert severity="info" sx={{ fontSize: "0.62rem" }}>Closing updates the employee master (Background check = {close.decision === "discrepancy" ? "Flagged" : "Clear"}), ticks the onboarding KYC task and notifies the employee and manager.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setClose(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { const r = closeBgv(c.id, close.decision, close.remarks); if (!r.ok) return notifyToast(r.error, "error"); setClose(null); notifyToast("Case closed."); }}>Close case</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={cancelDlg != null} title="Cancel verification" text="The case is kept for the audit trail but no further checks run." confirmLabel="Cancel case" tone="error" disabled={!String(cancelDlg || "").trim()} onClose={() => setCancelDlg(null)} onConfirm={() => { const r = cancelBgv(c.id, cancelDlg); notifyToast(r.ok ? "Case cancelled." : r.error, r.ok ? "success" : "error"); if (r.ok) { setCancelDlg(null); onClose(); } }}>
        <TextField fullWidth label="Reason *" value={cancelDlg || ""} onChange={(e) => setCancelDlg(e.target.value)} />
      </ConfirmDialog>
    </Drawer>
  );
}

function BgvVendors() {
  const { data } = useStore();
  return (
    <Stack spacing={2.5}>
      <SectionCard title="Vendors" subtitle="Turnaround, SLA and cost per package (demo values – replace with your contracts)" noPad>
        <TableWrap>
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead><TableRow><TableCell>Vendor</TableCell><TableCell>Checks offered</TableCell><TableCell align="right">TAT</TableCell><TableCell align="right">SLA met</TableCell><TableCell align="right">Open cases</TableCell>{Object.values(BGV_PACKAGES).map((p) => <TableCell key={p.label} align="right">{p.label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {data.bgvVendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell><Typography sx={{ fontSize: "0.7rem", fontWeight: 700 }}>{v.name}</Typography><Typography sx={{ fontSize: "0.58rem", color: "#78827b" }}>{v.contact}</Typography></TableCell>
                  <TableCell><Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.4 }}>{v.checks.map((k) => <Tag key={k}>{BGV_CHECK_LABEL[k].split(" (")[0]}</Tag>)}</Stack></TableCell>
                  <TableCell align="right">{v.tat_days} d</TableCell>
                  <TableCell align="right">{v.sla_pct}%</TableCell>
                  <TableCell align="right">{data.bgv.filter((c) => c.vendor_id === v.id && !c.closed_status && !c.cancelled).length}</TableCell>
                  {Object.keys(BGV_PACKAGES).map((k) => <TableCell key={k} align="right">{v.cost[k] ? `₹${v.cost[k].toLocaleString("en-IN")}` : "—"}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
      <SectionCard title="Packages">
        <Grid min={220}>
          {Object.entries(BGV_PACKAGES).map(([k, p]) => (
            <Box key={k} sx={{ p: 1.5, border: "1px solid #e5eae5", borderRadius: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.78rem" }}>{p.label}</Typography>
              <Typography sx={{ fontSize: "0.6rem", color: "#78827b", mb: 0.8 }}>{p.tat} working days · {p.checks.length} checks</Typography>
              {p.checks.map((c) => <Typography key={c} sx={{ fontSize: "0.62rem" }}>• {BGV_CHECK_LABEL[c]}</Typography>)}
            </Box>
          ))}
        </Grid>
      </SectionCard>
    </Stack>
  );
}

const LEVEL_TEXT = { status: "Status only", summary: "Summary (check statuses, no remarks or documents)", full: "Full (remarks, documents, timeline)" };
function BgvAccessPanel() {
  const { data, user, nameOf, grantBgvAccess, revokeBgvAccess, notifyToast } = useStore();
  const [dlg, setDlg] = useState(null);
  const [error, setError] = useState("");
  const canGrant = user.role === "superadmin" || canManageBgv(user);
  const people = directory(data).filter((p) => p.kind !== "super");
  const log = data.audit.filter((a) => a.action.startsWith("BGV_VIEW") || a.action.startsWith("BGV_ACCESS")).slice(0, 40);
  return (
    <Stack spacing={2.5}>
      <SectionCard title="Who can see what" subtitle="Default rules – grants below add to these">
        <Table size="small">
          <TableHead><TableRow><TableCell>Who</TableCell><TableCell>Sees</TableCell></TableRow></TableHead>
          <TableBody>
            {[
              ["Super Admin", "Full access to every case; grants full access to others"],
              ["Admins with the Background verification module", "Full access; start, update and close cases; grant status / summary access"],
              ["Recruitment admins", "Status of candidate checks (to time offers)"],
              ["Onboarding admins", "Status of new joiners' checks"],
              ["Reporting managers", "Status of their direct reports (Team BGV status)"],
              ["Hiring managers", "Status of candidates for their requisitions"],
              ["Employees", "Their own case: consent, checks, what to upload (no internal remarks)"],
              ["Everyone else", "Nothing. BGV is hidden from the directory and profiles"],
            ].map(([a, b]) => <TableRow key={a}><TableCell sx={{ fontWeight: 600 }}>{a}</TableCell><TableCell>{b}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </SectionCard>
      <SectionCard title="Access grants" subtitle="Time-bound, with a recorded reason" action={canGrant && <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={() => { setDlg({ code: "", level: "summary", scope: "team", expires_on: isoDate(Date.now() + 90 * 86400000), reason: "" }); setError(""); }}>Grant access</Button>} noPad>
        <TableWrap>
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead><TableRow><TableCell>Person</TableCell><TableCell>Level</TableCell><TableCell>Scope</TableCell><TableCell>Reason</TableCell><TableCell>Granted</TableCell><TableCell>Expires</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {data.bgvAccess.map((g) => {
                const expired = g.expires_on && g.expires_on < isoDate();
                return (
                  <TableRow key={g.id} sx={{ opacity: g.revoked || expired ? 0.55 : 1 }}>
                    <TableCell><PersonCell name={nameOf(g.code)} sub={g.code} /></TableCell>
                    <TableCell><Tag tone={g.level === "full" ? "bad" : g.level === "summary" ? "info" : "neutral"}>{g.level}</Tag></TableCell>
                    <TableCell>{g.scope === "all" ? "All cases" : g.scope === "team" ? "Their team" : g.scope}</TableCell>
                    <TableCell sx={{ maxWidth: 260 }}><Typography sx={{ fontSize: "0.62rem" }}>{g.reason}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(g.granted_at)} · {nameOf(g.granted_by)}</TableCell>
                    <TableCell>{g.revoked ? <Tag>Revoked</Tag> : expired ? <Tag tone="warn">Expired</Tag> : g.expires_on ? fmtDate(g.expires_on) : "No expiry"}</TableCell>
                    <TableCell>{canGrant && !g.revoked && <Button size="small" color="error" onClick={() => { const r = revokeBgvAccess(g.id); notifyToast(r.ok ? "Access revoked." : r.error, r.ok ? "success" : "error"); }}>Revoke</Button>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
      <SectionCard title="Access log" subtitle="Every case view and permission change (latest 40)" noPad>
        <TableWrap>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead><TableRow><TableCell>When</TableCell><TableCell>Who</TableCell><TableCell>Action</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
            <TableBody>{log.map((a) => <TableRow key={a.log_id}><TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(a.timestamp)}</TableCell><TableCell>{nameOf(a.user_code)}</TableCell><TableCell><Mono>{a.action}</Mono></TableCell><TableCell sx={{ fontSize: "0.62rem" }}>{a.details}</TableCell></TableRow>)}</TableBody>
          </Table>
        </TableWrap>
        {!log.length && <EmptyState title="No access yet" text="Opening a case writes an entry here." />}
      </SectionCard>
      <Dialog open={!!dlg} onClose={() => setDlg(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Grant BGV access</DialogTitle>
        <DialogContent>
          {dlg && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <FormControl size="small"><InputLabel>Person *</InputLabel><Select label="Person *" value={dlg.code} onChange={(e) => setDlg({ ...dlg, code: e.target.value })}>{people.map((p) => <MenuItem key={p.code} value={p.code}>{p.name} · {p.title}</MenuItem>)}</Select></FormControl>
              <FormControl size="small"><InputLabel>Level</InputLabel><Select label="Level" value={dlg.level} onChange={(e) => setDlg({ ...dlg, level: e.target.value })}>{Object.entries(LEVEL_TEXT).map(([k, v]) => <MenuItem key={k} value={k} disabled={k === "full" && user.role !== "superadmin"}>{v}{k === "full" && user.role !== "superadmin" ? " – Super Admin only" : ""}</MenuItem>)}</Select></FormControl>
              <FormControl size="small"><InputLabel>Scope</InputLabel><Select label="Scope" value={dlg.scope} onChange={(e) => setDlg({ ...dlg, scope: e.target.value })}><MenuItem value="team">Their direct reports</MenuItem><MenuItem value="all">All cases</MenuItem>{data.bgv.filter((c) => !c.cancelled).map((c) => <MenuItem key={c.id} value={c.id}>One case · {c.id} · {c.name}</MenuItem>)}</Select></FormControl>
              <TextField size="small" type="date" label="Expires on" value={dlg.expires_on} onChange={(e) => setDlg({ ...dlg, expires_on: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Reason *" multiline minRows={2} value={dlg.reason} onChange={(e) => setDlg({ ...dlg, reason: e.target.value })} helperText="Recorded in the access register and the audit log." />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDlg(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { const r = grantBgvAccess(dlg); if (!r.ok) return setError(r.error); setDlg(null); notifyToast("Access granted."); }}>Grant</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// ── Employee: My background check ─────────────────────
export function MyBgvPage() {
  const { data, user, giveBgvConsent, uploadBgvDoc, notifyToast } = useStore();
  const c = bgvFor(data, user.employee_code);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  if (!c) return (<><PageHeader eyebrow="ME · BACKGROUND CHECK" title="My background check" /><EmptyState title="No background check" text="HR has not started a background verification for you." /></>);
  const status = bgvStatus(c);
  const upload = async (type, file) => {
    if (!file) return;
    const r = uploadBgvDoc(c.id, type, { name: file.name, size: file.size, type: file.type, data_url: await readFileAsDataUrl(file) });
    notifyToast(r.ok ? `${file.name} uploaded. HR has been notified.` : r.error, r.ok ? "success" : "error");
  };
  return (
    <>
      <PageHeader eyebrow="ME · BACKGROUND CHECK" title="My background check" subtitle="See the status of each check, give consent and upload anything HR asks for. Internal remarks from the verification vendor are not shown here." />
      <Stack spacing={2.5}>
        <Grid min={160}>
          <StatCard label="Status" value={<BgvChip c={c} sx={{ height: 26, fontSize: "0.8rem" }} />} hint={`Case ${c.id}`} />
          <StatCard label="Progress" value={`${bgvProgress(c)}%`} hint={`${c.checks.filter((k) => k.status === "verified").length} of ${c.checks.length} checks verified`} tone="info" />
          <StatCard label="Expected by" value={fmtDate(c.due_date)} tone="neutral" hint={`${BGV_PACKAGES[c.package].label} package`} />
          <StatCard label="Action needed" value={c.consent?.status !== "given" ? "Consent" : c.checks.filter((k) => k.status === "insufficient").length || "None"} tone={c.consent?.status !== "given" || c.checks.some((k) => k.status === "insufficient") ? "warn" : "good"} />
        </Grid>
        {c.consent?.status !== "given" && (
          <SectionCard title="Consent for background verification" subtitle="Required before any check can start">
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              I authorise {data.settings?.company_name || "the company"} and its verification partner ({data.bgvVendors.find((v) => v.id === c.vendor_id)?.name}) to verify the information I have provided — {c.checks.map((k) => BGV_CHECK_LABEL[k.type].toLowerCase()).join(", ")} — by contacting the relevant institutions, employers, authorities and references. My data will be used only for this purpose, kept for the retention period in the company's privacy notice, and I can ask for a copy of the report.
            </Typography>
            <FormControlLabel control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />} label={<Typography variant="body2">I have read and agree to the above.</Typography>} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1, alignItems: { sm: "center" } }}>
              <TextField size="small" label={`Type your full name (${c.name}) to e-sign`} value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 300 }} />
              <Button variant="contained" disabled={!agree || !name} onClick={() => { const r = giveBgvConsent(c.id, name); notifyToast(r.ok ? "Consent signed. Your checks have started." : r.error, r.ok ? "success" : "error"); }}>E-sign consent</Button>
            </Stack>
          </SectionCard>
        )}
        <SectionCard title="Checks" noPad>
          <Table size="small">
            <TableHead><TableRow><TableCell>Check</TableCell><TableCell>Status</TableCell><TableCell>What you need to do</TableCell><TableCell>Your documents</TableCell></TableRow></TableHead>
            <TableBody>
              {c.checks.map((k) => (
                <TableRow key={k.type}>
                  <TableCell sx={{ fontWeight: 600 }}>{BGV_CHECK_LABEL[k.type]}</TableCell>
                  <TableCell><CheckChip s={k.status} /></TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    {k.status === "insufficient" ? <Typography sx={{ fontSize: "0.65rem", color: "#8A5200" }}>{k.candidate_note}</Typography> : k.status === "discrepancy" ? <Typography sx={{ fontSize: "0.65rem" }}>HR will contact you about this check.</Typography> : <Typography sx={{ fontSize: "0.65rem", color: "#78827b" }}>{k.status === "verified" ? "Nothing – verified." : "Nothing right now."}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.3}>
                      {(k.docs || []).filter((dd) => dd.by === user.code).map((dd, i) => <Typography key={i} sx={{ fontSize: "0.58rem" }}>📎 {dd.name}</Typography>)}
                      {["insufficient", "pending", "in_progress"].includes(k.status) && c.consent?.status === "given" && (
                        <Button size="small" component="label" startIcon={<UploadFileRounded />} variant={k.status === "insufficient" ? "contained" : "text"} sx={{ alignSelf: "flex-start" }}>
                          Upload
                          <input hidden type="file" accept="application/pdf,image/*" onChange={(e) => upload(k.type, e.target.files?.[0])} />
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
        <Alert severity="info" sx={{ fontSize: "0.65rem" }}>Questions? Post in #hr-help in Chat or raise an HR support ticket. You can ask HR for a copy of your verification report once it is complete.</Alert>
      </Stack>
    </>
  );
}

// ── Manager: Team BGV status ──────────────────────────
export function TeamBgvPage() {
  const { data, user, reportsOf } = useStore();
  const [open, setOpen] = useState(null);
  const team = reportsOf(user.employee_code).filter((e) => e.status !== "rejected");
  const myReqs = data.reqs.filter((r) => r.hiring_manager === user.employee_code).map((r) => r.id);
  const cands = data.bgv.filter((c) => c.candidate_id && !c.cancelled && myReqs.includes(data.candidates.find((k) => k.id === c.candidate_id)?.req_id));
  return (
    <>
      <PageHeader eyebrow="MY TEAM · BACKGROUND VERIFICATION" title="Team BGV status" subtitle="Background verification status for your direct reports and candidates for your open roles. Details beyond status need a grant from HR." />
      <SectionCard title="Direct reports" noPad>
        <TableWrap>
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Joined</TableCell><TableCell>Status</TableCell><TableCell>Progress</TableCell><TableCell>Your access</TableCell></TableRow></TableHead>
            <TableBody>
              {team.map((e) => {
                const c = bgvFor(data, e.employee_code);
                const lvl = c && bgvAccessLevel(data, user, c);
                return (
                  <TableRow key={e.employee_code} hover sx={{ cursor: c ? "pointer" : "default" }} onClick={() => c && setOpen(c.id)}>
                    <TableCell><PersonCell name={e.full_name} sub={`${e.employee_code} · ${e.designation}`} /></TableCell>
                    <TableCell>{fmtDate(e.date_of_joining)}</TableCell>
                    <TableCell>{c ? <BgvChip c={c} /> : <Tag>Not started</Tag>}</TableCell>
                    <TableCell>{c && lvl !== "status" ? `${bgvProgress(c)}%` : c ? "—" : ""}</TableCell>
                    <TableCell>{lvl ? <Tag tone={lvl === "summary" ? "info" : "neutral"}>{lvl}</Tag> : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
      {cands.length > 0 && (
        <SectionCard title="Candidates for your roles" sx={{ mt: 2.5 }} noPad>
          <Table size="small">
            <TableBody>{cands.map((c) => <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => setOpen(c.id)}><TableCell><PersonCell name={c.name} sub={subjectOf(data, c).sub} /></TableCell><TableCell><BgvChip c={c} /></TableCell><TableCell>Due {fmtDate(c.due_date)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </SectionCard>
      )}
      <BgvCaseDrawer id={open} onClose={() => setOpen(null)} />
    </>
  );
}

// ── Small pieces used on employee screens ─────────────
/** BGV status for a person, respecting access (returns null when the viewer may not see it). */
export function useBgvLookup() {
  const { data, user } = useStore();
  return useMemo(() => {
    const map = {};
    for (const c of data.bgv || []) {
      if (!c.employee_code || c.cancelled) continue;
      const cur = map[c.employee_code];
      if (!cur || c.initiated_at > cur.initiated_at) map[c.employee_code] = c;
    }
    return (code) => {
      const c = map[code];
      if (!c) return null;
      return bgvAccessLevel(data, user, c) ? c : null;
    };
  }, [data, user]);
}

export function ProfileBgvCard({ onOpen }) {
  const { data, user } = useStore();
  const c = bgvFor(data, user.employee_code);
  if (!c) return null;
  const st = bgvStatus(c);
  const needs = c.consent?.status !== "given" || c.checks.some((k) => k.status === "insufficient");
  return (
    <SectionCard title="Background verification" subtitle={`Case ${c.id} · ${BGV_PACKAGES[c.package].label}`} action={<Button size="small" variant={needs ? "contained" : "outlined"} onClick={onOpen}>{needs ? "Action needed" : "View"}</Button>}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
        <BgvChip c={c} />
        <Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={bgvProgress(c)} sx={{ height: 6, borderRadius: 3 }} /></Box>
        <Typography variant="caption">{bgvProgress(c)}%</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{["clear", "cleared_with_remarks"].includes(st) ? `Completed ${fmtDate(c.closed_at)}.` : `Expected by ${fmtDate(c.due_date)}.`}</Typography>
    </SectionCard>
  );
}
