import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, {
  getMediaUrl,
  formatDate,
  formatDateTime,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../api';
import TableHeadSortMenu, { TableColumnsButton, ScrollTableToolbar, matchesFilterRule, exportToCSV } from '../components/TableHeadSortMenu';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import {
  LayoutDashboard,
  Users,
  ReceiptIndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Wallet,
  ShieldCheck,
  PlusCircle,
  Send,
  Eye,
  Download,
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  KeyRound,
  Trash2,
  Edit2,
  Copy,
  Check,
  Building,
  Briefcase,
  Mail,
  UserCheck,
  UserX,
  FileText,
  ArrowRight,
  History,
  Camera,
  Paperclip
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, updateUser } = useAuth();
  const { alert: showAlert, confirm } = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawActiveTab = searchParams.get('tab') || 'dashboard';
  const activeTab = rawActiveTab === 'accounts' ? 'dashboard' : rawActiveTab === 'vouchers' ? 'allocations' : rawActiveTab === 'checker_expenses' ? 'checker-expenses' : rawActiveTab;

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  // Sub-panel for secondary admin tools on dashboard
  const [fundSectionTab, setFundSectionTab] = useState('allocations'); // 'allocations', 'requests', 'audit'

  // Data states
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [alcSearch, setAlcSearch] = useState('');
  const [alcRoleFilter, setAlcRoleFilter] = useState('ALL');
  const [alcRecipientFilter, setAlcRecipientFilter] = useState('ALL');
  const [alcPage, setAlcPage] = useState(1);
  const [alcPageSize, setAlcPageSize] = useState(10);
  const [selectedAlcDetails, setSelectedAlcDetails] = useState(null);
  const [fundRequests, setFundRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedEmpToAllocate, setSelectedEmpToAllocate] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateNotes, setAllocateNotes] = useState('');
  const [allocatingFunds, setAllocatingFunds] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notification, setNotification] = useState({ type: '', text: '' });
  const [lastRefreshText, setLastRefreshText] = useState(user?.last_refresh_formatted || '');

  const formatRefreshDate = (val) => {
    if (!val) return '';
    const match = String(val).match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}):\d{2}(\s+[AP]M)$/i);
    if (match) return `${match[1]}${match[2]}`;
    return val;
  };

  // Decision Modal state (Accept / Reject)
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [decisionType, setDecisionType] = useState(null); // 'ACCEPT' or 'REJECT'
  const [comments, setComments] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Create Fund Account modal state
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccMaker, setNewAccMaker] = useState('');
  const [newAccChecker, setNewAccChecker] = useState('');
  const [newAccAdmin, setNewAccAdmin] = useState('');
  const [newAccInitialAmount, setNewAccInitialAmount] = useState('25000');
  const [newAccPaymentRef, setNewAccPaymentRef] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Edit Fund Account modal state
  const [editingAccount, setEditingAccount] = useState(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccMaker, setEditAccMaker] = useState('');
  const [editAccChecker, setEditAccChecker] = useState('');
  const [editAccActive, setEditAccActive] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);

  // Issue Supplementary Voucher modal state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [vchAccount, setVchAccount] = useState('');
  const [vchAmount, setVchAmount] = useState('');
  const [vchBeneficiary, setVchBeneficiary] = useState('');
  const [vchPurpose, setVchPurpose] = useState('');
  const [vchPaymentMode, setVchPaymentMode] = useState('BANK_TRANSFER');
  const [vchPaymentRef, setVchPaymentRef] = useState('');
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  // Review Fund Request modal state
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqAction, setReqAction] = useState('APPROVE');
  const [partialAmount, setPartialAmount] = useState('');
  const [reqComments, setReqComments] = useState('');
  const [autoDisburse, setAutoDisburse] = useState(true);
  const [reviewingReq, setReviewingReq] = useState(false);

  // Expenses Tab Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Checker Expenses Tab Filters & Pagination
  const [chkExpSearch, setChkExpSearch] = useState('');
  const [chkExpStatusFilter, setChkExpStatusFilter] = useState('ALL');
  const [chkExpCategoryFilter, setChkExpCategoryFilter] = useState('ALL');
  const [chkExpDateFrom, setChkExpDateFrom] = useState('');
  const [chkExpDateTo, setChkExpDateTo] = useState('');
  const [chkExpPageSize, setChkExpPageSize] = useState(10);
  const [chkExpCurrentPage, setChkExpCurrentPage] = useState(1);
  const [chkExpSortKey, setChkExpSortKey] = useState('date');
  const [chkExpSortDir, setChkExpSortDir] = useState('desc');

  // Admin profile picture upload
  const adminPhotoInputRef = useRef(null);
  const [uploadingAdminPhoto, setUploadingAdminPhoto] = useState(false);

  // Department Masters states
  const [departments, setDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptActive, setDeptActive] = useState(true);
  const [savingDept, setSavingDept] = useState(false);

  // Table Sort states
  const [queueSortKey, setQueueSortKey] = useState('sno');
  const [queueSortDir, setQueueSortDir] = useState(null);
  const [reqSortKey, setReqSortKey] = useState('sno');
  const [reqSortDir, setReqSortDir] = useState(null);
  const [empSortKey, setEmpSortKey] = useState('sno');
  const [empSortDir, setEmpSortDir] = useState(null);
  const [expSortKey, setExpSortKey] = useState('sno');
  const [expSortDir, setExpSortDir] = useState(null);
  const [accSortKey, setAccSortKey] = useState('sno');
  const [accSortDir, setAccSortDir] = useState(null);
  const [vchSortKey, setVchSortKey] = useState('sno');
  const [vchSortDir, setVchSortDir] = useState(null);
  const [auditSortKey, setAuditSortKey] = useState('sno');
  const [auditSortDir, setAuditSortDir] = useState(null);
  const [overviewAccSortKey, setOverviewAccSortKey] = useState(null);
  const [overviewAccSortDir, setOverviewAccSortDir] = useState(null);

  // Employees Tab Filters & Modals
  const [empSearch, setEmpSearch] = useState('');
  const [empRoleFilter, setEmpRoleFilter] = useState('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState('ALL');
  const [empPage, setEmpPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState(10);
  const [showCreateEmpModal, setShowCreateEmpModal] = useState(false);

  // Temporary password display modal
  const [tempPasswordNotice, setTempPasswordNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  // Create Employee Form state
  const [newEmpFullName, setNewEmpFullName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('MAKER');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [newEmpDesignation, setNewEmpDesignation] = useState('');
  const [newEmpCustomPassword, setNewEmpCustomPassword] = useState('');
  const [creatingEmp, setCreatingEmp] = useState(false);
  const [empFormError, setEmpFormError] = useState('');


  // Decision Queue Pagination & Scroll Toolbar
  const [queuePage, setQueuePage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(10);
  const [queueSearchTerm, setQueueSearchTerm] = useState('');
  const [queueCategoryFilter, setQueueCategoryFilter] = useState('ALL');
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL');
  const [showQueueToolbar, setShowQueueToolbar] = useState(false);
  const queueTableRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!queueTableRef.current) return;
      const rect = queueTableRef.current.getBoundingClientRect();
      const inTableRange = showQueueToolbar
        ? rect.top <= 360 && rect.bottom >= 60
        : window.scrollY > 60 && rect.top <= 260 && rect.bottom >= 140;
      if (inTableRange !== showQueueToolbar) {
        setShowQueueToolbar(inTableRange);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showQueueToolbar]);

  // Dedicated Pages (Accounts, Vouchers, Requests, Audit) Filters & Pagination
  const [accSearch, setAccSearch] = useState('');
  const [accStatusFilter, setAccStatusFilter] = useState('ALL');
  const [accPage, setAccPage] = useState(1);
  const [accPageSize, setAccPageSize] = useState(10);

  const [vchSearch, setVchSearch] = useState('');
  const [vchModeFilter, setVchModeFilter] = useState('ALL');
  const [vchPage, setVchPage] = useState(1);
  const [vchPageSize, setVchPageSize] = useState(10);

  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // ==============================================================
  // COLUMN MANAGEMENT & FILTERING DEFINITIONS
  // ==============================================================
  const QUEUE_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Actions' },
    { key: 'status', label: 'Status' },
    { key: 'ref', label: 'Expense ID' },
    { key: 'date', label: 'Date' },
    { key: 'maker', label: 'Custodian (Maker)' },
    { key: 'category', label: 'Category' },
    { key: 'payee', label: 'Payee / Merchant' },
    { key: 'desc', label: 'Description' },
    { key: 'amount', label: 'Amount (INR)' },
  ], []);

  const [queueHiddenCols, setQueueHiddenCols] = useState([]);
  const [queueColFilters, setQueueColFilters] = useState({});
  const isQueueColVisible = (key) => !queueHiddenCols.includes(key);
  const toggleQueueCol = (key) => {
    setQueueHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const hideQueueCol = (key) => {
    setQueueHiddenCols(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const setQueueColFilter = (key, filter) => {
    setQueueColFilters(prev => ({ ...prev, [key]: filter }));
  };

  const EMP_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Action' },
    { key: 'status', label: 'Status' },
    { key: 'emp_id', label: 'Employee ID' },
    { key: 'name', label: 'User / Full Name' },
    { key: 'role', label: 'Role' },
    { key: 'dept', label: 'Department' },
    { key: 'funds_allocated', label: 'Funds Allocated' },
    { key: 'funds_used', label: 'Funds Used' },
    { key: 'funds_remaining', label: 'Funds Remaining' },
    { key: 'email', label: 'Email Address' },
    { key: 'designation', label: 'Designation' },
  ], []);

  const [empHiddenCols, setEmpHiddenCols] = useState([]);
  const [empColFilters, setEmpColFilters] = useState({});
  const isEmpColVisible = (key) => !empHiddenCols.includes(key);
  const toggleEmpCol = (key) => {
    setEmpHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const hideEmpCol = (key) => {
    setEmpHiddenCols(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const setEmpColFilter = (key, filter) => {
    setEmpColFilters(prev => ({ ...prev, [key]: filter }));
  };

  const ACC_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Action' },
    { key: 'status', label: 'Status' },
    { key: 'code', label: 'Account Code' },
    { key: 'name', label: 'Account Name' },
    { key: 'maker', label: 'Assigned Maker' },
    { key: 'checker', label: 'Assigned Checker' },
    { key: 'avail_bal', label: 'Available Balance' },
    { key: 'ledger_bal', label: 'Ledger Balance' },
  ], []);

  const [accHiddenCols, setAccHiddenCols] = useState([]);
  const [accColFilters, setAccColFilters] = useState({});
  const isAccColVisible = (key) => !accHiddenCols.includes(key);
  const toggleAccCol = (key) => {
    setAccHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const hideAccCol = (key) => {
    setAccHiddenCols(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const setAccColFilter = (key, filter) => {
    setAccColFilters(prev => ({ ...prev, [key]: filter }));
  };

  const VCH_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Action' },
    { key: 'status', label: 'Status' },
    { key: 'vch_num', label: 'Voucher #' },
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'beneficiary', label: 'Beneficiary' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'mode', label: 'Payment Mode' },
    { key: 'ref', label: 'Payment Ref' },
    { key: 'amount', label: 'Amount (INR)' },
  ], []);

  const [vchHiddenCols, setVchHiddenCols] = useState([]);
  const [vchColFilters, setVchColFilters] = useState({});
  const isVchColVisible = (key) => !vchHiddenCols.includes(key);
  const toggleVchCol = (key) => {
    setVchHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const hideVchCol = (key) => {
    setVchHiddenCols(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const setVchColFilter = (key, filter) => {
    setVchColFilters(prev => ({ ...prev, [key]: filter }));
  };

  const EXP_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Actions' },
    { key: 'status', label: 'Status' },
    { key: 'ref', label: 'Expense ID' },
    { key: 'date', label: 'Date' },
    { key: 'maker', label: 'Custodian (Maker)' },
    { key: 'category', label: 'Category' },
    { key: 'payee', label: 'Payee / Merchant' },
    { key: 'desc', label: 'Description' },
    { key: 'amount', label: 'Amount (INR)' },
  ], []);

  const [expHiddenCols, setExpHiddenCols] = useState([]);
  const [expColFilters, setExpColFilters] = useState({});
  const isExpColVisible = (key) => !expHiddenCols.includes(key);
  const toggleExpCol = (key) => {
    setExpHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const hideExpCol = (key) => {
    setExpHiddenCols(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const setExpColFilter = (key, filter) => {
    setExpColFilters(prev => ({ ...prev, [key]: filter }));
  };

  const REQ_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Action' },
    { key: 'status', label: 'Status' },
    { key: 'req_num', label: 'Request #' },
    { key: 'date', label: 'Date' },
    { key: 'maker', label: 'Requested By' },
    { key: 'desc', label: 'Justification' },
    { key: 'amount', label: 'Requested Amount' },
  ], []);

  const [reqHiddenCols, setReqHiddenCols] = useState([]);
  const [reqColFilters, setReqColFilters] = useState({});
  const isReqColVisible = (key) => !reqHiddenCols.includes(key);
  const toggleReqCol = (key) => {
    setReqHiddenCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const hideReqCol = (key) => {
    setReqHiddenCols(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const setReqColFilter = (key, filter) => {
    setReqColFilters(prev => ({ ...prev, [key]: filter }));
  };

  // State for inline quick department creation in modal
  const [showInlineDeptInput, setShowInlineDeptInput] = useState(false);
  const [customDeptText, setCustomDeptText] = useState('');
  const [creatingCustomDept, setCreatingCustomDept] = useState(false);

  const handleQuickAddDepartment = async () => {
    const trimmed = customDeptText.trim();
    if (!trimmed) {
      notify('error', 'Please enter a department name.');
      return;
    }
    const existing = departments.find(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setNewEmpDept(existing.name);
      setShowInlineDeptInput(false);
      setCustomDeptText('');
      notify('info', `Selected existing department "${existing.name}".`);
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
      setDepartments(prev => [...prev, created]);
      setNewEmpDept(created.name);
      setShowInlineDeptInput(false);
      setCustomDeptText('');
      notify('success', `Department "${created.name}" created and selected!`);
    } catch (err) {
      notify('error', err?.response?.data?.name?.[0] || 'Failed to create department.');
    } finally {
      setCreatingCustomDept(false);
    }
  };

  const notify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, expRes, accRes, alcRes, vchRes, reqRes, auditRes, empRes, catRes, deptRes] = await Promise.all([
        api.get('/dashboard/summary/'),
        api.get('/expenses/'),
        api.get('/accounts/').catch(() => ({ data: [] })),
        api.get('/allocations/').catch(() => ({ data: [] })),
        api.get('/vouchers/').catch(() => ({ data: [] })),
        api.get('/fund-requests/').catch(() => ({ data: [] })),
        api.get('/audit-logs/').catch(() => ({ data: [] })),
        api.get('/admin/employees/').catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] })),
        fetchDepartments().catch(() => [])
      ]);

      setSummary(sumRes.data);
      if (sumRes.data?.last_refresh_str) {
        setLastRefreshText(sumRes.data.last_refresh_str);
      }
      setAllExpenses(expRes.data || []);
      setAccounts(accRes.data || []);
      setAllocations(alcRes.data || []);
      setVouchers(vchRes.data || []);
      setFundRequests(reqRes.data || []);
      setAuditLogs(auditRes.data || []);
      setEmployees(empRes.data || []);
      setCategories(catRes.data || []);
      setDepartments(deptRes || []);

      if (accRes.data?.length > 0 && !vchAccount) {
        setVchAccount(accRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
      notify('error', 'Failed to load admin dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN PHOTO CHANGE (BINARY BASE64) ---
  const handleAdminPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notify('error', 'Image size should not exceed 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingAdminPhoto(true);
        const base64Data = reader.result;
        const res = await api.patch('/auth/profile/', { photo_base64: base64Data });
        updateUser(res.data);
        notify('success', 'Profile picture updated successfully!');
      } catch (err) {
        notify('error', err.response?.data?.detail || 'Failed to update profile picture.');
      } finally {
        setUploadingAdminPhoto(false);
        if (adminPhotoInputRef.current) adminPhotoInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // --- DEPARTMENT MASTERS CRUD ---
  const handleCreateOrUpdateDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) {
      notify('error', 'Department name is required.');
      return;
    }

    setSavingDept(true);
    try {
      const payload = {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        description: deptDesc.trim(),
        is_active: deptActive
      };

      if (editingDept) {
        const updated = await updateDepartment(editingDept.id, payload);
        setDepartments(prev => prev.map(d => d.id === editingDept.id ? updated : d));
        notify('success', `Department "${updated.name}" updated successfully.`);
      } else {
        const created = await createDepartment(payload);
        setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        notify('success', `Department "${created.name}" created successfully.`);
      }
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      setDeptActive(true);
    } catch (err) {
      notify('error', err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save department.');
    } finally {
      setSavingDept(false);
    }
  };

  const handleToggleDeptActive = async (dept) => {
    try {
      const updated = await updateDepartment(dept.id, { is_active: !dept.is_active });
      setDepartments(prev => prev.map(d => d.id === dept.id ? updated : d));
      notify('success', `Department "${dept.name}" ${updated.is_active ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to change department status.');
    }
  };

  const handleDeleteDept = async (dept) => {
    const ok = await confirm({
      title: `Delete Department "${dept.name}"`,
      message: `Are you sure you want to permanently delete department "${dept.name}"? This action cannot be undone.`,
      confirmText: 'Delete Department',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await deleteDepartment(dept.id);
      setDepartments(prev => prev.filter(d => d.id !== dept.id));
      notify('success', `Department "${dept.name}" deleted.`);
    } catch (err) {
      showAlert({
        title: 'Cannot Delete Department',
        message: err.response?.data?.detail || 'Unable to delete this department because employees are currently assigned to it.',
        variant: 'danger',
        confirmText: 'Understood'
      });
    }
  };

  const handleOpenAllocateModal = (emp = null) => {
    setSelectedEmpToAllocate(emp);
    setAllocateAmount('');
    setAllocateNotes('');
    setShowAllocateModal(true);
  };

  const handleAllocateFundsSubmit = async (e) => {
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
    setAllocatingFunds(true);
    try {
      await api.post(`/admin/employees/${selectedEmpToAllocate.id}/allocate-funds/`, {
        amount: amt,
        notes: allocateNotes.trim()
      });
      notify('success', `Allocated ₹${amt.toLocaleString('en-IN')} to ${selectedEmpToAllocate.full_name}.`);
      setShowAllocateModal(false);
      setAllocateNotes('');
      setAllocateAmount('');
      await loadData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to allocate funds.');
    } finally {
      setAllocatingFunds(false);
    }
  };

  // Filtered & Paginated Allocations History
  const filteredAllocations = useMemo(() => {
    return allocations.filter(alc => {
      if (alcSearch.trim()) {
        const term = alcSearch.toLowerCase();
        const num = (alc.allocation_number || '').toLowerCase();
        const by = (alc.allocated_by_name || '').toLowerCase();
        const to = (alc.allocated_to_name || '').toLowerCase();
        const empId = (alc.allocated_to_employee_id || '').toLowerCase();
        const notes = (alc.notes || '').toLowerCase();
        if (!num.includes(term) && !by.includes(term) && !to.includes(term) && !empId.includes(term) && !notes.includes(term)) {
          return false;
        }
      }
      if (alcRoleFilter !== 'ALL') {
        if (alc.allocator_role !== alcRoleFilter) return false;
      }
      if (alcRecipientFilter !== 'ALL') {
        if (alc.recipient_role !== alcRecipientFilter) return false;
      }
      return true;
    });
  }, [allocations, alcSearch, alcRoleFilter, alcRecipientFilter]);

  const paginatedAllocations = useMemo(() => {
    const start = (alcPage - 1) * alcPageSize;
    return filteredAllocations.slice(start, start + alcPageSize);
  }, [filteredAllocations, alcPage, alcPageSize]);
  const alcTotalPages = Math.ceil(filteredAllocations.length / alcPageSize) || 1;

  const totalAllocatedAllEmployees = useMemo(() => {
    if (summary?.funds_allocated !== undefined) return summary.funds_allocated;
    return employees
      .filter(e => ['MAKER', 'CHECKER'].includes(e.role))
      .reduce((sum, e) => sum + (Number(e.allocated_funds) || 0), 0);
  }, [summary, employees]);

  const totalUsedAllEmployees = useMemo(() => {
    if (summary?.funds_used !== undefined) return summary.funds_used;
    return employees
      .filter(e => ['MAKER', 'CHECKER'].includes(e.role))
      .reduce((sum, e) => sum + (Number(e.funds_used) || 0), 0);
  }, [summary, employees]);

  const totalRemainingAllEmployees = useMemo(() => {
    if (summary?.funds_remaining !== undefined) return summary.funds_remaining;
    return totalAllocatedAllEmployees - totalUsedAllEmployees;
  }, [summary, totalAllocatedAllEmployees, totalUsedAllEmployees]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user?.last_refresh_formatted && !lastRefreshText) {
      setLastRefreshText(user.last_refresh_formatted);
    }
  }, [user?.last_refresh_formatted]);

  // Checker-approved claims are final; only unresolved claims remain in the admin queue.
  const decisionQueue = useMemo(() => {
    return allExpenses.filter(e => ['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status));
  }, [allExpenses]);

  const acceptedCount = useMemo(() => {
    return allExpenses.filter(e => ['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'].includes(e.status)).length;
  }, [allExpenses]);

  const acceptedAmount = useMemo(() => {
    return allExpenses
      .filter(e => ['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'].includes(e.status))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [allExpenses]);

  const rejectedByAdminCount = useMemo(() => {
    return allExpenses.filter(e => e.status === 'REJECTED_BY_ADMIN').length;
  }, [allExpenses]);

  const sentToAdminCount = useMemo(() => {
    return allExpenses.filter(e => e.status === 'SENT_TO_ADMIN').length;
  }, [allExpenses]);

  const activeFundAccount = summary?.fund_account || (accounts.length > 0 ? accounts[0] : null);

  const [selectedAdminAccountId, setSelectedAdminAccountId] = useState('ALL');

  const totalAllAccountsAvailable = useMemo(() => {
    if (!accounts || accounts.length === 0) return activeFundAccount?.available_balance ?? 0;
    return accounts.reduce((sum, a) => sum + (parseFloat(a.available_balance) || 0), 0);
  }, [accounts, activeFundAccount]);

  const totalAllAccountsLedger = useMemo(() => {
    if (!accounts || accounts.length === 0) return activeFundAccount?.current_ledger_balance ?? activeFundAccount?.current_balance ?? activeFundAccount?.ledger_balance ?? 0;
    return accounts.reduce((sum, a) => sum + (parseFloat(a.current_ledger_balance ?? a.current_balance ?? a.ledger_balance) || 0), 0);
  }, [accounts, activeFundAccount]);

  const totalAllAccountsCommitments = useMemo(() => {
    return Math.max(0, totalAllAccountsLedger - totalAllAccountsAvailable);
  }, [totalAllAccountsLedger, totalAllAccountsAvailable]);

  const displayedAccount = useMemo(() => {
    if (selectedAdminAccountId === 'ALL') {
      return null;
    }
    return accounts.find(a => String(a.id) === String(selectedAdminAccountId)) || activeFundAccount;
  }, [selectedAdminAccountId, accounts, activeFundAccount]);

  // --- EXPENSE DECISION HANDLERS ---
  const openDecisionModal = (expense, decision) => {
    setSelectedExpense(expense);
    setDecisionType(decision);
    setComments('');
  };

  const closeDecisionModal = () => {
    setDecisionType(null);
    setComments('');
  };

  const handleDecisionSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedExpense || !decisionType) return;

    if (decisionType === 'REJECT' && !comments.trim()) {
      notify('error', 'A mandatory rejection reason must be provided.');
      return;
    }

    setSubmittingDecision(true);
    try {
      await api.post(`/expenses/${selectedExpense.id}/admin-decision/`, {
        decision: decisionType,
        comments: comments.trim()
      });

      const msg = decisionType === 'ACCEPT' 
        ? `Claim ${selectedExpense.reference_number} accepted and posted to financial ledger.`
        : `Claim ${selectedExpense.reference_number} rejected. Amount restored to available balance.`;
      
      notify('success', msg);
      closeDecisionModal();
      setSelectedExpense(null);
      await loadData();
    } catch (err) {
      notify('error', err.response?.data?.comments?.[0] || err.response?.data?.detail || 'Failed to record decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // --- FUND ACCOUNT CREATION ---
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      notify('error', 'Please provide an account name.');
      return;
    }

    setCreatingAccount(true);
    try {
      await api.post('/accounts/', {
        name: newAccName.trim(),
        admin: newAccAdmin || null,
        initial_amount: parseInt(newAccInitialAmount, 10) || 0,
        payment_reference: newAccPaymentRef.trim()
      });

      notify('success', `Shared Fund Account "${newAccName}" created with initial disbursement!`);
      setShowCreateAccountModal(false);
      setNewAccName('');
      setNewAccInitialAmount('25000');
      setNewAccPaymentRef('');
      await loadData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to create fund account.');
    } finally {
      setCreatingAccount(false);
    }
  };

  // --- EDIT FUND ACCOUNT ---
  const handleOpenEditAccountModal = (acc) => {
    setEditingAccount(acc);
    setEditAccName(acc.name || '');
    setEditAccMaker(String(acc.maker || acc.maker_id || acc.maker_details?.id || ''));
    setEditAccChecker(String(acc.checker || acc.checker_id || acc.checker_details?.id || ''));
    setEditAccActive(acc.is_active ?? true);
  };

  const handleSaveEditAccount = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editAccName.trim()) {
      notify('error', 'Please provide an account name.');
      return;
    }

    setSavingAccount(true);
    try {
      await api.patch(`/accounts/${editingAccount.id}/`, {
        name: editAccName.trim(),
        is_active: editAccActive
      });
      notify('success', `Fund Account "${editAccName}" updated successfully!`);
      setEditingAccount(null);
      await loadData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to update fund account.');
    } finally {
      setSavingAccount(false);
    }
  };

  // --- VOUCHER MODAL & CREATION ---
  const handleOpenVoucherModal = (targetAccountId = null) => {
    const accId = targetAccountId || vchAccount || (accounts.length > 0 ? accounts[0].id : '');
    setVchAccount(accId);
    const acc = accounts.find(a => String(a.id) === String(accId));
    if (acc?.maker_details?.full_name && !vchBeneficiary) {
      setVchBeneficiary(acc.maker_details.full_name);
    }
    setShowVoucherModal(true);
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    const intAmount = parseInt(vchAmount, 10);
    if (!intAmount || intAmount <= 0) {
      notify('error', 'Voucher amount must be greater than ₹0.');
      return;
    }

    const selectedAccId = vchAccount || (accounts.length > 0 ? accounts[0].id : null);
    if (!selectedAccId) {
      notify('error', 'Please select a valid Fund Account.');
      return;
    }

    let beneficiary = vchBeneficiary.trim();
    if (!beneficiary) {
      const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccId));
      beneficiary = selectedAcc?.maker_details?.full_name || selectedAcc?.name || 'Custodian';
    }

    const purpose = vchPurpose.trim() || 'Supplementary fund replenishment for operations';

    setCreatingVoucher(true);
    try {
      await api.post('/vouchers/', {
        fund_account: selectedAccId,
        voucher_type: 'SUPPLEMENTARY',
        amount: intAmount,
        beneficiary: beneficiary,
        purpose: purpose,
        payment_mode: vchPaymentMode || 'BANK_TRANSFER',
        payment_reference: vchPaymentRef.trim()
      });

      notify('success', `Disbursement Voucher for ₹${intAmount.toLocaleString('en-IN')} issued successfully!`);
      setShowVoucherModal(false);
      setVchAmount('');
      setVchBeneficiary('');
      setVchPurpose('');
      setVchPaymentRef('');
      await loadData();
    } catch (err) {
      const errData = err.response?.data;
      let msg = 'Failed to issue voucher.';
      if (errData) {
        if (typeof errData === 'string') {
          msg = errData;
        } else if (errData.detail) {
          msg = errData.detail;
        } else {
          const fieldMsgs = Object.entries(errData)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(' ') : errs}`)
            .join(' | ');
          if (fieldMsgs) msg = fieldMsgs;
        }
      }
      notify('error', msg);
    } finally {
      setCreatingVoucher(false);
    }
  };

  // --- FUND REQUEST REVIEW ---
  const handleReviewFundRequest = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (reqAction === 'REJECT' && !reqComments.trim()) {
      showAlert({
        title: 'Rejection Reason Required',
        message: 'Please provide admin comments explaining the reason for rejecting this fund request.',
        subMessage: 'The maker custodian will be notified with your feedback.',
        variant: 'warning',
        confirmText: 'Understood'
      });
      return;
    }

    if (reqAction === 'PARTIALLY_APPROVE') {
      const pAmt = parseInt(partialAmount, 10);
      const reqAmt = Number(selectedReq.requested_amount);

      if (isNaN(pAmt) || pAmt <= 0) {
        showAlert({
          title: 'Invalid Partial Amount',
          message: 'Approved partial amount cannot be ₹0 or negative.',
          subMessage: 'Please enter a valid partial amount greater than ₹0, or select "Reject Request" if no funds should be granted.',
          variant: 'warning',
          confirmText: 'Understood'
        });
        return;
      }

      if (pAmt > reqAmt) {
        showAlert({
          title: 'Amount Exceeds Requested Limit',
          message: `Approved partial amount (₹${pAmt.toLocaleString('en-IN')}) cannot be greater than the requested amount (₹${reqAmt.toLocaleString('en-IN')}).`,
          subMessage: 'A partial approval must be strictly less than the requested amount. If you wish to approve the entire amount, please select "Approve Full Amount".',
          variant: 'warning',
          confirmText: 'Understood'
        });
        return;
      }

      if (pAmt === reqAmt) {
        showAlert({
          title: 'Full Amount Entered for Partial Approval',
          message: `The entered partial amount (₹${pAmt.toLocaleString('en-IN')}) is equal to the full requested amount.`,
          subMessage: 'Please switch your Review Action to "Approve Full Amount" instead, or enter a smaller partial amount.',
          variant: 'info',
          confirmText: 'Understood'
        });
        return;
      }
    }

    setReviewingReq(true);
    try {
      const payload = {
        action: reqAction,
        comments: reqComments.trim(),
        create_voucher: autoDisburse,
        auto_disburse: autoDisburse
      };
      if (reqAction === 'PARTIALLY_APPROVE') {
        payload.approved_amount = parseInt(partialAmount, 10);
      }

      await api.post(`/fund-requests/${selectedReq.id}/review/`, payload);
      const reqIdentifier = selectedReq.request_number || selectedReq.reference_number || (selectedReq.id ? String(10000 + selectedReq.id) : '');
      notify('success', `Fund Request ${reqIdentifier} reviewed successfully.`);
      setSelectedReq(null);
      setReqComments('');
      setPartialAmount('');
      await loadData();
    } catch (err) {
      const detailMsg = err.response?.data?.detail || 'Failed to process fund request review.';
      showAlert({
        title: 'Review Submission Error',
        message: detailMsg,
        variant: 'danger',
        confirmText: 'Dismiss'
      });
    } finally {
      setReviewingReq(false);
    }
  };

  // --- CREATE EMPLOYEE ---
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setEmpFormError('');

    if (!newEmpFullName.trim() || !newEmpEmail.trim()) {
      setEmpFormError('Please provide full name and email address.');
      return;
    }

    setCreatingEmp(true);
    try {
      const payload = {
        full_name: newEmpFullName.trim(),
        email: newEmpEmail.trim(),
        role: newEmpRole,
        phone: newEmpPhone.trim(),
        department: newEmpDept.trim(),
        designation: newEmpDesignation.trim()
      };
      if (newEmpCustomPassword.trim()) {
        payload.password = newEmpCustomPassword.trim();
      }

      const res = await api.post('/admin/employees/', payload);
      setShowCreateEmpModal(false);
      setNewEmpFullName('');
      setNewEmpEmail('');
      setNewEmpRole('MAKER');
      setNewEmpPhone('');
      setNewEmpDept('');
      setNewEmpDesignation('');
      setNewEmpCustomPassword('');

      setTempPasswordNotice({
        name: res.data.employee.full_name,
        email: res.data.employee.email,
        employee_id: res.data.employee.employee_id,
        role: res.data.employee.role,
        password: res.data.employee.temporary_password
      });

      notify('success', `Employee ${res.data.employee.full_name} created successfully!`);
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || 
                  err.response?.data?.password?.[0] || 
                  err.response?.data?.detail || 
                  'Failed to create employee account.';
      setEmpFormError(msg);
    } finally {
      setCreatingEmp(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status Badge Component
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
                ? `Approved by Checker ${exp.checker_name} / Admin ${exp?.admin_name || 'Admin'}`
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
    const list = allExpenses.filter(exp => {
      // Exclude Checker claims from Maker Expenses table
      if (exp.maker_role === 'CHECKER') return false;
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
        if (statusFilter === 'ACCEPTED') {
          if (!['ACCEPTED_BY_ADMIN', 'ACCEPTED_BY_CHECKER'].includes(exp.status)) return false;
        } else if (statusFilter === 'REJECTED') {
          if (!['REJECTED_BY_ADMIN', 'REJECTED'].includes(exp.status)) return false;
        } else if (statusFilter === 'PENDING') {
          if (exp.status !== 'SUBMITTED') return false;
        } else if (statusFilter === 'SENT_TO_ADMIN') {
          if (exp.status !== 'SENT_TO_ADMIN') return false;
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

    return list.filter((exp, idx) => {
      const snoVal = String(idx + 1);
      if (!matchesFilterRule(snoVal, expColFilters['sno'])) return false;
      if (!matchesFilterRule(exp.status, expColFilters['status'])) return false;
      if (!matchesFilterRule(exp.reference_number, expColFilters['ref'])) return false;
      if (!matchesFilterRule(formatDate(exp.expense_date), expColFilters['date'])) return false;
      if (!matchesFilterRule(exp.maker_name, expColFilters['maker'])) return false;
      if (!matchesFilterRule(exp.category, expColFilters['category'])) return false;
      if (!matchesFilterRule(exp.payee, expColFilters['payee'])) return false;
      if (!matchesFilterRule(exp.description, expColFilters['desc'])) return false;
      if (!matchesFilterRule(exp.amount, expColFilters['amount'])) return false;
      return true;
    });
  }, [allExpenses, searchTerm, statusFilter, categoryFilter, dateFrom, dateTo, expColFilters]);

  // Expenses Pagination & Sorting
  const sortedExpenses = useMemo(() => {
    let items = [...filteredExpenses];
    if (!expSortDir) return items;
    items.sort((a, b) => {
      let aVal, bVal;
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
        case 'amount':
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'desc':
          aVal = a.description || '';
          bVal = b.description || '';
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
    return items;
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
      exp.expense_date,
      `"${(exp.maker_name || '').replace(/"/g, '""')}"`,
      `"${exp.category || ''}"`,
      `"${(exp.payee || '').replace(/"/g, '""')}"`,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount,
      exp.status,
      `"${exp.checker_action || 'NONE'}"`,
      `"${exp.admin_decision || 'NONE'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `all_expenses_admin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Checker Expenses for the dedicated Checker Expenses table
  const filteredCheckerExpenses = useMemo(() => {
    return allExpenses.filter(exp => {
      // Checker claims only
      if (exp.maker_role !== 'CHECKER') return false;

      if (chkExpSearch.trim()) {
        const term = chkExpSearch.toLowerCase();
        const matchesRef = exp.reference_number?.toLowerCase().includes(term);
        const matchesMaker = exp.maker_name?.toLowerCase().includes(term);
        const matchesPayee = exp.payee?.toLowerCase().includes(term);
        const matchesCat = exp.category?.toLowerCase().includes(term);
        const matchesDesc = exp.description?.toLowerCase().includes(term);
        if (!matchesRef && !matchesMaker && !matchesPayee && !matchesCat && !matchesDesc) return false;
      }
      if (chkExpStatusFilter !== 'ALL') {
        if (chkExpStatusFilter === 'ACCEPTED') {
          if (!['ACCEPTED_BY_ADMIN', 'ACCEPTED_BY_CHECKER'].includes(exp.status)) return false;
        } else if (chkExpStatusFilter === 'REJECTED') {
          if (!['REJECTED_BY_ADMIN', 'REJECTED'].includes(exp.status)) return false;
        } else if (chkExpStatusFilter === 'SENT_TO_ADMIN' || chkExpStatusFilter === 'PENDING') {
          if (exp.status !== 'SENT_TO_ADMIN') return false;
        } else if (exp.status !== chkExpStatusFilter) {
          return false;
        }
      }
      if (chkExpCategoryFilter !== 'ALL' && exp.category !== chkExpCategoryFilter) {
        return false;
      }
      if (chkExpDateFrom && exp.expense_date < chkExpDateFrom) return false;
      if (chkExpDateTo && exp.expense_date > chkExpDateTo) return false;
      return true;
    });
  }, [allExpenses, chkExpSearch, chkExpStatusFilter, chkExpCategoryFilter, chkExpDateFrom, chkExpDateTo]);

  // Checker Expenses Sorting & Pagination
  const sortedCheckerExpenses = useMemo(() => {
    let items = [...filteredCheckerExpenses];
    if (!chkExpSortDir) return items;
    items.sort((a, b) => {
      let aVal, bVal;
      switch (chkExpSortKey) {
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
        case 'amount':
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'desc':
          aVal = a.description || '';
          bVal = b.description || '';
          break;
        default:
          aVal = a[chkExpSortKey] || '';
          bVal = b[chkExpSortKey] || '';
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return chkExpSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return chkExpSortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
    return items;
  }, [filteredCheckerExpenses, chkExpSortKey, chkExpSortDir]);

  const totalCheckerEntries = sortedCheckerExpenses.length;
  const totalCheckerPages = Math.ceil(totalCheckerEntries / chkExpPageSize) || 1;
  const paginatedCheckerExpenses = useMemo(() => {
    const start = (chkExpCurrentPage - 1) * chkExpPageSize;
    return sortedCheckerExpenses.slice(start, start + chkExpPageSize);
  }, [sortedCheckerExpenses, chkExpCurrentPage, chkExpPageSize]);

  // Export Checker Expenses to CSV
  const exportCheckerToCSV = () => {
    if (filteredCheckerExpenses.length === 0) {
      notify('error', 'No checker expenses available to export.');
      return;
    }
    const headers = ['Ref #', 'Date', 'Checker', 'Department', 'Category', 'Payee', 'Description', 'Amount (INR)', 'Status', 'Admin Decision'];
    const rows = filteredCheckerExpenses.map(exp => [
      exp.reference_number,
      exp.expense_date,
      `"${(exp.maker_name || '').replace(/"/g, '""')}"`,
      `"${(exp.maker_department || '').replace(/"/g, '""')}"`,
      `"${exp.category || ''}"`,
      `"${(exp.payee || '').replace(/"/g, '""')}"`,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount,
      exp.status,
      `"${(exp.admin_decision || 'NONE').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `checker_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Employees for the Employees view
  const filteredEmployees = useMemo(() => {
    const list = employees.filter(emp => {
      if (empSearch.trim()) {
        const term = empSearch.toLowerCase();
        const matchesName = emp.full_name?.toLowerCase().includes(term);
        const matchesEmail = emp.email?.toLowerCase().includes(term);
        const matchesId = emp.employee_id?.toLowerCase().includes(term);
        const matchesDept = emp.department?.toLowerCase().includes(term);
        const matchesDesig = emp.designation?.toLowerCase().includes(term);
        if (!matchesName && !matchesEmail && !matchesId && !matchesDept && !matchesDesig) return false;
      }
      if (empRoleFilter !== 'ALL' && emp.role !== empRoleFilter) return false;
      if (empStatusFilter !== 'ALL') {
        const isActive = empStatusFilter === 'ACTIVE';
        if (emp.is_active !== isActive) return false;
      }
      return true;
    });

    return list.filter((emp, idx) => {
      const snoVal = String(idx + 1);
      if (!matchesFilterRule(snoVal, empColFilters['sno'])) return false;
      const statusText = emp.is_active ? 'Active' : 'Disabled';
      if (!matchesFilterRule(statusText, empColFilters['status'])) return false;
      if (!matchesFilterRule(emp.employee_id, empColFilters['emp_id'])) return false;
      if (!matchesFilterRule(emp.full_name, empColFilters['name'])) return false;
      if (!matchesFilterRule(emp.email, empColFilters['email'])) return false;
      if (!matchesFilterRule(emp.role, empColFilters['role'])) return false;
      if (!matchesFilterRule(emp.department, empColFilters['dept'])) return false;
      if (!matchesFilterRule(emp.designation, empColFilters['designation'])) return false;
      return true;
    });
  }, [employees, empSearch, empRoleFilter, empStatusFilter, empColFilters]);

  // Decision Queue Sorting & Pagination
  const filteredDecisionQueue = useMemo(() => {
    return decisionQueue.filter((exp, idx) => {
      if (queueStatusFilter !== 'ALL' && exp.status !== queueStatusFilter) return false;
      if (queueCategoryFilter !== 'ALL' && exp.category !== queueCategoryFilter) return false;
      if (queueSearchTerm.trim()) {
        const q = queueSearchTerm.toLowerCase();
        const match =
          (exp.reference_number && exp.reference_number.toLowerCase().includes(q)) ||
          (exp.maker_name && exp.maker_name.toLowerCase().includes(q)) ||
          (exp.payee && exp.payee.toLowerCase().includes(q)) ||
          (exp.category && exp.category.toLowerCase().includes(q)) ||
          (exp.description && exp.description.toLowerCase().includes(q)) ||
          (exp.amount && String(exp.amount).includes(q));
        if (!match) return false;
      }
      const snoVal = String(idx + 1);
      if (!matchesFilterRule(snoVal, queueColFilters['sno'])) return false;
      if (!matchesFilterRule(exp.status, queueColFilters['status'])) return false;
      if (!matchesFilterRule(exp.reference_number, queueColFilters['ref'])) return false;
      if (!matchesFilterRule(formatDate(exp.expense_date), queueColFilters['date'])) return false;
      if (!matchesFilterRule(exp.maker_name, queueColFilters['maker'])) return false;
      if (!matchesFilterRule(exp.category, queueColFilters['category'])) return false;
      if (!matchesFilterRule(exp.payee, queueColFilters['payee'])) return false;
      if (!matchesFilterRule(exp.description, queueColFilters['desc'])) return false;
      if (!matchesFilterRule(exp.amount, queueColFilters['amount'])) return false;
      return true;
    });
  }, [decisionQueue, queueColFilters, queueSearchTerm, queueCategoryFilter, queueStatusFilter]);

  const handleExportQueueCSV = () => {
    const dataToExport = filteredDecisionQueue.map((exp, idx) => ({
      'SR No.': idx + 1,
      'Status': exp.status,
      'Expense ID': exp.reference_number || exp.id,
      'Date': exp.expense_date,
      'Custodian (Maker)': exp.maker_name || '-',
      'Category': exp.category || '-',
      'Payee / Merchant': exp.payee || '-',
      'Description': exp.description || '-',
      'Amount (INR)': exp.amount
    }));
    exportToCSV(dataToExport, 'decision_queue_vouchers.csv');
  };

  const sortedDecisionQueue = useMemo(() => {
    let items = [...filteredDecisionQueue];
    if (!queueSortDir) return items;
    items.sort((a, b) => {
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
        case 'amount':
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'desc':
          aVal = a.description || '';
          bVal = b.description || '';
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
    return items;
  }, [filteredDecisionQueue, queueSortKey, queueSortDir]);

  const paginatedDecisionQueue = useMemo(() => {
    const start = (queuePage - 1) * queuePageSize;
    return sortedDecisionQueue.slice(start, start + queuePageSize);
  }, [sortedDecisionQueue, queuePage, queuePageSize]);
  const queueTotalPages = Math.ceil(sortedDecisionQueue.length / queuePageSize) || 1;

  // Filtered & Paginated Employees
  const sortedEmployees = useMemo(() => {
    let items = [...filteredEmployees];
    if (!empSortDir) return items;
    items.sort((a, b) => {
      let aVal, bVal;
      switch (empSortKey) {
        case 'sno':
          aVal = a.id || 0;
          bVal = b.id || 0;
          break;
        case 'emp_id':
          aVal = a.employee_id || '';
          bVal = b.employee_id || '';
          break;
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
        case 'dept':
          aVal = a.department || '';
          bVal = b.department || '';
          break;
        case 'designation':
          aVal = a.designation || '';
          bVal = b.designation || '';
          break;
        case 'status':
          aVal = a.is_active ? 'Active' : 'Disabled';
          bVal = b.is_active ? 'Active' : 'Disabled';
          break;
        default:
          aVal = a[empSortKey] || '';
          bVal = b[empSortKey] || '';
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return empSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return empSortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
    return items;
  }, [filteredEmployees, empSortKey, empSortDir]);

  const paginatedEmployees = useMemo(() => {
    const start = (empPage - 1) * empPageSize;
    return sortedEmployees.slice(start, start + empPageSize);
  }, [sortedEmployees, empPage, empPageSize]);
  const empTotalPages = Math.ceil(sortedEmployees.length / empPageSize) || 1;

  // Filtered & Paginated Fund Accounts
  const filteredAccounts = useMemo(() => {
    const list = accounts.filter(acc => {
      if (accSearch.trim()) {
        const term = accSearch.toLowerCase();
        const matchesName = (acc.name || '').toLowerCase().includes(term);
        const matchesCode = (acc.account_id || acc.account_code || '').toLowerCase().includes(term);
        const matchesMaker = (acc.maker_details?.full_name || acc.maker_name || '').toLowerCase().includes(term);
        const matchesChecker = (acc.checker_details?.full_name || acc.checker_name || '').toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesMaker && !matchesChecker) return false;
      }
      if (accStatusFilter === 'ACTIVE' && !acc.is_active) return false;
      if (accStatusFilter === 'INACTIVE' && acc.is_active) return false;
      return true;
    });

    return list.filter((acc, idx) => {
      const snoVal = String(idx + 1);
      if (!matchesFilterRule(snoVal, accColFilters['sno'])) return false;
      const statusText = acc.is_active ? 'Active' : 'Inactive';
      if (!matchesFilterRule(statusText, accColFilters['status'])) return false;
      if (!matchesFilterRule(acc.account_id || acc.account_code, accColFilters['code'])) return false;
      if (!matchesFilterRule(acc.name, accColFilters['name'])) return false;
      if (!matchesFilterRule(acc.maker_details?.full_name || acc.maker_name, accColFilters['maker'])) return false;
      if (!matchesFilterRule(acc.checker_details?.full_name || acc.checker_name, accColFilters['checker'])) return false;
      if (!matchesFilterRule(acc.available_balance, accColFilters['avail_bal'])) return false;
      if (!matchesFilterRule(acc.current_ledger_balance ?? acc.current_balance, accColFilters['ledger_bal'])) return false;
      return true;
    });
  }, [accounts, accSearch, accStatusFilter, accColFilters]);

  const sortedAccounts = useMemo(() => {
    let items = [...filteredAccounts];
    if (accSortDir === 'asc') {
      items.sort((a, b) => (a.account_code || a.account_id || '').localeCompare(b.account_code || b.account_id || ''));
    } else if (accSortDir === 'desc') {
      items.sort((a, b) => (b.account_code || b.account_id || '').localeCompare(a.account_code || a.account_id || ''));
    }
    return items;
  }, [filteredAccounts, accSortDir]);

  const paginatedAccounts = useMemo(() => {
    const start = (accPage - 1) * accPageSize;
    return sortedAccounts.slice(start, start + accPageSize);
  }, [sortedAccounts, accPage, accPageSize]);
  const accTotalPages = Math.ceil(sortedAccounts.length / accPageSize) || 1;

  // Filtered & Paginated Vouchers
  const filteredVouchers = useMemo(() => {
    const list = vouchers.filter(vch => {
      if (vchSearch.trim()) {
        const term = vchSearch.toLowerCase();
        const matchesNum = (vch.voucher_number || '').toLowerCase().includes(term);
        const matchesBen = (vch.beneficiary || '').toLowerCase().includes(term);
        const matchesPurp = (vch.purpose || '').toLowerCase().includes(term);
        const matchesRef = (vch.payment_reference || '').toLowerCase().includes(term);
        if (!matchesNum && !matchesBen && !matchesPurp && !matchesRef) return false;
      }
      if (vchModeFilter !== 'ALL' && vch.payment_mode !== vchModeFilter) return false;
      return true;
    });

    return list.filter((vch, idx) => {
      const snoVal = String(idx + 1);
      if (!matchesFilterRule(snoVal, vchColFilters['sno'])) return false;
      if (!matchesFilterRule(vch.voucher_number, vchColFilters['vch_num'])) return false;
      if (!matchesFilterRule(formatDate(vch.payment_date || vch.voucher_date), vchColFilters['date'])) return false;
      if (!matchesFilterRule(vch.voucher_type, vchColFilters['type'])) return false;
      if (!matchesFilterRule(vch.beneficiary, vchColFilters['beneficiary'])) return false;
      if (!matchesFilterRule(vch.purpose, vchColFilters['purpose'])) return false;
      if (!matchesFilterRule(vch.payment_mode, vchColFilters['mode'])) return false;
      if (!matchesFilterRule(vch.payment_reference, vchColFilters['ref'])) return false;
      if (!matchesFilterRule(vch.amount, vchColFilters['amount'])) return false;
      return true;
    });
  }, [vouchers, vchSearch, vchModeFilter, vchColFilters]);

  const sortedVouchers = useMemo(() => {
    let items = [...filteredVouchers];
    if (vchSortDir && vchSortKey) {
      items.sort((a, b) => {
        let va, vb;
        if (vchSortKey === 'sno' || vchSortKey === 'vch_num') {
          va = (a.voucher_number || '').toLowerCase();
          vb = (b.voucher_number || '').toLowerCase();
        } else if (vchSortKey === 'status' || vchSortKey === 'actions') {
          va = (a.status || '').toLowerCase();
          vb = (b.status || '').toLowerCase();
        } else if (vchSortKey === 'date') {
          va = new Date(a.voucher_date || a.payment_date || a.created_at || 0).getTime();
          vb = new Date(b.voucher_date || b.payment_date || b.created_at || 0).getTime();
        } else if (vchSortKey === 'type') {
          va = (a.voucher_type || '').toLowerCase();
          vb = (b.voucher_type || '').toLowerCase();
        } else if (vchSortKey === 'beneficiary') {
          va = (a.beneficiary || a.beneficiary_name || '').toLowerCase();
          vb = (b.beneficiary || b.beneficiary_name || '').toLowerCase();
        } else if (vchSortKey === 'purpose') {
          va = (a.purpose || '').toLowerCase();
          vb = (b.purpose || '').toLowerCase();
        } else if (vchSortKey === 'mode') {
          va = (a.payment_mode || '').toLowerCase();
          vb = (b.payment_mode || '').toLowerCase();
        } else if (vchSortKey === 'ref') {
          va = (a.payment_reference || '').toLowerCase();
          vb = (b.payment_reference || '').toLowerCase();
        } else if (vchSortKey === 'amount') {
          va = parseFloat(a.amount || 0);
          vb = parseFloat(b.amount || 0);
        } else {
          va = a.id || 0;
          vb = b.id || 0;
        }
        if (va < vb) return vchSortDir === 'asc' ? -1 : 1;
        if (va > vb) return vchSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredVouchers, vchSortKey, vchSortDir]);

  const paginatedVouchers = useMemo(() => {
    const start = (vchPage - 1) * vchPageSize;
    return sortedVouchers.slice(start, start + vchPageSize);
  }, [sortedVouchers, vchPage, vchPageSize]);
  const vchTotalPages = Math.ceil(sortedVouchers.length / vchPageSize) || 1;

  // Filtered & Paginated Fund Requests (Search by ID Only)
  const filteredRequests = useMemo(() => {
    const list = fundRequests.filter(req => {
      if (reqSearch.trim()) {
        const term = reqSearch.trim().toLowerCase();
        const reqNum = String(req.request_number || req.reference_number || '').toLowerCase();
        const reqId = String(req.id || '');
        const formattedId = req.id ? String(10000 + req.id) : '';
        // Search exclusively by ID / Request #
        const matchesId = reqNum.includes(term) || reqId === term || formattedId.includes(term);
        if (!matchesId) return false;
      }
      if (reqStatusFilter !== 'ALL') {
        if (reqStatusFilter === 'SENT_TO_ADMIN') {
          if (req.status !== 'SENT_TO_ADMIN') return false;
        } else if (reqStatusFilter === 'SUBMITTED' || reqStatusFilter === 'PENDING') {
          if (req.status !== 'SUBMITTED' && req.status !== 'PENDING') return false;
        } else if (req.status !== reqStatusFilter) {
          return false;
        }
      }
      return true;
    });

    return list.filter((req, idx) => {
      const snoVal = String(idx + 1);
      if (!matchesFilterRule(snoVal, reqColFilters['sno'])) return false;
      if (!matchesFilterRule(req.status, reqColFilters['status'])) return false;
      if (!matchesFilterRule(req.request_number || req.reference_number, reqColFilters['req_num'])) return false;
      if (!matchesFilterRule(formatDate(req.created_at || req.request_date), reqColFilters['date'])) return false;
      if (!matchesFilterRule(req.requested_by_details?.full_name || req.requested_by_name, reqColFilters['maker'])) return false;
      if (!matchesFilterRule(req.justification || req.purpose, reqColFilters['desc'])) return false;
      if (!matchesFilterRule(req.amount || req.requested_amount, reqColFilters['amount'])) return false;
      return true;
    });
  }, [fundRequests, reqSearch, reqStatusFilter, reqColFilters]);

  const sortedRequests = useMemo(() => {
    let items = [...filteredRequests];
    if (reqSortDir && reqSortKey) {
      items.sort((a, b) => {
        let va, vb;
        if (reqSortKey === 'sno') {
          va = a.id || 0;
          vb = b.id || 0;
        } else if (reqSortKey === 'status' || reqSortKey === 'actions') {
          va = (a.status || '').toLowerCase();
          vb = (b.status || '').toLowerCase();
        } else if (reqSortKey === 'req_num') {
          va = (a.request_number || a.reference_number || '').toLowerCase();
          vb = (b.request_number || b.reference_number || '').toLowerCase();
        } else if (reqSortKey === 'date') {
          va = new Date(a.created_at || a.request_date || 0).getTime();
          vb = new Date(b.created_at || b.request_date || 0).getTime();
        } else if (reqSortKey === 'maker') {
          va = (a.requested_by_details?.full_name || a.requested_by_name || '').toLowerCase();
          vb = (b.requested_by_details?.full_name || b.requested_by_name || '').toLowerCase();
        } else if (reqSortKey === 'desc') {
          va = (a.justification || a.purpose || '').toLowerCase();
          vb = (b.justification || b.purpose || '').toLowerCase();
        } else if (reqSortKey === 'amount') {
          va = parseFloat(a.amount || a.requested_amount || 0);
          vb = parseFloat(b.amount || b.requested_amount || 0);
        } else {
          va = a.id || 0;
          vb = b.id || 0;
        }
        if (va < vb) return reqSortDir === 'asc' ? -1 : 1;
        if (va > vb) return reqSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredRequests, reqSortKey, reqSortDir]);

  const paginatedRequests = useMemo(() => {
    const start = (reqPage - 1) * reqPageSize;
    return sortedRequests.slice(start, start + reqPageSize);
  }, [sortedRequests, reqPage, reqPageSize]);
  const reqTotalPages = Math.ceil(sortedRequests.length / reqPageSize) || 1;

  // Filtered & Paginated Audit Trail
  const uniqueAuditActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map(l => l.action).filter(Boolean)));
  }, [auditLogs]);

  const filteredAudit = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditSearch.trim()) {
        const term = auditSearch.toLowerCase();
        const matchesActor = (log.actor_name || '').toLowerCase().includes(term);
        const matchesDesc = (log.description || '').toLowerCase().includes(term);
        const matchesAction = (log.action || '').toLowerCase().includes(term);
        if (!matchesActor && !matchesDesc && !matchesAction) return false;
      }
      if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
      return true;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  const sortedAudit = useMemo(() => {
    let items = [...filteredAudit];
    if (auditSortDir && auditSortKey) {
      items.sort((a, b) => {
        let va, vb;
        if (auditSortKey === 'sno') {
          va = a.id || 0;
          vb = b.id || 0;
        } else if (auditSortKey === 'timestamp') {
          va = new Date(a.created_at || 0).getTime();
          vb = new Date(b.created_at || 0).getTime();
        } else if (auditSortKey === 'actor') {
          va = (a.actor_name || '').toLowerCase();
          vb = (b.actor_name || '').toLowerCase();
        } else if (auditSortKey === 'action') {
          va = (a.action || '').toLowerCase();
          vb = (b.action || '').toLowerCase();
        } else if (auditSortKey === 'details') {
          va = (a.details || a.description || '').toLowerCase();
          vb = (b.details || b.description || '').toLowerCase();
        } else {
          va = a.id || 0;
          vb = b.id || 0;
        }
        if (va < vb) return auditSortDir === 'asc' ? -1 : 1;
        if (va > vb) return auditSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredAudit, auditSortKey, auditSortDir]);

  const paginatedAudit = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return sortedAudit.slice(start, start + auditPageSize);
  }, [sortedAudit, auditPage, auditPageSize]);
  const auditTotalPages = Math.ceil(filteredAudit.length / auditPageSize) || 1;

  const sortedOverviewAccounts = useMemo(() => {
    let items = [...accounts];
    if (overviewAccSortDir && overviewAccSortKey) {
      items.sort((a, b) => {
        let va, vb;
        if (overviewAccSortKey === 'code') {
          va = (a.account_id || a.account_code || '').toLowerCase();
          vb = (b.account_id || b.account_code || '').toLowerCase();
        } else if (overviewAccSortKey === 'name') {
          va = (a.name || '').toLowerCase();
          vb = (b.name || '').toLowerCase();
        } else if (overviewAccSortKey === 'maker') {
          va = (a.maker_details?.full_name || a.maker_name || '').toLowerCase();
          vb = (b.maker_details?.full_name || b.maker_name || '').toLowerCase();
        } else if (overviewAccSortKey === 'checker') {
          va = (a.checker_details?.full_name || a.checker_name || '').toLowerCase();
          vb = (b.checker_details?.full_name || b.checker_name || '').toLowerCase();
        } else if (overviewAccSortKey === 'available') {
          va = parseFloat(a.available_balance || 0);
          vb = parseFloat(b.available_balance || 0);
        } else if (overviewAccSortKey === 'ledger') {
          va = parseFloat(a.current_ledger_balance ?? a.current_balance ?? 0);
          vb = parseFloat(b.current_ledger_balance ?? b.current_balance ?? 0);
        } else if (overviewAccSortKey === 'status') {
          va = a.is_active ? 1 : 0;
          vb = b.is_active ? 1 : 0;
        } else {
          va = a.id || 0;
          vb = b.id || 0;
        }
        if (va < vb) return overviewAccSortDir === 'asc' ? -1 : 1;
        if (va > vb) return overviewAccSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [accounts, overviewAccSortKey, overviewAccSortDir]);

  return (
    <div className="page-body">
      {/* Global Notifications */}
      {notification.text && (
        <div style={{
          padding: '0.875rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: notification.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: notification.type === 'error' ? '#b91c1c' : '#15803d',
          border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. DASHBOARD VIEW (Clean, Premium Workman Dashboard) */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 700 }}>
                Admin Dashboard
              </h1>
              <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '3px' }}>
                Petty expense approval decisions, fund oversight, and reconciliation.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <button onClick={loadData} className="btn btn-secondary btn-sm" title="Refresh data">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              {lastRefreshText && (
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Last refresh at {formatRefreshDate(lastRefreshText)}
                </span>
              )}
            </div>
          </div>

          <section className="admin-fund-summary">
            {/* Top Row: Left Actions (Allocate Funds) & Status Pill */}
            <div className="admin-fund-summary-actions">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleOpenAllocateModal()}
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
                  <Wallet size={16} />
                  <span>Allocate Funds</span>
                </button>
                <span className="balance-pill-badge-light" style={{ marginLeft: '4px' }}>
                  <span className="status-dot" style={{ background: '#10b981' }}></span>
                  Active Staff ({employees.filter(e => ['MAKER', 'CHECKER'].includes(e.role)).length} Members)
                </span>
              </div>
            </div>

            <h2 className="admin-fund-account-title">
              Employee Fund Allocation & Usage Summary
            </h2>

            <div className="admin-balance-card-grid">
              {/* Card 1: Funds Allocated */}
              <article className="admin-balance-card admin-balance-available">
                <div className="admin-balance-card-icon"><Wallet size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">
                    Funds Allocated (All Employees)
                  </div>
                  <div className="admin-balance-card-value">
                    ₹{totalAllocatedAllEmployees.toLocaleString('en-IN')}
                  </div>
                  <p className="admin-balance-card-description">Total credit limits allocated across all Makers and Checkers.</p>
                </div>
              </article>

              {/* Card 2: Funds Used */}
              <article className="admin-balance-card admin-balance-commitments">
                <div className="admin-balance-card-icon"><ReceiptIndianRupee size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">
                    Funds Used (All Employees)
                  </div>
                  <div className="admin-balance-card-value">
                    ₹{totalUsedAllEmployees.toLocaleString('en-IN')}
                  </div>
                  <p className="admin-balance-card-description">Total cumulative expense claims claimed by all employees.</p>
                </div>
              </article>

              {/* Card 3: Funds Remaining */}
              <article className={`admin-balance-card ${totalRemainingAllEmployees < 0 ? 'admin-balance-deficit' : 'admin-balance-ledger'}`}>
                <div className="admin-balance-card-icon"><FileText size={27} /></div>
                <div className="admin-balance-card-content">
                  <div className="admin-balance-card-label">
                    Funds Remaining (All Employees)
                  </div>
                  <div className="admin-balance-card-value" style={{ color: totalRemainingAllEmployees < 0 ? '#dc2626' : undefined }}>
                    {totalRemainingAllEmployees < 0 ? `-₹${Math.abs(totalRemainingAllEmployees).toLocaleString('en-IN')}` : `₹${totalRemainingAllEmployees.toLocaleString('en-IN')}`}
                    {totalRemainingAllEmployees < 0 && (
                      <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', fontWeight: 700 }}>
                        DEFICIT
                      </span>
                    )}
                  </div>
                  <p className="admin-balance-card-description">
                    {totalRemainingAllEmployees < 0 ? 'Spending exceeds allocated limits across active staff.' : 'Net unspent funds remaining across all employee balances.'}
                  </p>
                </div>
              </article>
            </div>
          </section>

          {/* 3. Dashboard Summary Cards (Workman Style matching uploaded layout) */}
          <div className="workman-summary-grid" style={{ marginBottom: '2rem' }}>
            {/* Card 1: TOTAL EXPENSES */}
            <div className="workman-card card-theme-total">
              <div className="workman-card-header">
                <span className="workman-card-label">TOTAL EXPENSES</span>
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

            {/* Card 2: APPROVED */}
            <div className="workman-card card-theme-approved">
              <div className="workman-card-header">
                <span className="workman-card-label">APPROVED</span>
                <div className="workman-card-icon">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {acceptedCount}
              </div>
              <div className="workman-card-subtext" style={{ color: '#059669', fontWeight: 500 }}>
                <span>₹{acceptedAmount.toLocaleString('en-IN')} approved</span>
              </div>
            </div>

            {/* Card 3: PENDING */}
            <div className="workman-card card-theme-pending">
              <div className="workman-card-header">
                <span className="workman-card-label">PENDING</span>
                <div className="workman-card-icon">
                  <Clock size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {decisionQueue.length}
              </div>
              <div className="workman-card-subtext" style={{ color: '#d97706', fontWeight: 500 }}>
                <span>Awaiting Admin decision</span>
              </div>
            </div>

            {/* Card 4: REJECTED */}
            <div className="workman-card card-theme-rejected">
              <div className="workman-card-header">
                <span className="workman-card-label">REJECTED</span>
                <div className="workman-card-icon">
                  <XCircle size={20} />
                </div>
              </div>
              <div className="workman-card-value">
                {rejectedByAdminCount}
              </div>
              <div className="workman-card-subtext" style={{ color: '#dc2626', fontWeight: 500 }}>
                <span>Rejected claims released</span>
              </div>
            </div>
          </div>

          {/* Decision Queue Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Decision Queue
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
                  Claims pending Checker review or escalated by Checker for Admin decision.
                </p>
              </div>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {decisionQueue.length} Claims Awaiting Decision
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
                <div>Loading decision queue...</div>
              </div>
            ) : decisionQueue.length === 0 ? (
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
                  Decision queue clear!
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                  There are no pending claims awaiting admin decision at this time.
                </p>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '1rem' }}
                >
                  <span>View All Expenses</span>
                </button>
              </div>
            ) : (
              <>
                {/* Scroll-triggered Image 1 Toolbar for Decision Queue */}
                <ScrollTableToolbar
                  visible={showQueueToolbar}
                  searchTerm={queueSearchTerm}
                  onSearchChange={(val) => { setQueueSearchTerm(val); setQueuePage(1); }}
                  searchPlaceholder="Search vouchers/expenses..."
                  count={filteredDecisionQueue.length}
                  countLabel="vouchers"
                  columns={QUEUE_COLUMNS}
                  hiddenColumns={queueHiddenCols}
                  onToggleColumn={toggleQueueCol}
                  onExport={handleExportQueueCSV}
                  filters={[
                    {
                      label: 'Category',
                      value: queueCategoryFilter,
                      onChange: (val) => { setQueueCategoryFilter(val); setQueuePage(1); },
                      options: [
                        { value: 'ALL', label: 'All Categories' },
                        ...categories.map(c => ({ value: c.name, label: c.name }))
                      ]
                    },
                    {
                      label: 'Status',
                      value: queueStatusFilter,
                      onChange: (val) => { setQueueStatusFilter(val); setQueuePage(1); },
                      options: [
                        { value: 'ALL', label: 'All Statuses' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'SENT_TO_ADMIN', label: 'Sent to Admin' },
                        { value: 'REJECTED', label: 'Rejected' }
                      ]
                    }
                  ]}
                />

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem'
                }}>
                  <TableColumnsButton
                    columns={QUEUE_COLUMNS}
                    hiddenColumns={queueHiddenCols}
                    onToggleColumn={toggleQueueCol}
                  />
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

                <div ref={queueTableRef} className="spaced-table-container">
                  <table className="spaced-table admin-expenses-table">
                    <thead>
                      <tr>
                        {isQueueColVisible('sno') && (
                          <TableHeadSortMenu
                            label="SR No."
                            columnKey="sno"
                            allColumns={QUEUE_COLUMNS}
                            hiddenColumns={queueHiddenCols}
                            onToggleColumn={toggleQueueCol}
                            onHideColumn={hideQueueCol}
                            filterConfig={queueColFilters['sno']}
                            onFilterChange={(f) => setQueueColFilter('sno', f)}
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                            style={{ width: '90px' }}
                          />
                        )}
                        {isQueueColVisible('actions') && (
                          <TableHeadSortMenu
                            label="Actions"
                            columnKey="actions"
                            align="center"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                            width="300px"
                            style={{ width: '300px', minWidth: '300px' }}
                          />
                        )}
                        {isQueueColVisible('status') && (
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
                        )}
                        {isQueueColVisible('ref') && (
                          <TableHeadSortMenu
                            label="Expense ID"
                            columnKey="ref"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('date') && (
                          <TableHeadSortMenu
                            label="Date"
                            columnKey="date"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('maker') && (
                          <TableHeadSortMenu
                            label="Custodian (Maker)"
                            columnKey="maker"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('category') && (
                          <TableHeadSortMenu
                            label="Category"
                            columnKey="category"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('payee') && (
                          <TableHeadSortMenu
                            label="Payee / Merchant"
                            columnKey="payee"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('desc') && (
                          <TableHeadSortMenu
                            label="Description"
                            columnKey="desc"
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('amount') && (
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
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDecisionQueue.map((exp, idx) => (
                        <tr key={exp.id}>
                          {isQueueColVisible('sno') && (
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              {(queuePage - 1) * queuePageSize + idx + 1}
                            </td>
                          )}
                          {isQueueColVisible('actions') && (
                            <td className="table-actions-cell">
                              <div className="table-actions-group">
                                {/* View Bill Button */}
                                <button
                                  onClick={() => setSelectedExpense(exp)}
                                  className="table-btn table-btn-view"
                                  title="View claim & receipt"
                                >
                                  <Eye size={13} />
                                  <span className="table-btn-view-text">
                                    <span>View</span>
                                    <span>More</span>
                                  </span>
                                </button>

                                {/* Accept Button */}
                                <button
                                  onClick={() => openDecisionModal(exp, 'ACCEPT')}
                                  className="table-btn table-btn-accept"
                                  title="Accept claim and post to ledger"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Accept</span>
                                </button>

                                {/* Reject Button */}
                                <button
                                  onClick={() => openDecisionModal(exp, 'REJECT')}
                                  className="table-btn table-btn-reject"
                                  title="Reject claim and restore funds"
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          )}
                          {isQueueColVisible('status') && (
                            <td>
                              {exp.status === 'SENT_TO_ADMIN' ? (
                                <span style={{
                                  background: '#f3e8ff',
                                  color: '#7e22ce',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Send size={11} />
                                  Escalated {exp.checker_name ? `(${exp.checker_name})` : ''}
                                </span>
                              ) : exp.status === 'ACCEPTED_BY_CHECKER' ? (
                                <span style={{
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  Checker Accepted {exp.checker_name ? `(${exp.checker_name})` : ''}
                                </span>
                              ) : (
                                <span style={{
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  Pending Checker
                                </span>
                              )}
                            </td>
                          )}
                          {isQueueColVisible('ref') && (
                            <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                              {exp.reference_number}
                            </td>
                          )}
                          {isQueueColVisible('date') && (
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(exp.expense_date)}</td>
                          )}
                          {isQueueColVisible('maker') && (
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{exp.maker_name || 'Maker'}</td>
                          )}
                          {isQueueColVisible('category') && (
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
                          )}
                          {isQueueColVisible('payee') && (
                            <td style={{ fontSize: '0.85rem' }}>{exp.payee}</td>
                          )}
                          {isQueueColVisible('desc') && (
                            <td style={{ maxWidth: '200px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {exp.description}
                              </div>
                            </td>
                          )}
                          {isQueueColVisible('amount') && (
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              ₹{exp.amount.toLocaleString('en-IN')}
                            </td>
                          )}
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
                    Showing {Math.min((queuePage - 1) * queuePageSize + 1, decisionQueue.length)} to {Math.min(queuePage * queuePageSize, decisionQueue.length)} of {decisionQueue.length} entries
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

          {/* Secondary Management Panels (Pill Tabs) */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            marginTop: '2rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setFundSectionTab('allocations')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: fundSectionTab === 'allocations' ? '#2563eb' : '#f1f5f9',
                    color: fundSectionTab === 'allocations' ? '#ffffff' : '#475569'
                  }}
                >
                  Allocated Funds ({allocations.length})
                </button>
                <button
                  onClick={() => setFundSectionTab('requests')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: fundSectionTab === 'requests' ? '#2563eb' : '#f1f5f9',
                    color: fundSectionTab === 'requests' ? '#ffffff' : '#475569'
                  }}
                >
                  Fund Requests ({fundRequests.length})
                </button>
                <button
                  onClick={() => setFundSectionTab('audit')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: fundSectionTab === 'audit' ? '#2563eb' : '#f1f5f9',
                    color: fundSectionTab === 'audit' ? '#ffffff' : '#475569'
                  }}
                >
                  Audit Trail ({auditLogs.length})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {fundSectionTab === 'allocations' && (
                  <button 
                    onClick={() => handleOpenAllocateModal()} 
                    className="btn btn-primary btn-sm"
                  >
                    <PlusCircle size={14} />
                    <span>Allocate Funds</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab(fundSectionTab)}
                  className="btn btn-secondary btn-sm"
                  title="View full dedicated page"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>View More</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Sub-tab 2: Allocated Funds (Top 5) */}
            {fundSectionTab === 'allocations' && (
              <>
                <div className="spaced-table-container">
                  <table className="spaced-table admin-expenses-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>SR No.</th>
                        <th>Allocation #</th>
                        <th>Date & Time</th>
                        <th>Allocated By</th>
                        <th>Allocated To</th>
                        <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                        <th>Notes / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No fund allocations recorded yet.
                          </td>
                        </tr>
                      ) : (
                        allocations.slice(0, 5).map((alc, idx) => (
                          <tr key={alc.id}>
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                              {alc.allocation_number}
                            </td>
                            <td>{formatDateTime(alc.created_at)}</td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{alc.allocated_by_name}</span>{' '}
                              <span className="badge badge-submitted" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                {alc.allocator_role}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{alc.allocated_to_name}</span>{' '}
                              <span className="badge badge-approved" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                {alc.recipient_role}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              ₹{(alc.amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={alc.notes}>
                              {alc.notes || 'Direct allocation'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Showing top {Math.min(5, allocations.length)} of {allocations.length} allocated fund records
                  </span>
                  <button
                    onClick={() => setActiveTab('allocations')}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>View More</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* Sub-tab 3: Requests (Top 5) */}
            {fundSectionTab === 'requests' && (
              <>
                <div className="spaced-table-container">
                  <table className="spaced-table admin-expenses-table">
                    <thead>
                      <tr>
                        <TableHeadSortMenu
                          label="SR No."
                          onSortAsc={() => { setReqSortKey('sno'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('sno'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'sno' ? reqSortDir : null}
                          style={{ width: '85px' }}
                        />
                        <TableHeadSortMenu
                          label="Action"
                          align="center"
                          style={{ width: '130px' }}
                          onSortAsc={() => { setReqSortKey('status'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('status'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'actions' ? reqSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Status"
                          onSortAsc={() => { setReqSortKey('status'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('status'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'status' ? reqSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Request #"
                          onSortAsc={() => { setReqSortKey('req_num'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('req_num'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'req_num' ? reqSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Date"
                          onSortAsc={() => { setReqSortKey('date'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('date'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'date' ? reqSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Requested By"
                          onSortAsc={() => { setReqSortKey('maker'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('maker'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'maker' ? reqSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Justification"
                          onSortAsc={() => { setReqSortKey('desc'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('desc'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'desc' ? reqSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Requested Amount"
                          align="right"
                          onSortAsc={() => { setReqSortKey('amount'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('amount'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'amount' ? reqSortDir : null}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {fundRequests.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No additional fund requests.
                          </td>
                        </tr>
                      ) : (
                        sortedRequests.slice(0, 5).map((req, idx) => (
                          <tr key={req.id}>
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              {idx + 1}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {req.status === 'SENT_TO_ADMIN' || req.status === 'SUBMITTED' || req.status === 'PENDING' ? (
                                <button
                                  onClick={() => {
                                    setSelectedReq(req);
                                    setReqAction('APPROVE');
                                    setPartialAmount('');
                                    setReqComments('');
                                  }}
                                  className="table-btn table-btn-view"
                                  title="Review Request"
                                >
                                  <Eye size={13} />
                                  <span>Review</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedReq(req);
                                    setReqAction(req.status === 'APPROVED' ? 'APPROVE' : req.status === 'REJECTED' ? 'REJECT' : 'APPROVE');
                                    setPartialAmount(req.approved_amount ? String(req.approved_amount) : '');
                                    setReqComments(req.review_comments || '');
                                  }}
                                  className="table-btn table-btn-view"
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                  <span className="table-btn-view-text">
                                    <span>View</span>
                                    <span>More</span>
                                  </span>
                                </button>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${req.status === 'SUBMITTED' || req.status === 'PENDING' ? 'badge-submitted' : req.status === 'APPROVED' || req.status === 'DISBURSED' ? 'badge-approved' : 'badge-rejected'}`}>
                                {req.status || '-'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                              {req.request_number || req.reference_number || (req.id ? String(10000 + req.id) : '-')}
                            </td>
                            <td>{formatDate(req.created_at)}</td>
                            <td>{req.maker_name || req.requested_by_name || '-'}</td>
                            <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason || req.justification || ''}>
                              {req.reason || req.justification || '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {req.requested_amount != null ? `₹${Number(req.requested_amount).toLocaleString('en-IN')}` : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Showing top {Math.min(5, fundRequests.length)} of {fundRequests.length} fund requests
                  </span>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>View More</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* Sub-tab 4: Audit (Top 5) */}
            {fundSectionTab === 'audit' && (
              <>
                <div className="spaced-table-container">
                  <table className="spaced-table admin-expenses-table">
                    <thead>
                      <tr>
                        <TableHeadSortMenu
                          label="Timestamp"
                          onSortAsc={() => { setAuditSortKey('timestamp'); setAuditSortDir('asc'); }}
                          onSortDesc={() => { setAuditSortKey('timestamp'); setAuditSortDir('desc'); }}
                          onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                          currentSort={auditSortKey === 'timestamp' ? auditSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Actor"
                          onSortAsc={() => { setAuditSortKey('actor'); setAuditSortDir('asc'); }}
                          onSortDesc={() => { setAuditSortKey('actor'); setAuditSortDir('desc'); }}
                          onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                          currentSort={auditSortKey === 'actor' ? auditSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Action"
                          onSortAsc={() => { setAuditSortKey('action'); setAuditSortDir('asc'); }}
                          onSortDesc={() => { setAuditSortKey('action'); setAuditSortDir('desc'); }}
                          onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                          currentSort={auditSortKey === 'action' ? auditSortDir : null}
                        />
                        <TableHeadSortMenu
                          label="Description"
                          onSortAsc={() => { setAuditSortKey('details'); setAuditSortDir('asc'); }}
                          onSortDesc={() => { setAuditSortKey('details'); setAuditSortDir('desc'); }}
                          onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                          currentSort={auditSortKey === 'details' ? auditSortDir : null}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No audit trail logs recorded yet.
                          </td>
                        </tr>
                      ) : (
                        sortedAudit.slice(0, 5).map(log => (
                          <tr key={log.id}>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                              {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{log.actor_name || 'System'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#334155'
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{log.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Showing top {Math.min(5, auditLogs.length)} of {auditLogs.length} audit logs
                  </span>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>View More</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. EMPLOYEES VIEW (Opens New Tab on View) */}
      {/* ============================================================== */}
      {activeTab === 'employees' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">Employees Directory</h1>
              <p className="page-subtitle">Manage company custodians, checkers, and administrators.</p>
            </div>
            <button 
              onClick={() => {
                setEmpFormError('');
                setShowCreateEmpModal(true);
              }}
              className="btn btn-primary"
            >
              <UserPlus size={16} />
              <span>+ Create Employee</span>
            </button>
          </div>



          {/* Search & Filters */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                placeholder="Search by name, email, department or ID..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
              <Search 
                size={16} 
                color="#94a3b8" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
            </div>

            <select
              value={empRoleFilter}
              onChange={(e) => setEmpRoleFilter(e.target.value)}
              className="form-input"
              style={{ width: '160px' }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins</option>
              <option value="MAKER">Makers</option>
              <option value="CHECKER">Checkers</option>
            </select>

            <select
              value={empStatusFilter}
              onChange={(e) => { setEmpStatusFilter(e.target.value); setEmpPage(1); }}
              className="form-input"
              style={{ width: '150px' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Disabled</option>
            </select>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TableColumnsButton
                columns={EMP_COLUMNS}
                hiddenColumns={empHiddenCols}
                onToggleColumn={toggleEmpCol}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
              <select
                value={empPageSize}
                onChange={(e) => { setEmpPageSize(Number(e.target.value)); setEmpPage(1); }}
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

          {/* Spaced Table for Employees */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
              <div>Loading employees directory...</div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Users size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No employees found matching the filters.
              </div>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      {isEmpColVisible('sno') && (
                        <TableHeadSortMenu
                          label="SR No."
                          columnKey="sno"
                          allColumns={EMP_COLUMNS}
                          hiddenColumns={empHiddenCols}
                          onToggleColumn={toggleEmpCol}
                          onHideColumn={hideEmpCol}
                          filterConfig={empColFilters['sno']}
                          onFilterChange={(f) => setEmpColFilter('sno', f)}
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('actions') && (
                        <TableHeadSortMenu
                          label="Actions"
                          columnKey="actions"
                          align="center"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                          width="110px"
                        />
                      )}
                      {isEmpColVisible('status') && (
                        <TableHeadSortMenu
                          label="Status"
                          columnKey="status"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                          width="100px"
                        />
                      )}
                      {isEmpColVisible('emp_id') && (
                        <TableHeadSortMenu
                          label="Employee ID"
                          columnKey="emp_id"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                          width="110px"
                        />
                      )}
                      {isEmpColVisible('name') && (
                        <TableHeadSortMenu
                          label="User / Full Name"
                          columnKey="name"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('email') && (
                        <TableHeadSortMenu
                          label="Email Address"
                          columnKey="email"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('role') && (
                        <TableHeadSortMenu
                          label="Role"
                          columnKey="role"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('dept') && (
                        <TableHeadSortMenu
                          label="Department"
                          columnKey="dept"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('funds_allocated') && (
                        <TableHeadSortMenu
                          label="Funds Allocated"
                          columnKey="funds_allocated"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('funds_used') && (
                        <TableHeadSortMenu
                          label="Funds Used"
                          columnKey="funds_used"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('funds_remaining') && (
                        <TableHeadSortMenu
                          label="Funds Remaining"
                          columnKey="funds_remaining"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                      {isEmpColVisible('designation') && (
                        <TableHeadSortMenu
                          label="Designation"
                          columnKey="designation"
                          sortConfig={{ key: empSortKey, direction: empSortDir }}
                          onSort={(key, dir) => {
                            setEmpSortKey(key);
                            setEmpSortDir(dir);
                          }}
                        />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((emp, idx) => {
                      const isSelf = emp.id === user?.id;
                      return (
                        <tr key={emp.id}>
                          {isEmpColVisible('sno') && (
                            <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              {(empPage - 1) * empPageSize + idx + 1}
                            </td>
                          )}
                          {isEmpColVisible('actions') && (
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={() => navigate(`/admin/employees/${emp.id}`)}
                                  className="table-btn table-btn-view"
                                  title="View employee profile and expense history"
                                >
                                  <Eye size={13} />
                                  <span className="table-btn-view-text">
                                    <span>View</span>
                                    <span>More</span>
                                  </span>
                                </button>
                                {['MAKER', 'CHECKER'].includes(emp.role) && (
                                  <button
                                    onClick={() => handleOpenAllocateModal(emp)}
                                    className="table-btn table-btn-accept"
                                    title="Allocate funds credit limit"
                                    style={{ borderColor: '#93c5fd', color: '#1d4ed8' }}
                                  >
                                    <Wallet size={13} />
                                    <span>Allocate</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                          {isEmpColVisible('status') && (
                            <td>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: emp.is_active ? '#15803d' : '#b91c1c'
                              }}>
                                <span style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: emp.is_active ? '#16a34a' : '#dc2626'
                                }}></span>
                                {emp.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                          )}
                          {isEmpColVisible('emp_id') && (
                            <td style={{ fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                              {emp.employee_id || 'EMP----'}
                            </td>
                          )}
                          {isEmpColVisible('name') && (
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="avatar-circle" style={{ width: '30px', height: '30px', fontSize: '0.8rem', overflow: 'hidden' }}>
                                  {emp.photo_url ? (
                                    <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    emp.full_name ? emp.full_name[0].toUpperCase() : 'U'
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {emp.full_name}
                                    {isSelf && (
                                      <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>
                                        (You)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                          {isEmpColVisible('email') && (
                            <td style={{ color: '#475569', fontSize: '0.85rem' }}>{emp.email}</td>
                          )}
                          {isEmpColVisible('role') && (
                            <td>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: emp.role === 'ADMIN' ? '#f3e8ff' : emp.role === 'CHECKER' ? '#e0f2fe' : '#dcfce7',
                                color: emp.role === 'ADMIN' ? '#7e22ce' : emp.role === 'CHECKER' ? '#0369a1' : '#15803d'
                              }}>
                                {emp.role}
                              </span>
                            </td>
                          )}
                          {isEmpColVisible('dept') && (
                            <td style={{ fontSize: '0.85rem', color: '#334155' }}>{emp.department || '—'}</td>
                          )}
                          {isEmpColVisible('funds_allocated') && (
                            <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {['MAKER', 'CHECKER'].includes(emp.role)
                                ? `₹${(emp.allocated_funds || 0).toLocaleString('en-IN')}`
                                : '—'}
                            </td>
                          )}
                          {isEmpColVisible('funds_used') && (
                            <td style={{ fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                              {['MAKER', 'CHECKER'].includes(emp.role)
                                ? `₹${(emp.funds_used || 0).toLocaleString('en-IN')}`
                                : '—'}
                            </td>
                          )}
                          {isEmpColVisible('funds_remaining') && (
                            <td style={{
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              color: (emp.funds_remaining || 0) < 0 ? '#dc2626' : '#16a34a'
                            }}>
                              {['MAKER', 'CHECKER'].includes(emp.role) ? (
                                (emp.funds_remaining || 0) < 0 ? (
                                  <span>
                                    -₹{Math.abs(emp.funds_remaining || 0).toLocaleString('en-IN')}
                                    <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', padding: '1px 4px', borderRadius: '4px', marginLeft: '4px', verticalAlign: 'middle' }}>
                                      Deficit
                                    </span>
                                  </span>
                                ) : (
                                  `₹${(emp.funds_remaining || 0).toLocaleString('en-IN')}`
                                )
                              ) : '—'}
                            </td>
                          )}
                          {isEmpColVisible('designation') && (
                            <td style={{ fontSize: '0.85rem', color: '#334155' }}>{emp.designation || '—'}</td>
                          )}
                        </tr>
                      );
                    })}
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
            </>
          )}


        </div>
      )}

      {/* ============================================================== */}
      {/* 3. EXPENSES VIEW (Show All Expenses with Spaced Table) */}
      {/* ============================================================== */}
      {activeTab === 'expenses' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">Company Expenses</h1>
              <p className="page-subtitle">Comprehensive ledger of all expenses across all makers and departments.</p>
            </div>
            <button onClick={exportToCSV} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

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
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="form-input"
                  style={{ width: '180px' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending (Checker)</option>
                  <option value="SENT_TO_ADMIN">Sent to Admin</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="form-input"
                  style={{ width: '160px' }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id || cat.name} value={cat.name}>
                      {cat.name}
                    </option>
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
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                  />
                </div>
                {(searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      setCategoryFilter('ALL');
                      setDateFrom('');
                      setDateTo('');
                      setCurrentPage(1);
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
                <TableColumnsButton
                  columns={EXP_COLUMNS}
                  hiddenColumns={expHiddenCols}
                  onToggleColumn={toggleExpCol}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
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
          </div>

          {/* Expenses Spaced Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
              <div>Loading company expenses...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <ReceiptIndianRupee size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No expenses found matching the criteria.
              </div>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      {isExpColVisible('sno') && (
                        <TableHeadSortMenu
                          label="SR No."
                          columnKey="sno"
                          allColumns={EXP_COLUMNS}
                          hiddenColumns={expHiddenCols}
                          onToggleColumn={toggleExpCol}
                          onHideColumn={hideExpCol}
                          filterConfig={expColFilters['sno']}
                          onFilterChange={(f) => setExpColFilter('sno', f)}
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                          width="60px" 
                        />
                      )}
                      {isExpColVisible('actions') && (
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
                      )}
                      {isExpColVisible('status') && (
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
                      )}
                      {isExpColVisible('ref') && (
                        <TableHeadSortMenu
                          label="Expense ID"
                          columnKey="ref"
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                        />
                      )}
                      {isExpColVisible('date') && (
                        <TableHeadSortMenu
                          label="Date"
                          columnKey="date"
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                        />
                      )}
                      {isExpColVisible('maker') && (
                        <TableHeadSortMenu
                          label="Custodian (Maker)"
                          columnKey="maker"
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                        />
                      )}
                      {isExpColVisible('category') && (
                        <TableHeadSortMenu
                          label="Category"
                          columnKey="category"
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                        />
                      )}
                      {isExpColVisible('payee') && (
                        <TableHeadSortMenu
                          label="Payee / Merchant"
                          columnKey="payee"
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                        />
                      )}
                      {isExpColVisible('desc') && (
                        <TableHeadSortMenu
                          label="Description"
                          columnKey="desc"
                          sortConfig={{ key: expSortKey, direction: expSortDir }}
                          onSort={(key, dir) => {
                            setExpSortKey(key);
                            setExpSortDir(dir);
                          }}
                        />
                      )}
                      {isExpColVisible('amount') && (
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
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpenses.map((exp, idx) => (
                      <tr key={exp.id}>
                        {isExpColVisible('sno') && (
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                        )}
                        {isExpColVisible('actions') && (
                          <td className="table-actions-cell">
                            <div className="table-actions-group">
                              <button
                                onClick={() => setSelectedExpense(exp)}
                                className="table-btn table-btn-view"
                                title="View claim & receipt"
                              >
                                <Eye size={13} />
                                <span className="table-btn-view-text">
                                  <span>View</span>
                                  <span>More</span>
                                </span>
                              </button>

                              {['SUBMITTED', 'SENT_TO_ADMIN'].includes(exp.status) && (
                                <>
                                  <button
                                    onClick={() => openDecisionModal(exp, 'ACCEPT')}
                                    className="table-btn table-btn-accept"
                                    title="Accept claim and post to ledger"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    onClick={() => openDecisionModal(exp, 'REJECT')}
                                    className="table-btn table-btn-reject"
                                    title="Reject claim and restore funds"
                                  >
                                    <XCircle size={13} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                        {isExpColVisible('status') && (
                          <td className="admin-expense-status-cell">{renderStatusBadge(exp.status, exp)}</td>
                        )}
                        {isExpColVisible('ref') && (
                          <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                            {exp.reference_number}
                          </td>
                        )}
                        {isExpColVisible('date') && (
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(exp.expense_date)}</td>
                        )}
                        {isExpColVisible('maker') && (
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{exp.maker_name || 'Maker'}</td>
                        )}
                        {isExpColVisible('category') && (
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
                        )}
                        {isExpColVisible('payee') && (
                          <td style={{ fontSize: '0.85rem' }}>{exp.payee}</td>
                        )}
                        {isExpColVisible('desc') && (
                          <td style={{ maxWidth: '220px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {exp.description}
                            </div>
                          </td>
                        )}
                        {isExpColVisible('amount') && (
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            ₹{exp.amount.toLocaleString('en-IN')}
                          </td>
                        )}
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
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CHECKER EXPENSES VIEW (Dedicated Page) */}
      {/* ============================================================== */}
      {(activeTab === 'checker-expenses' || activeTab === 'checker_expenses') && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={24} color="#7c3aed" />
                  <span>Checker Expenses ({filteredCheckerExpenses.length})</span>
                </h1>
                {filteredCheckerExpenses.filter(e => e.status === 'SENT_TO_ADMIN').length > 0 && (
                  <span className="workman-status-badge status-badge-sent-admin" style={{ fontSize: '0.8rem' }}>
                    <span className="status-dot"></span>
                    {filteredCheckerExpenses.filter(e => e.status === 'SENT_TO_ADMIN').length} Pending Admin Decision
                  </span>
                )}
              </div>
              <p className="page-subtitle">Direct expense claims submitted by Checker custodians requiring Admin decision.</p>
            </div>
            <button onClick={exportCheckerToCSV} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} />
              <span>Export Checker CSV</span>
            </button>
          </div>

          {/* Checker Filters Bar */}
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
                  placeholder="Search checker claims by ref #, checker, payee, desc, category..."
                  value={chkExpSearch}
                  onChange={(e) => { setChkExpSearch(e.target.value); setChkExpCurrentPage(1); }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <select
                  value={chkExpStatusFilter}
                  onChange={(e) => { setChkExpStatusFilter(e.target.value); setChkExpCurrentPage(1); }}
                  className="form-input"
                  style={{ width: '190px' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SENT_TO_ADMIN">Pending Admin Decision</option>
                  <option value="ACCEPTED">Accepted by Admin</option>
                  <option value="REJECTED">Rejected by Admin</option>
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <select
                  value={chkExpCategoryFilter}
                  onChange={(e) => { setChkExpCategoryFilter(e.target.value); setChkExpCurrentPage(1); }}
                  className="form-input"
                  style={{ width: '160px' }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id || cat.name} value={cat.name}>
                      {cat.name}
                    </option>
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
                    value={chkExpDateFrom}
                    onChange={(e) => { setChkExpDateFrom(e.target.value); setChkExpCurrentPage(1); }}
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
                  <input
                    type="date"
                    value={chkExpDateTo}
                    onChange={(e) => { setChkExpDateTo(e.target.value); setChkExpCurrentPage(1); }}
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '140px' }}
                  />
                </div>
                {(chkExpSearch || chkExpStatusFilter !== 'ALL' || chkExpCategoryFilter !== 'ALL' || chkExpDateFrom || chkExpDateTo) && (
                  <button
                    onClick={() => {
                      setChkExpSearch('');
                      setChkExpStatusFilter('ALL');
                      setChkExpCategoryFilter('ALL');
                      setChkExpDateFrom('');
                      setChkExpDateTo('');
                      setChkExpCurrentPage(1);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c3aed',
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
                  value={chkExpPageSize}
                  onChange={(e) => { setChkExpPageSize(Number(e.target.value)); setChkExpCurrentPage(1); }}
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
          </div>

          {/* Checker Table */}
          {filteredCheckerExpenses.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <ShieldCheck size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No Checker expenses found matching the criteria.
              </div>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>SR No.</th>
                      <th style={{ width: '270px', minWidth: '270px', textAlign: 'center' }}>Actions</th>
                      <th style={{ width: '160px', minWidth: '160px' }}>Status</th>
                      <th>Expense ID</th>
                      <th>Date</th>
                      <th>Checker Custodian</th>
                      <th>Category</th>
                      <th>Payee / Merchant</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCheckerExpenses.map((exp, idx) => (
                      <tr key={exp.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {(chkExpCurrentPage - 1) * chkExpPageSize + idx + 1}
                        </td>
                        <td className="table-actions-cell">
                          <div className="table-actions-group">
                            <button
                              onClick={() => setSelectedExpense(exp)}
                              className="table-btn table-btn-view"
                              title="View claim & receipt"
                            >
                              <Eye size={13} />
                              <span className="table-btn-view-text">
                                <span>View</span>
                                <span>More</span>
                              </span>
                            </button>

                            {['SENT_TO_ADMIN', 'SUBMITTED', 'ACCEPTED_BY_CHECKER'].includes(exp.status) && (
                              <>
                                <button
                                  onClick={() => openDecisionModal(exp, 'ACCEPT')}
                                  className="table-btn table-btn-accept"
                                  title="Accept claim and post to ledger"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => openDecisionModal(exp, 'REJECT')}
                                  className="table-btn table-btn-reject"
                                  title="Reject claim and restore funds"
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td>{renderStatusBadge(exp.status, exp)}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {exp.reference_number}
                            {exp.document_url && (
                              <a
                                href={exp.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Receipt"
                                style={{ color: '#2563eb', display: 'inline-flex' }}
                              >
                                <Paperclip size={12} />
                              </a>
                            )}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', color: '#475569', fontSize: '0.825rem' }}>
                          {formatDate(exp.expense_date)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                            {exp.maker_name || 'Checker'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>
                            Checker • {exp.maker_department || 'General'}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: '#334155', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exp.payee}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.825rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>
                          {exp.description}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                          ₹{Number(exp.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Checker Pagination */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <div>
                  Showing {Math.min((chkExpCurrentPage - 1) * chkExpPageSize + 1, totalCheckerEntries)} to {Math.min(chkExpCurrentPage * chkExpPageSize, totalCheckerEntries)} of {totalCheckerEntries} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setChkExpCurrentPage(p => Math.max(1, p - 1))}
                    disabled={chkExpCurrentPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                    {chkExpCurrentPage} / {totalCheckerPages}
                  </span>
                  <button
                    onClick={() => setChkExpCurrentPage(p => Math.min(totalCheckerPages, p + 1))}
                    disabled={chkExpCurrentPage === totalCheckerPages}
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

      {/* ============================================================== */}
      {/* 5. ALLOCATED FUNDS HISTORY VIEW */}
      {/* ============================================================== */}
      {(activeTab === 'allocations' || activeTab === 'vouchers') && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">Allocated Funds ({allocations.length})</h1>
              <p className="page-subtitle">Complete audit history and ledger of funds allocated to Maker and Checker staff.</p>
            </div>
            <button 
              onClick={() => handleOpenAllocateModal()} 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Wallet size={16} />
              <span>+ Allocate Funds</span>
            </button>
          </div>

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
                  placeholder="Search by allocation #, recipient, allocator, ID, notes..."
                  value={alcSearch}
                  onChange={(e) => { setAlcSearch(e.target.value); setAlcPage(1); }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Allocator Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Allocated By:</span>
                <select
                  value={alcRoleFilter}
                  onChange={(e) => { setAlcRoleFilter(e.target.value); setAlcPage(1); }}
                  className="form-input"
                  style={{ width: '150px' }}
                >
                  <option value="ALL">All Allocators</option>
                  <option value="ADMIN">Admin Only</option>
                  <option value="CHECKER">Checker Only</option>
                </select>
              </div>

              {/* Recipient Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Recipient:</span>
                <select
                  value={alcRecipientFilter}
                  onChange={(e) => { setAlcRecipientFilter(e.target.value); setAlcPage(1); }}
                  className="form-input"
                  style={{ width: '150px' }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="MAKER">Makers</option>
                  <option value="CHECKER">Checkers</option>
                </select>
              </div>

              {(alcSearch || alcRoleFilter !== 'ALL' || alcRecipientFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setAlcSearch('');
                    setAlcRoleFilter('ALL');
                    setAlcRecipientFilter('ALL');
                    setAlcPage(1);
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

              {/* Rows per page */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                <select
                  value={alcPageSize}
                  onChange={(e) => { setAlcPageSize(Number(e.target.value)); setAlcPage(1); }}
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
          </div>

          {/* Table */}
          {filteredAllocations.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Wallet size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No fund allocations found matching the criteria.
              </div>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>SR No.</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Details</th>
                      <th>Allocation #</th>
                      <th>Date & Time</th>
                      <th>Allocated By</th>
                      <th>Allocated To</th>
                      <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                      <th style={{ textAlign: 'right' }}>Prev Balance</th>
                      <th style={{ textAlign: 'right' }}>New Balance</th>
                      <th>Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAllocations.map((alc, idx) => (
                      <tr key={alc.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {(alcPage - 1) * alcPageSize + idx + 1}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedAlcDetails(alc)}
                            className="table-btn table-btn-view"
                            title="View Allocation Details"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                          {alc.allocation_number}
                        </td>
                        <td>{formatDateTime(alc.created_at)}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{alc.allocated_by_name}</span>{' '}
                          <span className="badge badge-submitted" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                            {alc.allocator_role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{alc.allocated_to_name}</span>
                            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                              {alc.allocated_to_employee_id} • {alc.recipient_role}{alc.allocated_to_department ? ` • ${alc.allocated_to_department}` : ''}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>
                          ₹{(alc.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          ₹{(alc.recipient_previous_balance || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          ₹{(alc.recipient_new_balance || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={alc.notes}>
                          {alc.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <div>
                  Showing {Math.min((alcPage - 1) * alcPageSize + 1, filteredAllocations.length)} to {Math.min(alcPage * alcPageSize, filteredAllocations.length)} of {filteredAllocations.length} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setAlcPage(p => Math.max(1, p - 1))}
                    disabled={alcPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                    {alcPage} / {alcTotalPages}
                  </span>
                  <button
                    onClick={() => setAlcPage(p => Math.min(alcTotalPages, p + 1))}
                    disabled={alcPage >= alcTotalPages}
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

      {/* ============================================================== */}
      {/* 6. FUND REQUESTS VIEW */}
      {/* ============================================================== */}
      {activeTab === 'requests' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">Fund Requests ({fundRequests.length})</h1>
              <p className="page-subtitle">Additional fund replenishment requests submitted by makers for admin review.</p>
            </div>
          </div>

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
                  placeholder="Search by Request ID only (e.g. 10001)..."
                  value={reqSearch}
                  onChange={(e) => { setReqSearch(e.target.value); setReqPage(1); }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <select
                  value={reqStatusFilter}
                  onChange={(e) => { setReqStatusFilter(e.target.value); setReqPage(1); }}
                  className="form-input"
                  style={{ width: '180px' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SENT_TO_ADMIN">Sent to Admin (Pending Decision)</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DISBURSED">Disbursed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Rows per page */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TableColumnsButton
                  columns={REQ_COLUMNS}
                  hiddenColumns={reqHiddenCols}
                  onToggleColumn={toggleReqCol}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                <select
                  value={reqPageSize}
                  onChange={(e) => { setReqPageSize(Number(e.target.value)); setReqPage(1); }}
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
          </div>

          {/* Requests Table */}
          {filteredRequests.length === 0 ? (
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
                No fund requests found matching the criteria.
              </div>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      {isReqColVisible('sno') && (
                        <TableHeadSortMenu
                          label="SR No."
                          columnKey="sno"
                          allColumns={REQ_COLUMNS}
                          hiddenColumns={reqHiddenCols}
                          onToggleColumn={toggleReqCol}
                          onHideColumn={hideReqCol}
                          filterConfig={reqColFilters['sno']}
                          onFilterChange={(f) => setReqColFilter('sno', f)}
                          onSortAsc={() => { setReqSortKey('sno'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('sno'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'sno' ? reqSortDir : null}
                          style={{ width: '85px' }}
                        />
                      )}
                      {isReqColVisible('actions') && (
                        <TableHeadSortMenu
                          label="Actions"
                          columnKey="actions"
                          align="center"
                          onSortAsc={() => { setReqSortKey('actions'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('actions'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'actions' ? reqSortDir : null}
                          width="130px"
                        />
                      )}
                      {isReqColVisible('status') && (
                        <TableHeadSortMenu
                          label="Status"
                          columnKey="status"
                          onSortAsc={() => { setReqSortKey('status'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('status'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'status' ? reqSortDir : null}
                        />
                      )}
                      {isReqColVisible('req_num') && (
                        <TableHeadSortMenu
                          label="Request #"
                          columnKey="req_num"
                          onSortAsc={() => { setReqSortKey('req_num'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('req_num'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'req_num' ? reqSortDir : null}
                        />
                      )}
                      {isReqColVisible('date') && (
                        <TableHeadSortMenu
                          label="Date"
                          columnKey="date"
                          onSortAsc={() => { setReqSortKey('date'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('date'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'date' ? reqSortDir : null}
                        />
                      )}
                      {isReqColVisible('maker') && (
                        <TableHeadSortMenu
                          label="Requested By"
                          columnKey="maker"
                          onSortAsc={() => { setReqSortKey('maker'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('maker'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'maker' ? reqSortDir : null}
                        />
                      )}
                      {isReqColVisible('desc') && (
                        <TableHeadSortMenu
                          label="Justification"
                          columnKey="desc"
                          onSortAsc={() => { setReqSortKey('desc'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('desc'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'desc' ? reqSortDir : null}
                        />
                      )}
                      {isReqColVisible('amount') && (
                        <TableHeadSortMenu
                          label="Requested Amount"
                          columnKey="amount"
                          align="right"
                          onSortAsc={() => { setReqSortKey('amount'); setReqSortDir('asc'); }}
                          onSortDesc={() => { setReqSortKey('amount'); setReqSortDir('desc'); }}
                          onReset={() => { setReqSortKey(null); setReqSortDir(null); }}
                          currentSort={reqSortKey === 'amount' ? reqSortDir : null}
                        />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((req, idx) => (
                      <tr key={req.id}>
                        {isReqColVisible('sno') && (
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {(reqPage - 1) * reqPageSize + idx + 1}
                          </td>
                        )}
                        {isReqColVisible('actions') && (
                          <td style={{ textAlign: 'center' }}>
                            {req.status === 'SENT_TO_ADMIN' || req.status === 'SUBMITTED' || req.status === 'PENDING' ? (
                              <button
                                onClick={() => {
                                  setSelectedReq(req);
                                  setReqAction('APPROVE');
                                  setPartialAmount('');
                                  setReqComments('');
                                }}
                                className="table-btn table-btn-view"
                                title="Review Request"
                              >
                                <Eye size={13} />
                                <span>Review</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedReq(req);
                                  setReqAction(req.status === 'APPROVED' ? 'APPROVE' : req.status === 'REJECTED' ? 'REJECT' : 'APPROVE');
                                  setPartialAmount(req.approved_amount ? String(req.approved_amount) : '');
                                  setReqComments(req.review_comments || '');
                                }}
                                className="table-btn table-btn-view"
                                title="View Details"
                              >
                                <Eye size={13} />
                                <span className="table-btn-view-text">
                                  <span>View</span>
                                  <span>More</span>
                                </span>
                              </button>
                            )}
                          </td>
                        )}
                        {isReqColVisible('status') && (
                          <td>
                            {req.status === 'SENT_TO_ADMIN' ? (
                              <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                                Sent to Admin {req.checker_name ? `(${req.checker_name})` : ''}
                              </span>
                            ) : (
                              <span className={`badge ${req.status === 'SUBMITTED' || req.status === 'PENDING' ? 'badge-submitted' : req.status === 'APPROVED' || req.status === 'DISBURSED' ? 'badge-approved' : 'badge-rejected'}`}>
                                {req.status || '-'}
                              </span>
                            )}
                          </td>
                        )}
                        {isReqColVisible('req_num') && (
                          <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                            {req.request_number || req.reference_number || (req.id ? String(10000 + req.id) : '-')}
                          </td>
                        )}
                        {isReqColVisible('date') && (
                          <td>{formatDate(req.created_at)}</td>
                        )}
                        {isReqColVisible('maker') && (
                          <td>{req.maker_name || req.requested_by_name || '-'}</td>
                        )}
                        {isReqColVisible('desc') && (
                          <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason || req.justification || ''}>
                            {req.reason || req.justification || '-'}
                          </td>
                        )}
                        {isReqColVisible('amount') && (
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {req.requested_amount != null ? `₹${Number(req.requested_amount).toLocaleString('en-IN')}` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <div>
                  Showing {Math.min((reqPage - 1) * reqPageSize + 1, filteredRequests.length)} to {Math.min(reqPage * reqPageSize, filteredRequests.length)} of {filteredRequests.length} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setReqPage(p => Math.max(1, p - 1))}
                    disabled={reqPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                    {reqPage} / {reqTotalPages}
                  </span>
                  <button
                    onClick={() => setReqPage(p => Math.min(reqTotalPages, p + 1))}
                    disabled={reqPage >= reqTotalPages}
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

      {/* ============================================================== */}
      {/* 7. AUDIT TRAIL VIEW */}
      {/* ============================================================== */}
      {activeTab === 'audit' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">Audit Trail ({auditLogs.length})</h1>
              <p className="page-subtitle">Immutable log recording user actions, claims, approvals, and financial adjustments.</p>
            </div>
          </div>

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
                  placeholder="Search by actor, action, description..."
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Action Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Action:</span>
                <select
                  value={auditActionFilter}
                  onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                  className="form-input"
                  style={{ width: '180px' }}
                >
                  <option value="ALL">All Actions</option>
                  {uniqueAuditActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              {/* Rows per page */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
                <select
                  value={auditPageSize}
                  onChange={(e) => { setAuditPageSize(Number(e.target.value)); setAuditPage(1); }}
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
          </div>

          {/* Audit Table */}
          {filteredAudit.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <History size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No audit logs found matching the criteria.
              </div>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      <TableHeadSortMenu
                        label="SR No."
                        onSortAsc={() => { setAuditSortKey('sno'); setAuditSortDir('asc'); }}
                        onSortDesc={() => { setAuditSortKey('sno'); setAuditSortDir('desc'); }}
                        onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                        currentSort={auditSortKey === 'sno' ? auditSortDir : null}
                        style={{ width: '85px' }}
                      />
                      <TableHeadSortMenu
                        label="Timestamp"
                        onSortAsc={() => { setAuditSortKey('timestamp'); setAuditSortDir('asc'); }}
                        onSortDesc={() => { setAuditSortKey('timestamp'); setAuditSortDir('desc'); }}
                        onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                        currentSort={auditSortKey === 'timestamp' ? auditSortDir : null}
                      />
                      <TableHeadSortMenu
                        label="Actor"
                        onSortAsc={() => { setAuditSortKey('actor'); setAuditSortDir('asc'); }}
                        onSortDesc={() => { setAuditSortKey('actor'); setAuditSortDir('desc'); }}
                        onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                        currentSort={auditSortKey === 'actor' ? auditSortDir : null}
                      />
                      <TableHeadSortMenu
                        label="Action"
                        onSortAsc={() => { setAuditSortKey('action'); setAuditSortDir('asc'); }}
                        onSortDesc={() => { setAuditSortKey('action'); setAuditSortDir('desc'); }}
                        onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                        currentSort={auditSortKey === 'action' ? auditSortDir : null}
                      />
                      <TableHeadSortMenu
                        label="Description"
                        onSortAsc={() => { setAuditSortKey('details'); setAuditSortDir('asc'); }}
                        onSortDesc={() => { setAuditSortKey('details'); setAuditSortDir('desc'); }}
                        onReset={() => { setAuditSortKey(null); setAuditSortDir(null); }}
                        currentSort={auditSortKey === 'details' ? auditSortDir : null}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAudit.map((log, idx) => (
                      <tr key={log.id}>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {(auditPage - 1) * auditPageSize + idx + 1}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                          {formatDateTime(log.created_at)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.actor_name || 'System'}</td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.25rem',
                fontSize: '0.85rem',
                color: '#64748b'
              }}>
                <div>
                  Showing {Math.min((auditPage - 1) * auditPageSize + 1, filteredAudit.length)} to {Math.min(auditPage * auditPageSize, filteredAudit.length)} of {filteredAudit.length} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                    disabled={auditPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                    {auditPage} / {auditTotalPages}
                  </span>
                  <button
                    onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                    disabled={auditPage >= auditTotalPages}
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

      {/* ============================================================== */}
      {/* 4. CLAIM VIEW POPUP MODAL (PDF Viewer & Side Download Button) */}
      {/* ============================================================== */}
      {selectedExpense && !decisionType && (
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
                    {selectedExpense.expense_date}
                  </div>
                </div>
              </div>

              {/* Claim Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Maker (Custodian):</span>
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
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Fund Account:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedExpense.fund_account_name || 'Petty Cash Main Account'}</div>
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

              {/* PDF & Receipt Viewer with Inline Visual Preview & Popup Viewer */}
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

                      {/* View Proof Button */}
                      <div>
                        <a
                          href={getMediaUrl(selectedExpense.document_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{
                            padding: '8px 18px',
                            fontSize: '0.825rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                          title="Open attached proof document in a new window"
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
                      fontSize: '0.825rem',
                      textAlign: 'center'
                    }}>
                      No receipt attachment uploaded for this claim.
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow & Audit Trail */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Verification & Decision Trail:</span>
                <div style={{
                  marginTop: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.825rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ color: '#2563eb', marginTop: '2px' }}><CheckCircle2 size={14} /></div>
                    <div>
                      <strong>Submitted:</strong> by {selectedExpense.maker_name || 'Custodian'} on {formatDate(selectedExpense.expense_date)}
                    </div>
                  </div>

                  {selectedExpense.checker_action && selectedExpense.checker_action !== 'NONE' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ color: selectedExpense.checker_action === 'ACCEPT' ? '#10b981' : '#f97316', marginTop: '2px' }}>
                        {selectedExpense.checker_action === 'ACCEPT' ? <CheckCircle2 size={14} /> : <Send size={14} />}
                      </div>
                      <div>
                        <strong>Checker Action ({selectedExpense.checker_action === 'ACCEPT' ? 'Accepted' : 'Escalated to Admin'}):</strong> by {selectedExpense.checker_name || 'Checker'}
                        {(selectedExpense.checker_comments || selectedExpense.checker_notes) && (
                          <div style={{ color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                            "{selectedExpense.checker_comments || selectedExpense.checker_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ color: '#d97706', marginTop: '2px' }}><Clock size={14} /></div>
                      <div>
                        <strong>Checker Review:</strong> Pending / Bypassed directly by Admin
                      </div>
                    </div>
                  )}

                  {selectedExpense.admin_decision && selectedExpense.admin_decision !== 'NONE' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ color: selectedExpense.admin_decision === 'ACCEPT' ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                        {selectedExpense.admin_decision === 'ACCEPT' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      </div>
                      <div>
                        <strong>Admin Decision ({selectedExpense.admin_decision === 'ACCEPT' ? 'Accepted & Posted' : 'Rejected'}):</strong> by {selectedExpense.admin_name || 'Admin'}
                        {(selectedExpense.admin_comments || selectedExpense.admin_notes) && (
                          <div style={{ color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                            "{selectedExpense.admin_comments || selectedExpense.admin_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions if awaiting Admin Decision (including pending checker) */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => setSelectedExpense(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>

              {['SUBMITTED', 'SENT_TO_ADMIN'].includes(selectedExpense.status) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setDecisionType('REJECT');
                      setComments('');
                    }}
                    className="btn btn-sm"
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px'
                    }}
                  >
                    <XCircle size={14} />
                    <span>Reject Claim</span>
                  </button>

                  <button
                    onClick={() => {
                      setDecisionType('ACCEPT');
                      setComments('');
                    }}
                    className="btn btn-sm"
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px'
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Accept Claim</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ============================================================== */}
      {/* 5. DECISION CONFIRMATION MODAL (Accept or Mandatory Reject) */}
      {/* ============================================================== */}
      {decisionType && selectedExpense && (
        <div className="modal-overlay-custom" onClick={closeDecisionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {decisionType === 'ACCEPT' ? (
                  <CheckCircle2 size={20} color="#10b981" />
                ) : (
                  <XCircle size={20} color="#ef4444" />
                )}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {decisionType === 'ACCEPT' ? 'Accept Expense Claim' : 'Reject Expense Claim'}
                </h3>
              </div>
              <button onClick={closeDecisionModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.85rem'
                }}>
                  <div>Claim: <strong>{selectedExpense.reference_number}</strong></div>
                  <div>Maker: <strong>{selectedExpense.maker_name || 'Maker'}</strong></div>
                  <div>Amount: <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₹{selectedExpense.amount.toLocaleString('en-IN')}</strong></div>
                </div>

                {decisionType === 'ACCEPT' ? (
                  <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                    Accepting will immediately post this expenditure into the financial ledger and finalize reconciliation.
                  </p>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#b91c1c', marginBottom: '6px' }}>
                      Rejection Reason (Mandatory)*:
                    </label>
                    <textarea
                      rows={3}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Specify clear justification for rejection. The amount will be released back to the custodian's available balance..."
                      className="form-input"
                      required
                    />
                  </div>
                )}
              </div>

              <div style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}>
                <button type="button" onClick={closeDecisionModal} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision || (decisionType === 'REJECT' && !comments.trim())}
                  className="btn btn-sm"
                  style={{
                    background: decisionType === 'ACCEPT' ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px'
                  }}
                >
                  {submittingDecision ? 'Processing...' : decisionType === 'ACCEPT' ? 'Confirm Acceptance' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CREATE EMPLOYEE MODAL */}
      {/* ============================================================== */}
      {showCreateEmpModal && (
        <div className="modal-overlay-custom" onClick={() => setShowCreateEmpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Create Employee Account
                </h3>
              </div>
              <button onClick={() => setShowCreateEmpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {empFormError && (
              <div style={{
                margin: '1rem 1.25rem 0',
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}>
                {empFormError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newEmpFullName}
                    onChange={(e) => setNewEmpFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      placeholder="user@company.com"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Role *</label>
                    <select
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      className="form-input"
                    >
                      <option value="MAKER">Maker (Custodian)</option>
                      <option value="CHECKER">Checker (Auditor)</option>
                    </select>
                    <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
                      Admins can provision Maker and Checker accounts.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Department</label>
                    </div>

                    {!showInlineDeptInput ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={newEmpDept}
                          onChange={(e) => setNewEmpDept(e.target.value)}
                          className="form-input"
                          style={{ flex: 1 }}
                        >
                          <option value="">Select Department...</option>
                          {departments.filter(d => d.is_active).map(d => (
                            <option key={d.id} value={d.name}>{d.name} ({d.code || 'DEPT'})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowInlineDeptInput(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0 10px', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}
                          title="Create new department"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Type department name..."
                          value={customDeptText}
                          onChange={(e) => setCustomDeptText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleQuickAddDepartment();
                            }
                          }}
                          className="form-input"
                          autoFocus
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddDepartment}
                          disabled={creatingCustomDept}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          {creatingCustomDept ? '...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInlineDeptInput(false);
                            setCustomDeptText('');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      value={newEmpDesignation}
                      onChange={(e) => setNewEmpDesignation(e.target.value)}
                      placeholder="e.g. Petty Cash Custodian"
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Initial Password (Optional)</label>
                  <input
                    type="text"
                    value={newEmpCustomPassword}
                    onChange={(e) => setNewEmpCustomPassword(e.target.value)}
                    placeholder="Leave empty to auto-generate a secure password"
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
                <button type="button" onClick={() => setShowCreateEmpModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEmp}
                  className="btn btn-primary btn-sm"
                >
                  {creatingEmp ? 'Creating Account...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. TEMPORARY PASSWORD NOTICE MODAL */}
      {/* ============================================================== */}
      {tempPasswordNotice && (
        <div className="modal-overlay-custom" onClick={() => setTempPasswordNotice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#16a34a" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Temporary Password Generated
                </h3>
              </div>
              <button onClick={() => setTempPasswordNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                Please share these credentials securely with <strong>{tempPasswordNotice.name}</strong>.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Login Email / ID:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                  {tempPasswordNotice.email} ({tempPasswordNotice.employee_id})
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px' }}>Temporary Password:</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginTop: '4px'
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: '#2563eb' }}>
                    {tempPasswordNotice.password}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tempPasswordNotice.password)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: copied ? '#16a34a' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setTempPasswordNotice(null)}
                className="btn btn-primary btn-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. ISSUE SUPPLEMENTARY VOUCHER MODAL */}
      {/* ============================================================== */}
      {showVoucherModal && (
        <div className="modal-overlay-custom" onClick={() => setShowVoucherModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ReceiptIndianRupee size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Issue Supplementary Voucher
                </h3>
              </div>
              <button onClick={() => setShowVoucherModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Target Shared Fund Account *</label>
                  <select
                    required
                    value={vchAccount || (accounts.length > 0 ? accounts[0].id : '')}
                    onChange={(e) => {
                      const accId = e.target.value;
                      setVchAccount(accId);
                      const acc = accounts.find(a => String(a.id) === String(accId));
                      if (acc?.maker_details?.full_name && !vchBeneficiary) {
                        setVchBeneficiary(acc.maker_details.full_name);
                      }
                    }}
                    className="form-input"
                  >
                    {accounts.length === 0 ? (
                      <option value="">No fund accounts available</option>
                    ) : (
                      accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.account_id || acc.account_code || 'FA-0001'}) — Avail: ₹{acc.available_balance.toLocaleString('en-IN')}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Top-Up Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={vchAmount}
                      onChange={(e) => setVchAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Beneficiary / Custodian</label>
                    <input
                      type="text"
                      value={vchBeneficiary}
                      onChange={(e) => setVchBeneficiary(e.target.value)}
                      placeholder="e.g. Custodian Name"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Payment Mode</label>
                    <select
                      value={vchPaymentMode}
                      onChange={(e) => setVchPaymentMode(e.target.value)}
                      className="form-input"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Payment Reference</label>
                    <input
                      type="text"
                      value={vchPaymentRef}
                      onChange={(e) => setVchPaymentRef(e.target.value)}
                      placeholder="Transaction / UTR #"
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Purpose / Notes</label>
                  <input
                    type="text"
                    value={vchPurpose}
                    onChange={(e) => setVchPurpose(e.target.value)}
                    placeholder="e.g. Supplementary replenishment for operations"
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
                <button type="button" onClick={() => setShowVoucherModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creatingVoucher} className="btn btn-primary btn-sm">
                  {creatingVoucher ? 'Issuing...' : 'Issue Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. REVIEW FUND REQUEST MODAL */}
      {/* ============================================================== */}
      {selectedReq && (
        <div className="modal-overlay-custom" onClick={() => setSelectedReq(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {['SENT_TO_ADMIN', 'SUBMITTED', 'PENDING'].includes(selectedReq.status) ? 'Review Fund Request' : 'Fund Request Details'}
                </h3>
              </div>
              <button onClick={() => setSelectedReq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {['SENT_TO_ADMIN', 'SUBMITTED', 'PENDING'].includes(selectedReq.status) ? (
              <form onSubmit={handleReviewFundRequest}>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div>Request #: <strong>{selectedReq.request_number || selectedReq.reference_number || (selectedReq.id ? String(10000 + selectedReq.id) : '-')}</strong></div>
                    <div>Requested By: <strong>{selectedReq.maker_name || selectedReq.requested_by_name || '-'}</strong></div>
                    <div>Fund Account: <strong>{selectedReq.fund_account_name || selectedReq.fund_account_code || '-'}</strong></div>
                    <div>Date: <strong>{selectedReq.created_at ? selectedReq.created_at.slice(0, 10) : '-'}</strong></div>
                    <div>Requested Amount: <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₹{(selectedReq.requested_amount ?? 0).toLocaleString('en-IN')}</strong></div>
                    <div>Justification: <em>"{selectedReq.reason || selectedReq.justification || '-'}"</em></div>
                    <div>
                      Supporting Document:{' '}
                      {selectedReq.document_url ? (
                        <a href={getMediaUrl(selectedReq.document_url)} target="_blank" rel="noopener noreferrer">View attachment</a>
                      ) : 'None attached'}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Review Action</label>
                    <select
                      value={reqAction}
                      onChange={(e) => setReqAction(e.target.value)}
                      className="form-input"
                    >
                      <option value="APPROVE">Approve Full Amount (₹{(selectedReq.requested_amount ?? 0).toLocaleString('en-IN')})</option>
                      <option value="PARTIALLY_APPROVE">Partially Approve</option>
                      <option value="REJECT">Reject Request</option>
                    </select>
                  </div>

                  {reqAction === 'PARTIALLY_APPROVE' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          Approved Partial Amount (₹) *
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Max limit: ₹{Math.max(1, selectedReq.requested_amount - 1).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <input
                        type="number"
                        required
                        min="1"
                        max={Math.max(1, selectedReq.requested_amount - 1)}
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder={`Enter amount between ₹1 and ₹${Math.max(1, selectedReq.requested_amount - 1).toLocaleString('en-IN')}`}
                        className="form-input"
                        style={{
                          borderColor: (partialAmount !== '' && (parseInt(partialAmount, 10) <= 0 || parseInt(partialAmount, 10) >= selectedReq.requested_amount))
                            ? '#ef4444'
                            : '#cbd5e1'
                        }}
                      />
                      {/* Real-time inline feedback */}
                      {partialAmount !== '' && parseInt(partialAmount, 10) <= 0 && (
                        <div style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>Approved partial amount cannot be ₹0. It must be greater than ₹0.</span>
                        </div>
                      )}
                      {partialAmount !== '' && parseInt(partialAmount, 10) > selectedReq.requested_amount && (
                        <div style={{ color: '#dc2626', fontSize: '0.775rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>Cannot be greater than requested amount of ₹{Number(selectedReq.requested_amount).toLocaleString('en-IN')}.</span>
                        </div>
                      )}
                      {partialAmount !== '' && parseInt(partialAmount, 10) === selectedReq.requested_amount && (
                        <div style={{ color: '#d97706', fontSize: '0.775rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={13} style={{ flexShrink: 0 }} />
                          <span>Equal to full amount. Use &quot;Approve Full Amount&quot; instead.</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="form-label">Admin Remarks {reqAction === 'REJECT' && '*'}</label>
                    <textarea
                      rows={3}
                      value={reqComments}
                      onChange={(e) => setReqComments(e.target.value)}
                      placeholder="Enter approval conditions or rejection reasons..."
                      className="form-input"
                      required={reqAction === 'REJECT'}
                    />
                  </div>

                  {reqAction !== 'REJECT' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoDisburse}
                        onChange={(e) => setAutoDisburse(e.target.checked)}
                      />
                      <span>Automatically create supplementary disbursement voucher</span>
                    </label>
                  )}
                </div>

                <div style={{
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  background: '#f8fafc'
                }}>
                  <button type="button" onClick={() => setSelectedReq(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={reviewingReq} className="btn btn-primary btn-sm">
                    {reviewingReq ? 'Processing...' : 'Submit Decision'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div>Request #: <strong>{selectedReq.request_number || selectedReq.reference_number || (selectedReq.id ? String(10000 + selectedReq.id) : '-')}</strong></div>
                    <div>Requested By: <strong>{selectedReq.maker_name || selectedReq.requested_by_name || '-'}</strong></div>
                    <div>Fund Account: <strong>{selectedReq.fund_account_name || selectedReq.fund_account_code || '-'}</strong></div>
                    <div>Date: <strong>{formatDate(selectedReq.created_at)}</strong></div>
                    <div>Requested Amount: <strong style={{ color: '#0f172a' }}>₹{(selectedReq.requested_amount ?? 0).toLocaleString('en-IN')}</strong></div>
                    {selectedReq.approved_amount != null && selectedReq.status !== 'REJECTED' && (
                      <div>Approved Amount: <strong style={{ color: '#16a34a' }}>₹{Number(selectedReq.approved_amount).toLocaleString('en-IN')}</strong></div>
                    )}
                    <div>Justification: <em>"{selectedReq.reason || selectedReq.justification || '-'}"</em></div>
                    <div>
                      Supporting Document:{' '}
                      {selectedReq.document_url ? (
                        <a href={getMediaUrl(selectedReq.document_url)} target="_blank" rel="noopener noreferrer">View attachment</a>
                      ) : 'None attached'}
                    </div>
                    <div>Status: <span className={`badge ${selectedReq.status === 'APPROVED' || selectedReq.status === 'DISBURSED' ? 'badge-approved' : 'badge-rejected'}`}>{selectedReq.status || '-'}</span></div>
                    {selectedReq.reviewed_by_name && (
                      <div>Reviewed By: <strong>{selectedReq.reviewed_by_name}</strong> {selectedReq.reviewed_at ? `on ${formatDate(selectedReq.reviewed_at)}` : ''}</div>
                    )}
                    {selectedReq.review_comments && (
                      <div>Admin Remarks: <em>"{selectedReq.review_comments}"</em></div>
                    )}
                  </div>
                </div>
                <div style={{
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: '#f8fafc'
                }}>
                  <button type="button" onClick={() => setSelectedReq(null)} className="btn btn-secondary btn-sm">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. DEPARTMENT MASTERS MODAL (Create / Edit) */}
      {/* ============================================================== */}
      {showDeptModal && (
        <div className="modal-overlay-custom" onClick={() => setShowDeptModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h3>
              </div>
              <button onClick={() => setShowDeptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateDept}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Operations, Finance, Logistics"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Department Code</label>
                  <input
                    type="text"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. OPS, FIN, LOG"
                    maxLength={20}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Brief description of department scope..."
                    rows={2}
                    className="form-input"
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={deptActive}
                    onChange={(e) => setDeptActive(e.target.checked)}
                  />
                  <span>Active Department (available for employee assignment)</span>
                </label>
              </div>

              <div style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}>
                <button type="button" onClick={() => setShowDeptModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={savingDept} className="btn btn-primary btn-sm">
                  {savingDept ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Allocate Funds Modal */}
      {showAllocateModal && (
        <div className="modal-overlay-custom" onClick={() => setShowAllocateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#2563eb" />
                Allocate Funds to Employee
              </h3>
              <button onClick={() => setShowAllocateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAllocateFundsSubmit}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Select Employee (Maker / Checker) *</label>
                  <select
                    className="form-input"
                    value={selectedEmpToAllocate?.id || ''}
                    onChange={(e) => {
                      const found = employees.find(emp => String(emp.id) === e.target.value);
                      setSelectedEmpToAllocate(found || null);
                      if (found) setAllocateAmount(String(found.allocated_funds || 0));
                    }}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.filter(e => ['MAKER', 'CHECKER'].includes(e.role)).map(e => (
                      <option key={e.id} value={e.id}>
                        {e.employee_id || `EMP-${e.id}`} - {e.full_name} ({e.role})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmpToAllocate && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Current Limit (Allocated):</span>
                      <strong style={{ color: '#0f172a' }}>₹{(selectedEmpToAllocate.allocated_funds || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Current Funds Used:</span>
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

                <div className="form-group">
                  <label className="form-label">Amount to Allocate (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-input"
                    value={allocateAmount}
                    onChange={(e) => setAllocateAmount(e.target.value)}
                    placeholder="Enter amount to add, e.g. 5000"
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    This amount will be added directly to the employee's existing balance limit.
                  </div>
                </div>

                {selectedEmpToAllocate && Number(allocateAmount) > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>New Total Allocated Limit:</span>
                    <strong style={{ color: '#15803d', fontSize: '1rem' }}>
                      ₹{((selectedEmpToAllocate.allocated_funds || 0) + Number(allocateAmount)).toLocaleString('en-IN')}
                    </strong>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes / Justification</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={allocateNotes}
                    onChange={(e) => setAllocateNotes(e.target.value)}
                    placeholder="Optional justification or allocation remarks..."
                  />
                </div>
              </div>
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}>
                <button type="button" onClick={() => setShowAllocateModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={allocatingFunds} className="btn btn-primary btn-sm">
                  {allocatingFunds ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 8. ALLOCATION DETAILS MODAL */}
      {selectedAlcDetails && (
        <div className="modal-overlay-custom" onClick={() => setSelectedAlcDetails(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#2563eb" />
                Allocation Details • {selectedAlcDetails.allocation_number}
              </h3>
              <button onClick={() => setSelectedAlcDetails(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date & Time:</span>
                  <strong style={{ color: '#0f172a' }}>{formatDateTime(selectedAlcDetails.created_at)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Allocated By:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedAlcDetails.allocated_by_name} ({selectedAlcDetails.allocator_role})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Allocated To:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedAlcDetails.allocated_to_name} ({selectedAlcDetails.allocated_to_employee_id} • {selectedAlcDetails.recipient_role})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedAlcDetails.allocated_to_department || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <span style={{ color: '#64748b' }}>Allocated Amount:</span>
                  <strong style={{ color: '#16a34a', fontSize: '1.05rem' }}>₹{(selectedAlcDetails.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Recipient Prev Limit:</span>
                  <strong style={{ color: '#475569' }}>₹{(selectedAlcDetails.recipient_previous_balance || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Recipient New Limit:</span>
                  <strong style={{ color: '#0f172a' }}>₹{(selectedAlcDetails.recipient_new_balance || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>Notes / Remarks</label>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#1e293b' }}>
                  {selectedAlcDetails.notes || 'No remarks provided.'}
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
        </div>
      )}

    </div>
  );
}