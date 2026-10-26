import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getMediaUrl, formatDate, formatDateTime } from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import TableHeadSortMenu from '../components/TableHeadSortMenu';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  FileText,
  AlertCircle,
  Upload,
  RefreshCw,
  Send,
  ExternalLink,
  Ban,
  Search,
  Filter,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ReceiptIndianRupee,
  Calendar,
  Layers,
  Check,
  Bell
} from 'lucide-react';

export default function MakerDashboard() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [fundRequests, setFundRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notification, setNotification] = useState({ type: '', text: '' });
  const [lastRefreshText, setLastRefreshText] = useState(user?.last_refresh_formatted || '');

  const formatRefreshDate = (val) => {
    if (!val) return '';
    const match = String(val).match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}):\d{2}(\s+[AP]M)$/i);
    if (match) return `${match[1]}${match[2]}`;
    return val;
  };

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [fundPage, setFundPage] = useState(1);
  const [fundPageSize, setFundPageSize] = useState(10);
  const [fundSearchTerm, setFundSearchTerm] = useState('');
  const [fundStatusFilter, setFundStatusFilter] = useState('ALL');
  const [expSortKey, setExpSortKey] = useState('date');
  const [expSortDir, setExpSortDir] = useState('desc');
  const [fundSortDir, setFundSortDir] = useState('desc');

  // Selected expense for Details Modal
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedFundReq, setSelectedFundReq] = useState(null);
  const [cancellingFundId, setCancellingFundId] = useState(null);
  const [showNewFundModal, setShowNewFundModal] = useState(false);

  // Multi-account management states
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [fundReqAccountId, setFundReqAccountId] = useState('');

  // Form states: New Expense
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Form states: Additional Fund Request
  const [fundAmount, setFundAmount] = useState('');
  const [fundReason, setFundReason] = useState('');
  const [fundReqDocFile, setFundReqDocFile] = useState(null);
  const [submittingFund, setSubmittingFund] = useState(false);

  // Notification read tracker
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`read_notifs_${user?.id}`) || '[]');
    } catch {
      return [];
    }
  });

  const notify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 6000);
  };

  const loadData = async (accId = null) => {
    setLoading(true);
    try {
      const targetAccId = accId || selectedAccountId;
      const summaryUrl = targetAccId ? `/dashboard/summary/?account=${targetAccId}` : '/dashboard/summary/';
      const [sumRes, expRes, fundRes, catRes] = await Promise.all([
        api.get(summaryUrl),
        api.get('/expenses/'),
        api.get('/fund-requests/'),
        api.get('/categories/')
      ]);
      setSummary(sumRes.data);
      if (sumRes.data?.last_refresh_str) {
        setLastRefreshText(sumRes.data.last_refresh_str);
      }
      const accList = sumRes.data.all_accounts || (sumRes.data.fund_account ? [sumRes.data.fund_account] : []);
      setAllAccounts(accList);

      const activeAcc = sumRes.data.fund_account;
      if (activeAcc) {
        setSelectedAccountId(activeAcc.id);
        setExpenseAccountId(prev => prev || activeAcc.id);
        setFundReqAccountId(prev => prev || activeAcc.id);
      }

      setExpenses(expRes.data);
      setFundRequests(fundRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !category) {
        setCategory(catRes.data[0].name);
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user?.last_refresh_formatted && !lastRefreshText) {
      setLastRefreshText(user.last_refresh_formatted);
    }
  }, [user?.last_refresh_formatted]);

  const handleSwitchAccount = async (accId) => {
    setSelectedAccountId(accId);
    setExpenseAccountId(accId);
    setFundReqAccountId(accId);
    try {
      const res = await api.get(`/dashboard/summary/?account=${accId}`);
      setSummary(res.data);
      if (res.data.all_accounts) {
        setAllAccounts(res.data.all_accounts);
      }
      notify('info', `Active fund account switched to ${res.data.fund_account?.name || 'Account'}`);
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to switch fund account.');
    }
  };

  const fundAccount = summary?.fund_account;
  const currentExpenseAccount = allAccounts.find(a => String(a.id) === String(expenseAccountId)) || fundAccount;
  const currentFundReqAccount = allAccounts.find(a => String(a.id) === String(fundReqAccountId)) || fundAccount;

  // Validate Submit Expense Form
  const validateExpenseForm = () => {
    const errors = {};
    const intAmount = parseInt(amount, 10);
    const availBalance = currentExpenseAccount?.available_balance ?? 0;

    if (!expenseDate) {
      errors.expenseDate = 'Expense date is required.';
    }
    if (!amount || isNaN(intAmount) || intAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than ₹0.';
    }
    if (!payee.trim()) {
      errors.payee = 'Payee / Vendor name is required.';
    }
    if (!description.trim()) {
      errors.description = 'Expense description / business purpose is required.';
    }
    if (!category) {
      errors.category = 'Please select a category.';
    }
    if (docFile && docFile.size > 50 * 1024 * 1024) {
      errors.document = 'Supporting document exceeds 50 MB limit. Please upload a smaller file.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!validateExpenseForm()) {
      return;
    }

    setSubmittingExpense(true);
    try {
      const formData = new FormData();
      const chosenAccId = currentExpenseAccount?.id || fundAccount?.id;
      if (chosenAccId) {
        formData.append('fund_account', chosenAccId);
      }
      formData.append('expense_date', expenseDate);
      formData.append('amount', parseInt(amount, 10));
      formData.append('category', category || 'General Expense');
      formData.append('payee', payee.trim());
      formData.append('description', description.trim());
      if (docFile) {
        formData.append('supporting_document', docFile);
      }

      const res = await api.post('/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      notify('success', `Expense claim ${res.data.reference_number || ''} of ₹${parseInt(amount, 10).toLocaleString('en-IN')} submitted successfully!`);
      setAmount('');
      setPayee('');
      setDescription('');
      setDocFile(null);
      setFieldErrors({});
      await loadData();
      setActiveTab('expenses');
    } catch (err) {
      const errData = err.response?.data;
      let detail = errData?.amount?.[0] || errData?.detail;
      if (!detail && errData) {
        if (typeof errData === 'string') {
          detail = errData;
        } else if (typeof errData === 'object') {
          const firstKey = Object.keys(errData)[0];
          const firstVal = errData[firstKey];
          if (Array.isArray(firstVal)) {
            detail = `${firstKey !== 'non_field_errors' ? `${firstKey}: ` : ''}${firstVal[0]}`;
          } else if (typeof firstVal === 'string') {
            detail = `${firstKey}: ${firstVal}`;
          }
        }
      }
      notify('error', detail || 'Failed to submit expense claim. Please verify all fields.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleCancelExpense = async (id, refNum, expAmount) => {
    const ok = await confirm({
      title: 'Cancel Expense Claim',
      message: `Are you sure you want to cancel claim ${refNum}?`,
      subMessage: `₹${expAmount.toLocaleString('en-IN')} will be restored to your available fund balance.`,
      confirmText: 'Yes, Cancel Claim',
      cancelText: 'Keep Claim',
      variant: 'danger',
      icon: 'ban',
    });
    if (!ok) return;

    try {
      await api.delete(`/expenses/${id}/`);
      notify('success', `Claim ${refNum} cancelled successfully. Balance restored.`);
      if (selectedExpense?.id === id) {
        setSelectedExpense(null);
      }
      loadData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to cancel claim.');
    }
  };

  const handleCancelFundRequest = async (id, reqNumber) => {
    const ok = await confirm({
      title: 'Cancel Fund Replenishment Request',
      message: `Are you sure you want to cancel fund request ${reqNumber}? This action cannot be undone.`,
      confirmText: 'Yes, Cancel Request',
      cancelText: 'Keep Request',
      variant: 'danger',
      icon: 'ban',
    });
    if (!ok) return;

    setCancellingFundId(id);
    try {
      await api.post(`/fund-requests/${id}/cancel/`);
      notify('success', `Fund request ${reqNumber} cancelled successfully.`);
      if (selectedFundReq?.id === id) {
        setSelectedFundReq(null);
      }
      loadData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to cancel fund request.');
    } finally {
      setCancellingFundId(null);
    }
  };

  const handleFundRequestSubmit = async (e) => {
    e.preventDefault();
    const intAmount = Number(fundAmount);
    if (!Number.isSafeInteger(intAmount) || intAmount <= 0) {
      notify('error', 'Requested amount must be greater than ₹0.');
      return;
    }
    if (!fundReason.trim()) {
      notify('error', 'A mandatory justification must be provided.');
      return;
    }
    if (fundReqDocFile && fundReqDocFile.size > 50 * 1024 * 1024) {
      notify('error', 'Supporting document exceeds the 50 MB limit.');
      return;
    }

    setSubmittingFund(true);
    try {
      const formData = new FormData();
      formData.append('requested_amount', String(intAmount));
      formData.append('reason', fundReason.trim());
      if (fundReqDocFile) {
        formData.append('supporting_document', fundReqDocFile);
      }

      await api.post('/fund-requests/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      notify('success', `Fund request for ₹${intAmount.toLocaleString('en-IN')} submitted to Checker for review.`);
      setFundAmount('');
      setFundReason('');
      setFundReqDocFile(null);
      setShowNewFundModal(false);
      await loadData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to submit fund request.');
    } finally {
      setSubmittingFund(false);
    }
  };

  const renderFundStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="workman-status-badge status-badge-submitted">
            <span className="status-dot"></span>Pending Checker
          </span>
        );
      case 'SENT_TO_ADMIN':
        return (
          <span className="workman-status-badge status-badge-sent-admin">
            <span className="status-dot"></span>Sent to Admin
          </span>
        );
      case 'APPROVED':
        return (
          <span className="workman-status-badge status-badge-approved">
            <span className="status-dot"></span>Approved (Funds Added)
          </span>
        );
      case 'PARTIALLY_APPROVED':
        return (
          <span className="workman-status-badge status-badge-sent-admin">
            <span className="status-dot"></span>Partially Approved
          </span>
        );
      case 'DISBURSED':
        return (
          <span className="workman-status-badge status-badge-approved">
            <span className="status-dot"></span>Disbursed & Added
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="workman-status-badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            <span className="status-dot" style={{ background: '#94a3b8' }}></span>Cancelled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="workman-status-badge status-badge-rejected">
            <span className="status-dot"></span>Rejected
          </span>
        );
      default:
        return (
          <span className="workman-status-badge">
            <span className="status-dot"></span>{status}
          </span>
        );
    }
  };

  // Status Badge Component (Workman Style with Dot Indicator)
  const renderStatusBadge = (status, exp = null) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
            <span className="workman-status-badge status-badge-submitted">
              <span className="status-dot"></span>
              Pending Checker
            </span>
          </div>
        );
      case 'ACCEPTED_BY_CHECKER':
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
            <span className="workman-status-badge status-badge-accepted-checker">
              <span className="status-dot"></span>
              Approved by Checker
            </span>
            {exp?.checker_name && (
              <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>
                by {exp.checker_name}
              </span>
            )}
          </div>
        );
      case 'SENT_TO_ADMIN':
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
            <span className="workman-status-badge status-badge-sent-admin">
              <span className="status-dot"></span>
              Sent to Admin
            </span>
            {exp?.checker_name && (
              <span style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: 600 }}>
                by {exp.checker_name}
              </span>
            )}
          </div>
        );
      case 'ACCEPTED_BY_ADMIN':
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
            <span className="workman-status-badge status-badge-approved">
              <span className="status-dot"></span>
              Admin Approved
            </span>
            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
              {exp?.checker_name && exp?.checker_action === 'ACCEPT'
                ? `Accepted by Checker ${exp.checker_name} / Admin ${exp?.admin_name || 'Admin'}`
                : `Accepted by Admin ${exp?.admin_name || 'Admin'}`}
            </span>
          </div>
        );
      case 'REJECTED_BY_ADMIN':
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
            <span className="workman-status-badge status-badge-rejected">
              <span className="status-dot"></span>
              Admin Rejected
            </span>
            <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>
              Rejected by Admin {exp?.admin_name || 'Admin'}
            </span>
          </div>
        );
      case 'CANCELLED':
        return (
          <span className="workman-status-badge status-badge-cancelled">
            <span className="status-dot"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="workman-status-badge status-badge-cancelled">
            <span className="status-dot"></span>
            {status}
          </span>
        );
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesRef = exp.reference_number?.toLowerCase().includes(term);
        const matchesPayee = exp.payee?.toLowerCase().includes(term);
        const matchesCat = exp.category?.toLowerCase().includes(term);
        const matchesDesc = exp.description?.toLowerCase().includes(term);
        if (!matchesRef && !matchesPayee && !matchesCat && !matchesDesc) return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          if (!['SUBMITTED', 'SENT_TO_ADMIN'].includes(exp.status)) return false;
        } else if (exp.status !== statusFilter) {
          return false;
        }
      }
      // Category filter
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
        return false;
      }
      // Date from
      if (dateFrom && exp.expense_date < dateFrom) {
        return false;
      }
      // Date to
      if (dateTo && exp.expense_date > dateTo) {
        return false;
      }
      return true;
    });
  }, [expenses, searchTerm, statusFilter, categoryFilter, dateFrom, dateTo]);

  // Sorted & Paginated Expenses
  const sortedExpenses = useMemo(() => {
    const list = [...filteredExpenses];
    if (!expSortDir) return list;
    list.sort((a, b) => {
      let aVal, bVal;
      switch (expSortKey) {
        case 'sno':
        case 'actions':
        case 'id':
          aVal = a.id || 0;
          bVal = b.id || 0;
          break;
        case 'ref':
          aVal = a.reference_number || '';
          bVal = b.reference_number || '';
          break;
        case 'date':
          aVal = new Date(a.expense_date || 0).getTime();
          bVal = new Date(b.expense_date || 0).getTime();
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'payee':
          aVal = a.payee || '';
          bVal = b.payee || '';
          break;
        case 'desc':
          aVal = a.description || '';
          bVal = b.description || '';
          break;
        case 'amount':
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          aVal = a[expSortKey] || '';
          bVal = b[expSortKey] || '';
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return expSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return expSortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
    return list;
  }, [filteredExpenses, expSortKey, expSortDir]);

  const totalEntries = sortedExpenses.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(start, start + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  const filteredFundRequests = useMemo(() => {
    return fundRequests.filter(req => {
      const term = fundSearchTerm.toLowerCase();
      const matchesSearch = !term ||
        (req.request_number && req.request_number.toLowerCase().includes(term)) ||
        (req.reason && req.reason.toLowerCase().includes(term)) ||
        (req.fund_account_name && req.fund_account_name.toLowerCase().includes(term)) ||
        String(req.requested_amount).includes(term) ||
        (req.approved_amount && String(req.approved_amount).includes(term));

      const matchesStatus = fundStatusFilter === 'ALL' || req.status === fundStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [fundRequests, fundSearchTerm, fundStatusFilter]);

  const sortedFundRequests = useMemo(() => {
    const list = [...filteredFundRequests];
    list.sort((a, b) => {
      const aVal = a.request_number || a.id || 0;
      const bVal = b.request_number || b.id || 0;
      return fundSortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
    return list;
  }, [filteredFundRequests, fundSortDir]);

  const fundTotalPages = Math.ceil(sortedFundRequests.length / fundPageSize) || 1;
  const paginatedFundRequests = useMemo(() => {
    const start = (fundPage - 1) * fundPageSize;
    return sortedFundRequests.slice(start, start + fundPageSize);
  }, [sortedFundRequests, fundPage, fundPageSize]);

  const exportFundRequestsToCSV = () => {
    if (filteredFundRequests.length === 0) {
      notify('error', 'No fund requests available to export.');
      return;
    }
    const headers = ['Request Number', 'Date', 'Fund Account', 'Requested Amount INR', 'Approved Amount INR', 'Status', 'Reason', 'Reviewed By', 'Review Comments'];
    const rows = filteredFundRequests.map(req => [
      req.request_number,
      formatDate(req.created_at),
      `"${(req.fund_account_name || '').replace(/"/g, '""')}"`,
      req.requested_amount,
      req.approved_amount || '',
      req.status,
      `"${(req.reason || '').replace(/"/g, '""')}"`,
      `"${(req.reviewed_by_name || '').replace(/"/g, '""')}"`,
      `"${(req.review_comments || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `additional_fund_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export
  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      notify('error', 'No expenses available to export.');
      return;
    }
    const headers = ['Ref Number', 'Expense Date', 'Category', 'Payee', 'Description', 'Amount INR', 'Status', 'Checker Review', 'Admin Decision'];
    const rows = filteredExpenses.map(exp => [
      exp.reference_number,
      exp.expense_date,
      `"${exp.category || ''}"`,
      `"${(exp.payee || '').replace(/"/g, '""')}"`,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount,
      exp.status,
      `"${exp.checker_action || 'NONE'}"`,
      `"${exp.admin_decision || 'NONE'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `petty_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // Generate Notifications from recent expense decisions
  const notificationsList = useMemo(() => {
    const list = [];
    expenses.forEach(exp => {
      if (exp.admin_decision === 'ACCEPT') {
        list.push({
          id: `admin_acc_${exp.id}`,
          title: `Claim ${exp.reference_number} Approved`,
          message: `Admin approved your expense of ₹${exp.amount.toLocaleString('en-IN')} for ${exp.payee}.`,
          type: 'success',
          date: exp.admin_timestamp || exp.updated_at,
          expense: exp
        });
      } else if (exp.admin_decision === 'REJECT') {
        list.push({
          id: `admin_rej_${exp.id}`,
          title: `Claim ${exp.reference_number} Rejected`,
          message: `Admin rejected your claim. Reason: "${exp.admin_comments || 'No comments provided'}"`,
          type: 'danger',
          date: exp.admin_timestamp || exp.updated_at,
          expense: exp
        });
      } else if (exp.checker_action === 'ACCEPT') {
        list.push({
          id: `checker_acc_${exp.id}`,
          title: `Claim ${exp.reference_number} Verified by Checker`,
          message: `Checker verified your claim of ₹${exp.amount.toLocaleString('en-IN')}. Forwarded for final admin decision.`,
          type: 'info',
          date: exp.checker_timestamp || exp.updated_at,
          expense: exp
        });
      } else if (exp.checker_action === 'SEND_TO_ADMIN') {
        list.push({
          id: `checker_esc_${exp.id}`,
          title: `Claim ${exp.reference_number} Escalated to Admin`,
          message: `Checker escalated with comment: "${exp.checker_comments || 'Review required'}"`,
          type: 'warning',
          date: exp.checker_timestamp || exp.updated_at,
          expense: exp
        });
      }
    });

    fundRequests.forEach(req => {
      if (req.status === 'APPROVED' || req.status === 'DISBURSED') {
        list.push({
          id: `fund_acc_${req.id}`,
          title: `Fund Request ${req.request_number} Approved`,
          message: `Admin approved supplementary disbursement of ₹${(req.approved_amount || req.requested_amount).toLocaleString('en-IN')}.`,
          type: 'success',
          date: req.reviewed_at || req.updated_at
        });
      } else if (req.status === 'REJECTED') {
        list.push({
          id: `fund_rej_${req.id}`,
          title: `Fund Request ${req.request_number} Rejected`,
          message: `Admin rejected the replenishment request: "${req.review_comments || 'Low justification'}"`,
          type: 'danger',
          date: req.reviewed_at || req.updated_at
        });
      }
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [expenses, fundRequests]);

  const unreadNotifsCount = notificationsList.filter(n => !readNotifications.includes(n.id)).length;

  const markAllNotifsRead = () => {
    const allIds = notificationsList.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem(`read_notifs_${user?.id}`, JSON.stringify(allIds));
    notify('success', 'All notifications marked as read.');
  };

  return (
    <div className="page-body">
      {/* 1. Dashboard Header (Workman Spec) */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>
            {activeTab === 'dashboard' ? 'Dashboard' :
             activeTab === 'submit' ? 'Submit Expense' :
             activeTab === 'expenses' ? 'My Expenses' :
             activeTab === 'notifications' ? 'Notifications' : 'Additional Fund Requests'}
          </h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '3px' }}>
            {activeTab === 'dashboard' ? 'Overview of your petty cash expenses and approval status.' :
             activeTab === 'submit' ? 'Submit a new petty cash expense claim.' :
             activeTab === 'expenses' ? 'Complete history of all your submitted petty cash claims.' :
             activeTab === 'notifications' ? 'Real-time updates regarding Checker verifications and Admin approvals.' :
             'View and manage your additional petty cash replenishment requests submitted to Admin.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'dashboard' && (
              <button onClick={loadData} className="btn btn-secondary btn-sm" title="Refresh data">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            )}

            {activeTab === 'expenses' && (
              <button
                onClick={() => setActiveTab('funds')}
                className="btn btn-secondary btn-sm"
                title="View Additional Fund Requests"
              >
                <Wallet size={14} />
                <span>View Additional Funds</span>
              </button>
            )}

            {activeTab === 'funds' ? (
              <>
                <button onClick={() => setShowNewFundModal(true)} className="btn btn-primary btn-sm">
                  <PlusCircle size={15} />
                  <span>Request Additional Funds</span>
                </button>
                <button onClick={() => setActiveTab('expenses')} className="btn btn-secondary btn-sm">
                  <ReceiptIndianRupee size={14} />
                  <span>My Expenses</span>
                </button>
              </>
            ) : activeTab !== 'submit' && activeTab !== 'dashboard' ? (
              <button onClick={() => setActiveTab('submit')} className="btn btn-primary btn-sm">
                <PlusCircle size={15} />
                <span>Submit Expense</span>
              </button>
            ) : null}

            {activeTab !== 'dashboard' && (
              <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary btn-sm">
                <Layers size={14} />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
          {activeTab === 'dashboard' && lastRefreshText && (
            <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
              Last refresh at {formatRefreshDate(lastRefreshText)}
            </div>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification({ type: '', text: '' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

{/* 2. Overview Actions & Heading (Extreme Left Aligned, Balance Cards Removed) */}
      {activeTab === 'dashboard' && (
        <>
          <section className="admin-fund-summary" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div className="admin-fund-summary-actions" style={{ justifyContent: 'flex-start', margin: '0 0 1.25rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="btn btn-primary"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 16px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Submit Expense</span>
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className="btn btn-secondary"
                  style={{
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileText size={14} />
                  <span>My Expenses ({expenses.length})</span>
                </button>
              </div>
            </div>

            <h2 className="admin-fund-account-title" style={{ textAlign: 'left', margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Maker Allocated Budget & Expense Overview
            </h2>

            <div className="admin-balance-card-grid">
              {/* Card 1: Funds Allocated */}
              <article className="admin-balance-card admin-balance-available">
                <div className="admin-balance-card-icon"><Wallet size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">Funds Allocated</div>
                  <div className="admin-balance-card-value">
                    ₹{((summary?.funds_allocated ?? user?.allocated_funds) || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="admin-balance-card-description">Credit limit allocated to your account by Checker or Admin.</p>
                </div>
              </article>

              {/* Card 2: Funds Used */}
              <article className="admin-balance-card admin-balance-commitments">
                <div className="admin-balance-card-icon"><ReceiptIndianRupee size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">Funds Used</div>
                  <div className="admin-balance-card-value">
                    ₹{((summary?.funds_used ?? user?.funds_used) || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="admin-balance-card-description">Total cumulative claims submitted by you.</p>
                </div>
              </article>

              {/* Card 3: Funds Remaining */}
              {(() => {
                const rem = summary?.funds_remaining !== undefined 
                  ? summary.funds_remaining 
                  : ((user?.allocated_funds || 0) - (user?.funds_used || 0));
                const isDeficit = rem < 0;
                return (
                  <article className={`admin-balance-card ${isDeficit ? 'admin-balance-deficit' : 'admin-balance-ledger'}`}>
                    <div className="admin-balance-card-icon"><FileText size={27} /></div>
                    <div className="admin-balance-card-content">
                      <div className="admin-balance-card-label">Funds Remaining</div>
                      <div className="admin-balance-card-value" style={{ color: isDeficit ? '#dc2626' : undefined }}>
                        {isDeficit ? `-₹${Math.abs(rem).toLocaleString('en-IN')}` : `₹${rem.toLocaleString('en-IN')}`}
                        {isDeficit && (
                          <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', fontWeight: 700 }}>
                            DEFICIT
                          </span>
                        )}
                      </div>
                      <p className="admin-balance-card-description">
                        {isDeficit ? 'Spending exceeds credit limit. Submissions still permitted.' : 'Remaining balance available for new claims.'}
                      </p>
                    </div>
                  </article>
                );
              })()}
            </div>
          </section>

          {/* 3. Dashboard Summary Cards (Workman Style: 4 Cards in one row) */}
          <div className="workman-summary-grid" style={{ marginBottom: '2rem' }}>
            {/* Card 1: Total Expenses */}
            <div className="workman-card card-theme-total">
              <div className="workman-card-header">
                <span className="workman-card-label">TOTAL EXPENSES</span>
                <div className="workman-card-icon">
                  <ReceiptIndianRupee size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {summary?.total_count ?? expenses.length}
              </div>
              <div className="workman-card-subtext">
                <span>Expenses submitted by you</span>
              </div>
            </div>

            {/* Card 2: Approved */}
            <div className="workman-card card-theme-approved">
              <div className="workman-card-header">
                <span className="workman-card-label">APPROVED</span>
                <div className="workman-card-icon">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {summary?.approved_count ?? expenses.filter(e => ['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'].includes(e.status)).length}
              </div>
              <div className="workman-card-subtext" style={{ color: '#059669', fontWeight: 500 }}>
                <span>₹{(summary?.approved_amount ?? 0).toLocaleString('en-IN')} approved</span>
              </div>
            </div>

            {/* Card 3: Pending */}
            <div className="workman-card card-theme-pending">
              <div className="workman-card-header">
                <span className="workman-card-label">PENDING</span>
                <div className="workman-card-icon">
                  <Clock size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {summary?.pending_count ?? expenses.filter(e => ['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status)).length}
              </div>
              <div className="workman-card-subtext" style={{ color: '#d97706', fontWeight: 500 }}>
                <span>
                  {summary?.pending_amount
                    ? `₹${summary.pending_amount.toLocaleString('en-IN')} pending`
                    : 'Awaiting Checker or Admin'}
                </span>
              </div>
            </div>

            {/* Card 4: Rejected */}
            <div className="workman-card card-theme-rejected">
              <div className="workman-card-header">
                <span className="workman-card-label">REJECTED</span>
                <div className="workman-card-icon">
                  <XCircle size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {summary?.rejected_count ?? expenses.filter(e => e.status === 'REJECTED_BY_ADMIN').length}
              </div>
              <div className="workman-card-subtext" style={{ color: '#dc2626', fontWeight: 500 }}>
                <span>Rejected claims released</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 1: DASHBOARD / MY EXPENSES TABLE (Workman Table & Controls) */}
      {(activeTab === 'dashboard' || activeTab === 'expenses') && (
        <div>
          {/* Filters Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by ref #, payee, description, category..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <select
                  className="form-input"
                  style={{ width: '180px' }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">All Pending</option>
                  <option value="SUBMITTED">Pending Checker</option>
                  <option value="ACCEPTED_BY_CHECKER">Approved by Checker</option>
                  <option value="SENT_TO_ADMIN">Escalated to Admin</option>
                  <option value="ACCEPTED_BY_ADMIN">Approved</option>
                  <option value="REJECTED_BY_ADMIN">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <select
                  className="form-input"
                  style={{ width: '160px' }}
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filters & Rows per page */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>From:</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {(searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFrom || dateTo) && (
                  <button
                    onClick={resetFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 8px'
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                  <select
                    className="form-input"
                    style={{ padding: '3px 8px', fontSize: '0.8rem', width: '70px' }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  onClick={() => setActiveTab('funds')}
                  className="btn btn-secondary btn-sm"
                  title="View Additional Fund Requests"
                >
                  <Wallet size={14} />
                  <span>View Additional Funds</span>
                </button>

                <button
                  onClick={exportToCSV}
                  className="btn btn-secondary btn-sm"
                  title="Export filtered records to CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container - Spaced Card Table matching Checker UI */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
              <div>Loading expenses...</div>
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3.5rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <ReceiptIndianRupee size={44} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No matching expense claims found
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                {expenses.length === 0
                  ? 'You have not submitted any expenses yet. Click "Submit Expense" to create your first claim.'
                  : 'Try clearing your search or filter criteria to see results.'}
              </p>
              {expenses.length === 0 && (
                <button
                  onClick={() => setActiveTab('submit')}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '1rem' }}
                >
                  <PlusCircle size={15} />
                  <span>Submit Expense</span>
                </button>
              )}
            </div>
          ) : (
            <div className="spaced-table-container">
              <table className="spaced-table" style={{ borderSpacing: '0 10px' }}>
                <thead>
                  <tr>
                    <TableHeadSortMenu
                      label="SR No."
                      columnKey="sno"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                      width="60px"
                    />
                    <TableHeadSortMenu
                      label="Actions"
                      columnKey="actions"
                      align="center"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                      width="180px" style={{ width: '180px', minWidth: '180px' }}
                    />
                    <TableHeadSortMenu
                      label="Status"
                      columnKey="status"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Expense ID"
                      columnKey="ref"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Date"
                      columnKey="date"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Category"
                      columnKey="category"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Payee / Merchant"
                      columnKey="payee"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Description"
                      columnKey="desc"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Amount (INR)"
                      columnKey="amount"
                      align="right"
                      sortConfig={{ key: expSortKey, direction: expSortDir }}
                      onSort={(key, dir) => {
                        setExpSortKey(key);
                        setExpSortDir(dir);
                      }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginatedExpenses.map((exp, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={exp.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{rowNumber}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center', minWidth: '160px', justifyContent: 'center' }}>
                            <button
                              onClick={() => setSelectedExpense(exp)}
                              className="table-btn table-btn-view"
                              title="View claim history and approval details"
                            >
                              <Eye size={13} />
                              <span className="table-btn-view-text">
                                <span>View</span>
                                <span>More</span>
                              </span>
                            </button>

                            {exp.status === 'SUBMITTED' && (
                              <button
                                onClick={() => handleCancelExpense(exp.id, exp.reference_number, exp.amount)}
                                className="table-btn table-btn-cancel"
                                title="Cancel claim and release commitment"
                              >
                                <Ban size={13} />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td>{renderStatusBadge(exp.status, exp)}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                          {exp.reference_number}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(exp.expense_date)}</td>
                        <td>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: 600
                          }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>{exp.payee}</td>
                        <td style={{ maxWidth: '240px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exp.description}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredExpenses.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              fontSize: '0.85rem',
              color: '#64748b'
            }}>
              <div>
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalEntries)} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUBMIT EXPENSE CLAIM (Workman Design & Inline Errors) */}
      {activeTab === 'submit' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '2rem',
          maxWidth: '780px',
          margin: '0 auto',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>
              Submit New Petty Expense Claim
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px' }}>
              Submit your petty cash expense claim with bill receipt for verification.
            </p>
          </div>

          <form onSubmit={handleExpenseSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

              {/* Expense Date */}
              <div className="form-group">
                <label className="form-label">
                  Expense Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => {
                    setExpenseDate(e.target.value);
                    if (fieldErrors.expenseDate) setFieldErrors(prev => ({ ...prev, expenseDate: null }));
                  }}
                  className="form-input"
                  style={{ borderColor: fieldErrors.expenseDate ? '#ef4444' : '#cbd5e1' }}
                />
                {fieldErrors.expenseDate && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {fieldErrors.expenseDate}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">
                  Amount in INR (Whole ₹ only) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: '#64748b'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 1500"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: null }));
                    }}
                    className="form-input"
                    style={{
                      paddingLeft: '1.8rem',
                      borderColor: fieldErrors.amount ? '#ef4444' : '#cbd5e1'
                    }}
                  />
                </div>
                {fieldErrors.amount && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {fieldErrors.amount}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">
                  Expense Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (fieldErrors.category) setFieldErrors(prev => ({ ...prev, category: null }));
                  }}
                  className="form-input"
                  style={{ borderColor: fieldErrors.category ? '#ef4444' : '#cbd5e1' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
                {fieldErrors.category && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {fieldErrors.category}
                  </div>
                )}
              </div>

              {/* Payee */}
              <div className="form-group">
                <label className="form-label">
                  Payee / Vendor / Merchant <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Local Cab, Stationery Mart, Swiggy"
                  value={payee}
                  onChange={(e) => {
                    setPayee(e.target.value);
                    if (fieldErrors.payee) setFieldErrors(prev => ({ ...prev, payee: null }));
                  }}
                  className="form-input"
                  style={{ borderColor: fieldErrors.payee ? '#ef4444' : '#cbd5e1' }}
                />
                {fieldErrors.payee && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                    {fieldErrors.payee}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">
                Expense Description / Business Justification <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows="3"
                placeholder="Explain the necessity and items purchased for company operations..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: null }));
                }}
                className="form-input"
                style={{ borderColor: fieldErrors.description ? '#ef4444' : '#cbd5e1' }}
              />
              {fieldErrors.description && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {fieldErrors.description}
                </div>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Upload Supporting Document / Bill / Receipt</label>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '1.25rem',
                textAlign: 'center',
                background: '#f8fafc'
              }}>
                <Upload size={24} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                {docFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                      {docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocFile(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="receipt-file-input"
                      accept="image/*,application/pdf"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="receipt-file-input"
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      Choose Receipt / PDF
                    </label>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                      Supports PNG, JPG, PDF up to 50MB
                    </div>
                  </div>
                )}
                {fieldErrors.document && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '6px' }}>
                    {fieldErrors.document}
                  </div>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingExpense || loading}
                className="btn btn-primary"
                style={{ minWidth: '170px' }}
              >
                {submittingExpense ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Submitting Claim...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Submit to Checker</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: NOTIFICATIONS VIEW */}
      {activeTab === 'notifications' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '1.75rem',
          maxWidth: '840px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Activity &amp; Approval Notifications
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                Real-time updates regarding Checker verifications and Admin approvals.
              </p>
            </div>
            {unreadNotifsCount > 0 && (
              <button
                onClick={markAllNotifsRead}
                className="btn btn-secondary btn-sm"
              >
                <Check size={14} />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>

          {notificationsList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <Bell size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600 }}>No notifications yet</div>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                When Checker or Admin acts on your expense claims, alerts will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notificationsList.map((notif) => {
                const isRead = readNotifications.includes(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.expense) setSelectedExpense(notif.expense);
                      if (!isRead) {
                        const updated = [...readNotifications, notif.id];
                        setReadNotifications(updated);
                        localStorage.setItem(`read_notifs_${user?.id}`, JSON.stringify(updated));
                      }
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: isRead ? '#ffffff' : '#f8fafc',
                      cursor: notif.expense ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{
                        marginTop: '2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isRead ? 'transparent' : '#2563eb'
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '3px' }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                          {new Date(notif.date).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {notif.expense && (
                      <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        View Details &gt;
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: ADDITIONAL FUND REQUESTS (Full Page Table matching Checker & Maker Expenses UI) */}
      {activeTab === 'funds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Summary Banner Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '0.25rem'
          }}>


            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Total Requests
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {fundRequests.length}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Submitted to Admin
                </span>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}>
                <FileText size={20} />
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Under Review
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                  {fundRequests.filter(r => r.status === 'SUBMITTED').length}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
                  Awaiting Admin Decision
                </span>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fffbeb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}>
                <Clock size={20} />
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Replenished / Disbursed
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                  ₹{fundRequests
                    .filter(r => r.status === 'DISBURSED' || r.status === 'APPROVED')
                    .reduce((sum, r) => sum + (r.approved_amount || r.requested_amount || 0), 0)
                    .toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#166534' }}>
                  Credited to petty cash
                </span>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}>
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>

          {/* Filter Bar & Toolbar matching Expenses Table */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                {/* Search Box */}
                <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search by Req #, reason, amount..."
                    value={fundSearchTerm}
                    onChange={(e) => {
                      setFundSearchTerm(e.target.value);
                      setFundPage(1);
                    }}
                    className="form-input"
                    style={{ paddingLeft: '2rem', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={14} color="#64748b" />
                  <select
                    className="form-input"
                    value={fundStatusFilter}
                    onChange={(e) => {
                      setFundStatusFilter(e.target.value);
                      setFundPage(1);
                    }}
                    style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUBMITTED">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PARTIALLY_APPROVED">Partially Approved</option>
                    <option value="DISBURSED">Disbursed & Added</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {(fundSearchTerm || fundStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setFundSearchTerm('');
                      setFundStatusFilter('ALL');
                      setFundPage(1);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 8px'
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Rows per page & Export CSV & New Request Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                  <select
                    className="form-input"
                    value={fundPageSize}
                    onChange={(e) => {
                      setFundPageSize(Number(e.target.value));
                      setFundPage(1);
                    }}
                    style={{ padding: '3px 8px', fontSize: '0.8rem', width: '70px' }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  onClick={exportFundRequestsToCSV}
                  className="btn btn-secondary btn-sm"
                  title="Export fund requests to CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setShowNewFundModal(true)}
                  className="btn btn-primary btn-sm"
                  title="Request supplementary funds"
                >
                  <PlusCircle size={15} />
                  <span>Request Additional Funds</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container - Spaced Card Table matching Checker UI */}
          {filteredFundRequests.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3.5rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Wallet size={44} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No supplementary fund requests found
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', maxWidth: '420px', margin: '4px auto 16px' }}>
                {fundSearchTerm || fundStatusFilter !== 'ALL'
                  ? 'Try adjusting your search criteria or resetting the filters.'
                  : 'Submit a new fund replenishment request to Admin whenever your balance is running low.'}
              </p>
              <button
                onClick={() => setShowNewFundModal(true)}
                className="btn btn-primary btn-sm"
                style={{ margin: '0 auto' }}
              >
                <PlusCircle size={14} />
                <span>Submit New Fund Request</span>
              </button>
            </div>
          ) : (
            <div className="spaced-table-container">
              <table className="spaced-table" style={{ borderSpacing: '0 10px' }}>
                <thead>
                  <tr>
                    <TableHeadSortMenu
                      label="SR No."
                      columnKey="sno"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                      width="60px"
                    />
                    <TableHeadSortMenu
                      label="Actions"
                      columnKey="actions"
                      align="center"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                      style={{ minWidth: '130px' }}
                    />
                    <TableHeadSortMenu
                      label="Status"
                      columnKey="status"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                    />
                    <TableHeadSortMenu
                      label="Req #"
                      columnKey="req_num"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                    />
                    <TableHeadSortMenu
                      label="Date"
                      columnKey="date"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                    />

                    <TableHeadSortMenu
                      label="Requested Amount"
                      columnKey="req_amount"
                      align="right"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                    />
                    <TableHeadSortMenu
                      label="Approved Amount"
                      columnKey="app_amount"
                      align="right"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                    />
                    <TableHeadSortMenu
                      label="Reason / Purpose"
                      columnKey="purpose"
                      sortConfig={{ key: 'id', direction: fundSortDir }}
                      onSort={(_, dir) => setFundSortDir(dir)}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginatedFundRequests.map((req, idx) => (
                    <tr key={req.id}>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        {(fundPage - 1) * fundPageSize + idx + 1}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedFundReq(req)}
                            className="table-btn table-btn-view"
                            title="View request details and review trail"
                          >
                            <Eye size={13} />
                            <span className="table-btn-view-text">
                              <span>View</span>
                              <span>More</span>
                            </span>
                          </button>

                          {req.status === 'SUBMITTED' && (
                            <button
                              onClick={() => handleCancelFundRequest(req.id, req.request_number)}
                              className="table-btn table-btn-cancel"
                              title="Cancel fund request"
                              disabled={cancellingFundId === req.id}
                            >
                              <Ban size={13} />
                              <span>{cancellingFundId === req.id ? 'Cancelling...' : 'Cancel'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        {renderFundStatusBadge(req.status)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        {req.request_number || (req.id ? String(10000 + req.id) : '-')}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {formatDate(req.created_at)}
                      </td>

                      <td style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {req.requested_amount != null ? `₹${req.requested_amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {req.approved_amount ? (
                          <strong style={{ color: '#166534' }}>
                            ₹{req.approved_amount.toLocaleString('en-IN')}
                          </strong>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem', color: '#475569' }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '280px'
                        }} title={req.reason || ''}>
                          {req.reason || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredFundRequests.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              color: '#64748b'
            }}>
              <div>
                Showing {Math.min((fundPage - 1) * fundPageSize + 1, filteredFundRequests.length)} to {Math.min(fundPage * fundPageSize, filteredFundRequests.length)} of {filteredFundRequests.length} entries
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setFundPage(p => Math.max(1, p - 1))}
                  disabled={fundPage === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                  {fundPage} / {fundTotalPages}
                </span>
                <button
                  onClick={() => setFundPage(p => Math.min(fundTotalPages, p + 1))}
                  disabled={fundPage === fundTotalPages}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. EXPENSE DETAILS MODAL (Workman Style with Full Approval Trail) */}
      {selectedExpense && (
        <div className="modal-overlay-custom" onClick={() => setSelectedExpense(null)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedExpense.reference_number}
                </span>
                {renderStatusBadge(selectedExpense.status, selectedExpense)}
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Highlight Amount Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Claim Amount
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{selectedExpense.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date of Expense</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                    {formatDate(selectedExpense.expense_date)}
                  </div>
                </div>
              </div>

              {/* Claim Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Category:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedExpense.category}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Payee / Merchant:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedExpense.payee}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Business Purpose / Description:</span>
                <div style={{
                  marginTop: '4px',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: '#334155',
                  border: '1px solid #f1f5f9'
                }}>
                  {selectedExpense.description}
                </div>
              </div>

              {/* Supporting Document / PDF Receipt */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Supporting Document / PDF Receipt:</span>
                <div style={{ marginTop: '8px' }}>
                  {selectedExpense.document_url ? (
                    <div className="pdf-preview-box">
                      <div className="pdf-preview-info">
                        <div className="pdf-preview-icon">
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                            {selectedExpense.reference_number}_receipt
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Document attached by {selectedExpense.maker_name || 'Petty Cash Custodian (Maker)'}
                          </div>
                        </div>
                      </div>

                      {/* Single View Proof Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={getMediaUrl(selectedExpense.document_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 14px', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, textDecoration: 'none' }}
                          title="Open proof document in new tab"
                        >
                          <ExternalLink size={15} />
                          <span>View Proof</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b',
                      fontSize: '0.85rem'
                    }}>
                      No receipt document attached to this claim.
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Workflow Progress Trail */}
              <div style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                  Approval Workflow Trail
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Step 1: Maker Submission */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex'
                    }}>
                      <Check size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                          Submitted by {selectedExpense.maker_name || 'Custodian'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {selectedExpense.created_at ? new Date(selectedExpense.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>
                        Expense claim registered and committed against shared available balance.
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Checker Review */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      background: selectedExpense.checker_action === 'ACCEPT' ? '#dcfce7' :
                                  selectedExpense.checker_action === 'SEND_TO_ADMIN' ? '#ffedd5' : '#f1f5f9',
                      color: selectedExpense.checker_action === 'ACCEPT' ? '#166534' :
                             selectedExpense.checker_action === 'SEND_TO_ADMIN' ? '#9a3412' : '#94a3b8',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex'
                    }}>
                      {selectedExpense.checker_action !== 'NONE' ? <Check size={14} /> : <Clock size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                          Checker Verification: {selectedExpense.checker_action === 'ACCEPT' ? 'Accepted' :
                                                 selectedExpense.checker_action === 'SEND_TO_ADMIN' ? 'Escalated to Admin' : 'Pending Verification'}
                        </span>
                        {selectedExpense.checker_timestamp && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {new Date(selectedExpense.checker_timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {selectedExpense.checker_comments ? (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#334155',
                          background: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          marginTop: '6px'
                        }}>
                          <strong>Checker Remarks:</strong> "{selectedExpense.checker_comments}"
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>
                          {selectedExpense.checker_action === 'NONE'
                            ? 'Awaiting Checker inspection and verification.'
                            : 'Verified with no additional notes.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Admin Final Decision */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      background: selectedExpense.admin_decision === 'ACCEPT' ? '#dcfce7' :
                                  selectedExpense.admin_decision === 'REJECT' ? '#fee2e2' : '#f1f5f9',
                      color: selectedExpense.admin_decision === 'ACCEPT' ? '#166534' :
                             selectedExpense.admin_decision === 'REJECT' ? '#991b1b' : '#94a3b8',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex'
                    }}>
                      {selectedExpense.admin_decision === 'ACCEPT' ? <Check size={14} /> :
                       selectedExpense.admin_decision === 'REJECT' ? <XCircle size={14} /> : <Clock size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                          Admin Final Decision: {selectedExpense.admin_decision === 'ACCEPT' ? 'Accepted & Posted' :
                                                 selectedExpense.admin_decision === 'REJECT' ? 'Rejected' : 'Pending Decision'}
                        </span>
                        {selectedExpense.admin_timestamp && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {new Date(selectedExpense.admin_timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {selectedExpense.admin_comments ? (
                        <div style={{
                          fontSize: '0.8rem',
                          color: selectedExpense.admin_decision === 'REJECT' ? '#991b1b' : '#334155',
                          background: selectedExpense.admin_decision === 'REJECT' ? '#fef2f2' : '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${selectedExpense.admin_decision === 'REJECT' ? '#fecaca' : '#e2e8f0'}`,
                          marginTop: '6px'
                        }}>
                          <strong>Admin Remarks:</strong> "{selectedExpense.admin_comments}"
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>
                          {selectedExpense.admin_decision === 'NONE'
                            ? 'Awaiting Admin final decision.'
                            : 'Approved with no remarks.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                {selectedExpense.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleCancelExpense(selectedExpense.id, selectedExpense.reference_number, selectedExpense.amount)}
                    className="btn btn-danger btn-sm"
                  >
                    <Ban size={14} />
                    <span>Cancel Claim (Release ₹{selectedExpense.amount.toLocaleString('en-IN')})</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADDITIONAL FUND REQUEST DETAILS MODAL */}
      {selectedFundReq && (
        <div className="modal-overlay-custom" onClick={() => setSelectedFundReq(null)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                  {selectedFundReq.request_number}
                </span>
                {renderFundStatusBadge(selectedFundReq.status)}
              </div>
              <button
                onClick={() => setSelectedFundReq(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Highlight Amount Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Requested Amount
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{selectedFundReq.requested_amount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{
                  background: selectedFundReq.approved_amount ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${selectedFundReq.approved_amount ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '0.75rem', color: selectedFundReq.approved_amount ? '#166534' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Approved Amount
                  </span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedFundReq.approved_amount ? '#16a34a' : '#64748b' }}>
                    {selectedFundReq.approved_amount ? `₹${selectedFundReq.approved_amount.toLocaleString('en-IN')}` : (
                      <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8' }}>
                        {selectedFundReq.status === 'SUBMITTED' ? 'Pending Review' : selectedFundReq.status === 'CANCELLED' ? 'Cancelled' : selectedFundReq.status === 'REJECTED' ? '₹0 (Rejected)' : '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fund Request Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Target Fund Account:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                    {selectedFundReq.fund_account_name || selectedFundReq.fund_account_code || 'Main Fund Account'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Date Submitted:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                    {selectedFundReq.created_at ? new Date(selectedFundReq.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Submitted By:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                    {selectedFundReq.maker_name || user?.full_name || 'Maker'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>Current Status:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                    {selectedFundReq.status}
                  </span>
                </div>
              </div>

              {/* Business Justification / Reason */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Business Justification / Purpose:
                </span>
                <div style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedFundReq.reason || 'No justification provided.'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Supporting Document:
                </span>
                {selectedFundReq.document_url ? (
                  <a
                    href={getMediaUrl(selectedFundReq.document_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <FileText size={14} />
                    View attachment
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No document attached.</span>
                )}
              </div>

              {/* Admin Review Details (if reviewed or rejected or comments exist) */}
              {(selectedFundReq.reviewed_by_name || selectedFundReq.review_comments || selectedFundReq.reviewed_at) && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                      Admin Review & Decision
                    </span>
                    {selectedFundReq.reviewed_at && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(selectedFundReq.reviewed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  {selectedFundReq.reviewed_by_name && (
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      Reviewed by: <strong>{selectedFundReq.reviewed_by_name}</strong>
                    </div>
                  )}
                  {selectedFundReq.review_comments && (
                    <div style={{
                      marginTop: '4px',
                      padding: '8px 10px',
                      background: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.85rem',
                      color: '#1e293b'
                    }}>
                      {selectedFundReq.review_comments}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fafafa',
              borderBottomLeftRadius: '14px',
              borderBottomRightRadius: '14px'
            }}>
              <div>
                {selectedFundReq.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleCancelFundRequest(selectedFundReq.id, selectedFundReq.request_number)}
                    className="btn btn-danger btn-sm"
                    disabled={cancellingFundId === selectedFundReq.id}
                  >
                    <Ban size={14} />
                    <span>{cancellingFundId === selectedFundReq.id ? 'Cancelling Request...' : 'Cancel Request'}</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedFundReq(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. NEW ADDITIONAL FUND REQUEST MODAL */}
      {showNewFundModal && (
        <div className="modal-overlay-custom" onClick={() => setShowNewFundModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Request Additional Funds
              </h2>
              <button
                onClick={() => setShowNewFundModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFundRequestSubmit}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Employee Allocation Summary Banner */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Maker / Custodian</div>
                    <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{user?.full_name} ({user?.employee_id})</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Funds Remaining</div>
                    <strong style={{ color: Number(summary?.employee_funds?.funds_remaining ?? 0) < 0 ? '#dc2626' : '#16a34a', fontSize: '0.95rem' }}>
                      ₹{Number(summary?.employee_funds?.funds_remaining ?? 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Requested Amount in INR (Whole ₹ only) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 50000"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      required
                      className="form-input"
                      style={{ paddingLeft: '1.8rem' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                    Request will be sent to the Checker for review and approval.
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label">
                    Mandatory Justification / Purpose <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Explain why replenishment is required and anticipated operational expenses..."
                    value={fundReason}
                    onChange={(e) => setFundReason(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supporting Document (Optional)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 50 * 1024 * 1024) {
                        notify('error', 'Supporting document exceeds the 50 MB limit.');
                        e.target.value = '';
                        setFundReqDocFile(null);
                        return;
                      }
                      setFundReqDocFile(file);
                    }}
                    className="form-input"
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>
                    Attach an image or PDF, up to 50 MB. This is optional.
                  </div>
                  {fundReqDocFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.8rem' }}>
                      <span>{fundReqDocFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setFundReqDocFile(null)}
                        className="btn btn-secondary btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                background: '#fafafa',
                borderBottomLeftRadius: '14px',
                borderBottomRightRadius: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={submittingFund}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFund || !Number.isSafeInteger(Number(fundAmount)) || Number(fundAmount) <= 0}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} />
                  <span>{submittingFund ? 'Submitting Request...' : 'Submit Fund Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal End */}
    </div>
  );
}
