import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '../ui/sonner';

export const DashboardLayout = () => {
  return (
    <div className="dashboard-layout" data-testid="dashboard-layout">
      <Sidebar />
      <main className="main-content scrollbar-thin">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};
