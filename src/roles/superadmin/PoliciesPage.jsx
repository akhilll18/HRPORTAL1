// Super Admin: approval workflow per module, leave policy, expense policy, holidays, and the points masters.
import React, { useState } from "react";
import { Alert, Box, Button, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import { AddRounded, DeleteOutlineRounded, SaveRounded } from "@mui/icons-material";
import { WorkforcePolicies } from "./OpsSuper.jsx";
import { useStore } from "../../store/AppStore.jsx";
import { PageHeader, SectionCard, TableWrap, Mono } from "../../components/kit/UI.jsx";
import { REQUEST_TYPES } from "../../lib/requests.js";

function Workflow() {
  const { data, updateSettings, notifyToast } = useStore();
  const [wf, setWf] = useState(data.settings.workflow);
  return (
    <SectionCard title="Approval workflow" subtitle="Who approves each kind of request. Employees without an active manager go straight to the admin." action={<Button size="small" variant="contained" startIcon={<SaveRounded />} onClick={() => { const r = updateSettings({ workflow: wf }); notifyToast(r.changed ? "Workflow saved and audited." : "No changes."); }}>Save</Button>}>
      <Stack spacing={2}>
        {Object.keys(wf).filter((m) => REQUEST_TYPES[m]).map((m) => (
          <Stack key={m} direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Typography sx={{ width: 160, fontSize: "0.75rem", fontWeight: 700 }}>{REQUEST_TYPES[m].label}</Typography>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Approval chain</InputLabel>
              <Select label="Approval chain" value={wf[m]} onChange={(e) => setWf({ ...wf, [m]: e.target.value })}>
                <MenuItem value="manager_admin">Reporting manager → {m === "leave" || m === "points" ? "HR admin" : "Finance admin"}</MenuItem>
                <MenuItem value="manager">Reporting manager only</MenuItem>
                <MenuItem value="admin">{m === "leave" || m === "points" ? "HR admin" : "Finance admin"} only</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: "0.6rem", color: "#78827b" }}>Admin step goes to an active admin holding the “{REQUEST_TYPES[m].module}” module for the employee's org unit.</Typography>
          </Stack>
        ))}
        <Alert severity="info">Changes apply to new requests. Requests already in progress keep their steps.</Alert>
      </Stack>
    </SectionCard>
  );
}

