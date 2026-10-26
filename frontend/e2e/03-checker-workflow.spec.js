import { test, expect } from '@playwright/test';

// Helper to log in as Checker
async function loginChecker(page) {
  await page.goto('/login');
  await page.locator('input.login-input').first().fill('checker@company.com');
  await page.locator('input[type="password"]').fill('Checker@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/checker**', { timeout: 10000 });
}

// Helper to submit a quick expense claim as Maker
async function submitExpenseAsMaker(page, amount, payee, desc) {
  await page.goto('/login');
  await page.locator('input.login-input').first().fill('maker@company.com');
  await page.locator('input[type="password"]').fill('Maker@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/maker**', { timeout: 10000 });

  await page.goto('/maker?tab=submit');
  await expect(page.getByText(/Available Float: ₹[1-9]/i)).toBeVisible({ timeout: 10000 });

  await page.locator('input[type="number"][placeholder*="1500" i], input[type="number"]').first().fill(amount.toString());
  await page.locator('form select').nth(1).selectOption('Miscellaneous');
  await page.locator('input[placeholder*="Local Cab" i]').fill(payee);
  await page.locator('textarea[placeholder*="Explain" i]').fill(desc);
  await page.locator('button[type="submit"]:has-text("Submit to Checker")').click();
  await expect(page.getByText(/submitted successfully/i)).toBeVisible({ timeout: 10000 });
}

