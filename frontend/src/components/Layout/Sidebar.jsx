import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Clock,
  Camera,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Settings,
  LogOut,
  Activity,
  ChevronRight,
  FolderKanban,
  CalendarCheck,
  CalendarClock,
  Receipt,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/time-tracking', label: 'Time Tracking', icon: Clock, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/projects', label: 'Projects', icon: FolderKanban, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/screenshots', label: 'Screenshots', icon: Camera, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/activity', label: 'Activity', icon: Activity, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/timesheets', label: 'Timesheets', icon: FileText, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/shifts', label: 'Shifts', icon: CalendarClock, roles: ['admin', 'manager', 'hr'] },
  { path: '/team', label: 'Team', icon: Users, roles: ['admin', 'manager', 'hr'] },
  { path: '/leaves', label: 'Leaves', icon: Calendar, roles: ['admin', 'manager', 'employee', 'hr'] },
  { path: '/payroll', label: 'Payroll', icon: DollarSign, roles: ['admin', 'hr'] },
  { path: '/invoices', label: 'Invoices', icon: Receipt, roles: ['admin', 'hr'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'hr'] },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || 'employee')
  );

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="sidebar flex flex-col" data-testid="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-zinc-100 tracking-tight">WorkMonitor</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.path.slice(1)}`}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-zinc-800 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-zinc-700 text-zinc-200 text-sm">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{user?.name}</p>
            <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
