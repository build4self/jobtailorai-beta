import React, { useState } from 'react';
import Logger from '../utils/logger';
import { useTheme } from '../contexts/ThemeContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress
} from '@mui/material';
import { Settings as SettingsIcon, DeleteForever as DeleteForeverIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { deleteUser } from 'aws-amplify/auth';

function SettingsDialog({ open, onClose, onSettingsChange }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoSave: true,
    darkMode: darkMode
  });

  // Load settings from localStorage when dialog opens
  React.useEffect(() => {
    if (open) {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsedSettings }));
        } catch (error) {
          Logger.error('Error parsing saved settings:', error);
        }
      }
    }
  }, [open]);

  // Delete account state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handleSettingChange = (setting) => (event) => {
    const newValue = event.target.checked !== undefined ? event.target.checked : event.target.value;
    
    // Handle dark mode specially
    if (setting === 'darkMode') {
      toggleDarkMode();
      setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
      return;
    }
    
    const newSettings = {
      ...settings,
      [setting]: newValue
    };
    
    setSettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    
    // Notify parent component of settings change
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
    
    Logger.log('Settings updated:', newSettings);
  };

  const handleSave = () => {
    // Save settings to localStorage using the same key that MainApp reads
    localStorage.setItem('userSettings', JSON.stringify(settings));
    Logger.log('Settings saved:', settings);
    
    // Notify parent component of settings change
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
    
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      emailNotifications: true,
      autoSave: true,
      darkMode: false
    };
    
    setSettings(defaultSettings);
    
    // Reset dark mode if it's currently enabled
    if (darkMode) {
      toggleDarkMode();
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUser();
      setDeleteSuccess(true);
      
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = '/';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      Logger.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setDeleteConfirmText('');
    setShowDeleteSection(false);
    setDeleteSuccess(false);
    setCountdown(5);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={deleteSuccess ? () => {} : handleClose} // Prevent closing during success message
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: '1px solid #0A66C2'
        }
      }}
    >
      {deleteSuccess ? (
        // Success Message Screen
        <>
          <DialogTitle sx={{ 
            bgcolor: '#E8F5E8', 
            borderBottom: '1px solid #4CAF50',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            textAlign: 'center'
          }}>
            <Avatar sx={{ bgcolor: '#4CAF50', mx: 'auto' }}>
              <CheckCircleIcon />
            </Avatar>
          </DialogTitle>

          <DialogContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#4CAF50', fontWeight: 600, mb: 3 }}>
              Account Successfully Deleted
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6, color: '#333' }}>
              We respect your privacy and have permanently deleted your account and all associated data. 
              Your information has been completely removed from our systems.
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.6, color: '#666' }}>
              Please feel free to create another account if you ever want to visit us again. 
              We'd be happy to help you optimize your resume in the future!
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 1,
              p: 2,
              bgcolor: '#F5F5F5',
              borderRadius: 2,
              mb: 2
            }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="textSecondary">
                Redirecting to home page in {countdown} second{countdown !== 1 ? 's' : ''}...
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
              Thank you for using JobTailorAI!
            </Typography>
          </DialogContent>
        </>
      ) : (
        // Regular Settings Content
        <>
          <DialogTitle sx={{ 
            bgcolor: '#F8F9FA', 
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ bgcolor: '#0A66C2' }}>
              <SettingsIcon />
            </Avatar>
            <Typography variant="h6" sx={{ color: '#0A66C2', fontWeight: 600 }}>
              Settings & Privacy
            </Typography>
          </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <List>
          <ListItem>
            <ListItemText 
              primary="Email Notifications"
              secondary="Receive email updates about your resume optimization progress"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.emailNotifications}
                onChange={handleSettingChange('emailNotifications')}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          <ListItem>
            <ListItemText 
              primary="Auto-Save"
              secondary="Automatically save your work as you make changes"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.autoSave}
                onChange={handleSettingChange('autoSave')}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          <ListItem>
            <ListItemText 
              primary="Dark Mode"
              secondary="Use dark theme for the application"
            />
            <ListItemSecondaryAction>
              <Switch
                checked={settings.darkMode}
                onChange={handleSettingChange('darkMode')}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />
        </List>

        {/* Privacy & Account Section */}
        <Box sx={{ p: 3, bgcolor: '#FFF3E0', borderTop: '1px solid #E0E0E0' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#E65100', fontWeight: 600 }}>
            Privacy & Account
          </Typography>
          
          {!showDeleteSection ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setShowDeleteSection(true)}
              sx={{
                borderColor: '#CC1016',
                color: '#CC1016',
                '&:hover': {
                  borderColor: '#AA0E14',
                  backgroundColor: '#FFF5F5'
                }
              }}
            >
              Delete Account
            </Button>
          ) : (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  ⚠️ This action cannot be undone. All your data will be permanently deleted.
                </Typography>
              </Alert>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                To confirm deletion, please type <strong>DELETE</strong>:
              </Typography>
              
              <TextField
                fullWidth
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowDeleteSection(false);
                    setDeleteConfirmText('');
                  }}
                  size="small"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
                  size="small"
                  sx={{
                    backgroundColor: '#CC1016',
                    '&:hover': { backgroundColor: '#AA0E14' }
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Note:</strong> Some settings may require you to refresh the page or restart the application to take effect.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button 
          onClick={handleReset}
          sx={{ color: '#666' }}
        >
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleClose}
          sx={{ color: '#666' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          sx={{
            background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #085A9F 30%, #2B7BD6 90%)',
            }
          }}
        >
          Save Settings
        </Button>
      </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default SettingsDialog;
