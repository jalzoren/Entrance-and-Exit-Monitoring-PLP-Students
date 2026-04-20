// frontend/src/components/ImportStudents.jsx

import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  IoCloudUploadOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoDocumentTextOutline,
} from 'react-icons/io5';
import '../componentscss/ImportStudents.css';

const ImportStudents = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile]                     = useState(null);
  const [dragActive, setDragActive]         = useState(false);
  const [uploadStatus, setUploadStatus]     = useState(null);
  const [errorMessage, setErrorMessage]     = useState('');
  const [errorList, setErrorList]           = useState([]);

  // ── Column definitions (mirrors backend) ──────────────────────────────────
  const requiredColumns = [
    'Student ID',
    'Email',
    'First Name',
    'Middle Name',
    'Last Name',
    'College Department',
    'Program Name',
    'Year Level',
    'Enrollment Status',
  ];

  const optionalColumns = [
    'Extension Name',   // Jr., Sr., I–IV when provided
  ];

  // ── File handling ─────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => validateAndSetFile(e.target.files[0]);

  const validateAndSetFile = (selectedFile) => {
    setUploadStatus(null);
    setErrorMessage('');
    setErrorList([]);

    if (!selectedFile) return;

    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx') {
      setUploadStatus('error');
      setErrorMessage('Please upload only .csv or .xlsx files.');
      return;
    }

    if (selectedFile.size > 6 * 1024 * 1024) {
      setUploadStatus('error');
      setErrorMessage('File size should not exceed 6MB.');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('ready');
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setErrorMessage('');
    setErrorList([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/import-students',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const data = response.data;
      setUploadStatus('done');

      // ── SweetAlert success popup ──────────────────────────────────────
      await Swal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        html: `
          <p style="font-family:'Montserrat',sans-serif; font-size:0.95rem; color:#333; margin:0;">
            <strong>${data.inserted}</strong> student${data.inserted !== 1 ? 's' : ''} imported successfully.
            ${data.failed > 0
              ? `<br/><span style="color:#b45309;">⚠️ ${data.failed} row(s) failed to insert.</span>`
              : ''
            }
          </p>
        `,
        confirmButtonColor: '#2b5a2b',
        confirmButtonText: 'Done',
        timer: data.failed === 0 ? 2500 : undefined,
        timerProgressBar: data.failed === 0,
      });

      if (onSuccess) onSuccess();
      handleClose();

    } catch (error) {
      setUploadStatus('error');
      const data = error.response?.data;

      if (data?.errors && data.errors.length > 0) {
        setErrorMessage(data.message);
        setErrorList(data.errors);
      } else {
        setErrorMessage(data?.message || 'Upload failed. Please try again.');
      }
    }
  };

  // ── Reset / close ─────────────────────────────────────────────────────────
  const handleRemoveFile = () => {
    setFile(null);
    setUploadStatus(null);
    setErrorMessage('');
    setErrorList([]);
  };

  const handleClose = () => {
    handleRemoveFile();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">IMPORT STUDENTS</h2>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Directions */}
          <div className="import-directions">
            <h3>Directions:</h3>
            <ol className="directions-list">
              <li>Upload only <strong>.csv</strong> or <strong>.xlsx</strong> files (max 6MB).</li>
              <li>
                Required columns <em>(all must be present and filled)</em>:
                <ul className="required-columns">
                  {requiredColumns.map((col, i) => <li key={i}>{col}</li>)}
                </ul>
              </li>
              <li>
                Optional column <em>(include when applicable)</em>:
                <ul className="required-columns optional-columns">
                  <li>Extension Name — Jr., Sr., I, II, III, or IV</li>
                </ul>
              </li>
              <li>Student ID format: <strong>YY-NNNNN</strong> (e.g. 24-00001).</li>
              <li>Email must be a valid <strong>@plpasig.edu.ph</strong> address.</li>
              <li>Year Level accepts: <strong>1, 2, 3, 4</strong> or <strong>1st–4th</strong>.</li>
            </ol>
          </div>

          {/* Upload Area */}
          <div
            className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploadStatus === 'error' ? 'upload-error' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="file-input"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              hidden
            />

            {!file ? (
              <label htmlFor="file-upload" className="upload-label">
                <div className="upload-icon"><IoCloudUploadOutline size={48} /></div>
                <div className="upload-text">
                  <span className="upload-main">Click to upload</span>
                  <span className="upload-sub">or drag and drop</span>
                </div>
                <div className="file-types">.csv or .xlsx (max 6MB)</div>
              </label>
            ) : (
              <div className="file-preview">
                <div className="file-info">
                  <IoDocumentTextOutline size={28} className="file-icon" />
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
                  </div>
                  {uploadStatus === 'ready' && <IoCheckmarkCircleOutline size={22} className="success-icon" />}
                  {uploadStatus === 'error' && <IoAlertCircleOutline    size={22} className="error-icon" />}
                </div>
                <button className="remove-file-btn" onClick={handleRemoveFile}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Single error message */}
          {errorMessage && (
            <div className="error-message">
              <IoAlertCircleOutline size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row-level error list */}
          {errorList.length > 0 && (
            <div className="error-list-container">
              <p className="error-list-title">Please fix the following errors in your file:</p>
              <ul className="error-list">
                {errorList.map((err, i) => (
                  <li key={i} className="error-list-item">
                    <IoAlertCircleOutline size={14} />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Format Preview */}
          <div className="columns-preview">
            <h4>Required Format (optional column shown in grey):</h4>
            <div className="preview-table">

              <div className="preview-header">
                {requiredColumns.map((col, i) => (
                  <span key={i} className="preview-cell">{col}</span>
                ))}
                <span className="preview-cell preview-cell-optional">Extension Name</span>
              </div>

              <div className="preview-row">
                <span className="preview-cell">24-00001</span>
                <span className="preview-cell">delacruz_juan@plpasig.edu.ph</span>
                <span className="preview-cell">Juan</span>
                <span className="preview-cell">Santos</span>
                <span className="preview-cell">Dela Cruz</span>
                <span className="preview-cell">College of Computer Studies</span>
                <span className="preview-cell">BS Computer Science</span>
                <span className="preview-cell">3</span>
                <span className="preview-cell">Regular</span>
                <span className="preview-cell preview-cell-optional">Jr.</span>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-save"
            onClick={handleUpload}
            disabled={
              !file                        ||
              uploadStatus === 'error'     ||
              uploadStatus === 'uploading' ||
              uploadStatus === 'done'
            }
          >
            {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportStudents;