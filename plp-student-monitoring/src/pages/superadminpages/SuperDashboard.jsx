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
import {
  FaBook, FaQuestionCircle, FaBolt, FaHeadset,
  FaChartBar, FaCog, FaEnvelope, FaCheckCircle,
  FaClock, FaCode, FaCalendar, FaCircle, FaSync,
  FaTachometerAlt, FaBell, FaUsers, FaClipboardList,
  FaUserPlus, FaUserEdit, FaUserMinus, FaGraduationCap,
  FaBuilding, FaLayerGroup, FaExclamationCircle,
  FaInfoCircle, FaSchool, FaDoorOpen,
  FaEllipsisH,
} from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

class TimeService {
  static async fetchServerTime() {
    const res = await fetch("http://localhost:5000/api/time");
    const data = await res.json();
    return new Date(data.serverTime);
  }

  static format(date) {
    const day = date
      .toLocaleDateString("en-PH", { weekday: "long" })
      .toUpperCase();
    const dateStr = date.toLocaleDateString("en-PH", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { day, date: dateStr, time: timeStr };
  }
}

class DashboardService {
  static async fetchMetrics() {
    try {
      const res = await fetch("http://localhost:5000/api/analytics/metrics");
      if (!res.ok) throw new Error("no metrics");
      const json = await res.json();
      // Accept direct payload or envelope
      return json.data ?? json.metrics ?? json;
    } catch {
      return {
        onCampus: 1000,
        totalEntries: 1000,
        authSuccessRate: 80,
        totalUsers: 10,
        totalSuperAdmins: 1,
        totalEEMSAdmins: 2,
        totalEAMSAdmins: 3,
        totalStudents: 3000,
        totalDepartments: 7,
        totalPrograms: 12,
        archivedUsers: 0,
        archivedStudents: 0,
        archivedDepartments: 0,
        archivedPrograms: 0,
      };
    }
  }

  static async fetchTraffic(days = 7) {
    const sampleAll = [
      { day: "MON", entries: 150,  exits: 140  },
      { day: "TUE", entries: 180,  exits: 170  },
      { day: "WED", entries: 1240, exits: 1190 },
      { day: "THU", entries: 900,  exits: 850  },
      { day: "FRI", entries: 1100, exits: 1080 },
      { day: "SAT", entries: 2150, exits: 2100 },
      { day: "SUN", entries: 1820, exits: 1790 },
    ];
    return sampleAll.slice(0, days);
  }

  static async fetchColleges() {
    return [
      { name: "College of Computer Studies", value: 2000 },
      { name: "College of Arts and Sciences", value: 1000 },
      { name: "College of Nursing", value: 1000 },
      { name: "College of Business and Accountancy", value: 1000 },
      { name: "College of International Hospitality Management", value: 2000 },
      { name: "College of Education", value: 3000 },
      { name: "College of Engineering", value: 2500 },
    ];
  }

  static trafficSummary(data) {
    if (!data || data.length === 0) return null;
    const totalEntries = data.reduce((s, d) => s + (d.entries ?? 0), 0);
    const totalExits   = data.reduce((s, d) => s + (d.exits   ?? 0), 0);
    const peak         = data.reduce((a, b) => (b.entries > a.entries ? b : a));
    return { totalEntries, totalExits, peakDay: peak.day, peakEntries: peak.entries };
  }

  static trafficDateRange(days) {
    const end   = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }

