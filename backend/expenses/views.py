from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import models, transaction
from django.db.models import Sum, Count, Q, Min, Max
from django.utils import timezone
from datetime import datetime
from django.contrib.auth import get_user_model
User = get_user_model()

from .models import (
    ExpenseCategory,
    SavedVendor,
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
    SavedVendorSerializer,
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
    IsCheckerUserRole,
    IsAdminOrCheckerUserRole
)
from accounts.views import log_audit


# ==========================================================
# EXPENSE CATEGORIES
# ==========================================================

class ExpenseCategoryListView(APIView):
    def get(self, request):
        include_stats = request.query_params.get('include_stats') == 'true' or request.user.role == 'ADMIN'
        include_inactive = request.query_params.get('include_inactive') == 'true'
        
        if include_inactive and request.user.role == 'ADMIN':
            categories = ExpenseCategory.objects.all()
        else:
            categories = ExpenseCategory.objects.filter(is_active=True)

        if include_stats:
            data = []
            for cat in categories:
                exp_qs = Expense.objects.filter(category=cat.name)
                total_amt = exp_qs.exclude(status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN']).aggregate(total=Sum('amount'))['total'] or 0
                cnt = exp_qs.count()
                data.append({
                    'id': cat.id,
                    'name': cat.name,
                    'description': cat.description,
                    'is_active': cat.is_active,
                    'created_at': cat.created_at,
                    'total_amount': total_amt,
                    'expense_count': cnt,
                })
            grand_total = sum(d['total_amount'] for d in data) or 0
            for d in data:
                d['percentage'] = round((d['total_amount'] / grand_total * 100), 1) if grand_total > 0 else 0.0
            return Response(data)

        serializer = ExpenseCategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only administrators can create categories.'}, status=status.HTTP_403_FORBIDDEN)
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'name': ['Category name is required.']}, status=status.HTTP_400_BAD_REQUEST)
        existing = ExpenseCategory.objects.filter(name__iexact=name).first()
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.description = request.data.get('description', existing.description)
                existing.save()
                log_audit(request.user, 'CATEGORY_REACTIVATED', 'CATEGORY', existing.id, f"Reactivated category {existing.name}", request)
                return Response(ExpenseCategorySerializer(existing).data, status=status.HTTP_200_OK)
            return Response({'name': ['A category with this name already exists.']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ExpenseCategorySerializer(data={'name': name, 'description': request.data.get('description', '').strip()})
        if serializer.is_valid():
            cat = serializer.save()
            log_audit(request.user, 'CATEGORY_CREATED', 'CATEGORY', cat.id, f"Created category {cat.name}", request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExpenseCategoryDetailView(APIView):
    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only administrators can delete categories.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            cat = ExpenseCategory.objects.get(pk=pk)
        except ExpenseCategory.DoesNotExist:
            return Response({'detail': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        cat_name = cat.name
        expenses_count = Expense.objects.filter(category=cat_name).count()
        if expenses_count > 0:
            cat.is_active = False
            cat.save()
            log_audit(request.user, 'CATEGORY_DEACTIVATED', 'CATEGORY', cat.id, f"Deactivated category {cat_name} ({expenses_count} existing expenses)", request)
            return Response({
                'detail': f'Category "{cat_name}" was deactivated because it is linked to {expenses_count} historical expense claim(s).',
                'action': 'deactivated',
                'id': pk
            })
        else:
            cat.delete()
            log_audit(request.user, 'CATEGORY_DELETED', 'CATEGORY', pk, f"Deleted unused category {cat_name}", request)
            return Response({
                'detail': f'Category "{cat_name}" was deleted successfully.',
                'action': 'deleted',
                'id': pk
            })

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only administrators can edit categories.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            cat = ExpenseCategory.objects.get(pk=pk)
        except ExpenseCategory.DoesNotExist:
            return Response({'detail': 'Category not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'name' in request.data:
            new_name = request.data.get('name', '').strip()
            if not new_name:
                return Response({'name': ['Category name cannot be blank.']}, status=status.HTTP_400_BAD_REQUEST)
            if ExpenseCategory.objects.filter(name__iexact=new_name).exclude(pk=pk).exists():
                return Response({'name': ['A category with this name already exists.']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ExpenseCategorySerializer(cat, data=request.data, partial=True)
        if serializer.is_valid():
            cat = serializer.save()
            log_audit(request.user, 'CATEGORY_UPDATED', 'CATEGORY', cat.id, f"Updated category {cat.name}", request)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SavedVendorListView(APIView):
    def get(self, request):
        saved_names = list(SavedVendor.objects.values_list('name', flat=True))
        expense_names = list(Expense.objects.exclude(payee='').values_list('payee', flat=True).distinct())
        all_unique = sorted(list(set(saved_names + expense_names)), key=lambda s: s.lower())
        items = [{'name': name, 'is_saved': name in saved_names} for name in all_unique if name.strip()]
        return Response(items)

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'Vendor name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        existing = SavedVendor.objects.filter(name__iexact=name).first()
        if existing:
            return Response({'detail': f'Vendor "{existing.name}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        vendor = SavedVendor.objects.create(
            name=name,
            created_by=request.user
        )
        return Response({'id': vendor.id, 'name': vendor.name, 'created': True}, status=status.HTTP_201_CREATED)


class AdminVendorSummaryListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'CHECKER']:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        search_query = request.query_params.get('search', '').strip().lower()
        saved_qs = SavedVendor.objects.all().order_by('name')
        saved_dict = {v.name.strip().lower(): v for v in saved_qs}

        expense_payees = Expense.objects.exclude(payee='').values_list('payee', flat=True).distinct()
        all_norm_names = sorted(list(set(list(saved_dict.keys()) + [p.strip().lower() for p in expense_payees if p.strip()])))

        results = []
        for norm_name in all_norm_names:
            matching_expenses = Expense.objects.filter(payee__iexact=norm_name)
            saved_obj = saved_dict.get(norm_name)

            first_exp = matching_expenses.first()
            if saved_obj:
                display_name = saved_obj.name
            elif first_exp:
                display_name = first_exp.payee
            else:
                display_name = norm_name.title()

            if search_query and search_query not in display_name.lower():
                continue

            approved_expenses = matching_expenses.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'])
            pending_expenses = matching_expenses.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN'])
            rejected_expenses = matching_expenses.filter(status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN'])

            total_spent = approved_expenses.aggregate(t=Sum('amount'))['t'] or 0
            pending_amount = pending_expenses.aggregate(t=Sum('amount'))['t'] or 0
            total_claims = matching_expenses.count()
            unique_employees = matching_expenses.values('maker').distinct().count()

            cats = list(matching_expenses.exclude(category='').values_list('category', flat=True).distinct()[:5])
            date_agg = matching_expenses.aggregate(first=Min('expense_date'), last=Max('expense_date'))

            results.append({
                'id': saved_obj.id if saved_obj else None,
                'name': display_name,
                'is_saved': saved_obj is not None,
                'total_spent': total_spent,
                'pending_amount': pending_amount,
                'total_claims_count': total_claims,
                'approved_claims_count': approved_expenses.count(),
                'pending_claims_count': pending_expenses.count(),
                'rejected_claims_count': rejected_expenses.count(),
                'unique_employees_count': unique_employees,
                'categories': cats,
                'first_expense_date': date_agg['first'],
                'last_expense_date': date_agg['last'],
                'created_at': saved_obj.created_at if saved_obj else date_agg['first']
            })

        sort_by = request.query_params.get('sort_by', 'spend_desc')
        if sort_by == 'spend_desc':
            results.sort(key=lambda x: x['total_spent'], reverse=True)
        elif sort_by == 'spend_asc':
            results.sort(key=lambda x: x['total_spent'])
        elif sort_by == 'name_asc':
            results.sort(key=lambda x: x['name'].lower())
        elif sort_by == 'name_desc':
            results.sort(key=lambda x: x['name'].lower(), reverse=True)
        elif sort_by == 'claims_desc':
            results.sort(key=lambda x: x['total_claims_count'], reverse=True)
        else:
            results.sort(key=lambda x: x['total_spent'], reverse=True)

        return Response(results)


class AdminVendorDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'CHECKER']:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        name = request.query_params.get('name', '').strip()
        if not name:
            return Response({'detail': 'Vendor name parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        saved_obj = SavedVendor.objects.filter(name__iexact=name).first()
        matching_expenses = Expense.objects.filter(payee__iexact=name).select_related('maker', 'checker', 'admin').order_by('-expense_date', '-created_at')

        approved_expenses = matching_expenses.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'])
        pending_expenses = matching_expenses.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN'])
        rejected_expenses = matching_expenses.filter(status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN'])

        total_spent = approved_expenses.aggregate(t=Sum('amount'))['t'] or 0
        pending_amount = pending_expenses.aggregate(t=Sum('amount'))['t'] or 0
        total_claims = matching_expenses.count()

        employees_dict = {}
        for exp in matching_expenses:
            m = exp.maker
            if not m:
                continue
            if m.id not in employees_dict:
                employees_dict[m.id] = {
                    'id': m.id,
                    'employee_id': m.employee_id or f"EMP{m.id:04d}",
                    'full_name': m.full_name or m.email,
                    'email': m.email,
                    'role': m.role,
                    'department': m.department or 'General',
                    'designation': m.designation or '',
                    'claims_count': 0,
                    'approved_claims_count': 0,
                    'total_spent': 0,
                    'pending_amount': 0,
                    'last_expense_date': None,
                }
            emp_data = employees_dict[m.id]
            emp_data['claims_count'] += 1
            if exp.status in ['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN']:
                emp_data['approved_claims_count'] += 1
                emp_data['total_spent'] += exp.amount
            elif exp.status in ['SUBMITTED', 'SENT_TO_ADMIN']:
                emp_data['pending_amount'] += exp.amount

            if not emp_data['last_expense_date'] or exp.expense_date > emp_data['last_expense_date']:
                emp_data['last_expense_date'] = exp.expense_date

        employees_list = sorted(list(employees_dict.values()), key=lambda e: e['total_spent'], reverse=True)
        expenses_data = ExpenseSerializer(matching_expenses, many=True, context={'request': request}).data

        summary = {
            'id': saved_obj.id if saved_obj else None,
            'name': saved_obj.name if saved_obj else name,
            'is_saved': saved_obj is not None,
            'total_spent': total_spent,
            'pending_amount': pending_amount,
            'total_claims_count': total_claims,
            'approved_claims_count': approved_expenses.count(),
            'pending_claims_count': pending_expenses.count(),
            'rejected_claims_count': rejected_expenses.count(),
            'unique_employees_count': len(employees_list),
            'first_expense_date': matching_expenses.last().expense_date if matching_expenses.exists() else None,
            'last_expense_date': matching_expenses.first().expense_date if matching_expenses.exists() else None,
        }

        return Response({
            'summary': summary,
            'employees': employees_list,
            'expenses': expenses_data
        })


class AdminVendorDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only Admins can delete saved vendors.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            vendor = SavedVendor.objects.get(pk=pk)
        except SavedVendor.DoesNotExist:
            return Response({'detail': 'Vendor not found.'}, status=status.HTTP_404_NOT_FOUND)

        vendor_name = vendor.name
        vendor.delete()
        log_audit(
            request.user,
            'VENDOR_DELETED',
            'VENDOR',
            pk,
            f"Deleted saved vendor {vendor_name}",
            request
        )
        return Response({'detail': f'Vendor "{vendor_name}" deleted successfully.'}, status=status.HTTP_200_OK)


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

        role_name = request.user.role.title()
        user_name = request.user.full_name or request.user.username
        emp_code = request.user.employee_id or request.user.username
        log_audit(
            request.user,
            'FUND_REQUEST_SUBMITTED',
            'FUND_REQUEST',
            req.request_number,
            f"Fund request #{req.request_number} for ₹{req.requested_amount:,} ({req.requested_amount:,} rupees) submitted by {role_name} {user_name} ({emp_code}). Reason: {req.reason or 'None'}",
            request
        )

        return Response(AdditionalFundRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class AdditionalFundRequestReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ['ADMIN', 'SUPER_ADMIN', 'CHECKER']:
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

                checker_name = request.user.full_name or request.user.username
                maker_role = fund_req.maker.role.title()
                maker_name = fund_req.maker.full_name or fund_req.maker.username
                maker_code = fund_req.maker.employee_id or fund_req.maker.username
                log_audit(
                    request.user,
                    'FUND_REQUEST_SENT_TO_ADMIN',
                    'FUND_REQUEST',
                    fund_req.request_number,
                    f"Fund request #{fund_req.request_number} for ₹{fund_req.requested_amount:,} ({fund_req.requested_amount:,} rupees) forwarded to Admin by Checker {checker_name} for {maker_role} {maker_name} ({maker_code}). Notes: {comments or 'None'}",
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

                allocator_role = request.user.role.title()
                allocator_name = request.user.full_name or request.user.username
                recipient_role = requester.role.title()
                recipient_name = requester.full_name or requester.username
                emp_code = requester.employee_id or requester.username
                log_audit(
                    request.user,
                    'FUNDS_ALLOCATED',
                    'USER',
                    requester.id,
                    f"Funds allocated to {recipient_role} {recipient_name} ({emp_code}), ₹{fund_req.approved_amount:,} ({fund_req.approved_amount:,} rupees) by {allocator_role} {allocator_name} via approved fund request #{fund_req.request_number}. Previous limit: ₹{old_funds:,}, new limit: ₹{requester.allocated_funds:,}.",
                    request
                )

            # Supplementary voucher generation: default to True when approving
            should_create_voucher = request.data.get('create_voucher')
            if should_create_voucher is None:
                should_create_voucher = request.data.get('auto_disburse')
            if should_create_voucher is None:
                should_create_voucher = True

            target_account = fund_req.fund_account
            if not target_account and request.user.role in ['ADMIN', 'SUPER_ADMIN']:
                target_account = SharedFundAccount.objects.filter(is_active=True).first() or SharedFundAccount.objects.first()
                if target_account:
                    fund_req.fund_account = target_account
                    fund_req.save(update_fields=['fund_account'])

            if action in ['APPROVE', 'PARTIALLY_APPROVE'] and should_create_voucher and target_account:
                voucher_amount = fund_req.approved_amount
                beneficiary = request.data.get('beneficiary', fund_req.maker.full_name)
                payment_mode = request.data.get('payment_mode', 'BANK_TRANSFER')
                payment_reference = request.data.get('payment_reference', '')

                DisbursementVoucher.objects.create(
                    fund_account=target_account,
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

            reviewer_role = request.user.role.title()
            reviewer_name = request.user.full_name or request.user.username
            maker_role = fund_req.maker.role.title()
            maker_name = fund_req.maker.full_name or fund_req.maker.username
            maker_code = fund_req.maker.employee_id or fund_req.maker.username

            if action == 'APPROVE':
                review_details = f"Fund request #{fund_req.request_number} for ₹{fund_req.requested_amount:,} ({fund_req.requested_amount:,} rupees) reviewed and APPROVED by {reviewer_role} {reviewer_name} for {maker_role} {maker_name} ({maker_code}). Approved amount: ₹{fund_req.approved_amount:,} ({fund_req.approved_amount:,} rupees). Comments: {comments or 'None'}"
            elif action == 'PARTIALLY_APPROVE':
                review_details = f"Fund request #{fund_req.request_number} for ₹{fund_req.requested_amount:,} ({fund_req.requested_amount:,} rupees) reviewed and PARTIALLY APPROVED by {reviewer_role} {reviewer_name} for {maker_role} {maker_name} ({maker_code}). Approved amount: ₹{fund_req.approved_amount:,} ({fund_req.approved_amount:,} rupees). Comments: {comments or 'None'}"
            elif action == 'REJECT':
                review_details = f"Fund request #{fund_req.request_number} for ₹{fund_req.requested_amount:,} ({fund_req.requested_amount:,} rupees) reviewed and REJECTED by {reviewer_role} {reviewer_name} for {maker_role} {maker_name} ({maker_code}). Comments: {comments or 'None'}"
            else:
                review_details = f"Fund request #{fund_req.request_number} for ₹{fund_req.requested_amount:,} ({fund_req.requested_amount:,} rupees) reviewed ({action}) by {reviewer_role} {reviewer_name} for {maker_role} {maker_name} ({maker_code}). Comments: {comments or 'None'}"

            log_audit(
                request.user,
                'FUND_REQUEST_REVIEWED',
                'FUND_REQUEST',
                fund_req.request_number,
                review_details,
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

        canceller_role = request.user.role.title()
        canceller_name = request.user.full_name or request.user.username
        log_audit(
            request.user,
            'FUND_REQUEST_CANCELLED',
            'FUND_REQUEST',
            fund_req.request_number,
            f"Fund request #{fund_req.request_number} for ₹{fund_req.requested_amount:,} ({fund_req.requested_amount:,} rupees) cancelled by {canceller_role} {canceller_name}.",
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
            if scope in ['my_claims', 'my_expenses', 'my-expenses', 'my']:
                queryset = queryset.filter(maker=user)
            else:
                queryset = queryset.filter(maker__role='MAKER')
        elif user.role == 'ADMIN':
            queryset = queryset.all()

        status_param = request.query_params.get('status', '').upper()
        if status_param:
            queryset = queryset.filter(status=status_param)

        maker_param = request.query_params.get('maker', '').strip()
        if maker_param and maker_param.upper() != 'ALL':
            if maker_param.isdigit():
                queryset = queryset.filter(maker__id=int(maker_param))
            else:
                queryset = queryset.filter(Q(maker__username=maker_param) | Q(maker__full_name__icontains=maker_param))

        serializer = ExpenseSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['MAKER', 'CHECKER']:
            return Response({'detail': 'Only Makers and Checkers can submit expense claims.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ExpenseCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        save_vendor_flag = serializer.validated_data.pop('save_vendor', False) or (str(request.data.get('save_vendor', '')).lower() in ['true', '1'])

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

            if save_vendor_flag and expense.payee:
                vname = expense.payee.strip()
                if vname and not SavedVendor.objects.filter(name__iexact=vname).exists():
                    SavedVendor.objects.create(
                        name=vname,
                        created_by=request.user
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
        logs = AuditLog.objects.select_related('user').all()[:500]
        return Response(AuditLogSerializer(logs, many=True).data)


# ==========================================================
# FUND ALLOCATIONS HISTORY
# ==========================================================

class FundAllocationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'CHECKER', 'MAKER']:
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = FundAllocation.objects.select_related('allocated_by', 'allocated_to').all()

        if request.user.role == 'CHECKER':
            queryset = queryset.filter(Q(allocated_by=request.user) | Q(allocated_to=request.user))
        elif request.user.role == 'MAKER':
            queryset = queryset.filter(allocated_to=request.user)

        allocator_role = request.query_params.get('allocator_role', '').upper()
        if allocator_role:
            queryset = queryset.filter(allocator_role=allocator_role)

        recipient_id = request.query_params.get('recipient_id')
        if recipient_id:
            queryset = queryset.filter(allocated_to_id=recipient_id)

        serializer = FundAllocationSerializer(queryset, many=True)
        return Response(serializer.data)


# ==========================================================
# UNIFIED NOTIFICATIONS
# ==========================================================

class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        notifications = []

        if user.role == 'MAKER':
            # 1. Maker's expenses reviewed
            exps = Expense.objects.filter(maker=user).exclude(status='SUBMITTED').order_by('-updated_at')[:30]
            for exp in exps:
                if exp.admin_decision == 'ACCEPT':
                    notifications.append({
                        'id': f'exp_adm_acc_{exp.id}',
                        'title': f'Claim {exp.reference_number} Approved',
                        'message': f'Admin approved your claim of ₹{exp.amount:,} for {exp.payee}.',
                        'date': exp.admin_timestamp or exp.updated_at,
                        'type': 'success',
                        'link': '/maker?tab=expenses'
                    })
                elif exp.admin_decision == 'REJECT':
                    notifications.append({
                        'id': f'exp_adm_rej_{exp.id}',
                        'title': f'Claim {exp.reference_number} Rejected',
                        'message': f'Admin rejected your claim. Reason: "{exp.admin_comments or "No comments provided"}"',
                        'date': exp.admin_timestamp or exp.updated_at,
                        'type': 'danger',
                        'link': '/maker?tab=expenses'
                    })
                elif exp.checker_action == 'ACCEPT':
                    notifications.append({
                        'id': f'exp_chk_acc_{exp.id}',
                        'title': f'Claim {exp.reference_number} Verified by Checker',
                        'message': f'Checker verified claim of ₹{exp.amount:,}. Sent to Admin for approval.',
                        'date': exp.checker_timestamp or exp.updated_at,
                        'type': 'info',
                        'link': '/maker?tab=expenses'
                    })
                elif exp.checker_action == 'SEND_TO_ADMIN':
                    notifications.append({
                        'id': f'exp_chk_esc_{exp.id}',
                        'title': f'Claim {exp.reference_number} Escalated to Admin',
                        'message': f'Checker escalated with remarks: "{exp.checker_comments or "Review required"}"',
                        'date': exp.checker_timestamp or exp.updated_at,
                        'type': 'warning',
                        'link': '/maker?tab=expenses'
                    })

            # 2. Maker's fund requests
            reqs = AdditionalFundRequest.objects.filter(requester=user).exclude(status='PENDING').order_by('-updated_at')[:20]
            for req in reqs:
                if req.status in ['APPROVED', 'DISBURSED']:
                    notifications.append({
                        'id': f'req_acc_{req.id}',
                        'title': f'Fund Request {req.request_number} Approved',
                        'message': f'Admin approved replenishment of ₹{(req.approved_amount or req.requested_amount):,}.',
                        'date': req.reviewed_at or req.updated_at,
                        'type': 'success',
                        'link': '/maker?tab=funds'
                    })
                elif req.status == 'REJECTED':
                    notifications.append({
                        'id': f'req_rej_{req.id}',
                        'title': f'Fund Request {req.request_number} Rejected',
                        'message': f'Admin rejected replenishment request: "{req.review_comments or "Low justification"}"',
                        'date': req.reviewed_at or req.updated_at,
                        'type': 'danger',
                        'link': '/maker?tab=funds'
                    })

        elif user.role == 'CHECKER':
            # 1. Pending claims awaiting checker verification
            pending_exps = Expense.objects.filter(maker__role='MAKER', status='SUBMITTED').order_by('-created_at')[:30]
            for exp in pending_exps:
                notifications.append({
                    'id': f'exp_chk_pend_{exp.id}',
                    'title': f'New Claim {exp.reference_number} Pending',
                    'message': f'{exp.maker.full_name} submitted ₹{exp.amount:,} for {exp.payee}.',
                    'date': exp.created_at,
                    'type': 'warning',
                    'link': '/checker?tab=expenses'
                })
            # 2. Checker own claims
            my_exps = Expense.objects.filter(maker=user).exclude(status='SENT_TO_ADMIN').order_by('-updated_at')[:20]
            for exp in my_exps:
                if exp.status == 'ACCEPTED_BY_ADMIN':
                    notifications.append({
                        'id': f'exp_chk_adm_acc_{exp.id}',
                        'title': f'Claim {exp.reference_number} Approved by Admin',
                        'message': f'Admin approved your direct claim of ₹{exp.amount:,}.',
                        'date': exp.admin_timestamp or exp.updated_at,
                        'type': 'success',
                        'link': '/checker?tab=my-expenses'
                    })
                elif exp.status == 'REJECTED_BY_ADMIN':
                    notifications.append({
                        'id': f'exp_chk_adm_rej_{exp.id}',
                        'title': f'Claim {exp.reference_number} Rejected by Admin',
                        'message': f'Admin rejected your direct claim. Reason: "{exp.admin_comments or "Rejected"}"',
                        'date': exp.admin_timestamp or exp.updated_at,
                        'type': 'danger',
                        'link': '/checker?tab=my-expenses'
                    })
            # 3. Checker's own fund requests
            checker_reqs = AdditionalFundRequest.objects.filter(maker=user).exclude(status='SUBMITTED').order_by('-updated_at')[:20]
            for req in checker_reqs:
                if req.status in ['APPROVED', 'DISBURSED']:
                    notifications.append({
                        'id': f'chk_req_acc_{req.id}',
                        'title': f'Fund Request {req.request_number} Approved',
                        'message': f'Admin approved supplementary disbursement of ₹{(req.approved_amount or req.requested_amount):,}.',
                        'date': req.reviewed_at or req.updated_at,
                        'type': 'success',
                        'link': '/checker?tab=requests'
                    })
                elif req.status == 'REJECTED':
                    notifications.append({
                        'id': f'chk_req_rej_{req.id}',
                        'title': f'Fund Request {req.request_number} Rejected',
                        'message': f'Admin rejected replenishment request: "{req.review_comments or "Low justification"}"',
                        'date': req.reviewed_at or req.updated_at,
                        'type': 'danger',
                        'link': '/checker?tab=requests'
                    })

        elif user.role == 'ADMIN':
            # 1. Claims awaiting admin decision
            queue_exps = Expense.objects.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).order_by('-created_at')[:30]
            for exp in queue_exps:
                notifications.append({
                    'id': f'adm_queue_{exp.id}',
                    'title': f'Claim {exp.reference_number} Awaiting Decision',
                    'message': f'{exp.maker.full_name} ({exp.maker.role}) submitted ₹{exp.amount:,} for {exp.payee}.',
                    'date': exp.created_at,
                    'type': 'warning',
                    'link': '/admin?tab=checker-expenses' if exp.status == 'SENT_TO_ADMIN' else '/admin?tab=expenses'
                })
            # 2. Pending fund requests
            queue_reqs = AdditionalFundRequest.objects.filter(status='PENDING').order_by('-created_at')[:20]
            for req in queue_reqs:
                notifications.append({
                    'id': f'adm_req_{req.id}',
                    'title': f'Fund Request {req.request_number} Pending',
                    'message': f'{req.requester.full_name} requested ₹{req.requested_amount:,}. Justification: "{req.justification[:60]}".',
                    'date': req.created_at,
                    'type': 'warning',
                    'link': '/admin?tab=requests'
                })

        # Sort all by date descending
        notifications.sort(key=lambda x: str(x['date']), reverse=True)

        # Format relative time
        now = timezone.now()
        for n in notifications:
            dt = n['date']
            try:
                diff = int((now - dt).total_seconds())
            except Exception:
                diff = 0
            if diff < 60:
                n['time_ago'] = 'Just now'
            elif diff < 3600:
                n['time_ago'] = f"{diff // 60}m ago"
            elif diff < 86400:
                n['time_ago'] = f"{diff // 3600}h ago"
            elif diff < 2592000:
                n['time_ago'] = f"{diff // 86400}d ago"
            else:
                n['time_ago'] = f"{diff // 2592000}mo ago"

        return Response(notifications[:40])
