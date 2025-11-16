# Mock Interview Room - Testing Guide

## Prerequisites

1. **Deploy Backend Infrastructure**
   ```bash
   export AWS_PROFILE=jobtailorai-beta
   ./deploy-beta.sh
   ```
   
   This will create:
   - DynamoDB tables (InterviewSessions-beta, CompanyProfiles-beta)
   - Lambda functions (InterviewSetupHandler-beta, etc.)
   - API Gateway endpoints

2. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

## How to Access Mock Interview Room

### Option 1: Via Navigation Menu
1. Log in to the app
2. Click on your profile avatar (top right)
3. Select **"Mock Interview"** from the dropdown menu
4. You'll be taken to the Interview Setup page

### Option 2: Direct URL
Navigate to: `http://localhost:3000/#/app/interview/setup`

## Testing Flow

### 1. Interview Setup Page
**URL:** `/#/app/interview/setup`

**Test:**
- Fill in job description (paste any job posting)
- Enter company name (e.g., "Amazon", "Google", "Microsoft")
- Select interview type (Technical, Behavioral, or Mixed)
- Select difficulty level (Entry, Mid, or Senior)
- Select duration (15, 30, 45, or 60 minutes)
- Click "Start Interview"

**Expected:**
- Form validation works
- API call to `/interview/setup` succeeds
- Redirects to Interview Room with sessionId

### 2. Interview Room
**URL:** `/#/app/interview/room/:sessionId`

**Test:**
- First question appears automatically
- Progress bar shows "Question 1 of X"
- Timer starts counting
- Type an answer in the text area
- Click "Submit Answer"
- Next question appears
- Continue until all questions are answered

**Expected:**
- Questions are relevant to job description
- Questions reflect company style (if company is well-known)
- Progress bar updates correctly
- Can end interview early with "End Interview" button
- After last question, shows completion screen

### 3. Feedback Page
**URL:** `/#/app/interview/feedback/:sessionId`

**Test:**
- View overall score (1-10)
- Check summary feedback
- Review strengths and areas for improvement
- Expand question-by-question feedback
- View communication skills breakdown
- View technical accuracy score
- View company fit score
- Read recommendations

**Expected:**
- Feedback is detailed and specific
- Scores are reasonable
- Suggestions are actionable
- Can click "Practice Again" to start new interview
- Can click "View History" to see past interviews

### 4. History Page
**URL:** `/#/app/interview/history`

**Test:**
- View list of past interviews
- See company names, dates, scores
- Click "View Feedback" on completed interviews
- Click "Continue" on in-progress interviews
- Click "New Interview" to start fresh

**Expected:**
- All past interviews are listed
- Most recent interviews appear first
- Can navigate to feedback from history
- Empty state shows when no history exists

## API Endpoints to Test

### 1. Setup Interview
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/setup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Senior Software Engineer...",
    "companyName": "Amazon",
    "interviewType": "mixed",
    "difficulty": "senior",
    "duration": 30
  }'
```

### 2. Company Research
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/company-research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Google"
  }'
```

### 3. Start Interview
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/conduct \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "action": "start"
  }'
```

### 4. Submit Answer
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/conduct \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "action": "answer",
    "answer": "Your answer here..."
  }'
```

### 5. Get Feedback
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/feedback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID"
  }'
```

### 6. Get History
```bash
curl -X GET https://YOUR-API-ENDPOINT/beta/interview/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Issues & Solutions

### Issue: "Failed to create interview session"
**Solution:**
- Check if backend is deployed: `aws cloudformation describe-stacks --stack-name resume-optimizer-stack-beta`
- Verify API endpoint in `.env.beta` matches deployed endpoint
- Check browser console for detailed error

### Issue: "Failed to start interview"
**Solution:**
- Check Lambda logs: `/aws/lambda/InterviewConductorHandler-beta`
- Verify Bedrock permissions in IAM role
- Check if session exists in DynamoDB

### Issue: Questions are generic/not company-specific
**Solution:**
- This is expected for unknown companies
- Try well-known companies: Amazon, Google, Microsoft, Meta, Apple
- Company research is cached for 30 days

### Issue: Feedback takes too long to generate
**Solution:**
- Normal for first request (AI processing)
- Subsequent requests use cache
- Check Lambda timeout settings (should be 90s)

## Browser Console Debugging

Open browser console (F12) and look for:
- `Interview session created: <sessionId>`
- `Interview started`
- `Interview completed`
- `Feedback loaded`

## CloudWatch Logs

Check Lambda logs for debugging:
```bash
# Interview Setup
aws logs tail /aws/lambda/InterviewSetupHandler-beta --follow

# Company Research
aws logs tail /aws/lambda/CompanyResearchHandler-beta --follow

# Interview Conductor
aws logs tail /aws/lambda/InterviewConductorHandler-beta --follow

# Feedback Analyzer
aws logs tail /aws/lambda/FeedbackAnalyzerHandler-beta --follow
```

## DynamoDB Data

### Check Interview Sessions
```bash
aws dynamodb scan --table-name InterviewSessions-beta --limit 5
```

### Check Company Profiles
```bash
aws dynamodb scan --table-name CompanyProfiles-beta --limit 5
```

## Performance Expectations

- **Interview Setup:** < 2 seconds
- **Company Research (first time):** 5-10 seconds
- **Company Research (cached):** < 1 second
- **Question Generation:** 3-5 seconds
- **Answer Processing:** 2-3 seconds
- **Feedback Generation:** 10-15 seconds

## Test Scenarios

### Scenario 1: Quick Technical Interview
- Company: Google
- Type: Technical
- Difficulty: Mid
- Duration: 15 minutes
- Expected: 3-4 technical questions

### Scenario 2: Behavioral Interview
- Company: Amazon
- Type: Behavioral
- Difficulty: Senior
- Duration: 30 minutes
- Expected: 6-8 behavioral questions (Leadership Principles)

### Scenario 3: Mixed Interview
- Company: Microsoft
- Type: Mixed
- Difficulty: Entry
- Duration: 45 minutes
- Expected: 8-10 mixed questions

## Success Criteria

✅ Can create interview session
✅ Questions are relevant to job description
✅ Can submit answers and progress through interview
✅ Interview completes successfully
✅ Feedback is generated with scores
✅ Can view interview history
✅ Can start multiple interviews
✅ Company research is cached properly

## Next Steps After Testing

1. **If everything works:**
   - Commit frontend changes
   - Push to GitHub
   - Deploy to Amplify

2. **If issues found:**
   - Check CloudWatch logs
   - Verify DynamoDB data
   - Test API endpoints directly
   - Check browser console errors

## Support

For issues or questions:
- Check `MOCK_INTERVIEW_FEATURE.md` for detailed documentation
- Review Lambda function code in `backend/lambda-functions/`
- Check CloudFormation template in `backend/templates/resume-optimizer-stack.yaml`
