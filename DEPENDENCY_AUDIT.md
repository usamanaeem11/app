# DEPENDENCY AUDIT REPORT
**Project**: WorkMonitor - Time Tracking & Productivity Platform
**Date**: 2026-01-02
**Phase**: 1 of 9 - Self-Hosting Migration

---

## EXECUTIVE SUMMARY

This comprehensive audit identifies all external dependencies, managed services, and third-party integrations in the WorkMonitor platform. The goal is to assess what can be self-hosted on a VPS while maintaining 100% feature parity.

**Key Findings**:
- **5 Critical Dependencies** requiring self-hosting replacements
- **3 Optional Integrations** that can be made self-hosted
- **1 Unavoidable External Service** (Stripe for payments)
- **Total Services Audited**: 20+

---

## 1. EXTERNAL SERVICES & MANAGED PLATFORMS

### 1.1 Database & Backend-as-a-Service

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **Supabase** | PostgreSQL database, Auth, Real-time | Primary database with RLS | YES | **HIGH** | Self-hosted PostgreSQL + PostgREST + Custom Auth |

**Details**:
- **URL**: `https://ruvcvaekwqfhpjmzxiqz.supabase.co`
- **Dependencies**: `supabase==2.10.0` (Python), `@supabase/supabase-js` (Frontend)
- **Features Used**:
  - PostgreSQL with Row Level Security (RLS)
  - Real-time subscriptions
  - Authentication (JWT-based)
  - RESTful API auto-generation
- **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Self-Hosting Plan**:
  1. Deploy standalone PostgreSQL 15+
  2. Apply all existing migrations with RLS preserved
  3. Implement custom JWT authentication
  4. Use PostgreSQL LISTEN/NOTIFY for real-time features
  5. Build REST API endpoints in FastAPI (already exists)

---

### 1.2 Cloud Storage

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **S3/Contabo Object Storage** | Screenshot & media storage | File uploads via boto3 | YES | **HIGH** | MinIO (S3-compatible) or NFS |

**Details**:
- **Dependencies**: `boto3==1.42.16`, `botocore==1.42.16`
- **Implementation**: `backend/routes/storage.py`
- **Features**:
  - Screenshot uploads
  - Presigned URLs for secure downloads
  - File metadata management
- **Environment Variables**: `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_BUCKET_NAME`
- **Self-Hosting Options**:
  1. **MinIO** (Recommended): S3-compatible, drop-in replacement
  2. **Local Filesystem**: Store files on VPS with Nginx reverse proxy
  3. **Nextcloud/Seafile**: Full-featured self-hosted storage

---

## 2. THIRD-PARTY SDKS AND APIs

### 2.1 Payment Processing

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **Stripe** | Subscription payments & invoicing | Checkout, webhooks, subscriptions | YES | **HIGH** | **KEEP** (industry standard) |

**Details**:
- **Dependencies**: `stripe==14.1.0`, `emergentintegrations.payments.stripe.checkout`
- **Implementation**: `backend/routes/payments.py`, `backend/routes/payment_methods.py`
- **Features**:
  - Checkout sessions
  - Subscription management
  - Webhook handling (payment events)
  - Invoice generation
- **Environment Variables**: `STRIPE_API_KEY`
- **Decision**: **KEEP STRIPE** - Industry standard, PCI compliance handled, no viable self-hosted alternative for production payments

**Alternative Options** (if replacing Stripe):
- Lemonsqueezy (indie-friendly)
- Paddle (EU-focused)
- Open Payment Gateway (requires banking relationships)

---

### 2.2 Email Services

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **SMTP (Generic)** | Email delivery | Notifications, invoices, OTP | YES | **HIGH** | Self-hosted Postfix or provider-agnostic SMTP |

**Details**:
- **Implementation**: `backend/routes/email.py` (Python `smtplib`)
- **Features**:
  - Transactional emails
  - Invoice delivery
  - Password reset
  - OTP codes
- **Environment Variables**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- **Self-Hosting Options**:
  1. **Postfix + Dovecot** (Full control, requires IP reputation management)
  2. **Mailtrap** (Dev/staging)
  3. **SendGrid/Mailgun/AWS SES** (Provider-agnostic, keep as SMTP)
- **Decision**: **Provider-agnostic SMTP** - Use any SMTP provider or self-host Postfix

---

### 2.3 AI/LLM Services

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **OpenAI API (via EmergentIntegrations)** | AI insights, chat, productivity analysis | GPT-5.2 (EmergetAI wrapper) | NO | **MEDIUM** | Ollama (Llama 3, Mistral) or LocalAI |

