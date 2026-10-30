import React, { useState, useEffect, useRef } from 'react';

import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import api from '../api';

import ChangePasswordModal from './ChangePasswordModal';
import GoogleSpinner, { LoadingScreen } from './GoogleSpinner';

import { 

  LayoutDashboard, 

  Users, 

  LogOut, 

  KeyRound, 

  ChevronDown, 

  ChevronLeft,

  ChevronRight, 

  User as UserIcon,

  PlusCircle,

  FileText,

  Bell,

  ReceiptIndianRupee,

  Building,

  Clock,

  History,

  Wallet,
  ShieldCheck,
  Tags,
  Store
} from 'lucide-react';



export default function AppLayout() {

  const { user, logout, openPasswordModal } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const navigate = useNavigate();

  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 25000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }

    if (dropdownOpen || notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, notifOpen]);



  const toggleSidebar = () => {

    setCollapsed(prev => {

      const next = !prev;

      localStorage.setItem('sidebar_collapsed', String(next));

      return next;

    });

  };



  const isAdmin = user?.role === 'ADMIN';

  const isMaker = user?.role === 'MAKER';

  const isChecker = user?.role === 'CHECKER';

  const initial = user?.full_name ? user.full_name[0].toUpperCase() : 'U';



  
  const [navLoading, setNavLoading] = useState(false);
  const prevLocRef = useRef(location.pathname + location.search);

  useEffect(() => {
    const currentLoc = location.pathname + location.search;
    if (prevLocRef.current !== currentLoc) {
      prevLocRef.current = currentLoc;
      setNavLoading(true);
      window.scrollTo(0, 0);
      const timer = setTimeout(() => {
        setNavLoading(false);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search]);

  const handleNavClick = (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    const currentFull = location.pathname + location.search;
    const isSame = (
      href === currentFull ||
      (currentFull === '/admin' && href === '/admin?tab=dashboard') ||
      (currentFull === '/admin?tab=dashboard' && href === '/admin') ||
      (currentFull === '/checker' && href === '/checker?tab=dashboard') ||
      (currentFull === '/checker?tab=dashboard' && href === '/checker') ||
      (currentFull === '/maker' && href === '/maker?tab=dashboard') ||
      (currentFull === '/maker?tab=dashboard' && href === '/maker')
    );

    if (isSame) {
      setNavLoading(true);
      window.scrollTo(0, 0);
      setTimeout(() => {
        setNavLoading(false);
      }, 320);
      window.dispatchEvent(new CustomEvent('app:reload-data'));
    }
  };

  const queryParams = new URLSearchParams(location.search);

  const tabParam = queryParams.get('tab');

  const currentTab = tabParam || 'dashboard';



  // Breadcrumb determination

  let breadcrumbTitle = 'Dashboard';

  if (isAdmin) {

    if (location.pathname.includes('/employees/')) breadcrumbTitle = 'Employee Details';

    else if (currentTab === 'employees' || location.pathname.includes('/users')) breadcrumbTitle = 'Employees';

    else if (currentTab === 'departments') breadcrumbTitle = 'Departments';

    else if (currentTab === 'categories' || currentTab === 'expense-categories') breadcrumbTitle = 'Expense Categories';
    else if (currentTab === 'vendors' || currentTab === 'vendors-list') breadcrumbTitle = 'Vendors List';

    else if (currentTab === 'expenses') breadcrumbTitle = 'Expenses';
    else if (currentTab === 'checker-expenses' || currentTab === 'checker_expenses') breadcrumbTitle = 'Checker Expenses';

    else if (currentTab === 'allocations' || currentTab === 'vouchers') breadcrumbTitle = 'Allocated Funds';

    else if (currentTab === 'requests') breadcrumbTitle = 'Fund Requests';
    else if (currentTab === 'history') breadcrumbTitle = 'History';

    else if (currentTab === 'audit') breadcrumbTitle = 'Audit Trail';

    else breadcrumbTitle = 'Dashboard';

  } else if (isChecker) {

    if (currentTab === 'employees') breadcrumbTitle = 'Employees';

    else if (currentTab === 'expenses') breadcrumbTitle = 'Verify Expenses';

    else if (currentTab === 'my-expenses' || currentTab === 'my_expenses') breadcrumbTitle = 'My Expenses';

    else if (currentTab === 'notifications') breadcrumbTitle = 'Notifications';

    else if (currentTab === 'requests') breadcrumbTitle = 'Fund Requests';

    else if (currentTab === 'history') breadcrumbTitle = 'History';

    else breadcrumbTitle = 'Dashboard';

  } else if (isMaker) {

    if (currentTab === 'submit') breadcrumbTitle = 'Submit Expense';

    else if (currentTab === 'expenses') breadcrumbTitle = 'My Expenses';

    else if (currentTab === 'notifications') breadcrumbTitle = 'Notifications';

    else if (currentTab === 'funds' || currentTab === 'fund_requests') breadcrumbTitle = 'Additional Fund Requests';
    else if (currentTab === 'history') breadcrumbTitle = 'History';

    else breadcrumbTitle = 'Dashboard';

  } else if (location.pathname === '/profile') {

    breadcrumbTitle = 'Profile & Account';

  }



  useEffect(() => {

    let roleTitle = 'Petty Expense';

    if (isAdmin) roleTitle = 'Admin - Petty Expense';

    else if (isMaker) roleTitle = 'Maker - Petty Expense';

    else if (isChecker) roleTitle = 'Checker - Petty Expense';

    document.title = roleTitle;

  }, [isAdmin, isMaker, isChecker, location.pathname]);



  return (

    <div className="app-container">

      {/* Fixed Sidebar */}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

        {/* Sidebar Header */}

        <div className="sidebar-header">

          <div className="sidebar-branding">

            <div style={{

              width: '40px',

              height: '40px',

              borderRadius: '10px',

              background: '#ffffff',

              border: '1px solid #e2e8f0',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              overflow: 'hidden',

              flexShrink: 0,

              padding: '2px',

              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'

            }}>

              <img src="/logo.png" alt="Petty Expenses Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

            </div>

            {!collapsed && (

              <div style={{ overflow: 'hidden' }}>

                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>

                  Petty Expenses

                </div>

                <span className="sidebar-role-badge">

                  {user?.role || 'PORTAL'}

                </span>

              </div>

            )}

          </div>

          <button

            onClick={toggleSidebar}

            className="sidebar-collapse-btn"

            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}

          >

            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}

          </button>

        </div>



        {/* Sidebar Navigation */}

        <nav className="sidebar-nav" onClick={handleNavClick}>

          {/* ADMIN MENU */}

          {isAdmin && (

            <>

              <Link 

                to="/admin" 

                className={`sidebar-link ${location.pathname === '/admin' && (!tabParam || tabParam === 'dashboard') ? 'active' : ''}`}

                title={collapsed ? 'Dashboard' : ''}

              >

                <LayoutDashboard size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Dashboard</span>}

              </Link>



              <Link 

                to="/admin?tab=employees" 

                className={`sidebar-link ${location.pathname.startsWith('/admin/employees') || location.pathname.includes('/users') || (location.pathname === '/admin' && tabParam === 'employees') ? 'active' : ''}`}

                title={collapsed ? 'Employees' : ''}

              >

                <Users size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Employees</span>}

              </Link>

              <Link 

                to="/admin?tab=departments" 

                className={`sidebar-link ${(location.pathname === '/admin' && tabParam === 'departments') || location.pathname.startsWith('/admin/departments') ? 'active' : ''}`}

                title={collapsed ? 'Departments' : ''}

              >

                <Building size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Departments</span>}

              </Link>

              <Link 

                to="/admin?tab=categories" 

                className={`sidebar-link ${(location.pathname === '/admin' && (tabParam === 'categories' || tabParam === 'expense-categories')) || location.pathname.startsWith('/admin/categories') ? 'active' : ''}`}

                title={collapsed ? 'Expense Categories' : ''}

              >

                <Tags size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Expense Categories</span>}

              </Link>

              <Link 

                to="/admin?tab=vendors" 

                className={`sidebar-link ${(location.pathname === '/admin' && (tabParam === 'vendors' || tabParam === 'vendors-list')) || location.pathname.startsWith('/admin/vendors') ? 'active' : ''}`}

                title={collapsed ? 'Vendors List' : ''}

              >

                <Store size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Vendors List</span>}

              </Link>





              <Link 

                to="/admin?tab=expenses" 

                className={`sidebar-link ${location.pathname === '/admin' && tabParam === 'expenses' ? 'active' : ''}`}

                title={collapsed ? 'Expenses' : ''}

              >

                <ReceiptIndianRupee size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Expenses</span>}

              </Link>

              <Link 
                to="/admin?tab=checker-expenses" 
                className={`sidebar-link ${(location.pathname === '/admin' && (tabParam === 'checker-expenses' || tabParam === 'checker_expenses')) || location.pathname.startsWith('/admin/checker-expenses') ? 'active' : ''}`}
                title={collapsed ? 'Checker Expenses' : ''}
              >
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span>Checker Expenses</span>}
              </Link>



              <Link 

                to="/admin?tab=allocations" 

                className={`sidebar-link ${(location.pathname === '/admin' && (tabParam === 'allocations' || tabParam === 'vouchers')) || location.pathname.startsWith('/admin/allocations') || location.pathname.startsWith('/admin/vouchers') ? 'active' : ''}`}

                title={collapsed ? 'Allocated Funds' : ''}

              >

                <Wallet size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Allocated Funds</span>}

              </Link>



              <Link 

                to="/admin?tab=requests" 

                className={`sidebar-link ${(location.pathname === '/admin' && tabParam === 'requests') || location.pathname.startsWith('/admin/requests') ? 'active' : ''}`}

                title={collapsed ? 'Fund Requests' : ''}

              >

                <Clock size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Fund Requests</span>}

              </Link>



              <Link 

                to="/admin?tab=audit" 

                className={`sidebar-link ${(location.pathname === '/admin' && tabParam === 'audit') || location.pathname.startsWith('/admin/audit') ? 'active' : ''}`}

                title={collapsed ? 'Audit Trail' : ''}

              >

                <History size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Audit Trail</span>}

              </Link>

            </>

          )}



          {/* MAKER MENU */}

          {isMaker && (

            <>

              <Link 

                to="/maker"

                className={`sidebar-link ${location.pathname === '/maker' && (!tabParam || tabParam === 'dashboard') ? 'active' : ''}`}

                title={collapsed ? 'Dashboard' : ''}

              >

                <LayoutDashboard size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Dashboard</span>}

              </Link>



              <Link 

                to="/maker?tab=expenses" 

                className={`sidebar-link ${location.pathname === '/maker' && tabParam === 'expenses' ? 'active' : ''}`}

                title={collapsed ? 'My Expenses' : ''}

              >

                <ReceiptIndianRupee size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>My Expenses</span>}

              </Link>



              <Link 

                to="/maker?tab=funds" 

                className={`sidebar-link ${location.pathname === '/maker' && (tabParam === 'funds' || tabParam === 'fund_requests') ? 'active' : ''}`}

                title={collapsed ? 'Additional Funds' : ''}

              >

                <Wallet size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Additional Funds</span>}

              </Link>



              <Link 

                to="/maker?tab=notifications" 

                className={`sidebar-link ${location.pathname === '/maker' && tabParam === 'notifications' ? 'active' : ''}`}

                title={collapsed ? 'Notifications' : ''}

              >

                <Bell size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Notifications</span>}

              </Link>

              <Link 
                to="/maker?tab=history" 
                className={`sidebar-link ${location.pathname === '/maker' && tabParam === 'history' ? 'active' : ''}`}
                title={collapsed ? 'History' : ''}
              >
                <History size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span>History</span>}
              </Link>

            </>

          )}



          {/* CHECKER MENU */}

          {isChecker && (

            <>

              <Link 

                to="/checker" 

                className={`sidebar-link ${location.pathname === '/checker' && (!tabParam || tabParam === 'dashboard') ? 'active' : ''}`}

                title={collapsed ? 'Dashboard' : ''}

              >

                <LayoutDashboard size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Dashboard</span>}

              </Link>



              <Link 

                to="/checker?tab=expenses" 

                className={`sidebar-link ${location.pathname === '/checker' && tabParam === 'expenses' ? 'active' : ''}`}

                title={collapsed ? 'Verify Expenses' : ''}

              >

                <ShieldCheck size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Verify Expenses</span>}

              </Link>



              <Link 

                to="/checker?tab=my-expenses" 

                className={`sidebar-link ${location.pathname === '/checker' && (tabParam === 'my-expenses' || tabParam === 'my_expenses') ? 'active' : ''}`}

                title={collapsed ? 'My Expenses' : ''}

              >

                <ReceiptIndianRupee size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>My Expenses</span>}

              </Link>



              <Link 

                to="/checker?tab=requests" 

                className={`sidebar-link ${location.pathname === '/checker' && tabParam === 'requests' ? 'active' : ''}`}

                title={collapsed ? 'Fund Requests' : ''}

              >

                <Clock size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Fund Requests</span>}

              </Link>



              <Link 

                to="/checker?tab=employees" 

                className={`sidebar-link ${(location.pathname === '/checker' && tabParam === 'employees') || location.pathname.startsWith('/checker/employees') ? 'active' : ''}`}

                title={collapsed ? 'Employees' : ''}

              >

                <Users size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Employees</span>}

              </Link>



              <Link 

                to="/checker?tab=notifications" 

                className={`sidebar-link ${location.pathname === '/checker' && tabParam === 'notifications' ? 'active' : ''}`}

                title={collapsed ? 'Notifications' : ''}

              >

                <Bell size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Notifications</span>}

              </Link>



              <Link 

                to="/checker?tab=history" 

                className={`sidebar-link ${location.pathname === '/checker' && tabParam === 'history' ? 'active' : ''}`}

                title={collapsed ? 'History' : ''}

              >

                <History size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>History</span>}

              </Link>

            </>

          )}

        </nav>



        {/* Sidebar Footer with Red Sign Out Button */}

        <div className="sidebar-footer">

          {!collapsed && (

            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0 0.25rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>

              Logged in as:<br/>

              <strong style={{ color: '#0f172a' }}>{user?.email}</strong>

            </div>

          )}

          <button

            onClick={logout}

            style={{

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              gap: '6px',

              width: '100%',

              padding: collapsed ? '8px 0' : '8px 12px',

              marginTop: '4px',

              background: '#dc2626',

              color: '#ffffff',

              border: 'none',

              borderRadius: '6px',

              fontSize: '0.825rem',

              fontWeight: 600,

              cursor: 'pointer',

              transition: 'background 0.15s ease'

            }}

            title="Sign out"

            onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}

            onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}

          >

            <LogOut size={16} />

            {!collapsed && <span>Sign out</span>}

          </button>

        </div>

      </aside>



      {/* Main Content Area */}

      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Responsive Header */}

        <header className="topbar">

          {/* Active Tab Title on Left */}

          <div style={{ display: 'flex', alignItems: 'center', margin: 0 }}>

            <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>

              {breadcrumbTitle}

            </span>

          </div>



          {/* Right Controls: Notification Bell + User Dropdown */}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            {/* Notification Bell Dropdown (All Roles) */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(prev => !prev);
                  if (!notifOpen) fetchNotifications();
                }}
                style={{
                  background: notifOpen ? '#f1f5f9' : 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '7px',
                  color: notifOpen ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  if (!notifOpen) {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }
                }}
                title="Notifications"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid #ffffff'
                  }} />
                )}
              </button>

              {/* Notification Popover Window (Matches reference screenshot) */}
              {notifOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '380px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}>
                    Notifications
                  </div>

                  {/* Scrollable list: exactly up to 20 notifications */}
                  <div style={{
                    maxHeight: '380px',
                    overflowY: 'auto'
                  }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                        <Bell size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>No notifications</div>
                        <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: '2px' }}>You're all caught up!</div>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((notif, idx) => (
                        <div
                          key={notif.id || idx}
                          onClick={() => {
                            setNotifOpen(false);
                            if (notif.link) navigate(notif.link);
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: idx === Math.min(notifications.length, 20) - 1 ? 'none' : '1px solid #f1f5f9',
                            cursor: notif.link ? 'pointer' : 'default',
                            transition: 'background-color 0.15s',
                            backgroundColor: '#ffffff'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                              {notif.title}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                              {notif.time_ago || ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                            {notif.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer "View all notifications" */}
                  <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #f1f5f9',
                    textAlign: 'center',
                    backgroundColor: '#ffffff'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        if (isMaker) navigate('/maker?tab=notifications');
                        else if (isChecker) navigate('/checker?tab=notifications');
                        else navigate('/admin?tab=audit');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 600,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>



            {/* User Menu Dropdown */}

            <div style={{ position: 'relative' }} ref={dropdownRef}>

              <button 

                className="user-menu-btn"

                onClick={() => setDropdownOpen(!dropdownOpen)}

              >

                <div className="avatar-circle" style={{ overflow: 'hidden' }}>

                  {user?.photo_url ? (

                    <img src={user.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                  ) : (

                    initial

                  )}

                </div>

                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>

                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>

                    {user?.full_name}

                  </span>

                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>

                    {user?.employee_id || user?.role}

                  </span>

                </div>

                <ChevronDown size={14} color="#64748b" />

              </button>



              {dropdownOpen && (

                <div 

                  style={{

                    position: 'absolute',

                    right: 0,

                    top: '110%',

                    background: '#ffffff',

                    border: '1px solid #e2e8f0',

                    borderRadius: '8px',

                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',

                    minWidth: '200px',

                    zIndex: 50,

                    padding: '6px'

                  }}

                >

                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>

                    {user?.email}

                  </div>



                  {/* 1. Profile Button */}

                  <button

                    onClick={() => {

                      setDropdownOpen(false);

                      navigate('/profile');

                    }}

                    style={{

                      display: 'flex',

                      alignItems: 'center',

                      gap: '8px',

                      width: '100%',

                      padding: '8px 10px',

                      background: 'none',

                      border: 'none',

                      fontSize: '0.85rem',

                      color: '#334155',

                      cursor: 'pointer',

                      borderRadius: '4px',

                      textAlign: 'left'

                    }}

                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}

                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}

                  >

                    <UserIcon size={16} color="#64748b" />

                    <span>Profile</span>

                  </button>



                  {/* 2. Change Password Button */}

                  <button

                    onClick={() => {

                      setDropdownOpen(false);

                      openPasswordModal();

                    }}

                    style={{

                      display: 'flex',

                      alignItems: 'center',

                      gap: '8px',

                      width: '100%',

                      padding: '8px 10px',

                      background: 'none',

                      border: 'none',

                      fontSize: '0.85rem',

                      color: '#334155',

                      cursor: 'pointer',

                      borderRadius: '4px',

                      textAlign: 'left'

                    }}

                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}

                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}

                  >

                    <KeyRound size={16} color="#64748b" />

                    <span>Change Password</span>

                  </button>



                  {/* 3. Sign out Button */}

                  <button

                    onClick={() => {

                      setDropdownOpen(false);

                      logout();

                    }}

                    style={{

                      display: 'flex',

                      alignItems: 'center',

                      gap: '8px',

                      width: '100%',

                      padding: '8px 10px',

                      background: 'none',

                      border: 'none',

                      fontSize: '0.85rem',

                      color: '#ef4444',

                      cursor: 'pointer',

                      borderRadius: '4px',

                      textAlign: 'left'

                    }}

                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}

                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}

                  >

                    <LogOut size={16} />

                    <span>Sign out</span>

                  </button>

                </div>

              )}

            </div>

          </div>

        </header>



        {/* View outlet */}
        {navLoading ? (
          <div className="tab-loading-viewport">
            <GoogleSpinner size={50} variant="google" strokeWidth={3.8} />
          </div>
        ) : (
          <div key={`${location.pathname}${location.search}`} className="page-transition-wrapper">
            <Outlet />
          </div>
        )}

      </div>



      {/* Global OTP Password Modal */}

      <ChangePasswordModal />

    </div>

  );

}

