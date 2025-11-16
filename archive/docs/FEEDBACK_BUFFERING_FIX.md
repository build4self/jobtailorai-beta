# Interview Feedback Buffering Fix

## Problem
The "Generating Feedback..." dialog was buffering forever when users clicked "View Feedback" after completing an interview.

## Root Causes

### 1. Missing API Gateway Endpoints
The `/interview/feedback` and `/interview/history` endpoints were not configured in the API Gateway, causing the frontend requests to fail silently.

### 2. Inefficient Answer Submission
The frontend was submitting answers one-by-one in a loop at the end of the interview, which was:
- Slow (multiple API calls)
- Error-prone (if one fails, others might not be saved)
- Not compatible with the backend's `handle_answer` function (which expects sequential submission during the interview)

### 3. No Timeout on Frontend
The `fetchFeedback` function had no timeout, so it would hang indefinitely if the API call failed or took too long.

## Solutions Implemented

### 1. Added Missing API Gateway Endpoints
**File:** `backend/templates/interview-api-gateway.yaml`

Added:
- `/interview/feedback` (POST) - Generates feedback for completed interviews
- `/interview/history` (GET) - Retrieves user's interview history
- Proper Lambda permissions for the FeedbackAnalyzer function
- CORS OPTIONS methods for both endpoints

### 2. Bulk Answer Submission
**File:** `backend/lambda-functions/interview-conductor/index.py`

Added new `handle_submit_answers` function that:
- Accepts all answers in a single request
- Converts the answers dictionary to the proper format
- Saves all answers to DynamoDB in one operation
- Logs the number of answers submitted

**File:** `frontend/src/components/InterviewDialog.js`

Updated `handleComplete` to:
- Submit all answers in one API call using the new `submit-answers` action
- Eliminates the loop that was making multiple API calls
- Faster and more reliable

### 3. Added Request Timeout
**File:** `frontend/src/components/InterviewDialog.js`

Updated `fetchFeedback` to:
- Use AbortController for 60-second timeout
- Show user-friendly error message if timeout occurs
- Properly clean up the timeout when request completes

## Deployment

Run the update script:
```bash
./update-interview-feedback.sh
```

This will:
1. Update the interview-conductor Lambda with the new bulk submission handler
2. Update the API Gateway with the feedback endpoints
3. Deploy the API Gateway changes

## Testing

1. Start a new mock interview
2. Answer some questions
3. Click "End Interview"
4. Click "View Feedback"
5. Verify that:
   - The feedback dialog shows a loading spinner
   - After a few seconds, the feedback is displayed
   - If it takes too long, a timeout error is shown

## Additional Notes

- The feedback generation uses Claude 3.5 Haiku via Bedrock
- Feedback is cached in DynamoDB to avoid regenerating it
- The timeout is set to 60 seconds, which should be sufficient for most cases
- If feedback generation consistently times out, consider:
  - Increasing Lambda timeout (currently 30 seconds)
  - Optimizing the Bedrock prompt
  - Implementing async feedback generation with polling
