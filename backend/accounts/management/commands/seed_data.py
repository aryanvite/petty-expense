from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decimal import Decimal
from expenses.models import Category

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed initial categories and single admin account.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding petty expense system data...")

        # 1. Categories
        categories_data = [
            {'name': 'Tea', 'default_amount': Decimal('2.00')},
            {'name': 'Coffee', 'default_amount': Decimal('5.00')},
            {'name': 'Snacks', 'default_amount': Decimal('20.00')},
            {'name': 'Stationery', 'default_amount': Decimal('50.00')},
            {'name': 'Travel', 'default_amount': Decimal('100.00')},
            {'name': 'Other', 'default_amount': Decimal('0.00')},
        ]

        for c in categories_data:
            cat_obj, created = Category.objects.get_or_create(
                name=c['name'],
                defaults={'default_amount': c['default_amount'], 'is_active': True}
            )
            status_text = "Created" if created else "Exists"
            self.stdout.write(f"  - Category: {cat_obj.name} (Rs. {cat_obj.default_amount}) [{status_text}]")

        # 2. Only One Admin User
        admin_email = 'admin@company.com'
        admin_user, admin_created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                'full_name': 'System Administrator',
                'role': 'ADMIN',
                'department': 'Management',
                'designation': 'Senior Admin',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
                'must_change_password': False
            }
        )
        if admin_created:
            admin_user.set_password('Admin@123')
            admin_user.employee_id = 'EMP0001'
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f"  - Admin account created: {admin_email} / Admin@123"))
        else:
            self.stdout.write(f"  - Admin account already exists: {admin_email}")

        self.stdout.write(self.style.SUCCESS("Seeding completed successfully (Admin-only)!"))
