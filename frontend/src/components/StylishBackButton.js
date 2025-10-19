import React from 'react';
import { Button, Box } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const StylishBackButton = ({ onClick, children = "Back", ...props }) => {
  return (
    <Button
      onClick={onClick}
      variant="outlined"
      size="small"
      startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
      sx={{
        borderColor: '#e0e0e0',
        color: '#666',
        backgroundColor: 'white',
        borderRadius: '8px',
        px: 2,
        py: 1,
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#0A66C2',
          color: '#0A66C2',
          backgroundColor: 'rgba(10, 102, 194, 0.04)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          transform: 'translateY(-1px)',
          '& .MuiSvgIcon-root': {
            transform: 'translateX(-2px)',
          }
        },
        '&:active': {
          transform: 'translateY(0px)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default StylishBackButton;
