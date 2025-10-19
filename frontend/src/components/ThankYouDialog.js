import React from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Zoom
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} style={{ transformOrigin: 'center center' }} />;
});

const ThankYouDialog = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #388e3c 0%, #1b5e20 100%)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '300%',
            height: '300%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%) scale(0)',
            animation: 'ripple 0.8s ease-out forwards',
            pointerEvents: 'none'
          },
          '@keyframes ripple': {
            '0%': {
              transform: 'translate(-50%, -50%) scale(0)',
              opacity: 1
            },
            '100%': {
              transform: 'translate(-50%, -50%) scale(1)',
              opacity: 0
            }
          }
        }
      }}
    >
      <DialogContent sx={{ textAlign: 'center', py: 4, position: 'relative' }}>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white'
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
        <CheckCircleIcon sx={{ 
          fontSize: 60, 
          color: '#4caf50', 
          mb: 2,
          filter: 'drop-shadow(0 4px 8px rgba(76, 175, 80, 0.3))',
          animation: 'checkmarkBounce 0.6s ease-out forwards, pulse 1.5s ease-in-out 0.6s infinite',
          '@keyframes checkmarkBounce': {
            '0%': {
              transform: 'scale(0) rotate(-180deg)',
              opacity: 0
            },
            '50%': {
              transform: 'scale(1.2) rotate(-90deg)',
              opacity: 0.8
            },
            '100%': {
              transform: 'scale(1) rotate(0deg)',
              opacity: 1
            }
          },
          '@keyframes pulse': {
            '0%, 100%': {
              transform: 'scale(1)',
              filter: 'drop-shadow(0 4px 8px rgba(76, 175, 80, 0.3))'
            },
            '50%': {
              transform: 'scale(1.05)',
              filter: 'drop-shadow(0 6px 12px rgba(76, 175, 80, 0.5))'
            }
          }
        }} />
        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          mb: 1,
          color: 'white',
          animation: 'fadeInUp 0.8s ease-out 0.3s both',
          '@keyframes fadeInUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(20px)'
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)'
            }
          }
        }}>
          Thank you!
        </Typography>
        <Typography variant="body1" sx={{ 
          opacity: 0.9,
          color: 'white',
          animation: 'fadeInUp 0.8s ease-out 0.5s both',
          '@keyframes fadeInUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(20px)'
            },
            '100%': {
              opacity: 0.9,
              transform: 'translateY(0)'
            }
          }
        }}>
          Thank you for using JobTailorAI
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default ThankYouDialog;