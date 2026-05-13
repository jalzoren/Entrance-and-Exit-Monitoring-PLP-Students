// XML Report Utilities for EEMS

/**
 * Converts report data to XML format
 * @param {Object} data - Report data from API
 * @param {Object} filters - Applied filters
 * @returns {string} XML string
 */
export const reportToXml = (data, filters = {}) => {
  const date = new Date();
  const xmlParts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<eems_report>',
    '  <summary>',
    `    <totalStudents>${data.totalStudents || 0}</totalStudents>`,
    `    <currentOnCampus>${data.currentOnCampus || data.studentsInside || 0}</currentOnCampus>`,
    `    <totalEntries>${data.totalEntries || 0}</totalEntries>`,
    `    <totalExits>${data.totalExits || 0}</totalExits>`,
    `    <failedAttempts>${data.failedAttempts?.length || 0}</failedAttempts>`,
    `    <reportDate>${date.toISOString().split('T')[0]}</reportDate>`,
    `    <reportTime>${date.toLocaleTimeString()}</reportTime>`,
    '    <dateRange>',
    `      <from>${filters.from || 'N/A'}</from>`,
    `      <to>${filters.to || 'N/A'}</to>`,
    '    </dateRange>',
    `    <filterApplied>${filters.actionType || 'all'}</filterApplied>`,
    '  </summary>'
  ];

  // Add authentication methods section
  xmlParts.push('  <authentication_methods>');
  if (data.authData && Array.isArray(data.authData)) {
    data.authData.forEach(method => {
      xmlParts.push('    <method>');
      xmlParts.push(`      <name>${escapeXml(method.method || method.name || 'Unknown')}</name>`);
      xmlParts.push(`      <attempts>${method.attempts || 0}</attempts>`);
      xmlParts.push(`      <success>${method.success || 0}</success>`);
      xmlParts.push(`      <successRate>${method.successRate || 0}</successRate>`);
      xmlParts.push('    </method>');
    });
  }
  xmlParts.push('  </authentication_methods>');

  // Add department distribution section
  xmlParts.push('  <department_distribution>');
  if (data.collegeData && Array.isArray(data.collegeData)) {
    data.collegeData.forEach(dept => {
      xmlParts.push('    <department>');
      xmlParts.push(`      <name>${escapeXml(dept.fullCollegeName || dept.collegeName || dept.name || 'Unknown')}</name>`);
      xmlParts.push(`      <presentNow>${dept.presenceNow || 0}</presentNow>`);
      xmlParts.push(`      <totalEnrolled>${dept.totalStudents || 0}</totalEnrolled>`);
      xmlParts.push(`      <percentage>${dept.percentage || 0}</percentage>`);
      xmlParts.push('    </department>');
    });
  }
  xmlParts.push('  </department_distribution>');

  // Add traffic data section
  xmlParts.push('  <traffic_data>');
  if (data.trafficData && Array.isArray(data.trafficData)) {
    data.trafficData.forEach(day => {
      xmlParts.push('    <day>');
      xmlParts.push(`      <date>${day.date || 'N/A'}</date>`);
      xmlParts.push(`      <entrance>${day.entrance || 0}</entrance>`);
      xmlParts.push(`      <exit>${day.exit || 0}</exit>`);
      xmlParts.push('    </day>');
    });
  }
  xmlParts.push('  </traffic_data>');

  // Add logs section
  xmlParts.push('  <logs>');
  
  // Student logs (entries and exits)
  if (data.studentLogs && Array.isArray(data.studentLogs)) {
    data.studentLogs.forEach(log => {
      xmlParts.push('    <log>');
      xmlParts.push(`      <type>student</type>`);
      xmlParts.push(`      <studentId>${escapeXml(log.studentId || 'N/A')}</studentId>`);
      xmlParts.push(`      <name>${escapeXml(log.name || 'Unknown')}</name>`);
      xmlParts.push(`      <department>${escapeXml(log.collegeDept || log.department || 'N/A')}</department>`);
      xmlParts.push(`      <yearLevel>${escapeXml(log.yearLevel || 'N/A')}</yearLevel>`);
      xmlParts.push(`      <action>${log.action || 'N/A'}</action>`);
      xmlParts.push(`      <method>${escapeXml(log.method || 'Unknown')}</method>`);
      xmlParts.push(`      <date>${log.date || 'N/A'}</date>`);
      xmlParts.push(`      <time>${log.time || 'N/A'}</time>`);
      xmlParts.push(`      <timestamp>${log.timestamp || ''}</timestamp>`);
      xmlParts.push('    </log>');
    });
  }

  // Entry logs
  if (data.entryLogs && Array.isArray(data.entryLogs)) {
    data.entryLogs.forEach(log => {
      xmlParts.push('    <log>');
      xmlParts.push(`      <type>entry</type>`);
      xmlParts.push(`      <studentId>${escapeXml(log.studentId || 'N/A')}</studentId>`);
      xmlParts.push(`      <name>${escapeXml(log.name || 'Unknown')}</name>`);
      xmlParts.push(`      <department>${escapeXml(log.collegeDept || log.department || 'N/A')}</department>`);
      xmlParts.push(`      <yearLevel>${escapeXml(log.yearLevel || 'N/A')}</yearLevel>`);
      xmlParts.push(`      <action>ENTRY</action>`);
      xmlParts.push(`      <method>${escapeXml(log.method || 'RFID')}</method>`);
      xmlParts.push(`      <date>${log.date || 'N/A'}</date>`);
      xmlParts.push(`      <time>${log.time || 'N/A'}</time>`);
      xmlParts.push(`      <timestamp>${log.timestamp || ''}</timestamp>`);
      xmlParts.push('    </log>');
    });
  }

  // Exit logs
  if (data.exitLogs && Array.isArray(data.exitLogs)) {
    data.exitLogs.forEach(log => {
      xmlParts.push('    <log>');
      xmlParts.push(`      <type>exit</type>`);
      xmlParts.push(`      <studentId>${escapeXml(log.studentId || 'N/A')}</studentId>`);
      xmlParts.push(`      <name>${escapeXml(log.name || 'Unknown')}</name>`);
      xmlParts.push(`      <department>${escapeXml(log.collegeDept || log.department || 'N/A')}</department>`);
      xmlParts.push(`      <yearLevel>${escapeXml(log.yearLevel || 'N/A')}</yearLevel>`);
      xmlParts.push(`      <action>EXIT</action>`);
      xmlParts.push(`      <method>${escapeXml(log.method || 'RFID')}</method>`);
      xmlParts.push(`      <date>${log.date || 'N/A'}</date>`);
      xmlParts.push(`      <time>${log.time || 'N/A'}</time>`);
      xmlParts.push(`      <timestamp>${log.timestamp || ''}</timestamp>`);
      xmlParts.push('    </log>');
    });
  }

  // Failed attempts
  if (data.failedAttempts && Array.isArray(data.failedAttempts)) {
    data.failedAttempts.forEach(log => {
      xmlParts.push('    <log>');
      xmlParts.push(`      <type>failed</type>`);
      xmlParts.push(`      <name>${escapeXml(log.name || 'Unknown')}</name>`);
      xmlParts.push(`      <action>FAILED</action>`);
      xmlParts.push(`      <method>${escapeXml(log.method || 'Unknown')}</method>`);
      xmlParts.push(`      <date>${log.date || 'N/A'}</date>`);
      xmlParts.push(`      <time>${log.time || 'N/A'}</time>`);
      xmlParts.push(`      <timestamp>${log.timestamp || ''}</timestamp>`);
      if (log.reason) xmlParts.push(`      <reason>${escapeXml(log.reason)}</reason>`);
      xmlParts.push('    </log>');
    });
  }

  xmlParts.push('  </logs>');
  xmlParts.push('</eems_report>');

  return xmlParts.join('\n');
};

