import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore,
  EmojiEvents,
  School
} from '@mui/icons-material';
import Logger from '../utils/logger';

const InterviewFeedback = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, [sessionId]);

  const fetchFeedback = () => {
    setLoading(true);
    setError('');

    try {
      // Load interview session from localStorage
      const savedInterviews = JSON.parse(localStorage.getItem('savedInterviews') || '[]');
      const interviewSession = savedInterviews.find(interview => interview.sessionId === sessionId);

      if (!interviewSession) {
        throw new Error('Interview session not found');
      }

      // Generate feedback from the saved session data
      const generatedFeedback = {
        sessionId: interviewSession.sessionId,
        completedAt: interviewSession.completedAt,
        duration: interviewSession.duration,
        timeSpent: interviewSession.timeSpent,
        totalQuestions: interviewSession.totalQuestions,
        answeredCount: interviewSession.answeredCount,
        questions: interviewSession.questions,
        answers: interviewSession.answers,
        overallScore: Math.round((interviewSession.answeredCount / interviewSession.totalQuestions) * 10),
        completionRate: Math.round((interviewSession.answeredCount / interviewSession.totalQuestions) * 100)
      };

      setFeedback(generatedFeedback);
      Logger.info('Feedback loaded from localStorage');

    } catch (err) {
      Logger.error('Error fetching feedback:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Analyzing your interview performance...
        </Typography>
      </Container>
    );
  }

  if (error || !feedback) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Failed to load feedback'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Overall Score */}
      <Paper elevation={3} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Interview Summary
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, my: 3 }}>
          <EmojiEvents sx={{ fontSize: 60, color: 'gold' }} />
          <Typography variant="h2" color={getScoreColor(feedback.overallScore)}>
            {feedback.completionRate}%
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          You answered {feedback.answeredCount} out of {feedback.totalQuestions} questions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Time spent: {Math.floor(feedback.timeSpent / 60)}:{(feedback.timeSpent % 60).toString().padStart(2, '0')} / {feedback.duration}:00
        </Typography>
      </Paper>

      {/* Questions and Answers */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Your Responses
      </Typography>
      {feedback.questions?.map((question, index) => (
        <Accordion key={index} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Chip
                label={feedback.answers[index] ? 'Answered' : 'Skipped'}
                color={feedback.answers[index] ? 'success' : 'default'}
                size="small"
              />
              <Typography>Question {index + 1}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Question:
              </Typography>
              <Typography variant="body2" paragraph>
                {question}
              </Typography>

              <Typography variant="subtitle2" color="primary" gutterBottom>
                Your Answer:
              </Typography>
              <Typography variant="body2" paragraph sx={{ 
                fontStyle: feedback.answers[index] ? 'normal' : 'italic',
                color: feedback.answers[index] ? 'text.primary' : 'text.secondary'
              }}>
                {feedback.answers[index] || 'No answer provided'}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Actions */}
      <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Save This Interview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Save this interview to your profile to review it later and track your progress.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/app/profile')}
          >
            View Profile
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              // Interview is already saved to localStorage in InterviewRoom
              navigate('/app/profile');
            }}
          >
            Go to Saved Interviews
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default InterviewFeedback;
