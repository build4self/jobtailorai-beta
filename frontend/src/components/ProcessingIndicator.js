import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
} from '@mui/icons-material';
import JobTailorIcon from './JobTailorIcon';

function ProcessingIndicator({ status = 'PROCESSING' }) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Animate progress bar over 2 seconds
  useEffect(() => {
    const duration = 2000; // 2 seconds
    const interval = 50; // Update every 50ms for smooth animation
    const increment = 100 / (duration / interval);
    
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [status]);

  // Animate steps completion based on progress
  useEffect(() => {
    const steps = getStatusInfo().steps;
    if (steps.length > 0) {
      const stepThreshold = 100 / steps.length;
      const newStepIndex = Math.min(
        Math.floor(progress / stepThreshold),
        steps.length - 1
      );
      setCurrentStepIndex(newStepIndex);
    }
  }, [progress, status]);
  const getStatusInfo = () => {
    switch (status) {
      case 'SUBMITTING':
        return {
          title: 'Submitting Your Resume',
          subtitle: 'Preparing your resume for AI optimization...',
          color: '#ff9800',
          steps: [
            { text: 'Uploading resume file' },
            { text: 'Validating job description' },
            { text: 'Initializing AI processor' },
            { text: 'Analyzing content' }
          ]
        };
      case 'PROCESSING':
        return {
          title: 'Optimizing Your Resume',
          subtitle: 'Our AI is enhancing your resume for maximum impact...',
          color: '#2196f3',
          steps: [
            { text: 'Extracting resume content' },
            { text: 'Analyzing job requirements' },
            { text: 'Optimizing keywords for ATS' },
            { text: 'Generating enhanced resume' }
          ]
        };
      default:
        return {
          title: 'Processing',
          subtitle: 'Please wait...',
          color: '#666',
          steps: []
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Box sx={{
      p: 3,
      bgcolor: 'white', // Clean white background instead of card-like gray
      borderRadius: 2,
      // Removed border to eliminate card appearance
      my: 3,
      // Add global styles for animations
      '& @keyframes pulse': {
        '0%, 100%': {
          opacity: 1
        },
        '50%': {
          opacity: 0.7
        }
      },
      '& @keyframes shimmer': {
        '0%': {
          transform: 'translateX(-100%)'
        },
        '100%': {
          transform: 'translateX(100%)'
        }
      }
    }}>
      {/* Header with Icon */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2 
      }}>
        <JobTailorIcon size={32} sx={{
          mr: 2,
          animation: 'pulse 2s ease-in-out infinite'
        }} />
        <Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: '#333',
            mb: 0.5
          }}>
            {statusInfo.title}
          </Typography>
          <Typography variant="body2" sx={{ 
            color: '#666',
            fontSize: '14px'
          }}>
            {statusInfo.subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <LinearProgress 
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: statusInfo.color,
              borderRadius: 4,
              transition: 'transform 0.1s ease-out'
            }
          }}
        />
        <Typography variant="caption" sx={{ 
          display: 'block',
          textAlign: 'center',
          mt: 1,
          color: '#666',
          fontSize: '12px'
        }}>
          {Math.round(progress)}% Complete
        </Typography>
      </Box>

      {/* Processing Steps */}
      {statusInfo.steps.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ 
            mb: 2, 
            color: '#333',
            fontWeight: 600
          }}>
            Processing Steps:
          </Typography>
          <List dense sx={{ py: 0 }}>
            {statusInfo.steps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isActive = index === currentStepIndex && progress < 100;
              
              return (
                <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {isCompleted ? (
                      <CheckCircleIcon sx={{ 
                        fontSize: 18, 
                        color: '#4caf50',
                        transition: 'all 0.3s ease-in-out'
                      }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ 
                        fontSize: 18, 
                        color: isActive ? statusInfo.color : '#ccc',
                        animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                        transition: 'color 0.3s ease-in-out'
                      }} />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={step.text} 
                    primaryTypographyProps={{ 
                      fontSize: '14px',
                      color: isCompleted ? '#4caf50' : (isActive ? '#333' : '#666'),
                      fontWeight: isCompleted ? 500 : (isActive ? 500 : 400),
                      transition: 'all 0.3s ease-in-out'
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Time Estimate */}
      <Box sx={{ 
        mt: 3, 
        p: 2, 
        bgcolor: 'rgba(33, 150, 243, 0.05)',
        borderRadius: 1,
        // Removed border to eliminate card appearance
      }}>
        <Typography variant="body2" sx={{ 
          color: '#1976d2',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          ⏱️ {progress < 100 ? 'Estimated time: 30-60 seconds' : 'Processing complete!'}
        </Typography>
      </Box>
    </Box>
  );
}

export default ProcessingIndicator;
