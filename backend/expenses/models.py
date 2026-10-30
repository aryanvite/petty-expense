from django.db import models, transaction
from django.conf import settings
from django.utils import timezone

class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense_categories'
        ordering = ['name']
        verbose_name_plural = 'Expense Categories'
        constraints = [
            models.UniqueConstraint(
                models.functions.Lower('name'),
                name='unique_expense_category_name_lower'
            )
        ]

    def clean(self):
        super().clean()
        if self.name:
            self.name = self.name.strip()

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SavedVendor(models.Model):
    name = models.CharField(max_length=150, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='saved_vendors'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_vendors'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                models.functions.Lower('name'),
                name='unique_saved_vendor_name_lower'
            )
        ]

    def clean(self):
        super().clean()
        if self.name:
            self.name = self.name.strip()

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SharedFundAccount(models.Model):
    account_id = models.CharField(max_length=20, unique=True, blank=True)
    name = models.CharField(max_length=150)
    maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maker_fund_accounts'
    )
    checker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checker_fund_accounts'
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_fund_accounts'
    )

    opening_balance = models.BigIntegerField(default=0, help_text="Month opening balance (Whole INR)")
    current_ledger_balance = models.BigIntegerField(default=0, help_text="Posted financial ledger balance (Whole INR)")
    available_balance = models.BigIntegerField(default=0, help_text="Available for new expenses (Ledger - Outstanding commitments)")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shared_fund_accounts'
        ordering = ['account_id']

    def __str__(self):
        return f"{self.account_id} - {self.name} (Available: ₹{self.available_balance})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.account_id:
            self.account_id = f"FA-{self.pk:04d}"
            super().save(update_fields=['account_id'])


class AdditionalFundRequest(models.Model):
    STATUS_CHOICES = (
        ('SUBMITTED', 'Submitted'),
        ('SENT_TO_ADMIN', 'Sent to Admin'),
        ('APPROVED', 'Approved'),
        ('PARTIALLY_APPROVED', 'Partially Approved'),
        ('REJECTED', 'Rejected'),
        ('DISBURSED', 'Disbursed'),
        ('CANCELLED', 'Cancelled'),
    )

    request_number = models.CharField(max_length=20, unique=True, blank=True)
    fund_account = models.ForeignKey(
        SharedFundAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fund_requests'
    )
    maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fund_requests'
    )
    requested_amount = models.BigIntegerField(help_text="Requested whole INR amount")
    approved_amount = models.BigIntegerField(null=True, blank=True, help_text="Approved whole INR amount")
    reason = models.TextField(help_text="Mandatory business justification")
    supporting_document = models.FileField(upload_to='receipts/%Y/%m/', null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED')

    checker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checker_fund_requests'
    )
    checker_comments = models.TextField(blank=True, default='')
    checker_action_at = models.DateTimeField(null=True, blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_fund_requests'
    )
    review_comments = models.TextField(blank=True, default='')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'additional_fund_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.request_number} - ₹{self.requested_amount} ({self.status})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.request_number:
            self.request_number = f"{10000 + self.pk}"
            super().save(update_fields=['request_number'])


class DisbursementVoucher(models.Model):
    VOUCHER_TYPE_CHOICES = (
        ('INITIAL', 'Initial Disbursement'),
        ('SUPPLEMENTARY', 'Supplementary Disbursement'),
    )
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('DISBURSED', 'Disbursed / Completed'),
        ('CANCELLED', 'Cancelled'),
    )
    PAYMENT_MODE_CHOICES = (
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer / NEFT / RTGS'),
        ('CHEQUE', 'Cheque'),
        ('UPI', 'UPI / IMPS'),
        ('OTHER', 'Other'),
    )

    voucher_number = models.CharField(max_length=20, unique=True, blank=True)
    fund_account = models.ForeignKey(
        SharedFundAccount,
        on_delete=models.CASCADE,
        related_name='vouchers'
    )
    voucher_type = models.CharField(max_length=20, choices=VOUCHER_TYPE_CHOICES, default='INITIAL')
    beneficiary = models.CharField(max_length=150, help_text="Beneficiary name (e.g. Maker / custodian)")
    amount = models.BigIntegerField(help_text="Disbursement whole INR amount")
    purpose = models.TextField()

    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODE_CHOICES, default='BANK_TRANSFER')
    payment_reference = models.CharField(max_length=100, blank=True, default='', help_text="UTR / Cheque No / Reference")
    payment_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISBURSED')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_vouchers'
    )
    linked_request = models.ForeignKey(
        AdditionalFundRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vouchers'
    )
    disbursed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'disbursement_vouchers'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.voucher_number} - ₹{self.amount} ({self.status})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.voucher_number:
            self.voucher_number = f"VCH-{self.pk:04d}"
            super().save(update_fields=['voucher_number'])


