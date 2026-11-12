// Offboarding & full-and-final settlement (v10). HR and Finance see every exit, the clearance checklist (manager, IT,
// assets, finance, HR), the exit interview and the F&F computation (final salary, leave encashment, gratuity /
// end-of-service, notice recovery, advances and assets), then approve and pay it through payroll.
// Employees resign, follow their clearance and see their F&F estimate on "Resignation & exit".
import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Rating, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Logout, AssignmentTurnedIn, Payments, EventBusy, Forum, CheckRounded, DownloadRounded } from "@mui/icons-material";
import { useStore } from "../../../store/AppStore.jsx";
import { SectionCard, TableWrap, PersonCell, EmptyState, KeyVal } from "../../../components/kit/UI.jsx";
import { ModuleHub, Steps, Pill, StatusPill, TwoCol, Hint, money, C, Progress, useWho } from "../../../components/suite/Hub.jsx";
import { leaveBalances } from "../../../lib/requests.js";
import { leaveTypesFor } from "../../../country/countryPacks.js";
import { COUNTRIES } from "../../../lib/payroll/index.js";
import { downloadCsv, fmtDate, isoDate } from "../../../lib/utils.js";

const CLEAR = [["manager", "Manager handover"], ["it", "IT — accounts & data"], ["assets", "Assets returned"], ["finance", "Finance — advances & loans"], ["hr", "HR — exit interview & letters"]];
const REASONS = ["Better opportunity", "Higher studies", "Relocation", "Compensation", "Manager / team", "Work-life balance", "Health / personal", "Career change", "Retirement", "Other"];
const dayMs = 86400000;

/** Full-and-final settlement for one exit. Country-aware: India uses basic ÷ 26 encashment and 15/26 gratuity. */
export function computeFnf(data, exit) {
  const e = data.employees.find((x) => x.employee_code === exit.employee_code);
  if (!e) return null;
  const code = e.country_code || "IN";
  const cur = COUNTRIES[code]?.currency || "INR";
  const gross = Number(e.monthly_gross) || 0, basic = gross * 0.5;
  const last = new Date(exit.last_day);
  const daysWorked = last.getDate();
  const final = Math.round((gross / 30) * daysWorked);
  let el = 0;
  try { el = Math.max(0, (leaveBalances(e, leaveTypesFor(data, e), data.requests).find((b) => b.code === "EL" || /earned|annual/i.test(b.name))?.available) || 0); } catch { el = 0; }
  const encash = code === "IN" ? Math.round((basic / 26) * Math.min(el, 30)) : Math.round((gross / 22) * el);
  const years = (last - new Date(e.date_of_joining)) / (365.25 * dayMs);
  let gratuity = 0, gratNote = "";
  if (code === "IN") { gratuity = years >= 4.8 ? Math.min(2000000, Math.round((15 / 26) * basic * Math.round(years))) : 0; gratNote = years >= 4.8 ? `${Math.round(years)} yrs × 15/26 × basic` : `Not eligible (${years.toFixed(1)} yrs < 5)`; }
  else if (code === "AE") { gratuity = years >= 1 ? Math.round((basic / 30) * 21 * Math.min(years, 5) + (basic / 30) * 30 * Math.max(0, years - 5)) : 0; gratNote = "UAE end-of-service: 21 days' basic / year (first 5 yrs)"; }
  else gratNote = "Per local law — none due";
  const served = Math.round((last - new Date(exit.resigned_on)) / dayMs);
  const shortfall = exit.waive_notice ? 0 : Math.max(0, (exit.notice_days || Number(e.notice_period) || 0) - served - (exit.buyout_days || 0));
  const recovery = Math.round((gross / 30) * shortfall);
  const advances = data.requests.filter((r) => r.employee_code === e.employee_code && r.type === "advance" && ["Disbursed", "Paid"].includes(r.status) && !r.settled).reduce((s, r) => s + (Number(r.request_amount) || 0), 0);
  const assetsOut = (data.assets || []).filter((a) => a.assigned_to === e.employee_code && exit.clearance?.assets !== "done");
  const assetRec = assetsOut.length * 0; // recovered only if not returned by last day; shown as a warning
  const bonus = code === "IN" && gross <= 21000 ? Math.round(gross * 0.0833 * (last.getMonth() + 1) / 12) : 0;
  const earnings = [["Salary for " + daysWorked + " days", final], ["Leave encashment (" + el + " days)", encash], ["Gratuity / end of service", gratuity], ...(bonus ? [["Statutory bonus (pro-rata)", bonus]] : [])];
  const deductions = [["Notice shortfall (" + shortfall + " days)", recovery], ["Advances to recover", advances], ...(assetRec ? [["Unreturned assets", assetRec]] : [])];
  const totalE = earnings.reduce((s, x) => s + x[1], 0), totalD = deductions.reduce((s, x) => s + x[1], 0);
  const tds = code === "IN" ? Math.round(Math.max(0, totalE - gratuity) * 0.1) : 0;
  return { e, cur, code, earnings, deductions: [...deductions, ...(tds ? [["TDS on F&F (estimate)", tds]] : [])], net: totalE - totalD - tds, gratNote, el, years, assetsOut, shortfall };
}

