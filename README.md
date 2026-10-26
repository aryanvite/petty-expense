# Petty Expenses Management System

A web-based petty expenses management system built strictly according to the **Software Requirements Specification (SRS)** with a 3-role governance model (**Admin**, **Maker**, and **Checker**).

---

## 🔑 User Logins & Credentials

The system is seeded with an initial **Admin** created directly in SQL/database seed, along with Maker and Checker accounts:

| Role | Email (Username) | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@company.com` | `Admin@123` | Master authority: creates & manages users (Admins, Makers, Checkers), creates shared accounts, issues vouchers, reviews fund requests, makes expense decisions, and views audit logs |
| **Maker 1** | `maker@company.com` | `Maker@123` | Petty cash custodian 1: operates shared fund account, submits expenses, requests additional funds |
| **Maker 2** | `` | `Maker@123` | Petty cash custodian 2: operates shared fund account, submits expenses, requests additional funds |
| **Checker** | `checker@company.com` | `Checker@123` | Internal auditor: reviews every claim, exactly two actions: **Accept** or **Send to Admin** |

---

## 🚀 How to Run the Application

### 1-Click Launch (Windows)
1. Double-click `run_backend.bat` (Starts Django REST API on `http://127.0.0.1:8000`)
2. Double-click `run_frontend.bat` (Starts React Frontend on `http://localhost:5173`)

### Terminal Launch
```powershell
# 1. Start Backend (Terminal 1)
.\.venv\Scripts\activate
cd backend
python manage.py runserver 127.0.0.1:8000

# 2. Start Frontend (Terminal 2)
cd frontend
npm run dev
```

Open your browser and navigate to: **http://localhost:5173**

---

## 📋 Core Specifications & Architecture

### 1. Three Strict Roles
- **Admin (`ADMIN`)**:
  - Master system authority. The 1st Admin is created directly in SQL/seed.
  - Creates, deactivates, reactivates, edits, and deletes employees and other admins (self-deletion blocked).
  - Creates and manages Shared Fund Accounts.
  - Issues and disburses initial and supplementary vouchers.
  - Reviews and approves additional fund requests from Makers.
  - Makes the final **Accept** or **Reject** decision on Checker-forwarded claims.
  - Views complete transaction histories, system audit trails, and financial statements.
- **Maker (`MAKER`)**:
  - Operates the shared fund account. Submits claims with whole INR amounts.
  - Amount is reserved as an outstanding commitment immediately upon submission.
  - Submits additional fund requests when the available balance is low.
- **Checker (`CHECKER`)**:
  - Independent internal auditor. Verifies every claim with exactly two actions:
    - **Action 1: Accept**: Confirms review and forwards to Admin for final decision.
    - **Action 2: Send to Admin**: Escalates to Admin with a mandatory comment.

### 2. User Directory & Profile Management
- **Single "View" Action**: Table shows only a clean `View` button for each user.
- **User Profile & Expense History Modal**:
  - Displays user profile (ID, name, email, department, designation, phone, role, status, avatar).
  - Displays summary statistics (Total claims, Total claimed, Approved amount, Pending claims).
  - Displays complete expense claims history table.
  - **Edit Button ("Edit Profile & Password")**: Allows the Admin to edit user details directly inside the modal:
    - Full Name
    - Role (`ADMIN`, `MAKER`, `CHECKER`)
    - Department
    - Designation
    - Phone Number
    - Password (optional field; updating immediately sets the new password)
  - **Account Controls**: Quick Reset Password, Disable/Enable account, Delete account (prevents self-deletion).

### 3. Authentication & Security
- **Login**: Email + Password. **NO OTP required on login**.
- **Change Password**: Verified via **6-digit Email OTP** (5-minute expiry).
- **Profile Photo Management**: Add, Change, or Remove photo from `/profile`.

### 4. Shared Fund Accounts & Financial Balancing (BR-03, BR-07)
- Maker and Checker share one fund account balance.
- **Currency**: Whole-number INR values only (fixed integers, no paise/fractional amounts).
- **Available Balance Formula**:
  $$\text{Available Balance} = \text{Current Ledger Balance} - \text{Outstanding Commitments}$$
- When Maker submits an expense: `Available Balance -= Amount` (reserved as commitment).
- When Admin accepts: `Current Ledger Balance -= Amount` (commitment realized as posted expenditure).
- When Admin rejects or Maker cancels: `Available Balance += Amount` (commitment released back to available funds).

### 5. Voucher-Based Disbursements (BR-01, BR-02)
- Initial and supplementary allocations require a unique voucher (`VCH-xxxx`).
- Admin records manual payment mode (Bank Transfer, UPI, Cheque, Cash), payment reference/UTR, and payment date.
- Balance increases **only after** voucher status becomes `DISBURSED`.

### 6. Mandatory Review & Zero Threshold (BR-04)
- Approval threshold is set strictly to **₹0**.
- Threshold-based auto-approval is disabled; every claim must receive Checker review and an Admin decision.

### 7. Additional Fund Requests (BR-08)
- Maker submits a request with requested amount and mandatory justification.
- Admin reviews: Approve, Partially Approve, or Reject.
- Supplementary voucher generation disburses funds and increases the shared balance.

### 8. Full Carry-Forward & Monthly Closing (BR-09, BR-10)
- Full eligible closing balance carries forward as the opening balance of the next month.
- Monthly closing formula:
  $$\text{Closing Balance} = \text{Opening Balance} + \text{Posted Disbursements} - \text{Posted Admin-Accepted Expenses}$$

---

## 📄 Specification Document (PDF)

The full specification is compiled into [Petty_Expense_System_Specification.pdf](file:///c:/Users/Lenovo/OneDrive/Desktop/project-expese/Petty_Expense_System_Specification.pdf) and can be re-generated anytime using:
```powershell
python generate_pdf.py
```

# petty-expense
