/**
 * xmlReportUtils.js
 * 
 * Converts report data (from /api/analytics/report) to an XML string,
 * and provides a parser that reads that XML back into a structured object
 * for use by GenerateReportPdf.
 *
 * WHY XML:
 * - Satisfies the project requirement to use XML in the system.
 * - Acts as a clean, portable document format between the backend response
 *   and the PDF renderer — the same XML could be saved, emailed, or re-imported.
 *
 * FLOW:
 *   API response (JSON)
 *     → reportToXml()   → XML string  (can be stored / inspected)
 *     → xmlToReport()   → report object (fed into GenerateReportPdf)
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Escape special XML characters in a string value. */
function esc(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

/** Wrap content in a tag with optional attributes. */
function tag(name, content, attrs = {}) {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  if (content === null || content === undefined || content === '') {
    return `<${name}${attrStr}/>`;
  }
  return `<${name}${attrStr}>${content}</${name}>`;
}

/** Create a self-closing tag with all data as attributes (useful for simple rows). */
function attrTag(name, obj) {
  const attrs = Object.entries(obj)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  return `<${name}${attrs}/>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON → XML
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a report data object (as returned by GET /api/analytics/report)
 * into a well-formed XML string.
 *
 * @param {Object} reportData  - The object from AnalyticsService.fetchReport()
 * @param {Object} filters     - The filter params used to generate the report
 * @returns {string}           - UTF-8 XML string
 */
export function reportToXml(reportData, filters = {}) {
  const {
    generatedAt    = new Date().toISOString(),
    dateRange      = 'All Time',
    totalStudents  = 0,
    currentOnCampus = 0,
    totalEntries   = 0,
    authSuccessRate = 0,
    peakHour       = null,
    entryLogs      = [],
    exitLogs       = [],
    studentLogs    = [],
    collegeData    = [],
    authData       = [],
    trafficData    = [],
    trafficInsights = {},
    visitorData    = [],
  } = reportData;

  // Determine which logs to use (prefer separated logs if available)
  const finalEntryLogs = entryLogs && entryLogs.length > 0 
    ? entryLogs 
    : studentLogs.filter(log => {
        const action = (log.action || '').toUpperCase();
        return action === 'ENTRY' || action === 'ENTRANCE';
      });
  
  const finalExitLogs = exitLogs && exitLogs.length > 0
    ? exitLogs
    : studentLogs.filter(log => {
        const action = (log.action || '').toUpperCase();
        return action === 'EXIT';
      });

  // ── Meta ────────────────────────────────────────────────────────────────
  const metaXml = tag('meta',
    tag('generatedAt', esc(generatedAt)) +
    tag('dateRange',   esc(dateRange)) +
    tag('totalStudents', totalStudents) +
    tag('currentOnCampus', currentOnCampus) +
    tag('totalEntries', totalEntries) +
    tag('authSuccessRate', authSuccessRate) +
    tag('peakHour', esc(peakHour ? (typeof peakHour === 'object' ? peakHour.hour || JSON.stringify(peakHour) : peakHour) : 'N/A')) +
    tag('filters',
      tag('from',       esc(filters.from || filters.dateRange?.from || '')) +
      tag('to',         esc(filters.to   || filters.dateRange?.to   || '')) +
      tag('department', esc(filters.dept || filters.collegeDepartment || '')) +
      tag('actionType', esc(filters.actionType || 'both'))
    )
  );

  // ── Traffic summary ──────────────────────────────────────────────────────
  const trafficSummaryXml = tag('trafficSummary',
    tag('highest', esc(trafficInsights?.highest?.date || 'N/A')) +
    tag('highestEntries', trafficInsights?.highest?.entrance || 0) +
    tag('lowest',  esc(trafficInsights?.lowest?.date || 'N/A')) +
    tag('lowestEntries', trafficInsights?.lowest?.entrance || 0)
  );

  // ── Traffic chart data ───────────────────────────────────────────────────
  const trafficChartXml = tag('trafficChart',
    (Array.isArray(trafficData) ? trafficData : []).map(d =>
      attrTag('day', { 
        date: d.date, 
        entrance: d.entrance ?? d.entrances ?? 0, 
        exit: d.exit ?? d.exits ?? 0 
      })
    ).join('\n    ')
  );

  // ── College / department distribution ────────────────────────────────────
  const collegeXml = tag('collegeDistribution',
    (Array.isArray(collegeData) ? collegeData : []).map((c, i) =>
      tag('college', null, {
        no:              i + 1,
        name:            c.displayName || c.fullCollegeName || c.collegeName || c.dept_name || 'Unknown',
        presentNow:      c.presentNow ?? c.presenceNow ?? c.currentStudents ?? 0,
        totalEnrolled:   c.totalEnrolled ?? c.totalStudents ?? 0,
        percentagePresent: c.percentagePresent?.toFixed(1) ?? 0,
        percentageOfCampus: c.percentageOfCampus?.toFixed(1) ?? 0,
      })
    ).join('\n    ')
  );

  // ── Authentication method breakdown ──────────────────────────────────────
  const authXml = tag('authMethods',
    (Array.isArray(authData) ? authData : []).map((a, i) =>
      tag('method', null, {
        no:          i + 1,
        name:        a.method || a.authentication_method || 'Unknown',
        attempts:    a.attempts || a.total_attempts || 0,
        successRate: a.successRate || a.success_rate || 0,
      })
    ).join('\n    ')
  );

  // ── Visitor stats ────────────────────────────────────────────────────────
  const visitorXml = tag('visitorStats',
    (Array.isArray(visitorData) ? visitorData : []).map((v, i) =>
      attrTag('visitor', {
        name:  v.name || (v.action?.toUpperCase() === 'ENTRY' ? 'ENTRY' : 'EXIT'),
        value: v.value || 1,
      })
    ).join('\n    ')
  );

  // ── ENTRY Logs (separate table) ──────────────────────────────────────────
  const entryLogsXml = tag('entryLogs',
    finalEntryLogs.map((l, i) =>
      tag('entry', null, {
        no:         i + 1,
        dateTime:   l.dateTime || l.date || l.time || l.timestamp || '',
        studentId:  l.studentId || l.student_id || 'N/A',
        name:       l.name || l.student_name || 'Unknown',
        department: l.department || l.collegeDept || l.college || 'N/A',
        yearLevel:  l.yearLevel || l.year || 'N/A',
        method:     l.method || l.authMethod || 'Face Recognition',
      })
    ).join('\n    ')
  );

  // ── EXIT Logs (separate table) ───────────────────────────────────────────
  const exitLogsXml = tag('exitLogs',
    finalExitLogs.map((l, i) =>
      tag('exit', null, {
        no:         i + 1,
        dateTime:   l.dateTime || l.date || l.time || l.timestamp || '',
        studentId:  l.studentId || l.student_id || 'N/A',
        name:       l.name || l.student_name || 'Unknown',
        department: l.department || l.collegeDept || l.college || 'N/A',
        yearLevel:  l.yearLevel || l.year || 'N/A',
        method:     l.method || l.authMethod || 'Face Recognition',
      })
    ).join('\n    ')
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="eems-report.xslt"?>',
    '<eems-report>',
    '  ' + metaXml,
    '  ' + trafficSummaryXml,
    '  ' + trafficChartXml,
    '  ' + collegeXml,
    '  ' + authXml,
    '  ' + visitorXml,
    '  ' + tag('logs',
      '    ' + entryLogsXml + '\n    ' + exitLogsXml
    ),
    '</eems-report>',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// XML → JSON  (for re-importing or feeding into PDF renderer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an XML string (produced by reportToXml) back into a report data object.
 * Uses the browser's built-in DOMParser — no extra library needed.
 *
 * @param {string} xmlString
 * @returns {Object} report data object compatible with GenerateReportPdf
 */
export function xmlToReport(xmlString) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlString, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid XML: ' + parseError.textContent);

  const getText  = (parent, selector) => parent.querySelector(selector)?.textContent?.trim() ?? '';
  const getNum   = (parent, selector) => Number(getText(parent, selector)) || 0;
  const getAttr  = (el, name)         => el.getAttribute(name) ?? '';
  const getNumA  = (el, name)         => Number(el.getAttribute(name)) || 0;

  // ── Meta ────────────────────────────────────────────────────────────────
  const meta = doc.querySelector('meta');
  const generatedAt     = getText(meta, 'generatedAt');
  const dateRange       = getText(meta, 'dateRange');
  const totalStudents   = getNum(meta, 'totalStudents');
  const currentOnCampus = getNum(meta, 'currentOnCampus');
  const totalEntries    = getNum(meta, 'totalEntries');
  const authSuccessRate = getNum(meta, 'authSuccessRate');
  const peakHour        = getText(meta, 'peakHour');
  
  const filters = {
    from:        getText(meta, 'filters > from'),
    to:          getText(meta, 'filters > to'),
    department:  getText(meta, 'filters > department'),
    actionType:  getText(meta, 'filters > actionType'),
  };

  // ── Traffic summary ──────────────────────────────────────────────────────
  const ts = doc.querySelector('trafficSummary');
  const trafficInsights = {
    highest: {
      date:     getText(ts, 'highest'),
      entrance: getNum(ts, 'highestEntries'),
    },
    lowest: {
      date:     getText(ts, 'lowest'),
      entrance: getNum(ts, 'lowestEntries'),
    },
  };

  // ── Traffic chart ────────────────────────────────────────────────────────
  const trafficData = Array.from(doc.querySelectorAll('trafficChart > day')).map(el => ({
    date:     getAttr(el, 'date'),
    entrance: getNumA(el, 'entrance'),
    exit:     getNumA(el, 'exit'),
  }));

  // ── College distribution ─────────────────────────────────────────────────
  const collegeData = Array.from(doc.querySelectorAll('collegeDistribution > college')).map(el => ({
    displayName:        getAttr(el, 'name'),
    presentNow:         getNumA(el, 'presentNow'),
    totalEnrolled:      getNumA(el, 'totalEnrolled'),
    percentagePresent:  parseFloat(getAttr(el, 'percentagePresent')) || 0,
    percentageOfCampus: parseFloat(getAttr(el, 'percentageOfCampus')) || 0,
  }));

  // ── Auth methods ─────────────────────────────────────────────────────────
  const authData = Array.from(doc.querySelectorAll('authMethods > method')).map(el => ({
    method:      getAttr(el, 'name'),
    attempts:    getNumA(el, 'attempts'),
    successRate: getNumA(el, 'successRate'),
  }));

  // ── Visitor stats ────────────────────────────────────────────────────────
  const visitorData = Array.from(doc.querySelectorAll('visitorStats > visitor')).map(el => ({
    name:  getAttr(el, 'name'),
    value: getNumA(el, 'value'),
  }));

  // ── ENTRY Logs (separate) ────────────────────────────────────────────────
  const entryLogs = Array.from(doc.querySelectorAll('entryLogs > entry')).map(el => ({
    no:         getNumA(el, 'no'),
    dateTime:   getAttr(el, 'dateTime'),
    studentId:  getAttr(el, 'studentId'),
    name:       getAttr(el, 'name'),
    department: getAttr(el, 'department'),
    yearLevel:  getAttr(el, 'yearLevel'),
    method:     getAttr(el, 'method'),
  }));

  // ── EXIT Logs (separate) ─────────────────────────────────────────────────
  const exitLogs = Array.from(doc.querySelectorAll('exitLogs > exit')).map(el => ({
    no:         getNumA(el, 'no'),
    dateTime:   getAttr(el, 'dateTime'),
    studentId:  getAttr(el, 'studentId'),
    name:       getAttr(el, 'name'),
    department: getAttr(el, 'department'),
    yearLevel:  getAttr(el, 'yearLevel'),
    method:     getAttr(el, 'method'),
  }));

  return {
    generatedAt,
    dateRange,
    totalStudents,
    currentOnCampus,
    totalEntries,
    authSuccessRate,
    peakHour: peakHour === 'N/A' ? null : peakHour,
    collegeData,
    authData,
    trafficData,
    trafficInsights,
    visitorData,
    entryLogs,
    exitLogs,
    studentLogs: [...entryLogs, ...exitLogs],
    filters,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XSLT TRANSFORMATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply an XSLT transformation to an XML string.
 * Uses the browser's built-in XSLTProcessor API (supported in all modern browsers).
 *
 * @param {string} xmlString  - The XML content to transform
 * @param {string} xsltString - The XSLT stylesheet content
 * @returns {string}          - The transformed HTML string
 * @throws {Error}            - If XML or XSLT parsing fails
 */
export function applyXsltTransform(xmlString, xsltString) {
  try {
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    
    if (xmlDoc.querySelector('parsererror')) {
      throw new Error('Failed to parse XML: ' + xmlDoc.querySelector('parsererror').textContent);
    }

    // Parse XSLT
    const xsltDoc = parser.parseFromString(xsltString, 'application/xml');
    
    if (xsltDoc.querySelector('parsererror')) {
      throw new Error('Failed to parse XSLT: ' + xsltDoc.querySelector('parsererror').textContent);
    }

    // Create processor and apply transformation
    const processor = new XSLTProcessor();
    processor.importStylesheet(xsltDoc);
    const resultDoc = processor.transformToDocument(xmlDoc);

    // Serialize result to string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(resultDoc);
  } catch (err) {
    console.error('[xmlReportUtils.applyXsltTransform] Error:', err.message);
    throw err;
  }
}

/**
 * Transform XML report to HTML using the embedded XSLT stylesheet.
 * This is a convenience wrapper that fetches the XSLT and applies it.
 *
 * @param {string} xmlString - The XML content to transform
 * @returns {Promise<string>} - The transformed HTML string
 */
export async function xmlToHtml(xmlString) {
  try {
    // Fetch the XSLT stylesheet
    const xsltPath = new URL('eems-report.xslt', import.meta.url).href;
    const response = await fetch(xsltPath);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XSLT: HTTP ${response.status}`);
    }
    
    const xsltString = await response.text();
    
    // Apply transformation
    return applyXsltTransform(xmlString, xsltString);
  } catch (err) {
    console.error('[xmlReportUtils.xmlToHtml] Error:', err.message);
    throw err;
  }
}