export default function Exits() {
  const { data, suiteDo, suiteCan, notifyToast, nameOf } = useStore();
  const exits = data.suite?.exits || [];
  const [sel, setSel] = useState(exits[0]?.id || null);
  const [start, setStart] = useState(null);
  const can = suiteCan("exits");
  const cur = exits.find((x) => x.id === sel);
  const fnf = cur ? computeFnf(data, cur) : null;
  const interviews = exits.filter((x) => x.interview);
  const reasons = REASONS.map((r) => [r, exits.filter((x) => x.reason === r || x.interview?.reason === r).length]).filter(([, n]) => n);

  function setClear(id, k, v) { suiteDo("exits", (s) => { s.exits.find((x) => x.id === id).clearance[k] = v; }, { action: "EXIT_CLEARANCE", details: `${id} · ${k} ${v}` }); }
  function update(id, patch, action, msg) {
    const r = suiteDo("exits", (s) => { const x = s.exits.find((y) => y.id === id); Object.assign(x, patch); return { emp: x.employee_code }; }, { action, details: `${id} · ${JSON.stringify(patch)}`, note: msg ? (r2) => ({ to: r2.emp, text: msg, link: "/my-exit" }) : undefined });
    return r;
  }
  function approveFnf() {
    update(cur.id, { fnf_status: "approved", fnf_amount: fnf.net, fnf_approved_at: new Date().toISOString(), status: "fnf" }, "FNF_APPROVE", `Your full & final settlement of ${money(fnf.net, fnf.cur)} is approved and will be paid with the next payroll.`);
    notifyToast("F&F approved — it is added to the next payroll and bank file.");
  }
  function pay() {
    update(cur.id, { fnf_status: "paid", status: "closed", closed_at: new Date().toISOString() }, "FNF_PAID", "Your full & final settlement has been paid. Your relieving and experience letters are in Documents.");
    notifyToast("Marked paid. Relieving and experience letters issued.");
  }
  function initiate() {
    const e = data.employees.find((x) => x.employee_code === start.employee_code);
    const r = suiteDo("exits", (s, { now }) => { s.exits = [{ id: `EXT-${String(10 + s.exits.length).padStart(3, "0")}`, employee_code: start.employee_code, type: start.type, reason: start.reason, resigned_on: isoDate(), last_day: start.last_day, notice_days: Number(e?.notice_period) || 30, status: "notice", buyout_days: 0, clearance: Object.fromEntries(CLEAR.map(([k]) => [k, "pending"])), exit_interview: false, fnf_status: "draft", created_at: now }, ...s.exits]; }, { action: "EXIT_INITIATE", details: `${start.employee_code} · ${start.type}`, note: { to: start.employee_code, text: "An exit has been recorded for you. Your clearance checklist is in Resignation & exit.", link: "/my-exit" } });
    if (r.ok) { notifyToast("Exit started — the clearance checklist went to every owner."); setStart(null); }
  }

  return (
    <ModuleHub
      eyebrow="CORE HR · OFFBOARDING"
      title="Exits & full-and-final settlement"
      subtitle="Resignations and terminations, the clearance checklist across manager, IT, assets, finance and HR, exit interviews, and a full-and-final settlement that pays out through payroll."
      actions={can && <Button variant="contained" startIcon={<Logout />} onClick={() => setStart({ employee_code: "", type: "resignation", reason: "Better opportunity", last_day: isoDate(new Date(Date.now() + 30 * dayMs)) })}>Start an exit</Button>}
      brief={{ text: <><b>{exits.filter((x) => x.status === "notice").length}</b> on notice, <b>{exits.filter((x) => x.fnf_status === "computed" || x.fnf_status === "draft").length}</b> F&F settlements to approve. Top reason for leaving: <b>{reasons.sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}</b>.</> }}
      kpis={[
        { label: "On notice", value: exits.filter((x) => x.status === "notice").length, icon: <EventBusy />, tone: "glob" },
        { label: "Clearance pending", value: exits.filter((x) => Object.values(x.clearance || {}).some((v) => v !== "done")).length, icon: <AssignmentTurnedIn />, tone: "navy" },
        { label: "F&F to settle", value: exits.filter((x) => !["paid"].includes(x.fnf_status)).length, icon: <Payments />, tone: "glob" },
        { label: "Exit interviews", value: interviews.length, icon: <Forum />, tone: "mint" },
      ]}
    >
      <TwoCol right={430}>
        <SectionCard title="Exits" noPad>
          {exits.length === 0 ? <EmptyState title="No exits" /> : (
            <TableWrap><Table size="small"><TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Type</TableCell><TableCell>Last day</TableCell><TableCell>Clearance</TableCell><TableCell>F&F</TableCell></TableRow></TableHead>
              <TableBody>{exits.map((x) => {
                const done = Object.values(x.clearance || {}).filter((v) => v === "done").length;
                return (
                  <TableRow key={x.id} hover selected={x.id === sel} onClick={() => setSel(x.id)} sx={{ cursor: "pointer" }}>
                    <TableCell><PersonCell name={nameOf(x.employee_code)} sub={`${x.id} · ${x.reason}`} /></TableCell><TableCell>{x.type}</TableCell><TableCell>{fmtDate(x.last_day)}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}><Progress value={(done / CLEAR.length) * 100} right={`${done}/${CLEAR.length}`} color={done === CLEAR.length ? C.mintDeep : C.glob} /></TableCell><TableCell><StatusPill status={x.fnf_status} /></TableCell>
                  </TableRow>
                );
              })}</TableBody></Table></TableWrap>
          )}
        </SectionCard>
        {cur && fnf && (
          <Stack spacing={2}>
            <SectionCard title={`${fnf.e.full_name} · clearance`} subtitle={`Resigned ${fmtDate(cur.resigned_on)} · last day ${fmtDate(cur.last_day)} · notice ${cur.notice_days} days`}>
              <Stack spacing={1}>
                {CLEAR.map(([k, l]) => (
                  <Stack key={k} direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="body2">{l}</Typography>
                    {cur.clearance?.[k] === "done" ? <Pill tone="mint">cleared</Pill> : <Button size="small" variant="outlined" disabled={!can} onClick={() => setClear(cur.id, k, "done")}>Mark cleared</Button>}
                  </Stack>
                ))}
                {fnf.assetsOut.length > 0 && <Alert severity="warning">{fnf.assetsOut.length} asset(s) still assigned: {fnf.assetsOut.map((a) => a.name || a.asset_id).join(", ")}.</Alert>}
              </Stack>
            </SectionCard>
            <SectionCard title="Full & final settlement" subtitle={`${fnf.years.toFixed(1)} years' service · ${fnf.gratNote}`} action={<StatusPill status={cur.fnf_status} />}>
              <Table size="small"><TableBody>
                {fnf.earnings.map(([k, v]) => <TableRow key={k}><TableCell>{k}</TableCell><TableCell align="right">{money(v, fnf.cur)}</TableCell></TableRow>)}
                {fnf.deductions.map(([k, v]) => <TableRow key={k}><TableCell sx={{ color: "text.secondary" }}>less {k}</TableCell><TableCell align="right" sx={{ color: "text.secondary" }}>− {money(v, fnf.cur)}</TableCell></TableRow>)}
                <TableRow><TableCell sx={{ fontWeight: 800 }}>Net payable</TableCell><TableCell align="right" sx={{ fontWeight: 800, color: C.navy }}>{money(fnf.net, fnf.cur)}</TableCell></TableRow>
              </TableBody></Table>
              <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: "wrap" }}>
                {["draft", "computed"].includes(cur.fnf_status) && <Button variant="contained" startIcon={<CheckRounded />} disabled={!can || Object.values(cur.clearance || {}).some((v) => v !== "done")} onClick={approveFnf}>Approve F&F</Button>}
                {cur.fnf_status === "approved" && <Button variant="contained" color="secondary" onClick={pay} disabled={!can}>Mark paid & issue letters</Button>}
                <Button startIcon={<DownloadRounded />} onClick={() => downloadCsv(`fnf-${cur.id}.csv`, ["Line", "Amount"], [...fnf.earnings, ...fnf.deductions.map(([k, v]) => [`less ${k}`, -v]), ["Net payable", fnf.net]])}>F&F statement</Button>
                <Button onClick={() => update(cur.id, { waive_notice: !cur.waive_notice }, "NOTICE_WAIVER", null)} disabled={!can}>{cur.waive_notice ? "Recover notice shortfall" : "Waive notice shortfall"}</Button>
              </Stack>
              {Object.values(cur.clearance || {}).some((v) => v !== "done") && <Hint>Approve after every clearance owner has signed off.</Hint>}
            </SectionCard>
            {cur.interview && <SectionCard title="Exit interview"><KeyVal items={[["Main reason", cur.interview.reason], ["Would return", cur.interview.rehire ? "Yes" : "No"], ["Manager rating", `${cur.interview.manager}/5`], ["Comments", cur.interview.comment, { full: true }]]} /></SectionCard>}
          </Stack>
        )}
      </TwoCol>
      <Dialog open={!!start} onClose={() => setStart(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Start an exit</DialogTitle>
        <DialogContent><Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField select label="Employee" value={start?.employee_code || ""} onChange={(e) => setStart({ ...start, employee_code: e.target.value })}>{data.employees.filter((e) => e.status === "active" && !exits.some((x) => x.employee_code === e.employee_code)).map((e) => <MenuItem key={e.employee_code} value={e.employee_code}>{e.full_name} · {e.employee_code}</MenuItem>)}</TextField>
          <TextField select label="Type" value={start?.type || "resignation"} onChange={(e) => setStart({ ...start, type: e.target.value })}>{["resignation", "termination", "end of contract", "retirement", "absconding"].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
          <TextField select label="Reason" value={start?.reason || ""} onChange={(e) => setStart({ ...start, reason: e.target.value })}>{REASONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
          <TextField type="date" label="Last working day" slotProps={{ inputLabel: { shrink: true } }} value={start?.last_day || ""} onChange={(e) => setStart({ ...start, last_day: e.target.value })} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setStart(null)}>Cancel</Button><Button variant="contained" disabled={!start?.employee_code} onClick={initiate}>Start</Button></DialogActions>
      </Dialog>
    </ModuleHub>
  );
}

// ── Employee: Resignation & exit ────────────────────────────────────────────────
export function MyExit() {
  const { data, user, suiteDo, notifyToast } = useStore();
  const me = data.employees.find((e) => e.employee_code === user.employee_code);
  const exit = (data.suite?.exits || []).find((x) => x.employee_code === me.employee_code && x.status !== "withdrawn");
  const notice = Number(me.notice_period) || 30;
  const [f, setF] = useState({ reason: "Better opportunity", last_day: isoDate(new Date(Date.now() + notice * dayMs)), note: "" });
  const [iv, setIv] = useState({ reason: "Better opportunity", manager: 4, rehire: true, comment: "" });
  const fnf = exit ? computeFnf(data, exit) : null;
  function resign() {
    const r = suiteDo("exit-self", (s, { now, me: code }) => { s.exits = [{ id: `EXT-${String(10 + s.exits.length).padStart(3, "0")}`, employee_code: code, type: "resignation", reason: f.reason, note: f.note, resigned_on: isoDate(), last_day: f.last_day, notice_days: notice, status: "notice", buyout_days: 0, clearance: Object.fromEntries(CLEAR.map(([k]) => [k, "pending"])), exit_interview: false, fnf_status: "draft", created_at: now }, ...s.exits]; }, { action: "RESIGNATION", details: `${me.employee_code} · last day ${f.last_day}`, note: { to: [me.reporting_manager, "ADM01"].filter(Boolean), text: `${me.full_name} has resigned. Proposed last day ${fmtDate(f.last_day)}.`, link: "/exits" } });
    if (r.ok) notifyToast("Resignation submitted to your manager and HR.");
  }
  function withdraw() { suiteDo("exit-self", (s, { me: code }) => { const x = s.exits.find((y) => y.employee_code === code && y.status === "notice"); if (x) x.status = "withdrawn"; }, { action: "RESIGNATION_WITHDRAW", details: me.employee_code, note: { to: [me.reporting_manager, "ADM01"].filter(Boolean), text: `${me.full_name} withdrew their resignation.`, link: "/exits" } }); notifyToast("Resignation withdrawn."); }
  function submitIv() { suiteDo("exit-self", (s, { me: code }) => { const x = s.exits.find((y) => y.employee_code === code && y.status !== "withdrawn"); x.interview = iv; x.exit_interview = true; }, { action: "EXIT_INTERVIEW", details: me.employee_code }); notifyToast("Thank you — your feedback goes to HR only."); }
  const steps = exit ? [
    { label: "Resigned", status: "done", sub: fmtDate(exit.resigned_on) },
    { label: "Notice period", status: exit.status === "notice" ? "running" : "done", sub: `Last day ${fmtDate(exit.last_day)}` },
    { label: "Clearance", status: Object.values(exit.clearance).every((v) => v === "done") ? "done" : "running", sub: `${Object.values(exit.clearance).filter((v) => v === "done").length}/${CLEAR.length} cleared` },
    { label: "Full & final", status: exit.fnf_status === "paid" ? "done" : exit.fnf_status === "approved" ? "running" : "todo", sub: exit.fnf_status },
    { label: "Letters", status: exit.status === "closed" ? "done" : "todo", sub: "Relieving & experience" },
  ] : [];
  return (
    <ModuleHub eyebrow="ME · EXIT" title="Resignation & exit" subtitle="Resign, follow your notice and clearance, give exit feedback and see your full-and-final settlement — everything in one place.">
      {!exit ? (
        <TwoCol right={380}>
          <SectionCard title="Before you resign">
            <Typography variant="body2" color="text.secondary">Your notice period is <b>{notice} days</b>. Your manager and HR will be told when you submit. You can withdraw while you are on notice. Unused earned leave is encashed in your full-and-final settlement; gratuity applies after 5 years in India.</Typography>
          </SectionCard>
          <SectionCard title="Submit resignation">
            <Stack spacing={1.5}>
              <TextField select size="small" label="Main reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{REASONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
              <TextField type="date" size="small" label="Proposed last day" slotProps={{ inputLabel: { shrink: true } }} value={f.last_day} onChange={(e) => setF({ ...f, last_day: e.target.value })} helperText={f.last_day < isoDate(new Date(Date.now() + notice * dayMs)) ? "Earlier than your notice period — a shortfall may be recovered unless waived." : " "} />
              <TextField size="small" label="Note to your manager (optional)" multiline minRows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
              <Button variant="contained" color="secondary" onClick={resign}>Submit resignation</Button>
            </Stack>
          </SectionCard>
        </TwoCol>
      ) : (
        <Stack spacing={2}>
          <Steps steps={steps} />
          <TwoCol right={400}>
            <Stack spacing={2}>
              <SectionCard title="Clearance">{CLEAR.map(([k, l]) => <Stack key={k} direction="row" sx={{ justifyContent: "space-between", py: 0.6 }}><Typography variant="body2">{l}</Typography><Pill tone={exit.clearance[k] === "done" ? "mint" : "glob"}>{exit.clearance[k] === "done" ? "cleared" : "pending"}</Pill></Stack>)}</SectionCard>
              {!exit.interview ? (
                <SectionCard title="Exit interview" subtitle="Confidential — shared with HR only">
                  <Stack spacing={1.5}>
                    <TextField select size="small" label="Main reason for leaving" value={iv.reason} onChange={(e) => setIv({ ...iv, reason: e.target.value })}>{REASONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
                    <Box><Typography variant="caption" color="text.secondary">How was your manager?</Typography><Box><Rating value={iv.manager} onChange={(_, v) => setIv({ ...iv, manager: v || 1 })} /></Box></Box>
                    <TextField select size="small" label="Would you come back?" value={iv.rehire ? "yes" : "no"} onChange={(e) => setIv({ ...iv, rehire: e.target.value === "yes" })}><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField>
                    <TextField size="small" label="Anything we should change?" multiline minRows={2} value={iv.comment} onChange={(e) => setIv({ ...iv, comment: e.target.value })} />
                    <Button variant="contained" onClick={submitIv}>Submit feedback</Button>
                  </Stack>
                </SectionCard>
              ) : <Alert severity="success">Thank you for your exit feedback.</Alert>}
            </Stack>
            <SectionCard title="Full & final estimate" subtitle="Final figures are confirmed by Finance after clearance">
              {fnf && <Table size="small"><TableBody>
                {fnf.earnings.map(([k, v]) => <TableRow key={k}><TableCell>{k}</TableCell><TableCell align="right">{money(v, fnf.cur)}</TableCell></TableRow>)}
                {fnf.deductions.map(([k, v]) => <TableRow key={k}><TableCell sx={{ color: "text.secondary" }}>less {k}</TableCell><TableCell align="right" sx={{ color: "text.secondary" }}>− {money(v, fnf.cur)}</TableCell></TableRow>)}
                <TableRow><TableCell sx={{ fontWeight: 800 }}>Estimated net</TableCell><TableCell align="right" sx={{ fontWeight: 800, color: C.navy }}>{money(fnf.net, fnf.cur)}</TableCell></TableRow>
              </TableBody></Table>}
              {exit.status === "notice" && <Button sx={{ mt: 1.5 }} onClick={withdraw}>Withdraw resignation</Button>}
            </SectionCard>
          </TwoCol>
        </Stack>
      )}
    </ModuleHub>
  );
}
