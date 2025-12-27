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

    # ==================== NEW FEATURES TESTING ====================
    
    def test_projects_crud(self):
        """Test Projects CRUD operations"""
        if not self.token:
            self.log_test("Projects CRUD", False, "No token available")
            return False

        # Create project
        project_data = {
            "name": "Test Project",
            "description": "A test project for API testing",
            "client_name": "Test Client",
            "budget_hours": 100.0,
            "hourly_rate": 50.0,
            "color": "#3B82F6"
        }

        success, response = self.make_request('POST', '/projects', project_data, 200)
        if not success or 'project_id' not in response:
            self.log_test("Projects CRUD - Create", False, f"Failed to create project", response)
            return False
        
        project_id = response['project_id']
        self.log_test("Projects CRUD - Create", True, f"Project created: {project_id}")

        # Get all projects
        success, response = self.make_request('GET', '/projects')
        if not success or not isinstance(response, list):
            self.log_test("Projects CRUD - List", False, f"Failed to get projects", response)
            return False
        
        self.log_test("Projects CRUD - List", True, f"Retrieved {len(response)} projects")

        # Get specific project
        success, response = self.make_request('GET', f'/projects/{project_id}')
        if not success or 'project_id' not in response:
            self.log_test("Projects CRUD - Get", False, f"Failed to get project", response)
            return False
        
        self.log_test("Projects CRUD - Get", True, f"Retrieved project: {response['name']}")

        # Update project
        update_data = {"status": "completed"}
        success, response = self.make_request('PUT', f'/projects/{project_id}', update_data)
        if not success:
            self.log_test("Projects CRUD - Update", False, f"Failed to update project", response)
            return False
        
        self.log_test("Projects CRUD - Update", True, "Project updated successfully")

        # Store project_id for tasks test
        self.project_id = project_id
        return True

    def test_tasks_crud(self):
        """Test Tasks CRUD operations"""
        if not self.token:
            self.log_test("Tasks CRUD", False, "No token available")
            return False

        if not hasattr(self, 'project_id'):
            self.log_test("Tasks CRUD", False, "No project_id available from projects test")
            return False

        # Create task
        task_data = {
            "project_id": self.project_id,
            "name": "Test Task",
            "description": "A test task for API testing",
            "priority": "high",
            "estimated_hours": 8.0,
            "status": "todo"
        }

        success, response = self.make_request('POST', '/tasks', task_data, 200)
        if not success or 'task_id' not in response:
            self.log_test("Tasks CRUD - Create", False, f"Failed to create task", response)
            return False
        
        task_id = response['task_id']
        self.log_test("Tasks CRUD - Create", True, f"Task created: {task_id}")

        # Get all tasks
        success, response = self.make_request('GET', '/tasks')
        if not success or not isinstance(response, list):
            self.log_test("Tasks CRUD - List", False, f"Failed to get tasks", response)
            return False
        
        self.log_test("Tasks CRUD - List", True, f"Retrieved {len(response)} tasks")

        # Get specific task
        success, response = self.make_request('GET', f'/tasks/{task_id}')
        if not success or 'task_id' not in response:
            self.log_test("Tasks CRUD - Get", False, f"Failed to get task", response)
            return False
        
        self.log_test("Tasks CRUD - Get", True, f"Retrieved task: {response['name']}")

        # Update task
        update_data = {"status": "in_progress"}
        success, response = self.make_request('PUT', f'/tasks/{task_id}', update_data)
        if not success:
            self.log_test("Tasks CRUD - Update", False, f"Failed to update task", response)
            return False
        
        self.log_test("Tasks CRUD - Update", True, "Task updated successfully")

        return True

    def test_attendance_clock_operations(self):
        """Test Attendance clock in/out operations"""
        if not self.token:
            self.log_test("Attendance Clock Operations", False, "No token available")
            return False

        # Get today's attendance first
        success, response = self.make_request('GET', '/attendance/today')
        if success:
            self.log_test("Attendance - Get Today", True, f"Today's attendance status: {response.get('status', 'not_clocked_in')}")
        
        # Clock in
        success, response = self.make_request('POST', '/attendance/clock-in', {}, 200)
        if not success:
            # Check if already clocked in
            if 'already clocked in' in str(response).lower():
                self.log_test("Attendance - Clock In", True, "Already clocked in (expected)")
            else:
                self.log_test("Attendance - Clock In", False, f"Failed to clock in", response)
                return False
        else:
            self.log_test("Attendance - Clock In", True, f"Clocked in successfully")

        # Get attendance records
        success, response = self.make_request('GET', '/attendance')
        if not success or not isinstance(response, list):
            self.log_test("Attendance - Get Records", False, f"Failed to get attendance records", response)
            return False
        
        self.log_test("Attendance - Get Records", True, f"Retrieved {len(response)} attendance records")

        # Try to clock out (might fail if not enough time has passed, which is OK)
        success, response = self.make_request('POST', '/attendance/clock-out', {}, 200)
        if success:
            self.log_test("Attendance - Clock Out", True, f"Clocked out successfully")
        else:
            # Check if not clocked in or already clocked out
            if 'not clocked in' in str(response).lower() or 'already clocked out' in str(response).lower():
                self.log_test("Attendance - Clock Out", True, "Clock out not applicable (expected)")
            else:
                self.log_test("Attendance - Clock Out", False, f"Failed to clock out", response)
                return False

        return True

    def test_shifts_crud(self):
        """Test Shifts CRUD operations"""
        if not self.token:
            self.log_test("Shifts CRUD", False, "No token available")
            return False

        # Create shift
        shift_data = {
            "name": "Morning Shift",
            "start_time": "09:00",
            "end_time": "17:00",
            "days": [0, 1, 2, 3, 4],  # Monday to Friday
            "break_duration": 60,
            "color": "#10B981"
        }

        success, response = self.make_request('POST', '/shifts', shift_data, 200)
        if not success or 'shift_id' not in response:
            self.log_test("Shifts CRUD - Create", False, f"Failed to create shift", response)
            return False
        
        shift_id = response['shift_id']
        self.log_test("Shifts CRUD - Create", True, f"Shift created: {shift_id}")

        # Get all shifts
        success, response = self.make_request('GET', '/shifts')
        if not success or not isinstance(response, list):
            self.log_test("Shifts CRUD - List", False, f"Failed to get shifts", response)
            return False
        
        self.log_test("Shifts CRUD - List", True, f"Retrieved {len(response)} shifts")

        # Update shift
        update_data = {"break_duration": 90}
        success, response = self.make_request('PUT', f'/shifts/{shift_id}', update_data)
        if not success:
            self.log_test("Shifts CRUD - Update", False, f"Failed to update shift", response)
            return False
        
        self.log_test("Shifts CRUD - Update", True, "Shift updated successfully")

        # Store shift_id for assignments test
        self.shift_id = shift_id
        return True

    def test_shift_assignments(self):
        """Test Shift assignments operations"""
        if not self.token:
            self.log_test("Shift Assignments", False, "No token available")
            return False

        if not hasattr(self, 'shift_id') or not hasattr(self, 'user_data'):
            self.log_test("Shift Assignments", False, "No shift_id or user_data available")
            return False

        # Create shift assignment
        assignment_data = {
            "user_id": self.user_data['user_id'],
            "shift_id": self.shift_id,
            "date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "notes": "Test assignment"
        }

        success, response = self.make_request('POST', '/shift-assignments', assignment_data, 200)
        if not success or 'assignment_id' not in response:
            self.log_test("Shift Assignments - Create", False, f"Failed to create assignment", response)
            return False
        
        assignment_id = response['assignment_id']
        self.log_test("Shift Assignments - Create", True, f"Assignment created: {assignment_id}")

        # Get all assignments
        success, response = self.make_request('GET', '/shift-assignments')
        if not success or not isinstance(response, list):
            self.log_test("Shift Assignments - List", False, f"Failed to get assignments", response)
            return False
        
        self.log_test("Shift Assignments - List", True, f"Retrieved {len(response)} assignments")

        return True

    def test_invoices_crud(self):
        """Test Invoices CRUD operations"""
        if not self.token:
            self.log_test("Invoices CRUD", False, "No token available")
            return False

        # Create invoice
        invoice_data = {
            "client_name": "Test Client Corp",
            "items": [
                {
                    "description": "Development work",
                    "hours": 10,
                    "rate": 100,
                    "amount": 1000
                }
            ],
            "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "notes": "Test invoice for API testing",
            "tax_rate": 10
        }

        success, response = self.make_request('POST', '/invoices', invoice_data, 200)
        if not success or 'invoice_id' not in response:
            self.log_test("Invoices CRUD - Create", False, f"Failed to create invoice", response)
            return False
        
        invoice_id = response['invoice_id']
        self.log_test("Invoices CRUD - Create", True, f"Invoice created: {invoice_id}")

        # Get all invoices
        success, response = self.make_request('GET', '/invoices')
        if not success or not isinstance(response, list):
            self.log_test("Invoices CRUD - List", False, f"Failed to get invoices", response)
            return False
        
        self.log_test("Invoices CRUD - List", True, f"Retrieved {len(response)} invoices")

        # Get specific invoice
        success, response = self.make_request('GET', f'/invoices/{invoice_id}')
        if not success or 'invoice_id' not in response:
            self.log_test("Invoices CRUD - Get", False, f"Failed to get invoice", response)
            return False
        
        self.log_test("Invoices CRUD - Get", True, f"Retrieved invoice: {response['invoice_number']}")

        # Update invoice status
        update_data = {"status": "sent"}
        success, response = self.make_request('PUT', f'/invoices/{invoice_id}', update_data)
        if not success:
            self.log_test("Invoices CRUD - Update", False, f"Failed to update invoice", response)
            return False
        
        self.log_test("Invoices CRUD - Update", True, "Invoice updated successfully")

        return True

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Employee Time Tracking & Monitoring Software Backend Tests")
        print(f"📍 Testing API at: {self.api_base}")
        print("=" * 80)

        # Test sequence - MVP tests first, then new features
        tests = [
            # MVP Tests
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
            # New Features Tests
            self.test_projects_crud,
            self.test_tasks_crud,
            self.test_attendance_clock_operations,
            self.test_shifts_crud,
            self.test_shift_assignments,
            self.test_invoices_crud,
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