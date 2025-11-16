#!/bin/bash

# Add /interview/feedback endpoint to existing API Gateway
# This is a quick fix to add the missing endpoint without redeploying the entire stack

set -e

ENVIRONMENT="beta"
REGION="us-east-1"
AWS_PROFILE="jobtailorai-beta"
API_ID="zbli9nquyh"

echo "========================================="
echo "Adding /interview/feedback Endpoint"
echo "Environment: $ENVIRONMENT"
echo "API Gateway ID: $API_ID"
echo "========================================="

# Get the /interview resource ID
echo ""
echo "Finding /interview resource..."
INTERVIEW_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --profile $AWS_PROFILE \
  --query 'items[?path==`/interview`].id' \
  --output text)

if [ -z "$INTERVIEW_RESOURCE_ID" ]; then
  echo "Error: /interview resource not found"
  exit 1
fi

echo "Interview resource ID: $INTERVIEW_RESOURCE_ID"

# Check if /interview/feedback already exists
echo ""
echo "Checking if /interview/feedback already exists..."
FEEDBACK_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --profile $AWS_PROFILE \
  --query 'items[?path==`/interview/feedback`].id' \
  --output text)

if [ -n "$FEEDBACK_RESOURCE_ID" ]; then
  echo "/interview/feedback already exists with ID: $FEEDBACK_RESOURCE_ID"
else
  # Create /interview/feedback resource
  echo "Creating /interview/feedback resource..."
  FEEDBACK_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $INTERVIEW_RESOURCE_ID \
    --path-part feedback \
    --region $REGION \
    --profile $AWS_PROFILE \
    --query 'id' \
    --output text)
  
  echo "Created /interview/feedback with ID: $FEEDBACK_RESOURCE_ID"
fi

# Get Cognito authorizer ID
echo ""
echo "Finding Cognito authorizer..."
AUTHORIZER_ID=$(aws apigateway get-authorizers \
  --rest-api-id $API_ID \
  --region $REGION \
  --profile $AWS_PROFILE \
  --query 'items[?type==`COGNITO_USER_POOLS`].id' \
  --output text | head -n1)

if [ -z "$AUTHORIZER_ID" ]; then
  echo "Error: Cognito authorizer not found"
  exit 1
fi

echo "Authorizer ID: $AUTHORIZER_ID"

# Create POST method for /interview/feedback
echo ""
echo "Creating POST method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $FEEDBACK_RESOURCE_ID \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "POST method may already exist"

# Set up Lambda integration
echo "Setting up Lambda integration..."
LAMBDA_ARN="arn:aws:lambda:${REGION}:132851953852:function:FeedbackAnalyzerHandler-${ENVIRONMENT}"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $FEEDBACK_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "Integration may already exist"

# Add Lambda permission
echo "Adding Lambda permission..."
aws lambda add-permission \
  --function-name "FeedbackAnalyzerHandler-${ENVIRONMENT}" \
  --statement-id "apigateway-feedback-${ENVIRONMENT}" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:132851953852:${API_ID}/*/POST/interview/feedback" \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "Permission may already exist"

# Create OPTIONS method for CORS
echo "Creating OPTIONS method for CORS..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $FEEDBACK_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "OPTIONS method may already exist"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $FEEDBACK_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "OPTIONS integration may already exist"

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $FEEDBACK_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": false, "method.response.header.Access-Control-Allow-Methods": false, "method.response.header.Access-Control-Allow-Origin": false}' \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "OPTIONS method response may already exist"

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $FEEDBACK_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'POST,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager > /dev/null 2>&1 || echo "OPTIONS integration response may already exist"

# Deploy API
echo ""
echo "Deploying API Gateway..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $ENVIRONMENT \
  --description "Added /interview/feedback endpoint" \
  --region $REGION \
  --profile $AWS_PROFILE \
  --no-cli-pager

echo ""
echo "========================================="
echo "Endpoint Added Successfully!"
echo "========================================="
echo ""
echo "The /interview/feedback endpoint is now available at:"
echo "https://${API_ID}.execute-api.${REGION}.amazonaws.com/${ENVIRONMENT}/interview/feedback"
