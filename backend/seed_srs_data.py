import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pettyexpense.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from expenses.models import (
    ExpenseCategory,
    SharedFundAccount,
    DisbursementVoucher,
    Expense,
    AdditionalFundRequest,
    MonthlyLedger,
    AuditLog
)

User = get_user_model()

def seed():
    print("--- Seeding SRS Database (Admin, Maker, Checker) ---")

    # 1. Admin (First Admin created in SQL / Seed)
    admin, created = User.objects.get_or_create(
        email='admin@company.com',
        defaults={
            'full_name': 'System Administrator',
            'role': 'ADMIN',
            'department': 'Finance & Operations',
            'designation': 'Expense Authority Admin',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
            'must_change_password': False
        }
    )
    admin.set_password('Admin@123')
    admin.save()
    print(f"Admin: {admin.email} (Password: Admin@123)")

    # 3. Maker
    maker, created = User.objects.get_or_create(
        email='maker@company.com',
        defaults={
            'full_name': 'Operations Expense Custodian',
            'role': 'MAKER',
            'department': 'Operations',
            'designation': 'Petty Cash Custodian',
            'is_staff': False,
            'is_active': True,
            'must_change_password': False
        }
    )
    maker.set_password('Maker@123')
    maker.save()
    print(f"Maker: {maker.email} (Password: Maker@123)")

    # 4. Checker
    checker, created = User.objects.get_or_create(
        email='checker@company.com',
        defaults={
            'full_name': 'Internal Audit Checker',
            'role': 'CHECKER',
            'department': 'Internal Audit',
            'designation': 'Senior Audit Reviewer',
            'is_staff': False,
            'is_active': True,
            'must_change_password': False
        }
    )
    checker.set_password('Checker@123')
    checker.save()
    print(f"Checker: {checker.email} (Password: Checker@123)")

    # 5. Categories
    categories = [
        ('Office Supplies', 'Stationery, printer cartridges, printing paper'),
        ('Travel & Conveyance', 'Local taxi, auto, bus fares, toll charges'),
        ('Food & Refreshments', 'Tea, coffee, pantry snacks, meeting hospitality'),
        ('Courier & Postage', 'Urgent document couriers, speed post, packaging'),
        ('Repairs & Maintenance', 'Office plumbing, electrical fixes, small hardware'),
        ('Miscellaneous', 'Emergency minor expenses with receipt'),
    ]
    for name, desc in categories:
        cat, _ = ExpenseCategory.objects.get_or_create(name=name, defaults={'description': desc})
    print(f"Created {len(categories)} expense categories.")

    # 6. Shared Fund Account
    initial_amount = 25000
    account, created = SharedFundAccount.objects.get_or_create(
        account_id='FA-0001',
        defaults={
            'name': 'Headquarters Operations Petty Cash',
            'maker': maker,
            'checker': checker,
            'admin': admin,
            'opening_balance': initial_amount,
            'current_ledger_balance': initial_amount,
            'available_balance': initial_amount,
            'is_active': True
        }
    )
    print(f"Shared Fund Account: {account.account_id} - {account.name}")

    # 7. Initial Disbursement Voucher
    voucher, created = DisbursementVoucher.objects.get_or_create(
        voucher_number='VCH-0001',
        defaults={
            'fund_account': account,
            'voucher_type': 'INITIAL',
            'beneficiary': maker.full_name,
            'amount': initial_amount,
            'purpose': 'Initial petty cash fund replenishment for operations',
            'payment_mode': 'BANK_TRANSFER',
            'payment_reference': 'NEFT-HQ-2026-9042',
            'payment_date': timezone.localdate(),
            'status': 'DISBURSED',
            'created_by': admin,
            'disbursed_at': timezone.now()
        }
    )
    print(f"Initial Voucher: {voucher.voucher_number} - INR {voucher.amount:,} ({voucher.status})")

    # 8. Sample expenses illustrating workflow
    # Expense 1: Already accepted by Admin (posted)
    exp1, created = Expense.objects.get_or_create(
        reference_number='EXP-0001',
        defaults={
            'fund_account': account,
            'maker': maker,
            'expense_date': timezone.localdate(),
            'amount': 1200,
            'category': 'Office Supplies',
            'payee': 'Apex Stationery Mart',
            'description': 'A4 printing paper 5 reams and whiteboard markers',
            'status': 'ACCEPTED_BY_ADMIN',
            'checker': checker,
            'checker_action': 'ACCEPT',
            'checker_comments': 'Receipt verified. Stock entered in register.',
            'checker_timestamp': timezone.now(),
            'admin': admin,
            'admin_decision': 'ACCEPT',
            'admin_comments': 'Approved for ledger posting.',
            'admin_timestamp': timezone.now(),
            'posted_at': timezone.now()
        }
    )
    
    # Expense 2: Final approval by Checker
    exp2, created = Expense.objects.get_or_create(
        reference_number='EXP-0002',
        defaults={
            'fund_account': account,
            'maker': maker,
            'expense_date': timezone.localdate(),
            'amount': 850,
            'category': 'Food & Refreshments',
            'payee': 'Chaayos Cafe',
            'description': 'Snacks and beverages for client review meeting',
            'status': 'ACCEPTED_BY_CHECKER',
            'checker': checker,
            'checker_action': 'ACCEPT',
            'checker_comments': 'Client meeting approved by department head.',
            'checker_timestamp': timezone.now(),
            'posted_at': timezone.now()
        }
    )

    # Expense 3: Checker escalated (Send to Admin with comments)
    exp3, created = Expense.objects.get_or_create(
        reference_number='EXP-0003',
        defaults={
            'fund_account': account,
            'maker': maker,
            'expense_date': timezone.localdate(),
            'amount': 2400,
            'category': 'Repairs & Maintenance',
            'payee': 'QuickFix Electricians',
            'description': 'Emergency replacement of conference room UPS backup wiring',
            'status': 'SENT_TO_ADMIN',
            'checker': checker,
            'checker_action': 'SEND_TO_ADMIN',
            'checker_comments': 'Invoice provided but vendor lacks GSTIN on receipt. Escalating for Admin discretion.',
            'checker_timestamp': timezone.now()
        }
    )

    # Expense 4: Freshly submitted by Maker (in Checker queue)
    exp4, created = Expense.objects.get_or_create(
        reference_number='EXP-0004',
        defaults={
            'fund_account': account,
            'maker': maker,
            'expense_date': timezone.localdate(),
            'amount': 450,
            'category': 'Courier & Postage',
            'payee': 'BlueDart Express',
            'description': 'Urgent courier of signed tender agreement to regional office',
            'status': 'SUBMITTED'
        }
    )

    # Adjust account balance based on seeded sample data:
    # Initial: 25,000
    # EXP-0001 (Accepted by Admin): 1200 deducted from ledger & available
    # EXP-0002 (Accepted by Checker): 850 posted to ledger and deducted from available
    # EXP-0003 (Sent to Admin): 2400 reserved commitment (deducted from available)
    # EXP-0004 (Submitted): 450 reserved commitment (deducted from available)
    # Ledger balance = 25000 - (1200 + 850) = 22,950
    # Available balance = 25000 - (1200 + 850 + 2400 + 450) = 20,100
    account.current_ledger_balance = 25000 - (1200 + 850)
    account.available_balance = 25000 - (1200 + 850 + 2400 + 450)
    account.save()
    print(f"Updated Fund Account balances: Ledger INR {account.current_ledger_balance:,}, Available INR {account.available_balance:,}")

    # Audit log entry
    AuditLog.objects.create(
        user=admin,
        action='SYSTEM_INITIALIZED',
        record_type='SYSTEM',
        record_id='SRS_V1_2',
        details='Initial database seed with SRS v1.2 specification models, accounts, and sample workflow'
    )

    print("--- Seeding Completed Successfully ---")

if __name__ == '__main__':
    seed()
