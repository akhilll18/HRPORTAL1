import React, { Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ROLE_HOME, useStore } from "../store/AppStore.jsx";
import { navFor } from "../data/roleNav.js";
import { APP_ROUTE_PATHS, ROLE_ROUTES, roleForUser } from "./roleRoutes.js";
import { AppShell, LEGACY_PATH_REDIRECTS, LOGIN_PATH, LoginPage, ORGANIZATION_LOGIN_PATH } from "./routeConfig.js";

function ProtectedRoute({ children }) {
  const { session, user } = useStore();
  if (!session || !user) return <Navigate to={LOGIN_PATH} replace />;
  return children;
}

function HomeRedirect() {
  const { session } = useStore();
  return <Navigate to={ROLE_HOME[session.role]} replace />;
}

function LegacyPathRedirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

function RoleScreenRoute({ path }) {
  const { user, data, reportsOf } = useStore();
  const role = roleForUser(user);
  const isManager = user.role === "emp" && reportsOf(user.employee_code).length > 0;
  const visible = new Set(navFor(user.role, isManager, { user, data }).flatMap((group) => group.items.flatMap((item) => [item.id, ...(item.alias || [])])));
  const routeId = path.slice(1);
  const alwaysAvailable = path === "/calendar";

  if (!ROLE_ROUTES[role]?.includes(path) || (!visible.has(routeId) && !alwaysAvailable)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <AppShell />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path={LOGIN_PATH} element={<LoginPage />} />
        <Route path={ORGANIZATION_LOGIN_PATH} element={<Navigate to={LOGIN_PATH} replace />} />
        <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
        {LEGACY_PATH_REDIRECTS.map(({ path, to }) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedRoute><LegacyPathRedirect to={to} /></ProtectedRoute>}
          />
        ))}
        {APP_ROUTE_PATHS.map((path) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedRoute><RoleScreenRoute path={path} /></ProtectedRoute>}
          />
        ))}
        <Route path="*" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  );
}
