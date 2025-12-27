# WorkMonitor - Employee Time Tracking & Monitoring Software

## Overview
WorkMonitor is a comprehensive employee monitoring and time-tracking SaaS platform similar to Hubstaff, Time Doctor, and WebWork. It provides real-time workforce monitoring, productivity tracking, AI-powered insights, and HRMS features.

## Original Problem Statement
Build a multi-platform workforce monitoring system that tracks employee time, productivity, and activity across various platforms with silent background tracking, automatic screenshots, productivity insights, and enterprise-grade security.

## User Personas
1. **Admin/Company Owner**: Creates company, manages team, views all reports, configures policies, manages subscriptions
2. **Manager**: Reviews team activity, approves timesheets/leaves, monitors assigned employees' productivity
3. **HR**: Manages employees, processes payroll, handles leave requests
4. **Employee**: Tracks time, views own activity, requests leaves

## Tech Stack
- **Backend**: FastAPI, MongoDB, Python
- **Frontend**: React, Tailwind CSS, Shadcn/UI, Recharts
- **Auth**: JWT + Emergent Google OAuth
- **Real-time**: WebSocket
- **Payments**: Stripe (via emergentintegrations)
- **AI**: OpenAI GPT-5.2 (via Emergent LLM Key)
- **Storage**: MongoDB (local), planned: S3-compatible on Contabo VPS

## What's Been Implemented

### Phase 1 (December 27, 2025) - MVP ✅
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

### Phase 2 (December 27, 2025) - Core HRMS Features ✅
- [x] **Project Management**: Create/edit/delete projects, track hours per project, budget tracking
- [x] **Task Management**: Full CRUD, assignees, priorities, statuses, estimated hours
- [x] **Attendance System**: Clock in/out, late detection, work hours/overtime calculation
- [x] **Attendance Reports**: Monthly overview calendar, team attendance report with stats
- [x] **Shift Scheduling**: Create shifts with times/days, assign to team members, calendar view
- [x] **Invoice Generation**: Create invoices with line items, tax calculation, status workflow (draft/sent/paid), export

### Phase 3 (December 27, 2025) - Subscription & RBAC ✅
- [x] **Subscription Plans**: 4 tiers (Monthly, Quarterly, 6-Month, Yearly) with progressive discounts
- [x] **Stripe Payment Integration**: Checkout sessions, payment status polling, subscription activation
- [x] **User Role Management**: Admin can change user roles (Admin/Manager/Employee)
- [x] **Manager Assignments**: Admin can assign employees to managers
- [x] **AI Productivity Analysis**: GPT-5.2 powered insights with actionable recommendations
- [x] **Productivity Trends**: Daily tracking with charting data
- [x] **App Usage Analytics**: Category breakdown (productivity, communication, browser, etc.)
- [x] **Subscription Page UI**: Pricing cards, plan selection, Stripe checkout integration
- [x] **AI Insights Page UI**: 4 charts (Productivity Trend, Hours Breakdown, Category Pie, Top Apps)
- [x] **User Management Page UI**: Role editing, manager user assignment

## Subscription Plans
| Plan | Duration | Price/User/Month | Discount |
|------|----------|------------------|----------|
| Monthly | 1 month | $2.00 | 0% |
| Quarterly | 3 months | $1.90 | 5% |
| 6 Months | 6 months | $1.80 | 10% |
| Yearly | 12 months | $1.60 | 20% |

### Services Included (All Plans)
- Time Tracking
- Screenshot Monitoring
- Activity Tracking
- Project Management
- Task Management
- Attendance Tracking
- Timesheet Management
- Leave Management
- Shift Scheduling
- Payroll Management
- Invoice Generation
- Real-time Dashboard
- Team Management
- Reports & Analytics
- WebSocket Real-time Updates
- Role-based Access Control

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
- [ ] Mobile app (React Native)
- [ ] Team chat integration
- [ ] Calendar integrations (Google, Outlook)
- [ ] SSO (SAML, LDAP)

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
- subscriptions
- manager_assignments
- disapproval_logs
- payment_transactions

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
- /api/subscription/* - Subscription management
- /api/payments/* - Stripe payment integration
- /api/ai/* - AI productivity analysis
- /api/users/{id}/role - Role management
- /api/managers/* - Manager assignments

## Code Architecture
```
/app/
├── backend/
│   ├── .env                    # Environment variables (Stripe, LLM keys)
│   ├── requirements.txt
│   ├── server.py               # Main FastAPI app with all routes
│   └── routes/
│       ├── __init__.py
│       ├── payments.py         # Stripe checkout integration
│       └── ai_insights.py      # GPT-5.2 productivity analysis
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js              # Router setup
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── DashboardLayout.jsx
│       │   │   └── Sidebar.jsx # Navigation with role-based items
│       │   └── ui/             # Shadcn components
│       ├── context/
│       ├── lib/
│       │   └── api.js          # All API functions
│       └── pages/
│           ├── Subscription.jsx    # NEW: Pricing & checkout
│           ├── AIInsights.jsx      # NEW: AI analytics with charts
│           ├── UserManagement.jsx  # NEW: Role & assignment management
│           └── ... (other pages)
└── memory/
    └── PRD.md
```

## 3rd Party Integrations
- **Emergent Google OAuth**: "Login with Google" functionality
- **WebSockets**: Real-time dashboard updates
- **Stripe**: Subscription payments (test key: sk_test_emergent)
- **OpenAI GPT-5.2**: AI productivity analysis (via Emergent LLM Key)

## Known Limitations (MOCKED Data)
- **Screenshots**: Currently mocked - desktop tracker needed for real capture
- **Activity Logs**: Currently mocked - desktop tracker needed for real data
- Screenshot storage (S3) not integrated yet

## Test Reports
- /app/test_reports/iteration_1.json - Phase 1 MVP tests
- /app/test_reports/iteration_2.json - Phase 2 HRMS tests
- /app/test_reports/iteration_3.json - Phase 3 Subscription & RBAC tests
