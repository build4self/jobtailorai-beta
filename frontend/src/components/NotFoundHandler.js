import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

const NotFoundHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract the intended path from the current URL
    const currentPath = location.pathname;
    
    // Handle common app routes
    if (currentPath.includes('/app/upload')) {
      navigate('/app/upload', { replace: true });
    } else if (currentPath.includes('/app/job-description')) {
      navigate('/app/job-description', { replace: true });
    } else if (currentPath.includes('/app/results')) {
      navigate('/app/results', { replace: true });
    } else if (currentPath.includes('/app/profile')) {
      navigate('/app/profile', { replace: true });
    } else if (currentPath.includes('/app')) {
      navigate('/app/upload', { replace: true });
    } else if (currentPath.includes('/auth')) {
      navigate('/auth', { replace: true });
    } else {
      // Default to landing page
      navigate('/', { replace: true });
    }
  }, [navigate, location]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        Redirecting...
      </Typography>
    </Box>
  );
};

export default NotFoundHandler;
