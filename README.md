# JobTailorAI Beta Environment

A production-ready, AI-powered web application that intelligently optimizes resumes and generates cover letters based on job descriptions. This is the **beta testing environment** with complete isolation from production systems.

## 🎯 Beta Environment Overview

This repository contains the complete JobTailorAI beta environment with all AWS resources tagged with `-beta` postfix for complete isolation from production.

### 🚀 Live Beta Environment

- **API Endpoint**: `https://zbli9nquyh.execute-api.us-east-1.amazonaws.com/beta`
- **User Pool ID**: `us-east-1_34x1MSVyv`
- **Environment**: `beta`
- **AWS Account**: `132851953852`

## 🏗️ Architecture

This beta environment uses the same serverless architecture as production but with complete resource isolation:

- **Frontend**: React application (deployable on AWS Amplify)
- **Backend**: AWS Lambda functions with API Gateway
- **AI Processing**: Amazon Bedrock (Claude 3 Sonnet) with cost-optimized model hierarchy
- **Storage**: Amazon S3 and DynamoDB with beta-specific naming
- **Authentication**: Amazon Cognito with separate user pool
- **Job Data Extraction**: Dedicated Lambda for parsing job URLs

### Beta Resources Created

| Resource Type | Resource Name | Status |
|---------------|---------------|---------|
| CloudFormation Stack | `resume-optimizer-stack-beta` | ✅ Deployed |
| Lambda Functions | `*-beta` (5 functions) | ✅ Deployed |
| API Gateway | `ResumeOptimizerAPI-beta` | ✅ Deployed |
| Cognito User Pool | `ResumeOptimizerUserPool-beta` | ✅ Deployed |
| S3 Bucket | `resume-optimizer-storage-132851953852-beta` | ✅ Deployed |
| DynamoDB Tables | `*-beta` (2 tables) | ✅ Deployed |

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Node.js and npm** for frontend development
3. **Access to Amazon Bedrock** (Claude 3 models enabled)

### Backend Deployment

The backend is already deployed! But if you need to redeploy:

```bash
# Deploy beta environment
./deploy-beta.sh

# Update frontend configuration
./update-beta-config.sh
```

### Frontend Deployment

#### Option 1: AWS Amplify (Recommended)

1. **Connect to Amplify**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Create new app → Connect repository
   - Select this repository

2. **Configure Environment Variables**:
   ```
   REACT_APP_AWS_REGION=us-east-1
   REACT_APP_USER_POOL_ID=us-east-1_34x1MSVyv
   REACT_APP_USER_POOL_WEB_CLIENT_ID=110000lont34ibadej3sujk677
   REACT_APP_API_ENDPOINT=https://zbli9nquyh.execute-api.us-east-1.amazonaws.com/beta
   REACT_APP_ENVIRONMENT=beta
   REACT_APP_TEST_MODE=true
   ```

3. **Deploy**: Use `amplify-beta.yml` build specification

#### Option 2: Local Development

```bash
cd frontend
npm install

# Use beta configuration
cp .env.beta .env

# Start development server
npm start
```

## 🧪 Testing

### Core Features to Test

1. **Authentication**:
   - User registration and email verification
   - Login/logout functionality
   - Password reset

2. **Resume Optimization**:
   - Upload PDF, Word, or text files
   - AI-powered resume enhancement
   - Real-time preview and comparison
   - Multiple output formats

3. **Cover Letter Generation**:
   - AI-generated personalized cover letters
   - Job URL extraction and analysis
   - Company research integration

4. **ATS Scoring**:
   - Applicant Tracking System compatibility
   - Detailed feedback and suggestions

### Test Data

Use files in `test_files/` directory:
- `corrupted_resume.docx` - Test error handling
- `empty_resume.txt` - Test edge cases

## 📊 Monitoring

### Backend Monitoring

```bash
# Check beta Lambda logs
aws logs tail /aws/lambda/ResumeOptimizerAIHandler-beta --follow

# Check API Gateway logs
aws logs filter-log-events \
  --log-group-name API-Gateway-Execution-Logs_zbli9nquyh/beta
```

### Cost Monitoring

The beta environment includes AI cost monitoring and optimization:
- Hierarchical model selection (cheapest to most expensive)
- Usage tracking and alerts
- Cost per request optimization

## 🔧 Configuration

### AI Model Configuration

The beta environment uses the same AI model hierarchy as production:
- **Primary**: Amazon Titan Text Lite (cost-effective)
- **Fallback**: Claude 3 Haiku, Nova models, Mistral 7B
- **Premium**: Amazon Nova Pro (for complex cases)

### Environment Variables

All configuration is in `frontend/.env.beta`:
- Beta-specific endpoints and credentials
- Debug mode enabled
- Enhanced logging for testing

## 🧹 Cleanup

When beta testing is complete:

```bash
# Remove all beta resources
./cleanup-beta.sh
```

This will delete:
- All Lambda functions with `-beta` postfix
- CloudFormation stack and associated resources
- S3 bucket (after emptying)
- DynamoDB tables
- API Gateway and Cognito resources

## 📚 Documentation

- **[Beta Environment Setup](BETA_ENVIRONMENT_README.md)** - Complete setup guide
- **[Amplify Deployment](AMPLIFY_BETA_SETUP.md)** - Frontend deployment guide
- **[Architecture Diagram](ARCHITECTURE_DIAGRAM.md)** - System architecture (if available)

## 🔒 Security

### Beta Environment Security

- **Isolated Authentication**: Separate Cognito User Pool
- **Resource Isolation**: All resources have `-beta` postfix
- **Data Separation**: Dedicated S3 bucket and DynamoDB tables
- **API Isolation**: Separate API Gateway endpoints

### Best Practices

- Use only test data in beta environment
- Limit access to testing team members
- Monitor costs separately from production
- Clean up when testing is complete

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**: Verify frontend domain in API Gateway CORS settings
2. **Authentication Issues**: Check Cognito configuration matches frontend
3. **Lambda Timeouts**: Monitor CloudWatch logs for performance issues
4. **API Errors**: Test endpoints directly with curl or Postman

### Support

For issues:
1. Check CloudWatch logs for detailed error information
2. Review the troubleshooting guides in documentation
3. Test individual components (auth, API, Lambda functions)

## 🎉 Success Metrics

Beta testing success indicators:
- [ ] All core features working correctly
- [ ] Authentication flow complete
- [ ] Resume optimization producing quality results
- [ ] Cover letter generation functional
- [ ] ATS scoring providing useful feedback
- [ ] Performance within acceptable limits
- [ ] Cost optimization working as expected

## 📞 Next Steps

1. **Deploy frontend** to Amplify using this repository
2. **Conduct thorough testing** of all features
3. **Gather feedback** from beta users
4. **Monitor performance** and costs
5. **Iterate and improve** based on results
6. **Clean up resources** when testing complete

---

**🚀 Ready for Beta Testing!**

This environment is completely isolated from production and ready for comprehensive testing of all JobTailorAI features.