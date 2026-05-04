// Dashboard.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  ResponsiveContainer,
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  PieChart as RePieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import "../../css/Dashboard.css";
import "../../css/SettingsDisplay.css";
import {
  FaBook, FaQuestionCircle, FaBolt, FaHeadset,
  FaPlusCircle, FaChartBar, FaDownload,
  FaEnvelope, FaCheckCircle, FaClock,
  FaCode, FaCalendar, FaCircle, FaSync,
  FaUserTie, FaChartLine, FaTimes,
} from "react-icons/fa";
import * as timeUtils from "../../utils/timeUtils";
import GenerateReportFilter from "../../components/GenerateReportFilter";
import SettingsDisplay from "../../components/SettingsDisplay";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CLASSES
// ─────────────────────────────────────────────────────────────────────────────

class TimeService {
  static format(date) {
    return timeUtils.formatPhilippineTime(date);
  }
}

class DashboardService {
  /**
   * Fetches key metrics for today:
   * - onCampus: students with last action = ENTRY today
   * - totalEntries: all entry events today
   * - authSuccessRate: facial recognition success % today
   * - peakHour: busiest entry hour today
   * - totalStudents: total active enrolled students
   */
  static async fetchMetrics() {
    try {
      const res  = await fetch("/api/analytics/metrics");
      if (!res.ok) {
        const text = await res.text();
        console.error('[DashboardService.fetchMetrics] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      console.log('[DashboardService.fetchMetrics] Success:', data);
      return {
        onCampus:        data.onCampus        ?? 0,
        totalEntries:    data.totalEntries    ?? 0,
        authSuccessRate: data.authSuccessRate ?? 0,
        peakHour:        data.peakHour        ?? null,
        totalStudents:   data.totalStudents   ?? 0,
        visitorsOnCampus: data.visitorsOnCampus ?? 0,
      };
    } catch (err) {
      console.error('[DashboardService.fetchMetrics] FAILED:', err.message);
      return { onCampus: 0, totalEntries: 0, authSuccessRate: 0, peakHour: null, totalStudents: 0 };
    }
  }

  /**
   * Fetches daily traffic for the last N days.
   * Returns: [{ date: "YYYY-MM-DD", entrance: N, exit: N }, ...]
   * Backend fills in missing days with 0s so the chart is always continuous.
   */
  static async fetchTraffic(days = 7) {
    try {
      const res = await fetch(`/api/analytics/traffic?days=${days}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('[DashboardService.fetchTraffic] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[DashboardService.fetchTraffic] Success:', data.length, 'entries');
      return data;
    } catch (err) {
      console.error('[DashboardService.fetchTraffic] FAILED:', err.message);
      return [];
    }
  }

  /**
   * Fetches current on-campus students grouped by college department.
   * Returns: [{ name: "College of Computer Studies", value: 12 }, ...]
   */
  static async fetchColleges() {
    try {
      const res = await fetch("/api/analytics/college-distribution");
      if (!res.ok) {
        const text = await res.text();
        console.error('[DashboardService.fetchColleges] HTTP Error:', res.status, text.substring(0, 200));
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[DashboardService.fetchColleges] Success:', data.length, 'colleges');
      return data;
    } catch (err) {
      console.error('[DashboardService.fetchColleges] FAILED:', err.message);
      return [];
    }
  }

  static trafficSummary(data) {
    if (!data || data.length === 0) return null;
    const totalEntries = data.reduce((s, d) => s + (d.entrance ?? 0), 0);
    const totalExits   = data.reduce((s, d) => s + (d.exit    ?? 0), 0);
    const peakDay      = data.reduce((best, d) =>
      (d.entrance ?? 0) > (best.entrance ?? 0) ? d : best, data[0]);
    return { totalEntries, totalExits, peakDay: peakDay.date, peakEntries: peakDay.entrance ?? 0 };
  }

  static trafficDateRange(days) {
    return timeUtils.formatDateRange(days);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  const [serverTime,  setServerTime]  = useState(null);
  const [metrics,     setMetrics]     = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [collegeData, setCollegeData] = useState(null);
  const [trafficDays, setTrafficDays] = useState(7);
  const [chartKey,    setChartKey]    = useState(0);
  const [loadError,   setLoadError]   = useState(false);

  // Modal states
  const [showReportModal,   setShowReportModal]   = useState(false);
  const [showVisitorRecords, setShowVisitorRecords] = useState(false);
  const [visitorRecords,    setVisitorRecords]    = useState([]);
  const [visitorLoading,    setVisitorLoading]    = useState(false);
  const [showAnalyticsInfo, setShowAnalyticsInfo] = useState(false);
  const [showSupportModal,  setShowSupportModal]  = useState(false);
  const [showGuideModal,    setShowGuideModal]    = useState(false);
  const [selectedGuide,     setSelectedGuide]     = useState(null);

  // ── Server clock ────────────────────────────────────────────────────────
  useEffect(() => {
    // Use local time - no backend dependency
    console.log('⏰ [Dashboard] Initializing local clock');
    setServerTime(new Date());
    
    // Update time every second
    const tick = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    
    return () => clearInterval(tick);
  }, []);

  // ── Initial data load ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      DashboardService.fetchMetrics(),
      DashboardService.fetchColleges(),
    ]).then(([m, c]) => {
      setMetrics(m);
      setCollegeData(c);
    }).catch(() => setLoadError(true));
  }, []);

  // ── Traffic re-fetch when day range changes ─────────────────────────────
  useEffect(() => {
    DashboardService.fetchTraffic(trafficDays).then(data => {
      setTrafficData(data);
      setChartKey(k => k + 1);
    });
  }, [trafficDays]);

  // ── Window resize → force chart re-render ──────────────────────────────
  useEffect(() => {
    const onResize = () => setChartKey(k => k + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const formatted      = serverTime ? TimeService.format(serverTime) : null;
  const summary        = useMemo(() => DashboardService.trafficSummary(trafficData), [trafficData]);
  const dateRangeLabel = useMemo(() => DashboardService.trafficDateRange(trafficDays), [trafficDays]);

  // Format peak hour for display  e.g. hour=8 → "8:00 AM"
  const peakHourLabel = useMemo(() => {
    return timeUtils.formatPeakHour(metrics?.peakHour);
  }, [metrics]);

  if (!formatted) return null;

  return (
    <div className="dashboard-wrapper">
      <div className="dashb">
        {/* ── HEADER ── */}
        <header className="campus-header">
          <div className="logo-area">
            <img className="seal-placeholder" src="../logoplp.gif" alt="PLP Seal" />
            <div className="university-info">
              <h1>Pamantasan ng Lungsod ng Pasig</h1>
              <p>ENTRANCE AND EXIT MONITORING SYSTEM</p>
            </div>
          </div>
          <div className="date-and-time">
            <div className="date-section">
              <span className="day">{formatted.day}</span>
              <span className="date">{formatted.date}</span>
            </div>
            <div className="time">{formatted.time}</div>
          </div>
        </header>

        {/* ── SETTINGS DISPLAY (Academic Year & Gate Settings) ── */}
        <SettingsDisplay />

        {/* ── METRIC CARDS ── */}
        <section className="metrics-row">
          <MetricCard
            title="Auth Success Rate"
            value={metrics?.authSuccessRate != null ? `${metrics.authSuccessRate}%` : "—"}
            subtitle="FACIAL RECOGNITION"
            tooltip="Percentage of successful facial recognition verifications today."
          />
          <MetricCard
            title="Currently On Campus"
            value={metrics?.onCampus ?? "—"}
            subtitle="STUDENTS"
            tooltip="Total students currently inside the campus based on active entry records without a corresponding exit."
          />
          <MetricCard
            title="Today's Total Entries"
            value={metrics?.totalEntries ?? "—"}
            subtitle="ENTRIES"
            tooltip="Counts all successful student entry events recorded for the current day."
          />
          <MetricCard
            title="Visitors On Campus"
            value={metrics?.visitorsOnCampus ?? "—"}
            subtitle="ACTIVE VISITORS"
            tooltip="Visitors currently inside the campus based on latest entry without exit."
          />
        </section>

        {/* ── PEAK HOUR BANNER (only shows if there is data) ── */}
        {peakHourLabel && (
          <div className="peak-hour-banner">
            <FaBolt style={{ marginRight: 6 }} />
            Peak entry hour today: <strong>{peakHourLabel}</strong>
          </div>
        )}

        {/* ── LOAD ERROR ── */}
        {loadError && (
          <div className="load-error-banner">
            ⚠ Could not load some dashboard data. Check your server connection.
          </div>
        )}

        {/* ── CHARTS ── */}
        <section className="charts-grid">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Daily Traffic Trend</h3>
              <div className="chart-controls">
                <select value={trafficDays} onChange={e => setTrafficDays(Number(e.target.value))}>
                  <option value={7}>7 DAYS</option>
                  <option value={30}>30 DAYS</option>
                </select>
                <InfoIcon tooltip="Number of student entries and exits per day within the selected range." />
              </div>
            </div>
            {dateRangeLabel && <div className="chart-date-range">{dateRangeLabel}</div>}
            <div className="chart-area-wrap" style={{ minHeight: 300, width: "100%" }}>
              <TrafficAreaChart key={`traffic-${chartKey}`} data={trafficData} />
            </div>
            {summary && (
              <div className="chart-summary">
                <span>Total: <strong>{summary.totalEntries.toLocaleString()} entries</strong></span>
                <span className="summary-separator">·</span>
                <span><strong>{summary.totalExits.toLocaleString()} exits</strong></span>
                <span className="summary-separator">·</span>
                <span>Peak: <strong>{summary.peakDay} ({summary.peakEntries.toLocaleString()} entries)</strong></span>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>College Department Distribution</h3>
              <InfoIcon tooltip="Proportion of students currently on campus by college department." />
            </div>
            <div className="chart-area-wrap" style={{ minHeight: 300, width: "100%" }}>
              <CollegePieChart key={`pie-${chartKey}`} data={collegeData} />
            </div>
          </div>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <section className="quick-actions-section">
          <div className="section-header-wrapper">
            <h3><FaBolt /> Quick Actions</h3>
          </div>
          <div className="actions-grid">
            <button className="action-card success" onClick={() => setShowReportModal(true)}>
              <span className="action-icon"><FaChartBar /></span>
              <div className="action-content">
                <span className="action-title">Generate Report</span>
                <span className="action-desc">Export analytics</span>
              </div>
            </button>
            <button className="action-card" onClick={() => {
              setVisitorLoading(true);
              setVisitorRecords([]);
              setShowVisitorRecords(true);
              fetch('/api/analytics/records')
                .then((response) => {
                  if (!response.ok) {
                    return response.text().then((text) => { throw new Error(text || `HTTP ${response.status}`); });
                  }
                  return response.json();
                })
                .then((data) => {
                  setVisitorRecords(Array.isArray(data.visitors) ? data.visitors : []);
                })
                .catch((err) => {
                  console.error('Error loading visitor records:', err);
                  setVisitorRecords([]);
                })
                .finally(() => setVisitorLoading(false));
            }}>
              <span className="action-icon"><FaUserTie /></span>
              <div className="action-content">
                <span className="action-title">Show Visitor Records</span>
                <span className="action-desc">Visitor entry/exit logs</span>
              </div>
            </button>
            <button className="action-card info" onClick={() => setShowAnalyticsInfo(true)}>
              <span className="action-icon"><FaChartLine /></span>
              <div className="action-content">
                <span className="action-title">View Analytics</span>
                <span className="action-desc">Detailed insights</span>
              </div>
            </button>
            <button className="action-card warning" onClick={() => setShowSupportModal(true)}>
              <span className="action-icon"><FaEnvelope /></span>
              <div className="action-content">
                <span className="action-title">Contact Support</span>
                <span className="action-desc">24/7 assistance</span>
              </div>
            </button>
          </div>
        </section>

        {/* ── QUICK GUIDE ── */}
        <section className="quick-guide-section">
          <h3><FaBook /> Quick Guide &amp; FAQs</h3>
          <div className="guide-grid">
            {[
              { 
                icon: <FaBook />,          
                title: "Getting Started",
                overview: "Learn how to log in, navigate the dashboard, and access key features.",
                items: [
                  "Log in using your PLP credentials (username and password)",
                  "Navigate to 'Dashboard' to view real-time campus traffic and key metrics",
                  "Use 'Records' tab to view detailed student and visitor entry/exit logs",
                  "Access 'Settings' to configure system preferences and user roles",
                  "Generate monthly reports from the 'Generate Report' quick action button"
                ] 
              },
              { 
                icon: <FaQuestionCircle />, 
                title: "Frequently Asked",
                overview: "Answers to common questions about adding students, troubleshooting, and support.",
                items: [
                  "Q: How to add new students? A: Go to Students page and click 'Import Students' or 'Register Student' to add records manually or in bulk via CSV.",
                  "Q: What if facial recognition fails? A: The system automatically falls back to QR code scanning or manual entry. Ensure proper lighting and camera calibration.",
                  "Q: How to export reports? A: Use 'Generate Report' action, select date range and filters, then choose PDF or CSV format to download.",
                  "Q: Who to contact for support? A: Contact PLP IT Helpdesk at ext. 1234 or email ithelpdesk@plp.edu.ph (8AM-5PM Mon-Fri).",
                  "Q: Can I view historical data? A: Yes, use the Records page with date filters to view data from any date range.",
                  "Q: How often is data synced? A: Real-time data syncs every 5 seconds. Check 'Last Sync' time in dashboard footer."
                ] 
              },
              { 
                icon: <FaBolt />,           
                title: "Quick Tips",
                overview: "Practical tips to maximize efficiency using filters, search, and data export tools.",
                items: [
                  "Use the search bar in Records to quickly find a specific student or visitor by name or ID",
                  "Apply multiple filters (Year Level, Department, Action, Date) to narrow down results efficiently",
                  "Hover over metric cards in the dashboard to see detailed tooltips explaining each metric",
                  "Click on the traffic chart to expand and see daily traffic trends for up to 30 days",
                  "Reset filters with one click using the 'Reset Filters' button when you need to start over",
                  "Use the college distribution pie chart to monitor student distribution across departments",
                  "Check the peak entry hour banner to identify busiest times for resource planning",
                  "Export data as CSV from reports for further analysis in Excel or other tools"
                ] 
              },
              { 
                icon: <FaHeadset />,        
                title: "Support Information",
                overview: "Contact details for IT support, technical issues, and after-hours emergencies.",
                items: [
                  "📞 Main Support Line: (+63) 2-1234-5678 ext. 1234",
                  "✉️ General Email: ithelpdesk@plp.edu.ph",
                  "⏰ Business Hours: Monday-Friday, 8:00 AM - 5:00 PM",
                  "🚨 After-Hours Emergency: 0917-123-4567",
                  "📧 Facial Recognition Issues: fr_support@plp.edu.ph",
                  "📧 System Access/Login Problems: sysaccess@plp.edu.ph",
                  "📧 Reports & Analytics: analytics@plp.edu.ph",
                  "💡 For faster resolution, provide your issue details and system version (shown in dashboard footer)"
                ] 
              },
            ].map(({ icon, title, overview, items }) => (
              <div key={title} className="guide-card" onClick={() => {
                setSelectedGuide({ title, items });
                setShowGuideModal(true);
              }} style={{ cursor: 'pointer' }}>
                <div className="guide-icon">{icon}</div>
                <h4>{title}</h4>
                <p className="guide-overview">{overview}</p>
                <div className="guide-preview">
                  <FaCircle style={{ fontSize: '0.5rem', marginRight: '6px' }} />
                  <span>Click for details</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="dashboard-footer">
          <div className="footer-left">
            <span className="system-status"><span className="status-dot green"></span><FaCheckCircle /> System Online</span>
            <span className="separator">|</span>
            <span><FaClock /> Last Sync: {formatted.time}</span>
          </div>
          <div className="footer-right">
            <span><FaCalendar /> 2026 PLP Entrance Exit Monitoring System</span>
            <span className="separator">|</span>
            <span><FaCode /> v1.1.0</span>
            <span className="separator">|</span>
            <span><FaSync /> Build: 03.01</span>
          </div>
        </footer>

      </div>

      {/* ── MODALS ── */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generate Report</h2>
              <button className="modal-close" onClick={() => setShowReportModal(false)}><FaTimes /></button>
            </div>
            <GenerateReportFilter onClose={() => setShowReportModal(false)} />
          </div>
        </div>
      )}

      {showVisitorRecords && (
        <div className="modal-overlay" onClick={() => setShowVisitorRecords(false)}>
          <div className="modal-content visitor-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Visitor Records</h2>
              <button className="modal-close" onClick={() => setShowVisitorRecords(false)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              {visitorLoading ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading visitor records...</p>
              ) : visitorRecords.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No visitor records found.</p>
              ) : (
                <div className="visitor-records-table-wrapper">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="visitor-records-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>ID / Plate</th>
                          <th>Email</th>
                          <th>Reason</th>
                          <th>Logged At</th>
                          <th>Action</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorRecords.map((record, idx) => (
                          <tr key={idx}>
                            <td>{record.name || record.visitor_name || '—'}</td>
                            <td>{record.visitorId || record.id_number || record.plate_number || '—'}</td>
                            <td>{record.email || '—'}</td>
                            <td>{record.visitReason || record.reason || record.otherReason || '—'}</td>
                            <td className="time-cell">{record.timestamp ? new Date(record.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila' }) : '—'}</td>
                            <td>{record.actionLabel || record.action || '—'}</td>
                            <td>
                              <span className={`status-badge ${record.action === 'EXIT' ? 'exited' : 'active'}`}>
                                {record.action === 'EXIT' ? 'Exited' : record.action === 'ENTRY' ? 'Entered' : 'Recorded'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAnalyticsInfo && (
        <div className="modal-overlay" onClick={() => setShowAnalyticsInfo(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Analytics Overview</h2>
              <button className="modal-close" onClick={() => setShowAnalyticsInfo(false)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <h3>Current Campus Status</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li><strong>Students On Campus:</strong> {metrics?.onCampus ?? 0}</li>
                <li><strong>Visitors On Campus:</strong> {metrics?.visitorsOnCampus ?? 0}</li>
                <li><strong>Today's Entries:</strong> {metrics?.totalEntries ?? 0}</li>
                <li><strong>Auth Success Rate:</strong> {metrics?.authSuccessRate ?? 0}%</li>
                <li><strong>Peak Entry Hour:</strong> {peakHourLabel || 'Not available'}</li>
                <li><strong>Total Students:</strong> {metrics?.totalStudents ?? 0}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {showSupportModal && (
        <div className="modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Contact Support</h2>
              <button className="modal-close" onClick={() => setShowSupportModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <h3>PLP IT Helpdesk</h3>
              <p><strong>📞 Hotline:</strong> (+63) 2-1234-5678 ext. 1234</p>
              <p><strong>✉️ Email:</strong> ithelpdesk@plp.edu.ph</p>
              <p><strong>⏰ Operating Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</p>
              <p><strong>🚨 Emergency/After Hours:</strong> 0917-123-4567</p>
              <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #ddd' }} />
              <h4>Specialized Support Contacts:</h4>
              <ul>
                <li><strong>Facial Recognition Issues:</strong> fr_support@plp.edu.ph</li>
                <li><strong>System Access/Login:</strong> sysaccess@plp.edu.ph</li>
                <li><strong>Reports & Data Export:</strong> analytics@plp.edu.ph</li>
                <li><strong>Student Records:</strong> records@plp.edu.ph</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && selectedGuide && (
        <div className="modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="modal-content guide-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedGuide.title}</h2>
              <button className="modal-close" onClick={() => setShowGuideModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-body guide-body">
              <ul className="guide-items-list">
                {selectedGuide.items.map((item, idx) => (
                  <li key={idx}><span className="guide-item-number">{idx + 1}.</span> {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function InfoIcon({ tooltip }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const enter = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setCoords({ top: r.top + window.scrollY - 8, left: r.left + window.scrollX + r.width / 2 });
    }
    setVisible(true);
  }, []);

  return (
    <>
      <span ref={ref} className="info-icon" onMouseEnter={enter} onMouseLeave={() => setVisible(false)}>i</span>
      {visible && ReactDOM.createPortal(
        <div className="tooltip-portal" role="tooltip" style={{
          position: "fixed", top: coords.top - window.scrollY, left: coords.left,
          transform: "translate(-50%,-100%)", zIndex: 99999, pointerEvents: "none",
        }}>
          {tooltip}<span className="tooltip-arrow" />
        </div>,
        document.body
      )}
    </>
  );
}

function MetricCard({ title, value, subtitle, tooltip }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        <InfoIcon tooltip={tooltip} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{subtitle}</div>
    </div>
  );
}

const TRAFFIC_COLORS = { entries: "#58761B", exits: "#D99201" };
const PIE_COLORS     = ["#5e5e5e","#54325f","#da719e","#ffeb36","#d11100","#0023be","#ff8800"];

function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, entrance, exit } = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{date}</div>
      <div className="tt-entries">Entries: {(entrance ?? 0).toLocaleString()}</div>
      <div className="tt-exits">Exits: {(exit ?? 0).toLocaleString()}</div>
    </div>
  );
}

function TrafficAreaChart({ data }) {
  if (!data || data.length === 0) return <p className="chart-placeholder">No traffic data available yet.</p>;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <defs>
            <linearGradient id="gEntries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="gExits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} width={45} allowDecimals={false} />
          <ReTooltip content={<TrafficTooltip />} />
          <ReLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          <Area
            type="monotone" dataKey="entrance" name="Entries"
            stroke={TRAFFIC_COLORS.entries} strokeWidth={2}
            fill="url(#gEntries)" fillOpacity={0.6}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
          <Area
            type="monotone" dataKey="exit" name="Exits"
            stroke={TRAFFIC_COLORS.exits} strokeWidth={2}
            fill="url(#gExits)" fillOpacity={0.6}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CollegePieChart({ data }) {
  if (!data || data.length === 0) return <p className="chart-placeholder">No campus population data yet.</p>;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="pie-wrap">
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data} cx="50%" cy="50%"
              innerRadius={40} outerRadius={80}
              paddingAngle={2} dataKey="value" label={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <ReTooltip
              formatter={(v, n) => [`${v.toLocaleString()} (${((v/total)*100).toFixed(1)}%)`, n]}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <ul className="pie-legend">
        {data.map((d, i) => (
          <li key={d.name}>
            <span className="swatch" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="legend-text">
              {d.name} — {d.value.toLocaleString()} ({((d.value/total)*100).toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;