import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import { Send, CheckCircle, Timer } from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import Logger from '../utils/logger';

const InterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    startInterview();
  }, [sessionId]);

  const startInterview = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/conduct`, {
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

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      setCurrentQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
      setStartTime(Date.now());
      Logger.info('Interview started');

    } catch (err) {
      Logger.error('Error starting interview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/conduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          action: 'answer',
          answer: answer.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      
      if (data.type === 'complete') {
        setIsComplete(true);
        Logger.info('Interview completed');
      } else {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber);
        setAnswer('');
      }

    } catch (err) {
      Logger.error('Error submitting answer:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/conduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          action: 'complete'
        })
      });

      navigate(`/app/interview/feedback/${sessionId}`);
    } catch (err) {
      Logger.error('Error completing interview:', err);
      setError(err.message);
    }
  };

  if (isComplete) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Interview Complete!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Great job! We're analyzing your responses and preparing detailed feedback.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={handleComplete}
          sx={{ mt: 2 }}
        >
          View Feedback
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Question {questionNumber} of {totalQuestions}
            </Typography>
            {startTime && (
              <Chip
                icon={<Timer />}
                label={`${Math.floor((Date.now() - startTime) / 60000)} min`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <LinearProgress
            variant="determinate"
            value={(questionNumber / totalQuestions) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Question */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            bgcolor: 'primary.light',
            color: 'primary.contrastText'
          }}
        >
          <Typography variant="h6" gutterBottom>
            Interview Question
          </Typography>
          <Typography variant="body1">
            {currentQuestion || 'Loading question...'}
          </Typography>
        </Paper>

        {/* Answer Input */}
        <TextField
          fullWidth
          multiline
          rows={8}
          label="Your Answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          disabled={loading}
          sx={{ mb: 3 }}
        />

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleComplete}
            disabled={loading}
          >
            End Interview
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmitAnswer}
            disabled={loading || !answer.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default InterviewRoom;
