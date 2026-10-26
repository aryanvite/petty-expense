from django.db import migrations, models
from django.db.models import Sum
from django.utils import timezone


def post_existing_checker_approvals(apps, schema_editor):
    Expense = apps.get_model('expenses', 'Expense')
    SharedFundAccount = apps.get_model('expenses', 'SharedFundAccount')
    db_alias = schema_editor.connection.alias

    approved_expenses = Expense.objects.using(db_alias).filter(
        status='ACCEPTED_BY_CHECKER',
        posted_at__isnull=True
    )
    totals_by_account = approved_expenses.values('fund_account_id').annotate(total=Sum('amount'))

    for item in totals_by_account:
        account = SharedFundAccount.objects.using(db_alias).get(pk=item['fund_account_id'])
        account.current_ledger_balance -= item['total']
        account.save(using=db_alias, update_fields=['current_ledger_balance'])

    for expense in approved_expenses.iterator():
        expense.posted_at = expense.checker_timestamp or expense.created_at or timezone.now()
        expense.save(using=db_alias, update_fields=['posted_at'])


def reverse_checker_approval_postings(apps, schema_editor):
    Expense = apps.get_model('expenses', 'Expense')
    SharedFundAccount = apps.get_model('expenses', 'SharedFundAccount')
    db_alias = schema_editor.connection.alias

    approved_expenses = Expense.objects.using(db_alias).filter(status='ACCEPTED_BY_CHECKER')
    totals_by_account = approved_expenses.values('fund_account_id').annotate(total=Sum('amount'))

    for item in totals_by_account:
        account = SharedFundAccount.objects.using(db_alias).get(pk=item['fund_account_id'])
        account.current_ledger_balance += item['total']
        account.save(using=db_alias, update_fields=['current_ledger_balance'])

    approved_expenses.update(posted_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0003_alter_sharedfundaccount_checker_and_more'),
    ]

    operations = [
        migrations.RunPython(post_existing_checker_approvals, reverse_checker_approval_postings),
        migrations.AlterField(
            model_name='expense',
            name='status',
            field=models.CharField(
                choices=[
                    ('SUBMITTED', 'Submitted - Pending Checker'),
                    ('ACCEPTED_BY_CHECKER', 'Accepted by Checker - Final'),
                    ('SENT_TO_ADMIN', 'Escalated to Admin - Pending Admin'),
                    ('ACCEPTED_BY_ADMIN', 'Accepted by Admin - Posted'),
                    ('REJECTED_BY_ADMIN', 'Rejected by Admin'),
                    ('CANCELLED', 'Cancelled'),
                ],
                default='SUBMITTED',
                max_length=30,
            ),
        ),
    ]
