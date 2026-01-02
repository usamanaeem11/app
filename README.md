# Working Tracker - Time & Productivity Management Platform

A comprehensive employee time tracking and productivity monitoring platform with consent-based automatic tracking, work agreements, and dual employment type support.

## Overview

Working Tracker is designed for companies that need flexible time tracking for both freelancers and full-time employees. The system respects worker autonomy while providing necessary productivity insights through a consent-based approach.

## Key Features

### Core Time Tracking
- ⏱️ **Manual Timer Control** - Start/stop timers for tasks and projects
- 📸 **Screenshot Capture** - Periodic screenshot monitoring (with consent)
- 📊 **Activity Monitoring** - Application and website usage tracking
- 📅 **Attendance Management** - Clock in/out, shift scheduling, leave requests
- 📋 **Timesheet Generation** - Automated timesheet creation and approval
- 💰 **Payroll Integration** - Calculate wages based on tracked hours

### Employment Types

#### Freelancer (Default)
- Full manual control over time tracking
- Voluntary screenshot and activity tracking
- Self-managed schedules
- No automatic timer scheduling

#### Full-time Employee
- All freelancer features plus:
- Automatic timer scheduling (with consent)
- Scheduled screenshot capture (with consent)
- Manager-assigned work schedules
- Productivity insights and reports

### Consent-Based Tracking

For full-time employees, automatic tracking features require:
- Signed work agreement with explicit consent checkboxes
- Digital signatures from both admin and employee
- Audit logging of all consent decisions
- Right to withdraw consent

### Work Agreements
- 📝 Digital work agreements with custom clauses
- ✍️ Canvas-based signature capture
- 📅 Start and end date tracking
- ☑️ Consent checkboxes for tracking features
- 🔒 Legally binding digital signatures

### Employee Assignment System
- Two-way consent for manager-employee relationships
- Request/accept workflow
- Manager assignment required before scheduling

### Scheduled Timers
- Automatic timer start/stop at configured times
- Daily, weekly, and monthly recurring schedules
- Timezone-aware scheduling
- Execution history and audit logs

### Team Collaboration
- 💬 Team chat with channels and direct messages
- 👥 Team management with role-based access
- 📊 Custom reports and AI insights
- 🔔 Real-time notifications via WebSocket

### Premium Features
- 🤖 AI-powered productivity insights
- 📈 Advanced analytics and reporting
- 🗄️ Extended data retention
- 🔐 SSO integration
- 🌍 Multi-currency support
- 🎨 White-label customization

## Technology Stack

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Lucide React** - Icons
- **WebSocket** - Real-time updates

### Backend
- **FastAPI** - Python web framework
- **Supabase** - PostgreSQL database with RLS
- **JWT** - Authentication
- **WebSocket** - Real-time communication

### Database
- **PostgreSQL** (via Supabase) - Primary database
- **Row Level Security** - Data isolation
- **MongoDB-compatible adapter** - Query compatibility layer

### Desktop & Mobile
- **Electron** - Desktop tracker application
- **React Native** - Mobile app (iOS/Android)
- **Browser Extensions** - Chrome, Firefox, Edge

## Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd working-tracker
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   ```

4. **Install backend dependencies**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

5. **Run database migrations**
   - Migrations are automatically applied through Supabase
   - Located in `supabase/migrations/`

6. **Start development servers**

   Frontend:
   ```bash
   cd frontend
   npm start
   ```

   Backend:
   ```bash
   cd backend
   uvicorn server:app --reload
   ```

### Initial Setup

1. Create admin account via signup
2. Configure company settings
3. Invite team members
4. Set employment types (Freelancer or Full-time)
5. Create work agreements for full-time employees
6. Set up scheduled timers (optional)

## Documentation

### User Documentation
- **[Employment and Consent Guide](./EMPLOYMENT_AND_CONSENT_GUIDE.md)** - Complete guide on employment types, consent system, work agreements, and compliance

### Developer Documentation
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Technical implementation details, API reference, database schema, and best practices
- **[Product Requirements](./memory/PRD.md)** - Original product specifications
- **[Design Guidelines](./design_guidelines.json)** - UI/UX design standards

### API Documentation
- **[API Routes](./backend/routes/)** - Complete API endpoint implementations
- **[Database Schema](./supabase/migrations/)** - PostgreSQL schema migrations

## Project Structure

```
working-tracker/
├── frontend/                 # React web application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utilities and API clients
│   └── public/              # Static assets
│
├── backend/                  # FastAPI server
│   ├── routes/              # API route handlers
│   ├── utils/               # Utility functions
│   │   ├── consent_checker.py     # Consent validation
│   │   ├── screenshot_scheduler.py # Screenshot automation
│   │   ├── db_adapter.py          # Database adapter
│   │   └── id_generator.py        # ID generation
│   ├── db.py                # Database connection
│   └── server.py            # Main application
│
├── supabase/
│   └── migrations/          # Database migrations
│
├── desktop-tracker/         # Electron desktop app
├── mobile-app/              # React Native mobile app
├── browser-extensions/      # Browser extensions
│   ├── chrome/
│   ├── firefox/
│   └── edge/
│
├── tests/                   # Test suites
└── test_reports/            # Test results
```

## Key Concepts

### Employment Types

**Freelancer:**
- Default for all new users
- Full manual control
- No automatic tracking
- Voluntary features only

**Full-time Employee:**
- Requires explicit designation by admin
- Can have automatic tracking with consent
- Requires signed work agreement
- Subject to scheduled timers

### Consent Requirements

Three types of consent for full-time employees:

1. **Automatic Timer Consent** - Allow scheduled timer start/stop
2. **Screenshot Monitoring Consent** - Allow automatic screenshots
3. **Activity Tracking Consent** - Allow app/website tracking

All consents must be:
- Explicitly given in work agreement
- Digitally signed by both parties
- Logged in audit trail
- Revocable by employee

### Work Agreement Lifecycle

1. **Draft** - Admin creates agreement
2. **Admin Signature** - Admin signs first
3. **Employee Review** - Employee reviews terms
4. **Employee Signature** - Employee signs
5. **Active** - Agreement enforced, tracking enabled
6. **Expired/Terminated** - Agreement ends

### Row Level Security (RLS)

Database access is automatically restricted:
- Users see only their company's data
- Employees see only their own tracking data
- Managers see only assigned employees
- Admins have full company access

## Security & Compliance

### Data Protection
- End-to-end encryption for sensitive data
- Secure signature storage (base64 PNG)
- IP address and user agent logging
- Audit trail for all consent decisions

### Privacy Features
- Consent required for all automatic tracking
- Employee data access and export
- Right to withdraw consent
- No keystroke logging
- Browser private mode respected

### Compliance
- GDPR-compliant consent management
- CCPA data access provisions
- SOC 2 audit trail
- Customizable retention policies

## Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
python backend_test.py
```

Test reports are generated in `test_reports/` directory.

## Deployment

### Frontend Build
```bash
cd frontend
npm run build
```

### Backend Deployment
- Configure production environment variables
- Set up HTTPS/SSL certificates
- Deploy to hosting platform (AWS, Heroku, etc.)
- Configure CORS for production domain

### Database
- Use Supabase hosted database (recommended)
- Enable Row Level Security policies
- Configure backup schedules
- Set up monitoring and alerts

## Troubleshooting

### Common Issues

**"Scheduled timers are only available for full-time employees"**
- Solution: Change employee type to full-time in Team Management

**"Employee has not given consent"**
- Solution: Create work agreement with consent checkboxes checked and get both signatures

**Screenshots not capturing**
- Solution: Verify screenshot consent is checked in active agreement

**Build errors in frontend**
- Solution: Use `npm install --legacy-peer-deps` to resolve dependency conflicts

See [Employment and Consent Guide](./EMPLOYMENT_AND_CONSENT_GUIDE.md) for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

[Add license information here]

## Support

- Documentation: See guides in repository root
- Issues: GitHub Issues
- Email: [Add support email]

## Roadmap

### Upcoming Features
- [ ] Mobile app enhancements
- [ ] Advanced AI insights
- [ ] Video recording option
- [ ] Biometric authentication
- [ ] Multi-tenant SaaS mode
- [ ] Blockchain-based audit trail

### In Progress
- [x] Employment type separation
- [x] Consent-based tracking
- [x] Work agreements with signatures
- [x] Scheduled timers
- [x] Employee assignment system

## Acknowledgments

Built with modern web technologies and a focus on privacy, consent, and compliance.

---

**Version:** 2.0.0
**Last Updated:** January 2026
**Status:** Production Ready
