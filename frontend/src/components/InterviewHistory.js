import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Grid
} from '@mui/material';
import {
  School,
  Business,
  CalendarToday,
  TrendingUp,
  Visibility
} from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import Logger from '../utils/logger';

const InterviewHistory = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.history || []);
      Logger.info('History loaded:', data.count);

    } catch (err) {
      Logger.error('Error fetching history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading your interview history...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Interview History
        </Typography>
        <Button
          variant="contained"
          startIcon={<School />}
          onClick={() => navigate('/app/interview/setup')}
        >
          New Interview
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {history.length === 0 ? (
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
          <School sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Interview History Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Start your first mock interview to practice and improve your skills!
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<School />}
            onClick={() => navigate('/app/interview/setup')}
          >
            Start First Interview
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {history.map((interview) => (
            <Grid item xs={12} md={6} key={interview.sessionId}>
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business color="primary" />
                      <Typography variant="h6">
                        {interview.companyName}
                      </Typography>
                    </Box>
                    <Chip
                      label={interview.status}
                      color={getStatusColor(interview.status)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={interview.interviewType}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={interview.difficulty}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(interview.createdAt)}
                    </Typography>
                  </Box>

                  {interview.overallScore && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Score:
                      </Typography>
                      <Chip
                        label={`${interview.overallScore}/10`}
                        color={getScoreColor(interview.overallScore)}
                        size="small"
                      />
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  {interview.status === 'completed' && (
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => navigate(`/app/interview/feedback/${interview.sessionId}`)}
                    >
                      View Feedback
                    </Button>
                  )}
                  {interview.status === 'in_progress' && (
                    <Button
                      size="small"
                      startIcon={<School />}
                      onClick={() => navigate(`/app/interview/room/${interview.sessionId}`)}
                    >
                      Continue
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default InterviewHistory;
