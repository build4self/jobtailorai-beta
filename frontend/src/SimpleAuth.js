import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useLoading } from './contexts/LoadingContext';
import LoadingScreen from './components/LoadingScreen';
import TermsAndConditions from './components/TermsAndConditions';
import sessionManager from './utils/sessionManager';
import Logger from './utils/logger';
import analytics from './utils/analytics';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Link,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 

  Visibility,
  VisibilityOff,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material';
// Removed JobTailorIcon import - using inline branding instead

function SimpleAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLoading, isLoading: globalLoading, loadingMessage, loadingSubtitle } = useLoading();
  
  // Get the return path from location state, default to /app/upload
  const returnTo = location.state?.returnTo || '/app/upload';
  const [mode, setMode] = useState('signIn'); // signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    confirmationCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Check for remembered credentials on mount
  useEffect(() => {
    const rememberedEmail = sessionManager.getRememberedEmail();
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Phone number formatting for Cognito (E.164 format)
  const formatPhoneForCognito = (phone) => {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with 1 and has 11 digits, it's already in the right format
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it has 10 digits, assume it's US number and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it already starts with +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Otherwise, return the original phone number
    return phone;
  };

  // Password validation function
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = Object.values(requirements).every(req => req);
    return { isValid, requirements };
  };

  const getPasswordRequirements = (password) => {
    const { requirements } = validatePassword(password);
    return [
      { text: 'At least 8 characters', met: requirements.length },
      { text: 'One uppercase letter (A-Z)', met: requirements.uppercase },
      { text: 'One lowercase letter (a-z)', met: requirements.lowercase },
      { text: 'One number (0-9)', met: requirements.number },
      { text: 'One special character (!@#$%^&*)', met: requirements.special }
    ];
  };

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(''); // Clear error when user types
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    analytics.track('sign_in_submit');
    setLoading(true);
    setError('');
    
    Logger.info('🔐 Starting sign-in process...');
    Logger.info('📧 Email:', formData.email);
    Logger.info('🔒 Remember me:', rememberMe);
    Logger.info('🌍 Environment:', process.env.REACT_APP_ENVIRONMENT || 'production');
    Logger.info('🏗️ API Endpoint:', process.env.REACT_APP_API_ENDPOINT);
    Logger.info('👤 User Pool ID:', process.env.REACT_APP_USER_POOL_ID);
    Logger.info('🔑 Client ID:', process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID);
    
    try {
      Logger.info('📤 Sending sign-in request to Cognito...');
      const result = await signIn({
        username: formData.email,
        password: formData.password,
        options: {
          // Set session duration based on remember me
          authFlowType: 'USER_SRP_AUTH',
          ...(rememberMe && {
            clientMetadata: {
              rememberDevice: 'true'
            }
          })
        }
      });
      
      Logger.info('📥 Sign-in response received:', result);
      
      if (result.isSignedIn) {
        Logger.info('✅ Sign-in successful!');
        
        // Handle remember me preference
        if (rememberMe) {
          sessionManager.setRememberMe(formData.email);
          Logger.info('💾 Email saved for remember me');
        } else {
          sessionManager.clearRememberMe();
          Logger.info('🗑️ Remember me cleared');
        }
        
        // Show loading screen before navigation
        showLoading("Welcome back!", "Setting up your workspace", 2000);
        Logger.info('🚀 Navigating to:', returnTo);
        
        // Navigate after loading screen
        setTimeout(() => {
          navigate(returnTo, { replace: true });
        }, 2000);
      } else {
        Logger.warn('⚠️ Sign-in completed but user not signed in:', result);
      }
    } catch (err) {
      Logger.error('❌ Sign in error details:');
      Logger.error('Error object:', err);
      Logger.error('Error message:', err.message);
      Logger.error('Error code:', err.code);
      Logger.error('Error name:', err.name);
      
      if (err.response) {
        Logger.error('Error response:', err.response);
      }
      
      if (err.request) {
        Logger.error('Error request:', err.request);
      }
      
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
    // Don't set loading to false here since we want to keep it during transition
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    analytics.track('sign_up_submit');
    setLoading(true);
    setError('');
    
    // Debug: Log current Amplify configuration and versions (only in development)
    Logger.log('=== COMPREHENSIVE DEBUG ===');
    Logger.log('Current config:', {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_PdEKfFD9v',
      userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 'sp5dfgb8mr3066luhs7e8h2rr',
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
    });
    
    // Check if there are any environment variables overriding our config
    Logger.log('Environment variables:', {
      REACT_APP_USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID,
      REACT_APP_USER_POOL_WEB_CLIENT_ID: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
      REACT_APP_AWS_REGION: process.env.REACT_APP_AWS_REGION
    });
    
    Logger.log('=== END COMPREHENSIVE DEBUG ===');
    
    // Validate Terms and Conditions agreement
    if (!agreeToTerms) {
      setError('You must agree to the Terms and Conditions to create an account');
      setLoading(false);
      return;
    }
    
    // Validate password requirements
    const { isValid } = validatePassword(formData.password);
    if (!isValid) {
      setError('Password does not meet the requirements');
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const formattedPhone = formatPhoneForCognito(formData.phone);
      
      Logger.log('Attempting sign-up with data:', {
        username: formData.email,
        options: {
          userAttributes: {
            email: formData.email,
            given_name: formData.firstName,
            family_name: formData.lastName,
            ...(formattedPhone && { phone_number: formattedPhone })
          }
        }
      });
      
      const result = await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            given_name: formData.firstName,
            family_name: formData.lastName,
            ...(formattedPhone && { phone_number: formattedPhone }),
'custom:newsletter': 'true', // Auto-subscribe to newsletter as per terms
            'custom:terms': new Date().toISOString() // Store terms acceptance timestamp
          }
        }
      });
      
      Logger.log('Sign-up result:', result);
      
      // Additional verification that email was properly set
      if (result.userSub) {
        Logger.log('User created successfully with ID:', result.userSub);
        if (result.codeDeliveryDetails) {
          Logger.log('Verification email sent to:', result.codeDeliveryDetails.destination);
        } else {
          Logger.warn('No code delivery details - verification email may not have been sent');
        }
      }
      
      if (result.isSignUpComplete) {
        // Show loading screen before navigation
        showLoading("Account created successfully!", "Welcome to JobTailorAI", 2000);
        
        setTimeout(() => {
          navigate(returnTo);
        }, 2000);
      } else {
        setMode('confirmSignUp');
        setMessage('Please check your email for the verification code');
      }
    } catch (err) {
      Logger.error('=== SIGN UP ERROR DEBUG ===');
      Logger.error('Full error object:', err);
      Logger.error('Error message:', err.message);
      Logger.error('Error code:', err.code);
      Logger.error('Error name:', err.name);
      Logger.error('Error stack:', err.stack);
      
      if (err.response) {
        Logger.error('Error response:', err.response);
      }
      
      if (err.request) {
        Logger.error('Error request:', err.request);
      }
      
      Logger.error('=== END DEBUG ===');
      
      // Handle specific Cognito errors
      if (err.code === 'UsernameExistsException') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'InvalidPasswordException') {
        setError('Password does not meet the requirements.');
      } else if (err.code === 'InvalidParameterException') {
        setError(`Invalid parameter: ${err.message}`);
      } else {
        // Show the actual error message for debugging
        setError(`Sign-up failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await confirmSignUp({
        username: formData.email,
        confirmationCode: formData.confirmationCode
      });
      
      // Now sign in automatically
      const signInResult = await signIn({
        username: formData.email,
        password: formData.password
      });
      
      if (signInResult.isSignedIn) {
        setEmailVerified(true);
        
        // Start countdown timer
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              // Show loading screen before navigation
              showLoading("Email verified successfully!", "Welcome to JobTailorAI", 2000);
              
              setTimeout(() => {
                navigate('/app/upload');
              }, 2000);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      Logger.error('Confirm sign up error:', err);
      setError(err.message || 'Failed to confirm sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await resetPassword({ username: formData.email });
      setMode('confirmResetPassword');
      setMessage('Please check your email for the reset code');
    } catch (err) {
      Logger.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate password requirements
    const { isValid } = validatePassword(formData.password);
    if (!isValid) {
      setError('Password does not meet the requirements');
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      await confirmResetPassword({
        username: formData.email,
        confirmationCode: formData.confirmationCode,
        newPassword: formData.password
      });
      
      setMode('signIn');
      setMessage('Password reset successfully. Please sign in with your new password.');
    } catch (err) {
      Logger.error('Confirm reset password error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderSignInForm = () => (
    <Box component="form" onSubmit={handleSignIn}>
      <Typography variant="h4" sx={{ 
        mb: 1, 
        fontWeight: 400,
        color: 'rgba(0,0,0,.9)',
        textAlign: 'center'
      }}>
        Sign in
      </Typography>
      <Typography variant="body1" sx={{ 
        mb: 4, 
        color: 'rgba(0,0,0,.6)',
        textAlign: 'center'
      }}>
        Stay updated on your professional world
      </Typography>

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
        sx={{ mb: 2 }}
      />
      
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        required
        sx={{ mb: 3 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {/* Remember Me Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            sx={{ 
              color: '#0A66C2',
              '&.Mui-checked': {
                color: '#0A66C2',
              }
            }}
          />
        }
        label={
          <Typography variant="body2" sx={{ color: '#666666', fontSize: '14px' }}>
            Keep me signed in for 30 days
          </Typography>
        }
        sx={{ mb: 2, alignSelf: 'flex-start' }}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{
          height: 52,
          borderRadius: '24px',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'none',
          backgroundColor: '#0A66C2',
          '&:hover': {
            backgroundColor: '#004182'
          },
          mb: 2
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
      </Button>

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Link
          component="button"
          type="button"
          onClick={() => setMode('resetPassword')}
          sx={{ color: '#0A66C2', textDecoration: 'none', fontSize: '14px' }}
        >
          Forgot password?
        </Link>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        my: 3,
        '&::before, &::after': {
          content: '""',
          flex: 1,
          height: '1px',
          backgroundColor: '#d0d0d0'
        }
      }}>
        <Typography sx={{ px: 2, color: 'rgba(0,0,0,.6)', fontSize: '14px' }}>
          or
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ 
          color: 'rgba(0,0,0,.9)', 
          fontSize: '16px',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          flexWrap: 'wrap'
        }}>
          <span>New to JobTailorAI?</span>
          <Link
            component="button"
            type="button"
            onClick={() => setMode('signUp')}
            sx={{ 
              color: '#0A66C2', 
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '16px',
              lineHeight: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            Join now
          </Link>
        </Typography>
      </Box>
    </Box>
  );

  const renderSignUpForm = () => (
    <Box component="form" onSubmit={handleSignUp}>
      <Typography variant="h4" sx={{ 
        mb: 1, 
        fontWeight: 400,
        color: 'rgba(0,0,0,.9)',
        textAlign: 'center'
      }}>
        Make the most of your professional life
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="First name"
          value={formData.firstName}
          onChange={handleInputChange('firstName')}
          required
        />
        <TextField
          fullWidth
          label="Last name"
          value={formData.lastName}
          onChange={handleInputChange('lastName')}
          required
        />
      </Box>
      
      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
        sx={{ mb: 2 }}
      />
      
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        required
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {/* Password Requirements */}
      {formData.password && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
            Password Requirements:
          </Typography>
          <List dense sx={{ py: 0 }}>
            {getPasswordRequirements(formData.password).map((req, index) => (
              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {req.met ? (
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                  ) : (
                    <RadioButtonUnchecked sx={{ fontSize: 16, color: 'grey.400' }} />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={req.text} 
                  primaryTypographyProps={{ 
                    fontSize: '0.875rem',
                    color: req.met ? 'success.main' : 'text.secondary'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      <TextField
        fullWidth
        label="Confirm password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        required
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <TextField
        fullWidth
        label="Phone number (optional)"
        type="tel"
        value={formData.phone}
        onChange={handleInputChange('phone')}
        placeholder="+1 (555) 123-4567"
        helperText="Include country code for international numbers"
        sx={{ mb: 3 }}
      />
      
      {/* Terms and Conditions Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            sx={{ 
              color: '#0A66C2',
              '&.Mui-checked': {
                color: '#0A66C2',
              }
            }}
          />
        }
        label={
          <Typography variant="body2" sx={{ color: '#666666', fontSize: '14px' }}>
            I agree to the{' '}
            <Link
              component="button"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setTermsDialogOpen(true);
              }}
              sx={{ 
                color: '#0A66C2', 
                textDecoration: 'underline',
                fontSize: '14px',
                '&:hover': { 
                  textDecoration: 'underline',
                  backgroundColor: 'transparent'
                }
              }}
            >
              Terms and Conditions
            </Link>
          </Typography>
        }
        sx={{ mb: 2, alignItems: 'center', alignSelf: 'flex-start' }}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading || !agreeToTerms || !formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword}
        sx={{
          height: 52,
          borderRadius: '24px',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'none',
          backgroundColor: (agreeToTerms && formData.firstName && formData.lastName && formData.email && formData.password && formData.confirmPassword) ? '#0A66C2' : '#cccccc',
          '&:hover': {
            backgroundColor: (agreeToTerms && formData.firstName && formData.lastName && formData.email && formData.password && formData.confirmPassword) ? '#004182' : '#cccccc'
          },
          '&:disabled': {
            backgroundColor: '#cccccc',
            color: '#666666'
          },
          mb: 3
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ 
          color: 'rgba(0,0,0,.9)', 
          fontSize: '16px',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          flexWrap: 'wrap'
        }}>
          <span>Already on JobTailorAI?</span>
          <Link
            component="button"
            type="button"
            onClick={() => setMode('signIn')}
            sx={{ 
              color: '#0A66C2', 
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '16px',
              lineHeight: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            Sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  );

  const renderEmailVerificationSuccess = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mb: 3,
        animation: 'bounce 0.6s ease-in-out'
      }}>
        <CheckCircle sx={{ 
          fontSize: 80, 
          color: '#4CAF50',
          filter: 'drop-shadow(0 4px 8px rgba(76, 175, 80, 0.3))'
        }} />
      </Box>
      
      <Typography variant="h4" sx={{ 
        mb: 2, 
        fontWeight: 600,
        color: '#4CAF50',
        textAlign: 'center'
      }}>
        Email Verified Successfully! 🎉
      </Typography>
      
      <Typography variant="body1" sx={{ 
        mb: 3, 
        color: 'rgba(0,0,0,.7)',
        textAlign: 'center',
        lineHeight: 1.6
      }}>
        Welcome to JobTailorAI! Your account is now active and ready to use.
      </Typography>
      
      <Typography variant="body1" sx={{ 
        mb: 4, 
        color: 'rgba(0,0,0,.6)',
        textAlign: 'center',
        lineHeight: 1.6
      }}>
        Let's get started by uploading your resume and optimizing it for your dream job!
      </Typography>

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 1,
        p: 3,
        bgcolor: '#E8F5E8',
        borderRadius: 2,
        mb: 3,
        border: '1px solid #C8E6C9'
      }}>
        <CircularProgress size={24} sx={{ color: '#4CAF50' }} />
        <Typography variant="body1" sx={{ color: '#2E7D32', fontWeight: 500 }}>
          Redirecting to upload page in {countdown} second{countdown !== 1 ? 's' : ''}...
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ 
        color: '#999', 
        fontStyle: 'italic',
        textAlign: 'center'
      }}>
        Get ready to create an amazing resume!
      </Typography>
    </Box>
  );

  const renderConfirmSignUpForm = () => (
    <Box component="form" onSubmit={handleConfirmSignUp}>
      <Typography variant="h4" sx={{ 
        mb: 2, 
        fontWeight: 400,
        color: 'rgba(0,0,0,.9)',
        textAlign: 'center'
      }}>
        Verify your email
      </Typography>
      
      <Typography variant="body1" sx={{ 
        mb: 3, 
        color: 'rgba(0,0,0,.6)',
        textAlign: 'center'
      }}>
        We sent a verification code to {formData.email}
      </Typography>

      <TextField
        fullWidth
        label="Verification code"
        value={formData.confirmationCode}
        onChange={handleInputChange('confirmationCode')}
        required
        sx={{ mb: 3 }}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{
          height: 52,
          borderRadius: '24px',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'none',
          backgroundColor: '#0A66C2',
          '&:hover': {
            backgroundColor: '#004182'
          }
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
      </Button>
    </Box>
  );

  const renderResetPasswordForm = () => (
    <Box component="form" onSubmit={handleResetPassword}>
      <Typography variant="h4" sx={{ 
        mb: 2, 
        fontWeight: 400,
        color: 'rgba(0,0,0,.9)',
        textAlign: 'center'
      }}>
        Reset your password
      </Typography>

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
        sx={{ mb: 3 }}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{
          height: 52,
          borderRadius: '24px',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'none',
          backgroundColor: '#0A66C2',
          '&:hover': {
            backgroundColor: '#004182'
          },
          mb: 2
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Send reset code'}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Link
          component="button"
          type="button"
          onClick={() => setMode('signIn')}
          sx={{ color: '#0A66C2', textDecoration: 'none', fontSize: '14px' }}
        >
          Back to sign in
        </Link>
      </Box>
    </Box>
  );

  const renderConfirmResetPasswordForm = () => (
    <Box component="form" onSubmit={handleConfirmResetPassword}>
      <Typography variant="h4" sx={{ 
        mb: 2, 
        fontWeight: 400,
        color: 'rgba(0,0,0,.9)',
        textAlign: 'center'
      }}>
        Enter new password
      </Typography>
      
      <Typography variant="body1" sx={{ 
        mb: 3, 
        color: 'rgba(0,0,0,.6)',
        textAlign: 'center'
      }}>
        We sent a reset code to {formData.email}
      </Typography>

      <TextField
        fullWidth
        label="Reset code"
        value={formData.confirmationCode}
        onChange={handleInputChange('confirmationCode')}
        required
        sx={{ mb: 2 }}
      />
      
      <TextField
        fullWidth
        label="New password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleInputChange('password')}
        required
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {/* Password Requirements */}
      {formData.password && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
            Password Requirements:
          </Typography>
          <List dense sx={{ py: 0 }}>
            {getPasswordRequirements(formData.password).map((req, index) => (
              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {req.met ? (
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                  ) : (
                    <RadioButtonUnchecked sx={{ fontSize: 16, color: 'grey.400' }} />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={req.text} 
                  primaryTypographyProps={{ 
                    fontSize: '0.875rem',
                    color: req.met ? 'success.main' : 'text.secondary'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      <TextField
        fullWidth
        label="Confirm new password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        required
        sx={{ mb: 3 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle confirm password visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{
          height: 52,
          borderRadius: '24px',
          fontSize: '16px',
          fontWeight: 600,
          textTransform: 'none',
          backgroundColor: '#0A66C2',
          '&:hover': {
            backgroundColor: '#004182'
          }
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset password'}
      </Button>
    </Box>
  );

  const getCurrentForm = () => {
    if (emailVerified) {
      return renderEmailVerificationSuccess();
    }
    
    switch (mode) {
      case 'signUp':
        return renderSignUpForm();
      case 'confirmSignUp':
        return renderConfirmSignUpForm();
      case 'resetPassword':
        return renderResetPasswordForm();
      case 'confirmResetPassword':
        return renderConfirmResetPasswordForm();
      default:
        return renderSignInForm();
    }
  };

  return (
    <>
      {/* Show loading screen during global loading */}
      {globalLoading && (
        <LoadingScreen 
          message={loadingMessage}
          subtitle={loadingSubtitle}
          showProgress={true}
        />
      )}
      
      {/* Main auth content - hide when loading */}
      {!globalLoading && (
        <Box sx={{ 
          minHeight: '100vh', 
          bgcolor: '#f5f5f5',
          '& @keyframes bounce': {
            '0%, 20%, 53%, 80%, 100%': {
              transform: 'translate3d(0,0,0)'
            },
            '40%, 43%': {
              transform: 'translate3d(0,-15px,0)'
            },
            '70%': {
              transform: 'translate3d(0,-7px,0)'
            },
            '90%': {
              transform: 'translate3d(0,-2px,0)'
            }
          }
    }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ 
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
                fontSize: '1.4rem',
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
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                AI
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ 
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f3f2ef',
        p: 2
      }}>
        <Container maxWidth="md">
          <Paper sx={{ 
            bgcolor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
            p: { xs: 4, sm: 5 },
            maxWidth: 600,
            mx: 'auto',
            border: '1px solid rgba(10, 102, 194, 0.1)'
          }}>
            {/* Logo */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h4" component="div" sx={{ 
                  fontWeight: 800,
                  fontSize: '2rem',
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
                  px: 1.5,
                  py: 0.8,
                  borderRadius: 1.5,
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}>
                  AI
                </Box>
              </Box>
            </Box>

            {/* Error Message */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Success Message */}
            {message && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
            )}

            {/* Current Form */}
            {getCurrentForm()}
          </Paper>
        </Container>
      </Box>
      
      {/* Terms and Conditions Dialog */}
      <TermsAndConditions 
        open={termsDialogOpen} 
        onClose={() => setTermsDialogOpen(false)} 
      />
    </Box>
    )}
    </>
  );
}

export default SimpleAuth;
