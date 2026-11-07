// "My contract" for contingent workers (contract, freelance, consultant, agency, intern, temporary, apprentice):
// contract summary with e-signature, weekly timesheet entry, milestones, payments (payslips or invoices / payment advices),
// renewal requests. Plus "Contractor timesheets" for the people who approve them.
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, LinearProgress, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import { ChevronLeftRounded, ChevronRightRounded, DescriptionRounded, DrawRounded, SaveRounded, SendRounded, AutorenewRounded, ReceiptLongRounded } from "@mui/icons-material";
import { useStore } from "../../store/AppStore.jsx";
import { PageHeader, SectionCard, StatCard, Grid, Tag, TableWrap, EmptyState, KeyVal, Mono, PersonCell } from "../kit/UI.jsx";
import { DocDialog, StateTag, TimesheetApprovals } from "./ContractViews.jsx";
import {
  DEFAULT_CONTRACT_SETTINGS, TS_STATUS, MS_STATUS, INVOICE_STATUS, contractFor, contractState, daysLeft, rateText, money, weekStart, weekDays, addDays, timesheetTotals, timesheetValue,
  validateTimesheet, approverOf, daysBetween, contractHoursLogged, contractSpend, AMENDMENT_TYPES,
} from "../../lib/contracts.js";
import { contractDocumentHtml, invoiceHtml } from "../../lib/contractDocs.js";
import { adviceDesign } from "../../data/payslipDesign.js";
import { WORKER_TYPE_BY, workerTypeOf, isContingent } from "../../data/employeeFields.js";
import { periodLabel } from "../../data/payslipFields.js";
import { fmtDate, fmtDateTime, isoDate } from "../../lib/utils.js";

const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

/** Sidebar badge for the worker: unsigned contract, or last week's timesheet not submitted, or a sheet sent back. */
export function myContractBadge(data, code) {
  const c = contractFor(data, code);
  if (!c) return 0;
  let n = 0;
  if (["active", "pending_approval"].includes(c.status) && !c.signed?.worker) n += 1;
  n += (data.timesheets || []).filter((t) => t.employee_code === code && t.status === "rejected").length;
  return n;
}
export function approverBadge(data, code) {
  const sheets = (data.timesheets || []).filter((t) => t.status === "submitted" && t.approver === code).length;
  const ms = (data.contracts || []).filter((c) => approverOf(c, data.employees.find((e) => e.employee_code === c.employee_code)) === code).flatMap((c) => (c.milestones || []).filter((m) => m.status === "submitted")).length;
  return sheets + ms;
}

export default function MyContractPage() {
  const { data, user } = useStore();
  const me = data.employees.find((e) => e.employee_code === user.employee_code);
  const c = contractFor(data, user.employee_code);
  const [sp, setSp] = useSearchParams();
  const hasTs = c && ["hourly", "daily", "monthly"].includes(c.pay_basis);
  const tabs = [["overview", "My contract"], ...(hasTs ? [["timesheets", "Timesheets"]] : []), ...(c?.milestones?.length || c?.pay_basis === "milestone" ? [["milestones", "Milestones"]] : []), ["payments", "Payments"]];
  const tab = tabs.some((t) => t[0] === sp.get("tab")) ? sp.get("tab") : "overview";
  const wt = WORKER_TYPE_BY[workerTypeOf(me)];
  return (
    <>
      <PageHeader eyebrow={`ME · ${wt?.label?.toUpperCase() || "CONTRACT"}`} title="My contract" subtitle="Your contract terms and e-signature, weekly timesheets, milestones and payments. Approved time is paid in the month-end contractor run." />
      {!c ? (
        <SectionCard><EmptyState title="No contract yet" text="HR is preparing your contract. You will be notified to review and e-sign it." /></SectionCard>
      ) : (
        <>
          <Box sx={{ mb: 2.5, borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={(_, v) => setSp({ tab: v }, { replace: true })} variant="scrollable" allowScrollButtonsMobile sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, fontSize: "0.7rem" } }}>
              {tabs.map(([k, l]) => <Tab key={k} value={k} label={l} />)}
            </Tabs>
          </Box>
          {tab === "overview" && <Overview c={c} me={me} onTab={(t) => setSp({ tab: t })} />}
          {tab === "timesheets" && <Timesheets c={c} />}
          {tab === "milestones" && <Milestones c={c} />}
          {tab === "payments" && <Payments c={c} me={me} />}
        </>
      )}
    </>
  );
}

