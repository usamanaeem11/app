"""
Backend API Tests for Pricing, Team Chat, and AI Chatbot Features
=================================================================
Tests for:
- Pricing plans API
- Trial subscription
- Subscription status
- Chat channels
- AI chatbot query
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chronos-pro.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testuser2@example.com"
TEST_PASSWORD = "TestPass123!"


class TestPricingAPIs:
    """Tests for pricing-related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.company_id = None
        
    def test_get_pricing_plans(self):
        """Test GET /api/pricing/plans - should return 3 plans"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 3
        
        # Verify plan IDs
        plan_ids = [p["id"] for p in data["plans"]]
        assert "starter" in plan_ids
        assert "pro" in plan_ids
        assert "business" in plan_ids
        
        # Verify pricing
        starter = next(p for p in data["plans"] if p["id"] == "starter")
        assert starter["monthly_price"] == 2.99
        
        pro = next(p for p in data["plans"] if p["id"] == "pro")
        assert pro["monthly_price"] == 4.99
        assert pro["badge"] == "Most Popular"
        
        business = next(p for p in data["plans"] if p["id"] == "business")
        assert business["monthly_price"] == 6.99
        
        # Verify trial config
        assert "trial" in data
        assert data["trial"]["duration_days"] == 14
        assert data["trial"]["plan"] == "pro"
        
        # Verify feature categories
        assert "feature_categories" in data
        assert len(data["feature_categories"]) > 0
        
        print("✓ GET /api/pricing/plans - Returns 3 plans with correct pricing")
        
    def test_get_plan_details(self):
        """Test GET /api/pricing/plan/{plan_id} - should return plan details"""
        for plan_id in ["starter", "pro", "business"]:
            response = self.session.get(f"{BASE_URL}/api/pricing/plan/{plan_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == plan_id
            assert "features" in data
            assert "monthly_price" in data
            assert "yearly_price" in data
            
        print("✓ GET /api/pricing/plan/{plan_id} - Returns plan details for all plans")
        
    def test_get_plan_not_found(self):
        """Test GET /api/pricing/plan/{plan_id} - should return 404 for invalid plan"""
        response = self.session.get(f"{BASE_URL}/api/pricing/plan/invalid_plan")
        assert response.status_code == 404
        
        print("✓ GET /api/pricing/plan/invalid_plan - Returns 404")


class TestAuthenticatedPricingAPIs:
    """Tests for authenticated pricing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data["token"]
            self.company_id = data["user"]["company_id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Login failed - skipping authenticated tests")
            
    def test_get_subscription_status(self):
        """Test GET /api/pricing/subscription/{company_id}"""
        response = self.session.get(f"{BASE_URL}/api/pricing/subscription/{self.company_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_subscription" in data
        
        print(f"✓ GET /api/pricing/subscription/{self.company_id} - Returns subscription status")
        
    def test_get_company_features(self):
        """Test GET /api/pricing/features/{company_id}"""
        response = self.session.get(f"{BASE_URL}/api/pricing/features/{self.company_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "features" in data
        
        print(f"✓ GET /api/pricing/features/{self.company_id} - Returns company features")


class TestChatAPIs:
    """Tests for team chat endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data["token"]
            self.company_id = data["user"]["company_id"]
            self.user_name = data["user"]["name"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Login failed - skipping chat tests")
            
    def test_get_chat_channels(self):
        """Test GET /api/chat/channels - should return channels including AI Support"""
        response = self.session.get(f"{BASE_URL}/api/chat/channels?company_id={self.company_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "channels" in data
        
        # Should have at least AI Support channel
        channels = data["channels"]
        support_channels = [c for c in channels if c.get("type") == "support"]
        assert len(support_channels) > 0, "AI Support channel should exist"
        
        # Verify AI Support channel properties
        ai_support = support_channels[0]
        assert ai_support["name"] == "AI Support"
        assert ai_support.get("is_ai") == True
        
        print("✓ GET /api/chat/channels - Returns channels with AI Support")
        
    def test_create_chat_channel(self):
        """Test POST /api/chat/channels - create a new team channel"""
        channel_name = f"TEST_channel_{int(time.time())}"
        response = self.session.post(
            f"{BASE_URL}/api/chat/channels",
            json={
                "name": channel_name,
                "channel_type": "team",
                "company_id": self.company_id
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "channel_id" in data
        assert data["name"] == channel_name
        
        print(f"✓ POST /api/chat/channels - Created channel: {channel_name}")
        
    def test_ai_chatbot_query(self):
        """Test POST /api/chat/ai/query - AI chatbot should respond"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/ai/query",
            json={
                "query": "What is WorkMonitor?",
                "context": f"User: {self.user_name}"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "conversation_id" in data
        assert len(data["response"]) > 0, "AI should provide a response"
        
        # Verify response mentions WorkMonitor features
        response_text = data["response"].lower()
        assert any(keyword in response_text for keyword in ["time", "tracking", "monitor", "employee", "screenshot"]), \
            "AI response should mention WorkMonitor features"
        
        print("✓ POST /api/chat/ai/query - AI chatbot responds correctly")
        
    def test_ai_chatbot_feature_question(self):
        """Test AI chatbot with specific feature question"""
        response = self.session.post(
            f"{BASE_URL}/api/chat/ai/query",
            json={
                "query": "How do I track time in WorkMonitor?",
                "context": None
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 50, "AI should provide detailed response"
        
        print("✓ POST /api/chat/ai/query - AI answers feature questions")


class TestSignupFlow:
    """Tests for signup flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_register_new_user(self):
        """Test POST /api/auth/register - create new account"""
        unique_email = f"test_signup_{int(time.time())}@example.com"
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "name": "Test Signup User",
                "company_name": "Test Signup Company"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "admin"
        assert "company_id" in data["user"]
        
        print(f"✓ POST /api/auth/register - Created user: {unique_email}")
        
    def test_register_duplicate_email(self):
        """Test POST /api/auth/register - should fail for duplicate email"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_EMAIL,
                "password": "TestPass123!",
                "name": "Duplicate User",
                "company_name": "Duplicate Company"
            }
        )
        assert response.status_code == 400
        
        print("✓ POST /api/auth/register - Rejects duplicate email")


class TestCheckoutFlow:
    """Tests for checkout/payment flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data["token"]
            self.company_id = data["user"]["company_id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Login failed - skipping checkout tests")
            
    def test_subscribe_endpoint(self):
        """Test POST /api/pricing/subscribe - create subscription"""
        response = self.session.post(
            f"{BASE_URL}/api/pricing/subscribe",
            json={
                "plan": "pro",
                "billing_cycle": "monthly",
                "num_users": 5,
                "payment_method": "card",
                "auto_recurring": True
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "subscription" in data
        assert data["subscription"]["plan"] == "pro"
        assert data["subscription"]["num_users"] == 5
        
        print("✓ POST /api/pricing/subscribe - Creates subscription record")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