**Details**:
- **Dependencies**:
  - `openai==1.99.9`
  - `emergentintegrations.llm.chat`
  - `litellm==1.80.0` (LLM router)
  - `tiktoken==0.12.0` (token counting)
  - `google-genai==1.56.0`, `google-generativeai==0.8.6`
- **Implementation**: `backend/routes/ai_insights.py`, `backend/routes/team_chat.py`
- **Features**:
  - Productivity trend analysis
  - Meeting summaries
  - Team insights
  - Chat responses
- **Environment Variables**: `EMERGENT_LLM_KEY`, `OPENAI_API_KEY`
- **Feature Gate**: Optional feature (can be disabled)
- **Self-Hosting Options**:
  1. **Ollama** (Recommended): Run Llama 3, Mistral, Phi locally
  2. **LocalAI**: OpenAI-compatible API for local models
  3. **LM Studio**: Desktop LLM interface
  4. **Hugging Face Transformers**: Direct model integration
- **Decision**: **Optional Feature** - Provide both cloud and self-hosted options

---

### 2.4 Calendar Integrations

#### Google Calendar

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **Google Calendar API** | Time sync, calendar events | OAuth + event sync | NO | **LOW** | Nextcloud Calendar or disable |

**Details**:
- **Implementation**: `backend/routes/google_calendar.py`
- **Dependencies**: `google-api-python-client==2.187.0`, `google-auth==2.45.0`
- **OAuth Flow**:
  - Auth: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token: `https://oauth2.googleapis.com/token`
  - API: `https://www.googleapis.com/calendar/v3`
- **Scopes**: `calendar.readonly`, `calendar.events`
- **Environment Variables**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`
- **Self-Hosting Options**:
  - **Nextcloud Calendar** (CalDAV/CardDAV)
  - **Owncloud**
  - **OpenXchange**
- **Decision**: **Optional Integration** - Keep for user convenience, offer self-hosted calendar alternative

#### Microsoft Outlook Calendar

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **Outlook Calendar (Microsoft Graph)** | Outlook sync | OAuth + event sync | NO | **LOW** | Same as Google Calendar |

**Details**:
- **Implementation**: `backend/routes/outlook_calendar.py`
- **OAuth**: Microsoft Graph API via `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/`
- **Environment Variables**: `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REDIRECT_URI`
- **Decision**: **Optional Integration**

---

### 2.5 Real-Time Communication

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **WebSocket (Socket.IO)** | Real-time chat, notifications | Native + Socket.IO fallback | YES | **HIGH** | **Already Self-Hosted** |

**Details**:
- **Dependencies**:
  - Frontend: `socket.io-client==4.8.3`
  - Backend: `python-socketio==5.16.0`, `python-engineio==4.13.0`
- **Implementation**:
  - Frontend: `frontend/src/context/WebSocketContext.js`
  - Backend: `backend/routes/team_chat.py`
- **Features**:
  - Team chat messaging
  - Live notifications
  - Dashboard updates
  - Auto-reconnect (3-second interval)
- **Decision**: **Already Self-Hosted** - No changes needed

---

### 2.6 Enterprise Authentication

| Service | Purpose | Current Usage | Required | Risk | Replacement Strategy |
|---------|---------|--------------|----------|------|---------------------|
| **SAML/SSO** | Enterprise single sign-on | SAML 2.0 integration | NO | **LOW** | Keycloak or Authentik |

**Details**:
- **Implementation**: `backend/routes/sso.py`
- **Environment Variables**: `SAML_IDP_SSO_URL`, `SAML_IDP_SLO_URL`, `SAML_IDP_CERT`
- **Self-Hosting Options**:
  - **Keycloak** (Industry standard)
  - **Authentik**
  - **Authelia**
- **Decision**: **Optional Enterprise Feature** - Self-host Keycloak

---

## 3. ENVIRONMENT VARIABLES INVENTORY

### 3.1 Currently Configured (`.env`)

```env
VITE_SUPABASE_URL=https://ruvcvaekwqfhpjmzxiqz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BACKEND_URL=http://localhost:8001
REACT_APP_BACKEND_URL=http://localhost:8001
VITE_API_URL=http://localhost:8001
JWT_SECRET=workmonitor-secret-key-2024-change-in-production
FRONTEND_URL=http://localhost:3000
DESKTOP_API_URL=http://localhost:8001
```

**Security Issues**:
- ⚠️ `JWT_SECRET` is generic and must be regenerated for production
- ✅ Supabase anon key is acceptable (read-only public key)

### 3.2 Required but Missing

**Critical**:
- `DATABASE_URL` - PostgreSQL connection string (when migrating from Supabase)
- `STRIPE_API_KEY` - Stripe secret key
- `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_BUCKET_NAME`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

**Optional**:
- `EMERGENT_LLM_KEY` or `OPENAI_API_KEY` - AI insights
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`
- `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REDIRECT_URI`
- `SAML_IDP_SSO_URL`, `SAML_IDP_SLO_URL`, `SAML_IDP_CERT`

