// src/utils/xmlUtils.js

// Helper function to escape XML special characters - with null/undefined handling
export const escapeXml = (str) => {
  // Handle null, undefined, or non-string values
  if (str === null || str === undefined) return '';
  // Convert to string if it's not already
  const stringValue = String(str);
  return stringValue.replace(/[<>&'"]/g, (char) => {
    const escapeMap = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    };
    return escapeMap[char];
  });
};

// Helper function to unescape XML
export const unescapeXml = (str) => {
  if (!str) return '';
  const stringValue = String(str);
  return stringValue.replace(/&lt;|&gt;|&amp;|&apos;|&quot;/g, (entity) => {
    const unescapeMap = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&apos;': "'",
      '&quot;': '"'
    };
    return unescapeMap[entity];
  });
};

// Generate DTD
export const getDTD = () => {
  return `<!DOCTYPE monitor-logs [
  <!ELEMENT monitor-logs (summary, logs)>
  <!ATTLIST monitor-logs generated CDATA #REQUIRED>
  
  <!ELEMENT summary (total-logs, students-inside, entrance-count, exit-count, failed-count)>
  <!ELEMENT total-logs (#PCDATA)>
  <!ELEMENT students-inside (#PCDATA)>
  <!ELEMENT entrance-count (#PCDATA)>
  <!ELEMENT exit-count (#PCDATA)>
  <!ELEMENT failed-count (#PCDATA)>
  
  <!ELEMENT logs (log*)>
  <!ELEMENT log (id, time, timestamp, failed, name?, student-id?, action?, method?)>
  <!ATTLIST log type (success|failed) #REQUIRED>
  
  <!ELEMENT id (#PCDATA)>
  <!ELEMENT time (#PCDATA)>
  <!ELEMENT timestamp (#PCDATA)>
  <!ELEMENT failed (#PCDATA)>
  <!ELEMENT name (#PCDATA)>
  <!ELEMENT student-id (#PCDATA)>
  <!ELEMENT action (#PCDATA)>
  <!ELEMENT method (#PCDATA)>
]>`;
};

