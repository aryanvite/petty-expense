import { createPortal } from 'react-dom';
import React, { useState, useEffect, useMemo } from 'react';

import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

import api, { getMediaUrl, formatDate, formatDateTime, fetchDepartments, createDepartment } from '../api';

import { useAuth } from '../context/AuthContext';
import TableHeadSortMenu from '../components/TableHeadSortMenu';
import SearchableDropdown from '../components/SearchableDropdown';
import GoogleSpinner, { LoadingScreen } from '../components/GoogleSpinner';
import SubmitExpenseModal from '../components/SubmitExpenseModal';

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

  Upload,

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

  Copy,

  History,

  Store,

  Tags,

  Building,

  AlertTriangle,

  Calendar,
  Bell

} from 'lucide-react';



export default function CheckerDashboard() {

  const navigate = useNavigate();
  const location = useLocation();

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

  const [allocateDate, setAllocateDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocateVoucherNumber, setAllocateVoucherNumber] = useState('');
  const [allocatePaymentType, setAllocatePaymentType] = useState('Cash');
  const [allocateOtherPaymentType, setAllocateOtherPaymentType] = useState('');
  const [allocateDescription, setAllocateDescription] = useState('');

  const [allocatingFunds, setAllocatingFunds] = useState(false);

  // Fund Breakdown Modal for Checker
  const [fundModalType, setFundModalType] = useState(null); // 'allocated' | 'used' | 'remaining' | null
  const [fundModalSearch, setFundModalSearch] = useState('');
  const [fundModalRoleFilter, setFundModalRoleFilter] = useState('ALL'); // 'ALL' | 'MAKER' | 'CHECKER'
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Checker Self-Filed Claims & Financial History states
  const [myExpenseClaims, setMyExpenseClaims] = useState([]);
  const [checkerAllocations, setCheckerAllocations] = useState([]);
  const [selectedAlcDetails, setSelectedAlcDetails] = useState(null);
  const [historySubTab, setHistorySubTab] = useState('all'); // 'all', 'claims', 'allocations'
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historySortKey, setHistorySortKey] = useState('date');
  const [historySortDir, setHistorySortDir] = useState('desc');

  // Checker My Expenses states
  const [myExpSearch, setMyExpSearch] = useState('');
  const [myExpStatusFilter, setMyExpStatusFilter] = useState('ALL');
  const [myExpCategoryFilter, setMyExpCategoryFilter] = useState('ALL');
  const [myExpDateFrom, setMyExpDateFrom] = useState('');
  const [myExpDateTo, setMyExpDateTo] = useState('');
  const [myExpPage, setMyExpPage] = useState(1);
  const [myExpPageSize, setMyExpPageSize] = useState(10);
  const [myExpSortKey, setMyExpSortKey] = useState('date');
  const [myExpSortDir, setMyExpSortDir] = useState('desc');

  // Notifications state for Checker
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`read_notifs_${user?.id}`) || '[]');
    } catch {
      return [];
    }
  });



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
  const [makerFilter, setMakerFilter] = useState('ALL');
  const [dashboardSubTab, setDashboardSubTab] = useState('all_makers'); // 'all_makers' | 'pending'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const uniqueMakers = useMemo(() => {
    const map = new Map();
    allExpenses.forEach(exp => {
      if (exp.maker && exp.maker_name) {
        map.set(String(exp.maker), {
          id: String(exp.maker),
          name: exp.maker_name,
          department: exp.maker_department || ''
        });
      }
    });
    employees.filter(e => e.role === 'MAKER').forEach(emp => {
      if (!map.has(String(emp.id))) {
        map.set(String(emp.id), {
          id: String(emp.id),
          name: emp.full_name || emp.username,
          department: emp.department || ''
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allExpenses, employees]);

  const makerFilterOptions = useMemo(() => [
    { value: 'ALL', label: 'All Makers' },
    ...uniqueMakers.map(m => ({
      value: m.id,
      label: m.department ? `${m.name} (${m.department})` : m.name
    }))
  ], [uniqueMakers]);



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



  const loadDashboardData = async (accId = null) => {
    try {
      const targetAccId = accId || selectedAccountId;
      const summaryUrl = targetAccId ? `/dashboard/summary/?account=${targetAccId}` : '/dashboard/summary/';
      const [sumRes, expRes, empRes] = await Promise.all([
        api.get(summaryUrl).catch(() => ({ data: {} })),
        api.get('/expenses/').catch(() => ({ data: [] })),
        api.get('/admin/employees/').catch(() => ({ data: [] }))
      ]);

      setSummary(sumRes.data || {});
      const accList = sumRes.data?.all_accounts || (sumRes.data?.fund_account ? [sumRes.data.fund_account] : []);
      setAllAccounts(accList);
      if (sumRes.data?.fund_account && !selectedAccountId) {
        setSelectedAccountId(sumRes.data.fund_account.id);
      }

      setAllExpenses(expRes.data || []);
      setEmployees(empRes.data || []);
      if (sumRes.data?.last_refresh_str) {
        setLastRefreshText(sumRes.data.last_refresh_str);
      }
    } catch (err) {
      console.error('Failed to load checker dashboard data:', err);
    }
  };

  const loadExpensesData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses/').catch(() => ({ data: [] })),
        categories.length === 0 ? api.get('/categories/').catch(() => ({ data: [] })) : Promise.resolve({ data: categories })
      ]);
      setAllExpenses(expRes.data || []);
      if (categories.length === 0 && catRes?.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load checker expenses:', err);
    }
  };

  const loadMyExpensesData = async () => {
    try {
      const [myClaimsRes, catRes] = await Promise.all([
        api.get('/expenses/?scope=my_claims').catch(() => ({ data: [] })),
        categories.length === 0 ? api.get('/categories/').catch(() => ({ data: [] })) : Promise.resolve({ data: categories })
      ]);
      setMyExpenseClaims(myClaimsRes.data || []);
      if (categories.length === 0 && catRes?.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load my expenses:', err);
    }
  };

  const loadEmployeesData = async () => {
    try {
      const empRes = await api.get('/admin/employees/').catch(() => ({ data: [] }));
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadRequestsData = async () => {
    try {
      const fundRes = await api.get('/fund-requests/').catch(() => ({ data: [] }));
      setFundRequests(fundRes.data || []);
    } catch (err) {
      console.error('Failed to load fund requests:', err);
    }
  };

  const loadHistoryData = async () => {
    try {
      const [alcRes, myClaimsRes] = await Promise.all([
        api.get('/allocations/').catch(() => ({ data: [] })),
        myExpenseClaims.length === 0 ? api.get('/expenses/?scope=my_claims').catch(() => ({ data: [] })) : Promise.resolve({ data: myExpenseClaims })
      ]);
      setCheckerAllocations(alcRes.data || []);
      if (myExpenseClaims.length === 0 && myClaimsRes?.data) setMyExpenseClaims(myClaimsRes.data);
    } catch (err) {
      console.error('Failed to load history data:', err);
    }
  };

  const loadTabFeature = async (tab) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'expenses':
          await loadExpensesData();
          break;
        case 'my-expenses':
        case 'my_expenses':
          await loadMyExpensesData();
          break;
        case 'employees':
          await loadEmployeesData();
          break;
        case 'requests':
          await loadRequestsData();
          break;
        case 'history':
          await loadHistoryData();
          break;
        case 'notifications':
          break;
        case 'dashboard':
        default:
          await loadDashboardData();
          break;
      }
    } catch (err) {
      console.error(`Error loading checker tab ${tab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (accId = null) => {
    if (accId) {
      return loadDashboardData(accId);
    }
    return loadTabFeature(activeTab);
  };

  useEffect(() => {
    loadTabFeature(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (fundModalType && employees.length === 0) {
      api.get('/admin/employees/').then(res => {
        setEmployees(res.data || []);
      }).catch(err => console.error('Failed to load employees for fund modal:', err));
    }
  }, [fundModalType, employees.length]);

  useEffect(() => {
    const handleReload = () => loadTabFeature(activeTab);
    window.addEventListener('app:reload-data', handleReload);
    return () => window.removeEventListener('app:reload-data', handleReload);
  }, [activeTab]);



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

  // ==========================================================
  // CHECKER FINANCIAL HISTORY (SELF-FILED EXPENSE CLAIMS & ALLOCATIONS)
  // ==========================================================
  const checkerAllocationsList = useMemo(() => {
    return (checkerAllocations || []).map(a => ({
      id: `alloc-${a.id}`,
      rawId: a.id,
      type: 'ALLOCATION',
      timestamp: new Date(a.allocation_date || a.created_at || 0).getTime(),
      dateFormatted: formatDateTime(a.created_at),
      refNumber: a.voucher_number || a.allocation_number || `ALC-${String(a.id).padStart(4, '0')}`,
      entity: a.allocated_by_name || 'Admin',
      role: a.allocator_role || 'ADMIN',
      category: a.payment_type ? `Allocation (${a.payment_type})` : 'Fund Allocation',
      amount: parseFloat(a.amount || 0),
      balanceAfter: a.recipient_new_balance != null ? parseFloat(a.recipient_new_balance) : null,
      notes: a.description || a.notes || 'Fund credit limit allocation',
      status: 'COMPLETED',
      raw: a
    }));
  }, [checkerAllocations]);

  const checkerClaimsList = useMemo(() => {
    return (myExpenseClaims || []).map(e => ({
      id: `exp-${e.id}`,
      rawId: e.id,
      type: 'EXPENSE',
      timestamp: new Date(e.created_at || e.expense_date || 0).getTime(),
      dateFormatted: formatDateTime(e.created_at || e.expense_date),
      refNumber: e.reference_number || `EXP-${String(e.id).padStart(4, '0')}`,
      entity: e.payee || 'Payee / Merchant',
      role: 'CHECKER',
      category: e.category || 'General',
      amount: parseFloat(e.amount || 0),
      balanceAfter: null,
      notes: e.description || '',
      status: e.status,
      receipt: e.supporting_document,
      raw: e
    }));
  }, [myExpenseClaims]);

  const checkerTotalAllocated = useMemo(() => {
    return (checkerAllocations || [])
      .filter(a => a.allocated_to === user?.id || a.recipient_role === 'CHECKER')
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  }, [checkerAllocations, user]);

  const checkerTotalSpent = useMemo(() => {
    return (myExpenseClaims || [])
      .filter(e => !['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN', 'CANCELLED'].includes(e.status))
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [myExpenseClaims]);

  const filteredCheckerHistory = useMemo(() => {
    let items = [];
    if (historySubTab === 'allocations') {
      items = [...checkerAllocationsList];
    } else if (historySubTab === 'claims' || historySubTab === 'expenses') {
      items = [...checkerClaimsList];
    } else {
      items = [...checkerAllocationsList, ...checkerClaimsList];
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      items = items.filter(it => 
        (it.refNumber || '').toLowerCase().includes(q) ||
        (it.entity || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q) ||
        (it.notes || '').toLowerCase().includes(q) ||
        (it.status || '').toLowerCase().includes(q) ||
        (it.dateFormatted || '').toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      if (historySortKey === 'date') {
        return historySortDir === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      }
      if (historySortKey === 'amount') {
        return historySortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (historySortKey === 'entity') {
        return historySortDir === 'asc' ? (a.entity || '').localeCompare(b.entity || '') : (b.entity || '').localeCompare(a.entity || '');
      }
      return historySortDir === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    });

    return items;
  }, [checkerAllocationsList, checkerClaimsList, historySubTab, historySearch, historySortKey, historySortDir]);

  const paginatedCheckerHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredCheckerHistory.slice(start, start + historyPageSize);
  }, [filteredCheckerHistory, historyPage, historyPageSize]);

  const checkerHistoryTotalPages = Math.ceil(filteredCheckerHistory.length / historyPageSize) || 1;

  // Filter ONLY the logged-in checker's own expenses (never other checkers or makers)
  const checkerPersonalExpenses = useMemo(() => {
    return (myExpenseClaims || []).filter(e => {
      const mId = typeof e.maker === 'object' ? e.maker?.id : e.maker;
      return mId === user?.id || (user?.email && (e.maker?.email === user.email || e.maker_details?.email === user.email));
    });
  }, [myExpenseClaims, user]);

  const filteredMyExpenses = useMemo(() => {
    return checkerPersonalExpenses.filter(e => {
      if (myExpSearch.trim()) {
        const q = myExpSearch.trim().toLowerCase();
        const ref = (e.reference_number || `EXP-${String(e.id).padStart(4, '0')}`).toLowerCase();
        const payee = (e.payee || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        if (!ref.includes(q) && !payee.includes(q) && !desc.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      if (myExpStatusFilter !== 'ALL') {
        if (myExpStatusFilter === 'PENDING') {
          if (!['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status)) return false;
        } else if (e.status !== myExpStatusFilter) {
          return false;
        }
      }
      if (myExpCategoryFilter !== 'ALL') {
        if (e.category !== myExpCategoryFilter) return false;
      }
      if (myExpDateFrom) {
        const d = (e.expense_date || e.created_at || '').substring(0, 10);
        if (d < myExpDateFrom) return false;
      }
      if (myExpDateTo) {
        const d = (e.expense_date || e.created_at || '').substring(0, 10);
        if (d > myExpDateTo) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[myExpSortKey];
      let valB = b[myExpSortKey];
      if (myExpSortKey === 'date') {
        valA = new Date(a.expense_date || a.created_at || 0).getTime();
        valB = new Date(b.expense_date || b.created_at || 0).getTime();
      } else if (myExpSortKey === 'amount') {
        valA = parseFloat(a.amount || 0);
        valB = parseFloat(b.amount || 0);
      } else if (myExpSortKey === 'payee') {
        valA = (a.payee || '').toLowerCase();
        valB = (b.payee || '').toLowerCase();
      } else if (myExpSortKey === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      } else if (myExpSortKey === 'ref') {
        valA = (a.reference_number || '').toLowerCase();
        valB = (b.reference_number || '').toLowerCase();
      }
      if (valA < valB) return myExpSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return myExpSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [checkerPersonalExpenses, myExpSearch, myExpStatusFilter, myExpCategoryFilter, myExpDateFrom, myExpDateTo, myExpSortKey, myExpSortDir]);

  const totalMyExpPages = Math.ceil(filteredMyExpenses.length / myExpPageSize) || 1;
  const paginatedMyExpenses = useMemo(() => {
    const start = (myExpPage - 1) * myExpPageSize;
    return filteredMyExpenses.slice(start, start + myExpPageSize);
  }, [filteredMyExpenses, myExpPage, myExpPageSize]);

  const exportMyExpensesToCSV = () => {
    if (filteredMyExpenses.length === 0) {
      notify('error', 'No expenses available to export.');
      return;
    }
    const headers = ['Ref Number', 'Expense Date', 'Category', 'Payee', 'Description', 'Amount INR', 'Status', 'Admin Decision'];
    const rows = filteredMyExpenses.map(exp => [
      exp.reference_number || `EXP-${exp.id}`,
      exp.expense_date,
      `"${exp.category || ''}"`,
      `"${(exp.payee || '').replace(/"/g, '""')}"`,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount,
      exp.status,
      `"${exp.admin_decision || (exp.status === 'ACCEPTED_BY_ADMIN' ? 'ACCEPT' : exp.status === 'REJECTED_BY_ADMIN' ? 'REJECT' : 'PENDING')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `my_checker_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Notifications Generator
  const notificationsList = useMemo(() => {
    const list = [];

    // 1. Pending claims from makers requiring verification
    (allExpenses || []).forEach(exp => {
      if (exp.status === 'SUBMITTED' && exp.maker?.role === 'MAKER') {
        list.push({
          id: `chk_pend_${exp.id}`,
          title: `New Claim ${exp.reference_number || `EXP-${exp.id}`} Pending Verification`,
          message: `${exp.maker?.full_name || 'Maker'} submitted a claim of ₹${Number(exp.amount || 0).toLocaleString('en-IN')} for ${exp.payee || 'Payee'}.`,
          type: 'warning',
          date: exp.created_at,
          expense: exp,
          tabLink: 'expenses'
        });
      }
    });

    // 2. Checker's own submitted claims decisions by Admin
    (checkerPersonalExpenses || []).forEach(exp => {
      if (exp.status === 'ACCEPTED_BY_ADMIN' || exp.admin_decision === 'ACCEPT') {
        list.push({
          id: `chk_my_acc_${exp.id}`,
          title: `Claim ${exp.reference_number || `EXP-${exp.id}`} Approved by Admin`,
          message: `Admin approved your direct expense claim of ₹${Number(exp.amount || 0).toLocaleString('en-IN')} for ${exp.payee}.`,
          type: 'success',
          date: exp.admin_timestamp || exp.updated_at,
          expense: exp,
          tabLink: 'my-expenses'
        });
      } else if (exp.status === 'REJECTED_BY_ADMIN' || exp.admin_decision === 'REJECT') {
        list.push({
          id: `chk_my_rej_${exp.id}`,
          title: `Claim ${exp.reference_number || `EXP-${exp.id}`} Rejected by Admin`,
          message: `Admin rejected your claim. Reason: "${exp.admin_comments || 'No comments provided'}"`,
          type: 'danger',
          date: exp.admin_timestamp || exp.updated_at,
          expense: exp,
          tabLink: 'my-expenses'
        });
      }
    });

    // 3. Checker's own fund requests
    (fundRequests || []).forEach(req => {
      const isMyReq = (req.maker === user?.id || req.maker?.id === user?.id || req.requester === user?.id);
      if (isMyReq) {
        if (req.status === 'APPROVED' || req.status === 'DISBURSED') {
          list.push({
            id: `chk_fund_acc_${req.id}`,
            title: `Fund Request ${req.request_number || `#${req.id}`} Approved`,
            message: `Admin approved replenishment of ₹${Number(req.approved_amount || req.requested_amount || 0).toLocaleString('en-IN')}.`,
            type: 'success',
            date: req.reviewed_at || req.updated_at,
            tabLink: 'requests'
          });
        } else if (req.status === 'REJECTED') {
          list.push({
            id: `chk_fund_rej_${req.id}`,
            title: `Fund Request ${req.request_number || `#${req.id}`} Rejected`,
            message: `Admin rejected replenishment request: "${req.review_comments || 'Low justification'}"`,
            type: 'danger',
            date: req.reviewed_at || req.updated_at,
            tabLink: 'requests'
          });
        }
      }
    });

    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return list;
  }, [allExpenses, checkerPersonalExpenses, fundRequests, user]);

  const unreadNotifsCount = notificationsList.filter(n => !readNotifications.includes(n.id)).length;

  const markAllNotifsRead = () => {
    const allIds = notificationsList.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem(`read_notifs_${user?.id}`, JSON.stringify(allIds));
    notify('success', 'All notifications marked as read.');
  };

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

      if (makerFilter !== 'ALL' && String(exp.maker) !== String(makerFilter)) {
        return false;
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

  }, [allExpenses, searchTerm, makerFilter, statusFilter, categoryFilter, dateFrom, dateTo]);



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
    setMakerFilter('ALL');
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

  // Modal scroll lock (prevents background body scrolling whenever any modal is open)
  const isAnyCheckerModalOpen = Boolean(
    fundModalType ||
    modalAction ||
    selectedExpense ||
    fundDecisionModal ||
    showAllocateModal ||
    selectedAlcDetails ||
    showCheckerFundModal
  );

  useEffect(() => {
    if (isAnyCheckerModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isAnyCheckerModalOpen]);

  // Total Maker Fund Metrics for Checker Dashboard (All Makers only)
  const allMakers = useMemo(() => {
    return employees.filter(e => e.role === 'MAKER');
  }, [employees]);

  const totalAllocatedMakers = useMemo(() => {
    return allMakers.reduce((sum, e) => sum + (Number(e.allocated_funds) || 0), 0);
  }, [allMakers]);

  const totalUsedMakers = useMemo(() => {
    return allMakers.reduce((sum, e) => sum + (Number(e.funds_used) || 0), 0);
  }, [allMakers]);

  const totalRemainingMakers = useMemo(() => {
    return totalAllocatedMakers - totalUsedMakers;
  }, [totalAllocatedMakers, totalUsedMakers]);

  const staffBalanceBreakdown = useMemo(() => {
    if (!fundModalType) return [];
    // FOR CHECKER: Show ALL MAKERS only
    const staff = employees.filter(e => e.role === 'MAKER');
    const mapped = staff.map(e => {
      const allocated = Number(e.allocated_funds) || 0;
      const used = Number(e.funds_used) || 0;
      const remaining = e.funds_remaining !== undefined ? Number(e.funds_remaining) : (allocated - used);
      return {
        ...e,
        allocated,
        used,
        remaining,
        allocated_funds: allocated,
        total_expense: used,
        remaining_funds: remaining
      };
    });

    let filtered = mapped;

    if (fundModalSearch.trim()) {
      const q = fundModalSearch.toLowerCase();
      filtered = filtered.filter(e =>
        (e.full_name && e.full_name.toLowerCase().includes(q)) ||
        (e.employee_id && e.employee_id.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q)) ||
        (e.designation && e.designation.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q))
      );
    }

    return filtered.sort((a, b) => {
      if (fundModalType === 'allocated') {
        return b.allocated - a.allocated;
      }
      if (fundModalType === 'used') {
        return b.used - a.used;
      }
      if (fundModalType === 'remaining') {
        return b.remaining - a.remaining;
      }
      return 0;
    });
  }, [employees, fundModalType, fundModalSearch]);

  const sortedFundEmployees = staffBalanceBreakdown;

  const handleOpenAllocateModal = (emp = null) => {
    setSelectedEmpToAllocate(emp);
    setAllocateAmount('');
    setAllocateDate(new Date().toISOString().split('T')[0]);
    setAllocateVoucherNumber('');
    setAllocatePaymentType('Cash');
    setAllocateOtherPaymentType('');
    setAllocateDescription('');
    setShowAllocateModal(true);
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    if (!selectedEmpToAllocate) {
      notify('error', 'Please select an employee.');
      return;
    }
    const amt = Number(allocateAmount);
    if (isNaN(amt) || amt <= 0) {
      notify('error', 'Please enter a valid allocation amount greater than ₹0.');
      return;
    }
    if (amt > checkerAvailableBalance) {
      notify('error', `Cannot allocate: Amount (₹${amt.toLocaleString('en-IN')}) exceeds your available balance of ₹${checkerAvailableBalance.toLocaleString('en-IN')}.`);
      return;
    }
    if (!allocateVoucherNumber.trim()) {
      notify('error', 'Voucher Number is mandatory.');
      return;
    }
    if (!allocateDate) {
      notify('error', 'Allocation Date is mandatory.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (allocateDate > today) {
      notify('error', 'Future dates cannot be selected.');
      return;
    }
    if (allocatePaymentType === 'Other' && !allocateOtherPaymentType.trim()) {
      notify('error', 'Please specify the custom payment type.');
      return;
    }
    if (!allocateDescription.trim()) {
      notify('error', 'Description is mandatory.');
      return;
    }

    setAllocatingFunds(true);
    try {
      await api.post(`/admin/employees/${selectedEmpToAllocate.id}/allocate-funds/`, {
        amount: amt,
        voucher_number: allocateVoucherNumber.trim(),
        allocation_date: allocateDate,
        payment_type: allocatePaymentType,
        other_payment_type: allocatePaymentType === 'Other' ? allocateOtherPaymentType.trim() : '',
        description: allocateDescription.trim(),
        notes: allocateDescription.trim()
      });
      notify('success', `Allocated ₹${amt.toLocaleString('en-IN')} to ${selectedEmpToAllocate.full_name}. Deducted from your balance.`);
      setShowAllocateModal(false);
      setSelectedEmpToAllocate(null);
      setAllocateAmount('');
      setAllocateVoucherNumber('');
      setAllocateDescription('');
      setAllocateOtherPaymentType('');
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



  const renderExpensesView = (isDashboard = false) => (
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



              {/* Maker Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Maker:</span>
                <SearchableDropdown
                  value={makerFilter}
                  onChange={(val) => {
                    setMakerFilter(val || 'ALL');
                    setCurrentPage(1);
                  }}
                  options={makerFilterOptions}
                  placeholder="All Makers"
                  searchPlaceholder="Search makers..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '180px' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <SearchableDropdown
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val || 'ALL');
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'SUBMITTED', label: 'Pending Verification' },
                    { value: 'ACCEPTED_BY_CHECKER', label: 'Approved by Checker' },
                    { value: 'SENT_TO_ADMIN', label: 'Escalated to Admin' },
                    { value: 'ACCEPTED_BY_ADMIN', label: 'Admin Approved' },
                    { value: 'REJECTED_BY_ADMIN', label: 'Admin Rejected' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                  placeholder="All Statuses"
                  searchPlaceholder="Search statuses..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '180px' }}
                />
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <SearchableDropdown
                  value={categoryFilter}
                  onChange={(val) => {
                    setCategoryFilter(val || 'ALL');
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...categories.map(c => ({ value: c.name, label: c.name }))
                  ]}
                  placeholder="All Categories"
                  searchPlaceholder="Search categories..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '160px' }}
                />
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



                {(searchTerm || makerFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFrom || dateTo) && (

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
                      label="Amount (INR)"
                      columnKey="amount"
                      align="left"
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
                      label="Description"
                      columnKey="desc"
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
                              <span>View Details</span>
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

                        <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </td>

                        <td style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>{exp.payee}</td>

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

                        <td style={{ maxWidth: '220px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exp.description}
                          </div>
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
  );

  return (

    <div className="page-body">

      {/* 1. Header */}

      <div className="page-header" style={{ marginBottom: '1.25rem' }}>

        <div>

          <h1 className="page-title" style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>

            {activeTab === 'dashboard' ? 'Checker Dashboard' :
             activeTab === 'employees' ? 'Employees Directory' :
             activeTab === 'requests' ? `Fund Requests (${fundRequests.length})` :
             activeTab === 'history' ? 'Checker Financial History' :
             activeTab === 'my-expenses' || activeTab === 'my_expenses' ? 'My Expenses' :
             activeTab === 'notifications' ? 'Notifications' :
             'Expenses Verification'}
          </h1>
          <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '3px' }}>
            {activeTab === 'dashboard' ? 'Verify submitted petty cash claims and monitor approval queues.' :
             activeTab === 'employees' ? 'Overview of registered custodians and employees in the system.' :
             activeTab === 'requests' ? 'Review and manage Maker fund replenishment requests.' :
             activeTab === 'history' ? 'Audit history of funds allocated to your account and complete spending records of expense claims filed by you.' :
             activeTab === 'my-expenses' || activeTab === 'my_expenses' ? 'Complete history of all your submitted petty cash claims.' :
             activeTab === 'notifications' ? 'Real-time updates regarding Maker submissions, Admin approvals, and fund replenishments.' :
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

            {(activeTab === 'history' || activeTab === 'my-expenses' || activeTab === 'my_expenses') && (
              <>
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusCircle size={15} />
                  <span>Submit Expense</span>
                </button>
                <button onClick={loadData} className="btn btn-secondary btn-sm" title="Refresh data">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </>
            )}

            {activeTab === 'notifications' && (
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
                  onClick={() => setShowSubmitModal(true)}
                  className="btn btn-primary"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  <PlusCircle size={15} />
                  <span>Submit Expense</span>
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
              Maker Allocated Budget & Claim Overview
            </h2>

            <div className="admin-balance-card-grid">
              {/* Card 1: Funds Allocated */}
              <article
                className="admin-balance-card admin-balance-available clickable-card"
                onClick={() => { setFundModalType('allocated'); setFundModalSearch(''); }}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFundModalType('allocated');
                    setFundModalSearch('');
                  }
                }}
              >
                <div className="admin-balance-card-icon"><Wallet size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">Funds Allocated (All Makers)</div>
                  <div className="admin-balance-card-value">
                    ₹{totalAllocatedMakers.toLocaleString('en-IN')}
                  </div>
                  <p className="admin-balance-card-description">Total credit limits allocated across all Makers.</p>
                </div>
              </article>

              {/* Card 2: Funds Used */}
              <article
                className="admin-balance-card admin-balance-commitments clickable-card"
                onClick={() => { setFundModalType('used'); setFundModalSearch(''); }}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFundModalType('used');
                    setFundModalSearch('');
                  }
                }}
              >
                <div className="admin-balance-card-icon"><ReceiptIndianRupee size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">Funds Used (All Makers)</div>
                  <div className="admin-balance-card-value">
                    ₹{totalUsedMakers.toLocaleString('en-IN')}
                  </div>
                  <p className="admin-balance-card-description">Total cumulative claims submitted by all Makers.</p>
                </div>
              </article>

              {/* Card 3: Funds Remaining */}
              {(() => {
                const rem = totalRemainingMakers;
                const isDeficit = rem < 0;

                return (
                  <article
                    className={`admin-balance-card ${isDeficit ? 'admin-balance-deficit' : 'admin-balance-ledger'} clickable-card`}
                    onClick={() => { setFundModalType('remaining'); setFundModalSearch(''); }}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setFundModalType('remaining');
                        setFundModalSearch('');
                      }
                    }}
                  >
                    <div className="admin-balance-card-icon"><FileText size={27} /></div>
                    <div className="admin-balance-card-content">
                      <div className="admin-balance-card-label">Funds Remaining (All Makers)</div>
                      <div className="admin-balance-card-value" style={{ color: isDeficit ? '#dc2626' : undefined }}>
                        {isDeficit ? `-₹${Math.abs(rem).toLocaleString('en-IN')}` : `₹${rem.toLocaleString('en-IN')}`}
                        {isDeficit && (
                          <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', fontWeight: 700 }}>
                            DEFICIT
                          </span>
                        )}
                      </div>
                      <p className="admin-balance-card-description">
                        {isDeficit ? 'Makers spending exceeds allocated credit limit.' : 'Remaining balance available across all Makers.'}
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



      {/* VIEW 1: DASHBOARD (ALL MAKERS EXPENSES & VERIFICATION QUEUE) */}

      {activeTab === 'dashboard' && (

        <div style={{ marginTop: '1rem' }}>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setDashboardSubTab('all_makers')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: dashboardSubTab === 'all_makers' ? '#2563eb' : 'transparent',
                    color: dashboardSubTab === 'all_makers' ? '#ffffff' : '#475569',
                    boxShadow: dashboardSubTab === 'all_makers' ? '0 1px 3px rgba(37,99,235,0.2)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Users size={15} />
                  <span>All Makers' Expenses ({allExpenses.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardSubTab('pending')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: dashboardSubTab === 'pending' ? '#2563eb' : 'transparent',
                    color: dashboardSubTab === 'pending' ? '#ffffff' : '#475569',
                    boxShadow: dashboardSubTab === 'pending' ? '0 1px 3px rgba(37,99,235,0.2)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Pending Claims for Verification ({queue.length})</span>
                </button>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {dashboardSubTab === 'all_makers'
                  ? "All expenses filed by Custodians (Makers) across the company"
                  : "Inspect submitted claims and either Accept or Send to Admin with remarks"}
              </span>
            </div>

            {dashboardSubTab === 'pending' && (
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
            )}
          </div>

          {dashboardSubTab === 'all_makers' ? (
            renderExpensesView(true)
          ) : (
            loading ? (

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

                onClick={() => setDashboardSubTab('all_makers')}

                className="btn btn-secondary btn-sm"

                style={{ marginTop: '1rem' }}

              >

                <span>View All Makers' Expenses ({allExpenses.length})</span>
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
                        label="Amount (INR)"
                        columnKey="amount"
                        align="right"
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
                        label="Description"
                        columnKey="desc"
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
                              <span>View Details</span>
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

                        <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </td>

                        <td style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>{exp.payee}</td>

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

                        <td style={{ maxWidth: '220px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exp.description}
                          </div>
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

          )
          )}

        </div>

      )}

{/* VIEW 2: ALL EXPENSES */}

      {activeTab === 'expenses' && (

        <div>
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ReceiptIndianRupee size={24} color="#2563eb" />
              <span>Makers Expenses ({allExpenses.length})</span>
            </h1>
            <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              Complete record of all expenses submitted by Makers, including supporting receipts and verification audits.
            </p>
          </div>
          {renderExpensesView(false)}
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
                            <span>View Details</span>
                          </button>

                          

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

                        align="left"

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

                        <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>

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





      
      {/* VIEW 5: CHECKER FINANCIAL HISTORY (FUNDS ALLOCATED & EXPENSES FILED BY CHECKER) */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
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
                  Funds Allocated (Total)
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                  ₹{checkerTotalAllocated.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                  {checkerAllocationsList.length} credit allocations
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
                <Wallet size={20} />
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
                  Funds Spent (My Claims)
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e11d48', marginTop: '2px' }}>
                  ₹{checkerTotalSpent.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#be123c' }}>
                  {checkerClaimsList.length} expense claims filed
                </span>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fff1f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e11d48'
              }}>
                <ReceiptIndianRupee size={20} />
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
                  Available Balance
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                  ₹{Math.max(0, (user?.allocated_funds || 0) - checkerTotalSpent).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                  Current unspent limit
                </span>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}>
                <CheckCircle2 size={20} />
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
                  Total Transactions
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {checkerAllocationsList.length + checkerClaimsList.length}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  All history events
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
                <History size={20} />
              </div>
            </div>
          </div>

          {/* Table Card Container */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden'
          }}>
            {/* Header Toolbar & Tabs */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => { setHistorySubTab('all'); setHistoryPage(1); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: historySubTab === 'all' ? '#ffffff' : 'transparent',
                    color: historySubTab === 'all' ? '#0f172a' : '#64748b',
                    boxShadow: historySubTab === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  All History ({checkerAllocationsList.length + checkerClaimsList.length})
                </button>
                <button
                  onClick={() => { setHistorySubTab('claims'); setHistoryPage(1); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: historySubTab === 'claims' ? '#ffffff' : 'transparent',
                    color: historySubTab === 'claims' ? '#e11d48' : '#64748b',
                    boxShadow: historySubTab === 'claims' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  My Claims ({checkerClaimsList.length})
                </button>
                <button
                  onClick={() => { setHistorySubTab('allocations'); setHistoryPage(1); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: historySubTab === 'allocations' ? '#ffffff' : 'transparent',
                    color: historySubTab === 'allocations' ? '#16a34a' : '#64748b',
                    boxShadow: historySubTab === 'allocations' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  Funds Received ({checkerAllocationsList.length})
                </button>
              </div>

              {/* Search & Page Size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search payee, ref, notes..."
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                    className="form-input"
                    style={{ paddingLeft: '32px', width: '220px', height: '36px', fontSize: '0.85rem' }}
                  />
                  {historySearch && (
                    <button
                      onClick={() => { setHistorySearch(''); setHistoryPage(1); }}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  value={historyPageSize}
                  onChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1); }}
                  className="form-input"
                  style={{ width: '100px', height: '36px', fontSize: '0.825rem' }}
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="admin-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: '50px', padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>SR No.</th>
                    <th style={{ width: '90px', padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                    <TableHeadSortMenu
                      label="Amount (INR)"
                      currentSort={historySortKey === 'amount' ? historySortDir : null}
                      onSortAsc={() => { setHistorySortKey('amount'); setHistorySortDir('asc'); }}
                      onSortDesc={() => { setHistorySortKey('amount'); setHistorySortDir('desc'); }}
                      onReset={() => { setHistorySortKey('date'); setHistorySortDir('desc'); }}
                    />
                    <TableHeadSortMenu
                      label="Payee / Merchant"
                      currentSort={historySortKey === 'entity' ? historySortDir : null}
                      onSortAsc={() => { setHistorySortKey('entity'); setHistorySortDir('asc'); }}
                      onSortDesc={() => { setHistorySortKey('entity'); setHistorySortDir('desc'); }}
                      onReset={() => { setHistorySortKey('date'); setHistorySortDir('desc'); }}
                    />
                    <th style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Type</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Ref / Voucher #</th>
                    <TableHeadSortMenu
                      label="Date & Time"
                      currentSort={historySortKey === 'date' ? historySortDir : null}
                      onSortAsc={() => { setHistorySortKey('date'); setHistorySortDir('asc'); }}
                      onSortDesc={() => { setHistorySortKey('date'); setHistorySortDir('desc'); }}
                      onReset={() => { setHistorySortKey('date'); setHistorySortDir('desc'); }}
                    />
                    <th style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Category / Purpose</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Status / Balance</th>
                    <th style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>Receipt / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCheckerHistory.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <History size={36} color="#cbd5e1" />
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>No transaction history found</span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Claims you submit and funds allocated to you will appear here with exact dates & times.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCheckerHistory.map((item, idx) => {
                      const isAlloc = item.type === 'ALLOCATION';
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', padding: '10px 12px' }}>
                            {(historyPage - 1) * historyPageSize + idx + 1}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {isAlloc ? (
                              <button
                                onClick={() => setSelectedAlcDetails(item.raw)}
                                className="table-btn table-btn-view"
                                title="View Allocation Details"
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedExpense(item.raw)}
                                className="table-btn table-btn-view"
                                title="View Claim Details"
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.95rem', color: isAlloc ? '#16a34a' : '#e11d48' }}>
                            {isAlloc ? `+₹${item.amount.toLocaleString('en-IN')}` : `-₹${item.amount.toLocaleString('en-IN')}`}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {item.entity}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {isAlloc ? (
                              <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 600 }}>
                                Fund Allocation
                              </span>
                            ) : (
                              <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: 600 }}>
                                Expense Claim
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                            {item.refNumber}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: '#1e293b', fontWeight: 600 }}>
                              <Clock size={13} color="#64748b" />
                              <span>{item.dateFormatted}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '0.825rem', color: '#334155' }}>
                            {item.category}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {isAlloc ? (
                              <span className="badge badge-approved" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                COMPLETED
                              </span>
                            ) : (
                              <span className={`badge badge-${(item.status || '').toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.receipt && (
                                <a
                                  href={getMediaUrl(item.receipt)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  <FileText size={13} />
                                  <span>Receipt</span>
                                </a>
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={item.notes}>
                                {item.notes || '—'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {checkerHistoryTotalPages > 1 && (
              <div style={{
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#ffffff'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Showing {Math.min((historyPage - 1) * historyPageSize + 1, filteredCheckerHistory.length)} to {Math.min(historyPage * historyPageSize, filteredCheckerHistory.length)} of {filteredCheckerHistory.length} entries
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <span style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    {historyPage} / {checkerHistoryTotalPages}
                  </span>
                  <button
                    disabled={historyPage >= checkerHistoryTotalPages}
                    onClick={() => setHistoryPage(p => Math.min(checkerHistoryTotalPages, p + 1))}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 6: CHECKER MY EXPENSES (SHOWS ONLY LOGGED-IN CHECKER'S EXPENSES) */}
      {(activeTab === 'my-expenses' || activeTab === 'my_expenses') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
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
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Claims Filed
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {checkerPersonalExpenses.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Submitted by you
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReceiptIndianRupee size={22} color="#2563eb" />
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
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Approved by Admin
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                  ₹{checkerPersonalExpenses
                    .filter(e => ['ACCEPTED_BY_ADMIN', 'ACCEPTED_BY_CHECKER'].includes(e.status))
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                    .toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>
                  {checkerPersonalExpenses.filter(e => ['ACCEPTED_BY_ADMIN', 'ACCEPTED_BY_CHECKER'].includes(e.status)).length} approved claims
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} color="#16a34a" />
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
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Pending Admin Review
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>
                  ₹{checkerPersonalExpenses
                    .filter(e => ['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status))
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                    .toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px' }}>
                  {checkerPersonalExpenses.filter(e => ['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status)).length} claims awaiting Admin
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color="#d97706" />
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
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Rejected Claims
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
                  ₹{checkerPersonalExpenses
                    .filter(e => ['REJECTED_BY_ADMIN', 'REJECTED_BY_CHECKER'].includes(e.status))
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                    .toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '2px' }}>
                  {checkerPersonalExpenses.filter(e => ['REJECTED_BY_ADMIN', 'REJECTED_BY_CHECKER'].includes(e.status)).length} rejected
                </div>
              </div>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={22} color="#dc2626" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by ref #, payee, description, category..."
                  value={myExpSearch}
                  onChange={(e) => {
                    setMyExpSearch(e.target.value);
                    setMyExpPage(1);
                  }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <SearchableDropdown
                  value={myExpStatusFilter}
                  onChange={(val) => {
                    setMyExpStatusFilter(val || 'ALL');
                    setMyExpPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'PENDING', label: 'All Pending' },
                    { value: 'SENT_TO_ADMIN', label: 'Pending Admin Review' },
                    { value: 'ACCEPTED_BY_ADMIN', label: 'Approved by Admin' },
                    { value: 'REJECTED_BY_ADMIN', label: 'Rejected by Admin' },
                    { value: 'CANCELLED', label: 'Cancelled' }
                  ]}
                  placeholder="All Statuses"
                  searchPlaceholder="Search statuses..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '190px' }}
                />
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <SearchableDropdown
                  value={myExpCategoryFilter}
                  onChange={(val) => {
                    setMyExpCategoryFilter(val || 'ALL');
                    setMyExpPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...categories.map(c => ({ value: c.name, label: c.name }))
                  ]}
                  placeholder="All Categories"
                  searchPlaceholder="Search categories..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '170px' }}
                />
              </div>
            </div>

            {/* Date Filters & Controls */}
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
                    value={myExpDateFrom}
                    onChange={(e) => {
                      setMyExpDateFrom(e.target.value);
                      setMyExpPage(1);
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                    value={myExpDateTo}
                    onChange={(e) => {
                      setMyExpDateTo(e.target.value);
                      setMyExpPage(1);
                    }}
                  />
                </div>

                {(myExpSearch || myExpStatusFilter !== 'ALL' || myExpCategoryFilter !== 'ALL' || myExpDateFrom || myExpDateTo) && (
                  <button
                    onClick={() => {
                      setMyExpSearch('');
                      setMyExpStatusFilter('ALL');
                      setMyExpCategoryFilter('ALL');
                      setMyExpDateFrom('');
                      setMyExpDateTo('');
                      setMyExpPage(1);
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                  <select
                    className="form-input"
                    style={{ padding: '3px 8px', fontSize: '0.8rem', width: '70px' }}
                    value={myExpPageSize}
                    onChange={(e) => {
                      setMyExpPageSize(Number(e.target.value));
                      setMyExpPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  onClick={exportMyExpensesToCSV}
                  className="btn btn-secondary btn-sm"
                  title="Export filtered records to CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {paginatedMyExpenses.length === 0 ? (
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
                {checkerPersonalExpenses.length === 0
                  ? 'You have not submitted any expenses yet. Click "Submit Expense" to file your first claim.'
                  : 'Try clearing your search or filter criteria to see results.'}
              </p>
              {checkerPersonalExpenses.length === 0 && (
                <button
                  onClick={() => setShowSubmitModal(true)}
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
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                      width="60px"
                    />
                    <TableHeadSortMenu
                      label="Actions"
                      columnKey="actions"
                      align="center"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                      width="120px"
                      style={{ width: '120px', minWidth: '120px' }}
                    />
                    <TableHeadSortMenu
                      label="Amount (INR)"
                      columnKey="amount"
                      align="left"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Payee / Merchant"
                      columnKey="payee"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Status"
                      columnKey="status"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Expense ID"
                      columnKey="ref"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Date"
                      columnKey="date"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Category"
                      columnKey="category"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                    <TableHeadSortMenu
                      label="Description"
                      columnKey="desc"
                      sortConfig={{ key: myExpSortKey, direction: myExpSortDir }}
                      onSort={(key, dir) => {
                        setMyExpSortKey(key);
                        setMyExpSortDir(dir);
                      }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginatedMyExpenses.map((exp, idx) => {
                    const rowNum = (myExpPage - 1) * myExpPageSize + idx + 1;
                    return (
                      <tr key={exp.id} className="spaced-row">
                        <td className="spaced-cell" style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {rowNum}
                        </td>
                        <td className="spaced-cell" style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedExpense(exp)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="View Claim Details"
                          >
                            <Eye size={12} />
                            <span>View Details</span>
                          </button>
                        </td>
                        <td className="spaced-cell" style={{ textAlign: 'left', fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                          ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="spaced-cell" style={{ fontWeight: 600, color: '#1e293b' }}>
                          {exp.payee || '—'}
                        </td>
                        <td className="spaced-cell">
                          {exp.status === 'ACCEPTED_BY_ADMIN' ? (
                            <span className="badge badge-accepted" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              ● Admin Approved
                            </span>
                          ) : exp.status === 'REJECTED_BY_ADMIN' ? (
                            <span className="badge badge-rejected" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              ✕ Rejected by Admin
                            </span>
                          ) : exp.status === 'SENT_TO_ADMIN' ? (
                            <span className="badge badge-submitted" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              ⏳ Pending Admin Review
                            </span>
                          ) : exp.status === 'CANCELLED' ? (
                            <span className="badge badge-cancelled" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              Cancelled
                            </span>
                          ) : (
                            <span className="badge badge-submitted" style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {exp.status}
                            </span>
                          )}
                        </td>
                        <td className="spaced-cell" style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>
                          {exp.reference_number || `EXP-${String(exp.id).padStart(4, '0')}`}
                        </td>
                        <td className="spaced-cell" style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatDate(exp.expense_date || exp.created_at)}
                        </td>
                        <td className="spaced-cell">
                          <span style={{
                            display: 'inline-block',
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 500
                          }}>
                            {exp.category || 'General'}
                          </span>
                        </td>
                        <td className="spaced-cell" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.825rem', color: '#475569' }}>
                          {exp.description || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredMyExpenses.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Showing {(myExpPage - 1) * myExpPageSize + 1} to {Math.min(myExpPage * myExpPageSize, filteredMyExpenses.length)} of {filteredMyExpenses.length} entries
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  disabled={myExpPage <= 1}
                  onClick={() => setMyExpPage(p => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  {myExpPage} / {totalMyExpPages}
                </span>
                <button
                  disabled={myExpPage >= totalMyExpPages}
                  onClick={() => setMyExpPage(p => Math.min(totalMyExpPages, p + 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 7: CHECKER NOTIFICATIONS VIEW */}
      {activeTab === 'notifications' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '1.75rem',
          maxWidth: '840px',
          margin: '0 auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Activity & Verification Notifications
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', margin: '4px 0 0 0' }}>
                Real-time updates regarding Maker submissions, Admin approvals, and fund replenishments.
              </p>
            </div>
            {unreadNotifsCount > 0 && (
              <button
                onClick={markAllNotifsRead}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={14} />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>

          {notificationsList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <Bell size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>No notifications yet</div>
              <p style={{ fontSize: '0.85rem', marginTop: '4px', color: '#64748b' }}>
                When Makers submit claims or Admin acts on your expenses, alerts will appear here.
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
                      if (notif.expense) {
                        setSelectedExpense(notif.expense);
                      } else if (notif.tabLink) {
                        setActiveTab(notif.tabLink);
                      }
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
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        marginTop: '4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isRead ? 'transparent' : '#2563eb',
                        flexShrink: 0
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                          {notif.date ? new Date(notif.date).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {notif.expense ? 'View Details >' : 'View >'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALLOCATION DETAILS MODAL (FOR CHECKER) */}
      {selectedAlcDetails && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setSelectedAlcDetails(null)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: 'min(90vh, 740px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#0284c7" />
                Allocation Details • {selectedAlcDetails.allocation_number}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAlcDetails(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Voucher Number:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedAlcDetails.voucher_number || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Payment Type:</span>
                  <span className="badge badge-submitted" style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {selectedAlcDetails.payment_type || 'Cash'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date & Time:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedAlcDetails.allocation_date ? `${selectedAlcDetails.allocation_date} (${formatDateTime(selectedAlcDetails.created_at)})` : formatDateTime(selectedAlcDetails.created_at)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Allocated By:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedAlcDetails.allocated_by_name} ({selectedAlcDetails.allocator_role})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>To Whom:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedAlcDetails.allocated_to_name} ({selectedAlcDetails.allocated_to_employee_id} • {selectedAlcDetails.recipient_role})</strong>
                </div>
                {selectedAlcDetails.allocated_to_department && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Department:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedAlcDetails.allocated_to_department}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Allocated Amount:</span>
                  <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>₹{(selectedAlcDetails.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Recipient Previous Limit:</span>
                  <strong style={{ color: '#475569' }}>₹{(selectedAlcDetails.recipient_previous_balance || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Recipient New Limit:</span>
                  <strong style={{ color: '#0f172a' }}>₹{(selectedAlcDetails.recipient_new_balance || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Description</label>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                  {selectedAlcDetails.description || selectedAlcDetails.notes || 'No description provided.'}
                </div>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button onClick={() => setSelectedAlcDetails(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ALLOCATE FUNDS MODAL (CHECKER TO MAKER) */}

      {showAllocateModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowAllocateModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: 'min(90vh, 740px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="#0284c7" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Allocate Funds to Employee
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllocateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.825rem', color: '#0369a1', fontWeight: 600 }}>Your Available Balance</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0284c7' }}>
                    ₹{checkerAvailableBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* To Whom */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    To Whom (Maker / Checker) *
                  </label>
                  <select
                    className="form-input"
                    value={selectedEmpToAllocate?.id || ''}
                    onChange={(e) => {
                      const found = employees.find(emp => String(emp.id) === e.target.value);
                      setSelectedEmpToAllocate(found || null);
                    }}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.filter(e => e.role === 'MAKER').map(e => (
                      <option key={e.id} value={e.id}>
                        {e.employee_id || `EMP-${e.id}`} - {e.full_name} ({e.role})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmpToAllocate && (
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Current Limit:</span>
                      <strong style={{ color: '#0f172a' }}>₹{(selectedEmpToAllocate.allocated_funds || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Current Used:</span>
                      <strong style={{ color: '#475569' }}>₹{(selectedEmpToAllocate.funds_used || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Current Remaining:</span>
                      <strong style={{ color: (selectedEmpToAllocate.funds_remaining || 0) < 0 ? '#dc2626' : '#16a34a' }}>
                        {(selectedEmpToAllocate.funds_remaining || 0) < 0 ? `-₹${Math.abs(selectedEmpToAllocate.funds_remaining || 0).toLocaleString('en-IN')}` : `₹${(selectedEmpToAllocate.funds_remaining || 0).toLocaleString('en-IN')}`}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Amount to Allocate (₹) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    value={allocateAmount}
                    onChange={(e) => setAllocateAmount(e.target.value)}
                    placeholder="Enter amount, e.g. 5000"
                    required
                  />
                  {Number(allocateAmount) > checkerAvailableBalance && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                      ⚠️ Amount exceeds your available balance of ₹{checkerAvailableBalance.toLocaleString('en-IN')}. Cannot allocate.
                    </div>
                  )}
                  {selectedEmpToAllocate && Number(allocateAmount) > 0 && Number(allocateAmount) <= checkerAvailableBalance && (
                    <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginTop: '4px' }}>
                      New Total Limit: ₹{((selectedEmpToAllocate.allocated_funds || 0) + Number(allocateAmount)).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={allocateDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAllocateDate(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                    Future dates cannot be selected.
                  </div>
                </div>

                {/* Voucher Number */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Voucher Number *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={allocateVoucherNumber}
                    onChange={(e) => setAllocateVoucherNumber(e.target.value)}
                    placeholder="Enter voucher number (e.g., VCH-2026-001)"
                    required
                  />
                </div>

                {/* Type Dropdown */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Type *
                  </label>
                  <select
                    className="form-input"
                    value={allocatePaymentType}
                    onChange={(e) => setAllocatePaymentType(e.target.value)}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* When Others then a new placeholder should display with mandatory */}
                {allocatePaymentType === 'Other' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                      Specify Payment Type *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={allocateOtherPaymentType}
                      onChange={(e) => setAllocateOtherPaymentType(e.target.value)}
                      placeholder="Specify custom payment method (e.g., Cheque, Net Banking, DD)"
                      required
                    />
                  </div>
                )}

                {/* Description mandatory */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Description *
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={allocateDescription}
                    onChange={(e) => setAllocateDescription(e.target.value)}
                    placeholder="Enter mandatory allocation description / reason..."
                    required
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
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
                  disabled={allocatingFunds || !selectedEmpToAllocate || Number(allocateAmount) <= 0 || Number(allocateAmount) > checkerAvailableBalance || !allocateVoucherNumber.trim() || !allocateDescription.trim() || (allocatePaymentType === 'Other' && !allocateOtherPaymentType.trim())}
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: (Number(allocateAmount) > checkerAvailableBalance || Number(allocateAmount) <= 0 || !selectedEmpToAllocate || !allocateVoucherNumber.trim() || !allocateDescription.trim() || (allocatePaymentType === 'Other' && !allocateOtherPaymentType.trim())) ? '#94a3b8' : '#2563eb',
                    borderColor: (Number(allocateAmount) > checkerAvailableBalance || Number(allocateAmount) <= 0 || !selectedEmpToAllocate || !allocateVoucherNumber.trim() || !allocateDescription.trim() || (allocatePaymentType === 'Other' && !allocateOtherPaymentType.trim())) ? '#94a3b8' : '#2563eb'
                  }}
                >
                  <Wallet size={15} />
                  {allocatingFunds ? 'Processing...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* FUND REQUEST DECISION MODAL (ACCEPT / REJECT / SEND TO ADMIN) */}
      {fundDecisionModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setFundDecisionModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.85)',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background:
                    fundDecisionModal.action === 'APPROVE' ? '#ecfdf5' :
                    fundDecisionModal.action === 'REJECT' ? '#fff1f2' : '#f5f3ff',
                  border: `1px solid ${
                    fundDecisionModal.action === 'APPROVE' ? '#a7f3d0' :
                    fundDecisionModal.action === 'REJECT' ? '#fecdd3' : '#ddd6fe'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {fundDecisionModal.action === 'APPROVE' && <CheckCircle2 size={22} color="#059669" />}
                  {fundDecisionModal.action === 'REJECT' && <XCircle size={22} color="#e11d48" />}
                  {fundDecisionModal.action === 'SEND_TO_ADMIN' && <Send size={20} color="#7c3aed" />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, color: '#0f172a', lineHeight: 1.25 }}>
                    {fundDecisionModal.action === 'APPROVE' && 'Approve Fund Request'}
                    {fundDecisionModal.action === 'REJECT' && 'Reject Fund Request'}
                    {fundDecisionModal.action === 'SEND_TO_ADMIN' && 'Forward Request to Admin'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    {fundDecisionModal.action === 'APPROVE' && "Directly credit funds to Maker's balance"}
                    {fundDecisionModal.action === 'REJECT' && "Decline this fund allocation request"}
                    {fundDecisionModal.action === 'SEND_TO_ADMIN' && "Forward to Company Admin for final decision"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFundDecisionModal(null)}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFundDecisionSubmit} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Request Details Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', fontFamily: 'monospace', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'inline-block' }}>
                        {fundDecisionModal.req.request_number || fundDecisionModal.req.reference_number || `REQ-${fundDecisionModal.req.id}`}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserIcon size={14} color="#64748b" />
                        <span>Maker: <strong style={{ color: '#0f172a' }}>{fundDecisionModal.req.maker_name || 'Maker'}</strong></span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Requested Amount
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        ₹{Number(fundDecisionModal.req.requested_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {(fundDecisionModal.req.reason || fundDecisionModal.req.justification) && (
                    <div style={{
                      fontSize: '0.82rem',
                      color: '#475569',
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      lineHeight: 1.45
                    }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Reason: </span>
                      {fundDecisionModal.req.reason || fundDecisionModal.req.justification}
                    </div>
                  )}
                </div>

                {/* Themed Notice Banner */}
                {fundDecisionModal.action === 'APPROVE' && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 500, lineHeight: 1.45 }}>
                      Approving this request will credit <strong>₹{(fundDecisionModal.req.requested_amount || 0).toLocaleString('en-IN')}</strong> directly to the Maker's fund balance.
                    </span>
                  </div>
                )}

                {fundDecisionModal.action === 'REJECT' && (
                  <div style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <AlertTriangle size={16} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#9f1239', fontWeight: 500, lineHeight: 1.45 }}>
                      Rejecting this request will decline the fund allocation.
                    </span>
                  </div>
                )}

                {fundDecisionModal.action === 'SEND_TO_ADMIN' && (
                  <div style={{
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <Send size={16} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#5b21b6', fontWeight: 500, lineHeight: 1.45 }}>
                      This request will be escalated to Admin for final approval or rejection.
                    </span>
                  </div>
                )}

                {/* Reason / Notes Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {fundDecisionModal.action === 'REJECT' ? 'Rejection Reason' : 'Review Notes / Comments'}
                    {fundDecisionModal.action === 'REJECT' ? <span style={{ color: '#e11d48' }}> *</span> : <span style={{ color: '#94a3b8', fontWeight: 400 }}> (Optional)</span>}
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
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      const color = fundDecisionModal.action === 'APPROVE' ? '#10b981' : fundDecisionModal.action === 'REJECT' ? '#f43f5e' : '#8b5cf6';
                      e.target.style.borderColor = color;
                      e.target.style.boxShadow = `0 0 0 3px ${
                        fundDecisionModal.action === 'APPROVE' ? 'rgba(16, 185, 129, 0.15)' :
                        fundDecisionModal.action === 'REJECT' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)'
                      }`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setFundDecisionModal(null)}
                  disabled={submittingFundDecision}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFundDecision}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    border: 'none',
                    cursor: submittingFundDecision ? 'not-allowed' : 'pointer',
                    opacity: submittingFundDecision ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    background:
                      fundDecisionModal.action === 'APPROVE' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
                      fundDecisionModal.action === 'REJECT' ? 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)' :
                      'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                    boxShadow:
                      fundDecisionModal.action === 'APPROVE' ? '0 4px 12px rgba(16, 185, 129, 0.3)' :
                      fundDecisionModal.action === 'REJECT' ? '0 4px 12px rgba(225, 29, 72, 0.3)' :
                      '0 4px 12px rgba(124, 58, 237, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {submittingFundDecision ? (
                    <>
                      <RefreshCw size={15} className="spin-icon" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {fundDecisionModal.action === 'APPROVE' && <CheckCircle2 size={16} />}
                      {fundDecisionModal.action === 'REJECT' && <XCircle size={16} />}
                      {fundDecisionModal.action === 'SEND_TO_ADMIN' && <Send size={16} />}
                      <span>
                        {fundDecisionModal.action === 'APPROVE' ? 'Confirm Approval' :
                         fundDecisionModal.action === 'REJECT' ? 'Confirm Rejection' : 'Forward to Admin'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 5. CHECKER ACTION MODAL (ACCEPT / REJECT / SEND TO ADMIN) */}
      {modalAction && selectedExpense && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={closeActionModal}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.85)',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background:
                    modalAction === 'ACCEPT' ? '#ecfdf5' :
                    modalAction === 'REJECT' ? '#fff1f2' : '#f5f3ff',
                  border: `1px solid ${
                    modalAction === 'ACCEPT' ? '#a7f3d0' :
                    modalAction === 'REJECT' ? '#fecdd3' : '#ddd6fe'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {modalAction === 'ACCEPT' && <CheckCircle2 size={22} color="#059669" />}
                  {modalAction === 'REJECT' && <XCircle size={22} color="#e11d48" />}
                  {modalAction === 'SEND_TO_ADMIN' && <Send size={20} color="#7c3aed" />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, color: '#0f172a', lineHeight: 1.25 }}>
                    {modalAction === 'ACCEPT' && 'Accept Expense Claim'}
                    {modalAction === 'REJECT' && 'Reject Expense Claim'}
                    {modalAction === 'SEND_TO_ADMIN' && 'Send Expense to Admin'}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    {modalAction === 'ACCEPT' && 'Verify and finalize this claim into the company ledger'}
                    {modalAction === 'REJECT' && 'Decline this claim and release held funds back to maker'}
                    {modalAction === 'SEND_TO_ADMIN' && 'Forward this claim for administrative approval'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeActionModal}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Expense Details Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#334155',
                          fontFamily: 'monospace',
                          background: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1'
                        }}>
                          {selectedExpense.reference_number || `EXP-${selectedExpense.id}`}
                        </span>
                        {selectedExpense.category && (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#2563eb',
                            background: '#eff6ff',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Tags size={11} /> {selectedExpense.category}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} />
                        <span>{formatDate(selectedExpense.expense_date || selectedExpense.date || selectedExpense.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Claim Amount
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        ₹{Number(selectedExpense.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        flexShrink: 0
                      }}>
                        <UserIcon size={14} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Maker</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedExpense.maker_name || selectedExpense.maker?.user?.full_name || 'Maker'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        flexShrink: 0
                      }}>
                        <Store size={14} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Payee / Vendor</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedExpense.payee || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Themed Notice Banner */}
                {modalAction === 'ACCEPT' && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 500, lineHeight: 1.45 }}>
                      Accepting this claim marks it as verified by Checker and posts it directly to the company ledger.
                    </span>
                  </div>
                )}

                {modalAction === 'REJECT' && (
                  <div style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <AlertTriangle size={16} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#9f1239', fontWeight: 500, lineHeight: 1.45 }}>
                      Rejecting this claim will restore the reserved funds back to the Maker's balance.
                    </span>
                  </div>
                )}

                {modalAction === 'SEND_TO_ADMIN' && (
                  <div style={{
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <Send size={16} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.82rem', color: '#5b21b6', fontWeight: 500, lineHeight: 1.45 }}>
                      Escalating this claim forwards it to Admin for decision review.
                    </span>
                  </div>
                )}

                {/* Comments / Remarks Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    {modalAction === 'ACCEPT' ? 'Verification Remarks' : 'Reason / Justification'}
                    {modalAction !== 'ACCEPT' ? <span style={{ color: '#e11d48' }}> *</span> : <span style={{ color: '#94a3b8', fontWeight: 400 }}> (Optional)</span>}
                  </label>
                  <textarea
                    rows="3"
                    required={modalAction !== 'ACCEPT'}
                    placeholder={
                      modalAction === 'REJECT'
                        ? 'Explain why this expense is rejected...'
                        : modalAction === 'SEND_TO_ADMIN'
                        ? 'Add note/reason for Admin review...'
                        : 'Optional comments for maker or ledger...'
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      const color = modalAction === 'ACCEPT' ? '#10b981' : modalAction === 'REJECT' ? '#f43f5e' : '#8b5cf6';
                      e.target.style.borderColor = color;
                      e.target.style.boxShadow = `0 0 0 3px ${
                        modalAction === 'ACCEPT' ? 'rgba(16, 185, 129, 0.15)' :
                        modalAction === 'REJECT' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)'
                      }`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={closeActionModal}
                  disabled={submittingAction}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    border: 'none',
                    cursor: submittingAction ? 'not-allowed' : 'pointer',
                    opacity: submittingAction ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    background:
                      modalAction === 'ACCEPT' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
                      modalAction === 'REJECT' ? 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)' :
                      'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                    boxShadow:
                      modalAction === 'ACCEPT' ? '0 4px 12px rgba(16, 185, 129, 0.3)' :
                      modalAction === 'REJECT' ? '0 4px 12px rgba(225, 29, 72, 0.3)' :
                      '0 4px 12px rgba(124, 58, 237, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {submittingAction ? (
                    <>
                      <RefreshCw size={15} className="spin-icon" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {modalAction === 'ACCEPT' && <CheckCircle2 size={16} />}
                      {modalAction === 'REJECT' && <XCircle size={16} />}
                      {modalAction === 'SEND_TO_ADMIN' && <Send size={16} />}
                      <span>
                        {modalAction === 'ACCEPT' ? 'Confirm Accept' :
                         modalAction === 'REJECT' ? 'Confirm Rejection' : 'Send to Admin'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 6. EXPENSE DETAILS VIEW MODAL */}

      {selectedExpense && !modalAction && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setSelectedExpense(null)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '840px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              animation: 'popupEnlargeFromFront 0.18s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >

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
        </div>,
        document.body
      )}

      {/* 7. CHECKER REQUEST ADDITIONAL FUNDS MODAL */}
      {showCheckerFundModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowCheckerFundModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: 'min(90vh, 720px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.16s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Header: Fixed top */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <Wallet size={19} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Request Additional Funds
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Submit replenishment request to Admin
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckerFundModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCheckerFundRequest} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                
                {/* Available Balance Banner */}
                <div style={{
                  background: checkerAvailableBalance < 0 ? '#fef2f2' : '#f0f9ff',
                  border: `1px solid ${checkerAvailableBalance < 0 ? '#fecaca' : '#bae6fd'}`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: checkerAvailableBalance < 0 ? '#991b1b' : '#0369a1', fontWeight: 600 }}>
                      Current Available Balance
                    </span>
                    <div style={{ fontSize: '0.72rem', color: checkerAvailableBalance < 0 ? '#b91c1c' : '#0284c7', marginTop: '1px' }}>
                      {checkerAvailableBalance < 0 ? 'Account currently in deficit' : 'Active limit in your account'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: checkerAvailableBalance < 0 ? '#dc2626' : '#0284c7',
                    letterSpacing: '-0.02em'
                  }}>
                    ₹{checkerAvailableBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Requested Amount */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Requested Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#64748b'
                    }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="e.g. 50,000"
                      value={checkerReqAmount}
                      onChange={(e) => setCheckerReqAmount(e.target.value)}
                      className="form-input"
                      style={{
                        paddingLeft: '28px',
                        width: '100%',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>
                    Enter whole INR amount needed from Admin replenishment.
                  </div>
                </div>

                {/* Reason / Justification */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Reason / Justification <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain why additional funds are required..."
                    value={checkerReqReason}
                    onChange={(e) => setCheckerReqReason(e.target.value)}
                    className="form-input"
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      padding: '10px 12px',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                  />
                </div>

                {/* Supporting Document */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Supporting Document (Optional PDF or Image)
                  </label>
                  {checkerReqDoc ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FileText size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {checkerReqDoc.name}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                            {(checkerReqDoc.size / 1024).toFixed(1)} KB • Attached
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCheckerReqDoc(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.15s'
                        }}
                        title="Remove file"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="checker-fund-doc-upload"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '18px 14px',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <Upload size={18} />
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        Click to upload receipt, invoice or memo
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Supports PDF, PNG, JPG up to 10 MB
                      </div>
                      <input
                        id="checker-fund-doc-upload"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                        onChange={(e) => setCheckerReqDoc(e.target.files[0] || null)}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

              </div>

              {/* Fixed Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px',
                background: '#f8fafc',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setShowCheckerFundModal(false)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckerReq}
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {submittingCheckerReq ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      

      {/* Animated Fund Breakdown Popup Modal for Checker */}
      {fundModalType && createPortal(
        <div
          className="fund-breakdown-modal-overlay"
          onClick={() => setFundModalType(null)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            overflow: 'hidden',
            margin: 0,
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '860px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              border: '1px solid #e2e8f0',
              animation: 'popupEnlargeFromFront 0.16s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Header: Fixed top */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: fundModalType === 'allocated' ? '#ecfdf5' : fundModalType === 'used' ? '#eff6ff' : '#fef2f2',
                  color: fundModalType === 'allocated' ? '#10b981' : fundModalType === 'used' ? '#2563eb' : '#dc2626'
                }}>
                  {fundModalType === 'allocated' && <Wallet size={24} />}
                  {fundModalType === 'used' && <ReceiptIndianRupee size={24} />}
                  {fundModalType === 'remaining' && <FileText size={24} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {fundModalType === 'allocated' && 'Funds Allocated (All Makers)'}
                    {fundModalType === 'used' && 'Funds Used (All Makers)'}
                    {fundModalType === 'remaining' && 'Funds Remaining (All Makers)'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    {fundModalType === 'allocated' && 'Displaying all Makers sorted in decreasing order of allocated funds.'}
                    {fundModalType === 'used' && 'Displaying all Makers sorted in decreasing order of cumulative funds used.'}
                    {fundModalType === 'remaining' && 'Displaying all Makers sorted in decreasing order of remaining balance.'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  <button
                    onClick={() => setFundModalType('allocated')}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: fundModalType === 'allocated' ? '#ffffff' : 'transparent',
                      color: fundModalType === 'allocated' ? '#0f172a' : '#64748b',
                      boxShadow: fundModalType === 'allocated' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    <Wallet size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Allocated
                  </button>
                  <button
                    onClick={() => setFundModalType('used')}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: fundModalType === 'used' ? '#ffffff' : 'transparent',
                      color: fundModalType === 'used' ? '#0f172a' : '#64748b',
                      boxShadow: fundModalType === 'used' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    <ReceiptIndianRupee size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Used
                  </button>
                  <button
                    onClick={() => setFundModalType('remaining')}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: fundModalType === 'remaining' ? '#ffffff' : 'transparent',
                      color: fundModalType === 'remaining' ? '#0f172a' : '#64748b',
                      boxShadow: fundModalType === 'remaining' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Remaining
                  </button>
                </div>
                <button
                  onClick={() => setFundModalType(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Metric Banner: Fixed (Makers only for Checker) */}
            <div style={{
              flexShrink: 0,
              background: fundModalType === 'allocated' ? '#f0fdf4' : fundModalType === 'used' ? '#eff6ff' : '#fef2f2',
              border: `1px solid ${fundModalType === 'allocated' ? '#bbf7d0' : fundModalType === 'used' ? '#bfdbfe' : '#fecaca'}`,
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {fundModalType === 'allocated' && 'Total Credit Limits Allocated Across Makers'}
                  {fundModalType === 'used' && 'Total Cumulative Funds Used Across Makers'}
                  {fundModalType === 'remaining' && 'Total Net Balance Remaining Across Makers'}
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: fundModalType === 'allocated' ? '#047857' : fundModalType === 'used' ? '#1d4ed8' : totalRemainingMakers < 0 ? '#dc2626' : '#047857'
                }}>
                  {fundModalType === 'allocated' && `₹${totalAllocatedMakers.toLocaleString('en-IN')}`}
                  {fundModalType === 'used' && `₹${totalUsedMakers.toLocaleString('en-IN')}`}
                  {fundModalType === 'remaining' && (totalRemainingMakers < 0 ? `-₹${Math.abs(totalRemainingMakers).toLocaleString('en-IN')}` : `₹${totalRemainingMakers.toLocaleString('en-IN')}`)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="balance-pill-badge-light">
                  <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {sortedFundEmployees.length} Makers Displayed
                </span>
              </div>
            </div>

            {/* Search: Fixed (Filter Role removed for Checker) */}
            <div style={{ flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by name, ID, or department..."
                  value={fundModalSearch}
                  onChange={(e) => setFundModalSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2rem', fontSize: '0.825rem' }}
                />
              </div>
            </div>

            {/* Employees Breakdown Table: ONLY THIS SCROLLS INTERNALLY */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="spaced-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px 12px' }}>SR No.</th>
                    <th style={{ padding: '8px 12px' }}>Employee</th>
                    <th style={{ padding: '8px 12px' }}>Role</th>
                    <th style={{ padding: '8px 12px' }}>Department</th>
                    <th style={{
                      padding: '8px 12px',
                      background: fundModalType === 'allocated' ? '#f0fdf4' : undefined,
                      color: fundModalType === 'allocated' ? '#047857' : undefined,
                      fontWeight: fundModalType === 'allocated' ? 700 : undefined
                    }}>
                      Funds Allocated {fundModalType === 'allocated' && '↓'}
                    </th>
                    <th style={{
                      padding: '8px 12px',
                      background: fundModalType === 'used' ? '#eff6ff' : undefined,
                      color: fundModalType === 'used' ? '#1d4ed8' : undefined,
                      fontWeight: fundModalType === 'used' ? 700 : undefined
                    }}>
                      Funds Used {fundModalType === 'used' && '↓'}
                    </th>
                    <th style={{
                      padding: '8px 12px',
                      background: fundModalType === 'remaining' ? '#fef2f2' : undefined,
                      color: fundModalType === 'remaining' ? '#dc2626' : undefined,
                      fontWeight: fundModalType === 'remaining' ? 700 : undefined
                    }}>
                      Funds Remaining {fundModalType === 'remaining' && '↓'}
                    </th>
                    
                  </tr>
                </thead>
                <tbody>
                  {sortedFundEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No staff members found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedFundEmployees.map((emp, idx) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: idx < 3 ? '#fef3c7' : '#f1f5f9',
                            color: idx < 3 ? '#b45309' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.75rem'
                          }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: emp.role === 'CHECKER' ? '#e0f2fe' : '#fef3c7',
                              color: emp.role === 'CHECKER' ? '#0369a1' : '#b45309',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}>
                              {(emp.full_name || emp.username || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{emp.full_name || emp.username}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                ID: {emp.employee_id || `EMP${emp.id}`} • {emp.designation || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge ${emp.role === 'CHECKER' ? 'badge-submitted' : 'badge-approved'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                            {emp.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {emp.department || '-'}
                        </td>
                        <td style={{
                          padding: '10px 12px',
                          fontWeight: fundModalType === 'allocated' ? 800 : 600,
                          color: '#0f172a',
                          background: fundModalType === 'allocated' ? '#f0fdf4' : undefined
                        }}>
                          ₹{emp.allocated_funds.toLocaleString('en-IN')}
                        </td>
                        <td style={{
                          padding: '10px 12px',
                          fontWeight: fundModalType === 'used' ? 800 : 500,
                          color: '#475569',
                          background: fundModalType === 'used' ? '#eff6ff' : undefined
                        }}>
                          ₹{emp.total_expense.toLocaleString('en-IN')}
                        </td>
                        <td style={{
                          padding: '10px 12px',
                          fontWeight: fundModalType === 'remaining' ? 800 : 600,
                          color: emp.remaining_funds < 0 ? '#dc2626' : '#15803d',
                          background: fundModalType === 'remaining' ? '#fef2f2' : undefined
                        }}>
                          {emp.remaining_funds < 0 ? `-₹${Math.abs(emp.remaining_funds).toLocaleString('en-IN')}` : `₹${emp.remaining_funds.toLocaleString('en-IN')}`}
                        </td>
                        
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer: Fixed bottom */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setFundModalType(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 18px', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modern Unified Submit Expense Modal for Checker */}
      <SubmitExpenseModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        currentUser={user}
        onSuccess={(newExp) => {
          loadData();
        }}
      />
    </div>

  );

}