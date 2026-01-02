# Developer Guide - Employment Types & Consent System

## Quick Start

This guide provides technical implementation details for the employment type and consent-based tracking system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend Layer                    │
│  - Team.jsx (employment type selector)              │
│  - WorkAgreements.jsx (consent checkboxes)          │
│  - EmployeeAssignments.jsx (manager assignment)     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                   Backend API Layer                  │
│  - /scheduled-timers (consent validation)           │
│  - /work-agreements (consent management)            │
│  - /employee-assignments (two-way consent)          │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  Consent Checker                     │
│  - Employment type validation                        │
│  - Active agreement verification                     │
│  - Consent status checks                             │
│  - Audit logging                                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 Supabase Database                    │
│  - users (employment_type column)                   │
│  - work_agreements (consent fields)                 │
│  - consent_audit_log (compliance tracking)          │
└─────────────────────────────────────────────────────┘
```

## Key Components

### 1. Database Schema

#### Users Table Enhancement

```sql
-- Add employment type to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'freelancer';
ALTER TABLE users ADD CONSTRAINT employment_type_check
  CHECK (employment_type IN ('freelancer', 'full_time'));
```

#### Work Agreements Table

```sql
CREATE TABLE work_agreements (
  agreement_id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(company_id),
  employee_id TEXT REFERENCES users(user_id),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  hourly_rate NUMERIC(10,2) DEFAULT 0,

  -- Consent fields
  auto_timer_consent BOOLEAN DEFAULT false,
  screenshot_consent BOOLEAN DEFAULT false,
  activity_tracking_consent BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,

  -- Signatures
  admin_signature TEXT,
  admin_signed BOOLEAN DEFAULT false,
  admin_signed_at TIMESTAMPTZ,
  employee_signature TEXT,
  employee_signed BOOLEAN DEFAULT false,
  employee_signed_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'draft',

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT status_check CHECK (status IN ('draft', 'active', 'expired', 'terminated'))
);
```

#### Consent Audit Log

```sql
CREATE TABLE consent_audit_log (
  audit_id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(user_id),
  agreement_id TEXT REFERENCES work_agreements(agreement_id),
  consent_type TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL,
  given_by TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Backend Utilities

#### ConsentChecker Class

Location: `/backend/utils/consent_checker.py`

**Purpose:** Centralized consent validation logic

**Methods:**

```python
class ConsentChecker:
    @staticmethod
    async def check_employment_type(db, user_id: str) -> str:
        """Returns 'freelancer' or 'full_time'"""

    @staticmethod
    async def is_full_time_employee(db, user_id: str) -> bool:
        """Returns True if user is full-time"""

    @staticmethod
    async def has_active_agreement(db, user_id: str) -> Optional[Dict]:
        """Returns active signed agreement or None"""

    @staticmethod
    async def check_auto_timer_consent(db, user_id: str) -> Dict:
        """
        Returns:
        {
            "has_consent": bool,
            "employment_type": str,
            "agreement_id": str,
            "reason": str
        }
        """

    @staticmethod
    async def check_screenshot_consent(db, user_id: str) -> Dict:
        """Check screenshot monitoring consent"""

    @staticmethod
    async def check_activity_tracking_consent(db, user_id: str) -> Dict:
        """Check activity tracking consent"""

    @staticmethod
    async def log_consent_check(db, user_id: str, consent_type: str,
                                result: Dict, ip_address: str = None,
                                user_agent: str = None):
        """Log consent check for audit purposes"""
```

**Usage Example:**

```python
from utils.consent_checker import ConsentChecker

# Before creating scheduled timer
consent_result = await ConsentChecker.check_auto_timer_consent(db, employee_id)
if not consent_result["has_consent"]:
    raise HTTPException(
        status_code=403,
        detail=f"Cannot create scheduled timer: {consent_result['reason']}"
    )

# Before capturing screenshot
screenshot_consent = await ConsentChecker.check_screenshot_consent(db, user_id)
if not screenshot_consent["has_consent"]:
    logger.warning(f"Screenshot skipped: {screenshot_consent['reason']}")
    return
```

### 3. API Endpoints

#### Update Team Member

**Endpoint:** `PUT /api/team/{user_id}`

**Request Body:**
```json
{
  "role": "employee",
  "hourly_rate": 45.00,
  "employment_type": "full_time"
}
```

**Backend Validation:**
```python
@router.put("/{user_id}")
async def update_member(user_id: str, data: MemberUpdate, request, user: dict):
    # Validate employment type
    if data.employment_type and data.employment_type not in ['freelancer', 'full_time']:
        raise HTTPException(400, "Invalid employment type")

    # Update user
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "role": data.role,
            "hourly_rate": data.hourly_rate,
            "employment_type": data.employment_type
        }}
    )
```

#### Create Work Agreement

**Endpoint:** `POST /api/work-agreements`

**Request Body:**
```json
{
  "employee_id": "user_abc123",
  "title": "Software Developer Agreement",
  "description": "Standard employment terms",
  "start_date": "2026-01-15",
  "end_date": "2027-01-15",
  "hourly_rate": 45.00,
  "auto_timer_consent": true,
  "screenshot_consent": true,
  "activity_tracking_consent": false
}
```

**Backend Logic:**
```python
@router.post("")
async def create_agreement(data: WorkAgreementCreate, request, user: dict):
    # Get employee
    employee = await db.users.find_one({"user_id": data.employee_id})

    # Check if full-time
    is_full_time = employee.get("employment_type") == "full_time"

    # Create agreement
    agreement_doc = {
        "agreement_id": generate_id("agreement"),
        # ... other fields
        # Only set consent if full-time
        "auto_timer_consent": data.auto_timer_consent if is_full_time else False,
        "screenshot_consent": data.screenshot_consent if is_full_time else False,
        "activity_tracking_consent": data.activity_tracking_consent if is_full_time else False,
    }
```

#### Create Scheduled Timer

**Endpoint:** `POST /api/scheduled-timers`

**Consent Validation:**
```python
@router.post("")
async def create_scheduled_timer(data: ScheduledTimerCreate, request, user: dict):
    # Get employee
    employee = await db.users.find_one({"user_id": data.employee_id})

    # Check employment type
    employment_type = employee.get("employment_type", "freelancer")
    if employment_type != "full_time":
        raise HTTPException(403,
            "Scheduled timers are only available for full-time employees")

    # Check consent
    consent_result = await ConsentChecker.check_auto_timer_consent(db, data.employee_id)
    if not consent_result["has_consent"]:
        raise HTTPException(403,
            f"Employee has not given consent: {consent_result['reason']}")

    # Create schedule...
```

### 4. Frontend Components

#### Team Member Edit Dialog

Location: `/frontend/src/pages/Team.jsx`

**Employment Type Selector:**
```jsx
<Select
  value={selectedMember.employment_type || 'freelancer'}
  onValueChange={(value) =>
    setSelectedMember({ ...selectedMember, employment_type: value })
  }
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="freelancer">
      <UserCircle className="w-4 h-4" />
      Freelancer
    </SelectItem>
    <SelectItem value="full_time">
      <Briefcase className="w-4 h-4" />
      Full-time Employee
    </SelectItem>
  </SelectContent>
</Select>
```

**Update Handler:**
```jsx
const handleUpdateMember = async () => {
  await teamAPI.updateMember(selectedMember.user_id, {
    role: selectedMember.role,
    hourly_rate: selectedMember.hourly_rate,
    employment_type: selectedMember.employment_type,
  });
};
```

#### Work Agreement Consent Checkboxes

Location: `/frontend/src/pages/WorkAgreements.jsx`

**Conditional Rendering:**
```jsx
const isFullTimeEmployee = () => {
  const employee = employees.find(e => e.user_id === formData.employee_id);
  return employee?.employment_type === 'full_time';
};

// In form render
{isFullTimeEmployee() && (
  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
    <Badge>Full-time Employee Consent Required</Badge>

    <Checkbox
      checked={formData.auto_timer_consent}
      onCheckedChange={(checked) =>
        setFormData({...formData, auto_timer_consent: checked})
      }
    >
      Automatic Timer Consent
    </Checkbox>

    <Checkbox checked={formData.screenshot_consent}>
      Screenshot Monitoring Consent
    </Checkbox>

    <Checkbox checked={formData.activity_tracking_consent}>
      Activity Tracking Consent
    </Checkbox>
  </div>
)}
```

### 5. Screenshot Scheduler Integration

Location: `/backend/utils/screenshot_scheduler.py`

**Consent Check Before Capture:**
```python
async def capture_screenshot_callback(entry_id: str, user_id: str, company_id: str):
    from utils.consent_checker import ConsentChecker

    # Check screenshot consent
    consent_result = await ConsentChecker.check_screenshot_consent(db, user_id)
    if not consent_result["has_consent"]:
        logger.warning(f"Screenshot capture skipped for user {user_id}: {consent_result['reason']}")
        return

    # Proceed with screenshot capture
    # ... capture logic
```

## Testing

### Unit Tests

```python
# Test consent checker
async def test_freelancer_auto_timer_consent():
    # Freelancers should never have auto timer consent
    result = await ConsentChecker.check_auto_timer_consent(db, freelancer_id)
    assert result["has_consent"] == False
    assert result["employment_type"] == "freelancer"

async def test_fulltime_with_consent():
    # Full-time with signed agreement should have consent
    result = await ConsentChecker.check_auto_timer_consent(db, fulltime_id)
    assert result["has_consent"] == True
    assert result["agreement_id"] is not None
```

### Integration Tests

```python
async def test_scheduled_timer_requires_consent():
    # Try to create scheduled timer for employee without consent
    response = await client.post("/api/scheduled-timers", json={
        "employee_id": employee_id,
        "schedule_type": "daily",
        "start_time": "09:00"
    })
    assert response.status_code == 403
    assert "consent" in response.json()["detail"].lower()
```

## Migration Path

### From Existing System

1. **Add employment_type column:**
   ```sql
   ALTER TABLE users ADD COLUMN employment_type TEXT DEFAULT 'freelancer';
   ```

2. **Default all users to freelancer:**
   - Preserves existing behavior
   - No automatic tracking until explicitly enabled

3. **Admin identifies full-time employees:**
   - Update employment_type to 'full_time'
   - Create work agreements
   - Obtain signatures

4. **Enable automatic features:**
   - Only after agreements are signed
   - Gradual rollout per employee

## Security Considerations

### Data Access

- RLS policies enforce company isolation
- Employees can only view their own tracking data
- Managers can only access assigned employees
- Admins have full company access

### Consent Validation

- **Always check consent before capture**
- **Never cache consent status** (always query fresh)
- **Log all consent checks** for audit trail
- **Fail secure** - deny by default

### Signature Verification

- Signatures stored as base64 PNG
- Timestamp recorded for both parties
- IP address and user agent logged
- Cannot modify agreement after signing

## Performance Optimization

### Consent Caching Strategy

```python
# Cache consent status for short duration
from functools import lru_cache
from datetime import datetime, timedelta

class ConsentCache:
    def __init__(self):
        self.cache = {}
        self.ttl = timedelta(minutes=5)

    def get(self, user_id, consent_type):
        key = f"{user_id}:{consent_type}"
        if key in self.cache:
            cached_time, result = self.cache[key]
            if datetime.now() - cached_time < self.ttl:
                return result
        return None

    def set(self, user_id, consent_type, result):
        key = f"{user_id}:{consent_type}"
        self.cache[key] = (datetime.now(), result)
```

### Database Indexes

```sql
-- Speed up consent checks
CREATE INDEX idx_users_employment_type ON users(employment_type);
CREATE INDEX idx_work_agreements_employee ON work_agreements(employee_id, status);
CREATE INDEX idx_work_agreements_active ON work_agreements(status, admin_signed, employee_signed);
```

## Troubleshooting

### Consent Check Failing

1. **Check employment type:**
   ```sql
   SELECT user_id, name, employment_type FROM users WHERE user_id = 'user_abc123';
   ```

2. **Check active agreement:**
   ```sql
   SELECT * FROM work_agreements
   WHERE employee_id = 'user_abc123'
   AND status = 'active'
   AND admin_signed = true
   AND employee_signed = true;
   ```

3. **Check consent fields:**
   ```sql
   SELECT auto_timer_consent, screenshot_consent, activity_tracking_consent
   FROM work_agreements WHERE agreement_id = 'agreement_xyz789';
   ```

### Screenshots Not Capturing

1. Check screenshot consent in agreement
2. Verify agreement is fully signed
3. Check screenshot scheduler is running
4. Review consent audit logs

## Best Practices

### For Developers

1. **Always use ConsentChecker utility** - Don't implement consent checks inline
2. **Log all consent decisions** - Use audit logging for compliance
3. **Test both employment types** - Ensure freelancers and full-time work correctly
4. **Handle consent errors gracefully** - Provide clear error messages
5. **Document consent requirements** - API docs should mention consent needs

### For Deployment

1. **Run migrations in order** - Schema changes must be sequential
2. **Backup before employment type changes** - Data safety first
3. **Monitor consent audit logs** - Watch for consent failures
4. **Set up alerts** - Notify admins of consent-related errors

## Resources

- [Employment and Consent Guide](./EMPLOYMENT_AND_CONSENT_GUIDE.md) - User-facing documentation
- [Supabase Database Schema](./supabase/migrations/) - Complete schema
- [API Documentation](./API_DOCUMENTATION.md) - Full API reference
- [PRD](./memory/PRD.md) - Original product requirements

---

**Version:** 2.0
**Last Updated:** January 2026
