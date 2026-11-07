// My finances (Keka "My Finances" + PeopleHR "Finance"): pay, tax, salary loans.
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MyPayslips } from "../components/pay/PayslipViews.jsx";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import { AddRounded, DownloadRounded } from "@mui/icons-material";
import { useStore } from "../store/AppStore.jsx";
import { PageHeader, SectionCard, StatCard, Grid, Mono, TableWrap, EmptyState, KeyVal, Tag } from "../components/kit/UI.jsx";
import { RequestDrawer, RequestStatus } from "../components/kit/Requests.jsx";
import { validateLoan } from "../lib/requests.js";
import { fmtNum, fmtDate, isoDate } from "../lib/utils.js";

// Indian income tax estimate (FY 2025-26 slabs). Illustrative only; payroll computes the real TDS.
function slabTax(income, slabs) {
  let tax = 0;
  let prev = 0;
  for (const [upto, rate] of slabs) {
    if (income > prev) tax += (Math.min(income, upto) - prev) * rate;
    prev = upto;
  }
  return tax;
}
export function taxEstimate(emp, declared80c = 150000, declared80d = 25000) {
  const gross = emp.monthly_gross * 12;
  if (emp.tax_regime === "old") {
    const taxable = Math.max(0, gross - 50000 - Math.min(declared80c, 150000) - declared80d);
    let tax = slabTax(taxable, [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]]);
    if (taxable <= 500000) tax = 0;
    return { gross, taxable, tax: Math.round(tax * 1.04), regime: "Old" };
  }
  const taxable = Math.max(0, gross - 75000);
  let tax = slabTax(taxable, [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]]);
  if (taxable <= 1200000) tax = 0;
  return { gross, taxable, tax: Math.round(tax * 1.04), regime: "New" };
}
function fyMonthsElapsed() {
  const d = new Date();
  const m = d.getMonth(); // 0 = Jan
  return m >= 3 ? m - 2 : m + 10; // April = 1
}

