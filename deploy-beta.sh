#!/bin/bash

# JobTailorAI Beta Environment Deployment Script
# This script deploys the complete JobTailorAI application to AWS beta environment

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

print_success "🚀 JobTailorAI Beta Environment Deployment"
echo "=========================================="
echo

print_status "This will deploy JobTailorAI to the BETA environment"
print_status "All AWS resources will be tagged with '-beta' postfix"
echo

# Confirm deployment
read -p "Continue with beta deployment? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_status "Deployment cancelled."
    exit 0
fi

# Run the main deployment script with beta environment
print_status "🎯 Deploying to beta environment..."
./deploy.sh beta

print_success "🎉 Beta deployment completed!"
echo
print_status "📋 Beta Environment Resources:"
echo "  All resources now have '-beta' postfix"
echo "  Stack: resume-optimizer-stack-beta"
echo "  S3 Bucket: resume-optimizer-storage-{AccountId}-beta"
echo "  Lambda Functions: *-beta"
echo "  DynamoDB Tables: *-beta"
echo "  API Gateway: ResumeOptimizerAPI-beta"
echo "  Cognito User Pool: ResumeOptimizerUserPool-beta"
echo
print_status "🔧 Next Steps:"
echo "  1. Update frontend environment variables to use beta endpoints"
echo "  2. Test the beta environment thoroughly"
echo "  3. Use './cleanup.sh beta' to remove beta resources when done"
echo
print_success "🚀 JobTailorAI Beta Environment is ready!"