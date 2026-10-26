from rest_framework import serializers
from .models import (
    ExpenseCategory,
    SharedFundAccount,
    DisbursementVoucher,
    AdditionalFundRequest,
    Expense,
    MonthlyLedger,
    AuditLog,
    FundAllocation
)
from accounts.serializers import UserProfileSerializer

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description', 'is_active', 'created_at']


class SharedFundAccountSerializer(serializers.ModelSerializer):
    maker_details = UserProfileSerializer(source='maker', read_only=True)
    checker_details = UserProfileSerializer(source='checker', read_only=True)
    admin_details = UserProfileSerializer(source='admin', read_only=True)
    pending_commitments = serializers.SerializerMethodField()

    class Meta:
        model = SharedFundAccount
        fields = [
            'id',
            'account_id',
            'name',
            'maker',
            'maker_details',
            'checker',
            'checker_details',
            'admin',
            'admin_details',
            'opening_balance',
            'current_ledger_balance',
            'available_balance',
            'pending_commitments',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'account_id', 'created_at', 'updated_at']

    def get_pending_commitments(self, obj):
        return max(0, obj.current_ledger_balance - obj.available_balance)


class SharedFundAccountCreateSerializer(serializers.ModelSerializer):
    initial_amount = serializers.IntegerField(required=False, default=0, min_value=0)
    beneficiary = serializers.CharField(required=False, allow_blank=True, default='')
    payment_mode = serializers.CharField(required=False, default='BANK_TRANSFER')
    payment_reference = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = SharedFundAccount
        fields = [
            'id',
            'name',
            'maker',
            'checker',
            'admin',
            'initial_amount',
            'beneficiary',
            'payment_mode',
            'payment_reference'
        ]


