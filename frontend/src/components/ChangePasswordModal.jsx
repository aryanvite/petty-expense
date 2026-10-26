import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { setTokens } from '../api';
import { Lock, Mail, KeyRound, Check, AlertCircle, X } from 'lucide-react';

export default function ChangePasswordModal() {
  const { user, isPasswordModalOpen, closePasswordModal, updateUser } = useAuth();

  const [step, setStep] = useState('REQUEST_OTP'); // 'REQUEST_OTP' | 'VERIFY_CHANGE'
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!isPasswordModalOpen) return null;

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  const handleRequestOtp = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await api.post('/auth/password/otp/request/', { purpose: 'CHANGE_PASSWORD' });
      setNotice(res.data.detail || 'OTP sent to your mail');
      setStep('VERIFY_CHANGE');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const res = await api.post('/auth/password/change/', {
        otp_code: otpCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data.tokens) {
        setTokens(res.data.tokens);
      }
      if (res.data.user) {
        updateUser(res.data.user);
      }

      alert('Password updated successfully!');
      closePasswordModal();
    } catch (err) {
      const detail = err.response?.data?.detail || 
                     (err.response?.data?.new_password?.[0]) || 
                     'Failed to change password.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="#2563eb" />
            <h3 className="modal-title">Change Password</h3>
          </div>
          {!user?.must_change_password && (
            <button 
              onClick={closePasswordModal} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {user?.must_change_password && (
          <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem', color: '#92400e', display: 'flex', gap: '6px' }}>
            <AlertCircle size={16} />
            <span>You must change your initial temporary password before proceeding.</span>
          </div>
        )}

        {notice && (
          <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem', color: '#1d4ed8' }}>
            {notice}
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        {step === 'REQUEST_OTP' ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem', lineHeight: '1.4' }}>
              For your account security, we will send a 6-digit verification OTP to your registered email (<strong>{user?.email}</strong>).
            </p>
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Mail size={16} />
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">6-Digit Email OTP</label>
              <input
                type="text"
                maxLength="6"
                placeholder="e.g. 123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                className="form-input"
                style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Resend OTP
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="form-input"
              />
              {/* Password strength checklist */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: hasMinLength ? '#10b981' : '#94a3b8' }}>
                  {hasMinLength ? '✓' : '•'} 8+ characters
                </span>
                <span style={{ color: hasUpper ? '#10b981' : '#94a3b8' }}>
                  {hasUpper ? '✓' : '•'} 1 Uppercase (A-Z)
                </span>
                <span style={{ color: hasLower ? '#10b981' : '#94a3b8' }}>
                  {hasLower ? '✓' : '•'} 1 Lowercase (a-z)
                </span>
                <span style={{ color: hasDigit ? '#10b981' : '#94a3b8' }}>
                  {hasDigit ? '✓' : '•'} 1 Number (0-9)
                </span>
                <span style={{ color: hasSpecial ? '#10b981' : '#94a3b8', gridColumn: 'span 2' }}>
                  {hasSpecial ? '✓' : '•'} 1 Special char (!@#$%...)
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem' }}>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !otpCode}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Lock size={16} />
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

