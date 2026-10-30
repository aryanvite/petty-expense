import { LoadingScreen } from '../components/GoogleSpinner';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Mail,
  X,
  FileText,
  ClipboardCheck,
  ShieldCheck
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('petty_expense_remember_email') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('petty_expense_remember') === 'true';
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResponse, setForgotResponse] = useState(null);
  const [forgotError, setForgotError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotEmail(email.trim());
    setForgotResponse(null);
    setForgotError('');
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await api.post('/auth/forgot-password/', { email: forgotEmail.trim() });
      setForgotResponse(res.data);
    } catch (err) {
      setForgotError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Unable to process password reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setBusy(true);

    try {
      const user = await login(email.trim(), password, rememberMe);

      // Handle Remember Me persistence
      if (rememberMe) {
        localStorage.setItem('petty_expense_remember', 'true');
        localStorage.setItem('petty_expense_remember_email', email.trim());
      } else {
        localStorage.removeItem('petty_expense_remember');
        localStorage.removeItem('petty_expense_remember_email');
      }

      const roleRedirectMap = {
        'ADMIN': '/admin',
        'SUPER_ADMIN': '/admin',
        'MAKER': '/maker',
        'CHECKER': '/checker',
      };
      navigate(roleRedirectMap[user.role] || '/');
    } catch (err) {
      const msg = err.response?.data?.detail ||
                  err.response?.data?.non_field_errors?.[0] ||
                  'Invalid username, email or password. Please verify your credentials.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {busy && <LoadingScreen fullPage />}
    <div className="login-page-container">
      {/* Decorative Background Radial Orbs matching reference image */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />

      {/* Desk plant / notebook scene in bottom-left */}
      <img
        src="/desk-plant.png"
        alt="Desk decor"
        className="login-desk-accent"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />

      {/* Main Content Layout Container */}
      <div className="login-content-wrapper">
        {/* LEFT COLUMN: Branding, Hero Headline & Key Capabilities */}
        <div className="login-left-section">
          {/* Logo & Brand Header */}
          <div className="login-brand-header">
            <div className="login-brand-logo-wrap">
              <img src="/logo.png" alt="Petty Expenses Logo" className="login-brand-logo-img" />
            </div>
            <div className="login-brand-text">
              <div className="login-brand-title">PETTY<br />EXPENSES</div>
              <div className="login-brand-subtitle">Petty Cash Expense Management System</div>
            </div>
          </div>

          {/* Main Hero Headline */}
          <h1 className="login-main-headline">
            Smarter Expense<br />
            Management for a<br />
            <span className="login-headline-highlight">Better Tomorrow</span>
          </h1>

          {/* Supporting Pitch */}
          <p className="login-main-description">
            Control petty cash, track expenses, and<br />
            keep your business running smoothly.
          </p>

          {/* 3 Core Feature Badges */}
          <div className="login-features-row">
            <div className="login-feature-item">
              <div className="login-feature-icon-circle">
                <FileText size={20} color="#0265d2" />
              </div>
              <div className="login-feature-label">
                Track<br />Expenses
              </div>
            </div>

            <div className="login-feature-divider" />

            <div className="login-feature-item">
              <div className="login-feature-icon-circle">
                <ClipboardCheck size={20} color="#0265d2" />
              </div>
              <div className="login-feature-label">
                Manage<br />Approvals
              </div>
            </div>

            <div className="login-feature-divider" />

            <div className="login-feature-item">
              <div className="login-feature-icon-circle">
                <ShieldCheck size={20} color="#0265d2" />
              </div>
              <div className="login-feature-label">
                Maintain<br />Balance
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Elevated Crisp White Sign In Card */}
        <div className="login-right-section">
          <div className="login-card">
            {/* Card Header */}
            <div className="login-card-header">
              <h2 className="login-card-title">Sign In</h2>
              <p className="login-card-subtitle">Enter your credentials to continue</p>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="login-error-banner">
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Username or Email Input */}
              <div className="login-field-group">
                <label className="login-field-label">Username or Email</label>
                <div className="login-input-wrapper">
                  <User size={18} className="login-input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your username or email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    className="login-input"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input with Eye Visibility Toggle */}
              <div className="login-field-group">
                <label className="login-field-label">Password</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    required
                    className="login-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-toggle-pw"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Options Row: Remember Me & Forgot Password */}
              <div className="login-options-row">
                <label className="login-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-remember-checkbox"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="login-forgot-link"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={busy}
                className="login-submit-btn"
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Security Badge */}
            <div className="login-card-footer">
              <Lock size={13} />
              <span>Authorized access only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px',
              borderBottom: '1px solid #f1f5f9',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0265d2'
                }}>
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Reset Password
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Enter registered email address
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px' }}>
              {forgotResponse ? (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '16px'
                  }}>
                    <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: 600 }}>
                      {forgotResponse.message || forgotResponse.detail || 'If email matches, link will be sent'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{
                        padding: '9px 18px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  {forgotError && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      marginBottom: '14px'
                    }}>
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '6px'
                    }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. employee@company.com"
                      required
                      className="form-input"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '20px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{
                        padding: '9px 16px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        padding: '9px 20px',
                        background: '#0265d2',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: forgotLoading ? 0.7 : 1
                      }}
                    >
                      {forgotLoading && <Loader2 size={15} className="animate-spin" />}
                      <span>{forgotLoading ? 'Sending...' : 'Send Link'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
