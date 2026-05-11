import { useState, useEffect, useRef, useCallback } from "react";
import "../../css/RealTimeMonitor.css";
import '../../css/Monitor.css';
import { useLogContext } from "../../context/LogContext";
import { useCameraContext } from "../../context/CameraContext";
import { 
  exportLogsToXML, 
  downloadXML
} from "../../utils/xmlUtils";
import * as XLSX from 'xlsx';

function LogEntry({ log, animDelay }) {
  // Format student info display
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

  return (
    <div>
      {log.failed ? (
        <div className="rtm-log-entry failed" style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time || '--:--:--'}]</span> — Failed Authentication Attempt
          {log.name && log.name !== "Unknown" && (
            <span className="rtm-log-attempt"> (Attempted: {log.name})</span>
          )}
        </div>
      ) : (
        <div className={`rtm-log-entry success ${(log.action || '').toLowerCase()}`} style={{ animationDelay: `${animDelay}s` }}>
          <span className="rtm-log-time">[{log.time || '--:--:--'}]</span>{" "}
          {getStudentInfo()}{" "}
          <span className={`rtm-log-action ${(log.action || '').toLowerCase()}`}>
            {log.action === "ENTRY" ? "entered" : log.action === "EXIT" ? "exited" : log.action}
          </span>{" "}
          <span className="rtm-log-method">via {log.method || 'Unknown'}</span>
        </div>
      )}
      <div className="rtm-log-divider" />
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
  const { 
    logs: contextLogs, 
    studentsInside, 
    addLog, 
    getAllLogs,
    getStatistics,
    getLogsByDateRange,
    syncStudentCount,
    refreshLogs  // Make sure this exists in your context
  } = useLogContext();
  
  const { 
    cameraStatus, 
    detectedFace, 
    isCameraActive, 
    videoStream,
    videoRef: contextVideoRef
  } = useCameraContext();
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentsInsideList, setStudentsInsideList] = useState([]);
  const [lastLogCount, setLastLogCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logRef = useRef(null);
  const localVideoRef = useRef(null);
  const [streamAttached, setStreamAttached] = useState(false);
  const refreshIntervalRef = useRef(null);

  // Calculate counts for each filter
  const totalLogsCount = contextLogs.length;
  const entranceCount = contextLogs.filter(log => !log.failed && log.action === "ENTRY").length;
  const exitCount = contextLogs.filter(log => !log.failed && log.action === "EXIT").length;
  const failedCount = contextLogs.filter(log => log.failed === true).length;

  // Calculate students currently inside based on logs
  const calculateStudentsInside = useCallback(() => {
    const insideMap = new Map();
    const sortedLogs = [...contextLogs].sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeA - timeB;
    });

    for (const log of sortedLogs) {
      if (!log.failed && log.action) {
        if (log.action === "ENTRY") {
          insideMap.set(log.studentId, {
            studentId: log.studentId,
            name: log.name,
            department: log.collegeDept,
            yearLevel: log.yearLevel,
            entryTime: log.time,
            entryTimestamp: log.timestamp
          });
        } else if (log.action === "EXIT") {
          insideMap.delete(log.studentId);
        }
      }
    }

    return Array.from(insideMap.values());
  }, [contextLogs]);

  // Update students inside list when logs change
  useEffect(() => {
    const inside = calculateStudentsInside();
    setStudentsInsideList(inside);
  }, [contextLogs, calculateStudentsInside]);

  // Function to manually refresh data
  const performRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log("Performing auto-refresh...", new Date().toLocaleTimeString());
    
    try {
      // Call refresh function from context if available
      if (refreshLogs && typeof refreshLogs === 'function') {
        await refreshLogs();
      } else if (getAllLogs && typeof getAllLogs === 'function') {
        // Alternative: fetch fresh logs
        const freshLogs = await getAllLogs();
        console.log("Refreshed logs count:", freshLogs?.length || 0);
      }
      
      // Sync student count if available
      if (syncStudentCount && typeof syncStudentCount === 'function') {
        await syncStudentCount();
      }
      
      // Update last refresh time
      setLastRefresh(new Date());
      
      // Check if new logs were added
      const currentCount = contextLogs.length;
      if (currentCount !== lastLogCount) {
        setLastLogCount(currentCount);
        console.log(`New logs detected! Count changed from ${lastLogCount} to ${currentCount}`);
      }
      
    } catch (error) {
      console.error("Error during auto-refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshLogs, getAllLogs, syncStudentCount, contextLogs.length, lastLogCount, isRefreshing]);

  // Auto-refresh setup - runs every 5 seconds
  useEffect(() => {
    // Initial refresh on mount
    performRefresh();
    
    // Set up interval for auto-refresh every 5 seconds
    refreshIntervalRef.current = setInterval(() => {
      performRefresh();
    }, 5000); // 5000ms = 5 seconds
    
    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [performRefresh]);

  // Use the video stream from context
  useEffect(() => {
    if (localVideoRef.current && videoStream && !streamAttached) {
      try {
        console.log("Monitor: Attaching video stream from FaceRecognition");
        localVideoRef.current.srcObject = videoStream;
        setStreamAttached(true);
        
        localVideoRef.current.style.transform = 'scaleX(-1)';
        localVideoRef.current.style.webkitTransform = 'scaleX(-1)';
        
        const playPromise = localVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log("Monitor: Video playing with mirror effect");
          }).catch((err) => {
            console.log("Video autoplay prevented:", err);
          });
        }
      } catch (err) {
        console.error("Error attaching stream:", err);
      }
    }
  }, [videoStream, streamAttached]);

  // Filter logs based on active filter
  useEffect(() => {
    let filtered = [];
    
    if (activeFilter === 'all') {
      filtered = [...contextLogs];
    } else if (activeFilter === 'entrance') {
      filtered = contextLogs.filter(log => !log.failed && log.action === "ENTRY");
    } else if (activeFilter === 'exit') {
      filtered = contextLogs.filter(log => !log.failed && log.action === "EXIT");
    } else if (activeFilter === 'failed') {
      filtered = contextLogs.filter(log => log.failed === true);
    }
    
    const sortedFiltered = filtered.sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA; // Newest first
    });
    
    setFilteredLogs(sortedFiltered);
  }, [contextLogs, activeFilter]);

  // Auto-scroll to top when new log is added (since we show newest first)
  useEffect(() => {
    if (logRef.current && filteredLogs.length > 0) {
      logRef.current.scrollTop = 0;
    }
  }, [filteredLogs.length]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  };

  // Export logs to Excel
  const exportToExcel = () => {
    try {
      const excelData = filteredLogs.map((log, index) => ({
        '#': index + 1,
        'Date & Time': log.time || 'N/A',
        'Full Date': log.timestamp ? new Date(log.timestamp).toLocaleString() : log.date || 'N/A',
        'Name': log.failed ? 'Failed Attempt' : (log.name || 'Unknown'),
        'Student ID': log.failed ? 'N/A' : (log.studentId || 'N/A'),
        'Department': log.collegeDept || 'N/A',
        'Year Level': log.yearLevel || 'N/A',
        'Action': log.failed ? 'FAILED' : (log.action || 'N/A'),
        'Method': log.method || 'N/A',
        'Status': log.failed ? 'Failed' : 'Success'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const colWidths = [
        { wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
        { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Entry-Exit Logs');

      const summaryData = [
        { 'Metric': 'Total Logs', 'Value': totalLogsCount },
        { 'Metric': 'Total Entries', 'Value': entranceCount },
        { 'Metric': 'Total Exits', 'Value': exitCount },
        { 'Metric': 'Failed Attempts', 'Value': failedCount },
        { 'Metric': 'Students Currently Inside', 'Value': studentsInside },
        { 'Metric': 'Filter Applied', 'Value': activeFilter === 'all' ? 'All Logs' : activeFilter === 'entrance' ? 'Entrance Only' : activeFilter === 'exit' ? 'Exit Only' : 'Failed Attempts Only' },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() }
      ];
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const fileName = `entry_exit_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('Excel export successful');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  // Export end of day report
  const exportEndOfDayReport = () => {
    try {
      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      let todayLogs = [];
      if (getLogsByDateRange && typeof getLogsByDateRange === 'function') {
        todayLogs = getLogsByDateRange(todayStart, todayEnd);
      } else {
        // Fallback: filter by date string
        const todayStr = today.toISOString().split('T')[0];
        todayLogs = contextLogs.filter(log => {
          const logDate = log.date ? log.date.split(' ')[0] : '';
          return logDate === todayStr;
        });
      }
      
      if (todayLogs.length === 0) {
        alert('No logs recorded today to export.');
        return;
      }

      const reportData = todayLogs.map((log, index) => ({
        '#': index + 1,
        'Time': log.time || 'N/A',
        'Date': log.date || 'N/A',
        'Name': log.failed ? 'Failed Attempt' : (log.name || 'Unknown'),
        'Student ID': log.failed ? 'N/A' : (log.studentId || 'N/A'),
        'Department': log.collegeDept || 'N/A',
        'Year Level': log.yearLevel || 'N/A',
        'Action': log.failed ? 'FAILED' : (log.action || 'N/A'),
        'Method': log.method || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(reportData);
      ws['!cols'] = [
        { wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, 
        { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `End_of_Day_${new Date().toISOString().split('T')[0]}`);

      const dailyEntries = todayLogs.filter(log => !log.failed && log.action === "ENTRY").length;
      const dailyExits = todayLogs.filter(log => !log.failed && log.action === "EXIT").length;
      const dailyFailed = todayLogs.filter(log => log.failed).length;

      const summaryData = [
        { 'Metric': 'Report Date', 'Value': new Date().toLocaleDateString() },
        { 'Metric': 'Total Logs Today', 'Value': todayLogs.length },
        { 'Metric': 'Entries Today', 'Value': dailyEntries },
        { 'Metric': 'Exits Today', 'Value': dailyExits },
        { 'Metric': 'Failed Attempts Today', 'Value': dailyFailed },
        { 'Metric': 'Net Change', 'Value': dailyEntries - dailyExits },
        { 'Metric': 'Students Inside (End of Day)', 'Value': studentsInside },
        { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
      ];
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily_Summary');

      const fileName = `end_of_day_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('End of day report exported successfully');
    } catch (error) {
      console.error('Error exporting end of day report:', error);
      alert('Failed to export end of day report. Please try again.');
    }
  };

  // Export logs to XML
  const exportToXML = () => {
    try {
      if (typeof exportLogsToXML === 'function') {
        const xmlContent = exportLogsToXML(
          filteredLogs, 
          totalLogsCount, 
          studentsInside, 
          entranceCount, 
          exitCount, 
          failedCount,
          true
        );
        downloadXML(xmlContent);
      } else {
        // Fallback XML generation
        const logsXML = filteredLogs.map(log => `
  <log>
    <time>${escapeXml(log.time || '')}</time>
    <date>${escapeXml(log.date || '')}</date>
    <name>${escapeXml(log.failed ? 'Failed Attempt' : (log.name || 'Unknown'))}</name>
    <studentId>${escapeXml(log.failed ? 'N/A' : (log.studentId || 'N/A'))}</studentId>
    <department>${escapeXml(log.collegeDept || 'N/A')}</department>
    <yearLevel>${escapeXml(log.yearLevel || 'N/A')}</yearLevel>
    <action>${escapeXml(log.failed ? 'FAILED' : (log.action || 'N/A'))}</action>
    <method>${escapeXml(log.method || 'N/A')}</method>
    <status>${log.failed ? 'Failed' : 'Success'}</status>
  </log>`).join('');
        
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eems_report>
  <summary>
    <totalLogs>${totalLogsCount}</totalLogs>
    <totalEntries>${entranceCount}</totalEntries>
    <totalExits>${exitCount}</totalExits>
    <failedAttempts>${failedCount}</failedAttempts>
    <studentsInside>${studentsInside}</studentsInside>
    <filterApplied>${activeFilter}</filterApplied>
    <exportDate>${new Date().toISOString()}</exportDate>
  </summary>
  <logs>${logsXML}
  </logs>
</eems_report>`;
        
        downloadXML(xmlContent);
      }
      console.log('XML export successful');
    } catch (error) {
      console.error('Error exporting to XML:', error);
      alert('Failed to export to XML. Please try again.');
    }
  };

  // Helper function to escape XML special characters
  const escapeXml = (str) => {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, function(c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  // Manual refresh button handler
  const handleManualRefresh = () => {
    performRefresh();
  };

  return (
    <div>
      <header className="header-card">
        <h1>REAL-TIME MONITOR</h1>
        <p className="subtitle">Dashboard / Real-Time Monitor</p>
      </header>

      <div className="rtm-wrapper">
        <div className="rtm-card">
          {/* Horizontal subheader */}
          <div className="rtm-subheader-horizontal">
            <div className="rtm-student-count">
              Students Currently Inside: 
              <span className="rtm-student-count-num">{studentsInside || 0}</span>
              <button 
                className="view-students-btn"
                onClick={() => setShowStudentsModal(true)}
              >
                View List
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
                className={`rtm-filter-btn ${activeFilter === 'entrance' ? 'active' : ''}`}
                onClick={() => handleFilterChange('entrance')}
              >
                Entrance Only ({entranceCount})
              </button>
              <button
                className={`rtm-filter-btn ${activeFilter === 'exit' ? 'active' : ''}`}
                onClick={() => handleFilterChange('exit')}
              >
                Exit Only ({exitCount})
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
                onClick={exportToExcel}
                className="rtm-filter-btn export-excel"
              >
                Export Excel
              </button>
            
              {/* XML Export Button */}
              <button
                onClick={exportToXML}
                className="rtm-filter-btn export-xml"
              >
                Export XML
              </button>
              <button
                onClick={handleManualRefresh}
                className="rtm-filter-btn refresh-btn"
                disabled={isRefreshing}
                style={{
                  cursor: isRefreshing ? 'not-allowed' : 'pointer'
                }}
              >
                {isRefreshing ? 'Refreshing...' : '⟳ Refresh'}
              </button>
            </div>
          </div>

          {/* Auto-refresh status indicator */}
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
            {/* Log panel */}
            <div className="rtm-log-panel" ref={logRef}>
              {filteredLogs.length === 0 ? (
                <div className="rtm-empty-state">
                  {activeFilter === 'entrance' ? 'No entrance records yet' : 
                   activeFilter === 'exit' ? 'No exit records yet' : 
                   activeFilter === 'failed' ? 'No failed attempts recorded' : 
                   'No activity logs to display'}
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <LogEntry key={log.id || i} log={log} animDelay={i < 7 ? i * 0.06 : 0} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Students Inside Modal */}
      <StudentsInsideModal 
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        studentsInsideList={studentsInsideList}
        studentsCount={studentsInsideList.length}
      />
    </div>
  );
}