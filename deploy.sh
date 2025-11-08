#!/bin/bash

# Resume Optimizer Production Deployment Script
# This script deploys the complete Resume Optimizer application to AWS

set -e  # Exit on any error

# Configuration
STACK_NAME="resume-optimizer-stack"
TEMPLATE_FILE="backend/templates/resume-optimizer-stack.yaml"
DEFAULT_ENVIRONMENT="prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
ENVIRONMENT=${1:-$DEFAULT_ENVIRONMENT}

if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod|beta)$ ]]; then
    print_error "Invalid environment. Use: dev, test, prod, or beta"
    exit 1
fi

print_status "🚀 Starting Resume Optimizer deployment to $ENVIRONMENT environment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

print_success "✅ AWS CLI configured"

# Deploy CloudFormation stack
print_status "📦 Deploying CloudFormation stack: $STACK_NAME-$ENVIRONMENT"

aws cloudformation describe-stacks --stack-name "$STACK_NAME-$ENVIRONMENT" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_IAM \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT
    
    print_status "Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME-$ENVIRONMENT"
else
    print_status "Stack does not exist, creating..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_IAM \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT
    
    print_status "Waiting for stack creation to complete..."
    aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME-$ENVIRONMENT"
fi

print_success "✅ CloudFormation stack deployed successfully"

# Update Lambda functions
print_status "🔧 Updating Lambda functions..."

# Update AI Handler
print_status "Updating AI Handler Lambda..."
cd backend/lambda-functions/ai-handler
zip -r function.zip *.py *.docx 2>/dev/null || true
aws lambda update-function-code \
    --function-name "ResumeOptimizerAIHandler-$ENVIRONMENT" \
    --zip-file fileb://function.zip > /dev/null
rm function.zip
cd ../../..

# Update Resume Processor
print_status "Updating Resume Processor Lambda..."
cd backend/lambda-functions/resume-processor
zip -r function.zip *.py 2>/dev/null || true
aws lambda update-function-code \
    --function-name "ResumeOptimizerProcessor-$ENVIRONMENT" \
    --zip-file fileb://function.zip > /dev/null
rm function.zip
cd ../../..

# Update Status Checker
print_status "Updating Status Checker Lambda..."
cd backend/lambda-functions/status-checker
zip -r function.zip *.py 2>/dev/null || true
aws lambda update-function-code \
    --function-name "ResumeOptimizerStatusChecker-$ENVIRONMENT" \
    --zip-file fileb://function.zip > /dev/null
rm function.zip
cd ../../..

# Update Contact Handler
print_status "Updating Contact Handler Lambda..."
cd backend/lambda-functions/contact-handler
zip -r function.zip *.py 2>/dev/null || true
aws lambda update-function-code \
    --function-name "ResumeOptimizerContactHandler-$ENVIRONMENT" \
    --zip-file fileb://function.zip > /dev/null
rm function.zip
cd ../../..

# Update Job URL Extractor
print_status "Updating Job URL Extractor Lambda..."
cd backend/lambda-functions/job-url-extractor

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    print_status "Installing dependencies for Job URL Extractor..."
    python3 -m pip install -r requirements.txt -t . --quiet
fi

zip -r function.zip *.py 2>/dev/null || true
# Include installed packages in the zip
if [ -d "requests" ] || [ -d "bs4" ] || [ -d "urllib3" ] || [ -d "certifi" ] || [ -d "charset_normalizer" ] || [ -d "idna" ] || [ -d "soupsieve" ] || [ -d "lxml" ]; then
    zip -r function.zip requests* bs4* urllib3* certifi* charset_normalizer* idna* soupsieve* lxml* 2>/dev/null || true
fi

aws lambda update-function-code \
    --function-name "ResumeOptimizerJobUrlExtractor-$ENVIRONMENT" \
    --zip-file fileb://function.zip > /dev/null
rm function.zip

# Clean up installed packages
rm -rf requests* bs4* urllib3* certifi* charset_normalizer* idna* soupsieve* lxml* *.dist-info 2>/dev/null || true

cd ../../..

print_success "✅ All Lambda functions updated successfully"

# Get stack outputs
print_status "📋 Getting deployment information..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME-$ENVIRONMENT" \
    --query "Stacks[0].Outputs" \
    --output json)

API_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue')
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
STORAGE_BUCKET=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="StorageBucket") | .OutputValue')

print_success "🎉 Deployment completed successfully!"
echo
print_status "📊 Deployment Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  API Endpoint: $API_ENDPOINT"
echo "  User Pool ID: $USER_POOL_ID"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "  Storage Bucket: $STORAGE_BUCKET"
echo
print_status "🔧 Frontend Configuration:"
echo "  Set these environment variables in your frontend deployment:"
echo "  REACT_APP_AWS_REGION=us-east-1"
echo "  REACT_APP_USER_POOL_ID=$USER_POOL_ID"
echo "  REACT_APP_USER_POOL_WEB_CLIENT_ID=$USER_POOL_CLIENT_ID"
echo "  REACT_APP_API_ENDPOINT=$API_ENDPOINT"
echo
print_status "📚 Next Steps:"
echo "  1. Update your frontend environment variables"
echo "  2. Deploy your frontend to AWS Amplify or S3/CloudFront"
echo "  3. Test the application end-to-end"
echo
print_success "🚀 Resume Optimizer is ready for production!"
