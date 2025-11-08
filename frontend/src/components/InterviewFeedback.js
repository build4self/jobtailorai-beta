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
  AccordionDetails,
  LinearProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  ExpandMore,
  TrendingUp,
  TrendingDown,
  School,
  EmojiEvents,
  Lightbulb
} from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
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

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/interview/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      Logger.info('Feedback loaded');

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
          Interview Performance
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, my: 3 }}>
          <EmojiEvents sx={{ fontSize: 60, color: 'gold' }} />
          <Typography variant="h2" color={getScoreColor(feedback.overallScore)}>
            {feedback.overallScore}/10
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {feedback.summary}
        </Typography>
      </Paper>

      {/* Skills Breakdown */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Communication
              </Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Clarity: {feedback.communicationSkills?.clarity}/10
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={feedback.communicationSkills?.clarity * 10}
                  color={getScoreColor(feedback.communicationSkills?.clarity)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Conciseness: {feedback.communicationSkills?.conciseness}/10
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={feedback.communicationSkills?.conciseness * 10}
                  color={getScoreColor(feedback.communicationSkills?.conciseness)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Confidence: {feedback.communicationSkills?.confidence}/10
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={feedback.communicationSkills?.confidence * 10}
                  color={getScoreColor(feedback.communicationSkills?.confidence)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Technical Accuracy
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h3" color={getScoreColor(feedback.technicalAccuracy?.score)}>
                  {feedback.technicalAccuracy?.score}/10
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {feedback.technicalAccuracy?.feedback}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Company Fit
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h3" color={getScoreColor(feedback.companyFit?.score)}>
                  {feedback.companyFit?.score}/10
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {feedback.companyFit?.feedback}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Strengths */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="success" />
          Strengths
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {feedback.strengths?.map((strength, index) => (
            <Chip key={index} label={strength} color="success" variant="outlined" />
          ))}
        </Box>
      </Paper>

      {/* Areas for Improvement */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDown color="warning" />
          Areas for Improvement
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {feedback.areasForImprovement?.map((area, index) => (
            <Chip key={index} label={area} color="warning" variant="outlined" />
          ))}
        </Box>
      </Paper>

      {/* Question-by-Question Feedback */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Detailed Question Feedback
      </Typography>
      {feedback.questionFeedback?.map((qf, index) => (
        <Accordion key={index} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Chip
                label={`${qf.score}/10`}
                color={getScoreColor(qf.score)}
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

              <Typography variant="subtitle2" color="success.main" gutterBottom>
                Suggested Improvement:
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {qf.suggestedAnswer}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Recommendations */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lightbulb color="primary" />
          Recommendations
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          {feedback.recommendations?.map((rec, index) => (
            <Typography component="li" key={index} variant="body2" sx={{ mb: 1 }}>
              {rec}
            </Typography>
          ))}
        </Box>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/app/interview/history')}
        >
          View History
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<School />}
          onClick={() => navigate('/app/interview/setup')}
        >
          Practice Again
        </Button>
      </Box>
    </Container>
  );
};

export default InterviewFeedback;
