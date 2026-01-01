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
- **Desktop**: Electron (Windows, macOS, Linux)
- **Auth**: JWT + Emergent Google OAuth + SAML SSO
- **Real-time**: WebSocket
- **Payments**: Stripe (via emergentintegrations)
- **AI**: OpenAI GPT-5.2 (via Emergent LLM Key)
- **Storage**: S3-compatible (Contabo/MinIO/AWS)
- **Email**: Self-hosted SMTP
- **Calendar**: Google Calendar API

## What's Been Implemented

### Phase 1 - MVP ✅
- [x] User authentication (JWT + Emergent Google OAuth)
- [x] Company management with tracking policies
- [x] Time entry CRUD with active tracking
- [x] Screenshot management API
- [x] Activity logs API
- [x] Timesheet generation and approval
- [x] Leave request management
- [x] Basic payroll generation and processing
- [x] Dashboard statistics API
- [x] Team status API (live activity)
- [x] WebSocket for real-time updates
- [x] Role-based access control
- [x] Dark "Control Room" theme UI

### Phase 2 - Core HRMS Features ✅
- [x] Project Management
- [x] Task Management
- [x] Attendance System with clock in/out
- [x] Attendance Reports
- [x] Shift Scheduling
- [x] Invoice Generation

### Phase 3 - Subscription & RBAC ✅
- [x] Subscription Plans (4 tiers with discounts)
- [x] Stripe Payment Integration
- [x] User Role Management (Admin/Manager/Employee)
- [x] Manager Assignments
- [x] AI Productivity Analysis (GPT-5.2)
- [x] Productivity Trends & Charts
- [x] App Usage Analytics
- [x] Subscription Page UI
- [x] AI Insights Page UI
- [x] User Management Page UI

### Phase 4 - Enterprise Features ✅
- [x] **Electron Desktop Tracker** - Cross-platform desktop app
- [x] **S3-Compatible Storage** (Contabo/MinIO/AWS)
- [x] **PDF Invoice Generation** with ReportLab
- [x] **SMTP Email Notifications**
- [x] **Google Calendar Integration**
- [x] **SAML SSO** (placeholder)
- [x] **Settings Integrations Tab**

### Phase 5 - SaaS Pricing & Team Chat ✅ (Completed 2026-01-01)
- [x] **Three-Tier Pricing System**:
  - Starter ($2.99/user/mo): Basic tracking, 100 screenshots/day
  - Pro ($4.99/user/mo): Unlimited screenshots, HR features, payroll
  - Business ($6.99/user/mo): Video screenshots, SSO, API, white-label
  - 20% yearly discount across all plans
- [x] **14-Day Free Trial**: No credit card required, auto-downgrade to Starter
- [x] **Public Pricing Page** at /pricing with:
  - Plan comparison cards
  - Monthly/Yearly billing toggle
  - Team size selector
  - Feature comparison table
  - FAQ section
- [x] **Checkout Page** at /checkout with:
  - Order summary
  - Multiple payment methods (Card, PayPal*, Payoneer*, Wise*)
  - Auto-recurring payment option
  - SSL security badge
- [x] **Feature Gating Middleware**: Plan-based access control
- [x] **Team Chat** at /team-chat with:
  - AI Support channel with GPT-5.2 chatbot
  - Create team channels
  - Direct messaging (placeholder)
  - Real-time WebSocket support
- [x] **AI Chatbot**: WorkMonitor AI Assistant trained on app features

*Note: PayPal, Payoneer, Wise are MOCKED - only Stripe is fully integrated

## Current Subscription Plans (Updated 2026-01-01)
| Plan | Price/User/Month | Yearly Price | Key Features |
|------|------------------|--------------|--------------|
| Starter | $2.99 | $28.70/year (20% off) | Basic tracking, 100 screenshots/day |
| Pro | $4.99 | $47.90/year (20% off) | Unlimited screenshots, HR, Payroll, Team Chat |
| Business | $6.99 | $67.10/year (20% off) | Video screenshots, SSO, API, White-label |

