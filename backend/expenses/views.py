from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import models, transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime
from django.contrib.auth import get_user_model
User = get_user_model()

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
from .serializers import (
    ExpenseCategorySerializer,
    SharedFundAccountSerializer,
    SharedFundAccountCreateSerializer,
    DisbursementVoucherSerializer,
    AdditionalFundRequestSerializer,
    AdditionalFundRequestCreateSerializer,
    ExpenseSerializer,
    ExpenseCreateSerializer,
    CheckerActionSerializer,
    AdminDecisionSerializer,
    MonthlyLedgerSerializer,
    AuditLogSerializer,
    FundAllocationSerializer
)
from accounts.permissions import (
    IsAdminUserRole,
    IsMakerUserRole,
    IsCheckerUserRole
)
from accounts.views import log_audit


# ==========================================================
# EXPENSE CATEGORIES
# ==========================================================

class ExpenseCategoryListView(APIView):
    def get(self, request):
        categories = ExpenseCategory.objects.filter(is_active=True)
        serializer = ExpenseCategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only administrators can create categories.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ExpenseCategorySerializer(data=request.data)
        if serializer.is_valid():
            cat = serializer.save()
            log_audit(request.user, 'CATEGORY_CREATED', 'CATEGORY', cat.id, f"Created category {cat.name}", request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================================
# SHARED FUND ACCOUNTS
# ==========================================================

class SharedFundAccountListView(APIView):
    def get(self, request):
        user = request.user
        if user.role == 'ADMIN':
            queryset = SharedFundAccount.objects.all()
        elif user.role in ['MAKER', 'CHECKER']:
            queryset = SharedFundAccount.objects.filter(is_active=True)
            if not queryset.exists():
                queryset = SharedFundAccount.objects.all()
        else:
            queryset = SharedFundAccount.objects.none()

        serializer = SharedFundAccountSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only Admin can create shared fund accounts.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SharedFundAccountCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            data = serializer.validated_data
            initial_amount = data.pop('initial_amount', 0)
            maker = data.get('maker')
            beneficiary = data.pop('beneficiary', '') or (maker.full_name if maker else 'Custodian')
            payment_mode = data.pop('payment_mode', 'BANK_TRANSFER')
            payment_reference = data.pop('payment_reference', '')

            account = SharedFundAccount.objects.create(
                name=data['name'],
                maker=maker,
                checker=data.get('checker'),
                admin=data.get('admin'),
                opening_balance=initial_amount,
                current_ledger_balance=initial_amount,
                available_balance=initial_amount,
                is_active=True
            )

            # Create initial disbursement voucher if initial amount > 0
            if initial_amount > 0:
                DisbursementVoucher.objects.create(
                    fund_account=account,
                    voucher_type='INITIAL',
                    beneficiary=beneficiary,
                    amount=initial_amount,
                    purpose=f"Initial fund allocation for {account.name}",
                    payment_mode=payment_mode,
                    payment_reference=payment_reference or 'INIT-DISBURSE',
                    payment_date=timezone.localdate(),
                    status='DISBURSED',
                    created_by=request.user,
                    disbursed_at=timezone.now()
                )

            log_audit(
                request.user,
                'FUND_ACCOUNT_CREATED',
                'SHARED_ACCOUNT',
                account.account_id,
                f"Created account {account.account_id} - {account.name} with initial ₹{initial_amount:,}",
                request
            )

        return Response(SharedFundAccountSerializer(account, context={'request': request}).data, status=status.HTTP_201_CREATED)


class SharedFundAccountDetailView(APIView):
    def get(self, request, pk):
        try:
            account = SharedFundAccount.objects.get(pk=pk)
        except SharedFundAccount.DoesNotExist:
            return Response({'detail': 'Fund account not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SharedFundAccountSerializer(account, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only Admin can update fund accounts.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            account = SharedFundAccount.objects.get(pk=pk)
        except SharedFundAccount.DoesNotExist:
            return Response({'detail': 'Fund account not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            account.name = request.data['name'].strip()
        if 'is_active' in request.data:
            account.is_active = bool(request.data['is_active'])
        
        from django.contrib.auth import get_user_model
        User = get_user_model()

        if 'maker' in request.data:
            if request.data['maker']:
                maker_user = User.objects.filter(pk=request.data['maker'], role='MAKER').first()
                if maker_user:
                    account.maker = maker_user
                else:
                    return Response({'detail': 'Invalid Maker employee selected.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                account.maker = None

        if 'checker' in request.data:
            if request.data['checker']:
                checker_user = User.objects.filter(pk=request.data['checker'], role='CHECKER').first()
                if checker_user:
                    account.checker = checker_user
                else:
                    return Response({'detail': 'Invalid Checker employee selected.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                account.checker = None

        account.save()

        maker_title = account.maker.full_name if account.maker else 'None'
        checker_title = account.checker.full_name if account.checker else 'None'

        log_audit(
            request.user,
            'FUND_ACCOUNT_UPDATED',
            'SHARED_ACCOUNT',
            account.account_id,
            f"Updated {account.account_id} ({account.name}) - Maker: {maker_title}, Checker: {checker_title}",
            request
        )
        return Response(SharedFundAccountSerializer(account, context={'request': request}).data)


# ==========================================================
# DISBURSEMENT VOUCHERS (ADMIN)
# ==========================================================

class DisbursementVoucherListView(APIView):
    def get(self, request):
        user = request.user
        queryset = DisbursementVoucher.objects.select_related('fund_account', 'created_by')

        if user.role in ['MAKER', 'CHECKER']:
            queryset = queryset.filter(fund_account__is_active=True)
        elif user.role == 'ADMIN':
            queryset = queryset.all()

        account_id = request.query_params.get('fund_account')
        if account_id:
            queryset = queryset.filter(fund_account__id=account_id)

        serializer = DisbursementVoucherSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only Admin can issue disbursement vouchers.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DisbursementVoucherSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            voucher = serializer.save(created_by=request.user)
            
            # If created directly as DISBURSED, update balances immediately
            if voucher.status == 'DISBURSED':
                account = voucher.fund_account
                account.current_ledger_balance += voucher.amount
                account.available_balance += voucher.amount
                account.save(update_fields=['current_ledger_balance', 'available_balance'])
                voucher.disbursed_at = timezone.now()
                voucher.save(update_fields=['disbursed_at'])

                if voucher.linked_request:
                    voucher.linked_request.status = 'DISBURSED'
                    voucher.linked_request.save(update_fields=['status'])

            log_audit(
                request.user,
                'VOUCHER_CREATED',
                'VOUCHER',
                voucher.voucher_number,
                f"Disbursed voucher {voucher.voucher_number} of ₹{voucher.amount:,} for {voucher.fund_account.name}",
                request
            )

        return Response(DisbursementVoucherSerializer(voucher).data, status=status.HTTP_201_CREATED)


class DisbursementVoucherDisburseView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, pk):
        try:
            voucher = DisbursementVoucher.objects.get(pk=pk)
        except DisbursementVoucher.DoesNotExist:
            return Response({'detail': 'Voucher not found.'}, status=status.HTTP_404_NOT_FOUND)

        if voucher.status == 'DISBURSED':
            return Response({'detail': 'Voucher has already been disbursed.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            voucher.payment_mode = request.data.get('payment_mode', voucher.payment_mode)
            voucher.payment_reference = request.data.get('payment_reference', voucher.payment_reference)
            voucher.payment_date = request.data.get('payment_date', timezone.localdate())
            voucher.status = 'DISBURSED'
            voucher.disbursed_at = timezone.now()
            voucher.save()

            account = voucher.fund_account
            account.current_ledger_balance += voucher.amount
            account.available_balance += voucher.amount
            account.save(update_fields=['current_ledger_balance', 'available_balance'])

            if voucher.linked_request:
                voucher.linked_request.status = 'DISBURSED'
                voucher.linked_request.save(update_fields=['status'])

            log_audit(
                request.user,
                'VOUCHER_DISBURSED',
                'VOUCHER',
                voucher.voucher_number,
                f"Recorded disbursement of ₹{voucher.amount:,} to {account.account_id}",
                request
            )

        return Response(DisbursementVoucherSerializer(voucher).data, status=status.HTTP_200_OK)


# ==========================================================
# ADDITIONAL FUND REQUESTS (MAKER & SUPER ADMIN)
# ==========================================================

class AdditionalFundRequestListView(APIView):
    def get(self, request):
        user = request.user
        queryset = AdditionalFundRequest.objects.select_related('fund_account', 'maker', 'reviewed_by', 'checker')

        if user.role == 'MAKER':
            queryset = queryset.filter(maker=user)
        elif user.role == 'CHECKER':
            scope = request.query_params.get('scope', '').lower()
            if scope == 'my_requests':
                queryset = queryset.filter(maker=user)
            else:
                # Checkers review Maker requests; Checker requests to Admin only show to Admin
                queryset = queryset.filter(maker__role='MAKER')
        elif user.role == 'ADMIN':
            # Maker requests with status SUBMITTED stay with Checker; all other requests (and requests from Checkers) show to Admin
            queryset = queryset.exclude(status='SUBMITTED', maker__role='MAKER')

        status_filter = request.query_params.get('status', '').upper()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = AdditionalFundRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['MAKER', 'CHECKER']:
            return Response({'detail': 'Only Makers and Checkers can submit additional fund requests.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdditionalFundRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_account = serializer.validated_data.get('fund_account')
        requested_amount = serializer.validated_data['requested_amount']
        reason = serializer.validated_data['reason']
        supporting_document = serializer.validated_data.get('supporting_document')

        # If fund_account is provided and active, validate available balance
        if validated_account:
            try:
                fund_account = SharedFundAccount.objects.get(pk=validated_account.pk)
                if not fund_account.is_active:
                    return Response({'detail': 'This fund account is inactive.'}, status=status.HTTP_400_BAD_REQUEST)
                if requested_amount <= fund_account.available_balance:
                    return Response({
                        'detail': (
                            f'Requested amount must be greater than the available balance '
                            f'of ₹{fund_account.available_balance:,}.'
                        )
                    }, status=status.HTTP_400_BAD_REQUEST)
            except SharedFundAccount.DoesNotExist:
                return Response({'detail': 'This fund account no longer exists.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            fund_account = SharedFundAccount.objects.first()

        is_checker = (request.user.role == 'CHECKER')
        initial_status = 'SENT_TO_ADMIN' if is_checker else 'SUBMITTED'

        req = AdditionalFundRequest.objects.create(
            fund_account=fund_account,
            maker=request.user,
            requested_amount=requested_amount,
            reason=reason,
            supporting_document=supporting_document,
            status=initial_status
        )

        role_name = request.user.role.capitalize()
        log_audit(
            request.user,
            'FUND_REQUEST_SUBMITTED',
            'FUND_REQUEST',
            req.request_number,
            f"{role_name} {request.user.full_name} submitted fund request for ₹{req.requested_amount:,}. Reason: {req.reason}",
            request
        )

        return Response(AdditionalFundRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class AdditionalFundRequestReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['ADMIN', 'CHECKER']:
            return Response({'detail': 'Only Admins and Checkers can review fund requests.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            fund_req = AdditionalFundRequest.objects.get(pk=pk)
        except AdditionalFundRequest.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', '').upper()
        if action not in ['APPROVE', 'PARTIALLY_APPROVE', 'REJECT', 'SEND_TO_ADMIN', 'ESCALATE']:
            return Response({'detail': 'Action must be APPROVE, PARTIALLY_APPROVE, REJECT, or SEND_TO_ADMIN.'}, status=status.HTTP_400_BAD_REQUEST)

        comments = request.data.get('comments', '').strip()
        approved_amount = request.data.get('approved_amount')

        with transaction.atomic():
            if action in ['SEND_TO_ADMIN', 'ESCALATE']:
                if request.user.role != 'CHECKER':
                    return Response({'detail': 'Only Checkers can send fund requests to Admin.'}, status=status.HTTP_400_BAD_REQUEST)
                fund_req.status = 'SENT_TO_ADMIN'
                fund_req.checker = request.user
                fund_req.checker_comments = comments
                fund_req.checker_action_at = timezone.now()
                fund_req.save()

                log_audit(
                    request.user,
                    'FUND_REQUEST_SENT_TO_ADMIN',
                    'FUND_REQUEST',
                    fund_req.request_number,
                    f"Checker {request.user.full_name} forwarded fund request #{fund_req.request_number} (₹{fund_req.requested_amount:,}) to Admin. Notes: {comments or 'None'}",
                    request
                )
                return Response(AdditionalFundRequestSerializer(fund_req).data, status=status.HTTP_200_OK)

            if action == 'APPROVE':
                fund_req.status = 'APPROVED'
                fund_req.approved_amount = fund_req.requested_amount
            elif action == 'PARTIALLY_APPROVE':
                try:
                    p_amt = int(approved_amount)
                except (ValueError, TypeError):
                    return Response({'detail': 'Approved partial amount must be a valid whole number.'}, status=status.HTTP_400_BAD_REQUEST)

                if p_amt <= 0:
                    return Response({'detail': 'Approved partial amount cannot be ₹0 or negative. It must be greater than ₹0.'}, status=status.HTTP_400_BAD_REQUEST)

                if p_amt >= fund_req.requested_amount:
                    return Response({
                        'detail': f'Approved partial amount (₹{p_amt:,}) cannot be greater than or equal to requested amount (₹{fund_req.requested_amount:,}). Please select "Approve Full Amount" instead.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                fund_req.status = 'PARTIALLY_APPROVED'
                fund_req.approved_amount = p_amt
            elif action == 'REJECT':
                fund_req.status = 'REJECTED'
                fund_req.approved_amount = 0

            if request.user.role == 'CHECKER':
                fund_req.checker = request.user
                fund_req.checker_comments = comments
                fund_req.checker_action_at = timezone.now()
            fund_req.reviewed_by = request.user
            fund_req.review_comments = comments
            fund_req.reviewed_at = timezone.now()
            fund_req.save()

            # Allocate funds directly to the requester upon approval
            if action in ['APPROVE', 'PARTIALLY_APPROVE'] and fund_req.approved_amount:
                # If Checker is approving a Maker's request, deduct from Checker's available balance
                if request.user.role == 'CHECKER':
                    checker = User.objects.select_for_update().get(id=request.user.id)
                    from django.db.models import Sum
                    checker_used = Expense.objects.filter(
                        maker=checker
                    ).exclude(
                        status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED']
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    checker_balance = (checker.allocated_funds or 0) - checker_used

                    if fund_req.approved_amount > checker_balance:
                        return Response({
                            'detail': f'Cannot approve request: Approved amount (₹{fund_req.approved_amount:,}) exceeds your available balance of ₹{checker_balance:,}. Please forward to Admin or request additional funds.'
                        }, status=status.HTTP_400_BAD_REQUEST)

                    checker.allocated_funds = (checker.allocated_funds or 0) - fund_req.approved_amount
                    checker.save(update_fields=['allocated_funds'])

                elif request.user.role in ['ADMIN', 'SUPER_ADMIN']:
                    # When Admin approves fund, reduce company fund account balance!
                    account = fund_req.fund_account
                    if not account:
                        account = SharedFundAccount.objects.select_for_update().filter(is_active=True).first() or SharedFundAccount.objects.select_for_update().first()
                    else:
                        account = SharedFundAccount.objects.select_for_update().filter(id=account.id).first()

                    if account:
                        account.available_balance -= fund_req.approved_amount
                        account.current_ledger_balance -= fund_req.approved_amount
                        account.save(update_fields=['available_balance', 'current_ledger_balance'])

                # Add approved funds to requester (Checker or Maker)
                requester = User.objects.select_for_update().get(id=fund_req.maker.id)
                old_funds = requester.allocated_funds or 0
                requester.allocated_funds = old_funds + fund_req.approved_amount
                requester.save(update_fields=['allocated_funds'])

                FundAllocation.objects.create(
                    allocated_by=request.user,
                    allocated_to=requester,
                    amount=fund_req.approved_amount,
                    allocator_role=request.user.role,
                    recipient_role=requester.role,
                    recipient_previous_balance=old_funds,
                    recipient_new_balance=requester.allocated_funds,
                    notes=f"Approved fund request #{fund_req.request_number}: {comments or 'Replenishment'}"
                )

                log_audit(
                    request.user,
                    'FUNDS_ALLOCATED',
                    'USER',
                    requester.id,
                    f"{request.user.role.title()} {request.user.full_name} approved fund request #{fund_req.request_number} (?{fund_req.approved_amount:,}) for {requester.full_name} ({requester.role}). Company fund balance reduced by ?{fund_req.approved_amount:,}. Requester previous limit: ?{old_funds:,}, new limit: ?{requester.allocated_funds:,}.",
                    request
                )

            # Supplementary voucher generation for backward-compatibility if fund_account is linked
            should_create_voucher = request.data.get('create_voucher') or request.data.get('auto_disburse')
            if action in ['APPROVE', 'PARTIALLY_APPROVE'] and should_create_voucher and fund_req.fund_account:
                voucher_amount = fund_req.approved_amount
                beneficiary = request.data.get('beneficiary', fund_req.maker.full_name)
                payment_mode = request.data.get('payment_mode', 'BANK_TRANSFER')
                payment_reference = request.data.get('payment_reference', '')

                DisbursementVoucher.objects.create(
                    fund_account=fund_req.fund_account,
                    voucher_type='SUPPLEMENTARY',
                    beneficiary=beneficiary,
                    amount=voucher_amount,
                    purpose=f"Supplementary disbursement for {fund_req.request_number}: {fund_req.reason}",
                    payment_mode=payment_mode,
                    payment_reference=payment_reference,
                    payment_date=timezone.localdate(),
                    status='DISBURSED',
                    created_by=request.user,
                    linked_request=fund_req,
                    disbursed_at=timezone.now()
                )
                
                fund_req.status = 'DISBURSED'
                fund_req.save(update_fields=['status'])

            log_audit(
                request.user,
                'FUND_REQUEST_REVIEWED',
                'FUND_REQUEST',
                fund_req.request_number,
                f"Action {action} for {fund_req.request_number} (₹{fund_req.approved_amount or 0:,})",
                request
            )

        return Response(AdditionalFundRequestSerializer(fund_req).data, status=status.HTTP_200_OK)


class AdditionalFundRequestCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            fund_req = AdditionalFundRequest.objects.get(pk=pk)
        except AdditionalFundRequest.DoesNotExist:
            return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in ['ADMIN', 'SUPER_ADMIN'] and fund_req.maker != request.user:
            return Response({'detail': 'You do not have permission to cancel this request.'}, status=status.HTTP_403_FORBIDDEN)

        if fund_req.status != 'SUBMITTED':
            return Response(
                {'detail': f'Cannot cancel request with status "{fund_req.status}". Only submitted requests can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        fund_req.status = 'CANCELLED'
        fund_req.save(update_fields=['status', 'updated_at'])

        log_audit(
            request.user,
            'FUND_REQUEST_CANCELLED',
            'FUND_REQUEST',
            fund_req.request_number,
            f"Cancelled fund request {fund_req.request_number} (₹{fund_req.requested_amount:,})",
            request
        )

        return Response(AdditionalFundRequestSerializer(fund_req).data, status=status.HTTP_200_OK)


# ==========================================================
# EXPENSES WORKFLOW (MAKER SUBMISSION -> CHECKER REVIEW -> ADMIN DECISION)
# ==========================================================

class ExpenseListView(APIView):
    def get(self, request):
        user = request.user
        queryset = Expense.objects.select_related('fund_account', 'maker', 'checker', 'admin')

        if user.role == 'MAKER':
            queryset = queryset.filter(maker=user)
        elif user.role == 'CHECKER':
            scope = request.query_params.get('scope', '').lower()
            if scope == 'my_claims':
                queryset = queryset.filter(maker=user)
            else:
                queryset = queryset.filter(maker__role='MAKER')
        elif user.role == 'ADMIN':
            queryset = queryset.all()

        status_param = request.query_params.get('status', '').upper()
        if status_param:
            queryset = queryset.filter(status=status_param)

        serializer = ExpenseSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['MAKER', 'CHECKER']:
            return Response({'detail': 'Only Makers and Checkers can submit expense claims.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ExpenseCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            fund_account = serializer.validated_data.get('fund_account')
            if not fund_account:
                fund_account, _ = SharedFundAccount.objects.get_or_create(
                    name="Operations Fund Pool",
                    defaults={'opening_balance': 0, 'current_ledger_balance': 0, 'available_balance': 0, 'is_active': True}
                )

            if fund_account:
                fund_account = SharedFundAccount.objects.select_for_update().get(id=fund_account.id)
                fund_account.available_balance -= serializer.validated_data['amount']
                fund_account.save(update_fields=['available_balance'])

            # Check role: Checker claims go directly to Admin for final decision!
            is_checker = (request.user.role == 'CHECKER')
            initial_status = 'SENT_TO_ADMIN' if is_checker else 'SUBMITTED'
            checker_user = request.user if is_checker else None
            checker_act = 'SEND_TO_ADMIN' if is_checker else 'NONE'
            posted_dt = None

            expense = serializer.save(
                fund_account=fund_account,
                maker=request.user,
                status=initial_status,
                checker=checker_user,
                checker_action=checker_act,
                posted_at=posted_dt
            )

            action_desc = f'Checker {request.user.full_name} submitted claim forwarded to Admin' if is_checker else 'Submitted Maker claim'
            log_audit(
                request.user,
                'EXPENSE_CLAIMED',
                'EXPENSE',
                expense.reference_number,
                f"{action_desc} {expense.reference_number} for ₹{expense.amount:,}. Category: {expense.category}. Payee: {expense.payee}",
                request
            )

        return Response(ExpenseSerializer(expense, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(APIView):
    def get(self, request, pk):
        try:
            expense = Expense.objects.select_related('fund_account', 'maker', 'checker', 'admin').get(pk=pk)
        except Expense.DoesNotExist:
            return Response({'detail': 'Expense not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ExpenseSerializer(expense, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            expense = Expense.objects.get(pk=pk)
        except Expense.DoesNotExist:
            return Response({'detail': 'Expense not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != expense.maker and request.user.role != 'ADMIN':
            return Response({'detail': 'You do not have permission to cancel this expense.'}, status=status.HTTP_403_FORBIDDEN)

        if expense.status != 'SUBMITTED':
            return Response({'detail': f'Cannot cancel expense with status {expense.status}. Only SUBMITTED expenses can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Release commitment back to available balance
            account = expense.fund_account
            account.available_balance += expense.amount
            account.save(update_fields=['available_balance'])

            expense.status = 'CANCELLED'
            expense.save(update_fields=['status'])

            log_audit(
                request.user,
                'EXPENSE_CANCELLED',
                'EXPENSE',
                expense.reference_number,
                f"Cancelled expense {expense.reference_number} (₹{expense.amount:,})",
                request
            )

        return Response({'detail': f'Expense {expense.reference_number} cancelled and ₹{expense.amount:,} released back to available balance.'})


class CheckerActionView(APIView):
    def post(self, request, pk):
        if request.user.role != 'CHECKER':
            return Response({'detail': 'Only Checkers can perform this action.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CheckerActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '').strip()

        try:
            with transaction.atomic():
                expense = Expense.objects.select_for_update().get(pk=pk)
                if expense.status != 'SUBMITTED':
                    return Response({'detail': f'Expense cannot be reviewed. Current status is {expense.status}.'}, status=status.HTTP_400_BAD_REQUEST)

                account = None
                if expense.fund_account_id:
                    account = SharedFundAccount.objects.select_for_update().filter(pk=expense.fund_account_id).first()
                expense.checker = request.user
                expense.checker_action = action
                expense.checker_comments = comments
                expense.checker_timestamp = timezone.now()

                if action == 'ACCEPT':
                    expense.status = 'ACCEPTED_BY_CHECKER'
                    expense.posted_at = timezone.now()
                    if account:
                        account.current_ledger_balance -= expense.amount
                        account.save(update_fields=['current_ledger_balance'])
                    action_text = f"Accepted by Checker and POSTED expense of ₹{expense.amount:,}"
                elif action == 'REJECT':
                    expense.status = 'REJECTED_BY_CHECKER'
                    if account:
                        account.available_balance += expense.amount
                        account.save(update_fields=['available_balance'])
                    action_text = f"Rejected by Checker (Reason: {comments}). Claim amount of ₹{expense.amount:,} restored to maker's remaining funds."
                else: # SEND_TO_ADMIN
                    expense.status = 'SENT_TO_ADMIN'
                    action_text = f"Escalated to Admin (Send to Admin). Remarks: {comments}"

                expense.save()

                log_audit(
                    request.user,
                    f"CHECKER_{action}",
                    'EXPENSE',
                    expense.reference_number,
                    f"{action_text} for {expense.reference_number} (₹{expense.amount:,}). Comments: {comments or 'None'}",
                    request
                )
        except Expense.DoesNotExist:
            return Response({'detail': 'Expense not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(ExpenseSerializer(expense, context={'request': request}).data, status=status.HTTP_200_OK)


class AdminDecisionView(APIView):
    def post(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only Admins can make the final expense decision.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            expense = Expense.objects.select_related('fund_account').get(pk=pk)
        except Expense.DoesNotExist:
            return Response({'detail': 'Expense not found.'}, status=status.HTTP_404_NOT_FOUND)

        if expense.status == 'ACCEPTED_BY_CHECKER' and expense.maker.role != 'CHECKER':
            return Response({
                'detail': 'This claim was accepted by the checker and is final; admin decisions are not allowed.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if expense.status in ['ACCEPTED_BY_ADMIN', 'REJECTED_BY_ADMIN', 'CANCELLED']:
            return Response({
                'detail': f'Cannot take decision on expense that has already been resolved ({expense.status}).'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdminDecisionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        decision = serializer.validated_data['decision']
        comments = serializer.validated_data.get('comments', '').strip()

        with transaction.atomic():
            expense = Expense.objects.select_for_update().get(pk=pk)
            if expense.status == 'ACCEPTED_BY_CHECKER' and expense.maker.role != 'CHECKER':
                return Response({
                    'detail': 'This claim was accepted by the checker and is final; admin decisions are not allowed.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if expense.status in ['ACCEPTED_BY_ADMIN', 'REJECTED_BY_ADMIN', 'CANCELLED']:
                return Response({
                    'detail': f'Cannot take decision on expense that has already been resolved ({expense.status}).'
                }, status=status.HTTP_400_BAD_REQUEST)

            account = None
            if expense.fund_account_id:
                account = SharedFundAccount.objects.select_for_update().filter(id=expense.fund_account_id).first()
            expense.admin = request.user
            expense.admin_decision = decision
            expense.admin_comments = comments
            expense.admin_timestamp = timezone.now()

            if decision == 'ACCEPT':
                expense.status = 'ACCEPTED_BY_ADMIN'
                expense.posted_at = timezone.now()
                # Deduct posted expenditure from current ledger balance
                if account:
                    account.current_ledger_balance -= expense.amount
                    account.save(update_fields=['current_ledger_balance'])
                action_text = f"Admin ACCEPTED and POSTED expense of ₹{expense.amount:,}"
            else: # REJECT
                expense.status = 'REJECTED_BY_ADMIN'
                # Release reserved commitment back to available balance!
                if account:
                    account.available_balance += expense.amount
                    account.save(update_fields=['available_balance'])
                action_text = f"Admin REJECTED expense of ₹{expense.amount:,} (Reason: {comments}). ₹{expense.amount:,} restored to available balance."

            expense.save()

            log_audit(
                request.user,
                f"ADMIN_{decision}",
                'EXPENSE',
                expense.reference_number,
                action_text,
                request
            )

        return Response(ExpenseSerializer(expense, context={'request': request}).data, status=status.HTTP_200_OK)


# ==========================================================
# MONTHLY LEDGER & RECONCILIATION
# ==========================================================

class MonthlyLedgerListView(APIView):
    def get(self, request):
        user = request.user
        queryset = MonthlyLedger.objects.select_related('fund_account', 'closed_by')

        if user.role in ['MAKER', 'CHECKER']:
            queryset = queryset.filter(fund_account__is_active=True)
        elif user.role == 'ADMIN':
            queryset = queryset.all()

        account_id = request.query_params.get('fund_account')
        if account_id:
            queryset = queryset.filter(fund_account__id=account_id)

        serializer = MonthlyLedgerSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only administrators can close monthly ledgers.'}, status=status.HTTP_403_FORBIDDEN)

        fund_account_id = request.data.get('fund_account')
        year = int(request.data.get('year', timezone.now().year))
        month = int(request.data.get('month', timezone.now().month))
        notes = request.data.get('notes', '')

        try:
            account = SharedFundAccount.objects.get(id=fund_account_id)
        except SharedFundAccount.DoesNotExist:
            return Response({'detail': 'Fund account not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check pending items
        pending_expenses_count = Expense.objects.filter(
            fund_account=account,
            status__in=['SUBMITTED', 'SENT_TO_ADMIN']
        ).count()

        if pending_expenses_count > 0 and not request.data.get('force_close'):
            return Response({
                'detail': f"Cannot close month: There are {pending_expenses_count} pending unapproved expense(s). Please review them or resolve before closing."
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Calculate totals for the month
            disbursements = DisbursementVoucher.objects.filter(
                fund_account=account,
                status='DISBURSED',
                payment_date__year=year,
                payment_date__month=month
            ).aggregate(total=Sum('amount'))['total'] or 0

            approved_expenses = Expense.objects.filter(
                fund_account=account,
                status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'],
                expense_date__year=year,
                expense_date__month=month
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Find previous month's closing balance or opening balance
            prev_ledger = MonthlyLedger.objects.filter(fund_account=account).order_by('-year', '-month').first()
            opening = prev_ledger.closing_balance if prev_ledger else account.opening_balance
            closing = opening + disbursements - approved_expenses

            ledger, created = MonthlyLedger.objects.update_or_create(
                fund_account=account,
                year=year,
                month=month,
                defaults={
                    'opening_balance': opening,
                    'total_disbursements': disbursements,
                    'total_approved_expenditure': approved_expenses,
                    'closing_balance': closing,
                    'is_locked': True,
                    'closed_by': request.user,
                    'closed_at': timezone.now(),
                    'notes': notes
                }
            )

            # Full carry-forward to account opening balance
            account.opening_balance = closing
            account.save(update_fields=['opening_balance'])

            log_audit(
                request.user,
                'MONTHLY_LEDGER_CLOSED',
                'MONTHLY_LEDGER',
                f"{account.account_id}-{year}-{month}",
                f"Closed month {year}/{month:02d} for {account.account_id}. Closing balance ₹{closing:,} carried forward.",
                request
            )

        return Response(MonthlyLedgerSerializer(ledger).data, status=status.HTTP_200_OK)


# ==========================================================
# DASHBOARD STATS (ROLE-AWARE)
# ==========================================================

class DashboardSummaryView(APIView):
    def get(self, request):
        user = request.user
        role = user.role

        user.last_refresh_at = timezone.now()
        user.save(update_fields=['last_refresh_at'])
        last_refresh_str = timezone.localtime(user.last_refresh_at).strftime('%d/%m/%y %I:%M %p')

        # Fallback fund account so any existing frontend references don't crash
        fund_account = SharedFundAccount.objects.filter(is_active=True).first() or SharedFundAccount.objects.first()
        if not fund_account:
            fund_account, _ = SharedFundAccount.objects.get_or_create(
                name="Operations Fund Pool",
                defaults={'opening_balance': 0, 'current_ledger_balance': 0, 'available_balance': 0, 'is_active': True}
            )

        if role == 'MAKER':
            funds_allocated = user.allocated_funds or 0
            funds_used = Expense.objects.filter(maker=user).exclude(
                status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED']
            ).aggregate(total=Sum('amount'))['total'] or 0
            funds_remaining = funds_allocated - funds_used

            expenses = Expense.objects.filter(maker=user).order_by('-expense_date', '-created_at')
            total_count = expenses.count()
            pending_count = expenses.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).count()
            approved_count = expenses.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN']).count()
            approved_amount = expenses.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN']).aggregate(total=Sum('amount'))['total'] or 0
            pending_amount = expenses.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).aggregate(total=Sum('amount'))['total'] or 0
            rejected_count = expenses.filter(status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN']).count()

            return Response({
                'role': 'MAKER',
                'funds_allocated': funds_allocated,
                'funds_used': funds_used,
                'funds_remaining': funds_remaining,
                'fund_account': SharedFundAccountSerializer(fund_account, context={'request': request}).data,
                'all_accounts': [SharedFundAccountSerializer(fund_account, context={'request': request}).data],
                'total_count': total_count,
                'approved_count': approved_count,
                'pending_count': pending_count,
                'pending_amount': pending_amount,
                'rejected_count': rejected_count,
                'approved_amount': approved_amount,
                'recent_expenses': ExpenseSerializer(expenses[:20], many=True, context={'request': request}).data,
                'last_refresh_at': user.last_refresh_at.isoformat(),
                'last_refresh_str': last_refresh_str
            })

        elif role == 'CHECKER':
            funds_allocated = user.allocated_funds or 0
            funds_used = Expense.objects.filter(maker=user).exclude(
                status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED']
            ).aggregate(total=Sum('amount'))['total'] or 0
            funds_remaining = funds_allocated - funds_used

            queue = Expense.objects.filter(status='SUBMITTED').order_by('-expense_date', '-created_at')
            my_expenses = Expense.objects.filter(maker=user).order_by('-expense_date', '-created_at')
            checked_by_me = Expense.objects.filter(checker=user)
            accepted_by_checker = checked_by_me.filter(checker_action='ACCEPT').count()
            rejected_by_checker = checked_by_me.filter(checker_action='REJECT').count()
            sent_to_admin = checked_by_me.filter(checker_action='SEND_TO_ADMIN').count()

            return Response({
                'role': 'CHECKER',
                'funds_allocated': funds_allocated,
                'funds_used': funds_used,
                'funds_remaining': funds_remaining,
                'fund_account': SharedFundAccountSerializer(fund_account, context={'request': request}).data,
                'all_accounts': [SharedFundAccountSerializer(fund_account, context={'request': request}).data],
                'pending_review_count': queue.count(),
                'accepted_by_checker_count': accepted_by_checker,
                'rejected_by_checker_count': rejected_by_checker,
                'sent_to_admin_count': sent_to_admin,
                'review_queue': ExpenseSerializer(queue[:20], many=True, context={'request': request}).data,
                'my_expenses': ExpenseSerializer(my_expenses[:20], many=True, context={'request': request}).data,
                'last_refresh_at': user.last_refresh_at.isoformat(),
                'last_refresh_str': last_refresh_str
            })

        elif role == 'ADMIN':
            from django.contrib.auth import get_user_model
            UserModel = get_user_model()
            all_employees = UserModel.objects.filter(role__in=['MAKER', 'CHECKER'], is_active=True)
            funds_allocated = all_employees.aggregate(total=Sum('allocated_funds'))['total'] or 0
            funds_used = Expense.objects.exclude(
                status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED']
            ).aggregate(total=Sum('amount'))['total'] or 0
            funds_remaining = funds_allocated - funds_used

            total_employees = all_employees.count()
            pending_checker = Expense.objects.filter(status='SUBMITTED').count()
            pending_admin = Expense.objects.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).count()
            total_approved_expenditure = Expense.objects.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN']).aggregate(total=Sum('amount'))['total'] or 0
            total_rejected_expenditure = Expense.objects.filter(status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN']).aggregate(total=Sum('amount'))['total'] or 0

            decision_queue = Expense.objects.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).order_by('-expense_date', '-created_at')
            decided_by_me = Expense.objects.filter(admin=user)
            accepted_count = decided_by_me.filter(admin_decision='ACCEPT').count()
            rejected_count = decided_by_me.filter(admin_decision='REJECT').count()
            approved_amount = decided_by_me.filter(admin_decision='ACCEPT').aggregate(total=Sum('amount'))['total'] or 0

            return Response({
                'role': 'ADMIN',
                'funds_allocated': funds_allocated,
                'funds_used': funds_used,
                'funds_remaining': funds_remaining,
                'total_employees': total_employees,
                'pending_checker_count': pending_checker,
                'pending_decision_count': pending_admin,
                'total_approved_expenditure': total_approved_expenditure,
                'total_rejected_expenditure': total_rejected_expenditure,
                'accepted_count': accepted_count,
                'rejected_count': rejected_count,
                'approved_amount': approved_amount,
                'fund_account': SharedFundAccountSerializer(fund_account, context={'request': request}).data,
                'all_accounts': [SharedFundAccountSerializer(fund_account, context={'request': request}).data],
                'decision_queue': ExpenseSerializer(decision_queue[:20], many=True, context={'request': request}).data,
                'last_refresh_at': user.last_refresh_at.isoformat(),
                'last_refresh_str': last_refresh_str
            })

        else:
            return Response({'detail': 'Invalid or unrecognized role.'}, status=status.HTTP_400_BAD_REQUEST)


# ==========================================================
# AUDIT LOGS
# ==========================================================

class AuditLogListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        logs = AuditLog.objects.select_related('user').all()[:100]
        return Response(AuditLogSerializer(logs, many=True).data)


# ==========================================================
# FUND ALLOCATIONS HISTORY
# ==========================================================

class FundAllocationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'CHECKER']:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = FundAllocation.objects.select_related('allocated_by', 'allocated_to').all()

        if request.user.role == 'CHECKER':
            queryset = queryset.filter(Q(allocated_by=request.user) | Q(allocated_to=request.user))

        allocator_role = request.query_params.get('allocator_role', '').upper()
        if allocator_role:
            queryset = queryset.filter(allocator_role=allocator_role)

        recipient_id = request.query_params.get('recipient_id')
        if recipient_id:
            queryset = queryset.filter(allocated_to_id=recipient_id)

        serializer = FundAllocationSerializer(queryset, many=True)
        return Response(serializer.data)

