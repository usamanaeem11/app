"""
Backend API Tests for Working Tracker Rebranding and Stripe Checkout
=====================================================================
Tests for:
- Working Tracker branding in AI chatbot responses
- Stripe checkout session creation
- support@workingtracker.com email in AI responses
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chronos-pro.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testuser2@example.com"
TEST_PASSWORD = "TestPass123!"


class TestStripeCheckout:
    """Tests for Stripe checkout endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_stripe_checkout_session_monthly(self):
        """Test POST /api/payments/checkout/session - monthly plan"""
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
        assert data["plan"] == "monthly"
        assert data["num_users"] == 5
        
        print(f"✓ POST /api/payments/checkout/session - Monthly plan creates Stripe session")
        print(f"  Stripe URL: {data['url'][:60]}...")
        
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
        assert "url" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        assert data["plan"] == "yearly"
        assert data["num_users"] == 10
        
        print(f"✓ POST /api/payments/checkout/session - Yearly plan creates Stripe session")
        
    def test_stripe_checkout_invalid_plan(self):
        """Test POST /api/payments/checkout/session - invalid plan should fail"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan": "invalid_plan",
                "num_users": 5,
                "origin_url": "https://chronos-pro.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        
        print("✓ POST /api/payments/checkout/session - Invalid plan returns 400")
        
    def test_stripe_checkout_zero_users(self):
        """Test POST /api/payments/checkout/session - zero users should fail"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan": "monthly",
                "num_users": 0,
                "origin_url": "https://chronos-pro.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        
        print("✓ POST /api/payments/checkout/session - Zero users returns 400")


class TestWorkingTrackerBranding:
    """Tests for Working Tracker branding in AI chatbot"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_ai_chatbot_working_tracker_branding(self):
        """Test AI chatbot responds with Working Tracker branding"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/ai/query",
            json={
                "query": "What is this product called?",
                "context": "User asking about the product name"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        
        # Check for Working Tracker branding (case insensitive)
        response_lower = data["response"].lower()
        assert "working tracker" in response_lower, \
            f"AI response should mention 'Working Tracker', got: {data['response'][:200]}"
        
        print("✓ AI chatbot responds with 'Working Tracker' branding")
        
    def test_ai_chatbot_support_email(self):
        """Test AI chatbot provides correct support email"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/ai/query",
            json={
                "query": "How can I contact support?",
                "context": "User needs support contact"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        
        # Check for correct support email
        assert "support@workingtracker.com" in data["response"], \
            f"AI response should contain 'support@workingtracker.com', got: {data['response'][:200]}"
        
        print("✓ AI chatbot provides support@workingtracker.com email")
        
    def test_ai_chatbot_no_workmonitor_branding(self):
        """Test AI chatbot does NOT use old WorkMonitor branding"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/ai/query",
            json={
                "query": "Tell me about your time tracking features",
                "context": "User asking about features"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        
        # Check that old branding is NOT present
        response_lower = data["response"].lower()
        assert "workmonitor" not in response_lower, \
            f"AI response should NOT mention 'WorkMonitor', got: {data['response'][:200]}"
        
        print("✓ AI chatbot does NOT use old 'WorkMonitor' branding")


class TestPricingWidget:
    """Tests for pricing widget data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_pricing_plans_starter_price(self):
        """Test pricing plans returns $2.99 for Starter"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plans")
        assert response.status_code == 200
        
        data = response.json()
        starter = next(p for p in data["plans"] if p["id"] == "starter")
        assert starter["monthly_price"] == 2.99, \
            f"Starter plan should be $2.99, got ${starter['monthly_price']}"
        
        print("✓ Starter plan price is $2.99/user/month")
        
    def test_pricing_plans_14_day_trial(self):
        """Test pricing plans returns 14-day trial"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert data["trial"]["duration_days"] == 14, \
            f"Trial should be 14 days, got {data['trial']['duration_days']}"
        
        print("✓ Free trial is 14 days")
        
    def test_pricing_plans_yearly_discount(self):
        """Test pricing plans has 20% yearly discount"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plans")
        assert response.status_code == 200
        
        data = response.json()
        
        for plan in data["plans"]:
            # Calculate expected yearly price with 20% discount
            expected_yearly = plan["monthly_price"] * 12 * 0.8
            actual_yearly = plan["yearly_price"]
            
            # Allow small floating point difference
            assert abs(actual_yearly - expected_yearly) < 0.01, \
                f"Plan {plan['id']} yearly price should be ~${expected_yearly:.2f}, got ${actual_yearly}"
        
        print("✓ All plans have 20% yearly discount")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
