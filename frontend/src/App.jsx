import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import MakerDashboard from './pages/MakerDashboard';
import CheckerDashboard from './pages/CheckerDashboard';
import EmployeeDetail from './pages/EmployeeDetail';
import Profile from './pages/Profile';

// Route Guard: requires authenticated user with specific role
function ProtectedRoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ fontWeight: 600, color: '#64748b' }}>Loading Petty Expense System...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRedirectMap = {
      'ADMIN': '/admin',
      'MAKER': '/maker',
      'CHECKER': '/checker',
    };
    return <Navigate to={roleRedirectMap[user.role] || '/login'} replace />;
  }

  return children;
}

// Root redirect based on role
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleRedirectMap = {
    'ADMIN': '/admin',
    'MAKER': '/maker',
    'CHECKER': '/checker',
  };

  return <Navigate to={roleRedirectMap[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Login & Password Reset Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Legacy /superadmin Redirect to /admin */}
          <Route path="/superadmin" element={<Navigate to="/admin" replace />} />
          <Route path="/superadmin/*" element={<Navigate to="/admin" replace />} />

          {/* Employee Detail Route (Accessible by Admin and Checker) */}
          <Route
            path="/admin/employees/:id"
            element={
              <ProtectedRoleRoute allowedRoles={['ADMIN', 'CHECKER']}>
                <AppLayout />
              </ProtectedRoleRoute>
            }
          >
            <Route index element={<EmployeeDetail />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoleRoute allowedRoles={['ADMIN']}>
                <AppLayout />
              </ProtectedRoleRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<Navigate to="/admin?tab=employees" replace />} />
          </Route>

          {/* Maker Routes */}
          <Route
            path="/maker"
            element={
              <ProtectedRoleRoute allowedRoles={['MAKER']}>
                <AppLayout />
              </ProtectedRoleRoute>
            }
          >
            <Route index element={<MakerDashboard />} />
          </Route>

          {/* Checker Routes */}
          <Route
            path="/checker"
            element={
              <ProtectedRoleRoute allowedRoles={['CHECKER']}>
                <AppLayout />
              </ProtectedRoleRoute>
            }
          >
            <Route index element={<CheckerDashboard />} />
          </Route>

          {/* Shared Profile Route (All Roles) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoleRoute allowedRoles={['ADMIN', 'MAKER', 'CHECKER']}>
                <AppLayout />
              </ProtectedRoleRoute>
            }
          >
            <Route index element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfirmProvider>
  </AuthProvider>
  );
}
