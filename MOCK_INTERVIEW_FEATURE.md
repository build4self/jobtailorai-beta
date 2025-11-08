# Mock Interview Room Feature - MVP

## Overview
The Mock Interview Room is an AI-powered interview simulation feature that helps candidates practice for real interviews. It generates company-specific questions, conducts realistic interviews, and provides comprehensive feedback.

## Backend Architecture

### DynamoDB Tables

#### 1. InterviewSessions-beta
Stores all interview sessions and their data.
- **Primary Key:** `sessionId` (String)
- **GSI:** `userId-createdAt-index` for querying user's interview history
- **Attributes:**
  - sessionId, userId, companyName, jobDescription
  - interviewType, difficulty, duration
  - questions[], answers[], currentQuestionIndex
  - status, feedback, timestamps

#### 2. CompanyProfiles-beta
Caches company interview research (30-day TTL).
- **Primary Key:** `companyName` (String)
- **TTL:** Enabled on `ttl` attribute
- **Attributes:**
  - companyName, profile{}, updatedAt, ttl

### Lambda Functions

#### 1. InterviewSetupHandler-beta
**Purpose:** Initialize new interview sessions
**Endpoint:** `POST /interview/setup`
**Input:**
```json
{
  "jobDescription": "string",
  "companyName": "string",
  "interviewType": "technical|behavioral|mixed",
  "difficulty": "entry|mid|senior",
  "duration": 15|30|45|60,
  "resume": "string (optional)"
}
```
**Output:**
```json
{
  "sessionId": "uuid",
  "message": "Interview session created successfully",
  "session": {...}
}
```

#### 2. CompanyResearchHandler-beta
**Purpose:** Research and cache company interview styles
**Endpoint:** `POST /interview/company-research`
**Input:**
```json
{
  "companyName": "string",
  "forceRefresh": false
}
```
**Output:**
```json
{
  "companyName": "string",
  "profile": {
    "interviewStyle": "string",
    "questionTypes": ["string"],
    "values": ["string"],
    "tips": ["string"],
    "notablePractices": "string"
  },
  "cached": boolean
}
```

#### 3. InterviewConductorHandler-beta
**Purpose:** Conduct the interview - generate questions and process answers
**Endpoint:** `POST /interview/conduct`
**Actions:**
- `start`: Generate questions and return first question
- `answer`: Process answer and return next question or follow-up
- `next`: Skip to next question
- `complete`: Mark interview as complete

**Input:**
```json
{
  "sessionId": "string",
  "action": "start|answer|next|complete",
  "answer": "string (for answer action)"
}
```

**Output (start/next):**
```json
{
  "question": "string",
  "questionNumber": 1,
  "totalQuestions": 8,
  "sessionId": "string"
}
```

**Output (answer):**
```json
{
  "type": "follow_up|next_question|complete",
  "question": "string (if not complete)",
  "questionNumber": 2,
  "totalQuestions": 8,
  "sessionId": "string"
}
```

#### 4. FeedbackAnalyzerHandler-beta
**Purpose:** Generate comprehensive feedback and retrieve history
**Endpoints:**
- `POST /interview/feedback` - Generate feedback
- `GET /interview/history` - Get user's interview history

**Input (feedback):**
```json
{
  "sessionId": "string"
}
```

**Output (feedback):**
```json
{
  "sessionId": "string",
  "feedback": {
    "overallScore": 8,
    "summary": "string",
    "strengths": ["string"],
    "areasForImprovement": ["string"],
    "questionFeedback": [
      {
        "question": "string",
        "yourAnswer": "string",
        "score": 8,
        "feedback": "string",
        "suggestedAnswer": "string"
      }
    ],
    "communicationSkills": {
      "clarity": 8,
      "conciseness": 7,
      "confidence": 8,
      "feedback": "string"
    },
    "technicalAccuracy": {
      "score": 8,
      "feedback": "string"
    },
    "companyFit": {
      "score": 7,
      "feedback": "string"
    },
    "recommendations": ["string"]
  },
  "cached": false
}
```

**Output (history):**
```json
{
  "history": [
    {
      "sessionId": "string",
      "companyName": "string",
      "interviewType": "string",
      "difficulty": "string",
      "status": "string",
      "createdAt": 1234567890,
      "completedAt": 1234567890,
      "overallScore": 8
    }
  ],
  "count": 10
}
```

## API Endpoints Summary

| Method | Endpoint | Lambda | Auth | Purpose |
|--------|----------|--------|------|---------|
| POST | /interview/setup | InterviewSetupHandler-beta | ✓ | Create interview session |
| POST | /interview/company-research | CompanyResearchHandler-beta | ✓ | Research company |
| POST | /interview/conduct | InterviewConductorHandler-beta | ✓ | Conduct interview |
| POST | /interview/feedback | FeedbackAnalyzerHandler-beta | ✓ | Generate feedback |
| GET | /interview/history | FeedbackAnalyzerHandler-beta | ✓ | Get interview history |

## User Flow

1. **Setup Phase**
   - User provides job description, company name, interview type, difficulty, duration
   - System creates session and optionally researches company

2. **Interview Phase**
   - User starts interview (`action: start`)
   - System generates questions based on job requirements and company style
   - User answers questions one by one
   - System may ask follow-up questions for clarification
   - Interview continues until all questions are answered or time expires

3. **Feedback Phase**
   - User requests feedback
   - System analyzes all Q&A pairs using AI
   - Generates comprehensive feedback with scores and recommendations
   - Feedback is cached for future retrieval

