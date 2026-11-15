import React from 'react';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminRoutes from './routes/AdminRoutes';

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}
