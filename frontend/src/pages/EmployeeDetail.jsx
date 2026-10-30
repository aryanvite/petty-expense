import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getMediaUrl, formatDate, formatDateTime, fetchDepartments, createDepartment } from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { LoadingScreen } from '../components/GoogleSpinner';
import SearchableDropdown from '../components/SearchableDropdown';
import TableHeadSortMenu, { TableColumnsButton, ScrollTableToolbar, exportToCSV } from '../components/TableHeadSortMenu';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Building,
  Briefcase,
  KeyRound,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  ReceiptIndianRupee,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  Wallet,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { confirm, alert: customAlert } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [notification, setNotification] = useState({ type: '', text: '' });
  const [departmentsList, setDepartmentsList] = useState([]);

  // Pagination & Sorting for expenses table
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Registered columns for the Employee Receipts Table (All visible by default)
  const EXPENSE_COLUMNS = useMemo(() => [
    { key: 'sno', label: 'SR No.' },
    { key: 'actions', label: 'Actions' },
    { key: 'status', label: 'Status' },
    { key: 'ref', label: 'Expense ID' },
    { key: 'date', label: 'Date' },
    ...(emp?.role !== 'MAKER' ? [{ key: 'maker', label: 'Custodian (Maker)' }] : []),
    { key: 'category', label: 'Category' },
    { key: 'payee', label: 'Payee / Merchant' },
    { key: 'desc', label: 'Description' },
    { key: 'amount', label: 'Amount (INR)' }
  ], [emp?.role]);

  // Column visibility state: empty array = ALL columns ticked (ON) by default
  const [hiddenCols, setHiddenCols] = useState([]);
  const toggleCol = (key) => {
    setHiddenCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };
  const isColVisible = (key) => !hiddenCols.includes(key);

  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
  };

  // Load master departments for edit dropdown
  useEffect(() => {
    fetchDepartments().then(setDepartmentsList).catch(() => {});
  }, []);

  const [showInlineDeptInput, setShowInlineDeptInput] = useState(false);
  const [customDeptText, setCustomDeptText] = useState('');
  const [creatingCustomDept, setCreatingCustomDept] = useState(false);

  const handleQuickAddDepartment = async () => {
    const trimmed = customDeptText.trim();
    if (!trimmed) {
      setNotification({ type: 'error', text: 'Please enter a department name.' });
      return;
    }
    const existing = departmentsList.find(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setEditForm(prev => ({ ...prev, department: existing.name }));
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
      setEditForm(prev => ({ ...prev, department: created.name }));
      setShowInlineDeptInput(false);
      setCustomDeptText('');
      setNotification({ type: 'success', text: `Department "${created.name}" created and selected!` });
    } catch (err) {
      setNotification({ type: 'error', text: err?.response?.data?.name?.[0] || 'Failed to create department.' });
    } finally {
      setCreatingCustomDept(false);
    }
  };

  // Derived state (MUST be declared before any early returns)
  const sortedExpenses = useMemo(() => {
    const list = emp?.expenses ? [...emp.expenses] : [];
    if (!sortConfig.direction) return list;

    list.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
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
        case 'amount':
          aVal = Number(a.amount) || 0;
          bVal = Number(b.amount) || 0;
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'payee':
          aVal = a.payee || '';
          bVal = b.payee || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'maker':
          aVal = a.maker_name || '';
          bVal = b.maker_name || '';
          break;
        case 'desc':
          aVal = a.description || '';
          bVal = b.description || '';
          break;
        default:
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, { numeric: true });
    });
    return list;
  }, [emp, sortConfig]);

  // Scroll-triggered Table Toolbar States & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const tableSectionRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!tableSectionRef.current) return;
      const rect = tableSectionRef.current.getBoundingClientRect();
      // Only show when scrolled down to table territory, hide when back at top
      const inTableRange = window.scrollY > 60 && rect.top <= 280 && rect.bottom >= 100;
      setShowTableToolbar(inTableRange);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const uniqueCategories = useMemo(() => {
    if (!emp?.expenses) return [];
    const set = new Set();
    emp.expenses.forEach(e => { if (e.category) set.add(e.category); });
    return Array.from(set).sort();
  }, [emp?.expenses]);

  const filteredExpenses = useMemo(() => {
    return sortedExpenses.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          (item.reference_number && item.reference_number.toLowerCase().includes(q)) ||
          (item.maker_name && item.maker_name.toLowerCase().includes(q)) ||
          (item.payee && item.payee.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.amount && String(item.amount).includes(q)) ||
          (item.status && item.status.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [sortedExpenses, searchTerm, categoryFilter, statusFilter]);

  const expenses = filteredExpenses;
  const totalPages = Math.ceil(expenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return expenses.slice(start, start + pageSize);
  }, [expenses, page, pageSize]);

  const handleExportCSV = () => {
    const dataToExport = filteredExpenses.map((exp, idx) => ({
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
    exportToCSV(dataToExport, `${(emp?.full_name || 'employee').replace(/\s+/g, '_')}_expenses.csv`);
  };
  const isSelf = emp?.id === currentUser?.id;

  // Strict Hierarchy Permissions:
  // Admin: Can manage Maker and Checker. Cannot manage other Admins (unless self). Cannot deactivate/delete self or other Admin.
  // Checker: Can manage Maker employees. Cannot manage Admin, Checker, or self.
  // Maker: No administrative actions.
  const isAdmin = currentUser?.role === 'ADMIN';
  const isChecker = currentUser?.role === 'CHECKER';
  const isTargetAdmin = emp?.role === 'ADMIN';
  const isTargetChecker = emp?.role === 'CHECKER';
  const isTargetMaker = emp?.role === 'MAKER';

  const canModify = (isAdmin && (!isTargetAdmin || isSelf)) || (isChecker && isTargetMaker);
  const canToggleActive = (isAdmin && !isTargetAdmin && !isSelf) || (isChecker && isTargetMaker && !isSelf);
  const canDelete = (isAdmin && !isTargetAdmin && !isSelf) || (isChecker && isTargetMaker && !isSelf);

  // Modals & States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    designation: '',
    department: '',
    phone: '',
    role: 'MAKER',
    password: ''
  });

  // Temporary password notice modal
  const [tempPasswordNotice, setTempPasswordNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  // View Bill in Popup Modal
  const [selectedBillExpense, setSelectedBillExpense] = useState(null);

  // Decision Modal inside bill popup (if claim is pending admin action)
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState('ACCEPT');
  const [rejectionComments, setRejectionComments] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const notify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification({ type: '', text: '' }), 5000);
  };

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/employees/${id}/`);
      setEmp(res.data);
      setEditForm({
        full_name: res.data.full_name || '',
        designation: res.data.designation || '',
        department: res.data.department || '',
        phone: res.data.phone || '',
        role: res.data.role || 'MAKER',
        password: ''
      });
    } catch (err) {
      console.error(err);
      notify('error', err.response?.data?.detail || 'Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    }
  }, [id]);

  // Handle Edit Submit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        designation: editForm.designation.trim(),
        department: editForm.department.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await api.patch(`/admin/employees/${id}/`, payload);
      notify('success', 'Employee profile updated successfully!');
      setEditModalOpen(false);
      await fetchEmployeeData();
    } catch (err) {
      notify('error', err.response?.data?.password?.[0] || err.response?.data?.detail || 'Failed to update employee.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async () => {
    const ok = await confirm({
      title: 'Reset Employee Password',
      message: `Generate a new temporary login password for ${emp?.full_name}? The user will be required to change it upon login.`,
      subMessage: `Employee ID: ${emp?.employee_id || '—'} · Email: ${emp?.email} · Role: ${emp?.role}`,
      confirmText: 'Generate Password',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: 'key',
    });
    if (!ok) return;

    try {
      const res = await api.post(`/admin/employees/${id}/reset-password/`, {});
      setTempPasswordNotice({
        name: emp.full_name,
        email: emp.email,
        employee_id: emp.employee_id,
        role: emp.role,
        password: res.data.temporary_password
      });
      notify('success', `Temporary password generated for ${emp.full_name}.`);
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async () => {
    const isDeactivating = emp.is_active;
    const ok = await confirm({
      title: isDeactivating ? 'Deactivate Employee Account' : 'Reactivate Employee Account',
      message: isDeactivating
        ? `Are you sure you want to deactivate ${emp.full_name}'s account? They will be immediately blocked from logging into the portal.`
        : `Are you sure you want to reactivate ${emp.full_name}'s account? Their portal access will be immediately restored.`,
      subMessage: `Employee: ${emp.full_name} (${emp.employee_id || emp.email})`,
      confirmText: isDeactivating ? 'Deactivate User' : 'Reactivate User',
      cancelText: 'Cancel',
      variant: isDeactivating ? 'warning' : 'success',
      icon: isDeactivating ? 'user-x' : 'user-check',
    });
    if (!ok) return;

    try {
      await api.post(`/admin/employees/${id}/toggle-active/`);
      notify('success', `Account ${isDeactivating ? 'deactivated' : 'reactivated'} successfully.`);
      await fetchEmployeeData();
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to update account status.');
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Permanently Delete User',
      message: `Are you sure you want to permanently delete ${emp.full_name}? All associated login records and permissions will be deleted permanently.`,
      subMessage: `Warning: This action cannot be reversed! (ID: ${emp.employee_id || emp.email})`,
      confirmText: 'Delete User Permanently',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    try {
      await api.delete(`/admin/employees/${id}/`);
      await customAlert({
        title: 'User Deleted',
        message: `Employee ${emp.full_name} (${emp.employee_id || emp.email}) has been permanently deleted.`,
        confirmText: 'Return to Employees',
        variant: 'success',
        icon: 'check',
      });
      navigate('/admin?tab=employees');
    } catch (err) {
      notify('error', err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status Badge Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="workman-status-badge status-badge-submitted">
            <span className="status-dot"></span>
            Pending Checker
          </span>
        );
      case 'ACCEPTED_BY_CHECKER':
        return (
          <span className="workman-status-badge status-badge-accepted-checker">
            <span className="status-dot"></span>
            Approved by Checker
          </span>
        );
      case 'SENT_TO_ADMIN':
        return (
          <span className="workman-status-badge status-badge-sent-admin">
            <span className="status-dot"></span>
            Sent to Admin
          </span>
        );
      case 'ACCEPTED_BY_ADMIN':
        return (
          <span className="workman-status-badge status-badge-approved">
            <span className="status-dot"></span>
            Admin Approved
          </span>
        );
      case 'REJECTED_BY_ADMIN':
        return (
          <span className="workman-status-badge status-badge-rejected">
            <span className="status-dot"></span>
            Admin Rejected
          </span>
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

  // Handle Admin Decision from inside Bill Popup
  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBillExpense) return;

    if (decisionType === 'REJECT' && !rejectionComments.trim()) {
      notify('error', 'A mandatory rejection reason must be provided.');
      return;
    }

    setSubmittingDecision(true);
    try {
      await api.post(`/expenses/${selectedBillExpense.id}/admin-decision/`, {
        decision: decisionType,
        comments: rejectionComments.trim()
      });

      notify('success', `Claim ${selectedBillExpense.reference_number}: decision recorded.`);
      setDecisionModalOpen(false);
      setSelectedBillExpense(null);
      await fetchEmployeeData();
    } catch (err) {
      notify('error', err.response?.data?.comments?.[0] || err.response?.data?.detail || 'Failed to record decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullPage size={48} />;
  }

  if (!emp) {
    return (
      <div className="page-body">
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <AlertCircle size={44} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Employee Not Found</h2>
          <p style={{ color: '#64748b', marginTop: '6px' }}>The requested employee account could not be found or has been removed.</p>
          <button onClick={() => navigate('/admin?tab=employees')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} />
            <span>Return to Employees</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* Notification Banner */}
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

      {/* Top Navigation & Action Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              if (currentUser?.role === 'CHECKER') {
                navigate('/checker?tab=employees');
              } else {
                navigate('/admin?tab=employees');
              }
            }}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Return to employees directory"
          >
            <ArrowLeft size={15} />
            <span>Back to Employees</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {emp.full_name}
              </h1>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #bfdbfe'
              }}>
                {emp.employee_id || 'EMP----'}
              </span>
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
              {isSelf && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                  (Current User)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Right on the Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {canModify && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={14} />
              <span>Edit Profile</span>
            </button>
          )}

          {canModify && (
            <button
              onClick={handleResetPassword}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Generate a temporary password"
            >
              <KeyRound size={14} />
              <span>Reset Password</span>
            </button>
          )}

          {canToggleActive && (
            <button
              onClick={handleToggleActive}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: emp.is_active ? '#b91c1c' : '#15803d',
                borderColor: emp.is_active ? '#fca5a5' : '#86efac'
              }}
            >
              {emp.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              <span>{emp.is_active ? 'Deactivate' : 'Reactivate'}</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fca5a5'
              }}
              title="Permanently remove user"
            >
              <Trash2 size={14} />
              <span>Delete User</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Overview Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar / Photo */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 700,
            overflow: 'hidden',
            flexShrink: 0,
            border: '3px solid #eff6ff'
          }}>
            {emp.photo_url ? (
              <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              emp.full_name ? emp.full_name[0].toUpperCase() : 'U'
            )}
          </div>

          {/* Details Grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Full Name
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {emp.full_name}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email Address
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#64748b" />
                <span>{emp.email}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Department
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="#64748b" />
                <span>{emp.department || 'Not Specified'}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Designation
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} color="#64748b" />
                <span>{emp.designation || 'Not Specified'}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Phone Number
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#64748b" />
                <span>{emp.phone || '—'}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Account Status
              </span>
              <div style={{ marginTop: '2px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: emp.is_active ? '#15803d' : '#b91c1c'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: emp.is_active ? '#16a34a' : '#dc2626'
                  }}></span>
                  {emp.is_active ? 'Active Account' : 'Account Disabled'}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Date Joined
              </span>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#64748b" />
                <span>{formatDate(emp.date_joined)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Quick KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {emp.role === 'CHECKER' ? 'TOTAL CLAIMS AUDITED' : emp.role === 'ADMIN' ? 'TOTAL CLAIMS DECISIONED' : 'TOTAL CLAIMS SUBMITTED'}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {emp.total_claims_count || expenses.length}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {emp.role === 'CHECKER' ? 'TOTAL AUDITED AMOUNT' : emp.role === 'ADMIN' ? 'TOTAL DECISIONED AMOUNT' : 'TOTAL CLAIMED AMOUNT'}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
              ₹{(emp.total_claimed_amount || expenses.reduce((s, e) => s + (e.amount || 0), 0)).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>APPROVED EXPENDITURE</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
              ₹{(emp.approved_amount || expenses.filter(e => e.status === 'ACCEPTED_BY_ADMIN').reduce((s, e) => s + (e.amount || 0), 0)).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>CLAIMS IN REVIEW</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {emp.pending_count || expenses.filter(e => ['SUBMITTED', 'SENT_TO_ADMIN'].includes(e.status)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Expense History Table Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {emp.role === 'CHECKER' ? 'Audit & Verification History' : emp.role === 'ADMIN' ? 'Admin Decision History' : 'Employee Expense History'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>
              {emp.role === 'CHECKER'
                ? `Complete chronological audit of claims verified or reviewed by this checker (${expenses.length} Records)`
                : emp.role === 'ADMIN'
                ? `Complete chronological audit of claims decisioned or submitted by this admin (${expenses.length} Records)`
                : `Complete chronological audit of claims submitted by this employee (${expenses.length} Records)`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableColumnsButton
              columns={EXPENSE_COLUMNS}
              hiddenColumns={hiddenCols}
              onToggleColumn={toggleCol}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
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

        {expenses.length === 0 ? (
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
              No expenses recorded
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              {emp.role === 'CHECKER'
                ? 'This checker has not reviewed or verified any petty expense claims yet.'
                : 'This employee has not submitted any petty expense claims yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Scroll-triggered Image 1 Toolbar: Search, Count, Columns, Export, Category, Status */}
            <ScrollTableToolbar
              visible={showTableToolbar}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search expenses..."
              count={filteredExpenses.length}
              countLabel="expenses"
              columns={EXPENSE_COLUMNS}
              hiddenColumns={hiddenCols}
              onToggleColumn={toggleCol}
              onExport={handleExportCSV}
              filters={[
                {
                  label: 'Category',
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                  options: [
                    { value: 'ALL', label: 'All Categories' },
                    ...uniqueCategories.map(c => ({ value: c, label: c }))
                  ]
                },
                {
                  label: 'Status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'PENDING', label: 'Pending' },
                    { value: 'SENT_TO_ADMIN', label: 'Sent to Admin' },
                    { value: 'ACCEPTED', label: 'Accepted' },
                    { value: 'REJECTED', label: 'Rejected' }
                  ]
                }
              ]}
            />

            <div ref={tableSectionRef} className="spaced-table-container">
              <table className="spaced-table">
                <thead>
                  <tr>
                    {isColVisible('sno') && (
                      <TableHeadSortMenu
                        label="SR No."
                        columnKey="sno"
                        allColumns={EXPENSE_COLUMNS}
                        hiddenColumns={hiddenCols}
                        onToggleColumn={toggleCol}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        width="85px"
                      />
                    )}
                    {isColVisible('actions') && (
                      <TableHeadSortMenu
                        label="Actions"
                        columnKey="actions"
                        align="center"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        width="170px"
                      />
                    )}
                    {isColVisible('status') && (
                      <TableHeadSortMenu
                        label="Status"
                        columnKey="status"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {isColVisible('ref') && (
                      <TableHeadSortMenu
                        label="Expense ID"
                        columnKey="ref"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {isColVisible('date') && (
                      <TableHeadSortMenu
                        label="Date"
                        columnKey="date"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {emp.role !== 'MAKER' && isColVisible('maker') && (
                      <TableHeadSortMenu
                        label="Custodian (Maker)"
                        columnKey="maker"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {isColVisible('category') && (
                      <TableHeadSortMenu
                        label="Category"
                        columnKey="category"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {isColVisible('payee') && (
                      <TableHeadSortMenu
                        label="Payee / Merchant"
                        columnKey="payee"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {isColVisible('desc') && (
                      <TableHeadSortMenu
                        label="Description"
                        columnKey="desc"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                    {isColVisible('amount') && (
                      <TableHeadSortMenu
                        label="Amount (INR)"
                        columnKey="amount"
                        align="right"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedExpenses.map((exp, idx) => (
                    <tr key={exp.id}>
                      {isColVisible('sno') && (
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                      )}
                      {isColVisible('actions') && (
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {/* VIEW BILL IN POPUP BUTTON */}
                            <button
                              onClick={() => setSelectedBillExpense(exp)}
                              className="table-btn table-btn-view"
                              title="View claim history and breakdown"
                            >
                              <Eye size={13} />
                              <span>View Details</span>
                            </button>
                          </div>
                        </td>
                      )}
                      {isColVisible('status') && <td>{renderStatusBadge(exp.status)}</td>}
                      {isColVisible('ref') && (
                        <td style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                          {exp.reference_number}
                        </td>
                      )}
                      {isColVisible('date') && (
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{formatDate(exp.expense_date)}</td>
                      )}
                      {emp.role !== 'MAKER' && isColVisible('maker') && (
                        <td style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                          {exp.maker_name || '—'}
                        </td>
                      )}
                      {isColVisible('category') && (
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
                      {isColVisible('payee') && (
                        <td style={{ fontSize: '0.85rem', color: '#1e293b' }}>{exp.payee}</td>
                      )}
                      {isColVisible('desc') && (
                        <td style={{ maxWidth: '240px', fontSize: '0.825rem', color: '#475569' }} title={exp.description}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exp.description}
                          </div>
                        </td>
                      )}
                      {isColVisible('amount') && (
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
                Showing {Math.min((page - 1) * pageSize + 1, expenses.length)} to {Math.min(page * pageSize, expenses.length)} of {expenses.length} entries
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '0 8px', fontWeight: 600, color: '#1e293b' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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

      {/* ============================================================== */}
      {/* MODAL 1: VIEW BILL IN POPUP MODAL (PDF / Image & Download) */}
      {/* ============================================================== */}
      {selectedBillExpense && (
        <div className="modal-overlay-custom" onClick={() => setSelectedBillExpense(null)}>
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
                  {selectedBillExpense.reference_number}
                </span>
                {renderStatusBadge(selectedBillExpense.status)}
              </div>
              <button
                onClick={() => setSelectedBillExpense(null)}
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
                    Claimed Expense Amount
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{selectedBillExpense.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date of Expense</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                    {formatDate(selectedBillExpense.expense_date)}
                  </div>
                </div>
              </div>

              {/* Specifications Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Maker (Custodian):</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBillExpense.maker_name || emp.full_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Expense Category:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBillExpense.category}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Payee / Merchant:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBillExpense.payee}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Fund Account:</span>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBillExpense.fund_account_name || 'Petty Cash Main Fund'}</div>
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
                  {selectedBillExpense.description}
                </div>
              </div>

              {/* Bill & Receipt Attachment Box with Side Download */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Supporting Document / PDF Receipt:</span>
                <div style={{ marginTop: '8px' }}>
                  {selectedBillExpense.document_url ? (
                    <div className="pdf-preview-box">
                      <div className="pdf-preview-info">
                        <div className="pdf-preview-icon">
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                            {selectedBillExpense.reference_number}_bill_receipt
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Official invoice / bill attachment uploaded by custodian
                          </div>
                        </div>
                      </div>

                      {/* Single View Proof Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={getMediaUrl(selectedBillExpense.document_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 14px', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                          title="Open proof document in new tab"
                        >
                          <ExternalLink size={14} />
                          <span>View Proof</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b',
                      fontSize: '0.825rem',
                      textAlign: 'center'
                    }}>
                      No receipt / bill document attached for this claim.
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Workflow Trail */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Approval Trail & Remarks:</span>
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
                      <strong>Submitted:</strong> by {emp.full_name} on {formatDate(selectedBillExpense.expense_date)}
                    </div>
                  </div>

                  {selectedBillExpense.checker_action && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ color: selectedBillExpense.checker_action === 'ACCEPT' ? '#10b981' : '#f97316', marginTop: '2px' }}>
                        {selectedBillExpense.checker_action === 'ACCEPT' ? <CheckCircle2 size={14} /> : <Send size={14} />}
                      </div>
                      <div>
                        <strong>Checker Review ({selectedBillExpense.checker_action}):</strong>
                        {selectedBillExpense.checker_notes && (
                          <div style={{ color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                            "{selectedBillExpense.checker_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedBillExpense.admin_decision && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ color: selectedBillExpense.admin_decision === 'ACCEPT' ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                        {selectedBillExpense.admin_decision === 'ACCEPT' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      </div>
                      <div>
                        <strong>Admin Decision ({selectedBillExpense.admin_decision}):</strong>
                        {selectedBillExpense.admin_notes && (
                          <div style={{ color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                            "{selectedBillExpense.admin_notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => setSelectedBillExpense(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>

              {/* If awaiting Admin Action, allow decision right inside bill popup */}
              {selectedBillExpense.status === 'SENT_TO_ADMIN' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setDecisionType('REJECT');
                      setRejectionComments('');
                      setDecisionModalOpen(true);
                    }}
                    className="btn btn-sm"
                    style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 14px' }}
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => {
                      setDecisionType('ACCEPT');
                      setRejectionComments('');
                      setDecisionModalOpen(true);
                    }}
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 14px' }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Accept & Post</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADMIN DECISION MODAL (Accept / Reject) */}
      {/* ============================================================== */}
      {decisionModalOpen && selectedBillExpense && (
        <div className="modal-overlay-custom" onClick={() => setDecisionModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {decisionType === 'ACCEPT' ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {decisionType === 'ACCEPT' ? 'Confirm Acceptance' : 'Confirm Rejection'}
                </h3>
              </div>
              <button onClick={() => setDecisionModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <div>Claim: <strong>{selectedBillExpense.reference_number}</strong></div>
                  <div>Amount: <strong style={{ color: '#0f172a' }}>₹{selectedBillExpense.amount.toLocaleString('en-IN')}</strong></div>
                </div>

                {decisionType === 'REJECT' && (
                  <div>
                    <label className="form-label" style={{ color: '#b91c1c' }}>Rejection Reason (Mandatory)*</label>
                    <textarea
                      rows={3}
                      required
                      value={rejectionComments}
                      onChange={(e) => setRejectionComments(e.target.value)}
                      placeholder="Specify clear rationale for rejection..."
                      className="form-input"
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
                <button type="button" onClick={() => setDecisionModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecision || (decisionType === 'REJECT' && !rejectionComments.trim())}
                  className="btn btn-sm"
                  style={{
                    background: decisionType === 'ACCEPT' ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px'
                  }}
                >
                  {submittingDecision ? 'Saving...' : decisionType === 'ACCEPT' ? 'Accept Claim' : 'Reject Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: EDIT PROFILE MODAL */}
      {/* ============================================================== */}
      {editModalOpen && (
        <div className="modal-overlay-custom" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Edit Employee Profile
                </h3>
              </div>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                      className="form-input"
                      disabled={isSelf || (!isAdmin && !isChecker)}
                    >
                      <option value="MAKER">Maker</option>
                      {isAdmin && <option value="CHECKER">Checker</option>}
                      {emp?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Department</label>
                    </div>

                    {!showInlineDeptInput ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <SearchableDropdown
                          value={editForm.department}
                          onChange={(val) => setEditForm(prev => ({ ...prev, department: val }))}
                          options={departmentsList.map(d => ({
                            value: d.name,
                            label: d.name,
                            code: d.code || 'DEPT'
                          }))}
                          placeholder="Select Department..."
                          searchPlaceholder="Search departments..."
                          style={{ flex: 1 }}
                        />
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
                      value={editForm.designation}
                      onChange={(e) => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Set New Password (Optional)</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave blank to preserve current password"
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
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary btn-sm">
                  {savingEdit ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: TEMPORARY PASSWORD NOTICE MODAL */}
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
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Temporary Password Generated
                </h3>
              </div>
              <button onClick={() => setTempPasswordNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                Please provide these temporary login credentials to <strong>{tempPasswordNotice.name}</strong>.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Employee ID / Email:</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  {tempPasswordNotice.employee_id} • {tempPasswordNotice.email}
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
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem', color: '#2563eb' }}>
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
              <button onClick={() => setTempPasswordNotice(null)} className="btn btn-primary btn-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