  static async fetchNotifications() {
    try {
      const res = await fetch("http://localhost:5000/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      return json.data ?? json.notifications ?? json;
    } catch (err) {
      console.error('[DashboardService] fetchNotifications failed:', err.message);
      return [];
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PANEL
// ─────────────────────────────────────────────────────────────────────────────

function NotificationsPanel({ notifications }) {
  const unreadCount = notifications.filter((n) => n.unread).length;
  const iconMap = {
    exclamation: <FaExclamationCircle />,
    calendar: <FaCalendar />,
    check: <FaCheckCircle />,
    info: <FaInfoCircle />,
    envelope: <FaEnvelope />,
  };

  return (
    <div className="panel-card notif-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon-wrap notif-icon-wrap">
            <FaBell />
          </span>
          <h3 className="panel-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>

      {/* List */}
      <ul className="notif-list">
        {notifications.length === 0 ? (
          <li className="notif-empty-item">No notifications available.</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`}>
              <span
                className={`notif-type-bar type-${n.type}`}
                aria-hidden="true"
              />
              <span className={`notif-dot-icon type-${n.type}`}>
                {iconMap[n.icon] ?? <FaBell />}
              </span>
              <div className="notif-body">
                <p className="notif-title">{n.title}</p>
                <p className="notif-detail">{n.detail}</p>
                <span className="notif-time">{n.time}</span>
              </div>
              {n.unread && <span className="notif-unread-dot" aria-label="Unread" />}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS (updated)
// ─────────────────────────────────────────────────────────────────────────────

function QuickActionsSection() {
  const actions = [
    {
      variant: "primary",
      icon: <FaUsers />,
      title: "Manage Users",
      desc: "Add, edit & archive users",
      onClick: () => console.log("Manage Users"),
    },
    {
      variant: "success",
      icon: <FaChartBar />,
      title: "Generate Reports",
      desc: "Export analytics & summaries",
      onClick: () => console.log("Generate Reports"),
    },
    {
      variant: "warning",
      icon: <FaCog />,
      title: "System Settings",
      desc: "Configure gate & academic year settings",
      onClick: () => console.log("System Settings"),
    },
    {
      variant: "info",
      icon: <FaDoorOpen />,
      title: "Entry–Exit Records",
      desc: "View all campus logs",
      onClick: () => console.log("Entry-Exit Records"),
    },
  ];

  return (
    <section className="quick-actions-section-superadmin">
      <div className="section-header-wrapper">
        <h3>
          <FaBolt /> Quick Actions
        </h3>
        <span className="section-badge">{actions.length} available</span>
      </div>

      <div className="actions-grid">
        {actions.map((a) => (
          <button
            key={a.title}
            className={`action-card ${a.variant}`}
            onClick={a.onClick}
          >
            <span className="action-icon">{a.icon}</span>
            <div className="action-content">
              <span className="action-title">{a.title}</span>
              <span className="action-desc">{a.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function SuperDashboard() {
  const [serverTime,      setServerTime]      = useState(null);
  const [metrics,         setMetrics]         = useState(null);
  const [trafficData,     setTrafficData]     = useState(null);
  const [collegeData,     setCollegeData]     = useState(null);
  const [notifications,   setNotifications]   = useState([]);
  const [trafficDays,     setTrafficDays]     = useState(7);
  const [chartKey,        setChartKey]        = useState(0);

  // Clock
  useEffect(() => {
    let baseTime, tickInterval, syncInterval;
    const syncClock = async () => {
      try {
        baseTime = await TimeService.fetchServerTime();
      } catch {
        baseTime = new Date();
      }
      setServerTime(new Date(baseTime));
      clearInterval(tickInterval);
      tickInterval = setInterval(() => {
        baseTime = new Date(baseTime.getTime() + 1000);
        setServerTime(new Date(baseTime));
      }, 1000);
    };
    syncClock();
    syncInterval = setInterval(syncClock, 60_000);
    return () => { clearInterval(tickInterval); clearInterval(syncInterval); };
  }, []);

  // Data
  useEffect(() => {
    DashboardService.fetchMetrics().then((m) => { console.log('[SuperDashboard] metrics →', m); setMetrics(m); });
    DashboardService.fetchColleges().then(setCollegeData);
    DashboardService.fetchNotifications().then((n) => { console.log('[SuperDashboard] notifications →', n); setNotifications(n); });
  }, []);

  useEffect(() => {
    DashboardService.fetchTraffic(trafficDays).then(setTrafficData);
    setChartKey((p) => p + 1);
  }, [trafficDays]);

  // Resize → force chart re-render
  useEffect(() => {
    const onResize = () => setChartKey((p) => p + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const formatted     = serverTime ? TimeService.format(serverTime) : null;
  const summary       = useMemo(() => DashboardService.trafficSummary(trafficData), [trafficData]);
  const dateRangeLabel = useMemo(() => DashboardService.trafficDateRange(trafficDays), [trafficDays]);

  if (!formatted) return null;

  const formatNumber = (v) => {
    if (v === null || v === undefined) return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString();
  };

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

        {/* ── METRIC CARDS (4 per row) ── */}
        <section className="metrics-row">
          <MetricCard
            title="Total Users"
            value={formatNumber(metrics?.totalUsers)}
            tooltip="Shows the total number of user accounts (admins) registered in the system."
          />
          <MetricCard
            title="Total Super Admin"
            value={formatNumber(metrics?.totalSuperAdmins)}
            tooltip="Shows the total number of super admins registered in the system."
          />
          <MetricCard
            title="Total EEMS Admin"
            value={formatNumber(metrics?.totalEEMSAdmins)}
            tooltip="Shows the total number of EEMS Admins registered in the system."
          />
          <MetricCard
            title="Total EAMS Admin"
            value={formatNumber(metrics?.totalEAMSAdmins)}
            tooltip="Shows the total number of EAMS Admins registered in the system."
          />
        </section>

        <section className="metrics-row">
          <MetricCard
            title="Total Programs"
            value={formatNumber(metrics?.totalPrograms)}
            tooltip="Shows the total number of programs."
          />
          <MetricCard
            title="Total Departments"
            value={formatNumber(metrics?.totalDepartments)}
            tooltip="Shows the total number of departments."
          />
          <MetricCard
            title="Total Students"
            value={formatNumber(metrics?.totalStudents)}
            tooltip="Shows the total number of active students currently registered in the system."
          />
        </section>

        {/* ── NOTIFICATIONS + QUICK ACTIONS ── */}
        <section className="info-panels-row">
          <NotificationsPanel
            notifications={notifications}
          />
          <QuickActionsSection />
        </section>

        {/* ── QUICK GUIDE ── */}
        <section className="quick-guide-section">
          <h3><FaBook /> Quick Guide &amp; FAQs</h3>
          <div className="guide-grid">
            <div className="guide-card">
              <div className="guide-icon"><FaBook /></div>
              <h4>Getting Started</h4>
              <ul>
                <li><FaCircle /> Monitor real-time entries/exits</li>
                <li><FaCircle /> View daily traffic trends</li>
                <li><FaCircle /> Check college distribution</li>
                <li><FaCircle /> Generate reports weekly</li>
              </ul>
            </div>
            <div className="guide-card">
              <div className="guide-icon"><FaQuestionCircle /></div>
              <h4>Frequently Asked</h4>
              <ul>
                <li><FaCircle /> How to add new students?</li>
                <li><FaCircle /> What if facial recognition fails?</li>
                <li><FaCircle /> How to export reports?</li>
                <li><FaCircle /> Who to contact for support?</li>
              </ul>
            </div>
            <div className="guide-card">
              <div className="guide-icon"><FaBolt /></div>
              <h4>Quick Tips</h4>
              <ul>
                <li><FaCircle /> Use filters to narrow logs</li>
                <li><FaCircle /> Hover over cards for details</li>
                <li><FaCircle /> Click charts to zoom</li>
                <li><FaCircle /> Export data as CSV</li>
              </ul>
            </div>
            <div className="guide-card">
              <div className="guide-icon"><FaHeadset /></div>
              <h4>Contact Support</h4>
              <ul>
                <li><FaCircle /> IT Helpdesk: ext. 1234</li>
                <li><FaCircle /> Email: support@plp.edu</li>
                <li><FaCircle /> Hours: 8AM - 5PM</li>
                <li><FaCircle /> Emergency: 0917-123-4567</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="dashboard-footer">
          <div className="footer-left">
            <span className="system-status">
              <span className="status-dot green" />
              <FaCheckCircle /> System Online
            </span>
            <span className="separator">|</span>
            <span><FaClock /> Last Sync: {formatted.time}</span>
            <span className="separator">|</span>
            <span><FaTachometerAlt /> API: 45ms</span>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function InfoIcon({ tooltip }) {
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState({ top: 0, left: 0 });
  const iconRef               = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top:  rect.top  + window.scrollY - 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
    setVisible(true);
  }, []);
  const handleMouseLeave = useCallback(() => setVisible(false), []);

  const tooltipPortal = visible
    ? ReactDOM.createPortal(
        <div
          className="tooltip-portal"
          style={{
            position: "fixed",
            top:  coords.top  - window.scrollY,
            left: coords.left,
            transform: "translate(-50%, -100%)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          role="tooltip"
        >
          {tooltip}
          <span className="tooltip-arrow" />
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span
        ref={iconRef}
        className="info-icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        i
      </span>
      {tooltipPortal}
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
const PIE_COLORS = [
  "#5e5e5e","#54325f","#da719e","#ffeb36","#d11100","#0023be","#ff8800",
];

function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, entries, exits } = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{date}</div>
      <div className="tt-entries">Entries: {entries?.toLocaleString() || 0}</div>
      <div className="tt-exits">Exits: {exits?.toLocaleString() || 0}</div>
    </div>
  );
}

function TrafficAreaChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!data || data.length === 0) return <p className="chart-placeholder">No traffic data</p>;

  const formatted = data.map((d) => ({
    date: d.date || d.day,
    entries: d.entries ?? 0,
    exits:   d.exits   ?? 0,
  }));

  return (
    <div ref={containerRef} className="chart-container" style={{ width: "100%", height: "100%", minHeight: "280px" }}>
      {dimensions.width > 0 && (
        <ResponsiveContainer width="100%" height="100%">
          <ReAreaChart data={formatted} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
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
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} width={45} />
            <ReTooltip content={<TrafficTooltip />} />
            <ReLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
            <Area type="monotone" dataKey="entries" name="Entries" stroke={TRAFFIC_COLORS.entries} strokeWidth={2} fill="url(#gEntries)" fillOpacity={0.6} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="exits"   name="Exits"   stroke={TRAFFIC_COLORS.exits}   strokeWidth={2} fill="url(#gExits)"   fillOpacity={0.6} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </ReAreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CollegePieChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current)
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!data || data.length === 0) return <p className="chart-placeholder">No distribution data</p>;
  const total = data.reduce((s, d) => s + d.value, 0);

  const CustomLegend = () => (
    <ul className="pie-legend">
      {data.map((entry, i) => (
        <li key={entry.name}>
          <span className="swatch" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
          <span className="legend-text">{entry.name} ({((entry.value / total) * 100).toFixed(0)}%)</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div ref={containerRef} className="pie-wrap">
        <div className="pie-chart-wrapper" style={{ width: "100%", height: "250px" }}>
          {dimensions.width > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie data={data} cx="50%" cy="50%" innerRadius={dimensions.width < 400 ? 30 : 40} outerRadius={dimensions.width < 400 ? 60 : 80} paddingAngle={2} dataKey="value" label={false}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v, n) => [`${v.toLocaleString()} (${((v / total) * 100).toFixed(1)}%)`, n]} />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </div>
        <CustomLegend />
      </div>
    </>
  );
}

export default SuperDashboard;