function EditableTable({ title, subtitle, rows: initial, columns, onSave, newRow, keyField }) {
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState("");
  const set = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <SectionCard title={title} subtitle={subtitle} action={<Stack direction="row" spacing={1}><Button size="small" startIcon={<AddRounded />} onClick={() => setRows([...rows, newRow()])}>Add</Button><Button size="small" variant="contained" startIcon={<SaveRounded />} onClick={() => { const e = onSave(rows); setErr(e || ""); }}>Save</Button></Stack>} noPad>
      {err && <Alert severity="error" sx={{ m: 1.5 }}>{err}</Alert>}
      <TableWrap>
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead><TableRow>{columns.map((c) => <TableCell key={c.key} align={c.type === "number" ? "right" : "left"}>{c.label}</TableCell>)}<TableCell /></TableRow></TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r[keyField]}-${i}`}>
                {columns.map((c) => (
                  <TableCell key={c.key} sx={{ minWidth: c.width || 90 }}>
                    {c.type === "bool" ? (
                      <Switch size="small" checked={!!r[c.key]} onChange={(e) => set(i, c.key, e.target.checked)} />
                    ) : c.type === "select" ? (
                      <Select size="small" value={r[c.key] ?? ""} onChange={(e) => set(i, c.key, e.target.value)} sx={{ fontSize: "0.65rem", minWidth: 110 }}>{c.options.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}</Select>
                    ) : c.readOnlyExisting && i < initial.length ? (
                      <Mono>{r[c.key]}</Mono>
                    ) : (
                      <TextField size="small" type={c.type === "date" ? "date" : "text"} value={r[c.key] ?? ""} onChange={(e) => set(i, c.key, c.type === "number" ? (e.target.value === "" ? "" : e.target.value.replace(/[^\d]/g, "")) : e.target.value)} slotProps={{ htmlInput: { style: { fontSize: "0.65rem", textAlign: c.type === "number" ? "right" : "left" } } }} />
                    )}
                  </TableCell>
                ))}
                <TableCell><IconButton size="small" aria-label="Remove row" onClick={() => setRows(rows.filter((_, j) => j !== i))}><DeleteOutlineRounded fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrap>
    </SectionCard>
  );
}

export default function PoliciesPage() {
  const { data, updateMaster, notifyToast } = useStore();
  const [tab, setTab] = useState("workflow");
  return (
    <>
      <PageHeader eyebrow="SUPER ADMIN · CONFIGURATION" title="Policies & rules" subtitle="Approval chains, leave and expense policies and holidays. Every save is written to the audit log." />
      <Box sx={{ mb: 2, borderBottom: "1px solid #e5eae4" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="workflow" label="Approval workflow" sx={{ fontSize: "0.7rem" }} />
          <Tab value="leave" label="Leave policy" sx={{ fontSize: "0.7rem" }} />
          <Tab value="expense" label="Expense policy" sx={{ fontSize: "0.7rem" }} />
          <Tab value="holidays" label="Holidays" sx={{ fontSize: "0.7rem" }} />
          <Tab value="workforce" label="Attendance, calls & assets" sx={{ fontSize: "0.7rem" }} />
        </Tabs>
      </Box>
      {tab === "workflow" && <Workflow />}
      {tab === "workforce" && <WorkforcePolicies />}
      {tab === "leave" && (
        <EditableTable
          title="Leave types"
          subtitle="Annual entitlement is pro-rated for joiners. Blank “Per year” means unpaid (Loss of pay)."
          keyField="code"
          rows={data.leaveTypes}
          newRow={() => ({ code: "", name: "", annual: 0, carry_forward: 0, min_notice_days: 1, doc_after_days: "", active: true })}
          columns={[
            { key: "code", label: "Code", readOnlyExisting: true, width: 70 },
            { key: "name", label: "Name", width: 160 },
            { key: "annual", label: "Per year", type: "number" },
            { key: "carry_forward", label: "Carry forward", type: "number" },
            { key: "min_notice_days", label: "Notice (days)", type: "number" },
            { key: "doc_after_days", label: "Certificate after (days)", type: "number" },
            { key: "floater_only", label: "Floater only", type: "bool" },
            { key: "active", label: "Active", type: "bool" },
          ]}
          onSave={(rows) => {
            if (rows.some((r) => !r.code || !r.name)) return "Every leave type needs a code and a name.";
            if (new Set(rows.map((r) => r.code)).size !== rows.length) return "Leave codes must be unique.";
            updateMaster("leaveTypes", rows.map((r) => ({ ...r, code: r.code.toUpperCase(), annual: r.annual === "" || r.annual == null ? null : Number(r.annual), carry_forward: Number(r.carry_forward || 0), min_notice_days: Number(r.min_notice_days || 0), doc_after_days: r.doc_after_days === "" || r.doc_after_days == null ? null : Number(r.doc_after_days) })));
            notifyToast("Leave policy saved.");
            return "";
          }}
        />
      )}
      {tab === "expense" && (
        <EditableTable
          title="Expense categories"
          subtitle="Limit applies per expense line. Receipts are always needed where marked, otherwise above the receipt threshold in System settings."
          keyField="code"
          rows={data.expenseCategories}
          newRow={() => ({ code: "", name: "", limit: 1000, receipt_always: true })}
          columns={[
            { key: "code", label: "Code", readOnlyExisting: true, width: 80 },
            { key: "name", label: "Category", width: 220 },
            { key: "limit", label: "Limit (₹)", type: "number" },
            { key: "receipt_always", label: "Receipt always", type: "bool" },
          ]}
          onSave={(rows) => {
            if (rows.some((r) => !r.code || !r.name || !(Number(r.limit) > 0))) return "Each category needs a code, a name and a limit above 0.";
            updateMaster("expenseCategories", rows.map((r) => ({ ...r, code: r.code.toUpperCase(), limit: Number(r.limit) })));
            notifyToast("Expense policy saved.");
            return "";
          }}
        />
      )}
      {tab === "holidays" && (
        <EditableTable
          title="Holiday calendar"
          subtitle="Holidays are excluded from leave days. Floater holidays can be taken with Floater leave."
          keyField="date"
          rows={data.holidays}
          newRow={() => ({ date: "", name: "", type: "holiday" })}
          columns={[
            { key: "date", label: "Date", type: "date", width: 150 },
            { key: "name", label: "Name", width: 200 },
            { key: "type", label: "Type", type: "select", options: [["holiday", "Holiday"], ["floater", "Floater"]] },
          ]}
          onSave={(rows) => {
            if (rows.some((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !r.name)) return "Each holiday needs a date and a name.";
            updateMaster("holidays", [...rows].sort((a, b) => a.date.localeCompare(b.date)));
            notifyToast("Holiday calendar saved.");
            return "";
          }}
        />
      )}
      <FormControlLabel sx={{ display: "none" }} control={<Switch />} label="" />
    </>
  );
}
