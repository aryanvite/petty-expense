import React, { useState, useEffect, useRef } from 'react';

import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import ChangePasswordModal from './ChangePasswordModal';

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
  ShieldCheck
} from 'lucide-react';



export default function AppLayout() {

  const { user, logout, openPasswordModal } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const navigate = useNavigate();

  const location = useLocation();



  useEffect(() => {

    function handleClickOutside(event) {

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {

        setDropdownOpen(false);

      }

    }

    if (dropdownOpen) {

      document.addEventListener('mousedown', handleClickOutside);

    }

    return () => {

      document.removeEventListener('mousedown', handleClickOutside);

    };

  }, [dropdownOpen]);



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



  const queryParams = new URLSearchParams(location.search);

  const tabParam = queryParams.get('tab');

  const currentTab = tabParam || 'dashboard';



  // Breadcrumb determination

  let breadcrumbTitle = 'Dashboard';

  if (isAdmin) {

    if (location.pathname.includes('/employees/')) breadcrumbTitle = 'Employee Details';

    else if (currentTab === 'employees' || location.pathname.includes('/users')) breadcrumbTitle = 'Employees';

    else if (currentTab === 'expenses') breadcrumbTitle = 'Expenses';
    else if (currentTab === 'checker-expenses' || currentTab === 'checker_expenses') breadcrumbTitle = 'Checker Expenses';

    else if (currentTab === 'allocations' || currentTab === 'vouchers') breadcrumbTitle = 'Allocated Funds';

    else if (currentTab === 'requests') breadcrumbTitle = 'Fund Requests';

    else if (currentTab === 'audit') breadcrumbTitle = 'Audit Trail';

    else breadcrumbTitle = 'Dashboard';

  } else if (isChecker) {

    if (currentTab === 'employees') breadcrumbTitle = 'Employees';

        else if (currentTab === 'expenses') breadcrumbTitle = 'Expenses';

    else if (currentTab === 'requests') breadcrumbTitle = 'Fund Requests';

    else breadcrumbTitle = 'Dashboard';

  } else if (isMaker) {

    if (currentTab === 'submit') breadcrumbTitle = 'Submit Expense';

    else if (currentTab === 'expenses') breadcrumbTitle = 'My Expenses';

    else if (currentTab === 'notifications') breadcrumbTitle = 'Notifications';

    else if (currentTab === 'funds' || currentTab === 'fund_requests') breadcrumbTitle = 'Additional Fund Requests';

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

        <nav className="sidebar-nav">

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

                to="/maker?tab=submit" 

                className={`sidebar-link ${location.pathname === '/maker' && tabParam === 'submit' ? 'active' : ''}`}

                title={collapsed ? 'Submit Expense' : ''}

              >

                <PlusCircle size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Submit Expense</span>}

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

                <ReceiptIndianRupee size={18} style={{ flexShrink: 0 }} />

                {!collapsed && <span>Verify Expenses</span>}

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

            {/* Notification Bell */}

            {isMaker && (

              <button

                onClick={() => navigate('/maker?tab=notifications')}

                style={{

                  background: 'none',

                  border: '1px solid #e2e8f0',

                  borderRadius: '8px',

                  padding: '7px',

                  color: '#64748b',

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

                  e.currentTarget.style.background = 'none';

                  e.currentTarget.style.borderColor = '#e2e8f0';

                }}

                title="Notifications"

              >

                <Bell size={18} />

              </button>

            )}



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

        <Outlet />

      </div>



      {/* Global OTP Password Modal */}

      <ChangePasswordModal />

    </div>

  );

}

