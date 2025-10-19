import React from 'react';
import { Box } from '@mui/material';

const JobTailorIcon = ({ sx = {}, size = 24 }) => {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        bgcolor: '#0A66C2',
        color: 'white',
        borderRadius: '4px',
        fontSize: size * 0.5,
        fontWeight: 900,
        fontFamily: 'Arial, sans-serif',
        letterSpacing: '0.5px',
        ...sx
      }}
    >
      AI
    </Box>
  );
};

export default JobTailorIcon;