// Configuration file for JobTailorAI
// This file reads from environment variables set during deployment

import Logger from './utils/logger';

const config = {
  // AWS Cognito Configuration
  Auth: {
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'us-east-1_PdEKfFD9v',
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 'sp5dfgb8mr3066luhs7e8h2rr',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  },
  
  // API Configuration
  API: {
    REST: {
      resumeOptimizer: {
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'https://giocwxtmw9.execute-api.us-east-1.amazonaws.com/prod',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
      }
    }
  },
  
  // Analytics Configuration
  Analytics: {
    enabled: process.env.REACT_APP_ANALYTICS_ENABLED !== 'false', // Default to enabled
    endpoint: process.env.REACT_APP_ANALYTICS_ENDPOINT || 'https://k6d3451z9d.execute-api.us-east-1.amazonaws.com/prod/analytics'
  },
  
  // Application Configuration
  App: {
    name: 'JobTailorAI',
    version: '1.0.0',
    description: 'AI-powered resume optimization tool',
    supportedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    outputFormats: ['pdf', 'word', 'text'],
    defaultOutputFormat: 'pdf'
  }
};

// Validation function to check if all required config is present
export const validateConfig = () => {
  Logger.info('🔧 Validating configuration...');
  Logger.info('📊 Current environment variables:');
  Logger.info('  REACT_APP_AWS_REGION:', process.env.REACT_APP_AWS_REGION);
  Logger.info('  REACT_APP_USER_POOL_ID:', process.env.REACT_APP_USER_POOL_ID);
  Logger.info('  REACT_APP_USER_POOL_WEB_CLIENT_ID:', process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID);
  Logger.info('  REACT_APP_API_ENDPOINT:', process.env.REACT_APP_API_ENDPOINT);
  Logger.info('  REACT_APP_ENVIRONMENT:', process.env.REACT_APP_ENVIRONMENT);
  Logger.info('  REACT_APP_TEST_MODE:', process.env.REACT_APP_TEST_MODE);
  
  Logger.info('🏗️ Final configuration:');
  Logger.info('  Auth Region:', config.Auth.region);
  Logger.info('  User Pool ID:', config.Auth.userPoolId);
  Logger.info('  Client ID:', config.Auth.userPoolWebClientId);
  Logger.info('  API Endpoint:', config.API.REST.resumeOptimizer.endpoint);
  
  const errors = [];
  
  if (!config.Auth.userPoolId) {
    errors.push('REACT_APP_USER_POOL_ID is not set');
  }
  
  if (!config.Auth.userPoolWebClientId) {
    errors.push('REACT_APP_USER_POOL_WEB_CLIENT_ID is not set');
  }
  
  if (!config.API.REST.resumeOptimizer.endpoint) {
    errors.push('REACT_APP_API_ENDPOINT is not set');
  }
  
  if (errors.length > 0) {
    Logger.error('❌ Configuration errors:', errors);
    return false;
  }
  
  Logger.info('✅ Configuration validation passed');
  return true;
};

export default config;
