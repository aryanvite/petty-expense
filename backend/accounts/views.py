import base64
import uuid
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import models, transaction
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.core.files.base import ContentFile
from django.conf import settings
from django.utils import timezone
from .models import OtpRequest, Department, PasswordResetToken
from .serializers import (
    UserProfileSerializer,
    LoginSerializer,
    RequestOtpSerializer,
    ChangePasswordWithOtpSerializer,
    AdminCreateEmployeeSerializer,
    AdminResetPasswordSerializer,
    DepartmentSerializer,
    ForgotPasswordSerializer,
    ResetPasswordConfirmSerializer
)
from .authentication import generate_tokens_for_user, decode_token
from .permissions import IsAdminUserRole, IsCheckerUserRole, IsAdminOrCheckerUserRole

User = get_user_model()

def log_audit(user, action, record_type='', record_id='', details='', request=None):
    from expenses.models import AuditLog
    ip = ''
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
    ip_addr = ip or '127.0.0.1'

    # Ensure USER_LOGIN description always contains the IP address
    if action == 'USER_LOGIN' and 'IP address' not in details and 'from IP:' not in details:
        details = f"{details} from IP address {ip_addr}".strip()

    AuditLog.objects.create(
        user=user,
        action=action,
        record_type=record_type,
        record_id=str(record_id),
        details=details,
        ip_address=ip_addr
    )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']
        remember_me = serializer.validated_data.get('remember_me', False)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'This account has been deactivated. Please contact your administrator.'}, status=status.HTTP_403_FORBIDDEN)

        user.last_refresh_at = timezone.now()
        user.save(update_fields=['last_refresh_at'])
        tokens = generate_tokens_for_user(user, remember_me=remember_me)
        user_data = UserProfileSerializer(user).data

        client_ip = ''
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                client_ip = x_forwarded_for.split(',')[0].strip()
            else:
                client_ip = request.META.get('REMOTE_ADDR', '')
        client_ip = client_ip or '127.0.0.1'

        duration_desc = "7 days (Remember Me enabled)" if remember_me else "1 day (24 hours)"
        user_name = user.full_name or user.username
        user_role_title = user.role.title()
        log_audit(
            user,
            'USER_LOGIN',
            'USER',
            user.id,
            f"User {user_role_title} {user_name} logged in from IP address {client_ip} (Session duration: {duration_desc})",
            request
        )

        return Response({
            'tokens': tokens,
            'user': user_data
        }, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = decode_token(refresh_token)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        if payload.get('token_type') != 'refresh':
            return Response({'detail': 'Invalid token type. Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = payload.get('user_id')
        token_version = payload.get('token_version', 0)
        remember_me = payload.get('remember_me', False)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'User account disabled.'}, status=status.HTTP_403_FORBIDDEN)

        if user.token_version != token_version:
            return Response({'detail': 'Session has expired or was revoked. Please log in again.'}, status=status.HTTP_401_UNAUTHORIZED)

        new_tokens = generate_tokens_for_user(user, remember_me=remember_me)
        return Response(new_tokens, status=status.HTTP_200_OK)


class CurrentUserProfileView(APIView):
    def get(self, request):
        user = request.user
        user.last_refresh_at = timezone.now()
        user.save(update_fields=['last_refresh_at'])
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        user = request.user

        remove_photo = request.data.get('remove_photo')
        if remove_photo in ['true', True, '1']:
            if user.photo:
                try:
                    user.photo.delete(save=False)
                except Exception:
                    pass
            user.photo = None

        if 'photo' in request.FILES:
            user.photo = request.FILES['photo']
        elif 'photo_base64' in request.data and request.data['photo_base64']:
            try:
                data_str = str(request.data['photo_base64']).strip()
                if ';base64,' in data_str:
                    _, data_str = data_str.split(';base64,', 1)
                file_bytes = base64.b64decode(data_str)
                file_name = f"profile_{user.id}_{int(timezone.now().timestamp())}.png"
                user.photo.save(file_name, ContentFile(file_bytes), save=False)
            except Exception as e:
                return Response({'detail': f'Invalid binary photo data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        if 'full_name' in request.data and str(request.data['full_name']).strip():
            user.full_name = str(request.data['full_name']).strip()

        if 'phone' in request.data:
            user.phone = str(request.data['phone']).strip()

        if 'email' in request.data and str(request.data['email']).strip():
            new_email = str(request.data['email']).strip().lower()
            if new_email != user.email:
                if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    return Response({'detail': f'Email {new_email} is already in use by another account.'}, status=status.HTTP_400_BAD_REQUEST)
                user.email = new_email

        user.save()
        log_audit(user, 'PROFILE_UPDATED', 'USER', user.id, f"Updated profile for {user.email}", request)
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)


class RequestOtpView(APIView):
    def post(self, request):
        serializer = RequestOtpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        purpose = serializer.validated_data['purpose']
        otp_obj = OtpRequest.generate_otp(request.user, purpose=purpose)

        # Print OTP to terminal console for easy local development & test
        print(f"\n=======================================================", flush=True)
        print(f"[OTP REQUESTED] For: {request.user.email}", flush=True)
        print(f">>> 6-DIGIT OTP CODE: {otp_obj.otp_code} <<<", flush=True)
        print(f"Valid until: {otp_obj.expires_at} (5 minutes)", flush=True)
        print(f"=======================================================\n", flush=True)

        # Try to send email
        try:
            send_mail(
                subject='Your Petty Expense Password Reset OTP',
                message=f'Hello {request.user.full_name},\n\nYour 6-digit verification code is: {otp_obj.otp_code}\n\nThis code is valid for 5 minutes. If you did not request this, please ignore this email.\n\nPetty Expense System',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@pettyexpense.local'),
                recipient_list=[request.user.email],
                fail_silently=True
            )
        except Exception:
            pass

        return Response({
            'detail': 'OTP sent to your mail',
        }, status=status.HTTP_200_OK)


class ChangePasswordWithOtpView(APIView):
    def post(self, request):
        serializer = ChangePasswordWithOtpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        otp_code = serializer.validated_data['otp_code'].strip()
        new_password = serializer.validated_data['new_password']

        # Find latest active OTP
        otp_obj = OtpRequest.objects.filter(
            user=request.user,
            purpose='CHANGE_PASSWORD',
            is_used=False
        ).order_by('-created_at').first()

        if not otp_obj:
            return Response({'detail': 'No active OTP request found. Please request an OTP first.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_obj.is_valid():
            return Response({'detail': 'The OTP code has expired or exceeded maximum attempts. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.otp_code != otp_code:
            otp_obj.attempts += 1
            otp_obj.save(update_fields=['attempts'])
            remaining = 5 - otp_obj.attempts
            return Response({'detail': f'Invalid OTP code. {remaining} attempt(s) remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        # Success - mark used
        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        # Update password & increment token_version to invalidate previous tokens
        user = request.user
        user.set_password(new_password)
        user.must_change_password = False
        user.token_version += 1
        user.save()

        log_audit(user, 'PASSWORD_CHANGED', 'USER', user.id, 'User successfully changed password via OTP', request)

        # Issue fresh token pair
        tokens = generate_tokens_for_user(user)

        return Response({
            'detail': 'Password changed successfully.',
            'tokens': tokens,
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


# ==========================================================
# FORGOT & RESET PASSWORD VIEWS (5-MINUTE TIMED LINK)
# ==========================================================

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        identifier = serializer.validated_data['email'].strip()
        now = timezone.now()
        local_time_str = timezone.localtime(now).strftime('%d/%m/%Y, %I:%M:%S %p')

        # Support lookup by email OR employee_id (works for all users: newly created or existing)
        user = User.objects.filter(
            models.Q(email__iexact=identifier) | models.Q(employee_id__iexact=identifier)
        ).first()

        if user:
            # Activate user if inactive so they can regain immediate access
            if not user.is_active:
                user.is_active = True
                user.save(update_fields=['is_active'])

            # Generate 30-minute temporary reset token
            token_str = uuid.uuid4().hex
            expires = now + timedelta(minutes=30)

            # Invalidate any older unused tokens for this user
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

            PasswordResetToken.objects.create(
                user=user,
                token=token_str,
                expires_at=expires
            )

            # Frontend host
            base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_link = f"{base_url}/reset-password?token={token_str}"

            print("\n=======================================================", flush=True)
            print("[PASSWORD RESET LINK GENERATED]", flush=True)
            print(f"Target User: {user.full_name} ({user.email}) [Role: {user.role}]", flush=True)
            print(f">>> RESET LINK: {reset_link} <<<", flush=True)
            print(f"Valid for 30 minutes (Expires at: {timezone.localtime(expires).strftime('%I:%M:%S %p')})", flush=True)
            print("=======================================================\n", flush=True)

            log_audit(user, 'FORGOT_PASSWORD_REQUESTED', 'USER', user.id, f"Password reset link generated for {user.email}", request)

            return Response({
                'detail': 'If email matches, link will be sent',
                'message': 'If email matches, link will be sent',
                'last_refresh_time': local_time_str
            }, status=status.HTTP_200_OK)
        else:
            print("\n=======================================================", flush=True)
            print("[INVALID PASSWORD RESET ATTEMPT]", flush=True)
            print(f"invalid identifier sent for password change: {identifier}", flush=True)
            print(f"Attempt timestamp: {local_time_str}", flush=True)
            print("=======================================================\n", flush=True)

            return Response({
                'detail': 'If email matches, link will be sent',
                'message': 'If email matches, link will be sent',
                'last_refresh_time': local_time_str
            }, status=status.HTTP_200_OK)


class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data['token'].strip()
        new_password = serializer.validated_data['password']

        reset_token = PasswordResetToken.objects.filter(token=token_str).first()
        if not reset_token or reset_token.is_used:
            return Response(
                {'detail': 'This password reset link is invalid or has already been used. Please request a new link.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if timezone.now() > reset_token.expires_at:
            reset_token.is_used = True
            reset_token.save(update_fields=['is_used'])
            return Response(
                {'detail': 'This password reset link has expired (links are valid for 30 minutes). Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = reset_token.user
        user.set_password(new_password)
        user.must_change_password = False
        user.is_active = True
        user.token_version += 1
        user.save()

        reset_token.is_used = True
        reset_token.save(update_fields=['is_used'])

        log_audit(user, 'PASSWORD_RESET_COMPLETED', 'USER', user.id, f"Successfully reset password for {user.email}", request)

        return Response({
            'detail': 'Your password has been reset successfully! You can now sign in with your new password.'
        }, status=status.HTTP_200_OK)


# ==========================================================
# DEPARTMENT MASTERS (CRUD)
# ==========================================================

class DepartmentListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]

    def get(self, request):
        queryset = Department.objects.all().order_by('name')
        active_only = request.query_params.get('active_only')
        if active_only in ['true', '1']:
            queryset = queryset.filter(is_active=True)
        serializer = DepartmentSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'name' in data and isinstance(data['name'], str):
            data['name'] = data['name'].strip().lower()
        serializer = DepartmentSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        dept = serializer.save()
        log_audit(request.user, 'DEPARTMENT_CREATED', 'DEPARTMENT', dept.id, f"Created department {dept.name}", request)
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_201_CREATED)


class DepartmentDetailView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request, pk):
        try:
            dept = Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return Response({'detail': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'name' in data and isinstance(data['name'], str):
            data['name'] = data['name'].strip().lower()

        serializer = DepartmentSerializer(dept, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        dept = serializer.save()
        log_audit(request.user, 'DEPARTMENT_UPDATED', 'DEPARTMENT', dept.id, f"Updated department {dept.name}", request)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            dept = Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return Response({'detail': 'Department not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if users are assigned
        users_count = User.objects.filter(models.Q(department__iexact=dept.name) | models.Q(department=dept.name_lower)).count()
        if users_count > 0:
            return Response({
                'detail': f'Cannot delete department "{dept.name}" because {users_count} employee(s) are assigned to it. Please reassign those employees first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        dept_name = dept.name
        dept.delete()
        log_audit(request.user, 'DEPARTMENT_DELETED', 'DEPARTMENT', pk, f"Deleted department {dept_name}", request)
        return Response({'detail': f'Department "{dept_name}" deleted successfully.'}, status=status.HTTP_200_OK)


# ==========================================================
# ADMIN EMPLOYEE MANAGEMENT VIEWS
# ==========================================================

class AdminEmployeeListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrCheckerUserRole()]

    def get(self, request):
        queryset = User.objects.all().order_by('employee_id')

        role_filter = request.query_params.get('role', '').strip().upper()
        if role_filter in ['ADMIN', 'MAKER', 'CHECKER']:
            queryset = queryset.filter(role=role_filter)

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                models.Q(full_name__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(employee_id__icontains=search) |
                models.Q(department__icontains=search)
            )

        status_param = request.query_params.get('status', '').strip().lower()
        if status_param == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_param == 'inactive':
            queryset = queryset.filter(is_active=False)

        serializer = UserProfileSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        requested_role = str(request.data.get('role', 'MAKER')).strip().upper()
        if request.user.role == 'ADMIN' and requested_role == 'ADMIN':
            return Response({
                'detail': 'Administrators cannot create another Administrator account. Only Maker and Checker accounts can be created.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'CHECKER' and requested_role in ['ADMIN', 'CHECKER']:
            return Response({
                'detail': 'Checkers can only create Maker / Employee accounts. You cannot create Admin or Checker accounts.'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminCreateEmployeeSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = serializer.save()
        temp_password = getattr(employee, '_raw_temp_password', None)

        log_audit(
            request.user,
            'USER_CREATED',
            'USER',
            employee.id,
            f"Created {employee.role} account {employee.full_name} ({employee.employee_id})",
            request
        )

        response_data = UserProfileSerializer(employee, context={'request': request}).data
        response_data['temporary_password'] = temp_password

        return Response({
            'detail': f"{employee.role} {employee.full_name} created successfully.",
            'employee': response_data
        }, status=status.HTTP_201_CREATED)


class AdminEmployeeDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrCheckerUserRole()]

    def get(self, request, employee_id):
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        from expenses.models import Expense
        from expenses.serializers import ExpenseSerializer

        if employee.role == 'CHECKER':
            expenses = Expense.objects.filter(models.Q(maker=employee) | models.Q(checker=employee)).order_by('-expense_date', '-created_at')
        elif employee.role == 'ADMIN':
            expenses = Expense.objects.filter(models.Q(maker=employee) | models.Q(admin=employee)).order_by('-expense_date', '-created_at')
        else:
            expenses = Expense.objects.filter(maker=employee).order_by('-expense_date', '-created_at')

        total_claims = expenses.count()
        total_amount = expenses.aggregate(total=models.Sum('amount'))['total'] or 0
        approved_amount = expenses.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN']).aggregate(total=models.Sum('amount'))['total'] or 0
        pending_count = expenses.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).count()

        emp_data = UserProfileSerializer(employee, context={'request': request}).data
        emp_data['total_claims_count'] = total_claims
        emp_data['total_claimed_amount'] = total_amount
        emp_data['approved_amount'] = approved_amount
        emp_data['pending_count'] = pending_count
        emp_data['expenses'] = ExpenseSerializer(expenses, many=True).data

        return Response(emp_data)

    def patch(self, request, employee_id):
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Hierarchy and self-deactivation checks
        if employee.id == request.user.id and 'is_active' in request.data and not request.data['is_active']:
            return Response({'detail': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'ADMIN':
            if employee.role == 'ADMIN' and employee.id != request.user.id:
                return Response({'detail': 'Administrators cannot modify other Administrator accounts.'}, status=status.HTTP_403_FORBIDDEN)
            if 'role' in request.data and str(request.data['role']).strip().upper() == 'ADMIN' and employee.role != 'ADMIN':
                return Response({'detail': 'Administrators cannot promote accounts to Administrator.'}, status=status.HTTP_400_BAD_REQUEST)
        elif request.user.role == 'CHECKER':
            if employee.role in ['ADMIN', 'CHECKER']:
                return Response({'detail': 'Checkers can only modify Maker accounts.'}, status=status.HTTP_403_FORBIDDEN)
            if 'role' in request.data and str(request.data['role']).strip().upper() != 'MAKER':
                return Response({'detail': 'Checkers can only assign the Maker role.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'detail': 'Employees cannot modify user accounts.'}, status=status.HTTP_403_FORBIDDEN)

        # Update Full Name
        if 'full_name' in request.data:
            name = str(request.data['full_name']).strip()
            if name:
                employee.full_name = name

        # Update Designation
        if 'designation' in request.data:
            employee.designation = str(request.data['designation']).strip()

        # Update Department
        if 'department' in request.data:
            employee.department = str(request.data['department']).strip()

        # Update Phone
        if 'phone' in request.data:
            employee.phone = str(request.data['phone']).strip()

        # Update Role (ADMIN, MAKER, CHECKER)
        if 'role' in request.data:
            new_role = str(request.data['role']).strip().upper()
            if new_role in ['ADMIN', 'MAKER', 'CHECKER']:
                employee.role = new_role
                employee.is_staff = (new_role == 'ADMIN')

        # Update Status
        if 'is_active' in request.data:
            employee.is_active = bool(request.data['is_active'])

        # Update Password directly from modal
        if 'password' in request.data and str(request.data['password']).strip():
            new_pwd = str(request.data['password']).strip()
            from .serializers import validate_password_strength
            try:
                validate_password_strength(new_pwd)
            except Exception as val_err:
                detail = getattr(val_err, 'detail', str(val_err))
                if isinstance(detail, list):
                    detail = detail[0]
                return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)
            employee.set_password(new_pwd)
            employee.must_change_password = True
            employee.token_version += 1

        employee.save()

        log_audit(
            request.user,
            'USER_UPDATED',
            'USER',
            employee.id,
            f"Updated details for {employee.full_name} ({employee.employee_id})",
            request
        )

        from expenses.models import Expense
        from expenses.serializers import ExpenseSerializer
        if employee.role == 'CHECKER':
            expenses = Expense.objects.filter(models.Q(maker=employee) | models.Q(checker=employee)).order_by('-expense_date', '-created_at')
        elif employee.role == 'ADMIN':
            expenses = Expense.objects.filter(models.Q(maker=employee) | models.Q(admin=employee)).order_by('-expense_date', '-created_at')
        else:
            expenses = Expense.objects.filter(maker=employee).order_by('-expense_date', '-created_at')
        emp_data = UserProfileSerializer(employee, context={'request': request}).data
        emp_data['total_claims_count'] = expenses.count()
        emp_data['total_claimed_amount'] = expenses.aggregate(total=models.Sum('amount'))['total'] or 0
        emp_data['approved_amount'] = expenses.filter(status__in=['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN']).aggregate(total=models.Sum('amount'))['total'] or 0
        emp_data['pending_count'] = expenses.filter(status__in=['SUBMITTED', 'SENT_TO_ADMIN']).count()
        emp_data['expenses'] = ExpenseSerializer(expenses, many=True).data

        return Response({
            'detail': f'User {employee.full_name} updated successfully.',
            'employee': emp_data
        }, status=status.HTTP_200_OK)

    def delete(self, request, employee_id):
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if employee.id == request.user.id:
            return Response({'detail': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'ADMIN':
            if employee.role == 'ADMIN':
                return Response({
                    'detail': 'Administrators cannot delete other Administrator accounts. Only Makers and Checkers can be deleted.'
                }, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'CHECKER':
            if employee.role in ['ADMIN', 'CHECKER']:
                return Response({
                    'detail': 'Checkers can only delete Maker / Employee accounts. You cannot delete Admin or Checker accounts.'
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'detail': 'Employees cannot delete accounts.'}, status=status.HTTP_403_FORBIDDEN)

        emp_name = employee.full_name
        emp_id_code = employee.employee_id or employee.email
        emp_pk = employee.id
        employee.delete()

        log_audit(
            request.user,
            'USER_DELETED',
            'USER',
            emp_pk,
            f"Deleted account {emp_name} ({emp_id_code})",
            request
        )

        return Response({'detail': f'Account for {emp_name} was deleted successfully.'}, status=status.HTTP_200_OK)


class AdminResetPasswordView(APIView):
    permission_classes = [IsAdminOrCheckerUserRole]

    def post(self, request, employee_id):
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if employee.id == request.user.id:
            return Response(
                {'detail': 'Users cannot reset their own password through this action.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role == 'ADMIN':
            if employee.role == 'ADMIN':
                return Response({'detail': 'Administrators cannot reset passwords for other Administrators.'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'CHECKER':
            if employee.role != 'MAKER':
                return Response({'detail': 'Checkers can only reset passwords for Maker employees.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'detail': 'Employees cannot reset user passwords.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        temp_password = serializer.validated_data.get('temporary_password')
        if not temp_password:
            prefix_map = {
                'ADMIN': 'Adm@',
                'MAKER': 'Mkr@',
                'CHECKER': 'Chk@',
            }
            prefix = prefix_map.get(employee.role, 'Emp@')
            temp_password = prefix + str(employee.id + 2000)

        employee.set_password(temp_password)
        employee.must_change_password = True
        employee.token_version += 1
        employee.save()

        log_audit(
            request.user,
            'ADMIN_RESET_PASSWORD',
            'USER',
            employee.id,
            f"Reset password for {employee.full_name} ({employee.employee_id})",
            request
        )

        return Response({
            'detail': f'Password for {employee.full_name} has been reset.',
            'temporary_password': temp_password
        }, status=status.HTTP_200_OK)


class AdminToggleActiveView(APIView):
    permission_classes = [IsAdminOrCheckerUserRole]

    def post(self, request, employee_id):
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if employee.id == request.user.id:
            return Response({'detail': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'ADMIN':
            if employee.role == 'ADMIN':
                return Response({
                    'detail': 'Administrators cannot activate or deactivate other Administrator accounts.'
                }, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'CHECKER':
            if employee.role in ['ADMIN', 'CHECKER']:
                return Response({
                    'detail': 'Checkers can only activate or deactivate Maker / Employee accounts. You cannot change Admin or Checker accounts.'
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'detail': 'Employees cannot activate or deactivate accounts.'}, status=status.HTTP_403_FORBIDDEN)

        employee.is_active = not employee.is_active
        if not employee.is_active:
            employee.token_version += 1  # instantly revoke any active JWT session
        employee.save()

        status_str = 'activated' if employee.is_active else 'deactivated'
        log_audit(
            request.user,
            'USER_STATUS_TOGGLED',
            'USER',
            employee.id,
            f"{status_str.capitalize()} account for {employee.full_name} ({employee.employee_id})",
            request
        )

        return Response({
            'detail': f'Account for {employee.full_name} has been {status_str}.',
            'is_active': employee.is_active
        }, status=status.HTTP_200_OK)


class AdminAllocateFundsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, employee_id):
        if request.user.role not in ['ADMIN', 'CHECKER']:
            return Response({'detail': 'Only Admins and Checkers can allocate funds.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'CHECKER':
            if employee.role != 'MAKER':
                return Response({'detail': 'Checkers can only allocate funds to Makers.'}, status=status.HTTP_400_BAD_REQUEST)
        elif request.user.role == 'ADMIN':
            if employee.role == 'ADMIN':
                return Response({'detail': 'Funds can only be allocated to Makers and Checkers.'}, status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('notes', '').strip()
        description = request.data.get('description', '').strip() or notes
        voucher_number = request.data.get('voucher_number', '').strip()
        payment_type = request.data.get('payment_type', '').strip() or request.data.get('type', '').strip() or 'Cash'
        other_payment_type = request.data.get('other_payment_type', '').strip()
        allocation_date_str = request.data.get('allocation_date') or request.data.get('date')
        
        allocation_date = None
        if allocation_date_str:
            try:
                from datetime import datetime
                parsed_date = datetime.strptime(str(allocation_date_str).split('T')[0], '%Y-%m-%d').date()
                if parsed_date > timezone.localdate():
                    return Response({'detail': 'Allocation date cannot be in the future.'}, status=status.HTTP_400_BAD_REQUEST)
                allocation_date = parsed_date
            except ValueError:
                return Response({'detail': 'Invalid date format. Expected YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            allocation_date = timezone.localdate()

        valid_types = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Other']
        if payment_type and payment_type not in valid_types:
            return Response({'detail': f'Payment type must be one of: {", ".join(valid_types)}.'}, status=status.HTTP_400_BAD_REQUEST)

        if payment_type == 'Other':
            if not other_payment_type:
                return Response({'detail': 'Please specify the custom payment type.'}, status=status.HTTP_400_BAD_REQUEST)
            final_payment_type = f"Other ({other_payment_type})"
        else:
            final_payment_type = payment_type or 'Cash'

        raw_amount = request.data.get('amount')
        raw_allocated = request.data.get('allocated_funds')

        with transaction.atomic():
            if request.user.role == 'CHECKER':
                try:
                    if raw_amount is not None:
                        allocate_amount = int(raw_amount)
                    elif raw_allocated is not None:
                        # If passed as total limit, compute incremental difference
                        target_limit = int(raw_allocated)
                        allocate_amount = target_limit - (employee.allocated_funds or 0)
                    else:
                        return Response({'detail': 'Please provide the amount to allocate.'}, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({'detail': 'Allocation amount must be a valid whole number.'}, status=status.HTTP_400_BAD_REQUEST)

                if allocate_amount <= 0:
                    return Response({'detail': 'Allocation amount must be greater than ₹0.'}, status=status.HTTP_400_BAD_REQUEST)

                checker = User.objects.select_for_update().get(id=request.user.id)
                from expenses.models import Expense, FundAllocation
                from django.db.models import Sum
                checker_used = Expense.objects.filter(
                    maker=checker
                ).exclude(
                    status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED']
                ).aggregate(total=Sum('amount'))['total'] or 0
                checker_balance = (checker.allocated_funds or 0) - checker_used

                if allocate_amount > checker_balance:
                    return Response({
                        'detail': f'Cannot allocate funds: Requested amount of ₹{allocate_amount:,} exceeds your available balance of ₹{checker_balance:,}.'
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Deduct from Checker
                checker_old = checker.allocated_funds or 0
                checker.allocated_funds = checker_old - allocate_amount
                checker.save(update_fields=['allocated_funds'])

                # Add to Maker
                employee = User.objects.select_for_update().get(id=employee.id)
                old_funds = employee.allocated_funds or 0
                employee.allocated_funds = old_funds + allocate_amount
                employee.save(update_fields=['allocated_funds'])

                FundAllocation.objects.create(
                    allocated_by=request.user,
                    allocated_to=employee,
                    amount=allocate_amount,
                    allocator_role='CHECKER',
                    recipient_role='MAKER',
                    recipient_previous_balance=old_funds,
                    recipient_new_balance=employee.allocated_funds,
                    allocator_previous_balance=checker_old,
                    allocator_new_balance=checker.allocated_funds,
                    voucher_number=voucher_number,
                    payment_type=final_payment_type,
                    allocation_date=allocation_date,
                    description=description or notes,
                    notes=description or notes
                )

                checker_name = request.user.full_name or request.user.username
                recipient_name = employee.full_name or employee.username
                emp_code = employee.employee_id or employee.username
                log_audit(
                    request.user,
                    'FUNDS_ALLOCATED',
                    'USER',
                    employee.id,
                    f"Funds allocated to Maker {recipient_name} ({emp_code}), ₹{allocate_amount:,} ({allocate_amount:,} rupees) by Checker {checker_name}. Mode: {final_payment_type}, Voucher: {voucher_number or 'N/A'}, Date: {allocation_date}. Deducted ₹{allocate_amount:,} from Checker available balance. New Maker limit: ₹{employee.allocated_funds:,}, Checker remaining limit: ₹{checker.allocated_funds:,}. Notes: {description or notes or 'None'}",
                    request
                )

                return Response({
                    'detail': f'Allocated ₹{allocate_amount:,} to {employee.full_name}. Deducted ₹{allocate_amount:,} from your available balance.',
                    'employee': UserProfileSerializer(employee, context={'request': request}).data,
                    'checker_allocated_funds': checker.allocated_funds,
                    'checker_funds_remaining': checker.allocated_funds - checker_used
                }, status=status.HTTP_200_OK)

            else:
                # ADMIN
                if not voucher_number:
                    return Response({'detail': 'Voucher number is required.'}, status=status.HTTP_400_BAD_REQUEST)
                if not description:
                    return Response({'detail': 'Description is required.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    if raw_amount is not None:
                        allocate_amount = int(raw_amount)
                    elif raw_allocated is not None:
                        allocate_amount = int(raw_allocated)
                    else:
                        return Response({'detail': 'Please provide the amount to allocate.'}, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({'detail': 'Allocated amount must be a valid whole number.'}, status=status.HTTP_400_BAD_REQUEST)

                if allocate_amount <= 0:
                    return Response({'detail': 'Allocation amount must be greater than ₹0.'}, status=status.HTTP_400_BAD_REQUEST)

                employee = User.objects.select_for_update().get(id=employee.id)
                old_funds = employee.allocated_funds or 0
                employee.allocated_funds = old_funds + allocate_amount
                employee.save(update_fields=['allocated_funds'])

                from expenses.models import SharedFundAccount, FundAllocation
                account = SharedFundAccount.objects.select_for_update().filter(is_active=True).first() or SharedFundAccount.objects.select_for_update().first()
                if account:
                    account.available_balance -= allocate_amount
                    account.current_ledger_balance -= allocate_amount
                    account.save(update_fields=['available_balance', 'current_ledger_balance'])
                FundAllocation.objects.create(
                    allocated_by=request.user,
                    allocated_to=employee,
                    amount=allocate_amount,
                    allocator_role='ADMIN',
                    recipient_role=employee.role,
                    recipient_previous_balance=old_funds,
                    recipient_new_balance=employee.allocated_funds,
                    voucher_number=voucher_number,
                    payment_type=final_payment_type,
                    allocation_date=allocation_date,
                    description=description,
                    notes=description
                )

                admin_name = request.user.full_name or request.user.username
                recipient_role = employee.role.title()
                recipient_name = employee.full_name or employee.username
                emp_code = employee.employee_id or employee.username
                log_audit(
                    request.user,
                    'FUNDS_ALLOCATED',
                    'USER',
                    employee.id,
                    f"Funds allocated to {recipient_role} {recipient_name} ({emp_code}), ₹{allocate_amount:,} ({allocate_amount:,} rupees) by Admin {admin_name}. Voucher #{voucher_number}, Mode: {final_payment_type}, Date: {allocation_date}. Previous limit: ₹{old_funds:,}, new limit: ₹{employee.allocated_funds:,}. Description: {description}",
                    request
                )

                return Response({
                    'detail': f'Allocated ₹{allocate_amount:,} to {employee.full_name}. New limit: ₹{employee.allocated_funds:,}.',
                    'employee': UserProfileSerializer(employee, context={'request': request}).data
                }, status=status.HTTP_200_OK)

