import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DesktopGuard from '../components/DesktopGuard';
import AdminLayout from '../layouts/AdminLayout';
import AdminLoginPage from '../pages/AdminLoginPage';
import DashboardPage from '../pages/DashboardPage';
import ReportsManagementPage from '../pages/ReportsManagementPage';
import UsersManagementPage from '../pages/UsersManagementPage';
import AdminProfilePage from '../pages/AdminProfilePage';
import AdminProtectedRoute from './AdminProtectedRoute';

export default function AdminRoutes() {
  return (
    <DesktopGuard>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />

          <Route
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportsManagementPage />} />
            <Route path="/users" element={<UsersManagementPage />} />
            <Route path="/profile" element={<AdminProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DesktopGuard>
  );
}