function Overview({ c, me, onTab }) {
  const { data, nameOf, signContract, requestRenewal, notifyToast } = useStore();
  const s = data.contractSettings || DEFAULT_CONTRACT_SETTINGS;
  const [doc, setDoc] = useState(false);
  const [sign, setSign] = useState(false);
  const [typed, setTyped] = useState("");
  const [nda, setNda] = useState(false);
  const [ren, setRen] = useState(false);
  const [msg, setMsg] = useState("");
  const st = contractState(c, s);
  const total = c.end_date ? Math.max(1, daysBetween(c.start_date, c.end_date)) : null;
  const done = c.end_date ? Math.min(total, Math.max(0, daysBetween(c.start_date, isoDate()))) : 0;
  const left = daysLeft(c);
  const html = useMemo(() => (doc ? contractDocumentHtml(data, c, data.settings.payslip_company, adviceDesign(data)) : ""), [doc, data, c]);
  const needsNda = ["freelance", "consultant", "agency"].includes(c.worker_type) && c.nda_signed !== "yes";
  const thisWeek = (data.timesheets || []).find((t) => t.contract_id === c.id && t.week_start === addDays(weekStart(), -7));
  return (
    <Stack spacing={2.5}>
      {["active", "pending_approval"].includes(c.status) && !c.signed?.worker && (
        <Alert severity="warning" action={<Button color="inherit" size="small" variant="outlined" startIcon={<DrawRounded />} onClick={() => setSign(true)}>Review & e-sign</Button>}>Please review and e-sign your contract{needsNda ? " and NDA / IP assignment" : ""}.</Alert>
      )}
      {c.status === "suspended" && <Alert severity="info">Your contract is on hold. Do not log time until HR resumes it.</Alert>}
      {["hourly", "daily"].includes(c.pay_basis) && ["active", "expiring"].includes(st) && !thisWeek && c.start_date <= addDays(weekStart(), -7) && <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => onTab("timesheets")}>Fill in</Button>}>Last week's timesheet (week of {fmtDate(addDays(weekStart(), -7))}) has not been submitted.</Alert>}
      <Grid min={170}>
        <StatCard label="Rate" value={rateText(c)} tone="accent" />
        <StatCard label="Days left" value={left == null ? "Open" : Math.max(0, left)} hint={c.end_date ? `Ends ${fmtDate(c.end_date)}` : ""} tone={left != null && left <= 30 ? "warn" : "good"} />
        <StatCard label="Hours approved" value={contractHoursLogged(data, c)} tone="info" />
        <StatCard label="Paid to date" value={money(contractSpend(data, c), c.currency)} tone="neutral" />
      </Grid>
      <SectionCard title={c.title} subtitle={`${c.id} · ${WORKER_TYPE_BY[c.worker_type]?.label}`} action={<Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><StateTag c={c} settings={s} /><Button size="small" variant="outlined" startIcon={<DescriptionRounded />} onClick={() => setDoc(true)}>View contract</Button></Stack>}>
        {total && <Box sx={{ mb: 2 }}><Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography variant="caption">{fmtDate(c.start_date)}</Typography><Typography variant="caption">{Math.round((done / total) * 100)}% of the term</Typography><Typography variant="caption">{fmtDate(c.end_date)}</Typography></Stack><LinearProgress variant="determinate" value={(done / total) * 100} sx={{ height: 8, borderRadius: 4, mt: 0.5 }} /></Box>}
        <KeyVal cols={3} items={[
          ["Approver", nameOf(approverOf(c, me)) || "—"], ["Standard hours", c.pay_basis === "milestone" ? "Milestones" : `${c.std_hours_week} h / week`], ["Overtime", `${c.ot_multiplier}× hourly rate, approved in advance`],
          ["How you are paid", c.payment_route === "payroll" ? "Monthly payslip through payroll" : c.payment_route === "vendor" ? `By your agency (${(data.contractVendors || []).find((v) => v.id === c.vendor_id)?.name || "vendor"})` : `Self-billed invoice, paid within ${s.payment_terms_days} days`],
          ["Tax", c.payment_route === "payroll" ? "TDS through payroll (section 192)" : c.payment_route === "vendor" ? "Handled by your agency" : `TDS ${c.tds_section}${c.gst_registered === "yes" ? " · GST added to fees" : ""}`],
          ["Notice", `${c.notice_days} days`], ["PO / SOW", c.po_number || "—"], ["NDA / IP", c.nda_signed === "yes" ? "Signed" : "Pending"], ["E-signed", c.signed?.worker ? fmtDateTime(c.signed.worker.at) : "Not yet"],
          c.deliverables && ["Scope & deliverables", c.deliverables, { full: true, pre: true }],
        ]} />
        {(c.amendments || []).length > 0 && <Box sx={{ mt: 2 }}><Typography variant="h3" sx={{ mb: 1 }}>Changes to your contract</Typography>{c.amendments.map((a) => <Typography key={a.id} sx={{ fontSize: "0.65rem", mb: 0.4 }}>• {fmtDate(a.effective)} — {AMENDMENT_TYPES.find(([k]) => k === a.type)?.[1]}: {a.from} → {a.to} ({a.note})</Typography>)}</Box>}
        {left != null && left <= (s.renewal_alert_days || 30) + 15 && ["active", "expiring"].includes(st) && (
          <Box sx={{ mt: 2 }}>{c.renewal_request ? <Alert severity="info" sx={{ fontSize: "0.66rem" }}>You asked HR about renewal on {fmtDate(c.renewal_request.at)}.</Alert> : <Button size="small" variant="outlined" startIcon={<AutorenewRounded />} onClick={() => setRen(true)}>Ask HR about renewal</Button>}</Box>
        )}
      </SectionCard>
      <DocDialog open={doc} title={`Contract ${c.id}`} html={html} filename={`Contract_${c.id}.html`} onClose={() => setDoc(false)} />
      <Dialog open={sign} onClose={() => setSign(false)} maxWidth="sm" fullWidth>
        <DialogTitle>E-sign contract {c.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.6} sx={{ pt: 1 }}>
            <Typography variant="body2">Open <b>View contract</b> to read the full terms. By typing your full name you sign this contract electronically; the time and your sign-in are recorded.</Typography>
            <Button size="small" variant="outlined" startIcon={<DescriptionRounded />} onClick={() => setDoc(true)} sx={{ alignSelf: "flex-start" }}>View contract</Button>
            {needsNda && <FormControlLabel control={<Checkbox checked={nda} onChange={(e) => setNda(e.target.checked)} />} label={<Typography variant="body2">I accept the confidentiality (NDA) and IP-assignment terms in clause 5.</Typography>} />}
            <TextField label={`Type your full name (${me.full_name})`} value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSign(false)}>Cancel</Button><Button variant="contained" startIcon={<DrawRounded />} onClick={() => { const r = signContract(c.id, { typedName: typed, acceptNda: nda }); notifyToast(r.ok ? "Signed. HR has been notified." : r.error, r.ok ? "success" : "error"); if (r.ok) setSign(false); }}>Sign</Button></DialogActions>
      </Dialog>
      <Dialog open={ren} onClose={() => setRen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ask about renewal</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={3} label="Message for HR and your approver" value={msg} onChange={(e) => setMsg(e.target.value)} sx={{ mt: 1 }} placeholder="I'd like to continue on the payments project for another 6 months…" /></DialogContent>
        <DialogActions><Button onClick={() => setRen(false)}>Cancel</Button><Button variant="contained" onClick={() => { const r = requestRenewal(c.id, msg); notifyToast(r.ok ? "Sent to HR." : r.error, r.ok ? "success" : "error"); if (r.ok) setRen(false); }}>Send</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

function Timesheets({ c }) {
  const { data, saveTimesheet, notifyToast } = useStore();
  const s = data.contractSettings || DEFAULT_CONTRACT_SETTINGS;
  const [ws, setWs] = useState(() => { const cur = weekStart(); return cur < c.start_date ? weekStart(c.start_date) : cur; });
  const existing = (data.timesheets || []).find((t) => t.contract_id === c.id && t.week_start === ws);
  const blank = () => weekDays(ws).map((d) => ({ date: d, hours: "", ot_hours: "", task: "" }));
  const [entries, setEntries] = useState(() => (existing ? weekDays(ws).map((d) => existing.entries.find((e) => e.date === d) || { date: d, hours: "", ot_hours: "", task: "" }) : blank()));
  const [key, setKey] = useState(ws);
  if (key !== ws) {
    setKey(ws);
    setEntries(existing ? weekDays(ws).map((d) => existing.entries.find((e) => e.date === d) || { date: d, hours: "", ot_hours: "", task: "" }) : blank());
  }
  const editable = !existing || ["draft", "rejected"].includes(existing.status);
  const ts = { contract_id: c.id, week_start: ws, entries };
  const tot = timesheetTotals(ts);
  const val = timesheetValue(c, ts);
  const errors = validateTimesheet(c, ts, s);
  const set = (i, k, v) => setEntries((list) => list.map((e, j) => (j === i ? { ...e, [k]: k === "task" ? v : v.replace(/[^\d.]/g, "") } : e)));
  const history = (data.timesheets || []).filter((t) => t.contract_id === c.id).sort((a, b) => b.week_start.localeCompare(a.week_start));
  const save = (submit) => {
    const r = saveTimesheet({ id: existing?.id, contract_id: c.id, week_start: ws, entries }, { submit });
    notifyToast(r.ok ? (submit ? "Submitted for approval." : "Draft saved.") : r.error, r.ok ? "success" : "error");
  };
  return (
    <Stack spacing={2.5}>
      <SectionCard title={`Week of ${fmtDate(ws)}`} subtitle={c.pay_basis === "monthly" ? "Your monthly fee is paid automatically. Log overtime here so it can be approved and paid." : c.pay_basis === "daily" ? "A day counts as full at 4 hours or more, half below that." : `Rate ${rateText(c)}. Overtime ${c.ot_multiplier}×.`}
        action={<Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}><IconButton size="small" onClick={() => setWs(addDays(ws, -7))} aria-label="Previous week"><ChevronLeftRounded /></IconButton><IconButton size="small" disabled={ws >= weekStart()} onClick={() => setWs(addDays(ws, 7))} aria-label="Next week"><ChevronRightRounded /></IconButton>{existing && <Tag tone={TS_STATUS[existing.status]?.tone}>{TS_STATUS[existing.status]?.label}</Tag>}</Stack>} noPad>
        {existing?.status === "rejected" && existing.note && <Alert severity="error" sx={{ m: 1.5, fontSize: "0.66rem" }}>Sent back: {existing.note}</Alert>}
        <TableWrap>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead><TableRow><TableCell>Day</TableCell><TableCell sx={{ width: 110 }}>Hours</TableCell><TableCell sx={{ width: 110 }}>Overtime</TableCell><TableCell>What you worked on</TableCell></TableRow></TableHead>
            <TableBody>
              {entries.map((e, i) => {
                const out = e.date < c.start_date || (c.end_date && e.date > c.end_date) || e.date > isoDate();
                return (
                  <TableRow key={e.date} sx={{ background: out ? "#f6f7f5" : undefined }}>
                    <TableCell sx={{ whiteSpace: "nowrap", color: out ? "#a3aba5" : undefined }}>{dayLabel(e.date)}</TableCell>
                    <TableCell><TextField size="small" value={e.hours} disabled={!editable || out} onChange={(ev) => set(i, "hours", ev.target.value)} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `Hours ${e.date}` } }} /></TableCell>
                    <TableCell><TextField size="small" value={e.ot_hours} disabled={!editable || out} onChange={(ev) => set(i, "ot_hours", ev.target.value)} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `Overtime ${e.date}` } }} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={e.task} disabled={!editable || out} onChange={(ev) => set(i, "task", ev.target.value)} placeholder={out ? "" : "Task / ticket"} /></TableCell>
                  </TableRow>
                );
              })}
              <TableRow><TableCell sx={{ fontWeight: 800 }}>Total</TableCell><TableCell sx={{ fontWeight: 800 }}>{tot.hours} h</TableCell><TableCell sx={{ fontWeight: 800 }}>{tot.ot} h</TableCell><TableCell sx={{ fontWeight: 800 }}>Estimated {money(c.pay_basis === "monthly" ? val.ot : val.total, c.currency)}{c.payment_route === "invoice" ? " before GST / TDS" : c.payment_route === "payroll" ? " before tax" : ""}</TableCell></TableRow>
            </TableBody>
          </Table>
        </TableWrap>
        {editable && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ p: 1.5, alignItems: { sm: "center" } }}>
            <Typography variant="caption" color={errors.length ? "warning.main" : "text.secondary"} sx={{ flex: 1 }}>{errors.length && tot.total > 0 ? errors[0] : `Submit by ${s.timesheet_due_day === "monday" ? "Monday" : "the end of the week"}. Your approver is notified.`}</Typography>
            <Button variant="outlined" startIcon={<SaveRounded />} onClick={() => save(false)}>Save draft</Button>
            <Button variant="contained" startIcon={<SendRounded />} onClick={() => save(true)}>Submit</Button>
          </Stack>
        )}
      </SectionCard>
      <SectionCard title="My timesheets" noPad>
        <TableWrap>
          <Table size="small">
            <TableHead><TableRow><TableCell>Week of</TableCell><TableCell align="right">Hours</TableCell><TableCell align="right">Overtime</TableCell><TableCell align="right">Value</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {history.map((t) => { const tt = timesheetTotals(t); const v = timesheetValue(c, t); return <TableRow key={t.id} hover sx={{ cursor: "pointer" }} onClick={() => setWs(t.week_start)}><TableCell>{fmtDate(t.week_start)}</TableCell><TableCell align="right">{tt.hours}</TableCell><TableCell align="right">{tt.ot || "—"}</TableCell><TableCell align="right">{money(c.pay_basis === "monthly" ? v.ot : v.total, c.currency)}</TableCell><TableCell><Tag tone={TS_STATUS[t.status]?.tone}>{TS_STATUS[t.status]?.label}</Tag></TableCell></TableRow>; })}
              {history.length === 0 && <TableRow><TableCell colSpan={5}><EmptyState title="No timesheets yet" text="Fill in the week above and submit it." /></TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
    </Stack>
  );
}