/**
 * Converts XML string back to report object
 * @param {string} xmlString - XML string to parse
 * @returns {Object} Report data object
 */
export const xmlToReport = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    console.error('XML parsing error:', parserError.textContent);
    return null;
  }

  const report = {
    summary: {},
    authData: [],
    collegeData: [],
    trafficData: [],
    logs: [],
    studentLogs: [],
    entryLogs: [],
    exitLogs: [],
    failedAttempts: []
  };

  // Parse summary
  const summary = xmlDoc.querySelector('summary');
  if (summary) {
    report.totalStudents = parseInt(summary.querySelector('totalStudents')?.textContent || '0');
    report.currentOnCampus = parseInt(summary.querySelector('currentOnCampus')?.textContent || '0');
    report.totalEntries = parseInt(summary.querySelector('totalEntries')?.textContent || '0');
    report.totalExits = parseInt(summary.querySelector('totalExits')?.textContent || '0');
    report.failedAttempts = parseInt(summary.querySelector('failedAttempts')?.textContent || '0');
    report.reportDate = summary.querySelector('reportDate')?.textContent || '';
    report.reportTime = summary.querySelector('reportTime')?.textContent || '';
    report.dateRange = {
      from: summary.querySelector('dateRange from')?.textContent || '',
      to: summary.querySelector('dateRange to')?.textContent || ''
    };
    report.filterApplied = summary.querySelector('filterApplied')?.textContent || 'all';
  }

  // Parse authentication methods
  const methods = xmlDoc.querySelectorAll('authentication_methods method');
  methods.forEach(method => {
    report.authData.push({
      method: method.querySelector('name')?.textContent || 'Unknown',
      attempts: parseInt(method.querySelector('attempts')?.textContent || '0'),
      success: parseInt(method.querySelector('success')?.textContent || '0'),
      successRate: parseFloat(method.querySelector('successRate')?.textContent || '0')
    });
  });

  // Parse department distribution
  const departments = xmlDoc.querySelectorAll('department_distribution department');
  departments.forEach(dept => {
    report.collegeData.push({
      fullCollegeName: dept.querySelector('name')?.textContent || 'Unknown',
      presenceNow: parseInt(dept.querySelector('presentNow')?.textContent || '0'),
      totalStudents: parseInt(dept.querySelector('totalEnrolled')?.textContent || '0'),
      percentage: parseFloat(dept.querySelector('percentage')?.textContent || '0')
    });
  });

  // Parse traffic data
  const trafficDays = xmlDoc.querySelectorAll('traffic_data day');
  trafficDays.forEach(day => {
    report.trafficData.push({
      date: day.querySelector('date')?.textContent || '',
      entrance: parseInt(day.querySelector('entrance')?.textContent || '0'),
      exit: parseInt(day.querySelector('exit')?.textContent || '0')
    });
  });

  // Parse logs
  const logs = xmlDoc.querySelectorAll('logs log');
  logs.forEach(log => {
    const type = log.querySelector('type')?.textContent || '';
    const logEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      studentId: log.querySelector('studentId')?.textContent || '',
      name: log.querySelector('name')?.textContent || 'Unknown',
      collegeDept: log.querySelector('department')?.textContent || '',
      yearLevel: log.querySelector('yearLevel')?.textContent || '',
      action: log.querySelector('action')?.textContent || '',
      method: log.querySelector('method')?.textContent || 'Unknown',
      date: log.querySelector('date')?.textContent || '',
      time: log.querySelector('time')?.textContent || '',
      timestamp: log.querySelector('timestamp')?.textContent || null,
      failed: type === 'failed' || log.querySelector('action')?.textContent === 'FAILED'
    };

    report.logs.push(logEntry);

    // Categorize by type
    if (type === 'student' || (!type && logEntry.action === 'ENTRY')) {
      report.studentLogs.push(logEntry);
    }
    if (type === 'entry' || logEntry.action === 'ENTRY') {
      report.entryLogs.push(logEntry);
    }
    if (type === 'exit' || logEntry.action === 'EXIT') {
      report.exitLogs.push(logEntry);
    }
    if (type === 'failed' || logEntry.action === 'FAILED') {
      report.failedAttempts.push(logEntry);
    }
  });

  return report;
};

