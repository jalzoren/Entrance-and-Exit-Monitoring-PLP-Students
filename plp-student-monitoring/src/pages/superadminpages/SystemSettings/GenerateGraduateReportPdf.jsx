import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import html2pdf from 'html2pdf.js';
import '../../../componentscss/GenerateGraduateReportPdf.css';

const GenerateGraduateReportPdf = forwardRef(
  ({ reportData = [], filters = {} }, ref) => {
    const reportRef = useRef(null);

    const handleGeneratePDF = async () => {
      if (!reportRef.current) {
        console.error('Report ref is not available');
        return;
      }

      const opt = {
        margin: 0.2,
        filename: `Graduates_Report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          letterRendering: true,
          useCORS: true,
          logging: false,
          scrollY: 0,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
      };

      try {
        await html2pdf().set(opt).from(reportRef.current).save();
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    };

    useImperativeHandle(ref, () => ({
      generatePDF: handleGeneratePDF,
    }));

    const leftLogoSrc1 = '/pasig.png';
    const leftLogoSrc2 = '/pasig_agos.png';
    const leftLogoSrc3 = '/logo.png';
    const rightLogoSrc = '/logo3.png';

    const generationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const graduatesList = Array.isArray(reportData) ? reportData : [];
    const totalGraduates = graduatesList.length;

    const thStyle = {
      backgroundColor: '#01311d',
      color: 'white',
      padding: '9px',
      textAlign: 'left',
      fontSize: '9px',
      fontWeight: 'bold',
      borderBottom: '2px solid #01311d',
    };

    return (
      <div className="ggr-container">
        <div ref={reportRef} className="ggr-report">
          {/* Header */}
          <div className="ggr-header">
            <div className="ggr-logos-row">
              <div className="ggr-left-logos">
                {[leftLogoSrc1, leftLogoSrc2, leftLogoSrc3, rightLogoSrc].map((src, i) => (
                  <div
                    key={i}
                    className="ggr-logo-box"
                    style={
                      i === 1
                        ? { width: '50px', height: '50px' }
                        : i === 3
                          ? { width: '55px', height: '55px' }
                          : {}
                    }
                  >
                    <img
                      src={src}
                      alt={`Logo ${i + 1}`}
                      className="ggr-logo-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="ggr-center-text">
                <div className="ggr-university-name">PAMANTASAN NG LUNGSOD NG PASIG</div>
                <div className="ggr-system-title">ENTRANCE AND EXIT STUDENT MONITORING SYSTEM</div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #01311d', margin: '6px 0 4px 0' }}></div>
            <div style={{ borderTop: '1px solid #d0d0d0', margin: '4px 0' }}></div>
          </div>

          {/* Report Summary */}
          <div className="ggr-summary-section">
            <div className="ggr-summary-header">
              <div className="ggr-summary-title">
                <div>SUMMARY REPORT</div>
                <div>FOR GRADUATED STUDENTS</div>
              </div>
              <div className="ggr-summary-description">
                <div>The summary report provides an overview of students that</div>
                <div>graduated within the selected date range.</div>
              </div>
            </div>

            <div className="ggr-summary-boxes">
              <div className="ggr-summary-box ggr-box-primary">
                <div className="ggr-box-value">{totalGraduates}</div>
                <div className="ggr-box-label">TOTAL GRADUATES</div>
              </div>

              <div className="ggr-summary-box ggr-box-darker">
                <div className="ggr-box-label-top">REPORT PERIOD</div>
                <div className="ggr-box-value-date">
                  {filters.dateFrom && filters.dateTo 
                    ? `${filters.dateFrom} - ${filters.dateTo}`
                    : filters.dateFrom 
                    ? filters.dateFrom
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Graduates Table */}
          <div className="ggr-table-container">
            <table className="ggr-table" style={{ color: '#01311d' }}>
              <thead>
                <tr>
                  <th style={thStyle}>No.</th>
                  <th style={thStyle}>Student ID</th>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Program</th>
                  <th style={thStyle}>Year Level</th>
                  <th style={thStyle}>Section</th>
                  <th style={thStyle}>Archived Date</th>
                </tr>
              </thead>
              <tbody>
                {graduatesList.length > 0 ? (
                  graduatesList.map((graduate, idx) => (
                    <tr
                      key={graduate.student_id || idx}
                      className={idx % 2 === 0 ? 'ggr-row-even' : 'ggr-row-odd'}
                    >
                      <td className="ggr-td-no" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible' }}>{idx + 1}</td>
                      <td className="ggr-td-id" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible' }}>{graduate.student_id || 'N/A'}</td>
                      <td className="ggr-td-name" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible' }}>
                        {`${graduate.last_name || ''}, ${graduate.first_name || ''}`.trim() || 'N/A'}
                      </td>
                      <td className="ggr-td-dept" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible' }}>
                        {graduate.college_department || 'N/A'}
                      </td>
                      <td className="ggr-td-program" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible' }}>
                        {graduate.program_name || 'N/A'}
                      </td>
                      <td className="ggr-td-year" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible', textAlign: 'center' }}>
                        {graduate.year_level || 'N/A'}
                      </td>
                      <td className="ggr-td-section" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible', textAlign: 'center' }}>
                        {graduate.section || graduate.section_name || 'N/A'}
                      </td>
                      <td className="ggr-td-date" style={{ display: 'table-cell', verticalAlign: 'middle', overflow: 'visible', textAlign: 'center' }}>
                        {graduate.updated_at
                          ? new Date(graduate.updated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="ggr-empty-message">
                      No graduated students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="ggr-footer">
            <div className="ggr-footer-text">
              <strong>System:</strong> Entrance and Exit Monitoring System (EEMS)
            </div>
            <div className="ggr-footer-text">
              <strong>Generated:</strong> {new Date().toLocaleString('en-US')}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default GenerateGraduateReportPdf;
