#!/bin/bash

# Resume Optimizer Cleanup Script
# This script removes all AWS resources created by the Resume Optimizer

set -e  # Exit on any error

# Configuration
STACK_NAME="resume-optimizer-stack"
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

print_warning "🗑️  This will DELETE ALL Resume Optimizer resources in $ENVIRONMENT environment!"
print_warning "This action cannot be undone."
echo
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    print_status "Cleanup cancelled."
    exit 0
fi

print_status "🧹 Starting cleanup of Resume Optimizer resources..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get stack information before deletion
FULL_STACK_NAME="$STACK_NAME-$ENVIRONMENT"
print_status "📋 Getting stack information..."

if ! aws cloudformation describe-stacks --stack-name "$FULL_STACK_NAME" > /dev/null 2>&1; then
    print_warning "Stack $FULL_STACK_NAME does not exist. Nothing to clean up."
    exit 0
fi

# Get S3 bucket name from stack outputs
STORAGE_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$FULL_STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='StorageBucket'].OutputValue" \
    --output text 2>/dev/null || echo "")

# Empty S3 bucket if it exists
if [ ! -z "$STORAGE_BUCKET" ] && [ "$STORAGE_BUCKET" != "None" ]; then
    print_status "🗂️  Emptying S3 bucket: $STORAGE_BUCKET"
    
    # Check if bucket exists
    if aws s3api head-bucket --bucket "$STORAGE_BUCKET" 2>/dev/null; then
        # Empty the bucket
        aws s3 rm s3://$STORAGE_BUCKET --recursive 2>/dev/null || true
        print_success "✅ S3 bucket emptied"
    else
        print_warning "S3 bucket $STORAGE_BUCKET does not exist or is not accessible"
    fi
else
    print_warning "Could not determine S3 bucket name from stack outputs"
fi

# Delete CloudFormation stack
print_status "🗑️  Deleting CloudFormation stack: $FULL_STACK_NAME"
aws cloudformation delete-stack --stack-name "$FULL_STACK_NAME"

print_status "⏳ Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete --stack-name "$FULL_STACK_NAME"

print_success "✅ CloudFormation stack deleted successfully"

# Verify cleanup
print_status "🔍 Verifying cleanup..."

# Check if stack still exists
if aws cloudformation describe-stacks --stack-name "$FULL_STACK_NAME" > /dev/null 2>&1; then
    print_error "Stack still exists. Cleanup may not be complete."
    exit 1
fi

print_success "🎉 Cleanup completed successfully!"
echo
print_status "📊 Cleanup Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  Stack: $FULL_STACK_NAME (DELETED)"
if [ ! -z "$STORAGE_BUCKET" ] && [ "$STORAGE_BUCKET" != "None" ]; then
    echo "  S3 Bucket: $STORAGE_BUCKET (EMPTIED & DELETED)"
fi
echo "  Lambda Functions: ALL DELETED"
echo "  API Gateway: DELETED"
echo "  Cognito User Pool: DELETED"
echo "  DynamoDB Table: DELETED"
echo
print_success "🧹 All Resume Optimizer resources have been removed!"
