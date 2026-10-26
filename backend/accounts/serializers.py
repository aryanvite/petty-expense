import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OtpRequest, Department, PasswordResetToken

User = get_user_model()

def validate_password_strength(password):
    if len(password) < 8:
        raise serializers.ValidationError('Password must be at least 8 characters long.')
    if not re.search(r'[A-Z]', password):
        raise serializers.ValidationError('Password must contain at least one uppercase letter (A-Z).')
    if not re.search(r'[a-z]', password):
        raise serializers.ValidationError('Password must contain at least one lowercase letter (a-z).')
    if not re.search(r'[0-9]', password):
        raise serializers.ValidationError('Password must contain at least one digit (0-9).')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise serializers.ValidationError('Password must contain at least one special character (!@#$%^&*...).')
    return password


class UserProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    last_refresh_formatted = serializers.SerializerMethodField()
    funds_used = serializers.SerializerMethodField()
    funds_remaining = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'employee_id',
            'email',
            'full_name',
            'phone',
            'department',
            'designation',
            'role',
            'photo',
            'photo_url',
            'is_active',
            'must_change_password',
            'allocated_funds',
            'funds_used',
            'funds_remaining',
            'last_refresh_at',
            'last_refresh_formatted',
            'date_joined'
        ]
        read_only_fields = ['id', 'employee_id', 'role', 'date_joined']

    def get_funds_used(self, obj):
        from expenses.models import Expense
        from django.db.models import Sum
        total = Expense.objects.filter(
            maker=obj
        ).exclude(
            status__in=['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED']
        ).aggregate(total=Sum('amount'))['total'] or 0
        return total

    def get_funds_remaining(self, obj):
        return (obj.allocated_funds or 0) - self.get_funds_used(obj)

    def get_last_refresh_formatted(self, obj):
        if obj.last_refresh_at:
            from django.utils import timezone
            local_dt = timezone.localtime(obj.last_refresh_at)
            return local_dt.strftime('%d/%m/%y %I:%M %p')
        return None

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(required=False, default=False)


class RequestOtpSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(
        choices=['CHANGE_PASSWORD', 'FORGOT_PASSWORD'],
        default='CHANGE_PASSWORD'
    )


class ChangePasswordWithOtpSerializer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class AdminCreateEmployeeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id',
            'employee_id',
            'email',
            'full_name',
            'phone',
            'department',
            'designation',
            'role',
            'allocated_funds',
            'password'
        ]
        read_only_fields = ['id', 'employee_id']

    def validate_password(self, value):
        if value:
            return validate_password_strength(value)
        return value

    def validate_role(self, value):
        role = value.upper()
        request = self.context.get('request')
        if request and request.user.role == 'ADMIN' and role == 'ADMIN':
            raise serializers.ValidationError('Administrators cannot create other Administrator accounts. Only Makers and Checkers can be created.')
        if request and request.user.role == 'CHECKER' and role in ['ADMIN', 'CHECKER']:
            raise serializers.ValidationError('Checkers can only create Maker / Employee accounts.')
        return role

    def create(self, validated_data):
        raw_password = validated_data.pop('password', None)
        role = validated_data.pop('role', 'MAKER')
        if not raw_password:
            # Generate a compliant temporary password
            prefix_map = {
                'ADMIN': 'Adm@',
                'MAKER': 'Mkr@',
                'CHECKER': 'Chk@',
            }
            prefix = prefix_map.get(role, 'Emp@')
            raw_password = prefix + str(User.objects.count() + 1001)
        
        user = User.objects.create_user(
            role=role,
            must_change_password=True,
            is_staff=(role == 'ADMIN'),
            **validated_data
        )
        user.set_password(raw_password)
        user.save()
        user._raw_temp_password = raw_password  # temporary attribute to display to admin once
        return user


class AdminResetPasswordSerializer(serializers.Serializer):
    temporary_password = serializers.CharField(write_only=True, required=False)

    def validate_temporary_password(self, value):
        if value:
            return validate_password_strength(value)
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=150)


class ResetPasswordConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True, required=False)

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate(self, attrs):
        if 'confirm_password' in attrs and attrs['confirm_password']:
            if attrs['password'] != attrs['confirm_password']:
                raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

