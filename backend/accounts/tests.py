from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from expenses.models import ExpenseCategory, Expense, SharedFundAccount
from accounts.models import OtpRequest, PasswordResetToken

User = get_user_model()

class PettyExpenseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@test.com',
            password='Admin@Password123',
            full_name='Test Admin'
        )
        self.employee = User.objects.create_user(
            email='emp@test.com',
            password='Emp@Password123',
            full_name='Test Employee',
            role='MAKER',
            department='Sales',
            designation='Executive'
        )
        self.cat_tea = ExpenseCategory.objects.create(name='Tea & Refreshments')
        self.account = SharedFundAccount.objects.create(
            name='HQ Ops Cash',
            opening_balance=10000,
            current_ledger_balance=10000,
            available_balance=10000
        )

    def test_login_success(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'emp@test.com',
            'password': 'Emp@Password123'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('tokens', resp.data)
        self.assertIn('access', resp.data['tokens'])
        self.assertEqual(resp.data['user']['role'], 'MAKER')

    def test_login_invalid_password(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'emp@test.com',
            'password': 'WrongPassword123'
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_forgot_password_and_reset_confirm_by_email(self):
        # 1. Forgot password request
        forgot_resp = self.client.post('/api/auth/forgot-password/', {
            'email': 'emp@test.com'
        }, format='json')
        self.assertEqual(forgot_resp.status_code, 200)
        self.assertNotIn('token', forgot_resp.data)
        self.assertNotIn('dev_reset_link', forgot_resp.data)
        
        # Token is safely saved in DB / printed to terminal console
        token_obj = PasswordResetToken.objects.filter(user=self.employee, is_used=False).latest('created_at')
        token = token_obj.token

        # 2. Reset password confirm with confirm_password
        confirm_resp = self.client.post('/api/auth/reset-password/confirm/', {
            'token': token,
            'password': 'NewPassword@999',
            'confirm_password': 'NewPassword@999'
        }, format='json')
        self.assertEqual(confirm_resp.status_code, 200)

        # 3. Old password fails
        old_login = self.client.post('/api/auth/login/', {
            'email': 'emp@test.com',
            'password': 'Emp@Password123'
        }, format='json')
        self.assertEqual(old_login.status_code, 401)

        # 4. New password succeeds
        new_login = self.client.post('/api/auth/login/', {
            'email': 'emp@test.com',
            'password': 'NewPassword@999'
        }, format='json')
        self.assertEqual(new_login.status_code, 200)

    def test_forgot_password_and_reset_confirm_without_confirm_password_field(self):
        # Verify backward compatibility if client only sends token & password
        forgot_resp = self.client.post('/api/auth/forgot-password/', {
            'email': 'admin@test.com'
        }, format='json')
        self.assertEqual(forgot_resp.status_code, 200)
        token_obj = PasswordResetToken.objects.filter(user=self.admin, is_used=False).latest('created_at')
        token = token_obj.token

        confirm_resp = self.client.post('/api/auth/reset-password/confirm/', {
            'token': token,
            'password': 'AdminNewPass@777'
        }, format='json')
        self.assertEqual(confirm_resp.status_code, 200)

    def test_forgot_password_by_employee_id(self):
        # Lookup by employee_id works
        emp_id = self.employee.employee_id
        self.assertTrue(bool(emp_id))

        forgot_resp = self.client.post('/api/auth/forgot-password/', {
            'email': emp_id
        }, format='json')
        self.assertEqual(forgot_resp.status_code, 200)
        self.assertTrue(PasswordResetToken.objects.filter(user=self.employee, is_used=False).exists())

    def test_forgot_password_newly_created_user(self):
        # Admin creates new employee
        new_emp = User.objects.create_user(
            email='newhire@test.com',
            full_name='New Hire',
            role='MAKER',
            is_active=True,
            must_change_password=True
        )
        forgot_resp = self.client.post('/api/auth/forgot-password/', {
            'email': 'newhire@test.com'
        }, format='json')
        self.assertEqual(forgot_resp.status_code, 200)
        token_obj = PasswordResetToken.objects.filter(user=new_emp, is_used=False).latest('created_at')
        token = token_obj.token

        confirm_resp = self.client.post('/api/auth/reset-password/confirm/', {
            'token': token,
            'password': 'NewHirePass@123',
            'confirm_password': 'NewHirePass@123'
        }, format='json')
        self.assertEqual(confirm_resp.status_code, 200)

        # New hire can now log in
        login_resp = self.client.post('/api/auth/login/', {
            'email': 'newhire@test.com',
            'password': 'NewHirePass@123'
        }, format='json')
        self.assertEqual(login_resp.status_code, 200)