function Milestones({ c }) {
  const { submitMilestone, notifyToast } = useStore();
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");
  const total = (c.milestones || []).reduce((a, m) => a + Number(m.amount), 0);
  const paid = (c.milestones || []).filter((m) => m.status === "processed").reduce((a, m) => a + Number(m.amount), 0);
  return (
    <SectionCard title="Milestones" subtitle={`${money(paid, c.currency)} of ${money(total, c.currency)} paid`} noPad>
      <TableWrap>
        <Table size="small">
          <TableHead><TableRow><TableCell>Milestone</TableCell><TableCell>Due</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {(c.milestones || []).map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.title}{m.decision_note && <Typography sx={{ fontSize: "0.58rem", color: "error.main" }}>{m.decision_note}</Typography>}</TableCell>
                <TableCell>{fmtDate(m.due)}</TableCell>
                <TableCell align="right">{money(m.amount, c.currency)}</TableCell>
                <TableCell><Tag tone={MS_STATUS[m.status]?.tone}>{MS_STATUS[m.status]?.label}</Tag></TableCell>
                <TableCell align="right">{["planned", "rejected"].includes(m.status) && <Button size="small" variant="contained" onClick={() => { setOpen(m); setNote(""); }}>Submit for acceptance</Button>}</TableCell>
              </TableRow>
            ))}
            {!(c.milestones || []).length && <TableRow><TableCell colSpan={5}><EmptyState title="No milestones planned" text="HR adds milestones to fixed-fee contracts." /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableWrap>
      <Dialog open={!!open} onClose={() => setOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit “{open?.title}”</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={3} label="What did you deliver? (links, documents)" value={note} onChange={(e) => setNote(e.target.value)} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setOpen(null)}>Cancel</Button><Button variant="contained" onClick={() => { const r = submitMilestone(c.id, open.id, note); notifyToast(r.ok ? "Submitted for acceptance." : r.error, r.ok ? "success" : "error"); if (r.ok) setOpen(null); }}>Submit</Button></DialogActions>
      </Dialog>
    </SectionCard>
  );
}

