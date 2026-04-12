import html2pdf from 'html2pdf.js';

/**
 * Generate PDF from a React component ref
 * @param {React.RefObject} reportRef - The ref of the element to convert to PDF
 * @param {Object} options - Optional configuration
 * @returns {Promise} - Promise that resolves when PDF is generated
 */
export const generatePDF = async (reportRef, options = {}) => {
  if (!reportRef || !reportRef.current) {
    console.error('Report ref is not available');
    return false;
  }

  const element = reportRef.current;
  
  const defaultOptions = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `student_attendance_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true, useCORS: true, logging: false },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  const config = { ...defaultOptions, ...options };
  
  try {
    await html2pdf().set(config).from(element).save();
    console.log('PDF generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate PDF with custom filename based on filters
 * @param {React.RefObject} reportRef - The ref of the element to convert to PDF
 * @param {Object} filters - Filter criteria from analytics
 */
export const generateReportWithFilters = async (reportRef, filters) => {
  const filename = `attendance_report_${filters.dateRange || 'all'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  
  const options = {
    filename,
    html2canvas: { scale: 2, letterRendering: true }
  };
  
  return generatePDF(reportRef, options);
};