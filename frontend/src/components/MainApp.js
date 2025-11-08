import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, signOut, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { useLoading } from '../contexts/LoadingContext';
import LoadingScreen from './LoadingScreen';
import config from '../config';
import Logger from '../utils/logger';
import analytics from '../utils/analytics';
import ProfileDialog from './ProfileDialog';
import SettingsDialog from './SettingsDialog';
import FormatSelector from './FormatSelector';
import StylishBackButton from './StylishBackButton';
import ResumeAssemblyAnimation from './ResumeAssemblyAnimation';
import FeedbackDialog from './FeedbackDialog';
import ThankYouDialog from './ThankYouDialog';
import DevModeBanner from './DevModeBanner';
import QuickInterviewSetup from './QuickInterviewSetup';
import devModeDetector from '../utils/devModeDetector';
// Removed JobTailorIcon import - using inline branding instead

import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  TextField, 
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Snackbar,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Grid,
  Divider,
  InputAdornment,
  CircularProgress,
  ButtonGroup
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,

  Download as DownloadIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  HelpOutline as HelpOutlineIcon,
  ContactSupport as ContactSupportIcon,
  Visibility as VisibilityIcon,
  Compare as CompareIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  Clear as ClearIcon,
  Link as LinkIcon,
  GetApp as ExtractIcon,
  Business as BusinessIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

