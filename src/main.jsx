import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import AppRoutes from "./routes/AppRoutes.jsx";
import { muiTheme } from "./theme/muiTheme.js";
import { AppStoreProvider } from "./store/AppStore.jsx";
import { CountryProvider } from "./country/CountryContext.jsx";

// HashRouter keeps deep links working on GitHub Pages and other static hosts (no server rewrites).
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppStoreProvider>
        <CountryProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </CountryProvider>
      </AppStoreProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
