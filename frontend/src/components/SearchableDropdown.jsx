import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';

export default function SearchableDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  style = {},
  className = '',
  disabled = false,
  allowClear = false,
  size = 'md', // 'sm' | 'md'
  align = 'left', // 'left' | 'right'
  onAddNew = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options into consistent shape: { value, label, code, sublabel }
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: String(opt), label: String(opt), code: '' };
      }
      return {
        value: opt.value ?? opt.name ?? opt.id ?? '',
        label: opt.label ?? opt.name ?? String(opt.value || ''),
        code: opt.code || '',
        sublabel: opt.description || opt.sublabel || '',
        raw: opt
      };
    });
  }, [options]);

  // Selected item object
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) return null;
    return normalizedOptions.find(opt => 
      String(opt.value).toLowerCase() === String(value).toLowerCase() ||
      String(opt.label).toLowerCase() === String(value).toLowerCase()
    ) || (value ? { value, label: String(value) } : null);
  }, [normalizedOptions, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(q) ||
      (opt.code && opt.code.toLowerCase().includes(q)) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    if (onChange) onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange('');
    setSearchQuery('');
  };

  const isSmall = size === 'sm';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style
      }}
      className={`searchable-dropdown-wrapper ${className}`}
    >
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#f8fafc' : '#ffffff',
          borderColor: isOpen ? '#2563eb' : '#cbd5e1',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
          padding: isSmall ? '4px 10px' : '7px 12px',
          minHeight: isSmall ? '34px' : '38px',
          height: isSmall ? '34px' : undefined,
          borderRadius: '6px',
          userSelect: 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
          {selectedOption ? (
            <span style={{ 
              color: '#0f172a', 
              fontWeight: 600, 
              fontSize: isSmall ? '0.825rem' : '0.875rem', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {selectedOption.label}
              {selectedOption.code && (
                <span style={{
                  marginLeft: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0'
                }}>
                  {selectedOption.code}
                </span>
              )}
            </span>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: isSmall ? '0.825rem' : '0.875rem' }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px', flexShrink: 0 }}>
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              title="Clear selection"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={isSmall ? 14 : 15}
            style={{
              color: '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease'
            }}
          />
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: align === 'right' ? 'auto' : 0,
            right: align === 'right' ? 0 : 'auto',
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '320px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeInScale 0.12s ease-out forwards'
          }}
        >
          {/* Search Box Header */}
          <div style={{
            padding: '6px 8px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Search size={14} color="#94a3b8" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0].value);
                }
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.825rem',
                color: '#0f172a'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '2px',
                  display: 'flex'
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '12px 10px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.825rem'
              }}>
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedOption && (
                  String(selectedOption.value).toLowerCase() === String(opt.value).toLowerCase() ||
                  String(selectedOption.label).toLowerCase() === String(opt.label).toLowerCase()
                );

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#1e293b',
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{opt.label}</span>
                        {opt.code && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: isSelected ? '#dbeafe' : '#f1f5f9',
                            color: isSelected ? '#1e40af' : '#475569',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: `1px solid ${isSelected ? '#bfdbfe' : '#e2e8f0'}`
                          }}>
                            {opt.code}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} color="#2563eb" style={{ flexShrink: 0, marginLeft: '8px' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Optional: Add New Action Button */}
          {onAddNew && (
            <div style={{
              borderTop: '1px solid #f1f5f9',
              padding: '6px 8px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px dashed #93c5fd',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} />
                <span>Add New</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
