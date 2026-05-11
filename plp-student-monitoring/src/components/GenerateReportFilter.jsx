// GenerateReportFilter.jsx (CLEANED - only essential filters)
import React, { useState, useEffect } from 'react';
import '../componentscss/GenerateReportFilter.css';
import '../css/GlobalModal.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function GenerateReportFilter({ onClose, onGenerate }) {
  const [filters, setFilters] = useState({
    dateFrom:          null,
    dateTo:            null,
    collegeDepartment: '',
    actionType:        'both',
  });

  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/departments?status=Active');
        if (!response.ok) throw new Error('Failed to fetch departments');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartmentOptions([
            { value: '', label: 'All Departments' },
            ...data.map(dept => ({
              value: dept.dept_name || dept.name,
              label: dept.dept_name || dept.name,
            }))
          ]);
        } else {
          setDepartmentOptions(defaultDeptOptions());
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setDepartmentOptions(defaultDeptOptions());
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const setField = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  const handleGenerate = () => {
    const reportFilters = {
      dateRange: {
        from: filters.dateFrom ? filters.dateFrom.toLocaleDateString('en-GB') : '',
        to:   filters.dateTo   ? filters.dateTo.toLocaleDateString('en-GB')   : '',
      },
      collegeDepartment: filters.collegeDepartment,
      actionType:        filters.actionType,
    };

    console.log('[GenerateReportFilter] Generating with filters:', reportFilters);

    if (onGenerate) onGenerate(reportFilters);
    onClose();
  };

  const handleCancel = () => {
    setFilters({ dateFrom: null, dateTo: null, collegeDepartment: '', actionType: 'both' });
    onClose();
  };

  const actionTypeOptions = [
    { value: 'both',  label: 'Both Entry & Exit' },
    { value: 'entry', label: 'Entry Only' },
    { value: 'exit',  label: 'Exit Only' },
  ];

  const pickerCommon = {
    dateFormat: 'dd/MM/yyyy',
    className: 'modal-input report-datepicker-field',
    wrapperClassName: 'report-datepicker-wrapper',
    isClearable: true,
    showMonthDropdown: true,
    showYearDropdown: true,
    dropdownMode: 'select',
    popperClassName: 'report-datepicker-popper',
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">GENERATE REPORT FILTER</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Date Range */}
          <div className="modal-grid-2">
            <div className="modal-field">
              <label className="modal-label">Date From</label>
              <DatePicker
                {...pickerCommon}
                selected={filters.dateFrom}
                onChange={date => setField('dateFrom', date)}
                selectsStart
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                placeholderText="DD/MM/YYYY"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Date To</label>
              <DatePicker
                {...pickerCommon}
                selected={filters.dateTo}
                onChange={date => setField('dateTo', date)}
                selectsEnd
                startDate={filters.dateFrom}
                endDate={filters.dateTo}
                minDate={filters.dateFrom}
                placeholderText="DD/MM/YYYY"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div className="modal-field modal-full-width">
            <label className="modal-label">College Department</label>
            <select
              value={filters.collegeDepartment}
              onChange={e => setField('collegeDepartment', e.target.value)}
              className="modal-select"
              disabled={loadingDepts}
            >
              {loadingDepts ? (
                <option value="">Loading departments…</option>
              ) : (
                departmentOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))
              )}
            </select>
            {filters.collegeDepartment && (
              <small style={{ color:'#01311d', marginTop:'4px', display:'block', fontSize:'11px' }}>
                ✓ Showing data for: <strong>{filters.collegeDepartment}</strong>
              </small>
            )}
          </div>

          {/* Action Type Filter */}
          <div className="modal-field modal-full-width">
            <label className="modal-label">Action Type</label>
            <select
              value={filters.actionType}
              onChange={e => setField('actionType', e.target.value)}
              className="modal-select"
            >
              {actionTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <small style={{ color:'#666', marginTop:'4px', display:'block', fontSize:'11px' }}>
              {filters.actionType === 'entry' && '📋 PDF will show Entry Logs only'}
              {filters.actionType === 'exit'  && '🚪 PDF will show Exit Logs only'}
              {filters.actionType === 'both'  && '📋🚪 PDF will show both Entry and Exit Logs'}
            </small>
          </div>

          {/* Active Filter Summary */}
          {(filters.collegeDepartment || filters.dateFrom || filters.dateTo || filters.actionType !== 'both') && (
            <div style={{ marginTop:'12px', padding:'10px 14px', backgroundColor:'#f0f7f4', borderRadius:'6px', border:'1px solid #c8e6c9', fontSize:'11px', color:'#333' }}>
              <strong style={{ color:'#01311d' }}>Active Filters:</strong>{' '}
              {[
                filters.dateFrom && filters.dateTo && `${filters.dateFrom.toLocaleDateString('en-GB')} – ${filters.dateTo.toLocaleDateString('en-GB')}`,
                filters.collegeDepartment && `Dept: ${filters.collegeDepartment}`,
                filters.actionType !== 'both' && `Action: ${filters.actionType === 'entry' ? 'Entry Only' : 'Exit Only'}`,
              ].filter(Boolean).join(' | ')}
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={handleCancel} type="button">
            Cancel
          </button>
          <button className="modal-btn modal-btn-save" onClick={handleGenerate} type="button">
            Generate Report
          </button>
        </div>

      </div>
    </div>
  );
}

// Default department list when API is unavailable
function defaultDeptOptions() {
  return [
    { value: '', label: 'All Departments' },
    { value: 'College of Nursing', label: 'College of Nursing' },
    { value: 'College of Engineering', label: 'College of Engineering' },
    { value: 'College of Education', label: 'College of Education' },
    { value: 'College of Computer Studies', label: 'College of Computer Studies' },
    { value: 'College of Arts and Science', label: 'College of Arts and Science' },
    { value: 'College of Business and Accountancy', label: 'College of Business and Accountancy' },
    { value: 'College of Hospitality Management', label: 'College of Hospitality Management' },
  ];
}

export default GenerateReportFilter;