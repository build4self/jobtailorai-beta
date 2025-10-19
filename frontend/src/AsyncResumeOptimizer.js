import React, { useState, useEffect } from 'react';
import { get, post } from 'aws-amplify/api';
import ProcessingIndicator from './components/ProcessingIndicator';
import Logger from './utils/logger';

function AsyncResumeOptimizer() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [outputFormat, setOutputFormat] = useState('pdf'); // Default to PDF format
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Submit job function
  const submitJob = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please select a resume file and enter a job description');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setStatus('SUBMITTING');

      // Convert file to base64
      const resumeBase64 = await fileToBase64(resumeFile);

      Logger.log('Submitting job...');
      Logger.log('Payload size:', new Blob([JSON.stringify({
        resume: resumeBase64,
        jobDescription: jobDescription,
        outputFormat: outputFormat
      })]).size);

      const response = await post({
        apiName: 'resumeOptimizer',
        path: '/optimize',
        options: {
          body: {
            resume: resumeBase64,
            jobDescription: jobDescription,
            outputFormat: outputFormat
          }
        }
      });
      
      Logger.log('Submit response received:', response);
      
      // Parse the response more carefully
      let parsedResponse = response;
      
      // Handle string responses
      if (typeof response === 'string') {
        try {
          parsedResponse = JSON.parse(response);
        } catch (e) {
          Logger.error('Failed to parse string response:', e);
          throw new Error(`Invalid response format: ${response}`);
        }
      }
      
      // Handle wrapped responses
      if (parsedResponse && parsedResponse.response) {
        parsedResponse = parsedResponse.response;
      }
      
      // Validate response structure
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        throw new Error(`Invalid response structure: ${JSON.stringify(response)}`);
      }
      
      // Extract jobId
      const extractedJobId = parsedResponse.jobId;
      if (!extractedJobId) {
        throw new Error(`No jobId in response: ${JSON.stringify(parsedResponse)}`);
      }
      
      Logger.log('Job submitted successfully, jobId:', extractedJobId);
      setJobId(extractedJobId);
      setStatus(parsedResponse.status || 'PROCESSING');
      setPolling(true);
      setIsSubmitting(false);
      
    } catch (err) {
      Logger.error('Error submitting job:', err);
      setError(`Error submitting job: ${err.message || 'Unknown error'}`);
      setStatus('FAILED');
      setIsSubmitting(false);
    }
  };

  // Poll for job status
  useEffect(() => {
    let intervalId;
    
    if (polling && jobId) {
      Logger.log('Starting status polling for jobId:', jobId);
      
      intervalId = setInterval(async () => {
        try {
          Logger.log('Polling status for jobId:', jobId);
          
          const statusResponse = await get({
            apiName: 'resumeOptimizer',
            path: '/status',
            options: {
              queryParams: {
                jobId: jobId
              }
            }
          });
          
          Logger.log('Status response received:', statusResponse);
          
          // Parse the response more carefully
          let parsedResponse = statusResponse;
          
          // Handle string responses
          if (typeof statusResponse === 'string') {
            try {
              parsedResponse = JSON.parse(statusResponse);
            } catch (e) {
              Logger.error('Failed to parse status string response:', e);
              throw new Error(`Invalid status response format: ${statusResponse}`);
            }
          }
          
          // Handle wrapped responses
          if (parsedResponse && parsedResponse.response) {
            parsedResponse = parsedResponse.response;
          }
          
          // Validate response structure
          if (!parsedResponse || typeof parsedResponse !== 'object') {
            throw new Error(`Invalid status response structure: ${JSON.stringify(statusResponse)}`);
          }
          
          // Extract status
          const jobStatus = parsedResponse.status;
          if (!jobStatus) {
            throw new Error(`No status in response: ${JSON.stringify(parsedResponse)}`);
          }
          
          Logger.log('Current job status:', jobStatus);
          setStatus(jobStatus);
          
          // Handle completion
          if (jobStatus === 'COMPLETED') {
            Logger.log('Job completed successfully');
            setPolling(false);
            setResult(parsedResponse);
          } else if (jobStatus === 'FAILED') {
            Logger.log('Job failed:', parsedResponse.message);
            setPolling(false);
            setError(parsedResponse.message || 'Job failed');
          }
          
        } catch (err) {
          Logger.error('Error checking job status:', err);
          setError(`Error checking job status: ${err.message || 'Unknown error'}`);
          setPolling(false);
          setStatus('FAILED');
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (intervalId) {
        Logger.log('Clearing status polling interval');
        clearInterval(intervalId);
      }
    };
  }, [polling, jobId]);

  // Reset function
  const resetForm = () => {
    setJobId(null);
    setStatus(null);
    setResult(null);
    setError(null);
    setPolling(false);
    setResumeFile(null);
    setJobDescription('');
    setIsSubmitting(false);
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    const statusMessages = {
      'SUBMITTING': 'Submitting your resume for optimization...',
      'PROCESSING': 'Processing your resume... This may take up to a minute.',
      'COMPLETED': 'Your optimized resume is ready!',
      'FAILED': 'An error occurred during processing.'
    };

    const statusColors = {
      'SUBMITTING': '#ffa500',
      'PROCESSING': '#2196f3',
      'COMPLETED': '#4caf50',
      'FAILED': '#f44336'
    };

    if (!status) return null;

    return (
      <div style={{
        padding: '16px',
        margin: '16px 0',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5',
        border: `2px solid ${statusColors[status] || '#ccc'}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: statusColors[status] || '#ccc',
            marginRight: '8px',
            animation: (status === 'SUBMITTING' || status === 'PROCESSING') ? 'pulse 2s infinite' : 'none'
          }}></div>
          <strong>Status: {status}</strong>
        </div>
        <p>{statusMessages[status] || 'Unknown status'}</p>
        {jobId && (
          <p style={{ fontSize: '12px', color: '#666' }}>
            Job ID: {jobId}
          </p>
        )}
      </div>
    );
  };

  // Render content based on status
  const renderContent = () => {
    if (status === 'COMPLETED' && result) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#e8f5e8',
          borderRadius: '8px',
          margin: '16px 0'
        }}>
          <h3 style={{ color: '#2e7d32', marginTop: 0 }}>
            🎉 Your optimized resume is ready!
          </h3>
          <p>Your resume has been successfully optimized for the job description.</p>
          <div style={{ marginTop: '16px' }}>
            <a 
              href={result.optimizedResumeUrl} 
              download={result.downloadFilename}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#4caf50',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              📄 Download Optimized Resume
            </a>
          </div>
          <button 
            onClick={resetForm}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Optimize Another Resume
          </button>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          margin: '16px 0'
        }}>
          <h3 style={{ color: '#c62828', marginTop: 0 }}>❌ Error</h3>
          <p>{error}</p>
          <button 
            onClick={resetForm}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
      
      <h1>JobTailorAI</h1>
      <p>Upload your resume and job description to get an ATS-optimized version.</p>

      {!status || status === 'FAILED' ? (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Upload Resume (PDF or Word):
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files[0])}
              style={{
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Job Description:
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={10}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Output Format:
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="outputFormat"
                  value="text"
                  checked={outputFormat === 'text'}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                📄 Text Format (.txt)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="outputFormat"
                  value="word"
                  checked={outputFormat === 'word'}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                📝 Professional Word Document (.docx)
              </label>
            </div>
            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              {outputFormat === 'word' 
                ? 'Word format provides professional formatting with proper fonts, colors, and layout optimized for one page.'
                : 'Text format provides a simple, readable version that works everywhere.'
              }
            </p>
          </div>

          <button
            onClick={submitJob}
            disabled={isSubmitting || !resumeFile || !jobDescription.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: isSubmitting ? '#ccc' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Submitting...' : '🚀 Optimize Resume'}
          </button>
        </div>
      ) : null}

      {renderStatusIndicator()}
      {renderContent()}

      {(status === 'SUBMITTING' || status === 'PROCESSING') && (
        <ProcessingIndicator status={status} />
      )}
    </div>
  );
}

export default AsyncResumeOptimizer;
