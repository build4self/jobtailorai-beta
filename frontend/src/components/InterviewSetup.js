import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { School, Business, Timer } from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import Logger from '../utils/logger';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    jobDescription: '',
    companyName: '',
    interviewType: 'mixed',
    difficulty: 'mid',
    duration: 30
  });

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!formData.jobDescription.trim()) {
        throw new Error('Job description is required');
      }
      if (!formData.companyName.trim()) {
        throw new Error('Company name is required');
      }

      // Get auth token
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (!idToken) {
        throw new Error('Not authenticated');
      }

      // Create interview session
      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create interview session');
      }

      const data = await response.json();
      Logger.info('Interview session created:', data.sessionId);

      // Navigate to interview room
      navigate(`/app/interview/room/${data.sessionId}`);

    } catch (err) {
      Logger.error('Error creating interview:', err);
      setError(err.message || 'Failed to create interview session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School color="primary" />
          Mock Interview Setup
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Practice for your interview with AI-powered simulation. Get personalized questions based on the job requirements and company culture.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Job Description"
            multiline
            rows={6}
            value={formData.jobDescription}
            onChange={handleChange('jobDescription')}
            placeholder="Paste the job description here..."
            required
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Company Name"
            value={formData.companyName}
            onChange={handleChange('companyName')}
            placeholder="e.g., Amazon, Google, Microsoft"
            required
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Interview Type</InputLabel>
            <Select
              value={formData.interviewType}
              onChange={handleChange('interviewType')}
              label="Interview Type"
            >
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="behavioral">Behavioral</MenuItem>
              <MenuItem value="mixed">Mixed (Technical + Behavioral)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Difficulty Level</InputLabel>
            <Select
              value={formData.difficulty}
              onChange={handleChange('difficulty')}
              label="Difficulty Level"
            >
              <MenuItem value="entry">Entry Level</MenuItem>
              <MenuItem value="mid">Mid Level</MenuItem>
              <MenuItem value="senior">Senior Level</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Duration</InputLabel>
            <Select
              value={formData.duration}
              onChange={handleChange('duration')}
              label="Duration"
              startAdornment={<Timer sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value={15}>15 minutes</MenuItem>
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={45}>45 minutes</MenuItem>
              <MenuItem value={60}>60 minutes</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/app/interview/history')}
              disabled={loading}
            >
              View History
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <School />}
            >
              {loading ? 'Creating Interview...' : 'Start Interview'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default InterviewSetup;
