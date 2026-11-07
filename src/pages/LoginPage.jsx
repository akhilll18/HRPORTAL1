// Multi-role sign-in: credentials + captcha → MFA (Admin) / MFA + security PIN (Super Admin) → forced reset on first login.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  RefreshRounded,
  ShieldRounded,
  LockClockRounded,
  FingerprintRounded,
  VerifiedUserRounded,
  HistoryRounded,
  ArrowBackRounded,
  BadgeRounded,
  AdminPanelSettingsRounded,
  PersonRounded,
} from "@mui/icons-material";
import { useStore, ROLE_HOME } from "../store/AppStore.jsx";
import { APP_CONFIG, DEMO_ACCOUNTS } from "../data/seed.js";
import { makeCaptcha } from "../lib/utils.js";
import { passwordProblems } from "../lib/validation.js";
import { PasswordRules } from "../components/kit/ChangePasswordDialog.jsx";
import { monoFont } from "../theme/muiTheme.js";
import { COMPANY_LOGO } from "../data/companyLogo.js";

const ROLES = [
  { id: "emp", label: "Employee", icon: <PersonRounded fontSize="small" /> },
  { id: "admin", label: "Admin", icon: <BadgeRounded fontSize="small" /> },
  { id: "superadmin", label: "Super Admin", icon: <AdminPanelSettingsRounded fontSize="small" /> },
];

