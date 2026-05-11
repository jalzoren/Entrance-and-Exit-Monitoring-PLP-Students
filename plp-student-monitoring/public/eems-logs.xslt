<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>EEMS Log Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #01311d; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th { background-color: #01311d; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .summary { background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>EEMS Entry/Exit Log Report</h1>
        <div class="summary">
          <h3>Summary</h3>
          <p>Total Logs: <xsl:value-of select="/eems_report/summary/totalLogs"/></p>
          <p>Total Entries: <xsl:value-of select="/eems_report/summary/totalEntries"/></p>
          <p>Total Exits: <xsl:value-of select="/eems_report/summary/totalExits"/></p>
          <p>Failed Attempts: <xsl:value-of select="/eems_report/summary/failedAttempts"/></p>
          <p>Students Inside: <xsl:value-of select="/eems_report/summary/studentsInside"/></p>
          <p>Success Rate: <xsl:value-of select="/eems_report/summary/successRate"/></p>
          <p>Generated: <xsl:value-of select="/eems_report/summary/exportDate"/></p>
        </div>
        
        <h3>Log Details</h3>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Time</th><th>Date</th><th>Name</th><th>Student ID</th><th>Department</th><th>Action</th><th>Method</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="/eems_report/logs/log">
              <tr>
                <td><xsl:value-of select="no"/></td>
                <td><xsl:value-of select="time"/></td>
                <td><xsl:value-of select="date"/></td>
                <td><xsl:value-of select="name"/></td>
                <td><xsl:value-of select="studentId"/></td>
                <td><xsl:value-of select="department"/></td>
                <td><xsl:value-of select="action"/></td>
                <td><xsl:value-of select="method"/></td>
                <td><xsl:value-of select="status"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>