import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import TimeTracking from "./pages/TimeTracking";
import Screenshots from "./pages/Screenshots";
import ActivityPage from "./pages/Activity";
import Timesheets from "./pages/Timesheets";
import Team from "./pages/Team";
import Leaves from "./pages/Leaves";
import Payroll from "./pages/Payroll";
import Settings from "./pages/Settings";
import Projects from "./pages/Projects";
import Attendance from "./pages/Attendance";
import Shifts from "./pages/Shifts";
import Invoices from "./pages/Invoices";

// Router component that handles session_id detection
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id (synchronous, before first render)
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes with dashboard layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <WebSocketProvider>
              <DashboardLayout />
            </WebSocketProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="time-tracking" element={<TimeTracking />} />
        <Route path="screenshots" element={<Screenshots />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="timesheets" element={<Timesheets />} />
        <Route path="team" element={<Team />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
