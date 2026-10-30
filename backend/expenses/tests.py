import tempfile

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from expenses.models import AdditionalFundRequest, SharedFundAccount, ExpenseCategory, Expense

User = get_user_model()

class ExpenseWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@test.com',
            password='AdminPassword123!',
            full_name='Super Admin'
        )
        self.maker = User.objects.create_user(
            email='maker@test.com',
            password='MakerPassword123!',
            full_name='John Maker',
            role='MAKER'
        )
        self.checker = User.objects.create_user(
            email='checker@test.com',
            password='CheckerPassword123!',
            full_name='Jane Checker',
            role='CHECKER'
        )
        self.category = ExpenseCategory.objects.create(name='Office Supplies')

        self.account = SharedFundAccount.objects.create(
            name='Headquarters Petty Cash',
            maker=self.maker,
            checker=self.checker,
            admin=self.admin,
            opening_balance=50000,
            current_ledger_balance=50000,
            available_balance=50000
        )

    def test_admin_direct_accept_on_submitted_expense(self):
        # 1. Maker submits expense of ₹5000
        self.client.force_authenticate(user=self.maker)
        res = self.client.post('/api/expenses/', {
            'fund_account': self.account.id,
            'expense_date': '2026-10-17',
            'amount': 5000,
            'category': 'Office Supplies',
            'payee': 'Stationery Hub',
            'description': 'Printer cartridges'
        })
        self.assertEqual(res.status_code, 201)
        expense_id = res.data['id']
        self.assertEqual(res.data['status'], 'SUBMITTED')

        # Check account balance committed
        self.account.refresh_from_db()
        self.assertEqual(self.account.available_balance, 45000)
        self.assertEqual(self.account.current_ledger_balance, 50000)

        # 2. Admin directly ACCEPTS submitted expense without waiting for checker
        self.client.force_authenticate(user=self.admin)
        dec_res = self.client.post(f'/api/expenses/{expense_id}/admin-decision/', {
            'decision': 'ACCEPT',
            'comments': 'Directly approved by Super Admin'
        })
        self.assertEqual(dec_res.status_code, 200)
        self.assertEqual(dec_res.data['status'], 'ACCEPTED_BY_ADMIN')
        self.assertEqual(dec_res.data['admin_name'], 'Super Admin')

        # Check ledger balance deducted
        self.account.refresh_from_db()
        self.assertEqual(self.account.available_balance, 45000)
        self.assertEqual(self.account.current_ledger_balance, 45000)

    def test_admin_direct_reject_on_submitted_expense(self):
        # 1. Maker submits expense of ₹3000
        self.client.force_authenticate(user=self.maker)
        res = self.client.post('/api/expenses/', {
            'fund_account': self.account.id,
            'expense_date': '2026-10-17',
            'amount': 3000,
            'category': 'Office Supplies',
            'payee': 'Books & More',
            'description': 'Reference books'
        })
        self.assertEqual(res.status_code, 201)
        expense_id = res.data['id']

        self.account.refresh_from_db()
        self.assertEqual(self.account.available_balance, 47000)

        # 2. Admin directly REJECTS submitted expense
        self.client.force_authenticate(user=self.admin)
        dec_res = self.client.post(f'/api/expenses/{expense_id}/admin-decision/', {
            'decision': 'REJECT',
            'comments': 'Not authorized for petty cash'
        })
        self.assertEqual(dec_res.status_code, 200)
        self.assertEqual(dec_res.data['status'], 'REJECTED_BY_ADMIN')
        self.assertEqual(dec_res.data['admin_name'], 'Super Admin')

        # Available balance must be restored
        self.account.refresh_from_db()
        self.assertEqual(self.account.available_balance, 50000)
        self.assertEqual(self.account.current_ledger_balance, 50000)

    def test_checker_acceptance_is_final_and_admin_cannot_change_it(self):
        self.client.force_authenticate(user=self.maker)
        res = self.client.post('/api/expenses/', {
            'fund_account': self.account.id,
            'expense_date': '2026-10-17',
            'amount': 2500,
            'category': 'Office Supplies',
            'payee': 'Stationery Hub',
            'description': 'Paper for office'
        })
        self.assertEqual(res.status_code, 201)
        expense_id = res.data['id']

        self.client.force_authenticate(user=self.checker)
        checker_res = self.client.post(f'/api/expenses/{expense_id}/checker-action/', {
            'action': 'ACCEPT',
            'comments': 'Receipt verified'
        })
        self.assertEqual(checker_res.status_code, 200)
        self.assertEqual(checker_res.data['status'], 'ACCEPTED_BY_CHECKER')
        self.assertIsNotNone(checker_res.data['posted_at'])

        self.account.refresh_from_db()
        self.assertEqual(self.account.available_balance, 47500)
        self.assertEqual(self.account.current_ledger_balance, 47500)

        self.client.force_authenticate(user=self.admin)
        for decision in ('ACCEPT', 'REJECT'):
            admin_res = self.client.post(f'/api/expenses/{expense_id}/admin-decision/', {
                'decision': decision,
                'comments': 'Admin decision should not override checker approval'
            })
            self.assertEqual(admin_res.status_code, 400)
            self.assertIn('final', admin_res.data['detail'].lower())

        self.account.refresh_from_db()
        self.assertEqual(self.account.available_balance, 47500)
        self.assertEqual(self.account.current_ledger_balance, 47500)

    def test_additional_fund_request_must_exceed_available_balance_and_document_is_optional(self):
        self.client.force_authenticate(user=self.maker)
        request_data = {
            'fund_account': self.account.id,
            'requested_amount': 40000,
            'reason': 'Funds needed for upcoming operations'
        }

        for amount in (40000, 50000):
            request_data['requested_amount'] = amount
            response = self.client.post('/api/fund-requests/', request_data)
            self.assertEqual(response.status_code, 400)
            self.assertIn('greater than the available balance', response.data['detail'])

        self.assertEqual(AdditionalFundRequest.objects.count(), 0)

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                request_data['requested_amount'] = 50001
                response = self.client.post('/api/fund-requests/', request_data)
                self.assertEqual(response.status_code, 201)
                self.assertIsNone(response.data['document_url'])

                request_data['requested_amount'] = 50002
                request_data['supporting_document'] = SimpleUploadedFile(
                    'support.pdf',
                    b'%PDF-1.4 sample supporting document',
                    content_type='application/pdf'
                )
                response = self.client.post('/api/fund-requests/', request_data, format='multipart')
                self.assertEqual(response.status_code, 201)
                self.assertIsNotNone(response.data['document_url'])

    def test_maker_submit_expense_with_large_supporting_document(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client.force_authenticate(user=self.maker)
        # 13 MB test file matching the user's PDF
        large_file = SimpleUploadedFile(
            'Material_Management.pdf',
            b'%PDF-1.4 ' + b'0' * (13 * 1024 * 1024),
            content_type='application/pdf'
        )
        res = self.client.post('/api/expenses/', {
            'fund_account': self.account.id,
            'expense_date': '2026-10-22',
            'amount': 2500,
            'category': 'Office Supplies',
            'payee': 'Apex Stationery',
            'description': 'Procurement system manuals',
            'supporting_document': large_file
        }, format='multipart')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'SUBMITTED')
        self.assertTrue(bool(res.data.get('supporting_document')))

    def test_checker_allocate_funds_deducts_and_limits(self):
        # Admin sets Checker limit to 50,000
        self.checker.allocated_funds = 50000
        self.checker.save(update_fields=['allocated_funds'])
        self.maker.allocated_funds = 10000
        self.maker.save(update_fields=['allocated_funds'])

        self.client.force_authenticate(user=self.checker)

        # 1. Attempt to allocate more than checker's balance (60,000 > 50,000)
        res_fail = self.client.post(f'/api/admin/employees/{self.maker.id}/allocate-funds/', {
            'amount': 60000,
            'notes': 'Overdraft attempt'
        })
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn('exceeds your available balance', res_fail.data['detail'])

        # 2. Successfully allocate 20,000 to maker
        res_ok = self.client.post(f'/api/admin/employees/{self.maker.id}/allocate-funds/', {
            'amount': 20000,
            'notes': 'Legitimate allocation'
        })
        self.assertEqual(res_ok.status_code, 200)

        self.checker.refresh_from_db()
        self.maker.refresh_from_db()
        self.assertEqual(self.checker.allocated_funds, 30000) # 50,000 - 20,000
        self.assertEqual(self.maker.allocated_funds, 30000)   # 10,000 + 20,000

    def test_checker_additional_fund_request_and_admin_approval(self):
        self.checker.allocated_funds = 10000
        self.checker.save(update_fields=['allocated_funds'])

        self.client.force_authenticate(user=self.checker)
        req_res = self.client.post('/api/fund-requests/', {
            'requested_amount': 25000,
            'reason': 'Project expansion fund replenishment'
        })
        self.assertEqual(req_res.status_code, 201)
        req_id = req_res.data['id']
        self.assertEqual(req_res.data['status'], 'SENT_TO_ADMIN')

        # Admin approves the request
        self.client.force_authenticate(user=self.admin)
        app_res = self.client.post(f'/api/fund-requests/{req_id}/review/', {
            'action': 'APPROVE',
            'comments': 'Approved by Admin'
        })
        self.assertEqual(app_res.status_code, 200)

        self.checker.refresh_from_db()
        # Checker's allocated_funds increased by 25,000
        self.assertEqual(self.checker.allocated_funds, 35000)

    def test_super_admin_can_review_fund_request(self):
        self.client.force_authenticate(user=self.checker)
        req_res = self.client.post('/api/fund-requests/', {
            'requested_amount': 25000,
            'reason': 'Project expansion fund replenishment'
        })
        self.assertEqual(req_res.status_code, 201)

        self.admin.role = 'SUPER_ADMIN'
        self.admin.save(update_fields=['role'])
        self.client.force_authenticate(user=self.admin)
        review_res = self.client.post(
            f"/api/fund-requests/{req_res.data['id']}/review/",
            {'action': 'APPROVE', 'comments': 'Approved by Super Admin', 'create_voucher': False},
            format='json'
        )

        self.assertEqual(review_res.status_code, 200)
        self.assertEqual(review_res.data['status'], 'APPROVED')
