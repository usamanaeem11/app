# WorkMonitor - Employee Time Tracking & Monitoring Software

## Overview
WorkMonitor is a comprehensive employee monitoring and time-tracking SaaS platform similar to Hubstaff, Time Doctor, and WebWork. It provides real-time workforce monitoring, productivity tracking, and HRMS features.

## Original Problem Statement
Build a multi-platform workforce monitoring system that tracks employee time, productivity, and activity across various platforms with silent background tracking, automatic screenshots, productivity insights, and enterprise-grade security.

## User Personas
1. **Admin/Company Owner**: Creates company, manages team, views all reports, configures policies
2. **Manager**: Reviews team activity, approves timesheets/leaves, monitors productivity
3. **HR**: Manages employees, processes payroll, handles leave requests
4. **Employee**: Tracks time, views own activity, requests leaves

## Core Requirements (Static)
- Time tracking with start/stop timer
- Automatic screenshots capture (configurable interval)
- Activity monitoring (apps, URLs, activity level)
- Timesheet generation and approval workflow
- Leave management system
- Payroll calculation and export
- Real-time dashboard with WebSocket updates
- Role-based access control (Admin, Manager, HR, Employee)
- Email/Password + Google OAuth authentication
- Project/Task management
- Attendance tracking with clock in/out
- Shift scheduling
- Invoice generation

## What's Been Implemented

### Phase 1 (December 27, 2025) - MVP
- [x] User authentication (JWT + Emergent Google OAuth)
- [x] Company management with tracking policies
- [x] Time entry CRUD with active tracking
- [x] Screenshot management API (MOCKED - demo data)
- [x] Activity logs API (MOCKED - demo data)
- [x] Timesheet generation and approval
- [x] Leave request management
- [x] Basic payroll generation and processing
- [x] Dashboard statistics API
- [x] Team status API (live activity)
- [x] WebSocket for real-time updates
- [x] Role-based access control
- [x] Dark "Control Room" theme UI

### Phase 2 (December 27, 2025) - Core HRMS Features
- [x] **Project Management**: Create/edit/delete projects, track hours per project, budget tracking
- [x] **Task Management**: Full CRUD, assignees, priorities, statuses, estimated hours
- [x] **Attendance System**: Clock in/out, late detection, work hours/overtime calculation
- [x] **Attendance Reports**: Monthly overview calendar, team attendance report with stats
- [x] **Shift Scheduling**: Create shifts with times/days, assign to team members, calendar view
- [x] **Invoice Generation**: Create invoices with line items, tax calculation, status workflow (draft/sent/paid), export

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Desktop tracker app (Electron) for actual screenshot capture
- [ ] S3/cloud storage integration for screenshots on Contabo VPS
- [ ] Real idle detection algorithm (keyboard/mouse monitoring)
- [ ] Browser extension for URL tracking

### P1 - Important
- [ ] Multiple currency support for payroll
- [ ] PDF invoice generation (currently exports as text)
- [ ] Email notifications for approvals
- [ ] Recurring shifts auto-assignment

### P2 - Nice to Have
- [ ] AI productivity insights
- [ ] Mobile app (React Native)
- [ ] Team chat integration
- [ ] Calendar integrations (Google, Outlook)
- [ ] SSO (SAML, LDAP)

## Tech Stack
- **Backend**: FastAPI, MongoDB, Python
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts
- **Auth**: JWT + Emergent Google OAuth
- **Real-time**: WebSocket
- **Storage**: MongoDB (local), planned: S3-compatible on Contabo VPS

## Database Collections
- users
- companies
- time_entries
- screenshots
- activity_logs
- timesheets
- leaves
- payroll
- user_sessions
- invites
- projects
- tasks
- shifts
- shift_assignments
- attendance
- invoices

## API Routes
- /api/auth/* - Authentication
- /api/company - Company settings
- /api/team - Team management
- /api/time-entries - Time tracking
- /api/screenshots - Screenshot management
- /api/activity-logs - Activity tracking
- /api/timesheets - Timesheet workflows
- /api/leaves - Leave management
- /api/payroll - Payroll processing
- /api/dashboard/* - Dashboard stats
- /api/projects - Project management
- /api/tasks - Task management
- /api/shifts - Shift definitions
- /api/shift-assignments - Shift assignments
- /api/attendance/* - Attendance tracking
- /api/invoices - Invoice management

## Next Tasks
1. Build Electron desktop tracker for actual monitoring
2. Set up S3-compatible storage on Contabo VPS
3. Implement real idle detection
4. Add PDF export for invoices
5. Email notifications system
