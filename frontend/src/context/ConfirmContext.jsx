import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Trash2,
  UserX,
  UserCheck,
  KeyRound,
  Ban,
  CheckCircle2,
  X,
  AlertCircle,
  Info,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

const ConfirmContext = createContext();

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    subMessage: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary', // 'danger' | 'warning' | 'primary' | 'success' | 'info'
    iconType: null,
    isAlertOnly: false,
    isPrompt: false,
    inputValue: '',
    placeholder: 'Enter response...'
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      subMessage = '',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'primary', // 'primary', 'danger', 'warning', 'success', 'info'
      icon = null,
    } = opts;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title,
        message,
        subMessage,
        confirmText,
        cancelText,
        variant,
        iconType: icon,
        isAlertOnly: false,
        isPrompt: false,
        inputValue: '',
        placeholder: ''
      });
    });
  }, []);

  const alert = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    const {
      title = 'Notice',
      message = '',
      subMessage = '',
      confirmText = 'Understood',
      variant = 'primary',
      icon = null,
    } = opts;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title,
        message,
        subMessage,
        confirmText,
        cancelText: '',
        variant,
        iconType: icon,
        isAlertOnly: true,
        isPrompt: false,
        inputValue: '',
        placeholder: ''
      });
    });
  }, []);

  const prompt = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    const {
      title = 'Input Required',
      message = '',
      subMessage = '',
      defaultValue = '',
      placeholder = 'Enter value...',
      confirmText = 'Submit',
      cancelText = 'Cancel',
      variant = 'primary',
      icon = null,
    } = opts;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title,
        message,
        subMessage,
        confirmText,
        cancelText,
        variant,
        iconType: icon,
        isAlertOnly: false,
        isPrompt: true,
        inputValue: defaultValue || '',
        placeholder: placeholder || 'Enter value...'
      });
    });
  }, []);

  const handleConfirm = () => {
    const isPrompt = dialogState.isPrompt;
    const value = dialogState.inputValue;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(isPrompt ? value : true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    const isPrompt = dialogState.isPrompt;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(isPrompt ? null : false);
      resolverRef.current = null;
    }
  };

  // Keyboard shortcut: Escape cancels, Enter confirms
  useEffect(() => {
    if (!dialogState.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState.isOpen, dialogState.inputValue]);

  // Global window interceptor for native dialogs
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;

    window.alert = (msg) => {
      return alert(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg ?? ''));
    };

    window.confirm = (msg) => {
      return confirm({
        title: 'Confirmation',
        message: typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg ?? ''),
        variant: 'warning',
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      });
    };

    window.prompt = (msg, defaultVal = '') => {
      return prompt({
        title: 'Input Required',
        message: typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg ?? ''),
        defaultValue: defaultVal,
        placeholder: 'Enter response...',
        confirmText: 'Submit',
        cancelText: 'Cancel'
      });
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.prompt = originalPrompt;
    };
  }, [alert, confirm, prompt]);

  // Variant themes matching the UI specifications
  const getTheme = () => {
    switch (dialogState.variant) {
      case 'danger':
        return {
          iconBg: '#fee2e2',
          iconBorder: '#fecaca',
          iconColor: '#dc2626',
          btnBg: '#dc2626',
          btnHover: '#b91c1c',
          btnText: '#ffffff',
          defaultIcon: <Trash2 size={24} />,
        };
      case 'warning':
        return {
          iconBg: '#fff7ed',
          iconBorder: '#fed7aa',
          iconColor: '#ea580c',
          btnBg: '#ea580c',
          btnHover: '#c2410c',
          btnText: '#ffffff',
          defaultIcon: <AlertTriangle size={24} />,
        };
      case 'success':
        return {
          iconBg: '#ecfdf5',
          iconBorder: '#a7f3d0',
          iconColor: '#16a34a',
          btnBg: '#16a34a',
          btnHover: '#15803d',
          btnText: '#ffffff',
          defaultIcon: <CheckCircle2 size={24} />,
        };
      case 'info':
        return {
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          iconColor: '#2563eb',
          btnBg: '#2563eb',
          btnHover: '#1d4ed8',
          btnText: '#ffffff',
          defaultIcon: <Info size={24} />,
        };
      case 'primary':
      default:
        return {
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          iconColor: '#2563eb',
          btnBg: '#2563eb',
          btnHover: '#1d4ed8',
          btnText: '#ffffff',
          defaultIcon: <HelpCircle size={24} />,
        };
    }
  };

  const getCustomIcon = () => {
    switch (dialogState.iconType) {
      case 'trash':
      case 'delete':
        return <Trash2 size={24} />;
      case 'user-x':
      case 'deactivate':
        return <UserX size={24} />;
      case 'user-check':
      case 'reactivate':
        return <UserCheck size={24} />;
      case 'key':
      case 'password':
        return <KeyRound size={24} />;
      case 'ban':
      case 'cancel':
        return <Ban size={24} />;
      case 'alert':
      case 'warning':
        return <AlertTriangle size={24} />;
      case 'shield':
        return <ShieldAlert size={24} />;
      case 'check':
      case 'success':
        return <CheckCircle2 size={24} />;
      case 'info':
        return <Info size={24} />;
      default:
        return getTheme().defaultIcon;
    }
  };

  const theme = getTheme();

  return (
    <ConfirmContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {/* Universal Default Popup Dialog (matches app theme & animations) */}
      {dialogState.isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay-custom"
          style={{
            zIndex: 2000000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '450px',
              width: '100%',
              padding: 0,
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.9)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transformOrigin: 'center center',
            }}
          >
            {/* Header / Body Container */}
            <div style={{ padding: '1.5rem 1.5rem 1.25rem', position: 'relative' }}>
              {/* Close Button */}
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                title="Close"
              >
                <X size={18} />
              </button>

              {/* Styled Icon Badge */}
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: theme.iconBg,
                  border: `1px solid ${theme.iconBorder}`,
                  color: theme.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                {getCustomIcon()}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px 0',
                  lineHeight: '1.3',
                }}
              >
                {dialogState.title}
              </h3>

              {/* Message */}
              <p
                style={{
                  fontSize: '0.88rem',
                  color: '#475569',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                {dialogState.message}
              </p>

              {/* Input for Prompt Dialogs */}
              {dialogState.isPrompt && (
                <div style={{ marginTop: '1rem' }}>
                  <input
                    type="text"
                    autoFocus
                    className="form-input"
                    value={dialogState.inputValue}
                    placeholder={dialogState.placeholder}
                    onChange={(e) => setDialogState(prev => ({ ...prev, inputValue: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.88rem', borderRadius: '8px' }}
                  />
                </div>
              )}

              {/* Sub-Message Callout Box */}
              {dialogState.subMessage && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                    color: '#334155',
                    lineHeight: '1.45',
                  }}
                >
                  {dialogState.subMessage}
                </div>
              )}
            </div>

            {/* Footer Buttons matching UI Theme */}
            <div
              style={{
                padding: '0.9rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              {!dialogState.isAlertOnly && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '7px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {dialogState.cancelText || 'Cancel'}
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                className="btn btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: theme.btnBg,
                  color: theme.btnText,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.btnHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = theme.btnBg)}
              >
                <span>{dialogState.confirmText || 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}