// Generate XSLT for styling
export const getXSLT = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>Monitor Logs Report</title>
        <style>
          /* ============================================ */
          /* THEME VARIABLES - Matching your monitor theme */
          /* ============================================ */
          :root {
            --color-bg-main:        #fcfbf4;
            --color-primary:        #548772;
            --color-primary-dark:   rgb(1, 49, 29);
            --color-overlay:        rgba(1, 49, 29, 0.82);
            --color-accent:         #d99201;
            --color-text-light:     #fafafa;
            --color-text-muted:     rgba(250, 250, 250, 0.75);
            --color-card-bg:        rgba(1, 49, 29, 0.55);
            --color-card-border:    rgba(255, 255, 255, 0.15);
            --color-card-hover-bg:  rgba(84, 135, 114, 0.45);
            --color-divider:        rgba(255, 255, 255, 0.35);
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
            background: var(--color-bg-main);
            color: #1a1a1a;
            line-height: 1.5;
          }
          
          /* Container */
          .report-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
          }
          
          /* Header Card */
          .header-card {
            background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
            color: white;
            padding: 24px 32px;
            border-radius: 12px;
            margin-bottom: 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          
          .header-card h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            font-family: 'Oswald', sans-serif;
            letter-spacing: 1px;
          }
          
          .header-card .subtitle {
            font-size: 14px;
            opacity: 0.9;
            font-family: 'Montserrat', sans-serif;
          }
          
          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            border-top: 4px solid var(--color-primary);
          }
          
          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          }
          
          .stat-card h3 {
            font-size: 14px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            font-family: 'Montserrat', sans-serif;
          }
          
          .stat-card .value {
            font-size: 36px;
            font-weight: 700;
            color: var(--color-primary-dark);
            font-family: 'Oswald', sans-serif;
          }
          
          .stat-card.success .value { color: var(--color-primary); }
          .stat-card.danger .value { color: #dc3545; }
          .stat-card.warning .value { color: var(--color-accent); }
          
          /* Filter Bar */
          .filter-bar {
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          
          .filter-btn {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #e0e0e0;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
          }
          
          .filter-btn:hover {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
            transform: translateY(-1px);
          }
          
          /* Table */
          .logs-table {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th {
            background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%);
            color: white;
            padding: 14px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 0.5px;
          }
          
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
          }
          
          tr:hover {
            background: #f9f9f9;
          }
          
          /* Badges */
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .badge.success {
            background: #e8f5e9;
            color: #2e7d32;
          }
          
          .badge.failed {
            background: #ffebee;
            color: #c62828;
          }
          
          .badge.entry {
            background: #e3f2fd;
            color: #1565c0;
          }
          
          .badge.exit {
            background: #fff3e0;
            color: #e65100;
          }
          
          .badge.method {
            background: #f3e5f5;
            color: #6a1b9a;
          }
          
          /* Log entry rows */
          .log-row.success {
            border-left: 3px solid var(--color-primary);
          }
          
          .log-row.failed {
            border-left: 3px solid #dc3545;
            background: #fff5f5;
          }
          
          /* Footer */
          .report-footer {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            color: #666;
            font-size: 12px;
            font-family: 'Montserrat', sans-serif;
          }
          
          /* Empty state */
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            font-family: 'Montserrat', sans-serif;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .report-container {
              padding: 10px;
            }
            
            .header-card {
              padding: 16px 20px;
            }
            
            .header-card h1 {
              font-size: 22px;
            }
            
            .stats-grid {
              gap: 12px;
            }
            
            .stat-card {
              padding: 12px;
            }
            
            .stat-card .value {
              font-size: 28px;
            }
            
            th, td {
              padding: 8px 12px;
              font-size: 12px;
            }
            
            .badge {
              padding: 2px 6px;
              font-size: 10px;
            }
          }
          
          @media (max-width: 640px) {
            .filter-bar {
              justify-content: center;
            }
            
            table {
              font-size: 12px;
            }
            
            th, td {
              padding: 8px 10px;
            }
          }
        </style>
        <script>
          <![CDATA[
          function filterTable(type) {
            var rows = document.querySelectorAll('.log-row');
            for (var i = 0; i < rows.length; i++) {
              var row = rows[i];
              if (type === 'all') {
                row.style.display = '';
              } else if (type === 'success' && row.classList.contains('failed')) {
                row.style.display = 'none';
              } else if (type === 'failed' && !row.classList.contains('failed')) {
                row.style.display = 'none';
              } else {
                row.style.display = '';
              }
            }
          }
          ]]>
        </script>
      </head>
      <body>
        <div class="report-container">
          <!-- Header -->
          <div class="header-card">
            <h1>REAL-TIME MONITOR - REPORT</h1>
            <p class="subtitle">Generated on: <xsl:value-of select="monitor-logs/@generated"/></p>
          </div>
          
          <!-- Statistics Summary -->
          <div class="stats-grid">
            <div class="stat-card success">
              <h3>Total Logs</h3>
              <div class="value"><xsl:value-of select="monitor-logs/summary/total-logs"/></div>
            </div>
            <div class="stat-card success">
              <h3>Students Inside</h3>
              <div class="value"><xsl:value-of select="monitor-logs/summary/students-inside"/></div>
            </div>
            <div class="stat-card success">
              <h3>Entrance</h3>
              <div class="value"><xsl:value-of select="monitor-logs/summary/entrance-count"/></div>
            </div>
            <div class="stat-card warning">
              <h3>Exit</h3>
              <div class="value"><xsl:value-of select="monitor-logs/summary/exit-count"/></div>
            </div>
            <div class="stat-card danger">
              <h3>Failed Attempts</h3>
              <div class="value"><xsl:value-of select="monitor-logs/summary/failed-count"/></div>
            </div>
          </div>
          
          <!-- Filter Controls -->
          <div class="filter-bar">
            <button class="filter-btn" onclick="filterTable('all')">All Logs</button>
            <button class="filter-btn" onclick="filterTable('success')">Success Only</button>
            <button class="filter-btn" onclick="filterTable('failed')">Failed Only</button>
          </div>
          
          <!-- Logs Table -->
          <div class="logs-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Action</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="monitor-logs/logs/log">
                  <tr class="log-row">
                    <xsl:attribute name="class">
                      <xsl:choose>
                        <xsl:when test="failed='true'">log-row failed</xsl:when>
                        <xsl:otherwise>log-row success</xsl:otherwise>
                      </xsl:choose>
                    </xsl:attribute>
                    <td><xsl:value-of select="time"/></td>
                    <td>
                      <xsl:choose>
                        <xsl:when test="failed='true'">
                          <span class="badge failed">Failed</span>
                        </xsl:when>
                        <xsl:otherwise>
                          <span class="badge success">Success</span>
                        </xsl:otherwise>
                      </xsl:choose>
                    </td>
                    <td><xsl:value-of select="name"/></td>
                    <td><xsl:value-of select="student-id"/></td>
                    <td>
                      <xsl:choose>
                        <xsl:when test="action='ENTRY'">
                          <span class="badge entry">ENTRY</span>
                        </xsl:when>
                        <xsl:when test="action='EXIT'">
                          <span class="badge exit">EXIT</span>
                        </xsl:when>
                        <xsl:otherwise>
                          <span class="badge failed">FAILED</span>
                        </xsl:otherwise>
                      </xsl:choose>
                    </td>
                    <td><span class="badge method"><xsl:value-of select="method"/></span></td>
                  </tr>
                </xsl:for-each>
                <xsl:if test="count(monitor-logs/logs/log) = 0">
                  <tr>
                    <td colspan="6" class="empty-state">No logs to display</td>
                  </tr>
                </xsl:if>
              </tbody>
            </table>
          </div>
          
          <!-- Footer -->
          <div class="report-footer">
            <p>Report generated by Real-Time Monitor System | Total Records: <xsl:value-of select="count(monitor-logs/logs/log)"/></p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
};