test.describe('Checker Review Queue, Verification & Escalation Workflows', () => {

  test('03.1 Checker Dashboard balance tiles, account switcher and document title', async ({ page }) => {
    await loginChecker(page);
    await expect(page).toHaveTitle('Checker - Petty Expense');

    // 1. Verify 3 balance tiles matching Admin
    const balanceGrid = page.locator('.admin-balance-card-grid');
    await expect(balanceGrid).toBeVisible();
    await expect(page.getByText('Shared Available Balance')).toBeVisible();
    await expect(page.getByText('Current Ledger Balance')).toBeVisible();
    await expect(page.getByText('Pending Commitments')).toBeVisible();

    // 2. Verify Account Switcher exists and has options
    const accountSelect = page.locator('.admin-fund-summary select');
    await expect(accountSelect).toBeVisible();
    const optionCount = await accountSelect.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(1);

    // 3. Test Refresh button and timestamp
    const refreshBtn = page.locator('button[title="Refresh data"], button:has-text("Refresh")').first();
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Last refresh at/i)).toBeVisible();
  });

  test('03.2 Checker review queue and claim details modal', async ({ page }) => {
    // Ensure at least one claim is submitted
    const testPayee = `Vendor Queue ${Date.now()}`;
    await submitExpenseAsMaker(page, 150, testPayee, 'Sample claim for checker verification inspection');

    // Login as Checker
    await loginChecker(page);
    await page.goto('/checker?tab=dashboard');

    // Check Verification Queue section
    await expect(page.getByRole('heading', { name: /Pending Claims for Verification/i })).toBeVisible();

    // Inspect first row in queue and click View
    const viewBtn = page.locator('button.table-btn-view').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // Verify Details modal opens
    const modal = page.locator('.modal-content-lg, .modal-content');
    await expect(modal).toBeVisible();
    await expect(page.getByText(/Approval Workflow Trail/i)).toBeVisible();

    // Close modal
    await modal.locator('button:has(.lucide-x), button:has-text("Close")').first().click();
    await expect(modal).not.toBeVisible();
  });

  test('03.3 Checker Action 1: "Approved by Checker" workflow', async ({ page }) => {
    const testPayee = `Courier QA ${Date.now()}`;
    await submitExpenseAsMaker(page, 175, testPayee, 'Standard office dispatch');

    // Log in as Checker
    await loginChecker(page);
    await page.goto('/checker?tab=dashboard');

    // Locate the row with the newly submitted claim
    const targetRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Click Accept button on this row
    const acceptBtn = targetRow.locator('button.table-btn-accept');
    await acceptBtn.click();

    // Action modal opens
    const actionModal = page.locator('.modal-content');
    await expect(actionModal).toBeVisible();
    await expect(actionModal.locator('.modal-title:has-text("Accept & Forward to Admin")')).toBeVisible();

    // Fill checker review comments
    await actionModal.locator('textarea').fill('Invoice verified and tax numbers validated.');

    // Click Confirm Accept
    await actionModal.locator('button:has-text("Confirm Accept")').click();

    // Verify notification banner
    await expect(page.getByText(/Accepted and forwarded to Admin/i)).toBeVisible({ timeout: 10000 });

    // Navigate to All Expenses tab to verify status badge
    await page.goto('/checker?tab=expenses');
    const updatedRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(updatedRow).toBeVisible();

    // Verify badge text displays "Approved by Checker"
    const badge = updatedRow.locator('.workman-status-badge');
    await expect(badge).toContainText('Approved by Checker');
  });

  test('03.4 Checker Action 2: "Escalate to Admin" workflow with mandatory reason', async ({ page }) => {
    const testPayee = `High-Value Vendor ${Date.now()}`;
    await submitExpenseAsMaker(page, 250, testPayee, 'Urgent equipment maintenance claim');

    // Log in as Checker
    await loginChecker(page);
    await page.goto('/checker?tab=dashboard');

    // Locate the row with the newly submitted claim
    const targetRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Click Send to Admin button
    const sendBtn = targetRow.locator('button.table-btn-send');
    await sendBtn.click();

    // Action modal opens
    const actionModal = page.locator('.modal-content');
    await expect(actionModal).toBeVisible();
    await expect(actionModal.locator('.modal-title:has-text("Send to Admin (Escalate)")')).toBeVisible();

    // Test Validation: Submitting without comments must fail
    const confirmBtn = actionModal.locator('button:has-text("Confirm Send to Admin")');
    await actionModal.locator('textarea').fill('');
    await confirmBtn.click();
    await expect(page.getByText(/reason\/comment is mandatory/i)).toBeVisible();

    // Now fill mandatory reason
    await actionModal.locator('textarea').fill('Requires senior admin policy sign-off due to category threshold.');
    await confirmBtn.click();

    // Verify notification banner
    await expect(page.getByText(/Escalated to Admin with remarks/i)).toBeVisible({ timeout: 10000 });

    // Navigate to All Expenses tab to verify status badge
    await page.goto('/checker?tab=expenses');
    const updatedRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(updatedRow).toBeVisible();

    // Verify badge text displays "Sent to Admin"
    const badge = updatedRow.locator('.workman-status-badge');
    await expect(badge).toContainText('Sent to Admin');
  });

  test('03.5 Checker Employee Management tab and Maker creation', async ({ page }) => {
    await loginChecker(page);

    // Navigate to Employees tab
    await page.goto('/checker?tab=employees');
    await expect(page.locator('h1.page-title, h2:has-text("Directory")').first()).toBeVisible();

    // Open Add Maker / Employee modal
    const addEmpBtn = page.locator('button:has-text("Add Employee")').first();
    await expect(addEmpBtn).toBeVisible();
    await addEmpBtn.click();

    const empModal = page.locator('.modal-content');
    await expect(empModal).toBeVisible();

    // Fill new Maker form
    const randomSuffix = Math.floor(Math.random() * 8999 + 1000);
    const newMakerEmail = `maker_${randomSuffix}@company.com`;

    await empModal.locator('input[placeholder*="Ramesh Kumar" i]').fill(`Test Custodian ${randomSuffix}`);
    await empModal.locator('input[placeholder*="ramesh@company.com" i]').fill(newMakerEmail);
    await empModal.locator('input[placeholder*="Store Keeper" i]').fill('Junior Petty Custodian');
    await empModal.locator('input[placeholder*="9876543210" i]').fill(`98765${randomSuffix}`);

    // Submit form
    await empModal.locator('button[type="submit"]:has-text("Create"), button[type="submit"]').click();

    // Expect success notification or temp password notice
    await expect(page.getByText(/created successfully|generated password|Temporary Password/i).first()).toBeVisible({ timeout: 10000 });
  });

});

