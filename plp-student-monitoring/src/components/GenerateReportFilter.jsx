// GenerateReportFilter.jsx (FULL VERSION with all filters)
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
    program:           '',
    yearLevel:         '',
    section:           '',
    reportType:        'students', // 'students' or 'visitors'
    actionType:        'both',
  });

  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [programOptions, setProgramOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  const yearLevelOptions = [
    { value: '', label: 'All Year Levels', key: 'year-all' },
    { value: '1', label: '1st Year', key: 'year-1' },
    { value: '2', label: '2nd Year', key: 'year-2' },
    { value: '3', label: '3rd Year', key: 'year-3' },
    { value: '4', label: '4th Year', key: 'year-4' },
  ];

  // Fetch departments
  // Replace the department fetch section
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
            value: dept.dept_name,
            label: dept.dept_name,
          }))
        ]);
      } else {
        // Show empty instead of defaults
        setDepartmentOptions([{ value: '', label: 'No departments found' }]);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartmentOptions([{ value: '', label: 'Error loading departments' }]);
    } finally {
      setLoadingDepts(false);
    }
  };
  fetchDepartments();
}, []);

// Also update defaultDeptOptions function - you can delete it or keep as backup

  // Fetch programs when department changes
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!filters.collegeDepartment) {
        setProgramOptions([]);
        return;
      }
      
      setLoadingPrograms(true);
      try {
        // Fetch programs from your programs table
        const response = await fetch(`/api/analytics/programs?department=${encodeURIComponent(filters.collegeDepartment)}`);
        if (!response.ok) throw new Error('Failed to fetch programs');
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setProgramOptions([
            { value: '', label: 'All Programs' },
            ...data.map(prog => ({
              value: prog.program_name || prog.name,
              label: prog.program_name || prog.name,
            }))
          ]);
        } else {
          setProgramOptions([{ value: '', label: 'All Programs' }]);
        }
      } catch (err) {
        console.error('Error fetching programs:', err);
        setProgramOptions([{ value: '', label: 'All Programs' }]);
      } finally {
        setLoadingPrograms(false);
      }
    };
    
    fetchPrograms();
  }, [filters.collegeDepartment]);

  // Fetch sections when program or year level changes
  // Fetch sections when program or year level changes