/**
 * Downloads XML file
 * @param {string} xmlContent - XML content to download
 * @param {string} filename - Name of the file
 */
export const downloadXml = (xmlContent, filename) => {
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
 * Converts XML to HTML report
 * @param {string} xmlString - XML string to convert
 * @returns {string} HTML string
 */
export const xmlToHtml = async (xmlString) => {
  const report = xmlToReport(xmlString);
  if (!report) return '<html><body><h1>Error parsing XML</h1></body></html>';

  const date = new Date();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EEMS Report - ${report.reportDate}</title>
  <style>
    body {
      font-family: 'Montserrat', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #01311d 0%, #548772 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0;
      opacity: 0.9;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #01311d;
    }
    .summary-card .label {
      font-size: 14px;
      color: #666;
      margin-top: 8px;
    }
    .section {
      padding: 20px 30px;
      border-bottom: 1px solid #e0e0e0;
    }
    .section h2 {
      color: #01311d;
      margin-top: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background-color: #548772;
      color: white;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .footer {
      padding: 20px 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EEMS Report</h1>
      <p>Generated on ${date.toLocaleString()}</p>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <div class="value">${report.totalStudents || 0}</div>
        <div class="label">Total Students</div>
      </div>
      <div class="summary-card">
        <div class="value">${report.currentOnCampus || 0}</div>
        <div class="label">Current On Campus</div>
      </div>
      <div class="summary-card">
        <div class="value">${report.totalEntries || 0}</div>
        <div class="label">Total Entries</div>
      </div>
      <div class="summary-card">
        <div class="value">${report.totalExits || 0}</div>
        <div class="label">Total Exits</div>
      </div>
    </div>
    
    <div class="section">
      <h2>Department Distribution</h2>
      <table>
        <thead>
          <tr><th>Department</th><th>Present Now</th><th>Total Enrolled</th><th>Percentage</th></tr>
        </thead>
        <tbody>
          ${report.collegeData.map(dept => `
            <tr>
              <td>${escapeHtml(dept.fullCollegeName)}</td>
              <td>${dept.presenceNow}</td>
              <td>${dept.totalStudents}</td>
              <td>${dept.percentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>EEMS - Entry Exit Monitoring System</p>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Opens XML report in a new window
 * @param {string} xmlString - XML string to display
 */
export const openXmlReportWindow = (xmlString) => {
  const htmlContent = xmlToHtml(xmlString);
  const newWindow = window.open();
  newWindow.document.write(htmlContent);
  newWindow.document.close();
};

/**
 * Downloads HTML file
 * @param {string} htmlContent - HTML content to download
 * @param {string} filename - Name of the file
 */
export const downloadHtml = (htmlContent, filename) => {
  const blob = new Blob([htmlContent], { type: 'text/html' });
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
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeXml = (str) => {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, (c) => {
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
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
  if (!str) return '';
  return str.replace(/[&<>]/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      default: return c;
    }
  });
};