class DisbursementVoucherSerializer(serializers.ModelSerializer):
    fund_account_name = serializers.CharField(source='fund_account.name', read_only=True)
    fund_account_code = serializers.CharField(source='fund_account.account_id', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    purpose = serializers.CharField(required=False, allow_blank=True, default='Supplementary fund replenishment')
    beneficiary = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_purpose(self, value):
        if not value or not str(value).strip():
            return 'Supplementary fund replenishment'
        return str(value).strip()

    def validate(self, attrs):
        fund_account = attrs.get('fund_account')
        if not attrs.get('beneficiary') or not str(attrs.get('beneficiary')).strip():
            if fund_account and fund_account.maker:
                attrs['beneficiary'] = fund_account.maker.full_name or fund_account.maker.email
            else:
                attrs['beneficiary'] = 'Fund Custodian'
        return attrs

    class Meta:
        model = DisbursementVoucher
        fields = [
            'id',
            'voucher_number',
            'fund_account',
            'fund_account_name',
            'fund_account_code',
            'voucher_type',
            'beneficiary',
            'amount',
            'purpose',
            'payment_mode',
            'payment_reference',
            'payment_date',
            'status',
            'created_by',
            'created_by_name',
            'linked_request',
            'disbursed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'voucher_number', 'created_at', 'updated_at']


class AdditionalFundRequestSerializer(serializers.ModelSerializer):
    fund_account_name = serializers.CharField(source='fund_account.name', read_only=True)
    fund_account_code = serializers.CharField(source='fund_account.account_id', read_only=True)
    maker_name = serializers.CharField(source='maker.full_name', read_only=True)
    requested_by_name = serializers.CharField(source='maker.full_name', read_only=True)
    reference_number = serializers.CharField(source='request_number', read_only=True)
    justification = serializers.CharField(source='reason', read_only=True)
    checker_name = serializers.CharField(source='checker.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = AdditionalFundRequest
        fields = [
            'id',
            'request_number',
            'reference_number',
            'fund_account',
            'fund_account_name',
            'fund_account_code',
            'maker',
            'maker_name',
            'requested_by_name',
            'requested_amount',
            'approved_amount',
            'reason',
            'justification',
            'supporting_document',
            'document_url',
            'status',
            'checker',
            'checker_name',
            'checker_comments',
            'checker_action_at',
            'reviewed_by',
            'reviewed_by_name',
            'review_comments',
            'reviewed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'request_number', 'reference_number', 'maker', 'created_at', 'updated_at']

    def get_document_url(self, obj):
        if obj.supporting_document:
            return obj.supporting_document.url
        return None


class AdditionalFundRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalFundRequest
        fields = ['fund_account', 'requested_amount', 'reason', 'supporting_document']
        extra_kwargs = {
            'fund_account': {'required': False, 'allow_null': True}
        }

    def validate_requested_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Requested amount must be greater than ₹0.')
        return value

    def validate_reason(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('A clear justification is mandatory for additional funds.')
        return str(value).strip()

    def validate_supporting_document(self, value):
        if value and value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError('Supporting document exceeds the 50 MB limit.')
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    fund_account_name = serializers.CharField(source='fund_account.name', read_only=True)
    fund_account_code = serializers.CharField(source='fund_account.account_id', read_only=True)
    maker_name = serializers.CharField(source='maker.full_name', read_only=True)
    maker_role = serializers.CharField(source='maker.role', read_only=True)
    maker_employee_id = serializers.CharField(source='maker.employee_id', read_only=True)
    maker_department = serializers.CharField(source='maker.department', read_only=True)
    checker_name = serializers.CharField(source='checker.full_name', read_only=True)
    admin_name = serializers.CharField(source='admin.full_name', read_only=True)
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id',
            'reference_number',
            'fund_account',
            'fund_account_name',
            'fund_account_code',
            'maker',
            'maker_name',
            'maker_role',
            'maker_employee_id',
            'maker_department',
            'expense_date',
            'amount',
            'category',
            'payee',
            'description',
            'supporting_document',
            'document_url',
            'status',
            'checker',
            'checker_name',
            'checker_action',
            'checker_comments',
            'checker_timestamp',
            'admin',
            'admin_name',
            'admin_decision',
            'admin_comments',
            'admin_timestamp',
            'posted_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'reference_number', 'maker', 'status',
            'checker', 'checker_action', 'checker_comments', 'checker_timestamp',
            'admin', 'admin_decision', 'admin_comments', 'admin_timestamp',
            'posted_at', 'created_at', 'updated_at'
        ]

    def get_document_url(self, obj):
        if obj.supporting_document:
            return obj.supporting_document.url
        return None


class ExpenseCreateSerializer(serializers.ModelSerializer):
    fund_account = serializers.PrimaryKeyRelatedField(
        queryset=SharedFundAccount.objects.filter(is_active=True),
        required=False
    )

    class Meta:
        model = Expense
        fields = [
            'fund_account',
            'expense_date',
            'amount',
            'category',
            'payee',
            'description',
            'supporting_document'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Expense amount must be greater than ₹0.')
        return value

    def validate(self, attrs):
        fund_account = attrs.get('fund_account')
        if not fund_account:
            request = self.context.get('request')
            user = request.user if request else None
            fund_account = (
                SharedFundAccount.objects.filter(maker=user, is_active=True).first()
                if user else None
            ) or SharedFundAccount.objects.filter(is_active=True).first() or SharedFundAccount.objects.first()
            if not fund_account:
                # Create a default system pool account so foreign keys are always satisfied
                fund_account, _ = SharedFundAccount.objects.get_or_create(
                    name="Operations Fund Pool",
                    defaults={'opening_balance': 0, 'current_ledger_balance': 0, 'available_balance': 0, 'is_active': True}
                )
            attrs['fund_account'] = fund_account
        # Note: Balance check removed per business logic — employee balances are allowed to go negative
        return attrs


class CheckerActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['ACCEPT', 'REJECT', 'SEND_TO_ADMIN'])
    comments = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        action = attrs.get('action')
        comments = attrs.get('comments', '').strip()
        if action in ['REJECT', 'SEND_TO_ADMIN'] and not comments:
            action_desc = 'rejecting' if action == 'REJECT' else 'escalating (Send to Admin)'
            raise serializers.ValidationError({
                'comments': f'A reason/comment is mandatory when {action_desc}.'
            })
        return attrs


class AdminDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['ACCEPT', 'REJECT'])
    comments = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        decision = attrs.get('decision')
        comments = attrs.get('comments', '').strip()
        if decision == 'REJECT' and not comments:
            raise serializers.ValidationError({
                'comments': 'A mandatory rejection reason must be provided.'
            })
        return attrs


class MonthlyLedgerSerializer(serializers.ModelSerializer):
    fund_account_name = serializers.CharField(source='fund_account.name', read_only=True)
    fund_account_code = serializers.CharField(source='fund_account.account_id', read_only=True)
    closed_by_name = serializers.CharField(source='closed_by.full_name', read_only=True)

    class Meta:
        model = MonthlyLedger
        fields = [
            'id',
            'fund_account',
            'fund_account_name',
            'fund_account_code',
            'year',
            'month',
            'opening_balance',
            'total_disbursements',
            'total_approved_expenditure',
            'closing_balance',
            'is_locked',
            'closed_by',
            'closed_by_name',
            'closed_at',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_email',
            'user_name',
            'user_role',
            'action',
            'record_type',
            'record_id',
            'details',
            'ip_address',
            'created_at'
        ]


class FundAllocationSerializer(serializers.ModelSerializer):
    allocated_by_name = serializers.CharField(source='allocated_by.full_name', read_only=True)
    allocated_by_employee_id = serializers.CharField(source='allocated_by.employee_id', read_only=True)
    allocated_to_name = serializers.CharField(source='allocated_to.full_name', read_only=True)
    allocated_to_employee_id = serializers.CharField(source='allocated_to.employee_id', read_only=True)
    allocated_to_department = serializers.CharField(source='allocated_to.department', read_only=True)

    class Meta:
        model = FundAllocation
        fields = [
            'id',
            'allocation_number',
            'allocated_by',
            'allocated_by_name',
            'allocated_by_employee_id',
            'allocator_role',
            'allocated_to',
            'allocated_to_name',
            'allocated_to_employee_id',
            'allocated_to_department',
            'recipient_role',
            'amount',
            'recipient_previous_balance',
            'recipient_new_balance',
            'allocator_previous_balance',
            'allocator_new_balance',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'allocation_number', 'created_at']

