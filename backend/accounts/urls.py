from django.urls import path
from .views import (
    LoginView,
    RefreshTokenView,
    CurrentUserProfileView,
    RequestOtpView,
    ChangePasswordWithOtpView,
    ForgotPasswordView,
    ResetPasswordConfirmView,
    DepartmentListView,
    DepartmentDetailView,
    AdminEmployeeListView,
    AdminEmployeeDetailView,
    AdminResetPasswordView,
    AdminToggleActiveView,
    AdminAllocateFundsView
)

urlpatterns = [
    # Auth endpoints
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
    path('auth/profile/', CurrentUserProfileView.as_view(), name='auth-profile'),
    path('auth/password/otp/request/', RequestOtpView.as_view(), name='auth-otp-request'),
    path('auth/password/change/', ChangePasswordWithOtpView.as_view(), name='auth-password-change'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/confirm/', ResetPasswordConfirmView.as_view(), name='auth-reset-password-confirm'),

    # Department Masters CRUD endpoints
    path('departments/', DepartmentListView.as_view(), name='departments-list'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department-detail'),

    # Admin employee & user management endpoints
    path('admin/employees/', AdminEmployeeListView.as_view(), name='admin-employees'),
    path('admin/employees/<int:employee_id>/', AdminEmployeeDetailView.as_view(), name='admin-employee-detail'),
    path('admin/employees/<int:employee_id>/allocate-funds/', AdminAllocateFundsView.as_view(), name='admin-employee-allocate-funds'),
    path('checker/employees/<int:employee_id>/allocate-funds/', AdminAllocateFundsView.as_view(), name='checker-employee-allocate-funds'),
    path('employees/<int:employee_id>/allocate-funds/', AdminAllocateFundsView.as_view(), name='employee-allocate-funds'),
    path('admin/employees/<int:employee_id>/reset-password/', AdminResetPasswordView.as_view(), name='admin-employee-reset-password'),
    path('admin/employees/<int:employee_id>/toggle-active/', AdminToggleActiveView.as_view(), name='admin-employee-toggle-active'),
]

