import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton
} from '@mui/material';
import { 
  CheckCircle, 
  Timer, 
  NavigateNext, 
  NavigateBefore,
  Stop,
  CheckCircleOutline,
  RadioButtonUnchecked,
  Home,
  History
} from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import Logger from '../utils/logger';

const InterviewRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(30); // Duration in minutes
  const [remainingTime, setRemainingTime] = useState(0); // Remaining time in seconds
  const timerRef = useRef(null);

  useEffect(() => {
    startInterview();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (startTime && duration) {
      const totalSeconds = duration * 60;
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        setRemainingTime(remaining);
        
        // Auto-complete when time runs out
        if (remaining === 0) {
          clearInterval(timerRef.current);
          handleComplete();
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime, duration]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startInterview = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      // Start the interview
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start interview');
      }

      const data = await response.json();
      
      // Set all questions at once
      setQuestions(data.questions || []);
      setDuration(data.duration || 30); // Get duration from response
      setRemainingTime((data.duration || 30) * 60); // Set initial remaining time
      setStartTime(Date.now());
      Logger.info('Interview started with all questions loaded');

    } catch (err) {
      Logger.error('Error starting interview:', err);
      setError(err.message || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (value) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: value
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionClick = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save interview session to localStorage
      const interviewSession = {
        sessionId,
        questions,
        answers,
        completedAt: Date.now(),
        duration: duration,
        timeSpent: duration * 60 - remainingTime, // Time spent in seconds
        answeredCount: Object.keys(answers).filter(key => answers[key]?.trim()).length,
        totalQuestions: questions.length
      };

      Logger.info('Saving interview session:', interviewSession);

      // Get existing saved interviews
      const existingInterviews = JSON.parse(localStorage.getItem('savedInterviews') || '[]');
      Logger.info('Existing interviews:', existingInterviews);
      
      // Add new interview session
      existingInterviews.push(interviewSession);
      
      // Save to localStorage
      localStorage.setItem('savedInterviews', JSON.stringify(existingInterviews));
      Logger.info('Interview session saved to localStorage. Total interviews:', existingInterviews.length);
      
      setIsComplete(true);
    } catch (err) {
      Logger.error('Error completing interview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = Object.keys(answers).filter(key => answers[key]?.trim()).length;

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
          onClick={() => navigate(`/app/interview/feedback/${sessionId}`)}
          sx={{ mt: 2 }}
        >
          View Feedback
        </Button>
      </Container>
    );
  }

  const currentQuestion = questions[currentQuestionIndex] || 'Loading question...';
  const currentAnswer = answers[currentQuestionIndex] || '';

  if (loading && questions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left Sidebar - Questions List */}
      <Paper
        elevation={3}
        sx={{
          width: 320,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: 1,
          borderColor: 'divider'
        }}
      >
        {/* Timer Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: remainingTime < 300 ? 'error.main' : 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timer />
            <Typography variant="h6" fontWeight="bold">
              {formatTime(remainingTime)}
            </Typography>
          </Box>
          <Chip
            label={`${answeredCount}/${questions.length}`}
            size="small"
            sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
          />
        </Box>

        {/* Navigation Links */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              startIcon={<Home />}
              onClick={() => navigate('/app/dashboard')}
              size="small"
              sx={{ justifyContent: 'flex-start' }}
            >
              Home
            </Button>
            <Button
              startIcon={<History />}
              onClick={() => navigate('/app/interview/history')}
              size="small"
              sx={{ justifyContent: 'flex-start' }}
            >
              History
            </Button>
          </Box>
        </Box>

        {/* Questions List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List sx={{ p: 0 }}>
            {questions.map((question, index) => (
              <React.Fragment key={index}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={index === currentQuestionIndex}
                    onClick={() => handleQuestionClick(index)}
                    sx={{
                      py: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        '&:hover': {
                          bgcolor: 'primary.light'
                        }
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {answers[index]?.trim() ? (
                        <CheckCircleOutline color="success" />
                      ) : (
                        <RadioButtonUnchecked color="action" />
                      )}
                      <ListItemText
                        primary={`Question ${index + 1}`}
                        secondary={question ? (question.substring(0, 40) + '...') : 'Not loaded'}
                        primaryTypographyProps={{ fontWeight: index === currentQuestionIndex ? 'bold' : 'normal' }}
                      />
                    </Box>
                  </ListItemButton>
                </ListItem>
                {index < questions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Complete Button */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={handleComplete}
            disabled={loading || answeredCount === 0}
          >
            End Interview
          </Button>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Container maxWidth="lg" sx={{ flex: 1, py: 4, display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {remainingTime > 0 && remainingTime < 300 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Only {Math.floor(remainingTime / 60)} minutes remaining!
            </Alert>
          )}

          {/* Question Card */}
          <Paper
            elevation={2}
            sx={{
              p: 4,
              mb: 3,
              bgcolor: 'primary.main',
              color: 'white'
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.9 }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Typography>
            <Typography variant="h5" sx={{ mt: 1, fontWeight: 500 }}>
              {currentQuestion || 'Loading question...'}
            </Typography>
          </Paper>

          {/* Answer Input */}
          <Paper elevation={2} sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Your Answer
            </Typography>
            <TextField
              fullWidth
              multiline
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here... Take your time to provide a thoughtful response."
              disabled={loading}
              variant="outlined"
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  alignItems: 'flex-start'
                }
              }}
            />
          </Paper>

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<NavigateBefore />}
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="contained"
              endIcon={<NavigateNext />}
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next Question
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default InterviewRoom;
