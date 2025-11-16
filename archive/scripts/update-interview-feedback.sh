#!/bin/bash

# Update Interview Feedback Fix
# This script updates the interview-conductor Lambda to fix the feedback buffering issue

set -e

ENVIRONMENT="beta"
REGION="us-east-1"
AWS_PROFILE="jobtailorai-beta"

echo "========================================="
echo "Updating Interview Feedback Fix"
echo "Environment: $ENVIRONMENT"
echo "AWS Profile: $AWS_PROFILE"
echo "========================================="

# Update interview-conductor Lambda
echo ""
echo "Updating interview-conductor Lambda..."
cd backend/lambda-functions/interview-conductor
zip -q -r /tmp/interview-conductor.zip . -x "*.pyc" -x "__pycache__/*"
cd ../../..

aws lambda update-function-code \
  --function-name "InterviewConductorHandler-${ENVIRONMENT}" \
  --zip-file fileb:///tmp/interview-conductor.zip \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager

echo ""
echo "Lambda function updated successfully!"
echo ""
echo "========================================="
echo "Update Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. The bulk answer submission is now available"
echo "2. You still need to manually add the /interview/feedback endpoint in API Gateway"
echo "3. Or redeploy the full stack using deploy-beta.sh"