export const exportLogsToXML = (filteredLogs, totalLogsCount, studentsInside, entranceCount, exitCount, failedCount, includeXSLT = true) => {
  try {
    const dtd = getDTD();
    const xslt = includeXSLT ? getXSLT() : '';
    
    let logsXML = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    
    logsXML += `${dtd}\n`;
    
    if (includeXSLT && xslt) {
      logsXML += `<?xml-stylesheet type="text/xsl" href="data:text/xsl,${encodeURIComponent(xslt)}"?>\n`;
    }
    
    logsXML += `<monitor-logs generated="${new Date().toISOString()}">\n`;
    logsXML += `  <summary>\n`;
    logsXML += `    <total-logs>${totalLogsCount}</total-logs>\n`;
    logsXML += `    <students-inside>${studentsInside}</students-inside>\n`;
    logsXML += `    <entrance-count>${entranceCount}</entrance-count>\n`;
    logsXML += `    <exit-count>${exitCount}</exit-count>\n`;
    logsXML += `    <failed-count>${failedCount}</failed-count>\n`;
    logsXML += `  </summary>\n`;
    logsXML += `  <logs>\n`;
    
    filteredLogs.forEach(log => {
      if (log.failed) {
        logsXML += `    <log type="failed">\n`;
        logsXML += `      <id>${escapeXml(log.id)}</id>\n`;
        logsXML += `      <time>${escapeXml(log.time)}</time>\n`;
        logsXML += `      <timestamp>${escapeXml(log.timestamp)}</timestamp>\n`;
        logsXML += `      <failed>true</failed>\n`;
        logsXML += `    </log>\n`;
      } else {
        logsXML += `    <log type="success">\n`;
        logsXML += `      <id>${escapeXml(log.id)}</id>\n`;
        logsXML += `      <time>${escapeXml(log.time)}</time>\n`;
        logsXML += `      <timestamp>${escapeXml(log.timestamp)}</timestamp>\n`;
        logsXML += `      <failed>false</failed>\n`;
        logsXML += `      <name>${escapeXml(log.name)}</name>\n`;
        logsXML += `      <student-id>${escapeXml(log.studentId)}</student-id>\n`;
        logsXML += `      <action>${escapeXml(log.action)}</action>\n`;
        logsXML += `      <method>${escapeXml(log.method)}</method>\n`;
        logsXML += `    </log>\n`;
      }
    });
    
    logsXML += `  </logs>\n`;
    logsXML += `</monitor-logs>`;
    
    return logsXML;
  } catch (error) {
    console.error("Error in exportLogsToXML:", error);
    throw error;
  }
};

export const downloadXML = (xmlContent, filename = null) => {
  try {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const downloadFilename = filename || `monitor-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("Error downloading XML:", error);
    throw error;
  }
};

export const downloadXSLT = () => {
  try {
    const xslt = getXSLT();
    const blob = new Blob([xslt], { type: 'application/xslt+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitor-stylesheet-${new Date().toISOString().replace(/[:.]/g, '-')}.xsl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading XSLT:", error);
    throw error;
  }
};

export const validateXMLWithDTD = (xmlContent) => {
  return new Promise((resolve, reject) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        reject(new Error('XML validation failed: Invalid XML format'));
      }
      
      const requiredElements = ['monitor-logs', 'summary', 'logs'];
      for (const element of requiredElements) {
        if (!xmlDoc.getElementsByTagName(element)[0]) {
          reject(new Error(`Missing required element: ${element}`));
        }
      }
      
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

export const importLogsFromXML = (xmlContent) => {
  return new Promise((resolve, reject) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        reject(new Error('Invalid XML format'));
      }
      
      const logs = Array.from(xmlDoc.getElementsByTagName('log')).map(logElem => {
        const failed = logElem.getElementsByTagName('failed')[0]?.textContent === 'true';
        
        if (failed) {
          return {
            id: logElem.getElementsByTagName('id')[0]?.textContent || Date.now().toString(),
            time: logElem.getElementsByTagName('time')[0]?.textContent || new Date().toLocaleTimeString(),
            timestamp: parseInt(logElem.getElementsByTagName('timestamp')[0]?.textContent) || Date.now(),
            failed: true
          };
        } else {
          return {
            id: logElem.getElementsByTagName('id')[0]?.textContent || Date.now().toString(),
            time: logElem.getElementsByTagName('time')[0]?.textContent || new Date().toLocaleTimeString(),
            timestamp: parseInt(logElem.getElementsByTagName('timestamp')[0]?.textContent) || Date.now(),
            failed: false,
            name: unescapeXml(logElem.getElementsByTagName('name')[0]?.textContent || ''),
            studentId: unescapeXml(logElem.getElementsByTagName('student-id')[0]?.textContent || ''),
            action: unescapeXml(logElem.getElementsByTagName('action')[0]?.textContent || ''),
            method: unescapeXml(logElem.getElementsByTagName('method')[0]?.textContent || '')
          };
        }
      });
      
      resolve(logs);
    } catch (err) {
      reject(err);
    }
  });
};

// Read XML file
export const readXMLFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};