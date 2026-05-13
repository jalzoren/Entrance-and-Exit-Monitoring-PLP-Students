import { useState, useEffect, useRef, useCallback } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { reportToXml, xmlToReport, downloadXml } from '../../utils/xmlReportUtils';

// Helper function to get Philippine date range for today
const getTodayPhilippineRange = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  const year = phTime.getFullYear();
  const month = String(phTime.getMonth() + 1).padStart(2, '0');
  const day = String(phTime.getDate()).padStart(2, '0');
  
  const dayStart = `${year}-${month}-${day} 00:00:00`;
  const dayEnd = `${year}-${month}-${day} 23:59:59`;
  
  return { dayStart, dayEnd };
};

// API Service - fetch logs from the analytics routes
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
      
      const logs = [];
      const uniqueKeys = new Set();
      
      // Use studentLogs as primary source
      if (data.studentLogs && Array.isArray(data.studentLogs)) {
        data.studentLogs.forEach(log => {
          const uniqueKey = `${log.studentId}_${log.dateTime}_${log.action}`;
          if (!uniqueKeys.has(uniqueKey)) {
            uniqueKeys.add(uniqueKey);
            
            let formattedTime = '';
            let formattedDate = '';
            let timestamp = null;
            
            if (log.dateTime) {
              const dateObj = new Date(log.dateTime);
              formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              formattedDate = dateObj.toLocaleDateString('en-US');
              timestamp = dateObj.getTime();
            }
            
            logs.push({
              id: `student_${log.studentId}_${timestamp}`,
              studentId: log.studentId,
              name: log.name,
              collegeDept: log.department,
              yearLevel: log.yearLevel,
              action: log.action === "Entrance" ? "ENTERED" : "EXITED",
              method: log.method,
              time: formattedTime || '--:--:--',
              date: formattedDate || '----/--/--',
              timestamp: timestamp || new Date().getTime(),
              failed: false
            });
          }
        });
      }
      
      // Fallback for entry logs
      if ((!data.studentLogs || data.studentLogs.length === 0) && data.entryLogs && Array.isArray(data.entryLogs)) {
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
              id: log.id || `entry_${log.studentId}_${timestamp}`,
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
      
      // Fallback for exit logs
      if ((!data.studentLogs || data.studentLogs.length === 0) && data.exitLogs && Array.isArray(data.exitLogs)) {
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
              id: log.id || `exit_${log.studentId}_${timestamp}`,
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
      
      // Add failed attempts
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
      
      // Sort logs - newest first
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      return { logs };
    } catch (err) {
      console.error('[MonitorService.fetchAllLogs] ERROR:', err.message);
      return { logs: [] };
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

function LogEntry({ log }) {
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
        <div className="rtm-log-entry failed">
          <span className="rtm-log-time">[{getDisplayDateTime()}]</span>
          <span className="rtm-log-message">Failed Authentication Attempt</span>
          {log.name && log.name !== "Unknown" && (
            <span className="rtm-log-attempt"> (Attempted: {log.name})</span>
          )}
        </div>
      ) : (
        <div className={`rtm-log-entry success ${getActionClass()}`}>
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
                    <tr key={student.studentId || student.student_id || index}>
                      <td>{index + 1}</td>
                      <td>{student.studentId || student.student_id || 'N/A'}</td>
                      <td>{student.name || 'Unknown'}</td>
                      <td>{student.department || student.collegeDept || 'N/A'}</td>
                      <td>{student.yearLevel || 'N/A'}</td>
                      <td>{student.entryTime || student.time || student.entry_time || 'N/A'}</td>
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
  const isMountedRef = useRef(true);

  const totalLogsCount = allLogs.length;
  const enteredCount = allLogs.filter(log => !log.failed && log.action === "ENTERED").length;
  const exitedCount = allLogs.filter(log => !log.failed && log.action === "EXITED").length;
  const failedCount = allLogs.filter(log => log.failed === true).length;

  // Filter logs based on active filter
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
    
    setFilteredLogs(filtered);
  }, [allLogs, activeFilter]);

  // Calculate students currently inside based on logs
  const calculateStudentsInsideFromLogs = useCallback((logs) => {
    const studentState = new Map();
    
    // Sort chronologically - oldest first
    const sortedLogs = [...logs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    for (const log of sortedLogs) {
      if (log.failed) continue;
      if (!log.studentId) continue;
      
      if (log.action === "ENTERED") {
        studentState.set(log.studentId, {
          studentId: log.studentId,
          student_id: log.studentId,
          name: log.name,
          department: log.collegeDept,
          collegeDept: log.collegeDept,
          yearLevel: log.yearLevel,
          entryTime: log.time,
          entryTimestamp: log.timestamp,
          entryDate: log.date
        });
      } else if (log.action === "EXITED") {
        studentState.delete(log.studentId);
      }
    }

    return Array.from(studentState.values());
  }, []);

  const fetchLogs = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      const { dayStart, dayEnd } = getTodayPhilippineRange();
      const fromDate = dayStart.split(' ')[0];
      const toDate = dayEnd.split(' ')[0];
      
      const { logs } = await MonitorService.fetchAllLogs({
        from: fromDate,
        to: toDate
      });
      
      const studentsInside = calculateStudentsInsideFromLogs(logs);
      
      if (isMountedRef.current) {
        setAllLogs(logs);
        setStudentsInsideCount(studentsInside.length);
        setStudentsInsideList(studentsInside);
        setLastRefresh(new Date());
      }
      
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, calculateStudentsInsideFromLogs]);

  const handleExportXml = async () => {
    try {
      const { dayStart, dayEnd } = getTodayPhilippineRange();
      const fromDate = dayStart.split(' ')[0];
      const toDate = dayEnd.split(' ')[0];
      
      await MonitorService.exportToXml({
        from: fromDate,
        to: toDate,
        actionType: activeFilter === 'all' ? undefined : 
                    activeFilter === 'entered' ? 'entry' : 
                    activeFilter === 'exited' ? 'exit' : undefined
      });
    } catch (error) {
      console.error('Error exporting to XML:', error);
      alert('Failed to export to XML. Please try again.');
    }
  };

  // Setup auto-refresh - 5 seconds
  useEffect(() => {
    isMountedRef.current = true;
    
    fetchLogs();
    
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current && !isRefreshing) {
        fetchLogs();
      }
    }, 5000);
    
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [fetchLogs, isRefreshing]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleManualRefresh = () => {
    if (!isRefreshing) {
      fetchLogs();
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
                {isRefreshing ? '⟳ Refresh' : '⟳ Refresh'}
              </button>
            </div>
          </div>

          <div className="rtm-auto-refresh-status">
            <span className={`refresh-indicator ${isRefreshing ? 'refreshing' : ''}`}></span>
            <span className="refresh-text">
              Auto-refreshing every 5 seconds
            </span>
            <span className="refresh-time">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>

          <div className="rtm-body">
            <div className="rtm-log-panel" ref={logRef}>
              <div className="logs-container">
                {filteredLogs.length === 0 ? (
                  <div className="rtm-empty-state">
                    {activeFilter === 'entered' ? 'No entered records today' : 
                     activeFilter === 'exited' ? 'No exited records today' : 
                     activeFilter === 'failed' ? 'No failed attempts recorded' : 
                     'No activity logs to display for today'}
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <LogEntry key={log.id} log={log} />
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