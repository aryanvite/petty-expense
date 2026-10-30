from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from datetime import timedelta
import random

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('role', 'MAKER')
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('MAKER', 'Maker'),
        ('CHECKER', 'Checker'),
    )

    employee_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    designation = models.CharField(max_length=100, blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MAKER')
    photo = models.FileField(upload_to='profiles/%Y/%m/', null=True, blank=True)
    allocated_funds = models.BigIntegerField(default=0, help_text="Total allocated fund limit in Whole INR")

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    token_version = models.IntegerField(default=0)
    last_refresh_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.full_name} ({self.employee_id or self.email}) - {self.role}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.employee_id:
            prefix_map = {
                'ADMIN': 'ADM',
                'MAKER': 'MKR',
                'CHECKER': 'CHK',
            }
            prefix = prefix_map.get(self.role, 'EMP')
            self.employee_id = f"{prefix}{self.pk:04d}"
            super().save(update_fields=['employee_id'])


class OtpRequest(models.Model):
    PURPOSE_CHOICES = (
        ('CHANGE_PASSWORD', 'Change Password'),
        ('FORGOT_PASSWORD', 'Forgot Password'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_requests')
    purpose = models.CharField(max_length=50, choices=PURPOSE_CHOICES, default='CHANGE_PASSWORD')
    otp_code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'otp_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.user.email} ({self.purpose})"

    @classmethod
    def generate_otp(cls, user, purpose='CHANGE_PASSWORD'):
        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
        code = f"{random.randint(100000, 999999)}"
        expires = timezone.now() + timedelta(minutes=5)
        print(f"\n=======================================================", flush=True)
        print(f"[OTP GENERATED] For: {user.email}", flush=True)
        print(f">>> 6-DIGIT OTP CODE: {code} <<<", flush=True)
        print(f"Valid for 5 minutes (until {expires.strftime('%H:%M:%S')})", flush=True)
        print(f"=======================================================\n", flush=True)
        return cls.objects.create(
            user=user,
            purpose=purpose,
            otp_code=code,
            expires_at=expires,
            attempts=0,
            is_used=False
        )

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at and self.attempts < 5


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    name_lower = models.CharField(max_length=100, unique=True, default='')
    code = models.CharField(max_length=20, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['name_lower'],
                name='unique_department_name_lower'
            )
        ]

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.name:
            self.name = self.name.strip().lower()
            self.name_lower = self.name.strip().lower()

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip().lower()
            self.name_lower = self.name.strip().lower()
        if not self.code:
            import re
            clean_name = re.sub(r'[^A-Za-z0-9]', '', self.name)
            base_code = clean_name[:4].upper() or 'DEPT'
            code = base_code
            counter = 1
            while Department.objects.filter(code=code).exclude(pk=self.pk).exists():
                code = f"{base_code[:3]}{counter}"
                counter += 1
            self.code = code
        super().save(*args, **kwargs)


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']

    def __str__(self):
        return f"ResetToken for {self.user.email} (expires: {self.expires_at})"

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at
