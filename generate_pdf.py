import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Petty Expenses Management System — SRS Specification (3-Role System)")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
        
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "Confidential — Software Requirements Specification (SRS v1.3)")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()


def build_pdf(filename="Petty_Expense_System_Specification.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=11,
        spaceAfter=4
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=6,
        spaceAfter=2
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.25,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.25,
        leading=11.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        firstLineIndent=-8,
        spaceBefore=2
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1e293b")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # Title Banner Block
    banner_data = [
        [
            Paragraph("PETTY EXPENSES MANAGEMENT SYSTEM", ParagraphStyle('B1', fontName='Helvetica-Bold', fontSize=14, leading=16, textColor=colors.white)),
            Paragraph("SRS Version: 1.3<br/>Currency: INR (Whole Number)", ParagraphStyle('B2', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor("#93c5fd"), alignment=2))
        ],
        [
            Paragraph("Functional Specification: 3-Role Model (Admin, Maker, Checker), Shared Fund Accounts, Voucher Disbursements, Multi-Stage Approvals, Full Carry-Forward", ParagraphStyle('B3', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor("#e2e8f0"))),
            Paragraph("Date: October 2026", ParagraphStyle('B4', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor("#cbd5e1"), alignment=2))
        ]
    ]
    t_banner = Table(banner_data, colWidths=[360, 144])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#1e3a8a")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 8))

    # SECTION 1: INTRODUCTION & PURPOSE
    story.append(Paragraph("1. Introduction & System Architecture", h1_style))
    story.append(Paragraph(
        "The Petty Expenses Management System is a web-based financial control platform engineered with a strict 3-role model "
        "(<b>Admin</b>, <b>Maker</b>, and <b>Checker</b>). The initial Administrator is created directly in the database / SQL seed, "
        "and holds complete authority to create, deactivate, reactivate, edit, and delete employee and administrator accounts. "
        "The system maintains a single shared fund balance for each assigned Maker-Checker pair. Every submitted expenditure passes "
        "through the independent Checker verification queue and receives a final decision from the Admin. The approval threshold is "
        "strictly Rs. 0 (no threshold auto-approvals). Financial amounts use whole-number INR values only (fixed integers, no paise).",
        body_style
    ))
    story.append(Spacer(1, 6))

    # SECTION 2: ROLES AND RESPONSIBILITIES MATRIX
    story.append(Paragraph("2. User Roles & Segregation of Duties (3 Roles Only)", h1_style))
    roles_table_data = [
        [Paragraph("Role Name", table_header), Paragraph("Core Scope & Responsibilities", table_header), Paragraph("Permissions & Boundary Limits", table_header)],
        [
            Paragraph("Admin", table_cell_bold),
            Paragraph("Primary System & Decision Authority. Initial Admin is seeded in SQL. Admin creates and manages all employee and admin accounts; assigns shared fund accounts; issues initial & supplementary vouchers; reviews & disburses fund requests; makes final Accept/Reject decisions on Checker-forwarded claims; views full audit trails. Can edit profile details and passwords for users in the directory modal. Can delete other admins and employees (self-deletion blocked).", table_cell),
            Paragraph("Only Admin-accepted expenses post to financial ledger. Password changes require 6-digit email OTP; login does not require OTP. Cannot delete self.", table_cell)
        ],
        [
            Paragraph("Maker", table_cell_bold),
            Paragraph("Expense Preparation & Custodian. Operates assigned shared fund account. Prepares and submits expense claims (date, whole INR amount, category, payee, description, receipt). Submits additional fund requests when available balance is insufficient.", table_cell),
            Paragraph("Cannot approve own claims. Cannot exceed available balance. Amount is reserved as an outstanding commitment immediately upon submission.", table_cell)
        ],
        [
            Paragraph("Checker", table_cell_bold),
            Paragraph("Internal Audit & Expense Verification Reviewer. Verifies supporting documents and available balance for every submitted claim. Exactly two actions: <b>Accept</b> (forwards to Admin) or <b>Send to Admin</b> (escalates with mandatory recorded comment).", table_cell),
            Paragraph("Cannot make final posting decision. Cannot directly alter fund balances. Must review every expense regardless of amount.", table_cell)
        ]
    ]
    t_roles = Table(roles_table_data, colWidths=[80, 240, 184])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_roles)
    story.append(Spacer(1, 8))

    # SECTION 3: CORE BUSINESS RULES (BR-01 TO BR-13)
    story.append(Paragraph("3. Business Rules Specification (BR-01 to BR-13)", h1_style))
    br_data = [
        [Paragraph("Rule ID", table_header), Paragraph("Rule Title", table_header), Paragraph("Rule Requirement & Functional Enforcement", table_header)],
        [Paragraph("BR-01", table_cell_bold), Paragraph("Voucher Disbursement", table_cell), Paragraph("Every fund allocation requires a unique voucher (VCH-xxxx) containing beneficiary, whole INR amount, date, purpose, and payment details.", table_cell)],
        [Paragraph("BR-02", table_cell_bold), Paragraph("Manual Payment Recording", table_cell), Paragraph("Admin manually records payment details (mode, reference/UTR, date). Balance increases ONLY after voucher status is marked DISBURSED.", table_cell)],
        [Paragraph("BR-03", table_cell_bold), Paragraph("Shared Fund Balance", table_cell), Paragraph("All allocations, approved expenses, and adjustments record against one shared fund account for the assigned Maker and Checker.", table_cell)],
        [Paragraph("BR-04", table_cell_bold), Paragraph("Rs. 0 Approval Threshold", table_cell), Paragraph("Every expense requires Checker review and Admin decision regardless of amount. Threshold-based auto-approval is completely disabled.", table_cell)],
        [Paragraph("BR-05", table_cell_bold), Paragraph("Checker Workflow", table_cell), Paragraph("Checker has exactly two actions: 1) Accept (forward to Admin), or 2) Send to Admin (escalate with mandatory recorded comment).", table_cell)],
        [Paragraph("BR-06", table_cell_bold), Paragraph("Admin Final Decision", table_cell), Paragraph("Admin has two actions: 1) Accept (posts expenditure to ledger), or 2) Reject (mandatory reason; returns commitment to available balance).", table_cell)],
        [Paragraph("BR-07", table_cell_bold), Paragraph("Available Balance Control", table_cell), Paragraph("Expenditure cannot exceed Available Balance. Formula: Available Balance = Current Ledger Balance - Outstanding Commitments.", table_cell)],
        [Paragraph("BR-08", table_cell_bold), Paragraph("Additional Fund Requests", table_cell), Paragraph("Maker requests supplementary funds with mandatory reason. Admin approves/partially approves/rejects. Funds credit upon voucher disbursement.", table_cell)],
        [Paragraph("BR-09", table_cell_bold), Paragraph("Full Carry-Forward", table_cell), Paragraph("Eligible closing balance carries forward in full as opening balance of subsequent month. No automatic expiry applies.", table_cell)],
        [Paragraph("BR-10", table_cell_bold), Paragraph("Monthly Closing", table_cell), Paragraph("System validates pending expenses, outstanding commitments, and reconciliation differences before formal period closure.", table_cell)],
        [Paragraph("BR-11", table_cell_bold), Paragraph("Transaction Integrity", table_cell), Paragraph("Posted transactions cannot be permanently deleted. Adjustments require authorized reversals with complete audit trail.", table_cell)],
        [Paragraph("BR-12", table_cell_bold), Paragraph("Segregation of Duties", table_cell), Paragraph("Maker prepares, Checker verifies, Admin decides and disburses. No single user can prepare and finalize an expense.", table_cell)],
        [Paragraph("BR-13", table_cell_bold), Paragraph("Auditability & Logging", table_cell), Paragraph("Every login, state change, voucher generation, approval, rejection, and profile edit records actor, timestamp, IP address, and details.", table_cell)]
    ]
    t_br = Table(br_data, colWidths=[45, 125, 334])
    t_br.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_br)
    story.append(Spacer(1, 8))

    # SECTION 4: FINANCIAL BALANCES & FORMULAS
    story.append(Paragraph("4. Financial Ledger Equations & Balance State Transitions", h1_style))
    story.append(Paragraph(
        "• <b>Whole Number INR Values:</b> All amounts are strictly integer values (e.g. Rs. 1,200). Fractions and paise are prohibited.<br/>"
        "• <b>Available Balance Equation:</b> <code>Available Balance = Current Posted Ledger Balance - Outstanding Expense Commitments</code>.<br/>"
        "• <b>Submission Commitment:</b> When Maker submits claim for Rs. X, <code>Available Balance -= X</code> immediately.<br/>"
        "• <b>Admin Acceptance:</b> <code>Current Ledger Balance -= X</code> (commitment converted to posted expenditure).<br/>"
        "• <b>Admin Rejection / Cancellation:</b> <code>Available Balance += X</code> (commitment released back to available pool).<br/>"
        "• <b>Disbursement Posting:</b> <code>Current Ledger Balance += V</code> and <code>Available Balance += V</code> upon voucher payment completion.<br/>"
        "• <b>Monthly Closing Equation:</b> <code>Closing Balance = Opening Balance + Total Disbursements - Total Admin-Accepted Expenses</code>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # SECTION 5: POSTGRESQL RELATIONAL SCHEMA
    story.append(Paragraph("5. PostgreSQL Relational Database Schema (3 Roles)", h1_style))
    db_schema = [
        [Paragraph("Table Name", table_header), Paragraph("Key Fields & Types", table_header), Paragraph("Constraints & Integrity Rules", table_header)],
        [Paragraph("users", table_cell_bold), Paragraph("id PK, employee_id UK, email UK, full_name, role (ADMIN|MAKER|CHECKER), designation, department, phone, photo, is_active, token_version", table_cell), Paragraph("Auto-generated IDs (ADMxxxx, MKRxxxx, CHKxxxx). token_version revokes active JWTs upon password change.", table_cell)],
        [Paragraph("shared_fund_accounts", table_cell_bold), Paragraph("id PK, account_id UK (FA-xxxx), name, maker FK, checker FK, admin FK, opening_balance, current_ledger_balance, available_balance", table_cell), Paragraph("Single shared financial balance. Protects foreign keys on maker and checker.", table_cell)],
        [Paragraph("disbursement_vouchers", table_cell_bold), Paragraph("id PK, voucher_number UK (VCH-xxxx), fund_account FK, voucher_type (INITIAL|SUPPLEMENTARY), beneficiary, amount, payment_mode, payment_reference, payment_date, status, created_by FK", table_cell), Paragraph("Voucher-based funding. Balances update only when status = DISBURSED.", table_cell)],
        [Paragraph("additional_fund_requests", table_cell_bold), Paragraph("id PK, request_number UK (AFR-xxxx), fund_account FK, maker FK, requested_amount, approved_amount, reason, status, reviewed_by FK", table_cell), Paragraph("Maker justification mandatory. Can trigger automated supplementary voucher upon Admin approval.", table_cell)],
        [Paragraph("expenses", table_cell_bold), Paragraph("id PK, reference_number UK (EXP-xxxx), fund_account FK, maker FK, amount, category, payee, description, supporting_document, status, checker FK, checker_action, checker_comments, admin FK, admin_decision, admin_comments", table_cell), Paragraph("States: SUBMITTED -> ACCEPTED_BY_CHECKER / SENT_TO_ADMIN -> ACCEPTED_BY_ADMIN / REJECTED_BY_ADMIN. Mandatory rejection reason.", table_cell)],
        [Paragraph("monthly_ledgers", table_cell_bold), Paragraph("id PK, fund_account FK, year, month, opening_balance, total_disbursements, total_approved_expenditure, closing_balance, is_locked", table_cell), Paragraph("Unique (fund_account, year, month). Closing balance automatically carries forward to next month.", table_cell)],
        [Paragraph("audit_logs", table_cell_bold), Paragraph("id PK, user FK, action, record_type, record_id, details, ip_address, created_at", table_cell), Paragraph("Immutable log tracking all security events, state transitions, disbursements, and decisions.", table_cell)],
        [Paragraph("otp_requests", table_cell_bold), Paragraph("id PK, user FK, purpose, otp_code, expires_at, attempts, is_used", table_cell), Paragraph("6-digit numeric OTP, 5-minute expiry, max 5 attempts. Required for Change Password. Login does NOT require OTP.", table_cell)]
    ]
    t_db = Table(db_schema, colWidths=[90, 230, 184])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_db)
    story.append(Spacer(1, 8))

    # SECTION 6: PRODUCTION REST API MATRIX
    story.append(Paragraph("6. Production REST API Endpoints Matrix", h1_style))
    api_matrix = [
        [Paragraph("Method", table_header), Paragraph("Endpoint", table_header), Paragraph("Authorized Role", table_header), Paragraph("Functional Description", table_header)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/auth/login/", table_cell), Paragraph("Public", table_cell), Paragraph("Authenticates via Email + Password -> returns JWT pair (NO OTP on login)", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/auth/password/otp/request/", table_cell), Paragraph("Authenticated", table_cell), Paragraph("Sends 6-digit email OTP for in-portal password change (5-min expiry)", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/auth/password/change/", table_cell), Paragraph("Authenticated", table_cell), Paragraph("Verifies OTP & updates password, invalidating previous token sessions", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/dashboard/summary/", table_cell), Paragraph("All Roles", table_cell), Paragraph("Role-specific metrics: Admin management queue, Maker balance, Checker verification queue", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/admin/employees/", table_cell), Paragraph("Admin", table_cell), Paragraph("Lists all users, filters by role/status, creates new Maker/Checker/Admin accounts", table_cell)],
        [Paragraph("GET/PATCH/DEL", table_cell_bold), Paragraph("/api/admin/employees/{id}/", table_cell), Paragraph("Admin", table_cell), Paragraph("View profile & claim history; PATCH name, designation, department, phone, role, password; DELETE user", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/accounts/", table_cell), Paragraph("Admin", table_cell), Paragraph("Lists all shared accounts or creates new account with initial disbursement voucher", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/vouchers/", table_cell), Paragraph("Admin", table_cell), Paragraph("Lists vouchers or issues supplementary voucher (credits ledger balance upon disbursement)", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/vouchers/{id}/disburse/", table_cell), Paragraph("Admin", table_cell), Paragraph("Records manual payment mode, reference/UTR, and posts funds to account balance", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/fund-requests/", table_cell), Paragraph("Maker", table_cell), Paragraph("Lists fund requests or submits new request with mandatory business justification", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/fund-requests/{id}/review/", table_cell), Paragraph("Admin", table_cell), Paragraph("Action: APPROVE, PARTIALLY_APPROVE, or REJECT. Optional instant voucher disbursement", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/expenses/", table_cell), Paragraph("Maker", table_cell), Paragraph("Lists expenses or submits new claim (reserves commitment from available balance)", table_cell)],
        [Paragraph("DELETE", table_cell_bold), Paragraph("/api/expenses/{id}/", table_cell), Paragraph("Maker / Admin", table_cell), Paragraph("Cancels a SUBMITTED expense and restores commitment back to available balance", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/expenses/{id}/checker-action/", table_cell), Paragraph("Checker", table_cell), Paragraph("Action 1: ACCEPT (forwards to Admin) or Action 2: SEND_TO_ADMIN (mandatory comment)", table_cell)],
        [Paragraph("POST", table_cell_bold), Paragraph("/api/expenses/{id}/admin-decision/", table_cell), Paragraph("Admin", table_cell), Paragraph("Action 1: ACCEPT (posts to ledger) or Action 2: REJECT (mandatory remark; restores funds)", table_cell)],
        [Paragraph("GET/POST", table_cell_bold), Paragraph("/api/ledgers/", table_cell), Paragraph("Admin", table_cell), Paragraph("Reconciliation & period closing with automatic full carry-forward to next month", table_cell)],
        [Paragraph("GET", table_cell_bold), Paragraph("/api/audit-logs/", table_cell), Paragraph("Admin", table_cell), Paragraph("Searchable immutable audit logs for all transactions, disbursements, and approvals", table_cell)]
    ]
    t_api = Table(api_matrix, colWidths=[48, 172, 85, 199])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t_api)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

    # Copy to artifacts directory
    artifact_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\563dee98-c3ad-4023-a95e-3cb88f0c02c6\Petty_Expense_System_Specification.pdf"
    try:
        shutil.copyfile(filename, artifact_path)
        print(f"Copied to artifact directory: {artifact_path}")
    except Exception as e:
        print(f"Artifact copy notice: {e}")

if __name__ == "__main__":
    build_pdf()
