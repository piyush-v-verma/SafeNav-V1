import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from '../../shared/toast/ToastProvider';
import './App.css';

export default function App() {
  return (
    <ToastProvider app="citizen">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}
