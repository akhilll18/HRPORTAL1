// Field reference (data dictionary) for the employee master, in the shape of the Sahayog field reference.
import React, { useState } from "react";
import { Box, Button, Chip, InputAdornment, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { DownloadRounded, SearchRounded } from "@mui/icons-material";
import { PageHeader, SectionCard, Mono, TableWrap, Tag, Grid, StatCard } from "../../components/kit/UI.jsx";
import { EMPLOYEE_SECTIONS, ALL_FIELDS, WORKER_TYPES, WORKER_TYPE_BY } from "../../data/employeeFields.js";

const appliesTo = (f, s) => { const w = f.workers || s?.workers; return !w ? "All worker types" : w.length === WORKER_TYPES.length - 1 && !w.includes("permanent") ? "All contingent workers" : w.map((x) => WORKER_TYPE_BY[x]?.short).join(", "); };
const requiredFor = (f) => (f.requiredFor ? f.requiredFor.map((x) => WORKER_TYPE_BY[x]?.short).join(", ") : f.required ? "Yes" : "");
import { downloadCsv } from "../../lib/utils.js";

const WHO = { super: "Super Admin", admin: "HR admin", self: "Employee" };

export default function FieldReference() {
  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [selfOnly, setSelfOnly] = useState(false);
  const match = (f) => (!selfOnly || f.editableBy.includes("self")) && (!q || [f.key, f.label, f.rule, f.control].join(" ").toLowerCase().includes(q.toLowerCase()));
  const sections = EMPLOYEE_SECTIONS.filter((s) => sec === "all" || s.id === sec).map((s) => ({ ...s, fields: s.fields.filter(match) })).filter((s) => s.fields.length);
  return (
    <>
      <PageHeader
        eyebrow="SUPER ADMIN · DATA DICTIONARY"
        title="Field reference"
        subtitle="Every employee-master field: API name, label, type, control, validation, which worker types it applies to and who may edit it. The employee form and profile are built from this list — the worker type (permanent, contract, freelance …) decides which fields appear."
        actions={<Button variant="outlined" startIcon={<DownloadRounded />} onClick={() => downloadCsv("employee-field-reference.csv", ["Section", "Source", "Field name", "UI label", "Data type", "Input control", "Required", "Applies to", "Validation", "Editable by"], ALL_FIELDS.map((f) => [f.section, f.source, `employee.${f.key}`, f.label, f.type, f.control, requiredFor(f), appliesTo(f, EMPLOYEE_SECTIONS.find((x) => x.title === f.section)), f.rule, f.editableBy.map((w) => WHO[w]).join(", ") || "System"]))}>Export for Excel</Button>}
      />
      <Stack spacing={2.5}>
        <Grid min={160}>
          <StatCard label="Sections" value={EMPLOYEE_SECTIONS.length} />
          <StatCard label="Fields" value={ALL_FIELDS.length} tone="info" />
          <StatCard label="Required" value={ALL_FIELDS.filter((f) => f.required).length} tone="bad" />
          <StatCard label="Employee-editable" value={ALL_FIELDS.filter((f) => f.editableBy.includes("self")).length} tone="good" />
        </Grid>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} sx={{ alignItems: { md: "center" } }}>
          <TextField placeholder="Search fields, labels or rules (e.g. date, PAN, IFSC)" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: { md: 360 }, background: "#fff" }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
          <Stack direction="row" spacing={0.6} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip size="small" label="All" color={sec === "all" ? "primary" : "default"} onClick={() => setSec("all")} />
            {EMPLOYEE_SECTIONS.map((s) => <Chip key={s.id} size="small" label={s.title} color={sec === s.id ? "primary" : "default"} variant={sec === s.id ? "filled" : "outlined"} onClick={() => setSec(s.id)} />)}
            <Chip size="small" label="Employee-editable only" color={selfOnly ? "secondary" : "default"} variant={selfOnly ? "filled" : "outlined"} onClick={() => setSelfOnly((v) => !v)} />
          </Stack>
        </Stack>
        {sections.map((s) => (
          <SectionCard key={s.id} title={s.title} subtitle={s.source} noPad>
            <TableWrap>
              <Table size="small" sx={{ minWidth: 1000, tableLayout: "fixed" }}>
                <TableHead><TableRow><TableCell sx={{ width: "18%" }}>Field name</TableCell><TableCell sx={{ width: "14%" }}>UI label</TableCell><TableCell sx={{ width: "9%" }}>Data type</TableCell><TableCell sx={{ width: "12%" }}>Input control</TableCell><TableCell sx={{ width: "22%" }}>Validation</TableCell><TableCell sx={{ width: "12%" }}>Applies to</TableCell><TableCell sx={{ width: "13%" }}>Editable by</TableCell></TableRow></TableHead>
                <TableBody>
                  {s.fields.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell><Mono sx={{ overflowWrap: "anywhere" }}>employee.{f.key}</Mono></TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{f.label}</TableCell>
                      <TableCell>{f.type}</TableCell>
                      <TableCell><Tag tone={f.editableBy.length ? "info" : "neutral"}>{f.control}</Tag></TableCell>
                      <TableCell>{(f.required || f.requiredFor) && <Box component="span" sx={{ color: "#b66868", fontWeight: 700, mr: 0.5 }}>{f.requiredFor ? `Required for ${requiredFor(f)}.` : "Required."}</Box>}{f.rule}</TableCell>
                      <TableCell><Tag tone={f.workers || s.workers ? "accent" : "neutral"}>{appliesTo(f, s)}</Tag></TableCell>
                      <TableCell>{f.editableBy.length ? f.editableBy.map((w) => WHO[w]).join(", ") : <Typography component="span" sx={{ fontSize: "0.6rem", color: "#78827b" }}>System</Typography>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          </SectionCard>
        ))}
      </Stack>
    </>
  );
}
