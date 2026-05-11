import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import html2pdf from 'html2pdf.js';
import '../componentscss/GenerateReportPdf.css';

const GenerateReportPdf = forwardRef(({ reportData = {}, filters = {}, mode = 'full' }, ref) => {
  const reportRef = useRef(null);

  const handleGeneratePDF = async () => {
    if (!reportRef.current) {
      console.error('Report ref is not available');
      return;
    }
    const suffix = mode === 'entry' ? '_entry_logs' : mode === 'exit' ? '_exit_logs' : '';
   const opt = {
  margin: 0, // Set to 0 (zero) - no margins at all
  filename: `eems_report${suffix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
  image: { type: 'jpeg', quality: 1 },
  html2canvas: { 
    scale: 3, 
    letterRendering: true, 
    useCORS: true, 
    logging: false,
    scrollY: 0,
    backgroundColor: '#ffffff'
  },
  jsPDF: { 
    unit: 'in', 
    format: 'letter', 
    orientation: 'landscape', 
    compress: true
  }
};
    try {
      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    generatePDF: handleGeneratePDF,
    generateWithFilters: handleGeneratePDF
  }));

  const leftLogoSrc1 = '/pasig.png';
  const leftLogoSrc2 = '/pasig_agos.png';
  const leftLogoSrc3 = '/logo.png';
  const rightLogoSrc = '/logo3.png';

  const generationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const {
    totalStudents = 0,
    currentOnCampus = 0,
    totalEntries = 0,
    authSuccessRate = 0,
    peakHour = null,
    dateRange = 'All Time',
    collegeData = [],
    authData = [],
    trafficData = [],
    trafficInsights = {},
    visitorData = [],
    visitorLogs = [],
    entryLogs = [],
    exitLogs = [],
    studentLogs = []
  } = reportData;

  const safeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return Object.values(data);
    return [];
  };

  const collegeDataArray = safeArray(collegeData);

  let processedCollegeDataFinal = [];

  if (filters?.collegeDepartment) {
    const filteredDept = collegeDataArray.find(dept => {
      const deptName = dept.displayName || dept.fullCollegeName || dept.collegeName || dept.dept_name || dept.name || '';
      return deptName.toLowerCase() === filters.collegeDepartment.toLowerCase();
    });

    if (filteredDept) {
      const presentNow = filteredDept.presentNow ?? filteredDept.presenceNow ?? filteredDept.currentStudents ?? filteredDept.student_count ?? 0;
      const totalEnrolled = filteredDept.totalEnrolled ?? filteredDept.totalStudents ?? filteredDept.enrolled_count ?? 0;
      const pctPresent = totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0;

      processedCollegeDataFinal = [{
        id: 1,
        name: filters.collegeDepartment,
        presentNow,
        totalEnrolled,
        percentagePresent: pctPresent,
        percentageOfCampus: 100,
      }];
    }
  } else {
    const processedCollegeData = collegeDataArray.map((dept, idx) => {
      const presentNow = dept.presentNow ?? dept.presenceNow ?? dept.currentStudents ?? dept.student_count ?? 0;
      const totalEnrolled = dept.totalEnrolled ?? dept.totalStudents ?? dept.enrolled_count ?? 0;
      const pctPresent = totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0;

      return {
        id: idx + 1,
        name: dept.displayName || dept.fullCollegeName || dept.collegeName || dept.dept_name || dept.name || 'Unknown',
        presentNow: presentNow,
        totalEnrolled: totalEnrolled,
        percentagePresent: pctPresent,
        percentageOfCampus: 0,
      };
    }).sort((a, b) => b.totalEnrolled - a.totalEnrolled);

    const totalPresentOnCampus = processedCollegeData.reduce((s, d) => s + d.presentNow, 0);
    const totalEnrolledAll = processedCollegeData.reduce((s, d) => s + d.totalEnrolled, 0);
    
    processedCollegeDataFinal = processedCollegeData.map(d => ({
      ...d,
      percentageOfCampus: totalEnrolledAll > 0 ? (d.totalEnrolled / totalEnrolledAll) * 100 : 0,
    }));
  }

  const displayOnCampus = processedCollegeDataFinal.reduce((s, d) => s + d.presentNow, 0);
  const displayTotalEnrolled = processedCollegeDataFinal.reduce((s, d) => s + d.totalEnrolled, 0);
  const finalOnCampus = displayOnCampus > 0 ? displayOnCampus : currentOnCampus;
  const finalTotalEnrolled = displayTotalEnrolled > 0 ? displayTotalEnrolled : totalStudents;

  const authDataArray = safeArray(authData);
  const processedAuthData = authDataArray.map((auth, idx) => ({
    id: idx + 1,
    method: auth.method || auth.authentication_method || 'Unknown',
    attempts: auth.attempts || auth.total_attempts || 0,
    successRate: auth.successRate || auth.success_rate || 0,
  }));

  const trafficDataArray = safeArray(trafficData);
  const processedTrafficData = trafficDataArray.map(day => ({
    date: day.date,
    entrance: day.entrance || day.entrances || 0,
    exit: day.exit || day.exits || 0,
    total: (day.entrance || 0) + (day.exit || 0),
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const visitorDataArray = safeArray(visitorData);
  const visitorEntries = visitorDataArray.find(v => v.name === 'ENTRY' || v.name === 'Entry')?.value || 0;
  const visitorExits = visitorDataArray.find(v => v.name === 'EXIT' || v.name === 'Exit')?.value || 0;

  const visitorLogsArray = safeArray(visitorLogs);

  const getEntryLogs = () => {
    if (entryLogs && entryLogs.length > 0) return safeArray(entryLogs);
    return safeArray(studentLogs).filter(log => {
      const action = (log.action || '').toUpperCase();
      return action === 'ENTRY' || action === 'ENTRANCE';
    });
  };

  const getExitLogs = () => {
    if (exitLogs && exitLogs.length > 0) return safeArray(exitLogs);
    return safeArray(studentLogs).filter(log => {
      const action = (log.action || '').toUpperCase();
      return action === 'EXIT';
    });
  };

  const finalEntryLogs = getEntryLogs();
  const finalExitLogs = getExitLogs();

  const formatDateRange = () => {
    if (dateRange && dateRange !== 'All Time') return dateRange;
    if (filters?.dateRange) {
      const { from, to } = filters.dateRange;
      if (from && to) return `${from} - ${to}`;
    }
    return 'All Time';
  };

  const getAppliedFiltersSummary = () => {
    const s = [];
    if (filters?.collegeDepartment) s.push(`Department: ${filters.collegeDepartment}`);
    if (filters?.yearLevel) s.push(`Year Level: ${filters.yearLevel}`);
    if (filters?.enrollmentStatus) s.push(`Status: ${filters.enrollmentStatus}`);
    if (filters?.actionType && filters.actionType !== 'both')
      s.push(`Action: ${filters.actionType === 'entry' ? 'Entry Only' : 'Exit Only'}`);
    return s.length > 0 ? s.join(' | ') : 'No additional filters applied';
  };

  const thGreen = { backgroundColor: '#01311d', color: 'white', padding: '8px' };
  const thEntry = { backgroundColor: '#2E7D32', color: 'white', padding: '6px', textAlign: 'left' };
  const thExit = { backgroundColor: '#D99201', color: 'white', padding: '6px', textAlign: 'left' };
  const tdSmall = { padding: '4px', fontSize: '9px' };

  // MERGED ENTRY-EXIT LOGS
  const mergedEntryExitLogs = [];
  const studentEntryMap = new Map();

  // First, group all entry logs by student
  finalEntryLogs.forEach(entry => {
    const studentId = entry.studentId || entry.student_id;
    if (!studentId) return;
    
    if (!studentEntryMap.has(studentId)) {
      studentEntryMap.set(studentId, {
        studentId: studentId,
        name: entry.name || entry.student_name || 'Unknown',
        department: entry.department || entry.collegeDept || entry.college || 'N/A',
        yearLevel: entry.yearLevel || entry.year || 'N/A',
        entryTime: entry.dateTime || entry.date || entry.time || entry.timestamp || '—',
        entryMethod: entry.method || entry.authMethod || 'Face Recognition',
        exitTime: 'Not Yet Exited',
        exitMethod: '—'
      });
    }
  });

  // Then match exit logs to entries
  finalExitLogs.forEach(exit => {
    const studentId = exit.studentId || exit.student_id;
    if (!studentId) return;
    
    if (studentEntryMap.has(studentId)) {
      const entry = studentEntryMap.get(studentId);
      const exitTime = exit.dateTime || exit.date || exit.time || exit.timestamp;
      
      // Check if exit is after entry (same day or later)
      if (exitTime && exitTime !== '—') {
        entry.exitTime = exitTime;
        entry.exitMethod = exit.method || exit.authMethod || 'Face Recognition';
      }
    } else {
      // Exit without entry
      mergedEntryExitLogs.push({
        studentId: studentId,
        name: exit.name || exit.student_name || 'Unknown',
        department: exit.department || exit.collegeDept || exit.college || 'N/A',
        yearLevel: exit.yearLevel || exit.year || 'N/A',
        entryTime: '—',
        entryMethod: '—',
        exitTime: exit.dateTime || exit.date || exit.time || exit.timestamp || '—',
        exitMethod: exit.method || exit.authMethod || 'Face Recognition'
      });
    }
  });

  // Add all entries with their matched exits
  studentEntryMap.forEach(entry => {
    mergedEntryExitLogs.push(entry);
  });

  // Sort by student ID
  mergedEntryExitLogs.sort((a, b) => a.studentId?.localeCompare(b.studentId) || 0);

  const pageCount = 3 + (visitorLogsArray.length > 0 ? 1 : 0) + (mergedEntryExitLogs.length > 0 ? 1 : 0);
  
  const PageFooter = ({ page }) => (
    <div className="pdf-footer">
      <div className="pdf-footer-content">
        <div className="pdf-footer-left">
          <span className="pdf-footer-text">
            ENTRANCE AND EXIT STUDENT MONITORING SYSTEM<br />
            PAMANTASAN NG LUNGSOD NG PASIG | Powered by College of Computer Studies
          </span>
        </div>
        <div className="pdf-footer-right">
          <span className="pdf-footer-text">Page {page} of {pageCount}</span>
        </div>
      </div>
    </div>
  );

  

  // FULL REPORT
  return (
    <div className="pdf-container">
      <div ref={reportRef} className="pdf-report landscape">

        {/* PAGE 1: HEADER & DEPARTMENT TABLE */}
        <div className="pdf-page">
          <div className="pdf-header">
            <div className="pdf-logos-row">
              <div className="pdf-left-logos">
                {[leftLogoSrc1, leftLogoSrc2, leftLogoSrc3, rightLogoSrc].map((src, i) => (
                  <div key={i} className="pdf-logo-box"
                    style={i === 1 ? { width: '65px', height: '65px' } : i === 3 ? { width: '70px', height: '70px' } : {}}>
                    <img src={src} alt={`Logo ${i + 1}`} className="pdf-logo-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                ))}
              </div>
              <div className="pdf-center-text">
                <div className="pdf-university-name">PAMANTASAN NG LUNGSOD NG PASIG</div>
                <div className="pdf-system-title">ENTRANCE AND EXIT STUDENT MONITORING SYSTEM</div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #01311d', margin: '10px 0 8px 0' }}></div>
            <div style={{ borderTop: '1px solid #d0d0d0', margin: '8px 0' }}></div>

            <div className="pdf-title-row">
              <h1 className="pdf-main-title">SUMMARY REPORT</h1>
              <p className="pdf-subtitle">
The summary report provides an overview of student entrance and exit activity within the selected date range. It presents key attendance metrics, authentication method distribution, traffic trends and detailed logs to support administrative monitoring and data-driven decision-making                {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ''}
              </p>
            </div>

            {getAppliedFiltersSummary() !== 'No additional filters applied' && (
              <div style={{ backgroundColor: '#f0f7f4', border: '1px solid #01311d', borderRadius: '6px', padding: '8px 12px', fontSize: '10px', color: '#01311d', marginBottom: '8px' }}>
                <strong>Filters Applied:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                <strong>Date Range:</strong> {formatDateRange()}
              </div>
            )}

          <div className="pdf-stats-section">
  <div className="pdf-stats-left">
    <div className="pdf-green-box">
      <div className="pdf-big-number">
        {finalOnCampus.toLocaleString()}
        <span style={{ fontSize: '16px', fontWeight: 'normal', opacity: 0.8 }}>
          {' '}/ {finalTotalEnrolled.toLocaleString()}
        </span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', letterSpacing: '1px', }}>
        {filters?.collegeDepartment ? 'DEPT. STUDENTS ON CAMPUS' : 'STUDENTS ON CAMPUS'}
      </div>
    </div>

   <div className="pdf-green-box-small-date">
  <div className="pdf-big-number">
    {formatDateRange()}
  </div>
  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', letterSpacing: '1px' }}>
   Filters:
  </div>
  {getAppliedFiltersSummary() !== 'No additional filters applied' && (
    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.9)'}}>
      {getAppliedFiltersSummary()}
    </div>
  )}
</div>
  </div>
</div>
  
          <div className="pdf-section-spacing">
            <div style={{ display: 'flex', gap: '20px' }}>


              <div style={{ flex: 2 }}>
                <h3 className="pdf-chart-title">
                  Chart 1: {filters?.collegeDepartment ? `Students — ${filters.collegeDepartment}` : 'Distribution of Students by Department'}
                </h3>

                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                  <table className="pdf-table" style={{ width: '100%', fontSize: '10px' }}>
                    <thead>
                      <tr>
                        <th style={thGreen}>No.</th>
                        <th style={{ ...thGreen, textAlign: 'left' }}>Department</th>
                        <th style={thGreen}>Present Now</th>
                        <th style={thGreen}>Total Enrolled</th>
                        <th style={thGreen}>% Present</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedCollegeDataFinal.length > 0 ? (
                        processedCollegeDataFinal.map(dept => (
                          <tr key={dept.id}>
                            <td style={{ padding: '6px', textAlign: 'center' }}>{dept.id}</td>
                            <td style={{ padding: '6px', textAlign: 'left' }}>{dept.name}</td>
                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', color: '#d99201' }}>{dept.presentNow.toLocaleString()}</td>
                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', color: '#01311d' }}>{dept.totalEnrolled.toLocaleString()}</td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>{dept.percentagePresent.toFixed(1)}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            No department data for selected filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <footer page={0} />
        </div>

       

       <div className="pdf-page">
  <div className="pdf-section-spacing">
    <div className="pdf-section-header">
      <div className="pdf-section-indicator" style={{ backgroundColor: '#01311d' }}></div>
      <div className="pdf-section-title-wrapper">
        <h3 className="pdf-section-title">
          {filters?.actionType === 'entry' ? 'STUDENT ENTRY LOGS' : 
           filters?.actionType === 'exit' ? 'STUDENT EXIT LOGS' : 
           'STUDENT ENTRY & EXIT LOGS'}
        </h3>
        <p className="pdf-section-subtitle">
          {filters?.actionType === 'entry' ? 'Student entry records' : 
           filters?.actionType === 'exit' ? 'Student exit records' : 
           'Merged entry and exit records per student'} &nbsp;|&nbsp;
          <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
          <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
          <strong>Total Records:</strong> {
            filters?.actionType === 'entry' ? finalEntryLogs.length :
            filters?.actionType === 'exit' ? finalExitLogs.length :
            mergedEntryExitLogs.length
          }
        </p>
      </div>
    </div>

    <div className="pdf-table-container">
      <table className="pdf-table pdf-table-logs">
        <thead>
          <tr>
            <th className="pdf-th-no">No.</th>
            <th className="pdf-th-id">Student ID</th>
            <th className="pdf-th-name">Name</th>
            <th className="pdf-th-dept">Department</th>
            <th className="pdf-th-year">Year Level</th>
            
            {/* Show different columns based on filter */}
            {filters?.actionType === 'entry' && (
              <>
                <th className="pdf-th-time">ENTRY TIME</th>
                <th className="pdf-th-method">ENTRY METHOD</th>
              </>
            )}
            
            {filters?.actionType === 'exit' && (
              <>
                <th className="pdf-th-time">EXIT TIME</th>
                <th className="pdf-th-method">EXIT METHOD</th>
              </>
            )}
            
            {(!filters?.actionType || filters?.actionType === 'both') && (
              <>
                <th className="pdf-th-time">ENTRY TIME</th>
                <th className="pdf-th-method">ENTRY METHOD</th>
                <th className="pdf-th-time">EXIT TIME</th>
                <th className="pdf-th-method">EXIT METHOD</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {/* Entry filter - show entry logs only */}
          {filters?.actionType === 'entry' && (
            finalEntryLogs.map((log, i) => (
              <tr key={`entry-${i}`} className={i % 2 === 0 ? 'pdf-row-even' : 'pdf-row-odd'}>
                <td className="pdf-td-no">{i + 1}</td>
                <td className="pdf-td-id">{log.studentId || log.student_id || 'N/A'}</td>
                <td className="pdf-td-name">{log.name || log.student_name || 'Unknown'}</td>
                <td className="pdf-td-dept">{log.department || log.collegeDept || log.college || 'N/A'}</td>
                <td className="pdf-td-year">{log.yearLevel || log.year || 'N/A'}</td>
                <td className="pdf-td-time-entry">{log.dateTime || log.date || log.time || log.timestamp || '—'}</td>
                <td className="pdf-td-method">{log.method || log.authMethod || 'Face Recognition'}</td>
              </tr>
            ))
          )}
          
          {/* Exit filter - show exit logs only */}
          {filters?.actionType === 'exit' && (
            finalExitLogs.map((log, i) => (
              <tr key={`exit-${i}`} className={i % 2 === 0 ? 'pdf-row-even' : 'pdf-row-odd'}>
                <td className="pdf-td-no">{i + 1}</td>
                <td className="pdf-td-id">{log.studentId || log.student_id || 'N/A'}</td>
                <td className="pdf-td-name">{log.name || log.student_name || 'Unknown'}</td>
                <td className="pdf-td-dept">{log.department || log.collegeDept || log.college || 'N/A'}</td>
                <td className="pdf-td-year">{log.yearLevel || log.year || 'N/A'}</td>
                <td className="pdf-td-time-exit">{log.dateTime || log.date || log.time || log.timestamp || '—'}</td>
                <td className="pdf-td-method">{log.method || log.authMethod || 'Face Recognition'}</td>
              </tr>
            ))
          )}
          
          {/* Both filter - show merged entry and exit logs */}
          {(!filters?.actionType || filters?.actionType === 'both') && (
            mergedEntryExitLogs.map((log, i) => (
              <tr key={`merged-${i}`} className={i % 2 === 0 ? 'pdf-row-even' : 'pdf-row-odd'}>
                <td className="pdf-td-no">{i + 1}</td>
                <td className="pdf-td-id">{log.studentId}</td>
                <td className="pdf-td-name">{log.name}</td>
                <td className="pdf-td-dept">{log.department}</td>
                <td className="pdf-td-year">{log.yearLevel}</td>
                <td className="pdf-td-time-entry">{log.entryTime}</td>
                <td className="pdf-td-method">{log.entryMethod}</td>
                <td className="pdf-td-time-exit">{log.exitTime}</td>
                <td className="pdf-td-method">{log.exitMethod}</td>
              </tr>
            ))
          )}
          
          {/* No data message */}
          {(filters?.actionType === 'entry' && finalEntryLogs.length === 0) ||
           (filters?.actionType === 'exit' && finalExitLogs.length === 0) ||
           ((!filters?.actionType || filters?.actionType === 'both') && mergedEntryExitLogs.length === 0) && (
            <tr className="pdf-row-empty">
              <td colSpan={filters?.actionType === 'entry' ? 7 : filters?.actionType === 'exit' ? 7 : 9} 
                  className="pdf-empty-message">
                No {filters?.actionType === 'entry' ? 'entry' : filters?.actionType === 'exit' ? 'exit' : 'entry or exit'} 
                records found for the selected filters
              </td>
            </tr>
          )}
        </tbody>
        
        {/* Footer with totals */}
        {((filters?.actionType === 'entry' && finalEntryLogs.length > 0) ||
          (filters?.actionType === 'exit' && finalExitLogs.length > 0) ||
          ((!filters?.actionType || filters?.actionType === 'both') && mergedEntryExitLogs.length > 0)) && (
          <tfoot>
            <tr className="pdf-footer-row">
              <td colSpan={filters?.actionType === 'entry' ? 7 : filters?.actionType === 'exit' ? 7 : 9} 
                  className="pdf-footer-message">
                Total {filters?.actionType === 'entry' ? 'Entry' : filters?.actionType === 'exit' ? 'Exit' : 'Student Activity'} Records: {
                  filters?.actionType === 'entry' ? finalEntryLogs.length :
                  filters?.actionType === 'exit' ? finalExitLogs.length :
                  mergedEntryExitLogs.length
                } &nbsp;|&nbsp;
                {filters?.actionType === 'both' && 'Shows entry time paired with corresponding exit time &nbsp;|&nbsp;'}
                Generated on {generationDate}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </div>
  <footer page={2} />
</div>


      </div>
    </div>
    </div>
  );
});

GenerateReportPdf.displayName = 'GenerateReportPdf';
export default GenerateReportPdf;