<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>EEMS Report - Student Entrance and Exit Monitoring System</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 40px 20px;
            color: #333;
          }
          .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .report-header {
            background: linear-gradient(135deg, #01311d 0%, #0a5c3e 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .report-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .report-header p {
            opacity: 0.9;
            font-size: 14px;
          }
          .report-meta {
            background: #e8f5e9;
            padding: 20px 30px;
            border-bottom: 1px solid #c8e6c9;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 15px;
          }
          .meta-item {
            font-size: 14px;
          }
          .meta-label {
            font-weight: bold;
            color: #01311d;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f9f9f9;
          }
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            border: 1px solid #e0e0e0;
          }
          .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #01311d;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          .section {
            padding: 30px;
            border-bottom: 1px solid #e0e0e0;
          }
          .section-title {
            font-size: 20px;
            color: #01311d;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #d99201;
            display: inline-block;
          }
          .section-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 13px;
          }
          th {
            background-color: #01311d;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .entry-header {
            background-color: #2E7D32;
          }
          .exit-header {
            background-color: #D99201;
          }
          .insights-box {
            background: #f0f7f4;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            border-left: 4px solid #01311d;
          }
          .visitor-stats {
            display: flex;
            gap: 20px;
            margin-top: 15px;
          }
          .visitor-card {
            flex: 1;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
          }
          .visitor-entry {
            background: #e8f5e9;
            border: 1px solid #a5d6a7;
          }
          .visitor-exit {
            background: #fff3e0;
            border: 1px solid #ffe0b2;
          }
          .visitor-value {
            font-size: 28px;
            font-weight: bold;
          }
          .progress-bar {
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 5px;
          }
          .progress-fill {
            background: #d99201;
            height: 20px;
            border-radius: 10px;
            transition: width 0.3s;
          }
          .footer {
            background: #f5f5f5;
            padding: 20px 30px;
            text-align: center;
            font-size: 11px;
            color: #666;
          }
          @media print {
            body {
              background: white;
              padding: 0;
              margin: 0;
            }
            .report-container {
              box-shadow: none;
              border-radius: 0;
            }
            .stats-grid {
              break-inside: avoid;
            }
            .section {
              break-inside: avoid;
            }
            table {
              break-inside: auto;
            }
            tr {
              break-inside: avoid;
              break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- Header -->
          <div class="report-header">
            <h1>ENTRANCE AND EXIT STUDENT MONITORING SYSTEM</h1>
            <p>PAMANTASAN NG LUNGSOD NG PASIG</p>
          </div>
          
          <!-- Meta Information -->
          <div class="report-meta">
            <div class="meta-item">
              <span class="meta-label">Generated:</span> 
              <span><xsl:value-of select="/eems-report/meta/generatedAt"/></span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date Range:</span> 
              <span><xsl:value-of select="/eems-report/meta/dateRange"/></span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Filters:</span> 
              <span>
                <xsl:if test="/eems-report/meta/filters/department != ''">
                  Dept: <xsl:value-of select="/eems-report/meta/filters/department"/>
                </xsl:if>
                <xsl:if test="/eems-report/meta/filters/actionType != 'both' and /eems-report/meta/filters/actionType != ''">
                  <xsl:if test="/eems-report/meta/filters/department != ''"> | </xsl:if>
                  Action: <xsl:value-of select="/eems-report/meta/filters/actionType"/>
                </xsl:if>
                <xsl:if test="/eems-report/meta/filters/from != '' and /eems-report/meta/filters/to != ''">
                  <xsl:if test="/eems-report/meta/filters/department != '' or /eems-report/meta/filters/actionType != ''"> | </xsl:if>
                  <xsl:value-of select="/eems-report/meta/filters/from"/> to <xsl:value-of select="/eems-report/meta/filters/to"/>
                </xsl:if>
              </span>
            </div>
          </div>
          
          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value"><xsl:value-of select="/eems-report/meta/totalStudents"/></div>
              <div class="stat-label">TOTAL STUDENTS ENROLLED</div>
            </div>
            <div class="stat-card">
              <div class="stat-value"><xsl:value-of select="/eems-report/meta/currentOnCampus"/></div>
              <div class="stat-label">CURRENTLY ON CAMPUS</div>
            </div>
            <div class="stat-card">
              <div class="stat-value"><xsl:value-of select="/eems-report/meta/totalEntries"/></div>
              <div class="stat-label">TOTAL ENTRIES</div>
            </div>
            <div class="stat-card">
              <div class="stat-value"><xsl:value-of select="/eems-report/meta/authSuccessRate"/>%</div>
              <div class="stat-label">AUTH SUCCESS RATE</div>
            </div>
          </div>
          
          <!-- Department Distribution -->
          <div class="section">
            <h2 class="section-title">Department Distribution</h2>
            <xsl:if test="count(/eems-report/collegeDistribution/college) > 0">
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Department</th>
                    <th>Present Now</th>
                    <th>Total Enrolled</th>
                    <th>% Present</th>
                    <th>% of Campus</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/collegeDistribution/college">
                    <tr>
                      <td><xsl:value-of select="@no"/></td>
                      <td><xsl:value-of select="@name"/></td>
                      <td><xsl:value-of select="@presentNow"/></td>
                      <td><xsl:value-of select="@totalEnrolled"/></td>
                      <td><xsl:value-of select="@percentagePresent"/>%</td>
                      <td><xsl:value-of select="@percentageOfCampus"/>%</td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>
            <xsl:if test="count(/eems-report/collegeDistribution/college) = 0">
              <p>No department data available.</p>
            </xsl:if>
          </div>
          
          <!-- Traffic Trend -->
          <div class="section">
            <h2 class="section-title">Daily Traffic Trend</h2>
            <xsl:if test="count(/eems-report/trafficChart/day) > 0">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entrances</th>
                    <th>Exits</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/trafficChart/day">
                    <tr>
                      <td><xsl:value-of select="@date"/></td>
                      <td><xsl:value-of select="@entrance"/></td>
                      <td><xsl:value-of select="@exit"/></td>
                      <td><xsl:value-of select="@entrance + @exit"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
              <div class="insights-box">
                <strong>Insights:</strong><br/>
                Highest traffic: <xsl:value-of select="/eems-report/trafficSummary/highest"/> (<xsl:value-of select="/eems-report/trafficSummary/highestEntries"/> entries)<br/>
                Lowest traffic: <xsl:value-of select="/eems-report/trafficSummary/lowest"/> (<xsl:value-of select="/eems-report/trafficSummary/lowestEntries"/> entries)<br/>
                Peak Hour: <xsl:value-of select="/eems-report/meta/peakHour"/>
              </div>
            </xsl:if>
            <xsl:if test="count(/eems-report/trafficChart/day) = 0">
              <p>No traffic data available.</p>
            </xsl:if>
          </div>
          
          <!-- Authentication Methods -->
          <div class="section">
            <h2 class="section-title">Authentication Methods</h2>
            <xsl:if test="count(/eems-report/authMethods/method) > 0">
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Method</th>
                    <th>Attempts</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/authMethods/method">
                    <tr>
                      <td><xsl:value-of select="@no"/></td>
                      <td><xsl:value-of select="@name"/></td>
                      <td><xsl:value-of select="@attempts"/></td>
                      <td><xsl:value-of select="@successRate"/>%</td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>
            <xsl:if test="count(/eems-report/authMethods/method) = 0">
              <p>No authentication data available.</p>
            </xsl:if>
          </div>
          
          <!-- Visitor Stats -->
          <xsl:if test="count(/eems-report/visitorStats/visitor) > 0">
            <div class="section">
              <h2 class="section-title">Visitor Statistics</h2>
              <div class="visitor-stats">
                <div class="visitor-card visitor-entry">
                  <div class="visitor-value">
                    <xsl:value-of select="/eems-report/visitorStats/visitor[@name='ENTRY']/@value"/>
                  </div>
                  <div>Visitor Entries</div>
                </div>
                <div class="visitor-card visitor-exit">
                  <div class="visitor-value">
                    <xsl:value-of select="/eems-report/visitorStats/visitor[@name='EXIT']/@value"/>
                  </div>
                  <div>Visitor Exits</div>
                </div>
              </div>
            </div>
          </xsl:if>
          
          <!-- ENTRY LOGS (Separate Table) -->
          <div class="section">
            <h2 class="section-title" style="color: #2E7D32;">ENTRY LOGS</h2>
            <div class="section-subtitle">
              Student ENTRY Records | Total: <xsl:value-of select="count(/eems-report/logs/entryLogs/entry)"/>
            </div>
            <xsl:if test="count(/eems-report/logs/entryLogs/entry) > 0">
              <table>
                <thead>
                  <tr>
                    <th class="entry-header">No.</th>
                    <th class="entry-header">Date &amp; Time</th>
                    <th class="entry-header">Student ID</th>
                    <th class="entry-header">Name</th>
                    <th class="entry-header">College/Department</th>
                    <th class="entry-header">Year Level</th>
                    <th class="entry-header">Method</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/logs/entryLogs/entry">
                    <xsl:sort select="@dateTime" order="descending"/>
                    <tr>
                      <td><xsl:value-of select="@no"/></td>
                      <td><xsl:value-of select="@dateTime"/></td>
                      <td><xsl:value-of select="@studentId"/></td>
                      <td><xsl:value-of select="@name"/></td>
                      <td><xsl:value-of select="@department"/></td>
                      <td><xsl:value-of select="@yearLevel"/></td>
                      <td><xsl:value-of select="@method"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>
            <xsl:if test="count(/eems-report/logs/entryLogs/entry) = 0">
              <p>No entry records found for the selected filters.</p>
            </xsl:if>
          </div>
          
          <!-- EXIT LOGS (Separate Table) -->
          <div class="section">
            <h2 class="section-title" style="color: #D99201;">EXIT LOGS</h2>
            <div class="section-subtitle">
              Student EXIT Records | Total: <xsl:value-of select="count(/eems-report/logs/exitLogs/exit)"/>
            </div>
            <xsl:if test="count(/eems-report/logs/exitLogs/exit) > 0">
              <table>
                <thead>
                  <tr>
                    <th class="exit-header">No.</th>
                    <th class="exit-header">Date &amp; Time</th>
                    <th class="exit-header">Student ID</th>
                    <th class="exit-header">Name</th>
                    <th class="exit-header">College/Department</th>
                    <th class="exit-header">Year Level</th>
                    <th class="exit-header">Method</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/eems-report/logs/exitLogs/exit">
                    <xsl:sort select="@dateTime" order="descending"/>
                    <tr>
                      <td><xsl:value-of select="@no"/></td>
                      <td><xsl:value-of select="@dateTime"/></td>
                      <td><xsl:value-of select="@studentId"/></td>
                      <td><xsl:value-of select="@name"/></td>
                      <td><xsl:value-of select="@department"/></td>
                      <td><xsl:value-of select="@yearLevel"/></td>
                      <td><xsl:value-of select="@method"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:if>
            <xsl:if test="count(/eems-report/logs/exitLogs/exit) = 0">
              <p>No exit records found for the selected filters.</p>
            </xsl:if>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            ENTRANCE AND EXIT STUDENT MONITORING SYSTEM<br/>
            PAMANTASAN NG LUNGSOD NG PASIG | Powered by College of Computer Studies
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>