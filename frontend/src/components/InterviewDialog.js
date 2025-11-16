import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar
} from '@mui/material';
import {
  Timer,
  NavigateNext,
  NavigateBefore,
  Stop,
  CheckCircleOutline,
  RadioButtonUnchecked,
  Minimize,
  Fullscreen,
  FullscreenExit,
  Close,
  ExpandMore,
  School
} from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import Logger from '../utils/logger';

const InterviewDialog = ({ open, onClose, sessionId, initialQuestions, initialDuration, jobDescription, companyName, jobTitle, resume }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [duration, setDuration] = useState(30);
  const [remainingTime, setRemainingTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [savingToProfile, setSavingToProfile] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSavedToProfile, setIsSavedToProfile] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (open && sessionId) {
      // Reset state when opening
      setQuestions([]);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setMinimized(false);
      setFullscreen(false);
      setError('');
      setInterviewEnded(false);
      startInterview();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [open, sessionId]);

  useEffect(() => {
    if (startTime && duration) {
      const totalSeconds = duration * 60;
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        setRemainingTime(remaining);

        if (remaining === 0 && timerRef.current) {
          clearInterval(timerRef.current);
          Logger.info('Time expired, auto-ending interview');
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
    
    // Always show MM:SS format for continuous countdown
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startInterview = async () => {
    // If we already have questions from setup, use them immediately
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      setDuration(initialDuration || 30);
      setRemainingTime((initialDuration || 30) * 60);
      setStartTime(Date.now());
      Logger.info('Interview started with pre-loaded questions');
      return;
    }

    // Otherwise, fetch questions from API (fallback)
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start interview');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
      setDuration(data.duration || 30);
      setRemainingTime((data.duration || 30) * 60);
      setStartTime(Date.now());
      Logger.info('Interview started');
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
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      // Submit all answers in one request
      await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/conduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          action: 'submit-answers',
          answers: answers
        })
      });

      // Mark interview as complete
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

      // Mark interview as ended and show completion dialog
      setInterviewEnded(true);
      setShowCompletionDialog(true);
    } catch (err) {
      Logger.error('Error completing interview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      
      // Check if already saved to profile
      const existingInterviews = JSON.parse(localStorage.getItem('savedInterviews') || '[]');
      const alreadySaved = existingInterviews.some(interview => interview.sessionId === sessionId);
      setIsSavedToProfile(alreadySaved);
      
      // Don't auto-open dialog here - it's opened manually before calling this
    } catch (err) {
      Logger.error('Error fetching feedback:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. The feedback generation is taking longer than expected. Please try again later.');
      } else {
        setError(err.message || 'Failed to load feedback. Please try again.');
      }
    } finally {
      setLoadingFeedback(false);
    }
  };

  const answeredCount = Object.keys(answers).filter(key => answers[key]?.trim()).length;
  const currentQuestion = questions[currentQuestionIndex] || 'Loading question...';
  const currentAnswer = answers[currentQuestionIndex] || '';

  // Don't render until questions are loaded
  if (!open || questions.length === 0) {
    return null;
  }

  if (minimized) {
    return (<>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 300,
          zIndex: 1300
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: remainingTime < 300 ? 'error.main' : 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          onClick={() => setMinimized(false)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timer />
            <Typography variant="body1" fontWeight="bold">
              {formatTime(remainingTime)}
            </Typography>
          </Box>
          <Chip
            label={`${answeredCount}/${questions.length}`}
            size="small"
            sx={{ bgcolor: 'white', color: 'primary.main' }}
          />
        </Box>
      </Paper>

      {/* Completion Dialog - also show when minimized */}
      <Dialog
        open={showCompletionDialog}
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleOutline sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Thanks for taking the interview!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Your responses have been recorded. You can now view your feedback.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                setShowCompletionDialog(false);
                onClose(true);
              }}
            >
              View Feedback
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
    );
  }

  return (
    <>
    <Dialog
      open={open && !showCompletionDialog && !interviewEnded}
      onClose={() => {}}
      maxWidth={fullscreen ? false : "lg"}
      fullWidth
      fullScreen={fullscreen}
      TransitionProps={{
        timeout: 500
      }}
      PaperProps={{
        sx: { 
          height: fullscreen ? '100vh' : '90vh',
          transition: 'all 0.3s ease-in-out'
        }
      }}
    >
      {/* Modern Header Bar - Single Line */}
      <Box sx={{ 
        bgcolor: '#1e293b',
        color: 'white',
        px: 3, 
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Left - Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <School sx={{ fontSize: 22 }} />
          <Typography variant="h6" fontWeight={600} fontSize="1rem">
            Mock Interview Room
          </Typography>
        </Box>
        
        {/* Center - Answered and Timer with subtle separators */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontSize="0.85rem" sx={{ opacity: 0.9 }}>
              Answered:
            </Typography>
            <Chip 
              label={`${answeredCount}/${questions.length}`}
              size="small"
              sx={{ 
                bgcolor: '#3b82f6', 
                color: 'white', 
                fontWeight: 600, 
                height: 22,
                fontSize: '0.75rem'
              }}
            />
          </Box>
          
          <Box sx={{ 
            width: '1px', 
            height: '20px', 
            bgcolor: 'rgba(255, 255, 255, 0.2)' 
          }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timer sx={{ fontSize: 18, opacity: 0.9 }} />
            <Chip
              label={formatTime(remainingTime)}
              size="small"
              sx={{
                bgcolor: remainingTime < 60 ? '#ef4444' : remainingTime < 300 ? '#f59e0b' : '#10b981',
                color: 'white',
                fontWeight: 600,
                height: 22,
                fontSize: '0.75rem',
                animation: remainingTime < 60 ? 'blink 1s infinite' : 'none',
                '@keyframes blink': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 }
                }
              }}
            />
          </Box>
        </Box>
        
        {/* Right - Control Buttons (subtle) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton 
            size="small"
            onClick={() => setFullscreen(!fullscreen)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' },
              padding: '6px'
            }}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <FullscreenExit sx={{ fontSize: 18 }} /> : <Fullscreen sx={{ fontSize: 18 }} />}
          </IconButton>
          <IconButton 
            size="small"
            onClick={() => setMinimized(true)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' },
              padding: '6px'
            }}
            title="Minimize"
          >
            <Minimize sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton 
            size="small"
            onClick={() => setShowCloseConfirmation(true)}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' },
              padding: '6px'
            }}
            title="Close"
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, display: 'flex', height: '100%', bgcolor: '#f1f5f9' }}>
        <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
          {/* Left Sidebar - Questions List */}
          <Box
            sx={{
              width: 180,
              bgcolor: 'white',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                QUESTIONS
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {questions.map((question, index) => (
                <Box
                  key={index}
                  onClick={() => handleQuestionClick(index)}
                  sx={{
                    px: 3,
                    py: 2,
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    bgcolor: index === currentQuestionIndex ? '#eff6ff' : 'white',
                    borderLeft: index === currentQuestionIndex ? '4px solid #3b82f6' : '4px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#f8fafc'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography 
                        variant="body2" 
                        fontWeight={index === currentQuestionIndex ? 600 : 500}
                        sx={{ 
                          color: index === currentQuestionIndex ? '#3b82f6' : '#1e293b',
                          mb: 0.5
                        }}
                      >
                        Question {index + 1}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: answers[index]?.trim() ? '#10b981' : '#94a3b8',
                          fontSize: '0.7rem'
                        }}
                      >
                        {answers[index]?.trim() ? 'Answered' : 'Not answered'}
                      </Typography>
                    </Box>
                    {answers[index]?.trim() && (
                      <CheckCircleOutline sx={{ color: '#10b981', fontSize: 18 }} />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

          </Box>

          {/* Main Content Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, overflow: 'auto' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {remainingTime > 0 && remainingTime <= 300 && remainingTime >= 60 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Only {Math.ceil(remainingTime / 60)} minutes remaining!
              </Alert>
            )}
            
            {remainingTime > 0 && remainingTime < 60 && (
              <Alert severity="error" sx={{ mb: 2, animation: 'pulse 1s infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.7 } } }}>
                Only {remainingTime} seconds remaining!
              </Alert>
            )}

            {/* Question Card */}
            <Paper
              elevation={2}
              sx={{
                p: 3,
                mb: 2,
                bgcolor: 'primary.main',
                color: 'white'
              }}
            >
              <Typography variant="overline" sx={{ opacity: 0.9 }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {currentQuestion}
              </Typography>
            </Paper>

            {/* Answer Input */}
            <Paper elevation={2} sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Your Answer
              </Typography>
              <TextField
                fullWidth
                multiline
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type your answer here..."
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

            {/* Navigation and End Interview */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={() => setShowEndConfirmation(true)}
                disabled={loading || answeredCount === 0}
              >
                End Interview
              </Button>
              <Box sx={{ display: 'flex', gap: 2 }}>
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
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>

    {/* End Interview Confirmation Dialog */}
    <Dialog
      open={showEndConfirmation}
      onClose={() => setShowEndConfirmation(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>End Interview?</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to end the interview? Your answers will be saved and you'll receive feedback.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowEndConfirmation(false)}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            setShowEndConfirmation(false);
            handleComplete();
          }}
          variant="contained"
          color="error"
        >
          End Interview
        </Button>
      </DialogActions>
    </Dialog>

    {/* Close Interview Confirmation Dialog */}
    <Dialog
      open={showCloseConfirmation}
      onClose={() => setShowCloseConfirmation(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Close Interview?</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to close this session? Your progress will not be saved and you won't receive feedback.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowCloseConfirmation(false)}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            setShowCloseConfirmation(false);
            // Clear timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            // Close the dialog completely
            onClose(false);
          }}
          variant="contained"
          color="error"
        >
          Close Session
        </Button>
      </DialogActions>
    </Dialog>

    {/* Completion Dialog */}
    <Dialog
      open={showCompletionDialog}
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
    >
      <IconButton
        onClick={() => {
          setShowCompletionDialog(false);
          onClose(true);
        }}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'grey.500'
        }}
      >
        <Close />
      </IconButton>
      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <CheckCircleOutline sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Thanks for taking the interview!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Your responses have been recorded. You can now view your feedback or save this interview to your profile.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              // Start loading immediately
              setLoadingFeedback(true);
              // Close completion dialog and show feedback dialog with loading state
              setShowCompletionDialog(false);
              setTimeout(() => {
                setShowFeedbackDialog(true);
                fetchFeedback();
              }, 300);
            }}
            disabled={loadingFeedback}
          >
            {loadingFeedback ? 'Loading...' : 'View Feedback'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>

    {/* Feedback Dialog */}
    <Dialog
      open={showFeedbackDialog}
      onClose={(event, reason) => {
        // Prevent closing on backdrop click or escape key
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
      }}
      maxWidth={loadingFeedback ? "xs" : "lg"}
      fullWidth={!loadingFeedback}
      disableEscapeKeyDown
      PaperProps={{
        sx: loadingFeedback ? {} : { height: '90vh' }
      }}
    >
      <DialogContent sx={loadingFeedback ? { p: 3 } : { p: 0, height: '100%', overflow: 'hidden', position: 'relative' }}>
        {loadingFeedback ? (
          <Box sx={{ textAlign: 'center', position: 'relative', minWidth: '280px' }}>
            <IconButton
              onClick={() => {
                setShowFeedbackDialog(false);
                setLoadingFeedback(false);
                onClose(false);
              }}
              size="small"
              sx={{
                position: 'absolute',
                right: -8,
                top: -8,
                color: 'grey.500'
              }}
            >
              <Close fontSize="small" />
            </IconButton>
            <CircularProgress size={40} sx={{ mb: 1.5 }} />
            <Typography variant="subtitle1" fontWeight={500} gutterBottom>
              Generating Feedback...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Analyzing your responses
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={() => {
                setError('');
                setLoadingFeedback(true);
                fetchFeedback();
              }}
            >
              Try Again
            </Button>
          </Box>
        ) : feedback ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with Score Badge */}
            <Box sx={{ 
              position: 'relative', 
              bgcolor: 'background.paper', 
              borderBottom: 1, 
              borderColor: 'divider',
              p: 2
            }}>
              <Typography variant="h5" fontWeight={600}>
                Interview Feedback
              </Typography>
              {/* Score Badge in Corner */}
              <Chip
                label={`${feedback.overallScore}/10`}
                color={feedback.overallScore >= 7 ? 'success' : feedback.overallScore >= 5 ? 'warning' : 'error'}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  height: 36,
                  px: 1
                }}
              />
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Two Column Layout */}
              <Grid container spacing={2}>
                {/* Left Column */}
                <Grid item xs={12} md={6}>
                  {/* Summary */}
                  <Card sx={{ mb: 2, bgcolor: '#eff6ff', height: '140px' }}>
                    <CardContent sx={{ py: 2, height: '100%', overflow: 'auto' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>Summary</Typography>
                      <Typography variant="body2">{feedback.summary}</Typography>
                    </CardContent>
                  </Card>

                  {/* Strengths */}
                  <Card sx={{ mb: 2, height: '180px' }}>
                    <CardContent sx={{ py: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" fontWeight={600} color="success.main" gutterBottom>
                        Strengths
                      </Typography>
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {feedback.strengths?.length > 0 ? (
                          <List dense sx={{ py: 0 }}>
                            {feedback.strengths.map((strength, idx) => (
                              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                <ListItemText 
                                  primary={`• ${strength}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No strengths identified</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Skills Assessment */}
                  <Card>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>Skills Assessment</Typography>
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" fontSize="0.875rem">
                          Communication: {feedback.communicationSkills?.clarity || 0}/10
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(feedback.communicationSkills?.clarity || 0) * 10} 
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }} 
                        />
                      </Box>
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" fontSize="0.875rem">
                          Technical: {feedback.technicalAccuracy?.score || 0}/10
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(feedback.technicalAccuracy?.score || 0) * 10} 
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }} 
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontSize="0.875rem">
                          Company Fit: {feedback.companyFit?.score || 0}/10
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(feedback.companyFit?.score || 0) * 10} 
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }} 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Right Column */}
                <Grid item xs={12} md={6}>
                  {/* Areas for Improvement */}
                  <Card sx={{ mb: 2, height: '180px' }}>
                    <CardContent sx={{ py: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" fontWeight={600} color="warning.main" gutterBottom>
                        Areas for Improvement
                      </Typography>
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {feedback.areasForImprovement?.length > 0 ? (
                          <List dense sx={{ py: 0 }}>
                            {feedback.areasForImprovement.map((area, idx) => (
                              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                <ListItemText 
                                  primary={`• ${area}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No areas identified</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card sx={{ mb: 2, height: '320px' }}>
                    <CardContent sx={{ py: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Recommendations
                      </Typography>
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {feedback.recommendations?.length > 0 ? (
                          <List dense sx={{ py: 0 }}>
                            {feedback.recommendations.map((rec, idx) => (
                              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                <ListItemText 
                                  primary={`${idx + 1}. ${rec}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No recommendations available</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

            {/* Question-by-Question Feedback - Collapsed by Default */}
            {feedback.questionFeedback && feedback.questionFeedback.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Accordion defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Question-by-Question Feedback ({feedback.questionFeedback.length} questions)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {feedback.questionFeedback.map((qf, idx) => (
                      <Accordion key={idx} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                              label={`${qf.score}/10`} 
                              color={qf.score >= 7 ? 'success' : qf.score >= 5 ? 'warning' : 'error'}
                              size="small"
                            />
                            <Typography variant="body2" fontWeight={500}>
                              Question {idx + 1}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Question:
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {qf.question}
                        </Typography>

                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Your Answer:
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {qf.yourAnswer}
                        </Typography>

                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Feedback:
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {qf.feedback}
                        </Typography>

                        {qf.suggestedAnswer && (
                          <>
                            <Typography variant="subtitle2" color="success.main" gutterBottom>
                              Suggested Answer:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {qf.suggestedAnswer}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            </Box>

            {/* Action Buttons - Fixed at Bottom */}
            <Box sx={{ 
              borderTop: 1, 
              borderColor: 'divider', 
              p: 2, 
              bgcolor: 'background.paper',
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center'
            }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowFeedbackDialog(false);
                  setLoadingFeedback(false);
                  setFeedback(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                onClick={async () => {
                  setSavingToProfile(true);
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
                        action: 'save-to-profile'
                      })
                    });

                    if (response.ok) {
                      // Save to localStorage (same as resumes)
                      const interviewToSave = {
                        sessionId,
                        questions,
                        answers,
                        feedback,
                        completedAt: Date.now(),
                        duration: duration,
                        companyName: companyName,
                        jobDescription: jobDescription,
                        jobRole: jobTitle || 'Interview Practice',
                        savedToProfile: true
                      };

                      const existingInterviews = JSON.parse(localStorage.getItem('savedInterviews') || '[]');
                      
                      // Check if already saved
                      const alreadySaved = existingInterviews.some(interview => interview.sessionId === sessionId);
                      
                      if (!alreadySaved) {
                        existingInterviews.push(interviewToSave);
                        localStorage.setItem('savedInterviews', JSON.stringify(existingInterviews));
                        Logger.info('Interview saved to localStorage');
                      }

                      setIsSavedToProfile(true);
                      setShowSuccessMessage(true);
                    } else {
                      throw new Error('Failed to save');
                    }
                  } catch (err) {
                    Logger.error('Error saving to profile:', err);
                    setError('Failed to save to profile');
                  } finally {
                    setSavingToProfile(false);
                  }
                }}
                disabled={savingToProfile || isSavedToProfile}
                color={isSavedToProfile ? 'success' : 'primary'}
                startIcon={isSavedToProfile ? <CheckCircleOutline /> : null}
              >
                {savingToProfile ? 'Saving...' : isSavedToProfile ? 'Saved to Profile' : 'Save to Profile'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No feedback available
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>

    {/* Success Snackbar */}
    <Snackbar
      open={showSuccessMessage}
      autoHideDuration={3000}
      onClose={() => setShowSuccessMessage(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="success" sx={{ width: '100%' }}>
        Saved to profile successfully!
      </Alert>
    </Snackbar>
  </>
  );
};

export default InterviewDialog;
