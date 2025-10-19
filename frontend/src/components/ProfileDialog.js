import React, { useState, useEffect } from 'react';
import Logger from '../utils/logger';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  Divider,
  Grid,
  Alert
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';

function ProfileDialog({ open, onClose }) {
  const [userInfo, setUserInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      loadUserInfo();
    }
  }, [open]);

  const loadUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      setUserInfo({
        email: user.signInDetails?.loginId || '',
        firstName: user.attributes?.given_name || '',
        lastName: user.attributes?.family_name || '',
        phone: user.attributes?.phone_number || ''
      });
    } catch (err) {
      Logger.error('Error loading user info:', err);
      setError('Failed to load user information');
    }
  };

  const handleInputChange = (field) => (event) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
    setMessage('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await updateUserAttributes({
        userAttributes: {
          given_name: userInfo.firstName,
          family_name: userInfo.lastName,
          phone_number: userInfo.phone
        }
      });
      setMessage('Profile updated successfully!');
    } catch (err) {
      Logger.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setMessage('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: '1px solid #0A66C2'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#F8F9FA', 
        borderBottom: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Avatar sx={{ bgcolor: '#0A66C2' }}>
          <PersonIcon />
        </Avatar>
        <Typography variant="h6" sx={{ color: '#0A66C2', fontWeight: 600 }}>
          Profile Settings
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#666', fontWeight: 500 }}>
                Email Address
              </Typography>
              <TextField
                fullWidth
                value={userInfo.email}
                disabled
                variant="outlined"
                helperText="Email cannot be changed"
                sx={{ 
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#333',
                    color: '#333'
                  }
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Name"
              value={userInfo.firstName}
              onChange={handleInputChange('firstName')}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={userInfo.lastName}
              onChange={handleInputChange('lastName')}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Phone Number"
              value={userInfo.phone}
              onChange={handleInputChange('phone')}
              variant="outlined"
              placeholder="+1234567890"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ bgcolor: '#F8F9FA', p: 2, borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> Changes to your profile will be saved to your account. 
            Your email address cannot be modified for security reasons.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button 
          onClick={handleClose}
          sx={{ color: '#666' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          sx={{
            background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #085A9F 30%, #2B7BD6 90%)',
            }
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileDialog;
