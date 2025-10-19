import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Rating,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Fade,
  Slide
} from '@mui/material';
import {
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ThumbUp as ThumbUpIcon,
  Feedback as FeedbackIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const FeedbackDialog = ({ open, onClose, onSubmit, manual = false }) => {
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [feedbackCategories, setFeedbackCategories] = useState({
    content_quality: false,
    job_matching: false,
    cover_letter: false,
    processing_speed: false,
    user_interface: false,
    other: false
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');


  const handleClose = () => {
    // Reset state
    setStep(1);
    setRating(0);
    setFeedbackCategories({
      content_quality: false,
      job_matching: false,
      cover_letter: false,
      processing_speed: false,
      user_interface: false,
      other: false
    });
    setFeedbackText('');
    setEmail('');
    onClose();
  };



  const handleDetailedSubmit = () => {
    const selectedCategories = Object.keys(feedbackCategories)
      .filter(key => feedbackCategories[key]);

    onSubmit({
      type: 'detailed_feedback',
      rating: rating,
      categories: selectedCategories,
      feedback_text: feedbackText,
      email: email,
      step: 'complete',
      manual: manual
    });

    handleClose();
  };

  const handleCategoryChange = (category) => {
    setFeedbackCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === 'backdropClick') {
          return; // Prevent closing on backdrop click
        }
        handleClose();
      }}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={false}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #388e3c 0%, #1b5e20 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FeedbackIcon />
          <Typography variant="h6" component="div">
            Rate your Experience
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose} 
          sx={{ color: 'white' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {step === 1 && (
          <Box sx={{ textAlign: 'center' }}>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Rating
                  name="user-rating"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue);
                    // Auto-advance to detailed feedback for 1-4 stars only
                    if (newValue > 0 && newValue < 5) {
                      setTimeout(() => setStep(2), 300); // Small delay for visual feedback
                    }
                  }}
                  size="large"
                  icon={<StarIcon fontSize="inherit" sx={{ color: '#ffd700' }} />}
                  emptyIcon={<StarBorderIcon fontSize="inherit" sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: '#ffd700',
                    },
                    '& .MuiRating-iconHover': {
                      color: '#ffed4e',
                    },
                  }}
                />
              </Box>

              {rating === 5 && (
                <Slide direction="up" in={rating === 5}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 1,
                    mb: 2,
                    p: 2,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 2
                  }}>
                    <ThumbUpIcon sx={{ color: '#4caf50' }} />
                    <Typography variant="body2">
                      Awesome! Thank you for the great feedback!
                    </Typography>
                  </Box>
                </Slide>
              )}


          </Box>
        )}

        {step === 2 && (
          <Box>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                What can we improve?
              </Typography>

              <FormGroup sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackCategories.content_quality}
                      onChange={() => handleCategoryChange('content_quality')}
                      sx={{ color: 'white', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label="Resume content quality"
                  sx={{ color: 'white' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackCategories.job_matching}
                      onChange={() => handleCategoryChange('job_matching')}
                      sx={{ color: 'white', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label="Job matching accuracy"
                  sx={{ color: 'white' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackCategories.cover_letter}
                      onChange={() => handleCategoryChange('cover_letter')}
                      sx={{ color: 'white', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label="Cover letter quality"
                  sx={{ color: 'white' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackCategories.processing_speed}
                      onChange={() => handleCategoryChange('processing_speed')}
                      sx={{ color: 'white', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label="Processing speed"
                  sx={{ color: 'white' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackCategories.user_interface}
                      onChange={() => handleCategoryChange('user_interface')}
                      sx={{ color: 'white', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label="User interface/experience"
                  sx={{ color: 'white' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={feedbackCategories.other}
                      onChange={() => handleCategoryChange('other')}
                      sx={{ color: 'white', '&.Mui-checked': { color: '#4caf50' } }}
                    />
                  }
                  label="Other"
                  sx={{ color: 'white' }}
                />
              </FormGroup>

              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Tell us what specifically went wrong..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.7)',
                    opacity: 1,
                  },
                }}
              />

              <TextField
                fullWidth
                placeholder="Email (optional, for follow-up)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.7)',
                    opacity: 1,
                  },
                }}
              />
          </Box>
        )}


      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        {step === 1 && rating === 5 && (
          <Button
            onClick={() => {
              onSubmit({
                type: 'rating',
                rating: rating,
                step: 'complete',
                manual: manual
              });
              handleClose();
            }}
            variant="contained"
            sx={{
              backgroundColor: 'white',
              color: '#388e3c',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              },
            }}
          >
            Submit Feedback
          </Button>
        )}
        
        {step === 2 && (
          <>
            <Button
              onClick={() => setStep(1)}
              sx={{ color: 'white', mr: 1 }}
            >
              Back
            </Button>
            <Button
              onClick={handleDetailedSubmit}
              variant="contained"
              sx={{
                backgroundColor: 'white',
                color: '#388e3c',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                },
              }}
            >
              Submit Feedback
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;