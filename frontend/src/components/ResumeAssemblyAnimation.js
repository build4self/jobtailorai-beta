import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// Add keyframes for checkmark animation
const checkmarkKeyframes = `
  @keyframes checkmark-appear {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const ResumeAssemblyAnimation = ({ currentTip, educationalTips, statusMessage, generateCV }) => {
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);

  // Check if cover letter is being generated (either by user selection or status message)
  const hasCoverLetter = generateCV || (statusMessage && statusMessage.toLowerCase().includes('generating cover letter'));
  
  // Define processing steps with dynamic progress based on cover letter presence
  const processingSteps = [
    { 
      id: 'analyzing', 
      label: 'Analyzing job requirements and keywords',
      keywords: ['processing resume and job description', 'extracting job information from url'],
      progress: hasCoverLetter ? 20 : 25  // 20% with cover letter, 25% without
    },
    { 
      id: 'cleaning', 
      label: 'Cleaning resume text for better readability',
      keywords: ['extracting and updating skills database'],
      progress: hasCoverLetter ? 40 : 50  // 40% with cover letter, 50% without
    },
    { 
      id: 'optimizing', 
      label: 'Optimizing content for ATS systems',
      keywords: ['generating optimized resume with ai'],
      progress: hasCoverLetter ? 65 : 75  // 65% with cover letter, 75% without
    },
    { 
      id: 'finalizing', 
      label: 'Finalizing resume structure',
      keywords: ['finalizing optimized resume'],
      progress: hasCoverLetter ? 85 : 95  // 85% with cover letter, 95% without (almost complete)
    },
    { 
      id: 'cover-letter', 
      label: 'Generating cover letter',
      keywords: ['generating cover letter'],
      progress: 95,
      optional: true
    }
  ];

  // Get current step based on dynamic progress thresholds
  const getCurrentStep = (status) => {
    // Use dynamic thresholds based on cover letter presence
    const step1Threshold = hasCoverLetter ? 20 : 25;
    const step2Threshold = hasCoverLetter ? 40 : 50;
    const step3Threshold = hasCoverLetter ? 65 : 75;
    const step4Threshold = hasCoverLetter ? 85 : 95;
    
    if (hasCoverLetter && progress >= step4Threshold) return 4; // Cover letter step
    if (progress >= step3Threshold) return 3; // Finalizing
    if (progress >= step2Threshold) return 2; // Optimizing
    if (progress >= step1Threshold) return 1; // Cleaning
    return 0; // Analyzing
  };

  // Map status messages to progress ranges
  const getTargetProgress = (status) => {
    if (!status) return 15; // Start with some progress for first step
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('completed') || statusLower.includes('ready') || statusLower.includes('success')) {
      return 99; // Stop at 99% instead of 100% to allow smooth transition
    }
    
    const currentStep = getCurrentStep(status);
    return processingSteps[currentStep]?.progress || 15;
  };

  // Update target progress when status changes
  useEffect(() => {
    const newTarget = getTargetProgress(statusMessage);
    setTargetProgress(prev => Math.max(prev, newTarget));
  }, [statusMessage]);

  // Automatic step progression based on dynamic thresholds
  useEffect(() => {
    if (targetProgress > 0 && targetProgress < 99) {
      const progressTimer = setTimeout(() => {
        setTargetProgress(prev => {
          // Get dynamic thresholds based on cover letter presence
          const step1Target = hasCoverLetter ? 20 : 25;
          const step2Target = hasCoverLetter ? 40 : 50;
          const step3Target = hasCoverLetter ? 65 : 75;
          const step4Target = hasCoverLetter ? 85 : 95;
          
          // Automatically advance to next step when threshold is reached
          if (prev >= (step1Target - 2) && prev < step2Target) {
            return step2Target; // Move to cleaning step
          } else if (prev >= (step2Target - 2) && prev < step3Target) {
            return step3Target; // Move to optimizing step  
          } else if (prev >= (step3Target - 2) && prev < step4Target) {
            return step4Target; // Move to finalizing step
          } else if (hasCoverLetter && prev >= (step4Target - 2) && prev < 95) {
            return 95; // Move to cover letter step (only if cover letter enabled)
          } else if (prev < step1Target) {
            return Math.min(prev + 3, step1Target); // Progress within analyzing step
          } else if (prev >= step1Target && prev < step2Target) {
            return Math.min(prev + 3, step2Target); // Progress within cleaning step
          } else if (prev >= step2Target && prev < step3Target) {
            return Math.min(prev + 3, step3Target); // Progress within optimizing step
          } else if (prev >= step3Target && prev < step4Target) {
            return Math.min(prev + 3, step4Target); // Progress within finalizing step
          }
          return prev;
        });
      }, 2000); // Check every 2 seconds
      
      return () => clearTimeout(progressTimer);
    }
  }, [targetProgress, statusMessage, hasCoverLetter]);

  // Smoothly animate progress toward target - controlled increments
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // When completed, ensure we reach 99% smoothly
        if (targetProgress === 99) {
          if (prev < 99) {
            const diff = 99 - prev;
            if (diff < 0.5) {
              return 99;
            }
            return prev + Math.max(diff * 0.2, 0.5);
          }
          return 99;
        }
        
        // Controlled progress increments that don't overshoot
        if (targetProgress > prev) {
          const diff = targetProgress - prev;
          if (diff < 0.3) {
            return targetProgress;
          }
          
          // Smaller, controlled increment
          let increment = Math.min(diff * 0.1, 0.5);
          
          return Math.min(prev + increment, targetProgress);
        }
        
        // Only add tiny increments when at target, and respect boundaries
        if (prev < targetProgress) {
          return Math.min(prev + 0.1, targetProgress);
        }
        
        return prev;
      });
    }, 200); // Moderate interval
    
    return () => clearInterval(progressInterval);
  }, [targetProgress, statusMessage]);

  // Get current step index
  const currentStepIndex = getCurrentStep(statusMessage);
  
  // Get steps to display (include cover letter only if it's being generated)
  const getStepsToDisplay = () => {
    const baseSteps = processingSteps.filter(step => !step.optional);
    
    if (statusMessage && statusMessage.toLowerCase().includes('generating cover letter')) {
      return [...baseSteps, processingSteps.find(step => step.id === 'cover-letter')];
    }
    
    return baseSteps;
  };

  const stepsToDisplay = getStepsToDisplay();

  return (
    <>
      {/* Inject CSS animation */}
      <style>{checkmarkKeyframes}</style>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        maxWidth: '400px',
        margin: '0 auto',
        padding: '20px'
      }}>
      {/* Combined Progress and Document Sections */}
      <Box sx={{ 
        width: '100%',
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
        mb: 3
      }}>
        {/* Header with Status */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: '#1976d2',
            mb: 1
          }}>
            Tailoring Your Resume
          </Typography>
          
          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#f0f0f0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#1976d2',
                  borderRadius: 4,
                }
              }}
            />
            <Typography variant="body2" sx={{ 
              color: '#666', 
              mt: 1,
              fontSize: '14px'
            }}>
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
        </Box>

        {/* Processing Steps */}
        <Box sx={{ mb: 2 }}>
          {stepsToDisplay.map((step, index) => {
            const isCompleted = progress >= 99 || currentStepIndex > index;
            const isActive = currentStepIndex === index && progress < 99;
            const isUpcoming = currentStepIndex < index && progress < 99;
            
            return (
              <Box 
                key={step.id}
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  mb: 1.5,
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Status Icon */}
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                  {isCompleted ? (
                    <CheckCircleIcon sx={{ 
                      color: '#4caf50', 
                      fontSize: 20,
                      animation: isCompleted && currentStepIndex === index + 1 ? 'checkmark-appear 0.5s ease' : 'none'
                    }} />
                  ) : isActive ? (
                    <CircularProgress 
                      size={16} 
                      thickness={4}
                      sx={{ 
                        color: '#1976d2',
                        ml: 0.25,
                        mr: 0.25
                      }} 
                    />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ 
                      color: '#e0e0e0', 
                      fontSize: 20 
                    }} />
                  )}
                </Box>
                
                {/* Step Label */}
                <Typography variant="body2" sx={{ 
                  color: isCompleted ? '#4caf50' : isActive ? '#1976d2' : '#999',
                  fontSize: '14px',
                  fontWeight: isCompleted || isActive ? 500 : 400,
                  transition: 'color 0.3s ease'
                }}>
                  {step.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Educational Tip */}
      <Box sx={{
        width: '100%',
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #e9ecef'
      }}>
        <Typography variant="subtitle2" sx={{ 
          fontWeight: 600,
          color: '#1976d2',
          mb: 1,
          fontSize: '14px'
        }}>
          {educationalTips[currentTip]?.title}
        </Typography>
        <Typography variant="body2" sx={{
          color: '#666',
          lineHeight: 1.5,
          fontSize: '13px'
        }}>
          {educationalTips[currentTip]?.text}
        </Typography>
      </Box>
    </Box>
    </>
  );
};

export default ResumeAssemblyAnimation;