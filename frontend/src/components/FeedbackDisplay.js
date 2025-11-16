import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

const FeedbackDisplay = ({ feedback }) => {
  if (!feedback) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No feedback available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Overall Score Header */}
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
                          {qf.yourAnswer || 'No answer provided'}
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
    </Box>
  );
};

export default FeedbackDisplay;
