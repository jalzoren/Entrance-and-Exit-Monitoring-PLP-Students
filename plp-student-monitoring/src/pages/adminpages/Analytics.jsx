// Analytics.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../../css/Analytics.css';
import GenerateReportFilter from '../../components/GenerateReportFilter';
import GenerateReportPdf from '../../components/GenerateReportPdf';
import { reportToXml, xmlToReport, downloadXml, downloadHtml, xmlToHtml, openXmlReportWindow } from '../../utils/xmlReportUtils';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_COLORS = ['#01311d', '#d99201', '#4a90d9'];
const VISITOR_COLORS = ['#4a90d9', '#d99201'];

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE (all data comes from the database via analytics.js routes)
// ─────────────────────────────────────────────────────────────────────────────

const AnalyticsService = {
  async fetchMetrics() {
    try {
      const res = await fetch('/api/analytics/metrics');
      if (!res.ok) throw new Error(`metrics: HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchMetrics] FAILED:', err.message);
      throw err;
    }
  },

  async fetchTraffic(days = 7) {
    try {
      const res = await fetch(`/api/analytics/traffic?days=${days}`);
      if (!res.ok) throw new Error(`traffic: HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchTraffic] FAILED:', err.message);
      throw err;
    }
  },

  async fetchDepartments() {
    try {
      const res = await fetch('/api/analytics/departments');
      if (!res.ok) throw new Error(`departments: HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchDepartments] FAILED:', err.message);
      throw err;
    }
  },

  async fetchAuthMethods() {
    try {
      const res = await fetch('/api/analytics/auth-methods');
      if (!res.ok) throw new Error(`auth-methods: HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchAuthMethods] FAILED:', err.message);
      throw err;
    }
  },

  async fetchReport(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Date range
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      
      // Student filters
      if (filters.dept) params.set('dept', filters.dept);
      if (filters.program) params.set('program', filters.program);
      if (filters.yearLevel) params.set('yearLevel', filters.yearLevel);
      if (filters.section) params.set('section', filters.section);
      
      // Report type and action type
      if (filters.reportType) params.set('reportType', filters.reportType);
      if (filters.actionType) params.set('actionType', filters.actionType);
      
      const res = await fetch(`/api/analytics/report?${params.toString()}`);
      if (!res.ok) throw new Error(`report: HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[AnalyticsService.fetchReport] FAILED:', err.message);
      throw err;
    }
  },

  async fetchVisitorStats() {
    const res = await fetch('/api/analytics/visitor-stats');
    if (!res.ok) throw new Error('visitor-stats failed');
    return res.json();
  },

  // ── NEW: Fetch visitor logs for table display ──
  async fetchVisitorLogs() {
    try {
      const res = await fetch('/api/analytics/visitor-logs');
      if (!res.ok) throw new Error(`visitor-logs: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchVisitorLogs] FAILED:', err.message);
      return [];
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Analytics() {
  // ── State ────────────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState({ totalStudents: 0, currentStudentsInside: 0 });
  const [trafficData, setTrafficData] = useState([]);
  const [collegeData, setCollegeData] = useState([]);
  const [authData, setAuthData] = useState([]);
  const [visitorData, setVisitorData] = useState([]);
  const [visitorLogs, setVisitorLogs] = useState([]); // ── NEW: Visitor logs state
  const [timeRange, setTimeRange] = useState('7days');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Report / PDF state
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const pdfRef = useRef(null);

  // Pagination for college table
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // ── Days mapping ─────────────────────────────────────────────────────────
  const daysMap = { '7days': 7, '30days': 30, '1year': 365 };


  // ── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async (days) => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, trafficRaw, deptData, authRaw, visitorStats, visitorLogsRaw] = await Promise.all([
        AnalyticsService.fetchMetrics(),
        AnalyticsService.fetchTraffic(days),
        AnalyticsService.fetchDepartments(),
        AnalyticsService.fetchAuthMethods(),
        AnalyticsService.fetchVisitorStats(),
        AnalyticsService.fetchVisitorLogs(), // ── NEW: Fetch visitor logs
      ]);

      // Format metrics
      setMetrics({
        totalStudents: metricsData.totalStudents ?? 0,
        currentStudentsInside: metricsData.onCampus ?? 0,
      });

      // Format traffic data - ensure we have entrance/exit fields
      const formattedTraffic = trafficRaw.map(item => ({
        date: item.date,
        entrance: item.entrance ?? item.entries ?? item.entrances ?? 0,
        exit: item.exit ?? item.exits ?? 0,
      }));
      setTrafficData(formattedTraffic);

      // Format department data
      const formattedDepts = deptData.map(dept => ({
        fullCollegeName: dept.fullCollegeName || dept.collegeName || dept.department_name || 'Unknown',
        collegeName: dept.collegeName || dept.fullCollegeName || dept.department_name || 'Unknown',
        presenceNow: dept.presenceNow ?? dept.currentStudents ?? dept.presentNow ?? 0,
        totalStudents: dept.totalStudents ?? dept.enrolled ?? dept.total_enrolled ?? 0,
        percentage: dept.percentage || ((dept.presenceNow / (dept.totalStudents || 1)) * 100).toFixed(1) || '0',
      }));
      setCollegeData(formattedDepts);

      // Format auth data
      const formattedAuth = authRaw.map(auth => ({
        id: auth.id,
        method: auth.method || auth.authentication_method || 'Unknown',
        attempts: auth.attempts ?? auth.total_attempts ?? 0,
        success: auth.success ?? auth.successful ?? 0,
        successRate: auth.successRate ?? auth.success_rate ?? 0,
      }));
      setAuthData(formattedAuth);

      // Format visitor data for pie chart
      let entries = 0, exits = 0;
      if (visitorStats && Array.isArray(visitorStats)) {
        entries = visitorStats.filter(v => (v.action || '').toLowerCase() === 'entry').length;
        exits = visitorStats.filter(v => (v.action || '').toLowerCase() === 'exit').length;
      } else if (visitorStats && typeof visitorStats === 'object') {
        entries = visitorStats.entries ?? visitorStats.entry ?? 0;
        exits = visitorStats.exits ?? visitorStats.exit ?? 0;
      }
      setVisitorData([
        { name: 'ENTRY', value: entries },
        { name: 'EXIT', value: exits }
      ]);

      // ── NEW: Format visitor logs
      setVisitorLogs(visitorLogsRaw || []);

    } catch (err) {
      console.error('[Analytics] loadAll error:', err);
      setError('Failed to load analytics data. Please check your server connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-load whenever time range changes
  useEffect(() => {
    loadAll(daysMap[timeRange] ?? 7);
    setCurrentPage(1);
  }, [timeRange, loadAll]);

  // ── Traffic insights ─────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!trafficData || trafficData.length === 0) return null;
    const nonZero = trafficData.filter(d => d.entrance > 0);
    if (nonZero.length === 0) return null;
    const highest = nonZero.reduce((a, b) => b.entrance > a.entrance ? b : a);
    const lowest = nonZero.reduce((a, b) => b.entrance < a.entrance ? b : a);
    return { highest, lowest };
  }, [trafficData]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const indexOfFirst = (currentPage - 1) * recordsPerPage;
  const currentCollegeData = collegeData.slice(indexOfFirst, indexOfFirst + recordsPerPage);
  const totalPages = Math.ceil(collegeData.length / recordsPerPage);

  // ── Report generation ────────────────────────────────────────────────────
  const handleApplyFilters = async (filters) => {
    setAppliedFilters(filters);
    try {
      const reportParams = {};
      
      // Date Range
      if (filters.dateRange?.from) {
        const parts = filters.dateRange.from.split('/');
        if (parts.length === 3) reportParams.from = `${parts[2]}-${parts[1]}-${parts[0]}`;
        else reportParams.from = filters.dateRange.from;
      }
      if (filters.dateRange?.to) {
        const parts = filters.dateRange.to.split('/');
        if (parts.length === 3) reportParams.to = `${parts[2]}-${parts[1]}-${parts[0]}`;
        else reportParams.to = filters.dateRange.to;
      }
      
      // Student Filters
      if (filters.collegeDepartment) reportParams.dept = filters.collegeDepartment;
      if (filters.program) reportParams.program = filters.program;
      if (filters.yearLevel) reportParams.yearLevel = filters.yearLevel;
      if (filters.section) reportParams.section = filters.section;
      
      // Report Type and Action Type
      if (filters.reportType) reportParams.reportType = filters.reportType;
      if (filters.actionType && filters.actionType !== 'both') {
        reportParams.actionType = filters.actionType;
      }
  
      console.log('[Analytics] Sending report params:', reportParams);
  
      const reportData = await AnalyticsService.fetchReport(reportParams);
      
      // Debug - log what we got from the API
      console.log('Report data from API:', reportData);
      console.log('College data from API:', reportData.collegeData);
  
      const xmlString = reportToXml(reportData, reportParams);
      const parsedData = xmlToReport(xmlString);
  
      setFilteredReportData({
        ...parsedData,
        _xml: xmlString,
        dateRange: filters.dateRange?.from && filters.dateRange?.to
          ? `${filters.dateRange.from} - ${filters.dateRange.to}`
          : parsedData.dateRange,
        // Use data from API response
        collegeData: reportData.collegeData,
        authData: reportData.authData,
        trafficData: reportData.trafficChartData || trafficData,
        visitorData: visitorData,
        visitorLogs: visitorLogs,
        metrics: metrics,
        // Pass these for the PDF
        totalStudents: reportData.totalStudents,
        currentOnCampus: reportData.currentOnCampus,
        totalEntries: reportData.totalEntries,
        studentLogs: reportData.studentLogs,
        entryLogs: reportData.entryLogs,
        exitLogs: reportData.exitLogs,
        // Store applied filters for the PDF to use
        appliedFilters: filters
      });
      setShowPdfPreview(true);
    } catch (err) {
      console.error('[Analytics] report fetch error:', err);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleDownloadPDF = () => pdfRef.current?.generatePDF();

  const handleDownloadHtml = async () => {
    if (!filteredReportData?._xml) {
      alert('No XML data available');
      return;
    }
    try {
      const htmlString = await xmlToHtml(filteredReportData._xml);
      const date = new Date().toISOString().slice(0, 10);
      downloadHtml(htmlString, `eems-report-${date}.html`);
    } catch (err) {
      console.error('Error downloading HTML:', err);
      alert('Failed to download HTML report');
    }
  };

  const handleViewHtmlReport = async () => {
    if (!filteredReportData?._xml) {
      alert('No XML data available');
      return;
    }
    try {
      openXmlReportWindow(filteredReportData._xml);
    } catch (err) {
      console.error('Error opening report window:', err);
      alert('Failed to open report window');
    }
  };

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    setFilteredReportData(null);
  };

  // ── Pagination helpers ───────────────────────────────────────────────────
  const renderPageNumbers = () => {
    const pages = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button key={i} className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}>{i}</button>
        );
      }
    } else {
      pages.push(
        <button key={1} className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => setCurrentPage(1)}>1</button>
      );
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) end = Math.min(totalPages - 1, 4);
      if (currentPage >= totalPages - 1) start = Math.max(2, totalPages - 3);
      if (start > 2) pages.push(<span key="e1" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}>{i}</button>
        );
      }
      if (end < totalPages - 1) pages.push(<span key="e2" className="ellipsis">...</span>);
      pages.push(
        <button key={totalPages} className={`page-number ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
      );
    }
    return pages;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="analytics-page">
      <header className="header-card">
        <h1>ANALYTICS &amp; REPORTS</h1>
        <p className="subtitle">Dashboard / Analytics &amp; Reports</p>
      </header>
      <hr className="header-divider" />

      <div className="analytics-container">

        {/* ── TOP ROW: generate button + metric cards ── */}
        <div className="metrics-row">
          <div className="filter-group button-group">
            <button
              className="generate-report-btn"
              onClick={() => setShowFilterPopup(true)}
              style={{
                background: 'linear-gradient(135deg, #01311d 0%, #548772 100%)',
                color: 'white', border: 'none', padding: '12px 24px',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
              }}
            >
              Generate Report
            </button>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">TOTAL STUDENTS</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.currentStudentsInside.toLocaleString()}</div>
            <div className="metric-label">CURRENT STUDENTS INSIDE</div>
          </div>
        </div>

        {/* ── LOADING / ERROR ── */}
        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        )}
        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => loadAll(daysMap[timeRange] ?? 7)}>Retry</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ── CHART 1: Daily Traffic Trend ── */}
            <section className="chart-section daily-traffic-section">
              <div className="section-header">
                <h2>Daily Traffic Trend (Entries and Exits)</h2>
                <div className="time-range-selector">
                  {[['7days', '7 Days'], ['30days', '30 Days'], ['1year', '1 Year']].map(([v, l]) => (
                    <button key={v}
                      className={`range-btn ${timeRange === v ? 'active' : ''}`}
                      onClick={() => setTimeRange(v)}>{l}</button>
                  ))}
                </div>
              </div>
              {trafficData && trafficData.length > 0 ? (
                <>
                  <TrafficChart data={trafficData} />
                  {insights && (
                    <div className="traffic-insights-container">
                      <div className="insights">
                        <h4>Insights:</h4>
                        <ul>
                          <li><strong>Highest traffic:</strong> {insights.highest?.date} ({insights.highest?.entrance?.toLocaleString() || 0} entries)</li>
                          <li><strong>Lowest traffic:</strong> {insights.lowest?.date} ({insights.lowest?.entrance?.toLocaleString() || 0} entries)</li>
                        </ul>
                      </div>
                      <div className="traffic-legend">
                        <h4>Legend:</h4>
                        <div className="legend-items">
                          <div className="legend-item-traffic">
                            <span className="legend-color entrance"></span>
                            <span className="legend-label">Entrance</span>
                          </div>
                          <div className="legend-item-traffic">
                            <span className="legend-color exit"></span>
                            <span className="legend-label">Exit</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-data-msg">No traffic data available for this period.</p>
              )}
            </section>

            <div className="two-charts">
              {/* ── CHART 2: Authentication Method Usage ── */}
              <section className="chart-section">
                <div className="section-header">
                  <h2>Authentication Method Usage</h2>
                  <button className="info-btn" title="Shows how students authenticated at the gate.">ℹ</button>
                </div>
                {authData.length > 0 ? (
                  <>
                    <AuthenticationChart data={authData} />
                    <div className="table-container small-table">
                      <table className="analytics-table small-table">
                        <thead>
                          <tr>
                            <th>No.</th>
                            <th>Method</th>
                            <th>Attempts</th>
                            <th>Success Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {authData.map((auth, i) => (
                            <tr key={auth.id}>
                              <td>{i + 1}</td>
                              <td>{auth.method}</td>
                              <td>{auth.attempts?.toLocaleString() || 0}</td>
                              <td>{auth.successRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="no-data-msg">No authentication data available yet.</p>
                )}
              </section>

              {/* ── CHART 3: Visitor Entry and Exit ── */}
             
            </div>

            {/* ── CHART 4: Department Distribution ── */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Department Distribution (Current Campus Population)</h2>
                <button className="info-btn" title="Students currently on campus by department.">ℹ</button>
              </div>
              {collegeData.length > 0 ? (
                <>
                  <CollegeDistributionChart data={collegeData} />
                  <div className="campus-summary">
                    <p>
                      <strong>Total students by department:</strong>{' '}
                      {collegeData.reduce((s, d) => s + (d.presenceNow || 0), 0).toLocaleString()} students currently on campus
                    </p>
                  </div>
                  <div className="table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Department</th>
                          <th>Present Now</th>
                          <th>Total Enrolled</th>
                          <th>% of Campus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCollegeData.map((college, i) => (
                          <tr key={college.fullCollegeName}>
                            <td>{indexOfFirst + i + 1}</td>
                            <td title={college.fullCollegeName}>{college.fullCollegeName}</td>
                            <td>{(college.presenceNow || 0).toLocaleString()}</td>
                            <td>{(college.totalStudents || 0).toLocaleString()}</td>
                            <td>{college.percentage || '0'}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button className="pagination-button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}>← Previous</button>
                      <div className="page-numbers">{renderPageNumbers()}</div>
                      <button className="pagination-button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}>Next →</button>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-data-msg">No department data available. Students need to be on campus.</p>
              )}
            </section>

            {/* ── CHART 5: Visitor Logs Table ── */}
         

          </>
        )}
      </div>

      {/* ── FILTER POPUP ── */}
      {showFilterPopup && (
        <GenerateReportFilter
          onClose={() => setShowFilterPopup(false)}
          onGenerate={handleApplyFilters}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {/* ── PDF PREVIEW MODAL ── */}
      {showPdfPreview && filteredReportData && (
        <div className="modal-overlay" onClick={handleClosePdfPreview} style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()} style={{
            borderRadius: '12px', width: '90%', maxWidth: '1000px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backgroundColor: '#fff'
          }}>
            <div className="pdf-preview-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#01311d'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Report Preview</h2>
              <button onClick={handleClosePdfPreview} style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#fff',
              }}>×</button>
            </div>
            <div className="pdf-preview-content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <GenerateReportPdf ref={pdfRef} reportData={filteredReportData} filters={appliedFilters} />
            </div>
            <div className="pdf-preview-footer" style={{
              display: 'flex', justifyContent: 'flex-end', gap: '12px',
              padding: '16px 20px', borderTop: '1px solid #e0e0e0',
            }}>
              <button onClick={handleClosePdfPreview} style={{
                padding: '10px 20px', backgroundColor: '#f5f5f5',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}>Close</button>
           {/** 
              <button
                onClick={handleViewHtmlReport}
                title="View HTML report in new window"
                style={{
                  padding: '10px 20px', backgroundColor: '#4a90d9', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                }}
              >View HTML Report</button>
              {filteredReportData?._xml && (
                <button
                  onClick={() => {
                    const date = new Date().toISOString().slice(0, 10);
                    downloadXml(filteredReportData._xml, `eems-report-${date}.xml`);
                  }}
                  style={{
                    padding: '10px 20px', backgroundColor: '#4a90d9', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                  }}
                >Download XML</button>
              )}
              <button
                onClick={handleDownloadHtml}
                title="Download as HTML file"
                style={{
                  padding: '10px 20px', backgroundColor: '#d99201', color: 'white',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                }}
              >Download HTML</button>

              */}
              <button onClick={handleDownloadPDF} style={{
                padding: '10px 20px', backgroundColor: '#548772', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TrafficChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="no-data-msg">No traffic data available</p>;
  }

  // Ensure data has the required fields
  const chartData = data.map(item => ({
    date: item.date,
    entrance: item.entrance || 0,
    exit: item.exit || 0,
  }));

  return (
    <div className="chart-container" style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="entranceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#58761B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#58761B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D99201" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D99201" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            tick={{ fontSize: 11 }} 
            angle={-30} 
            textAnchor="end" 
            height={60} 
            interval="preserveStartEnd" 
          />
          <YAxis stroke="#666" tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '12px' }} 
            formatter={(value) => [value.toLocaleString(), '']}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }} />
          <Area 
            type="monotone" 
            dataKey="entrance" 
            name="Entrances"
            stroke="#58761B" 
            strokeWidth={2} 
            fill="url(#entranceGradient)"
            dot={{ fill: '#58761B', r: 3 }} 
            activeDot={{ r: 5 }} 
          />
          <Area 
            type="monotone" 
            dataKey="exit" 
            name="Exits"
            stroke="#D99201" 
            strokeWidth={2} 
            fill="url(#exitGradient)"
            dot={{ fill: '#D99201', r: 3 }} 
            activeDot={{ r: 5 }} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CollegeDistributionChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="no-data-msg">No department data available</p>;
  }

  const chartData = [...data]
    .sort((a, b) => (b.presenceNow || 0) - (a.presenceNow || 0))
    .slice(0, 10); // Show top 10 departments for better visibility

  return (
    <div className="chart-container college-chart" style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical" 
          margin={{ top: 10, right: 30, left: 160, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis 
            type="category" 
            dataKey="fullCollegeName" 
            stroke="#666" 
            width={150} 
            tick={{ fontSize: 11 }} 
          />
          <Tooltip
            formatter={(value) => [value?.toLocaleString() || 0, 'Present Now']}
            contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '11px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar dataKey="presenceNow" fill="#58761B" name="Present Now" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AuthenticationChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="no-data-msg">No authentication data available</p>;
  }

  const pieData = data.map(d => ({ 
    name: d.method || 'Unknown', 
    value: d.attempts || 0 
  })).filter(d => d.value > 0);

  if (pieData.length === 0) {
    return <p className="no-data-msg">No authentication attempts recorded</p>;
  }

  return (
    <div className="chart-container pie-chart" style={{ width: '100%', height: '350px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine
            outerRadius={100}
            dataKey="value"
            fontSize={12}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={AUTH_COLORS[i % AUTH_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px', fontSize: '12px' }}
            formatter={(value) => [value?.toLocaleString(), 'Attempts']}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function VisitorChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="no-data-msg">No visitor data available</p>;
  }

  const pieData = data.filter(d => d.value > 0);

  if (pieData.length === 0) {
    return <p className="no-data-msg">No visitor activity recorded</p>;
  }

 

}

export default Analytics;