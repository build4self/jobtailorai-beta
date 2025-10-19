import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ResumeAssemblyAnimation from './ResumeAssemblyAnimation';

const AnimationDemo = () => {
  const [currentTip, setCurrentTip] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const educationalTips = [
    {
      icon: "🎯",
      title: "ATS Enhancement",
      text: "ATS systems scan for exact keyword matches from job descriptions. We're strategically placing relevant keywords throughout your resume."
    },
    {
      icon: "📊", 
      title: "Recruiter Insights",
      text: "Recruiters spend only 6 seconds on initial resume review. We're crafting your content for maximum impact in those crucial first moments."
    },
    {
      icon: "🎯",
      title: "Achievement Focus", 
      text: "Quantified achievements increase interview chances by 40%. We're highlighting your measurable accomplishments and impact."
    },
    {
      icon: "🚀",
      title: "Action Verbs",
      text: "Action verbs like 'implemented', 'enhanced', and 'achieved' catch recruiter attention. We're enhancing your experience descriptions."
    },
    {
      icon: "🔍",
      title: "Keyword Density",
      text: "The right keyword density helps your resume rank higher in ATS searches while maintaining natural readability."
    },
    {
      icon: "📝",
      title: "Professional Format",
      text: "Clean, professional formatting ensures your resume looks great both in ATS systems and to human recruiters."
    }
  ];

  React.useEffect(() => {
    let tipInterval;
    if (isRunning) {
      tipInterval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % educationalTips.length);
      }, 4000);
    }
    return () => {
      if (tipInterval) clearInterval(tipInterval);
    };
  }, [isRunning, educationalTips.length]);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      p: 2
    }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#1976d2' }}>
        Resume Assembly Animation Demo
      </Typography>
      
      <Button
        variant="contained"
        onClick={() => setIsRunning(!isRunning)}
        sx={{ mb: 3 }}
      >
        {isRunning ? 'Stop Animation' : 'Start Animation'}
      </Button>

      <Box sx={{ 
        backgroundColor: 'white',
        borderRadius: 2,
        p: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ResumeAssemblyAnimation 
          currentTip={currentTip}
          educationalTips={educationalTips}
        />
      </Box>
    </Box>
  );
};

export default AnimationDemo;