4. **History**
   - User can view all past interviews
   - Track improvement over time
   - Review previous feedback

## AI Integration (Bedrock)

### Models Used
- **Claude 3 Sonnet** (`anthropic.claude-3-sonnet-20240229-v1:0`)

### AI Tasks
1. **Company Research:** Analyze company interview style and culture
2. **Question Generation:** Create relevant, company-specific questions
3. **Feedback Analysis:** Evaluate answers and provide detailed feedback

## Frontend Integration (To Be Built)

### Required Pages

#### 1. Interview Setup Page (`/mock-interview/setup`)
- Form to collect interview parameters
- Company name autocomplete
- Job description input (can pre-fill from resume optimization)
- Interview type selector
- Difficulty and duration selectors

#### 2. Interview Room Page (`/mock-interview/room/:sessionId`)
- Question display area
- Answer input (text area)
- Timer showing remaining time
- Question counter (e.g., "Question 3 of 8")
- Submit answer button
- Skip question button (optional)
- End interview button

#### 3. Feedback Page (`/mock-interview/feedback/:sessionId`)
- Overall score display
- Summary section
- Strengths and areas for improvement
- Question-by-question breakdown
- Communication skills assessment
- Technical accuracy scores
- Company fit analysis
- Recommendations
- "Practice Again" button

#### 4. History Page (`/mock-interview/history`)
- List of past interviews
- Sortable by date, company, score
- Click to view detailed feedback
- Progress tracking visualization

### API Integration Example

```javascript
// Setup interview
const setupResponse = await fetch(`${API_ENDPOINT}/interview/setup`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobDescription: jobDesc,
    companyName: company,
    interviewType: 'mixed',
    difficulty: 'mid',
    duration: 30
  })
});
const { sessionId } = await setupResponse.json();

// Start interview
const startResponse = await fetch(`${API_ENDPOINT}/interview/conduct`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    action: 'start'
  })
});
const { question, questionNumber, totalQuestions } = await startResponse.json();

// Submit answer
const answerResponse = await fetch(`${API_ENDPOINT}/interview/conduct`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId,
    action: 'answer',
    answer: userAnswer
  })
});

// Get feedback
const feedbackResponse = await fetch(`${API_ENDPOINT}/interview/feedback`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.dumps({
    sessionId
  })
});
const { feedback } = await feedbackResponse.json();
```

## Deployment

### Update CloudFormation Stack
```bash
export AWS_PROFILE=jobtailorai-beta
./deploy-beta.sh
```

This will:
1. Create DynamoDB tables
2. Deploy Lambda functions
3. Create API Gateway endpoints
4. Set up IAM roles and permissions

### Deploy Lambda Functions
The deploy script will automatically package and deploy all Lambda functions including the new interview handlers.

## Testing

### Test Interview Setup
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/setup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Senior Software Engineer role...",
    "companyName": "Amazon",
    "interviewType": "mixed",
    "difficulty": "senior",
    "duration": 45
  }'
```

### Test Company Research
```bash
curl -X POST https://YOUR-API-ENDPOINT/beta/interview/company-research \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Google"
  }'
```

## Future Enhancements

### Phase 2
- Voice-based interviews (speech-to-text/text-to-speech)
- Real-time hints and guidance
- Video simulation with AI avatar
- Live coding challenges for technical roles

### Phase 3
- Whiteboard/screen sharing simulation
- Peer comparison analytics
- Interview coach recommendations
- Scheduled practice sessions
- Mobile app support

### Phase 4
- Team practice sessions
- Hiring manager insights
- Integration with job applications
- Interview preparation courses

## Monitoring & Metrics

### Key Metrics to Track
- Number of interviews conducted
- Average interview duration
- Completion rate
- Average scores by company/role
- User improvement over time
- Most common areas for improvement

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/InterviewSetupHandler-beta`, etc.
- API Gateway logs: Monitor request/response patterns
- DynamoDB metrics: Read/write capacity usage

## Cost Estimation

### Per Interview (30 min, 8 questions)
- DynamoDB: ~$0.0001 (writes + reads)
- Lambda: ~$0.002 (execution time)
- Bedrock: ~$0.05 (Claude 3 Sonnet tokens)
- API Gateway: ~$0.0001
- **Total: ~$0.052 per interview**

### Monthly (1000 interviews)
- **Estimated cost: ~$52/month**

## Security Considerations

1. **Authentication:** All endpoints require Cognito authentication
2. **Authorization:** Users can only access their own sessions
3. **Data Privacy:** Interview data is user-specific and isolated
4. **Rate Limiting:** Consider adding rate limits to prevent abuse
5. **Input Validation:** All inputs are validated before processing

## Support & Troubleshooting

### Common Issues

1. **Session not found**
   - Verify sessionId is correct
   - Check if session was created successfully

2. **Bedrock errors**
   - Check IAM permissions for Bedrock access
   - Verify model ID is correct
   - Check token limits

3. **DynamoDB errors**
   - Verify table names match environment
   - Check IAM permissions
   - Monitor capacity usage

### Debug Mode
Enable detailed logging by setting Lambda environment variable:
```
LOG_LEVEL=DEBUG
```

## Next Steps

1. ✅ Backend infrastructure deployed
2. ⏳ Build frontend components
3. ⏳ Add integration with resume optimization flow
4. ⏳ Implement analytics dashboard
5. ⏳ Add voice/video features
6. ⏳ Launch beta testing

---

**Status:** Backend MVP Complete ✅
**Last Updated:** November 7, 2024
**Version:** 1.0.0-beta
