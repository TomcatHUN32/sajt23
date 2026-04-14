#!/usr/bin/env python3
"""
Backend API Testing for Hungarian Car Tuning Community Platform
Tests all club and marketplace endpoints as specified in the requirements.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TuningCommunityAPITester:
    def __init__(self, base_url="https://marketplace-repair-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_club_id = None
        self.created_listing_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request with error handling"""
        url = f"{self.api_url}/{endpoint}"
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
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_auth_login(self):
        """Test login with admin credentials"""
        print("\n🔐 Testing Authentication...")
        
        # Try to login with admin credentials from requirements
        success, response = self.make_request(
            'POST', 
            'auth/login',
            {"email": "test1@test.com", "password": "Test1234!"},
            200
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('user_id')
            self.log_test("Admin Login", True, f"User ID: {self.user_id}")
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
            return False

    def test_clubs_endpoints(self):
        """Test all club-related endpoints"""
        print("\n🏎️ Testing Club Endpoints...")
        
        # Test GET /api/clubs - Should return both approved clubs AND the owner's pending clubs
        success, response = self.make_request('GET', 'clubs')
        self.log_test("GET /api/clubs", success, 
                     f"Returned {len(response) if isinstance(response, list) else 0} clubs" if success else str(response))
        
        # Test POST /api/clubs - Should create a club with pending status
        club_data = {
            "name": f"Test Club {datetime.now().strftime('%H%M%S')}",
            "description": "Test club for API testing",
            "is_public": True,
            "logo_image": "",
            "cover_image": ""
        }
        
        success, response = self.make_request('POST', 'clubs', club_data, 200)
        if success and 'club_id' in response:
            self.created_club_id = response['club_id']
            self.log_test("POST /api/clubs", True, f"Created club: {self.created_club_id}")
        else:
            self.log_test("POST /api/clubs", False, str(response))
        
        # Test GET /api/clubs/{club_id} - Should return club detail with membership info
        if self.created_club_id:
            success, response = self.make_request('GET', f'clubs/{self.created_club_id}')
            self.log_test("GET /api/clubs/{club_id}", success, 
                         f"Club status: {response.get('status', 'unknown')}" if success else str(response))
            
            # Test POST /api/clubs/{club_id}/join - Club joining
            success, response = self.make_request('POST', f'clubs/{self.created_club_id}/join', {})
            self.log_test("POST /api/clubs/{club_id}/join", success, 
                         response.get('message', '') if success else str(response))
            
            # Test GET /api/clubs/{club_id}/members - Club members list
            success, response = self.make_request('GET', f'clubs/{self.created_club_id}/members')
            self.log_test("GET /api/clubs/{club_id}/members", success,
                         f"Members count: {len(response) if isinstance(response, list) else 0}" if success else str(response))
            
            # Test POST /api/clubs/{club_id}/posts - Create club post
            post_data = {
                "content": "Test post in club",
                "image_base64": ""
            }
            success, response = self.make_request('POST', f'clubs/{self.created_club_id}/posts', post_data, 200)
            self.log_test("POST /api/clubs/{club_id}/posts", success,
                         f"Post ID: {response.get('post_id', '')}" if success else str(response))
            
            # Test GET /api/clubs/{club_id}/posts - Club posts list
            success, response = self.make_request('GET', f'clubs/{self.created_club_id}/posts')
            self.log_test("GET /api/clubs/{club_id}/posts", success,
                         f"Posts count: {len(response) if isinstance(response, list) else 0}" if success else str(response))
            
            # Test POST /api/clubs/{club_id}/leave - Club leaving
            success, response = self.make_request('POST', f'clubs/{self.created_club_id}/leave', {})
            self.log_test("POST /api/clubs/{club_id}/leave", success,
                         response.get('message', '') if success else str(response))

    def test_marketplace_endpoints(self):
        """Test all marketplace-related endpoints"""
        print("\n🛒 Testing Marketplace Endpoints...")
        
        # Test GET /api/marketplace/listings - Should return approved listings
        success, response = self.make_request('GET', 'marketplace/listings')
        self.log_test("GET /api/marketplace/listings", success,
                     f"Returned {len(response) if isinstance(response, list) else 0} listings" if success else str(response))
        
        # Test POST /api/marketplace/listings - Should create a listing
        listing_data = {
            "title": f"Test Listing {datetime.now().strftime('%H%M%S')}",
            "description": "Test listing for API testing",
            "price": 50000,
            "category": "Autók",
            "condition": "used",
            "location": "Budapest",
            "images": []
        }
        
        success, response = self.make_request('POST', 'marketplace/listings', listing_data, 200)
        if success and 'listing_id' in response:
            self.created_listing_id = response['listing_id']
            self.log_test("POST /api/marketplace/listings", True, f"Created listing: {self.created_listing_id}")
        else:
            self.log_test("POST /api/marketplace/listings", False, str(response))
        
        # Test GET /api/marketplace/listings/{listing_id} - Listing detail with view count increment
        if self.created_listing_id:
            success, response = self.make_request('GET', f'marketplace/listings/{self.created_listing_id}')
            self.log_test("GET /api/marketplace/listings/{listing_id}", success,
                         f"Views: {response.get('views_count', 0)}" if success else str(response))
            
            # Test POST /api/marketplace/listings/{listing_id}/favorite - Toggle favorite
            success, response = self.make_request('POST', f'marketplace/listings/{self.created_listing_id}/favorite', {})
            self.log_test("POST /api/marketplace/listings/{listing_id}/favorite", success,
                         response.get('message', '') if success else str(response))
            
            # Test GET /api/marketplace/favorites - Get user favorites
            success, response = self.make_request('GET', 'marketplace/favorites')
            self.log_test("GET /api/marketplace/favorites", success,
                         f"Favorites count: {len(response) if isinstance(response, list) else 0}" if success else str(response))
            
            # Test PUT /api/marketplace/listings/{listing_id}/mark-sold - Mark as sold (toggle)
            success, response = self.make_request('PUT', f'marketplace/listings/{self.created_listing_id}/mark-sold', {})
            self.log_test("PUT /api/marketplace/listings/{listing_id}/mark-sold", success,
                         f"Status: {response.get('status', '')}" if success else str(response))
            
            # Test mark-sold toggle back (should return to approved)
            success, response = self.make_request('PUT', f'marketplace/listings/{self.created_listing_id}/mark-sold', {})
            self.log_test("PUT /api/marketplace/listings/{listing_id}/mark-sold (toggle back)", success,
                         f"Status: {response.get('status', '')}" if success else str(response))
            
            # Test DELETE /api/marketplace/listings/{listing_id} - Delete listing
            success, response = self.make_request('DELETE', f'marketplace/listings/{self.created_listing_id}', expected_status=200)
            self.log_test("DELETE /api/marketplace/listings/{listing_id}", success,
                         response.get('message', '') if success else str(response))

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n👑 Testing Admin Endpoints...")
        
        # Test GET /api/admin/clubs - Shows all clubs
        success, response = self.make_request('GET', 'admin/clubs')
        self.log_test("GET /api/admin/clubs", success,
                     f"Total clubs: {len(response) if isinstance(response, list) else 0}" if success else str(response))
        
        # Test club approval if we have a pending club
        if self.created_club_id:
            success, response = self.make_request('PUT', f'admin/clubs/{self.created_club_id}/approve', {})
            self.log_test("PUT /api/admin/clubs/{club_id}/approve", success,
                         response.get('message', '') if success else str(response))
        
        # Test GET /api/admin/marketplace/listings - Shows all listings
        success, response = self.make_request('GET', 'admin/marketplace/listings')
        self.log_test("GET /api/admin/marketplace/listings", success,
                     f"Total listings: {len(response) if isinstance(response, list) else 0}" if success else str(response))

    def test_additional_endpoints(self):
        """Test additional important endpoints"""
        print("\n🔧 Testing Additional Endpoints...")
        
        # Test user profile
        if self.user_id:
            success, response = self.make_request('GET', f'users/{self.user_id}')
            self.log_test("GET /api/users/{user_id}", success,
                         f"Username: {response.get('username', '')}" if success else str(response))
        
        # Test auth/me
        success, response = self.make_request('GET', 'auth/me')
        self.log_test("GET /api/auth/me", success,
                     f"Role: {response.get('role', 'unknown')}" if success else str(response))

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Hungarian Car Tuning Community API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication is required for most endpoints
        if not self.test_auth_login():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Run all test suites
        self.test_clubs_endpoints()
        self.test_marketplace_endpoints()
        self.test_admin_endpoints()
        self.test_additional_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = TuningCommunityAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())