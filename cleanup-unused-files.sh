#!/bin/bash

# Cleanup Unused Files Script
# This script removes temporary files and archives completed documentation

set -e

echo "========================================="
echo "Cleaning Up Unused Files"
echo "========================================="

# Create archive directory for documentation
echo ""
echo "Creating archive directory..."
mkdir -p archive/docs
mkdir -p archive/scripts

# Archive completed documentation
echo ""
echo "Archiving completed documentation..."
mv -v AMPLIFY_BETA_SETUP.md archive/docs/ 2>/dev/null || true
mv -v BETA_ENVIRONMENT_README.md archive/docs/ 2>/dev/null || true
mv -v DEEPSEEK_MIGRATION.md archive/docs/ 2>/dev/null || true
mv -v DEPLOYMENT_COMPLETE.md archive/docs/ 2>/dev/null || true
mv -v FEEDBACK_BUFFERING_FIX.md archive/docs/ 2>/dev/null || true
mv -v INTERVIEW_LOCALSTORAGE_UPDATE.md archive/docs/ 2>/dev/null || true
mv -v MOCK_INTERVIEW_TESTING.md archive/docs/ 2>/dev/null || true
mv -v NEXT_STEPS.md archive/docs/ 2>/dev/null || true

# Archive one-time scripts
echo ""
echo "Archiving one-time scripts..."
mv -v add-feedback-endpoint.sh archive/scripts/ 2>/dev/null || true
mv -v update-ai-handler.sh archive/scripts/ 2>/dev/null || true
mv -v update-beta-config.sh archive/scripts/ 2>/dev/null || true
mv -v update-interview-feedback.sh archive/scripts/ 2>/dev/null || true

# Remove temporary zip files
echo ""
echo "Removing temporary zip files..."
rm -vf ai-handler-fixed.zip
rm -vf interview-conductor-updated.zip
rm -vf interview-conductor.zip

# Remove unused deployment scripts (keeping beta versions)
echo ""
echo "Removing unused deployment scripts..."
rm -vf cleanup.sh
rm -vf deploy.sh

# Remove unused Amplify config
echo ""
echo "Removing unused Amplify config..."
rm -vf amplify.yml

# Remove unused config files
echo ""
echo "Removing unused config files..."
rm -vf ai-model-config.json

# Remove test files directory
echo ""
echo "Removing test files..."
rm -rf test_files/

# Remove unused frontend environment files
echo ""
echo "Removing unused frontend environment files..."
rm -vf frontend/.env.local 2>/dev/null || true
rm -vf frontend/.env.development 2>/dev/null || true
rm -vf frontend/.env.production 2>/dev/null || true
rm -vf frontend/LOGGING.md 2>/dev/null || true

# Create a README in archive
echo ""
echo "Creating archive README..."
cat > archive/README.md << 'EOF'
# Archive

This directory contains completed documentation and one-time scripts that are no longer actively used but kept for reference.

## Docs
- Completed setup guides
- Migration documentation
- Feature implementation notes
- Testing documentation

## Scripts
- One-time deployment scripts
- Configuration update scripts
- Migration scripts

These files are archived rather than deleted in case they need to be referenced in the future.
EOF

echo ""
echo "========================================="
echo "Cleanup Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Documentation archived to: archive/docs/"
echo "- Scripts archived to: archive/scripts/"
echo "- Temporary files removed"
echo "- Unused configs removed"
echo ""
echo "Active files kept:"
echo "- deploy-beta.sh"
echo "- cleanup-beta.sh"
echo "- amplify-beta.yml"
echo "- MOCK_INTERVIEW_FEATURE.md"
echo "- README.md"
echo "- frontend/.env.beta"
echo "- frontend/.env"
echo ""
