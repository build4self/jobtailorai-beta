import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState({
    outputFormat: 'pdf', // default to PDF
    fontSize: 'medium',
    margins: 'normal',
    colorScheme: 'professional'
  });

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('resumeOptimizerSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('resumeOptimizerSettings', JSON.stringify(settings));
    
    // Notify parent component
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      outputFormat: 'pdf',
      fontSize: 'medium',
      margins: 'normal',
      colorScheme: 'professional'
    };
    setSettings(defaultSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* Output Format Selection */}
          <div className="setting-group">
            <label className="setting-label">Output Format</label>
            <div className="setting-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="outputFormat"
                  value="pdf"
                  checked={settings.outputFormat === 'pdf'}
                  onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
                />
                <span className="radio-label">
                  <strong>PDF</strong>
                  <small>Best for viewing and printing</small>
                </span>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="outputFormat"
                  value="docx"
                  checked={settings.outputFormat === 'docx'}
                  onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Word Document (.docx)</strong>
                  <small>Editable format for further customization</small>
                </span>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="outputFormat"
                  value="txt"
                  checked={settings.outputFormat === 'txt'}
                  onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Plain Text</strong>
                  <small>Simple text format for ATS systems</small>
                </span>
              </label>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="setting-group">
            <label className="setting-label">Font Size</label>
            <select 
              value={settings.fontSize}
              onChange={(e) => handleSettingChange('fontSize', e.target.value)}
              className="setting-select"
            >
              <option value="small">Small (10pt)</option>
              <option value="medium">Medium (11pt)</option>
              <option value="large">Large (12pt)</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label">Margins</label>
            <select 
              value={settings.margins}
              onChange={(e) => handleSettingChange('margins', e.target.value)}
              className="setting-select"
            >
              <option value="narrow">Narrow (0.5")</option>
              <option value="normal">Normal (0.75")</option>
              <option value="wide">Wide (1")</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label">Color Scheme</label>
            <select 
              value={settings.colorScheme}
              onChange={(e) => handleSettingChange('colorScheme', e.target.value)}
              className="setting-select"
            >
              <option value="professional">Professional (Black & White)</option>
              <option value="modern">Modern (Blue Accents)</option>
              <option value="creative">Creative (Color Headers)</option>
            </select>
          </div>
        </div>

        <div className="settings-footer">
          <button className="reset-button" onClick={handleReset}>
            Reset to Defaults
          </button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="save-button" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
