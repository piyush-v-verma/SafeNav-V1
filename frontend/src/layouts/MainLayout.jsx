import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';

/**
 * Main Application Shell Layout
 * Integrates the responsive Navigation system:
 * - Desktop/Tablet: Fixed left vertical sidebar (~80px wide)
 * - Mobile Portrait: Fixed bottom navigation bar (4 horizontal items)
 * The main content (especially the Map) fills all remaining screen space.
 */
export default function MainLayout() {
  return (
    <div className="safenav-app-shell">
      <Navigation />
      <main className="safenav-main-content">
        <Outlet />
      </main>
    </div>
  );
}
