import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage.jsx";
import PeopleHubApp from "../PeopleHubApp.jsx";
import { useStore } from "../store/AppStore.jsx";

// Session comes from the store (role-based sign-in with MFA, lockout and idle timeout).
function ProtectedRoute({ children }) {
  const { session, user } = useStore();
  if (!session || !user) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/organization/login" element={<Navigate to="/login" replace />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <PeopleHubApp />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
