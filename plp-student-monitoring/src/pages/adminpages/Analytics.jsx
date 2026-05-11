import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../../css/Analytics.css';
import GenerateReportFilter from '../../components/GenerateReportFilter';
import GenerateReportPdf from '../../components/GenerateReportPdf';
import { reportToXml, xmlToReport, downloadXml, downloadHtml, xmlToHtml, openXmlReportWindow } from '../../utils/xmlReportUtils';

const AUTH_COLORS = ['#01311d', '#d99201', '#4a90d9'];
const VISITOR_COLORS = ['#4a90d9', '#d99201'];

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const AnalyticsService = {
  async fetchMetrics() {
    try {
      const res = await fetch('/api/analytics/metrics');
      if (!res.ok) throw new Error(`metrics: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchMetrics] FAILED:', err.message);
      throw err;
    }
  },

  async fetchTraffic(days = 7, filters = {}) {
    try {
      const params = new URLSearchParams({ days });
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      if (filters.dept) params.set('dept', filters.dept);
      const res = await fetch(`/api/analytics/traffic?${params}`);
      if (!res.ok) throw new Error(`traffic: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchTraffic] FAILED:', err.message);
      throw err;
    }
  },

  async fetchDepartments(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.dept) params.set('dept', filters.dept);
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      const url = params.toString()
        ? `/api/analytics/departments?${params}`
        : '/api/analytics/departments';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`departments: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchDepartments] FAILED:', err.message);
      throw err;
    }
  },

  async fetchAuthMethods(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      if (filters.dept) params.set('dept', filters.dept);
      const url = params.toString()
        ? `/api/analytics/auth-methods?${params}`
        : '/api/analytics/auth-methods';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`auth-methods: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchAuthMethods] FAILED:', err.message);
      throw err;
    }
  },

  async fetchReport(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      if (filters.dept) params.set('dept', filters.dept);
      const res = await fetch(`/api/analytics/report?${params}`);
      if (!res.ok) throw new Error(`report: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchReport] FAILED:', err.message);
      throw err;
    }
  },

  async fetchLogs(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.from)       params.set('from',       filters.from);
      if (filters.to)         params.set('to',         filters.to);
      if (filters.dept)       params.set('dept',       filters.dept);
      if (filters.actionType && filters.actionType !== 'both')
        params.set('actionType', filters.actionType);
      const res = await fetch(`/api/analytics/logs?${params}`);
      if (!res.ok) throw new Error(`logs: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchLogs] FAILED:', err.message);
      return { entryLogs: [], exitLogs: [] };
    }
  },

  async fetchVisitorStats(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to)   params.set('to',   filters.to);
      const url = params.toString()
        ? `/api/analytics/visitor-stats?${params}`
        : '/api/analytics/visitor-stats';
      const res = await fetch(url);
      if (!res.ok) throw new Error('visitor-stats failed');
      return await res.json();
    } catch (err) {
      console.error('[AnalyticsService.fetchVisitorStats] FAILED:', err.message);
      return [];
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** "DD/MM/YYYY" → "YYYY-MM-DD" for API params */
function toApiDate(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return ddmmyyyy;
}

/**
 * Normalise a raw department array (handles BOTH field-name variants
 * returned by /api/analytics/departments: presenceNow vs presentNow etc.)
 * and calculates percentagePresent + percentageOfCampus from live numbers.
 */
function normaliseDepts(raw) {
  if (!Array.isArray(raw)) return [];

  const mapped = raw.map(dept => {
    const presentNow =
      dept.presentNow      ??
      dept.presenceNow     ??
      dept.currentStudents ??
      dept.student_count   ??
      0;

    const totalEnrolled =
      dept.totalEnrolled   ??
      dept.totalStudents   ??
      dept.enrolled_count  ??
      0;

    return {
      ...dept,
      // Normalised names used everywhere in the PDF
      displayName:     dept.displayName || dept.fullCollegeName || dept.collegeName || dept.dept_name || 'Unknown',
      presentNow,
      totalEnrolled,
      percentagePresent:  totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0,
      percentageOfCampus: 0, // recalculated below
    };
  });

  const totalPresent = mapped.reduce((s, d) => s + d.presentNow, 0);
  return mapped.map(d => ({
    ...d,
    percentageOfCampus: totalPresent > 0 ? (d.presentNow / totalPresent) * 100 : 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Analytics() {
  const [metrics,     setMetrics]     = useState({ totalStudents: 0, currentStudentsInside: 0, totalEntries: 0, authSuccessRate: 0, peakHour: null });
  const [trafficData, setTrafficData] = useState([]);
  const [collegeData, setCollegeData] = useState([]);  // raw from API (presenceNow etc.)
  const [authData,    setAuthData]    = useState([]);
  const [visitorData, setVisitorData] = useState([]);
  const [timeRange,   setTimeRange]   = useState('7days');
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);

  const [showFilterPopup,    setShowFilterPopup]    = useState(false);
  const [showPdfPreview,     setShowPdfPreview]     = useState(false);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [appliedFilters,     setAppliedFilters]     = useState({});
  const [isGenerating,       setIsGenerating]       = useState(false);
  const pdfRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const daysMap = { '7days': 7, '30days': 30, '1year': 365 };

  // ── Derived: campus totals from live data ─────────────────────────────────
  const totalCampusPopulation = useMemo(
    () => collegeData.reduce((s, d) => s + (d.presenceNow ?? d.presentNow ?? 0), 0),
    [collegeData]
  );

  // ── Visitor chart data ────────────────────────────────────────────────────
  const visitorChartData = useMemo(() => {
    if (!Array.isArray(visitorData) || visitorData.length === 0) return [];
    // Handle raw log-style array vs already-aggregated array
    const first = visitorData[0];
    if (first?.hasOwnProperty('action')) {
      const entries = visitorData.filter(v => v.action?.toLowerCase() === 'entry').length;
      const exits   = visitorData.filter(v => v.action?.toLowerCase() === 'exit').length;
      return [
        { name: 'ENTRY', value: entries, color: VISITOR_COLORS[0] },
        { name: 'EXIT',  value: exits,   color: VISITOR_COLORS[1] },
      ];
    }
    if (first?.hasOwnProperty('name')) {
      return visitorData.map((v, i) => ({ ...v, color: VISITOR_COLORS[i % VISITOR_COLORS.length] }));
    }
    return [];
  }, [visitorData]);

  // ── Auth chart data ───────────────────────────────────────────────────────
  const authChartData = useMemo(() =>
    authData.map(d => ({ name: d.method || d.authentication_method, value: d.attempts || d.total_attempts || 0 })),
  [authData]);

  // ── Traffic insights ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!trafficData || trafficData.length === 0) return null;
    const nonZero = trafficData.filter(d => d.entrance > 0);
    if (nonZero.length === 0) return null;
    return {
      highest: nonZero.reduce((a, b) => b.entrance > a.entrance ? b : a),
      lowest:  nonZero.reduce((a, b) => b.entrance < a.entrance ? b : a),
    };
  }, [trafficData]);

  // ── Load all dashboard data ───────────────────────────────────────────────
  const loadAll = useCallback(async (days) => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, trafficRaw, deptData, authRaw, visitorStats] = await Promise.all([
        AnalyticsService.fetchMetrics(),
        AnalyticsService.fetchTraffic(days),
        AnalyticsService.fetchDepartments(),
        AnalyticsService.fetchAuthMethods(),
        AnalyticsService.fetchVisitorStats(),
      ]);

      setMetrics({
        totalStudents:         metricsData?.totalStudents   ?? 0,
        currentStudentsInside: metricsData?.onCampus        ?? metricsData?.currentStudentsInside ?? 0,
        totalEntries:          metricsData?.totalEntries    ?? 0,
        authSuccessRate:       metricsData?.authSuccessRate ?? 0,
        peakHour:              metricsData?.peakHour        ?? null,
      });
      setTrafficData(Array.isArray(trafficRaw) ? trafficRaw : []);
      setCollegeData(Array.isArray(deptData) ? deptData : []);
      setAuthData(Array.isArray(authRaw) ? authRaw : []);
      setVisitorData(visitorStats || []);
    } catch (err) {
      console.error('[Analytics] loadAll error:', err);
      setError('Failed to load analytics data. Please check your server connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(daysMap[timeRange] ?? 7);
    setCurrentPage(1);
  }, [timeRange, loadAll]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const indexOfFirst       = (currentPage - 1) * recordsPerPage;
  const currentCollegeData = collegeData.slice(indexOfFirst, indexOfFirst + recordsPerPage);
  const totalPages         = Math.ceil(collegeData.length / recordsPerPage);

  // ── REPORT GENERATION ─────────────────────────────────────────────────────
  const handleApplyFilters = async (filters) => {
    setAppliedFilters(filters);
    setIsGenerating(true);
    try {
      // Build API params
      const reportParams = {};
      if (filters.dateRange?.from) reportParams.from = toApiDate(filters.dateRange.from);
      if (filters.dateRange?.to)   reportParams.to   = toApiDate(filters.dateRange.to);
      if (filters.collegeDepartment) reportParams.dept = filters.collegeDepartment;
      if (filters.actionType && filters.actionType !== 'both') reportParams.actionType = filters.actionType;

      // Fetch all filtered datasets in parallel
      const [reportDataFromApi, logsData, filteredDeptRaw, filteredAuthRaw, filteredTrafficRaw, filteredVisitorRaw] =
        await Promise.all([
          AnalyticsService.fetchReport(reportParams),
          AnalyticsService.fetchLogs(reportParams),
          AnalyticsService.fetchDepartments(reportParams),
          AnalyticsService.fetchAuthMethods(reportParams),
          AnalyticsService.fetchTraffic(daysMap[timeRange] ?? 7, reportParams),
          AnalyticsService.fetchVisitorStats(reportParams),
        ]);

      // ── Normalise dept data so PDF always sees presentNow / totalEnrolled ──
      const normalisedDepts = normaliseDepts(filteredDeptRaw);
      const filteredCampusPopulation = normalisedDepts.reduce((s, d) => s + d.presentNow, 0);
      const filteredTotalEnrolled    = normalisedDepts.reduce((s, d) => s + d.totalEnrolled, 0);

      // ── Traffic insights from filtered data ───────────────────────────────
      const filteredTrafficArray = Array.isArray(filteredTrafficRaw) ? filteredTrafficRaw : [];
      const nonZero = filteredTrafficArray.filter(d => d.entrance > 0);
      const filteredInsights = nonZero.length > 0 ? {
        highest: nonZero.reduce((a, b) => b.entrance > a.entrance ? b : a),
        lowest:  nonZero.reduce((a, b) => b.entrance < a.entrance ? b : a),
      } : null;

      // ── Visitor chart data from filtered API response ──────────────────────
      let filteredVisitorChartData = visitorChartData; // fallback to dashboard
      if (Array.isArray(filteredVisitorRaw) && filteredVisitorRaw.length > 0) {
        const first = filteredVisitorRaw[0];
        if (first?.hasOwnProperty('action')) {
          filteredVisitorChartData = [
            { name: 'ENTRY', value: filteredVisitorRaw.filter(v => v.action?.toLowerCase() === 'entry').length, color: VISITOR_COLORS[0] },
            { name: 'EXIT',  value: filteredVisitorRaw.filter(v => v.action?.toLowerCase() === 'exit').length,  color: VISITOR_COLORS[1] },
          ];
        } else if (first?.hasOwnProperty('name')) {
          filteredVisitorChartData = filteredVisitorRaw.map((v, i) => ({ ...v, color: VISITOR_COLORS[i % VISITOR_COLORS.length] }));
        }
      }

      const completeReportData = {
        // Metrics — prefer filtered API response, fall back to dashboard
        totalStudents:   metrics.totalStudents,
        currentOnCampus: filteredCampusPopulation,   // ← FIXED: from filtered dept data
        totalEntries:    reportDataFromApi?.totalEntries    ?? metrics.totalEntries,
        authSuccessRate: reportDataFromApi?.authSuccessRate ?? metrics.authSuccessRate,
        peakHour:        reportDataFromApi?.peakHour        ?? metrics.peakHour,

        dateRange: filters.dateRange?.from && filters.dateRange?.to
          ? `${filters.dateRange.from} - ${filters.dateRange.to}`
          : 'All Time',

        // ── FIXED: pass normalised dept data so PDF field mapping works ──
        collegeData:     normalisedDepts,
        authData:        Array.isArray(filteredAuthRaw) ? filteredAuthRaw : authData,
        trafficData:     filteredTrafficArray,
        trafficInsights: filteredInsights,
        visitorData:     filteredVisitorChartData,

        // Logs
        entryLogs:  logsData.entryLogs  || [],
        exitLogs:   logsData.exitLogs   || [],
        studentLogs: [...(logsData.entryLogs || []), ...(logsData.exitLogs || [])],
      };

      console.log('[Analytics] completeReportData:', {
        currentOnCampus:      filteredCampusPopulation,
        filteredTotalEnrolled,
        deptCount:            normalisedDepts.length,
        entryLogs:            logsData.entryLogs?.length,
        exitLogs:             logsData.exitLogs?.length,
      });

      // Optional XML round-trip for XML/HTML download buttons
      const xmlString = reportToXml(completeReportData, reportParams);

      setFilteredReportData({ ...completeReportData, _xml: xmlString });
      setShowPdfPreview(true);
    } catch (err) {
      console.error('[Analytics] report fetch error:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF     = () => pdfRef.current?.generatePDF();
  const handleClosePdfPreview = () => { setShowPdfPreview(false); setFilteredReportData(null); };

  const handleDownloadHtml = async () => {
    if (!filteredReportData?._xml) { alert('No XML data. Generate a report first.'); return; }
    try {
      const html = await xmlToHtml(filteredReportData._xml);
      downloadHtml(html, `eems-report-${new Date().toISOString().slice(0, 10)}.html`);
    } catch (err) { alert('Failed to download HTML report'); }
  };

  const handleViewHtmlReport = async () => {
    if (!filteredReportData?._xml) { alert('No XML data. Generate a report first.'); return; }
    try { openXmlReportWindow(filteredReportData._xml); } catch (err) { alert('Failed to open report window'); }
  };

  // ── Pagination rendering ──────────────────────────────────────────────────
  const renderPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button key={i} className={`page-number ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}>{i}</button>
        );
      }
    } else {
      pages.push(<button key={1} className={`page-number ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>1</button>);
      let start = Math.max(2, currentPage - 1);
      let end   = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) end = Math.min(totalPages - 1, 4);
      if (currentPage >= totalPages - 1) start = Math.max(2, totalPages - 3);
      if (start > 2) pages.push(<span key="e1" className="ellipsis">...</span>);
      for (let i = start; i <= end; i++) {
        pages.push(<button key={i} className={`page-number ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>);
      }
      if (end < totalPages - 1) pages.push(<span key="e2" className="ellipsis">...</span>);
      pages.push(<button key={totalPages} className={`page-number ${currentPage === totalPages ? 'active' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>);
    }
    return pages;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="analytics-page">
      <header className="header-card">
        <h1>ANALYTICS &amp; REPORTS</h1>
        <p className="subtitle">Dashboard / Analytics &amp; Reports</p>
      </header>
      <hr className="header-divider" />

      <div className="analytics-container">
        <div className="metrics-row">
          <div className="filter-group button-group">
            <button
              className="generate-report-btn"
              onClick={() => setShowFilterPopup(true)}
              disabled={isGenerating}
              style={{
                background: 'linear-gradient(135deg, #01311d 0%, #548772 100%)',
                color: 'white', border: 'none', padding: '12px 24px',
                borderRadius: '8px', cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', fontSize: '14px', opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
          <div className="metric-card">
            <div className="metric-value">{metrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">TOTAL STUDENTS ENROLLED</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{totalCampusPopulation.toLocaleString()}</div>
            <div className="metric-label">CURRENT ON CAMPUS</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{(metrics.totalEntries || 0).toLocaleString()}</div>
            <div className="metric-label">TOTAL ENTRIES (TODAY)</div>
          </div>
        </div>

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
            {/* Daily Traffic */}
            <section className="chart-section daily-traffic-section">
              <div className="section-header">
                <h2>Daily Traffic Trend (Entries and Exits)</h2>
                <div className="time-range-selector">
                  {[['7days', '7 Days'], ['30days', '30 Days'], ['1year', '1 Year']].map(([v, l]) => (
                    <button key={v} className={`range-btn ${timeRange === v ? 'active' : ''}`}
                      onClick={() => setTimeRange(v)}>{l}</button>
                  ))}
                </div>
              </div>
              {trafficData.length > 0 ? (
                <>
                  <TrafficChart data={trafficData} />
                  {insights && (
                    <div className="traffic-insights-container">
                      <div className="insights">
                        <h4>Insights:</h4>
                        <ul>
                          <li><strong>Highest traffic:</strong> {insights.highest.date} ({insights.highest.entrance.toLocaleString()} entries)</li>
                          <li><strong>Lowest traffic:</strong>  {insights.lowest.date}  ({insights.lowest.entrance.toLocaleString()} entries)</li>
                        </ul>
                      </div>
                      <div className="traffic-legend">
                        <h4>Legend:</h4>
                        <div className="legend-items">
                          <div className="legend-item-traffic"><span className="legend-color entrance"></span><span className="legend-label">Entrance</span></div>
                          <div className="legend-item-traffic"><span className="legend-color exit"></span><span className="legend-label">Exit</span></div>
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
              {/* Auth chart */}
              <section className="chart-section">
                <div className="section-header">
                  <h2>Authentication Method Usage</h2>
                  <button className="info-btn">ℹ</button>
                </div>
                {authData.length > 0 ? (
                  <>
                    <AuthenticationChart data={authChartData} />
                    <div className="table-container small-table">
                      <table className="analytics-table small-table">
                        <thead>
                          <tr><th>No.</th><th>Method</th><th>Attempts</th><th>Success Rate</th></tr>
                        </thead>
                        <tbody>
                          {authData.map((auth, i) => (
                            <tr key={auth.id || i}>
                              <td>{i + 1}</td>
                              <td>{auth.method || auth.authentication_method}</td>
                              <td>{(auth.attempts || auth.total_attempts || 0).toLocaleString()}</td>
                              <td>{auth.successRate || auth.success_rate || '0'}%</td>
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

              {/* Visitor chart */}
              <section className="chart-section">
                <div className="section-header">
                  <h2>Visitor Entry and Exit</h2>
                  <button className="info-btn">ℹ</button>
                </div>
                {visitorChartData.length > 0 && visitorChartData.some(v => v.value > 0)
                  ? <VisitorChart data={visitorChartData} />
                  : <p className="no-data-msg">No visitor data available.</p>
                }
              </section>
            </div>

            {/* Department distribution */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Department Distribution</h2>
                <button className="info-btn">ℹ</button>
              </div>
              {collegeData.length > 0 ? (
                <>
                  <CollegeDistributionChart data={collegeData} />
                  <div className="campus-summary" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '20px' }}>
                    <div style={{ flex: 1, padding: '15px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                      <strong style={{ fontSize: '24px', color: '#01311d' }}>
                        {collegeData.reduce((s, d) => s + (d.totalStudents ?? d.totalEnrolled ?? 0), 0).toLocaleString()}
                      </strong>
                      <p style={{ margin: '5px 0 0', color: '#666' }}>Total Enrolled Students</p>
                    </div>
                    <div style={{ flex: 1, padding: '15px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                      <strong style={{ fontSize: '24px', color: '#d99201' }}>{totalCampusPopulation.toLocaleString()}</strong>
                      <p style={{ margin: '5px 0 0', color: '#666' }}>Currently on Campus</p>
                    </div>
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
                          <tr key={college.fullCollegeName || college.collegeName || i}>
                            <td>{indexOfFirst + i + 1}</td>
                            <td title={college.fullCollegeName || college.collegeName}>
                              {college.fullCollegeName || college.collegeName || college.dept_name}
                            </td>
                            <td style={{ fontWeight: 'bold', color: '#d99201' }}>
                              {(college.presenceNow ?? college.presentNow ?? 0).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 'bold', color: '#01311d' }}>
                              {(college.totalStudents ?? college.totalEnrolled ?? 0).toLocaleString()}
                            </td>
                            <td>{college.percentage ?? college.percentageOfCampus ?? '0'}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button className="pagination-button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>← Previous</button>
                      <div className="page-numbers">{renderPageNumbers()}</div>
                      <button className="pagination-button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next →</button>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-data-msg">No department data available. Students need to be on campus.</p>
              )}
            </section>
          </>
        )}
      </div>

      {/* Filter popup */}
      {showFilterPopup && (
        <GenerateReportFilter
          onClose={() => setShowFilterPopup(false)}
          onGenerate={handleApplyFilters}
        />
      )}

      {/* PDF preview modal */}
      {showPdfPreview && filteredReportData && (
        <div className="modal-overlay" onClick={handleClosePdfPreview}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pdf-preview-modal" onClick={e => e.stopPropagation()}
            style={{ borderRadius: '12px', width: '90%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'white' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#01311d' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Report Preview &amp; Export</h2>
              <button onClick={handleClosePdfPreview} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#fff' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <GenerateReportPdf ref={pdfRef} reportData={filteredReportData} filters={appliedFilters} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap', padding: '16px 20px', borderTop: '1px solid #e0e0e0' }}>
              <button onClick={handleClosePdfPreview} style={{ padding: '10px 20px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
              <button onClick={handleViewHtmlReport}  style={{ padding: '10px 20px', backgroundColor: '#4a90d9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>View HTML</button>
              <button onClick={handleDownloadHtml}    style={{ padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Download HTML</button>
              {filteredReportData?._xml && (
                <button onClick={() => downloadXml(filteredReportData._xml, `eems-report-${new Date().toISOString().slice(0, 10)}.xml`)}
                  style={{ padding: '10px 20px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Download XML</button>
              )}
              <button onClick={handleDownloadPDF} style={{ padding: '10px 20px', backgroundColor: '#548772', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Download PDF</button>
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
  if (!data || data.length === 0) return <p className="no-data-msg">No traffic data available</p>;
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={sorted} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <defs>
            <linearGradient id="entranceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#58761B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#58761B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#D99201" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D99201" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
          <YAxis stroke="#666" tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #01311d', borderRadius: '4px' }} />
          <Legend />
          <Area type="monotone" dataKey="entrance" name="Entrances" stroke="#58761B" strokeWidth={2} fill="url(#entranceGradient)" dot={{ fill: '#58761B', r: 3 }} />
          <Area type="monotone" dataKey="exit"     name="Exits"     stroke="#D99201" strokeWidth={2} fill="url(#exitGradient)"     dot={{ fill: '#D99201', r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CollegeDistributionChart({ data }) {
  if (!data || data.length === 0) return <p className="no-data-msg">No department data available</p>;
  const chart = [...data]
    .sort((a, b) => (b.presenceNow ?? b.presentNow ?? 0) - (a.presenceNow ?? a.presentNow ?? 0))
    .slice(0, 10)
    .map(d => ({ ...d, presenceNow: d.presenceNow ?? d.presentNow ?? 0 }));
  return (
    <div className="chart-container college-chart">
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={chart} layout="vertical" margin={{ top: 10, right: 30, left: 200, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="fullCollegeName" stroke="#666" width={180} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, n) => [v?.toLocaleString() || '0', n]} />
          <Legend />
          <Bar dataKey="presenceNow" fill="#d99201" name="Currently on Campus" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AuthenticationChart({ data }) {
  if (!data || data.length === 0) return <p className="no-data-msg">No authentication data available</p>;
  return (
    <div className="chart-container pie-chart">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" labelLine outerRadius={100} dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
            {data.map((_, i) => <Cell key={i} fill={AUTH_COLORS[i % AUTH_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function VisitorChart({ data }) {
  const chart = data.filter(i => i.value > 0);
  if (chart.length === 0) return <p className="no-data-msg">No visitor data available</p>;
  return (
    <div className="chart-container pie-chart">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chart} cx="50%" cy="50%" outerRadius={100} dataKey="value"
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}>
            {chart.map((entry, i) => <Cell key={i} fill={entry.color || VISITOR_COLORS[i % VISITOR_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [`${v} visitors`, n]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Analytics;