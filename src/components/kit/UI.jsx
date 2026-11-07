// Shared building blocks used across all three role views.
import React, { useEffect } from "react";
import {
  Avatar as MuiAvatar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import { InfoOutlined, WarningAmberRounded, FlagRounded } from "@mui/icons-material";
import { initials } from "../../lib/utils.js";
import { monoFont } from "../../theme/muiTheme.js";
import { useStore } from "../../store/AppStore.jsx";
import { AI_GRADIENT, Sparkle, openCopilot } from "../ai/AiText.jsx";

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "flex-end" }, mb: 2.5 }}>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography variant="overline" sx={{ color: "primary.main", fontFamily: monoFont }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "72ch" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Tooltip title="Generative AI summary of everything on this page">
          <Button
            data-ai-ui
            variant="outlined"
            startIcon={<Sparkle size={15} />}
            onClick={() => openCopilot(`Summarise the "${typeof title === "string" ? title : "current"}" page for me in a few bullets and tell me what needs my attention.`)}
            sx={{ borderColor: "#cfe0d5", color: "#27614e", background: "linear-gradient(135deg, rgba(39,97,78,0.06), rgba(199,123,28,0.06))", "&:hover": { borderColor: "#2E8C7A", background: "rgba(46,140,122,0.08)" }, "& .MuiButton-startIcon": { color: "transparent", background: AI_GRADIENT, borderRadius: "5px", p: "1px" }, "& .MuiButton-startIcon svg": { color: "#fff" } }}
          >
            AI summary
          </Button>
        </Tooltip>
        {actions}
      </Stack>
    </Stack>
  );
}

const TONES = {
  good: "goodSoft",
  warn: "warnSoft",
  bad: "badSoft",
  info: "infoSoft",
  accent: "accentSoft",
  neutral: "neutralSoft",
};

export function StatCard({ label, value, hint, tone = "accent", icon, onClick }) {
  const t = TONES[tone];
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color .15s",
        "&:hover": onClick ? { borderColor: "primary.main" } : undefined,
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        {icon && (
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: `${t}.main`, color: `${t}.contrastText`, "& svg": { fontSize: 18 } }}>
            {icon}
          </Box>
        )}
      </Stack>
      <Typography variant="h4">{value}</Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Card>
  );
}

const STATUS_TONE = {
  Draft: "neutral",
  Pending: "info",
  "Manager Approved": "info",
  Paid: "good",
  Disbursed: "good",
  Cancelled: "neutral",
  approved: "good",
  rejected_step: "bad",
  pending: "warn",
  waiting: "neutral",
  skipped: "neutral",
  Submitted: "info",
  "Under Review": "info",
  "On Hold": "warn",
  Escalated: "warn",
  Approved: "good",
  Credited: "good",
  Rejected: "bad",
  Withdrawn: "neutral",
  active: "good",
  locked: "bad",
  suspended: "warn",
  pending_approval: "info",
  rejected: "bad",
  enabled: "good",
  pending_setup: "warn",
  credit: "good",
  redeem: "info",
  adjust: "warn",
};

const STATUS_TEXT = { pending_approval: "Pending approval", pending_setup: "Setup pending", active: "Active", locked: "Locked", suspended: "Suspended", rejected: "Declined", enabled: "Enabled", credit: "Credit", redeem: "Redeemed", adjust: "Adjustment" };

export function StatusChip({ status, size = "small" }) {
  const t = TONES[STATUS_TONE[status] || "neutral"];
  return <Chip size={size} label={STATUS_TEXT[status] || status} sx={{ bgcolor: `${t}.main`, color: `${t}.contrastText`, height: 22, fontSize: "0.72rem" }} />;
}

export function Tag({ children, tone = "neutral", sx }) {
  const t = TONES[tone];
  return <Chip size="small" label={children} sx={{ bgcolor: `${t}.main`, color: `${t}.contrastText`, height: 20, fontSize: "0.68rem", ...sx }} />;
}

export function SectionCard({ title, subtitle, action, children, noPad, sx }) {
  return (
    <Card sx={{ ...sx }}>
      {(title || action) && (
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h3">{title}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ p: noPad ? 0 : 2 }}>{children}</Box>
    </Card>
  );
}

export function EmptyState({ title, text, action, icon }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center", py: 5, px: 2, textAlign: "center" }}>
      {icon && <Box sx={{ color: "text.secondary", "& svg": { fontSize: 40 } }}>{icon}</Box>}
      <Typography variant="h3">{title}</Typography>
      {text && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {text}
        </Typography>
      )}
      {action}
    </Stack>
  );
}

const AVATAR_BG = ["#0E6B58", "#2C4B8F", "#8A5200", "#7B3F8C", "#1D7A42", "#B0291F", "#3D6B7A"];
export function Avatar({ name, size = 32, src }) {
  const idx = [...(name || "?")].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_BG.length;
  return (
    <MuiAvatar src={src || undefined} sx={{ width: size, height: size, fontSize: size * 0.38, fontWeight: 700, bgcolor: AVATAR_BG[idx], color: "#fff" }}>
      {initials(name)}
    </MuiAvatar>
  );
}

