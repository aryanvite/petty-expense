from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0004_checker_acceptance_is_final'),
    ]

    operations = [
        migrations.AddField(
            model_name='additionalfundrequest',
            name='supporting_document',
            field=models.FileField(blank=True, null=True, upload_to='receipts/%Y/%m/'),
        ),
    ]
