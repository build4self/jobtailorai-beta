import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { useLoading } from '../contexts/LoadingContext';
import ProfileDialog from './ProfileDialog';
import SettingsDialog from './SettingsDialog';
import LoadingScreen from './LoadingScreen';
import MobileResumeMockups from './MobileResumeMockups';
import MobileStats from './MobileStats';
import DemoVideo from './DemoVideo';
import Logger from '../utils/logger';
import analytics from '../utils/analytics';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  Stack,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  Psychology as PsychologyIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpOutlineIcon,
  ContactSupport as ContactSupportIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export function LandingPage() {
  const navigate = useNavigate();
  const { showLoading, hideLoading, isLoading: globalLoading, loadingMessage, loadingSubtitle } = useLoading();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [currentUser, setCurrentUser] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [faqsDialogOpen, setFaqsDialogOpen] = useState(false);
  const [contactUsDialogOpen, setContactUsDialogOpen] = useState(false);
  const [contactTitle, setContactTitle] = useState('');
  const [contactDescription, setContactDescription] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [authDataLoaded, setAuthDataLoaded] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false); // Keep for menu button state
  
  // Additional dialog states for footer links
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [helpCenterDialogOpen, setHelpCenterDialogOpen] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    loadUser();
  }, []);

  const getDisplayName = () => {
    // Try to get the first name from user attributes
    if (userAttributes?.given_name) {
      return userAttributes.given_name;
    }
    // Try other common attribute names
    if (userAttributes?.name) {
      return userAttributes.name.split(' ')[0]; // Get first part of full name
    }
    if (userAttributes?.['custom:firstName']) {
      return userAttributes['custom:firstName'];
    }
    // Fallback to username without email domain
    if (currentUser?.username) {
      return currentUser.username.split('@')[0];
    }
    return 'User';
  };

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setAuthDataLoaded(false);
      
      const user = await getCurrentUser();
      Logger.log('LandingPage - User loaded:', user);
      
      // Try to get user attributes which might contain the first name
      let attributes = null;
      try {
        const { fetchUserAttributes } = await import('aws-amplify/auth');
        attributes = await fetchUserAttributes();
        Logger.log('LandingPage - User attributes from fetchUserAttributes:', attributes);
      } catch (attrError) {
        Logger.log('LandingPage - Could not fetch user attributes:', attrError);
      }
      
      // Set both user and attributes together to prevent flickering
      setCurrentUser(user);
      setUserAttributes(attributes);
      setAuthDataLoaded(true);
      
    } catch (error) {
      Logger.log('LandingPage - No user found:', error.message);
      setCurrentUser(null);
      setUserAttributes(null);
      setAuthDataLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true); // For menu button loading state
      await signOut();
      
      // Show global loading screen with progress bar
      showLoading("Signing out...", "Thanks for using JobTailorAI!", 2500);
      
      // Reset state after loading completes
      setTimeout(() => {
        setCurrentUser(null);
        setUserAttributes(null);
        setProfileMenuAnchor(null);
        setIsSigningOut(false);
      }, 2500);
    } catch (error) {
      Logger.error('Error signing out:', error);
      setIsSigningOut(false);
      hideLoading();
    }
  };

  const handleGetStarted = () => {
    analytics.track('get_started_hero', { 
      authenticated: !!currentUser,
      source: 'hero_button'
    });
    
    if (currentUser) {
      showLoading("Loading workspace...", "Preparing your resume tools", 1500);
      setTimeout(() => {
        navigate('/app/upload');
      }, 1500);
    } else {
      navigate('/auth');
    }
  };

  const handleSignIn = () => {
    analytics.track('sign_in_header');
    navigate('/auth');
  };

  const handleContactSubmit = async () => {
    if (!contactTitle.trim() || !contactDescription.trim()) {
      return;
    }

    setIsSubmittingContact(true);
    
    try {
      // Simple contact form submission - you can integrate with your preferred service
      Logger.log('Contact form submitted:', {
        title: contactTitle,
        description: contactDescription,
        user: currentUser?.username || 'Anonymous'
      });
      
      // Close dialog and reset form
      setContactUsDialogOpen(false);
      setContactTitle('');
      setContactDescription('');
      
      // You could show a success message here
      alert('Thank you for your message! We\'ll get back to you soon.');
      
    } catch (error) {
      Logger.error('Error submitting contact form:', error);
      alert('There was an issue sending your message. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleStartTailoring = () => {
    analytics.track('start_tailoring_authenticated', {
      source: 'header_button'
    });
    
    showLoading("Starting resume tailoring...", "Get ready to tailor your career", 1500);
    setTimeout(() => {
      navigate('/app/upload');
    }, 1500);
  };

  const features = [
    {
      icon: <PsychologyIcon sx={{ fontSize: 40, color: '#0A66C2' }} />,
      title: 'AI-Powered Job Matching',
      description: 'Advanced AI analyzes job descriptions and tailors your resume to match specific requirements, keywords, and company culture.'
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#0A66C2' }} />,
      title: 'Real-Time Preview',
      description: 'See your tailored resume instantly with our live preview feature. Review formatting and content before downloading.'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: '#0A66C2' }} />,
      title: 'Side-by-Side Compare',
      description: 'Compare your original resume with the AI-tailored version to see exactly what improvements were made.'
    },
    {
      icon: <ShieldIcon sx={{ fontSize: 40, color: '#0A66C2' }} />,
      title: 'Multiple Download Formats',
      description: 'Download your tailored resume in Word (.docx) or text format, perfectly formatted for any application.'
    },
    {
      icon: <Box sx={{ 
        width: 40, 
        height: 40, 
        borderRadius: '50%', 
        bgcolor: '#0A66C2', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px'
      }}>AI</Box>,
      title: 'ATS Optimization',
      description: 'Ensure your resume passes Applicant Tracking Systems with keyword optimization and proper formatting.'
    },
    {
      icon: <Box sx={{ 
        width: 40, 
        height: 40, 
        borderRadius: '50%', 
        bgcolor: '#0A66C2', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px'
      }}>JT</Box>,
      title: 'Job-Specific Tailoring',
      description: 'Each resume is uniquely tailored for the specific job you\'re applying to, not generic templates.'
    },
    {
      icon: <WorkIcon sx={{ fontSize: 40, color: '#0A66C2' }} />,
      title: 'Mock Interview Room',
      description: 'Practice with AI-powered mock interviews tailored to your job. Get real-time questions and detailed feedback to ace your next interview.'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Show loading state while checking authentication or during global loading */}
      {isLoading || globalLoading ? (
        <LoadingScreen 
          message={globalLoading ? loadingMessage : "Loading JobTailorAI..."}
          subtitle={globalLoading ? loadingSubtitle : "Preparing your professional workspace"}
          showProgress={true}
        />
      ) : (
        <>
          {/* Navigation Header */}
          <AppBar position="static" elevation={0}>
            <Toolbar sx={{ py: { xs: 0.5, md: 1 }, px: { xs: 2, md: 3 } }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
                onClick={() => navigate('/')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="h5" component="div" sx={{ 
                    fontWeight: 800,
                    fontSize: { xs: '1.3rem', md: '1.6rem' },
                    background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.5px'
                  }}>
                    JobTailor
                  </Typography>
                  <Box sx={{
                    bgcolor: '#0A66C2',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: { xs: '0.8rem', md: '1rem' },
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    AI
                  </Box>
                </Box>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
                {(() => {
                  if (isLoading) {
                    return <CircularProgress size={24} />;
                  } else if (currentUser) {
                    return (
                      <>
                        <Button 
                          variant="contained" 
                          onClick={handleStartTailoring}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                            color: 'white',
                            fontWeight: 600,
                            px: { xs: 2, md: 3 },
                            fontSize: { xs: '0.8rem', md: '0.9rem' },
                            mr: { xs: 1, md: 2 },
                            '&:hover': {
                              background: 'linear-gradient(45deg, #004182 30%, #0A66C2 90%)',
                            }
                          }}
                        >
                          {isMobile ? 'Tailor' : 'Start Tailoring'}
                        </Button>
                        {!isSmallMobile && (
                          <Typography variant="body2" sx={{ 
                            color: 'text.primary',
                            display: { xs: 'none', sm: 'block' },
                            fontSize: { xs: '1rem', md: '1.1rem' },
                            fontWeight: 'bold'
                          }}>
                            {(currentUser && authDataLoaded) ? `Welcome, ${getDisplayName()}` : ''}
                          </Typography>
                        )}
                        <IconButton
                          onClick={(e) => {
                            Logger.log('Avatar clicked!', e.currentTarget);
                            setProfileMenuAnchor(e.currentTarget);
                          }}
                          sx={{ 
                            p: 0,
                            border: '2px solid',
                            borderColor: 'primary.main',
                            '&:hover': {
                              borderColor: 'text.secondary',
                            }
                          }}
                        >
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main', 
                              width: { xs: 32, md: 40 }, 
                              height: { xs: 32, md: 40 },
                              fontSize: { xs: '0.9rem', md: '1rem' },
                              fontWeight: 600
                            }}
                          >
                            {(currentUser && authDataLoaded) ? getDisplayName().charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                        </IconButton>
                    
                    {/* Profile Menu */}
                    <Menu
                      anchorEl={profileMenuAnchor}
                      open={Boolean(profileMenuAnchor)}
                      onClose={() => {
                        Logger.log('Menu closing');
                        setProfileMenuAnchor(null);
                      }}
                      PaperProps={{
                        sx: {
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          mt: 1,
                          minWidth: 200
                        }
                      }}
                    >
                      <MenuItem onClick={() => {
                        setProfileMenuAnchor(null);
                        showLoading("Loading profile...", "Accessing your account settings", 1200);
                        setTimeout(() => {
                          navigate('/app/profile');
                        }, 1200);
                      }}>
                        <ListItemIcon>
                          <PersonIcon sx={{ color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="Profile" />
                      </MenuItem>
                      
                      <MenuItem onClick={() => {
                        setProfileMenuAnchor(null);
                        setSettingsDialogOpen(true);
                      }}>
                        <ListItemIcon>
                          <SettingsIcon sx={{ color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="Settings & Privacy" />
                      </MenuItem>
                      
                      <MenuItem onClick={() => {
                        setProfileMenuAnchor(null);
                        setFaqsDialogOpen(true);
                      }}>
                        <ListItemIcon>
                          <HelpOutlineIcon sx={{ color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="FAQs & Help" />
                      </MenuItem>
                      
                      <MenuItem onClick={() => {
                        setProfileMenuAnchor(null);
                        setContactUsDialogOpen(true);
                      }}>
                        <ListItemIcon>
                          <ContactSupportIcon sx={{ color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="Contact Us" />
                      </MenuItem>
                      
                      <MenuItem 
                        onClick={() => {
                          Logger.log('Sign Out clicked');
                          // Don't close menu immediately so user can see loading state
                          handleSignOut();
                        }}
                        disabled={isSigningOut}
                      >
                        <ListItemIcon>
                          {isSigningOut ? (
                            <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                          ) : (
                            <LogoutIcon sx={{ color: 'primary.main' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText primary={isSigningOut ? "Signing out..." : "Sign Out"} />
                      </MenuItem>
                    </Menu>
                  </>
                );
              } else {
                return (
                  <>
                    <Button 
                      variant="outlined"
                      onClick={handleSignIn}
                      size={isMobile ? "small" : "medium"}
                      sx={{ 
                        color: '#0A66C2',
                        borderColor: '#0A66C2',
                        fontSize: { xs: '0.85rem', md: '0.95rem' },
                        fontWeight: 600,
                        px: { xs: 2.5, md: 3.5 },
                        py: { xs: 0.8, md: 1 },
                        borderWidth: '2px',
                        '&:hover': { 
                          backgroundColor: '#0A66C2',
                          color: 'white',
                          borderColor: '#0A66C2',
                          borderWidth: '2px'
                        }
                      }}
                    >
                      Sign In
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleGetStarted}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                        fontSize: { xs: '0.8rem', md: '0.9rem' },
                        px: { xs: 2, md: 3 },
                        '&:hover': {
                          background: 'linear-gradient(45deg, #004182 30%, #0A66C2 90%)',
                        }
                      }}
                    >
                      {isMobile ? 'Get Started' : 'Get Started Free'}
                    </Button>
                  </>
                );
              }
            })()}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #0A1929 0%, #1A2332 25%, #0A66C2 50%, #1976D2 75%, #0D47A1 100%)',
        py: { xs: 3, md: 4 },
        minHeight: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 80px)' },
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Enhanced Modern Background */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 0
        }}>
          {/* Animated Gradient Overlay */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(45deg, rgba(10, 102, 194, 0.1) 0%, rgba(25, 118, 210, 0.15) 25%, rgba(13, 71, 161, 0.1) 50%, rgba(10, 102, 194, 0.05) 75%, rgba(25, 118, 210, 0.1) 100%)',
            animation: 'gradientShift 8s ease-in-out infinite',
            '@keyframes gradientShift': {
              '0%, 100%': { 
                background: 'linear-gradient(45deg, rgba(10, 102, 194, 0.1) 0%, rgba(25, 118, 210, 0.15) 25%, rgba(13, 71, 161, 0.1) 50%, rgba(10, 102, 194, 0.05) 75%, rgba(25, 118, 210, 0.1) 100%)'
              },
              '50%': { 
                background: 'linear-gradient(225deg, rgba(25, 118, 210, 0.15) 0%, rgba(13, 71, 161, 0.1) 25%, rgba(10, 102, 194, 0.1) 50%, rgba(25, 118, 210, 0.05) 75%, rgba(13, 71, 161, 0.1) 100%)'
              }
            }
          }} />

          {/* Floating Geometric Shapes */}
          <Box sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(10, 102, 194, 0.2) 100%)',
            animation: 'floatUpDown 6s ease-in-out infinite',
            '@keyframes floatUpDown': {
              '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
              '50%': { transform: 'translateY(-20px) rotate(180deg)' }
            }
          }} />
          
          <Box sx={{
            position: 'absolute',
            top: '60%',
            right: '8%',
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.08) 0%, rgba(25, 118, 210, 0.15) 100%)',
            borderRadius: '8px',
            animation: 'floatUpDown 8s ease-in-out infinite reverse',
            animationDelay: '2s'
          }} />

          <Box sx={{
            position: 'absolute',
            top: '25%',
            right: '15%',
            width: '80px',
            height: '80px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            animation: 'slowRotate 12s linear infinite',
            '@keyframes slowRotate': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }} />

          <Box sx={{
            position: 'absolute',
            bottom: '20%',
            left: '10%',
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, rgba(13, 71, 161, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            animation: 'floatUpDown 7s ease-in-out infinite',
            animationDelay: '1s'
          }} />

          {/* Subtle Grid Pattern */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            opacity: 0.3
          }} />

          {/* Subtle JobTailorAI Watermark */}
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: { xs: '120px', md: '200px' },
            fontWeight: 900,
            color: 'rgba(255, 255, 255, 0.02)',
            userSelect: 'none',
            pointerEvents: 'none',
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '-0.05em'
          }}>
            JobTailorAI
          </Box>

          {/* Radial Gradient Spotlight */}
          <Box sx={{
            position: 'absolute',
            top: '30%',
            left: '20%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'pulse 4s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
              '50%': { opacity: 0.6, transform: 'scale(1.1)' }
            }
          }} />
        </Box>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={{ xs: 2, md: 4 }} alignItems="center" sx={{ minHeight: '100%' }}>
            <Grid item xs={12} md={5}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Enhanced Hero Badge */}
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50px',
                  px: 3,
                  py: 1,
                  mb: 3,
                  backdropFilter: 'blur(15px)',
                  textAlign: { xs: 'center', md: 'left' },
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  animation: 'badgeGlow 3s ease-in-out infinite',
                  '@keyframes badgeGlow': {
                    '0%, 100%': { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' },
                    '50%': { boxShadow: '0 8px 32px rgba(255, 255, 255, 0.2)' }
                  }
                }}>
                  <Box sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#4CAF50',
                    mr: 1.5,
                    animation: 'pulse 2s infinite'
                  }} />
                  <Typography variant="body2" sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    {currentUser ? '🎯 Ready for your next opportunity' : '🚀 AI-Powered • ATS-Tailored • Professional'}
                  </Typography>
                </Box>

                <Typography variant="h1" sx={{ 
                  fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.8rem', lg: '3.2rem' },
                  fontWeight: 900,
                  color: '#ffffff',
                  mb: { xs: 2, md: 3 },
                  lineHeight: { xs: 1.1, md: 1.05 },
                  textAlign: { xs: 'center', md: 'left' },
                  maxWidth: { xs: '100%', md: '95%', lg: '90%' },
                  letterSpacing: '-0.03em',
                  textShadow: '0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {(currentUser && authDataLoaded)
                    ? `Welcome back, ${getDisplayName()}!`
                    : 'Transform Your Career with AI-Powered Resumes'
                  }
                </Typography>
                
                <Typography variant="h5" sx={{ 
                  fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem', lg: '1.25rem' },
                  color: '#ffffff',
                  mb: { xs: 4, md: 5 }, 
                  fontWeight: 400,
                  lineHeight: { xs: 1.5, md: 1.4 },
                  textAlign: { xs: 'center', md: 'left' },
                  maxWidth: { xs: '100%', md: '90%', lg: '85%' },
                  letterSpacing: '0.005em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {currentUser
                    ? 'Ready to tailor another resume? Let\'s get started with your next career opportunity.'
                    : 'Create professional, ATS-tailored resumes in seconds. Land 3x more interviews with cutting-edge AI technology.'
                  }
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: { xs: 'center', md: 'flex-start' }, 
                  mb: { xs: 3, md: 4 }
                }}>
                  <Button 
                    variant="contained" 
                    size={isMobile ? "large" : "large"}
                    onClick={handleGetStarted}
                    endIcon={<PlayArrowIcon />}
                    sx={{
                      py: { xs: 2, md: 2.5 },
                      px: { xs: 4, md: 6 },
                      fontSize: { xs: '1rem', md: '1.2rem' },
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      color: '#0A66C2',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      borderRadius: '50px',
                      boxShadow: '0 12px 40px rgba(255, 255, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                      backdropFilter: 'blur(15px)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                        transition: 'left 0.6s ease-in-out'
                      },
                      '&:hover': {
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        boxShadow: '0 16px 50px rgba(255, 255, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                        transform: 'translateY(-4px) scale(1.03)',
                        border: '2px solid rgba(255, 255, 255, 0.6)',
                        '&::before': {
                          left: '100%'
                        }
                      },
                      '&:active': {
                        transform: 'translateY(-2px) scale(1.01)'
                      }
                    }}
                  >
                    {currentUser ? 'Continue Tailoring' : 'Start Tailoring Now'}
                  </Button>
                </Box>
              </motion.div>
            </Grid>
            
            {/* Demo Video + Stats - Side by Side */}
            <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <DemoVideo 
                  videoUrl="https://jobtailor-assets.s3.amazonaws.com/videos/JobTailorAI-Career-Demo-HQ.mp4"
                  autoPlay={false}
                  showControls={true}
                />
              </motion.div>
              
              {/* Stats directly under video */}
              <Box sx={{ 
                display: { xs: 'none', md: 'flex' }, 
                justifyContent: 'center', 
                gap: { md: 3, lg: 4 }, 
                mt: 3,
                flexWrap: 'wrap'
              }}>
                {[
                  { number: '3x', label: 'More Interviews' },
                  { number: '95%', label: 'ATS Compatible' },
                  { number: '30-45s', label: 'Processing Time' }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1 + index * 0.2 }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ 
                        fontSize: { md: '1.8rem', lg: '2rem' },
                        color: '#ffffff', 
                        fontWeight: 'bold',
                        mb: 0.5,
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        {stat.number}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: { md: '11px', lg: '12px' },
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </Grid>
            
          </Grid>
          
          {/* Mobile Stats Only - Below Hero */}
          <Box sx={{ mt: { xs: 4 }, display: { xs: 'flex', md: 'none' }, justifyContent: 'center' }}>
            <MobileStats />
          </Box>
        </Container>
      </Box>

      {/* Enhanced Features Section */}
      <Box sx={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 50%, #f1f3f4 100%)',
        py: { xs: 10, md: 15 }
      }}>
        <Container maxWidth="lg" id="features-section">
          {/* Section Header */}
          <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
            <Typography variant="overline" sx={{
              color: '#0A66C2',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              mb: 2,
              display: 'block'
            }}>
              FEATURES
            </Typography>
            <Typography variant="h2" sx={{ 
              fontSize: { xs: '2.2rem', md: '3rem' },
              mb: 3,
              fontWeight: 900,
              background: 'linear-gradient(135deg, #0A66C2 0%, #378FE9 50%, #4CAF50 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em'
            }}>
              Why Choose JobTailorAI?
            </Typography>
            <Typography variant="h6" sx={{
              color: '#666',
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6,
              fontWeight: 400
            }}>
              Discover the powerful features that make JobTailorAI the ultimate resume optimization platform
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 4, md: 5 }} justifyContent="center">
            {features.map((feature, index) => {
              // 2-3-2 layout: first 2 items get md={6}, next 3 get md={4}, last 2 get md={6}
              const getMdSize = () => {
                if (index < 2 || index >= 5) return 6; // First 2 and last 2
                return 4; // Middle 3
              };
              
              return (
              <Grid item xs={12} sm={6} md={getMdSize()} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card sx={{ 
                    height: '100%', 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      transform: 'translateY(-8px) scale(1.02)', 
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(10, 102, 194, 0.2)'
                    } 
                  }}>
                    <CardContent sx={{ p: { xs: 4, md: 5 } }}>
                      <Box sx={{ 
                        mb: 3,
                        '& > div': {
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.1)'
                          }
                        }
                      }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h5" sx={{ 
                        mb: 2, 
                        fontWeight: 700,
                        fontSize: { xs: '1.2rem', md: '1.4rem' },
                        color: '#333'
                      }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        color: '#666', 
                        lineHeight: 1.7,
                        fontSize: { xs: '0.95rem', md: '1rem' }
                      }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* Success Metrics Section */}
      <Box sx={{ 
        bgcolor: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
        background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
        py: { xs: 8, md: 12 },
        color: 'white'
      }}>
        <Container maxWidth="lg">
          <Typography variant="h2" align="center" sx={{ 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            mb: { xs: 2, md: 3 },
            fontWeight: 700,
            color: 'white'
          }}>
            Trusted by Job Seekers Worldwide
          </Typography>
          <Typography variant="h6" align="center" sx={{ 
            fontSize: { xs: '1rem', md: '1.25rem' },
            mb: { xs: 6, md: 8 },
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '800px',
            mx: 'auto',
            px: { xs: 2, md: 0 }
          }}>
            Join thousands of successful job seekers who've landed their dream roles
          </Typography>

          <Grid container spacing={{ xs: 4, md: 6 }} justifyContent="center">
            {/* Active Users */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ 
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 700,
                  color: 'white',
                  mb: 1
                }}>
                  5,000+
                </Typography>
                <Typography variant="h6" sx={{ 
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  Active Users
                </Typography>
              </Box>
            </Grid>

            {/* Resumes Tailored */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ 
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 700,
                  color: 'white',
                  mb: 1
                }}>
                  12,500+
                </Typography>
                <Typography variant="h6" sx={{ 
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  Resumes Tailored
                </Typography>
              </Box>
            </Grid>

            {/* Mock Interviews */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ 
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 700,
                  color: 'white',
                  mb: 1
                }}>
                  3,200+
                </Typography>
                <Typography variant="h6" sx={{ 
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  Mock Interviews
                </Typography>
              </Box>
            </Grid>

            {/* Success Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ 
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 700,
                  color: 'white',
                  mb: 1
                }}>
                  94%
                </Typography>
                <Typography variant="h6" sx={{ 
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  Success Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }} id="how-it-works-section">
        <Container maxWidth="lg">
          <Typography variant="h2" align="center" sx={{ 
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            mb: { xs: 2, md: 3 },
            fontWeight: 700,
            color: '#0A66C2'
          }}>
            How JobTailorAI Works
          </Typography>
          <Typography variant="h6" align="center" sx={{ 
            fontSize: { xs: '1rem', md: '1.25rem' },
            mb: { xs: 6, md: 8 },
            color: '#666666',
            maxWidth: '600px',
            mx: 'auto',
            px: { xs: 2, md: 0 }
          }}>
            Transform your resume in three simple steps with our advanced AI technology
          </Typography>

          <Grid container spacing={{ xs: 4, md: 6 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar sx={{ 
                  width: { xs: 60, md: 80 }, 
                  height: { xs: 60, md: 80 }, 
                  bgcolor: '#0A66C2', 
                  mx: 'auto', 
                  mb: { xs: 2, md: 3 },
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 'bold'
                }}>
                  1
                </Avatar>
                <Typography variant="h5" sx={{ 
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  mb: { xs: 1.5, md: 2 }, 
                  fontWeight: 600 
                }}>
                  Upload Your Resume
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  color: '#666666', 
                  lineHeight: 1.6, 
                  mb: { xs: 2, md: 3 },
                  px: { xs: 1, md: 0 }
                }}>
                  Upload your existing resume in PDF, Word, or text format. 
                  Our AI instantly analyzes your experience and skills.
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 1, 
                  flexWrap: 'wrap' 
                }}>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#E3F2FD', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#0A66C2', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    PDF
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#E3F2FD', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#0A66C2', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Word
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#E3F2FD', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#0A66C2', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Text
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar sx={{ 
                  width: { xs: 60, md: 80 }, 
                  height: { xs: 60, md: 80 }, 
                  bgcolor: '#0A66C2', 
                  mx: 'auto', 
                  mb: { xs: 2, md: 3 },
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 'bold'
                }}>
                  2
                </Avatar>
                <Typography variant="h5" sx={{ 
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  mb: { xs: 1.5, md: 2 }, 
                  fontWeight: 600 
                }}>
                  Add Job Description
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  color: '#666666', 
                  lineHeight: 1.6, 
                  mb: { xs: 2, md: 3 },
                  px: { xs: 1, md: 0 }
                }}>
                  Paste the job description you're applying for. Our AI analyzes 
                  requirements, keywords, and company culture.
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 1, 
                  flexWrap: 'wrap' 
                }}>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#E8F5E8', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#2E7D32', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Keywords
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#E8F5E8', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#2E7D32', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Skills
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#E8F5E8', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#2E7D32', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Requirements
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar sx={{ 
                  width: { xs: 60, md: 80 }, 
                  height: { xs: 60, md: 80 }, 
                  bgcolor: '#0A66C2', 
                  mx: 'auto', 
                  mb: { xs: 2, md: 3 },
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 'bold'
                }}>
                  3
                </Avatar>
                <Typography variant="h5" sx={{ 
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  mb: { xs: 1.5, md: 2 }, 
                  fontWeight: 600 
                }}>
                  Preview, Compare & Download
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  color: '#666666', 
                  lineHeight: 1.6, 
                  mb: { xs: 2, md: 3 },
                  px: { xs: 1, md: 0 }
                }}>
                  Preview your tailored resume, compare with the original, 
                  and download in your preferred format.
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 1, 
                  flexWrap: 'wrap' 
                }}>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#FFF3E0', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#F57C00', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Preview
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#FFF3E0', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#F57C00', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Compare
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    bgcolor: '#FFF3E0', 
                    px: { xs: 1.5, md: 2 }, 
                    py: 0.5, 
                    borderRadius: 1, 
                    color: '#F57C00', 
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                  }}>
                    Download
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }} id="testimonials-section">
        <Typography variant="h2" align="center" sx={{ 
          fontSize: { xs: '1.8rem', md: '2.5rem' },
          mb: { xs: 6, md: 8 },
          fontWeight: 700,
          background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          What Our Users Say
        </Typography>

        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', p: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 2, md: 0 } }}>
                <Typography variant="body1" sx={{ 
                  mb: { xs: 2, md: 3 }, 
                  fontStyle: 'italic', 
                  lineHeight: 1.6,
                  fontSize: { xs: '0.9rem', md: '1rem' }
                }}>
                  "JobTailorAI helped me land my dream job at a Fortune 500 company. 
                  The AI suggestions were spot-on and made my resume stand out."
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#0A66C2', mr: 2, width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 } }}>S</Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.9rem', md: '1rem' }
                    }}>
                      Sarah Johnson
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#666666',
                      fontSize: { xs: '0.75rem', md: '0.8rem' }
                    }}>
                      Software Engineer at Microsoft
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', p: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 2, md: 0 } }}>
                <Typography variant="body1" sx={{ 
                  mb: { xs: 2, md: 3 }, 
                  fontStyle: 'italic', 
                  lineHeight: 1.6,
                  fontSize: { xs: '0.9rem', md: '1rem' }
                }}>
                  "I was struggling to get interviews until I used this tool. 
                  Now I'm getting callbacks from top companies. Highly recommended!"
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#0A66C2', mr: 2, width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 } }}>M</Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.9rem', md: '1rem' }
                    }}>
                      Michael Chen
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#666666',
                      fontSize: { xs: '0.75rem', md: '0.8rem' }
                    }}>
                      Product Manager at Google
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', p: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 2, md: 0 } }}>
                <Typography variant="body1" sx={{ 
                  mb: { xs: 2, md: 3 }, 
                  fontStyle: 'italic', 
                  lineHeight: 1.6,
                  fontSize: { xs: '0.9rem', md: '1rem' }
                }}>
                  "The ATS enhancement feature is incredible. My resume now passes 
                  through applicant tracking systems with ease."
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#0A66C2', mr: 2, width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 } }}>E</Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.9rem', md: '1rem' }
                    }}>
                      Emily Rodriguez
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#666666',
                      fontSize: { xs: '0.75rem', md: '0.8rem' }
                    }}>
                      Marketing Director at Amazon
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Enhanced CTA Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #0A66C2 0%, #378FE9 50%, #4CAF50 100%)', 
        py: { xs: 8, md: 12 },
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          opacity: 0.3
        }} />
        
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" sx={{
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              mb: 2,
              display: 'block'
            }}>
              READY TO GET STARTED?
            </Typography>
            
            <Typography variant="h2" sx={{ 
              fontSize: { xs: '2.2rem', md: '3rem' },
              mb: { xs: 2, md: 3 },
              fontWeight: 900,
              px: { xs: 2, md: 0 },
              letterSpacing: '-0.02em',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Ready to Land Your Dream Job?
            </Typography>
            
            <Typography variant="h5" sx={{ 
              fontSize: { xs: '1.1rem', md: '1.4rem' },
              mb: { xs: 5, md: 7 },
              opacity: 0.9,
              fontWeight: 400,
              px: { xs: 2, md: 0 },
              lineHeight: 1.5,
              maxWidth: 600,
              mx: 'auto'
            }}>
              Join thousands of professionals who have successfully transformed their careers with AI-powered resumes
            </Typography>
            
            <Button 
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              className="enhanced-button"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                color: '#0A66C2',
                px: { xs: 5, md: 8 },
                py: { xs: 2, md: 2.5 },
                fontSize: { xs: '1.1rem', md: '1.3rem' },
                fontWeight: 700,
                borderRadius: '50px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 1)',
                  transform: 'translateY(-4px) scale(1.05)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
                  border: '2px solid rgba(255, 255, 255, 0.5)'
                },
                '&:active': {
                  transform: 'translateY(-2px) scale(1.02)'
                }
              }}
            >
              {currentUser ? 'Continue Tailoring' : 'Get Started Free'}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a1a1a', color: 'white', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 3, md: 4 }}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 900, 
                    color: 'white',
                    fontSize: { xs: '1.4rem', md: '1.8rem' },
                    letterSpacing: '-0.5px'
                  }}>
                    JobTailor
                  </Typography>
                  <Box sx={{
                    bgcolor: 'white',
                    color: '#0A66C2',
                    px: 1.5,
                    py: 0.8,
                    borderRadius: 1.5,
                    fontSize: { xs: '1rem', md: '1.2rem' },
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    AI
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ 
                color: '#cccccc', 
                lineHeight: 1.6, 
                mb: { xs: 2, md: 3 },
                fontSize: { xs: '0.85rem', md: '0.9rem' }
              }}>
                Powered by advanced AI technology to help professionals create 
                compelling resumes that get noticed by employers and pass ATS systems.
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ 
                mb: { xs: 2, md: 3 }, 
                fontWeight: 600, 
                color: 'white',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}>
                Product
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                <Link 
                  component="button"
                  onClick={() => document.querySelector('#features-section')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Features
                </Link>
                <Link 
                  component="button"
                  onClick={() => document.querySelector('#how-it-works-section')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  How it Works
                </Link>
                <Link 
                  component="button"
                  onClick={() => document.querySelector('#testimonials-section')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Testimonials
                </Link>
                <Link 
                  component="button"
                  onClick={handleGetStarted}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Try Now
                </Link>
              </Box>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ 
                mb: { xs: 2, md: 3 }, 
                fontWeight: 600, 
                color: 'white',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}>
                Support
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                <Link 
                  component="button"
                  onClick={() => setHelpCenterDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Help Center
                </Link>
                <Link 
                  component="button"
                  onClick={() => setContactUsDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Contact Us
                </Link>
                <Link 
                  component="button"
                  onClick={() => setFaqsDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  FAQ
                </Link>
                <Link 
                  component="button"
                  onClick={() => setContactUsDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Email Support
                </Link>
              </Box>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ 
                mb: { xs: 2, md: 3 }, 
                fontWeight: 600, 
                color: 'white',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}>
                Legal
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                <Link 
                  component="button"
                  onClick={() => setPrivacyDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Privacy Policy
                </Link>
                <Link 
                  component="button"
                  onClick={() => setTermsDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Terms of Service
                </Link>
                <Link 
                  component="button"
                  onClick={() => setCookieDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Cookie Policy
                </Link>
                <Link 
                  component="button"
                  onClick={() => setContactUsDialogOpen(true)}
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none', 
                    textAlign: 'left',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Legal Inquiries
                </Link>
              </Box>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="h6" sx={{ 
                mb: { xs: 2, md: 3 }, 
                fontWeight: 600, 
                color: 'white',
                fontSize: { xs: '1rem', md: '1.25rem' }
              }}>
                Connect
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.5, md: 1 } }}>
                <Link 
                  href="https://linkedin.com/company/resumeoptimizer" 
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  LinkedIn
                </Link>
                <Link 
                  href="https://twitter.com/resumeoptimizer" 
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Twitter
                </Link>
                <Link 
                  href="https://blog.resumeoptimizer.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    color: '#cccccc', 
                    textDecoration: 'none',
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    '&:hover': { color: '#0A66C2' } 
                  }}
                >
                  Blog
                </Link>

              </Box>
            </Grid>
          </Grid>

          <Box sx={{ 
            borderTop: '1px solid #333333', 
            mt: { xs: 4, md: 6 }, 
            pt: { xs: 3, md: 4 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="body2" sx={{ 
              color: '#cccccc',
              fontSize: { xs: '0.8rem', md: '0.9rem' }
            }}>
              © {new Date().getFullYear()} JobTailorAI. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 } }}>
              <Link 
                component="button"
                onClick={() => setPrivacyDialogOpen(true)}
                sx={{ 
                  color: '#cccccc', 
                  textDecoration: 'none', 
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  '&:hover': { color: '#0A66C2' } 
                }}
              >
                Privacy
              </Link>
              <Link 
                component="button"
                onClick={() => setTermsDialogOpen(true)}
                sx={{ 
                  color: '#cccccc', 
                  textDecoration: 'none', 
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  '&:hover': { color: '#0A66C2' } 
                }}
              >
                Terms
              </Link>
              <Link 
                component="button"
                onClick={() => setContactUsDialogOpen(true)}
                sx={{ 
                  color: '#cccccc', 
                  textDecoration: 'none', 
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  '&:hover': { color: '#0A66C2' } 
                }}
              >
                Contact
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        onSettingsChange={() => {}} // Empty callback since LandingPage doesn't need to track settings
      />

      {/* FAQs Dialog */}
      <Dialog
        open={faqsDialogOpen}
        onClose={() => setFaqsDialogOpen(false)}
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
          borderBottom: '1px solid #e0e0e0'
        }}>
          <HelpOutlineIcon sx={{ mr: 1 }} />
          Frequently Asked Questions
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {currentUser 
                ? "Find answers to common questions about JobTailorAI features and functionality."
                : "Find answers to common questions about JobTailorAI and how our AI-powered resume tailoring works."
              }
            </Typography>

            {currentUser ? (
              // Comprehensive FAQs for signed-in users
              <>
                {/* Getting Started & Basic Usage */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  🚀 Getting Started & Basic Usage
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How does JobTailorAI work?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Upload your resume, paste the job description you're applying for, and our AI will tailor your resume to better match the job requirements. The AI analyzes keywords, skills, and requirements to enhance your resume's relevance and ATS compatibility.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What file formats are supported for resume upload?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: We support PDF (.pdf), Microsoft Word (.docx), and plain text (.txt) files. Maximum file size is 5MB. For best results, use Word or PDF formats as they preserve formatting better.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Can I use job URLs instead of copying job descriptions?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! You can paste job URLs from major job boards (LinkedIn, Indeed, etc.) and our system will automatically extract the job details. If extraction fails, you can always fall back to manual input.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How long does the tailoring process take?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Most resumes are tailored within 30-60 seconds. Complex resumes or cover letter generation may take up to 2 minutes. You'll see real-time progress updates during processing.
                  </Typography>
                </Box>

                {/* Output Formats & Downloads */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  📄 Output Formats & Downloads
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What formats can I download my tailored resume in?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: You can select your preferred output format on the job details page: PDF (best for applications), Word (.docx, best for editing), or Text (for ATS-only systems). You can change this for each tailoring session.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Can I generate cover letters too?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! Enable the "Generate Cover Letter" toggle on the job details page. You'll need to provide both the job title and company name. The cover letter will be tailored to match the job requirements and your resume content.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Why can't I see a preview of my tailored resume?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Preview is available for text format only. For Word and PDF formats, you'll need to download the file to view it. This ensures proper formatting and compatibility with different applications.
                  </Typography>
                </Box>

                {/* Advanced Features */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  ⚡ Advanced Features
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How do I save resumes to my profile?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: After tailoring a resume, click "Save to Profile" on the results page. You can save up to 50 resumes with custom titles and descriptions. Access them anytime from your Profile page.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What is the ATS score and how is it calculated?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: The ATS score is our proprietary metric that evaluates keyword matching, formatting, skills alignment, and overall ATS compatibility. <strong>Important:</strong> This is an in-house developed score for guidance purposes only and doesn't guarantee performance with any specific ATS system.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Can I compare my original and tailored resumes?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! Use the "Compare Versions" feature on the results page to see a side-by-side comparison. This helps you understand what changes were made and why.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Can I edit the tailored resume before downloading?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Currently, editing is not available within the platform. Download the Word format for easy editing in Microsoft Word or similar applications. We recommend reviewing and personalizing the content before submitting.
                  </Typography>
                </Box>

                {/* Account & Profile Management */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  👤 Account & Profile Management
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How do I manage my saved resumes?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Go to your Profile page to view, download, or delete saved resumes. You can organize them with custom titles and descriptions. The 50-resume limit helps keep your profile organized.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Can I change my account settings?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! Access Settings from your profile menu to update your default output format, resume template preferences, and other personalization options.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How do I delete my account and data?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Contact our support team to request account deletion. All your data, including saved resumes, will be permanently removed within 30 days as per our privacy policy.
                  </Typography>
                </Box>

                {/* Troubleshooting */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  🔧 Troubleshooting
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What should I do if my resume upload fails?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Ensure your file is under 5MB and in a supported format (PDF, Word, or text). Try refreshing the page and uploading again. If issues persist, try converting to a different format or contact support.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Why did job URL extraction fail?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Some job boards have restrictions or the posting may be private/expired. When extraction fails, you can manually enter the job title, company name, and description in the provided fields.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What if the tailoring process gets stuck or fails?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: You can cancel the process using the "Cancel" button and try again. If problems persist, try with a simpler resume format or contact support with details about your file type and job description.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Why is my download not working?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Check your browser's download settings and popup blockers. Try right-clicking the download button and selecting "Save link as". Clear your browser cache if issues persist.
                  </Typography>
                </Box>

                {/* Privacy & Security */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  🔒 Privacy & Security
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Is my resume data secure?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! We use AWS enterprise-grade security with AES-256 encryption for data at rest and TLS 1.3 for data in transit. Your resumes are processed in secure, isolated environments and never shared with unauthorized parties.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How long are my resumes stored?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Saved resumes are stored until you delete them. Temporary processing files are automatically purged within 24 hours. You have complete control over your data and can request deletion at any time.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Do you share my data with third parties?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: No, we never share your personal information or resume content with third parties. We only use your data to provide our tailoring services and improve our AI algorithms.
                  </Typography>
                </Box>

                {/* Best Practices */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  💡 Best Practices & Tips
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How can I get the best results from JobTailorAI?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Use complete job descriptions, ensure your original resume is well-formatted, provide accurate company names for cover letters, and review the tailored content before submitting. Different job types may require different approaches.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Should I tailor my resume for every job application?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! Each job has unique requirements. Tailoring increases your chances of passing ATS systems and catching recruiters' attention. Save different versions for different job types or industries.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What should I do after downloading my tailored resume?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Review the content for accuracy, personalize any generic sections, ensure contact information is correct, and save a copy for your records. Consider creating a cover letter if you haven't already.
                  </Typography>
                </Box>

                {/* Billing & Limits */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  💳 Usage & Limits
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Are there limits on how many resumes I can tailor?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: You can tailor unlimited resumes. However, you can save up to 50 resumes in your profile. Delete old ones to make room for new tailored versions.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Is JobTailorAI free to use?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes! JobTailorAI is currently free to use with full access to all features including resume tailoring, cover letter generation, ATS scoring, and profile management.
                  </Typography>
                </Box>

                {/* Contact */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  📞 Need More Help?
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                    Can't find what you're looking for? Our support team is here to help! Use the "Contact Us" option in your profile menu to send us a message. We typically respond within 24 hours during business days.
                  </Typography>
                </Box>
              </>
            ) : (
              // Basic FAQs for non-signed-in users
              <>
                {/* Getting Started */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  🚀 Getting Started
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What is JobTailorAI?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: JobTailorAI is an AI-powered platform that automatically tailors your resume to match specific job descriptions. Our advanced algorithms analyze job requirements and optimize your resume content, keywords, and formatting to increase your chances of getting noticed by employers and passing ATS systems.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: How does the AI tailoring process work?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Simply upload your resume and provide the job description you're targeting. Our AI analyzes both documents, identifies key requirements and skills, then intelligently modifies your resume to better align with the job posting while maintaining your authentic experience and qualifications.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Do I need to create an account to use JobTailorAI?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Yes, creating a free account allows you to access our tailoring services, save your resumes, and track your applications. The registration process is quick and secure.
                  </Typography>
                </Box>

                {/* Features & Benefits */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  ✨ Features & Benefits
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What makes JobTailorAI different from other resume tools?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Unlike generic resume builders, JobTailorAI creates job-specific versions of your resume. Each tailored resume is uniquely optimized for the particular role you're applying to, not just a one-size-fits-all template.
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: What file formats are supported?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: We accept PDF, Microsoft Word (.docx), and text files for upload. Your tailored resume can be downloaded in professional Word format for easy editing and submission.
                  </Typography>
                </Box>

                {/* Privacy & Security */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  🔒 Privacy & Security
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Q: Is my personal information secure?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                    A: Absolutely. We use enterprise-grade security measures and never share your personal information with third parties. Your resume content is processed securely and you maintain full control over your data.
                  </Typography>
                </Box>

                {/* Contact */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
                  📞 Need More Help?
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                    Ready to get started? Create your free account and experience the power of AI-tailored resumes. For additional questions, our support team is here to help!
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setFaqsDialogOpen(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
              px: 4
            }}
          >
            Got It!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Us Dialog */}
      <Dialog
        open={contactUsDialogOpen}
        onClose={() => setContactUsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0'
        }}>
          <ContactSupportIcon sx={{ mr: 1 }} />
          Contact Us
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Have a question, suggestion, or need help with JobTailorAI? We'd love to hear from you! 
            Fill out the form below and we'll get back to you as soon as possible.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Subject *
            </Typography>
            <TextField
              fullWidth
              placeholder="Brief description of your inquiry"
              value={contactTitle}
              onChange={(e) => setContactTitle(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Message *
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Please provide details about your question or feedback..."
              value={contactDescription}
              onChange={(e) => setContactDescription(e.target.value)}
              variant="outlined"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            * Required fields. We typically respond within 24 hours during business days.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button 
            onClick={() => {
              setContactUsDialogOpen(false);
              setContactTitle('');
              setContactDescription('');
            }}
            variant="outlined"
            disabled={isSubmittingContact}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleContactSubmit}
            variant="contained"
            disabled={isSubmittingContact || !contactTitle.trim() || !contactDescription.trim()}
            sx={{
              background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
              px: 4
            }}
          >
            {isSubmittingContact ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog
        open={privacyDialogOpen}
        onClose={() => setPrivacyDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0'
        }}>
          🔒 Privacy Policy
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            At JobTailorAI, we are committed to protecting your privacy and ensuring the security of your personal information. This comprehensive Privacy Policy explains how we collect, use, process, and safeguard your data when you use our AI-powered resume tailoring services.
          </Typography>
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            1. Information We Collect
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            <strong>Personal Information:</strong> Name, email address, account credentials, and profile information you provide during registration.<br/><br/>
            <strong>Resume Content:</strong> All text, formatting, and metadata from resumes you upload for tailoring services.<br/><br/>
            <strong>Job Information:</strong> Job descriptions, company names, and position details you provide for tailoring purposes.<br/><br/>
            <strong>Usage Data:</strong> Service interactions, feature usage patterns, session duration, and performance metrics.<br/><br/>
            <strong>Technical Data:</strong> IP addresses, browser information, device identifiers, and system configuration data for security and optimization purposes.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            2. How We Use Your Information
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            <strong>Service Delivery:</strong> Process and tailor your resumes using advanced AI algorithms to match job requirements.<br/><br/>
            <strong>Account Management:</strong> Maintain your account, provide customer support, and communicate service updates.<br/><br/>
            <strong>Service Improvement:</strong> Analyze usage patterns to enhance our AI models, user experience, and platform functionality.<br/><br/>
            <strong>Security & Compliance:</strong> Monitor for fraudulent activity, ensure platform security, and comply with legal obligations.<br/><br/>
            <strong>Communication:</strong> Send service-related notifications, updates, and respond to your inquiries.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            3. Data Security & Protection
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            We implement enterprise-grade security measures including AES-256 encryption for data at rest, TLS 1.3 for data in transit, multi-factor authentication, regular security audits, and AWS security best practices. Your resume content is processed in secure, isolated environments and never shared with unauthorized parties.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            4. Data Retention & Deletion
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            Saved resumes are retained until you delete them from your account. Temporary processing files are automatically purged within 24 hours. You may request complete account deletion at any time, which will permanently remove all associated data within 30 days.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            5. Your Rights & Choices
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            You have the right to access, modify, or delete your personal information, opt-out of communications, request data portability, and withdraw consent where applicable. Contact us to exercise these rights or for any privacy-related concerns.
          </Typography>

          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
            For privacy questions or to exercise your rights, contact us through our support system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setPrivacyDialogOpen(false)}
            variant="contained"
            sx={{ background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)', px: 4 }}
          >
            I Understand
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog
        open={termsDialogOpen}
        onClose={() => setTermsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0'
        }}>
          📋 Terms of Service
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            1. Service Description
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            JobTailorAI provides AI-powered resume optimization services to help users create 
            job-specific resumes that are tailored to particular job descriptions.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            2. User Responsibilities
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            • Provide accurate information in your resume<br/>
            • Use the service for legitimate job applications<br/>
            • Maintain the confidentiality of your account<br/>
            • Comply with all applicable laws and regulations
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            3. Intellectual Property
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            You retain ownership of your resume content. JobTailorAI retains ownership 
            of the AI technology and service infrastructure.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            4. ATS Score Disclaimer
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            <strong>Important Notice:</strong> The ATS (Applicant Tracking System) scores provided by JobTailorAI are proprietary, in-house developed metrics and simulations. These scores are for informational and guidance purposes only and do not represent actual ATS system evaluations from any specific employer or third-party ATS provider. JobTailorAI makes no guarantees regarding the accuracy of these scores or their correlation with actual ATS performance. Different ATS systems use varying algorithms and criteria that may not align with our scoring methodology.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            5. Limitation of Liability
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            JobTailorAI provides resume tailoring services but does not guarantee job placement, interview success, or specific ATS system compatibility. Our ATS scores are estimates based on general best practices and should not be considered definitive assessments. Use of our service is at your own discretion and risk.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            6. Service Availability
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            We strive to maintain high service availability but do not guarantee uninterrupted access. Scheduled maintenance, technical issues, or force majeure events may temporarily affect service availability.
          </Typography>

          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
            For questions about these terms, contact us through our support system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setTermsDialogOpen(false)}
            variant="contained"
            sx={{ background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)', px: 4 }}
          >
            I Agree
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cookie Policy Dialog */}
      <Dialog
        open={cookieDialogOpen}
        onClose={() => setCookieDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0'
        }}>
          🍪 Cookie Policy
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            We use cookies to enhance your experience on JobTailorAI.
          </Typography>
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            Essential Cookies
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            Required for the website to function properly, including authentication and security.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            Analytics Cookies
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            Help us understand how users interact with our service to improve functionality.
          </Typography>

          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
            You can manage cookie preferences in your browser settings.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setCookieDialogOpen(false)}
            variant="contained"
            sx={{ background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)', px: 4 }}
          >
            Got It
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Center Dialog */}
      <Dialog
        open={helpCenterDialogOpen}
        onClose={() => setHelpCenterDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0'
        }}>
          🆘 Help Center
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Welcome to the JobTailorAI Help Center! Find answers to common questions and learn how to get the most out of our platform.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            🚀 Getting Started
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            • Create your account and upload your resume<br/>
            • Paste a job description you're interested in<br/>
            • Let our AI tailor your resume for that specific job<br/>
            • Preview, compare, and download your tailored resume
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            💡 Pro Tips
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            • Use the complete job description for best results<br/>
            • Review the comparison to understand changes<br/>
            • Download in Word format for easy editing<br/>
            • Create different versions for different job types
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
            🔧 Troubleshooting
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
            • Ensure your resume file is under 5MB<br/>
            • Use supported formats: PDF, Word, or text<br/>
            • Check your internet connection for uploads<br/>
            • Clear browser cache if experiencing issues
          </Typography>

          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#666' }}>
            Still need help? Use our contact form to reach our support team directly.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setContactUsDialogOpen(true)}
            variant="outlined"
            sx={{ mr: 2 }}
          >
            Contact Support
          </Button>
          <Button 
            onClick={() => setHelpCenterDialogOpen(false)}
            variant="contained"
            sx={{ background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)', px: 4 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
}