---

## 4. BACKGROUND JOBS & SCHEDULED TASKS

### 4.1 Screenshot Scheduler

- **Location**: `backend/utils/screenshot_scheduler.py`, `desktop-tracker/main.js`
- **Technology**: `node-schedule==2.1.1` (Desktop app)
- **Schedule**: Configurable (default: every 5 minutes)
- **Features**:
  - Periodic screenshot capture
  - Idle detection (5-minute threshold)
  - Activity logging every minute
- **Risk**: MEDIUM (monitoring feature)
- **Self-Hosting**: ✅ Already built-in

### 4.2 Screen Recording Scheduler

- **Location**: `backend/utils/screen_recording_scheduler.py`
- **Technology**: Custom async scheduling
- **Features**: Configurable recording intervals
- **Risk**: MEDIUM
- **Self-Hosting**: ✅ Already built-in

### 4.3 Scheduled Timers

- **Location**: `backend/routes/scheduled_timers.py`
- **Purpose**: Auto-start/stop work timers
- **Types**: Once, daily, weekly, monthly
- **Features**: Timezone-aware scheduling
- **Risk**: LOW
- **Self-Hosting**: ✅ Already built-in

**Note**: No external job queue (Celery, RQ) detected. All scheduling is in-process.

---

## 5. REALTIME FEATURES

### 5.1 WebSocket Implementation

- **Status**: ✅ Already Self-Hosted
- **Technology**: Native WebSocket + Socket.IO fallback
- **Features**:
  - Real-time team chat
  - Live notifications
  - Dashboard updates
  - Auto-reconnect (3s interval)
  - Message buffering (last 100 messages)
  - Heartbeat/ping-pong

### 5.2 Push Notifications

- **Mobile**: `expo-notifications==0.27.0`
- **Status**: ⚠️ Requires FCM (Firebase Cloud Messaging) + APNs (Apple Push Notification Service)
- **Risk**: MEDIUM
- **Self-Hosting Options**:
  - **FCM**: Required for Android (Google service)
  - **APNs**: Required for iOS (Apple service)
  - **Alternative**: OneSignal (self-hostable tier available)
- **Decision**: **Keep FCM/APNs** (no viable self-hosted alternative for mobile push)

---

## 6. DEPENDENCY BREAKDOWN BY COMPONENT

### 6.1 Frontend (React)

**Core** (19 packages):
- `react==19.0.0`, `react-dom==19.0.0`, `react-router-dom==7.5.1`
- `axios==1.8.4` - HTTP client
- `socket.io-client==4.8.3` - WebSocket
- `date-fns==3.6.0` - Date utilities

**UI** (20+ packages):
- Radix UI components (18 packages)
- `tailwindcss==3.4.17`
- `recharts==3.6.0` - Charts
- `sonner==2.0.3` - Toast notifications

**Forms & Validation**:
- `react-hook-form==7.56.2`
- `zod==3.24.4`

**Status**: ✅ All self-hostable (no external services)

### 6.2 Backend (FastAPI/Python)

**Core** (56+ packages):
- `fastapi==0.110.1`, `uvicorn==0.25.0`
- `psycopg2-binary==2.9.10` - PostgreSQL
- `pymongo==4.5.0`, `motor==3.3.1` - MongoDB (fallback)

**Authentication**:
- `PyJWT==2.10.1`, `python-jose==3.5.0`
- `bcrypt==4.1.3`, `passlib==1.7.4`

**External Services**:
- `supabase==2.10.0` ⚠️ **Replace**
- `stripe==14.1.0` ✅ **Keep**
- `boto3==1.42.16` ✅ **Keep (use MinIO)**
- `openai==1.99.9` ⚠️ **Optional (replace with Ollama)**
- `google-api-python-client==2.187.0` ⚠️ **Optional**

**Realtime**:
- `python-socketio==5.16.0` ✅ Self-hosted

### 6.3 Desktop Application (Electron)