/**
 * Get the embedded XSLT stylesheet as a string.
 * Useful for inspection or manual transformation operations.
 *
 * @returns {Promise<string>} - The XSLT content
 */
export async function getXsltStylesheet() {
  try {
    const xsltPath = new URL('eems-report.xslt', import.meta.url).href;
    const response = await fetch(xsltPath);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch XSLT: HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (err) {
    console.error('[xmlReportUtils.getXsltStylesheet] Error:', err.message);
    throw err;
  }
}

/**
 * Transform XML to HTML and open in a new window for preview/printing.
 * Useful for PDF export workflows.
 *
 * @param {string} xmlString - The XML content to transform
 * @param {string} windowName - Optional window name (default: 'eems-report')
 */
export async function openXmlReportWindow(xmlString, windowName = 'eems-report') {
  try {
    const htmlString = await xmlToHtml(xmlString);
    const newWindow = window.open('', windowName, 'width=1000,height=800');
    if (newWindow) {
      newWindow.document.write(htmlString);
      newWindow.document.close();
    } else {
      alert('Popup blocked. Please allow popups for this site.');
    }
  } catch (err) {
    console.error('[xmlReportUtils.openXmlReportWindow] Error:', err.message);
    alert('Failed to open report window. Check console for details.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger a browser download of the XML string as a .xml file.
 *
 * @param {string} xmlString
 * @param {string} filename  - e.g. "eems-report-2026-04-20.xml"
 */
export function downloadXml(xmlString, filename = 'eems-report.xml') {
  const blob = new Blob([xmlString], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger a browser download of the HTML (transformed from XML via XSLT) as .html file.
 *
 * @param {string} htmlString
 * @param {string} filename  - e.g. "eems-report-2026-04-20.html"
 */
export function downloadHtml(htmlString, filename = 'eems-report.html') {
  const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}