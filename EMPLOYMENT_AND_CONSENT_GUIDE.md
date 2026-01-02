# Employment Types and Consent-Based Tracking Guide

## Overview

Working Tracker implements a dual employment system with consent-based automatic tracking. This ensures compliance with privacy regulations while providing flexibility for different work arrangements.

## Employment Types

### Freelancer (Default)

**Control:** Full manual control over time tracking

**Features:**
- Manual timer start/stop
- Voluntary screenshot capture
- Voluntary activity tracking
- Self-managed time entries
- No automatic scheduling

**Who should be Freelancer:**
- Independent contractors
- Part-time workers
- Temporary staff
- Anyone who prefers manual control

### Full-time Employee

**Control:** Can have automatic tracking WITH explicit consent

**Features (with consent):**
- Automatic timer scheduling
- Scheduled screenshot capture
- Automatic activity monitoring
- Manager-assigned work schedules
- All manual features also available

**Who should be Full-time:**
- Permanent staff
- Salaried employees
- Team members on employment contracts

## Setting Employment Type

### For New Team Members

1. Go to **Team Management**
2. Click **Invite Member**
3. Enter email and role
4. Select **Employment Type**:
   - **Freelancer** - Manual control
   - **Full-time Employee** - Can have automatic tracking
5. Send invitation

### For Existing Team Members

1. Go to **Team Management**
2. Find the team member
3. Click **Edit** (pencil icon)
4. Change **Employment Type**
5. Click **Save Changes**

## Consent System for Full-time Employees

### Why Consent is Required

Automatic tracking requires explicit employee consent to:
- Respect privacy rights
- Comply with labor regulations
- Build trust with employees
- Ensure legal protection

### Types of Consent

1. **Automatic Timer Consent**
   - Allows admin/manager to schedule automatic timer start/stop
   - Required for scheduled timers feature

2. **Screenshot Monitoring Consent**
   - Allows automatic screenshot capture during work hours
   - Configurable capture intervals

3. **Activity Tracking Consent**
   - Allows tracking of applications and websites used
   - Provides productivity insights

### How Consent Works

#### Step 1: Create Work Agreement

1. Admin/Manager goes to **Work Agreements**
2. Click **Create Agreement**
3. Fill in agreement details:
   - Employee selection (must be full-time)
   - Agreement title and description
   - Start and end dates
   - Hourly rate (if applicable)

#### Step 2: Set Consent Preferences

For full-time employees, three consent checkboxes appear:

```
☐ Automatic Timer Consent
  Allow admin/manager to schedule automatic timer start/stop

☐ Screenshot Monitoring Consent
  Allow automatic screenshot capture during work hours

☐ Activity Tracking Consent
  Allow tracking of applications and websites used during work
```

Admin checks the appropriate boxes based on the role requirements.

#### Step 3: Add Custom Clauses

1. Click **+ Add Clause** to add custom terms
2. Mark clauses as **Mandatory** or **Optional**
3. Both parties must understand and agree to all clauses

#### Step 4: Digital Signatures

1. **Admin signs first** using the signature canvas
2. Agreement sent to employee for review
3. **Employee reviews and signs** if they agree
4. Agreement becomes **Active** only when both signatures are present

#### Step 5: Automatic Tracking Enabled

Once the agreement is fully signed:
- Consent is recorded with timestamp
- Automatic features become available
- Scheduled timers can be created
- Screenshots capture automatically (if enabled)
- Activity tracking begins (if enabled)

## Employee Assignment System

### Purpose

Before a manager can schedule timers or track an employee, the employee must accept the assignment request.

### Assignment Flow

1. **Manager sends request**
   - Go to **Employee Assignments**
   - Click **Send Request**
   - Select employee and add message
   - Submit request

2. **Employee reviews request**
   - Employee sees pending request
   - Reviews manager details and message
   - Can **Accept** or **Reject**

3. **Assignment active**
   - Once accepted, manager can:
     - View employee's time entries
     - Create scheduled timers (if full-time with consent)
     - Assign projects and tasks

## Scheduled Timers (Full-time Only)

### Prerequisites

- Employee must be designated as **full-time**
- Employee must have **signed work agreement**
- Agreement must include **automatic timer consent**
- Manager must be **assigned** to employee

### Creating Scheduled Timer

1. Go to **Scheduled Timers** (Admin/Manager only)
2. Click **Create Schedule**
3. Configure:
   - Employee selection (validates consent)
   - Work agreement (optional link)
   - Project (optional)
   - Schedule type (daily, weekly, monthly)
   - Start time and end time
   - Days of week (for recurring)
   - Timezone
4. Enable auto-start and/or auto-stop
5. Save schedule

### How Scheduled Timers Execute

- Background service checks schedules every minute
- At scheduled time:
  1. Checks employee consent status
  2. Verifies work agreement is active
  3. Starts timer automatically
  4. Records execution in audit log
- Employee receives notification
- Screenshots begin at configured intervals (if consent given)

## Screenshot Capture System

### Freelancer Screenshot Behavior

- Freelancers can enable screenshots **voluntarily**
- Controlled entirely by the freelancer
- Can disable at any time
- No admin override

### Full-time Screenshot Behavior

Requires **screenshot monitoring consent** in work agreement.

**Without consent:**
- Screenshots are **not captured** even if timer is running
- System logs consent check failure
- Admin notified that consent is required

