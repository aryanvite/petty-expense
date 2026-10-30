import React, { useState, useRef, useEffect } from 'react';
import SearchableDropdown from './SearchableDropdown';
import { 
  MoreVertical, 
  ArrowUp, 
  ArrowDown, 
  ChevronsUpDown,
  RotateCcw,
  Check,
  SlidersHorizontal,
  Download,
  Search,
  X
} from 'lucide-react';

/**
 * Evaluates whether a cell value satisfies a filter rule.
 * Supported operators: Contains, Equals, Starts with, Ends with, Is empty, Is not empty
 */
export function matchesFilterRule(cellValue, filter) {
  if (!filter) return true;
  const operator = filter.operator || 'Contains';
  const query = (filter.value || '').trim();
  const cellStr = cellValue == null ? '' : String(cellValue).trim();

  switch (operator) {
    case 'Contains':
      return !query || cellStr.toLowerCase().includes(query.toLowerCase());
    case 'Equals':
      return !query || cellStr.toLowerCase() === query.toLowerCase();
    case 'Starts with':
      return !query || cellStr.toLowerCase().startsWith(query.toLowerCase());
    case 'Ends with':
      return !query || cellStr.toLowerCase().endsWith(query.toLowerCase());
    case 'Is empty':
      return !cellStr || cellStr === '-' || cellStr === '—';
    case 'Is not empty':
      return Boolean(cellStr && cellStr !== '-' && cellStr !== '—');
    default:
      return true;
  }
}

/**
 * Standard default columns for Expense / Receipt tables
 */
export const DEFAULT_TABLE_COLUMNS = [
  { key: 'sno', label: 'SR No.' },
  { key: 'actions', label: 'Actions' },
  { key: 'status', label: 'Status' },
  { key: 'ref', label: 'Expense ID' },
  { key: 'date', label: 'Date' },
  { key: 'maker', label: 'Custodian (Maker)' },
  { key: 'category', label: 'Category' },
  { key: 'payee', label: 'Payee / Merchant' },
  { key: 'desc', label: 'Description' },
  { key: 'amount', label: 'Amount (INR)' }
];

