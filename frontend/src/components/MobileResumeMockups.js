import React from 'react';
import { Box, Typography } from '@mui/material';
import JobTailorIcon from './JobTailorIcon';
import { motion } from 'framer-motion';

const MobileResumeMockups = () => {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 0.5,
      flexDirection: 'row'
    }}>
      {/* Before Resume - Mobile Simplified */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{
          bgcolor: '#ff6b6b',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '8px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
          mb: 0.5
        }}>
          BEFORE
        </Box>
        <motion.div
          initial={{ scale: 1, x: 0 }}
          animate={{ scale: 0.95, x: -10 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: 1 }}
        >
          <Box sx={{
            width: '110px',
            height: '160px',
            bgcolor: '#f9f9f9',
            borderRadius: 1.5,
            border: '2px solid #ddd',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            p: 0.8
          }}>
            {/* Header */}
            <Box sx={{ mb: 0.8, textAlign: 'center', borderBottom: '1px solid #ccc', pb: 0.5 }}>
              <Typography sx={{ 
                fontSize: '6px', 
                fontWeight: 'bold', 
                color: '#333',
                mb: 0.2
              }}>
                JOHN SMITH
              </Typography>
              <Typography sx={{ 
                fontSize: '4px', 
                color: '#666',
                mb: 0.2
              }}>
                Data Engineer
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#888'
              }}>
                john.smith@email.com
              </Typography>
            </Box>
            
            {/* Summary Section */}
            <Box sx={{ mb: 0.8 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#333',
                mb: 0.3,
                textDecoration: 'underline'
              }}>
                SUMMARY
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555',
                lineHeight: 1.2
              }}>
                Data engineer with ETL experience
              </Typography>
            </Box>

            {/* Experience Section - Simplified */}
            <Box sx={{ mb: 0.8 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#333',
                mb: 0.3,
                textDecoration: 'underline'
              }}>
                EXPERIENCE
              </Typography>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold',
                color: '#444',
                mb: 0.2
              }}>
                Data Engineer - TechCorp
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555',
                lineHeight: 1.1,
                mb: 0.1
              }}>
                • Built ETL pipelines
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555',
                lineHeight: 1.1,
                mb: 0.2
              }}>
                • Managed databases
              </Typography>
              
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold',
                color: '#444',
                mb: 0.1
              }}>
                Analyst - DataSoft
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555',
                lineHeight: 1.1,
                mb: 0.1
              }}>
                • Created reports
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555',
                lineHeight: 1.1
              }}>
                • Analyzed data trends
              </Typography>
            </Box>

            {/* Skills Section */}
            <Box sx={{ mb: 0.8 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#333',
                mb: 0.3,
                textDecoration: 'underline'
              }}>
                SKILLS
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555',
                lineHeight: 1.2
              }}>
                Python, SQL, Excel
              </Typography>
            </Box>
            
            {/* Education Section */}
            <Box>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#333',
                mb: 0.3,
                textDecoration: 'underline'
              }}>
                EDUCATION
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                fontWeight: 'bold', 
                color: '#444',
                mb: 0.1
              }}>
                BS Computer Science
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#555'
              }}>
                State University
              </Typography>
            </Box>
          </Box>
        </motion.div>
      </Box>

      {/* AI Transformation Arrow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0.7 }}
        animate={{ scale: 1.2, opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
        style={{ 
          margin: '0 6px', 
          zIndex: 2
        }}
      >
        <JobTailorIcon size={16} sx={{
          filter: 'drop-shadow(0 0 10px rgba(10, 102, 194, 0.6))'
        }} />
      </motion.div>

      {/* After Resume - Mobile Simplified */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{
          bgcolor: '#4caf50',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '8px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
          mb: 0.5
        }}>
          AFTER
        </Box>
        <motion.div
          initial={{ scale: 1, x: 0 }}
          animate={{ scale: 1.05, x: 10 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: 1 }}
        >
          <Box sx={{
            width: '110px',
            height: '160px',
            bgcolor: 'white',
            borderRadius: 1.5,
            border: '2px solid #0A66C2',
            position: 'relative',
            boxShadow: '0 8px 30px rgba(10, 102, 194, 0.3)',
            overflow: 'hidden',
            p: 0.8
          }}>
            {/* Header */}
            <Box sx={{ 
              mb: 0.8, 
              textAlign: 'center', 
              bgcolor: '#f8fbff', 
              mx: -0.8, 
              mt: -0.8, 
              p: 0.8, 
              borderBottom: '2px solid #0A66C2' 
            }}>
              <Typography sx={{ 
                fontSize: '7px', 
                fontWeight: 'bold', 
                color: '#0A66C2',
                mb: 0.2
              }}>
                JOHN SMITH
              </Typography>
              <Typography sx={{ 
                fontSize: '5px', 
                color: '#0A66C2',
                fontWeight: 'bold',
                mb: 0.2
              }}>
                AI/ML Developer
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#378FE9'
              }}>
                john.smith@email.com
              </Typography>
            </Box>
            
            {/* Summary Section */}
            <Box sx={{ mb: 0.8 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#0A66C2',
                mb: 0.3,
                borderBottom: '1px solid #0A66C2',
                pb: 0.1
              }}>
                SUMMARY
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333',
                lineHeight: 1.2
              }}>
                AI/ML Developer with ML expertise and proven track record
              </Typography>
            </Box>

            {/* Experience Section - Enhanced */}
            <Box sx={{ mb: 0.8 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#0A66C2',
                mb: 0.3,
                borderBottom: '1px solid #0A66C2',
                pb: 0.1
              }}>
                EXPERIENCE
              </Typography>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold',
                color: '#0A66C2',
                mb: 0.2
              }}>
                Senior AI/ML Engineer
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333',
                lineHeight: 1.1,
                mb: 0.1
              }}>
                • Built ML pipelines with TensorFlow
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333',
                lineHeight: 1.1,
                mb: 0.2
              }}>
                • 95% accuracy predictive models
              </Typography>
              
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold',
                color: '#0A66C2',
                mb: 0.1
              }}>
                Data Scientist
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333',
                lineHeight: 1.1,
                mb: 0.1
              }}>
                • Advanced analytics models
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333',
                lineHeight: 1.1
              }}>
                • NLP & recommendation systems
              </Typography>
            </Box>

            {/* Skills Section */}
            <Box sx={{ mb: 0.8 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#0A66C2',
                mb: 0.3,
                borderBottom: '1px solid #0A66C2',
                pb: 0.1
              }}>
                SKILLS
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333',
                lineHeight: 1.2
              }}>
                Python, TensorFlow, PyTorch, ML, NLP, AWS
              </Typography>
            </Box>
            
            {/* Education Section */}
            <Box sx={{ mb: 0.5 }}>
              <Typography sx={{ 
                fontSize: '4px', 
                fontWeight: 'bold', 
                color: '#0A66C2',
                mb: 0.3,
                borderBottom: '1px solid #0A66C2',
                pb: 0.1
              }}>
                EDUCATION
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                fontWeight: 'bold', 
                color: '#0A66C2',
                mb: 0.1
              }}>
                BS Computer Science
              </Typography>
              <Typography sx={{ 
                fontSize: '3px', 
                color: '#333'
              }}>
                State University
              </Typography>
            </Box>
            
            {/* ATS Enhancement Badge */}
            <Box sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 0.2
            }}>
              <Box sx={{
                fontSize: '4px',
                color: '#4caf50',
                fontWeight: 'bold',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                px: 0.3,
                py: 0.1,
                borderRadius: 0.3
              }}>
                ✓ ATS Enhanced
              </Box>
              <Box sx={{ display: 'flex', gap: 0.3 }}>
                {[...Array(3)].map((_, i) => (
                  <Box key={i} sx={{
                    width: '3px',
                    height: '3px',
                    bgcolor: '#4caf50',
                    borderRadius: '50%',
                    animation: `pulse 1.5s ease-in-out infinite ${i * 0.2}s`
                  }} />
                ))}
              </Box>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default MobileResumeMockups;
