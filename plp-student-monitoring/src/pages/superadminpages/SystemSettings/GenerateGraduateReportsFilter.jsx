import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../../componentscss/GenerateGraduateReportFilter.css';
import '../../../css/GlobalModal.css';

export default function GenerateGraduateReportsFilter({ onClose, onGenerate, departments = [] }) {
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    collegeDepartment: '',
    program: '',
    yearLevel: '',
    section: '',
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

  // Fetch programs when department changes
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!filters.collegeDepartment) {
        setProgramOptions([]);
        return;
      }
      
      setLoadingPrograms(true);
      try {
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
  useEffect(() => {
    const fetchSections = async () => {
      if (!filters.program) {
        setSectionOptions([]);
        return;
      }
      
      setLoadingSections(true);
      try {
        const params = new URLSearchParams();
        if (filters.program) params.append('program', filters.program);
        if (filters.yearLevel) params.append('yearLevel', filters.yearLevel);
        
        const response = await fetch(`/api/analytics/sections?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch sections');
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setSectionOptions([
            { value: '', label: 'All Sections', key: 'all-sections' },
            ...data.map((section, idx) => ({
              value: section.section || section.section_name,
              label: section.section || section.section_name,
              key: `section-${section.section || section.section_name}-${idx}`
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
      ...(field === 'collegeDepartment' && { program: '', section: '' }),
      ...(field === 'program' && { section: '' }),
      ...(field === 'yearLevel' && { section: '' })
    }));
  };

  const handleGenerate = () => {
    const reportFilters = {
      dateRange: {
        from: filters.dateFrom ? filters.dateFrom.toLocaleDateString('en-GB') : '',
        to: filters.dateTo ? filters.dateTo.toLocaleDateString('en-GB') : '',
      },
      collegeDepartment: filters.collegeDepartment,
      program: filters.program,
      yearLevel: filters.yearLevel,
      section: filters.section,
    };

    console.log('[GenerateGraduateReportsFilter] Generating with filters:', reportFilters);

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
      section: ''
    });
    onClose();
  };

  return (
    <div className="ggrf-overlay" onClick={handleCancel}>
      <div className="ggrf-container" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="ggrf-header">
          <h3 className="ggrf-title">Generate Report for Graduates</h3>
          <button 
            className="ggrf-close-btn" 
            onClick={handleCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="ggrf-body">
          {/* Date Range */}
          <div className="ggrf-row">
            <div className="ggrf-col">
              <label className="ggrf-label">Date From</label>
              <DatePicker
                selected={filters.dateFrom}
                onChange={(date) => setField('dateFrom', date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="ggrf-input"
                wrapperClassName="ggrf-datepicker-wrapper"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
            <div className="ggrf-col">
              <label className="ggrf-label">Date To</label>
              <DatePicker
                selected={filters.dateTo}
                onChange={(date) => setField('dateTo', date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                className="ggrf-input"
                wrapperClassName="ggrf-datepicker-wrapper"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
          </div>

          {/* Department */}
          <div className="ggrf-field ggrf-full-width">
            <label className="ggrf-label">Department</label>
            <select
              value={filters.collegeDepartment}
              onChange={(e) => setField('collegeDepartment', e.target.value)}
              className="ggrf-select"
              disabled={loadingDepts}
            >
              {departmentOptions.map((opt) => (
                <option key={opt.value || 'default'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div className="ggrf-field ggrf-full-width">
            <label className="ggrf-label">Program</label>
            <select
              value={filters.program}
              onChange={(e) => setField('program', e.target.value)}
              className="ggrf-select"
              disabled={loadingPrograms || !filters.collegeDepartment}
            >
              {programOptions.map((opt) => (
                <option key={opt.value || 'default'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Level & Section */}
          <div className="ggrf-row">
            <div className="ggrf-col">
              <label className="ggrf-label">Year Level</label>
              <select
                value={filters.yearLevel}
                onChange={(e) => setField('yearLevel', e.target.value)}
                className="ggrf-select"
              >
                {yearLevelOptions.map((opt) => (
                  <option key={opt.key} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="ggrf-col">
              <label className="ggrf-label">Section</label>
              <select
                value={filters.section}
                onChange={(e) => setField('section', e.target.value)}
                className="ggrf-select"
                disabled={loadingSections || !filters.program}
              >
                {sectionOptions.map((opt) => (
                  <option key={opt.key || opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="ggrf-footer">
          <button className="ggrf-btn ggrf-btn-cancel" onClick={handleCancel}>Cancel</button>
          <button className="ggrf-btn ggrf-btn-generate" onClick={handleGenerate}>
            Generate Graduates Reports
          </button>
        </div>

      </div>
    </div>
  );
}