#!/bin/bash

# Update AI Handler Lambda with fixed fonttools import

echo "🔧 Updating AI Handler Lambda function..."

# Upload the fixed zip file
aws lambda update-function-code \
    --function-name ResumeOptimizerAIHandler-beta \
    --zip-file fileb://ai-handler-fixed.zip \
    --region us-east-1 \
    --profile jobtailorai-beta \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo "✅ AI Handler Lambda updated successfully!"
    echo "📝 The fontTools duplicate directory has been removed"
    echo "🧪 Test by generating a PDF resume now"
    exit 0
else
    echo "❌ Failed to update Lambda function"
    echo "Please check your AWS credentials and try again"
    exit 1
fi