export function PersonCell({ name, sub, src }) {
  return (
    <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", minWidth: 0 }}>
      <Avatar name={name} size={28} src={src} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {sub}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export function Mono({ children, sx }) {
  return (
    <Box component="span" sx={{ fontFamily: monoFont, fontSize: "0.75rem", ...sx }}>
      {children}
    </Box>
  );
}

export function FlagList({ flags = [], flagged, dense }) {
  if (!flags.length && !flagged) return null;
  return (
    <Stack spacing={0.75}>
      {flagged && (
        <Alert severity="error" icon={<FlagRounded fontSize="small" />} sx={{ py: dense ? 0 : 0.5 }}>
          Flagged as suspicious by {flagged.by}: {flagged.reason}
        </Alert>
      )}
      {flags.map((f) => (
        <Alert key={f.code} severity={f.level === "warn" ? "warning" : "info"} icon={f.level === "warn" ? <WarningAmberRounded fontSize="small" /> : <InfoOutlined fontSize="small" />} sx={{ py: dense ? 0 : 0.25 }}>
          {f.text}
        </Alert>
      ))}
    </Stack>
  );
}

export function FlagIcons({ s }) {
  const warn = s.flags?.filter((f) => f.level === "warn") || [];
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      {s.flagged && (
        <Tooltip title={`Flagged: ${s.flagged.reason}`}>
          <FlagRounded sx={{ fontSize: 16, color: "error.main" }} />
        </Tooltip>
      )}
      {warn.length > 0 && (
        <Tooltip title={warn.map((f) => f.text).join(" · ")}>
          <WarningAmberRounded sx={{ fontSize: 16, color: "warning.main" }} />
        </Tooltip>
      )}
    </Stack>
  );
}

export function KeyVal({ items, cols = 2 }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: `repeat(${cols}, minmax(0,1fr))` }, gap: 1.5 }}>
      {items.filter(Boolean).map(([k, v, opts = {}]) => (
        <Box key={k} sx={{ minWidth: 0, gridColumn: opts.full ? "1 / -1" : undefined }}>
          <Typography variant="caption" color="text.secondary" component="div">
            {k}
            {opts.required && <Box component="span" sx={{ color: "error.main", ml: 0.3 }}>*</Box>}
          </Typography>
          <Typography variant="body2" component="div" sx={{ overflowWrap: "anywhere", whiteSpace: opts.pre ? "pre-wrap" : undefined }}>
            {v === "" || v == null ? "—" : v}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// Plain bar chart (one or two series) with labelled values; no chart library needed.
export function BarChart({ data, series, height = 160, format = (v) => v }) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)));
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        {series.map((s) => (
          <Stack key={s.key} direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: s.color }} />
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end", height, borderBottom: 1, borderColor: "divider" }}>
        {data.map((d) => (
          <Stack key={d.label} direction="row" spacing={0.4} sx={{ justifyContent: "center", alignItems: "flex-end", flex: 1, height: "100%" }}>
            {series.map((s) => (
              <Tooltip key={s.key} title={`${d.label} · ${s.label}: ${format(d[s.key] || 0)}`}>
                <Box sx={{ width: "100%", maxWidth: 22, height: `${((d[s.key] || 0) / max) * 100}%`, minHeight: d[s.key] ? 3 : 0, bgcolor: s.color, borderRadius: "4px 4px 0 0" }} />
              </Tooltip>
            ))}
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        {data.map((d) => (
          <Typography key={d.label} variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: "center" }}>
            {d.label}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export function HBar({ label, value, max, color = "primary.main", right }) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.4 }}>
        <Typography variant="body2" noWrap sx={{ pr: 1 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {right ?? value}
        </Typography>
      </Stack>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: "sunk.main", overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, bgcolor: color, borderRadius: 4 }} />
      </Box>
    </Box>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel = "Confirm", tone = "primary", onConfirm, onClose, children, disabled }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: "inherit", fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        {text && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: children ? 2 : 0 }}>
            {text}
          </Typography>
        )}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" color={tone} onClick={onConfirm} disabled={disabled}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ToastHost() {
  const { toast, setToast } = useStore();
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  return (
    <Snackbar open={!!toast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} onClose={() => setToast(null)}>
      {toast ? (
        <Alert severity={toast.tone} variant="filled" onClose={() => setToast(null)} sx={{ maxWidth: 440 }}>
          {toast.text}
        </Alert>
      ) : (
        <span />
      )}
    </Snackbar>
  );
}

export function Grid({ min = 220, gap = 2, children, sx }) {
  return <Box sx={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap, ...sx }}>{children}</Box>;
}

export function TableWrap({ children }) {
  return <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</Box>;
}