function Payments({ c, me }) {
  const { data } = useStore();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const invoices = (data.contractInvoices || []).filter((i) => i.employee_code === me.employee_code).sort((a, b) => b.period.localeCompare(a.period));
  const slips = (data.payslipBatches || []).filter((b) => b.status === "Released").flatMap((b) => b.slips.filter((s) => s.employee_code === me.employee_code).map((s) => ({ b, s })));
  const lines = (data.contractRuns || []).filter((r) => r.status === "posted").flatMap((r) => r.lines.filter((l) => l.employee_code === me.employee_code).map((l) => ({ r, l })));
  const html = view ? invoiceHtml(data, view, data.settings.payslip_company, adviceDesign(data)) : "";
  return (
    <Stack spacing={2.5}>
      {c.payment_route === "payroll" && (
        <Alert severity="info" action={<Button color="inherit" size="small" startIcon={<ReceiptLongRounded />} onClick={() => navigate("/finances")}>My payslips</Button>}>You are paid through payroll. {slips.length} payslip(s) have been released — open them under My pay & payslips.</Alert>
      )}
      {c.payment_route === "vendor" && <Alert severity="info">You are paid by your staffing agency. The table below shows the approved time we paid the agency for.</Alert>}
      <SectionCard title="Contractor runs" subtitle="What was paid for your approved time and milestones" noPad>
        <TableWrap>
          <Table size="small">
            <TableHead><TableRow><TableCell>Month</TableCell><TableCell align="right">{c.pay_basis === "monthly" ? "Share of month" : "Units"}</TableCell><TableCell align="right">Gross</TableCell><TableCell align="right">GST</TableCell><TableCell align="right">TDS</TableCell><TableCell align="right">Net</TableCell></TableRow></TableHead>
            <TableBody>
              {lines.map(({ r, l }) => <TableRow key={r.id}><TableCell>{periodLabel(r.period)}</TableCell><TableCell align="right">{l.basis === "monthly" ? `${Math.round(l.units * 100)}%` : l.basis === "milestone" ? `${l.milestone_ids.length} milestone(s)` : `${l.units} ${l.basis === "daily" ? "days" : "hours"}`}</TableCell><TableCell align="right">{money(l.gross, l.currency)}</TableCell><TableCell align="right">{l.route === "invoice" ? money(l.gst, l.currency) : "—"}</TableCell><TableCell align="right">{l.route === "invoice" ? money(l.tds, l.currency) : l.route === "payroll" ? "on payslip" : "—"}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{l.route === "vendor" ? "paid by agency" : l.route === "payroll" ? "see payslip" : money(l.net, l.currency)}</TableCell></TableRow>)}
              {lines.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState title="No payments yet" text="Approved time is paid in the month-end contractor run." /></TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableWrap>
      </SectionCard>
      {c.payment_route === "invoice" && (
        <SectionCard title="Invoices & payment advices" noPad>
          <TableWrap>
            <Table size="small">
              <TableHead><TableRow><TableCell>Invoice</TableCell><TableCell>Month</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">TDS</TableCell><TableCell align="right">Net</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {invoices.map((i) => <TableRow key={i.id}><TableCell><Mono>{i.id}</Mono></TableCell><TableCell>{periodLabel(i.period)}</TableCell><TableCell align="right">{money(i.total, i.currency)}</TableCell><TableCell align="right">{money(i.tds, i.currency)}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{money(i.net_payable, i.currency)}</TableCell><TableCell><Tag tone={INVOICE_STATUS[i.status]?.tone}>{i.status === "paid" ? `Paid ${fmtDate(i.paid_at)}` : `Due ${fmtDate(i.due_date)}`}</Tag></TableCell><TableCell align="right"><Button size="small" onClick={() => setView(i)}>{i.status === "paid" ? "Payment advice" : "View"}</Button></TableCell></TableRow>)}
                {invoices.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState title="No invoices yet" text="A self-billed invoice is raised for you each month from your approved time." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      )}
      <DocDialog open={!!view} title={view?.id || ""} html={html} filename={`${String(view?.id || "").replace(/\//g, "-")}.html`} onClose={() => setView(null)} />
    </Stack>
  );
}

/** Managers and named approvers: timesheets and milestones of the contract workers they approve. */
export function TeamTimesheetsPage() {
  const { data, user, nameOf } = useStore();
  const s = data.contractSettings || DEFAULT_CONTRACT_SETTINGS;
  const mine = (data.contracts || []).filter((c) => ["active", "suspended"].includes(c.status) && approverOf(c, data.employees.find((e) => e.employee_code === c.employee_code)) === user.employee_code);
  return (
    <>
      <PageHeader eyebrow="MY TEAM · CONTRACT WORKERS" title="Contractor timesheets" subtitle="Approve the weekly timesheets and accept the milestones of the contract workers you supervise. Only approved time is paid." />
      <Stack spacing={2.5}>
        <TimesheetApprovals scope="mine" />
        <SectionCard title="Contract workers you approve for" noPad>
          <TableWrap>
            <Table size="small">
              <TableHead><TableRow><TableCell>Worker</TableCell><TableCell>Contract</TableCell><TableCell>Rate</TableCell><TableCell>Ends</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {mine.map((c) => <TableRow key={c.id}><TableCell><PersonCell name={nameOf(c.employee_code)} sub={WORKER_TYPE_BY[c.worker_type]?.label} /></TableCell><TableCell>{c.title}</TableCell><TableCell>{rateText(c)}</TableCell><TableCell>{fmtDate(c.end_date)} · {daysLeft(c)} d</TableCell><TableCell><StateTag c={c} settings={s} />{c.renewal_request && <Tag tone="info" sx={{ ml: 0.5 }}>Asked about renewal</Tag>}</TableCell></TableRow>)}
                {mine.length === 0 && <TableRow><TableCell colSpan={5}><EmptyState title="No contract workers" text="You are not the approver for any live contract." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableWrap>
        </SectionCard>
      </Stack>
    </>
  );
}
export { isContingent };
