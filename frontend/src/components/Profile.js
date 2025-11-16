import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import Logger from '../utils/logger';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button,
  Avatar,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { 
  Person as PersonIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  LinkedIn as LinkedInIcon,
  GitHub as GitHubIcon,
  Language as WebsiteIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
// Removed JobTailorIcon import - using inline branding instead
import { getCurrentUser, fetchUserAttributes, signOut, fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import FeedbackDisplay from './FeedbackDisplay';

function Profile() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState('personal');
  const [currentUser, setCurrentUser] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [userInfo, setUserInfo] = useState({
    email: '',
    name: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
    bio: ''
  });
  const [savedResumes, setSavedResumes] = useState([]);
  const [savedInterviews, setSavedInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedResumeDetails, setSelectedResumeDetails] = useState(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showInterviewFeedback, setShowInterviewFeedback] = useState(false);
  const [deleteInterviewDialogOpen, setDeleteInterviewDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState(null);

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
    loadSavedResumes();
    loadSavedInterviews(); // Preload interviews for instant display
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      const attributes = await fetchUserAttributes();
      
      setUserInfo({
        email: attributes.email || '',
        name: attributes.name || attributes.given_name + ' ' + attributes.family_name || '',
        phone: attributes.phone_number || '',
        location: attributes['custom:location'] || '',
        linkedin: attributes['custom:linkedin'] || '',
        github: attributes['custom:github'] || '',
        website: attributes['custom:website'] || '',
        bio: attributes['custom:bio'] || ''
      });
    } catch (error) {
      Logger.error('Error loading user data:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      Logger.error('Error signing out:', error);
    }
  };

  const getDisplayName = () => {
    if (userInfo.name) return userInfo.name;
    if (currentUser?.username) return currentUser.username;
    return 'User';
  };

  const loadSavedResumes = () => {
    // Load saved resumes from localStorage for now
    // In a real app, this would come from your backend/DynamoDB
    const saved = localStorage.getItem('savedResumes');
    if (saved) {
      setSavedResumes(JSON.parse(saved));
    }
  };

  const handleSaveProfile = () => {
    // Save profile data
    // In a real app, this would update Cognito user attributes
    localStorage.setItem('userProfile', JSON.stringify(userInfo));
    setEditMode(false);
    setSnackbarMessage('Profile updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleDeleteResume = (resumeId) => {
    const updatedResumes = savedResumes.filter(resume => resume.id !== resumeId);
    setSavedResumes(updatedResumes);
    localStorage.setItem('savedResumes', JSON.stringify(updatedResumes));
    setDeleteDialogOpen(false);
    setSnackbarMessage('Resume deleted successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleBulkDeleteOldResumes = () => {
    // Sort resumes by creation date and keep only the 40 most recent ones
    const sortedResumes = [...savedResumes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const resumesToKeep = sortedResumes.slice(0, 40);
    const deletedCount = savedResumes.length - resumesToKeep.length;
    
    setSavedResumes(resumesToKeep);
    localStorage.setItem('savedResumes', JSON.stringify(resumesToKeep));
    setBulkDeleteDialogOpen(false);
    
    setSnackbarMessage(`${deletedCount} oldest resumes deleted successfully! You now have ${resumesToKeep.length}/50 resumes.`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const menuItems = [
    { id: 'personal', label: 'Personal Details', icon: <PersonIcon /> },
    { id: 'resumes', label: 'Saved Resumes', icon: <DescriptionIcon /> },
    { id: 'interviews', label: 'Saved Interviews', icon: <SchoolIcon /> }
  ];

  const renderPersonalDetails = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Profile Header Card */}
      <Paper 
        elevation={2}
        sx={{ 
          p: 4, 
          mb: 3,
          background: 'linear-gradient(135deg, rgba(10, 102, 194, 0.05) 0%, rgba(55, 143, 233, 0.05) 100%)',
          border: '1px solid rgba(10, 102, 194, 0.1)',
          borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: '#0A66C2',
                fontSize: '2rem',
                boxShadow: '0 4px 20px rgba(10, 102, 194, 0.3)'
              }}
            >
              {getDisplayName().charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0A66C2', mb: 0.5 }}>
                {getDisplayName()}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {userInfo.email}
              </Typography>
              {userInfo.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {userInfo.location}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          
          <Button
            variant={editMode ? "contained" : "outlined"}
            startIcon={<EditIcon />}
            onClick={() => setEditMode(!editMode)}
            size="large"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              ...(editMode ? {
                background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                boxShadow: '0 4px 16px rgba(10, 102, 194, 0.3)'
              } : {
                borderColor: '#0A66C2',
                color: '#0A66C2',
                '&:hover': {
                  borderColor: '#004182',
                  backgroundColor: 'rgba(10, 102, 194, 0.04)'
                }
              })
            }}
          >
            {editMode ? 'Cancel Edit' : 'Edit Profile'}
          </Button>
        </Box>

        {userInfo.bio && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.paper', 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {userInfo.bio}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Contact Information Card */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
          Contact Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={userInfo.name}
              onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
              disabled={!editMode}
              variant={editMode ? "outlined" : "standard"}
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              value={userInfo.email}
              disabled
              variant="standard"
              helperText="Email cannot be changed"
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={userInfo.phone}
              onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
              disabled={!editMode}
              variant={editMode ? "outlined" : "standard"}
              placeholder="+1 (555) 123-4567"
              InputProps={{
                startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Location"
              value={userInfo.location}
              onChange={(e) => setUserInfo({...userInfo, location: e.target.value})}
              disabled={!editMode}
              variant={editMode ? "outlined" : "standard"}
              placeholder="City, State, Country"
              InputProps={{
                startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Professional Links Card */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
          Professional Links
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="LinkedIn Profile"
              value={userInfo.linkedin}
              onChange={(e) => setUserInfo({...userInfo, linkedin: e.target.value})}
              disabled={!editMode}
              variant={editMode ? "outlined" : "standard"}
              placeholder="https://linkedin.com/in/yourprofile"
              InputProps={{
                startAdornment: <LinkedInIcon sx={{ mr: 1, color: '#0077B5' }} />
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="GitHub Profile"
              value={userInfo.github}
              onChange={(e) => setUserInfo({...userInfo, github: e.target.value})}
              disabled={!editMode}
              variant={editMode ? "outlined" : "standard"}
              placeholder="https://github.com/yourusername"
              InputProps={{
                startAdornment: <GitHubIcon sx={{ mr: 1, color: '#333' }} />
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Personal Website"
              value={userInfo.website}
              onChange={(e) => setUserInfo({...userInfo, website: e.target.value})}
              disabled={!editMode}
              variant={editMode ? "outlined" : "standard"}
              placeholder="https://yourwebsite.com"
              InputProps={{
                startAdornment: <WebsiteIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* About Me Card */}
      <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
          About Me
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Bio"
          value={userInfo.bio}
          onChange={(e) => setUserInfo({...userInfo, bio: e.target.value})}
          disabled={!editMode}
          variant={editMode ? "outlined" : "standard"}
          placeholder="Tell us about yourself, your experience, and what makes you unique..."
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '1rem',
              lineHeight: 1.6
            }
          }}
        />

        {editMode && (
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => setEditMode(false)}
              size="large"
              sx={{ 
                px: 3, 
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              size="large"
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                boxShadow: '0 4px 16px rgba(10, 102, 194, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #004182 30%, #0A66C2 90%)',
                  boxShadow: '0 6px 20px rgba(10, 102, 194, 0.4)'
                }
              }}
            >
              Save Changes
            </Button>
          </Box>
        )}
      </Paper>
    </motion.div>
  );

  const handleDownloadResume = async (resume, format = 'default') => {
    const downloadId = format === 'default' ? resume.id : `${resume.id}-${format}`;
    setDownloadingResumeId(downloadId);
    
    try {
      // Determine which URL to use based on format and availability
      let downloadUrl;
      let fileExtension;
      
      if (format === 'pdf' && resume.pdfUrl) {
        downloadUrl = resume.pdfUrl;
        fileExtension = 'pdf';
      } else if (format === 'word' && resume.wordUrl) {
        downloadUrl = resume.wordUrl;
        fileExtension = 'docx';
      } else {
        // Fallback to legacy downloadUrl or first available format
        if (resume.pdfUrl) {
          downloadUrl = resume.pdfUrl;
          fileExtension = 'pdf';
        } else if (resume.wordUrl) {
          downloadUrl = resume.wordUrl;
          fileExtension = 'docx';
        } else {
          downloadUrl = resume.downloadUrl;
          fileExtension = resume.format || 'docx';
        }
      }

      // Check if this is mock data (localhost with # URL)
      if (window.location.hostname === 'localhost' && downloadUrl === '#') {
        setSnackbarMessage('This is demo data - download not available');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        return;
      }

      // Check if URL is empty or invalid
      if (!downloadUrl || downloadUrl === '') {
        setSnackbarMessage('Download URL not available for this resume');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }

      // For S3 pre-signed URLs or valid URLs, attempt download
      const response = await fetch(downloadUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.title}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbarMessage(`Resume downloaded successfully as ${fileExtension.toUpperCase()}!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      Logger.error('Download error:', error);
      setSnackbarMessage('Download failed - the link may have expired. Please re-optimize your resume.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDownloadingResumeId(null);
    }
  };

  const handleDownloadCoverLetter = async (resume, format = 'default') => {
    const downloadId = format === 'default' ? `${resume.id}-cover` : `${resume.id}-cover-${format}`;
    setDownloadingResumeId(downloadId);
    
    try {
      // Determine which URL to use based on format and availability
      let downloadUrl;
      let fileExtension;
      
      if (format === 'pdf' && resume.coverLetterPdfUrl) {
        downloadUrl = resume.coverLetterPdfUrl;
        fileExtension = 'pdf';
      } else if (format === 'word' && resume.coverLetterWordUrl) {
        downloadUrl = resume.coverLetterWordUrl;
        fileExtension = 'docx';
      } else {
        // Fallback to legacy coverLetterUrl or first available format
        if (resume.coverLetterPdfUrl) {
          downloadUrl = resume.coverLetterPdfUrl;
          fileExtension = 'pdf';
        } else if (resume.coverLetterWordUrl) {
          downloadUrl = resume.coverLetterWordUrl;
          fileExtension = 'docx';
        } else {
          downloadUrl = resume.coverLetterUrl;
          fileExtension = resume.coverLetterFormat || resume.format || 'docx';
        }
      }

      // Check if this is mock data (localhost with # URL)
      if (window.location.hostname === 'localhost' && (!downloadUrl || downloadUrl === '#')) {
        setSnackbarMessage('This is demo data - cover letter download not available');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        return;
      }

      // Check if URL is empty or invalid
      if (!downloadUrl || downloadUrl === '') {
        setSnackbarMessage('Cover letter download URL not available');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }

      // For S3 pre-signed URLs or valid URLs, attempt download
      const response = await fetch(downloadUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Cover letter download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.title}_cover_letter.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbarMessage(`Cover letter downloaded successfully as ${fileExtension.toUpperCase()}!`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      Logger.error('Cover letter download error:', error);
      setSnackbarMessage('Cover letter download failed - the link may have expired. Please re-optimize your resume.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDownloadingResumeId(null);
    }
  };

  const handleViewDetails = (resume) => {
    setSelectedResumeDetails(resume);
    setDetailsDialogOpen(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSavedResumes = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#0A66C2' }}>
            Saved Resumes
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography 
              variant="body2" 
              color={savedResumes.length >= 45 ? 'error.main' : 'text.secondary'}
              sx={{ fontWeight: savedResumes.length >= 45 ? 600 : 400 }}
            >
              {savedResumes.length}/50 resumes saved
            </Typography>
            {savedResumes.length >= 45 && (
              <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                {savedResumes.length >= 50 ? 'Limit reached!' : 'Approaching limit'}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Warning alert when approaching or at limit */}
        {savedResumes.length >= 45 && (
          <Alert 
            severity={savedResumes.length >= 50 ? 'error' : 'warning'} 
            sx={{ mb: 3 }}
            action={
              savedResumes.length >= 50 && (
                <Button 
                  color="inherit" 
                  size="small"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  sx={{ fontWeight: 600 }}
                >
                  Clean Up Old Resumes
                </Button>
              )
            }
          >
            {savedResumes.length >= 50 
              ? 'You have reached the maximum limit of 50 saved resumes. Please delete some resumes to save new ones.'
              : `You are approaching the limit of 50 saved resumes. You have ${50 - savedResumes.length} slots remaining.`
            }
          </Alert>
        )}

        {savedResumes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <DescriptionIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No saved resumes yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start optimizing resumes to see them here
            </Typography>
            <Button
              variant="contained"
              startIcon={
                <Box sx={{
                  bgcolor: 'white',
                  color: '#0A66C2',
                  px: 0.8,
                  py: 0.3,
                  borderRadius: 0.8,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  AI
                </Box>
              }
              onClick={() => navigate('/app/upload')}
              sx={{
                background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #0A66C2 60%, #378FE9 100%)',
                }
              }}
            >
              Optimize Your First Resume
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {savedResumes.map((resume) => (
              <Grid item xs={12} md={6} lg={4} key={resume.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    {/* Header with icon, title, and delete button */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: '#e3f2fd',
                          mr: 2,
                          mt: 0.5
                        }}
                      >
                        <DescriptionIcon sx={{ color: '#0A66C2', fontSize: 20 }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            lineHeight: 1.3,
                            mb: 0.5,
                            wordBreak: 'break-word'
                          }}
                        >
                          {resume.title}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => handleViewDetails(resume)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            minWidth: 'auto',
                            p: 0,
                            color: '#0A66C2',
                            '&:hover': {
                              backgroundColor: 'transparent',
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          View Details
                        </Button>
                      </Box>
                      {/* Delete button in top right corner */}
                      <IconButton
                        size="small"
                        onClick={() => {
                          setResumeToDelete(resume);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{
                          color: '#d32f2f',
                          '&:hover': {
                            bgcolor: 'rgba(211, 47, 47, 0.04)'
                          },
                          ml: 1
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    {/* Metadata chips */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip 
                        label={formatDate(resume.createdAt)} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: '#0A66C2',
                          color: '#0A66C2',
                          fontSize: '0.75rem'
                        }}
                      />
                      {resume.hasCoverLetter && (
                        <Chip 
                          label="+ Cover Letter" 
                          size="small" 
                          sx={{ 
                            bgcolor: '#4CAF50',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      )}
                    </Box>

                    {/* Creation time */}
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: '0.75rem'
                      }}
                    >
                      Created at {formatTime(resume.createdAt)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                      {/* Row 1: Resume downloads */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 'fit-content' }}>
                          Resume:
                        </Typography>
                        {resume.hasDualFormat && resume.pdfUrl && resume.wordUrl ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download PDF" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadResume(resume, 'pdf')}
                                disabled={downloadingResumeId === `${resume.id}-pdf`}
                                sx={{
                                  bgcolor: '#d32f2f',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: '#b71c1c',
                                  },
                                  '&:disabled': {
                                    bgcolor: '#ccc',
                                  },
                                  width: 32,
                                  height: 32
                                }}
                              >
                                {downloadingResumeId === `${resume.id}-pdf` ? 
                                  <CircularProgress size={16} color="inherit" /> : 
                                  <img src="/pdf-icon.svg" alt="PDF" style={{ width: 16, height: 16 }} />
                                }
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Word" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadResume(resume, 'word')}
                                disabled={downloadingResumeId === `${resume.id}-word`}
                                sx={{
                                  bgcolor: '#2B579A',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: '#1B4F8C',
                                  },
                                  '&:disabled': {
                                    bgcolor: '#ccc',
                                  },
                                  width: 32,
                                  height: 32
                                }}
                              >
                                {downloadingResumeId === `${resume.id}-word` ? 
                                  <CircularProgress size={16} color="inherit" /> : 
                                  <img src="/word-icon.svg" alt="Word" style={{ width: 16, height: 16 }} />
                                }
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : (
                          /* Single Resume download for legacy or single-format resumes */
                          <Tooltip title="Download Resume" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadResume(resume)}
                              disabled={downloadingResumeId === resume.id}
                              sx={{
                                bgcolor: '#0A66C2',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#085A9F',
                                },
                                '&:disabled': {
                                  bgcolor: '#ccc',
                                },
                                width: 32,
                                height: 32
                              }}
                            >
                              {downloadingResumeId === resume.id ? 
                                <CircularProgress size={16} color="inherit" /> : 
                                <DownloadIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      
                      {/* Row 2: Cover Letter downloads */}
                      {resume.hasCoverLetter && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 'fit-content' }}>
                            Cover Letter:
                          </Typography>
                          {resume.hasCoverLetterDualFormat && resume.coverLetterPdfUrl && resume.coverLetterWordUrl ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Download PDF" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadCoverLetter(resume, 'pdf')}
                                  disabled={downloadingResumeId === `${resume.id}-cover-pdf`}
                                  sx={{
                                    bgcolor: '#d32f2f',
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: '#b71c1c',
                                    },
                                    '&:disabled': {
                                      bgcolor: '#ccc',
                                    },
                                    width: 32,
                                    height: 32
                                  }}
                                >
                                  {downloadingResumeId === `${resume.id}-cover-pdf` ? 
                                    <CircularProgress size={16} color="inherit" /> : 
                                    <img src="/pdf-icon.svg" alt="PDF" style={{ width: 16, height: 16 }} />
                                  }
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download Word" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadCoverLetter(resume, 'word')}
                                  disabled={downloadingResumeId === `${resume.id}-cover-word`}
                                  sx={{
                                    bgcolor: '#2B579A',
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: '#1B4F8C',
                                    },
                                    '&:disabled': {
                                      bgcolor: '#ccc',
                                    },
                                    width: 32,
                                    height: 32
                                  }}
                                >
                                  {downloadingResumeId === `${resume.id}-cover-word` ? 
                                    <CircularProgress size={16} color="inherit" /> : 
                                    <img src="/word-icon.svg" alt="Word" style={{ width: 16, height: 16 }} />
                                  }
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : (
                            /* Single Cover Letter download for legacy or single-format cover letters */
                            <Tooltip title="Download Cover Letter" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadCoverLetter(resume)}
                                disabled={downloadingResumeId === `${resume.id}-cover`}
                                sx={{
                                  bgcolor: '#4CAF50',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: '#388E3C',
                                  },
                                  '&:disabled': {
                                    bgcolor: '#ccc',
                                  },
                                  width: 32,
                                  height: 32
                                }}
                              >
                                {downloadingResumeId === `${resume.id}-cover` ? 
                                  <CircularProgress size={16} color="inherit" /> : 
                                  <DownloadIcon fontSize="small" />
                                }
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </motion.div>
  );

  // Load saved interviews from localStorage
  const loadSavedInterviews = () => {
    setLoadingInterviews(true);
    try {
      // Load from localStorage (same as resumes for consistency)
      const saved = localStorage.getItem('savedInterviews');
      Logger.info('Loading saved interviews from localStorage:', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        Logger.info('Parsed interviews:', parsed);
        setSavedInterviews(parsed);
      } else {
        Logger.info('No saved interviews found in localStorage');
        setSavedInterviews([]);
      }
    } catch (err) {
      Logger.error('Error loading saved interviews:', err);
      setSavedInterviews([]);
    } finally {
      setLoadingInterviews(false);
    }
  };

  // Delete interview from localStorage
  const handleDeleteInterview = (sessionId) => {
    const updatedInterviews = savedInterviews.filter(interview => interview.sessionId !== sessionId);
    setSavedInterviews(updatedInterviews);
    localStorage.setItem('savedInterviews', JSON.stringify(updatedInterviews));
    setDeleteInterviewDialogOpen(false);
    setInterviewToDelete(null);
    setSnackbarMessage('Interview deleted successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  // Render saved interviews section
  const renderSavedInterviews = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0A66C2' }}>
              Saved Interviews
            </Typography>
            <Chip 
              label={`${savedInterviews.length} interview${savedInterviews.length !== 1 ? 's' : ''} saved`}
              sx={{ bgcolor: '#e3f2fd', color: '#0A66C2', fontWeight: 600 }}
            />
          </Box>

          {loadingInterviews ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : savedInterviews.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <SchoolIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No saved interviews yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start practicing interviews to see them here
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {savedInterviews.map((interview) => (
                <Card 
                  key={interview.sessionId}
                  sx={{ 
                    p: 3,
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    {/* Icon */}
                    <Box sx={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 2, 
                      bgcolor: '#e3f2fd', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <SchoolIcon sx={{ fontSize: 32, color: '#0A66C2' }} />
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {interview.companyName || 'Company Interview'}
                          </Typography>
                          <Button
                            size="small"
                            sx={{ 
                              textTransform: 'none', 
                              p: 0, 
                              minWidth: 'auto',
                              color: '#0A66C2',
                              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                            }}
                            onClick={() => {
                              setSelectedInterview(interview);
                              setShowInterviewFeedback(true);
                            }}
                          >
                            View Details
                          </Button>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setInterviewToDelete(interview);
                            setDeleteInterviewDialogOpen(true);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      <Chip 
                        label={new Date(interview.completedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 2, borderColor: '#0A66C2', color: '#0A66C2' }}
                      />

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Role:</strong> {interview.jobRole || 'Interview Practice'}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Score:</strong>
                        </Typography>
                        <Chip 
                          label={`${interview.feedback?.overallScore || 'N/A'}/10`}
                          size="small"
                          color={
                            interview.feedback?.overallScore >= 7 ? 'success' : 
                            interview.feedback?.overallScore >= 5 ? 'warning' : 
                            'error'
                          }
                          sx={{ fontWeight: 600, height: 24 }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
      </motion.div>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Modern Header */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ py: 1.5 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ 
              mr: 2, 
              color: '#0A66C2',
              '&:hover': { bgcolor: 'rgba(10, 102, 194, 0.04)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <Typography variant="h5" component="div" sx={{ 
              fontWeight: 700,
              color: '#0A66C2'
            }}>
              JobTailor
            </Typography>
            <Box sx={{
              bgcolor: '#0A66C2',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              AI
            </Box>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ 
              color: 'text.primary',
              fontWeight: 500,
              display: { xs: 'none', sm: 'block' }
            }}>
              Welcome, {getDisplayName()}
            </Typography>
            <IconButton
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              sx={{ 
                p: 0.5,
                border: '2px solid #0A66C2',
                borderRadius: 2,
                '&:hover': { 
                  border: '2px solid #004182',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: '#0A66C2',
                  width: 36,
                  height: 36,
                  fontSize: '1rem',
                  fontWeight: 700
                }}
              >
                {getDisplayName().charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            
            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={() => setProfileMenuAnchor(null)}
              PaperProps={{
                sx: {
                  border: '1px solid #0A66C2',
                  mt: 1,
                  minWidth: 200
                }
              }}
            >
              <MenuItem onClick={() => {
                setProfileMenuAnchor(null);
                navigate('/app/profile');
              }}>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </MenuItem>
              
              <MenuItem onClick={() => {
                setProfileMenuAnchor(null);
                handleSignOut();
              }}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Modern Left Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper 
              elevation={2}
              sx={{ 
                p: 3, 
                borderRadius: 3,
                position: 'sticky',
                top: 24
              }}
            >
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                mb: 3, 
                color: '#0A66C2',
                fontSize: '1.1rem'
              }}>
                Profile Menu
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {menuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={selectedSection === item.id ? "contained" : "text"}
                    startIcon={item.icon}
                    onClick={() => setSelectedSection(item.id)}
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      py: 1.5,
                      px: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      ...(selectedSection === item.id ? {
                        background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                        boxShadow: '0 4px 12px rgba(10, 102, 194, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #004182 30%, #0A66C2 90%)',
                        }
                      } : {
                        color: 'text.primary',
                        '&:hover': {
                          backgroundColor: 'rgba(10, 102, 194, 0.04)',
                          color: '#0A66C2'
                        }
                      })
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Modern Main Content */}
          <Grid item xs={12} md={9}>
            <Box sx={{ minHeight: '70vh' }}>
              {selectedSection === 'personal' && renderPersonalDetails()}
              {selectedSection === 'resumes' && renderSavedResumes()}
              {selectedSection === 'interviews' && renderSavedInterviews()}
            </Box>
          </Grid>
        </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#d32f2f',
          fontWeight: 600
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Resume
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to delete this resume? This action cannot be undone.
            </Typography>
            
            {resumeToDelete && (
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Resume Details:
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Title:</strong> {resumeToDelete.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Job:</strong> {resumeToDelete.jobTitle}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Format:</strong> {resumeToDelete.format.toUpperCase()}
                </Typography>
                <Typography variant="body2">
                  <strong>Created:</strong> {formatDate(resumeToDelete.createdAt)} at {formatTime(resumeToDelete.createdAt)}
                </Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteResume(resumeToDelete?.id)}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            sx={{
              bgcolor: '#d32f2f',
              '&:hover': {
                bgcolor: '#b71c1c'
              }
            }}
          >
            Delete Resume
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resume Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#0A66C2',
          fontWeight: 600,
          pb: 1
        }}>
          <DescriptionIcon sx={{ mr: 1 }} />
          Resume Details
        </DialogTitle>
        <DialogContent>
          {selectedResumeDetails && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#0A66C2' }}>
                      Basic Information
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Title:</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedResumeDetails.title}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Job Position:</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedResumeDetails.jobTitle}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Format:</Typography>
                      <Chip 
                        label={selectedResumeDetails.format.toUpperCase()} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#0A66C2',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          mt: 0.5
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Created:</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(selectedResumeDetails.createdAt)} at {formatTime(selectedResumeDetails.createdAt)}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#0A66C2' }}>
                      Download Information
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Download Status:</Typography>
                      {selectedResumeDetails.downloadUrl && selectedResumeDetails.downloadUrl !== '' && selectedResumeDetails.downloadUrl !== '#' ? (
                        <Chip 
                          label="Available" 
                          color="success" 
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Chip 
                          label="Not Available" 
                          color="error" 
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Box>
                    {/* Show separate PDF and Word buttons if both formats are available */}
                    {selectedResumeDetails.hasDualFormat && selectedResumeDetails.pdfUrl && selectedResumeDetails.wordUrl ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          variant="contained"
                          startIcon={downloadingResumeId === `${selectedResumeDetails.id}-pdf` ? 
                            <CircularProgress size={16} color="inherit" /> : 
                            <img src="/pdf-icon.svg" alt="PDF" style={{ width: 16, height: 16 }} />
                          }
                          onClick={() => handleDownloadResume(selectedResumeDetails, 'pdf')}
                          disabled={downloadingResumeId === `${selectedResumeDetails.id}-pdf`}
                          fullWidth
                          sx={{
                            background: '#d32f2f',
                            '&:hover': {
                              background: '#b71c1c',
                            },
                            '&:disabled': {
                              background: '#ccc',
                            },
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          {downloadingResumeId === `${selectedResumeDetails.id}-pdf` ? 'Downloading...' : 'Download PDF'}
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={downloadingResumeId === `${selectedResumeDetails.id}-word` ? 
                            <CircularProgress size={16} color="inherit" /> : 
                            <img src="/word-icon.svg" alt="Word" style={{ width: 16, height: 16 }} />
                          }
                          onClick={() => handleDownloadResume(selectedResumeDetails, 'word')}
                          disabled={downloadingResumeId === `${selectedResumeDetails.id}-word`}
                          fullWidth
                          sx={{
                            background: '#2B579A',
                            '&:hover': {
                              background: '#1B4F8C',
                            },
                            '&:disabled': {
                              background: '#ccc',
                            },
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          {downloadingResumeId === `${selectedResumeDetails.id}-word` ? 'Downloading...' : 'Download Word'}
                        </Button>
                      </Box>
                    ) : (
                      /* Single Download button for legacy or single-format resumes */
                      <Button
                        variant="contained"
                        startIcon={downloadingResumeId === selectedResumeDetails.id ? 
                          <CircularProgress size={16} color="inherit" /> : 
                          <DownloadIcon />
                        }
                        onClick={() => handleDownloadResume(selectedResumeDetails)}
                        disabled={downloadingResumeId === selectedResumeDetails.id}
                        fullWidth
                        sx={{
                          background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #0A66C2 60%, #378FE9 100%)',
                          },
                          '&:disabled': {
                            background: '#ccc',
                          },
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        {downloadingResumeId === selectedResumeDetails.id ? 'Downloading...' : 'Download Resume'}
                      </Button>
                    )}
                  </Paper>
                </Grid>
                
                {/* Cover Letter Information */}
                {selectedResumeDetails.hasCoverLetter && (
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#4CAF50' }}>
                        Cover Letter Information
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Format:</Typography>
                        {selectedResumeDetails.hasCoverLetterDualFormat ? (
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label="PDF" 
                              size="small" 
                              sx={{ 
                                bgcolor: '#d32f2f',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            />
                            <Chip 
                              label="WORD" 
                              size="small" 
                              sx={{ 
                                bgcolor: '#2B579A',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            />
                          </Box>
                        ) : (
                          <Chip 
                            label={(selectedResumeDetails.coverLetterFormat || selectedResumeDetails.format).toUpperCase()} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#4CAF50',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              mt: 0.5
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Download Status:</Typography>
                        {(selectedResumeDetails.coverLetterPdfUrl || selectedResumeDetails.coverLetterWordUrl || selectedResumeDetails.coverLetterUrl) && 
                         (selectedResumeDetails.coverLetterPdfUrl !== '' || selectedResumeDetails.coverLetterWordUrl !== '' || selectedResumeDetails.coverLetterUrl !== '') && 
                         (selectedResumeDetails.coverLetterPdfUrl !== '#' || selectedResumeDetails.coverLetterWordUrl !== '#' || selectedResumeDetails.coverLetterUrl !== '#') ? (
                          <Chip 
                            label="Available" 
                            color="success" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Chip 
                            label="Not Available" 
                            color="error" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      
                      {/* Show separate PDF and Word buttons for cover letter if both formats are available */}
                      {selectedResumeDetails.hasCoverLetterDualFormat && selectedResumeDetails.coverLetterPdfUrl && selectedResumeDetails.coverLetterWordUrl ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={downloadingResumeId === `${selectedResumeDetails.id}-cover-pdf` ? 
                              <CircularProgress size={16} color="inherit" /> : 
                              <img src="/pdf-icon.svg" alt="PDF" style={{ width: 16, height: 16 }} />
                            }
                            onClick={() => handleDownloadCoverLetter(selectedResumeDetails, 'pdf')}
                            disabled={downloadingResumeId === `${selectedResumeDetails.id}-cover-pdf`}
                            fullWidth
                            sx={{
                              background: '#d32f2f',
                              '&:hover': {
                                background: '#b71c1c',
                              },
                              '&:disabled': {
                                background: '#ccc',
                              },
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            {downloadingResumeId === `${selectedResumeDetails.id}-cover-pdf` ? 'Downloading...' : 'Download PDF'}
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={downloadingResumeId === `${selectedResumeDetails.id}-cover-word` ? 
                              <CircularProgress size={16} color="inherit" /> : 
                              <img src="/word-icon.svg" alt="Word" style={{ width: 16, height: 16 }} />
                            }
                            onClick={() => handleDownloadCoverLetter(selectedResumeDetails, 'word')}
                            disabled={downloadingResumeId === `${selectedResumeDetails.id}-cover-word`}
                            fullWidth
                            sx={{
                              background: '#2B579A',
                              '&:hover': {
                                background: '#1B4F8C',
                              },
                              '&:disabled': {
                                background: '#ccc',
                              },
                              textTransform: 'none',
                              fontWeight: 600
                            }}
                          >
                            {downloadingResumeId === `${selectedResumeDetails.id}-cover-word` ? 'Downloading...' : 'Download Word'}
                          </Button>
                        </Box>
                      ) : (
                        /* Single Cover Letter button for legacy or single-format cover letters */
                        <Button
                          variant="contained"
                          startIcon={downloadingResumeId === `${selectedResumeDetails.id}-cover` ? 
                            <CircularProgress size={16} color="inherit" /> : 
                            <DownloadIcon />
                          }
                          onClick={() => handleDownloadCoverLetter(selectedResumeDetails)}
                          disabled={downloadingResumeId === `${selectedResumeDetails.id}-cover`}
                          fullWidth
                          sx={{
                            background: 'linear-gradient(45deg, #4CAF50 30%, #66BB6A 90%)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #4CAF50 60%, #66BB6A 100%)',
                            },
                            '&:disabled': {
                              background: '#ccc',
                            },
                            textTransform: 'none',
                            fontWeight: 600
                          }}
                        >
                          {downloadingResumeId === `${selectedResumeDetails.id}-cover` ? 'Downloading...' : 'Download Cover Letter'}
                        </Button>
                      )}
                    </Paper>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#0A66C2' }}>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {selectedResumeDetails.description || 'No description available'}
                    </Typography>
                  </Paper>
                </Grid>
                
                {selectedResumeDetails.originalJobDescription && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#0A66C2' }}>
                        Original Job Description
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          lineHeight: 1.6,
                          maxHeight: 200,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {selectedResumeDetails.originalJobDescription}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDetailsDialogOpen(false)}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#d32f2f',
          fontWeight: 600
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Clean Up Old Resumes
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              This will automatically delete your oldest resumes, keeping only the 40 most recent ones. 
              This will free up 10 slots for new resumes.
            </Typography>
            
            <Paper sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffb74d' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#f57c00' }}>
                What will happen:
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • <strong>{savedResumes.length - 40}</strong> oldest resumes will be permanently deleted
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                • <strong>40</strong> most recent resumes will be kept
              </Typography>
              <Typography variant="body2">
                • You'll have <strong>10 free slots</strong> for new resumes
              </Typography>
            </Paper>

            <Typography variant="body2" color="error.main" sx={{ mt: 2, fontWeight: 500 }}>
              ⚠️ This action cannot be undone. Deleted resumes cannot be recovered.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setBulkDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBulkDeleteOldResumes}
            color="warning"
            variant="contained"
            startIcon={<DeleteIcon />}
            sx={{
              bgcolor: '#f57c00',
              '&:hover': {
                bgcolor: '#ef6c00'
              }
            }}
          >
            Clean Up Old Resumes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ 
            width: '100%',
            '& .MuiAlert-message': {
              fontSize: '0.875rem'
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Interview Feedback Dialog */}
      <Dialog
        open={showInterviewFeedback}
        onClose={() => setShowInterviewFeedback(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
          {selectedInterview?.feedback ? (
            <FeedbackDisplay feedback={selectedInterview.feedback} />
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No feedback available for this interview
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button onClick={() => setShowInterviewFeedback(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Interview Confirmation Dialog */}
      <Dialog
        open={deleteInterviewDialogOpen}
        onClose={() => setDeleteInterviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 2 }}>
          <DeleteIcon sx={{ color: 'error.main', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
            Delete Interview
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Are you sure you want to delete this interview? This action cannot be undone.
          </Typography>
          {interviewToDelete && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Interview Details:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Company:</strong> {interviewToDelete.companyName || 'Company Interview'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Role:</strong> {interviewToDelete.jobRole || 'Interview Practice'}
              </Typography>
              <Typography variant="body2">
                <strong>Completed:</strong> {new Date(interviewToDelete.completedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            onClick={() => setDeleteInterviewDialogOpen(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'uppercase',
              fontWeight: 600,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteInterview(interviewToDelete?.sessionId)}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ 
              textTransform: 'uppercase',
              fontWeight: 600,
              px: 3
            }}
          >
            Delete Interview
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  );
}

export default Profile;
