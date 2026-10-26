import { test, expect } from '@playwright/test';

// Helper to log in as Admin
async function loginAdmin(page) {
  await page.goto('/login');
  await page.locator('input.login-input').first().fill('admin@company.com');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/admin**', { timeout: 10000 });
}

// Helper: Maker submits & Checker escalates
async function createEscalatedClaim(page, amount, payee, desc) {
  // 1. Submit as Maker
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

  // 2. Checker escalates to Admin
  await page.goto('/login');
  await page.locator('input.login-input').first().fill('checker@company.com');
  await page.locator('input[type="password"]').fill('Checker@123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/checker**', { timeout: 10000 });

  const targetRow = page.locator(`tr:has-text("${payee}")`).first();
  await expect(targetRow).toBeVisible({ timeout: 10000 });
  await targetRow.locator('button.table-btn-send').click();

  const actionModal = page.locator('.modal-content');
  await expect(actionModal).toBeVisible();
  await actionModal.locator('textarea').fill('Escalating for final executive administrative decision.');
  await actionModal.locator('button:has-text("Confirm Send to Admin")').click();
  await expect(page.getByText(/Escalated to Admin with remarks/i)).toBeVisible({ timeout: 10000 });
}

test.describe('Admin Workflows, Final Decisions, Vouchers & Fund Governance', () => {

  test('04.1 Admin Dashboard balance tiles, account switcher and document title', async ({ page }) => {
    await loginAdmin(page);
    await expect(page).toHaveTitle('Admin - Petty Expense');

    // 1. Verify 3 balance tiles
    const balanceGrid = page.locator('.admin-balance-card-grid');
    await expect(balanceGrid).toBeVisible();
    await expect(page.getByText(/Available Balance/i).first()).toBeVisible();
    await expect(page.getByText(/Ledger Balance/i).first()).toBeVisible();
    await expect(page.getByText(/Pending Commitments/i).first()).toBeVisible();

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

  test('04.2 Admin Final Approval (Acceptance) of Escalated Expense', async ({ page }) => {
    const testPayee = `Vendor Approved ${Date.now()}`;
    await createEscalatedClaim(page, 110, testPayee, 'Escalated claim for Admin final acceptance');

    // Log in as Admin
    await loginAdmin(page);
    await page.goto('/admin?tab=dashboard');

    // Select the first active account in switcher to see this account's queue
    const accountSelect = page.locator('.admin-fund-summary select');
    await accountSelect.selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(500);

    // Locate the claim row in the Admin decision queue
    const targetRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Click Accept button on this row
    const acceptBtn = targetRow.locator('button.table-btn-accept');
    await acceptBtn.click();

    // Decision modal opens
    const decisionModal = page.locator('.modal-content');
    await expect(decisionModal).toBeVisible();
    await expect(decisionModal.getByRole('heading', { name: /Accept Expense Claim/i })).toBeVisible();

    // Confirm Acceptance
    await decisionModal.locator('button:has-text("Confirm Acceptance")').click();

    // Verify success notification
    await expect(page.getByText(/accepted and posted to financial ledger/i)).toBeVisible({ timeout: 10000 });

    // Verify status badge in All Expenses tab
    await page.goto('/admin?tab=expenses');
    const updatedRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.locator('.workman-status-badge')).toContainText('Admin Approved');
  });

  test('04.3 Admin Rejection workflow and Commitment Release', async ({ page }) => {
    const testPayee = `Vendor Rejected ${Date.now()}`;
    await createEscalatedClaim(page, 130, testPayee, 'Escalated claim for Admin rejection');

    // Log in as Admin
    await loginAdmin(page);
    await page.goto('/admin?tab=dashboard');

    // Locate claim in queue
    const targetRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Click Reject button
    const rejectBtn = targetRow.locator('button.table-btn-reject');
    await rejectBtn.click();

    // Rejection modal opens
    const decisionModal = page.locator('.modal-content');
    await expect(decisionModal).toBeVisible();

    // Fill mandatory rejection comment
    await decisionModal.locator('textarea').fill('Non-compliant expenditure rejected per company financial policies.');

    // Confirm Rejection
    await decisionModal.locator('button:has-text("Confirm Rejection")').click();

    // Verify success banner
    await expect(page.getByText(/Amount restored to available balance/i)).toBeVisible({ timeout: 10000 });

    // Verify status badge in All Expenses tab
    await page.goto('/admin?tab=expenses');
    const updatedRow = page.locator(`tr:has-text("${testPayee}")`).first();
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.locator('.workman-status-badge')).toContainText('Rejected');
  });

  test('04.4 Supplementary Disbursement Voucher Workflow (Instant Replenishment)', async ({ page }) => {
    await loginAdmin(page);

    // Switch to first account to test discrete replenishment
    const accountSelect = page.locator('.admin-fund-summary select');
    await accountSelect.selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(500);

    const availCard = page.locator('.admin-balance-available .admin-balance-card-value');
    await expect(availCard).not.toHaveText('₹0', { timeout: 10000 });
    const initialAvail = parseInt((await availCard.innerText()).replace(/[^\d]/g, ''), 10) || 0;

    // Open Issue Voucher Modal
    const voucherBtn = page.locator('button:has-text("Issue Voucher")').first();
    await voucherBtn.click();

    const voucherModal = page.locator('.modal-content');
    await expect(voucherModal).toBeVisible();
    await expect(page.getByRole('heading', { name: /Issue Supplementary Voucher/i })).toBeVisible();

    const topUpAmount = 1000;
    await voucherModal.locator('input[type="number"]').fill(topUpAmount.toString());
    await voucherModal.locator('input[placeholder*="Custodian Name" i]').fill('Headquarters Operations Custodian');

    // Submit voucher
    await voucherModal.locator('button[type="submit"]:has-text("Issue Voucher")').click();

    // Verify success banner
    await expect(page.getByText(/Disbursement Voucher for ₹1,000 issued successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify instant balance replenishment (auto-retry assertion)
    const expectedTarget = (initialAvail + topUpAmount).toLocaleString('en-IN');
    await expect(availCard).toHaveText(new RegExp(expectedTarget), { timeout: 10000 });
  });

  test('04.5 Fund Account Creation & Switcher Integration', async ({ page }) => {
    await loginAdmin(page);

    // Click New Fund Account button
    const newAccBtn = page.locator('button:has-text("New Fund Account"), button:has-text("Create Account")').first();
    await newAccBtn.click();

    const accModal = page.locator('.modal-content');
    await expect(accModal).toBeVisible();
    await expect(page.getByRole('heading', { name: /Create Shared Fund Account/i })).toBeVisible();

    const randomSuffix = Math.floor(Math.random() * 8999 + 1000);
    const newAccountName = `Branch Office Float ${randomSuffix}`;

    await accModal.locator('input[placeholder*="Headquarters Petty Cash" i], input[type="text"]').first().fill(newAccountName);
    await accModal.locator('input[placeholder*="UTR" i]').fill(`UTR-${randomSuffix}`);

    // Submit
    await accModal.locator('button[type="submit"]:has-text("Create Account")').click();

    // Verify success message
    await expect(page.getByText(/created with initial disbursement/i)).toBeVisible({ timeout: 10000 });

    // Verify new account appears in Account Switcher dropdown
    const accountSelect = page.locator('.admin-fund-summary select');
    await expect(accountSelect).toContainText(newAccountName);
  });

  test('04.6 Employee Management Directory and Audit Logs', async ({ page }) => {
    await loginAdmin(page);

    // 1. Employees Tab
    await page.goto('/admin?tab=employees');
    await expect(page.locator('h1.page-title, h2:has-text("Directory")').first()).toBeVisible();
    const empRows = page.locator('table.spaced-table tbody tr');
    await expect(empRows.first()).toBeVisible({ timeout: 10000 });

    // 2. Audit Trail Tab
    await page.goto('/admin?tab=audit');
    await expect(page.locator('h1.page-title, h2:has-text("Audit")').first()).toBeVisible();
    const auditRows = page.locator('table tbody tr');
    await expect(auditRows.first()).toBeVisible({ timeout: 10000 });
  });

});

