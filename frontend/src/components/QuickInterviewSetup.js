import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Box,
  LinearProgress,
  Alert
} from '@mui/material';
import { School, Timer } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import Logger from '../utils/logger';

const QuickInterviewSetup = ({ 
  open, 
  onClose, 
  jobDescription, 
  companyName, 
  resume 
}) => {
  const navigate = useNavigate();
  const [interviewType, setInterviewType] = useState('mixed');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupMessage, setSetupMessage] = useState('');
  const [error, setError] = useState('');

  const handleStart = async () => {
    setError('');
    setLoading(true);
    setSetupProgress(10);
    setSetupMessage('Creating interview session...');

    try {
      // Get auth token
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('Not authenticated');
      }

      setSetupProgress(20);
      setSetupMessage('Analyzing job requirements...');

      // Create interview session
      const setupResponse = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobDescription: jobDescription || '',
          companyName: companyName || 'Unknown Company',
          interviewType,
          difficulty: 'mid', // Auto-detect from job description in future
          duration,
          resume: resume || ''
        })
      });

      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || 'Failed to create interview session');
      }

      const setupData = await setupResponse.json();
      const sessionId = setupData.sessionId;

      setSetupProgress(40);
      setSetupMessage('Researching company interview style...');

      // Research company (optional, will use cache if available)
      if (companyName && companyName !== 'Unknown Company') {
        try {
          await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/company-research`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              companyName,
              forceRefresh: false
            })
          });
        } catch (err) {
          Logger.warn('Company research failed, continuing anyway:', err);
        }
      }

      setSetupProgress(60);
      setSetupMessage('Generating interview questions...');

      // Start the interview (generates questions)
      const startResponse = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/conduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          action: 'start'
        })
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start interview');
      }

      setSetupProgress(90);
      setSetupMessage('Preparing interview room...');

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      setSetupProgress(100);
      setSetupMessage('Ready!');

      Logger.info('Interview ready, navigating to room');

      // Navigate to interview room
      setTimeout(() => {
        navigate(`/app/interview/room/${sessionId}`);
        onClose();
      }, 500);

    } catch (err) {
      Logger.error('Error setting up interview:', err);
      setError(err.message || 'Failed to setup interview');
      setLoading(false);
      setSetupProgress(0);
    }
  };

  const marks = [
    { value: 5, label: '5m' },
    { value: 15, label: '15m' },
    { value: 30, label: '30m' },
    { value: 45, label: '45m' },
    { value: 60, label: '60m' },
    { value: 90, label: '90m' }
  ];

  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <School color="primary" />
        Mock Interview Setup
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ py: 3 }}>
            <Typography variant="body1" gutterBottom align="center">
              {setupMessage}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={setupProgress} 
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
              {setupProgress}% Complete
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              We'll use your resume and job details to create a personalized interview experience.
            </Typography>

            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Company: <strong>{companyName || 'Not specified'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Job Description: <strong>{jobDescription ? 'Provided' : 'Not provided'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Resume: <strong>{resume ? 'Provided' : 'Not provided'}</strong>
              </Typography>
            </Box>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Interview Type</InputLabel>
              <Select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                label="Interview Type"
              >
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="behavioral">Behavioral</MenuItem>
                <MenuItem value="mixed">Mixed (Technical + Behavioral)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Timer fontSize="small" color="action" />
                <Typography variant="body2">
                  Duration: {duration} minutes
                </Typography>
              </Box>
              <Slider
                value={duration}
                onChange={(e, newValue) => setDuration(newValue)}
                min={5}
                max={90}
                step={5}
                marks={marks}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}m`}
              />
              <Typography variant="caption" color="text.secondary">
                Approximately {Math.ceil(duration / 5)} questions
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        {!loading && (
          <>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleStart}
              startIcon={<School />}
            >
              Start Interview
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QuickInterviewSetup;
