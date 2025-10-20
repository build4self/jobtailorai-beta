import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import Logger from '../utils/logger';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      Logger.info('🔍 Checking authentication state...');
      const currentUser = await getCurrentUser();
      Logger.info('✅ User authenticated:', currentUser.username);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      Logger.info('❌ User not authenticated:', error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      Logger.info('🏁 Auth state check complete');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      Logger.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    checkAuthState,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
