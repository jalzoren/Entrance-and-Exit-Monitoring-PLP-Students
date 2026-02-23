// src/pages/Dashboard.jsx
//
// ─────────────────────────────────────────────────────────────────────────────
// PROFESSOR'S NOTE ─ Why OOP-style organisation inside React?
//   React is functional by nature, but we can still apply OOP principles by
//   grouping related logic into "service objects" (plain JS classes) that live
//   outside the component tree.  Components stay thin (UI only); services
//   handle data-fetching and business rules.  This mirrors the Model-View
//   separation you'd find in a proper MVC architecture.
// ─────────────────────────────────────────────────────────────────────────────

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
import "../css/Dashboard.css";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE LAYER  (OOP "Model" classes)
// These are pure data-fetching / data-transformation classes.
// They have NO knowledge of React state — they just return data.
// WHY: Swapping a mock for a real API later means editing ONE class, not
//      hunting through JSX for fetch() calls.
// ─────────────────────────────────────────────────────────────────────────────

/** Handles all clock/time concerns. */
class TimeService {
  static async fetchServerTime() {
    const res = await fetch("http://localhost:5000/api/time");
    const data = await res.json();
    return new Date(data.serverTime);
  }

  /** Format a Date into the display shape the header needs. */
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

/** Handles all dashboard metric/chart data concerns. */
class DashboardService {
  // ── METRICS ──────────────────────────────────────────────────────────────
  static async fetchMetrics() {
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (!res.ok) throw new Error("no metrics");
      return await res.json();
    } catch {
      // SAMPLE FALLBACK — replace with real data once backend is ready
      return { onCampus: 1_000, totalEntries: 1_000, authSuccessRate: 80 };
    }
  }

  // ── TRAFFIC CHART ─────────────────────────────────────────────────────────
  // BEGINNER TIP: `days` drives how many rows are sliced from sampleAll.
  //   When the user picks "30 DAYS" in the dropdown, fetchTraffic(30) is called
  //   and you'd swap sampleAll for a real API call: fetch(`/api/traffic?days=${days}`)
  static async fetchTraffic(days = 7) {
    // prettier-ignore
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

  // ── COLLEGE DISTRIBUTION ─────────────────────────────────────────────────
  static async fetchColleges() {
    // Sample data — each object needs `name` and `value` for Recharts <Pie>
    return [
      { name: "CSS",  value: 2000 },
      { name: "CAS",  value: 1000 },
      { name: "CON",  value: 1000 },
      { name: "CBA",  value: 1000 },
      { name: "CIHM", value: 2000 },
      { name: "COED", value: 3000 },
    ];
  }

  // ── COMPUTED SUMMARIES ────────────────────────────────────────────────────
  /** Returns { totalEntries, totalExits, peakDay, peakEntries } for the footer. */
  static trafficSummary(data) {
    if (!data || data.length === 0) return null;
    const totalEntries = data.reduce((s, d) => s + (d.entries ?? 0), 0);
    const totalExits   = data.reduce((s, d) => s + (d.exits   ?? 0), 0);
    const peak         = data.reduce((a, b) => (b.entries > a.entries ? b : a));
    return {
      totalEntries,
      totalExits,
      peakDay: peak.day,
      peakEntries: peak.entries,
    };
  }

  /** Build the date-range label shown above the area chart (e.g. "Jan 25 – 31, 2026"). */
  static trafficDateRange(days) {
    const end   = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// WHY: Dashboard is the "smart" / "container" component — it owns all state
//      and passes data down as props.  Child components are "dumb" / presentational
//      and have zero fetch logic.  This keeps children easy to test and reuse.
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard() {
  const [serverTime,   setServerTime]   = useState(null);
  const [metrics,      setMetrics]      = useState(null);
  const [trafficData,  setTrafficData]  = useState(null);
  const [collegeData,  setCollegeData]  = useState(null);
  const [trafficDays,  setTrafficDays]  = useState(7);

  // ── Clock effect ────────────────────────────────────────────────────────
  // LIFECYCLE: runs once on mount (empty [] dep-array).
  // WHY two intervals?  One ticks every second locally (cheap), the other
  // re-syncs with the server every 60 s to prevent drift.
  useEffect(() => {
    let baseTime;
    let tickInterval;
    let syncInterval;

    const syncClock = async () => {
      try {
        baseTime = await TimeService.fetchServerTime();
        setServerTime(new Date(baseTime));
        clearInterval(tickInterval);
        tickInterval = setInterval(() => {
          baseTime = new Date(baseTime.getTime() + 1000);
          setServerTime(new Date(baseTime));
        }, 1000);
      } catch {
        // If server is unreachable, fall back to local time
        baseTime = new Date();
        setServerTime(new Date(baseTime));
        tickInterval = setInterval(() => {
          baseTime = new Date(baseTime.getTime() + 1000);
          setServerTime(new Date(baseTime));
        }, 1000);
      }
    };

    syncClock();
    syncInterval = setInterval(syncClock, 60_000);

    // CLEANUP: always clear intervals when component unmounts
    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, []);

  // ── Data loading effect ─────────────────────────────────────────────────
  useEffect(() => {
    DashboardService.fetchMetrics().then(setMetrics);
    DashboardService.fetchColleges().then(setCollegeData);
  }, []);

  // Re-fetch traffic whenever the user changes the day-range dropdown
  useEffect(() => {
    DashboardService.fetchTraffic(trafficDays).then(setTrafficData);
  }, [trafficDays]);

  // ── Derived values (memoised so they don't recalculate on every render) ─
  const formatted    = serverTime ? TimeService.format(serverTime) : null;
  const summary      = useMemo(() => DashboardService.trafficSummary(trafficData), [trafficData]);
  const dateRangeLabel = useMemo(() => DashboardService.trafficDateRange(trafficDays), [trafficDays]);

  // Don't render anything until the clock is ready (avoids flash)
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

        {/* ── METRIC CARDS ── */}
        {/*
          WHY a separate MetricCard component?
          Because if your designer changes the card layout, you update ONE
          component instead of three copy-pasted blocks.
        */}
        <section className="metrics-row">
          <MetricCard
            title="Currently On Campus"
            value={metrics?.onCampus ?? "—"}
            subtitle="STUDENTS"
            tooltip="Shows the total number of students currently inside the campus based on active entry records without a corresponding exit."
          />
          <MetricCard
            title="Today's Total Entries"
            value={metrics?.totalEntries ?? "—"}
            subtitle="ENTRIES"
            tooltip="Counts all successful student entry events recorded for the current day."
          />
          <MetricCard
            title="Auth Success Rate"
            value={metrics?.authSuccessRate ? `${metrics.authSuccessRate}%` : "—"}
            subtitle="FACIAL RECOGNITION"
            tooltip="Percentage of successful identity verifications during entry using facial recognition."
          />
        </section>

        {/* ── CHARTS ── */}
        <section className="charts-grid">

          {/* Chart 1 — Daily Traffic Trend (Area Chart) */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Daily Traffic Trend</h3>
              <div className="chart-controls">
                {/* The dropdown triggers a re-fetch via the trafficDays state */}
                <select
                  value={trafficDays}
                  onChange={(e) => setTrafficDays(Number(e.target.value))}
                >
                  <option value={7}>7 DAYS</option>
                  <option value={30}>30 DAYS</option>
                </select>
                <InfoIcon tooltip="Displays the number of student entries and exits per day within the selected time range." />
              </div>
            </div>

            {/* Date range label (matches wireframe) */}
            {dateRangeLabel && (
              <div className="chart-date-range">{dateRangeLabel}</div>
            )}

            <div className="chart-area-wrap">
              <TrafficAreaChart data={trafficData} />
            </div>

            {/* Summary footer (matches wireframe) */}
            {summary && (
              <div className="chart-summary">
                Weekly Total:{" "}
                <strong>{summary.totalEntries.toLocaleString()} entries</strong>{" "}
                · <strong>{summary.totalExits.toLocaleString()} exits</strong>{" "}
                · Peak: <strong>{summary.peakDay} ({summary.peakEntries.toLocaleString()} entries)</strong>
              </div>
            )}
          </div>

          {/* Chart 2 — College Department Distribution (Pie Chart) */}
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>College Department Distribution</h3>
              <InfoIcon tooltip="Shows the proportion of student traffic by college or department currently on campus today." />
            </div>
            <div className="chart-area-wrap">
              <CollegePieChart data={collegeData} />
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATIONAL (DUMB) COMPONENTS
// These receive only props — no fetch calls, no useEffect.
// WHY: Pure UI components are trivial to test and reuse across pages.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InfoIcon — uses ReactDOM.createPortal to render the tooltip directly into
 * document.body, which GUARANTEES it escapes ALL parent clipping contexts:
 * backdrop-filter, overflow:hidden, transform, opacity, filter — none of
 * these can trap a portal because the portal's DOM node is a DIRECT child
 * of <body>, not a descendant of the clipping element at all.
 *
 * HOW PORTALS WORK (beginner explanation):
 *   Normally React renders children inside their parent DOM node.
 *   createPortal(child, container) says "render this child into THIS
 *   container instead" — even though it still lives in the React component
 *   tree for event bubbling and state purposes.
 *
 * HOW POSITION IS CALCULATED:
 *   useRef() gets a reference to the icon's DOM node.
 *   getBoundingClientRect() reads its exact pixel position on screen.
 *   We use those coordinates to position the tooltip with fixed positioning
 *   (fixed = relative to the viewport, not any parent element).
 */
function InfoIcon({ tooltip }) {
  const [visible, setVisible]   = useState(false);
  const [coords,  setCoords]    = useState({ top: 0, left: 0 });
  const iconRef                 = useRef(null);

  // Recalculate tooltip position every time it becomes visible
  const handleMouseEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        // Place tooltip above the icon, centred on it
        top:  rect.top + window.scrollY - 8,   // 8px gap above the icon
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
    setVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => setVisible(false), []);

  // The floating tooltip rendered via portal into document.body
  const tooltipPortal = visible
    ? ReactDOM.createPortal(
        <div
          className="tooltip-portal"
          style={{
            // `position: fixed` so it's relative to the VIEWPORT, not any parent
            position: "fixed",
            // Convert page-scroll-adjusted coords back to viewport coords
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
        document.body   // ← renders OUTSIDE all parent containers
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

/**
 * Metric summary card.
 * Props:
 *   title   – card heading
 *   value   – big number / string
 *   subtitle – small label below the value
 *   tooltip – text shown when hovering the info icon
 */
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

// ── Colour palettes ──────────────────────────────────────────────────────────
// Matches the greenish-gold brand palette used in the wireframe.
const TRAFFIC_COLORS = {
  entries: "#58761B",
  exits:   "#D99201",
};

// Pie slice colours — distinct enough to tell apart at a glance
const PIE_COLORS = [
  "#b0b8d1", // CSS — muted blue-grey
  "#a8d5ba", // CAS — soft green
  "#e8a0bf", // CON — pink
  "#f5c97a", // CBA — gold
  "#e05c5c", // CIHM — red
  "#6b7fd7", // COED — indigo
];

// ── Custom tooltip defined at module scope ───────────────────────────────────
// CRITICAL: Never define this inside the chart component.
// WHY: If defined inside, React creates a NEW component type on every render.
//      Recharts sees a "new" tooltip component each time and resets its internal
//      hover state — this is also what causes the chart areas to appear blank
//      in some Recharts versions.  Defining it outside fixes both issues.
function TrafficTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, entries, exits } = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{date}</div>
      <div className="tt-entries">Entries: {entries.toLocaleString()}</div>
      <div className="tt-exits">Exits: {exits.toLocaleString()}</div>
    </div>
  );
}

/**
 * Area chart for daily traffic.
 * COMMON MISTAKE: forgetting to normalise incoming key names.
 *   The backend might return `entries` or `entry` — the map below handles both.
 */
function TrafficAreaChart({ data }) {
  if (!data || data.length === 0)
    return <p className="chart-placeholder">No traffic data</p>;

  // Normalise keys so the chart always works regardless of API field names
  const formatted = data.map((d) => ({
    date:    d.date || d.day,
    entries: d.entries ?? d.entry ?? d.entrances ?? 0,
    exits:   d.exits  ?? d.exit  ?? d.exiting   ?? 0,
  }));

  return (
    // WHY a plain <div> wrapper with explicit pixel height?
    // ResponsiveContainer measures its IMMEDIATE parent to get width/height.
    // If that parent is a flex/grid item without an explicit size, the
    // measurement returns 0 and the chart renders invisible.
    // Solution: wrap in a plain block div with a fixed pixel height.
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
      <ReAreaChart data={formatted} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
        <defs>
          <linearGradient id="gEntries" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={TRAFFIC_COLORS.entries} stopOpacity={0.85} />
            <stop offset="100%" stopColor="#ffffff"                 stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gExits" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={TRAFFIC_COLORS.exits} stopOpacity={0.85} />
            <stop offset="100%" stopColor="#ffffff"               stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <ReTooltip content={<TrafficTooltip />} />
        <ReLegend verticalAlign="bottom" height={36} />

        <Area
          type="monotone"
          dataKey="entries"
          stroke={TRAFFIC_COLORS.entries}
          fill="url(#gEntries)"
          fillOpacity={0.4}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="exits"
          stroke={TRAFFIC_COLORS.exits}
          fill="url(#gExits)"
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Pie chart for college distribution — matches the wireframe exactly.
 *
 * HOW IT WORKS:
 *   1. Recharts <Pie> maps each { name, value } object to a slice.
 *   2. <Cell> gives each slice its own colour from PIE_COLORS.
 *   3. A custom legend on the right shows name + percentage.
 *
 * BEGINNER TIP: To add an inner ring (donut style), add `innerRadius={60}` to <Pie>.
 */
function CollegePieChart({ data }) {
  if (!data || data.length === 0)
    return <p className="chart-placeholder">No distribution data</p>;

  const total = data.reduce((s, d) => s + d.value, 0);

  // Custom legend rendered as a plain list (gives us full style control)
  const CustomLegend = () => (
    <ul className="pie-legend">
      {data.map((entry, i) => {
        const pct = ((entry.value / total) * 100).toFixed(0);
        return (
          <li key={entry.name}>
            <span className="swatch" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            {entry.name} ({pct}%)
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="pie-wrap">
      {/* WHY style={{ flex: "0 0 200px" }}?
          The pie-wrap is a flex row (pie + legend side by side).
          We give the chart a fixed pixel basis so the legend always has room.
          The inner div with explicit height lets ResponsiveContainer measure correctly. */}
      <div style={{ flex: "0 0 200px", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip formatter={(value, name) => [value.toLocaleString(), name]} />
          </RePieChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend />
    </div>
  );
}

export default Dashboard;