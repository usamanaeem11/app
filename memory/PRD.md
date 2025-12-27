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

## What's Been Implemented (December 27, 2025)

### Backend (FastAPI + MongoDB)
- [x] User authentication (JWT + Emergent Google OAuth)
- [x] Company management with tracking policies
- [x] Time entry CRUD with active tracking
- [x] Screenshot management API
- [x] Activity logs API
- [x] Timesheet generation and approval
- [x] Leave request management
- [x] Payroll generation and processing
- [x] Dashboard statistics API
- [x] Team status API (live activity)
- [x] WebSocket for real-time updates
- [x] Role-based access control

### Frontend (React + Tailwind CSS)
- [x] Login/Signup pages with Google OAuth
- [x] Dashboard with real-time stats and charts
- [x] Time Tracking page with calendar view
- [x] Screenshots gallery (demo data)
- [x] Activity monitor with app usage
- [x] Timesheets list with approval workflow
- [x] Team management with invites
- [x] Leaves management
- [x] Payroll summary and export
- [x] Settings page (company, tracking, privacy)
- [x] Dark "Control Room" theme

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Desktop tracker app (Electron) for actual screenshot capture
- [ ] S3/cloud storage integration for screenshots
- [ ] Actual idle detection algorithm
- [ ] Browser extension for URL tracking

### P1 - Important
- [ ] Project/task management
- [ ] Multiple currency support for payroll
- [ ] Invoice generation
- [ ] Attendance reports
- [ ] Shift scheduling

### P2 - Nice to Have
- [ ] AI productivity insights
- [ ] Mobile app (React Native)
- [ ] Team chat integration
- [ ] Calendar integrations (Google, Outlook)
- [ ] SSO (SAML, LDAP)

## Tech Stack
- **Backend**: FastAPI, MongoDB, Python
- **Frontend**: React, Tailwind CSS, Shadcn/UI
- **Auth**: JWT + Emergent Google OAuth
- **Real-time**: WebSocket
- **Storage**: MongoDB GridFS (demo), S3 (planned)

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

## Next Tasks
1. Build Electron desktop tracker for actual monitoring
2. Integrate S3 for screenshot storage
3. Implement real idle detection
4. Add project/task management
5. Build attendance reports
