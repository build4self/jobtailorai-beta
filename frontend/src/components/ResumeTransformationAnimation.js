import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const ResumeTransformationAnimation = ({ 
  autoStart = true, 
  duration = 8000,
  onComplete = () => {} 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation steps
  const steps = [
    { id: 'plain', label: 'Original Resume', duration: 1500 },
    { id: 'analyzing', label: 'AI Analyzing...', duration: 1000 },
    { id: 'keywords', label: 'Adding Keywords', duration: 1200 },
    { id: 'formatting', label: 'Optimizing Format', duration: 1000 },
    { id: 'skills', label: 'Enhancing Skills', duration: 1200 },
    { id: 'complete', label: 'AI-Tailored Resume', duration: 2100 }
  ];

  useEffect(() => {
    if (autoStart) {
      startAnimation();
    }
  }, [autoStart]);

  const startAnimation = () => {
    setIsAnimating(true);
    setCurrentStep(0);
    
    let totalTime = 0;
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index);
        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsAnimating(false);
            onComplete();
          }, step.duration);
        }
      }, totalTime);
      totalTime += step.duration;
    });
  };

  // Resume content that transforms
  const getResumeContent = () => {
    const baseContent = {
      name: "Sarah Johnson",
      title: "Software Engineer",
      email: "sarah.johnson@email.com",
      phone: "(555) 123-4567"
    };

    switch (currentStep) {
      case 0: // Plain resume
        return {
          ...baseContent,
          skills: ["JavaScript", "Python", "HTML"],
          experience: [
            {
              title: "Developer",
              company: "Tech Company",
              description: "Built web applications"
            }
          ]
        };
      
      case 2: // Keywords added
        return {
          ...baseContent,
          skills: ["JavaScript", "Python", "HTML", "React", "Node.js", "AWS"],
          experience: [
            {
              title: "Full-Stack Developer",
              company: "Tech Company",
              description: "Built scalable web applications using modern frameworks"
            }
          ]
        };
      
      case 3: // Formatting optimized
        return {
          ...baseContent,
          title: "Senior Software Engineer | Full-Stack Developer",
          skills: ["JavaScript", "Python", "HTML", "React", "Node.js", "AWS", "Docker"],
          experience: [
            {
              title: "Full-Stack Software Engineer",
              company: "Tech Company",
              description: "• Built scalable web applications using modern frameworks\n• Collaborated with cross-functional teams"
            }
          ]
        };
      
      case 4: // Skills enhanced
        return {
          ...baseContent,
          title: "Senior Software Engineer | Full-Stack Developer",
          skills: ["JavaScript", "Python", "React", "Node.js", "AWS", "Docker", "MongoDB", "Git", "Agile"],
          experience: [
            {
              title: "Full-Stack Software Engineer",
              company: "Tech Company",
              description: "• Built scalable web applications using React and Node.js\n• Collaborated with cross-functional teams in Agile environment\n• Deployed applications on AWS with Docker containers"
            }
          ]
        };
      
      default: // Complete
        return {
          ...baseContent,
          title: "Senior Software Engineer | Full-Stack Developer | Cloud Specialist",
          skills: ["JavaScript", "Python", "React", "Node.js", "AWS", "Docker", "MongoDB", "Git", "Agile", "CI/CD"],
          experience: [
            {
              title: "Full-Stack Software Engineer",
              company: "Tech Company",
              description: "• Built scalable web applications using React and Node.js, serving 10K+ users\n• Collaborated with cross-functional teams in Agile environment\n• Deployed applications on AWS with Docker containers and CI/CD pipelines\n• Optimized database performance resulting in 40% faster load times"
            }
          ]
        };
    }
  };

  const content = getResumeContent();
  const isAnalyzing = currentStep === 1;

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#f5f5f5',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Status indicator */}
      <Box sx={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        px: 2,
        py: 1,
        borderRadius: 2,
        fontSize: '0.9rem',
        fontWeight: 600
      }}>
        {steps[currentStep]?.label}
      </Box>

      {/* AI Processing Overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(45deg, rgba(10, 102, 194, 0.1), rgba(25, 118, 210, 0.1))',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Box sx={{
              bgcolor: 'white',
              p: 3,
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <Box sx={{
                width: 40,
                height: 40,
                border: '4px solid #0A66C2',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                mx: 'auto',
                mb: 2,
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} />
              <Typography variant="h6" sx={{ color: '#0A66C2', fontWeight: 600 }}>
                AI Analyzing Job Requirements
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                Identifying key skills and optimizing content...
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume Document */}
      <motion.div
        key={currentStep}
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: '600px', height: '80%' }}
      >
        <Paper sx={{
          width: '100%',
          height: '100%',
          p: 4,
          bgcolor: 'white',
          boxShadow: currentStep >= 3 ? '0 12px 40px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: currentStep >= 3 ? '2px solid #0A66C2' : '1px solid #e0e0e0',
          borderRadius: 2,
          overflow: 'auto',
          position: 'relative',
          transition: 'all 0.5s ease'
        }}>
          {/* Header */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <motion.div
              key={`name-${currentStep}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: currentStep >= 3 ? '#0A66C2' : '#333',
                mb: 1,
                transition: 'color 0.5s ease'
              }}>
                {content.name}
              </Typography>
            </motion.div>
            
            <motion.div
              key={`title-${currentStep}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Typography variant="h6" sx={{ 
                color: currentStep >= 2 ? '#0A66C2' : '#666',
                fontWeight: currentStep >= 3 ? 600 : 400,
                mb: 2,
                transition: 'all 0.5s ease'
              }}>
                {content.title}
              </Typography>
            </motion.div>
            
            <Typography variant="body2" sx={{ color: '#666' }}>
              {content.email} • {content.phone}
            </Typography>
          </Box>

          {/* Skills Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: currentStep >= 3 ? '#0A66C2' : '#333',
              transition: 'color 0.5s ease'
            }}>
              Technical Skills
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <AnimatePresence>
                {content.skills.map((skill, index) => (
                  <motion.div
                    key={skill}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box sx={{
                      bgcolor: currentStep >= 4 ? '#0A66C2' : '#f0f0f0',
                      color: currentStep >= 4 ? 'white' : '#333',
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.85rem',
                      fontWeight: currentStep >= 4 ? 600 : 400,
                      transition: 'all 0.5s ease'
                    }}>
                      {skill}
                    </Box>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>
          </Box>

          {/* Experience Section */}
          <Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              mb: 2,
              color: currentStep >= 3 ? '#0A66C2' : '#333',
              transition: 'color 0.5s ease'
            }}>
              Professional Experience
            </Typography>
            {content.experience.map((exp, index) => (
              <motion.div
                key={`exp-${currentStep}-${index}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600,
                    color: currentStep >= 3 ? '#0A66C2' : '#333',
                    transition: 'color 0.5s ease'
                  }}>
                    {exp.title}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                    {exp.company}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#555',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line'
                  }}>
                    {exp.description}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>

          {/* Enhancement indicators */}
          {currentStep >= 2 && (
            <Box sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              gap: 1
            }}>
              {currentStep >= 2 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Box sx={{
                    bgcolor: '#4CAF50',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    +Keywords
                  </Box>
                </motion.div>
              )}
              {currentStep >= 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Box sx={{
                    bgcolor: '#FF9800',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    ATS-Ready
                  </Box>
                </motion.div>
              )}
              {currentStep >= 5 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Box sx={{
                    bgcolor: '#0A66C2',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    AI-Enhanced
                  </Box>
                </motion.div>
              )}
            </Box>
          )}
        </Paper>
      </motion.div>

      {/* Progress indicator */}
      <Box sx={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 1,
        zIndex: 10
      }}>
        {steps.map((_, index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: index <= currentStep ? '#0A66C2' : 'rgba(255, 255, 255, 0.5)',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ResumeTransformationAnimation;