/**
 * Export array of objects to CSV file
 */
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...data.map(row =>
      headers.map(field => {
        const val = row[field] == null ? '' : String(row[field]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Standalone Columns Button (Image 1 reference: "[Columns]" button on table toolbar)
 * Ticking a column shows it; unticking hides it. All ticked by default.
 */
export function TableColumnsButton({
  columns = [],
  hiddenColumns = [],
  onToggleColumn,
  style = {}
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  const effectiveCols = (columns && columns.length > 0) ? columns : DEFAULT_TABLE_COLUMNS;

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-secondary btn-sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '0.825rem',
          fontWeight: 600,
          background: open ? '#f1f5f9' : '#ffffff',
          borderColor: open ? '#94a3b8' : '#cbd5e1',
          color: '#334155'
        }}
        title="Show / Hide table columns"
      >
        <SlidersHorizontal size={14} color="#64748b" />
        <span>Columns</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 120,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
            minWidth: '200px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '8px',
            textAlign: 'left'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px 8px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '4px'
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Manage Columns
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {effectiveCols.map((col) => {
              const isVisible = !hiddenColumns.includes(col.key);
              return (
                <label
                  key={col.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                    color: isVisible ? '#0f172a' : '#94a3b8',
                    fontWeight: isVisible ? 600 : 400,
                    userSelect: 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => {
                      if (onToggleColumn) onToggleColumn(col.key);
                    }}
                    style={{
                      accentColor: '#2563eb',
                      width: '15px',
                      height: '15px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ScrollTableToolbar Component (Image 1 reference)
 * Shows [ Search ] [ N expenses ] [ Columns ] [ Export ] | [ Filter 1 ] [ Filter 2 ]
 * Only displayed when scrolled into table (visible = true), sticky under topbar.
 */
export function ScrollTableToolbar({
  visible = true,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search projects/expenses...',
  count = 0,
  countLabel = 'expenses',
  columns = [],
  hiddenColumns = [],
  onToggleColumn,
  onExport,
  exportLabel = 'Export',
  filters = [],
  style = {}
}) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'sticky',
        top: '64px',
        zIndex: 35,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
        padding: '8px 14px',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        ...style
      }}
    >
      {/* Left side: Search input + Record count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
        {onSearchChange && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '250px' }}>
            <Search
              size={14}
              color="#94a3b8"
              style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '10px',
                height: '34px',
                fontSize: '0.825rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff'
              }}
            />
          </div>
        )}

        <div style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#0f172a' }}>{count}</strong> {countLabel}
        </div>
      </div>

      {/* Right side: Columns + Export + Divider + Filter Dropdowns */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {columns && columns.length > 0 && onToggleColumn && (
          <TableColumnsButton
            columns={columns}
            hiddenColumns={hiddenColumns}
            onToggleColumn={onToggleColumn}
          />
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.825rem',
              fontWeight: 600,
              background: '#ffffff',
              borderColor: '#cbd5e1',
              color: '#334155'
            }}
            title="Export to CSV"
          >
            <Download size={14} color="#64748b" />
            <span>{exportLabel}</span>
          </button>
        )}

        {filters && filters.length > 0 && (
          <div style={{ width: '1px', height: '22px', background: '#cbd5e1', margin: '0 2px' }} />
        )}

        {filters && filters.map((f, idx) => (
          <div key={f.label || idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {f.showLabel !== false && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                {f.label}:
              </span>
            )}
            <SearchableDropdown
              value={f.value}
              onChange={(val) => f.onChange(val)}
              options={f.options}
              size="sm"
              allowClear={false}
              searchPlaceholder={`Search ${f.label || 'filter'}...`}
              style={{ minWidth: '130px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * TableHeadSortMenu Component (Image 2 reference)
 * - By default: Displays up and down arrow type (ChevronsUpDown ⇅) beside the column label.
 * - On Hover: Morphs into three dots (MoreVertical ⋮).
 * - Clicking: Opens a concise popup menu with JUST "Sort ASC" and "Sort DESC" (and "Reset sort" if active).
 */
export default function TableHeadSortMenu({
  label = 'S.NO.',
  columnKey = 'sno',
  sortKey = null,
  sortConfig = null,
  onSort = null,
  onSortAsc,
  onSortDesc,
  onReset,
  currentSort = null, // 'asc' | 'desc' | null
  style = {},
  width = null,
  align = 'left',
  // Backward compatibility props
  allColumns = [],
  hiddenColumns = [],
  onToggleColumn,
  onHideColumn,
  filterConfig = null,
  onFilterChange
}) {
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const rootRef = useRef(null);

  // Active sort detection
  const isThisColumnActive = Boolean(
    (sortConfig && sortConfig.key === columnKey && sortConfig.direction) ||
    currentSort
  );
  const activeSortDir = isThisColumnActive
    ? (currentSort || sortConfig?.direction || null)
    : null;

  const handleApplySort = (dir) => {
    if (onSort) {
      onSort(columnKey, dir);
    } else if (dir === 'asc') {
      if (onSortAsc) onSortAsc(columnKey);
      else if (onSort) onSort(columnKey, 'asc');
    } else if (dir === 'desc') {
      if (onSortDesc) onSortDesc(columnKey);
      else if (onSort) onSort(columnKey, 'desc');
    }
    setOpen(false);
  };

  const handleResetSort = () => {
    if (onReset) onReset();
    else if (onSort) onSort(columnKey, null);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  /**
   * Icon rendering:
   * 1. If menu is open OR hovering: show MoreVertical (3 dots ⋮)
   * 2. Else if active 'asc': show ArrowUp
   * 3. Else if active 'desc': show ArrowDown
   * 4. Else: show ChevronsUpDown (up and down arrow type ⇅ like Image 2)
   */
  const renderSortIcon = () => {
    if (open || isHovered) {
      return (
        <MoreVertical
          size={14}
          color={isThisColumnActive ? '#0284c7' : '#475569'}
          style={{ transition: 'all 0.15s ease' }}
        />
      );
    }
    if (activeSortDir === 'asc') {
      return <ArrowUp size={14} color="#0284c7" strokeWidth={2.4} />;
    }
    if (activeSortDir === 'desc') {
      return <ArrowDown size={14} color="#0284c7" strokeWidth={2.4} />;
    }
    return (
      <ChevronsUpDown
        size={14}
        color="#94a3b8"
        style={{ transition: 'all 0.15s ease' }}
      />
    );
  };

  const effectiveWidth = width || style.width || style.minWidth;
  const effectiveMinWidth = style.minWidth || width || style.width;

  const isFiltered = Boolean(filterConfig && (filterConfig.value !== undefined && filterConfig.value !== null && String(filterConfig.value).trim() !== ''));

  return (
    <th 
      ref={rootRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        position: 'relative', 
        userSelect: 'none',
        whiteSpace: 'nowrap',
        textAlign: align,
        verticalAlign: 'middle',
        cursor: 'pointer',
        boxSizing: 'border-box',
        ...style,
        width: effectiveWidth,
        minWidth: effectiveMinWidth
      }}
      onClick={() => setOpen(!open)}
    >
      <div 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '6px',
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          width: '100%',
          minWidth: effectiveMinWidth ? 'max-content' : undefined,
          verticalAlign: 'middle'
        }}
      >
        <span style={{ fontWeight: isThisColumnActive || isFiltered ? 700 : 600 }}>
          {label}
        </span>

        {isFiltered && (
          <span
            title={`Filtered by: "${filterConfig.value}"`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#0284c7',
              border: '1px solid #bfdbfe'
            }}
          >
            <Search size={10} strokeWidth={2.4} />
          </span>
        )}

        {/* Up-and-down arrow icon morphing into 3-dots on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          style={{
            background: open || isHovered ? '#e2e8f0' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: '3px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: open || isThisColumnActive || isFiltered ? '#0284c7' : '#64748b',
            transition: 'background 0.15s ease',
            lineHeight: 1,
            flexShrink: 0
          }}
          title={isHovered ? "Sort & Search options" : "Column options"}
          aria-label="Column sort and search options"
        >
          {renderSortIcon()}
        </button>
      </div>

      {/* POPUP MENU: SEARCH + SORT ASC + SORT DESC + RESET */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: align === 'right' ? 'auto' : 0,
            right: align === 'right' ? 0 : 'auto',
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
            minWidth: '175px',
            padding: '6px',
            textAlign: 'left',
            fontWeight: 400,
            fontSize: '0.8rem',
            color: '#1e293b'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* SEARCH IN COLUMN */}
          {(onFilterChange || filterConfig !== undefined) && (
            <div style={{ padding: '3px 4px 6px', borderBottom: '1px solid #f1f5f9', marginBottom: '5px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={filterConfig?.value || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (onFilterChange) {
                      onFilterChange(val ? { operator: 'Contains', value: val } : null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    paddingLeft: '26px',
                    paddingRight: filterConfig?.value ? '20px' : '6px',
                    height: '28px',
                    fontSize: '0.78rem',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
                {filterConfig?.value && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onFilterChange) onFilterChange(null);
                    }}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Clear filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SORT ASC */}
          <button
            type="button"
            onClick={() => handleApplySort('asc')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 8px',
              background: activeSortDir === 'asc' ? '#eff6ff' : 'transparent',
              color: activeSortDir === 'asc' ? '#0284c7' : '#334155',
              fontWeight: activeSortDir === 'asc' ? 600 : 500,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textAlign: 'left',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (activeSortDir !== 'asc') e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              if (activeSortDir !== 'asc') e.currentTarget.style.background = 'transparent';
            }}
          >
            <ArrowUp size={14} color={activeSortDir === 'asc' ? '#0284c7' : '#64748b'} />
            <span style={{ flex: 1 }}>Sort ASC</span>
            {activeSortDir === 'asc' && <Check size={13} color="#0284c7" />}
          </button>

          {/* SORT DESC */}
          <button
            type="button"
            onClick={() => handleApplySort('desc')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 8px',
              background: activeSortDir === 'desc' ? '#eff6ff' : 'transparent',
              color: activeSortDir === 'desc' ? '#0284c7' : '#334155',
              fontWeight: activeSortDir === 'desc' ? 600 : 500,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textAlign: 'left',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (activeSortDir !== 'desc') e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              if (activeSortDir !== 'desc') e.currentTarget.style.background = 'transparent';
            }}
          >
            <ArrowDown size={14} color={activeSortDir === 'desc' ? '#0284c7' : '#64748b'} />
            <span style={{ flex: 1 }}>Sort DESC</span>
            {activeSortDir === 'desc' && <Check size={13} color="#0284c7" />}
          </button>

          <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

          {/* CLEAR FILTER (if filtered) */}
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                if (onFilterChange) onFilterChange(null);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 8px',
                background: '#fef2f2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                textAlign: 'left',
                marginBottom: '4px'
              }}
            >
              <X size={13} color="#dc2626" />
              <span>Clear search filter</span>
            </button>
          )}

          {/* RESET SORT */}
          <button
            type="button"
            onClick={() => {
              handleResetSort();
              if (onFilterChange && isFiltered) onFilterChange(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 8px',
              background: 'transparent',
              color: '#64748b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              textAlign: 'left',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <RotateCcw size={13} color="#64748b" />
            <span>Reset column</span>
          </button>
        </div>
      )}
    </th>
  );
}
