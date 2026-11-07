import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
    primary: { main: "#27614e", dark: "#1e493a", light: "#e8f2ec" },
    secondary: { main: "#d77654" },
    success: { main: "#4a8256" },
    warning: { main: "#c87850" },
    info: { main: "#5689b3" },
    error: { main: "#b66868" },
    background: { default: "#f5f7f4", paper: "#ffffff" },
    text: { primary: "#202922", secondary: "#78827b" },
    divider: "#e7ebe6",
    // Tones used by the approvals, points and HR modules (light theme, matches PeopleHub greens)
    sunk: { main: "#f3f6f2", contrastText: "#202922" },
    goodSoft: { main: "#e9f3eb", contrastText: "#3f7a50" },
    warnSoft: { main: "#fcf1e6", contrastText: "#a5622f" },
    badSoft: { main: "#f8e9e9", contrastText: "#a24f4f" },
    infoSoft: { main: "#eaf1f8", contrastText: "#46719a" },
    accentSoft: { main: "#e8f2ec", contrastText: "#1e493a" },
    neutralSoft: { main: "#f1f3f0", contrastText: "#66716a" },
    sidebar: { main: "#1e493a", contrastText: "#dcebe2" },
  },
  typography: {
    fontFamily: "'DM Sans', 'Avenir Next', sans-serif",
    h1: { fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.55rem", letterSpacing: "-0.01em" },
    h2: { fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1rem" },
    h3: { fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "0.75rem" },
    h4: { fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: "1.4rem" },
    body1: { fontSize: "0.75rem" },
    body2: { fontSize: "0.65rem" },
    caption: { fontSize: "0.6rem", color: "#8a948d" },
    overline: { fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.09em", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600, fontSize: "0.7rem" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f5f7f4",
          color: "#202922",
          fontFamily: "'DM Sans', 'Avenir Next', sans-serif",
          WebkitFontSmoothing: "antialiased",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 34, paddingInline: 14, borderRadius: 6 },
        sizeSmall: { minHeight: 30, fontSize: "0.65rem" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "1px solid #e5eae5", borderRadius: 8, boxShadow: "0 1px 2px rgba(30,46,34,0.02)" },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.6px", color: "#919b94", background: "#fbfcfa", borderBottom: "1px solid #edf0ec", height: 37, padding: "0 14px" },
        body: { fontSize: "0.65rem", color: "#58635b", borderBottom: "1px solid #f0f2ef", height: 57, padding: "7px 14px" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontSize: "0.6rem", fontWeight: 600, height: 22, borderRadius: 99 },
        label: { paddingInline: 8 },
      },
    },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { fontSize: "0.7rem", borderRadius: 6, backgroundColor: "#fff" },
        input: { padding: "8px 10px" },
      },
    },
  },
});
export const monoFont = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
