import { lazy } from "react";

export const LOGIN_PATH = "/login";
export const ORGANIZATION_LOGIN_PATH = "/organization/login";
export const LEGACY_PATH_REDIRECTS = [
  { path: "/overview", to: "/home" },
  { path: "/timeoff", to: "/leave" },
  { path: "/pay", to: "/finances" },
];

export const LoginPage = lazy(() => import("../roles/shared/pages/LoginPage.jsx"));
export const AppShell = lazy(() => import("./AppShell.jsx"));