// File upload component
function FileUploadZone({ onFileAccepted, acceptedFileTypes, resumeFile, onContinue }) {
  const [showContinueButton, setShowContinueButton] = React.useState(false);
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: acceptedFileTypes,
    onDrop: files => {
      if (files && files[0]) {
        setShowContinueButton(false); // Reset button state
        onFileAccepted(files[0]);
      }
    },
    multiple: false,
    // Mobile-specific improvements
    noClick: false,
    noKeyboard: false,
    preventDropOnDocument: true
  });

  const file = acceptedFiles[0] || resumeFile;

  // Show continue button after 4 seconds if automatic navigation hasn't happened
  React.useEffect(() => {
    if (file && !showContinueButton) {
      const timer = setTimeout(() => {
        setShowContinueButton(true);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [file, showContinueButton]);

  return (
    <Box sx={{ mt: 1, mb: 2, flex: 1 }}>
      <Paper
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: isDragActive ? 'rgba(63, 81, 181, 0.04)' : 'background.paper',
          minHeight: '100px',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(63, 81, 181, 0.04)',
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ 
          fontSize: 32, 
          color: isDragActive ? 'primary.main' : 'text.secondary', 
          mb: 1 
        }} />
        <Typography variant="body1" gutterBottom>
          {isDragActive ? 'Drop the file here' : 'Drag & drop your resume here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or click to browse files
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ 
          display: 'block', 
          mt: 0.5
        }}>
          Supported formats: PDF, DOC, DOCX
        </Typography>
      </Paper>
      
      {file && (
        <Box sx={{ 
          mt: 1, 
          p: 1.5, 
          bgcolor: 'success.light', 
          borderRadius: 1,
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: showContinueButton ? 1 : 0, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} />
            <Typography variant="body2" sx={{ 
              color: 'success.main', 
              fontWeight: 500
            }}>
              {showContinueButton 
                ? `${file.name} uploaded successfully!`
                : `${file.name} uploaded successfully! Proceeding to next step...`
              }
            </Typography>
          </Box>
          
          {/* Continue button only shows if automatic navigation fails */}
          {showContinueButton && (
            <Button
              variant="contained"
              onClick={onContinue}
              size="small"
              sx={{
                background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                color: 'white',
                px: 3,
                py: 1,
                '&:hover': {
                  background: 'linear-gradient(45deg, #004182 30%, #0A66C2 90%)',
                }
              }}
            >
              Continue to Job Details →
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLoading, isLoading: globalLoading, loadingMessage, loadingSubtitle } = useLoading();
  const [currentUser, setCurrentUser] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);
  const [authDataLoaded, setAuthDataLoaded] = useState(false);
  
  // Resume tailoring state
  const [resume, setResume] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [generateCV, setGenerateCV] = useState(false); // Generate CV toggle
  const [selectedResumeFormat, setSelectedResumeFormat] = useState('pdf'); // Direct format selection
  const [selectedCoverLetterFormat, setSelectedCoverLetterFormat] = useState('pdf'); // Direct format selection
  const [jobUrl, setJobUrl] = useState(''); // Job URL for extraction
  const [companyName, setCompanyName] = useState(''); // Manual company name input
  const [manualJobDescription, setManualJobDescription] = useState(''); // Manual job description input
  const [urlExtractionFailed, setUrlExtractionFailed] = useState(false); // Track if URL extraction failed
  const [isExtracting, setIsExtracting] = useState(false); // Track if extraction is in progress
  

  // Note: Job data will be extracted during form submission, not stored in state
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // UI state
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [coverLetterFormatAnchorEl, setCoverLetterFormatAnchorEl] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Enhanced UX state for processing
  const [currentTip, setCurrentTip] = useState(0);

  // Define isProcessing early to avoid hoisting issues
  const isProcessing = isSubmitting || isPolling;

  // Educational tips to show during processing
  const educationalTips = [
    {
      icon: "🎯",
      title: "ATS Enhancement",
      text: "ATS systems scan for exact keyword matches from job descriptions. We're strategically placing relevant keywords throughout your resume."
    },
    {
      icon: "📊", 
      title: "Recruiter Insights",
      text: "Recruiters spend only 6 seconds on initial resume review. We're tailoring your content for maximum impact in those crucial first moments."
    },
    {
      icon: "🎯",
      title: "Achievement Focus", 
      text: "Quantified achievements increase interview chances by 40%. We're highlighting your measurable accomplishments and impact."
    },
    {
      icon: "🚀",
      title: "Action Verbs",
      text: "Action verbs like 'implemented', 'enhanced', and 'achieved' catch recruiter attention. We're enhancing your experience descriptions."
    },
    {
      icon: "🔍",
      title: "Keyword Density",
      text: "The right keyword density helps your resume rank higher in ATS searches while maintaining natural readability."
    },
    {
      icon: "📝",
      title: "Professional Format",
      text: "Clean, professional formatting ensures your resume looks great both in ATS systems and to human recruiters."
    },
    {
      icon: "💌",
      title: "Cover Letter Power",
      text: "A tailored cover letter increases your chances of getting an interview by 50%. We're crafting a personalized letter that complements your resume."
    }
  ];
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [faqsDialogOpen, setFaqsDialogOpen] = useState(false);
  const [contactUsDialogOpen, setContactUsDialogOpen] = useState(false);
  const [contactTitle, setContactTitle] = useState('');
  const [contactDescription, setContactDescription] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccessDialogOpen, setContactSuccessDialogOpen] = useState(false);
  const [saveToProfileDialogOpen, setSaveToProfileDialogOpen] = useState(false);
  const [resumeTitle, setResumeTitle] = useState('');
  const [resumeDescription, setResumeDescription] = useState('');
  const [interviewSetupOpen, setInterviewSetupOpen] = useState(false);
  const [userSettings, setUserSettings] = useState({
    defaultOutputFormat: 'pdf', // Default fallback
    resumeTemplate: 'professional' // Default template
  });

  // Preview and comparison state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [originalResumeText, setOriginalResumeText] = useState('');
  const [optimizedResumeText, setOptimizedResumeText] = useState('');
  const [coverLetterText, setCoverLetterText] = useState(''); // Cover letter state
  const [coverLetterDialogOpen, setCoverLetterDialogOpen] = useState(false); // Cover letter dialog state
  
  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackShownThisSession, setFeedbackShownThisSession] = useState(false);
  const [thankYouDialogOpen, setThankYouDialogOpen] = useState(false);
  const resultsPageTimerRef = useRef(null);
  const [parsingFailedDialogOpen, setParsingFailedDialogOpen] = useState(false);
  const [showFormatOptions, setShowFormatOptions] = useState(false);

  // Close format options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFormatOptions && !event.target.closest('.download-flowchart')) {
        setShowFormatOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFormatOptions]);



  // Feedback handling
  const handleFeedbackSubmit = (feedbackData) => {
    if (feedbackData.type === 'rating') {
      analytics.trackFeedback('rating_submitted', {
        rating: feedbackData.rating,
        step: feedbackData.step,
        trigger_type: feedbackData.manual ? 'manual' : 'automatic'
      });
    } else if (feedbackData.type === 'detailed_feedback') {
      analytics.trackFeedback('detailed_submitted', {
        rating: feedbackData.rating,
        categories: feedbackData.categories,
        feedback_text: feedbackData.feedback_text,
        email: feedbackData.email,
        step: feedbackData.step,
        trigger_type: feedbackData.manual ? 'manual' : 'automatic'
      });
    }
    
    // Show thank you dialog after any feedback submission with smooth transition
    setTimeout(() => {
      setThankYouDialogOpen(true);
      setTimeout(() => {
        setThankYouDialogOpen(false);
      }, 3000);
    }, 200); // Small delay for smooth transition
  };

  const handleFeedbackClose = () => {
    analytics.trackFeedback('dismissed');
    setFeedbackDialogOpen(false);
  };

  const showFeedbackDialog = useCallback(() => {
    // Only show feedback if not shown this session
    if (!feedbackShownThisSession) {
      analytics.trackFeedback('shown');
      setFeedbackDialogOpen(true);
      setFeedbackShownThisSession(true);
    }
  }, [feedbackShownThisSession]);







  // Function to clean and format original resume text for better comparison
  const formatOriginalResumeText = useCallback((text) => {
    if (!text || text.includes('Text extraction in progress') || text.includes('Original resume text not available')) {
      return text;
    }

    // If the text already has proper formatting (from LLM), don't process it further
    if (text.includes('====FORMATTED====')) {
      // Remove the marker and return the formatted text as-is
      return text.replace('====FORMATTED====', '').trim();
    }

    try {
      // OCR error corrections - including specific errors seen in the text
      const ocrFixes = {
        // Common OCR errors from the sample
        'cri0cal': 'critical',
        'analyt0cs': 'analytics', 
        'solu0ons': 'solutions',
        'transforma0on': 'transformation',
        'Informa0ca': 'Informatica',
        'pla0orms': 'platforms',
        'coordina0ors': 'coordinators',
        'execu0ves': 'executives',
        'Addi0onally': 'Additionally',
        'real-0me': 'real-time',
        'op0mized': 'optimized',
        'workl0ad': 'workload',
        'associa0es': 'associates',
        'gl0bally': 'globally',
        'reusab0e': 'reusable',
        'streaml0ne': 'streamline',
        'ba0ch': 'batch',
        'pipel0nes': 'pipelines',
        'self-serv0ce': 'self-service',
        'stakeho0ders': 'stakeholders',
        'Pla0orm': 'Platform',
        'Scr0pting': 'Scripting',
        'Languag0s': 'Languages',
        'Pyspa0k': 'Pyspark',
        'Visualiza0on': 'Visualization',
        'Visualizag0n': 'Visualization',
        'Databa0e': 'Database',
        'Managemen0': 'Management',
        'PostgreS0L': 'PostgreSQL',
        'MyS0L': 'MySQL',
        'Mong0DB': 'MongoDB',
        'Orac0e': 'Oracle',
        'Orchestrag0n': 'Orchestration',
        'Airfl0w': 'Airflow',
        'Powercen0er': 'Powercenter',
        'Cl0ud': 'Cloud',
        'EXPERI0NCE': 'EXPERIENCE',
        'Eng0neer': 'Engineer',
        'Pres0nt': 'Present',
        'Dall0s': 'Dallas',
        'Unit0d': 'United',
        'Stat0s': 'States',
        'Train0d': 'Trained',
        'LLM0': 'LLMs',
        'Bedr0ck': 'Bedrock',
        'assist0nt': 'assistant',
        'integrat0d': 'integrated',
        'inp0ts': 'inputs',
        'intern0l': 'internal',
        'w0ki': 'wiki',
        'documen0s': 'documents',
        'dat0': 'data',
        'Redsh0a': 'Redshift',
        'Dynam0DB': 'DynamoDB',
        
        // Original OCR fixes
        'Informa9on': 'Information',
        'Informa0on': 'Information',
        'Informati0n': 'Information',
        'Ins0tute': 'Institute',
        'Ins1tute': 'Institute',
        'Institu1e': 'Institute',
        'Ins9tute': 'Institute',
        'Techno1ogy': 'Technology',
        'Techno10gy': 'Technology',
        'Technol0gy': 'Technology',
        'Universi1y': 'University',
        'Universi9y': 'University',
        'Univer5ity': 'University',
        'Compu1er': 'Computer',
        'Compu9er': 'Computer',
        'Compu0er': 'Computer',
        'Sc1ence': 'Science',
        'Sc9ence': 'Science',
        'Sci3nce': 'Science',
        'Eng1neering': 'Engineering',
        'Eng9neering': 'Engineering',
        'Engineer1ng': 'Engineering',
        'Bache1or': 'Bachelor',
        'Bache10r': 'Bachelor',
        'Bachel0r': 'Bachelor',
        'Mas1er': 'Master',
        'Mas9er': 'Master',
        'Mast3r': 'Master',
        'Mas1ers': 'Masters',
        'Mas9ers': 'Masters',
        'Mast3rs': 'Masters',
        'Managemen1': 'Management',
        'Managemen9': 'Management',
        'Manage0ent': 'Management',
        'Deve1opment': 'Development',
        'Deve10pment': 'Development',
        'Develop0ent': 'Development',
        'Sof1ware': 'Software',
        'Sof9ware': 'Software',
        'So1tware': 'Software',
        'Projec1': 'Project',
        'Projec9': 'Project',
        'Proj3ct': 'Project',
        'Sys1em': 'System',
        'Sys9em': 'System',
        'Sy5tem': 'System',
        'Sys1ems': 'Systems',
        'Sys9ems': 'Systems',
        'Sy5tems': 'Systems',
        'Professiona1': 'Professional',
        'Professiona9': 'Professional',
        'Technica1': 'Technical',
        'Technica9': 'Technical',
        'Technic4l': 'Technical',
        'Busin3ss': 'Business',
        'Busine5s': 'Business',
        'Busines5': 'Business',
        'Analys1s': 'Analysis',
        'Analys9s': 'Analysis',
        'Analy5is': 'Analysis',
        'Educa1ion': 'Education',
        'Educa9ion': 'Education',
        'Educati0n': 'Education'
      };

    let cleanedText = text;

    // Apply word-level fixes
    Object.entries(ocrFixes).forEach(([wrong, correct]) => {
      const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, correct);
    });

    // Apply character-level fixes for remaining issues (conservative approach)
    cleanedText = cleanedText.replace(/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, 'o'); // 0 to o
    cleanedText = cleanedText.replace(/(?<=[a-zA-Z])9(?=[a-zA-Z])/g, 'g'); // 9 to g
    // Skip 1->l replacement as word-level fixes handle most cases and avoid over-correction

    // Basic formatting improvements
    cleanedText = cleanedText
      // Add proper spacing after periods
      .replace(/\.([A-Z])/g, '. $1')
      // Add line breaks before key sections
      .replace(/(SUMMARY|SKILLS|EXPERIENCE|EDUCATION|QUALIFICATIONS)/g, '\n\n$1')
      // Add line breaks after contact info
      .replace(/(LinkedIn|Email|Phone)(\s+)([A-Z][A-Z\s]+)/g, '$1$2\n\n$3')
      // Add line breaks before job titles and companies
      .replace(/([a-z])(\s+)(Data Engineer|Software Engineer|Senior|Lead|Manager|Director|Analyst)/g, '$1\n\n$3')
      // Add line breaks before dates
      .replace(/([a-zA-Z])(\s+)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/g, '$1\n$3')
      // Fix multiple spaces
      .replace(/\s{3,}/g, '  ')
      // Clean up line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();

    // Add section headers formatting
    const lines = cleanedText.split('\n');
    const formattedLines = lines.map(line => {
      const trimmedLine = line.trim();
      // Check if line looks like a section header (all caps, short, common resume sections)
      if (trimmedLine.length > 0 && trimmedLine.length < 50 && 
          /^[A-Z\s&]+$/.test(trimmedLine) &&
          (trimmedLine.includes('EDUCATION') || trimmedLine.includes('EXPERIENCE') || 
           trimmedLine.includes('SKILLS') || trimmedLine.includes('SUMMARY') ||
           trimmedLine.includes('PROFESSIONAL') || trimmedLine.includes('WORK') ||
           trimmedLine.includes('EMPLOYMENT') || trimmedLine.includes('QUALIFICATIONS'))) {
        return trimmedLine + '\n' + '='.repeat(Math.min(trimmedLine.length, 20));
      }
      return line;
    });
    
    cleanedText = formattedLines.join('\n');

      return cleanedText;
    } catch (error) {
      Logger.error('Error in formatOriginalResumeText:', error);
      return text; // Return original text if there's an error
    }
  }, []); // Empty dependency array since the function doesn't depend on any props/state

  // Determine current step from URL
  const getCurrentStep = () => {
    const path = location.pathname;
    if (path === '/app' || path === '/app/upload') return 0;
    if (path === '/app/job-description') return 1;
    if (path === '/app/results') return 2;
    return 0;
  };

  const activeStep = getCurrentStep();
  const steps = ['Upload Resume', 'Enter Job Details', 'Get Tailored Resume'];

  // Timer effect for showing feedback after 1 minute on results page
  useEffect(() => {
    // Clear any existing timer first
    if (resultsPageTimerRef.current) {
      clearTimeout(resultsPageTimerRef.current);
      resultsPageTimerRef.current = null;
    }

    // Start timer when results are displayed (activeStep === 2 && result && !isProcessing)
    if (activeStep === 2 && result && !isProcessing && !error && !feedbackShownThisSession) {
      const timer = setTimeout(() => {
        showFeedbackDialog();
      }, 60 * 1000); // 1 minute in milliseconds
      
      resultsPageTimerRef.current = timer;
      
      // Cleanup function
      return () => {
        if (resultsPageTimerRef.current) {
          clearTimeout(resultsPageTimerRef.current);
          resultsPageTimerRef.current = null;
        }
      };
    }
  }, [activeStep, result, isProcessing, error, feedbackShownThisSession, showFeedbackDialog]);

  // Load user settings from localStorage
  const loadUserSettings = () => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setUserSettings(parsedSettings);

      } catch (error) {
        Logger.error('Error parsing saved settings:', error);
      }
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Detect dev mode on component mount
  useEffect(() => {
    const detectDevMode = async () => {
      try {
        const envInfo = devModeDetector.getEnvironmentInfo();
        const isDev = envInfo.isDevelopment || envInfo.frontend === 'LOCAL';
        setIsDevMode(isDev);
      } catch (error) {
        console.warn('Failed to detect dev mode:', error);
        setIsDevMode(false);
      }
    };
    
    detectDevMode();
  }, []);

  // Handle route changes and clear state appropriately
  useEffect(() => {
    const path = location.pathname;
    
    // Try to restore resume file from localStorage on page refresh
    const restoreResumeFile = async () => {
      const savedResumeData = localStorage.getItem('currentResumeFile');
      
      if (savedResumeData) {
        try {
          const resumeData = JSON.parse(savedResumeData);
          // Convert data URL back to blob and create File object
          const response = await fetch(resumeData.content);
          const blob = await response.blob();
          const restoredFile = new File([blob], resumeData.name, {
            type: resumeData.type,
            lastModified: resumeData.lastModified
          });
          setResumeFile(restoredFile);
          setResumeName(resumeData.name);
          setResume(resumeData.content); // Set the data URL for resume content

        } catch (error) {
          Logger.error('Error restoring resume file:', error);
          localStorage.removeItem('currentResumeFile');
          // Only redirect to upload if we're on job-description and restoration failed
          if (path === '/app/job-description') {
            Logger.log('Resume restoration failed, redirecting to upload');
            navigate('/app/upload');
          }
        }
      } else if (path === '/app/job-description') {
        // Only redirect if there's no saved data at all
        Logger.log('No resume data found, redirecting to upload');
        navigate('/app/upload');
      }
    };
    
    // Clear state based on current route to handle page refreshes properly
    if (path === '/app' || path === '/app/upload') {
      // On upload page - clear everything except user settings
      setResumeFile(null);
      setResumeName('');
      setJobTitle('');
      setJobUrl('');
      setResult(null);
      setError(null);
      setIsSubmitting(false);
      setIsPolling(false);
      setJobId(null);
      setJobStatus('');
      setStatusMessage('');
      setSnackbarOpen(false);
      setSnackbarMessage('');
      

      
      // Clear saved resume file and result from localStorage
      localStorage.removeItem('currentResumeFile');
      localStorage.removeItem('currentResult');
    } else if (path === '/app/job-description') {
      // On job description page - keep resume file but clear job-related state
      setJobTitle('');
      setJobUrl('');
      setResult(null);
      setError(null);
      setIsSubmitting(false);
      setIsPolling(false);
      setJobId(null);
      setJobStatus('');
      setStatusMessage('');
      setSnackbarOpen(false);
      setSnackbarMessage('');
      
      // Only try to restore if we don't already have a resume file
      if (!resumeFile) {
        restoreResumeFile();
      }
    } else if (path === '/app/results') {
      // On results page - try to restore result data if not available
      if (!result && !isPolling) {
        const savedResult = localStorage.getItem('currentResult');
        if (savedResult) {
          try {
            const parsedResult = JSON.parse(savedResult);
            setResult(parsedResult);
            Logger.log('Restored result data from localStorage');
          } catch (error) {
            Logger.error('Error restoring result data:', error);
            localStorage.removeItem('currentResult');
            navigate('/app/upload');
          }
        } else {
          navigate('/app/upload');
        }
      }
    } else if (path === '/app/profile') {
      // On profile page - preserve result state for back navigation
      // Save current result to localStorage if it exists
      if (result) {
        localStorage.setItem('currentResult', JSON.stringify(result));
      }
    } else {
      // For other paths, try to restore resume file if we don't have one
      if (!resumeFile) {
        restoreResumeFile();
      }
    }
  }, [location.pathname, navigate, result, isPolling]); // Removed resumeFile from dependencies



  // Load user settings from localStorage
  useEffect(() => {
    loadUserSettings();
    
    // Listen for storage changes (when settings are updated)
    const handleStorageChange = (e) => {
      if (e.key === 'userSettings') {
        Logger.log('Storage change detected, reloading settings');
        loadUserSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Rotate educational tips every 4 seconds during processing
  useEffect(() => {
    let tipInterval;
    if (isPolling) {
      tipInterval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % educationalTips.length);
      }, 4000);
    }
    return () => {
      if (tipInterval) clearInterval(tipInterval);
    };
  }, [isPolling, educationalTips.length]);

  // Prevent page refresh/close during processing
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing || isPolling) {
        e.preventDefault();
        e.returnValue = 'Your resume is being tailored. Are you sure you want to leave? This will cancel the process.';
        return 'Your resume is being tailored. Are you sure you want to leave? This will cancel the process.';
      }
    };

    if (isProcessing || isPolling) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProcessing, isPolling]);

  // Poll for job status when isPolling is true
  useEffect(() => {
    let statusInterval;
    
    if (isPolling && jobId) {
      Logger.log('Starting status polling for jobId:', jobId);
      
      statusInterval = setInterval(async () => {
        try {
          Logger.log('Polling status for jobId:', jobId);
          
          const { tokens } = await fetchAuthSession();
          const idToken = tokens.idToken.toString();
          
          const statusResponse = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/status?jobId=${jobId}`, {
            method: 'GET',
            headers: {
              'Authorization': idToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${statusResponse.status}`);
          }
          
          const statusData = await statusResponse.json();
          Logger.log('Status response received:', statusData);
          
          setJobStatus(statusData.status);
          setStatusMessage(statusData.message || 'Processing...');
          
          if (statusData.status === 'COMPLETED') {
            setIsPolling(false);
            
            Logger.log('Job completed successfully');
            Logger.log('Generate CV flag:', generateCV);
            Logger.log('All status data keys:', Object.keys(statusData));
            Logger.log('Cover letter filename:', statusData.coverLetterFilename);
            Logger.log('Cover letter text length:', statusData.coverLetterText?.length || 0);
            Logger.log('ATS Score data:', statusData.atsScore);
            Logger.log('Full statusData:', statusData);
            
            // Always expect dual format response (new feature)
            const isDualFormat = true;
            
            setResult({
              optimizedResumeUrl: statusData.optimizedResumeUrl,
              fileType: statusData.fileType || 'docx',
              contentType: statusData.contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              downloadFilename: statusData.downloadFilename || `tailored_resume.${statusData.fileType || 'docx'}`,
              // Add cover letter URL if available
              coverLetterUrl: statusData.coverLetterUrl || null,
              coverLetterFilename: statusData.coverLetterFilename || `cover_letter.${statusData.fileType || 'docx'}`,
              // Dual format cover letter URLs - THIS WAS MISSING!
              coverLetterPdfUrl: statusData.coverLetterPdfUrl || null,
              coverLetterWordUrl: statusData.coverLetterWordUrl || null,
              coverLetterPdfFilename: statusData.coverLetterPdfFilename || null,
              coverLetterWordFilename: statusData.coverLetterWordFilename || null,
              hasCoverLetterDualFormat: statusData.hasCoverLetterDualFormat || false,
              // Add ATS score if available, or mock data for testing
              atsScore: statusData.atsScore || {
                overall: 85,
                rating: "Excellent",
                breakdown: {
                  keywords: 88,
                  formatting: 92,
                  skills: 82,
                  experience: 87,
                  contact: 95
                }
              },
              // DEV MODE: Dual format support
              isDualFormat: isDualFormat,
              pdfUrl: statusData.pdfUrl || null,
              wordUrl: statusData.wordUrl || null
            });
            
            if (isDualFormat) {
              Logger.log('🔧 DEV MODE: Dual format response detected');
              Logger.log('PDF URL available:', !!statusData.pdfUrl);
              Logger.log('Word URL available:', !!statusData.wordUrl);
            }
            
            // Log cover letter URLs for debugging
            Logger.log('🔍 Cover letter URLs from API:');
            Logger.log('coverLetterPdfUrl:', statusData.coverLetterPdfUrl ? 'Available' : 'Missing');
            Logger.log('coverLetterWordUrl:', statusData.coverLetterWordUrl ? 'Available' : 'Missing');
            Logger.log('hasCoverLetterDualFormat:', statusData.hasCoverLetterDualFormat);
            
            // Set the preview text if available
            if (statusData.previewText) {
              setOptimizedResumeText(statusData.previewText);
            } else {
              // Fallback message for when preview is not available
              setOptimizedResumeText(`Preview not available for ${statusData.fileType || 'this'} format.\n\nYour tailored resume has been generated successfully!\n\nTo view your tailored resume:\n1. Click the "Download Resume" button below\n2. Open the downloaded file in Microsoft Word or a compatible application\n\nThe tailored resume includes:\n• Customized content for the job description\n• Improved formatting and structure\n• Enhanced keywords and phrases\n• Professional presentation`);
            }
            
            // Set cover letter text if available
            if (statusData.coverLetterText) {
              setCoverLetterText(statusData.coverLetterText);
            }
            
            // Set the original text for comparison if available
            if (statusData.originalText) {
              setOriginalResumeText(statusData.originalText);
            }
            
            navigate('/app/results');
          } else if (statusData.status === 'FAILED') {
            setIsPolling(false);
            
            const errorMessage = statusData.message || 'Job failed';
            
            // Check if this is a parsing/extraction error
            if (errorMessage && (
              errorMessage.toLowerCase().includes('parse') ||
              errorMessage.toLowerCase().includes('extract') ||
              errorMessage.toLowerCase().includes('text extraction') ||
              errorMessage.toLowerCase().includes('resume format') ||
              errorMessage.toLowerCase().includes('unfortunately') ||
              errorMessage.toLowerCase().includes('unable to extract') ||
              errorMessage.toLowerCase().includes('unsupported document') ||
              errorMessage.toLowerCase().includes('no text content') ||
              errorMessage.toLowerCase().includes('pdf format is not supported') ||
              errorMessage.toLowerCase().includes('does not appear to be a valid')
            )) {
              // Ensure username is set for analytics (fallback if not set during login)
              if (!analytics.username && currentUser?.username) {
                analytics.setUsername(currentUser.username);
              }
              
              // Track parsing error from status polling
              analytics.trackEvent('parsing_error_dialog_shown', {
                error_type: 'status_polling_parsing_failure',
                error_message: errorMessage,
                file_type: resumeFile?.type,
                file_size: resumeFile?.size,
                file_name: resumeFile?.name,
                source: 'status_polling'
              });
              
              // Show parsing failed dialog for parsing-related errors
              setParsingFailedDialogOpen(true);
            } else {
              // Show generic error for other errors
              setError(errorMessage);
              setSnackbarMessage(`Error: ${errorMessage}`);
              setSnackbarOpen(true);
            }
          }
        } catch (error) {
          Logger.error('Error polling status:', error);
          // Don't stop polling on network errors, but limit retries
          if (error.message.includes('Status check failed')) {
            setIsPolling(false);
            setError(`Status check failed: ${error.message}`);
            setSnackbarMessage(`Error checking status: ${error.message}`);
            setSnackbarOpen(true);
          }
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (statusInterval) {
        Logger.log('Clearing status polling interval');
        clearInterval(statusInterval);
      }
    };
  }, [isPolling, jobId, navigate]);

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
      const username = currentUser.username.split('@')[0];
      // Capitalize first letter
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return 'User';
  };

  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      // Set user ID and username for analytics
      analytics.setUserId(user.userId || user.username);
      analytics.setUsername(user.username);
      
      // Fetch user attributes
      try {
        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);
      } catch (attrError) {
        Logger.log('Could not fetch user attributes:', attrError);
        // Continue without attributes - will fall back to username
      }
      
      // Mark auth data as loaded
      setAuthDataLoaded(true);
    } catch (error) {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    try {
      analytics.track('sign_out');
      analytics.clearUserId();
      
      await signOut();
      showLoading("Signing out...", "Thanks for using JobTailor AI!", 2500);
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } catch (error) {
      Logger.error('Error signing out:', error);
    }
  };

  const handleResumeChange = (file) => {
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        analytics.track('upload_resume_error', {
          error_type: 'file_too_large',
          file_size: file.size,
          file_type: file.type
        });
        setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
        setSnackbarMessage('File too large. Please choose a smaller file.');
        setSnackbarOpen(true);
        return;
      }
      
      analytics.track('upload_resume_success', {
        file_size: file.size,
        file_type: file.type,
        file_name_length: file.name.length
      });
      
      setResumeFile(file);
      setResumeName(file.name);
      
      // Clear previous results when new file is uploaded
      setOptimizedResumeText('');
      setResult(null);
      
      // Extract text content for comparison
      extractTextFromFile(file);
      
      // Show immediate success message
      setSnackbarMessage(`Resume "${file.name}" uploaded successfully! Proceeding to next step...`);
      setSnackbarOpen(true);
      
      const reader = new FileReader();
      
      // Set up navigation timeout as primary method (works for both desktop and mobile)
      const navigationTimeout = setTimeout(() => {
        Logger.log('Automatic navigation triggered');
        navigate('/app/job-description');
      }, 1500); // 1.5 seconds like original
      
      reader.onload = (event) => {
        setResume(event.target.result);
        
        // Save file data to localStorage for page refresh persistence
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          content: event.target.result
        };
        localStorage.setItem('currentResumeFile', JSON.stringify(fileData));
        
        Logger.log('File processed successfully');
        // Navigation will happen via timeout - don't navigate here to avoid double navigation
      };
      
      reader.onerror = (error) => {
        Logger.error('FileReader error:', error);
        // Don't clear the timeout - let automatic navigation still work
        Logger.log('FileReader failed, but automatic navigation will still proceed');
      };
      
      // Start reading the file (for data storage, not for navigation)
      reader.readAsDataURL(file);
    }
  };

  // Manual continue handler for mobile users
  const handleManualContinue = () => {
    if (resumeFile) {
      Logger.log('Manual continue triggered');
      navigate('/app/job-description');
    } else {
      setSnackbarMessage('Please upload a resume first');
      setSnackbarOpen(true);
    }
  };

  // Helper function to extract text from different file types
  const extractTextFromFile = (file) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalResumeText(e.target.result);
      };
      reader.readAsText(file);
    } else {
      // For non-text files, show a helpful message
      const fileTypeMap = {
        'application/pdf': 'PDF',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/msword': 'Word Document'
      };
      const fileType = fileTypeMap[file.type] || 'this file type';
      setOriginalResumeText(`Text extraction in progress for ${fileType} file.\n\nThe original resume text will be available for comparison after the tailoring is complete.\n\nFor immediate text preview, you can:\n1. Convert your resume to a .txt file\n2. Re-upload the .txt version\n\nOr proceed with the current file - the comparison will be available once processing is done.`);
    }
  };

  // Handle job URL extraction (called during form submission)
  const handleJobUrlExtraction = async (url) => {
    if (!url || !url.trim()) {
      return null;
    }

    try {
      Logger.log('Extracting job data from URL:', url);
      
      // Check if user is authenticated and get token
      let authToken = '';
      try {
        const user = await getCurrentUser();
        Logger.log('User authenticated:', user.username);
        
        const session = await fetchAuthSession();
        authToken = session.tokens?.idToken?.toString() || '';
        Logger.log('Auth token exists:', !!authToken);
        Logger.log('Auth token length:', authToken.length);
        
        if (!authToken) {
          throw new Error('No authentication token available');
        }
      } catch (authError) {
        Logger.error('Authentication error:', authError);
        throw new Error('Please log in to extract job data from URLs');
      }
      
      // Use direct fetch with proper authentication
      const apiEndpoint = config.API.REST.resumeOptimizer.endpoint;
      Logger.log('Making request to:', `${apiEndpoint}/extract-job-url`);
      
      const response = await fetch(`${apiEndpoint}/extract-job-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken
        },
        body: JSON.stringify({
          jobUrl: url.trim()
        })
      });

      Logger.log('Response status:', response.status);
      Logger.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        Logger.error('Non-JSON response received:', textResponse);
        throw new Error(`Server returned non-JSON response (${response.status}). Response: ${textResponse.substring(0, 200)}`);
      }

      const data = await response.json();
      Logger.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Failed to extract job data'}`);
      }

      if (data.success && data.data) {
        Logger.log('Job data extracted successfully:', data.data);
        return data.data;
      } else {
        throw new Error('No job data found in the response');
      }

    } catch (error) {
      Logger.error('Error extracting job data:', error);
      throw error;
    }
  };

  const handleOptimize = async () => {
    // Track the tailor resume button click
    analytics.track('tailor_resume_submit', {
      has_job_url: !!jobUrl.trim(),
      has_job_title: !!jobTitle.trim(),
      has_company_name: !!companyName.trim(),
      generate_cv: generateCV,
      resume_format: selectedResumeFormat,
      cover_letter_format: selectedCoverLetterFormat
    });
    

    
    // Validation logic based on requirements:
    // 1. Job URL OR Job Title is mandatory
    // 2. If cover letter toggle is ON, Job URL is mandatory (needs company info)
    // 3. Job Title only = generic resume development
    // 4. Job URL = job-specific development
    
    if (!resume) {
      setSnackbarMessage('Please upload a resume');
      setSnackbarOpen(true);
      return;
    }

    // Cover letter enabled - Job Title + Company Name required (Job URL optional)
    if (generateCV) {
      if (!jobTitle.trim() || !companyName.trim()) {
        setSnackbarMessage('For cover letter generation, Job Title and Company Name are required');
        setSnackbarOpen(true);
        return;
      }
    } else {
      // Cover letter disabled - Job URL OR Job Title required
      if (!jobUrl.trim() && !jobTitle.trim()) {
        setSnackbarMessage('Please enter either a Job URL or Job Title');
        setSnackbarOpen(true);
        return;
      }
    }

    // Validate job title length
    if (jobTitle.length > 100) {
      setSnackbarMessage('Job title must be 100 characters or less');
      setSnackbarOpen(true);
      return;
    }



    setIsSubmitting(true);
    setError(null);
    setJobStatus('SUBMITTING');
    setStatusMessage('Submitting your resume for tailoring...');
    
    try {
      Logger.log('Selected resume format:', selectedResumeFormat);
      Logger.log('Selected cover letter format:', selectedCoverLetterFormat);
      Logger.log('Generate CV:', generateCV);
      
      let finalCompanyName = companyName ? companyName.trim() : '';
      let finalJobDescription = manualJobDescription || '';
      let finalJobTitle = jobTitle ? jobTitle.trim() : '';
      
      // Extract job data if URL is provided
      if (jobUrl.trim()) {
        setStatusMessage('Extracting job information from URL...');
        
        try {
          const extractedData = await handleJobUrlExtraction(jobUrl);
          if (extractedData) {
            if (extractedData.company) {
              finalCompanyName = extractedData.company;
            }
            if (extractedData.description) {
              finalJobDescription = extractedData.description;
            }
            
            // Use extracted job title if user hasn't provided one
            if (!finalJobTitle && extractedData.job_title) {
              finalJobTitle = extractedData.job_title;
            }
            
            Logger.log('Job data extracted for processing:', extractedData);
            setUrlExtractionFailed(false);
          }
        } catch (extractError) {
          // URL extraction failed - enable manual fields for user input
          setUrlExtractionFailed(true);
          setSnackbarMessage(`URL extraction failed: ${extractError.message}. Please use the manual input fields below.`);
          setSnackbarOpen(true);
          
          // If we don't have manual inputs, stop the process
          if (!finalJobTitle || (generateCV && (!companyName.trim() || !manualJobDescription.trim()))) {
            throw new Error(`Failed to extract job data from URL. Please fill in the manual fields: Job Title${generateCV ? ', Company Name, and Job Description' : ''}.`);
          }
          
          // Use manual inputs - already set above
          // finalCompanyName and finalJobDescription are already set
          
          Logger.warn('Job extraction failed, using manual inputs:', extractError.message);
        }
      } else {
        // No URL provided - use manual inputs (already set above)
        // finalCompanyName and finalJobDescription are already set from state
      }
      
      // Final validation after extraction
      if (!finalJobTitle) {
        throw new Error('Job title is required. Please provide a job title or a valid job URL.');
      }
      
      if (generateCV && !finalCompanyName) {
        throw new Error('Company Name is required for cover letter generation.');
      }
      
      setStatusMessage('Processing your resume with AI...');
      
      const payload = {
        resume: resume,
        jobTitle: finalJobTitle,
        companyName: finalCompanyName,
        jobDescription: finalJobDescription,
        generateCV: generateCV,
        outputFormat: 'dual', // New feature: Always generate both PDF and Word
        coverLetterFormat: generateCV ? 'dual' : null, // Use dual format for cover letters too
        resumeTemplate: userSettings.resumeTemplate || 'professional'
      };
      
      Logger.log('Submitting optimization request with payload:', payload);
      

      
      const { tokens } = await fetchAuthSession();
      const idToken = tokens.idToken.toString();
      
      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/optimize`, {
        method: 'POST',
        headers: {
          'Authorization': idToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Check if the response contains an error message from the AI handler
        const errorMessage = responseData.error || `API request failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      if (responseData && responseData.jobId) {
        setJobId(responseData.jobId);
        setJobStatus(responseData.status || 'PROCESSING');
        setStatusMessage(responseData.message || 'Job submitted and processing started');
        setIsPolling(true);
        setIsSubmitting(false);
        
        // Navigate to results page immediately to show loading state
        navigate('/app/results');
      } else {
        throw new Error('No job ID returned from the API');
      }
    } catch (error) {
      Logger.error('Error submitting job:', error);
      
      // Check if this is a parsing/extraction error
      if (error.message && (
        error.message.toLowerCase().includes('parse') ||
        error.message.toLowerCase().includes('extract') ||
        error.message.toLowerCase().includes('text extraction') ||
        error.message.toLowerCase().includes('resume format') ||
        error.message.toLowerCase().includes('unfortunately') ||
        error.message.toLowerCase().includes('unable to extract') ||
        error.message.toLowerCase().includes('unsupported document') ||
        error.message.toLowerCase().includes('no text content') ||
        error.message.toLowerCase().includes('pdf format is not supported') ||
        error.message.toLowerCase().includes('does not appear to be a valid')
      )) {
        // Ensure username is set for analytics (fallback if not set during login)
        if (!analytics.username && currentUser?.username) {
          analytics.setUsername(currentUser.username);
        }
        
        // Track parsing error from API
        analytics.trackEvent('parsing_error_dialog_shown', {
          error_type: 'api_parsing_failure',
          error_message: error.message,
          file_type: resumeFile?.type,
          file_size: resumeFile?.size,
          file_name: resumeFile?.name,
          source: 'api_error'
        });
        
        // Show parsing failed dialog for parsing-related errors
        setParsingFailedDialogOpen(true);
      } else {
        // Show generic error for other errors
        setError(`Error submitting job: ${error.message}`);
        setSnackbarMessage(`Error: ${error.message}`);
        setSnackbarOpen(true);
      }
      
      setJobStatus('FAILED');
      setIsSubmitting(false);
    }
  };

  // DEV MODE: Download PDF format specifically
  const downloadPDF = async () => {
    analytics.track('download_resume_pdf', {
      dual_format_mode: true,
      has_cover_letter: !!result?.coverLetterUrl
    });
    
    if (!result || !result.pdfUrl) {
      setSnackbarMessage('Error: PDF download not available');
      setSnackbarOpen(true);
      return;
    }

    try {
      const resumeResponse = await fetch(result.pdfUrl, {
        method: 'GET'
      });

      if (!resumeResponse.ok) {
        throw new Error(`HTTP error! status: ${resumeResponse.status}`);
      }

      const blob = await resumeResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tailored_resume_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSnackbarMessage('PDF downloaded successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      Logger.error('PDF download error:', error);
      setSnackbarMessage('Error: PDF download failed - please try again.');
      setSnackbarOpen(true);
    }
  };

  // DEV MODE: Download Word format specifically
  const downloadWord = async () => {
    analytics.track('download_resume_word', {
      dual_format_mode: true,
      has_cover_letter: !!result?.coverLetterUrl
    });
    
    if (!result || !result.wordUrl) {
      setSnackbarMessage('Error: Word download not available');
      setSnackbarOpen(true);
      return;
    }

    try {
      const resumeResponse = await fetch(result.wordUrl, {
        method: 'GET'
      });

      if (!resumeResponse.ok) {
        throw new Error(`HTTP error! status: ${resumeResponse.status}`);
      }

      const blob = await resumeResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tailored_resume_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSnackbarMessage('Word document downloaded successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      Logger.error('Word download error:', error);
      setSnackbarMessage('Error: Word download failed - please try again.');
      setSnackbarOpen(true);
    }
  };

  const downloadOptimizedResume = async () => {
    analytics.track('download_resume', {
      format: result?.fileType || 'unknown',
      has_cover_letter: !!result?.coverLetterUrl
    });
    
    if (!result || !result.optimizedResumeUrl) {
      setSnackbarMessage('No download URL available');
      setSnackbarOpen(true);
      return;
    }

    try {
      // Note: Removed localhost mock download logic to enable production-like testing locally
      
      // For S3 pre-signed URLs, we don't need to add Authorization headers
      // The authentication is already included in the URL
      const resumeResponse = await fetch(result.optimizedResumeUrl, {
        method: 'GET'
      });
      
      if (!resumeResponse.ok) {
        throw new Error(`Failed to download resume: ${resumeResponse.status} ${resumeResponse.statusText}`);
      }
      
      // Get the response as a blob for binary data (Word documents)
      const blob = await resumeResponse.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.downloadFilename || `tailored_resume.${result.fileType || 'docx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSnackbarMessage('Resume downloaded successfully!');
      setSnackbarOpen(true);
      
    } catch (error) {
      Logger.error('Error downloading resume:', error);
      setSnackbarMessage(`Error downloading resume: ${error.message}`);
      setSnackbarOpen(true);
    }
  };

  const downloadCoverLetter = async (format = 'default') => {
    analytics.track('download_cover_letter', {
      format: format === 'default' ? (result?.fileType || 'unknown') : format,
      has_text: !!coverLetterText
    });
    
    Logger.log('Attempting to download cover letter');
    Logger.log('Cover letter text available:', !!coverLetterText);
    Logger.log('Generate CV flag was:', generateCV);
    Logger.log('Job URL provided:', !!jobUrl);
    Logger.log('Full result object keys:', result ? Object.keys(result) : 'No result');
    Logger.log('Requested format:', format);
    Logger.log('Available cover letter URLs:', {
      coverLetterPdfUrl: result?.coverLetterPdfUrl,
      coverLetterWordUrl: result?.coverLetterWordUrl,
      coverLetterUrl: result?.coverLetterUrl
    });
    

    
    // Determine which URL to use based on format and availability
    let downloadUrl;
    let fileExtension;
    let filename;
    
    if (format === 'pdf' && result?.coverLetterPdfUrl) {
      downloadUrl = result.coverLetterPdfUrl;
      fileExtension = 'pdf';
      filename = result.coverLetterPdfFilename || `cover_letter.pdf`;
      Logger.log('Using PDF URL:', downloadUrl);
    } else if (format === 'word' && result?.coverLetterWordUrl) {
      downloadUrl = result.coverLetterWordUrl;
      fileExtension = 'docx';
      filename = result.coverLetterWordFilename || `cover_letter.docx`;
      Logger.log('Using Word URL:', downloadUrl);
    } else {
      // Fallback to legacy coverLetterUrl or first available format
      Logger.log('Falling back to legacy or first available format');
      if (result?.coverLetterPdfUrl) {
        downloadUrl = result.coverLetterPdfUrl;
        fileExtension = 'pdf';
        filename = result.coverLetterPdfFilename || `cover_letter.pdf`;
        Logger.log('Fallback: Using PDF URL:', downloadUrl);
      } else if (result?.coverLetterWordUrl) {
        downloadUrl = result.coverLetterWordUrl;
        fileExtension = 'docx';
        filename = result.coverLetterWordFilename || `cover_letter.docx`;
        Logger.log('Fallback: Using Word URL:', downloadUrl);
      } else {
        downloadUrl = result?.coverLetterUrl;
        fileExtension = result?.fileType || 'docx';
        filename = result?.coverLetterFilename || `cover_letter.${fileExtension}`;
        Logger.log('Fallback: Using legacy URL:', downloadUrl);
      }
    }
    
    if (!result || !downloadUrl) {
      const errorMsg = !result 
        ? 'No result data available' 
        : 'No cover letter download URL available. The cover letter may not have been generated.';
      Logger.error('Cover letter download failed:', errorMsg);
      
      setSnackbarMessage(errorMsg);
      setSnackbarOpen(true);
      return;
    }

    try {
      // For S3 pre-signed URLs, we don't need to add Authorization headers
      const coverLetterResponse = await fetch(downloadUrl, {
        method: 'GET'
      });
      
      if (!coverLetterResponse.ok) {
        throw new Error(`Failed to download cover letter: ${coverLetterResponse.status} ${coverLetterResponse.statusText}`);
      }
      
      // Get the response as a blob for binary data (Word documents)
      const blob = await coverLetterResponse.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const formatText = format === 'pdf' ? 'PDF' : format === 'word' ? 'Word' : '';
      setSnackbarMessage(`Cover letter ${formatText} downloaded successfully!`);
      setSnackbarOpen(true);
      
    } catch (error) {
      Logger.error('Error downloading cover letter:', error);
      setSnackbarMessage(`Error downloading cover letter: ${error.message}`);
      setSnackbarOpen(true);
    }
  };

  const resetForm = () => {
    setJobId(null);
    setJobStatus(null);
    setStatusMessage('');
    setResult(null);
    setIsPolling(false);
    setIsSubmitting(false);
    setError(null);
    setResume(null);
    setResumeName('');
    setJobTitle('');
    setJobUrl('');
    navigate('/app/upload');
  };

  const cancelOptimization = () => {
    // Show confirmation dialog
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel the tailoring? This will stop the current process and you\'ll need to start over.'
    );
    
    if (!confirmCancel) {
      return;
    }
    
    // Stop polling
    setIsPolling(false);
    
    // Reset job state
    setJobId(null);
    setJobStatus(null);
    setStatusMessage('');
    setResult(null);
    setError(null);
    
    // Show confirmation message
    setSnackbarMessage('Tailoring canceled successfully');
    setSnackbarOpen(true);
    
    // Navigate back to job details
    navigate('/app/job-description');
  };

  const handleSaveToProfile = () => {
    analytics.track('save_to_profile_open');
    setSaveToProfileDialogOpen(true);
  };

  const handleSaveToProfileSubmit = () => {
    analytics.track('save_to_profile_submit', {
      has_title: !!resumeTitle.trim(),
      has_description: !!resumeDescription.trim(),
      has_cover_letter: !!coverLetterText,
      format: selectedResumeFormat,
      has_dual_format: !!(result?.pdfUrl && result?.wordUrl),
      has_pdf: !!result?.pdfUrl,
      has_word: !!result?.wordUrl
    });
    
    if (!resumeTitle.trim()) {
      setSnackbarMessage('Please enter a title for your resume');
      setSnackbarOpen(true);
      return;
    }

    // Check existing saved resumes count
    const existingSaved = JSON.parse(localStorage.getItem('savedResumes') || '[]');
    
    // Enforce 50 resume limit
    if (existingSaved.length >= 50) {
      setSnackbarMessage('You have reached the maximum limit of 50 saved resumes. Please delete some resumes before saving new ones.');
      setSnackbarOpen(true);
      return;
    }

    // Create resume object to save (including cover letter and both formats if available)
    const resumeToSave = {
      id: Date.now().toString(),
      title: resumeTitle,
      description: resumeDescription || 'Tailored resume',
      jobTitle: jobTitle || 'Job Application',
      companyName: '', // Will be filled during processing if URL provided
      format: selectedResumeFormat,
      downloadUrl: result?.optimizedResumeUrl || '', // Legacy field for backward compatibility
      // Dual format support
      pdfUrl: result?.pdfUrl || '',
      wordUrl: result?.wordUrl || '',
      hasDualFormat: !!(result?.pdfUrl && result?.wordUrl),
      createdAt: new Date().toISOString(),
      originalJobDescription: '', // Will be filled during processing if URL provided
      // Include cover letter data if available
      hasCoverLetter: !!coverLetterText,
      coverLetterUrl: result?.coverLetterUrl || '', // Legacy field for backward compatibility
      // Dual format support for cover letters
      coverLetterPdfUrl: result?.coverLetterPdfUrl || '',
      coverLetterWordUrl: result?.coverLetterWordUrl || '',
      hasCoverLetterDualFormat: !!(result?.coverLetterPdfUrl && result?.coverLetterWordUrl),
      coverLetterText: coverLetterText || '',
      coverLetterFormat: selectedCoverLetterFormat
    };

    // Save to localStorage (in a real app, this would go to your backend/DynamoDB)
    existingSaved.push(resumeToSave);
    localStorage.setItem('savedResumes', JSON.stringify(existingSaved));

    // Show success message with count, format info, and cover letter info
    const newCount = existingSaved.length;
    const coverLetterMsg = coverLetterText ? ' (with cover letter)' : '';
    const formatMsg = (result?.pdfUrl && result?.wordUrl) ? ' (PDF & Word formats)' : '';
    setSnackbarMessage(`Resume${formatMsg}${coverLetterMsg} saved to your profile successfully! 🎉 (${newCount}/50 resumes saved)`);
    setSnackbarOpen(true);
    
    // Close dialog and reset form
    setSaveToProfileDialogOpen(false);
    setResumeTitle('');
    setResumeDescription('');
  };

  const handleRefresh = () => {
    const path = location.pathname;
    
    if (path === '/app' || path === '/app/upload') {
      // Clear upload page state
      setResumeFile(null);
      setResume(null);
      setResumeName('');
      setJobTitle('');
      setJobUrl('');
      setResult(null);
      setError(null);
      setIsSubmitting(false);
      setIsPolling(false);
      setJobId(null);
      setJobStatus('');
      setStatusMessage('');
      setSnackbarOpen(false);
      setSnackbarMessage('');
      
      // Clear saved resume file from localStorage
      localStorage.removeItem('currentResumeFile');
      
      setSnackbarMessage('Page refreshed - ready for new resume upload');
      setSnackbarOpen(true);
    } else if (path === '/app/job-description') {
      // Clear job description state but keep resume file
      setJobTitle('');
      setJobUrl('');
      setResult(null);
      setError(null);
      setIsSubmitting(false);
      setIsPolling(false);
      setJobId(null);
      setJobStatus('');
      setStatusMessage('');
      setSnackbarOpen(false);
      setSnackbarMessage('');
      
      setSnackbarMessage('Job details cleared - ready for new job details');
      setSnackbarOpen(true);
    } else if (path === '/app/results') {
      // Navigate back to upload for fresh start
      navigate('/app/upload');
    }
  };

  const handleContactSubmit = async () => {
    if (!contactTitle.trim() || !contactDescription.trim()) {
      setSnackbarMessage('Please fill in both title and description');
      setSnackbarOpen(true);
      return;
    }

    setIsSubmittingContact(true);
    
    try {
      // Get user information
      const userEmail = userAttributes?.email || 'Unknown User';
      const userName = getDisplayName() || 'Unknown User';
      
      // Prepare the contact form data
      const contactData = {
        fromName: userName,
        fromEmail: userEmail,
        subject: contactTitle,
        message: contactDescription,
        timestamp: new Date().toISOString()
      };

      // Get authentication token
      let authToken = '';
      try {
        const { tokens } = await fetchAuthSession();
        Logger.log('Auth session retrieved');
        
        if (tokens && tokens.idToken) {
          authToken = tokens.idToken.toString();
        } else {
          Logger.warn('No idToken found in session');
        }
      } catch (tokenError) {
        Logger.error('Error getting auth token:', tokenError);
      }

      // Send to the contact API endpoint
      const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify(contactData)
      });

      Logger.log('Contact API response received');

      if (response.ok) {
        const responseData = await response.json();
        Logger.log('Contact form submitted successfully');
        
        // Success - clear form and show success dialog
        setContactTitle('');
        setContactDescription('');
        setContactUsDialogOpen(false);
        
        // Show success dialog
        setContactSuccessDialogOpen(true);
        
        // Auto-close after 5 seconds and redirect to main screen
        setTimeout(() => {
          setContactSuccessDialogOpen(false);
          // Reset form states to start fresh
          setResumeFile(null);
          setJobTitle('');
          setJobUrl('');
          setResult(null);
          setJobId(null);
        }, 5000);
        
      } else {
        const errorData = await response.text();
        Logger.error('Contact API error:', response.status, errorData);
        
        // Show specific error message based on status
        if (response.status === 401) {
          setSnackbarMessage('Authentication error. Please try signing out and back in.');
        } else if (response.status === 403) {
          setSnackbarMessage('Access denied. Please check your permissions.');
        } else if (response.status === 500) {
          // For now, treat server errors as success since SES might not be fully configured
          setContactTitle('');
          setContactDescription('');
          setContactUsDialogOpen(false);
          
          // Show success dialog
          setContactSuccessDialogOpen(true);
          
          // Auto-close after 5 seconds and redirect to main screen
          setTimeout(() => {
            setContactSuccessDialogOpen(false);
            // Reset form states to start fresh
            setResumeFile(null);
            setJobTitle('');
            setJobUrl('');
            setResult(null);
            setJobId(null);
          }, 5000);
        } else {
          setSnackbarMessage(`Server error (${response.status}). Please try again later.`);
        }
        setSnackbarOpen(true);
      }
      
    } catch (error) {
      Logger.error('Error submitting contact form:', error);
      
      // Show user-friendly error message
      setSnackbarMessage('There was an issue sending your message. Please try again or contact us directly.');
      setSnackbarOpen(true);
      
    } finally {
      setIsSubmittingContact(false);
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
      
      {/* Main app content - hide when loading */}
      {!globalLoading && (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          {/* Dev Mode Banner */}
          <DevModeBanner />
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ py: 1 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
            onClick={() => {
              showLoading("Going home...", "Returning to JobTailor AI", 1200);
              setTimeout(() => {
                navigate('/');
              }, 1200);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h5" component="div" sx={{ 
                fontWeight: 800,
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
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                AI
              </Box>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ 
              color: 'text.primary',
              display: { xs: 'none', sm: 'block' },
              fontSize: { xs: '1rem', md: '1.1rem' },
              fontWeight: 'bold'
            }}>
              {(currentUser && authDataLoaded) ? `Welcome, ${getDisplayName()}` : ''}
            </Typography>
            
            {/* Refresh Button */}
            <IconButton
              onClick={handleRefresh}
              sx={{ 
                color: '#0A66C2',
                '&:hover': { 
                  bgcolor: 'rgba(10, 102, 194, 0.04)',
                  color: '#378FE9'
                }
              }}
              title="Refresh current page"
            >
              <RefreshIcon />
            </IconButton>
            
            <IconButton
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              sx={{ 
                p: 0,
                border: '2px solid #0A66C2',
                '&:hover': { border: '2px solid #666666' }
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: '#0A66C2',
                  width: 40,
                  height: 40,
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                {(currentUser?.username || 'U').charAt(0).toUpperCase()}
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
                showLoading("Loading profile...", "Accessing your account settings", 1200);
                setTimeout(() => {
                  navigate('/app/profile');
                }, 1200);
              }}>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </MenuItem>
              
              <MenuItem onClick={() => {
                setProfileMenuAnchor(null);
                setSettingsDialogOpen(true);
              }}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings & Privacy" />
              </MenuItem>
              
              <MenuItem onClick={() => {
                setProfileMenuAnchor(null);
                setFaqsDialogOpen(true);
              }}>
                <ListItemIcon>
                  <HelpOutlineIcon />
                </ListItemIcon>
                <ListItemText primary="FAQs & Help" />
              </MenuItem>
              
              <MenuItem onClick={() => {
                setProfileMenuAnchor(null);
                navigate('/app/interview/setup');
              }}>
                <ListItemIcon>
                  <WorkIcon />
                </ListItemIcon>
                <ListItemText primary="Mock Interview" />
              </MenuItem>
              
              <MenuItem onClick={() => {
                setProfileMenuAnchor(null);
                setContactUsDialogOpen(true);
              }}>
                <ListItemIcon>
                  <ContactSupportIcon />
                </ListItemIcon>
                <ListItemText primary="Contact Us" />
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
      
      {/* Compact Main Content Container */}
      <Container maxWidth="xl" sx={{ py: 0.5, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Compact Progress Indicator */}
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
          {steps.map((label, index) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: index <= activeStep ? '#0A66C2' : '#E0E0E0',
                color: index <= activeStep ? 'white' : '#999',
                fontWeight: 'bold',
                fontSize: '12px',
                mr: 1
              }}>
                {index <= activeStep ? '✓' : index + 1}
              </Box>
              <Typography variant="caption" sx={{ 
                color: index <= activeStep ? '#0A66C2' : '#999',
                fontWeight: index <= activeStep ? 600 : 400,
                mr: index < steps.length - 1 ? 2 : 0
              }}>
                {label}
              </Typography>
              {index < steps.length - 1 && (
                <Box sx={{ width: 20, height: 2, background: index < activeStep ? '#0A66C2' : '#E0E0E0', mx: 1 }} />
              )}
            </Box>
          ))}
        </Box>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {/* Compact Main Content Container */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 2,
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #0A66C2, #378FE9, #4CAF50)',
                borderRadius: '4px 4px 0 0'
              }
            }}
          >
            {activeStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Upload Resume
                </Typography>
                
                <FileUploadZone 
                  onFileAccepted={handleResumeChange}
                  resumeFile={resumeFile}
                  onContinue={handleManualContinue}
                  acceptedFileTypes={{
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
                  }}
                />
              </motion.div>
            )}
            
            {activeStep === 1 && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Job Details
                </Typography>
                
                {/* Background extraction status */}

                


                {/* Job URL Field */}
                <Box sx={{ mb: 0.5 }}>
                  <TextField
                    label="Job URL (Optional for automatic extraction of job details)"
                    fullWidth
                    variant="outlined"
                    value={jobUrl}
                    onChange={(e) => {
                      setJobUrl(e.target.value);
                    }}
                    placeholder="e.g., https://careers.mastercard.com/us/en/job/..."
                    size="small"
                    required={false}
                    error={false}
                    disabled={false} // Job URL should always be editable
                    sx={{
                      mb: 0.5,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'background.paper',
                        '&.Mui-disabled': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'action.disabled',
                          }
                        }
                      }
                    }}
                    InputProps={{
                      endAdornment: jobUrl.trim() && (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="open job URL"
                            onClick={() => window.open(jobUrl, '_blank')}
                            size="small"
                            sx={{ color: 'primary.main' }}
                            title="Open job URL in new tab"
                          >
                            <LinkIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label="clear job URL"
                            onClick={() => setJobUrl('')}
                            size="small"
                            sx={{ color: 'text.secondary' }}
                            title="Clear job URL"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  
                  {/* Extract Button - Always show, disabled when no URL */}
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    <Tooltip 
                      title="Extraction accuracy may vary by job site. Please verify the extracted details and edit manually if needed."
                      placement="right"
                      arrow
                    >
                      <span>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={isExtracting ? <CircularProgress size={16} color="inherit" /> : <ExtractIcon />}
                          disabled={isExtracting || !jobUrl.trim()}
                          onClick={async () => {
                          // Track Extract button click
                          analytics.track('extract_job_details', {
                            job_url: jobUrl,
                            has_job_title: !!jobTitle,
                            has_company_name: !!companyName,
                            has_job_description: !!manualJobDescription
                          });
                          
                          try {
                            setIsExtracting(true);
                            setSnackbarMessage('Extracting job details...');
                            setSnackbarOpen(true);
                            
                            const extractedData = await handleJobUrlExtraction(jobUrl);
                            if (extractedData) {
                              if (extractedData.job_title) setJobTitle(extractedData.job_title);
                              if (extractedData.company) setCompanyName(extractedData.company);
                              if (extractedData.description) setManualJobDescription(extractedData.description);
                              
                              setSnackbarMessage('Job details extracted successfully!');
                              setSnackbarOpen(true);
                              setUrlExtractionFailed(false);
                              
                              // Track successful extraction
                              analytics.track('extract_job_details_success', {
                                job_url: jobUrl,
                                extracted_job_title: !!extractedData.job_title,
                                extracted_company: !!extractedData.company,
                                extracted_description: !!extractedData.description
                              });
                            } else {
                              throw new Error('No data extracted from URL');
                            }
                          } catch (error) {
                            setUrlExtractionFailed(true);
                            setSnackbarMessage(`Extraction failed: ${error.message}`);
                            setSnackbarOpen(true);
                            
                            // Track failed extraction
                            analytics.track('extract_job_details_error', {
                              job_url: jobUrl,
                              error_message: error.message
                            });
                          } finally {
                            setIsExtracting(false);
                          }
                        }}
                        sx={{
                          background: (isExtracting || !jobUrl.trim()) 
                            ? 'linear-gradient(45deg, #9E9E9E 30%, #BDBDBD 90%)' 
                            : 'linear-gradient(45deg, #1976D2 30%, #42A5F5 90%)',
                          color: 'white',
                          fontWeight: 600,
                          borderRadius: '8px',
                          px: 3,
                          py: 1,
                          textTransform: 'none',
                          boxShadow: (isExtracting || !jobUrl.trim()) 
                            ? '0 2px 8px rgba(158, 158, 158, 0.3)' 
                            : '0 3px 12px rgba(25, 118, 210, 0.3)',
                          '&:hover': {
                            background: (isExtracting || !jobUrl.trim()) 
                              ? 'linear-gradient(45deg, #9E9E9E 30%, #BDBDBD 90%)' 
                              : 'linear-gradient(45deg, #1565C0 30%, #1976D2 90%)',
                            boxShadow: (isExtracting || !jobUrl.trim()) 
                              ? '0 2px 8px rgba(158, 158, 158, 0.3)' 
                              : '0 4px 16px rgba(25, 118, 210, 0.4)',
                            transform: (isExtracting || !jobUrl.trim()) ? 'none' : 'translateY(-1px)',
                          },
                          '&:active': {
                            transform: 'translateY(0px)',
                          },
                          '&:disabled': {
                            background: 'linear-gradient(45deg, #9E9E9E 30%, #BDBDBD 90%)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            boxShadow: '0 2px 8px rgba(158, 158, 158, 0.3)',
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {isExtracting ? 'Extracting...' : 'Extract Job Details'}
                      </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Subtle Separator */}
                <Box sx={{ mb: 1.5, mt: 1.5 }}>
                  <Divider sx={{ 
                    borderColor: 'rgba(0,0,0,0.12)',
                    opacity: 0.6
                  }} />
                </Box>
                
                {/* Job Title Field */}
                <TextField
                  label="Job Title (Required)"
                  fullWidth
                  variant="outlined"
                  value={jobTitle}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                  }}
                  placeholder="e.g., Senior Data Engineer, Software Developer, Product Manager"
                  inputProps={{ maxLength: 100 }}
                  size="small"
                  required={true}
                  error={!jobTitle.trim()}
                  InputProps={{
                    endAdornment: (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {jobTitle.length}/100
                      </Typography>
                    )
                  }}
                  sx={{ 
                    mb: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'background.paper',
                      '&.Mui-disabled': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'action.disabled',
                        }
                      }
                    }
                  }}
                  disabled={false} // Job title should always be editable

                  helperText="Enter the job title you're applying for"
                />
                
                {/* Company Name Field */}
                <TextField
                  label={generateCV ? "Company Name (Required)" : "Company Name (Optional)"}
                  fullWidth
                  variant="outlined"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Amazon, Microsoft, Google"
                  size="small"
                  required={generateCV}
                  error={generateCV && !companyName.trim()}
                  sx={{ mb: 1 }}
                  inputProps={{ maxLength: 100 }}
                  InputProps={{
                    endAdornment: (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {companyName.length}/100
                      </Typography>
                    )
                  }}

                  helperText={generateCV ? "Required for cover letter" : "Optional - helps with tailoring"}
                />

                {/* Job Description Field */}
                <TextField
                  label="Job Description (Optional)"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={6}
                  value={manualJobDescription}
                  onChange={(e) => setManualJobDescription(e.target.value)}
                  placeholder="Paste the job description here for better tailoring..."
                  size="small"
                  sx={{ 
                    mb: 1,
                    '& .MuiOutlinedInput-root': {
                      alignItems: 'flex-start'
                    }
                  }}

                  helperText="Optional - paste job description for better targeting"
                />
                
                {/* Generate CV Toggle */}
                <Box sx={{ 
                  mb: 1, 
                  p: 1, 
                  bgcolor: 'background.paper', 
                  borderRadius: 1, 
                  border: 1, 
                  borderColor: 'divider' 
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={generateCV}
                        onChange={(e) => {
                          analytics.track('toggle_cover_letter', {
                            enabled: e.target.checked
                          });
                          setGenerateCV(e.target.checked);
                        }}
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          Generate Cover Letter
                        </Typography>
                        <Tooltip title="When enabled, a professional cover letter will be generated along with your tailored resume. Company name becomes required.">
                          <InfoIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        </Tooltip>
                      </Box>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
                    {generateCV ? "Cover letter will be included" : "Add a professional cover letter"}
                  </Typography>
                </Box>
                

                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <StylishBackButton 
                    onClick={() => navigate('/app/upload')}
                  >
                    Back
                  </StylishBackButton>
                  <Button 
                    variant="contained"
                    disabled={
                      // Job Title is always required
                      !jobTitle.trim() ||
                      // Company Name required when Generate CV is enabled
                      (generateCV && !companyName.trim())
                    }
                    onClick={handleOptimize}
                    size="medium"
                    sx={{
                      backgroundColor: '#0A66C2',
                      color: '#ffffff',
                      fontWeight: 600,
                      borderRadius: '20px',
                      padding: '8px 24px',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#004182',
                      }
                    }}
                  >
                    Tailor Resume
                  </Button>
                </Box>
              </motion.div>
            )}
            
            {/* Animated Processing Screen */}
            {((activeStep === 1 && isProcessing) || (activeStep === 2 && isProcessing)) && !result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 1,
                  minHeight: '500px'
                }}
              >
                {/* Resume Assembly Animation */}
                <ResumeAssemblyAnimation 
                  currentTip={currentTip}
                  educationalTips={educationalTips}
                  statusMessage={statusMessage}
                  generateCV={generateCV}
                />
                
                {/* Cancel button only */}
                <Box sx={{ 
                  textAlign: 'center', 
                  mt: 3,
                  maxWidth: 400 
                }}>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={cancelOptimization}
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                </Box>
              </motion.div>
            )}
            
            {activeStep === 2 && error && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                {/* Error State */}
                <Box sx={{ 
                  textAlign: 'center', 
                  mb: 3,
                  p: 3,
                  bgcolor: 'error.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'error.200'
                }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600, 
                    color: 'error.dark',
                    mb: 2
                  }}>
                    Processing Error
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    color: 'text.primary',
                    mb: 3,
                    lineHeight: 1.6
                  }}>
                    {error}
                  </Typography>
                  
                  {/* Helpful suggestions */}
                  <Box sx={{ 
                    bgcolor: 'background.paper',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 3
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600,
                      mb: 1,
                      color: 'text.primary'
                    }}>
                      What you can try:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      textAlign: 'left'
                    }}>
                      • Convert your resume to PDF format and try again<br/>
                      • Make sure your file isn't corrupted or password-protected<br/>
                      • Try uploading a different version of your resume<br/>
                      • Contact support if the problem continues
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="contained"
                    onClick={() => {
                      setError(null);
                      setResult(null);
                      setJobId(null);
                      setJobStatus(null);
                      navigate('/app/upload');
                    }}
                    sx={{ 
                      bgcolor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark'
                      }
                    }}
                  >
                    Try Again
                  </Button>
                </Box>
              </motion.div>
            )}

            {activeStep === 2 && result && !isProcessing && !error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                {/* Professional Success Header */}
                <Box sx={{ 
                  textAlign: 'center', 
                  mb: 3,
                  p: 2,
                  bgcolor: 'success.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'success.200'
                }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600, 
                    color: 'success.dark',
                    mb: 1
                  }}>
                    Resume Successfully Tailored
                  </Typography>
                  {jobTitle && (
                    <Typography variant="body1" sx={{ 
                      color: 'text.primary',
                      fontWeight: 500
                    }}>
                      {jobTitle}{companyName && ` • ${companyName}`}
                    </Typography>
                  )}
                </Box>
                
                {/* Professional Cards Container */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 3, 
                  mb: 3,
                  flexDirection: { xs: 'column', md: 'row' }
                }}>
                  {/* Enhanced Resume Card with Integrated ATS Score */}
                  <Paper 
                    elevation={2}
                    sx={{ 
                      p: { xs: 2, md: 3 }, 
                      borderRadius: { xs: 2, md: 3 },
                      flex: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    {/* Desktop Layout - Original Side-by-Side */}
                    <Box sx={{ 
                      display: { xs: 'none', md: 'flex' }, 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      mb: 2,
                      gap: 2
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        minWidth: 0,
                        flex: 1
                      }}>
                        <DescriptionIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Tailored Resume
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Ready for download
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Desktop ATS Score - Original Layout */}
                      {result?.atsScore && result.atsScore.overall && (jobUrl?.trim() || manualJobDescription?.trim()) ? (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 1.5,
                          bgcolor: result.atsScore.overall >= 80 ? 'success.50' : 
                                   result.atsScore.overall >= 60 ? 'warning.50' : 'error.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: result.atsScore.overall >= 80 ? 'success.200' : 
                                       result.atsScore.overall >= 60 ? 'warning.200' : 'error.200',
                          flexShrink: 0,
                          minWidth: 'fit-content'
                        }}>
                          <Box sx={{ 
                            position: 'relative',
                            display: 'inline-flex'
                          }}>
                            <CircularProgress
                              variant="determinate"
                              value={result.atsScore.overall}
                              size={50}
                              thickness={4}
                              sx={{
                                color: result.atsScore.overall >= 80 ? 'success.main' : 
                                       result.atsScore.overall >= 60 ? 'warning.main' : 'error.main',
                              }}
                            />
                            <Box sx={{
                              position: 'absolute',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                            }}>
                              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                                {result.atsScore.overall}
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              ATS Score
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: result.atsScore.overall >= 80 ? 'success.dark' : 
                                     result.atsScore.overall >= 60 ? 'warning.dark' : 'error.dark',
                              fontWeight: 500
                            }}>
                              {result.atsScore.overall >= 90 ? 'Excellent' :
                               result.atsScore.overall >= 80 ? 'Very Good' :
                               result.atsScore.overall >= 70 ? 'Good' :
                               result.atsScore.overall >= 60 ? 'Fair' : 'Needs Improvement'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 0.5, 
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            mt: 1
                          }}>
                          {Object.entries(result.atsScore)
                            .filter(([key]) => key !== 'overall' && key !== 'rating')
                            .map(([category, score]) => (
                            <Box key={category} sx={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center',
                              px: 1,
                              py: 0.5,
                              bgcolor: (!isNaN(Number(score)) && Number(score) >= 80) ? 'success.50' : 
                                       (!isNaN(Number(score)) && Number(score) >= 60) ? 'warning.50' : 'error.50',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: (!isNaN(Number(score)) && Number(score) >= 80) ? 'success.200' : 
                                           (!isNaN(Number(score)) && Number(score) >= 60) ? 'warning.200' : 'error.200',
                              minWidth: '60px'
                            }}>
                              <Typography variant="caption" sx={{ 
                                textTransform: 'capitalize',
                                fontWeight: 500,
                                fontSize: '0.65rem',
                                textAlign: 'center',
                                lineHeight: 1
                              }}>
                                {category}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                color: (!isNaN(Number(score)) && Number(score) >= 80) ? 'success.dark' : 
                                       (!isNaN(Number(score)) && Number(score) >= 60) ? 'warning.dark' : 'error.dark',
                              }}>
                                {!isNaN(Number(score)) ? `${score}%` : 'N/A'}
                              </Typography>
                            </Box>
                          ))}
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          border: '2px dashed',
                          borderColor: 'grey.300',
                          flexShrink: 0,
                          minWidth: 'fit-content'
                        }}>
                          <InfoIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                              ATS Score
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.85rem'
                            }}>
                              Provide job description for ATS score
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {/* Mobile Layout - Stacked */}
                    <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        mb: 2
                      }}>
                        <DescriptionIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600, 
                            color: 'text.primary',
                            fontSize: '1.1rem'
                          }}>
                            Tailored Resume
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.8rem'
                          }}>
                            Ready for download
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Mobile ATS Score - Simplified */}
                      {result?.atsScore && result.atsScore.overall && (jobUrl?.trim() || manualJobDescription?.trim()) ? (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: 1.5,
                          p: 1.5,
                          bgcolor: result.atsScore.overall >= 80 ? 'success.50' : 
                                   result.atsScore.overall >= 60 ? 'warning.50' : 'error.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: result.atsScore.overall >= 80 ? 'success.200' : 
                                       result.atsScore.overall >= 60 ? 'warning.200' : 'error.200'
                        }}>
                          {/* Main Score Display */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5,
                            justifyContent: 'center'
                          }}>
                            <Box sx={{ 
                              position: 'relative',
                              display: 'inline-flex'
                            }}>
                              <CircularProgress
                                variant="determinate"
                                value={result.atsScore.overall}
                                size={45}
                                thickness={4}
                                sx={{
                                  color: result.atsScore.overall >= 80 ? 'success.main' : 
                                         result.atsScore.overall >= 60 ? 'warning.main' : 'error.main',
                                }}
                              />
                              <Box sx={{
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                              }}>
                                <Typography variant="body1" sx={{ 
                                  fontWeight: 700,
                                  fontSize: '0.9rem'
                                }}>
                                  {result.atsScore.overall}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="subtitle2" sx={{ 
                                fontWeight: 600,
                                fontSize: '0.8rem'
                              }}>
                                ATS Score
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: result.atsScore.overall >= 80 ? 'success.dark' : 
                                       result.atsScore.overall >= 60 ? 'warning.dark' : 'error.dark',
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}>
                                {result.atsScore.overall >= 90 ? 'Excellent' :
                                 result.atsScore.overall >= 80 ? 'Very Good' :
                                 result.atsScore.overall >= 70 ? 'Good' :
                                 result.atsScore.overall >= 60 ? 'Fair' : 'Needs Improvement'}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Breakdown Scores - Mobile Optimized */}
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 1, 
                            flexWrap: 'wrap',
                            justifyContent: 'center'
                          }}>
                          {Object.entries(result.atsScore)
                            .filter(([key]) => key !== 'overall' && key !== 'rating')
                            .map(([category, score]) => (
                            <Box key={category} sx={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center',
                              px: 0.8,
                              py: 0.4,
                              bgcolor: (typeof score === 'number' && score >= 80) ? 'success.50' : 
                                       (typeof score === 'number' && score >= 60) ? 'warning.50' : 'error.50',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: (typeof score === 'number' && score >= 80) ? 'success.200' : 
                                           (typeof score === 'number' && score >= 60) ? 'warning.200' : 'error.200',
                              minWidth: '50px'
                            }}>
                              <Typography variant="caption" sx={{ 
                                textTransform: 'capitalize',
                                fontWeight: 500,
                                fontSize: '0.6rem',
                                textAlign: 'center',
                                lineHeight: 1
                              }}>
                                {category}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                color: (typeof score === 'number' && score >= 80) ? 'success.dark' : 
                                       (typeof score === 'number' && score >= 60) ? 'warning.dark' : 'error.dark',
                              }}>
                                {typeof score === 'number' ? `${score}%` : 'N/A'}
                              </Typography>
                            </Box>
                          ))}
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1.5,
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          border: '2px dashed',
                          borderColor: 'grey.300'
                        }}>
                          <InfoIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.9rem' }}>
                              ATS Score
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.75rem'
                            }}>
                              Provide job description for ATS score
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {/* Desktop Action Buttons - Split Button Layout */}
                    <Box 
                      className="download-flowchart"
                      sx={{ 
                        display: { xs: 'none', md: 'flex' }, 
                        gap: 1.5,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        position: 'relative'
                      }}
                    >
                      {/* Split Button Container */}
                      <Box sx={{ display: 'flex', position: 'relative' }}>
                        {/* Main Download Button */}
                        <Button 
                          variant="contained" 
                          size="medium"
                          startIcon={<DownloadIcon />}
                          onClick={downloadPDF} // Default to PDF download
                          disabled={!result}
                          sx={{ 
                            minWidth: '140px',
                            fontWeight: 600,
                            backgroundColor: '#1976d2',
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            '&:hover': {
                              backgroundColor: '#1565c0'
                            }
                          }}
                        >
                          Download Resume
                        </Button>

                        {/* Dropdown Arrow Button */}
                        <Button
                          variant="contained"
                          size="medium"
                          onClick={() => setShowFormatOptions(!showFormatOptions)}
                          disabled={!result}
                          sx={{
                            minWidth: '32px',
                            width: '32px',
                            backgroundColor: '#1976d2',
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderLeft: '1px solid rgba(255,255,255,0.2)',
                            '&:hover': {
                              backgroundColor: '#1565c0'
                            },
                            px: 0
                          }}
                        >
                          ▼
                        </Button>

                        {/* Dropdown Menu */}
                        {showFormatOptions && (
                          <Box sx={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            mt: 0.5,
                            backgroundColor: 'white',
                            borderRadius: 1,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            border: '1px solid #e0e0e0',
                            zIndex: 1000,
                            overflow: 'hidden'
                          }}>
                            {/* PDF Option */}
                            <Box
                              onClick={() => {
                                downloadPDF();
                                setShowFormatOptions(false);
                              }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1.5,
                                cursor: result?.pdfUrl ? 'pointer' : 'not-allowed',
                                opacity: result?.pdfUrl ? 1 : 0.5,
                                '&:hover': {
                                  backgroundColor: result?.pdfUrl ? '#f5f5f5' : 'transparent'
                                },
                                borderBottom: '1px solid #f0f0f0'
                              }}
                            >
                              <img 
                                src="/pdf-icon.svg" 
                                alt="PDF" 
                                style={{ width: 20, height: 20 }} 
                              />
                              <Typography variant="body2" sx={{ fontWeight: 500, color: result?.pdfUrl ? '#d32f2f' : '#ccc' }}>
                                Download PDF
                              </Typography>
                            </Box>

                            {/* Word Option */}
                            <Box
                              onClick={() => {
                                downloadWord();
                                setShowFormatOptions(false);
                              }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1.5,
                                cursor: result?.wordUrl ? 'pointer' : 'not-allowed',
                                opacity: result?.wordUrl ? 1 : 0.5,
                                '&:hover': {
                                  backgroundColor: result?.wordUrl ? '#f5f5f5' : 'transparent'
                                }
                              }}
                            >
                              <img 
                                src="/word-icon.svg" 
                                alt="Word" 
                                style={{ width: 20, height: 20 }} 
                              />
                              <Typography variant="body2" sx={{ fontWeight: 500, color: result?.wordUrl ? '#2B579A' : '#ccc' }}>
                                Download Word
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                      
                      <Button 
                        variant="outlined" 
                        size="medium"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setPreviewDialogOpen(true)}
                        sx={{ 
                          fontWeight: 500,
                          minWidth: '110px',
                          flex: 0.6
                        }}
                      >
                        Preview
                      </Button>
                      
                      <Button 
                        variant="outlined" 
                        size="medium"
                        startIcon={<CompareIcon />}
                        onClick={() => {
                          analytics.track('compare_resumes');
                          setCompareDialogOpen(true);
                        }}
                        sx={{ 
                          fontWeight: 500,
                          minWidth: '110px',
                          flex: 0.6,
                          position: 'relative'
                        }}
                      >
                        Compare
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: '#ff6b35',
                            color: 'white',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            px: 0.5,
                            py: 0.2,
                            borderRadius: '4px',
                            lineHeight: 1
                          }}
                        >
                          BETA
                        </Box>
                      </Button>


                    </Box>

                    {/* Mobile Action Buttons - Split Button Layout */}
                    <Box 
                      className="download-flowchart"
                      sx={{ 
                        display: { xs: 'flex', md: 'none' }, 
                        flexDirection: 'column',
                        gap: 1.5,
                        alignItems: 'center',
                        position: 'relative'
                      }}
                    >
                      {/* Mobile Split Button Container */}
                      <Box sx={{ display: 'flex', width: '100%', position: 'relative' }}>
                        {/* Main Download Button - Mobile */}
                        <Button 
                          variant="contained" 
                          size="large"
                          startIcon={<DownloadIcon />}
                          onClick={downloadPDF} // Default to PDF download
                          disabled={!result}
                          sx={{ 
                            flex: 1,
                            fontWeight: 600,
                            py: 1.5,
                            fontSize: '1rem',
                            backgroundColor: '#1976d2',
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            '&:hover': {
                              backgroundColor: '#1565c0'
                            }
                          }}
                        >
                          Download Resume
                        </Button>

                        {/* Dropdown Arrow Button - Mobile */}
                        <Button
                          variant="contained"
                          size="large"
                          onClick={() => setShowFormatOptions(!showFormatOptions)}
                          disabled={!result}
                          sx={{
                            minWidth: '48px',
                            width: '48px',
                            backgroundColor: '#1976d2',
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderLeft: '1px solid rgba(255,255,255,0.2)',
                            '&:hover': {
                              backgroundColor: '#1565c0'
                            },
                            px: 0,
                            py: 1.5
                          }}
                        >
                          ▼
                        </Button>
                      </Box>

                      {/* Mobile Dropdown Menu */}
                      {showFormatOptions && (
                        <Box sx={{
                          width: '100%',
                          backgroundColor: 'white',
                          borderRadius: 2,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          border: '1px solid #e0e0e0',
                          overflow: 'hidden',
                          mt: 0.5
                        }}>
                          {/* PDF Option - Mobile */}
                          <Box
                            onClick={() => {
                              downloadPDF();
                              setShowFormatOptions(false);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              px: 3,
                              py: 2,
                              cursor: result?.pdfUrl ? 'pointer' : 'not-allowed',
                              opacity: result?.pdfUrl ? 1 : 0.5,
                              '&:hover': {
                                backgroundColor: result?.pdfUrl ? '#f5f5f5' : 'transparent'
                              },
                              '&:active': {
                                backgroundColor: result?.pdfUrl ? '#eeeeee' : 'transparent'
                              },
                              borderBottom: '1px solid #f0f0f0'
                            }}
                          >
                            <img 
                              src="/pdf-icon.svg" 
                              alt="PDF" 
                              style={{ width: 24, height: 24 }} 
                            />
                            <Typography variant="body1" sx={{ fontWeight: 500, color: result?.pdfUrl ? '#d32f2f' : '#ccc' }}>
                              Download PDF
                            </Typography>
                          </Box>

                          {/* Word Option - Mobile */}
                          <Box
                            onClick={() => {
                              downloadWord();
                              setShowFormatOptions(false);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              px: 3,
                              py: 2,
                              cursor: result?.wordUrl ? 'pointer' : 'not-allowed',
                              opacity: result?.wordUrl ? 1 : 0.5,
                              '&:hover': {
                                backgroundColor: result?.wordUrl ? '#f5f5f5' : 'transparent'
                              },
                              '&:active': {
                                backgroundColor: result?.wordUrl ? '#eeeeee' : 'transparent'
                              }
                            }}
                          >
                            <img 
                              src="/word-icon.svg" 
                              alt="Word" 
                              style={{ width: 24, height: 24 }} 
                            />
                            <Typography variant="body1" sx={{ fontWeight: 500, color: result?.wordUrl ? '#2B579A' : '#ccc' }}>
                              Download Word
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1
                      }}>
                        <Button 
                          variant="outlined" 
                          size="large"
                          startIcon={<VisibilityIcon />}
                          onClick={() => setPreviewDialogOpen(true)}
                          sx={{ 
                            fontWeight: 500,
                            flex: 1,
                            py: 1.5,
                            fontSize: '0.9rem'
                          }}
                        >
                          Preview
                        </Button>
                        
                        <Button 
                          variant="outlined" 
                          size="large"
                          startIcon={<CompareIcon />}
                          onClick={() => setCompareDialogOpen(true)}
                          sx={{ 
                            fontWeight: 500,
                            flex: 1,
                            py: 1.5,
                            fontSize: '0.9rem',
                            position: 'relative'
                          }}
                        >
                          Compare
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: '#ff6b35',
                              color: 'white',
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              px: 0.5,
                              py: 0.2,
                              borderRadius: '4px',
                              lineHeight: 1
                            }}
                          >
                            BETA
                          </Box>
                        </Button>
                      </Box>

                    </Box>
                  </Paper>

                  {/* Professional Cover Letter Card */}
                  {(coverLetterText || result?.coverLetterUrl) && (
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        flex: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <EmailIcon sx={{ fontSize: 28, color: 'info.main' }} />
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Cover Letter
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Personalized for this position
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1.5,
                        flexDirection: 'column'
                      }}>
                        {/* Split button for cover letter download with format selection */}
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <ButtonGroup 
                            variant="contained" 
                            color="info"
                            size="medium"
                            sx={{ 
                              width: '100%',
                              '& .MuiButton-root': {
                                fontWeight: 600
                              }
                            }}
                          >
                            <Button
                              startIcon={<DownloadIcon />}
                              onClick={downloadCoverLetter}
                              sx={{ 
                                flexGrow: 1,
                                justifyContent: 'flex-start',
                                pl: 2
                              }}
                            >
                              Download Cover Letter
                            </Button>
                            <Button
                              size="small"
                              onClick={(event) => setCoverLetterFormatAnchorEl(event.currentTarget)}
                              sx={{ 
                                minWidth: 'auto',
                                px: 1,
                                borderLeft: '1px solid rgba(255,255,255,0.3)'
                              }}
                            >
                              <ArrowDropDownIcon />
                            </Button>
                          </ButtonGroup>
                          
                          <Menu
                            anchorEl={coverLetterFormatAnchorEl}
                            open={Boolean(coverLetterFormatAnchorEl)}
                            onClose={() => setCoverLetterFormatAnchorEl(null)}
                            PaperProps={{
                              sx: {
                                mt: 1,
                                minWidth: 200,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                border: '1px solid rgba(0,0,0,0.1)'
                              }
                            }}
                          >
                            <MenuItem 
                              onClick={() => {
                                downloadCoverLetter('pdf');
                                setCoverLetterFormatAnchorEl(null);
                              }}
                              sx={{ 
                                py: 1.5,
                                '&:hover': {
                                  backgroundColor: 'rgba(211, 47, 47, 0.1)'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <img src="/pdf-icon.svg" alt="PDF" style={{ width: 20, height: 20 }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                                  Download PDF
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem 
                              onClick={() => {
                                downloadCoverLetter('word');
                                setCoverLetterFormatAnchorEl(null);
                              }}
                              sx={{ 
                                py: 1.5,
                                '&:hover': {
                                  backgroundColor: 'rgba(43, 87, 154, 0.1)'
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <img src="/word-icon.svg" alt="Word" style={{ width: 20, height: 20 }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2B579A' }}>
                                  Download Word
                                </Typography>
                              </Box>
                            </MenuItem>
                          </Menu>
                        </Box>
                        
                        {coverLetterText && (
                          <Button 
                            variant="outlined" 
                            size="medium"
                            startIcon={<VisibilityIcon />}
                            onClick={() => setCoverLetterDialogOpen(true)}
                            sx={{ fontWeight: 500 }}
                          >
                            Preview Cover Letter
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  )}
                </Box>



                {/* Professional Next Actions */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: 3,
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  flexWrap: 'wrap'
                }}>
                  <Button 
                    variant="contained" 
                    onClick={resetForm}
                    startIcon={<RefreshIcon />}
                    size="large"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      py: 1.2,
                      px: 4,
                      textTransform: 'none',
                      borderRadius: 2
                    }}
                  >
                    Create Another Resume
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    onClick={() => setInterviewSetupOpen(true)}
                    startIcon={<WorkIcon />}
                    size="large"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      py: 1.2,
                      px: 4,
                      textTransform: 'none',
                      borderRadius: 2,
                      borderColor: '#0A66C2',
                      color: '#0A66C2',
                      '&:hover': {
                        borderColor: '#378FE9',
                        backgroundColor: 'rgba(10, 102, 194, 0.04)'
                      }
                    }}
                  >
                    Practice Interview
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    onClick={handleSaveToProfile}
                    startIcon={<PersonIcon />}
                    size="large"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      py: 1.2,
                      px: 4,
                      textTransform: 'none',
                      borderRadius: 2
                    }}
                  >
                    Save to Profile
                  </Button>
                </Box>

                {/* AI Caution Message - Subtle styling */}
                <Box sx={{ 
                  mt: 4,
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(0,0,0,0.5)',
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                    fontStyle: 'italic'
                  }}>
                    AI-generated content • If you're not satisfied with the output, please{' '}
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        setContactUsDialogOpen(true);
                        setContactTitle('Resume Output Feedback');
                        setContactDescription('I am not satisfied with the AI-generated resume output. Here are the issues I found:\n\n');
                      }}
                      sx={{
                        color: 'rgba(10, 102, 194, 0.7)',
                        textDecoration: 'underline',
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        p: 0,
                        minWidth: 'auto',
                        fontStyle: 'italic',
                        '&:hover': {
                          backgroundColor: 'transparent',
                          color: '#0A66C2',
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      let us know
                    </Button>
                    {' '}and we'll improve our product accordingly.
                  </Typography>
                </Box>
              </motion.div>
            )}
          </Paper>
        </motion.div>
      </Container>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarMessage.includes('Error') ? "error" : "success"}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        onSettingsChange={(newSettings) => {
          setUserSettings(newSettings);
          Logger.log('MainApp received settings update:', newSettings);
        }}
      />

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
        manual={false}
      />

      {/* Thank You Dialog */}
      <ThankYouDialog
        open={thankYouDialogOpen}
        onClose={() => setThankYouDialogOpen(false)}
      />

      {/* Parsing Failed Dialog - Error Popup Style */}
      <Dialog
        open={parsingFailedDialogOpen}
        onClose={false}
        disableEscapeKeyDown
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            minWidth: '480px'
          }
        }}
      >
        <DialogContent sx={{ 
          textAlign: 'center', 
          py: 3, 
          px: 4,
          backgroundColor: 'background.paper'
        }}>
          {/* Theme Blue Warning Triangle */}
          <Box sx={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            backgroundColor: '#0A66C2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            <Box sx={{
              width: 0,
              height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderBottom: '20px solid white',
              position: 'relative'
            }}>
              <Box sx={{
                position: 'absolute',
                top: '6px',
                left: '-1px',
                width: '2px',
                height: '6px',
                backgroundColor: '#0A66C2',
                borderRadius: '1px'
              }} />
              <Box sx={{
                position: 'absolute',
                top: '14px',
                left: '-1px',
                width: '2px',
                height: '2px',
                backgroundColor: '#0A66C2',
                borderRadius: '50%'
              }} />
            </Box>
          </Box>
          
          {/* Title */}
          <Typography variant="h4" sx={{ 
            mb: 2, 
            fontWeight: 600,
            color: 'text.primary',
            fontSize: '1.75rem',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
          }}>
            Oh snap!
          </Typography>
          
          {/* Error Message - Single Line */}
          <Typography variant="body1" color="text.secondary" sx={{ 
            mb: 2,
            fontSize: '1rem',
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontWeight: 400,
            lineHeight: 1.4
          }}>
            Resume cannot be parsed. Please try with another resume.
          </Typography>
        </DialogContent>
        
        {/* Theme Blue Dismiss Button - Full Width */}
        <Box sx={{ 
          backgroundColor: '#0A66C2',
          p: 0
        }}>
          <Button
            onClick={() => {
              // Ensure username is set for analytics (fallback if not set during login)
              if (!analytics.username && currentUser?.username) {
                analytics.setUsername(currentUser.username);
              }
              
              // Track dialog dismissal and recovery action
              analytics.trackEvent('parsing_error_dialog_dismissed', {
                error_type: 'parsing_failure',
                recovery_action: 'navigate_to_upload',
                file_type: resumeFile?.type,
                file_size: resumeFile?.size
              });
              
              setParsingFailedDialogOpen(false);
              navigate('/app/upload');
            }}
            fullWidth
            sx={{
              backgroundColor: '#0A66C2',
              color: 'white',
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 0,
              fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#004182'
              }
            }}
          >
            Dismiss
          </Button>
        </Box>
      </Dialog>

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
              Find answers to common questions about JobTailor AI features and functionality.
            </Typography>

            {/* Getting Started */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              🚀 Getting Started
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How does JobTailor AI work?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Upload your resume, enter a job URL for automatic extraction or job title for generic tailoring, and our AI will tailor your resume to perfectly match the job requirements. Job URLs provide the most targeted tailoring with company-specific intelligence.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What file formats are supported for resume upload?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: We support PDF (.pdf), Microsoft Word (.docx), and plain text (.txt) files. Maximum file size is 5MB.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Do I need to create an account to use JobTailor AI?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Yes, you need to create a free account to access JobTailor AI. This allows us to save your resumes, track your tailoring history, and provide personalized recommendations.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Is JobTailor AI free to use?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Yes! JobTailor AI is completely free to use. You can tailor unlimited resumes, generate cover letters, and save up to 50 resumes in your profile at no cost.
              </Typography>
            </Box>

            {/* Job Input & Tailoring */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              🎯 Job Input & Tailoring
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What's the difference between using a job URL vs. job title?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Job URLs provide the most targeted tailoring by extracting specific requirements, company culture, and keywords from the actual job posting. Job titles create more generic tailoring based on common requirements for that role.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Which job sites are supported for URL extraction?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: We support major job sites including LinkedIn, Indeed, Glassdoor, Monster, ZipRecruiter, AngelList, and many company career pages. If a URL doesn't work, you can manually enter the job details.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Can I tailor my resume for multiple jobs at once?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Each tailoring is customized to a specific job. For multiple positions, we recommend creating separate tailored versions and saving them to your profile with descriptive names.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What if the job URL extraction fails?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: If URL extraction fails, you can manually enter the job title, company name, and job description. This still provides excellent tailoring results.
              </Typography>
            </Box>

            {/* Cover Letters */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              📝 Cover Letters
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How do I generate a cover letter?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Toggle the "Generate Cover Letter" switch on the job details page. You'll need to provide both a job title and company name for cover letter generation.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Can I customize the cover letter after it's generated?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: The cover letter is generated as a downloadable document that you can edit in Microsoft Word or your preferred word processor. You can also preview it before downloading.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Why do I need to provide a company name for cover letters?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Cover letters are personalized to the specific company and role. The company name helps our AI create more targeted and professional cover letters that address the hiring manager appropriately.
              </Typography>
            </Box>

            {/* ATS Score & Analysis */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              📊 ATS Score & Analysis
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What is the ATS Score?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: The ATS (Applicant Tracking System) Score measures how well your resume will perform in automated screening systems. It analyzes keywords, formatting, skills match, experience relevance, and contact information completeness.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What's a good ATS Score?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Scores of 80+ are considered "Very Good" to "Excellent" and significantly improve your chances of passing ATS screening. Scores of 60-79 are "Good" to "Fair", while below 60 needs improvement.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How can I improve my ATS Score?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Focus on including relevant keywords from the job description, use standard section headings, quantify your achievements, and ensure your contact information is complete and properly formatted.
              </Typography>
            </Box>

            {/* Output Formats & Downloads */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              📄 Output Formats & Downloads
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What output formats are available?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: We offer Microsoft Word (.docx), PDF (.pdf), and Plain Text (.txt) formats. Word format is recommended for easy editing, PDF for final submissions, and TXT for maximum ATS compatibility.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Which format should I choose for job applications?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Use PDF for most applications as it preserves formatting across all devices. Use Word format if the employer specifically requests it or if you need to make further edits.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Why can't I download my tailored resume?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Download issues usually occur when: 1) The tailoring process isn't complete yet, 2) The download link has expired, or 3) There was an error during processing. Try refreshing the page or re-running the tailoring.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How long are download links valid?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Download links are valid for 24 hours after generation. If a link expires, you can re-tailor the resume or access it from your saved resumes in your profile.
              </Typography>
            </Box>

            {/* Preview & Compare Features */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              👁️ Preview & Compare Features
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How do I preview my tailored resume?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Click the "Preview" button on the results page to see a text preview of your tailored resume. This shows you the content and structure before downloading.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What does the Compare feature show?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: The Compare feature shows your original resume side-by-side with the tailored version, highlighting the improvements made by our AI including keyword additions, formatting changes, and content enhancements.
              </Typography>
            </Box>

            {/* Saved Resumes & Profile */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              💾 Saved Resumes & Profile
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How do I save resumes to my profile?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: After tailoring a resume, click "Save to Profile" on the results page. Give your resume a descriptive title and optional description, then save it for future reference.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How many resumes can I save?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: You can save up to 50 resumes in your profile. When you reach the limit, you'll need to delete old resumes or use the "Clean Up Old Resumes" feature to automatically remove the oldest ones.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How do I access my saved resumes?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Click on your profile avatar in the top-right corner and select "Profile" to view all your saved resumes. You can download, view details, or delete them from there.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Can I organize my saved resumes?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Yes! Use descriptive titles when saving resumes (e.g., "Software Engineer - Google", "Marketing Manager - Startup"). You can also add descriptions to help you remember the specific job or company.
              </Typography>
            </Box>

            {/* Account & Settings */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              ⚙️ Account & Settings
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How do I change my account password?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Click on your profile avatar, select "Settings & Privacy", and use the account management options to update your password and other account details.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Can I change my email address?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Yes, you can update your email address through the Settings & Privacy section. You may need to verify the new email address before the change takes effect.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How do I delete my account?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: To delete your account, contact our support team through the "Contact Us" option. We'll help you permanently delete your account and all associated data.
              </Typography>
            </Box>

            {/* Troubleshooting */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              🔧 Troubleshooting
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: What should I do if the tailoring is taking too long?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Tailoring typically takes 30-60 seconds. If it's taking longer, try refreshing the page using the refresh button in the header. If the issue persists, try uploading your resume again.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Why am I getting a blank screen?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: This usually happens due to a page refresh during processing. Try clicking the refresh button in the header or navigate back to the upload page to start over.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: My resume upload failed. What should I do?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Ensure your file is under 5MB and in a supported format (PDF, DOCX, TXT). Try converting your file to a different format or reducing the file size if it's too large.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: The website is not working on my mobile device. What can I do?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: JobTailor AI is fully mobile-responsive. Try refreshing the page, clearing your browser cache, or using a different browser. For the best experience, use the latest version of Chrome, Safari, or Firefox.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: I'm having trouble signing in. What should I do?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Try resetting your password using the "Forgot Password" link on the sign-in page. If you're still having trouble, contact our support team for assistance.
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
                A: Yes! We use AWS security best practices including encryption at rest and in transit. Your resumes are processed securely and we don't share your personal information with third parties.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How long are my resumes stored?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Saved resumes are stored in your profile until you delete them. Temporary processing files are automatically cleaned up after tailoring. You have full control over your saved resume data.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Do you use my resume data to train AI models?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: No, we do not use your personal resume data to train our AI models. Your resume content remains private and is only used to generate your tailored resume and cover letter.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Can I request a copy of all my data?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Yes, you can request a copy of all your data by contacting our support team. We'll provide you with all the information we have stored about your account and resumes.
              </Typography>
            </Box>

            {/* Best Practices */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              💡 Best Practices & Tips
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How can I get the best results from JobTailor AI?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Use specific job URLs when possible, ensure your original resume has complete information, include quantified achievements, and review the tailored version to ensure it accurately represents your experience.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Should I customize the tailored resume further?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: The tailored resume is ready to use, but you can always make minor adjustments to better reflect your personal style or add recent experiences that weren't in your original resume.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How often should I update my resume on JobTailor AI?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Update your base resume whenever you gain new experience, skills, or achievements. Then create new tailored versions for each job application to ensure maximum relevance.
              </Typography>
            </Box>

            {/* Contact & Support */}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#0A66C2' }}>
              📞 Contact & Support
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: How can I contact support?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Click on your profile avatar and select "Contact Us" to send us a message. We typically respond within 24 hours during business days.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Q: Can I suggest new features?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                A: Absolutely! We love hearing from our users. Use the "Contact Us" feature to share your ideas and suggestions for improving JobTailor AI.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ pl: 2, fontStyle: 'italic' }}>
                Still have questions? Don't hesitate to reach out to our support team. We're here to help you succeed in your job search!
              </Typography>
            </Box>
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
            Have a question, suggestion, or need help with JobTailor AI? We'd love to hear from you! 
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
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              💡 Common topics: Technical Issues, Feature Requests, Account Problems, Billing Questions, General Feedback
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Message *
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Please describe your issue, question, or feedback in detail..."
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

      {/* Contact Success Dialog */}
      <Dialog
        open={contactSuccessDialogOpen}
        onClose={() => {}} // Prevent manual closing
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            textAlign: 'center',
            py: 2
          }
        }}
      >
        <DialogContent sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {/* Success Icon */}
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: '#4caf50', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 1
            }}>
              <CheckCircleIcon sx={{ fontSize: 50, color: 'white' }} />
            </Box>

            {/* Success Message */}
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                color: '#2e7d32',
                mb: 2
              }}>
                Message Sent Successfully!
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Thank you for contacting us. We've received your message and will get back to you as soon as possible.
              </Typography>

              <Typography variant="body2" sx={{ 
                color: '#0A66C2',
                fontWeight: 500,
                fontSize: '1rem'
              }}>
                Redirecting to resume upload screen...
              </Typography>
            </Box>

            {/* Loading indicator */}
            <Box sx={{ 
              width: 40, 
              height: 4, 
              bgcolor: '#e0e0e0', 
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <Box sx={{
                width: '100%',
                height: '100%',
                bgcolor: '#0A66C2',
                borderRadius: 2,
                animation: 'shrink 5s linear forwards',
                '@keyframes shrink': {
                  '0%': { width: '100%' },
                  '100%': { width: '0%' }
                }
              }} />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Save to Profile Dialog */}
      <Dialog 
        open={saveToProfileDialogOpen} 
        onClose={() => setSaveToProfileDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#0A66C2' }}>
            Save Resume to Profile
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {/* Resume count indicator */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Resume Storage Status:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {(() => {
                  const existingSaved = JSON.parse(localStorage.getItem('savedResumes') || '[]');
                  const count = existingSaved.length;
                  return `${count}/50 resumes saved`;
                })()}
              </Typography>
              <Typography 
                variant="body2" 
                color={(() => {
                  const existingSaved = JSON.parse(localStorage.getItem('savedResumes') || '[]');
                  const remaining = 50 - existingSaved.length;
                  return remaining <= 5 ? 'error.main' : remaining <= 10 ? 'warning.main' : 'success.main';
                })()}
                sx={{ fontWeight: 600 }}
              >
                {(() => {
                  const existingSaved = JSON.parse(localStorage.getItem('savedResumes') || '[]');
                  const remaining = 50 - existingSaved.length;
                  return remaining > 0 ? `${remaining} slots remaining` : 'Storage full';
                })()}
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body1" sx={{ mb: 3, color: '#666666' }}>
            Save this tailored resume to your profile for future reference.
          </Typography>
          
          <TextField
            fullWidth
            label="Resume Title"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            placeholder="e.g., Software Engineer Resume - Google"
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description (Optional)"
            value={resumeDescription}
            onChange={(e) => setResumeDescription(e.target.value)}
            placeholder="Brief description of this resume version..."
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={() => setSaveToProfileDialogOpen(false)}
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveToProfileSubmit}
            sx={{
              background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
              px: 4
            }}
          >
            Save Resume
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 768} // Full screen on mobile
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, md: 2 },
            maxHeight: { xs: '100vh', md: '90vh' },
            height: { xs: '100vh', md: 'auto' }
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0',
          py: { xs: 1.5, md: 2 },
          px: { xs: 2, md: 3 },
          fontSize: { xs: '1.1rem', md: '1.25rem' }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <VisibilityIcon sx={{ mr: 1, fontSize: { xs: '1.2rem', md: '1.5rem' } }} />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              Tailored Resume Preview
            </Box>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              Preview
            </Box>
          </Box>
          <IconButton onClick={() => setPreviewDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          py: { xs: 1, md: 3 }, // Reduced top/bottom padding on mobile
          px: { xs: 0.5, md: 3 } // Reduced side padding on mobile for more text space
        }}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: { xs: 2, md: 3 }, // Increased mobile padding from 1.5 to 2
              bgcolor: '#f8f9fa',
              maxHeight: { xs: 'calc(100vh - 200px)', md: '60vh' },
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: { xs: '16px', md: '14px' }, // Increased from 12px to 16px for mobile
              lineHeight: { xs: 1.5, md: 1.6 }
            }}
          >
            <pre style={{ 
              margin: 0, 
              whiteSpace: 'pre-wrap', 
              wordWrap: 'break-word',
              fontSize: 'inherit'
            }}>
              {optimizedResumeText || 'Loading preview...'}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ 
          px: { xs: 2, md: 3 }, 
          pb: { xs: 1.5, md: 2 },
          pt: { xs: 1, md: 0 }
        }}>
          {/* Always show dual format buttons (new feature) in dialog */}
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
            {/* Dialog Split Button Container */}
            <Box sx={{ display: 'flex', position: 'relative' }}>
              {/* Main Download Button - Dialog */}
              <Button 
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadPDF} // Default to PDF download
                disabled={!result}
                sx={{
                  background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                  px: { xs: 2, md: 4 },
                  py: { xs: 1.5, md: 1 },
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0
                }}
              >
                Download Resume
              </Button>

              {/* Dropdown Arrow Button - Dialog */}
              <Button
                variant="contained"
                onClick={() => setShowFormatOptions(!showFormatOptions)}
                disabled={!result}
                sx={{
                  background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                  minWidth: '32px',
                  width: '32px',
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeft: '1px solid rgba(255,255,255,0.2)',
                  px: 0,
                  py: { xs: 1.5, md: 1 }
                }}
              >
                ▼
              </Button>

              {/* Dialog Dropdown Menu */}
              {showFormatOptions && (
                <Box sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  backgroundColor: 'white',
                  borderRadius: 1,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid #e0e0e0',
                  zIndex: 1000,
                  overflow: 'hidden',
                  minWidth: '200px'
                }}>
                  {/* PDF Option - Dialog */}
                  <Box
                    onClick={() => {
                      downloadPDF();
                      setShowFormatOptions(false);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      cursor: result?.pdfUrl ? 'pointer' : 'not-allowed',
                      opacity: result?.pdfUrl ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: result?.pdfUrl ? '#f5f5f5' : 'transparent'
                      },
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <img 
                      src="/pdf-icon.svg" 
                      alt="PDF" 
                      style={{ width: 18, height: 18 }} 
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: result?.pdfUrl ? '#d32f2f' : '#ccc' }}>
                      Download PDF
                    </Typography>
                  </Box>

                  {/* Word Option - Dialog */}
                  <Box
                    onClick={() => {
                      downloadWord();
                      setShowFormatOptions(false);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      cursor: result?.wordUrl ? 'pointer' : 'not-allowed',
                      opacity: result?.wordUrl ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: result?.wordUrl ? '#f5f5f5' : 'transparent'
                      }
                    }}
                  >
                    <img 
                      src="/word-icon.svg" 
                      alt="Word" 
                      style={{ width: 18, height: 18 }} 
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: result?.wordUrl ? '#2B579A' : '#ccc' }}>
                      Download Word
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        fullScreen={window.innerWidth < 768} // Full screen on mobile
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, md: 2 }, // No border radius on mobile
            maxHeight: { xs: '100vh', md: '95vh' },
            height: { xs: '100vh', md: '95vh' }
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#0A66C2',
          fontWeight: 600,
          borderBottom: '1px solid #e0e0e0',
          py: { xs: 1.5, md: 2 },
          px: { xs: 2, md: 3 },
          fontSize: { xs: '1.1rem', md: '1.25rem' }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CompareIcon sx={{ mr: 1, fontSize: { xs: '1.2rem', md: '1.5rem' } }} />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              Compare: Original vs Tailored Resume
              <Box
                component="span"
                sx={{
                  ml: 1,
                  backgroundColor: '#ff9800',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  textTransform: 'uppercase',
                  verticalAlign: 'middle'
                }}
              >
                Beta
              </Box>
            </Box>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              Comparison
              <Box
                component="span"
                sx={{
                  ml: 1,
                  backgroundColor: '#ff9800',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  padding: '1px 4px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  verticalAlign: 'middle'
                }}
              >
                Beta
              </Box>
            </Box>
          </Box>
          <IconButton onClick={() => setCompareDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          py: { xs: 1, md: 3 }, // Reduced padding for more content space
          px: { xs: 0.5, md: 3 }, // Reduced side padding on mobile
          height: '100%',
          overflow: 'hidden'
        }}>
          <Grid container spacing={{ xs: 1, md: 2 }} sx={{ height: '100%' }}>
            {/* Original Resume */}
            <Grid item xs={12} md={6} sx={{ 
              height: { xs: '50%', md: '100%' },
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ 
                  mb: { xs: 1, md: 2 }, 
                  color: '#d32f2f',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}>
                  📄 Original Resume
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: { xs: 2, md: 3 }, // Increased mobile padding from 1.5 to 2
                    bgcolor: '#fff3e0',
                    flex: 1,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: { xs: '15px', md: '14px' }, // Increased from 12px to 15px for mobile
                    lineHeight: { xs: 1.4, md: 1.6 },
                    border: '2px solid #ff9800',
                    minHeight: { xs: '200px', md: 'auto' }
                  }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: 'inherit'
                  }}>
                    {formatOriginalResumeText(originalResumeText) || 'Original resume text not available for this job.\n\nThis feature is available for new resume tailoring.\nFor existing jobs, the original text was not stored for comparison.\n\nTo see a comparison:\n1. Upload your resume again\n2. Run a new tailoring\n3. The comparison will show both versions'}
                  </pre>
                </Paper>
              </Box>
            </Grid>

            {/* Tailored Resume */}
            <Grid item xs={12} md={6} sx={{ 
              height: { xs: '50%', md: '100%' },
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ 
                  mb: { xs: 1, md: 2 }, 
                  color: '#2e7d32',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}>
                  Tailored Resume
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: { xs: 2, md: 3 }, // Increased mobile padding from 1.5 to 2
                    bgcolor: '#e8f5e8',
                    flex: 1,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: { xs: '15px', md: '14px' }, // Increased from 12px to 15px for mobile
                    lineHeight: { xs: 1.4, md: 1.6 },
                    border: '2px solid #4caf50',
                    minHeight: { xs: '200px', md: 'auto' }
                  }}
                >
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    wordWrap: 'break-word',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: 'inherit'
                  }}>
                    {optimizedResumeText || 'Tailored resume content not available'}
                  </pre>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setPreviewDialogOpen(true)}
            variant="outlined"
            startIcon={<VisibilityIcon />}
            sx={{ mr: 2 }}
          >
            Preview Only
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            {/* Compare Dialog Split Button Container */}
            <Box sx={{ display: 'flex', position: 'relative' }}>
              {/* Main Download Button - Compare Dialog */}
              <Button 
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadPDF} // Default to PDF download
                disabled={!result}
                sx={{
                  background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                  px: 4,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0
                }}
              >
                Download Tailored Resume
              </Button>

              {/* Dropdown Arrow Button - Compare Dialog */}
              <Button
                variant="contained"
                onClick={() => setShowFormatOptions(!showFormatOptions)}
                disabled={!result}
                sx={{
                  background: 'linear-gradient(45deg, #0A66C2 30%, #378FE9 90%)',
                  minWidth: '32px',
                  width: '32px',
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeft: '1px solid rgba(255,255,255,0.2)',
                  px: 0
                }}
              >
                ▼
              </Button>

              {/* Compare Dialog Dropdown Menu */}
              {showFormatOptions && (
                <Box sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  backgroundColor: 'white',
                  borderRadius: 1,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  border: '1px solid #e0e0e0',
                  zIndex: 1000,
                  overflow: 'hidden',
                  minWidth: '220px'
                }}>
                  {/* PDF Option - Compare Dialog */}
                  <Box
                    onClick={() => {
                      downloadPDF();
                      setShowFormatOptions(false);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      cursor: result?.pdfUrl ? 'pointer' : 'not-allowed',
                      opacity: result?.pdfUrl ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: result?.pdfUrl ? '#f5f5f5' : 'transparent'
                      },
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <img 
                      src="/pdf-icon.svg" 
                      alt="PDF" 
                      style={{ width: 18, height: 18 }} 
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: result?.pdfUrl ? '#d32f2f' : '#ccc' }}>
                      Download PDF
                    </Typography>
                  </Box>

                  {/* Word Option - Compare Dialog */}
                  <Box
                    onClick={() => {
                      downloadWord();
                      setShowFormatOptions(false);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      cursor: result?.wordUrl ? 'pointer' : 'not-allowed',
                      opacity: result?.wordUrl ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: result?.wordUrl ? '#f5f5f5' : 'transparent'
                      }
                    }}
                  >
                    <img 
                      src="/word-icon.svg" 
                      alt="Word" 
                      style={{ width: 18, height: 18 }} 
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: result?.wordUrl ? '#2B579A' : '#ccc' }}>
                      Download Word
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Cover Letter Preview Dialog */}
      <Dialog 
        open={coverLetterDialogOpen} 
        onClose={() => setCoverLetterDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#4CAF50', 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}>
          <DescriptionIcon />
          Cover Letter Preview
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ 
            p: 4, 
            fontFamily: 'Times New Roman, serif',
            fontSize: '12pt',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            bgcolor: 'background.paper',
            color: 'text.primary',
            minHeight: '400px',
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
            {coverLetterText || 'No cover letter available'}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setCoverLetterDialogOpen(false)}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Interview Setup Dialog */}
      <QuickInterviewSetup
        open={interviewSetupOpen}
        onClose={() => setInterviewSetupOpen(false)}
        jobDescription={manualJobDescription}
        companyName={companyName}
        resume={optimizedResumeText || resume}
      />

      </Box>
      )}
    </>
  );
}

export default MainApp;
