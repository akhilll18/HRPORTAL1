// Renders one employee-master field (from data/employeeFields.js) as the right control.
import React from "react";
import { FormControl, FormHelperText, InputAdornment, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { REGIONS, COUNTRIES, isRequired, RATE_UNIT } from "../../data/employeeFields.js";

const SYMBOL = { INR: "₹", GBP: "£", USD: "$", EUR: "€", AED: "AED", SGD: "S$" };
export const currencySymbol = (rec) => { const c = COUNTRIES.find((x) => x.code === (rec?.country_code || "IN"))?.currency || "INR"; return SYMBOL[c] || c; };

export function fieldOptions(f, rec, { orgUnits, employees, geofences = [], vendors = [], companies = [], locations = [] }) {
  if (f.options === "companies") return [["", "Choose a company"], ...companies.filter((c) => c.status !== "inactive" || c.company_id === rec.company_id).map((c) => [c.company_id, `${c.short} · ${c.name}`])];
  if (f.options === "locations") return [["", "Choose a location"], ...locations.filter((l) => (!rec.company_id || l.company_id === rec.company_id) && (l.status !== "inactive" || l.location_id === rec.location_id)).map((l) => [l.location_id, `${l.name}${l.city ? ` · ${l.city}` : ""}`])];
  if (f.options === "vendors") return [["", "Choose a vendor"], ...vendors.filter((v) => v.status !== "inactive").map((v) => [v.id, `${v.name} · markup ${v.markup_pct}%`])];
  if (f.options === "geofences") return geofences.map((g) => [g.id, g.name]);
  if (f.options === "departments") return orgUnits.map((o) => [o.org_unit_id, o.name]);
  if (f.options === "managers") return [["", "No manager"], ...employees.filter((e) => e.employee_code !== rec.employee_code && e.status === "active").map((e) => [e.employee_code, `${e.full_name} (${e.employee_code})`])];
  if (f.options === "regions") return REGIONS[rec.country_code || "IN"] || [];
  return f.options || [];
}

export default function FieldInput({ f, value, onChange, disabled, error, ctx, rec }) {
  const label = `${f.label}${isRequired(f, rec || {}) ? " *" : ""}`;
  if (f.type === "select") {
    const opts = fieldOptions(f, rec, ctx);
    const v = value == null ? "" : String(value);
    return (
      <FormControl size="small" fullWidth disabled={disabled} error={!!error}>
        <InputLabel>{label}</InputLabel>
        <Select label={label} value={opts.some(([o]) => String(o) === v) ? v : ""} onChange={(e) => onChange(e.target.value)}>
          {opts.map(([o, l]) => (
            <MenuItem key={o} value={String(o)}>{l}</MenuItem>
          ))}
        </Select>
        <FormHelperText>{error || " "}</FormHelperText>
      </FormControl>
    );
  }
  return (
    <TextField
      label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(f.type === "number" ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
      type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
      multiline={f.type === "textarea"}
      minRows={f.type === "textarea" ? 2 : undefined}
      error={!!error}
      helperText={error || " "}
      slotProps={{
        inputLabel: f.type === "date" ? { shrink: true } : undefined,
        input: f.key === "monthly_gross" || f.key === "recruitment_cost" || f.key === "pay_rate"
          ? { startAdornment: <InputAdornment position="start">{f.key === "recruitment_cost" ? "₹" : currencySymbol(rec)}</InputAdornment>, endAdornment: f.key === "pay_rate" && rec?.pay_basis ? <InputAdornment position="end">{RATE_UNIT[rec.pay_basis]}</InputAdornment> : undefined }
          : undefined,
        htmlInput: { maxLength: f.max || undefined, inputMode: f.type === "number" ? "decimal" : f.type === "tel" ? "tel" : undefined },
      }}
    />
  );
}
