#!/usr/bin/env python3
"""
Employee Time Tracking & Monitoring Software - Backend API Testing
Tests all core functionality including auth, time tracking, dashboard, etc.
"""

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class WorkMonitorAPITester:
    def __init__(self, base_url="https://workmonitor-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.company_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data and not success:
            result["response"] = str(response_data)[:500]  # Limit response size
        
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Any]:
        """Make API request with error handling"""
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}

            return success, response_data

        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def test_api_health(self):
        """Test basic API connectivity"""
        success, response = self.make_request('GET', '/')
        if success:
            self.log_test("API Health Check", True, f"API is running: {response.get('message', 'OK')}")
        else:
            self.log_test("API Health Check", False, f"API not accessible: {response}")
        return success

    def test_user_registration(self):
        """Test user registration with company creation"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "email": f"testuser_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "company_name": f"Test Company {timestamp}"
        }

        success, response = self.make_request('POST', '/auth/register', test_data, 200)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.company_id = response['user']['company_id']
            self.log_test("User Registration", True, f"User created with ID: {self.user_data['user_id']}")
            return True
        else:
            self.log_test("User Registration", False, f"Registration failed", response)
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return False

        # Create a new user for login test
        timestamp = datetime.now().strftime("%H%M%S")
        register_data = {
            "email": f"logintest_{timestamp}@example.com",
            "password": "LoginTest123!",
            "name": f"Login Test User {timestamp}",
            "company_name": f"Login Test Company {timestamp}"
        }

        # Register user first
        success, reg_response = self.make_request('POST', '/auth/register', register_data, 200)
        if not success:
            self.log_test("User Login", False, "Failed to create test user for login", reg_response)
            return False

        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }

        success, response = self.make_request('POST', '/auth/login', login_data, 200)
        
        if success and 'token' in response and 'user' in response:
            self.log_test("User Login", True, f"Login successful for user: {response['user']['email']}")
            return True
        else:
            self.log_test("User Login", False, f"Login failed", response)
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        if not self.token:
            self.log_test("Auth Me", False, "No token available")
            return False

        success, response = self.make_request('GET', '/auth/me')
        
        if success and 'user_id' in response:
            self.log_test("Auth Me", True, f"User info retrieved: {response['name']}")
            return True
        else:
            self.log_test("Auth Me", False, f"Failed to get user info", response)
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats API"""
        if not self.token:
            self.log_test("Dashboard Stats", False, "No token available")
            return False

        success, response = self.make_request('GET', '/dashboard/stats')
        
        if success and isinstance(response, dict):
            expected_keys = ['today_hours', 'week_hours', 'month_hours', 'avg_activity']
            has_keys = all(key in response for key in expected_keys)
            if has_keys:
                self.log_test("Dashboard Stats", True, f"Stats retrieved with {len(response)} fields")
                return True
            else:
                self.log_test("Dashboard Stats", False, f"Missing expected keys in response", response)
                return False
        else:
            self.log_test("Dashboard Stats", False, f"Invalid stats response", response)
            return False

    def test_time_entry_creation(self):
        """Test time entry creation (start timer)"""
        if not self.token:
            self.log_test("Time Entry Creation", False, "No token available")
            return False

        entry_data = {
            "start_time": datetime.now(timezone.utc).isoformat(),
            "source": "manual",
            "notes": "Test time entry"
        }

        success, response = self.make_request('POST', '/time-entries', entry_data, 200)
        
        if success and 'entry_id' in response:
            self.entry_id = response['entry_id']
            self.log_test("Time Entry Creation", True, f"Time entry created: {self.entry_id}")
            return True
        else:
            self.log_test("Time Entry Creation", False, f"Failed to create time entry", response)
            return False

    def test_time_entries_retrieval(self):
        """Test retrieving time entries"""
        if not self.token:
            self.log_test("Time Entries Retrieval", False, "No token available")
            return False

        success, response = self.make_request('GET', '/time-entries')
        
        if success and isinstance(response, list):
            self.log_test("Time Entries Retrieval", True, f"Retrieved {len(response)} time entries")
            return True
        else:
            self.log_test("Time Entries Retrieval", False, f"Failed to retrieve time entries", response)
            return False

    def test_active_time_entry(self):
        """Test getting active time entry"""
        if not self.token:
            self.log_test("Active Time Entry", False, "No token available")
            return False

        success, response = self.make_request('GET', '/time-entries/active')
        
        if success:
            if response is None:
                self.log_test("Active Time Entry", True, "No active time entry (expected)")
            else:
                self.log_test("Active Time Entry", True, f"Active entry found: {response.get('entry_id', 'unknown')}")
            return True
        else:
            self.log_test("Active Time Entry", False, f"Failed to get active entry", response)
            return False

    def test_timesheet_generation(self):
        """Test timesheet generation"""
        if not self.token:
            self.log_test("Timesheet Generation", False, "No token available")
            return False

        success, response = self.make_request('POST', '/timesheets/generate', {}, 200)
        
        if success and 'timesheet_id' in response:
            self.log_test("Timesheet Generation", True, f"Timesheet generated: {response['timesheet_id']}")
            return True
        else:
            self.log_test("Timesheet Generation", False, f"Failed to generate timesheet", response)
            return False

    def test_leave_request_creation(self):
        """Test leave request creation"""
        if not self.token:
            self.log_test("Leave Request Creation", False, "No token available")
            return False

        leave_data = {
            "leave_type": "vacation",
            "start_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=9)).isoformat(),
            "reason": "Test vacation leave"
        }

        success, response = self.make_request('POST', '/leaves', leave_data, 200)
        
        if success and 'leave_id' in response:
            self.log_test("Leave Request Creation", True, f"Leave request created: {response['leave_id']}")
            return True
        else:
            self.log_test("Leave Request Creation", False, f"Failed to create leave request", response)
            return False

    def test_leave_requests_retrieval(self):
        """Test retrieving leave requests"""
        if not self.token:
            self.log_test("Leave Requests Retrieval", False, "No token available")
            return False

        success, response = self.make_request('GET', '/leaves')
        
        if success and isinstance(response, list):
            self.log_test("Leave Requests Retrieval", True, f"Retrieved {len(response)} leave requests")
            return True
        else:
            self.log_test("Leave Requests Retrieval", False, f"Failed to retrieve leave requests", response)
            return False

    def test_team_members_listing(self):
        """Test team members listing"""
        if not self.token:
            self.log_test("Team Members Listing", False, "No token available")
            return False

        success, response = self.make_request('GET', '/team')
        
        if success and isinstance(response, list):
            self.log_test("Team Members Listing", True, f"Retrieved {len(response)} team members")
            return True
        else:
            self.log_test("Team Members Listing", False, f"Failed to retrieve team members", response)
            return False

    def test_company_settings_retrieval(self):
        """Test company settings retrieval"""
        if not self.token:
            self.log_test("Company Settings Retrieval", False, "No token available")
            return False

        success, response = self.make_request('GET', '/company')
        
        if success and 'company_id' in response:
            self.log_test("Company Settings Retrieval", True, f"Company settings retrieved: {response['name']}")
            return True
        else:
            self.log_test("Company Settings Retrieval", False, f"Failed to retrieve company settings", response)
            return False

    def test_timesheets_retrieval(self):
        """Test timesheets retrieval"""
        if not self.token:
            self.log_test("Timesheets Retrieval", False, "No token available")
            return False

        success, response = self.make_request('GET', '/timesheets')
        
        if success and isinstance(response, list):
            self.log_test("Timesheets Retrieval", True, f"Retrieved {len(response)} timesheets")
            return True
        else:
            self.log_test("Timesheets Retrieval", False, f"Failed to retrieve timesheets", response)
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Employee Time Tracking & Monitoring Software Backend Tests")
        print(f"📍 Testing API at: {self.api_base}")
        print("=" * 80)

        # Test sequence
        tests = [
            self.test_api_health,
            self.test_user_registration,
            self.test_user_login,
            self.test_auth_me,
            self.test_dashboard_stats,
            self.test_time_entry_creation,
            self.test_time_entries_retrieval,
            self.test_active_time_entry,
            self.test_timesheet_generation,
            self.test_leave_request_creation,
            self.test_leave_requests_retrieval,
            self.test_team_members_listing,
            self.test_company_settings_retrieval,
            self.test_timesheets_retrieval,
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Test exception: {str(e)}")

        # Print summary
        print("=" * 80)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

    def get_test_results(self):
        """Get detailed test results"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": round((self.tests_passed / max(self.tests_run, 1)) * 100, 1),
            "results": self.test_results
        }

def main():
    tester = WorkMonitorAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    results = tester.get_test_results()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/backend_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())