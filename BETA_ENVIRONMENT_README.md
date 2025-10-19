# JobTailorAI Beta Environment Setup

This guide explains how to set up and manage the JobTailorAI beta environment with all AWS resources tagged with `-beta` postfix.

## 🎯 Beta Environment Overview

The beta environment creates a complete, isolated copy of JobTailorAI with all resources having a `-beta` postfix:

- **Stack Name**: `resume-optimizer-stack-beta`
- **S3 Bucket**: `resume-optimizer-storage-{AccountId}-beta`
- **Lambda Functions**: All functions end with `-beta`
- **DynamoDB Tables**: All tables end with `-beta`
- **API Gateway**: `ResumeOptimizerAPI-beta`
- **Cognito User Pool**: `ResumeOptimizerUserPool-beta`

## 🚀 Quick Beta Deployment

### 1. Deploy Beta Environment

```bash
# Deploy to beta environment
./deploy-beta.sh
```

This script will:
- ✅ Deploy all AWS resources with `-beta` postfix
- ✅ Update all Lambda functions
- ✅ Configure API Gateway with beta endpoints
- ✅ Set up Cognito authentication for beta
- ✅ Create isolated DynamoDB tables and S3 bucket

### 2. Update Frontend Configuration

```bash
# Update frontend configuration with beta endpoints
./update-beta-config.sh
```

This will automatically populate `frontend/.env.beta` with the correct beta endpoints.

### 3. Use Beta Configuration

```bash
# For local development with beta backend
cp frontend/.env.beta frontend/.env

# Or deploy frontend with beta configuration
# Use the values from frontend/.env.beta in your deployment
```

## 📁 Beta-Specific Files

### Configuration Files
- `frontend/.env.beta` - Beta environment variables
- `BETA_ENVIRONMENT_README.md` - This documentation

### Deployment Scripts
- `deploy-beta.sh` - Deploy to beta environment
- `cleanup-beta.sh` - Remove beta environment
- `update-beta-config.sh` - Update frontend config after deployment

### Modified Core Files
- `backend/templates/resume-optimizer-stack.yaml` - Added `beta` to allowed environments
- `deploy.sh` - Added beta environment support
- `cleanup.sh` - Added beta environment support

## 🔧 Manual Deployment (Alternative)

If you prefer to use the main deployment script directly:

```bash
# Deploy to beta
./deploy.sh beta

# Update frontend config
./update-beta-config.sh

# Cleanup beta when done
./cleanup.sh beta
```

## 🧪 Testing Beta Environment

### Backend Testing

```bash
# Test beta API endpoints
curl -X POST https://your-beta-api-endpoint/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-beta-jwt-token" \
  -d '{"test": "data"}'

# Test beta Lambda functions
aws lambda invoke \
  --function-name ResumeOptimizerAIHandler-beta \
  --payload '{"test": "data"}' \
  response.json
```

### Frontend Testing

```bash
cd frontend

# Install dependencies
npm install

# Use beta configuration
cp .env.beta .env

# Start development server
npm start
```

## 📊 Beta Environment Resources

### AWS Resources Created

| Resource Type | Resource Name | Purpose |
|---------------|---------------|---------|
| CloudFormation Stack | `resume-optimizer-stack-beta` | Infrastructure management |
| S3 Bucket | `resume-optimizer-storage-{AccountId}-beta` | File storage |
| Lambda Function | `ResumeOptimizerAIHandler-beta` | AI processing |
| Lambda Function | `ResumeOptimizerProcessor-beta` | File processing |
| Lambda Function | `ResumeOptimizerStatusChecker-beta` | Status checking |
| Lambda Function | `ResumeOptimizerContactHandler-beta` | Contact form |
| Lambda Function | `ResumeOptimizerJobUrlExtractor-beta` | Job URL extraction |
| DynamoDB Table | `ResumeOptimizerUserHistory-beta` | User history |
| DynamoDB Table | `resume-optimizer-skills-beta` | Skills database |
| API Gateway | `ResumeOptimizerAPI-beta` | REST API |
| Cognito User Pool | `ResumeOptimizerUserPool-beta` | Authentication |
| IAM Roles | Various roles with beta context | Permissions |

### Cost Considerations

Beta environment will incur additional costs:
- **Separate AWS resources** running in parallel to production
- **Same AI model costs** for Bedrock usage
- **Additional storage** for S3 and DynamoDB
- **API Gateway requests** for beta testing

**Recommendation**: Clean up beta environment when not actively testing to minimize costs.

## 🧹 Beta Environment Cleanup

### Quick Cleanup

```bash
# Remove all beta resources
./cleanup-beta.sh
```

### Manual Cleanup

```bash
# Remove beta environment
./cleanup.sh beta
```

### Verification

After cleanup, verify all resources are removed:

```bash
# Check if beta stack exists
aws cloudformation describe-stacks --stack-name resume-optimizer-stack-beta

# Should return: "Stack with id resume-optimizer-stack-beta does not exist"
```

## 🔒 Security Considerations

### Beta Environment Security

- **Isolated Authentication**: Beta has its own Cognito User Pool
- **Separate Permissions**: Beta IAM roles are isolated from production
- **Data Isolation**: Beta S3 bucket and DynamoDB tables are separate
- **API Isolation**: Beta API Gateway has its own endpoints

### Best Practices

1. **Limited Access**: Only give beta access to testing team members
2. **Test Data**: Use only test data in beta environment
3. **Regular Cleanup**: Remove beta environment when not in use
4. **Monitoring**: Monitor beta costs separately from production

## 🚨 Troubleshooting

### Common Issues

1. **Stack Already Exists**: If beta stack exists, use update instead of create
2. **Permission Errors**: Ensure AWS CLI has necessary permissions
3. **Resource Limits**: Check AWS service limits for your account
4. **Configuration Errors**: Verify all environment variables are set correctly

### Debug Commands

```bash
# Check beta stack status
aws cloudformation describe-stacks --stack-name resume-optimizer-stack-beta

# View beta Lambda logs
aws logs tail /aws/lambda/ResumeOptimizerAIHandler-beta --follow

# Test beta API Gateway
aws apigateway test-invoke-method \
  --rest-api-id your-beta-api-id \
  --resource-id your-resource-id \
  --http-method POST
```

## 📈 Beta Testing Workflow

### Recommended Testing Process

1. **Deploy Beta**: `./deploy-beta.sh`
2. **Update Config**: `./update-beta-config.sh`
3. **Test Backend**: Verify all Lambda functions work
4. **Test Frontend**: Deploy frontend with beta config
5. **User Testing**: Conduct beta user testing
6. **Collect Feedback**: Gather testing results
7. **Cleanup**: `./cleanup-beta.sh` when done

### Monitoring Beta

- **CloudWatch Logs**: Monitor beta Lambda function logs
- **API Gateway Metrics**: Track beta API usage
- **Cost Monitoring**: Monitor beta environment costs
- **Error Tracking**: Track beta-specific errors

## 🎉 Success!

Your JobTailorAI beta environment is now ready for testing! All resources are properly isolated with `-beta` postfix, ensuring no interference with production systems.

### Next Steps

1. Test all core functionality in beta
2. Conduct user acceptance testing
3. Validate AI model performance
4. Test deployment and rollback procedures
5. Clean up beta environment when testing is complete

---

**Happy Beta Testing! 🚀**