import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import api from '../api';
import { LoadingScreen } from '../components/GoogleSpinner';
import { 
  Camera, 
  Trash2, 
  User, 
  Mail, 
  BadgeCheck, 
  Building, 
  Briefcase, 
  Check, 
  AlertCircle,
  Save,
  Shield,
  ArrowLeft
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { confirm } = useConfirm();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fileInputRef = useRef(null);

  const initial = user?.full_name ? user.full_name[0].toUpperCase() : 'U';

  const showNotification = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Handle Photo Upload / Change (Binary base64 format)
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Image size should not exceed 5MB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const res = await api.patch('/auth/profile/', { photo_base64: base64Data });
        updateUser(res.data);
        showNotification('success', 'Profile photo updated successfully!');
      } catch (err) {
        showNotification('error', err.response?.data?.detail || 'Failed to upload photo.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setUploading(false);
      showNotification('error', 'Failed to read image file as binary.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Photo Removal
  const handleRemovePhoto = async () => {
    const ok = await confirm({
      title: 'Remove Profile Photo',
      message: 'Are you sure you want to remove your profile photo? Your avatar will revert to your name initials.',
      confirmText: 'Remove Photo',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    setUploading(true);
    try {
      const res = await api.patch('/auth/profile/', { remove_photo: 'true' });
      updateUser(res.data);
      showNotification('success', 'Profile photo removed.');
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to remove photo.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Profile Details Save
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showNotification('error', 'Full Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch('/auth/profile/', {
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      updateUser(res.data);
      showNotification('success', 'Profile information updated successfully!');
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <LoadingScreen fullPage />;
  }

  return (
    <div className="page-body">
      {(uploading || saving) && <LoadingScreen fullPage />}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account information and profile photo</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '0.825rem',
            fontWeight: 600,
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          title="Back to previous page"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      {message.text && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        maxWidth: '800px'
      }}>
        {/* Photo Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap'
        }}>
          {/* Avatar display */}
          <div style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            {user?.photo_url ? (
              <img 
                src={user.photo_url} 
                alt={user?.full_name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff' }}>
                {initial}
              </span>
            )}
          </div>

          {/* Photo Actions */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Profile Photo
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
              Upload JPG, PNG or WEBP (Max 5MB)
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn btn-primary btn-sm"
              >
                <Camera size={14} />
                <span>{user?.photo_url ? 'Change Photo' : 'Add Photo'}</span>
              </button>

              {user?.photo_url && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Information Form */}
        <form onSubmit={handleSaveDetails} style={{ marginTop: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Employee ID */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BadgeCheck size={16} color="#2563eb" />
                  Employee ID (Permanent)
                </span>
              </label>
              <input
                type="text"
                value={user?.employee_id || 'EMP----'}
                disabled
                className="form-input"
                style={{ background: '#f8fafc', fontWeight: 700, color: '#2563eb' }}
              />
            </div>

            {/* Account Role */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} color="#64748b" />
                  System Role
                </span>
              </label>
              <input
                type="text"
                value={
                  user?.role === 'ADMIN' ? 'Administrator (Full Decision & System Authority)' :
                  user?.role === 'MAKER' ? 'Maker (Petty Cash Custodian / Preparation)' :
                  user?.role === 'CHECKER' ? 'Checker (Expense Verification Reviewer)' :
                  user?.role
                }
                disabled
                className="form-input"
                style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}
              />
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="#64748b" />
                  Full Name *
                </span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} color="#64748b" />
                  Email Address (Username)
                </span>
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="form-input"
                style={{ background: '#f8fafc', color: '#64748b' }}
              />
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} color="#64748b" />
                  Department
                </span>
              </label>
              <input
                type="text"
                value={user?.department || '—'}
                disabled
                className="form-input"
                style={{ background: '#f8fafc', color: '#64748b' }}
              />
            </div>

            {/* Designation */}
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={16} color="#64748b" />
                  Designation
                </span>
              </label>
              <input
                type="text"
                value={user?.designation || '—'}
                disabled
                className="form-input"
                style={{ background: '#f8fafc', color: '#64748b' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ minWidth: '140px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

