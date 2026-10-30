import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import SearchableDropdown from './SearchableDropdown';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ReceiptIndianRupee,
  Calendar,
  Building,
  BookmarkCheck,
  Check
} from 'lucide-react';

/**
 * SubmitExpenseModal
 * A unified modal for Maker and Checker roles to submit petty cash expense claims.
 * 
 * Key Features:
 * 1. Future dates blocked (HTML max attribute & JS validation).
 * 2. Disabled mousewheel number scroll to prevent accidental value alterations.
 * 3. Searchable Category selector powered by SearchableDropdown.
 * 4. Compulsory Supporting Document upload with preview and removal.
 * 5. "Save vendor name" tick item with auto-suggested saved vendors.
 * 6. Responsive, theme-matching modern popup modal.
 */
export default function SubmitExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  currentUser = null
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [saveVendor, setSaveVendor] = useState(true);
  const [description, setDescription] = useState('');
  const [docFile, setDocFile] = useState(null);

  // Metadata & Options
  const [categories, setCategories] = useState([]);
  const [savedVendors, setSavedVendors] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);

  const fileInputRef = useRef(null);
  const vendorInputWrapperRef = useRef(null);

  // Load categories and saved vendors when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form
      setExpenseDate(todayStr);
      setAmount('');
      setCategory('');
      setPayee('');
      setSaveVendor(true);
      setDescription('');
      setDocFile(null);
      setFieldErrors({});
      setServerError('');

      // Fetch categories & vendors
      fetchCategoriesAndVendors();
    }
  }, [isOpen]);

  // Outside click handler for vendor suggestions
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (vendorInputWrapperRef.current && !vendorInputWrapperRef.current.contains(e.target)) {
        setShowVendorSuggestions(false);
      }
    };
    if (showVendorSuggestions) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showVendorSuggestions]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  const fetchCategoriesAndVendors = async () => {
    setLoadingOptions(true);
    try {
      const [catRes, venRes] = await Promise.all([
        api.get('/categories/').catch(() => api.get('/expenses/categories/').catch(() => ({ data: [] }))),
        api.get('/vendors/').catch(() => api.get('/expenses/vendors/').catch(() => ({ data: [] })))
      ]);

      const catList = Array.isArray(catRes.data) ? catRes.data : [];
      setCategories(catList);
      if (catList.length > 0 && !category) {
        // Default to first active category
        setCategory(catList[0].name);
      }

      const venList = Array.isArray(venRes.data) ? venRes.data : [];
      setSavedVendors(venList);
    } catch (err) {
      console.error('Failed to load modal options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  if (!isOpen) return null;

  // Filtered vendor suggestions based on payee input
  const filteredVendors = (savedVendors || [])
    .filter(v => {
      const name = typeof v === 'string' ? v : v.name;
      return name && (!payee.trim() || name.toLowerCase().includes(payee.trim().toLowerCase()));
    })
    .slice(0, 8);

  const validate = () => {
    const errors = {};
    if (!expenseDate) {
      errors.expenseDate = 'Expense date is required.';
    } else if (expenseDate > todayStr) {
      errors.expenseDate = 'Future dates cannot be selected for expense claims.';
    }

    const numAmount = parseInt(amount, 10);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than ₹0.';
    }

    if (!category) {
      errors.category = 'Please select an expense category.';
    }

    if (!payee.trim()) {
      errors.payee = 'Payee / Vendor name is required.';
    }

    if (!description.trim()) {
      errors.description = 'Expense description / justification is required.';
    }

    if (!docFile) {
      errors.docFile = 'Supporting document (receipt, invoice or bill) is mandatory.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError('');

    try {
      const formData = new FormData();
      formData.append('expense_date', expenseDate);
      formData.append('amount', parseInt(amount, 10));
      formData.append('category', category);
      formData.append('payee', payee.trim());
      formData.append('description', description.trim());
      formData.append('supporting_document', docFile);
      formData.append('save_vendor', saveVendor ? 'true' : 'false');

      const res = await api.post('/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Submit expense error:', err);
      const respData = err.response?.data;
      if (respData) {
        if (typeof respData === 'string') {
          setServerError(respData);
        } else if (respData.detail) {
          setServerError(respData.detail);
        } else {
          // Field-level errors from DRF
          const newFieldErrors = {};
          for (const key of Object.keys(respData)) {
            const val = respData[key];
            newFieldErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
          }
          setFieldErrors(newFieldErrors);
          setServerError('Please review highlighted form errors.');
        }
      } else {
        setServerError('Network error while submitting expense claim. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 12MB)
      if (file.size > 12 * 1024 * 1024) {
        setFieldErrors(prev => ({
          ...prev,
          docFile: 'File exceeds 12 MB limit. Please select a smaller receipt file.'
        }));
        return;
      }
      setDocFile(file);
      if (fieldErrors.docFile) {
        setFieldErrors(prev => ({ ...prev, docFile: null }));
      }
    }
  };

  return createPortal(
    <div 
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div 
        className="modal-card"
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ReceiptIndianRupee size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Submit Petty Cash Expense
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Enter claim details and attach mandatory supporting voucher/bill.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
            title="Close popup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Server Error Alert */}
          {serverError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              color: '#991b1b',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{serverError}</div>
            </div>
          )}

          {/* Grid Row 1: Date & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Expense Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Expense Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  max={todayStr}
                  value={expenseDate}
                  onChange={(e) => {
                    setExpenseDate(e.target.value);
                    if (fieldErrors.expenseDate) setFieldErrors(prev => ({ ...prev, expenseDate: null }));
                  }}
                  className="form-input"
                  style={{
                    width: '100%',
                    borderColor: fieldErrors.expenseDate ? '#ef4444' : '#cbd5e1'
                  }}
                />
              </div>
              {fieldErrors.expenseDate ? (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {fieldErrors.expenseDate}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.725rem', marginTop: '4px' }}>
                  Future dates cannot be selected.
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Amount (₹ Whole INR) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  color: '#64748b',
                  fontSize: '0.9rem',
                  pointerEvents: 'none'
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 1500"
                  value={amount}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: null }));
                  }}
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '1.85rem',
                    borderColor: fieldErrors.amount ? '#ef4444' : '#cbd5e1'
                  }}
                />
              </div>
              {fieldErrors.amount && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {fieldErrors.amount}
                </div>
              )}
            </div>
          </div>

          {/* Grid Row 2: Category & Vendor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Category (Searchable Dropdown) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Expense Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <SearchableDropdown
                value={category}
                onChange={(val) => {
                  setCategory(val);
                  if (fieldErrors.category) setFieldErrors(prev => ({ ...prev, category: null }));
                }}
                options={[
                  ...categories.map(c => ({ value: c.name, label: c.name })),
                  ...(!categories.some(c => c.name === 'Miscellaneous') ? [{ value: 'Miscellaneous', label: 'Miscellaneous' }] : [])
                ]}
                placeholder="Select or search category..."
                searchPlaceholder="Search category..."
                allowClear={false}
                size="md"
                style={{ width: '100%' }}
              />
              {fieldErrors.category && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {fieldErrors.category}
                </div>
              )}
            </div>

            {/* Payee / Vendor with suggestions */}
            <div ref={vendorInputWrapperRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Payee / Vendor / Merchant <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy, HPCL Petrol, Stationery Mart"
                value={payee}
                onFocus={() => setShowVendorSuggestions(true)}
                onChange={(e) => {
                  setPayee(e.target.value);
                  setShowVendorSuggestions(true);
                  if (fieldErrors.payee) setFieldErrors(prev => ({ ...prev, payee: null }));
                }}
                className="form-input"
                style={{
                  width: '100%',
                  borderColor: fieldErrors.payee ? '#ef4444' : '#cbd5e1'
                }}
              />

              {/* Vendor Auto-suggestions popover */}
              {showVendorSuggestions && filteredVendors.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  <div style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    SUGGESTED VENDORS
                  </div>
                  {filteredVendors.map((item, idx) => {
                    const vendorName = typeof item === 'string' ? item : item.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setPayee(vendorName);
                          setShowVendorSuggestions(false);
                          if (fieldErrors.payee) setFieldErrors(prev => ({ ...prev, payee: null }));
                        }}
                        style={{
                          padding: '7px 12px',
                          fontSize: '0.825rem',
                          color: '#1e293b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: idx === filteredVendors.length - 1 ? 'none' : '1px solid #f8fafc'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                      >
                        <span style={{ fontWeight: 500 }}>{vendorName}</span>
                        {item.is_saved && (
                          <span style={{ fontSize: '0.675rem', color: '#2563eb', backgroundColor: '#dbeafe', padding: '1px 6px', borderRadius: '4px' }}>
                            Saved
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {fieldErrors.payee && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {fieldErrors.payee}
                </div>
              )}

              {/* Tick item to save vendor name */}
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '6px',
                cursor: 'pointer',
                fontSize: '0.775rem',
                color: '#475569',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={saveVendor}
                  onChange={(e) => setSaveVendor(e.target.checked)}
                  style={{
                    width: '15px',
                    height: '15px',
                    accentColor: '#2563eb',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                />
                <span>Save vendor name for future claims</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Business Justification / Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Explain the necessity and items purchased for company operations..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: null }));
              }}
              className="form-input"
              style={{
                width: '100%',
                resize: 'vertical',
                borderColor: fieldErrors.description ? '#ef4444' : '#cbd5e1'
              }}
            />
            {fieldErrors.description && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {fieldErrors.description}
              </div>
            )}
          </div>

          {/* Supporting Document Upload (COMPULSORY) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Supporting Document / Receipt / Invoice <span style={{ color: '#ef4444' }}>* (Compulsory)</span>
            </label>

            <div style={{
              border: `2px dashed ${fieldErrors.docFile ? '#ef4444' : '#cbd5e1'}`,
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
              backgroundColor: fieldErrors.docFile ? '#fef2f2' : '#f8fafc',
              transition: 'border-color 0.15s, background-color 0.15s'
            }}>
              {docFile ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
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
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {docFile.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        {(docFile.size / 1024).toFixed(1)} KB • Ready to submit
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Upload bill, invoice, or receipt scan
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', marginBottom: '10px' }}>
                    Supports PNG, JPG, PDF up to 12 MB
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="submit-expense-doc-upload"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="submit-expense-doc-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <Upload size={14} />
                    <span>Choose Receipt File</span>
                  </label>
                </div>
              )}
            </div>

            {fieldErrors.docFile && (
              <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} />
                <span>{fieldErrors.docFile}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
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
            onClick={onClose}
            disabled={submitting}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary"
            style={{
              padding: '8px 22px',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }}></span>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Submit Expense Claim</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
