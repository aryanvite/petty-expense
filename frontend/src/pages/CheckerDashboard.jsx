import React, { useState, useEffect, useMemo } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import api, { getMediaUrl, formatDate, formatDateTime, fetchDepartments, createDepartment } from '../api';

import { useAuth } from '../context/AuthContext';

import TableHeadSortMenu from '../components/TableHeadSortMenu';

import {

  CheckCircle2,

  XCircle,

  Send,

  Clock,

  FileText,

  AlertCircle,

  ExternalLink,

  PlusCircle,

  RefreshCw,

  Wallet,

  ShieldCheck,

  Search,

  Filter,

  Download,

  Eye,

  X,

  ChevronLeft,

  ChevronRight,

  ReceiptIndianRupee,

  Users,

  Layers,

  Check,

  User as UserIcon,

  HelpCircle,

  FileDown,

  UserPlus,

  UserX,

  UserCheck,

  Trash2,

  KeyRound,

  Copy

} from 'lucide-react';



export default function CheckerDashboard() {

  const navigate = useNavigate();

  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const rawActiveTab = searchParams.get('tab') || 'dashboard';
  const activeTab = rawActiveTab === 'claim' ? 'dashboard' : rawActiveTab;



  const setActiveTab = (tab) => {

    setSearchParams({ tab });

  };



  // State

  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState(null);

  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const [allAccounts, setAllAccounts] = useState([]);

  const [allExpenses, setAllExpenses] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [categories, setCategories] = useState([]);

  const [fundRequests, setFundRequests] = useState([]);

  const [showAllocateModal, setShowAllocateModal] = useState(false);

  const [selectedEmpToAllocate, setSelectedEmpToAllocate] = useState(null);

  const [allocateAmount, setAllocateAmount] = useState('');

  const [allocateNotes, setAllocateNotes] = useState('');

  const [allocatingFunds, setAllocatingFunds] = useState(false);



  // Fund requests state

  const [fundReqSearch, setFundReqSearch] = useState('');

  const [fundReqStatusFilter, setFundReqStatusFilter] = useState('ALL');

  const [fundReqPage, setFundReqPage] = useState(1);

  const [fundReqPageSize, setFundReqPageSize] = useState(10);

  const [fundReqSortKey, setFundReqSortKey] = useState('date');

  const [fundReqSortDir, setFundReqSortDir] = useState('desc');



  // Fund request decision modal

  const [fundDecisionModal, setFundDecisionModal] = useState(null); // { req, action: 'APPROVE'|'REJECT'|'SEND_TO_ADMIN' }

  const [fundDecisionComments, setFundDecisionComments] = useState('');

  const [submittingFundDecision, setSubmittingFundDecision] = useState(false);



  // Checker additional fund request states

  const [showCheckerFundModal, setShowCheckerFundModal] = useState(false);

  const [checkerReqAmount, setCheckerReqAmount] = useState('');

  const [checkerReqReason, setCheckerReqReason] = useState('');

  const [checkerReqDoc, setCheckerReqDoc] = useState(null);

  const [submittingCheckerReq, setSubmittingCheckerReq] = useState(false);

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



  // Table Sorting States

  const [queueSortKey, setQueueSortKey] = useState('date');

  const [queueSortDir, setQueueSortDir] = useState('desc');

  const [expSortKey, setExpSortKey] = useState('date');

  const [expSortDir, setExpSortDir] = useState('desc');

  const [empSortKey, setEmpSortKey] = useState('employee_id');

  const [empSortDir, setEmpSortDir] = useState('asc');



  // Master Departments for Employee Creation

  const [departmentsList, setDepartmentsList] = useState([]);



  // Create Employee Modal State (Checker hierarchy allows creating Makers)

  const [showCreateEmpModal, setShowCreateEmpModal] = useState(false);

  const [newEmpFullName, setNewEmpFullName] = useState('');

  const [newEmpEmail, setNewEmpEmail] = useState('');

  const [newEmpDepartment, setNewEmpDepartment] = useState('');

  const [newEmpDesignation, setNewEmpDesignation] = useState('');

  const [newEmpPhone, setNewEmpPhone] = useState('');

  const [newEmpPassword, setNewEmpPassword] = useState('');

  const [creatingEmp, setCreatingEmp] = useState(false);

  const [empFormError, setEmpFormError] = useState('');

  const [tempPasswordNotice, setTempPasswordNotice] = useState(null);

  const [copied, setCopied] = useState(false);



  useEffect(() => {

    fetchDepartments().then(setDepartmentsList).catch(() => {});

  }, []);



  const [showInlineDeptInput, setShowInlineDeptInput] = useState(false);

  const [customDeptText, setCustomDeptText] = useState('');

  const [creatingCustomDept, setCreatingCustomDept] = useState(false);



  const handleQuickAddDepartment = async () => {

    const trimmed = customDeptText.trim();

    if (!trimmed) {

      setEmpFormError('Please enter a department name.');

      return;

    }

    const existing = departmentsList.find(d => d.name.toLowerCase() === trimmed.toLowerCase());

    if (existing) {

      setNewEmpDepartment(existing.name);

      setShowInlineDeptInput(false);

      setCustomDeptText('');

      return;

    }

    try {

      setCreatingCustomDept(true);

      const code = trimmed.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'DEPT';

      const created = await createDepartment({

        name: trimmed,

        code,

        description: `${trimmed} Department`,

        is_active: true

      });

      setDepartmentsList(prev => [...prev, created]);

      setNewEmpDepartment(created.name);

      setShowInlineDeptInput(false);

      setCustomDeptText('');

    } catch (err) {

      setEmpFormError(err?.response?.data?.name?.[0] || 'Failed to create department.');

    } finally {

      setCreatingCustomDept(false);

    }

  };

  const [queuePage, setQueuePage] = useState(1);

  const [queuePageSize, setQueuePageSize] = useState(10);



  // Employees search & pagination

  const [employeeSearch, setEmployeeSearch] = useState('');

  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('ALL');

  const [empPage, setEmpPage] = useState(1);

  const [empPageSize, setEmpPageSize] = useState(10);



  // Action & View modal states

  const [selectedExpense, setSelectedExpense] = useState(null);

  const [modalAction, setModalAction] = useState(null); // 'ACCEPT' or 'SEND_TO_ADMIN'

  const [comments, setComments] = useState('');

  const [submittingAction, setSubmittingAction] = useState(false);



  const notify = (type, text) => {

    setNotification({ type, text });

    setTimeout(() => setNotification({ type: '', text: '' }), 5000);

  };



  const loadData = async (accId = null) => {

    setLoading(true);

    try {

      const targetAccId = accId || selectedAccountId;

      const summaryUrl = targetAccId ? `/dashboard/summary/?account=${targetAccId}` : '/dashboard/summary/';

      const [sumRes, expRes, empRes, catRes, fundRes] = await Promise.all([

        api.get(summaryUrl),

        api.get('/expenses/'),

        api.get('/admin/employees/').catch(() => ({ data: [] })),

        api.get('/categories/').catch(() => ({ data: [] })),

        api.get('/fund-requests/').catch(() => ({ data: [] }))

      ]);

      setSummary(sumRes.data);

      const accList = sumRes.data.all_accounts || (sumRes.data.fund_account ? [sumRes.data.fund_account] : []);

      setAllAccounts(accList);

      if (sumRes.data.fund_account && !selectedAccountId) {

        setSelectedAccountId(sumRes.data.fund_account.id);

      }

      setAllExpenses(expRes.data || []);

      setEmployees(empRes.data || []);

      setCategories(catRes.data || []);

      setFundRequests(fundRes.data || []);

      if (sumRes.data?.last_refresh_str) {

        setLastRefreshText(sumRes.data.last_refresh_str);

      }

    } catch (err) {

      console.error(err);

      notify('error', 'Failed to load checker dashboard data.');

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



  const queue = useMemo(() => {

    const list = allExpenses.filter(e => e.status === 'SUBMITTED');

    if (!queueSortDir) return list;

    list.sort((a, b) => {

      let aVal, bVal;

      switch (queueSortKey) {

        case 'sno':

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

        case 'maker':

          aVal = a.maker_name || '';

          bVal = b.maker_name || '';

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

          aVal = a[queueSortKey] || '';

          bVal = b[queueSortKey] || '';

      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {

        return queueSortDir === 'asc' ? aVal - bVal : bVal - aVal;

      }

      return queueSortDir === 'asc'

        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })

        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });

    });

    return list;

  }, [allExpenses, queueSortKey, queueSortDir]);

  const queueTotalPages = Math.ceil(queue.length / queuePageSize) || 1;

  const paginatedQueue = useMemo(() => {

    const start = (queuePage - 1) * queuePageSize;

    return queue.slice(start, start + queuePageSize);

  }, [queue, queuePage, queuePageSize]);



  const verifiedHistory = useMemo(() => allExpenses.filter(e => e.status !== 'SUBMITTED'), [allExpenses]);

  const fundAccount = summary?.fund_account;



  const openActionModal = (expense, action) => {

    setSelectedExpense(expense);

    setModalAction(action);

    setComments('');

  };



  const closeActionModal = () => {

    setModalAction(null);

    setComments('');

  };


  const handleActionSubmit = async (e) => {

    if (e) e.preventDefault();

    if (!selectedExpense || !modalAction) return;



    if ((modalAction === 'SEND_TO_ADMIN' || modalAction === 'REJECT') && !comments.trim()) {

      notify('error', `A reason/comment is mandatory when ${modalAction === 'REJECT' ? 'rejecting' : 'escalating'}.`);

      return;

    }



    setSubmittingAction(true);

    try {

      await api.post(`/expenses/${selectedExpense.id}/checker-action/`, {

        action: modalAction,

        comments: comments.trim()

      });



      const actionText = modalAction === 'ACCEPT' 

        ? 'Accepted and forwarded to Admin' 

        : modalAction === 'REJECT'

        ? 'Rejected and funds restored to Maker'

        : 'Escalated to Admin with remarks';

      notify('success', `Claim ${selectedExpense.reference_number}: ${actionText}.`);

      closeActionModal();

      setSelectedExpense(null);

      await loadData();

    } catch (err) {

      notify('error', err.response?.data?.comments?.[0] || err.response?.data?.detail || 'Failed to process verification.');

    } finally {

      setSubmittingAction(false);

    }

  };



  // Status Badge Component

  const renderStatusBadge = (status, exp = null) => {

    switch (status) {

      case 'SUBMITTED':

        return (

          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>

            <span className="workman-status-badge status-badge-submitted">

              <span className="status-dot"></span>

              Pending Verification

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



  // Filtered Expenses for the Expenses view

  const filteredExpenses = useMemo(() => {

    return allExpenses.filter(exp => {

      if (searchTerm.trim()) {

        const term = searchTerm.toLowerCase();

        const matchesRef = exp.reference_number?.toLowerCase().includes(term);

        const matchesMaker = exp.maker_name?.toLowerCase().includes(term);

        const matchesPayee = exp.payee?.toLowerCase().includes(term);

        const matchesCat = exp.category?.toLowerCase().includes(term);

        const matchesDesc = exp.description?.toLowerCase().includes(term);

        if (!matchesRef && !matchesMaker && !matchesPayee && !matchesCat && !matchesDesc) return false;

      }

      if (statusFilter !== 'ALL') {

        if (statusFilter === 'PENDING') {

          if (exp.status !== 'SUBMITTED') return false;

        } else if (exp.status !== statusFilter) {

          return false;

        }

      }

      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {

        return false;

      }

      if (dateFrom && exp.expense_date < dateFrom) return false;

      if (dateTo && exp.expense_date > dateTo) return false;

      return true;

    });

  }, [allExpenses, searchTerm, statusFilter, categoryFilter, dateFrom, dateTo]);



  // Sorted & Paginated Expenses

  const sortedExpenses = useMemo(() => {

    const list = [...filteredExpenses];

    list.sort((a, b) => {

      let aVal = a[expSortKey];

      let bVal = b[expSortKey];



      switch (expSortKey) {

        case 'sno':

        case 'id':

          aVal = a.id || 0;

          bVal = b.id || 0;

          break;

        case 'ref':

          aVal = a.reference_number || '';

          bVal = b.reference_number || '';

          break;

        case 'status':

          aVal = a.status || '';

          bVal = b.status || '';

          break;

        case 'date':

          aVal = a.expense_date || '';

          bVal = b.expense_date || '';

          break;

        case 'maker':

          aVal = a.maker_name || a.maker_details?.full_name || '';

          bVal = b.maker_name || b.maker_details?.full_name || '';

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

          return expSortDir === 'asc' ? aVal - bVal : bVal - aVal;

        default:

          aVal = aVal || '';

          bVal = bVal || '';

      }



      if (typeof aVal === 'string' && typeof bVal === 'string') {

        return expSortDir === 'asc'

          ? aVal.localeCompare(bVal, undefined, { numeric: true })

          : bVal.localeCompare(aVal, undefined, { numeric: true });

      }

      return expSortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);

    });

    return list;

  }, [filteredExpenses, expSortKey, expSortDir]);



  const totalEntries = sortedExpenses.length;

  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  const paginatedExpenses = useMemo(() => {

    const start = (currentPage - 1) * pageSize;

    return sortedExpenses.slice(start, start + pageSize);

  }, [sortedExpenses, currentPage, pageSize]);



  // Export CSV

  const exportToCSV = () => {

    if (filteredExpenses.length === 0) {

      notify('error', 'No expenses available to export.');

      return;

    }

    const headers = ['Ref #', 'Date', 'Maker', 'Category', 'Payee', 'Description', 'Amount (INR)', 'Status', 'Checker Review', 'Admin Decision'];

    const rows = filteredExpenses.map(exp => [

      exp.reference_number,

      formatDate(exp.expense_date),

      `"${(exp.maker_name || '').replace(/"/g, '""')}"`,

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

    link.setAttribute('download', `checker_expenses_${new Date().toISOString().split('T')[0]}.csv`);

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



  // Filtered & Sorted Employees

  const filteredEmployees = useMemo(() => {

    return employees.filter(emp => {

      if (employeeSearch.trim()) {

        const term = employeeSearch.toLowerCase();

        const matchesName = emp.full_name?.toLowerCase().includes(term);

        const matchesEmail = emp.email?.toLowerCase().includes(term);

        const matchesId = emp.employee_id?.toLowerCase().includes(term);

        const matchesDept = emp.department?.toLowerCase().includes(term);

        if (!matchesName && !matchesEmail && !matchesId && !matchesDept) return false;

      }

      if (employeeRoleFilter !== 'ALL' && emp.role !== employeeRoleFilter) {

        return false;

      }

      return true;

    });

  }, [employees, employeeSearch, employeeRoleFilter]);



  const sortedEmployees = useMemo(() => {

    const list = [...filteredEmployees];

    list.sort((a, b) => {

      let aVal = a[empSortKey];

      let bVal = b[empSortKey];



      switch (empSortKey) {

        case 'sno':

        case 'id':

          aVal = a.id || 0;

          bVal = b.id || 0;

          break;

        case 'employee_id':

          aVal = a.employee_id || '';

          bVal = b.employee_id || '';

          break;

        case 'full_name':

        case 'name':

          aVal = a.full_name || '';

          bVal = b.full_name || '';

          break;

        case 'email':

          aVal = a.email || '';

          bVal = b.email || '';

          break;

        case 'role':

          aVal = a.role || '';

          bVal = b.role || '';

          break;

        case 'department':

          aVal = a.department || '';

          bVal = b.department || '';

          break;

        case 'designation':

          aVal = a.designation || '';

          bVal = b.designation || '';

          break;

        case 'status':

          aVal = a.is_active ? 1 : 0;

          bVal = b.is_active ? 1 : 0;

          return empSortDir === 'asc' ? aVal - bVal : bVal - aVal;

        default:

          aVal = aVal || '';

          bVal = bVal || '';

      }



      if (typeof aVal === 'string' && typeof bVal === 'string') {

        return empSortDir === 'asc'

          ? aVal.localeCompare(bVal, undefined, { numeric: true })

          : bVal.localeCompare(aVal, undefined, { numeric: true });

      }

      return empSortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);

    });

    return list;

  }, [filteredEmployees, empSortKey, empSortDir]);



  const empTotalPages = Math.ceil(sortedEmployees.length / empPageSize) || 1;

  const paginatedEmployees = useMemo(() => {

    const start = (empPage - 1) * empPageSize;

    return sortedEmployees.slice(start, start + empPageSize);

  }, [sortedEmployees, empPage, empPageSize]);



  // Checker Balance Computation

  const checkerAllocatedFunds = (summary?.funds_allocated ?? user?.allocated_funds) || 0;

  const checkerFundsUsed = (summary?.funds_used ?? user?.funds_used) || 0;

  const checkerAvailableBalance = checkerAllocatedFunds - checkerFundsUsed;



  // Checker Allocation & Fund Request Handlers

  const handleOpenAllocateModal = (emp = null) => {

    setSelectedEmpToAllocate(emp);

    setAllocateAmount('');

    setAllocateNotes('');

    setShowAllocateModal(true);

  };



  const handleSaveAllocation = async (e) => {

    e.preventDefault();

    if (!selectedEmpToAllocate) {

      notify('error', 'Please select a maker employee.');

      return;

    }

    const amt = parseInt(allocateAmount, 10);

    if (isNaN(amt) || amt <= 0) {

      notify('error', 'Please enter a valid allocation amount greater than ₹0.');

      return;

    }

    if (amt > checkerAvailableBalance) {

      notify('error', `Cannot allocate: Amount (₹${amt.toLocaleString('en-IN')}) exceeds your available balance of ₹${checkerAvailableBalance.toLocaleString('en-IN')}.`);

      return;

    }

    setAllocatingFunds(true);

    try {

      await api.post(`/admin/employees/${selectedEmpToAllocate.id}/allocate-funds/`, {

        amount: amt,

        notes: allocateNotes.trim()

      });

      notify('success', `Allocated ₹${amt.toLocaleString('en-IN')} to ${selectedEmpToAllocate.full_name}. Deducted from your balance.`);

      setShowAllocateModal(false);

      setSelectedEmpToAllocate(null);

      setAllocateAmount('');

      setAllocateNotes('');

      await loadData();

    } catch (err) {

      notify('error', err.response?.data?.detail || 'Failed to allocate funds.');

    } finally {

      setAllocatingFunds(false);

    }

  };



  const handleCheckerFundRequest = async (e) => {

    e.preventDefault();

    const amt = parseInt(checkerReqAmount, 10);

    if (isNaN(amt) || amt <= 0) {

      notify('error', 'Please enter a valid requested amount greater than ₹0.');

      return;

    }

    if (!checkerReqReason.trim()) {

      notify('error', 'Please provide a reason or justification for the fund request.');

      return;

    }

    setSubmittingCheckerReq(true);

    try {

      const formData = new FormData();

      formData.append('requested_amount', amt);

      formData.append('reason', checkerReqReason.trim());

      if (checkerReqDoc) formData.append('supporting_document', checkerReqDoc);



      await api.post('/fund-requests/', formData, {

        headers: { 'Content-Type': 'multipart/form-data' }

      });

      notify('success', `Fund request for ₹${amt.toLocaleString('en-IN')} submitted to Admin for approval.`);

      setShowCheckerFundModal(false);

      setCheckerReqAmount('');

      setCheckerReqReason('');

      setCheckerReqDoc(null);

      await loadData();

    } catch (err) {

      notify('error', err.response?.data?.detail || 'Failed to submit fund request.');

    } finally {

      setSubmittingCheckerReq(false);

    }

  };



  const openFundDecision = (req, action) => {

    setFundDecisionModal({ req, action });

    setFundDecisionComments('');

  };



  const handleFundDecisionSubmit = async (e) => {

    e.preventDefault();

    if (!fundDecisionModal) return;

    const { req, action } = fundDecisionModal;

    setSubmittingFundDecision(true);

    try {

      await api.post(`/fund-requests/${req.id}/review/`, {

        action,

        comments: fundDecisionComments.trim()

      });

      const actionLabels = {

        'APPROVE': `Fund request ${req.request_number || req.reference_number} approved! ₹${(req.requested_amount || 0).toLocaleString('en-IN')} credited to ${req.maker_name || 'Maker'}.`,

        'REJECT': `Fund request ${req.request_number || req.reference_number} rejected.`,

        'SEND_TO_ADMIN': `Fund request ${req.request_number || req.reference_number} forwarded to Admin.`

      };

      notify('success', actionLabels[action] || 'Action completed.');

      setFundDecisionModal(null);

      setFundDecisionComments('');

      await loadData();

    } catch (err) {

      notify('error', err.response?.data?.detail || 'Failed to process request action.');

    } finally {

      setSubmittingFundDecision(false);

    }

  };



  // Filtered & Sorted Fund Requests

  const filteredFundRequests = useMemo(() => {

    return fundRequests.filter(req => {

      if (fundReqSearch.trim()) {

        const term = fundReqSearch.toLowerCase();

        const matchesRef = req.request_number?.toLowerCase().includes(term) || req.reference_number?.toLowerCase().includes(term);

        const matchesMaker = req.maker_name?.toLowerCase().includes(term);

        const matchesReason = req.reason?.toLowerCase().includes(term) || req.justification?.toLowerCase().includes(term);

        if (!matchesRef && !matchesMaker && !matchesReason) return false;

      }

      if (fundReqStatusFilter !== 'ALL') {

        if (req.status !== fundReqStatusFilter) return false;

      }

      return true;

    });

  }, [fundRequests, fundReqSearch, fundReqStatusFilter]);



  const sortedFundRequests = useMemo(() => {

    const list = [...filteredFundRequests];

    list.sort((a, b) => {

      let aVal = a[fundReqSortKey];

      let bVal = b[fundReqSortKey];

      if (fundReqSortKey === 'date') {

        aVal = new Date(a.created_at).getTime();

        bVal = new Date(b.created_at).getTime();

      } else if (fundReqSortKey === 'amount') {

        aVal = a.requested_amount || 0;

        bVal = b.requested_amount || 0;

      }

      if (aVal < bVal) return fundReqSortDir === 'asc' ? -1 : 1;

      if (aVal > bVal) return fundReqSortDir === 'asc' ? 1 : -1;

      return 0;

    });

    return list;

  }, [filteredFundRequests, fundReqSortKey, fundReqSortDir]);



  const fundReqTotalPages = Math.ceil(sortedFundRequests.length / fundReqPageSize) || 1;

  const paginatedFundRequests = useMemo(() => {

    const start = (fundReqPage - 1) * fundReqPageSize;

    return sortedFundRequests.slice(start, start + fundReqPageSize);

  }, [sortedFundRequests, fundReqPage, fundReqPageSize]);



    // Checker Hierarchy Employee CRUD Actions (Checkers can create/delete/deactivate Makers)

  const handleCreateEmployee = async (e) => {

    e.preventDefault();

    setEmpFormError('');

    setCreatingEmp(true);

    try {

      const payload = {

        full_name: newEmpFullName.trim(),

        email: newEmpEmail.trim().toLowerCase(),

        role: 'MAKER', // Checkers strictly create Makers

        department: newEmpDepartment.trim(),

        designation: newEmpDesignation.trim(),

        phone: newEmpPhone.trim(),

      };

      if (newEmpPassword.trim()) {

        payload.password = newEmpPassword.trim();

      }



      const res = await api.post('/admin/employees/', payload);

      setShowCreateEmpModal(false);

      setNewEmpFullName('');

      setNewEmpEmail('');

      setNewEmpDepartment('');

      setNewEmpDesignation('');

      setNewEmpPhone('');

      setNewEmpPassword('');

      notify('success', `Employee ${res.data.full_name} created successfully!`);



      if (res.data.temporary_password) {

        setTempPasswordNotice({

          name: res.data.full_name,

          email: res.data.email,

          role: res.data.role,

          employee_id: res.data.employee_id,

          password: res.data.temporary_password,

        });

      }

      loadData();

    } catch (err) {

      const errMsg = err.response?.data?.email?.[0] ||

        err.response?.data?.role?.[0] ||

        err.response?.data?.password?.[0] ||

        err.response?.data?.detail ||

        'Failed to create employee.';

      setEmpFormError(errMsg);

    } finally {

      setCreatingEmp(false);

    }

  };



  const handleToggleActiveEmp = async (emp) => {

    if (emp.role !== 'MAKER') {

      notify('error', 'Checkers can only deactivate or reactivate Maker employees.');

      return;

    }

    const isDeactivating = emp.is_active;

    if (!window.confirm(`Are you sure you want to ${isDeactivating ? 'deactivate' : 'reactivate'} ${emp.full_name}?`)) return;

    try {

      await api.post(`/admin/employees/${emp.id}/toggle-active/`);

      notify('success', `Account ${isDeactivating ? 'deactivated' : 'reactivated'} successfully.`);

      loadData();

    } catch (err) {

      notify('error', err.response?.data?.detail || 'Failed to update employee status.');

    }

  };



  const handleDeleteEmp = async (emp) => {

    if (emp.role !== 'MAKER') {

      notify('error', 'Checkers can only delete Maker employees.');

      return;

    }

    if (!window.confirm(`Are you sure you want to permanently delete ${emp.full_name}? Warning: This cannot be reversed!`)) return;

    try {

      await api.delete(`/admin/employees/${emp.id}/`);

      notify('success', `Employee ${emp.full_name} permanently removed.`);

      loadData();

    } catch (err) {

      notify('error', err.response?.data?.detail || 'Failed to delete employee.');

    }

  };



  return (

    <div className="page-body">

      {/* 1. Header */}

      <div className="page-header" style={{ marginBottom: '1.25rem' }}>

        <div>

          <h1 className="page-title" style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>

            {activeTab === 'dashboard' ? 'Checker Dashboard' :

                          activeTab === 'employees' ? 'Employees Directory' :

             activeTab === 'requests' ? `Fund Requests (${fundRequests.length})` : 'Expenses Verification'}

          </h1>

          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '3px' }}>

            {activeTab === 'dashboard' ? 'Verify submitted petty cash claims and monitor approval queues.' :

                          activeTab === 'employees' ? 'Overview of registered custodians and employees in the system.' :

             activeTab === 'requests' ? 'Review and manage Maker fund replenishment requests.' :

             'Comprehensive audit list of all petty cash claims with verification controls.'}

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

            {activeTab === 'requests' && (

              <>

                <button

                  onClick={() => setShowCheckerFundModal(true)}

                  className="btn btn-secondary btn-sm"

                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}

                >

                  <PlusCircle size={14} />

                  <span>Request Additional Funds</span>

                </button>

                <button

                  onClick={() => handleOpenAllocateModal(null)}

                  className="btn btn-primary btn-sm"

                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}

                >

                  <Wallet size={14} />

                  <span>+ Direct Allocate Funds</span>

                </button>

              </>

            )}

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



      {/* Notification banner */}

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



{/* 2. Shared Petty Cash Fund Account Banner (DASHBOARD ONLY) */}

      {activeTab === 'dashboard' && (

        <>

          <section className="admin-fund-summary">

            <div className="admin-fund-summary-actions" style={{ justifyContent: 'flex-start' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

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

                  <ShieldCheck size={14} />

                  <span>Verify Expenses ({allExpenses.filter(e => e.status === 'SUBMITTED').length} Pending)</span>

                </button>

                <button

                  onClick={() => setShowCheckerFundModal(true)}

                  className="btn btn-secondary"

                  style={{

                    background: '#ffffff',

                    color: '#0284c7',

                    border: '1px solid #bae6fd',

                    padding: '8px 14px',

                    fontSize: '0.825rem',

                    fontWeight: 600,

                    borderRadius: '8px',

                    display: 'inline-flex',

                    alignItems: 'center',

                    gap: '6px'

                  }}

                >

                  <PlusCircle size={14} />

                  <span>Request Additional Funds</span>

                </button>

              </div>

            </div>



            <h2 className="admin-fund-account-title" style={{ textAlign: 'left', margin: '0 0 1rem 0' }}>

              Checker Allocated Budget & Claim Overview

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

                  <p className="admin-balance-card-description">Credit limit allocated to your account by Admin.</p>

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



          {/* 3. Summary Cards: Send to Approval, Pending, Accepted, Total Reviewed */}

          <div className="workman-summary-grid">

            {/* Card 1: Pending Verification */}

            <div className="workman-card card-theme-pending">

              <div className="workman-card-header">

                <span className="workman-card-label">PENDING VERIFICATION</span>

                <div className="workman-card-icon">

                  <Clock size={20} />

                </div>

              </div>

              <div className="workman-card-value">

                {queue.length}

              </div>

              <div className="workman-card-subtext" style={{ color: '#d97706', fontWeight: 500 }}>

                <span>Awaiting your review</span>

              </div>

            </div>



            {/* Card 2: Accepted by Checker */}

            <div className="workman-card card-theme-approved">

              <div className="workman-card-header">

                <span className="workman-card-label">ACCEPTED BY CHECKER</span>

                <div className="workman-card-icon">

                  <CheckCircle2 size={20} />

                </div>

              </div>

              <div className="workman-card-value">

                {summary?.accepted_by_checker_count ?? allExpenses.filter(e => e.checker_action === 'ACCEPT').length}

              </div>

              <div className="workman-card-subtext" style={{ color: '#059669', fontWeight: 500 }}>

                <span>Forwarded to Admin</span>

              </div>

            </div>



            {/* Card 3: Send to Admin / Escalated */}

            <div className="workman-card" style={{ borderTop: '3px solid #f97316' }}>

              <div className="workman-card-header">

                <span className="workman-card-label">SEND TO APPROVAL (ESCALATED)</span>

                <div className="workman-card-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>

                  <Send size={20} />

                </div>

              </div>

              <div className="workman-card-value" style={{ color: '#c2410c' }}>

                {summary?.sent_to_admin_count ?? allExpenses.filter(e => e.checker_action === 'SEND_TO_ADMIN').length}

              </div>

              <div className="workman-card-subtext" style={{ color: '#ea580c', fontWeight: 500 }}>

                <span>Escalated with comments</span>

              </div>

            </div>



            {/* Card 4: Total Claims */}

            <div className="workman-card card-theme-total">

              <div className="workman-card-header">

                <span className="workman-card-label">TOTAL CLAIMS IN SYSTEM</span>

                <div className="workman-card-icon">

                  <ReceiptIndianRupee size={20} />

                </div>

              </div>

              <div className="workman-card-value">

                {allExpenses.length}

              </div>

              <div className="workman-card-subtext">

                <span>Claims across all makers</span>

              </div>

            </div>

          </div>

        </>

      )}



      {/* VIEW 1: DASHBOARD VERIFICATION QUEUE (Scrollable Spaced Table) */}

      {activeTab === 'dashboard' && (

        <div style={{ marginTop: '1rem' }}>

          <div style={{

            background: '#ffffff',

            border: '1px solid #e2e8f0',

            borderRadius: '12px',

            padding: '1rem 1.25rem',

            marginBottom: '1rem',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'space-between',

            flexWrap: 'wrap',

            gap: '0.75rem'

          }}>

            <div>

              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>

                Pending Claims for Verification ({queue.length})

              </h2>

              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>

                Inspect documents and either Accept or Send to Admin with remarks

              </span>

            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>

              <select

                value={queuePageSize}

                onChange={(e) => { setQueuePageSize(Number(e.target.value)); setQueuePage(1); }}

                className="form-input"

                style={{ padding: '3px 8px', fontSize: '0.8rem', width: '70px' }}

              >

                <option value={10}>10</option>

                <option value={25}>25</option>

                <option value={50}>50</option>

                <option value={100}>100</option>

              </select>

            </div>

          </div>



          {loading ? (

            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>

              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />

              <div>Loading verification queue...</div>

            </div>

          ) : queue.length === 0 ? (

            <div style={{

              background: '#ffffff',

              border: '1px solid #e2e8f0',

              borderRadius: '12px',

              padding: '3rem',

              textAlign: 'center',

              color: '#64748b'

            }}>

              <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 12px' }} />

              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>

                All claims verified!

              </div>

              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>

                There are no pending submissions awaiting checker verification at this time.

              </p>

              <button

                onClick={() => setActiveTab('expenses')}

                className="btn btn-secondary btn-sm"

                style={{ marginTop: '1rem' }}

              >

                <span>View All Verified Expenses</span>

              </button>

            </div>

          ) : (

            <>

              <div className="spaced-table-container">

                <table className="spaced-table">

                  <thead>

                    <tr>

                      <TableHeadSortMenu

                        label="SR No."

                        columnKey="sno"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                        width="60px"

                      />

                      <TableHeadSortMenu

                        label="Actions"

                        columnKey="actions"

                        align="center"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                        width="380px"

                        style={{ width: '380px', minWidth: '380px' }}

                      />

                      <TableHeadSortMenu

                        label="Status"

                        columnKey="status"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                        width="180px"

                        style={{ width: '180px', minWidth: '180px' }}

                      />

                      <TableHeadSortMenu

                        label="Expense ID"

                        columnKey="ref"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                      <TableHeadSortMenu

                        label="Date"

                        columnKey="date"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                      <TableHeadSortMenu

                        label="Custodian (Maker)"

                        columnKey="maker"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                      <TableHeadSortMenu

                        label="Category"

                        columnKey="category"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                      <TableHeadSortMenu

                        label="Payee / Merchant"

                        columnKey="payee"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                      <TableHeadSortMenu

                        label="Description"

                        columnKey="desc"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                      <TableHeadSortMenu

                        label="Amount (INR)"

                        columnKey="amount"

                        align="right"

                        sortConfig={{ key: queueSortKey, direction: queueSortDir }}

                        onSort={(key, dir) => {

                          setQueueSortKey(key);

                          setQueueSortDir(dir);

                        }}

                      />

                    </tr>

                  </thead>

                  <tbody>

                    {paginatedQueue.map((exp, idx) => (

                      <tr key={exp.id}>

                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>

                          {(queuePage - 1) * queuePageSize + idx + 1}

                        </td>

                        <td className="table-actions-cell checker-actions-cell">

                          <div className="table-actions-group">

                            {/* View Button */}

                            <button

                              onClick={() => setSelectedExpense(exp)}

                              className="table-btn table-btn-view"

                              title="View claim history and breakdown"

                            >

                              <Eye size={13} />

                              <span className="table-btn-view-text">

                                <span>View</span>

                                <span>More</span>

                              </span>

                            </button>



                            {/* Accept */}

                            <button

                              onClick={() => openActionModal(exp, 'ACCEPT')}

                              className="table-btn table-btn-accept"

                              title="Accept claim and forward to Admin"

                            >

                              <CheckCircle2 size={13} />

                              <span>Accept</span>

                            </button>



                            {/* Reject */}

                            <button

                              onClick={() => openActionModal(exp, 'REJECT')}

                              className="table-btn table-btn-reject"

                              title="Reject claim and restore funds to Maker"

                            >

                              <XCircle size={13} />

                              <span>Reject</span>

                            </button>



                            {/* Send to Admin */}

                            <button

                              onClick={() => openActionModal(exp, 'SEND_TO_ADMIN')}

                              className="table-btn table-btn-send"

                              title="Escalate claim to Admin with remarks"

                            >

                              <Send size={13} />

                              <span>Send to Admin</span>

                            </button>

                          </div>

                        </td>

                        <td>{renderStatusBadge(exp.status, exp)}</td>

                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>

                          {exp.reference_number}

                        </td>

                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(exp.expense_date)}</td>

                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{exp.maker_name || 'Custodian'}</td>

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

                        <td style={{ fontSize: '0.85rem' }}>{exp.payee}</td>

                        <td style={{ maxWidth: '220px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>

                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                            {exp.description}

                          </div>

                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>

                          ₹{exp.amount.toLocaleString('en-IN')}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>



              {/* Pagination Controls */}

              <div style={{

                display: 'flex',

                alignItems: 'center',

                justifyContent: 'space-between',

                marginTop: '1.25rem',

                fontSize: '0.85rem',

                color: '#64748b'

              }}>

                <div>

                  Showing {Math.min((queuePage - 1) * queuePageSize + 1, queue.length)} to {Math.min(queuePage * queuePageSize, queue.length)} of {queue.length} entries

                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                  <button

                    onClick={() => setQueuePage(p => Math.max(1, p - 1))}

                    disabled={queuePage === 1}

                    className="btn btn-secondary btn-sm"

                    style={{ padding: '4px 8px' }}

                  >

                    <ChevronLeft size={16} />

                  </button>

                  <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>

                    {queuePage} / {queueTotalPages}

                  </span>

                  <button

                    onClick={() => setQueuePage(p => Math.min(queueTotalPages, p + 1))}

                    disabled={queuePage === queueTotalPages}

                    className="btn btn-secondary btn-sm"

                    style={{ padding: '4px 8px' }}

                  >

                    <ChevronRight size={16} />

                  </button>

                </div>

              </div>

            </>

          )}

        </div>

      )}



      {/* VIEW 2: ALL EXPENSES (Scrollable Spaced Table with Gaps) */}



      {activeTab === 'expenses' && (

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

              {/* Search */}

              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>

                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />

                <input

                  type="text"

                  placeholder="Search by ref #, maker, payee, description, category..."

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

                  <option value="SUBMITTED">Pending Verification</option>

                  <option value="ACCEPTED_BY_CHECKER">Approved by Checker</option>

                  <option value="SENT_TO_ADMIN">Escalated to Admin</option>

                  <option value="ACCEPTED_BY_ADMIN">Admin Approved</option>

                  <option value="REJECTED_BY_ADMIN">Admin Rejected</option>

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



          {/* Spaced Table with gaps between rows */}

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

              padding: '3rem',

              textAlign: 'center',

              color: '#64748b'

            }}>

              <ReceiptIndianRupee size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />

              <div style={{ fontWeight: 600 }}>No expenses found</div>

              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your search or filters.</p>

            </div>

          ) : (

            <div className="spaced-table-container">

              <table className="spaced-table">

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

                      width="270px"

                      style={{ width: '270px', minWidth: '270px' }}

                    />

                    <TableHeadSortMenu

                      label="Status"

                      columnKey="status"

                      sortConfig={{ key: expSortKey, direction: expSortDir }}

                      onSort={(key, dir) => {

                        setExpSortKey(key);

                        setExpSortDir(dir);

                      }}

                      width="160px"

                      style={{ width: '160px', minWidth: '160px' }}

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

                      label="Custodian (Maker)"

                      columnKey="maker"

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

                        <td className="table-actions-cell checker-actions-cell">

                          <div className="table-actions-group">

                            <button

                              onClick={() => setSelectedExpense(exp)}

                              className="table-btn table-btn-view"

                              title="View claim history and breakdown"

                            >

                              <Eye size={13} />

                              <span className="table-btn-view-text">

                                <span>View</span>

                                <span>More</span>

                              </span>

                            </button>



                            {exp.status === 'SUBMITTED' && (

                              <>

                                <button

                                  onClick={() => openActionModal(exp, 'ACCEPT')}

                                  className="table-btn table-btn-accept"

                                  title="Accept and forward to Admin"

                                >

                                  <CheckCircle2 size={13} />

                                  <span>Accept</span>

                                </button>

                                <button

                                  onClick={() => openActionModal(exp, 'REJECT')}

                                  className="table-btn table-btn-reject"

                                  title="Reject claim and restore funds to Maker"

                                >

                                  <XCircle size={13} />

                                  <span>Reject</span>

                                </button>

                                <button

                                  onClick={() => openActionModal(exp, 'SEND_TO_ADMIN')}

                                  className="table-btn table-btn-send"

                                  title="Escalate to Admin"

                                >

                                  <Send size={13} />

                                  <span>Send to Admin</span>

                                </button>

                              </>

                            )}

                          </div>

                        </td>

                        <td>{renderStatusBadge(exp.status, exp)}</td>

                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>

                          {exp.reference_number}

                        </td>

                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(exp.expense_date)}</td>

                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{exp.maker_name || 'Custodian'}</td>

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

                        <td style={{ fontSize: '0.85rem' }}>{exp.payee}</td>

                        <td style={{ maxWidth: '220px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>

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



          {/* Pagination */}

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



      {/* VIEW 3: EMPLOYEES DIRECTORY (Spaced Card Table) */}

      {activeTab === 'employees' && (

        <div>

          {/* Controls */}

          <div style={{

            background: '#ffffff',

            border: '1px solid #e2e8f0',

            borderRadius: '12px',

            padding: '1rem 1.25rem',

            marginBottom: '1.25rem',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'space-between',

            flexWrap: 'wrap',

            gap: '1rem'

          }}>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>

              <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>

                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />

                <input

                  type="text"

                  placeholder="Search employee name, email, ID..."

                  value={employeeSearch}

                  onChange={(e) => {

                    setEmployeeSearch(e.target.value);

                    setEmpPage(1);

                  }}

                  className="form-input"

                  style={{ paddingLeft: '2.4rem' }}

                />

              </div>



              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Role:</span>

                <select

                  className="form-input"

                  style={{ width: '160px' }}

                  value={employeeRoleFilter}

                  onChange={(e) => {

                    setEmployeeRoleFilter(e.target.value);

                    setEmpPage(1);

                  }}

                >

                  <option value="ALL">All Roles</option>

                  <option value="MAKER">Maker</option>

                  <option value="CHECKER">Checker</option>

                  <option value="ADMIN">Admin</option>

                </select>

              </div>



              {(employeeSearch || employeeRoleFilter !== 'ALL') && (

                <button

                  onClick={() => {

                    setEmployeeSearch('');

                    setEmployeeRoleFilter('ALL');

                    setEmpPage(1);

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



            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>

              <select

                value={empPageSize}

                onChange={(e) => {

                  setEmpPageSize(Number(e.target.value));

                  setEmpPage(1);

                }}

                className="form-input"

                style={{ padding: '3px 8px', fontSize: '0.8rem', width: '70px' }}

              >

                <option value={10}>10</option>

                <option value={25}>25</option>

                <option value={50}>50</option>

                <option value={100}>100</option>

              </select>



              <button

                onClick={() => handleOpenAllocateModal(null)}

                className="btn btn-primary btn-sm"

                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}

              >

                <Wallet size={15} />

                <span>Allocate Funds</span>

              </button>



              <button

                onClick={() => {

                  setEmpFormError('');

                  setShowCreateEmpModal(true);

                }}

                className="btn btn-secondary btn-sm"

                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}

              >

                <UserPlus size={15} />

                <span>Add Employee</span>

              </button>

            </div>

          </div>



          {/* Spaced Table with gaps between rows */}

          <div className="spaced-table-container">

            <table className="spaced-table">

              <thead>

                <tr>

                  <TableHeadSortMenu

                    label="SR No."

                    columnKey="sno"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                    width="60px"

                  />

                  <TableHeadSortMenu

                    label="Actions"

                    columnKey="actions"

                    align="center"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                    width="140px"

                  />

                  <TableHeadSortMenu

                    label="Status"

                    columnKey="status"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Employee ID"

                    columnKey="employee_id"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Employee Name"

                    columnKey="full_name"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Email"

                    columnKey="email"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Role"

                    columnKey="role"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Department"

                    columnKey="department"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Designation"

                    columnKey="designation"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Funds Allocated"

                    columnKey="funds_allocated"

                    align="right"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Funds Used"

                    columnKey="funds_used"

                    align="right"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                  <TableHeadSortMenu

                    label="Funds Remaining"

                    columnKey="funds_remaining"

                    align="right"

                    sortConfig={{ key: empSortKey, direction: empSortDir }}

                    onSort={(key, dir) => {

                      setEmpSortKey(key);

                      setEmpSortDir(dir);

                    }}

                  />

                </tr>

              </thead>

              <tbody>

                {filteredEmployees.length === 0 ? (

                  <tr>

                    <td colSpan="12" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>

                      No employees found matching the filters.

                    </td>

                  </tr>

                ) : (

                  paginatedEmployees.map((emp, idx) => (

                    <tr key={emp.id}>

                      <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>

                        {(empPage - 1) * empPageSize + idx + 1}

                      </td>

                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>

                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>

                          <button

                            onClick={() => navigate(`/admin/employees/${emp.id}`)}

                            className="table-btn table-btn-view"

                            title="View employee profile & receipts"

                          >

                            <Eye size={13} />

                            <span className="table-btn-view-text">

                              <span>View</span>

                              <span>More</span>

                            </span>

                          </button>

                          {emp.role === 'MAKER' && (

                            <button

                              onClick={() => handleOpenAllocateModal(emp)}

                              className="table-btn table-btn-accept"

                              title="Allocate funds to Maker"

                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}

                            >

                              <Wallet size={12} />

                              <span>Allocate</span>

                            </button>

                          )}

                        </div>

                      </td>

                      <td>

                        <span style={{

                          display: 'inline-flex',

                          alignItems: 'center',

                          gap: '4px',

                          fontSize: '0.75rem',

                          fontWeight: 600,

                          color: emp.is_active ? '#16a34a' : '#dc2626'

                        }}>

                          <span style={{

                            width: '6px',

                            height: '6px',

                            borderRadius: '50%',

                            background: emp.is_active ? '#16a34a' : '#dc2626'

                          }}></span>

                          {emp.is_active ? 'Active' : 'Inactive'}

                        </span>

                      </td>

                      <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>

                        {emp.employee_id}

                      </td>

                      <td>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                          <div style={{

                            width: '28px',

                            height: '28px',

                            borderRadius: '50%',

                            background: '#eff6ff',

                            color: '#2563eb',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            fontWeight: 700,

                            fontSize: '0.75rem'

                          }}>

                            {emp.full_name ? emp.full_name[0].toUpperCase() : 'U'}

                          </div>

                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{emp.full_name}</span>

                        </div>

                      </td>

                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{emp.email}</td>

                      <td>

                        <span style={{

                          padding: '3px 8px',

                          borderRadius: '6px',

                          fontSize: '0.75rem',

                          fontWeight: 700,

                          background: emp.role === 'ADMIN' ? '#eff6ff' :

                                      emp.role === 'MAKER' ? '#f0fdf4' : '#faf5ff',

                          color: emp.role === 'ADMIN' ? '#2563eb' :

                                 emp.role === 'MAKER' ? '#16a34a' : '#9333ea'

                        }}>

                          {emp.role}

                        </span>

                      </td>

                      <td style={{ fontSize: '0.85rem' }}>{emp.department || 'General'}</td>

                      <td style={{ fontSize: '0.85rem' }}>{emp.designation || 'Staff'}</td>

                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>

                        ₹{(emp.funds_allocated ?? emp.allocated_funds ?? 0).toLocaleString('en-IN')}

                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }}>

                        ₹{(emp.funds_used ?? 0).toLocaleString('en-IN')}

                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: (emp.funds_remaining ?? 0) < 0 ? '#dc2626' : '#16a34a' }}>

                        {(emp.funds_remaining ?? 0) < 0 ? `-₹${Math.abs(emp.funds_remaining).toLocaleString('en-IN')}` : `₹${(emp.funds_remaining ?? 0).toLocaleString('en-IN')}`}

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>



          {/* Pagination Controls */}

          {filteredEmployees.length > 0 && (

            <div style={{

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between',

              marginTop: '1.25rem',

              fontSize: '0.85rem',

              color: '#64748b'

            }}>

              <div>

                Showing {Math.min((empPage - 1) * empPageSize + 1, filteredEmployees.length)} to {Math.min(empPage * empPageSize, filteredEmployees.length)} of {filteredEmployees.length} entries

              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                <button

                  onClick={() => setEmpPage(p => Math.max(1, p - 1))}

                  disabled={empPage === 1}

                  className="btn btn-secondary btn-sm"

                  style={{ padding: '4px 8px' }}

                >

                  <ChevronLeft size={16} />

                </button>

                <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>

                  {empPage} / {empTotalPages}

                </span>

                <button

                  onClick={() => setEmpPage(p => Math.min(empTotalPages, p + 1))}

                  disabled={empPage === empTotalPages}

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



      {/* VIEW 4: MAKER FUND REQUESTS REVIEW */}

      {activeTab === 'requests' && (

        <div>



          {/* Filters Bar */}

          <div style={{

            background: '#ffffff',

            border: '1px solid #e2e8f0',

            borderRadius: '12px',

            padding: '1.25rem',

            marginBottom: '1.5rem',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'space-between',

            flexWrap: 'wrap',

            gap: '1rem'

          }}>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>

              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>

                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />

                <input

                  type="text"

                  placeholder="Search by request #, maker, reason..."

                  value={fundReqSearch}

                  onChange={(e) => { setFundReqSearch(e.target.value); setFundReqPage(1); }}

                  className="form-input"

                  style={{ paddingLeft: '2.4rem' }}

                />

              </div>



              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>

                <select

                  value={fundReqStatusFilter}

                  onChange={(e) => { setFundReqStatusFilter(e.target.value); setFundReqPage(1); }}

                  className="form-input"

                  style={{ width: '180px' }}

                >

                  <option value="ALL">All Statuses</option>

                  <option value="SUBMITTED">Pending Checker Review</option>

                  <option value="SENT_TO_ADMIN">Sent to Admin</option>

                  <option value="APPROVED">Approved</option>

                  <option value="REJECTED">Rejected</option>

                </select>

              </div>



              {(fundReqSearch || fundReqStatusFilter !== 'ALL') && (

                <button

                  onClick={() => {

                    setFundReqSearch('');

                    setFundReqStatusFilter('ALL');

                    setFundReqPage(1);

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



            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>

              <select

                value={fundReqPageSize}

                onChange={(e) => { setFundReqPageSize(Number(e.target.value)); setFundReqPage(1); }}

                className="form-input"

                style={{ padding: '3px 8px', fontSize: '0.8rem', width: '70px' }}

              >

                <option value={10}>10</option>

                <option value={25}>25</option>

                <option value={50}>50</option>

              </select>

            </div>

          </div>



          {/* Table */}

          {filteredFundRequests.length === 0 ? (

            <div style={{

              background: '#ffffff',

              border: '1px solid #e2e8f0',

              borderRadius: '12px',

              padding: '3rem',

              textAlign: 'center',

              color: '#64748b'

            }}>

              <Clock size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />

              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>

                No fund requests matching current filters.

              </div>

            </div>

          ) : (

            <>

              <div className="spaced-table-container">

                <table className="spaced-table">

                  <thead>

                    <tr>

                      <TableHeadSortMenu

                        label="SR No."

                        columnKey="sno"

                        width="60px"

                      />

                      <TableHeadSortMenu

                        label="Actions"

                        columnKey="actions"

                        align="center"

                        width="270px"

                      />

                      <TableHeadSortMenu

                        label="Status"

                        columnKey="status"

                        width="170px"

                      />

                      <TableHeadSortMenu

                        label="Request #"

                        columnKey="req_num"

                      />

                      <TableHeadSortMenu

                        label="Date"

                        columnKey="date"

                        sortConfig={{ key: fundReqSortKey, direction: fundReqSortDir }}

                        onSort={() => {

                          setFundReqSortKey('date');

                          setFundReqSortDir(d => d === 'asc' ? 'desc' : 'asc');

                        }}

                      />

                      <TableHeadSortMenu

                        label="Maker / Custodian"

                        columnKey="maker"

                      />

                      <TableHeadSortMenu

                        label="Requested Amount"

                        columnKey="amount"

                        align="right"

                        sortConfig={{ key: fundReqSortKey, direction: fundReqSortDir }}

                        onSort={() => {

                          setFundReqSortKey('amount');

                          setFundReqSortDir(d => d === 'asc' ? 'desc' : 'asc');

                        }}

                      />

                      <TableHeadSortMenu

                        label="Reason / Purpose"

                        columnKey="purpose"

                      />

                    </tr>

                  </thead>

                  <tbody>

                    {paginatedFundRequests.map((req, idx) => (

                      <tr key={req.id}>

                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>

                          {(fundReqPage - 1) * fundReqPageSize + idx + 1}

                        </td>

                        <td className="table-actions-cell checker-actions-cell">

                          <div className="table-actions-group">

                            {req.status === 'SUBMITTED' && req.maker !== user?.id && req.maker_id !== user?.id ? (

                              <>

                                <button

                                  onClick={() => openFundDecision(req, 'APPROVE')}

                                  className="table-btn table-btn-accept"

                                  title="Approve request and credit funds to Maker"

                                >

                                  <CheckCircle2 size={13} />

                                  <span>Accept</span>

                                </button>

                                <button

                                  onClick={() => openFundDecision(req, 'REJECT')}

                                  className="table-btn table-btn-reject"

                                  title="Reject request"

                                >

                                  <XCircle size={13} />

                                  <span>Reject</span>

                                </button>

                                <button

                                  onClick={() => openFundDecision(req, 'SEND_TO_ADMIN')}

                                  className="table-btn table-btn-escalate"

                                  title="Forward to Admin for review"

                                  style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}

                                >

                                  <Send size={13} />

                                  <span>Send to Admin</span>

                                </button>

                              </>

                            ) : (

                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>

                                Decision Recorded

                              </span>

                            )}

                          </div>

                        </td>

                        <td>

                          {req.status === 'SUBMITTED' && (

                            <span className="workman-status-badge status-badge-submitted">

                              <span className="status-dot"></span>Pending Checker

                            </span>

                          )}

                          {req.status === 'SENT_TO_ADMIN' && (

                            <span className="workman-status-badge status-badge-sent-admin">

                              <span className="status-dot"></span>Sent to Admin

                            </span>

                          )}

                          {req.status === 'APPROVED' && (

                            <span className="workman-status-badge status-badge-approved">

                              <span className="status-dot"></span>Approved (Credited)

                            </span>

                          )}

                          {req.status === 'REJECTED' && (

                            <span className="workman-status-badge status-badge-rejected">

                              <span className="status-dot"></span>Rejected

                            </span>

                          )}

                        </td>

                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>

                          {req.request_number || req.reference_number || (req.id ? String(10000 + req.id) : '-')}

                        </td>

                        <td style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>

                          {formatDate(req.created_at)}

                        </td>

                        <td style={{ fontWeight: 600, color: '#0f172a' }}>

                          {req.maker_name || req.requested_by_name || 'Maker'}

                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>

                          ₹{(req.requested_amount || 0).toLocaleString('en-IN')}

                        </td>

                        <td style={{ maxWidth: '240px', fontSize: '0.85rem', color: '#475569' }} title={req.reason || req.justification}>

                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>

                            {req.reason || req.justification || '-'}

                          </div>

                          {req.checker_comments && (

                            <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px' }}>

                              Note to Admin: {req.checker_comments}

                            </div>

                          )}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>



              {/* Pagination */}

              {filteredFundRequests.length > 0 && (

                <div style={{

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'space-between',

                  marginTop: '1.25rem',

                  fontSize: '0.85rem',

                  color: '#64748b'

                }}>

                  <div>

                    Showing {Math.min((fundReqPage - 1) * fundReqPageSize + 1, filteredFundRequests.length)} to {Math.min(fundReqPage * fundReqPageSize, filteredFundRequests.length)} of {filteredFundRequests.length} entries

                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                    <button

                      onClick={() => setFundReqPage(p => Math.max(1, p - 1))}

                      disabled={fundReqPage === 1}

                      className="btn btn-secondary btn-sm"

                      style={{ padding: '4px 8px' }}

                    >

                      <ChevronLeft size={16} />

                    </button>

                    <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>

                      {fundReqPage} / {fundReqTotalPages}

                    </span>

                    <button

                      onClick={() => setFundReqPage(p => Math.min(fundReqTotalPages, p + 1))}

                      disabled={fundReqPage === fundReqTotalPages}

                      className="btn btn-secondary btn-sm"

                      style={{ padding: '4px 8px' }}

                    >

                      <ChevronRight size={16} />

                    </button>

                  </div>

                </div>

              )}

            </>

          )}

        </div>

      )}





      {/* ALLOCATE FUNDS MODAL (CHECKER TO MAKER) */}

      {showAllocateModal && (

        <div className="modal-overlay-custom" onClick={() => setShowAllocateModal(false)}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>

            <div style={{

              padding: '1.25rem',

              borderBottom: '1px solid #f1f5f9',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <Wallet size={20} color="#0284c7" />

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>

                  Allocate Funds to Maker

                </h3>

              </div>

              <button

                onClick={() => setShowAllocateModal(false)}

                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleSaveAllocation}>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{

                  background: '#f0f9ff',

                  border: '1px solid #bae6fd',

                  borderRadius: '8px',

                  padding: '10px 12px',

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'center'

                }}>

                  <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>Your Available Balance</span>

                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>

                    ₹{checkerAvailableBalance.toLocaleString('en-IN')}

                  </span>

                </div>



                <div>

                  <label className="form-label">Select Maker Employee *</label>

                  <select

                    className="form-input"

                    value={selectedEmpToAllocate?.id || ''}

                    onChange={(e) => {

                      const emp = employees.find(x => String(x.id) === e.target.value);

                      setSelectedEmpToAllocate(emp || null);

                    }}

                    required

                  >

                    <option value="">-- Choose Maker --</option>

                    {employees.filter(x => x.role === 'MAKER').map(emp => (

                      <option key={emp.id} value={emp.id}>

                        {emp.full_name} ({emp.employee_id}) - Current Limit: ₹{(emp.allocated_funds || 0).toLocaleString('en-IN')}

                      </option>

                    ))}

                  </select>

                </div>



                {selectedEmpToAllocate && (

                  <div style={{

                    fontSize: '0.8rem',

                    color: '#475569',

                    background: '#f8fafc',

                    padding: '8px 10px',

                    borderRadius: '6px',

                    border: '1px solid #e2e8f0'

                  }}>

                    Current Maker Limit: <strong>₹{(selectedEmpToAllocate.allocated_funds || 0).toLocaleString('en-IN')}</strong> • Remaining: <strong>₹{(selectedEmpToAllocate.funds_remaining || 0).toLocaleString('en-IN')}</strong>

                  </div>

                )}



                <div>

                  <label className="form-label">Amount to Allocate (₹) *</label>

                  <input

                    type="number"

                    min="1"

                    max={Math.max(0, checkerAvailableBalance)}

                    step="1"

                    required

                    placeholder="e.g. 5000"

                    value={allocateAmount}

                    onChange={(e) => setAllocateAmount(e.target.value)}

                    className="form-input"

                  />

                  {Number(allocateAmount) > checkerAvailableBalance && (

                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>

                      ⚠️ Amount exceeds your available balance of ₹{checkerAvailableBalance.toLocaleString('en-IN')}. Cannot allocate.

                    </div>

                  )}

                  {Number(allocateAmount) > 0 && Number(allocateAmount) <= checkerAvailableBalance && (

                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>

                      ✓ Deducts ₹{Number(allocateAmount).toLocaleString('en-IN')} from your balance (remaining: ₹{(checkerAvailableBalance - Number(allocateAmount)).toLocaleString('en-IN')}).

                    </div>

                  )}

                </div>



                <div>

                  <label className="form-label">Allocation Notes / Justification</label>

                  <textarea

                    rows="2"

                    placeholder="e.g. Replenishment for project supplies..."

                    value={allocateNotes}

                    onChange={(e) => setAllocateNotes(e.target.value)}

                    className="form-input"

                  />

                </div>

              </div>



              <div style={{

                padding: '1rem 1.25rem',

                borderTop: '1px solid #f1f5f9',

                display: 'flex',

                justifyContent: 'flex-end',

                gap: '8px',

                background: '#f8fafc'

              }}>

                <button

                  type="button"

                  onClick={() => setShowAllocateModal(false)}

                  className="btn btn-secondary btn-sm"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={allocatingFunds || !selectedEmpToAllocate || Number(allocateAmount) <= 0 || Number(allocateAmount) > checkerAvailableBalance}

                  className="btn btn-primary btn-sm"

                  style={{

                    background: (Number(allocateAmount) > checkerAvailableBalance || Number(allocateAmount) <= 0) ? '#94a3b8' : '#0284c7',

                    borderColor: (Number(allocateAmount) > checkerAvailableBalance || Number(allocateAmount) <= 0) ? '#94a3b8' : '#0284c7'

                  }}

                >

                  {allocatingFunds ? 'Allocating...' : 'Allocate Funds'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* FUND REQUEST DECISION MODAL (ACCEPT / REJECT / SEND TO ADMIN) */}

      {fundDecisionModal && (

        <div className="modal-overlay-custom" onClick={() => setFundDecisionModal(null)}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>

            <div style={{

              padding: '1.25rem',

              borderBottom: '1px solid #f1f5f9',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                {fundDecisionModal.action === 'APPROVE' && <CheckCircle2 size={20} color="#16a34a" />}

                {fundDecisionModal.action === 'REJECT' && <XCircle size={20} color="#dc2626" />}

                {fundDecisionModal.action === 'SEND_TO_ADMIN' && <Send size={20} color="#7c3aed" />}

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>

                  {fundDecisionModal.action === 'APPROVE' && 'Approve Fund Request'}

                  {fundDecisionModal.action === 'REJECT' && 'Reject Fund Request'}

                  {fundDecisionModal.action === 'SEND_TO_ADMIN' && 'Forward Request to Admin'}

                </h3>

              </div>

              <button

                onClick={() => setFundDecisionModal(null)}

                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleFundDecisionSubmit}>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{

                  background: '#f8fafc',

                  border: '1px solid #e2e8f0',

                  borderRadius: '8px',

                  padding: '12px'

                }}>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Request Details:</div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>

                    {fundDecisionModal.req.request_number || fundDecisionModal.req.reference_number} • ₹{(fundDecisionModal.req.requested_amount || 0).toLocaleString('en-IN')}

                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>

                    Maker: <strong>{fundDecisionModal.req.maker_name || 'Maker'}</strong>

                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>

                    Reason: {fundDecisionModal.req.reason || fundDecisionModal.req.justification}

                  </div>

                </div>



                {fundDecisionModal.action === 'APPROVE' && (

                  <p style={{ fontSize: '0.85rem', color: '#16a34a', margin: 0, fontWeight: 500 }}>

                    Approving this request will credit <strong>₹{(fundDecisionModal.req.requested_amount || 0).toLocaleString('en-IN')}</strong> directly to the Maker's fund balance.

                  </p>

                )}



                {fundDecisionModal.action === 'SEND_TO_ADMIN' && (

                  <p style={{ fontSize: '0.85rem', color: '#7c3aed', margin: 0, fontWeight: 500 }}>

                    This request will be escalated to Admin for final approval or rejection.

                  </p>

                )}



                <div>

                  <label className="form-label">

                    {fundDecisionModal.action === 'REJECT' ? 'Rejection Reason *' : 'Review Notes / Comments'}

                  </label>

                  <textarea

                    rows="3"

                    required={fundDecisionModal.action === 'REJECT'}

                    placeholder={

                      fundDecisionModal.action === 'REJECT'

                        ? 'Explain why this request is being rejected...'

                        : fundDecisionModal.action === 'SEND_TO_ADMIN'

                        ? 'Add note/recommendation for Admin review...'

                        : 'Optional comments for maker...'

                    }

                    value={fundDecisionComments}

                    onChange={(e) => setFundDecisionComments(e.target.value)}

                    className="form-input"

                  />

                </div>

              </div>



              <div style={{

                padding: '1rem 1.25rem',

                borderTop: '1px solid #f1f5f9',

                display: 'flex',

                justifyContent: 'flex-end',

                gap: '8px',

                background: '#f8fafc'

              }}>

                <button

                  type="button"

                  onClick={() => setFundDecisionModal(null)}

                  className="btn btn-secondary btn-sm"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={submittingFundDecision}

                  className="btn btn-primary btn-sm"

                  style={{

                    background:

                      fundDecisionModal.action === 'APPROVE' ? '#16a34a' :

                      fundDecisionModal.action === 'REJECT' ? '#dc2626' : '#7c3aed',

                    borderColor:

                      fundDecisionModal.action === 'APPROVE' ? '#16a34a' :

                      fundDecisionModal.action === 'REJECT' ? '#dc2626' : '#7c3aed'

                  }}

                >

                  {submittingFundDecision ? 'Processing...' : (

                    fundDecisionModal.action === 'APPROVE' ? 'Confirm Approval' :

                    fundDecisionModal.action === 'REJECT' ? 'Confirm Rejection' : 'Forward to Admin'

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}





      {/* 5. CHECKER ACTION MODAL (ACCEPT / REJECT / SEND TO ADMIN) */}

      {modalAction && selectedExpense && (

        <div className="modal-overlay-custom" onClick={closeActionModal}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>

            <div style={{

              padding: '1.25rem',

              borderBottom: '1px solid #f1f5f9',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                {modalAction === 'ACCEPT' && <CheckCircle2 size={20} color="#16a34a" />}

                {modalAction === 'REJECT' && <XCircle size={20} color="#dc2626" />}

                {modalAction === 'SEND_TO_ADMIN' && <Send size={20} color="#7c3aed" />}

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>

                  {modalAction === 'ACCEPT' && 'Accept Expense Claim'}

                  {modalAction === 'REJECT' && 'Reject Expense Claim'}

                  {modalAction === 'SEND_TO_ADMIN' && 'Send Expense to Admin'}

                </h3>

              </div>

              <button

                onClick={closeActionModal}

                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleActionSubmit}>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{

                  background: '#f8fafc',

                  border: '1px solid #e2e8f0',

                  borderRadius: '8px',

                  padding: '12px'

                }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>

                      {selectedExpense.reference_number}

                    </span>

                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>

                      ₹{selectedExpense.amount?.toLocaleString('en-IN')}

                    </span>

                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>

                    Maker: <strong>{selectedExpense.maker_name || 'Maker'}</strong> • {selectedExpense.category}

                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>

                    Payee: {selectedExpense.payee}

                  </div>

                </div>



                {modalAction === 'ACCEPT' && (

                  <p style={{ fontSize: '0.85rem', color: '#16a34a', margin: 0, fontWeight: 500 }}>

                    Accepting this claim marks it as verified by Checker and posts it to the ledger.

                  </p>

                )}



                {modalAction === 'REJECT' && (

                  <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: 0, fontWeight: 500 }}>

                    Rejecting this claim will restore the reserved funds back to the Maker's balance.

                  </p>

                )}



                {modalAction === 'SEND_TO_ADMIN' && (

                  <p style={{ fontSize: '0.85rem', color: '#7c3aed', margin: 0, fontWeight: 500 }}>

                    Escalating this claim forwards it to Admin for decision review.

                  </p>

                )}



                <div>

                  <label className="form-label">

                    {modalAction === 'ACCEPT' ? 'Verification Remarks (Optional)' : 'Reason / Justification *'}

                  </label>

                  <textarea

                    rows="3"

                    required={modalAction !== 'ACCEPT'}

                    placeholder={

                      modalAction === 'REJECT'

                        ? 'Explain why this expense is rejected...'

                        : modalAction === 'SEND_TO_ADMIN'

                        ? 'Add note/reason for Admin review...'

                        : 'Optional comments...'

                    }

                    value={comments}

                    onChange={(e) => setComments(e.target.value)}

                    className="form-input"

                  />

                </div>

              </div>



              <div style={{

                padding: '1rem 1.25rem',

                borderTop: '1px solid #f1f5f9',

                display: 'flex',

                justifyContent: 'flex-end',

                gap: '8px',

                background: '#f8fafc'

              }}>

                <button

                  type="button"

                  onClick={closeActionModal}

                  className="btn btn-secondary btn-sm"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={submittingAction}

                  className="btn btn-primary btn-sm"

                  style={{

                    background:

                      modalAction === 'ACCEPT' ? '#16a34a' :

                      modalAction === 'REJECT' ? '#dc2626' : '#7c3aed',

                    borderColor:

                      modalAction === 'ACCEPT' ? '#16a34a' :

                      modalAction === 'REJECT' ? '#dc2626' : '#7c3aed'

                  }}

                >

                  {submittingAction ? 'Processing...' : (

                    modalAction === 'ACCEPT' ? 'Confirm Accept' :

                    modalAction === 'REJECT' ? 'Confirm Rejection' : 'Send to Admin'

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* 6. EXPENSE DETAILS VIEW MODAL */}

      {selectedExpense && !modalAction && (

        <div className="modal-overlay-custom" onClick={() => setSelectedExpense(null)}>

          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>

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



            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

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

                    ₹{selectedExpense.amount?.toLocaleString('en-IN')}

                  </div>

                </div>

                <div style={{ textAlign: 'right' }}>

                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date of Expense</div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>

                    {formatDate(selectedExpense.expense_date)}

                  </div>

                </div>

              </div>



              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                <div>

                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Maker / Custodian:</span>

                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedExpense.maker_name || 'Maker'}</div>

                </div>

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



              <div>

                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Supporting Document / Receipt:</span>

                <div style={{ marginTop: '8px' }}>

                  {selectedExpense.supporting_document || selectedExpense.document_url ? (

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

                            Document attached by {selectedExpense.maker_name || 'Maker'}

                          </div>

                        </div>

                      </div>

                      <a

                        href={selectedExpense.supporting_document || selectedExpense.document_url}

                        target="_blank"

                        rel="noopener noreferrer"

                        className="btn btn-secondary btn-sm"

                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}

                      >

                        <ExternalLink size={14} />

                        <span>View / Download</span>

                      </a>

                    </div>

                  ) : (

                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>

                      No supporting receipt uploaded.

                    </div>

                  )}

                </div>

              </div>

            </div>



            <div style={{

              padding: '1rem 1.5rem',

              borderTop: '1px solid #f1f5f9',

              background: '#f8fafc',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}>

              <div>

                {selectedExpense.status === 'SUBMITTED' && (

                  <div style={{ display: 'flex', gap: '8px' }}>

                    <button

                      onClick={() => openActionModal(selectedExpense, 'ACCEPT')}

                      className="table-btn table-btn-accept"

                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}

                    >

                      <CheckCircle2 size={14} />

                      <span>Accept</span>

                    </button>

                    <button

                      onClick={() => openActionModal(selectedExpense, 'REJECT')}

                      className="table-btn table-btn-reject"

                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}

                    >

                      <XCircle size={14} />

                      <span>Reject</span>

                    </button>

                    <button

                      onClick={() => openActionModal(selectedExpense, 'SEND_TO_ADMIN')}

                      className="table-btn table-btn-send"

                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}

                    >

                      <Send size={14} />

                      <span>Send to Admin</span>

                    </button>

                  </div>

                )}

              </div>

              <button

                type="button"

                onClick={() => setSelectedExpense(null)}

                className="btn btn-secondary btn-sm"

              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}



      {/* 7. CHECKER REQUEST ADDITIONAL FUNDS MODAL */}

      {showCheckerFundModal && (

        <div className="modal-overlay-custom" onClick={() => setShowCheckerFundModal(false)}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>

            <div style={{

              padding: '1.25rem',

              borderBottom: '1px solid #f1f5f9',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'space-between'

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <Wallet size={20} color="#2563eb" />

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>

                  Request Additional Funds

                </h3>

              </div>

              <button

                onClick={() => setShowCheckerFundModal(false)}

                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}

              >

                <X size={18} />

              </button>

            </div>



            <form onSubmit={handleCheckerFundRequest}>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{

                  background: '#f0f9ff',

                  border: '1px solid #bae6fd',

                  borderRadius: '8px',

                  padding: '10px 12px',

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'center'

                }}>

                  <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>Current Available Balance</span>

                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>

                    ₹{checkerAvailableBalance.toLocaleString('en-IN')}

                  </span>

                </div>



                <div>

                  <label className="form-label">Requested Amount (₹) *</label>

                  <input

                    type="number"

                    min="1"

                    step="1"

                    required

                    placeholder="e.g. 50000"

                    value={checkerReqAmount}

                    onChange={(e) => setCheckerReqAmount(e.target.value)}

                    className="form-input"

                  />

                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>

                    Enter whole INR amount needed from Admin replenishment.

                  </div>

                </div>



                <div>

                  <label className="form-label">Reason / Justification *</label>

                  <textarea

                    rows="3"

                    required

                    placeholder="Explain why additional funds are required..."

                    value={checkerReqReason}

                    onChange={(e) => setCheckerReqReason(e.target.value)}

                    className="form-input"

                  />

                </div>



                <div>

                  <label className="form-label">Supporting Document (Optional PDF or Image)</label>

                  <input

                    type="file"

                    accept=".pdf,.png,.jpg,.jpeg"

                    onChange={(e) => setCheckerReqDoc(e.target.files[0] || null)}

                    className="form-input"

                    style={{ fontSize: '0.8rem' }}

                  />

                </div>

              </div>



              <div style={{

                padding: '1rem 1.25rem',

                borderTop: '1px solid #f1f5f9',

                display: 'flex',

                justifyContent: 'flex-end',

                gap: '8px',

                background: '#f8fafc'

              }}>

                <button

                  type="button"

                  onClick={() => setShowCheckerFundModal(false)}

                  className="btn btn-secondary btn-sm"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={submittingCheckerReq}

                  className="btn btn-primary btn-sm"

                >

                  {submittingCheckerReq ? 'Submitting...' : 'Submit Request'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}

