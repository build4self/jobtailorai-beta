import React, { useState, useEffect } from 'react';
import { Alert, Box, Chip, IconButton, Collapse, Tooltip } from '@mui/material';
import { Close as CloseIcon, BugReport as BugIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import devModeDetector from '../utils/devModeDetector';

const DevModeBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [envInfo, setEnvInfo] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const initializeBanner = async () => {
      // Check if banner is enabled via environment variable
      const bannerEnabled = process.env.REACT_APP_SHOW_DEV_BANNER !== 'false';
      
      // Check if banner should be shown based on environment
      const shouldShow = bannerEnabled && devModeDetector.shouldShowDevBanner();
      
      // Check if user previously hid the banner
      const wasHidden = localStorage.getItem('devBannerHidden');
      
      setIsVisible(shouldShow && wasHidden !== 'true');
      
      if (shouldShow) {
        // Detect AI handler mode and get environment info
        await devModeDetector.detectAiHandlerMode();
        setEnvInfo(devModeDetector.getEnvironmentInfo());
      }
    };

    initializeBanner();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Remember user's preference to hide the banner
    localStorage.setItem('devBannerHidden', 'true');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await devModeDetector.detectAiHandlerMode();
      setEnvInfo(devModeDetector.getEnvironmentInfo());
    } catch (error) {
      console.warn('Failed to refresh environment info:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Collapse in={isVisible}>
      <Alert 
        severity="warning" 
        sx={{ 
          borderRadius: 0,
          backgroundColor: '#fff3cd',
          borderColor: '#ffeaa7',
          color: '#856404',
          '& .MuiAlert-icon': {
            color: '#856404'
          }
        }}
        icon={<BugIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Refresh environment detection">
              <IconButton
                aria-label="refresh"
                color="inherit"
                size="small"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <strong>Local Testing Mode</strong>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip 
              label={`Frontend: ${envInfo.frontend || 'UNKNOWN'}`} 
              size="small" 
              color={envInfo.frontend === 'LOCAL' ? 'warning' : 'default'}
              variant="outlined"
            />
            <Chip 
              label={`API: ${envInfo.api || 'UNKNOWN'}`} 
              size="small" 
              color={envInfo.api === 'PROD' ? 'success' : 'warning'}
              variant="outlined"
            />
            <Chip 
              label={`Analytics: ${envInfo.analytics || 'UNKNOWN'}`} 
              size="small" 
              color={envInfo.analytics === 'PROD' ? 'success' : 'warning'}
              variant="outlined"
            />
            <Tooltip title="To test with dev AI handler (no retries): ./switch-ai-handler-env.sh dev">
              <Chip 
                label="AI Handler: Switchable"
                size="small" 
                color="info"
                variant="outlined"
              />
            </Tooltip>
          </Box>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default DevModeBanner;