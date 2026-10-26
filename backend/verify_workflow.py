import urllib.request
import json

def post(url, payload, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(f'http://127.0.0.1:8000/api{url}', data=json.dumps(payload).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def get(url, token):
    headers = {'Authorization': f'Bearer {token}'}
    req = urllib.request.Request(f'http://127.0.0.1:8000/api{url}', headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def test_workflow():
    print("=== Testing SRS v1.2 Complete Workflow ===")

    # 1. Maker Login
    maker_auth = post('/auth/login/', {'email': 'maker@company.com', 'password': 'Maker@123'})
    maker_token = maker_auth['tokens']['access']
    maker_sum = get('/dashboard/summary/', maker_token)
    fa = maker_sum['fund_account']
    print(f"1. Maker Logged In: {fa['account_id']} | Available: Rs. {fa['available_balance']:,} | Ledger: Rs. {fa['current_ledger_balance']:,}")

    init_available = fa['available_balance']
    init_ledger = fa['current_ledger_balance']

    # 2. Maker submits claim for Rs. 1,500
    exp = post('/expenses/', {
        'fund_account': fa['id'],
        'expense_date': '2026-10-17',
        'amount': 1500,
        'category': 'Office Supplies',
        'payee': 'Stationery Hub',
        'description': 'Notebooks and pens for workshop'
    }, maker_token)
    print(f"2. Maker Submitted Claim: {exp['reference_number']} | Amount: Rs. {exp['amount']:,} | Status: {exp['status']}")

    # Verify commitment deducted from available balance
    maker_sum2 = get('/dashboard/summary/', maker_token)
    fa2 = maker_sum2['fund_account']
    print(f"   -> Balance after submission: Available: Rs. {fa2['available_balance']:,} (Deducted by 1,500 commitment) | Ledger: Rs. {fa2['current_ledger_balance']:,}")
    assert fa2['available_balance'] == init_available - 1500, "Commitment was not deducted from available balance!"
    assert fa2['current_ledger_balance'] == init_ledger, "Ledger balance should not change before Checker acceptance!"

    # 3. Checker logs in & verifies
    checker_auth = post('/auth/login/', {'email': 'checker@company.com', 'password': 'Checker@123'})
    checker_token = checker_auth['tokens']['access']
    chk_res = post(f"/expenses/{exp['id']}/checker-action/", {
        'action': 'ACCEPT',
        'comments': 'Receipt verified. Stock ledger updated.'
    }, checker_token)
    print(f"3. Checker Accepted Claim: {chk_res['reference_number']} | Status: {chk_res['status']} | Checker Action: {chk_res['checker_action']}")
    assert chk_res['status'] == 'ACCEPTED_BY_CHECKER', "Status should be ACCEPTED_BY_CHECKER!"

    # 4. Checker approval is final; the ledger is posted immediately
    admin_auth = post('/auth/login/', {'email': 'admin@company.com', 'password': 'Admin@123'})
    admin_token = admin_auth['tokens']['access']

    # Verify ledger balance deducted
    maker_sum3 = get('/dashboard/summary/', maker_token)
    fa3 = maker_sum3['fund_account']
    print(f"   -> Final Balance after Checker Acceptance: Available: Rs. {fa3['available_balance']:,} | Ledger: Rs. {fa3['current_ledger_balance']:,} (Ledger deducted by 1,500)")
    assert fa3['current_ledger_balance'] == init_ledger - 1500, "Ledger balance was not deducted on Checker acceptance!"

    # 5. Maker requests additional funds
    fund_req = post('/fund-requests/', {
        'fund_account': fa['id'],
        'requested_amount': 10000,
        'reason': 'Upcoming corporate event logistics'
    }, maker_token)
    print(f"5. Maker Requested Additional Funds: {fund_req['request_number']} | Amount: Rs. {fund_req['requested_amount']:,} | Status: {fund_req['status']}")

    # 6. Admin reviews and disburses supplementary voucher
    review_res = post(f"/fund-requests/{fund_req['id']}/review/", {
        'action': 'APPROVE',
        'comments': 'Approved for corporate event logistics',
        'create_voucher': True
    }, admin_token)
    print(f"6. Admin Approved & Disbursed: {review_res['request_number']} | Status: {review_res['status']}")

    # 7. Test Rejection Flow: verifies that rejection releases commitment back to Available Balance
    print("\n7. Testing Rejection Flow (Commitment Release Verification)...")
    fa4 = get('/dashboard/summary/', maker_token)['fund_account']
    avail_before = fa4['available_balance']
    exp_rej = post('/expenses/', {
        'fund_account': fa['id'],
        'expense_date': '2026-10-17',
        'amount': 2000,
        'category': 'Travel & Conveyance',
        'payee': 'Express Taxi',
        'description': 'Travel across town'
    }, maker_token)
    print(f"   Submitted test claim {exp_rej['reference_number']} for Rs. 2,000")
    
    avail_during = get('/dashboard/summary/', maker_token)['fund_account']['available_balance']
    assert avail_during == avail_before - 2000, "Commitment not deducted on submission"
    
    # Checker escalates to admin
    post(f"/expenses/{exp_rej['id']}/checker-action/", {
        'action': 'SEND_TO_ADMIN',
        'comments': 'No official invoice attached.'
    }, checker_token)

    # Admin rejects
    rej_res = post(f"/expenses/{exp_rej['id']}/admin-decision/", {
        'decision': 'REJECT',
        'comments': 'Rejected: Missing official tax invoice.'
    }, admin_token)
    print(f"   Admin rejected claim {exp_rej['reference_number']} with reason: {rej_res['admin_comments']}")

    avail_after = get('/dashboard/summary/', maker_token)['fund_account']['available_balance']
    print(f"   Available balance restored: Rs. {avail_after:,} (equals initial Rs. {avail_before:,})")
    assert avail_after == avail_before, "Available balance was not restored on rejection!"

    print("\n>>> ALL SRS v1.2 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    test_workflow()
