/**
 * XML Utilities for EEMS
 * Handles exporting logs and reports to XML format
 */

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export const escapeXml = (str) => {
  if (!str) return '';
  return String(str).replace(/[<>&'"]/g, function(c) {
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

/**
 * Format date for XML export
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
export const formatDateForXml = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString();
};

/**
 * Export logs to XML format
 * @param {Array} logs - Array of log objects
 * @param {number} totalLogs - Total number of logs
 * @param {number} studentsInside - Number of students inside
 * @param {number} entranceCount - Number of entrances
 * @param {number} exitCount - Number of exits
 * @param {number} failedCount - Number of failed attempts
 * @param {boolean} includeDetails - Whether to include detailed logs
 * @returns {string} - XML string
 */
export const exportLogsToXML = (
  logs = [],
  totalLogs = 0,
  studentsInside = 0,
  entranceCount = 0,
  exitCount = 0,
  failedCount = 0,
  includeDetails = true
) => {
  const now = new Date();
  const dateStr = formatDateForXml(now);
  
  // Build logs XML
  let logsXML = '';
  if (includeDetails && logs.length > 0) {
    logsXML = logs.map((log, index) => `
    <log>
      <no>${index + 1}</no>
      <time>${escapeXml(log.time || '')}</time>
      <date>${escapeXml(log.date || '')}</date>
      <fullDateTime>${escapeXml(log.timestamp ? new Date(log.timestamp).toLocaleString() : log.date || '')}</fullDateTime>
      <name>${escapeXml(log.failed ? 'Failed Attempt' : (log.name || 'Unknown'))}</name>
      <studentId>${escapeXml(log.failed ? 'N/A' : (log.studentId || 'N/A'))}</studentId>
      <department>${escapeXml(log.collegeDept || log.department || 'N/A')}</department>
      <yearLevel>${escapeXml(log.yearLevel || 'N/A')}</yearLevel>
      <action>${escapeXml(log.failed ? 'FAILED' : (log.action || 'N/A'))}</action>
      <method>${escapeXml(log.method || 'N/A')}</method>
      <status>${log.failed ? 'Failed' : 'Success'}</status>
      ${log.failed ? `<attemptedName>${escapeXml(log.name || 'Unknown')}</attemptedName>` : ''}
    </log>`).join('');
  } else {
    logsXML = '    <!-- No logs available for the selected filter -->';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<eems_report>
  <header>
    <title>EEMS Entry/Exit Log Report</title>
    <generatedAt>${dateStr}</generatedAt>
    <system>Entrance and Exit Student Monitoring System</system>
    <university>Pamantasan ng Lungsod ng Pasig</university>
  </header>
  <summary>
    <totalLogs>${totalLogs}</totalLogs>
    <totalEntries>${entranceCount}</totalEntries>
    <totalExits>${exitCount}</totalExits>
    <failedAttempts>${failedCount}</failedAttempts>
    <studentsInside>${studentsInside}</studentsInside>
    <successRate>${totalLogs > 0 ? ((entranceCount + exitCount) / totalLogs * 100).toFixed(2) : 0}%</successRate>
    <exportDate>${dateStr}</exportDate>
  </summary>
  <logs>${logsXML}
  </logs>
  <footer>
    <generatedBy>EEMS System</generatedBy>
    <reportType>Entry/Exit Log Report</reportType>
  </footer>
</eems_report>`;
};

/**
 * Export end of day report to XML
 * @param {Array} logs - Array of log objects for the day
 * @param {Object} summary - Summary statistics
 * @returns {string} - XML string
 */
export const exportEndOfDayToXML = (logs = [], summary = {}) => {
  const now = new Date();
  const dateStr = formatDateForXml(now);
  const todayStr = now.toISOString().split('T')[0];
  
  const {
    totalLogs = logs.length,
    entranceCount = logs.filter(l => !l.failed && l.action === 'ENTRY').length,
    exitCount = logs.filter(l => !l.failed && l.action === 'EXIT').length,
    failedCount = logs.filter(l => l.failed).length,
    studentsInside = 0,
    netChange = entranceCount - exitCount
  } = summary;

  let logsXML = '';
  if (logs.length > 0) {
    logsXML = logs.map((log, index) => `
    <log>
      <no>${index + 1}</no>
      <time>${escapeXml(log.time || '')}</time>
      <name>${escapeXml(log.failed ? 'Failed Attempt' : (log.name || 'Unknown'))}</name>
      <studentId>${escapeXml(log.failed ? 'N/A' : (log.studentId || 'N/A'))}</studentId>
      <department>${escapeXml(log.collegeDept || log.department || 'N/A')}</department>
      <action>${escapeXml(log.failed ? 'FAILED' : (log.action || 'N/A'))}</action>
      <method>${escapeXml(log.method || 'N/A')}</method>
    </log>`).join('');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<eems_end_of_day_report>
  <header>
    <title>End of Day Report</title>
    <reportDate>${todayStr}</reportDate>
    <generatedAt>${dateStr}</generatedAt>
    <system>Entrance and Exit Student Monitoring System</system>
    <university>Pamantasan ng Lungsod ng Pasig</university>
  </header>
  <summary>
    <reportDate>${todayStr}</reportDate>
    <totalLogs>${totalLogs}</totalLogs>
    <entries>${entranceCount}</entries>
    <exits>${exitCount}</exits>
    <failedAttempts>${failedCount}</failedAttempts>
    <netChange>${netChange}</netChange>
    <studentsInsideEndOfDay>${studentsInside}</studentsInsideEndOfDay>
    <generatedAt>${dateStr}</generatedAt>
  </summary>
  <dailyLogs>${logsXML}
  </dailyLogs>
  <footer>
    <generatedBy>EEMS System</generatedBy>
    <reportType>End of Day Report</reportType>
  </footer>
</eems_end_of_day_report>`;
};

/**
 * Download XML content as file
 * @param {string} xmlContent - XML content string
 * @param {string} filename - Filename for download
 */
export const downloadXML = (xmlContent, filename = null) => {
  if (!filename) {
    const date = new Date().toISOString().split('T')[0];
    filename = `eems_report_${date}.xml`;
  }
  
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export custom report to XML
 * @param {Object} reportData - Full report data object
 * @returns {string} - XML string
 */
export const exportCustomReportToXML = (reportData) => {
  const {
    logs = [],
    summary = {},
    dateRange = { start: null, end: null },
    filters = {}
  } = reportData;
  
  const now = new Date();
  const dateStr = formatDateForXml(now);

  // Build filters XML
  const filtersXML = Object.entries(filters).map(([key, value]) => 
    `      <filter name="${escapeXml(key)}">${escapeXml(value)}</filter>`
  ).join('\n');

  // Build logs XML
  const logsXML = logs.map((log, index) => `
    <log>
      <no>${index + 1}</no>
      <dateTime>${escapeXml(log.time || log.dateTime || '')}</dateTime>
      <fullDate>${escapeXml(log.timestamp ? new Date(log.timestamp).toLocaleString() : log.date || '')}</fullDate>
      <name>${escapeXml(log.failed ? 'Failed Attempt' : (log.name || 'Unknown'))}</name>
      <studentId>${escapeXml(log.failed ? 'N/A' : (log.studentId || 'N/A'))}</studentId>
      <department>${escapeXml(log.collegeDept || log.department || 'N/A')}</department>
      <yearLevel>${escapeXml(log.yearLevel || 'N/A')}</yearLevel>
      <action>${escapeXml(log.failed ? 'FAILED' : (log.action || 'N/A'))}</action>
      <method>${escapeXml(log.method || 'N/A')}</method>
      <status>${log.failed ? 'Failed' : 'Success'}</status>
    </log>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<eems_custom_report>
  <header>
    <title>Custom Report - Entry/Exit Logs</title>
    <generatedAt>${dateStr}</generatedAt>
    <system>Entrance and Exit Student Monitoring System</system>
    <university>Pamantasan ng Lungsod ng Pasig</university>
  </header>
  <filters>
${filtersXML}
  </filters>
  <dateRange>
    <start>${dateRange.start ? formatDateForXml(dateRange.start) : 'All Time'}</start>
    <end>${dateRange.end ? formatDateForXml(dateRange.end) : 'All Time'}</end>
  </dateRange>
  <summary>
    <totalLogs>${summary.totalLogs || logs.length}</totalLogs>
    <totalEntries>${summary.entranceCount || logs.filter(l => !l.failed && l.action === 'ENTRY').length}</totalEntries>
    <totalExits>${summary.exitCount || logs.filter(l => !l.failed && l.action === 'EXIT').length}</totalExits>
    <failedAttempts>${summary.failedCount || logs.filter(l => l.failed).length}</failedAttempts>
    <studentsInside>${summary.studentsInside || 0}</studentsInside>
  </summary>
  <logs>${logsXML}
  </logs>
  <footer>
    <generatedBy>EEMS System</generatedBy>
    <reportType>Custom Report</reportType>
  </footer>
</eems_custom_report>`;
};

/**
 * Parse XML string to JavaScript object (basic parser)
 * @param {string} xmlString - XML string to parse
 * @returns {Object} - Parsed object
 */
export const parseXMLToJSON = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent);
  }
  
  const result = {};
  
  // Helper to get element text
  const getElementText = (parent, tagName) => {
    const el = parent.querySelector(tagName);
    return el ? el.textContent : '';
  };
  
  // Parse header
  const header = xmlDoc.querySelector('header');
  if (header) {
    result.header = {
      title: getElementText(header, 'title'),
      generatedAt: getElementText(header, 'generatedAt'),
      system: getElementText(header, 'system'),
      university: getElementText(header, 'university')
    };
  }
  
  // Parse summary
  const summary = xmlDoc.querySelector('summary');
  if (summary) {
    result.summary = {
      totalLogs: parseInt(getElementText(summary, 'totalLogs')) || 0,
      totalEntries: parseInt(getElementText(summary, 'totalEntries')) || 0,
      totalExits: parseInt(getElementText(summary, 'totalExits')) || 0,
      failedAttempts: parseInt(getElementText(summary, 'failedAttempts')) || 0,
      studentsInside: parseInt(getElementText(summary, 'studentsInside')) || 0
    };
  }
  
  // Parse logs
  const logs = [];
  const logElements = xmlDoc.querySelectorAll('logs log');
  logElements.forEach((logEl) => {
    logs.push({
      no: parseInt(getElementText(logEl, 'no')) || 0,
      time: getElementText(logEl, 'time'),
      date: getElementText(logEl, 'date'),
      name: getElementText(logEl, 'name'),
      studentId: getElementText(logEl, 'studentId'),
      department: getElementText(logEl, 'department'),
      yearLevel: getElementText(logEl, 'yearLevel'),
      action: getElementText(logEl, 'action'),
      method: getElementText(logEl, 'method'),
      status: getElementText(logEl, 'status')
    });
  });
  result.logs = logs;
  
  return result;
};

/**
 * Validate XML string
 * @param {string} xmlString - XML string to validate
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateXML = (xmlString) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    
    if (parseError) {
      return {
        isValid: false,
        error: parseError.textContent
      };
    }
    
    return {
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

// Default export
export default {
  escapeXml,
  formatDateForXml,
  exportLogsToXML,
  exportEndOfDayToXML,
  downloadXML,
  exportCustomReportToXML,
  parseXMLToJSON,
  validateXML
};