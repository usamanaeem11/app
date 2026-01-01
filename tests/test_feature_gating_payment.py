"""
Backend API Tests for Feature Gating and Payment Method Changes
================================================================
Tests for:
- Feature gating for Starter plan users (payroll, invoices, attendance, shifts, leaves)
- Screenshot daily limit for Starter plan (100/day)
- Stripe checkout session creation
- Removal of PayPal, Payoneer, Wise payment options
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chronos-pro.preview.emergentagent.com')

# Test credentials for Pro plan user (has trial)
PRO_USER_EMAIL = "testuser2@example.com"
PRO_USER_PASSWORD = "TestPass123!"


class TestFeatureGatingStarterPlan:
    """Tests for feature gating - Starter plan users should get 403 for Pro features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with a new Starter plan user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a new user without subscription (defaults to Starter features)
        random_id = str(uuid.uuid4())[:8]
        self.test_email = f"starter_test_{random_id}@example.com"
        
        register_response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": "TestPass123!",
                "name": "Starter Test User",
                "company_name": f"Starter Test Company {random_id}"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.token = data["token"]
            self.company_id = data["user"]["company_id"]
            self.user_id = data["user"]["user_id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to create test user")
    
    def test_payroll_returns_403_for_starter(self):
        """Test GET /api/payroll returns 403 for Starter plan users"""
        response = self.session.get(f"{BASE_URL}/api/payroll")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "payroll"
        assert data["detail"]["required_plan"] == "Pro"
        
        print("✓ GET /api/payroll returns 403 for Starter plan")
    
    def test_leaves_get_returns_403_for_starter(self):
        """Test GET /api/leaves returns 403 for Starter plan users"""
        response = self.session.get(f"{BASE_URL}/api/leaves")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "leave_management"
        
        print("✓ GET /api/leaves returns 403 for Starter plan")
    
    def test_leaves_post_returns_403_for_starter(self):
        """Test POST /api/leaves returns 403 for Starter plan users"""
        response = self.session.post(
            f"{BASE_URL}/api/leaves",
            json={
                "leave_type": "vacation",
                "start_date": "2026-01-10T00:00:00Z",
                "end_date": "2026-01-12T00:00:00Z",
                "reason": "Test leave"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "leave_management"
        
        print("✓ POST /api/leaves returns 403 for Starter plan")
    
    def test_shifts_get_returns_403_for_starter(self):
        """Test GET /api/shifts returns 403 for Starter plan users"""
        response = self.session.get(f"{BASE_URL}/api/shifts")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "shift_scheduling"
        
        print("✓ GET /api/shifts returns 403 for Starter plan")
    
    def test_shifts_post_returns_403_for_starter(self):
        """Test POST /api/shifts returns 403 for Starter plan users"""
        response = self.session.post(
            f"{BASE_URL}/api/shifts",
            json={
                "name": "Morning Shift",
                "start_time": "09:00",
                "end_time": "17:00",
                "days": [0, 1, 2, 3, 4],
                "break_duration": 60
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "shift_scheduling"
        
        print("✓ POST /api/shifts returns 403 for Starter plan")
    
    def test_attendance_clock_in_returns_403_for_starter(self):
        """Test POST /api/attendance/clock-in returns 403 for Starter plan users"""
        response = self.session.post(f"{BASE_URL}/api/attendance/clock-in")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "attendance_management"
        
        print("✓ POST /api/attendance/clock-in returns 403 for Starter plan")
    
    def test_attendance_clock_out_returns_403_for_starter(self):
        """Test POST /api/attendance/clock-out returns 403 for Starter plan users"""
        response = self.session.post(f"{BASE_URL}/api/attendance/clock-out")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "attendance_management"
        
        print("✓ POST /api/attendance/clock-out returns 403 for Starter plan")
    
    def test_invoices_returns_403_for_starter(self):
        """Test GET /api/invoices returns 403 for Starter plan users"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert data["detail"]["error"] == "feature_not_available"
        assert data["detail"]["feature"] == "invoices"
        
        print("✓ GET /api/invoices returns 403 for Starter plan")


class TestScreenshotLimitStarterPlan:
    """Tests for screenshot daily limit (100/day for Starter plan)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with a new Starter plan user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a new user without subscription
        random_id = str(uuid.uuid4())[:8]
        self.test_email = f"screenshot_test_{random_id}@example.com"
        
        register_response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": self.test_email,
                "password": "TestPass123!",
                "name": "Screenshot Test User",
                "company_name": f"Screenshot Test Company {random_id}"
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.token = data["token"]
            self.company_id = data["user"]["company_id"]
            self.user_id = data["user"]["user_id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to create test user")
    
    def test_screenshot_upload_returns_limit_info(self):
        """Test POST /api/screenshots returns limit info for Starter plan"""
        # First create a time entry
        entry_response = self.session.post(
            f"{BASE_URL}/api/time-entries",
            json={
                "start_time": "2026-01-02T09:00:00Z",
                "source": "manual"
            }
        )
        assert entry_response.status_code == 200
        entry_id = entry_response.json()["entry_id"]
        
        # Upload screenshot
        response = self.session.post(
            f"{BASE_URL}/api/screenshots",
            json={
                "time_entry_id": entry_id,
                "s3_url": "https://example.com/screenshot.png",
                "blurred": False,
                "app_name": "Chrome",
                "window_title": "Test"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "limit_info" in data
        assert data["limit_info"]["limit"] == 100, "Starter plan should have 100 screenshot limit"
        assert data["limit_info"]["allowed"] == True
        assert "remaining" in data["limit_info"]
        
        print("✓ POST /api/screenshots returns limit info (100/day for Starter)")


class TestProPlanFeatureAccess:
    """Tests for Pro plan users - should have access to all Pro features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with Pro plan user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with Pro plan user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": PRO_USER_EMAIL,
                "password": PRO_USER_PASSWORD
            }
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data["token"]
            self.company_id = data["user"]["company_id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Failed to login with Pro user")
    
    def test_payroll_accessible_for_pro(self):
        """Test GET /api/payroll is accessible for Pro plan users"""
        response = self.session.get(f"{BASE_URL}/api/payroll")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ GET /api/payroll accessible for Pro plan")
    
    def test_leaves_accessible_for_pro(self):
        """Test GET /api/leaves is accessible for Pro plan users"""
        response = self.session.get(f"{BASE_URL}/api/leaves")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ GET /api/leaves accessible for Pro plan")
    
    def test_shifts_accessible_for_pro(self):
        """Test GET /api/shifts is accessible for Pro plan users"""
        response = self.session.get(f"{BASE_URL}/api/shifts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ GET /api/shifts accessible for Pro plan")
    
    def test_invoices_accessible_for_pro(self):
        """Test GET /api/invoices is accessible for Pro plan users"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ GET /api/invoices accessible for Pro plan")


class TestStripeCheckout:
    """Tests for Stripe checkout - should only use Card/Stripe"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_stripe_checkout_session_monthly(self):
        """Test POST /api/payments/checkout/session creates Stripe URL"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan": "monthly",
                "num_users": 5,
                "origin_url": "https://chronos-pro.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "url" in data, "Response should contain Stripe checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), "URL should redirect to Stripe"
        
        print("✓ POST /api/payments/checkout/session creates Stripe URL")
    
    def test_stripe_checkout_session_yearly(self):
        """Test POST /api/payments/checkout/session - yearly plan"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan": "yearly",
                "num_users": 10,
                "origin_url": "https://chronos-pro.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["url"].startswith("https://checkout.stripe.com")
        assert data["plan"] == "yearly"
        
        print("✓ POST /api/payments/checkout/session - yearly plan works")
    
    def test_stripe_checkout_invalid_plan(self):
        """Test POST /api/payments/checkout/session - invalid plan returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan": "invalid_plan",
                "num_users": 5,
                "origin_url": "https://chronos-pro.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        
        print("✓ POST /api/payments/checkout/session - invalid plan returns 400")
    
    def test_stripe_checkout_zero_users(self):
        """Test POST /api/payments/checkout/session - zero users returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan": "monthly",
                "num_users": 0,
                "origin_url": "https://chronos-pro.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        
        print("✓ POST /api/payments/checkout/session - zero users returns 400")


class TestPricingPlans:
    """Tests for pricing plans API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_pricing_plans_starter_features(self):
        """Test Starter plan has correct feature restrictions"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plans")
        assert response.status_code == 200
        
        data = response.json()
        starter = next(p for p in data["plans"] if p["id"] == "starter")
        
        # Starter should NOT have these features
        assert starter["features"]["payroll"] == False
        assert starter["features"]["invoices"] == False
        assert starter["features"]["attendance_management"] == False
        assert starter["features"]["shift_scheduling"] == False
        assert starter["features"]["leave_management"] == False
        
        # Starter should have screenshot limit of 100
        assert starter["features"]["screenshot_limit"] == 100
        
        print("✓ Starter plan has correct feature restrictions")
    
    def test_pricing_plans_pro_features(self):
        """Test Pro plan has correct features enabled"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plans")
        assert response.status_code == 200
        
        data = response.json()
        pro = next(p for p in data["plans"] if p["id"] == "pro")
        
        # Pro should have these features
        assert pro["features"]["payroll"] == True
        assert pro["features"]["invoices"] == True
        assert pro["features"]["attendance_management"] == True
        assert pro["features"]["shift_scheduling"] == True
        assert pro["features"]["leave_management"] == True
        
        # Pro should have unlimited screenshots (-1)
        assert pro["features"]["screenshot_limit"] == -1
        
        print("✓ Pro plan has correct features enabled")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
