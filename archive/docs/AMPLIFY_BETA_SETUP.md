# AWS Amplify Beta Environment Setup Guide

This guide walks you through setting up AWS Amplify for your JobTailorAI beta environment.

## 🎯 Beta Environment Details

Your beta backend is now deployed with these endpoints:

- **API Endpoint**: `https://zbli9nquyh.execute-api.us-east-1.amazonaws.com/beta`
- **User Pool ID**: `us-east-1_34x1MSVyv`
- **User Pool Client ID**: `110000lont34ibadej3sujk677`
- **AWS Region**: `us-east-1`

## 🚀 Amplify Setup Options

### Option 1: AWS Amplify Console (Recommended)

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/
   - Click "Create new app"

2. **Connect Repository**
   - Choose "GitHub" (or your git provider)
   - Select your JobTailorAI repository
   - Choose the branch you want to deploy (e.g., `main` or `beta`)

3. **Configure Build Settings**
   - App name: `JobTailorAI-Beta`
   - Environment name: `beta`
   - Build specification: Use `amplify-beta.yml` (already created)

4. **Set Environment Variables**
   ```
   REACT_APP_AWS_REGION=us-east-1
   REACT_APP_ENVIRONMENT=beta
   REACT_APP_USER_POOL_ID=us-east-1_34x1MSVyv
   REACT_APP_USER_POOL_WEB_CLIENT_ID=110000lont34ibadej3sujk677
   REACT_APP_API_ENDPOINT=https://zbli9nquyh.execute-api.us-east-1.amazonaws.com/beta
   REACT_APP_TEST_MODE=true
   REACT_APP_DEBUG_MODE=true
   REACT_APP_APP_NAME=JobTailorAI Beta
   REACT_APP_VERSION=beta
   REACT_APP_ENABLE_LOGGING=true
   ```

5. **Deploy**
   - Review settings and click "Save and deploy"
   - Wait for deployment to complete

### Option 2: AWS CLI (Alternative)

```bash
# Create Amplify app
aws amplify create-app \
  --name "JobTailorAI-Beta" \
  --description "JobTailorAI Beta Environment" \
  --repository "https://github.com/your-username/your-repo" \
  --platform WEB \
  --iam-service-role-arn "arn:aws:iam::132851953852:role/amplifyconsole-backend-role"

# Create branch
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --description "Beta deployment branch" \
  --enable-auto-build
```

## 🔧 Build Configuration

### Using amplify-beta.yml

The `amplify-beta.yml` file is already configured for your beta environment:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
        # Copy beta environment variables
        - cp .env.beta .env
        - echo "Using beta environment configuration"
        - cat .env
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/build
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### Manual Build Specification (if needed)

If you prefer to set it manually in Amplify Console:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/build
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

## 🌐 Custom Domain (Optional)

If you want a custom domain for beta:

1. **In Amplify Console**:
   - Go to "Domain management"
   - Add domain: `beta.yourdomain.com`
   - Configure DNS settings

2. **Alternative subdomain**:
   - Use Amplify's default domain with a custom prefix
   - Example: `jobtailorai-beta-main.d1234567890.amplifyapp.com`

## 🧪 Testing Your Beta Deployment

### 1. Verify Environment Variables

After deployment, check that your app is using beta configuration:

- Open browser developer tools
- Check that API calls go to: `https://zbli9nquyh.execute-api.us-east-1.amazonaws.com/beta`
- Verify app title shows "JobTailorAI Beta"

### 2. Test Core Functionality

1. **Authentication**:
   - Register a new test user
   - Verify email confirmation works
   - Test login/logout

2. **Resume Optimization**:
   - Upload a test resume
   - Verify it processes correctly
   - Check that it uses beta Lambda functions

3. **API Endpoints**:
   - Test all major features
   - Verify error handling
   - Check logging (should be enabled in beta)

## 📊 Monitoring Beta Environment

### Amplify Monitoring

- **Build History**: Monitor deployment success/failures
- **Performance**: Check app performance metrics
- **Logs**: Review build and runtime logs

### Backend Monitoring

```bash
# Check beta Lambda function logs
aws logs tail /aws/lambda/ResumeOptimizerAIHandler-beta --follow

# Check API Gateway logs for beta
aws logs filter-log-events \
  --log-group-name API-Gateway-Execution-Logs_zbli9nquyh/beta \
  --start-time $(date -d '1 hour ago' +%s)000
```

## 🔄 Continuous Deployment

### Automatic Deployments

Amplify will automatically deploy when you push to your connected branch:

1. **Push changes** to your repository
2. **Amplify detects** the change
3. **Build starts** automatically
4. **Beta environment updates** with new changes

### Manual Deployments

```bash
# Trigger manual deployment
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check build logs in Amplify Console
   - Verify all environment variables are set
   - Ensure `frontend/.env.beta` exists

2. **API Connection Issues**:
   - Verify API endpoint is correct
   - Check CORS configuration
   - Test API endpoints directly

3. **Authentication Issues**:
   - Verify Cognito User Pool settings
   - Check User Pool Client configuration
   - Test authentication flow

### Debug Commands

```bash
# Test beta API endpoint
curl -X GET https://zbli9nquyh.execute-api.us-east-1.amazonaws.com/beta/status

# Check Cognito User Pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_34x1MSVyv

# Verify Lambda function
aws lambda get-function --function-name ResumeOptimizerAIHandler-beta
```

## 🧹 Cleanup

When you're done with beta testing:

1. **Delete Amplify App**:
   ```bash
   aws amplify delete-app --app-id YOUR_APP_ID
   ```

2. **Clean up backend**:
   ```bash
   ./cleanup-beta.sh
   ```

## 🎉 Success Checklist

- [ ] Amplify app created and configured
- [ ] Environment variables set correctly
- [ ] Build specification configured
- [ ] Deployment successful
- [ ] Beta frontend accessible
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] Core functionality tested
- [ ] Monitoring set up

## 📞 Next Steps

1. **Set up Amplify** using Option 1 (Console) above
2. **Test thoroughly** using the testing guide
3. **Share beta URL** with your testing team
4. **Monitor and iterate** based on feedback
5. **Clean up** when beta testing is complete

---

**Your Beta Environment is Ready! 🚀**

Backend: ✅ Deployed
Frontend: ⏳ Ready for Amplify setup
Configuration: ✅ Complete

Happy beta testing!