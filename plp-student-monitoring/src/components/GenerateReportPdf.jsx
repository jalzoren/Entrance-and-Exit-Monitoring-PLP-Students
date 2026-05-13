import React, { useRef, forwardRef, useImperativeHandle } from "react";
import html2pdf from "html2pdf.js";
import "../componentscss/GenerateReportPdf.css";

const GenerateReportPdf = forwardRef(
  ({ reportData = {}, filters = {}, mode = "full" }, ref) => {
    const reportRef = useRef(null);

    const handleGeneratePDF = async () => {
      if (!reportRef.current) {
        console.error("Report ref is not available");
        return;
      }
      const suffix =
        mode === "entry" ? "_entry_logs" : mode === "exit" ? "_exit_logs" : "";
      const opt = {
        margin: 0,
        filename: `eems_report${suffix}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: {
          scale: 3,
          letterRendering: true,
          useCORS: true,
          logging: false,
          scrollY: 0,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "in",
          format: "letter",
          orientation: "landscape",
          compress: true,
        },
      };
      try {
        await html2pdf().set(opt).from(reportRef.current).save();
      } catch (error) {
        console.error("Error generating PDF:", error);
      }
    };

    useImperativeHandle(ref, () => ({
      generatePDF: handleGeneratePDF,
      generateWithFilters: handleGeneratePDF,
    }));

    const leftLogoSrc1 = "/pasig.png";
    const leftLogoSrc2 = "/pasig_agos.png";
    const leftLogoSrc3 = "/logo.png";
    const rightLogoSrc = "/logo3.png";

    const generationDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const {
      totalStudents = 0,
      currentOnCampus = 0,
      totalEntries = 0,
      authSuccessRate = 0,
      peakHour = null,
      dateRange = "All Time",
      collegeData = [],
      authData = [],
      trafficData = [],
      trafficInsights = {},
      visitorData = [],
      visitorLogs = [],
      entryLogs = [],
      exitLogs = [],
      studentLogs = [],
    } = reportData;

    const safeArray = (data) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object") return Object.values(data);
      return [];
    };

    const getEntryLogs = () => {
      if (entryLogs && entryLogs.length > 0) return safeArray(entryLogs);
      return safeArray(studentLogs).filter((log) => {
        const action = (log.action || "").toUpperCase();
        return action === "ENTRY" || action === "ENTRANCE";
      });
    };

    const getExitLogs = () => {
      if (exitLogs && exitLogs.length > 0) return safeArray(exitLogs);
      return safeArray(studentLogs).filter((log) => {
        const action = (log.action || "").toUpperCase();
        return action === "EXIT";
      });
    };

    const formatWarningReason = (reason) =>
      typeof reason === "string" ? reason.toLowerCase() : "";
    const isAutoExitReason = (reason) =>
      formatWarningReason(reason).includes("auto-exit");
    const isGateClosedOrStillInsideReason = (reason) => {
      const text = formatWarningReason(reason);
      return (
        isAutoExitReason(text) ||
        text.includes("gate closed") ||
        text.includes("still inside")
      );
    };

    const finalEntryLogs = getEntryLogs();
    const finalExitLogs = getExitLogs();

    // FIXED: Process sessions to handle multiple entries/exits per student
    const processSessions = (entries, exits) => {
      // Create copies with proper timestamp parsing
      const gateIsClosedAtReport = reportData?.gateStatus?.withinWindow === false;

      const allEntryLogs = entries
        .map((log) => ({
          ...log,
          type: "entry",
          warning: log.gateWindowWarning || false,
          warningReason: log.gateWindowReason || log.warningReason || null,
          timestamp: new Date(
            log.dateTime ||
              log.date ||
              log.time ||
              log.timestamp ||
              log.log_time,
          ),
        }))
        .filter((log) => !isNaN(log.timestamp.getTime()));

      const allExitLogs = exits
        .map((log) => ({
          ...log,
          type: "exit",
          warning: log.gateWindowWarning || false,
          warningReason: log.gateWindowReason || log.warningReason || null,
          timestamp: new Date(
            log.dateTime ||
              log.date ||
              log.time ||
              log.timestamp ||
              log.log_time,
          ),
        }))
        .filter((log) => !isNaN(log.timestamp.getTime()));

      // Combine and sort by timestamp
      const allLogs = [...allEntryLogs, ...allExitLogs].sort(
        (a, b) => a.timestamp - b.timestamp,
      );

      // Group by student
      const studentMap = new Map();

      allLogs.forEach((log) => {
        const studentId = log.studentId || log.student_id;
        if (!studentId) return;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId: studentId,
            name: log.name || log.student_name || "Unknown",
            department:
              log.department || log.collegeDept || log.college || "N/A",
            yearLevel: log.yearLevel || log.year || "N/A",
            section: log.section || log.section_name || "N/A",
            pendingEntry: null,
            sessions: [],
          });
        }

        const student = studentMap.get(studentId);
        const formattedTime = log.timestamp.toLocaleString("en-PH", {
          hour12: true,
        });
        const method = log.method || log.authMethod || "Face Recognition";

        if (log.type === "entry") {
          if (student.pendingEntry) {
            const pendingReason = student.pendingEntry.warningReason;
            const isClosedWarning = isGateClosedOrStillInsideReason(pendingReason);
            const status = student.pendingEntry.warning
              ? "Have entered/Exit beyond gate closing hours"
              : isClosedWarning || gateIsClosedAtReport
                ? "Still Inside (Gate closed – no exit recorded)"
                : "Inside Campus (No Exit)";

            student.sessions.push({
              entryTime: student.pendingEntry.time,
              entryMethod: student.pendingEntry.method,
              exitTime: "—",
              exitMethod: "—",
              status,
            });
          }

          student.pendingEntry = {
            time: formattedTime,
            method: method,
            rawTime: log.timestamp,
            warning: log.warning,
            warningReason: log.warningReason,
          };
        } else if (log.type === "exit") {
          if (
            student.pendingEntry &&
            student.pendingEntry.rawTime < log.timestamp
          ) {
            const isAutoExit =
              isAutoExitReason(student.pendingEntry.warningReason) ||
              isAutoExitReason(log.warningReason);
            const status = isAutoExit
              ? "Auto-exit: Gate closed – no exit recorded"
              : student.pendingEntry.warning || log.warning
                ? "Have entered/Exit beyond gate closing hours"
                : "Completed";

            student.sessions.push({
              entryTime: student.pendingEntry.time,
              entryMethod: student.pendingEntry.method,
              exitTime: formattedTime,
              exitMethod: method,
              status,
            });
            student.pendingEntry = null;
          } else {
            const status = log.warning
              ? "Have entered/Exit beyond gate closing hours"
              : "Exit Only";

            student.sessions.push({
              entryTime: "—",
              entryMethod: "—",
              exitTime: formattedTime,
              exitMethod: method,
              status,
            });
          }
        }
      });

      for (const [studentId, student] of studentMap.entries()) {
        if (student.pendingEntry) {
          const isAutoExit = isAutoExitReason(student.pendingEntry.warningReason);
          const status = isAutoExit
            ? "Auto-exit: Gate closed – no exit recorded"
            : student.pendingEntry.warning
              ? "Have entered/Exit beyond gate closing hours"
              : gateIsClosedAtReport
                ? "Still Inside (Gate closed – no exit recorded)"
                : "Still Inside Campus";

          student.sessions.push({
            entryTime: student.pendingEntry.time,
            entryMethod: student.pendingEntry.method,
            exitTime: "—",
            exitMethod: "—",
            status,
          });
        }
      }

      // Flatten all sessions
      const allSessions = [];
      for (const [studentId, student] of studentMap.entries()) {
        student.sessions.forEach((session, idx) => {
          allSessions.push({
            studentId: student.studentId,
            name: student.name,
            department: student.department,
            yearLevel: student.yearLevel,
            section: student.section,
            sessionNumber: idx + 1,
            entryTime: session.entryTime,
            entryMethod: session.entryMethod,
            exitTime: session.exitTime,
            exitMethod: session.exitMethod,
            status: session.status,
          });
        });
      }

      return allSessions;
    };

    // Process the sessions
    let finalMergedLogs = [];
    if (finalEntryLogs.length > 0 || finalExitLogs.length > 0) {
      finalMergedLogs = processSessions(finalEntryLogs, finalExitLogs);
      // Sort by student name then session number
      finalMergedLogs.sort((a, b) => {
        if (a.name === b.name) return a.sessionNumber - b.sessionNumber;
        return a.name.localeCompare(b.name);
      });
      // Add sequential numbering
      finalMergedLogs.forEach((log, idx) => {
        log.no = idx + 1;
      });
    }

    const collegeDataArray = safeArray(collegeData);

    let processedCollegeDataFinal = [];

    if (filters?.collegeDepartment) {
      const filteredDept = collegeDataArray.find((dept) => {
        const deptName =
          dept.displayName ||
          dept.fullCollegeName ||
          dept.collegeName ||
          dept.dept_name ||
          dept.name ||
          "";
        return (
          deptName.toLowerCase() === filters.collegeDepartment.toLowerCase()
        );
      });

      if (filteredDept) {
        const presentNow =
          filteredDept.presentNow ??
          filteredDept.presenceNow ??
          filteredDept.currentStudents ??
          filteredDept.student_count ??
          0;
        const totalEnrolled =
          filteredDept.totalEnrolled ??
          filteredDept.totalStudents ??
          filteredDept.enrolled_count ??
          0;
        const pctPresent =
          totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0;

        processedCollegeDataFinal = [
          {
            id: 1,
            name: filters.collegeDepartment,
            presentNow,
            totalEnrolled,
            percentagePresent: pctPresent,
            percentageOfCampus: 100,
          },
        ];
      }
    } else {
      const processedCollegeData = collegeDataArray
        .map((dept, idx) => {
          const presentNow =
            dept.presentNow ??
            dept.presenceNow ??
            dept.currentStudents ??
            dept.student_count ??
            0;
          const totalEnrolled =
            dept.totalEnrolled ??
            dept.totalStudents ??
            dept.enrolled_count ??
            0;
          const pctPresent =
            totalEnrolled > 0 ? (presentNow / totalEnrolled) * 100 : 0;

          return {
            id: idx + 1,
            name:
              dept.displayName ||
              dept.fullCollegeName ||
              dept.collegeName ||
              dept.dept_name ||
              dept.name ||
              "Unknown",
            presentNow: presentNow,
            totalEnrolled: totalEnrolled,
            percentagePresent: pctPresent,
            percentageOfCampus: 0,
          };
        })
        .sort((a, b) => b.totalEnrolled - a.totalEnrolled);

      const totalPresentOnCampus = processedCollegeData.reduce(
        (s, d) => s + d.presentNow,
        0,
      );
      const totalEnrolledAll = processedCollegeData.reduce(
        (s, d) => s + d.totalEnrolled,
        0,
      );

      processedCollegeDataFinal = processedCollegeData.map((d) => ({
        ...d,
        percentageOfCampus:
          totalEnrolledAll > 0 ? (d.totalEnrolled / totalEnrolledAll) * 100 : 0,
      }));
    }

    const displayOnCampus = processedCollegeDataFinal.reduce(
      (s, d) => s + d.presentNow,
      0,
    );
    const displayTotalEnrolled = processedCollegeDataFinal.reduce(
      (s, d) => s + d.totalEnrolled,
      0,
    );
    const finalOnCampus =
      displayOnCampus > 0 ? displayOnCampus : currentOnCampus;
    const finalTotalEnrolled =
      displayTotalEnrolled > 0 ? displayTotalEnrolled : totalStudents;

    const authDataArray = safeArray(authData);
    const processedAuthData = authDataArray.map((auth, idx) => ({
      id: idx + 1,
      method: auth.method || auth.authentication_method || "Unknown",
      attempts: auth.attempts || auth.total_attempts || 0,
      successRate: auth.successRate || auth.success_rate || 0,
    }));

    const trafficDataArray = safeArray(trafficData);
    const processedTrafficData = trafficDataArray
      .map((day) => ({
        date: day.date,
        entrance: day.entrance || day.entrances || 0,
        exit: day.exit || day.exits || 0,
        total: (day.entrance || 0) + (day.exit || 0),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const visitorDataArray = safeArray(visitorData);
    const visitorEntries =
      visitorDataArray.find((v) => v.name === "ENTRY" || v.name === "Entry")
        ?.value || 0;
    const visitorExits =
      visitorDataArray.find((v) => v.name === "EXIT" || v.name === "Exit")
        ?.value || 0;

    const visitorLogsArray = safeArray(visitorLogs);

    const formatDateRange = () => {
      if (dateRange && dateRange !== "All Time") return dateRange;
      if (filters?.dateRange) {
        const { from, to } = filters.dateRange;
        if (from && to) return `${from} - ${to}`;
      }
      if (filters?.from && filters?.to)
        return `${filters.from} - ${filters.to}`;
      return "All Time";
    };

    const getAppliedFiltersSummary = () => {
      const s = [];
      if (filters?.collegeDepartment && filters.collegeDepartment !== "all")
        s.push(`Department: ${filters.collegeDepartment}`);
      if (filters?.yearLevel && filters.yearLevel !== "all")
        s.push(`Year Level: ${filters.yearLevel}`);
      if (filters?.enrollmentStatus && filters.enrollmentStatus !== "all")
        s.push(`Status: ${filters.enrollmentStatus}`);
      if (filters?.actionType && filters.actionType !== "both")
        s.push(
          `Action: ${filters.actionType === "entry" ? "Entry Only" : "Exit Only"}`,
        );
      return s.length > 0 ? s.join(" | ") : "No additional filters applied";
    };

    // Check if we're in visitor mode
    const isVisitorMode = filters?.reportType === 'visitors';

    // Separate visitor entry and exit logs
    const visitorEntryLogs = visitorLogsArray.filter(log => 
      log.action === 'ENTRY' || log.action === 'Entrance' || log.action === 'entry'
    );
    const visitorExitLogs = visitorLogsArray.filter(log => 
      log.action === 'EXIT' || log.action === 'Exit' || log.action === 'exit'
    );

    // Process visitor sessions (pair entries with exits)
    const processVisitorSessions = (entries, exits) => {
      const gateIsClosedAtReport = reportData?.gateStatus?.withinWindow === false;

      const allEntries = entries.map(log => ({
        ...log,
        timestamp: new Date(log.dateTime || log.log_time || log.timestamp),
        type: 'entry',
        warning: log.gateWindowWarning || false,
        warningReason: log.gateWindowReason || null,
      })).filter(log => !isNaN(log.timestamp.getTime()));
      
      const allExits = exits.map(log => ({
        ...log,
        timestamp: new Date(log.dateTime || log.log_time || log.timestamp),
        type: 'exit',
        warning: log.gateWindowWarning || false,
        warningReason: log.gateWindowReason || null,
      })).filter(log => !isNaN(log.timestamp.getTime()));
      
      // Combine and sort
      const allLogs = [...allEntries, ...allExits].sort((a, b) => a.timestamp - b.timestamp);
      
      const visitorMap = new Map();
      
      allLogs.forEach(log => {
        const visitorId = log.visitorId || log.visitor_id || log.id;
        if (!visitorId) return;
        
        if (!visitorMap.has(visitorId)) {
          visitorMap.set(visitorId, {
            visitorId: visitorId,
            name: log.name || log.full_name || 'Unknown',
            email: log.email || 'N/A',
            reason: log.reason || log.visitReason || log.visit_reason || 'N/A',
            pendingEntry: null,
            sessions: []
          });
        }
        
        const visitor = visitorMap.get(visitorId);
        const formattedTime = log.timestamp.toLocaleString('en-PH', { hour12: true });
        
        if (log.type === 'entry') {
          if (visitor.pendingEntry) {
            const status = visitor.pendingEntry.warning
              ? 'Have entered/Exit beyond gate closing hours'
              : gateIsClosedAtReport
                ? 'Still Inside (Gate closed – no exit recorded)'
                : 'Still Inside (No Exit)';

            visitor.sessions.push({
              entryTime: visitor.pendingEntry.time,
              exitTime: '—',
              status
            });
          }
          visitor.pendingEntry = {
            time: formattedTime,
            rawTime: log.timestamp,
            warning: log.warning,
            warningReason: log.warningReason,
          };
        } else if (log.type === 'exit') {
          if (visitor.pendingEntry && visitor.pendingEntry.rawTime < log.timestamp) {
            const isAutoExit =
              isAutoExitReason(visitor.pendingEntry.warningReason) ||
              isAutoExitReason(log.warningReason);
            const status = isAutoExit
              ? 'Auto-exit: Gate closed – no exit recorded'
              : visitor.pendingEntry.warning || log.warning
                ? 'Have entered/Exit beyond gate closing hours'
                : 'Completed';

            visitor.sessions.push({
              entryTime: visitor.pendingEntry.time,
              exitTime: formattedTime,
              status
            });
            visitor.pendingEntry = null;
          } else {
            const status = log.warning
              ? 'Have entered/Exit beyond gate closing hours'
              : 'Exit Only';

            visitor.sessions.push({
              entryTime: '—',
              exitTime: formattedTime,
              status
            });
          }
        }
      });
      
      // Add remaining pending entries
      for (const [visitorId, visitor] of visitorMap.entries()) {
        if (visitor.pendingEntry) {
          const isAutoExit = isAutoExitReason(visitor.pendingEntry.warningReason);
          const status = isAutoExit
            ? 'Auto-exit: Gate closed – no exit recorded'
            : visitor.pendingEntry.warning
              ? 'Have entered/Exit beyond gate closing hours'
              : gateIsClosedAtReport
                ? 'Still Inside (Gate closed – no exit recorded)'
                : 'Still Inside';

          visitor.sessions.push({
            entryTime: visitor.pendingEntry.time,
            exitTime: '—',
            status
          });
        }
      }
      
      const allSessions = [];
      for (const [visitorId, visitor] of visitorMap.entries()) {
        visitor.sessions.forEach((session, idx) => {
          allSessions.push({
            no: 0,
            visitorId: visitor.visitorId,
            name: visitor.name,
            email: visitor.email,
            reason: visitor.reason,
            sessionNumber: idx + 1,
            entryTime: session.entryTime,
            exitTime: session.exitTime,
            status: session.status
          });
        });
      }
      
      // Sort and number
      allSessions.sort((a, b) => a.name.localeCompare(b.name));
      allSessions.forEach((session, idx) => { session.no = idx + 1; });
      
      return allSessions;
    };

    let finalVisitorSessions = [];
    if (isVisitorMode && (visitorEntryLogs.length > 0 || visitorExitLogs.length > 0)) {
      finalVisitorSessions = processVisitorSessions(visitorEntryLogs, visitorExitLogs);
    }

    const thGreen = {
      backgroundColor: "#01311d",
      color: "white",
      padding: "8px",
    };

    const totalRecordsForFooter =
      filters?.actionType === "entry"
        ? finalEntryLogs.length
        : filters?.actionType === "exit"
          ? finalExitLogs.length
          : finalMergedLogs.length;

    const pageCount =
      3 +
      (visitorLogsArray.length > 0 ? 1 : 0) +
      (finalMergedLogs.length > 0 ? 1 : 0);


    // VISITOR REPORT
 // ============================================================
// CONDITIONAL RENDERING - VISITOR OR STUDENT REPORT
// ============================================================

// VISITOR REPORT
if (isVisitorMode) {
  const visitorTotalRecords = filters?.actionType === 'entry' 
    ? visitorEntryLogs.length 
    : filters?.actionType === 'exit' 
      ? visitorExitLogs.length 
      : finalVisitorSessions.length;

  // VISITOR REPORT JSX
  return (
    <div className="pdf-container">
      <div ref={reportRef} className="pdf-report landscape">
        
        {/* PAGE 1: HEADER & SUMMARY STATS */}
        <div className="pdf-page">
          <div className="pdf-header">
            <div className="pdf-logos-row">
              <div className="pdf-left-logos">
                {[leftLogoSrc1, leftLogoSrc2, leftLogoSrc3, rightLogoSrc].map((src, i) => (
                  <div key={i} className="pdf-logo-box"
                    style={i === 1 ? { width: "65px", height: "65px" } : i === 3 ? { width: "70px", height: "70px" } : {}}>
                    <img src={src} alt={`Logo ${i + 1}`} className="pdf-logo-img"
                      onError={(e) => { e.target.style.display = "none"; }} />
                  </div>
                ))}
              </div>
              <div className="pdf-center-text">
                <div className="pdf-university-name">PAMANTASAN NG LUNGSOD NG PASIG</div>
                <div className="pdf-system-title">ENTRANCE AND EXIT VISITOR MONITORING SYSTEM</div>
              </div>
            </div>

            <div style={{ borderTop: "2px solid #01311d", margin: "10px 0 8px 0" }}></div>
            <div style={{ borderTop: "1px solid #d0d0d0", margin: "8px 0" }}></div>

            <div className="pdf-report-summary">
              <div className="pdf-title-row">
                <h1 className="pdf-main-title">VISITOR SUMMARY REPORT</h1>
                <p className="pdf-subtitle">
                  This report provides an overview of visitor entrance and exit activity within the selected date range.
                  {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ""}
                </p>
              </div>

              {getAppliedFiltersSummary() !== "No additional filters applied" && (
                <div style={{ backgroundColor: "#f0f7f4", border: "1px solid #01311d", borderRadius: "6px", padding: "8px 12px", fontSize: "10px", color: "#01311d", marginBottom: "8px" }}>
                  <strong>Filters Applied:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                  <strong>Date Range:</strong> {formatDateRange()}
                </div>
              )}

              <div className="pdf-stats-section">
                <div className="pdf-stats-left">
                  {/* Card 1: Total Visitors */}
                  <div className="pdf-green-box">
                    <div className="pdf-big-number">
                      {visitorLogsArray.length.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                      TOTAL VISITOR MOVEMENTS
                    </div>
                  </div>

                  {/* Card 2: Total Entries */}
                  <div className="pdf-green-box">
                    <div className="pdf-big-number">
                      {visitorEntryLogs.length.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                      TOTAL ENTRY MOVEMENTS
                    </div>
                  </div>

                  {/* Card 3: Total Exits */}
                  <div className="pdf-green-box">
                    <div className="pdf-big-number">
                      {visitorExitLogs.length.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                      TOTAL EXIT MOVEMENTS
                    </div>
                  </div>

                  {/* Card 4: Date Range */}
                  <div className="pdf-green-box-small-date">
                    <div className="pdf-big-number" style={{ fontSize: "14px" }}>
                      {formatDateRange()}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                      REPORT PERIOD
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE 2: VISITOR LOGS TABLE */}
        <div className="pdf-page">
          <div className="pdf-section-spacing">
            <div className="pdf-section-header">
              <div className="pdf-section-indicator" style={{ backgroundColor: "#01311d" }}></div>
              <div className="pdf-section-title-wrapper">
                <h3 className="pdf-section-title">
                  {filters?.actionType === "entry"
                    ? "VISITOR ENTRY LOGS"
                    : filters?.actionType === "exit"
                      ? "VISITOR EXIT LOGS"
                      : "VISITOR ENTRY & EXIT LOGS"}
                </h3>
                <p className="pdf-section-subtitle">
                  {filters?.actionType === "entry"
                    ? "Visitor entry records"
                    : filters?.actionType === "exit"
                      ? "Visitor exit records"
                      : "Complete visitor session history - each row represents one entry-exit pair"}{" "}
                  &nbsp;|&nbsp;
                  <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                  <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                  <strong>Total Records:</strong> {visitorTotalRecords}
                </p>
              </div>
            </div>

            <div className="pdf-table-container">
              <table className="pdf-table pdf-table-logs">
                <thead>
                  <tr>
                    <th className="pdf-th-no">No.</th>
                    <th className="pdf-th-id">Visitor ID</th>
                    <th className="pdf-th-name">Name</th>
                    <th className="pdf-th-email">Email</th>
                    <th className="pdf-th-reason">Reason</th>
                    
                    {filters?.actionType === "entry" && (
                      <th className="pdf-th-time">ENTRY TIME</th>
                    )}
                    
                    {filters?.actionType === "exit" && (
                      <th className="pdf-th-time">EXIT TIME</th>
                    )}
                    
                    {(!filters?.actionType || filters?.actionType === "both") && (
                      <>
                        <th className="pdf-th-session">SESSION #</th>
                        <th className="pdf-th-time">ENTRY TIME</th>
                        <th className="pdf-th-time">EXIT TIME</th>
                        <th className="pdf-th-status">STATUS</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filters?.actionType === "entry" && (
                    visitorEntryLogs.length > 0 ? (
                      visitorEntryLogs.map((log, i) => (
                        <tr key={`visitor-entry-${i}`} className={i % 2 === 0 ? "pdf-row-even" : "pdf-row-odd"}>
                          <td className="pdf-td-no">{i + 1}</td>
                          <td className="pdf-td-id">{log.visitorId || log.visitor_id || log.id || "N/A"}</td>
                          <td className="pdf-td-name">{log.name || log.full_name || "Unknown"}</td>
                          <td className="pdf-td-email">{log.email || "N/A"}</td>
                          <td className="pdf-td-reason">{log.reason || log.visitReason || log.visit_reason || "N/A"}</td>
                          <td className="pdf-td-time-entry">{log.dateTime || log.log_time || log.timestamp || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="pdf-row-empty">
                        <td colSpan={6} className="pdf-empty-message">No visitor entry records found</td>
                      </tr>
                    )
                  )}
                  
                  {filters?.actionType === "exit" && (
                    visitorExitLogs.length > 0 ? (
                      visitorExitLogs.map((log, i) => (
                        <tr key={`visitor-exit-${i}`} className={i % 2 === 0 ? "pdf-row-even" : "pdf-row-odd"}>
                          <td className="pdf-td-no">{i + 1}</td>
                          <td className="pdf-td-id">{log.visitorId || log.visitor_id || log.id || "N/A"}</td>
                          <td className="pdf-td-name">{log.name || log.full_name || "Unknown"}</td>
                          <td className="pdf-td-email">{log.email || "N/A"}</td>
                          <td className="pdf-td-reason">{log.reason || log.visitReason || log.visit_reason || "N/A"}</td>
                          <td className="pdf-td-time-exit">{log.dateTime || log.log_time || log.timestamp || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="pdf-row-empty">
                        <td colSpan={6} className="pdf-empty-message">No visitor exit records found</td>
                      </tr>
                    )
                  )}
                  
                  {(!filters?.actionType || filters?.actionType === "both") && (
                    finalVisitorSessions.length > 0 ? (
                      finalVisitorSessions.map((session, i) => (
                        <tr key={`visitor-session-${i}`} className={i % 2 === 0 ? "pdf-row-even" : "pdf-row-odd"}>
                          <td className="pdf-td-no">{session.no}</td>
                          <td className="pdf-td-id">{session.visitorId}</td>
                          <td className="pdf-td-name">{session.name}</td>
                          <td className="pdf-td-email">{session.email}</td>
                          <td className="pdf-td-reason">{session.reason}</td>
                          <td className="pdf-td-session">{session.sessionNumber}</td>
                          <td className="pdf-td-time-entry">{session.entryTime}</td>
                          <td className="pdf-td-time-exit">{session.exitTime}</td>
                          <td className="pdf-td-status">
                            <span className={`status-badge ${session.status === "Still Inside" ? "status-inside" : "status-completed"}`}>
                              {session.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="pdf-row-empty">
                        <td colSpan={9} className="pdf-empty-message">No visitor records found for the selected filters</td>
                      </tr>
                    )
                  )}
                </tbody>
                
                {visitorTotalRecords > 0 && (
                  <tfoot>
                    <tr className="pdf-footer-row">
                      <td colSpan={filters?.actionType === "entry" ? 6 : filters?.actionType === "exit" ? 6 : 9} 
                          className="pdf-footer-message">
                        <strong>Summary:</strong>&nbsp;
                        Total {filters?.actionType === "entry" ? "Entry" : filters?.actionType === "exit" ? "Exit" : "Visitor"} Records: {visitorTotalRecords}
                        {filters?.actionType === "both" && finalVisitorSessions.length > 0 && (
                          <>
                            &nbsp;|&nbsp;
                            <span className="text-green">Still Inside: {finalVisitorSessions.filter(s => s.status === "Still Inside").length}</span>
                            &nbsp;|&nbsp;
                            <span className="text-blue">Completed: {finalVisitorSessions.filter(s => s.status === "Completed").length}</span>
                          </>
                        )}
                        &nbsp;|&nbsp;
                        Generated on {generationDate}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STUDENT REPORT (DEFAULT)
// ============================================================
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
                  style={i === 1 ? { width: "65px", height: "65px" } : i === 3 ? { width: "70px", height: "70px" } : {}}>
                  <img src={src} alt={`Logo ${i + 1}`} className="pdf-logo-img"
                    onError={(e) => { e.target.style.display = "none"; }} />
                </div>
              ))}
            </div>
            <div className="pdf-center-text">
              <div className="pdf-university-name">PAMANTASAN NG LUNGSOD NG PASIG</div>
              <div className="pdf-system-title">ENTRANCE AND EXIT STUDENT MONITORING SYSTEM</div>
            </div>
          </div>

          <div style={{ borderTop: "2px solid #01311d", margin: "10px 0 8px 0" }}></div>
          <div style={{ borderTop: "1px solid #d0d0d0", margin: "8px 0" }}></div>

          <div className="pdf-report-summary">
            <div className="pdf-title-row">
              <h1 className="pdf-main-title">SUMMARY REPORT</h1>
              <p className="pdf-subtitle">
                The summary report provides an overview of student entrance and exit activity within the selected date range. It presents key attendance metrics, authentication method distribution, traffic trends and detailed logs to support administrative monitoring and data-driven decision-making
                {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ""}
              </p>
            </div>

            {getAppliedFiltersSummary() !== "No additional filters applied" && (
              <div style={{ backgroundColor: "#f0f7f4", border: "1px solid #01311d", borderRadius: "6px", padding: "8px 12px", fontSize: "10px", color: "#01311d", marginBottom: "8px" }}>
                <strong>Filters Applied:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                <strong>Date Range:</strong> {formatDateRange()}
              </div>
            )}

            <div className="pdf-stats-section">
              <div className="pdf-stats-left">
                <div className="pdf-green-box">
                  <div className="pdf-big-number">
                    {finalOnCampus.toLocaleString()}
                    <span style={{ fontSize: "16px", fontWeight: "normal", opacity: 0.8 }}>
                      {" "}/ {finalTotalEnrolled.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                    {filters?.collegeDepartment ? "DEPT. STUDENTS ON CAMPUS" : "STUDENTS ON CAMPUS"}
                  </div>
                </div>

                <div className="pdf-green-box">
                  <div className="pdf-big-number">
                    {totalEntries.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                    TOTAL ENTRIES
                  </div>
                </div>

                <div className="pdf-green-box">
                  <div className="pdf-big-number">
                    {processedAuthData[0]?.successRate || 0}%
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                    AUTHENTICATION SUCCESS RATE
                  </div>
                </div>

                <div className="pdf-green-box-small-date">
                  <div className="pdf-big-number" style={{ fontSize: "14px" }}>
                    {formatDateRange()}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "white", letterSpacing: "1px" }}>
                    REPORT PERIOD
                  </div>
                </div>
              </div>
            </div>

            <div className="pdf-section-spacing">
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 2 }}>
                  <h3 className="pdf-chart-title">
                    Chart 1: {filters?.collegeDepartment ? `Students — ${filters.collegeDepartment}` : "Distribution of Students by Department"}
                  </h3>

                  <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                    <table className="pdf-table" style={{ width: "100%", fontSize: "10px" }}>
                      <thead>
                        <tr>
                          <th style={thGreen}>No.</th>
                          <th style={{ ...thGreen, textAlign: "left" }}>Department</th>
                          <th style={thGreen}>Present Now</th>
                          <th style={thGreen}>Total Enrolled</th>
                          <th style={thGreen}>% Present</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedCollegeDataFinal.length > 0 ? (
                          processedCollegeDataFinal.map((dept) => (
                            <tr key={dept.id}>
                              <td style={{ padding: "6px", textAlign: "center" }}>{dept.id}</td>
                              <td style={{ padding: "6px", textAlign: "left" }}>{dept.name}</td>
                              <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#d99201" }}>{dept.presentNow.toLocaleString()}</td>
                              <td style={{ padding: "6px", textAlign: "center", fontWeight: "bold", color: "#01311d" }}>{dept.totalEnrolled.toLocaleString()}</td>
                              <td style={{ padding: "6px", textAlign: "center" }}>{dept.percentagePresent.toFixed(1)}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#999" }}>
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
          </div>
        </div>
      </div>

      {/* PAGE 2: STUDENT LOGS TABLE */}
      <div className="pdf-page">
        <div className="pdf-section-spacing">
          <div className="pdf-section-header">
            <div className="pdf-section-indicator" style={{ backgroundColor: "#01311d" }}></div>
            <div className="pdf-section-title-wrapper">
              <h3 className="pdf-section-title">
                {filters?.actionType === "entry"
                  ? "STUDENT ENTRY LOGS"
                  : filters?.actionType === "exit"
                    ? "STUDENT EXIT LOGS"
                    : "STUDENT ENTRY & EXIT LOGS"}
              </h3>
              <p className="pdf-section-subtitle">
                {filters?.actionType === "entry"
                  ? "Student entry records"
                  : filters?.actionType === "exit"
                    ? "Student exit records"
                    : "Complete session history - each row represents one entry-exit pair"}{" "}
                &nbsp;|&nbsp;
                <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                <strong>Total Records:</strong> {totalRecordsForFooter}
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
                  <th className="pdf-th-section">Section</th>  {/* ← ADD THIS */}
                  <th className="pdf-th-year">Year Level</th>

                  {filters?.actionType === "entry" && (
                    <>
                      <th className="pdf-th-time">ENTRY TIME</th>
                      <th className="pdf-th-method">ENTRY METHOD</th>
                    </>
                  )}

                  {filters?.actionType === "exit" && (
                    <>
                      <th className="pdf-th-time">EXIT TIME</th>
                      <th className="pdf-th-method">EXIT METHOD</th>
                    </>
                  )}

                  {(!filters?.actionType || filters?.actionType === "both") && (
                    <>
                      <th className="pdf-th-session">SESSION #</th>
                      <th className="pdf-th-time">ENTRY TIME</th>
                      <th className="pdf-th-method">ENTRY METHOD</th>
                      <th className="pdf-th-time">EXIT TIME</th>
                      <th className="pdf-th-method">EXIT METHOD</th>
                      <th className="pdf-th-status">STATUS</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filters?.actionType === "entry" &&
                  (finalEntryLogs.length > 0 ? (
                    finalEntryLogs.map((log, i) => (
                      <tr key={`entry-${i}`} className={i % 2 === 0 ? "pdf-row-even" : "pdf-row-odd"}>
                        <td className="pdf-td-no">{i + 1}</td>
                        <td className="pdf-td-id">{log.studentId || log.student_id || "N/A"}</td>
                        <td className="pdf-td-name">{log.name || log.student_name || "Unknown"}</td>
                        <td className="pdf-td-dept">{log.department || log.collegeDept || log.college || "N/A"}</td>
                        <td className="pdf-td-section">{log.section || log.section_name || "N/A"}</td>  
                        <td className="pdf-td-year">{log.yearLevel || log.year || "N/A"}</td>
                        <td className="pdf-td-time-entry">{log.dateTime || log.date || log.time || log.timestamp || "—"}</td>
                        <td className="pdf-td-method">{log.method || log.authMethod || "Face Recognition"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="pdf-row-empty">
                      <td colSpan={7} className="pdf-empty-message">No entry records found</td>
                    </tr>
                  ))}

                {filters?.actionType === "exit" &&
                  (finalExitLogs.length > 0 ? (
                    finalExitLogs.map((log, i) => (
                      <tr key={`exit-${i}`} className={i % 2 === 0 ? "pdf-row-even" : "pdf-row-odd"}>
                        <td className="pdf-td-no">{i + 1}</td>
                        <td className="pdf-td-id">{log.studentId || log.student_id || "N/A"}</td>
                        <td className="pdf-td-name">{log.name || log.student_name || "Unknown"}</td>
                        <td className="pdf-td-dept">{log.department || log.collegeDept || log.college || "N/A"}</td>
                        <td className="pdf-td-section">{log.section || log.section_name || "N/A"}</td> 
                        <td className="pdf-td-year">{log.yearLevel || log.year || "N/A"}</td>
                        <td className="pdf-td-time-exit">{log.dateTime || log.date || log.time || log.timestamp || "—"}</td>
                        <td className="pdf-td-method">{log.method || log.authMethod || "Face Recognition"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="pdf-row-empty">
                      <td colSpan={7} className="pdf-empty-message">No exit records found</td>
                    </tr>
                  ))}

                {(!filters?.actionType || filters?.actionType === "both") &&
                  (finalMergedLogs.length > 0 ? (
                    finalMergedLogs.map((session, i) => (
                      <tr key={`session-${i}`} className={i % 2 === 0 ? "pdf-row-even" : "pdf-row-odd"}>
                        <td className="pdf-td-no">{i + 1}</td>
                        <td className="pdf-td-id">{session.studentId}</td>
                        <td className="pdf-td-name">{session.name}</td>
                        <td className="pdf-td-dept">{session.department}</td>
                        <td className="pdf-td-section">{session.section || "N/A"}</td> 
                        <td className="pdf-td-year">{session.yearLevel}</td>
                        <td className="pdf-td-session">{session.sessionNumber}</td>
                        <td className="pdf-td-time-entry">{session.entryTime}</td>
                        <td className="pdf-td-method">{session.entryMethod}</td>
                        <td className="pdf-td-time-exit">{session.exitTime}</td>
                        <td className="pdf-td-method">{session.exitMethod}</td>
                        <td className="pdf-td-status">
                          <span className={`status-badge ${session.status.startsWith("Still Inside") ? "status-inside" : session.status === "Completed" ? "status-completed" : "status-exit-only"}`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="pdf-row-empty">
                      <td colSpan={11} className="pdf-empty-message">No entry or exit records found for the selected filters</td>
                    </tr>
                  ))}
              </tbody>

              {totalRecordsForFooter > 0 && (
                <tfoot>
                  <tr className="pdf-footer-row">
                    <td colSpan={filters?.actionType === "entry" ? 8 : filters?.actionType === "exit" ? 8 : 12} className="pdf-footer-message">
                      <strong>Summary:</strong>&nbsp; Total{" "}
                      {filters?.actionType === "entry"
                        ? "Entry"
                        : filters?.actionType === "exit"
                          ? "Exit"
                          : "Session"}{" "}
                      Records: {totalRecordsForFooter}
                      {filters?.actionType === "both" && finalMergedLogs.length > 0 && (
                        <>
                          &nbsp;|&nbsp;
                          <span className="text-green">
                            Still Inside: {finalMergedLogs.filter((s) => s.status.startsWith("Still Inside")).length}
                          </span>
                          &nbsp;|&nbsp;
                          <span className="text-blue">
                            Completed: {finalMergedLogs.filter((s) => s.status === "Completed").length}
                          </span>
                        </>
                      )}
                      &nbsp;|&nbsp; Generated on {generationDate}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
);
  },
);
{
  /** THIS IS THE ALTERNATIVE FOR THE MERGED */
}

{
  /**import React, { useRef, forwardRef, useImperativeHandle } from 'react';
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
      margin: 0,
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

  // FIXED: Process sessions to handle multiple entries/exits per student
  const processSessions = (entries, exits) => {
    // Create copies with proper timestamp parsing
    const allEntryLogs = entries.map(log => ({
      ...log,
      type: 'entry',
      timestamp: new Date(log.dateTime || log.date || log.time || log.timestamp || log.log_time)
    })).filter(log => !isNaN(log.timestamp.getTime()));
    
    const allExitLogs = exits.map(log => ({
      ...log,
      type: 'exit',
      timestamp: new Date(log.dateTime || log.date || log.time || log.timestamp || log.log_time)
    })).filter(log => !isNaN(log.timestamp.getTime()));
    
    // Combine and sort by timestamp
    const allLogs = [...allEntryLogs, ...allExitLogs].sort((a, b) => a.timestamp - b.timestamp);
    
    // Group by student
    const studentMap = new Map();
    
    allLogs.forEach(log => {
      const studentId = log.studentId || log.student_id;
      if (!studentId) return;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId: studentId,
          name: log.name || log.student_name || 'Unknown',
          department: log.department || log.collegeDept || log.college || 'N/A',
          yearLevel: log.yearLevel || log.year || 'N/A',
          pendingEntry: null,
          sessions: []
        });
      }
      
      const student = studentMap.get(studentId);
      const formattedTime = log.timestamp.toLocaleString('en-PH', { hour12: true });
      const method = log.method || log.authMethod || 'Face Recognition';
      
      if (log.type === 'entry') {
        // If there's a pending entry without exit, save it first
        if (student.pendingEntry) {
          student.sessions.push({
            entryTime: student.pendingEntry.time,
            entryMethod: student.pendingEntry.method,
            exitTime: '—',
            exitMethod: '—',
            status: 'Inside Campus (No Exit)'
          });
        }
        // Start new pending entry
        student.pendingEntry = {
          time: formattedTime,
          method: method,
          rawTime: log.timestamp
        };
      } else if (log.type === 'exit') {
        if (student.pendingEntry && student.pendingEntry.rawTime < log.timestamp) {
          // Pair with pending entry
          student.sessions.push({
            entryTime: student.pendingEntry.time,
            entryMethod: student.pendingEntry.method,
            exitTime: formattedTime,
            exitMethod: method,
            status: 'Completed'
          });
          student.pendingEntry = null;
        } else {
          // Exit without matching entry
          student.sessions.push({
            entryTime: '—',
            entryMethod: '—',
            exitTime: formattedTime,
            exitMethod: method,
            status: 'Exit Only'
          });
        }
      }
    });
    
    // Add any remaining pending entries (student still inside)
    for (const [studentId, student] of studentMap.entries()) {
      if (student.pendingEntry) {
        student.sessions.push({
          entryTime: student.pendingEntry.time,
          entryMethod: student.pendingEntry.method,
          exitTime: '—',
          exitMethod: '—',
          status: 'Still Inside Campus'
        });
      }
    }
    
    // Flatten all sessions
    const allSessions = [];
    for (const [studentId, student] of studentMap.entries()) {
      student.sessions.forEach((session, idx) => {
        allSessions.push({
          studentId: student.studentId,
          name: student.name,
          department: student.department,
          yearLevel: student.yearLevel,
          sessionNumber: idx + 1,
          entryTime: session.entryTime,
          entryMethod: session.entryMethod,
          exitTime: session.exitTime,
          exitMethod: session.exitMethod,
          status: session.status
        });
      });
    }
    
    return allSessions;
  };

  // Process the sessions
  let finalMergedLogs = [];
  if (finalEntryLogs.length > 0 || finalExitLogs.length > 0) {
    finalMergedLogs = processSessions(finalEntryLogs, finalExitLogs);
    // Sort by student name then session number
    finalMergedLogs.sort((a, b) => {
      if (a.name === b.name) return a.sessionNumber - b.sessionNumber;
      return a.name.localeCompare(b.name);
    });
    // Add sequential numbering
    finalMergedLogs.forEach((log, idx) => { log.no = idx + 1; });
  }

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

  const formatDateRange = () => {
    if (dateRange && dateRange !== 'All Time') return dateRange;
    if (filters?.dateRange) {
      const { from, to } = filters.dateRange;
      if (from && to) return `${from} - ${to}`;
    }
    if (filters?.from && filters?.to) return `${filters.from} - ${filters.to}`;
    return 'All Time';
  };

  const getAppliedFiltersSummary = () => {
    const s = [];
    if (filters?.collegeDepartment && filters.collegeDepartment !== 'all') 
      s.push(`Department: ${filters.collegeDepartment}`);
    if (filters?.yearLevel && filters.yearLevel !== 'all') 
      s.push(`Year Level: ${filters.yearLevel}`);
    if (filters?.enrollmentStatus && filters.enrollmentStatus !== 'all') 
      s.push(`Status: ${filters.enrollmentStatus}`);
    if (filters?.actionType && filters.actionType !== 'both')
      s.push(`Action: ${filters.actionType === 'entry' ? 'Entry Only' : 'Exit Only'}`);
    return s.length > 0 ? s.join(' | ') : 'No additional filters applied';
  };

  const thGreen = { backgroundColor: '#01311d', color: 'white', padding: '8px' };

  const totalRecordsForFooter = filters?.actionType === 'entry' 
    ? finalEntryLogs.length 
    : filters?.actionType === 'exit' 
      ? finalExitLogs.length 
      : finalMergedLogs.length;

  const pageCount = 3 + (visitorLogsArray.length > 0 ? 1 : 0) + (finalMergedLogs.length > 0 ? 1 : 0);


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
              <h1 className="pdf-main-title">SUMMARY REPORT</h1>
              <p className="pdf-subtitle">
                The summary report provides an overview of student entrance and exit activity within the selected date range. It presents key attendance metrics, authentication method distribution, traffic trends and detailed logs to support administrative monitoring and data-driven decision-making
                {filters?.collegeDepartment ? ` — ${filters.collegeDepartment}` : ''}
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
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', letterSpacing: '1px' }}>
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
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.9)' }}>
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
          </div>
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
                   'Complete session history - each row represents one entry-exit pair'} &nbsp;|&nbsp;
                  <strong>Filters:</strong> {getAppliedFiltersSummary()} &nbsp;|&nbsp;
                  <strong>Date:</strong> {formatDateRange()} &nbsp;|&nbsp;
                  <strong>Total Records:</strong> {totalRecordsForFooter}
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
                        <th className="pdf-th-session">SESSION #</th>
                        <th className="pdf-th-time">ENTRY TIME</th>
                        <th className="pdf-th-method">ENTRY METHOD</th>
                        <th className="pdf-th-time">EXIT TIME</th>
                        <th className="pdf-th-method">EXIT METHOD</th>
                        <th className="pdf-th-status">STATUS</th>
                      </>
                    )}
                   </tr>
                </thead>
                <tbody>
                  {filters?.actionType === 'entry' && (
                    finalEntryLogs.length > 0 ? (
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
                    ) : (
                      <tr className="pdf-row-empty">
                        <td colSpan={7} className="pdf-empty-message">No entry records found</td>
                      </tr>
                    )
                  )}
                  
                  {filters?.actionType === 'exit' && (
                    finalExitLogs.length > 0 ? (
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
                    ) : (
                      <tr className="pdf-row-empty">
                        <td colSpan={7} className="pdf-empty-message">No exit records found</td>
                      </tr>
                    )
                  )}
                  
                  {(!filters?.actionType || filters?.actionType === 'both') && (
                    finalMergedLogs.length > 0 ? (
                      finalMergedLogs.map((session, i) => (
                        <tr key={`session-${i}`} className={i % 2 === 0 ? 'pdf-row-even' : 'pdf-row-odd'}>
                          <td className="pdf-td-no">{i + 1}</td>
                          <td className="pdf-td-id">{session.studentId}</td>
                          <td className="pdf-td-name">{session.name}</td>
                          <td className="pdf-td-dept">{session.department}</td>
                          <td className="pdf-td-year">{session.yearLevel}</td>
                          <td className="pdf-td-session">{session.sessionNumber}</td>
                          <td className="pdf-td-time-entry">{session.entryTime}</td>
                          <td className="pdf-td-method">{session.entryMethod}</td>
                          <td className="pdf-td-time-exit">{session.exitTime}</td>
                          <td className="pdf-td-method">{session.exitMethod}</td>
                          <td className="pdf-td-status">
                            <span className={`status-badge ${session.status === 'Still Inside Campus' ? 'status-inside' : session.status === 'Completed' ? 'status-completed' : 'status-exit-only'}`}>
                              {session.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="pdf-row-empty">
                        <td colSpan={11} className="pdf-empty-message">No entry or exit records found for the selected filters</td>
                      </tr>
                    )
                  )}
                </tbody>
                
                {totalRecordsForFooter > 0 && (
                  <tfoot>
                    <tr className="pdf-footer-row">
                      <td colSpan={filters?.actionType === 'entry' ? 7 : filters?.actionType === 'exit' ? 7 : 11} 
                          className="pdf-footer-message">
                        <strong>Summary:</strong>&nbsp;
                        Total {filters?.actionType === 'entry' ? 'Entry' : filters?.actionType === 'exit' ? 'Exit' : 'Session'} Records: {totalRecordsForFooter}
                        {filters?.actionType === 'both' && finalMergedLogs.length > 0 && (
                          <>
                            &nbsp;|&nbsp;
                            <span className="text-green">Still Inside: {finalMergedLogs.filter(s => s.status === 'Still Inside Campus').length}</span>
                            &nbsp;|&nbsp;
                            <span className="text-blue">Completed: {finalMergedLogs.filter(s => s.status === 'Completed').length}</span>
                          </>
                        )}
                        &nbsp;|&nbsp;
                        Generated on {generationDate}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
 */
}

GenerateReportPdf.displayName = "GenerateReportPdf";
export default GenerateReportPdf;
