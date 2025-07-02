import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResults(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  // Poll for progress updates
  const pollProgress = async (sessionId) => {
    try {
      const response = await axios.get(`/api/progress/${sessionId}`);
      const progressData = response.data;
      
      setProgress(progressData);

      if (progressData.status === 'completed') {
        setResults(progressData.results);
        setProcessing(false);
        setProgress(null);
      } else if (progressData.status === 'error') {
        setError(progressData.error || 'Processing failed');
        setProcessing(false);
        setProgress(null);
      } else {
        // Continue polling
        setTimeout(() => pollProgress(sessionId), 1000);
      }
    } catch (err) {
      setError('Failed to get progress updates');
      setProcessing(false);
      setProgress(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setProgress(null);
    setResults(null);

    const formData = new FormData();
    formData.append('excel', file);

    try {
      const response = await axios.post('/api/process-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newSessionId = response.data.sessionId;
      setSessionId(newSessionId);
      
      // Start polling for progress
      pollProgress(newSessionId);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while processing the file');
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!results?.downloadUrl) return;

    try {
      const response = await axios.get(results.downloadUrl, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'processed-urls.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download the processed file');
    }
  };

  const resetApp = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setProcessing(false);
    setProgress(null);
    setSessionId(null);
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>📊 Excel URL Validator</h1>
          <p>Upload an Excel file to validate URLs and get organized results</p>
        </header>

        <div className="main-content">
          {!results && (
            <div className="upload-section">
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <div className="dropzone-content">
                  <div className="upload-icon">📁</div>
                  {file ? (
                    <div className="file-info">
                      <p className="file-name">Selected: {file.name}</p>
                      <p className="file-size">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="upload-text">
                        {isDragActive ? 'Drop the Excel file here' : 'Drag & drop an Excel file here, or click to select'}
                      </p>
                      <p className="upload-subtext">Supports .xlsx and .xls files</p>
                    </div>
                  )}
                </div>
              </div>

              {file && !processing && (
                <button onClick={handleUpload} className="upload-btn">
                  🚀 Process File
                </button>
              )}

              {processing && (
                <div className="processing">
                  <div className="spinner"></div>
                  {progress ? (
                    <div className="progress-info">
                      <p className="progress-message">{progress.message}</p>
                      {progress.total > 0 && (
                        <div className="progress-details">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className="progress-text">
                            {progress.current} / {progress.total} rows processed
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>Starting processing... This may take a few minutes depending on the number of URLs.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {results && (
            <div className="results-section">
              <div className="results-header">
                <h2>✅ Processing Complete!</h2>
                <div className="stats">
                  <div className="stat">
                    <span className="stat-number">{results.totalUrls}</span>
                    <span className="stat-label">Total URLs</span>
                  </div>
                  <div className="stat valid">
                    <span className="stat-number">{results.validUrls}</span>
                    <span className="stat-label">Valid URLs</span>
                  </div>
                  <div className="stat invalid">
                    <span className="stat-number">{results.invalidUrls}</span>
                    <span className="stat-label">Invalid URLs</span>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button onClick={handleDownload} className="download-btn">
                  📥 Download Results
                </button>
                <button onClick={resetApp} className="reset-btn">
                  🔄 Process Another File
                </button>
              </div>

              <div className="results-info">
                <p>Your processed Excel file contains two tabs:</p>
                <ul>
                  <li><strong>Valid URLs:</strong> All accessible websites with their status codes</li>
                  <li><strong>Invalid URLs:</strong> Unreachable websites with error details</li>
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="error">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h3>Error</h3>
                <p>{error}</p>
                <button onClick={resetApp} className="retry-btn">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="footer">
          <p>💡 Tip: Make sure your Excel file contains URLs in any cells. The validator will automatically detect and check them.</p>
        </footer>
      </div>
    </div>
  );
}

export default App; 