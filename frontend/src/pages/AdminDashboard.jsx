import { createPortal } from 'react-dom';
import GoogleSpinner, { LoadingScreen } from '../components/GoogleSpinner';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api, {
  getMediaUrl,
  formatDate,
  formatDateTime,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchVendorsSummary,
  fetchVendorDetail,
  createSavedVendor,
  deleteSavedVendor
} from '../api';
import SearchableDropdown from '../components/SearchableDropdown';
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
  Save,
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
  Paperclip,
  Tags,
  Store
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, updateUser } = useAuth();
  const { alert: showAlert, confirm } = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawActiveTab = searchParams.get('tab') || 'dashboard';
  const activeTab = rawActiveTab === 'accounts' ? 'dashboard' : (rawActiveTab === 'vouchers' || rawActiveTab === 'allocated_funds' || rawActiveTab === 'allocated-funds') ? 'allocations' : (rawActiveTab === 'checker_expenses' || rawActiveTab === 'checker-expenses') ? 'checker-expenses' : (rawActiveTab === 'categories' || rawActiveTab === 'expense-categories') ? 'categories' : (rawActiveTab === 'departments' || rawActiveTab === 'department') ? 'departments' : (rawActiveTab === 'vendors' || rawActiveTab === 'vendors-list') ? 'vendors' : rawActiveTab;

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
  const [fundModalType, setFundModalType] = useState(null); // 'allocated' | 'used' | 'remaining' | null
  const [fundModalSearch, setFundModalSearch] = useState('');
  const [fundModalRoleFilter, setFundModalRoleFilter] = useState('ALL'); // 'ALL' | 'MAKER' | 'CHECKER'
  const [selectedEmpToAllocate, setSelectedEmpToAllocate] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateDate, setAllocateDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocateVoucherNumber, setAllocateVoucherNumber] = useState('');
  const [allocatePaymentType, setAllocatePaymentType] = useState('Cash');
  const [allocateOtherPaymentType, setAllocateOtherPaymentType] = useState('');
  const [allocateDescription, setAllocateDescription] = useState('');
  const [allocatingFunds, setAllocatingFunds] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Vendors tab states
  const [vendorsList, setVendorsList] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorTypeFilter, setVendorTypeFilter] = useState('ALL'); // 'ALL' | 'SAVED' | 'AUTO'
  const [vendorSortKey, setVendorSortKey] = useState('spend_desc');
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorPageSize, setVendorPageSize] = useState(10);

  // View More Modal state (Vendor 360 Breakdown)
  const [selectedVendorDetails, setSelectedVendorDetails] = useState(null);
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);
  const [vendorDetailsTab, setVendorDetailsTab] = useState('employees'); // 'employees' | 'expenses'
  const [vendorDetailExpenseSearch, setVendorDetailExpenseSearch] = useState('');
  const [vendorDetailStatusFilter, setVendorDetailStatusFilter] = useState('ALL');
  const [vendorDetailEmployeeFilter, setVendorDetailEmployeeFilter] = useState('ALL');

  // Vendor Quick Popup Modals (Employees & Claims)
  const [vendorEmployeeModal, setVendorEmployeeModal] = useState(null); // { vendorName, employees, loading }
  const [vendorClaimsModal, setVendorClaimsModal] = useState(null); // { vendorName, claims, loading }

  // Add Saved Vendor Modal
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);
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
  // autoDisburse removed, always default to true
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
  const [deptFieldErrors, setDeptFieldErrors] = useState({});
  const currentDeptEmployees = useMemo(() => {
    if (!editingDept || !editingDept.name) return [];
    const deptNameLower = editingDept.name.trim().toLowerCase();
    const list = Array.isArray(employees) ? employees : [];
    return list.filter(e => e && typeof e.department === 'string' && e.department.trim().toLowerCase() === deptNameLower);
  }, [editingDept, employees]);

  // Departments Tab States
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState('ALL');
  const [deptSortKey, setDeptSortKey] = useState('name');
  const [deptSortDir, setDeptSortDir] = useState('asc');
  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState(10);

  // Expense Categories Tab States
  const [catSearch, setCatSearch] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState('ALL');
  const [catSortKey, setCatSortKey] = useState('total_amount');
  const [catSortDir, setCatSortDir] = useState('desc');
  const [catPage, setCatPage] = useState(1);
  const [catPageSize, setCatPageSize] = useState(10);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [catFieldErrors, setCatFieldErrors] = useState({});

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
    { key: 'amount', label: 'Amount (INR)' },
    { key: 'payee', label: 'Payee / Merchant' },
    { key: 'status', label: 'Status' },
    { key: 'ref', label: 'Expense ID' },
    { key: 'date', label: 'Date' },
    { key: 'maker', label: 'Custodian (Maker)' },
    { key: 'category', label: 'Category' },
    { key: 'desc', label: 'Description' },
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
    { key: 'amount', label: 'Amount (INR)' },
    { key: 'payee', label: 'Payee / Merchant' },
    { key: 'status', label: 'Status' },
    { key: 'ref', label: 'Expense ID' },
    { key: 'date', label: 'Date' },
    { key: 'maker', label: 'Custodian (Maker)' },
    { key: 'category', label: 'Category' },
    { key: 'desc', label: 'Description' },
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

  const loadDashboardData = async () => {
    try {
      const [sumRes, expRes, accRes, empRes] = await Promise.all([
        api.get('/dashboard/summary/'),
        api.get('/expenses/').catch(() => ({ data: [] })),
        api.get('/accounts/').catch(() => ({ data: [] })),
        api.get('/admin/employees/').catch(() => ({ data: [] }))
      ]);
      setSummary(sumRes.data);
      if (sumRes.data?.last_refresh_str) {
        setLastRefreshText(sumRes.data.last_refresh_str);
      }
      setAllExpenses(expRes.data || []);
      setAccounts(accRes.data || []);
      setEmployees(empRes.data || []);
      if (accRes.data?.length > 0 && !vchAccount) {
        setVchAccount(accRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const loadEmployeesData = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get('/admin/employees/').catch(() => ({ data: [] })),
        fetchDepartments().catch(() => [])
      ]);
      setEmployees(empRes.data || []);
      if (Array.isArray(deptRes)) setDepartments(deptRes);
    } catch (err) {
      console.error('Failed to load employees data:', err);
    }
  };

  const loadDepartmentsData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        fetchDepartments().catch(() => []),
        employees.length === 0 ? api.get('/admin/employees/').catch(() => ({ data: [] })) : Promise.resolve({ data: employees })
      ]);
      setDepartments(Array.isArray(deptRes) ? deptRes : (deptRes?.data || []));
      if (employees.length === 0 && empRes?.data) setEmployees(empRes.data);
    } catch (err) {
      console.error('Failed to load departments data:', err);
    }
  };

  const loadCategoriesData = async () => {
    try {
      const catRes = await api.get('/categories/?include_stats=true&include_inactive=true');
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load categories data:', err);
    }
  };

  const loadVendorsData = async () => {
    setLoadingVendors(true);
    try {
      const data = await fetchVendorsSummary();
      setVendorsList(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      console.error('Error loading vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };
  const loadVendors = loadVendorsData;

  const loadExpensesData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses/').catch(() => ({ data: [] })),
        categories.length === 0 ? api.get('/categories/?include_stats=true&include_inactive=true').catch(() => ({ data: [] })) : Promise.resolve({ data: categories })
      ]);
      setAllExpenses(expRes.data || []);
      if (categories.length === 0 && catRes?.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load expenses data:', err);
    }
  };

  const loadCheckerExpensesData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        api.get('/expenses/').catch(() => ({ data: [] })),
        categories.length === 0 ? api.get('/categories/?include_stats=true&include_inactive=true').catch(() => ({ data: [] })) : Promise.resolve({ data: categories })
      ]);
      setAllExpenses(expRes.data || []);
      if (categories.length === 0 && catRes?.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load checker expenses data:', err);
    }
  };

  const loadAllocationsData = async () => {
    try {
      const [alcRes, accRes, vchRes, empRes] = await Promise.all([
        api.get('/allocations/').catch(() => ({ data: [] })),
        api.get('/accounts/').catch(() => ({ data: [] })),
        api.get('/vouchers/').catch(() => ({ data: [] })),
        employees.length === 0 ? api.get('/admin/employees/').catch(() => ({ data: [] })) : Promise.resolve({ data: employees })
      ]);
      setAllocations(alcRes.data || []);
      setAccounts(accRes.data || []);
      setVouchers(vchRes.data || []);
      if (employees.length === 0 && empRes?.data) setEmployees(empRes.data);
      if (accRes.data?.length > 0 && !vchAccount) {
        setVchAccount(accRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load allocations data:', err);
    }
  };

  const loadRequestsData = async () => {
    try {
      const [reqRes, accRes] = await Promise.all([
        api.get('/fund-requests/').catch(() => ({ data: [] })),
        accounts.length === 0 ? api.get('/accounts/').catch(() => ({ data: [] })) : Promise.resolve({ data: accounts })
      ]);
      setFundRequests(reqRes.data || []);
      if (accounts.length === 0 && accRes?.data) setAccounts(accRes.data);
    } catch (err) {
      console.error('Failed to load requests data:', err);
    }
  };

  const loadAuditData = async () => {
    try {
      const auditRes = await api.get('/audit-logs/').catch(() => ({ data: [] }));
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const loadTabFeature = async (tab) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'departments':
          await loadDepartmentsData();
          break;
        case 'categories':
          await loadCategoriesData();
          break;
        case 'vendors':
          await loadVendorsData();
          break;
        case 'employees':
          await loadEmployeesData();
          break;
        case 'expenses':
          await loadExpensesData();
          break;
        case 'checker-expenses':
          await loadCheckerExpensesData();
          break;
        case 'allocations':
          await loadAllocationsData();
          break;
        case 'requests':
          await loadRequestsData();
          break;
        case 'audit':
          await loadAuditData();
          break;
        case 'dashboard':
        default:
          await loadDashboardData();
          break;
      }
    } catch (err) {
      console.error(`Error loading tab ${tab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (targetTab = activeTab) => {
    return loadTabFeature(targetTab);
  };

  const handleOpenVendorDetails = async (vendorName) => {
    setLoadingVendorDetails(true);
    setSelectedVendorDetails({ summary: { name: vendorName }, employees: [], expenses: [] });
    setVendorDetailsTab('employees');
    setVendorDetailExpenseSearch('');
    setVendorDetailStatusFilter('ALL');
    setVendorDetailEmployeeFilter('ALL');
    try {
      const data = await fetchVendorDetail(vendorName);
      setSelectedVendorDetails(data);
    } catch (err) {
      console.error('Error fetching vendor details:', err);
      showAlert({ title: 'Error', message: 'Failed to load details for this vendor.', variant: 'danger' });
      setSelectedVendorDetails(null);
    } finally {
      setLoadingVendorDetails(false);
    }
  };

  const handleOpenVendorEmployeesModal = async (vendorName) => {
    setVendorEmployeeModal({ vendorName, employees: [], loading: true });
    try {
      const data = await fetchVendorDetail(vendorName);
      setVendorEmployeeModal({
        vendorName,
        employees: data.employees || [],
        loading: false
      });
    } catch (err) {
      console.error('Error fetching vendor employees:', err);
      showAlert({ title: 'Error', message: 'Failed to load employees for this vendor.', variant: 'danger' });
      setVendorEmployeeModal(null);
    }
  };

  const handleOpenVendorClaimsModal = async (vendorName) => {
    setVendorClaimsModal({ vendorName, claims: [], loading: true });
    try {
      const data = await fetchVendorDetail(vendorName);
      setVendorClaimsModal({
        vendorName,
        claims: data.expenses || [],
        loading: false
      });
    } catch (err) {
      console.error('Error fetching vendor claims:', err);
      showAlert({ title: 'Error', message: 'Failed to load claims for this vendor.', variant: 'danger' });
      setVendorClaimsModal(null);
    }
  };

  const handleCreateSavedVendor = async (e) => {
    e.preventDefault();
    const trimmed = newVendorName.trim();
    if (!trimmed) {
      showAlert({ title: 'Validation', message: 'Please enter a vendor name.', variant: 'warning' });
      return;
    }
    const exists = (vendorsList || []).some(v => v.name && v.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showAlert({ title: 'Validation', message: `Vendor "${trimmed}" already exists.`, variant: 'warning' });
      return;
    }
    setAddingVendor(true);
    try {
      await createSavedVendor(trimmed);
      setShowAddVendorModal(false);
      setNewVendorName('');
      showAlert({ title: 'Success', message: `Vendor "${trimmed}" added successfully.`, variant: 'success' });
      loadVendors();
    } catch (err) {
      showAlert({ title: 'Error', message: err.response?.data?.detail || 'Failed to save vendor.', variant: 'danger' });
    } finally {
      setAddingVendor(false);
    }
  };

  const handleDeleteSavedVendor = async (vendor) => {
    if (!vendor.id) return;
    const ok = await confirm({
      title: 'Delete Saved Vendor',
      message: `Are you sure you want to remove "${vendor.name}" from saved vendors list?`,
      confirmText: 'Delete Vendor',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    try {
      await deleteSavedVendor(vendor.id);
      showAlert({ title: 'Deleted', message: `Vendor "${vendor.name}" removed from saved vendors.`, variant: 'success' });
      if (selectedVendorDetails) {
        setSelectedVendorDetails(null);
      }
      loadVendors();
    } catch (err) {
      showAlert({ title: 'Error', message: err.response?.data?.detail || 'Failed to delete vendor.', variant: 'danger' });
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
  const handleOpenDeptModal = (dept = null) => {
    setDeptFieldErrors({});
    if (dept) {
      setEditingDept(dept);
      setDeptName(dept.name || '');
      setDeptCode(dept.code || '');
      setDeptDesc(dept.description || '');
      setDeptActive(dept.is_active ?? true);
    } else {
      setEditingDept(null);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      setDeptActive(true);
    }
    setShowDeptModal(true);
  };

  const handleCreateOrUpdateDept = async (e) => {
    e.preventDefault();
    const trimmed = deptName.trim().toLowerCase();
    if (!trimmed) {
      setDeptFieldErrors({ name: 'Department name is required.' });
      return;
    }

    const exists = departments.some(d => 
      (!editingDept || d.id !== editingDept.id) && 
      (d.name_lower || d.name || '').trim().toLowerCase() === trimmed
    );
    if (exists) {
      setDeptFieldErrors({ name: 'A department with this name already exists.' });
      return;
    }

    setSavingDept(true);
    setDeptFieldErrors({});
    try {
      const payload = {
        name: trimmed,
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
      setDeptFieldErrors({});
    } catch (err) {
      const errMsg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to save department.';
      setDeptFieldErrors({ name: errMsg });
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

  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatFieldErrors({ name: 'Category name is required.' });
      return;
    }
    const exists = (categories || []).some(c => c.name && c.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setCatFieldErrors({ name: 'A category with this name already exists.' });
      return;
    }
    setAddingCat(true);
    setCatFieldErrors({});
    try {
      await api.post('/categories/', {
        name: trimmed,
        description: newCatDesc.trim()
      });
      notify('success', `Expense category "${trimmed}" created successfully.`);
      setShowAddCatModal(false);
      setNewCatName('');
      setNewCatDesc('');
      loadCategoriesData();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.name) {
        setCatFieldErrors({ name: Array.isArray(errData.name) ? errData.name[0] : errData.name });
      } else {
        notify('error', errData?.detail || 'Failed to create category.');
      }
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const ok = await confirm({
      title: `Delete Category "${cat.name}"?`,
      message: `Are you sure you want to remove category "${cat.name}"? If any historical expenses use this category, it will be safely marked inactive so past financial records remain accurate.`,
      confirmText: 'Delete Category',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      const res = await api.delete(`/categories/${cat.id}/`);
      notify('success', res.data?.detail || `Category "${cat.name}" deleted successfully.`);
      loadCategoriesData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to delete category.');
    }
  };

  const handleToggleCatActive = async (cat) => {
    const willBeInactive = cat.is_active;
    const ok = await confirm({
      title: willBeInactive ? 'Mark Category Inactive?' : 'Mark Category Active?',
      message: willBeInactive
        ? `Do you really want to mark "${cat.name}" as inactive?`
        : `Do you really want to mark "${cat.name}" as active?`,
      confirmText: 'Yes',
      cancelText: 'No',
      variant: willBeInactive ? 'warning' : 'success'
    });
    if (!ok) return;

    try {
      await api.patch(`/categories/${cat.id}/`, { is_active: !cat.is_active });
      notify('success', `Category "${cat.name}" marked as ${!cat.is_active ? 'active' : 'inactive'} successfully.`);
      loadCategoriesData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to update category status.');
    }
  };

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
      notify('success', `Allocated ₹${amt.toLocaleString('en-IN')} to ${selectedEmpToAllocate.full_name}.`);
      setShowAllocateModal(false);
      setAllocateVoucherNumber('');
      setAllocateAmount('');
      setAllocateDescription('');
      setAllocateOtherPaymentType('');
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

    // Department analytics: allocated funds, funds spent, remaining, staff count
  const departmentStats = useMemo(() => {
    return departments.map(dept => {
      const deptNameLower = (dept.name || '').trim().toLowerCase();
      const staff = employees.filter(e => (e.department || '').trim().toLowerCase() === deptNameLower);
      
      const allocated = dept.allocated_funds !== undefined && Number(dept.allocated_funds) > 0
        ? Number(dept.allocated_funds)
        : staff.reduce((sum, e) => sum + (Number(e.allocated_funds) || 0), 0);
        
      const used = dept.funds_used !== undefined && Number(dept.funds_used) > 0
        ? Number(dept.funds_used)
        : staff.reduce((sum, e) => sum + (Number(e.funds_used) || 0), 0);
        
      const remaining = allocated - used;
      const count = staff.length;
      const makers = staff.filter(e => e.role === 'MAKER').length;
      const checkers = staff.filter(e => e.role === 'CHECKER').length;

      return {
        ...dept,
        allocated_funds: allocated,
        funds_used: used,
        funds_remaining: remaining,
        employees_count: count,
        makers_count: makers,
        checkers_count: checkers,
        staff
      };
    });
  }, [departments, employees]);

  const filteredDepartments = useMemo(() => {
    return departmentStats.filter(dept => {
      if (deptSearch.trim()) {
        const q = deptSearch.toLowerCase().trim();
        const matchName = dept.name.toLowerCase().includes(q);
        const matchCode = (dept.code || '').toLowerCase().includes(q);
        const matchDesc = (dept.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc) return false;
      }
      if (deptStatusFilter === 'ACTIVE' && !dept.is_active) return false;
      if (deptStatusFilter === 'INACTIVE' && dept.is_active) return false;
      return true;
    }).sort((a, b) => {
      if (deptSortKey === 'allocated') {
        return deptSortDir === 'asc' ? a.allocated_funds - b.allocated_funds : b.allocated_funds - a.allocated_funds;
      }
      if (deptSortKey === 'used') {
        return deptSortDir === 'asc' ? a.funds_used - b.funds_used : b.funds_used - a.funds_used;
      }
      if (deptSortKey === 'remaining') {
        return deptSortDir === 'asc' ? a.funds_remaining - b.funds_remaining : b.funds_remaining - a.funds_remaining;
      }
      if (deptSortKey === 'staff') {
        return deptSortDir === 'asc' ? a.employees_count - b.employees_count : b.employees_count - a.employees_count;
      }
      return deptSortDir === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
    });
  }, [departmentStats, deptSearch, deptStatusFilter, deptSortKey, deptSortDir]);

  const paginatedDepartments = useMemo(() => {
    const start = (deptPage - 1) * deptPageSize;
    return filteredDepartments.slice(start, start + deptPageSize);
  }, [filteredDepartments, deptPage, deptPageSize]);

  const deptTotalPages = Math.ceil(filteredDepartments.length / deptPageSize) || 1;
  const totalDeptAllocated = useMemo(() => departmentStats.reduce((acc, d) => acc + (d.allocated_funds || 0), 0), [departmentStats]);
  const totalDeptUsed = useMemo(() => departmentStats.reduce((acc, d) => acc + (d.funds_used || 0), 0), [departmentStats]);
  const totalDeptRemaining = totalDeptAllocated - totalDeptUsed;

  // Category statistics & analytics
  const categoryStats = useMemo(() => {
    const validExpenses = allExpenses.filter(e => !['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN'].includes(e.status));
    const grandTotalSpend = validExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return categories.map(cat => {
      const catExpenses = validExpenses.filter(e => (e.category || '').toLowerCase() === (cat.name || '').toLowerCase());
      const catTotal = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const catCount = catExpenses.length;
      const percentage = grandTotalSpend > 0 ? (catTotal / grandTotalSpend) * 100 : 0;

      return {
        ...cat,
        total_amount: catTotal,
        expense_count: catCount,
        percentage: Number(percentage.toFixed(1))
      };
    });
  }, [categories, allExpenses]);

  const filteredCategories = useMemo(() => {
    let list = [...categoryStats];
    if (catSearch.trim()) {
      const term = catSearch.toLowerCase().trim();
      list = list.filter(c => 
        (c.name || '').toLowerCase().includes(term) || 
        (c.description || '').toLowerCase().includes(term)
      );
    }
    if (catStatusFilter === 'ACTIVE') {
      list = list.filter(c => c.is_active);
    } else if (catStatusFilter === 'INACTIVE') {
      list = list.filter(c => !c.is_active);
    }

    list.sort((a, b) => {
      let aVal = a[catSortKey] ?? '';
      let bVal = b[catSortKey] ?? '';
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (catSortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return list;
  }, [categoryStats, catSearch, catStatusFilter, catSortKey, catSortDir]);

  const catTotalPages = Math.ceil(filteredCategories.length / catPageSize) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (catPage - 1) * catPageSize;
    return filteredCategories.slice(start, start + catPageSize);
  }, [filteredCategories, catPage, catPageSize]);

  const totalCatSpend = useMemo(() => categoryStats.reduce((sum, c) => sum + (c.total_amount || 0), 0), [categoryStats]);
  const totalCatClaims = useMemo(() => categoryStats.reduce((sum, c) => sum + (c.expense_count || 0), 0), [categoryStats]);
  const topCategory = useMemo(() => {
    if (categoryStats.length === 0) return null;
    return [...categoryStats].sort((a, b) => b.total_amount - a.total_amount)[0];
  }, [categoryStats]);

  // Vendor statistics & analytics
  const totalVendorsCount = vendorsList.length;
  const totalVendorsSpent = useMemo(() => {
    return vendorsList.reduce((sum, v) => sum + (Number(v.total_spent) || 0), 0);
  }, [vendorsList]);
  const totalVendorsClaims = useMemo(() => {
    return vendorsList.reduce((sum, v) => sum + (Number(v.total_claims_count) || 0), 0);
  }, [vendorsList]);
  const topVendor = useMemo(() => {
    if (!vendorsList.length) return null;
    const sorted = [...vendorsList].sort((a, b) => (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0));
    return sorted[0];
  }, [vendorsList]);

  const filteredVendors = useMemo(() => {
    return vendorsList.filter(v => {
      if (vendorSearch) {
        const q = vendorSearch.toLowerCase();
        const matchName = (v.name || '').toLowerCase().includes(q);
        const matchCat = (v.categories || []).some(c => (c || '').toLowerCase().includes(q));
        if (!matchName && !matchCat) return false;
      }
      if (vendorTypeFilter === 'SAVED' && !v.is_saved) return false;
      if (vendorTypeFilter === 'AUTO' && v.is_saved) return false;
      return true;
    }).sort((a, b) => {
      if (vendorSortKey === 'spend_desc') return (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0);
      if (vendorSortKey === 'spend_asc') return (Number(a.total_spent) || 0) - (Number(b.total_spent) || 0);
      if (vendorSortKey === 'claims_desc') return (Number(b.total_claims_count) || 0) - (Number(a.total_claims_count) || 0);
      if (vendorSortKey === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (vendorSortKey === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0);
    });
  }, [vendorsList, vendorSearch, vendorTypeFilter, vendorSortKey]);

  const vendorTotalPages = Math.ceil(filteredVendors.length / vendorPageSize) || 1;
  const paginatedVendors = useMemo(() => {
    const start = (vendorPage - 1) * vendorPageSize;
    return filteredVendors.slice(start, start + vendorPageSize);
  }, [filteredVendors, vendorPage, vendorPageSize]);

  const filteredVendorModalEmployees = useMemo(() => {
    if (!selectedVendorDetails?.employees) return [];
    return selectedVendorDetails.employees;
  }, [selectedVendorDetails]);

  const filteredVendorModalExpenses = useMemo(() => {
    if (!selectedVendorDetails?.expenses) return [];
    return selectedVendorDetails.expenses.filter(e => {
      if (vendorDetailExpenseSearch) {
        const q = vendorDetailExpenseSearch.toLowerCase();
        const matchRef = (e.reference_number || '').toLowerCase().includes(q);
        const matchDesc = (e.description || '').toLowerCase().includes(q);
        const matchCat = (e.category || '').toLowerCase().includes(q);
        const matchMaker = (e.maker_name || '').toLowerCase().includes(q);
        if (!matchRef && !matchDesc && !matchCat && !matchMaker) return false;
      }
      if (vendorDetailStatusFilter !== 'ALL') {
        if (vendorDetailStatusFilter === 'APPROVED' && !['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'].includes(e.status)) return false;
        if (vendorDetailStatusFilter === 'PENDING' && !['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status)) return false;
        if (vendorDetailStatusFilter === 'REJECTED' && !['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN'].includes(e.status)) return false;
        if (['ACCEPTED_BY_ADMIN', 'ACCEPTED_BY_CHECKER', 'SUBMITTED', 'SENT_TO_ADMIN', 'REJECTED_BY_ADMIN', 'REJECTED_BY_CHECKER'].includes(vendorDetailStatusFilter) && e.status !== vendorDetailStatusFilter) return false;
      }
      if (vendorDetailEmployeeFilter !== 'ALL') {
        if (String(e.maker) !== String(vendorDetailEmployeeFilter)) return false;
      }
      return true;
    });
  }, [selectedVendorDetails, vendorDetailExpenseSearch, vendorDetailStatusFilter, vendorDetailEmployeeFilter]);

  const staffBalanceBreakdown = useMemo(() => {
    if (!fundModalType) return [];
    const staff = employees.filter(e => ['MAKER', 'CHECKER'].includes((e.role || '').toUpperCase()));
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
    if (fundModalRoleFilter !== 'ALL') {
      filtered = filtered.filter(e => (e.role || '').toUpperCase() === fundModalRoleFilter.toUpperCase());
    }

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
  }, [employees, fundModalType, fundModalSearch, fundModalRoleFilter]);

  const sortedFundEmployees = staffBalanceBreakdown;

  // Modal role-based totals: When ALL, shows all staff total; when MAKER, shows makers total; when CHECKER, shows checkers total
  const modalRoleStaff = useMemo(() => {
    const staff = employees.filter(e => ['MAKER', 'CHECKER'].includes((e.role || '').toUpperCase()));
    if (fundModalRoleFilter === 'MAKER') return staff.filter(e => e.role === 'MAKER');
    if (fundModalRoleFilter === 'CHECKER') return staff.filter(e => e.role === 'CHECKER');
    return staff;
  }, [employees, fundModalRoleFilter]);

  const modalTotalAllocated = useMemo(() => {
    if (fundModalRoleFilter === 'ALL' && summary?.funds_allocated !== undefined) {
      return summary.funds_allocated;
    }
    return modalRoleStaff.reduce((sum, e) => sum + (Number(e.allocated_funds) || 0), 0);
  }, [modalRoleStaff, fundModalRoleFilter, summary]);

  const modalTotalUsed = useMemo(() => {
    if (fundModalRoleFilter === 'ALL' && summary?.funds_used !== undefined) {
      return summary.funds_used;
    }
    return modalRoleStaff.reduce((sum, e) => sum + (Number(e.funds_used) || 0), 0);
  }, [modalRoleStaff, fundModalRoleFilter, summary]);

  const modalTotalRemaining = useMemo(() => {
    if (fundModalRoleFilter === 'ALL' && summary?.funds_remaining !== undefined) {
      return summary.funds_remaining;
    }
    return modalTotalAllocated - modalTotalUsed;
  }, [modalTotalAllocated, modalTotalUsed, fundModalRoleFilter, summary]);

  // Global scroll lock when any modal is open
  const isAnyAdminModalActive = Boolean(
    fundModalType ||
    showCreateEmpModal ||
    tempPasswordNotice ||
    showAddCatModal ||
    selectedReq ||
    showVoucherModal ||
    selectedExpense ||
    decisionType ||
    showDeptModal ||
    showAllocateModal ||
    selectedAlcDetails ||
    selectedVendorDetails ||
    vendorEmployeeModal ||
    vendorClaimsModal ||
    showAddVendorModal
  );

  useEffect(() => {
    if (isAnyAdminModalActive) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isAnyAdminModalActive]);

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
        create_voucher: true,
        auto_disburse: true
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
      if (!matchesFilterRule(emp.allocated_funds, empColFilters['funds_allocated'])) return false;
      if (!matchesFilterRule(emp.funds_used, empColFilters['funds_used'])) return false;
      if (!matchesFilterRule(emp.funds_remaining, empColFilters['funds_remaining'])) return false;
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

  if (loading && activeTab === 'dashboard' && !summary) {
    return <LoadingScreen fullPage />;
  }

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
              <article
                className="admin-balance-card admin-balance-available clickable-card"
                onClick={() => { setFundModalType('allocated'); setFundModalSearch(''); setFundModalRoleFilter('ALL'); }}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                title="Click to view all Makers & Checkers in decreasing order of allocated funds"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFundModalType('allocated');
                    setFundModalSearch('');
                    setFundModalRoleFilter('ALL');
                  }
                }}
              >
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
              <article
                className="admin-balance-card admin-balance-commitments clickable-card"
                onClick={() => { setFundModalType('used'); setFundModalSearch(''); setFundModalRoleFilter('ALL'); }}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                title="Click to view all Makers & Checkers in decreasing order of funds used"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFundModalType('used');
                    setFundModalSearch('');
                    setFundModalRoleFilter('ALL');
                  }
                }}
              >
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
              <article
                className={`admin-balance-card ${totalRemainingAllEmployees < 0 ? 'admin-balance-deficit' : 'admin-balance-ledger'} clickable-card`}
                onClick={() => { setFundModalType('remaining'); setFundModalSearch(''); setFundModalRoleFilter('ALL'); }}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                title="Click to view all Makers & Checkers in decreasing order of remaining funds"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFundModalType('remaining');
                    setFundModalSearch('');
                    setFundModalRoleFilter('ALL');
                  }
                }}
              >
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
                <GoogleSpinner size={42} strokeWidth={3.8} />
                <div style={{ marginTop: '10px' }}>Loading decision queue...</div>
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
                        {isQueueColVisible('amount') && (
                          <TableHeadSortMenu
                            label="Amount (INR)"
                            columnKey="amount"
                            align="left"
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
                            filterConfig={queueColFilters['payee']}
                            onFilterChange={(f) => setQueueColFilter('payee', f)}
                            sortConfig={{ key: queueSortKey, direction: queueSortDir }}
                            onSort={(key, dir) => {
                              setQueueSortKey(key);
                              setQueueSortDir(dir);
                            }}
                          />
                        )}
                        {isQueueColVisible('status') && (
                          <TableHeadSortMenu
                            label="Status"
                            columnKey="status"
                            filterConfig={queueColFilters['status']}
                            onFilterChange={(f) => setQueueColFilter('status', f)}
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
                            filterConfig={queueColFilters['ref']}
                            onFilterChange={(f) => setQueueColFilter('ref', f)}
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
                            filterConfig={queueColFilters['date']}
                            onFilterChange={(f) => setQueueColFilter('date', f)}
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
                            filterConfig={queueColFilters['maker']}
                            onFilterChange={(f) => setQueueColFilter('maker', f)}
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
                            filterConfig={queueColFilters['category']}
                            onFilterChange={(f) => setQueueColFilter('category', f)}
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
                            filterConfig={queueColFilters['desc']}
                            onFilterChange={(f) => setQueueColFilter('desc', f)}
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
                                  <span>View Details</span>
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
                          {isQueueColVisible('amount') && (
                            <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              ₹{exp.amount.toLocaleString('en-IN')}
                            </td>
                          )}
                          {isQueueColVisible('payee') && (
                            <td style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>{exp.payee}</td>
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
                          {isQueueColVisible('desc') && (
                            <td style={{ maxWidth: '200px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {exp.description}
                              </div>
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
                          align="left"
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
                                  <span>View Details</span>
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

            <div style={{ width: '160px' }}>
              <SearchableDropdown
                value={empRoleFilter}
                onChange={(val) => { setEmpRoleFilter(val || 'ALL'); setEmpPage(1); }}
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  { value: 'ADMIN', label: 'Admins' },
                  { value: 'MAKER', label: 'Makers' },
                  { value: 'CHECKER', label: 'Checkers' },
                ]}
                placeholder="All Roles"
                searchPlaceholder="Search roles..."
                allowClear={false}
                size="sm"
              />
            </div>

            <div style={{ width: '150px' }}>
              <SearchableDropdown
                value={empStatusFilter}
                onChange={(val) => { setEmpStatusFilter(val || 'ALL'); setEmpPage(1); }}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Disabled' },
                ]}
                placeholder="All Status"
                searchPlaceholder="Search status..."
                allowClear={false}
                size="sm"
              />
            </div>

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
              <GoogleSpinner size={42} strokeWidth={3.8} />
              <div style={{ marginTop: '10px' }}>Loading employees directory...</div>
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
                          filterConfig={empColFilters['status']}
                          onFilterChange={(f) => setEmpColFilter('status', f)}
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
                          filterConfig={empColFilters['emp_id']}
                          onFilterChange={(f) => setEmpColFilter('emp_id', f)}
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
                          filterConfig={empColFilters['name']}
                          onFilterChange={(f) => setEmpColFilter('name', f)}
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
                          filterConfig={empColFilters['email']}
                          onFilterChange={(f) => setEmpColFilter('email', f)}
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
                          filterConfig={empColFilters['role']}
                          onFilterChange={(f) => setEmpColFilter('role', f)}
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
                          filterConfig={empColFilters['dept']}
                          onFilterChange={(f) => setEmpColFilter('dept', f)}
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
                          filterConfig={empColFilters['funds_allocated']}
                          onFilterChange={(f) => setEmpColFilter('funds_allocated', f)}
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
                          filterConfig={empColFilters['funds_used']}
                          onFilterChange={(f) => setEmpColFilter('funds_used', f)}
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
                          filterConfig={empColFilters['funds_remaining']}
                          onFilterChange={(f) => setEmpColFilter('funds_remaining', f)}
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
                          filterConfig={empColFilters['designation']}
                          onFilterChange={(f) => setEmpColFilter('designation', f)}
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
                                  <span>View Details</span>
                                </button>
                                
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
                <div style={{ width: '180px' }}>
                  <SearchableDropdown
                    value={statusFilter}
                    onChange={(val) => { setStatusFilter(val || 'ALL'); setCurrentPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'PENDING', label: 'Pending (Checker)' },
                      { value: 'SENT_TO_ADMIN', label: 'Sent to Admin' },
                      { value: 'ACCEPTED', label: 'Accepted' },
                      { value: 'REJECTED', label: 'Rejected' },
                    ]}
                    placeholder="All Statuses"
                    searchPlaceholder="Search statuses..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <div style={{ width: '170px' }}>
                  <SearchableDropdown
                    value={categoryFilter}
                    onChange={(val) => { setCategoryFilter(val || 'ALL'); setCurrentPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Categories' },
                      ...categories.map(cat => ({ value: cat.name, label: cat.name }))
                    ]}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
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
              <GoogleSpinner size={42} strokeWidth={3.8} />
              <div style={{ marginTop: '10px' }}>Loading company expenses...</div>
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
                                <span>View Details</span>
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
                        {isExpColVisible('amount') && (
                          <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            ₹{exp.amount.toLocaleString('en-IN')}
                          </td>
                        )}
                        {isExpColVisible('payee') && (
                          <td style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>{exp.payee}</td>
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
                        {isExpColVisible('desc') && (
                          <td style={{ maxWidth: '220px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {exp.description}
                            </div>
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
                <div style={{ width: '190px' }}>
                  <SearchableDropdown
                    value={chkExpStatusFilter}
                    onChange={(val) => { setChkExpStatusFilter(val || 'ALL'); setChkExpCurrentPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'SENT_TO_ADMIN', label: 'Pending Admin Decision' },
                      { value: 'ACCEPTED', label: 'Accepted by Admin' },
                      { value: 'REJECTED', label: 'Rejected by Admin' },
                    ]}
                    placeholder="All Statuses"
                    searchPlaceholder="Search statuses..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                <div style={{ width: '170px' }}>
                  <SearchableDropdown
                    value={chkExpCategoryFilter}
                    onChange={(val) => { setChkExpCategoryFilter(val || 'ALL'); setChkExpCurrentPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Categories' },
                      ...categories.map(cat => ({ value: cat.name, label: cat.name }))
                    ]}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
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
                      <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                      <th>Payee / Merchant</th>
                      <th style={{ width: '160px', minWidth: '160px' }}>Status</th>
                      <th>Expense ID</th>
                      <th>Date</th>
                      <th>Checker Custodian</th>
                      <th>Category</th>
                      <th>Description</th>
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
                              <span>View Details</span>
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
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                          ₹{Number(exp.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 500, color: '#334155', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exp.payee}
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
                        <td style={{ color: '#64748b', fontSize: '0.825rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>
                          {exp.description}
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
                <div style={{ width: '160px' }}>
                  <SearchableDropdown
                    value={alcRoleFilter}
                    onChange={(val) => { setAlcRoleFilter(val || 'ALL'); setAlcPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Allocators' },
                      { value: 'ADMIN', label: 'Admin Only' },
                      { value: 'CHECKER', label: 'Checker Only' },
                    ]}
                    placeholder="All Allocators"
                    searchPlaceholder="Search allocators..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
              </div>

              {/* Recipient Role Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Recipient:</span>
                <div style={{ width: '150px' }}>
                  <SearchableDropdown
                    value={alcRecipientFilter}
                    onChange={(val) => { setAlcRecipientFilter(val || 'ALL'); setAlcPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Roles' },
                      { value: 'MAKER', label: 'Makers' },
                      { value: 'CHECKER', label: 'Checkers' },
                    ]}
                    placeholder="All Roles"
                    searchPlaceholder="Search roles..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
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
                      <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                      <th>Voucher #</th>
                      <th>Type</th>
                      <th>Allocated To</th>
                      <th>Allocated By</th>
                      <th>Date & Time</th>
                      <th style={{ textAlign: 'right' }}>Prev Balance</th>
                      <th style={{ textAlign: 'right' }}>New Balance</th>
                      <th>Description</th>
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
                            <span>View Details</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>
                          ₹{(alc.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                          {alc.voucher_number || alc.allocation_number}
                        </td>
                        <td>
                          <span className="badge badge-submitted" style={{ padding: '2px 6px', fontSize: '0.72rem' }}>
                            {alc.payment_type || 'Cash'}
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
                        <td>
                          <span style={{ fontWeight: 600 }}>{alc.allocated_by_name}</span>{' '}
                          <span className="badge badge-submitted" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                            {alc.allocator_role}
                          </span>
                        </td>
                        <td>{alc.allocation_date ? `${alc.allocation_date}` : formatDateTime(alc.created_at)}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          ₹{(alc.recipient_previous_balance || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          ₹{(alc.recipient_new_balance || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={alc.description || alc.notes}>
                          {alc.description || alc.notes || '—'}
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
                <div style={{ width: '180px' }}>
                  <SearchableDropdown
                    value={reqStatusFilter}
                    onChange={(val) => { setReqStatusFilter(val || 'ALL'); setReqPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Statuses' },
                      { value: 'SENT_TO_ADMIN', label: 'Pending Decision' },
                      { value: 'APPROVED', label: 'Approved' },
                      { value: 'DISBURSED', label: 'Disbursed' },
                      { value: 'REJECTED', label: 'Rejected' },
                      { value: 'CANCELLED', label: 'Cancelled' },
                    ]}
                    placeholder="All Statuses"
                    searchPlaceholder="Search statuses..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
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
                                <span>View Details</span>
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
                          <td style={{ textAlign: 'left', fontWeight: 700 }}>
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
      {/* 8. DEPARTMENTS VIEW */}
      {/* ============================================================== */}
      {activeTab === 'departments' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="page-title">Departments</h1>
              <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Manage company departments, track allocated budget limits, and monitor expenditure across divisions.
              </p>
            </div>
            <button
              onClick={() => handleOpenDeptModal()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Building size={16} />
              <span>+ Create Department</span>
            </button>
          </div>

          {/* Top 4 Metric Overview Cards */}
          <div className="admin-balance-card-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: '1.5rem' }}>
            {/* Card 1: Total Departments */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#f1f5f9', color: '#0f172a' }}>
                <Building size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL DEPARTMENTS</div>
                <div className="admin-balance-card-value" style={{ color: '#0f172a' }}>
                  {departments.length}
                </div>
                <p className="admin-balance-card-description">
                  {departments.filter(d => d.is_active).length} Active • {departments.filter(d => !d.is_active).length} Inactive
                </p>
              </div>
            </article>

            {/* Card 2: Total Funds Allocated */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon">
                <Wallet size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL ALLOCATED FUNDS</div>
                <div className="admin-balance-card-value">
                  ₹{totalDeptAllocated.toLocaleString('en-IN')}
                </div>
                <p className="admin-balance-card-description">
                  Total credit limits provisioned across departments
                </p>
              </div>
            </article>

            {/* Card 3: Total Funds Spent */}
            <article className="admin-balance-card admin-balance-commitments">
              <div className="admin-balance-card-icon">
                <ReceiptIndianRupee size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL FUNDS SPENT</div>
                <div className="admin-balance-card-value">
                  ₹{totalDeptUsed.toLocaleString('en-IN')}
                </div>
                <p className="admin-balance-card-description">
                  Cumulative claims spent across departments
                </p>
              </div>
            </article>

            {/* Card 4: Total Remaining */}
            <article className={`admin-balance-card ${totalDeptRemaining < 0 ? 'admin-balance-deficit' : 'admin-balance-ledger'}`}>
              <div className="admin-balance-card-icon">
                <ShieldCheck size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">REMAINING BALANCE</div>
                <div className="admin-balance-card-value" style={{ color: totalDeptRemaining < 0 ? '#dc2626' : undefined }}>
                  {totalDeptRemaining < 0 ? `-₹${Math.abs(totalDeptRemaining).toLocaleString('en-IN')}` : `₹${totalDeptRemaining.toLocaleString('en-IN')}`}
                  {totalDeptRemaining < 0 && (
                    <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', verticalAlign: 'middle', fontWeight: 700 }}>
                      DEFICIT
                    </span>
                  )}
                </div>
                <p className="admin-balance-card-description">
                  Available unspent balance across departments
                </p>
              </div>
            </article>
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
                  placeholder="Search by department name, code, description..."
                  value={deptSearch}
                  onChange={(e) => { setDeptSearch(e.target.value); setDeptPage(1); }}
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                <SearchableDropdown
                  value={deptStatusFilter}
                  onChange={(val) => { setDeptStatusFilter(val || 'ALL'); setDeptPage(1); }}
                  options={[
                    { value: 'ALL', label: 'All Departments' },
                    { value: 'ACTIVE', label: 'Active Only' },
                    { value: 'INACTIVE', label: 'Inactive Only' },
                  ]}
                  placeholder="All Departments"
                  searchPlaceholder="Search departments..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '160px' }}
                />
              </div>

              {/* Sort By Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Sort By:</span>
                <SearchableDropdown
                  value={`${deptSortKey}_${deptSortDir}`}
                  onChange={(val) => {
                    const [key, dir] = (val || 'name_asc').split('_');
                    setDeptSortKey(key);
                    setDeptSortDir(dir);
                    setDeptPage(1);
                  }}
                  options={[
                    { value: 'name_asc', label: 'Name (A to Z)' },
                    { value: 'name_desc', label: 'Name (Z to A)' },
                    { value: 'allocated_desc', label: 'Allocated (Highest first)' },
                    { value: 'allocated_asc', label: 'Allocated (Lowest first)' },
                    { value: 'used_desc', label: 'Spent (Highest first)' },
                    { value: 'used_asc', label: 'Spent (Lowest first)' },
                    { value: 'remaining_desc', label: 'Remaining (Highest first)' },
                    { value: 'staff_desc', label: 'Staff Count (Highest first)' },
                  ]}
                  placeholder="Sort By..."
                  searchPlaceholder="Search options..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '190px' }}
                />
              </div>

              {/* Clear button */}
              {(deptSearch || deptStatusFilter !== 'ALL' || deptSortKey !== 'name' || deptSortDir !== 'asc') && (
                <button
                  onClick={() => {
                    setDeptSearch('');
                    setDeptStatusFilter('ALL');
                    setDeptSortKey('name');
                    setDeptSortDir('asc');
                    setDeptPage(1);
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
                  value={deptPageSize}
                  onChange={(e) => { setDeptPageSize(Number(e.target.value)); setDeptPage(1); }}
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
          {filteredDepartments.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Building size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No departments found matching your criteria.
              </div>
              <button
                onClick={() => handleOpenDeptModal()}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={14} />
                <span>Create Department</span>
              </button>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      <th style={{ width: '55px', textAlign: 'center' }}>SR No.</th>
                      <th style={{ width: '135px', textAlign: 'center' }}>Actions</th>
                      <th>Department Name</th>
                      <th>Assigned Staff</th>
                      <th style={{ textAlign: 'right' }}>Money Allocated (INR)</th>
                      <th style={{ textAlign: 'right' }}>Money Spent (INR)</th>
                      <th style={{ textAlign: 'right' }}>Remaining (INR)</th>
                      <th style={{ width: '140px' }}>Budget Usage</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDepartments.map((dept, idx) => {
                      const isDeficit = dept.funds_remaining < 0;
                      const percentSpent = dept.allocated_funds > 0 
                        ? Math.min(100, Math.round((dept.funds_used / dept.allocated_funds) * 100))
                        : (dept.funds_used > 0 ? 100 : 0);

                      return (
                        <tr key={dept.id}>
                          {/* 1. SR No */}
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
                            {(deptPage - 1) * deptPageSize + idx + 1}
                          </td>

                          {/* 2. Actions (View Details) */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenDeptModal(dept)}
                                className="table-btn table-btn-view"
                                title="View Details"
                              >
                                <Eye size={13} />
                                <span>View Details</span>
                              </button>
                            </div>
                          </td>

                          {/* 3. Department Name & Code */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                                  {dept.name}
                                </span>
                                {dept.code && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                    letterSpacing: '0.5px'
                                  }}>
                                    {dept.code}
                                  </span>
                                )}
                              </div>
                              {dept.description && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                  {dept.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Assigned Staff */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: '#1e293b'
                              }}>
                                <Users size={12} color="#64748b" />
                                <strong>{dept.employees_count}</strong> {dept.employees_count === 1 ? 'Employee' : 'Employees'}
                              </span>
                            </div>
                          </td>

                          {/* 5. Money Allocated */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '0.92rem' }}>
                            ₹{(dept.allocated_funds || 0).toLocaleString('en-IN')}
                          </td>

                          {/* 6. Money Spent */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#ea580c', fontSize: '0.92rem' }}>
                            ₹{(dept.funds_used || 0).toLocaleString('en-IN')}
                          </td>

                          {/* 7. Remaining */}
                          <td style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isDeficit ? `-₹${Math.abs(dept.funds_remaining).toLocaleString('en-IN')}` : `₹${(dept.funds_remaining || 0).toLocaleString('en-IN')}`,
                            fontSize: '0.92rem'
                          }}>
                            {isDeficit ? `-₹${Math.abs(dept.funds_remaining).toLocaleString('en-IN')}` : `₹${(dept.funds_remaining || 0).toLocaleString('en-IN')}`}
                            {isDeficit && (
                              <span style={{
                                fontSize: '0.65rem',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                marginLeft: '5px',
                                verticalAlign: 'middle',
                                fontWeight: 700
                              }}>
                                Deficit
                              </span>
                            )}
                          </td>

                          {/* 8. Budget Usage Progress Bar */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                                <span>{percentSpent}%</span>
                                <span>{dept.allocated_funds > 0 ? 'allocated' : 'spent'}</span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '6px',
                                background: '#e2e8f0',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${percentSpent}%`,
                                  height: '100%',
                                  background: percentSpent > 90 ? '#dc2626' : percentSpent > 70 ? '#ea580c' : '#16a34a',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>
                          </td>

                          {/* 9. Status */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: dept.is_active ? '#ecfdf5' : '#f1f5f9',
                              color: dept.is_active ? '#059669' : '#64748b',
                              border: dept.is_active ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                            }}>
                              {dept.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
                  Showing {Math.min((deptPage - 1) * deptPageSize + 1, filteredDepartments.length)} to {Math.min(deptPage * deptPageSize, filteredDepartments.length)} of {filteredDepartments.length} departments
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setDeptPage(p => Math.max(1, p - 1))}
                    disabled={deptPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600 }}>
                    {deptPage} / {deptTotalPages}
                  </span>
                  <button
                    onClick={() => setDeptPage(p => Math.min(deptTotalPages, p + 1))}
                    disabled={deptPage >= deptTotalPages}
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
      {/* 9. EXPENSE CATEGORIES VIEW */}
      {/* ============================================================== */}
      {activeTab === 'categories' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="page-title">Expense Categories</h1>
              <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Manage company expense categories, define permitted claim categories, and monitor expenditure distribution across all claims.
              </p>
            </div>
            <button
              onClick={() => {
                setNewCatName('');
                setNewCatDesc('');
                setCatFieldErrors({});
                setShowAddCatModal(true);
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={16} />
              <span>+ Add Category</span>
            </button>
          </div>

          {/* Top 4 Metric Overview Cards */}
          <div className="admin-balance-card-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: '1.5rem' }}>
            {/* Card 1: Total Categories */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Tags size={26} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL CATEGORIES</div>
                <div className="admin-balance-card-value" style={{ color: '#0f172a' }}>
                  {categories.length}
                </div>
                <p className="admin-balance-card-description">
                  {categories.filter(c => c.is_active).length} Active • {categories.filter(c => !c.is_active).length} Inactive
                </p>
              </div>
            </article>

            {/* Card 2: Total Categorized Spend */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <ReceiptIndianRupee size={26} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL CATEGORIZED SPEND</div>
                <div className="admin-balance-card-value" style={{ color: '#16a34a' }}>
                  ₹{totalCatSpend.toLocaleString('en-IN')}
                </div>
                <p className="admin-balance-card-description">
                  Cumulative approved expenditure
                </p>
              </div>
            </article>

            {/* Card 3: Top Expense Category */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                <CheckCircle2 size={26} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOP EXPENSE CATEGORY</div>
                <div className="admin-balance-card-value" style={{ color: '#0f172a', fontSize: '1.25rem' }}>
                  {topCategory ? topCategory.name : 'None'}
                </div>
                <p className="admin-balance-card-description">
                  {topCategory ? `₹${(topCategory.total_amount || 0).toLocaleString('en-IN')} (${topCategory.percentage}%)` : 'No expenses recorded'}
                </p>
              </div>
            </article>

            {/* Card 4: Total Claims Tracked */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <FileText size={26} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL CLAIMS TRACKED</div>
                <div className="admin-balance-card-value" style={{ color: '#0f172a' }}>
                  {totalCatClaims}
                </div>
                <p className="admin-balance-card-description">
                  Total categorized transactions
                </p>
              </div>
            </article>
          </div>

          {/* Search, Filter Toolbar */}
          <div className="table-controls-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
                <div className="search-bar" style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search categories by name, description..."
                    value={catSearch}
                    onChange={(e) => { setCatSearch(e.target.value); setCatPage(1); }}
                    className="form-input"
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                  />
                  {catSearch && (
                    <button
                      type="button"
                      onClick={() => { setCatSearch(''); setCatPage(1); }}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <SearchableDropdown
                  value={catStatusFilter}
                  onChange={(val) => { setCatStatusFilter(val || 'ALL'); setCatPage(1); }}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'ACTIVE', label: 'Active Only' },
                    { value: 'INACTIVE', label: 'Inactive Only' }
                  ]}
                  placeholder="All Statuses"
                  searchPlaceholder="Search statuses..."
                  allowClear={false}
                  size="sm"
                  style={{ width: '160px' }}
                />
              </div>

              {/* Rows Per Page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Rows:</span>
                <select
                  value={catPageSize}
                  onChange={(e) => { setCatPageSize(Number(e.target.value)); setCatPage(1); }}
                  className="form-input"
                  style={{ width: '70px', padding: '4px 8px', fontSize: '0.825rem' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories Table */}
          {filteredCategories.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Tags size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                No expense categories found.
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                {catSearch ? 'Try adjusting your search criteria.' : 'Click "+ Add Category" to create your first category.'}
              </p>
            </div>
          ) : (
            <>
              <div className="spaced-table-container">
                <table className="spaced-table admin-expenses-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>SR NO.</th>
                      <th>CATEGORY NAME</th>
                      <th>DESCRIPTION</th>
                      <th style={{ textAlign: 'center' }}>STATUS</th>
                      <th style={{ textAlign: 'center' }}>CLAIMS</th>
                      <th style={{ textAlign: 'right' }}>AMOUNT SPENT (INR)</th>
                      <th style={{ width: '180px', textAlign: 'left' }}>% OF TOTAL SPEND</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCategories.map((cat, idx) => {
                      const srNo = (catPage - 1) * catPageSize + idx + 1;
                      return (
                        <tr key={cat.id || idx}>
                          {/* SR No */}
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                            {srNo}
                          </td>

                          {/* Name */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Tags size={15} />
                              </div>
                              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                                {cat.name}
                              </span>
                            </div>
                          </td>

                          {/* Description */}
                          <td style={{ color: '#475569', fontSize: '0.825rem' }}>
                            {cat.description || '—'}
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: cat.is_active ? '#ecfdf5' : '#f1f5f9',
                              color: cat.is_active ? '#059669' : '#64748b',
                              border: cat.is_active ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                            }}>
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Claims Count */}
                          <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            {cat.expense_count} {cat.expense_count === 1 ? 'claim' : 'claims'}
                          </td>

                          {/* Total Amount Spent */}
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                            ₹{(cat.total_amount || 0).toLocaleString('en-IN')}
                          </td>

                          {/* % of Total Spend (Progress bar + badge) */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                flex: 1,
                                height: '7px',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '999px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(cat.percentage || 0, 100)}%`,
                                  height: '100%',
                                  backgroundColor: cat.percentage > 30 ? '#2563eb' : cat.percentage > 10 ? '#3b82f6' : '#93c5fd',
                                  borderRadius: '999px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', minWidth: '42px', textAlign: 'right' }}>
                                {cat.percentage}%
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleCatActive(cat)}
                              style={{
                                padding: '5px 14px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: cat.is_active ? '#16a34a' : '#dc2626',
                                color: '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: cat.is_active ? '0 1px 2px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(220, 38, 38, 0.25)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = cat.is_active ? '#15803d' : '#b91c1c';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = cat.is_active ? '#16a34a' : '#dc2626';
                              }}
                              title={cat.is_active ? 'Click to mark as Inactive' : 'Click to mark as Active'}
                            >
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
                  Showing {Math.min((catPage - 1) * catPageSize + 1, filteredCategories.length)} to {Math.min(catPage * catPageSize, filteredCategories.length)} of {filteredCategories.length} categories
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setCatPage(p => Math.max(1, p - 1))}
                    disabled={catPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600 }}>
                    {catPage} / {catTotalPages}
                  </span>
                  <button
                    onClick={() => setCatPage(p => Math.min(catTotalPages, p + 1))}
                    disabled={catPage >= catTotalPages}
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
      {/* 10. VENDORS LIST VIEW */}
      {/* ============================================================== */}
      {activeTab === 'vendors' && (
        <div>
          {/* Header */}
          <div className="page-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #bbf7d0'
                }}>
                  <Store size={22} />
                </div>
                <div>
                  <h1 className="page-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: '#0f172a' }}>Vendors List</h1>
                  <p className="page-subtitle" style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                    Track vendor expenditures, analyze spend distribution across suppliers, and view detailed employee transaction histories.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => loadVendors()}
                disabled={loadingVendors}
                className="btn btn-secondary"
                title="Refresh vendor list"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={15} className={loadingVendors ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => {
                  setNewVendorName('');
                  setShowAddVendorModal(true);
                }}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={16} />
                <span>+ Add Saved Vendor</span>
              </button>
            </div>
          </div>

          {/* Top 4 Metric Overview Cards */}
          <div className="admin-balance-card-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: '1.5rem' }}>
            {/* Card 1: Total Vendors */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#f1f5f9', color: '#0f172a' }}>
                <Store size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL VENDORS</div>
                <div className="admin-balance-card-value" style={{ color: '#0f172a' }}>
                  {totalVendorsCount}
                </div>
                <p className="admin-balance-card-description">
                  {vendorsList.filter(v => v.is_saved).length} Saved • {vendorsList.filter(v => !v.is_saved).length} Auto-detected
                </p>
              </div>
            </article>

            {/* Card 2: Total Spend */}
            <article className="admin-balance-card admin-balance-commitments">
              <div className="admin-balance-card-icon">
                <ReceiptIndianRupee size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL SPEND ON VENDORS</div>
                <div className="admin-balance-card-value">
                  ₹{totalVendorsSpent.toLocaleString('en-IN')}
                </div>
                <p className="admin-balance-card-description">
                  Approved & posted expenditures across all vendors
                </p>
              </div>
            </article>

            {/* Card 3: Total Invoices / Claims */}
            <article className="admin-balance-card admin-balance-available">
              <div className="admin-balance-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <FileText size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOTAL CLAIMS / INVOICES</div>
                <div className="admin-balance-card-value" style={{ color: '#2563eb' }}>
                  {totalVendorsClaims}
                </div>
                <p className="admin-balance-card-description">
                  Cumulative claims submitted across suppliers
                </p>
              </div>
            </article>

            {/* Card 4: Top Vendor by Spend */}
            <article className="admin-balance-card admin-balance-ledger">
              <div className="admin-balance-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Wallet size={27} />
              </div>
              <div className="admin-balance-card-content">
                <div className="admin-balance-card-label">TOP VENDOR BY SPEND</div>
                <div className="admin-balance-card-value" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topVendor ? topVendor.name : '—'}
                </div>
                <p className="admin-balance-card-description">
                  {topVendor ? `₹${(topVendor.total_spent || 0).toLocaleString('en-IN')} (${topVendor.total_claims_count} claims)` : 'No transactions recorded'}
                </p>
              </div>
            </article>
          </div>

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
            gap: '12px'
          }}>
            {/* Left: Search input & Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search vendor by name or category..."
                  value={vendorSearch}
                  onChange={e => {
                    setVendorSearch(e.target.value);
                    setVendorPage(1);
                  }}
                  className="form-input"
                  style={{ paddingLeft: '36px', paddingRight: vendorSearch ? '36px' : '14px', height: '38px', borderRadius: '8px', width: '100%' }}
                />
                {vendorSearch && (
                  <button
                    onClick={() => setVendorSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button
                  onClick={() => { setVendorTypeFilter('ALL'); setVendorPage(1); }}
                  className={`btn btn-sm ${vendorTypeFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px' }}
                >
                  All ({vendorsList.length})
                </button>
                <button
                  onClick={() => { setVendorTypeFilter('SAVED'); setVendorPage(1); }}
                  className={`btn btn-sm ${vendorTypeFilter === 'SAVED' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px' }}
                >
                  Saved ({vendorsList.filter(v => v.is_saved).length})
                </button>
                <button
                  onClick={() => { setVendorTypeFilter('AUTO'); setVendorPage(1); }}
                  className={`btn btn-sm ${vendorTypeFilter === 'AUTO' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px' }}
                >
                  Auto ({vendorsList.filter(v => !v.is_saved).length})
                </button>
              </div>
            </div>

            {/* Right: Sort and CSV Export */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Sort:</span>
                <select
                  value={vendorSortKey}
                  onChange={e => setVendorSortKey(e.target.value)}
                  className="form-control"
                  style={{ width: '160px', height: '38px', borderRadius: '8px', fontSize: '0.825rem' }}
                >
                  <option value="spend_desc">Spend (High to Low)</option>
                  <option value="spend_asc">Spend (Low to High)</option>
                  <option value="claims_desc">Claims (Most to Least)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
              </div>

              <button
                onClick={() => {
                  const exportRows = filteredVendors.map((v, i) => ({
                    'SR No': i + 1,
                    'Vendor Name': v.name,
                    'Type': v.is_saved ? 'Saved' : 'Auto-detected',
                    'Categories': (v.categories || []).join('; '),
                    'Unique Employees': v.unique_employees_count,
                    'Total Claims': v.total_claims_count,
                    'Approved Claims': v.approved_claims_count,
                    'Pending Claims': v.pending_claims_count,
                    'Total Spent (INR)': v.total_spent,
                    'Pending Amount (INR)': v.pending_amount,
                    'First Expense Date': formatDate(v.first_expense_date),
                    'Last Expense Date': formatDate(v.last_expense_date),
                  }));
                  exportToCSV(exportRows, `Vendors_Summary_${new Date().toISOString().split('T')[0]}.csv`);
                }}
                disabled={filteredVendors.length === 0}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Vendors Table */}
          {loadingVendors ? (
            <div style={{ padding: '4rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <GoogleSpinner size={36} />
              <p style={{ marginTop: '12px', color: '#64748b', fontSize: '0.9rem' }}>Loading vendors directory...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Store size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>No Vendors Found</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
                {vendorSearch ? 'No vendors matched your search criteria.' : 'No vendors or payees recorded in the system yet.'}
              </p>
              {vendorSearch ? (
                <button onClick={() => setVendorSearch('')} className="btn btn-secondary btn-sm">Clear Search</button>
              ) : (
                <button onClick={() => setShowAddVendorModal(true)} className="btn btn-primary btn-sm">+ Add Saved Vendor</button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', width: '55px', textAlign: 'center' }}>SR NO.</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center', width: '135px' }}>ACTIONS</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>AMOUNT SPENT</th>
                      <th style={{ padding: '12px 14px 12px 26px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'left' }}>VENDOR NAME</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'left' }}>CATEGORY</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>EMPLOYEES</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>CLAIMS (BILLS)</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'left' }}>LAST ACTIVITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVendors.map((vendor, idx) => {
                      const sNo = (vendorPage - 1) * vendorPageSize + idx + 1;
                      return (
                        <tr
                          key={vendor.name}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                          {/* 1. SR NO */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', verticalAlign: 'middle' }}>
                            {sNo}
                          </td>

                          {/* 2. ACTIONS */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenVendorDetails(vendor.name)}
                                className="table-btn table-btn-view"
                                title="View Details"
                              >
                                <Eye size={13} />
                                <span>View Details</span>
                              </button>
                            </div>
                          </td>

                          {/* 3. AMOUNT SPENT */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '0.975rem', fontWeight: 700, color: '#0f172a' }}>
                              ₹{(vendor.total_spent || 0).toLocaleString('en-IN')}
                            </div>
                            {vendor.pending_amount > 0 && (
                              <div style={{ fontSize: '0.725rem', color: '#d97706', fontWeight: 500 }}>
                                +₹{(vendor.pending_amount).toLocaleString('en-IN')} pending
                              </div>
                            )}
                          </td>

                          {/* 4. VENDOR NAME */}
                          <td style={{ padding: '12px 14px 12px 26px', textAlign: 'left', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenVendorDetails(vendor.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  fontSize: '0.92rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  lineHeight: '1.25'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#0f172a'}
                                title="Click to view details"
                              >
                                {vendor.name}
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                {vendor.is_saved ? (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', lineHeight: '1.2' }}>
                                    Saved Vendor
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', lineHeight: '1.2' }}>
                                    Auto-detected
                                  </span>
                                )}
                                {vendor.pending_claims_count > 0 && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', lineHeight: '1.2' }}>
                                    {vendor.pending_claims_count} pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. CATEGORY */}
                          <td style={{
                            padding: (vendor.categories || []).length > 2 ? '6px 14px' : '12px 14px',
                            textAlign: 'left',
                            verticalAlign: 'middle'
                          }}>
                            {(() => {
                              const cats = vendor.categories || [];
                              if (cats.length === 0) {
                                return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>;
                              }
                              const hasMoreThan2 = cats.length > 2;
                              const displayedCats = cats.slice(0, 4);
                              const remaining = cats.length - 4;

                              return (
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                  alignItems: 'center',
                                  marginTop: hasMoreThan2 ? '-1px' : '0px',
                                  marginBottom: hasMoreThan2 ? '-1px' : '0px'
                                }}>
                                  {displayedCats.map((c, ci) => (
                                    <span
                                      key={ci}
                                      style={{
                                        fontSize: '0.72rem',
                                        background: '#f1f5f9',
                                        color: '#334155',
                                        padding: hasMoreThan2 ? '1px 6px' : '2px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 500,
                                        maxWidth: '120px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        display: 'inline-block',
                                        lineHeight: '1.25'
                                      }}
                                      title={c}
                                    >
                                      {c}
                                    </span>
                                  ))}
                                  {remaining > 0 && (
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        padding: hasMoreThan2 ? '1px 6px' : '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        display: 'inline-block',
                                        lineHeight: '1.25',
                                        cursor: 'help'
                                      }}
                                      title={`+${remaining} more: ${cats.slice(4).join(', ')}`}
                                    >
                                      ...
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* 6. EMPLOYEES (Clickable Button) */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenVendorEmployeesModal(vendor.name)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#f8fafc',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#0f172a',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#2563eb';
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                e.currentTarget.style.color = '#1d4ed8';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                e.currentTarget.style.color = '#0f172a';
                              }}
                              title="Click to view employees list"
                            >
                              <Users size={14} style={{ color: '#2563eb' }} />
                              <span>{vendor.unique_employees_count}</span>
                            </button>
                          </td>

                          {/* 7. CLAIMS (BILLS) (Clickable Button) */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenVendorClaimsModal(vendor.name)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '4px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                display: 'inline-block',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#2563eb';
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                              }}
                              title="Click to view claims (bills)"
                            >
                              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                                {vendor.total_claims_count}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {vendor.approved_claims_count} approved
                              </div>
                            </button>
                          </td>

                          {/* 8. LAST ACTIVITY */}
                          <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#475569', textAlign: 'left', verticalAlign: 'middle' }}>
                            {vendor.last_expense_date ? formatDate(vendor.last_expense_date) : '—'}
                          </td>
                        </tr>
                      );
                    })}
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
                  Showing {Math.min((vendorPage - 1) * vendorPageSize + 1, filteredVendors.length)} to {Math.min(vendorPage * vendorPageSize, filteredVendors.length)} of {filteredVendors.length} vendors
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setVendorPage(p => Math.max(1, p - 1))}
                    disabled={vendorPage === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0 8px', fontWeight: 600 }}>
                    {vendorPage} / {vendorTotalPages}
                  </span>
                  <button
                    onClick={() => setVendorPage(p => Math.min(vendorTotalPages, p + 1))}
                    disabled={vendorPage >= vendorTotalPages}
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
                <div style={{ width: '180px' }}>
                  <SearchableDropdown
                    value={auditActionFilter}
                    onChange={(val) => { setAuditActionFilter(val || 'ALL'); setAuditPage(1); }}
                    options={[
                      { value: 'ALL', label: 'All Actions' },
                      ...uniqueAuditActions.map(action => ({ value: action, label: action }))
                    ]}
                    placeholder="All Actions"
                    searchPlaceholder="Search actions..."
                    allowClear={false}
                    size="sm"
                  />
                </div>
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
      {selectedExpense && !decisionType && createPortal(
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
            margin: 0,
            padding: '1.25rem',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: 'min(90vh, 780px)',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.16s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Modal Header: Fixed top */}
            <div style={{
              flexShrink: 0,
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ReceiptIndianRupee size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedExpense.reference_number}
                    </span>
                    {renderStatusBadge(selectedExpense.status, selectedExpense)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Expense Claim Details & Audit Verification
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {/* Highlight Amount Card */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                    Claim Amount
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.02em' }}>
                    ₹{selectedExpense.amount?.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Date of Expense
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                    {formatDate(selectedExpense.expense_date)}
                  </div>
                </div>
              </div>

              {/* Claim Specifications */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.25rem',
                background: '#f8fafc',
                padding: '1.1rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {selectedExpense.maker_role === 'CHECKER' ? 'Submitted By (Checker):' : 'Submitted By (Maker):'}
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{selectedExpense.maker_name || 'Staff Custodian'}</span>
                    <span className={`badge ${selectedExpense.maker_role === 'CHECKER' ? 'badge-submitted' : 'badge-approved'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      {selectedExpense.maker_role || 'MAKER'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Category:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '3px' }}>
                    {selectedExpense.category || 'General Expense'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Payee / Merchant:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '3px' }}>
                    {selectedExpense.payee || '-'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fund Account Pool:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '3px' }}>
                    {selectedExpense.fund_account_name || 'Petty Cash Main Account'}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Business Purpose / Description:</span>
                <div style={{
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  lineHeight: '1.5'
                }}>
                  {selectedExpense.description || 'No description provided.'}
                </div>
              </div>

              {/* PDF & Receipt Viewer with Inline Visual Preview & Popup Viewer */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Supporting Document / PDF Receipt:</span>
                <div style={{ marginTop: '6px' }}>
                  {selectedExpense.document_url ? (
                    <div className="pdf-preview-box" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            {selectedExpense.reference_number}_receipt
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Document attached by {selectedExpense.maker_name || (selectedExpense.maker_role === 'CHECKER' ? 'Checker' : 'Custodian')}
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
                            textDecoration: 'none',
                            flexShrink: 0
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
                      padding: '14px',
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
                  marginTop: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '0.825rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ color: '#2563eb', marginTop: '2px' }}><CheckCircle2 size={15} /></div>
                    <div>
                      <strong style={{ color: '#0f172a' }}>Submitted:</strong> by {selectedExpense.maker_name || 'Custodian'} ({selectedExpense.maker_role || 'Staff'}) on {formatDate(selectedExpense.expense_date)}
                    </div>
                  </div>

                  {selectedExpense.maker_role === 'CHECKER' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ color: '#2563eb', marginTop: '2px' }}><CheckCircle2 size={15} /></div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Checker Self-Filing:</strong> Submitted directly by Checker custodian for Admin review
                      </div>
                    </div>
                  ) : selectedExpense.checker_action && selectedExpense.checker_action !== 'NONE' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ color: selectedExpense.checker_action === 'ACCEPT' ? '#10b981' : '#f97316', marginTop: '2px' }}>
                        {selectedExpense.checker_action === 'ACCEPT' ? <CheckCircle2 size={15} /> : <Send size={15} />}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Checker Action ({selectedExpense.checker_action === 'ACCEPT' ? 'Accepted & Recommended' : 'Escalated to Admin'}):</strong> by {selectedExpense.checker_name || 'Checker'}
                        {(selectedExpense.checker_comments || selectedExpense.checker_notes) && (
                          <div style={{ color: '#475569', marginTop: '4px', fontStyle: 'italic', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            "{selectedExpense.checker_comments || selectedExpense.checker_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ color: '#d97706', marginTop: '2px' }}><Clock size={15} /></div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Checker Review:</strong> Pending / Direct review by Admin
                      </div>
                    </div>
                  )}

                  {selectedExpense.admin_decision && selectedExpense.admin_decision !== 'NONE' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ color: selectedExpense.admin_decision === 'ACCEPT' ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                        {selectedExpense.admin_decision === 'ACCEPT' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Admin Decision ({selectedExpense.admin_decision === 'ACCEPT' ? 'Accepted & Posted' : 'Rejected'}):</strong> by {selectedExpense.admin_name || 'Admin'}
                        {(selectedExpense.admin_comments || selectedExpense.admin_notes) && (
                          <div style={{ color: '#475569', marginTop: '4px', fontStyle: 'italic', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            "{selectedExpense.admin_comments || selectedExpense.admin_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions if awaiting Admin Decision */}
            <div style={{
              flexShrink: 0,
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => setSelectedExpense(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '7px 18px', fontWeight: 600 }}
              >
                Close
              </button>

              {['SUBMITTED', 'SENT_TO_ADMIN'].includes(selectedExpense.status) && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setDecisionType('REJECT');
                      setComments('');
                    }}
                    className="btn btn-sm"
                    style={{
                      background: '#ef4444',
                      borderColor: '#ef4444',
                      color: '#ffffff',
                      padding: '7px 16px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <XCircle size={15} />
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
                      borderColor: '#10b981',
                      color: '#ffffff',
                      padding: '7px 18px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>Accept Claim</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* ============================================================== */}
      {/* 5. DECISION CONFIRMATION MODAL (Accept or Mandatory Reject) */}
      {/* ============================================================== */}
      {decisionType && selectedExpense && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={closeDecisionModal}
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
            margin: 0,
            padding: '1.25rem',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.16s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            <div style={{
              flexShrink: 0,
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
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
              <button
                onClick={closeDecisionModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', margin: 0, flex: 1, minHeight: 0 }}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div>Claim: <strong>{selectedExpense.reference_number}</strong></div>
                  <div>Submitted By: <strong>{selectedExpense.maker_name || 'Staff'}</strong> ({selectedExpense.maker_role || 'CUSTODIAN'})</div>
                  <div>Amount: <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>₹{selectedExpense.amount?.toLocaleString('en-IN')}</strong></div>
                </div>

                {decisionType === 'ACCEPT' ? (
                  <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
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
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div style={{
                flexShrink: 0,
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: '#f8fafc'
              }}>
                <button type="button" onClick={closeDecisionModal} className="btn btn-secondary btn-sm" style={{ padding: '7px 16px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision || (decisionType === 'REJECT' && !comments.trim())}
                  className="btn btn-sm"
                  style={{
                    background: decisionType === 'ACCEPT' ? '#10b981' : '#ef4444',
                    borderColor: decisionType === 'ACCEPT' ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    padding: '7px 18px',
                    fontWeight: 600
                  }}
                >
                  {submittingDecision ? 'Processing...' : decisionType === 'ACCEPT' ? 'Confirm Acceptance' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* 6. CREATE EMPLOYEE MODAL */}
      {/* ============================================================== */}
      {showCreateEmpModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowCreateEmpModal(false)}
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
            margin: 0,
            padding: '1rem',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.16s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
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
                    <SearchableDropdown
                      value={newEmpRole}
                      onChange={(val) => setNewEmpRole(val || 'MAKER')}
                      options={[
                        { value: 'MAKER', label: 'Maker (Custodian)' },
                        { value: 'CHECKER', label: 'Checker (Auditor)' }
                      ]}
                      placeholder="Select Role"
                      searchPlaceholder="Search roles..."
                      allowClear={false}
                    />
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <SearchableDropdown
                            value={newEmpDept}
                            onChange={(val) => setNewEmpDept(val)}
                            options={[
                              { value: '', label: 'Select Department...' },
                              ...departments.filter(d => d.is_active).map(d => ({
                                value: d.name,
                                label: `${d.name} (${d.code || 'DEPT'})`
                              }))
                            ]}
                            placeholder="Select Department..."
                            searchPlaceholder="Search departments..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowInlineDeptInput(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0 12px', height: '38px', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* 7. TEMPORARY PASSWORD NOTICE MODAL */}
      {/* ============================================================== */}
      {tempPasswordNotice && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setTempPasswordNotice(null)}
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
            margin: 0,
            padding: '1rem',
            boxSizing: 'border-box'
          }}
        >
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
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* 9. ISSUE SUPPLEMENTARY VOUCHER MODAL */}
      {/* ============================================================== */}
      {showVoucherModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowVoucherModal(false)}
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
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.18s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
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
        </div>,
        document.body
      )}{/* 10. REVIEW FUND REQUEST MODAL */}
      {/* ============================================================== */}
      {selectedReq && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setSelectedReq(null)}
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
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              overflow: 'hidden',
              animation: 'popupEnlargeFromFront 0.18s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
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
        </div>,
        document.body
      )}{/* 11. DEPARTMENT MASTERS MODAL (View Details / Edit / Create) */}
      {/* ============================================================== */}
      {showDeptModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowDeptModal(false)}
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
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: 'min(90vh, 680px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  <Building size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    {editingDept ? 'Department Details' : 'Create New Department'}
                  </h3>
                  {editingDept && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Status: <strong style={{ color: editingDept.is_active ? '#059669' : '#dc2626' }}>{editingDept.is_active ? 'Active' : 'Inactive'}</strong>
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form & Body */}
            <form onSubmit={handleCreateOrUpdateDept} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1 }}>
                {/* Department Name (Editable) */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Department Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => {
                      setDeptName(e.target.value);
                      if (deptFieldErrors.name) setDeptFieldErrors(prev => ({ ...prev, name: null }));
                    }}
                    placeholder="e.g. Operations, Finance, Logistics"
                    className="form-input"
                    style={{
                      height: '40px',
                      borderRadius: '8px',
                      borderColor: deptFieldErrors.name ? '#ef4444' : '#cbd5e1'
                    }}
                    autoFocus
                  />
                  {deptFieldErrors.name && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                      {deptFieldErrors.name}
                    </div>
                  )}
                </div>

                {/* Assigned Employees List */}
                {editingDept && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Assigned Employees</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '1px 8px', borderRadius: '10px' }}>
                        {currentDeptEmployees.length} {currentDeptEmployees.length === 1 ? 'employee' : 'employees'}
                      </span>
                    </label>

                    {currentDeptEmployees.length === 0 ? (
                      <div style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.85rem',
                        color: '#64748b',
                        textAlign: 'center'
                      }}>
                        <Users size={24} style={{ color: '#cbd5e1', marginBottom: '4px', display: 'block', margin: '0 auto 4px' }} />
                        No employees currently assigned to this department.
                      </div>
                    ) : (
                      <div style={{
                        maxHeight: '190px',
                        overflowY: 'auto',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#ffffff'
                      }}>
                        {currentDeptEmployees.map(emp => (
                          <div
                            key={emp.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9'
                            }}
                          >
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
                                fontSize: '0.75rem',
                                flexShrink: 0
                              }}>
                                {String(emp?.full_name || emp?.email || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                                  {emp?.full_name || emp?.email || 'Unnamed Employee'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {emp?.employee_id || (emp?.id ? `EMP-${emp.id}` : '—')}
                                </div>
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: emp?.role === 'CHECKER' ? '#fef3c7' : '#e0f2fe',
                              color: emp?.role === 'CHECKER' ? '#b45309' : '#0369a1'
                            }}>
                              {emp?.role || 'MAKER'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer with 3 Action Buttons: Deactivate, Delete, Edit/Update */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                background: '#f8fafc',
                flexWrap: 'wrap'
              }}>
                {editingDept ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Button 1: Deactivate / Activate */}
                      <button
                        type="button"
                        onClick={async () => {
                          const targetDept = editingDept;
                          try {
                            const updated = await updateDepartment(targetDept.id, { is_active: !targetDept.is_active });
                            setDepartments(prev => prev.map(d => d.id === targetDept.id ? updated : d));
                            notify('success', `Department "${targetDept.name}" ${updated.is_active ? 'activated' : 'deactivated'}.`);
                            setShowDeptModal(false);
                          } catch (err) {
                            notify('error', err.response?.data?.detail || 'Failed to change department status.');
                          }
                        }}
                        className={editingDept.is_active ? 'btn btn-outline-warning btn-sm' : 'btn btn-outline-success btn-sm'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          border: editingDept.is_active ? '1px solid #fde68a' : '1px solid #bbf7d0',
                          backgroundColor: editingDept.is_active ? '#fffbeb' : '#f0fdf4',
                          color: editingDept.is_active ? '#d97706' : '#16a34a',
                          cursor: 'pointer'
                        }}
                        title={editingDept.is_active ? 'Deactivate Department' : 'Activate Department'}
                      >
                        {editingDept.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        <span>{editingDept.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>

                      {/* Button 2: Delete */}
                      <button
                        type="button"
                        onClick={async () => {
                          const targetDept = editingDept;
                          const ok = await confirm({
                            title: `Delete Department "${targetDept.name}"`,
                            message: `Are you sure you want to permanently delete department "${targetDept.name}"? This action cannot be undone.`,
                            confirmText: 'Delete Department',
                            variant: 'danger'
                          });
                          if (!ok) return;

                          try {
                            await deleteDepartment(targetDept.id);
                            setDepartments(prev => prev.filter(d => d.id !== targetDept.id));
                            notify('success', `Department "${targetDept.name}" deleted.`);
                            setShowDeptModal(false);
                          } catch (err) {
                            showAlert({
                              title: 'Cannot Delete Department',
                              message: err.response?.data?.detail || 'Unable to delete this department because employees are currently assigned to it.',
                              variant: 'danger',
                              confirmText: 'Understood'
                            });
                          }
                        }}
                        className="btn btn-outline-danger btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                        title="Delete Department"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDeptModal(false)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        Cancel
                      </button>

                      {/* Button 3: Edit / Update Department */}
                      <button
                        type="submit"
                        disabled={savingDept}
                        className="btn btn-primary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 16px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <Save size={13} />
                        <span>{savingDept ? 'Updating...' : 'Update Department'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                    <button type="button" onClick={() => setShowDeptModal(false)} className="btn btn-secondary btn-sm">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingDept} className="btn btn-primary btn-sm">
                      {savingDept ? 'Creating...' : 'Create Department'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Allocate Funds Modal */}
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
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="#2563eb" />
                Allocate Funds to Employee
              </h3>
              <button
                type="button"
                onClick={() => setShowAllocateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAllocateFundsSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                    {employees.filter(e => ['MAKER', 'CHECKER'].includes(e.role)).map(e => (
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
                  {selectedEmpToAllocate && Number(allocateAmount) > 0 && (
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
                  disabled={allocatingFunds}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Wallet size={15} />
                  <span>{allocatingFunds ? 'Allocating...' : 'Confirm Allocation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 8. ALLOCATION DETAILS MODAL */}
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
                <Wallet size={18} color="#2563eb" />
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


      {/* Animated Fund Breakdown Popup Modal */}
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
                    {fundModalType === 'allocated' && 'Funds Allocated (All Employees)'}
                    {fundModalType === 'used' && 'Funds Used (All Employees)'}
                    {fundModalType === 'remaining' && 'Funds Remaining (All Employees)'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    {fundModalType === 'allocated' && 'Displaying all Makers & Checkers sorted in decreasing order of allocated funds.'}
                    {fundModalType === 'used' && 'Displaying all Makers & Checkers sorted in decreasing order of cumulative funds used.'}
                    {fundModalType === 'remaining' && 'Displaying all Makers & Checkers sorted in decreasing order of remaining balance.'}
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

            {/* Metric Banner: Fixed */}
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
                  {fundModalType === 'allocated' && (fundModalRoleFilter === 'MAKER' ? 'Total Credit Limits Allocated Across Makers' : fundModalRoleFilter === 'CHECKER' ? 'Total Credit Limits Allocated Across Checkers' : 'Total Credit Limits Allocated Across Staff')}
                  {fundModalType === 'used' && (fundModalRoleFilter === 'MAKER' ? 'Total Cumulative Funds Used Across Makers' : fundModalRoleFilter === 'CHECKER' ? 'Total Cumulative Funds Used Across Checkers' : 'Total Cumulative Funds Used Across Staff')}
                  {fundModalType === 'remaining' && (fundModalRoleFilter === 'MAKER' ? 'Total Net Balance Remaining Across Makers' : fundModalRoleFilter === 'CHECKER' ? 'Total Net Balance Remaining Across Checkers' : 'Total Net Balance Remaining Across Staff')}
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: fundModalType === 'allocated' ? '#047857' : fundModalType === 'used' ? '#1d4ed8' : modalTotalRemaining < 0 ? '#dc2626' : '#047857'
                }}>
                  {fundModalType === 'allocated' && `₹${modalTotalAllocated.toLocaleString('en-IN')}`}
                  {fundModalType === 'used' && `₹${modalTotalUsed.toLocaleString('en-IN')}`}
                  {fundModalType === 'remaining' && (modalTotalRemaining < 0 ? `-₹${Math.abs(modalTotalRemaining).toLocaleString('en-IN')}` : `₹${modalTotalRemaining.toLocaleString('en-IN')}`)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="balance-pill-badge-light">
                  <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {sortedFundEmployees.length} Staff Members Displayed
                </span>
              </div>
            </div>

            {/* Search and Filters: Fixed */}
            <div style={{ flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Filter Role:</span>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                  {['ALL', 'MAKER', 'CHECKER'].map(r => (
                    <button
                      key={r}
                      onClick={() => setFundModalRoleFilter(r)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: fundModalRoleFilter === r ? '#ffffff' : 'transparent',
                        color: fundModalRoleFilter === r ? '#0f172a' : '#64748b'
                      }}
                    >
                      {r === 'ALL' ? 'All Roles' : r === 'MAKER' ? 'Makers' : 'Checkers'}
                    </button>
                  ))}
                </div>
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
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <RefreshCw size={20} className="animate-spin" style={{ color: '#2563eb' }} />
                          <span>Loading employee fund records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedFundEmployees.length === 0 ? (
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

      {/* ADD EXPENSE CATEGORY MODAL */}
      {showAddCatModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowAddCatModal(false)}
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
              maxWidth: '480px',
              padding: 0,
              overflow: 'hidden',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              animation: 'popupEnlargeFromFront 0.18s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Tags size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Add Expense Category
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Allow Makers and Checkers to file expense claims under this category.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                disabled={addingCat}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCategory}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Category Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Travel, Office Supplies, Client Hospitality"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (catFieldErrors.name) setCatFieldErrors(prev => ({ ...prev, name: null }));
                    }}
                    className="form-input"
                    style={{
                      width: '100%',
                      borderColor: catFieldErrors.name ? '#ef4444' : '#cbd5e1'
                    }}
                    autoFocus
                  />
                  {catFieldErrors.name && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                      {catFieldErrors.name}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of expenses permitted in this category..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  disabled={addingCat}
                  className="btn btn-secondary"
                  style={{ padding: '7px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCat}
                  className="btn btn-primary"
                  style={{ padding: '7px 20px', fontSize: '0.85rem' }}
                >
                  {addingCat ? 'Creating...' : '+ Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}{/* VENDOR 360 DETAILS MODAL (VIEW MORE) */}
      {/* ============================================================== */}
      {selectedVendorDetails && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setSelectedVendorDetails(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem'
          }}
        >
          <div
            className="modal-content-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1050px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #bbf7d0',
                  flexShrink: 0
                }}>
                  <Store size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {selectedVendorDetails.summary?.name || 'Vendor Details'}
                    </h3>
                    {selectedVendorDetails.summary?.is_saved ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                        Saved Vendor
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                        Auto-detected Payee
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Comprehensive breakdown of employee claims, transaction dates, and supporting documents.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVendorDetails(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Top KPI Ribbon */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '12px',
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>TOTAL SPENT</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  ₹{(selectedVendorDetails.summary?.total_spent || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>TOTAL INVOICES</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  {selectedVendorDetails.summary?.total_claims_count || 0}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', marginLeft: '6px' }}>
                    ({selectedVendorDetails.summary?.approved_claims_count || 0} approved)
                  </span>
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>EMPLOYEES INVOLVED</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {selectedVendorDetails.employees?.length || 0}
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>PENDING AMOUNT</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (selectedVendorDetails.summary?.pending_amount || 0) > 0 ? '#d97706' : '#64748b', marginTop: '2px' }}>
                  ₹{(selectedVendorDetails.summary?.pending_amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Sub-Tabs Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 1.5rem',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setVendorDetailsTab('employees')}
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: vendorDetailsTab === 'employees' ? '#2563eb' : '#64748b',
                    borderBottom: vendorDetailsTab === 'employees' ? '2px solid #2563eb' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Users size={16} />
                  <span>Employees Breakdown ({selectedVendorDetails.employees?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVendorDetailsTab('expenses')}
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: vendorDetailsTab === 'expenses' ? '#2563eb' : '#64748b',
                    borderBottom: vendorDetailsTab === 'expenses' ? '2px solid #2563eb' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ReceiptIndianRupee size={16} />
                  <span>All Expense Transactions ({selectedVendorDetails.expenses?.length || 0})</span>
                </button>
              </div>

              {/* Extreme Right Side: Delete Vendor Button */}
              {selectedVendorDetails.summary?.is_saved ? (
                <button
                  type="button"
                  onClick={() => handleDeleteSavedVendor(selectedVendorDetails.summary)}
                  className="table-btn table-btn-reject"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                  title="Delete this saved vendor"
                >
                  <Trash2 size={14} />
                  <span>Delete Vendor</span>
                </button>
              ) : null}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {loadingVendorDetails ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <GoogleSpinner size={32} />
                  <p style={{ marginTop: '10px', color: '#64748b', fontSize: '0.85rem' }}>Loading detailed vendor transactions...</p>
                </div>
              ) : vendorDetailsTab === 'employees' ? (
                /* Tab 1: Employees Breakdown */
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                      All employees who have incurred and claimed expenses for <strong>{selectedVendorDetails.summary?.name}</strong>:
                    </p>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {filteredVendorModalEmployees.length} {filteredVendorModalEmployees.length === 1 ? 'employee' : 'employees'}
                    </span>
                  </div>

                  {filteredVendorModalEmployees.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <Users size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                      <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No employee transactions recorded for this vendor yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>S.No.</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Employee</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Department</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Role</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Claims Count</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Total Spent (INR)</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Last Claim Date</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVendorModalEmployees.map((emp, idx) => (
                            <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.825rem', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 12px' }}>
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
                                    {(emp.full_name || 'U')[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{emp.full_name}</div>
                                    <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{emp.employee_id} • {emp.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '0.825rem', color: '#334155' }}>
                                {emp.department || '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: emp.role === 'CHECKER' ? '#fef3c7' : '#eff6ff',
                                  color: emp.role === 'CHECKER' ? '#b45309' : '#1d4ed8'
                                }}>
                                  {emp.role}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                                {emp.claims_count}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                                ₹{(emp.total_spent || 0).toLocaleString('en-IN')}
                                {emp.pending_amount > 0 && (
                                  <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 500 }}>
                                    +₹{emp.pending_amount.toLocaleString('en-IN')} pending
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '0.825rem', color: '#475569' }}>
                                {emp.last_expense_date ? formatDate(emp.last_expense_date) : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    setVendorDetailsTab('expenses');
                                    setVendorDetailEmployeeFilter(String(emp.id));
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                  title="Filter claims by this employee"
                                >
                                  View Claims
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: All Expense Transactions */
                <div>
                  {/* In-modal filter toolbar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '1rem',
                    background: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
                      <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          placeholder="Search claim ID, description..."
                          value={vendorDetailExpenseSearch}
                          onChange={e => setVendorDetailExpenseSearch(e.target.value)}
                          className="form-control"
                          style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem', borderRadius: '6px' }}
                        />
                        {vendorDetailExpenseSearch && (
                          <button
                            onClick={() => setVendorDetailExpenseSearch('')}
                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Status Filter */}
                      <select
                        value={vendorDetailStatusFilter}
                        onChange={e => setVendorDetailStatusFilter(e.target.value)}
                        className="form-control"
                        style={{ height: '34px', fontSize: '0.8rem', borderRadius: '6px', maxWidth: '140px' }}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="APPROVED">Approved Only</option>
                        <option value="PENDING">Pending Only</option>
                        <option value="REJECTED">Rejected Only</option>
                      </select>

                      {/* Employee Filter */}
                      <select
                        value={vendorDetailEmployeeFilter}
                        onChange={e => setVendorDetailEmployeeFilter(e.target.value)}
                        className="form-control"
                        style={{ height: '34px', fontSize: '0.8rem', borderRadius: '6px', maxWidth: '160px' }}
                      >
                        <option value="ALL">All Employees</option>
                        {(selectedVendorDetails.employees || []).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        const exportData = filteredVendorModalExpenses.map((exp, idx) => ({
                          'SR No': idx + 1,
                          'Expense ID': exp.reference_number,
                          'Date': formatDate(exp.expense_date),
                          'Employee': exp.maker_name,
                          'Employee ID': exp.maker_employee_id,
                          'Department': exp.maker_department,
                          'Category': exp.category,
                          'Payee': exp.payee,
                          'Amount (INR)': exp.amount,
                          'Status': exp.status,
                          'Description': exp.description,
                        }));
                        exportToCSV(exportData, `Vendor_${selectedVendorDetails.summary?.name}_Expenses.csv`);
                      }}
                      disabled={filteredVendorModalExpenses.length === 0}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '34px', fontSize: '0.8rem' }}
                    >
                      <Download size={14} />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  {filteredVendorModalExpenses.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <ReceiptIndianRupee size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                      <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No expense claims matched your filter.</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>S.No.</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Expense ID</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Employee</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Category</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Description</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '10px 12px', fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center', width: '90px' }}>Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVendorModalExpenses.map((exp, idx) => {
                            const isApproved = ['ACCEPTED_BY_CHECKER', 'ACCEPTED_BY_ADMIN'].includes(exp.status);
                            const isPending = ['SUBMITTED', 'SENT_TO_ADMIN'].includes(exp.status);
                            const isRejected = ['REJECTED_BY_CHECKER', 'REJECTED_BY_ADMIN'].includes(exp.status);
                            return (
                              <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.825rem', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a', fontSize: '0.825rem' }}>
                                  {exp.reference_number}
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '0.825rem', color: '#475569' }}>
                                  {formatDate(exp.expense_date)}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.825rem', color: '#0f172a' }}>{exp.maker_name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{exp.maker_department || 'General'}</div>
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#334155' }}>
                                  <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                    {exp.category}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {exp.description}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                                  ₹{(exp.amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: isApproved ? '#dcfce7' : isPending ? '#fef3c7' : isRejected ? '#fee2e2' : '#f1f5f9',
                                    color: isApproved ? '#15803d' : isPending ? '#b45309' : isRejected ? '#b91c1c' : '#475569'
                                  }}>
                                    {exp.status === 'ACCEPTED_BY_ADMIN' ? 'Approved by Admin' :
                                     exp.status === 'ACCEPTED_BY_CHECKER' ? 'Approved by Checker' :
                                     exp.status === 'SENT_TO_ADMIN' ? 'Escalated to Admin' :
                                     exp.status === 'SUBMITTED' ? 'Pending Review' :
                                     exp.status === 'REJECTED_BY_ADMIN' ? 'Rejected by Admin' :
                                     exp.status === 'REJECTED_BY_CHECKER' ? 'Rejected by Checker' : exp.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  {exp.document_url ? (
                                    <a
                                      href={getMediaUrl(exp.document_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                      title="Open supporting document"
                                    >
                                      <FileText size={12} />
                                      <span>View</span>
                                    </a>
                                  ) : (
                                    <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>No Bill</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setSelectedVendorDetails(null)}
                className="btn btn-secondary"
                style={{ padding: '7px 18px', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* VENDOR EMPLOYEES POPUP MODAL (ID, NAME, DATE, AMOUNT ONLY) */}
      {/* ============================================================== */}
      {vendorEmployeeModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setVendorEmployeeModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Employees — {vendorEmployeeModal.vendorName}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Employees who incurred expenses with this vendor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVendorEmployeeModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {vendorEmployeeModal.loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <GoogleSpinner size={32} />
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>Loading employees...</p>
                </div>
              ) : vendorEmployeeModal.employees.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <Users size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No employees recorded for this vendor.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Employee ID</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorEmployeeModal.employees.map((emp, idx) => (
                        <tr key={emp.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#2563eb' }}>
                            {emp.employee_id || `EMP-${emp.id}`}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {emp.full_name}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {emp.last_expense_date ? formatDate(emp.last_expense_date) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            ₹{(emp.total_spent || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setVendorEmployeeModal(null)}
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

      {/* ============================================================== */}
      {/* VENDOR CLAIMS (BILLS) POPUP MODAL (DATE, AMOUNT, EMPLOYEE NAME ONLY) */}
      {/* ============================================================== */}
      {vendorClaimsModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setVendorClaimsModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  <ReceiptIndianRupee size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Claims (Bills) — {vendorClaimsModal.vendorName}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Claims and bills recorded for this vendor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVendorClaimsModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {vendorClaimsModal.loading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <GoogleSpinner size={32} />
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>Loading claims...</p>
                </div>
              ) : vendorClaimsModal.claims.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <ReceiptIndianRupee size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No claims or bills found for this vendor.</p>
                </div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Employee Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorClaimsModal.claims.map((claim, idx) => (
                        <tr key={claim.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>
                            {claim.expense_date ? formatDate(claim.expense_date) : (claim.created_at ? formatDate(claim.created_at) : '—')}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            ₹{Number(claim.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {claim.maker_name || 'Staff'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setVendorClaimsModal(null)}
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

      {/* ============================================================== */}
      {/* ADD SAVED VENDOR MODAL */}
      {/* ============================================================== */}
      {showAddVendorModal && createPortal(
        <div
          className="modal-overlay-custom"
          onClick={() => setShowAddVendorModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
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
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Store size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Add Saved Vendor
                </h3>
              </div>
              <button
                onClick={() => setShowAddVendorModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSavedVendor}>
              <div style={{ padding: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Vendor / Supplier Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Staples Office Supplies, Reliance Smart..."
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', height: '42px', borderRadius: '8px' }}
                  autoFocus
                />
                <p style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '6px', margin: '6px 0 0 0' }}>
                  This vendor will appear in autocomplete suggestions when custodians file expense claims.
                </p>
              </div>

              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  disabled={addingVendor}
                  className="btn btn-secondary"
                  style={{ padding: '7px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingVendor}
                  className="btn btn-primary"
                  style={{ padding: '7px 20px', fontSize: '0.85rem' }}
                >
                  {addingVendor ? 'Adding...' : '+ Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