**With consent:**
- Screenshots captured at configured intervals
- Default: 10 minutes (configurable per company)
- Captures only when timer is active
- Stored securely with encryption

### Configuring Screenshot Intervals

Admin can set company-wide policy:
1. Go to **Settings** → **Tracking Policy**
2. Set **Screenshot Interval** (seconds)
3. Recommended: 300-600 seconds (5-10 minutes)
4. Applies to all employees with consent

## Activity Tracking

### What is Tracked

- Active application window titles
- Active website URLs
- Mouse and keyboard activity levels
- Time spent per application/website

### Privacy Protections

- **Freelancers:** Fully voluntary, can disable anytime
- **Full-time:** Requires explicit consent in work agreement
- No keystroke logging
- No email or message content capture
- Browser incognito/private mode respected

### How Activity Data is Used

- Productivity insights
- Project time allocation
- Automated timesheet generation
- Productivity reports (AI insights)

## Compliance and Best Practices

### Legal Compliance

✅ **DO:**
- Always obtain written consent before automatic tracking
- Clearly explain what data is collected
- Allow employees to review their own data
- Provide opt-out for freelancers
- Document all consent in work agreements
- Use digital signatures for verification

❌ **DON'T:**
- Enable automatic tracking without consent
- Track employees outside work hours
- Access personal accounts or data
- Use tracking data for discrimination
- Share tracking data with third parties without consent

### Recommended Practices

1. **Transparency First**
   - Show employees exactly what will be tracked
   - Explain why tracking is needed
   - Demonstrate how data protects them too (billing accuracy)

2. **Minimal Necessary Data**
   - Only enable tracking features you actually use
   - Set reasonable screenshot intervals
   - Don't track outside scheduled work hours

3. **Regular Reviews**
   - Review work agreements annually
   - Update consent when roles change
   - Remove inactive tracking schedules

4. **Employee Access**
   - Employees can view their own tracking data
   - Provide data export options
   - Allow employees to dispute inaccuracies

## Troubleshooting

### "Scheduled timers are only available for full-time employees"

**Cause:** Employee is designated as Freelancer

**Solution:**
1. Go to Team Management
2. Edit the employee
3. Change Employment Type to "Full-time Employee"
4. Save changes

### "Employee has not given consent for automatic timers"

**Cause:** No active work agreement with consent

**Solution:**
1. Create Work Agreement (if none exists)
2. Check "Automatic Timer Consent" checkbox
3. Admin signs the agreement
4. Employee must review and sign
5. Agreement must show status "Active"

### "Screenshots not capturing for full-time employee"

**Cause:** Missing screenshot consent in work agreement

**Solution:**
1. Check employee's work agreement
2. Verify "Screenshot Monitoring Consent" is checked
3. Verify agreement is signed by both parties
4. Verify agreement status is "Active"

### "Manager cannot create scheduled timer"

**Possible causes:**
1. Manager not assigned to employee
   - Solution: Send and accept assignment request
2. Employee is freelancer
   - Solution: Change employment type to full-time
3. No consent in agreement
   - Solution: Update work agreement with consent checkboxes

## API Integration

### Checking Employment Type

```javascript
const employee = await teamAPI.getMember(employeeId);
const isFullTime = employee.employment_type === 'full_time';
```

### Checking Consent Status

```python
from utils.consent_checker import ConsentChecker

# Check auto timer consent
consent_result = await ConsentChecker.check_auto_timer_consent(db, user_id)
if consent_result['has_consent']:
    # Can create scheduled timer
else:
    # Show error: consent_result['reason']

# Check screenshot consent
screenshot_consent = await ConsentChecker.check_screenshot_consent(db, user_id)

# Check activity tracking consent
activity_consent = await ConsentChecker.check_activity_tracking_consent(db, user_id)
```

### Creating Work Agreement with Consent

```javascript
const agreementData = {
  employee_id: 'user_abc123',
  title: 'Software Developer Employment Agreement',
  description: 'Standard employment terms for software developers',
  start_date: '2026-01-15',
  end_date: '2027-01-15',
  hourly_rate: 45.00,
  auto_timer_consent: true,      // Enable automatic timers
  screenshot_consent: true,       // Enable screenshots
  activity_tracking_consent: true // Enable activity tracking
};

await workAgreementsAPI.create(agreementData);
```

## Database Schema Reference

### Users Table

```sql
users (
  user_id TEXT PRIMARY KEY,
  employment_type TEXT DEFAULT 'freelancer', -- 'freelancer' or 'full_time'
  ...
)
```

### Work Agreements Table

```sql
work_agreements (
  agreement_id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES users(user_id),
  auto_timer_consent BOOLEAN DEFAULT false,
  screenshot_consent BOOLEAN DEFAULT false,
  activity_tracking_consent BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  admin_signed BOOLEAN DEFAULT false,
  employee_signed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'expired', 'terminated'
  ...
)
```

### Consent Audit Log

```sql
consent_audit_log (
  audit_id TEXT PRIMARY KEY,
  user_id TEXT,
  agreement_id TEXT,
  consent_type TEXT, -- 'auto_timer', 'screenshot', 'activity_tracking'
  consent_given BOOLEAN,
  given_by TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
```

## Support and Questions

For implementation questions or legal compliance guidance:
- Contact your HR department
- Consult with legal counsel for region-specific regulations
- Review company privacy policy
- Contact Working Tracker support

---

**Last Updated:** January 2026
**Version:** 2.0