class Expense(models.Model):
    STATUS_CHOICES = (
        ('SUBMITTED', 'Submitted - Pending Checker'),
        ('ACCEPTED_BY_CHECKER', 'Approved by Checker'),
        ('REJECTED_BY_CHECKER', 'Rejected by Checker'),
        ('SENT_TO_ADMIN', 'Escalated to Admin - Pending Admin'),
        ('ACCEPTED_BY_ADMIN', 'Accepted by Admin - Posted'),
        ('REJECTED_BY_ADMIN', 'Rejected by Admin'),
        ('CANCELLED', 'Cancelled'),
    )
    CHECKER_ACTION_CHOICES = (
        ('NONE', 'None'),
        ('ACCEPT', 'Accept'),
        ('REJECT', 'Reject'),
        ('SEND_TO_ADMIN', 'Send to Admin'),
    )
    ADMIN_DECISION_CHOICES = (
        ('NONE', 'None'),
        ('ACCEPT', 'Accept'),
        ('REJECT', 'Reject'),
    )

    reference_number = models.CharField(max_length=30, unique=True, blank=True)
    fund_account = models.ForeignKey(
        SharedFundAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )
    maker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_expenses'
    )
    expense_date = models.DateField(default=timezone.localdate)
    amount = models.BigIntegerField(help_text="Whole INR amount")
    category = models.CharField(max_length=100, default='General Expense')
    payee = models.CharField(max_length=150, help_text="Payee / Merchant / Person paid")
    description = models.TextField()
    supporting_document = models.FileField(upload_to='receipts/%Y/%m/', null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED')

    # Checker workflow fields
    checker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checked_expenses'
    )
    checker_action = models.CharField(max_length=20, choices=CHECKER_ACTION_CHOICES, default='NONE')
    checker_comments = models.TextField(blank=True, default='')
    checker_timestamp = models.DateTimeField(null=True, blank=True)

    # Admin workflow fields
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_expenses'
    )
    admin_decision = models.CharField(max_length=20, choices=ADMIN_DECISION_CHOICES, default='NONE')
    admin_comments = models.TextField(blank=True, default='', help_text="Mandatory rejection reason")
    admin_timestamp = models.DateTimeField(null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date', '-created_at']

    def __str__(self):
        return f"{self.reference_number} - ₹{self.amount} ({self.status})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.reference_number:
            self.reference_number = f"EXP-{self.pk:04d}"
            super().save(update_fields=['reference_number'])


class MonthlyLedger(models.Model):
    fund_account = models.ForeignKey(
        SharedFundAccount,
        on_delete=models.CASCADE,
        related_name='monthly_ledgers'
    )
    year = models.IntegerField()
    month = models.IntegerField()  # 1 to 12
    opening_balance = models.BigIntegerField(default=0)
    total_disbursements = models.BigIntegerField(default=0)
    total_approved_expenditure = models.BigIntegerField(default=0)
    closing_balance = models.BigIntegerField(default=0)
    is_locked = models.BooleanField(default=False)

    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_ledgers'
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'monthly_ledgers'
        unique_together = ('fund_account', 'year', 'month')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.fund_account.account_id} - {self.year}/{self.month:02d} (Closing: ₹{self.closing_balance})"


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=100)
    record_type = models.CharField(max_length=50, blank=True, default='')
    record_id = models.CharField(max_length=100, blank=True, default='')
    details = models.TextField(blank=True, default='')
    ip_address = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        user_str = self.user.email if self.user else 'System'
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {user_str}: {self.action} - {self.record_type} #{self.record_id}"


class FundAllocation(models.Model):
    allocation_number = models.CharField(max_length=30, unique=True, blank=True)
    allocated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='allocations_made'
    )
    allocated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='allocations_received'
    )
    amount = models.BigIntegerField(help_text="Amount allocated in whole INR")
    allocator_role = models.CharField(max_length=20, default='ADMIN')
    recipient_role = models.CharField(max_length=20, default='MAKER')
    recipient_previous_balance = models.BigIntegerField(default=0)
    recipient_new_balance = models.BigIntegerField(default=0)
    allocator_previous_balance = models.BigIntegerField(null=True, blank=True)
    allocator_new_balance = models.BigIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    voucher_number = models.CharField(max_length=100, blank=True, default='')
    payment_type = models.CharField(max_length=100, blank=True, default='Cash')
    allocation_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fund_allocations'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.allocation_number}: {self.allocated_by} -> {self.allocated_to} (₹{self.amount:,})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if self.description and not self.notes:
            self.notes = self.description
        elif self.notes and not self.description:
            self.description = self.notes
        if not self.allocation_date:
            self.allocation_date = timezone.localdate()
        super().save(*args, **kwargs)
        if is_new and not self.allocation_number:
            self.allocation_number = f"ALC-{10000 + self.pk}"
            super().save(update_fields=['allocation_number'])

