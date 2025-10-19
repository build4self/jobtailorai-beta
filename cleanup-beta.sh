#!/bin/bash

# JobTailorAI Beta Environment Cleanup Script
# This script removes all AWS resources for the beta environment

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

print_warning "🗑️  JobTailorAI Beta Environment Cleanup"
echo "========================================"
echo
print_warning "This will DELETE ALL JobTailorAI beta resources!"
print_warning "This includes:"
echo "  • resume-optimizer-stack-beta (CloudFormation stack)"
echo "  • resume-optimizer-storage-{AccountId}-beta (S3 bucket)"
echo "  • All Lambda functions with -beta postfix"
echo "  • DynamoDB tables with -beta postfix"
echo "  • API Gateway with -beta postfix"
echo "  • Cognito User Pool with -beta postfix"
echo
print_warning "This action cannot be undone!"
echo

read -p "Are you sure you want to delete the BETA environment? (type 'DELETE-BETA' to confirm): " confirm

if [ "$confirm" != "DELETE-BETA" ]; then
    print_status "Cleanup cancelled."
    exit 0
fi

print_status "🧹 Starting beta environment cleanup..."

# Run the main cleanup script with beta environment
./cleanup.sh beta

print_success "🎉 Beta environment cleanup completed!"
echo
print_status "📊 Cleanup Summary:"
echo "  ✅ All beta resources have been removed"
echo "  ✅ S3 bucket emptied and deleted"
echo "  ✅ CloudFormation stack deleted"
echo "  ✅ All Lambda functions deleted"
echo "  ✅ API Gateway deleted"
echo "  ✅ Cognito User Pool deleted"
echo "  ✅ DynamoDB tables deleted"
echo
print_success "🧹 JobTailorAI Beta Environment has been completely removed!"