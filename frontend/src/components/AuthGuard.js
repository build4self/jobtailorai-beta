import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';
import sessionManager from '../utils/sessionManager';

function AuthGuard({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  const checkAuthAndRedirect = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      
      // User is authenticated, update session if remember me is active
      if (sessionManager.isRememberMeValid()) {
        sessionManager.updateLastSignIn();
      }
      
      // User is already authenticated, redirect to app
      navigate('/app/upload', { replace: true });
    } catch (error) {
      // User is not authenticated, clear any invalid session data
      if (!sessionManager.isRememberMeValid()) {
        sessionManager.clearRememberMe();
      }
      
      // Show auth page
      setIsChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAuthAndRedirect();
  }, [checkAuthAndRedirect]);

  if (isChecking) {
    return (
      <LoadingScreen 
        message="Checking authentication status..."
        subtitle="Secure access to your professional tools"
      />
    );
  }

  return children;
}

export default AuthGuard;