function Captcha({ code, onRefresh }) {
  const glyphs = useMemo(() => [...code].map((c, i) => ({ c, r: ((i * 37 + code.charCodeAt(i)) % 30) - 15, y: ((i * 13) % 7) - 3 })), [code]);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box
        aria-label={`Captcha code ${code.split("").join(" ")}`}
        role="img"
        sx={{
          px: 1.5,
          height: 40,
          minWidth: 132,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          userSelect: "none",
          bgcolor: "sunk.main",
          border: 1,
          borderColor: "divider",
          backgroundImage: "repeating-linear-gradient(120deg, transparent 0 7px, rgba(14,107,88,0.12) 7px 8px)",
        }}
      >
        {glyphs.map((g, i) => (
          <Box key={i} component="span" sx={{ fontFamily: monoFont, fontWeight: 700, fontSize: 20, color: i % 2 ? "primary.main" : "text.primary", transform: `rotate(${g.r}deg) translateY(${g.y}px)`, display: "inline-block" }}>
            {g.c}
          </Box>
        ))}
      </Box>
      <Tooltip title="New code">
        <IconButton onClick={onRefresh} aria-label="Refresh captcha">
          <RefreshRounded />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function OtpCountdown({ expires }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((expires - now) / 1000));
  return (
    <Typography variant="caption" color={left ? "text.secondary" : "error.main"}>
      {left ? `Code expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Code expired"}
    </Typography>
  );
}

export default function LoginPage() {
  const store = useStore();
  const { beginLogin, verifyMfa, completeReset, resendOtp, cancelPending, pending, data, logoutReason, rememberedLogin, fingerprint, empBy, adminBy, session, resetDemo } = store;
  const navigate = useNavigate();

  const [role, setRole] = useState(rememberedLogin?.role || "emp");
  const [loginId, setLoginId] = useState(rememberedLogin?.login_id || "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState(makeCaptcha);
  const [captchaIn, setCaptchaIn] = useState("");
  const [remember, setRemember] = useState(!!rememberedLogin);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [fieldErr, setFieldErr] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (session) navigate(ROLE_HOME[session.role], { replace: true });
  }, [session, navigate]);

  const step = pending?.step || "credentials";

  function switchRole(r) {
    setRole(r);
    setError("");
    setFieldErr({});
    setCode("");
  }

  function fillDemo(acc) {
    switchRole(acc.role);
    setLoginId(acc.login_id);
    setPassword(acc.password);
    setCode(acc.code || "");
    setError("");
  }

  async function submitCredentials(e) {
    e.preventDefault();
    const fe = {};
    if (!loginId.trim()) fe.loginId = "Enter your login ID.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId.trim()) && !/^[a-z0-9._-]{3,}$/i.test(loginId.trim())) fe.loginId = "Enter a valid email or login ID.";
    if (!password) fe.password = "Enter your password.";
    if (role === "emp" && !code.trim()) fe.code = "Enter your employee code.";
    if (role === "admin" && !code.trim()) fe.code = "Enter your admin code.";
    if (!captchaIn.trim()) fe.captcha = "Type the characters shown.";
    else if (captchaIn.trim().toUpperCase() !== captcha) fe.captcha = "The characters do not match. Try the new code.";
    setFieldErr(fe);
    if (Object.keys(fe).length) {
      if (fe.captcha && captchaIn) {
        setCaptcha(makeCaptcha());
        setCaptchaIn("");
      }
      return;
    }
    setBusy(true);
    setError("");
    const r = await beginLogin({ role, login_id: loginId, password, entered_code: code, remember, device_fingerprint: fingerprint });
    setBusy(false);
    setCaptcha(makeCaptcha());
    setCaptchaIn("");
    if (!r.ok) {
      setError(r.error);
      setPassword("");
      return;
    }
    if (r.next === "mfa") setDemoOtp(r.otp);
  }

  async function submitMfa(e) {
    e.preventDefault();
    const fe = {};
    if (!/^\d{6}$/.test(otp.trim())) fe.otp = "Enter the 6-digit code.";
    if (pending.role === "superadmin" && !/^\d{4,6}$/.test(pin)) fe.pin = "Enter your 4–6 digit security PIN.";
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    const r = await verifyMfa({ otp, pin });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      if (r.locked) setOtp("");
      setPin("");
      return;
    }
    setError("");
    setOtp("");
    setPin("");
  }

  async function submitReset(e) {
    e.preventDefault();
    const probs = passwordProblems(newPw, { minLength: data.settings.password_min_length });
    if (probs.length) return setError(`Your new password needs: ${probs.join(", ").toLowerCase()}.`);
    if (newPw !== newPw2) return setError("The two passwords do not match.");
    setBusy(true);
    const r = await completeReset(newPw);
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  function back() {
    cancelPending();
    setError("");
    setOtp("");
    setPin("");
    setNewPw("");
    setNewPw2("");
  }

  const pendingUser = pending ? (pending.role === "emp" ? empBy[pending.code] : pending.role === "admin" ? adminBy[pending.code] : data.superAdmins.find((s) => s.superadmin_code === pending.code)) : null;

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(440px, 520px)" }, bgcolor: "background.default" }}>
      {/* Brand panel */}
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between", p: 6, bgcolor: "sidebar.main", color: "sidebar.contrastText", position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: "radial-gradient(circle at 80% 10%, rgba(76,195,165,0.25), transparent 45%), radial-gradient(circle at 10% 90%, rgba(226,162,58,0.16), transparent 40%)" }} />
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", position: "relative" }}>
          <Box sx={{ height: 40, px: 1, borderRadius: "11px 11px 11px 3px", bgcolor: "#fff", display: "grid", placeItems: "center" }}><Box component="img" src={COMPANY_LOGO} alt="ONAS" sx={{ height: 28, display: "block" }} /></Box>
          <Box>
            <Typography sx={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>{APP_CONFIG.productName}</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.7 }}>{APP_CONFIG.companyName}</Typography>
          </Box>
        </Stack>
        <Box sx={{ position: "relative", maxWidth: 520 }}>
          <Typography sx={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 40, lineHeight: 1.08, color: "#fff", letterSpacing: "-0.02em" }}>Your people workspace: leave, expenses, payroll, contracts and approvals.</Typography>
          <Typography sx={{ mt: 2, opacity: 0.8, fontSize: 15 }}>Employees apply and claim, managers approve their team, HR and Finance give the final decision, and super admins keep the employee master, policies and audit trail in order.</Typography>
          <Stack spacing={1.4} sx={{ mt: 4 }}>
            {[
              [<VerifiedUserRounded key="a" />, "MFA for admins; MFA plus security PIN for super admins"],
              [<LockClockRounded key="b" />, `Account locks after ${data.settings.max_failed_attempts} failed attempts; ${data.settings.session_timeout_min}-minute idle timeout`],
              [<FingerprintRounded key="c" />, "Every sign-in logged with IP, time and device fingerprint"],
              [<HistoryRounded key="d" />, "Every submission, decision and setting change in the audit log"],
            ].map(([icon, t]) => (
              <Stack key={t} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ color: "#4CC3A5", display: "grid", "& svg": { fontSize: 20 } }}>{icon}</Box>
                <Typography sx={{ fontSize: 14 }}>{t}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography sx={{ position: "relative", fontSize: 12, opacity: 0.55 }}>PeopleHub front end · demo data stays in this browser</Typography>
      </Box>

      {/* Form panel */}
      <Stack sx={{ justifyContent: "center", p: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1.2, mb: 2 }}>
          <Box component="img" src={COMPANY_LOGO} alt="ONAS" sx={{ height: 28, display: "block" }} />
          <Typography variant="h2">{APP_CONFIG.productName}</Typography>
        </Box>
        <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {logoutReason && step === "credentials" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {logoutReason}
            </Alert>
          )}

          {step === "credentials" && (
            <Box component="form" onSubmit={submitCredentials} noValidate>
              <Typography variant="h1" sx={{ fontSize: "1.5rem" }}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                Choose how you are signing in.
              </Typography>
              <Tabs value={role} onChange={(_, v) => switchRole(v)} variant="fullWidth" sx={{ mb: 2.5, minHeight: 40, bgcolor: "sunk.main", borderRadius: 2, p: 0.5, "& .MuiTabs-indicator": { display: "none" } }}>
                {ROLES.map((r) => (
                  <Tab key={r.id} value={r.id} label={r.label} icon={r.icon} iconPosition="start" sx={{ minHeight: 36, borderRadius: 1.5, fontSize: 13, "&.Mui-selected": { bgcolor: "background.paper", boxShadow: 1 } }} />
                ))}
              </Tabs>
              <input type="hidden" name="role" value={role} />
              <input type="hidden" name="device_fingerprint" value={fingerprint} />
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Stack spacing={2}>
                <TextField label="Login ID (work email)" required value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" error={!!fieldErr.loginId} helperText={fieldErr.loginId} slotProps={{ htmlInput: { maxLength: 120 } }} />
                {role !== "superadmin" && (
                  <TextField
                    label={role === "emp" ? "Employee code" : "Admin code"}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={role === "emp" ? "e.g. EMP001" : "e.g. ADM01"}
                    error={!!fieldErr.code}
                    helperText={fieldErr.code || (role === "emp" ? "As in the HR master. Your department is fetched from it after sign-in." : "Your org unit scope is loaded after sign-in.")} slotProps={{ htmlInput: { maxLength: 12, style: { fontFamily: monoFont } } }} />
                )}
                <TextField
                  label="Password"
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock"))}
                  autoComplete="current-password"
                  error={!!fieldErr.password}
                  helperText={fieldErr.password || (caps ? "Caps Lock is on" : " ")}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPw((v) => !v)} edge="end" aria-label={showPw ? "Hide password" : "Show password"} size="small">
                            {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.6 }}>
                    Security check
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ alignItems: { sm: "flex-start" } }}>
                    <Captcha code={captcha} onRefresh={() => setCaptcha(makeCaptcha())} />
                    <TextField label="Type the characters" required value={captchaIn} onChange={(e) => setCaptchaIn(e.target.value)} error={!!fieldErr.captcha} helperText={fieldErr.captcha} slotProps={{ htmlInput: { maxLength: 5, autoCapitalize: "characters", style: { fontFamily: monoFont, letterSpacing: 2 } } }} />
                  </Stack>
                </Box>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <FormControlLabel control={<Checkbox size="small" checked={remember} onChange={(e) => setRemember(e.target.checked)} />} label={<Typography variant="body2">Remember me on this device</Typography>} />
                  <Tooltip title="Ask your Super Admin to reset your password. You will set a new one at your next sign-in.">
                    <Link component="button" type="button" variant="body2" underline="hover">
                      Forgot password?
                    </Link>
                  </Tooltip>
                </Stack>
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  {busy ? "Checking…" : "Continue"}
                </Button>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", color: "text.secondary" }}>
                  <FingerprintRounded sx={{ fontSize: 15 }} />
                  <Typography variant="caption">
                    Device <Box component="span" sx={{ fontFamily: monoFont }}>{fingerprint}</Box> is recorded with this sign-in.
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          {step === "mfa" && (
            <Box component="form" onSubmit={submitMfa} noValidate>
              <Button startIcon={<ArrowBackRounded />} size="small" color="inherit" onClick={back} sx={{ mb: 1, ml: -1 }}>
                Back
              </Button>
              <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
                <ShieldRounded color="primary" />
                <Typography variant="h1" sx={{ fontSize: "1.4rem" }}>
                  {pending.role === "superadmin" ? "Two-factor check" : "Verify it's you"}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, mb: 2 }}>
                {pendingUser?.full_name}, enter the 6-digit code from your authenticator app{pending.role === "superadmin" ? " and your security PIN" : ""}.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Demo authenticator code: <b style={{ fontFamily: monoFont, letterSpacing: 2 }}>{pending.otp || demoOtp}</b>
              </Alert>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Stack spacing={2}>
                <TextField
                  label="One-time code (MFA)"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="one-time-code"
                  autoFocus
                  error={!!fieldErr.otp}
                  helperText={fieldErr.otp || <OtpCountdown expires={pending.otp_expires} />} slotProps={{ htmlInput: { inputMode: "numeric", style: { fontFamily: monoFont, letterSpacing: 6, fontSize: 18 } } }} />
                {pending.role === "superadmin" && (
                  <TextField label="Security PIN" required type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} error={!!fieldErr.pin} helperText={fieldErr.pin || "4–6 digits. Failed PINs count toward the lockout limit."} slotProps={{ htmlInput: { inputMode: "numeric", style: { letterSpacing: 6 } } }} />
                )}
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  {busy ? "Verifying…" : "Verify and sign in"}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const o = resendOtp();
                    setDemoOtp(o);
                    setError("");
                  }}
                >
                  Send a new code
                </Button>
              </Stack>
            </Box>
          )}

          {step === "reset" && (
            <Box component="form" onSubmit={submitReset} noValidate>
              <Button startIcon={<ArrowBackRounded />} size="small" color="inherit" onClick={back} sx={{ mb: 1, ml: -1 }}>
                Cancel
              </Button>
              <Typography variant="h1" sx={{ fontSize: "1.4rem" }}>
                Set your password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, mb: 2 }}>
                Welcome, {pendingUser?.full_name}. This is your first sign-in (or your password was reset), so choose a new password before continuing.
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Stack spacing={2}>
                <TextField label="New password" type="password" required value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" autoFocus />
                <PasswordRules value={newPw} minLength={data.settings.password_min_length} />
                <TextField label="Confirm new password" type="password" required value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" error={!!newPw2 && newPw !== newPw2} helperText={newPw2 && newPw !== newPw2 ? "Passwords do not match" : " "} />
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  Save password and sign in
                </Button>
              </Stack>
            </Box>
          )}
        </Card>

        {step === "credentials" && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Demo accounts · click to fill
              </Typography>
            </Divider>
            <Stack direction="row" useFlexGap spacing={0.8} sx={{ flexWrap: "wrap" }}>
              {DEMO_ACCOUNTS.map((a) => (
                <Tooltip key={a.login_id} title={`${a.login_id} · ${a.password}${a.pin ? ` · PIN ${a.pin}` : ""} — ${a.note}`}>
                  <Chip label={`${a.label}: ${a.login_id.split("@")[0]}`} onClick={() => fillDemo(a)} variant={a.role === role ? "filled" : "outlined"} size="small" color={a.role === role ? "primary" : "default"} />
                </Tooltip>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
              Passwords: <b>Points@2026</b> (first-login accounts: <b>Welcome@123</b>). The captcha still needs typing.{" "}
              {confirmReset ? (
                <Link
                  component="button"
                  type="button"
                  color="error"
                  onClick={() => {
                    resetDemo();
                    setConfirmReset(false);
                    setError("");
                  }}
                >
                  Click again to erase all changes
                </Link>
              ) : (
                <Link
                  component="button"
                  type="button"
                  onClick={() => {
                    setConfirmReset(true);
                    setTimeout(() => setConfirmReset(false), 4000);
                  }}
                >
                  Reset demo data
                </Link>
              )}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
