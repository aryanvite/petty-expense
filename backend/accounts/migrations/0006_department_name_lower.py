from django.db import migrations, models

def populate_name_lower(apps, schema_editor):
    Department = apps.get_model('accounts', 'Department')
    for d in Department.objects.all():
        d.name = d.name.strip().lower()
        d.name_lower = d.name
        d.save()

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_user_allocated_funds'),
    ]

    operations = [
        migrations.AddField(
            model_name='department',
            name='name_lower',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.RunPython(populate_name_lower, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='department',
            name='name_lower',
            field=models.CharField(max_length=100, unique=True),
        ),
        migrations.AddConstraint(
            model_name='department',
            constraint=models.UniqueConstraint(fields=('name_lower',), name='unique_department_name_lower'),
        ),
    ]

