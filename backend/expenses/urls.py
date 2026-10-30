from django.urls import path
from .views import (
    ExpenseCategoryListView,
    ExpenseCategoryDetailView,
    SavedVendorListView,
    AdminVendorSummaryListView,
    AdminVendorDetailView,
    AdminVendorDeleteView,
    SharedFundAccountListView,
    SharedFundAccountDetailView,
    DisbursementVoucherListView,
    DisbursementVoucherDisburseView,
    AdditionalFundRequestListView,
    AdditionalFundRequestReviewView,
    AdditionalFundRequestCancelView,
    ExpenseListView,
    ExpenseDetailView,
    CheckerActionView,
    AdminDecisionView,
    MonthlyLedgerListView,
    DashboardSummaryView,
    AuditLogListView,
    FundAllocationListView,
    NotificationListView,
)

urlpatterns = [
    # Dashboard summary (role-aware)
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),

    # Expense categories
    path('categories/', ExpenseCategoryListView.as_view(), name='category-list'),
    path('categories/<int:pk>/', ExpenseCategoryDetailView.as_view(), name='category-detail'),

    # Saved Vendors
    path('vendors/', SavedVendorListView.as_view(), name='saved-vendor-list'),
    path('vendors/summary/', AdminVendorSummaryListView.as_view(), name='admin-vendor-summary-list'),
    path('vendors/detail/', AdminVendorDetailView.as_view(), name='admin-vendor-detail'),
    path('vendors/<int:pk>/', AdminVendorDeleteView.as_view(), name='admin-vendor-delete'),
    path('expenses/vendors/', SavedVendorListView.as_view(), name='expenses-vendor-alias'),

    # Fund Allocations History
    path('allocations/', FundAllocationListView.as_view(), name='allocation-list'),
    path('expenses/allocations/', FundAllocationListView.as_view(), name='expenses-allocation-alias'),

    # Shared Fund Accounts
    path('accounts/', SharedFundAccountListView.as_view(), name='fund-account-list'),
    path('accounts/<int:pk>/', SharedFundAccountDetailView.as_view(), name='fund-account-detail'),

    # Disbursement Vouchers
    path('vouchers/', DisbursementVoucherListView.as_view(), name='voucher-list'),
    path('vouchers/<int:pk>/disburse/', DisbursementVoucherDisburseView.as_view(), name='voucher-disburse'),

    # Additional Fund Requests
    path('fund-requests/', AdditionalFundRequestListView.as_view(), name='fund-request-list'),
    path('fund-requests/<int:pk>/review/', AdditionalFundRequestReviewView.as_view(), name='fund-request-review'),
    path('fund-requests/<int:pk>/cancel/', AdditionalFundRequestCancelView.as_view(), name='fund-request-cancel'),

    # Expenses & Workflow
    path('expenses/', ExpenseListView.as_view(), name='expense-list'),
    path('expenses/<int:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
    path('expenses/<int:pk>/checker-action/', CheckerActionView.as_view(), name='checker-action'),
    path('expenses/<int:pk>/admin-decision/', AdminDecisionView.as_view(), name='admin-decision'),

    # Monthly Ledger & Reconciliation
    path('ledgers/', MonthlyLedgerListView.as_view(), name='monthly-ledger-list'),

    # Audit Logs
    path('audit-logs/', AuditLogListView.as_view(), name='audit-logs'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
]