## Code Architecture
```
/app/
├── backend/
│   ├── server.py               # Main FastAPI app
│   └── routes/
│       ├── pricing.py          # Pricing plans & subscriptions
│       ├── team_chat.py        # Team chat & AI chatbot
│       ├── feature_gate.py     # Feature gating middleware
│       ├── payments.py         # Stripe integration
│       ├── ai_insights.py      # GPT-5.2 analysis
│       ├── storage.py          # S3 screenshot storage
│       ├── email.py            # SMTP notifications
│       ├── pdf_generator.py    # PDF invoices
│       ├── google_calendar.py  # Calendar sync
│       └── sso.py              # SAML SSO
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── PricingPage.jsx # Public pricing page
│       │   ├── Checkout.jsx    # Payment checkout
│       │   ├── TeamChat.jsx    # Team chat with AI
│       │   ├── Subscription.jsx
│       │   ├── AIInsights.jsx
│       │   ├── UserManagement.jsx
│       │   ├── Settings.jsx (with Integrations tab)
│       │   └── ... (other pages)
│       └── lib/api.js          # All API functions
├── tests/
│   └── test_pricing_chat_apis.py  # Backend API tests
└── desktop-tracker/            # Electron app
```

## API Endpoints

### Pricing & Subscription APIs (NEW)
- `/api/pricing/plans` - Get all pricing plans with features
- `/api/pricing/plan/{plan_id}` - Get specific plan details
- `/api/pricing/trial/start` - Start 14-day free trial
- `/api/pricing/subscription/{company_id}` - Get subscription status
- `/api/pricing/features/{company_id}` - Get company's enabled features
- `/api/pricing/subscribe` - Create new subscription
- `/api/pricing/upgrade` - Upgrade plan
- `/api/pricing/downgrade` - Downgrade plan

### Team Chat APIs (NEW)
- `/api/chat/channels` - Get/Create chat channels
- `/api/chat/channels/{id}/messages` - Get channel messages
- `/api/chat/messages` - Send message
- `/api/chat/ai/query` - Query AI chatbot
- `/api/chat/ws/{channel}/{user}` - WebSocket for real-time chat

### Core APIs
- `/api/auth/*` - Authentication
- `/api/team` - Team management
- `/api/time-entries` - Time tracking
- `/api/screenshots` - Screenshot management
- `/api/timesheets` - Timesheet workflows
- `/api/leaves` - Leave management
- `/api/payroll` - Payroll processing
- `/api/projects` - Project management
- `/api/invoices` - Invoice management

### Integration APIs
- `/api/payments/*` - Stripe checkout
- `/api/ai/*` - AI productivity analysis
- `/api/storage/*` - S3 screenshot storage
- `/api/email/*` - SMTP email
- `/api/pdf/*` - PDF generation
- `/api/calendar/*` - Google Calendar
- `/api/sso/*` - SAML SSO

## Prioritized Backlog

### P0 - Critical (IN PROGRESS)
- [ ] Apply feature gating middleware to all protected endpoints
- [ ] Implement PayPal payment integration
- [ ] Implement Payoneer payment integration
- [ ] Implement Wise payment integration

### P1 - Important (Next)
- [ ] Mobile apps (React Native for Android/iOS)
- [ ] Browser extensions (Chrome, Firefox, Edge)
- [ ] Multiple currency support for payroll
- [ ] Custom report builder implementation
- [ ] Outlook calendar integration

### P2 - Nice to Have
- [ ] Advanced AI reports with charts
- [ ] Recurring shifts auto-assignment
- [ ] White-label branding implementation
- [ ] HIPAA & GDPR compliance indicators

## Test Reports
- `/app/test_reports/iteration_1.json` - Phase 1 MVP
- `/app/test_reports/iteration_2.json` - Phase 2 HRMS
- `/app/test_reports/iteration_3.json` - Phase 3 Subscription & RBAC
- `/app/test_reports/iteration_4.json` - Phase 5 Pricing & Team Chat (12/12 tests passed)

## Known Limitations
- Screenshots are stored as references until S3 credentials are configured
- Email notifications require SMTP configuration
- Calendar sync requires Google OAuth credentials
- SSO requires IdP configuration
