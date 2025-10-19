#!/bin/bash

# Update Beta Frontend Configuration Script
# This script updates the frontend .env.beta file with actual beta deployment values

set -e  # Exit on any error

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

print_status "🔧 Updating Beta Frontend Configuration"
echo "======================================"
echo

# Check if beta stack exists
STACK_NAME="resume-optimizer-stack-beta"
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" > /dev/null 2>&1; then
    print_error "Beta stack not found. Please run './deploy-beta.sh' first."
    exit 1
fi

print_status "📋 Getting beta deployment information..."

# Get stack outputs
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs" \
    --output json)

API_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue')
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')

if [ "$API_ENDPOINT" == "null" ] || [ "$USER_POOL_ID" == "null" ] || [ "$USER_POOL_CLIENT_ID" == "null" ]; then
    print_error "Could not retrieve all required values from beta stack."
    exit 1
fi

print_status "🔄 Updating frontend/.env.beta file..."

# Update the .env.beta file
sed -i.bak "s|REACT_APP_USER_POOL_ID=.*|REACT_APP_USER_POOL_ID=$USER_POOL_ID|" frontend/.env.beta
sed -i.bak "s|REACT_APP_USER_POOL_WEB_CLIENT_ID=.*|REACT_APP_USER_POOL_WEB_CLIENT_ID=$USER_POOL_CLIENT_ID|" frontend/.env.beta
sed -i.bak "s|REACT_APP_API_ENDPOINT=.*|REACT_APP_API_ENDPOINT=$API_ENDPOINT|" frontend/.env.beta

# Remove backup file
rm frontend/.env.beta.bak

print_success "✅ Beta configuration updated successfully!"
echo
print_status "📊 Beta Configuration:"
echo "  API Endpoint: $API_ENDPOINT"
echo "  User Pool ID: $USER_POOL_ID"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
echo
print_status "🚀 Next Steps:"
echo "  1. Copy frontend/.env.beta to frontend/.env for local development"
echo "  2. Or use these values in your beta frontend deployment"
echo "  3. Test the beta environment"
echo
print_success "🎉 Beta frontend configuration is ready!"