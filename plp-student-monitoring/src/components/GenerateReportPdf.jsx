import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { generatePDF, generateReportWithFilters } from '../utils/pdfGenerator';

const GenerateReportPdf = forwardRef(({ reportData, filters }, ref) => {
  const reportRef = useRef(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    generatePDF: () => generatePDF(reportRef),
    generateWithFilters: () => generateReportWithFilters(reportRef, filters)
  }));

  // Use reportData from props (coming from analytics.jsx)
  const {
    totalStudents = 0,
    totalCapacity = 0,
    dateRange = 'No date range selected',
    collegeData = [],
    genderData = { male: 0, female: 0, maleCount: 0, femaleCount: 0 },
    methodData = [],
    trafficData = { highest: '', lowest: '', peakHour: '' },
    studentLogs = []
  } = reportData;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#e0e0e0', 
      padding: '30px 20px',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      {/* REPORT CONTENT - This gets converted to PDF */}
      <div 
        ref={reportRef} 
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: 'white',
          boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        {/* ========== SUMMARY REPORT HEADER ========== */}
        <div style={{
          padding: '25px 30px 15px 30px',
          borderBottom: '2px solid #000',
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            letterSpacing: '1px'
          }}>
            SUMMARY REPORT
          </h1>
          <p style={{ 
            color: '#333', 
            fontSize: '12px', 
            lineHeight: '1.6',
            marginBottom: '20px'
          }}>
            This summary report provides an overview of student entrance and exit activity within the selected date range. 
            It presents key attendance metrics, authentication method distribution, traffic trends, and detailed logs to 
            support administrative monitoring and data-driven decision-making.
          </p>
          
          {/* Divider */}
          <div style={{ borderTop: '1px solid #ccc', margin: '15px 0' }}></div>
          
          {/* Total Students Banner */}
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#000' }}>
              {totalStudents.toLocaleString()} / {totalCapacity.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '5px', letterSpacing: '1px' }}>
              TOTAL STUDENTS
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {dateRange}
            </div>
          </div>
        </div>

        {/* ========== CHART 1: Distribution by College ========== */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            textTransform: 'uppercase'
          }}>
            Chart 1: Distribution of Students by College
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                  College
                </th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {collegeData.length > 0 ? (
                collegeData.map((college, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 0', fontSize: '12px' }}>{college.name}</td>
                    <td style={{ padding: '6px 0', fontSize: '12px' }}>
                      {college.percentage}% ({college.count}%)
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========== CHART 2: Distribution by Gender ========== */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            textTransform: 'uppercase'
          }}>
            Chart 2: Distribution of Students by Gender
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                  Gender
                </th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', fontSize: '12px' }}>Male</td>
                <td style={{ padding: '6px 0', fontSize: '12px' }}>
                  {genderData.male}% ({genderData.maleCount})
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', fontSize: '12px' }}>Female</td>
                <td style={{ padding: '6px 0', fontSize: '12px' }}>
                  {genderData.female}% ({genderData.femaleCount})
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========== CHART 3: Distribution by Method of Entry ========== */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            textTransform: 'uppercase'
          }}>
            Chart 3: Distribution of Students by Method of Entry
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                  Method of Entry
                </th>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {methodData.length > 0 ? (
                methodData.map((method, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 0', fontSize: '12px' }}>{method.name}</td>
                    <td style={{ padding: '6px 0', fontSize: '12px' }}>
                      {method.percentage}% ({method.count}/{method.total})
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========== CHART 4: Success Rate / Traffic Info ========== */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '15px',
            textTransform: 'uppercase'
          }}>
            Chart 4: Traffic Summary
          </h3>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
              <strong>Highest traffic:</strong> {trafficData.highest || 'Wednesday (1,240 entries)'}
            </div>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
              <strong>Lowest traffic:</strong> {trafficData.lowest || 'Sunday (180 entries)'}
            </div>
            <div style={{ fontSize: '12px' }}>
              <strong>Peak Hour Today:</strong> {trafficData.peakHour || '8:15 AM (320 entries)'}
            </div>
          </div>
        </div>

        {/* ========== TABLE: Student Information ========== */}
        <div style={{ padding: '20px 30px 30px 30px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>No.</th>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>Date & Time</th>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>Student ID</th>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>Name</th>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>College Department</th>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>Action</th>
                <th style={{ padding: '10px 6px', textAlign: 'left', border: '1px solid #ddd', fontWeight: 'bold' }}>Method</th>
              </tr>
            </thead>
            <tbody>
              {studentLogs.length > 0 ? (
                studentLogs.map((log) => (
                  <tr key={log.no}>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>{log.no}</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>{log.dateTime}</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>{log.studentId}</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>{log.name}</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>{log.department}</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>
                      [{log.action || 'Entrance'}]
                    </td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>{log.method || 'Face Recognition'}</td>
                  </tr>
                ))
              ) : (
                // Empty rows as shown in the image
                <>
                  <tr>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>1</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>[Entrance] [Exit]</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>Face Recognition</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>2</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}>3</td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                    <td style={{ padding: '8px 6px', border: '1px solid #ddd' }}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default GenerateReportPdf;