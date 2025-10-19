import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper
} from '@mui/material';

const FormatSelector = ({ 
  selectedResumeFormat, 
  selectedCoverLetterFormat,
  onResumeFormatChange,
  onCoverLetterFormatChange,
  showCoverLetter = false 
}) => {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {/* Resume Format Card */}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 1.5, 
            borderRadius: 1.5, 
            border: '1px solid #e0e0e0',
            minWidth: '180px',
            flex: showCoverLetter ? '1' : 'auto'
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, color: '#333', display: 'block', fontSize: '0.8rem' }}>
            Resume Format
          </Typography>
          
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={selectedResumeFormat}
              onChange={(e) => onResumeFormatChange(e.target.value)}
              sx={{ gap: 0.5 }}
            >
              <FormControlLabel 
                value="pdf" 
                control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#0A66C2' }, p: 0.5 }} />} 
                label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>PDF</Typography>}
                sx={{ mr: 0.5, minWidth: 'auto' }}
              />
              <FormControlLabel 
                value="docx" 
                control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#0A66C2' }, p: 0.5 }} />} 
                label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Word</Typography>}
                sx={{ mr: 0.5, minWidth: 'auto' }}
              />
              <FormControlLabel 
                value="txt" 
                control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#0A66C2' }, p: 0.5 }} />} 
                label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Text</Typography>}
                sx={{ mr: 0, minWidth: 'auto' }}
              />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* Cover Letter Format Card - Only show when cover letter is enabled */}
        {showCoverLetter && (
          <Paper 
            elevation={1} 
            sx={{ 
              p: 1.5, 
              borderRadius: 1.5, 
              border: '1px solid #e0e0e0',
              minWidth: '180px',
              flex: '1'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, color: '#333', display: 'block', fontSize: '0.8rem' }}>
              Cover Letter Format
            </Typography>
            
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={selectedCoverLetterFormat}
                onChange={(e) => onCoverLetterFormatChange(e.target.value)}
                sx={{ gap: 0.5 }}
              >
                <FormControlLabel 
                  value="pdf" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#0A66C2' }, p: 0.5 }} />} 
                  label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>PDF</Typography>}
                  sx={{ mr: 0.5, minWidth: 'auto' }}
                />
                <FormControlLabel 
                  value="docx" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#0A66C2' }, p: 0.5 }} />} 
                  label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Word</Typography>}
                  sx={{ mr: 0.5, minWidth: 'auto' }}
                />
                <FormControlLabel 
                  value="txt" 
                  control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#0A66C2' }, p: 0.5 }} />} 
                  label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Text</Typography>}
                  sx={{ mr: 0, minWidth: 'auto' }}
                />
              </RadioGroup>
            </FormControl>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default FormatSelector;
