import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = useCallback(async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      // Store the intended destination
      const intendedPath = location.pathname;
      // Use replace to prevent back button from going to protected route
      navigate('/auth', { 
        state: { returnTo: intendedPath },
        replace: true 
      });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? children : null;
}

export default ProtectedRoute;
