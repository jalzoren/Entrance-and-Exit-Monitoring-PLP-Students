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
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: `eems_report${suffix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape', compress: true }
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
  const processedCollegeData = collegeDataArray.map((dept, idx) => {
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

    const pctPresent =
      dept.percentagePresent != null
        ? parseFloat(dept.percentagePresent)
        : (totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0);

    return {
      id: idx + 1,
      name: dept.displayName || dept.fullCollegeName || dept.collegeName || dept.dept_name || 'Unknown',
      presentNow,
      totalEnrolled,
      percentagePresent: pctPresent,
      percentageOfCampus: 0,
    };
  }).sort((a, b) => b.presentNow - a.presentNow);

  const totalPresentOnCampus = processedCollegeData.reduce((s, d) => s + d.presentNow, 0);
  const processedCollegeDataFinal = processedCollegeData.map(d => ({
    ...d,
    percentageOfCampus: totalPresentOnCampus > 0
      ? (d.presentNow / totalPresentOnCampus) * 100
      : 0,
    percentagePresent: d.totalEnrolled > 0
      ? (d.presentNow / d.totalEnrolled) * 100
      : 0,
  }));

  const displayOnCampus = currentOnCampus > 0
    ? currentOnCampus
    : totalPresentOnCampus;

  const displayTotalEnrolled = processedCollegeDataFinal.reduce((s, d) => s + d.totalEnrolled, 0) || totalStudents;

  const authDataArray = safeArray(authData);
  const processedAuthData = authDataArray.map((auth, idx) => ({
    id: idx + 1,
    method: auth.method || auth.authentication_method || 'Unknown',
    attempts: auth.attempts || auth.total_attempts || 0,
    successRate: auth.successRate || auth.success_rate || 0,
  }));

  const methodDistributionData = [...processedAuthData].sort((a, b) => b.attempts - a.attempts);

  const trafficDataArray = safeArray(trafficData);
  const processedTrafficData = trafficDataArray.map(day => ({
    date: day.date,
    entrance: day.entrance || day.entrances || 0,
    exit: day.exit || day.exits || 0,
    total: (day.entrance || 0) + (day.exit || 0),
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const highestTraffic = trafficInsights?.highest?.date
    ? `${trafficInsights.highest.date} (${trafficInsights.highest.entrance} entries)`
    : processedTrafficData.length > 0
      ? `${processedTrafficData[0]?.date} (${processedTrafficData[0]?.entrance} entries)`
      : 'N/A';

  const lowestTraffic = trafficInsights?.lowest?.date
    ? `${trafficInsights.lowest.date} (${trafficInsights.lowest.entrance} entries)`
    : processedTrafficData.length > 0
      ? `${processedTrafficData[processedTrafficData.length - 1]?.date} (${processedTrafficData[processedTrafficData.length - 1]?.entrance} entries)`
      : 'N/A';

  const getPeakHourDisplay = () => {
    if (!peakHour) return 'N/A';
    if (typeof peakHour === 'object') {
      if (peakHour.hour) return `${peakHour.hour}:00 (${peakHour.total || 0} entries)`;
      return JSON.stringify(peakHour);
    }
    return String(peakHour);
  };

  const visitorDataArray = safeArray(visitorData);
  const visitorEntries = visitorDataArray.find(v => v.name === 'ENTRY' || v.name === 'Entry')?.value || 0;
  const visitorExits   = visitorDataArray.find(v => v.name === 'EXIT'  || v.name === 'Exit')?.value  || 0;

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
  const finalExitLogs  = getExitLogs();

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
    if (filters?.yearLevel)         s.push(`Year Level: ${filters.yearLevel}`);
    if (filters?.enrollmentStatus)  s.push(`Status: ${filters.enrollmentStatus}`);
    if (filters?.actionType && filters.actionType !== 'both')
      s.push(`Action: ${filters.actionType === 'entry' ? 'Entry Only' : 'Exit Only'}`);
    return s.length > 0 ? s.join(' | ') : 'No additional filters applied';
  };

  const thGreen = { backgroundColor: '#01311d', color: 'white', padding: '8px' };
  const thEntry = { backgroundColor: '#2E7D32', color: 'white', padding: '6px', textAlign: 'left' };
  const thExit  = { backgroundColor: '#D99201', color: 'white', padding: '6px', textAlign: 'left' };
  const tdSmall = { padding: '4px', fontSize: '9px' };

  // Render based on mode
  if (mode === 'entry') {
    // ENTRY LOGS ONLY PDF
    const pageCount = 1;
    return (
      <div className="pdf-container">
        <div ref={reportRef} className="pdf-report landscape">
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
                <h1 className="pdf-main-title">ENTRY LOGS REPORT</h1>
                <p className="pdf-subtitle">
                  Student entry records
                  {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ''}.
                </p>
              </div>

              {getAppliedFiltersSummary() !== 'No additional filters applied' && (
                <div style={{ backgroundColor: '#f0f7f4', border: '1px solid #01311d', borderRadius: '6px', padding: '8px 12px', fontSize: '10px', color: '#01311d', marginBottom: '8px' }}>
                  <strong>Filters Applied:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                  <strong>Date Range:</strong> {formatDateRange()}
                </div>
              )}
            </div>

            <div className="pdf-section-spacing">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '5px', height: '32px', backgroundColor: '#2E7D32', borderRadius: '3px' }}></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#2E7D32', fontWeight: 'bold' }}>ENTRY LOGS</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                    Student ENTRY records &nbsp;|&nbsp;
                    <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                    <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                    <strong>Total:</strong> {finalEntryLogs.length}
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="pdf-table pdf-table-full">
                  <thead>
                    <tr>
                      <th style={thEntry}>No.</th>
                      <th style={thEntry}>Date &amp; Time</th>
                      <th style={thEntry}>Student ID</th>
                      <th style={thEntry}>Name</th>
                      <th style={thEntry}>College / Department</th>
                      <th style={thEntry}>Year Level</th>
                      <th style={thEntry}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalEntryLogs.length > 0 ? (
                      finalEntryLogs.map((log, i) => (
                        <tr key={`entry-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fef9' }}>
                          <td style={tdSmall}>{i + 1}</td>
                          <td style={tdSmall}>{log.dateTime || log.date || log.time || log.timestamp || '—'}</td>
                          <td style={tdSmall}>{log.studentId || log.student_id || 'N/A'}</td>
                          <td style={tdSmall}>{log.name || log.student_name || 'Unknown'}</td>
                          <td style={tdSmall}>{log.department || log.collegeDept || log.college || 'N/A'}</td>
                          <td style={tdSmall}>{log.yearLevel || log.year || 'N/A'}</td>
                          <td style={tdSmall}>{log.method || log.authMethod || 'Face Recognition'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          No entry records found for the selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {finalEntryLogs.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#e8f5e9' }}>
                        <td colSpan="7" style={{ padding: '6px', textAlign: 'center', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
                          Total Entry Records: {finalEntryLogs.length} &nbsp;|&nbsp; Generated on {generationDate}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="pdf-footer">
              <div className="pdf-footer-content">
                <div className="pdf-footer-left">
                  <span className="pdf-footer-text">
                    ENTRANCE AND EXIT STUDENT MONITORING SYSTEM<br />
                    PAMANTASAN NG LUNGSOD NG PASIG | Powered by College of Computer Studies
                  </span>
                </div>
                <div className="pdf-footer-right">
                  <span className="pdf-footer-text">Page 1 of 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'exit') {
    // EXIT LOGS ONLY PDF
    const pageCount = 1;
    return (
      <div className="pdf-container">
        <div ref={reportRef} className="pdf-report landscape">
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
                <h1 className="pdf-main-title">EXIT LOGS REPORT</h1>
                <p className="pdf-subtitle">
                  Student exit records
                  {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ''}.
                </p>
              </div>

              {getAppliedFiltersSummary() !== 'No additional filters applied' && (
                <div style={{ backgroundColor: '#f0f7f4', border: '1px solid #01311d', borderRadius: '6px', padding: '8px 12px', fontSize: '10px', color: '#01311d', marginBottom: '8px' }}>
                  <strong>Filters Applied:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                  <strong>Date Range:</strong> {formatDateRange()}
                </div>
              )}
            </div>

            <div className="pdf-section-spacing">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '5px', height: '32px', backgroundColor: '#D99201', borderRadius: '3px' }}></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#D99201', fontWeight: 'bold' }}>EXIT LOGS</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                    Student EXIT records &nbsp;|&nbsp;
                    <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                    <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                    <strong>Total:</strong> {finalExitLogs.length}
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="pdf-table pdf-table-full">
                  <thead>
                    <tr>
                      <th style={thExit}>No.</th>
                      <th style={thExit}>Date &amp; Time</th>
                      <th style={thExit}>Student ID</th>
                      <th style={thExit}>Name</th>
                      <th style={thExit}>College / Department</th>
                      <th style={thExit}>Year Level</th>
                      <th style={thExit}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalExitLogs.length > 0 ? (
                      finalExitLogs.map((log, i) => (
                        <tr key={`exit-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fffdf0' }}>
                          <td style={tdSmall}>{i + 1}</td>
                          <td style={tdSmall}>{log.dateTime || log.date || log.time || log.timestamp || '—'}</td>
                          <td style={tdSmall}>{log.studentId || log.student_id || 'N/A'}</td>
                          <td style={tdSmall}>{log.name || log.student_name || 'Unknown'}</td>
                          <td style={tdSmall}>{log.department || log.collegeDept || log.college || 'N/A'}</td>
                          <td style={tdSmall}>{log.yearLevel || log.year || 'N/A'}</td>
                          <td style={tdSmall}>{log.method || log.authMethod || 'Face Recognition'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          No exit records found for the selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {finalExitLogs.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#fff8e1' }}>
                        <td colSpan="7" style={{ padding: '6px', textAlign: 'center', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
                          Total Exit Records: {finalExitLogs.length} &nbsp;|&nbsp; Generated on {generationDate}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="pdf-footer">
              <div className="pdf-footer-content">
                <div className="pdf-footer-left">
                  <span className="pdf-footer-text">
                    ENTRANCE AND EXIT STUDENT MONITORING SYSTEM<br />
                    PAMANTASAN NG LUNGSOD NG PASIG | Powered by College of Computer Studies
                  </span>
                </div>
                <div className="pdf-footer-right">
                  <span className="pdf-footer-text">Page 1 of 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FULL REPORT (default mode)
  const pageCount = 3 + (finalEntryLogs.length > 0 ? 1 : 0) + (finalExitLogs.length > 0 ? 1 : 0);
  const p1 = 1;
  const p2 = 2;
  const p3 = 3;
  const p4 = finalEntryLogs.length > 0 ? 4 : null;
  const p5 = finalExitLogs.length > 0 ? (finalEntryLogs.length > 0 ? 5 : 4) : null;

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

  return (
    <div className="pdf-container">
      <div ref={reportRef} className="pdf-report landscape">

        {/* PAGE 1: HEADER, SUMMARY STATS & DEPARTMENT TABLE */}
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
                Overview of student entrance and exit activity
                {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ''}.
              </p>
            </div>

            {getAppliedFiltersSummary() !== 'No additional filters applied' && (
              <div style={{ backgroundColor: '#f0f7f4', border: '1px solid #01311d', borderRadius: '6px', padding: '8px 12px', fontSize: '10px', color: '#01311d', marginBottom: '8px' }}>
                <strong>Filters Applied:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                <strong>Date Range:</strong> {formatDateRange()}
              </div>
            )}

            <div style={{ borderTop: '1px solid #d0d0d0', margin: '8px 0 12px 0' }}></div>

            {/* Summary stat cards */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ fontSize: '24px', color: '#01311d' }}>{displayTotalEnrolled.toLocaleString()}</strong>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '11px' }}>Total Enrolled</p>
              </div>
              <div style={{ flex: 1, padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ fontSize: '24px', color: '#d99201' }}>{displayOnCampus.toLocaleString()}</strong>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '11px' }}>Currently on Campus</p>
              </div>
              <div style={{ flex: 1, padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ fontSize: '24px', color: '#4a90d9' }}>{Number(totalEntries).toLocaleString()}</strong>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '11px' }}>Total Entries</p>
              </div>
              <div style={{ flex: 1, padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ fontSize: '24px', color: '#2ecc71' }}>{Number(authSuccessRate).toFixed(1)}%</strong>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '11px' }}>Auth Success Rate</p>
              </div>
            </div>

            <div className="pdf-stats-section">
              <div className="pdf-stats-left">
                <div className="pdf-green-box">
                  <div className="pdf-big-number">
                    {displayOnCampus.toLocaleString()}
                    <span style={{ fontSize: '14px', fontWeight: 'normal', opacity: 0.8 }}>
                      {' '}/ {displayTotalEnrolled.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white', letterSpacing: '1px', marginTop: '4px' }}>
                    {filters?.collegeDepartment ? 'DEPT. STUDENTS ON CAMPUS' : 'STUDENTS ON CAMPUS'}
                  </div>
                  {filters?.collegeDepartment && (
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                      {filters.collegeDepartment}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>
                    {displayTotalEnrolled > 0
                      ? `${((displayOnCampus / displayTotalEnrolled) * 100).toFixed(1)}% attendance rate`
                      : 'No enrollment data'}
                  </div>
                </div>
                <div className="pdf-green-box-small" style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'white' }}>Date Range: {formatDateRange()}</div>
                  <div style={{ fontSize: '11px', color: 'white' }}>Generated: {generationDate}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                    Total Entries: {Number(totalEntries).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Department table */}
              <div style={{ flex: 2 }}>
                <h3 className="pdf-chart-title">
                  Chart 1: {filters?.collegeDepartment
                    ? `Students — ${filters.collegeDepartment}`
                    : 'Distribution of Students by Department'}
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
                        <th style={thGreen}>% of Campus</th>
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
                            <td style={{ padding: '6px', textAlign: 'center' }}>{dept.percentageOfCampus.toFixed(1)}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            No department data for selected filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {processedCollegeDataFinal.length > 0 && (
                      <tfoot>
                        <tr style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }}>
                          <td colSpan="2" style={{ padding: '6px', textAlign: 'center' }}>TOTAL</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: '#d99201' }}>{displayOnCampus.toLocaleString()}</td>
                          <td style={{ padding: '6px', textAlign: 'center', color: '#01311d' }}>{displayTotalEnrolled.toLocaleString()}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            {displayTotalEnrolled > 0
                              ? `${((displayOnCampus / displayTotalEnrolled) * 100).toFixed(1)}%`
                              : '0%'}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>100%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Progress bars */}
                {processedCollegeDataFinal.length > 0 && (
                  <div className="pdf-chart-grid">
                    {processedCollegeDataFinal.slice(0, 8).map((college, idx) => (
                      <div key={idx} className="pdf-progress-bar-container">
                        <div className="pdf-progress-label">
                          <span style={{ fontWeight: 'bold', minWidth: '100px', fontSize: '9px' }}>{college.name}</span>
                          <span style={{ fontSize: '9px' }}>
                            {college.presentNow.toLocaleString()} / {college.totalEnrolled.toLocaleString()}
                            {' '}({college.percentagePresent.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="pdf-progress-bar-bg">
                          <div className="pdf-progress-bar-fill" style={{
                            width: `${Math.min(college.percentagePresent, 100)}%`,
                            backgroundColor: '#d99201'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer page={p1} />
        </div>

      

        {/* PAGE 3: AUTH SUCCESS RATE & METHOD DISTRIBUTION */}
        <div className="pdf-page">
          <div style={{ borderTop: '1px solid #01311d', margin: '10px 0' }}></div>

          <div className="pdf-section-spacing">
            <h3 className="pdf-section-title">Success Rate by Authentication Method</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="pdf-table pdf-table-left">
                <thead>
                  <tr>
                    <th style={{ ...thGreen, textAlign: 'left' }}>No.</th>
                    <th style={{ ...thGreen, textAlign: 'left' }}>Method</th>
                    <th style={{ ...thGreen, textAlign: 'right' }}>Attempts</th>
                    <th style={{ ...thGreen, textAlign: 'right' }}>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {processedAuthData.length > 0 ? (
                    processedAuthData.map(item => (
                      <tr key={item.id}>
                        <td style={{ padding: '6px' }}>{item.id}</td>
                        <td style={{ padding: '6px' }}>{item.method}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>{item.attempts.toLocaleString()}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>
                          <span style={{
                            color: item.successRate >= 80 ? '#2ecc71' : item.successRate >= 50 ? '#f39c12' : '#e74c3c',
                            fontWeight: 'bold'
                          }}>
                            {item.successRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        No authentication data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pdf-section-spacing">
            <h3 className="pdf-section-title">Chart 2: Distribution of Students by Method of Entry</h3>
            {methodDistributionData.length > 0 ? (
              <div className="pdf-method-grid">
                {methodDistributionData.map((method, idx) => (
                  <div key={idx} className="pdf-method-bar">
                    <div className="pdf-method-label">
                      <span style={{ fontWeight: 'bold' }}>{method.method}</span>
                      <span>{method.successRate}% ({method.attempts.toLocaleString()})</span>
                    </div>
                    <div className="pdf-method-bar-bg">
                      <div style={{
                        width: `${Math.min(method.successRate, 100)}%`,
                        height: '100%',
                        backgroundColor: idx === 0 ? '#2E7D32' : '#D99201',
                        borderRadius: '5px'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                No method data available
              </p>
            )}
          </div>

          <footer page={p3} />
        </div>

        {/* PAGE 4: ENTRY LOGS */}
        {finalEntryLogs.length > 0 && (
          <div className="pdf-page">
            <div style={{ borderTop: '1px solid #01311d', margin: '10px 0' }}></div>

            <div className="pdf-section-spacing">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '5px', height: '32px', backgroundColor: '#2E7D32', borderRadius: '3px' }}></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#2E7D32', fontWeight: 'bold' }}>ENTRY LOGS</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                    Student ENTRY records &nbsp;|&nbsp;
                    <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                    <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                    <strong>Total:</strong> {finalEntryLogs.length}
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="pdf-table pdf-table-full">
                  <thead>
                    <tr>
                      <th style={thEntry}>No.</th>
                      <th style={thEntry}>Date &amp; Time</th>
                      <th style={thEntry}>Student ID</th>
                      <th style={thEntry}>Name</th>
                      <th style={thEntry}>College / Department</th>
                      <th style={thEntry}>Year Level</th>
                      <th style={thEntry}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalEntryLogs.map((log, i) => (
                      <tr key={`entry-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fef9' }}>
                        <td style={tdSmall}>{i + 1}</td>
                        <td style={tdSmall}>{log.dateTime || log.date || log.time || log.timestamp || '—'}</td>
                        <td style={tdSmall}>{log.studentId || log.student_id || 'N/A'}</td>
                        <td style={tdSmall}>{log.name || log.student_name || 'Unknown'}</td>
                        <td style={tdSmall}>{log.department || log.collegeDept || log.college || 'N/A'}</td>
                        <td style={tdSmall}>{log.yearLevel || log.year || 'N/A'}</td>
                        <td style={tdSmall}>{log.method || log.authMethod || 'Face Recognition'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#e8f5e9' }}>
                      <td colSpan="7" style={{ padding: '6px', textAlign: 'center', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
                        Total Entry Records: {finalEntryLogs.length} &nbsp;|&nbsp; Generated on {generationDate}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <footer page={p4} />
          </div>
        )}

        {/* PAGE 5: EXIT LOGS */}
        {finalExitLogs.length > 0 && (
          <div className="pdf-page">
            <div style={{ borderTop: '1px solid #01311d', margin: '10px 0' }}></div>

            <div className="pdf-section-spacing">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '5px', height: '32px', backgroundColor: '#D99201', borderRadius: '3px' }}></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#D99201', fontWeight: 'bold' }}>EXIT LOGS</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                    Student EXIT records &nbsp;|&nbsp;
                    <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                    <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                    <strong>Total:</strong> {finalExitLogs.length}
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="pdf-table pdf-table-full">
                  <thead>
                    <tr>
                      <th style={thExit}>No.</th>
                      <th style={thExit}>Date &amp; Time</th>
                      <th style={thExit}>Student ID</th>
                      <th style={thExit}>Name</th>
                      <th style={thExit}>College / Department</th>
                      <th style={thExit}>Year Level</th>
                      <th style={thExit}>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalExitLogs.map((log, i) => (
                      <tr key={`exit-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fffdf0' }}>
                        <td style={tdSmall}>{i + 1}</td>
                        <td style={tdSmall}>{log.dateTime || log.date || log.time || log.timestamp || '—'}</td>
                        <td style={tdSmall}>{log.studentId || log.student_id || 'N/A'}</td>
                        <td style={tdSmall}>{log.name || log.student_name || 'Unknown'}</td>
                        <td style={tdSmall}>{log.department || log.collegeDept || log.college || 'N/A'}</td>
                        <td style={tdSmall}>{log.yearLevel || log.year || 'N/A'}</td>
                        <td style={tdSmall}>{log.method || log.authMethod || 'Face Recognition'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#fff8e1' }}>
                      <td colSpan="7" style={{ padding: '6px', textAlign: 'center', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
                        Total Exit Records: {finalExitLogs.length} &nbsp;|&nbsp; Generated on {generationDate}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <footer page={p5} />
          </div>
        )}

      </div>
    </div>
  );
});

GenerateReportPdf.displayName = 'GenerateReportPdf';
export default GenerateReportPdf;