function ManageTax() {
  const { user, updateProfile, notifyToast } = useStore();
  const est = taxEstimate(user);
  const alt = taxEstimate({ ...user, tax_regime: user.tax_regime === "old" ? "new" : "old" });
  const paid = Math.round((est.tax / 12) * fyMonthsElapsed());
  const fyStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [confirm, setConfirm] = useState(false);
  const declarations = [
    ["80C · PF, PPF, ELSS, life insurance", 150000, 150000, 0],
    ["80D · Health insurance premium", 25000, 0, 0],
    ["HRA · Rent paid", 240000, 0, 0],
    ["24(b) · Home loan interest", 0, 0, 0],
  ];
  return (
    <Stack spacing={2.5}>
      <Alert severity="info" action={<Button size="small" onClick={() => setConfirm(true)}>Switch to {user.tax_regime === "old" ? "new" : "old"} regime</Button>}>
        Your income and tax liability is being computed as per the <b>{est.regime} Tax Regime</b>. Under the {alt.regime.toLowerCase()} regime your estimated tax would be ₹{fmtNum(alt.tax)}.
      </Alert>
      <Grid min={240}>
        <SectionCard title="Investment declaration" action={<Tag tone="bad">Closed</Tag>}>
          <Typography sx={{ fontSize: "0.65rem", color: "#78827b" }}>You cannot add or edit declarations as the investment declaration window has lapsed.</Typography>
        </SectionCard>
        <SectionCard title="Proof submission" action={<Tag tone="good">Open</Tag>}>
          <Typography sx={{ fontSize: "0.65rem", color: "#78827b" }}>Current window till 20 Jan {fyStart + 1}. Upload rent receipts and investment proofs from Documents.</Typography>
        </SectionCard>
      </Grid>
      <Grid min={200}>
        <StatCard label="Net taxable income" value={`₹${fmtNum(est.taxable)}`} hint={`Gross ₹${fmtNum(est.gross)} less deductions`} />
        <StatCard label="Total tax payable" value={`₹${fmtNum(est.tax)}`} tone="warn" hint="Including 4% cess (estimate)" />
        <StatCard label="Tax already paid" value={`₹${fmtNum(paid)}`} tone="good" hint={`TDS for ${fyMonthsElapsed()} month(s) of FY ${fyStart}-${String(fyStart + 1).slice(2)}`} />
      </Grid>
      <SectionCard title="My declarations" subtitle={`FY ${fyStart}-${String(fyStart + 1).slice(2)}`} noPad>
        <TableWrap>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead><TableRow><TableCell>Declaration</TableCell><TableCell align="right">Declared</TableCell><TableCell align="right">Proof submitted</TableCell><TableCell align="right">Rejected</TableCell><TableCell align="right">Accepted</TableCell></TableRow></TableHead>
            <TableBody>
              {declarations.map(([n, d, p, r]) => (
                <TableRow key={n}><TableCell>{n}</TableCell><TableCell align="right">₹{fmtNum(d)}</TableCell><TableCell align="right">₹{fmtNum(p)}</TableCell><TableCell align="right">₹{fmtNum(r)}</TableCell><TableCell align="right">₹{fmtNum(p - r)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
        {est.regime === "New" && <Typography sx={{ p: 1.5, fontSize: "0.6rem", color: "#78827b" }}>Most deductions do not apply under the new regime; they are kept for reference if you switch.</Typography>}
      </SectionCard>
      <Grid min={260}>
        <SectionCard title="Form 130 (formerly Form 16)" subtitle="Salary, deductions and tax paid for filing returns">
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "0.65rem" }}>APR {fyStart - 1} – MAR {fyStart}</Typography>
            <Alert severity="warning">Form 130 has not been released by the admin for the selected financial year.</Alert>
          </Stack>
        </SectionCard>
        <SectionCard title="Form 124 (formerly Form 12BB)" subtitle="Proposed investments and expenses that are tax deductible">
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "0.65rem" }}>APR {fyStart} – MAR {fyStart + 1}</Typography>
            <Button size="small" variant="outlined" startIcon={<DownloadRounded />} onClick={() => notifyToast("Form 124 is generated by payroll; in this demo it is not a real file.", "info")}>Download Form 124</Button>
          </Stack>
        </SectionCard>
        <SectionCard title="Tax filing" subtitle={`Due date for FY ${fyStart - 1}-${String(fyStart).slice(2)} returns was 31 Jul ${fyStart}`}>
          <Typography sx={{ fontSize: "0.65rem", color: "#78827b" }}>File your ITR with any e-filing partner or on the income-tax portal using Form 130.</Typography>
        </SectionCard>
      </Grid>
      <Dialog open={confirm} onClose={() => setConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Switch to the {user.tax_regime === "old" ? "new" : "old"} regime?</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: "0.7rem" }}>Estimated yearly tax changes from ₹{fmtNum(est.tax)} to ₹{fmtNum(alt.tax)}. TDS from the next payroll uses the new choice.</Typography></DialogContent>
        <DialogActions><Button color="inherit" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="contained" onClick={() => { const r = updateProfile({ tax_regime: user.tax_regime === "old" ? "new" : "old" }); notifyToast(r.ok ? "Tax regime updated." : "Could not update.", r.ok ? "success" : "error"); setConfirm(false); }}>Switch</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

function LoanDialog({ open, onClose }) {
  const { data, user, createRequest, notifyToast } = useStore();
  const [form, setForm] = useState({});
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ amount: "", tenure_months: "6", reason: "", start_month: isoDate(Date.now() + 30 * 86400000).slice(0, 7) });
      setTried(false);
    }
  }, [open]);
  const { errors, emi } = validateLoan(form, { settings: data.settings, emp: user, requests: data.requests });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const show = (k) => tried && errors[k];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Request salary loan</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Loan amount *" value={form.amount || ""} onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))} error={!!show("amount")} helperText={show("amount") || `Up to ₹${fmtNum(user.monthly_gross * data.settings.loan_max_multiple)}`} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
          <TextField label="Tenure (months) *" value={form.tenure_months || ""} onChange={(e) => set("tenure_months", e.target.value.replace(/\D/g, ""))} error={!!show("tenure_months")} helperText={show("tenure_months") || `1 to ${data.settings.loan_max_tenure_months}`} />
          <TextField label="First EMI month" type="month" value={form.start_month || ""} onChange={(e) => set("start_month", e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Reason *" multiline minRows={2} value={form.reason || ""} onChange={(e) => set("reason", e.target.value)} error={!!show("reason")} helperText={show("reason") || " "} />
          <Alert severity="info">EMI ₹{fmtNum(emi)} a month, deducted from salary. Interest-free.</Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => { setTried(true); if (Object.keys(errors).length) return; const r = createRequest("loan", form); if (!r.ok) return notifyToast(Object.values(r.errors)[0], "error"); notifyToast(`Loan request ${r.id} sent for approval.`); onClose(); }}>Send request</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FinancesPage() {
  const { data, user } = useStore();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "tax" ? "tax" : params.get("tab") === "loans" ? "loans" : "pay");
  const [loanOpen, setLoanOpen] = useState(false);
  const loans = data.requests.filter((r) => r.type === "loan" && r.employee_code === user.employee_code);
  return (
    <>
      <PageHeader eyebrow="MY FINANCES" title="My finances" subtitle={`Current compensation ₹${fmtNum(user.monthly_gross * 12)} / annum · pay cycle monthly`} />
      <Box sx={{ mb: 2, borderBottom: "1px solid #e5eae4" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="pay" label="My pay" sx={{ fontSize: "0.7rem" }} />
          <Tab value="tax" label="Manage tax" sx={{ fontSize: "0.7rem" }} />
          <Tab value="loans" label={`Salary loan (${loans.length})`} sx={{ fontSize: "0.7rem" }} />
        </Tabs>
      </Box>
      {tab === "pay" && <MyPayslips />}
      {tab === "tax" && <ManageTax />}
      {tab === "loans" && (
        <SectionCard title="Salary loans" subtitle={`Interest-free, up to ${data.settings.loan_max_multiple}× monthly gross, repaid over at most ${data.settings.loan_max_tenure_months} months`} action={<Button variant="contained" size="small" startIcon={<AddRounded />} onClick={() => setLoanOpen(true)}>Request loan</Button>} noPad>
          {loans.length === 0 ? <EmptyState title="Sorry, your search returned no results" text="You have no salary loan requests." /> : (
            <TableWrap>
              <Table size="small" sx={{ minWidth: 620 }}>
                <TableHead><TableRow><TableCell>Loan</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Tenure</TableCell><TableCell align="right">EMI</TableCell><TableCell>Requested</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.request_id} hover sx={{ cursor: "pointer" }} onClick={() => setParams({ req: l.request_id })}>
                      <TableCell><Mono>{l.request_id}</Mono></TableCell>
                      <TableCell align="right">₹{fmtNum(l.approved_amount ?? l.amount)}</TableCell>
                      <TableCell align="right">{l.tenure_months} mo</TableCell>
                      <TableCell align="right">₹{fmtNum(l.emi)}</TableCell>
                      <TableCell>{fmtDate(l.created_at)}</TableCell>
                      <TableCell><RequestStatus r={l} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          )}
        </SectionCard>
      )}
      <LoanDialog open={loanOpen} onClose={() => setLoanOpen(false)} />
      <RequestDrawer id={params.get("req")} onClose={() => setParams({})} />
    </>
  );
}