useEffect(() => {
  const fetchSections = async () => {
    if (!filters.program) {
      setSectionOptions([]);
      return;
    }
    
    setLoadingSections(true);
    try {
      // Fetch sections from students table based on program and year level
      const params = new URLSearchParams();
      if (filters.program) params.append('program', filters.program);
      if (filters.yearLevel) params.append('yearLevel', filters.yearLevel);
      
      const response = await fetch(`/api/analytics/sections?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sections');
      const data = await response.json();
      
      console.log('Sections data received:', data); // Debug log
      
      if (Array.isArray(data) && data.length > 0) {
        setSectionOptions([
          { value: '', label: 'All Sections', key: 'all-sections' },
          ...data.map((section, idx) => ({
            value: section.section || section.section_name,
            label: section.section || section.section_name,
            key: `section-${section.section || section.section_name}-${idx}`  // FIXED: idx is now defined
          }))
        ]);
      } else {
        setSectionOptions([{ value: '', label: 'All Sections', key: 'all-sections' }]);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
      setSectionOptions([{ value: '', label: 'All Sections', key: 'all-sections' }]);
    } finally {
      setLoadingSections(false);
    }
  };
  
  fetchSections();
}, [filters.program, filters.yearLevel]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const setField = (field, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [field]: value,
      // Reset dependent fields
      ...(field === 'collegeDepartment' && { program: '', section: '' }),
      ...(field === 'program' && { section: '' }),
      ...(field === 'yearLevel' && { section: '' })
    }));
  };

  const handleGenerate = () => {
    const reportFilters = {
      dateRange: {
        from: filters.dateFrom ? filters.dateFrom.toLocaleDateString('en-GB') : '',
        to:   filters.dateTo   ? filters.dateTo.toLocaleDateString('en-GB')   : '',
      },
      collegeDepartment: filters.collegeDepartment,
      program: filters.program,
      yearLevel: filters.yearLevel,
      section: filters.section,
      reportType: filters.reportType,
      actionType: filters.actionType,
    };

    console.log('[GenerateReportFilter] Generating with filters:', reportFilters);

    if (onGenerate) onGenerate(reportFilters);
    onClose();
  };

  const handleCancel = () => {
    setFilters({ 
      dateFrom: null, 
      dateTo: null, 
      collegeDepartment: '', 
      program: '',
      yearLevel: '',
      section: '',
      reportType: 'students',
      actionType: 'both' 
    });
    onClose();
  };

  const actionTypeOptions = [
    { value: 'both',  label: 'Both Entry & Exit' },
    { value: 'entry', label: 'Entry Only' },
    { value: 'exit',  label: 'Exit Only' },
  ];

  const reportTypeOptions = [
    { value: 'students', label: 'Students' },
    { value: 'visitors', label: 'Visitors' },
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

  // Get active filters count for display
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.collegeDepartment) count++;
    if (filters.program) count++;
    if (filters.yearLevel) count++;
    if (filters.section) count++;
    if (filters.reportType !== 'students') count++;
    if (filters.actionType !== 'both') count++;
    return count;
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">GENERATE REPORT FILTER</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body1">

          {/* Report Type: Students or Visitors */}
          <div className="modal-field ">
            <label className="modal-label">Report Type</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              {reportTypeOptions.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value={opt.value}
                    checked={filters.reportType === opt.value}
                    onChange={() => setField('reportType', opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

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

          
          {/* Student-specific filters */}
          {filters.reportType === 'students' && (
            <>

              <div className='modal-grid-2'>
                {/* Department Filter */}
                <div className="modal-field">
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
                </div>

                {/* Program Filter - FROM YOUR PROGRAMS TABLE */}
                <div className="modal-field">
                  <label className="modal-label">Program</label>
                  <select
                    value={filters.program}
                    onChange={e => setField('program', e.target.value)}
                    className="modal-select"
                    disabled={!filters.collegeDepartment || loadingPrograms}
                  >
                    {loadingPrograms ? (
                      <option value="">Loading programs…</option>
                    ) : (
                      programOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))
                    )}
                  </select>
                  {filters.collegeDepartment && !loadingPrograms && programOptions.length <= 1 && (
                    <small style={{ color: '#999', marginTop: '4px', display: 'block', fontSize: '11px' }}>
                      No programs found for this department
                    </small>
                  )}
                </div>
              </div>
              
              
              <div className='modal-grid-2'>
                {/* Year Level Filter */}
                <div className="modal-field">
                  <label className="modal-label">Year Level</label>
                  <select
                    value={filters.yearLevel}
                    onChange={e => setField('yearLevel', e.target.value)}
                    className="modal-select"
                  >
                    {yearLevelOptions.map(opt => (
                      <option key={opt.key} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Section Filter */}
                <div className="modal-field">
                  <label className="modal-label">Section</label>
                  <select
                    value={filters.section}
                    onChange={e => setField('section', e.target.value)}
                    className="modal-select"
                    disabled={!filters.program || loadingSections}
                  >
                    {loadingSections ? (
                      <option value="">Loading sections…</option>
                    ) : (
                      sectionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              
            </>
          )}

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
              {filters.actionType === 'entry' && '📋 Report will show Entry Logs only'}
              {filters.actionType === 'exit'  && '🚪 Report will show Exit Logs only'}
              {filters.actionType === 'both'  && '📋🚪 Report will show both Entry and Exit Logs'}
            </small>
          </div>

          {/* Active Filter Summary */}
          {getActiveFilterCount() > 0 && (
            <div style={{ marginTop:'12px', padding:'10px 14px', backgroundColor:'#f0f7f4', borderRadius:'6px', border:'1px solid #c8e6c9', fontSize:'11px', color:'#333' }}>
              <strong style={{ color:'#01311d' }}>Active Filters ({getActiveFilterCount()}):</strong>{' '}
              {[
                filters.dateFrom && filters.dateTo && `${filters.dateFrom.toLocaleDateString('en-GB')} – ${filters.dateTo.toLocaleDateString('en-GB')}`,
                filters.reportType !== 'students' && `Type: ${filters.reportType === 'visitors' ? 'Visitors' : 'Students'}`,
                filters.collegeDepartment && `Dept: ${filters.collegeDepartment}`,
                filters.program && `Program: ${filters.program}`,
                filters.yearLevel && `Year: ${yearLevelOptions.find(y => y.value === filters.yearLevel)?.label}`,
                filters.section && `Section: ${filters.section}`,
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

export default GenerateReportFilter;