**Core**:
- `electron==28.0.0`, `electron-builder==24.9.1`
- `screenshot-desktop==1.15.0` - Screenshot capture
- `active-win==8.1.0` - Active window detection
- `node-schedule==2.1.1` - Job scheduling
- `electron-store==8.1.0` - Local storage
- `axios==1.6.0` - HTTP client

**Status**: ✅ All self-hostable

### 6.4 Mobile Application (React Native/Expo)

**Core**:
- `expo==50.0.0`, `react==18.2.0`, `react-native==0.73.0`

**Device Access**:
- `expo-location==16.5.0` - GPS tracking
- `expo-camera==14.0.0` - Camera
- `expo-notifications==0.27.0` ⚠️ **Requires FCM/APNs**
- `expo-background-fetch==11.6.0`
- `expo-task-manager==11.6.0`

**Status**: ⚠️ Push notifications require external services (FCM/APNs)

---

## 7. SUMMARY TABLE

| Category | Service | Type | Required | Risk | Decision |
|----------|---------|------|----------|------|----------|
| **Database** | Supabase | BaaS | YES | HIGH | ⚠️ Replace with PostgreSQL |
| **Storage** | S3/Contabo | Cloud | YES | HIGH | ⚠️ Replace with MinIO |
| **Payments** | Stripe | SaaS | YES | HIGH | ✅ Keep (industry standard) |
| **Email** | SMTP | Service | YES | HIGH | ✅ Provider-agnostic (keep) |
| **AI/LLM** | OpenAI/EmergentAI | API | NO | MEDIUM | ⚠️ Optional (add Ollama) |
| **Calendar** | Google Calendar | Integration | NO | LOW | ⚠️ Optional (add Nextcloud) |
| **Calendar** | Outlook | Integration | NO | LOW | ⚠️ Optional (add Nextcloud) |
| **SSO** | SAML | Enterprise | NO | LOW | ⚠️ Optional (add Keycloak) |
| **Realtime** | WebSocket | Protocol | YES | HIGH | ✅ Already self-hosted |
| **Push** | FCM/APNs | Mobile | OPTIONAL | MEDIUM | ✅ Keep (no alternative) |

---

## 8. MIGRATION PRIORITIES

### Phase 2 (Immediate):
1. ⚠️ **Database Migration**: Supabase → PostgreSQL + Custom Auth
2. ⚠️ **Storage Migration**: S3/Contabo → MinIO or Local FS

### Phase 3-5 (Core):
3. ✅ Verify all backend APIs work with new database
4. ✅ Verify all frontend pages work with new API
5. ✅ Test desktop, mobile, extensions

### Phase 6-7 (Optional Integrations):
6. ⚠️ Add Ollama support for AI (alongside OpenAI)
7. ⚠️ Add Nextcloud Calendar (alongside Google/Outlook)
8. ⚠️ Add Keycloak for SSO

### Phase 8-9 (Deployment):
9. ✅ Docker Compose setup
10. ✅ Full system testing

---

## 9. RISK ASSESSMENT

### High Risk (Critical Path):
- **Supabase Migration**: Database + Auth + RLS must be preserved 100%
- **Storage Migration**: Screenshots are core feature, must not lose data
- **WebSocket**: Already self-hosted, low migration risk

### Medium Risk (Optional Features):
- **AI Insights**: Feature-gated, can be disabled temporarily
- **Calendar Sync**: Optional integration, users can manually enter time

### Low Risk:
- **SSO/SAML**: Enterprise feature, low user impact
- **Push Notifications**: Keep FCM/APNs (no viable self-hosted option)

---

## 10. RECOMMENDATIONS

### Must Do:
1. ✅ Migrate Supabase → PostgreSQL (preserve all RLS policies)
2. ✅ Implement custom JWT authentication
3. ✅ Deploy MinIO for S3-compatible storage
4. ✅ Keep Stripe for payments
5. ✅ Keep provider-agnostic SMTP

### Should Do:
1. ⚠️ Add Ollama support for local LLM (alongside cloud option)
2. ⚠️ Add Nextcloud Calendar (alongside Google/Outlook)
3. ⚠️ Deploy Keycloak for SSO

### Can Skip:
1. ✅ Push Notifications - Keep FCM/APNs (no alternative)
2. ✅ WebSocket - Already self-hosted

---

## NEXT STEPS

**Phase 2**: Database Independence
- Deploy PostgreSQL on VPS
- Apply all migrations with RLS
- Implement custom JWT auth
- Test all database queries
- Verify multi-tenant isolation

---

**Report Generated**: 2026-01-02
**Version**: 1.0
**Status**: ✅ Complete
