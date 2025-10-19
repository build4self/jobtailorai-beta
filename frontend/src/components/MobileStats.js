import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const MobileStats = () => {
  const mobileStats = [
    { number: '3x', label: 'Interviews' },
    { number: '95%', label: 'ATS Pass' },
    { number: '45s', label: 'Process' }
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      gap: 1.5, 
      mt: 2,
      flexWrap: 'nowrap',
      px: 1
    }}>
      {mobileStats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 + index * 0.2 }}
        >
          <Box sx={{ 
            textAlign: 'center',
            minWidth: '60px',
            maxWidth: '80px'
          }}>
            <Typography variant="h4" sx={{ 
              fontSize: '1rem',
              color: '#0A66C2', 
              fontWeight: 'bold',
              mb: 0.3,
              lineHeight: 1
            }}>
              {stat.number}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#cccccc',
              fontSize: '7px',
              lineHeight: 1.2,
              display: 'block'
            }}>
              {stat.label}
            </Typography>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};

export default MobileStats;
