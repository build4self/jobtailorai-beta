import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const TermsAndConditions = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          maxHeight: '80vh',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        pb: 2
      }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          Terms and Conditions
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          <strong>Last Updated:</strong> December 2024
        </Typography>

        <Typography variant="body1" paragraph>
          Welcome to JobTailorAI. By creating an account and using our service, you agree to these Terms and Conditions.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            1. Service Description
          </Typography>
          <Typography variant="body2" paragraph>
            JobTailorAI is an AI-powered platform that helps job seekers optimize their resumes and cover letters for specific job applications. Our service analyzes job descriptions and tailors your resume content to improve your chances of success.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            2. Account Registration
          </Typography>
          <Typography variant="body2" paragraph>
            By creating an account, you confirm that:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>You are at least 18 years old</li>
            <li>All information provided is accurate and complete</li>
            <li>You will keep your account information updated</li>
            <li>You are responsible for maintaining the security of your account</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            3. Use of Service
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Permitted Use:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>Personal, non-commercial use for job searching purposes</li>
            <li>Upload your own resume and job descriptions</li>
            <li>Download and use optimized resumes for job applications</li>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Prohibited Use:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>Sharing account credentials with others</li>
            <li>Uploading copyrighted content you don't own</li>
            <li>Using the service for spam or malicious purposes</li>
            <li>Attempting to reverse engineer our AI algorithms</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            4. Content and Privacy
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Your Content:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>You retain ownership of your uploaded resumes and personal information</li>
            <li>We process your content solely to provide our optimization service</li>
            <li>We do not share your personal information with third parties without consent</li>
            <li>You can delete your account and data at any time</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
            5. Communication and Newsletter
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#1565c0' }}>
            <strong>By creating an account, you automatically subscribe to our newsletter</strong> which includes:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2, color: '#1565c0' }}>
            <li>Product updates and new features</li>
            <li>Tips for job searching and resume optimization</li>
            <li>Important service announcements</li>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#1565c0' }}>
            You can opt out at any time by:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2, color: '#1565c0' }}>
            <li>Clicking "unsubscribe" in any email</li>
            <li>Updating your preferences in your account settings</li>
            <li>Contacting us at support@jobtailorai.com</li>
          </Box>
          
          <Typography variant="body2" sx={{ color: '#1565c0' }}>
            We respect your privacy and will only send relevant, valuable content. We do not sell your email address to third parties.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            6. Service Availability
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
            <li>We may perform maintenance that temporarily affects availability</li>
            <li>We reserve the right to modify or discontinue features with notice</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            7. Limitation of Liability
          </Typography>
          <Typography variant="body2" paragraph>
            JobTailorAI provides resume optimization suggestions, but:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>We cannot guarantee job interview or hiring success</li>
            <li>You are responsible for reviewing and approving all resume changes</li>
            <li>We are not liable for any employment-related outcomes</li>
            <li>Our liability is limited to the amount you paid for the service</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            8. Data Security
          </Typography>
          <Typography variant="body2" paragraph>
            We implement industry-standard security measures to protect your data:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security audits and updates</li>
            <li>Limited access to personal information by authorized personnel only</li>
            <li>Compliance with applicable data protection regulations</li>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            9. Contact Information
          </Typography>
          <Typography variant="body2" paragraph>
            For questions about these terms or our service:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>Email: support@jobtailorai.com</li>
            <li>Website: https://jobtailorai.com</li>
          </Box>
        </Box>

        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mt: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center' }}>
            By clicking "I agree to the Terms and Conditions" during account registration, you acknowledge that you have read, understood, and agree to be bound by these terms.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          sx={{
            backgroundColor: '#0A66C2',
            '&:hover': {
              backgroundColor: '#004182'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsAndConditions;