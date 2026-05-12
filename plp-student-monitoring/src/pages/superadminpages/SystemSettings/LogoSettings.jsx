// src/components/settings/LogoSettings.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../../css/GeneralSettings.css'; // Adjust path as needed

function LogoSettings() {
  const [logoPreview, setLogoPreview] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current logo
  useEffect(() => {
    const loadCurrentLogo = async () => {
      try {
        const response = await fetch('/api/settings/logo');
        const data = await response.json();
        if (data.logoUrl) {
          setCurrentLogo(data.logoUrl);
          setLogoPreview(data.logoUrl);
        }
      } catch (err) {
        console.error('[LogoSettings] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCurrentLogo();
  }, []);

  // Compress image function
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Max dimensions 300x300
          let width = img.width;
          let height = img.height;
          if (width > 300) {
            height = (height * 300) / width;
            width = 300;
          }
          if (height > 300) {
            width = (width * 300) / height;
            height = 300;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 80% quality
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        };
      };
      reader.onerror = reject;
    });
  };

  // Handle logo file selection
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid File Type',
          text: 'Please select an image file (PNG, JPG, GIF, etc.)',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Compress the image
      const compressed = await compressImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(compressed);
      
      // Store compressed file for upload
      window.selectedLogoFile = compressed;
    }
  };

  // Upload logo
  const handleUpload = async () => {
    if (!window.selectedLogoFile) {
      Swal.fire({
        icon: 'warning',
        title: 'No File Selected',
        text: 'Please select a logo file first',
        confirmButtonText: 'OK'
      });
      return;
    }

    const formData = new FormData();
    formData.append('logo', window.selectedLogoFile);

    try {
      setUploading(true);
      const response = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setCurrentLogo(data.logoUrl);
      Swal.fire({
        icon: 'success',
        title: 'Logo Updated Successfully',
        text: 'The logo has been updated throughout the system',
        timer: 2000,
        showConfirmButton: false
      });

      // Clear the stored file
      delete window.selectedLogoFile;
      
      // Trigger a custom event to notify other components to update their logo
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: data.logoUrl } }));

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message,
        confirmButtonText: 'OK'
      });
    } finally {
      setUploading(false);
    }
  };

  // Reset to default logo
  const handleResetToDefault = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Reset to Default Logo?',
      text: 'This will restore the system default logo. Are you sure?',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reset',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#01311d'
    });

    if (!result.isConfirmed) return;

    try {
      setUploading(true);
      const response = await fetch('/api/settings/logo/reset', {
        method: 'POST'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setCurrentLogo(data.logoUrl);
      setLogoPreview(data.logoUrl);
      
      Swal.fire({
        icon: 'success',
        title: 'Logo Reset',
        text: 'Default logo has been restored',
        timer: 2000,
        showConfirmButton: false
      });

      // Trigger update event
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: data.logoUrl } }));

    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: err.message,
        confirmButtonText: 'OK'
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="loading-state">Loading logo settings…</div>;

  return (
    <div className="settings-section">
      <h2 className="section-title">LOGO SETTINGS</h2>
      <p className="setting-description" style={{ marginBottom: 16 }}>
        Customize your system logo. Upload an image (PNG, JPG, GIF). Images will be automatically compressed to 300x300 pixels.
        The logo will appear in the sidebar, login page, and dashboard header.
      </p>

      <div className="logo-settings-container">
        {/* Current Logo Preview */}
        <div className="logo-preview-section">
          <label className="setting-label">Current Logo</label>
          <div className="logo-preview-box">
            {logoPreview ? (
              <img src={logoPreview} alt="Current Logo" className="logo-preview-image" />
            ) : (
              <div className="logo-placeholder">No Logo</div>
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="logo-upload-section">
          <label className="setting-label">Upload New Logo</label>
          <div className="logo-upload-controls">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="logo-file-input"
              id="logo-upload"
              disabled={uploading}
            />
            <label htmlFor="logo-upload" className="logo-upload-button">
              Choose File
            </label>
            <span className="logo-file-name">
              {window.selectedLogoFile ? window.selectedLogoFile.name : 'No file chosen'}
            </span>
          </div>
          
          <div className="logo-actions">
            <button 
              className="save-button" 
              onClick={handleUpload} 
              disabled={uploading || !window.selectedLogoFile}
              style={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)' }}
            >
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </button>
            
            <button 
              className="save-button" 
              onClick={handleResetToDefault} 
              disabled={uploading}
              style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogoSettings;