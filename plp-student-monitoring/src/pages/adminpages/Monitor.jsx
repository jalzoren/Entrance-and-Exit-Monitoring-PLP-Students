import { useState, useEffect, useRef, useCallback } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { reportToXml, xmlToReport, downloadXml } from '../../utils/xmlReportUtils';

// API Service - fetch logs from the analytics routes using XML
const MonitorService = {
  async fetchAllLogs(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.dept) params.set('dept', filters.dept);
      if (filters.actionType) params.set('actionType', filters.actionType);
      
      const res = await fetch(`/api/analytics/report?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch logs: HTTP ${res.status}`);
      
      const data = await res.json();
      
      // Transform the report data into log entries
      const logs = [];
      const uniqueKeys = new Set();
      
      // Add entry logs if available (primary source)
      if (data.entryLogs && Array.isArray(data.entryLogs)) {
        data.entryLogs.forEach(log => {
          let formattedTime = log.time;
          let formattedDate = log.date;
          let timestamp = log.timestamp;
          
          if (!formattedTime && timestamp) {
            const date = new Date(timestamp);
            formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            formattedDate = date.toLocaleDateString('en-US');
          }
          
          const uniqueKey = `${log.studentId}_${timestamp}_ENTERED`;
          if (!uniqueKeys.has(uniqueKey)) {
            uniqueKeys.add(uniqueKey);
            logs.push({
              id: log.id || `entry_${Date.now()}_${Math.random()}`,
              studentId: log.studentId,
              name: log.name,
              collegeDept: log.collegeDept || log.department,
              yearLevel: log.yearLevel,
              action: "ENTERED",
              method: log.method || 'Manual Input',
              time: formattedTime || '--:--:--',
              date: formattedDate || '----/--/--',
              timestamp: timestamp || new Date().getTime(),
              failed: false
            });
          }
        });
      }
      
      // Add exit logs if available (primary source)
      if (data.exitLogs && Array.isArray(data.exitLogs)) {
        data.exitLogs.forEach(log => {
          let formattedTime = log.time;
          let formattedDate = log.date;
          let timestamp = log.timestamp;
          
          if (!formattedTime && timestamp) {
            const date = new Date(timestamp);
            formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            formattedDate = date.toLocaleDateString('en-US');
          }
          
          const uniqueKey = `${log.studentId}_${timestamp}_EXITED`;
          if (!uniqueKeys.has(uniqueKey)) {
            uniqueKeys.add(uniqueKey);
            logs.push({
              id: log.id || `exit_${Date.now()}_${Math.random()}`,
              studentId: log.studentId,
              name: log.name,
              collegeDept: log.collegeDept || log.department,
              yearLevel: log.yearLevel,
              action: "EXITED",
              method: log.method || 'Manual Input',
              time: formattedTime || '--:--:--',
              date: formattedDate || '----/--/--',
              timestamp: timestamp || new Date().getTime(),
              failed: false
            });
          }
        });
      }
      
      // Add failed attempts if available
      if (data.failedAttempts && Array.isArray(data.failedAttempts)) {
        data.failedAttempts.forEach(log => {
          let formattedTime = log.time;
          let formattedDate = log.date;
          let timestamp = log.timestamp;
          
          if (!formattedTime && timestamp) {
            const date = new Date(timestamp);
            formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            formattedDate = date.toLocaleDateString('en-US');
          }
          
          const uniqueKey = `failed_${log.name}_${timestamp}`;
          if (!uniqueKeys.has(uniqueKey)) {
            uniqueKeys.add(uniqueKey);
            logs.push({
              id: log.id || `failed_${Date.now()}_${Math.random()}`,
              name: log.name || 'Unknown',
              action: 'FAILED',
              method: log.method || 'Unknown',
              time: formattedTime || '--:--:--',
              date: formattedDate || '----/--/--',
              timestamp: timestamp || new Date().getTime(),
              failed: true
            });
          }
        });
      }
      
      // Sort logs in DESCENDING order (newest first) for display
      logs.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Changed to descending (newest first)
      });
      
      // Calculate current students inside from the logs (still need chronological order for calculation)
      const studentsInsideList = calculateStudentsInsideFromLogs(logs);
      const studentsInside = studentsInsideList.length;
      
      console.log(`Fetched ${logs.length} unique logs (newest to oldest)`);
      console.log(`Calculated ${studentsInside} students inside`);
      
      return { logs, studentsInside, studentsInsideList };
    } catch (err) {
      console.error('[MonitorService.fetchAllLogs] ERROR:', err.message);
      return { logs: [], studentsInside: 0, studentsInsideList: [] };
    }
  },
  
  async fetchMetrics() {
    try {
      const res = await fetch('/api/analytics/metrics');
      if (!res.ok) throw new Error(`metrics: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[MonitorService.fetchMetrics] ERROR:', err.message);
      return { totalStudents: 0, onCampus: 0 };
    }
  },
  
  async exportToXml(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.dept) params.set('dept', filters.dept);
      if (filters.actionType) params.set('actionType', filters.actionType);
      
      const res = await fetch(`/api/analytics/report?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch report: HTTP ${res.status}`);
      
      const data = await res.json();
      const xmlString = reportToXml(data, filters);
      
      const date = new Date().toISOString().slice(0, 10);
      downloadXml(xmlString, `eems-logs-${date}.xml`);
      
      return xmlString;
    } catch (err) {
      console.error('[MonitorService.exportToXml] ERROR:', err.message);
      throw err;
    }
  }
};

// Helper function to calculate students inside from logs
// This needs chronological order, so we sort ascending inside this function
function calculateStudentsInsideFromLogs(logs) {
  const insideMap = new Map();
  
  // Sort logs chronologically (oldest to newest) for accurate entry/exit tracking
  const sortedLogs = [...logs].sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeA - timeB; // Ascending for calculation
  });

  for (const log of sortedLogs) {
    if (!log.failed && log.action) {
      if (log.action === "ENTERED") {
        insideMap.set(log.studentId, {
          studentId: log.studentId,
          name: log.name,
          department: log.collegeDept,
          yearLevel: log.yearLevel,
          entryTime: log.time,
          entryTimestamp: log.timestamp,
          entryDate: log.date
        });
      } else if (log.action === "EXITED") {
        insideMap.delete(log.studentId);
      }
    }
  }

  return Array.from(insideMap.values());
}

function LogEntry({ log, animDelay }) {
  const getStudentInfo = () => {
    if (log.failed) {
      return <span className="rtm-log-name failed">Unknown Person</span>;
    }
    return (
      <>
        <span className="rtm-log-name">{log.name || 'Unknown'}</span>
        <span className="rtm-log-id">({log.studentId || 'N/A'})</span>
        {log.collegeDept && log.collegeDept !== "Not Specified" && (
          <span className="rtm-log-dept"> - {log.collegeDept}</span>
        )}
        {log.yearLevel && log.yearLevel !== "Not Specified" && (
          <span className="rtm-log-year"> - {log.yearLevel}</span>
        )}
      </>
    );
  };

  const getDisplayDateTime = () => {
    if (log.date && log.time) {
      return `${log.date} ${log.time}`;
    }
    if (log.timestamp) {
      const date = new Date(log.timestamp);
      return date.toLocaleString();
    }
    return log.time || '--:--:--';
  };

  const getActionClass = () => {
    if (log.action === "ENTERED") return "entered";
    if (log.action === "EXITED") return "exited";
    return "";
  };

  return (
    <div className="rtm-log-item-wrapper">
      {log.failed ? (
        <div className="rtm-log-entry failed" style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{getDisplayDateTime()}]</span>
          <span className="rtm-log-message">Failed Authentication Attempt</span>
          {log.name && log.name !== "Unknown" && (
            <span className="rtm-log-attempt"> (Attempted: {log.name})</span>
          )}
        </div>
      ) : (
        <div className={`rtm-log-entry success ${getActionClass()}`} style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{getDisplayDateTime()}]</span>
          <div className="rtm-log-info">
            {getStudentInfo()}
          </div>
          <span className={`rtm-log-action ${getActionClass()}`}>
            {log.action}
          </span>
          <span className="rtm-log-method">via {log.method || 'Unknown'}</span>
        </div>
      )}
    </div>
  );
}

function StudentsInsideModal({ isOpen, onClose, studentsInsideList, studentsCount }) {
  if (!isOpen) return null;

  return (
    <div className="rtm-modal-overlay" onClick={onClose}>
      <div className="rtm-modal-content students-inside-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Students Currently Inside Campus</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="students-count-badge">
            Total Students Inside: <span className="count-number">{studentsCount}</span>
          </div>
          {studentsInsideList.length === 0 ? (
            <div className="no-students-message">
              No students currently inside the campus.
            </div>
          ) : (
            <div className="students-table-container">
              <table className="students-inside-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Year Level</th>
                    <th>Entry Time</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsInsideList.map((student, index) => (
                    <tr key={student.studentId || index}>
                      <td>{index + 1}</td>
                      <td>{student.studentId || 'N/A'}</td>
                      <td>{student.name || 'Unknown'}</td>
                      <td>{student.department || student.collegeDept || 'N/A'}</td>
                      <td>{student.yearLevel || 'N/A'}</td>
                      <td>{student.entryTime || student.time || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Monitor() {
  const [allLogs, setAllLogs] = useState([]);
  const [studentsInsideCount, setStudentsInsideCount] = useState(0);
  const [studentsInsideList, setStudentsInsideList] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const prevLogsLengthRef = useRef(0);
  const isMountedRef = useRef(true);
  const autoScrollRef = useRef(true);

  const totalLogsCount = allLogs.length;
  const enteredCount = allLogs.filter(log => !log.failed && log.action === "ENTERED").length;
  const exitedCount = allLogs.filter(log => !log.failed && log.action === "EXITED").length;
  const failedCount = allLogs.filter(log => log.failed === true).length;

  const scrollToTop = () => {
    if (logRef.current && autoScrollRef.current) {
      logRef.current.scrollTop = 0;
    }
  };

  // Filter logs based on active filter - already in descending order from API
  useEffect(() => {
    let filtered = [];
    
    if (activeFilter === 'all') {
      filtered = [...allLogs];
    } else if (activeFilter === 'entered') {
      filtered = allLogs.filter(log => !log.failed && log.action === "ENTERED");
    } else if (activeFilter === 'exited') {
      filtered = allLogs.filter(log => !log.failed && log.action === "EXITED");
    } else if (activeFilter === 'failed') {
      filtered = allLogs.filter(log => log.failed === true);
    }
    
    // Logs are already sorted descending from API, keep them that way
    const sortedFiltered = filtered.sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeB - timeA; // Descending (newest first)
    });
    
    setFilteredLogs(sortedFiltered);
    
    // Scroll to top after filter change to see newest logs
    setTimeout(scrollToTop, 100);
  }, [allLogs, activeFilter]);

  // Auto-scroll to top when new logs are added (to see newest first)
  useEffect(() => {
    const currentLength = filteredLogs.length;
    const prevLength = prevLogsLengthRef.current;
    
    if (currentLength > prevLength) {
      // New logs added - scroll to top to see them (newest first)
      scrollToTop();
    }
    
    prevLogsLengthRef.current = currentLength;
  }, [filteredLogs.length]);

  const fetchLogs = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log("Fetching logs from API...", new Date().toLocaleTimeString());
    
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];
      
      const { logs, studentsInside, studentsInsideList: insideList } = await MonitorService.fetchAllLogs({
        from: fromDate,
        to: toDate
      });
      
      if (isMountedRef.current) {
        setAllLogs(logs);
        setStudentsInsideCount(studentsInside);
        setStudentsInsideList(insideList);
        setLastRefresh(new Date());
        console.log(`Fetched ${logs.length} logs (newest to oldest), ${studentsInside} students inside`);
      }
      
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing]);

  const handleExportXml = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];
      
      await MonitorService.exportToXml({
        from: fromDate,
        to: toDate,
        actionType: activeFilter === 'all' ? undefined : 
                    activeFilter === 'entered' ? 'entry' : 
                    activeFilter === 'exited' ? 'exit' : undefined
      });
      
      console.log('XML export successful');
    } catch (error) {
      console.error('Error exporting to XML:', error);
      alert('Failed to export to XML. Please try again.');
    }
  };

  // Setup refresh interval - only once on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchLogs();
    
    // Set up interval for every 5 seconds
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchLogs();
      }
    }, 5000);
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    autoScrollRef.current = true;
    // Scroll will happen in the useEffect after filteredLogs updates
  };

  const handleManualRefresh = () => {
    fetchLogs();
  };

  const handleScroll = () => {
    if (logRef.current) {
      const isAtTop = logRef.current.scrollTop <= 50;
      autoScrollRef.current = isAtTop;
    }
  };

  return (
    <div>
      <header className="header-card">
        <h1>REAL-TIME MONITOR</h1>
        <p className="subtitle">Dashboard / Real-Time Monitor</p>
      </header>

      <div className="rtm-wrapper">
        <div className="rtm-card">
          <div className="rtm-subheader-horizontal">
            <div className="rtm-student-count">
              Students Currently Inside: 
              <span className="rtm-student-count-num">{studentsInsideCount}</span>
              <button 
                className="view-students-btn"
                onClick={() => setShowStudentsModal(true)}
              >
                View List ({studentsInsideList.length})
              </button>
            </div>
            
            <div className="rtm-filter-controls">
              <button
                className={`rtm-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                All Logs ({totalLogsCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'entered' ? 'active' : ''}`}
                onClick={() => handleFilterChange('entered')}
              >
                Entered Only ({enteredCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'exited' ? 'active' : ''}`}
                onClick={() => handleFilterChange('exited')}
              >
                Exited Only ({exitedCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'failed' ? 'active' : ''}`}
                onClick={() => handleFilterChange('failed')}
              >
                Failed Attempts ({failedCount})
              </button>
            </div>

            <div className="rtm-export-buttons">
              <button
                onClick={handleManualRefresh}
                className="rtm-filter-btn refresh-btn"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : '⟳ Refresh'}
              </button>
            </div>
          </div>

          <div className="rtm-auto-refresh-status">
            <span className={`refresh-indicator ${isRefreshing ? 'refreshing' : ''}`}></span>
            <span className="refresh-text">
              Auto-refreshing every 5 seconds
              {isRefreshing && ' (Updating...)'}
            </span>
            <span className="refresh-time">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>

          <div className="rtm-body">
            <div className="rtm-log-panel" ref={logRef} onScroll={handleScroll}>
              <div className="logs-container">
                {filteredLogs.length === 0 ? (
                  <div className="rtm-empty-state">
                    {activeFilter === 'entered' ? 'No entered records yet' : 
                     activeFilter === 'exited' ? 'No exited records yet' : 
                     activeFilter === 'failed' ? 'No failed attempts recorded' : 
                     'No activity logs to display'}
                  </div>
                ) : (
                  filteredLogs.map((log, i) => (
                    <LogEntry key={log.id || i} log={log} animDelay={0} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <StudentsInsideModal 
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        studentsInsideList={studentsInsideList}
        studentsCount={studentsInsideCount}
      />
    </div>
  );
}