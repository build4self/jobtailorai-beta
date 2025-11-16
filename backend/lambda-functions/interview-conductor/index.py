import json
import boto3
import uuid
import logging
from datetime import datetime, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('InterviewSessions-beta')
company_profiles_table = dynamodb.Table('CompanyProfiles-beta')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    """
    Unified handler for all interview operations:
    - Setup: Create interview session
    - Company Research: Research company interview style
    - Conduct: Generate questions and handle Q&A
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    try:
        # Handle OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Route based on path
        path = event.get('path', '')
        http_method = event.get('httpMethod', '')
        
        if '/setup' in path:
            return handle_setup(event, headers)
        elif '/company-research' in path:
            return handle_company_research(event, headers)
        elif '/conduct' in path:
            return handle_conduct(event, headers)
        elif '/sessions' in path and http_method == 'GET':
            return handle_get_saved_sessions(event, headers)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid endpoint'})
            }
        
    except Exception as e:
        logger.error(f"Error in interview handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

def handle_setup(event, headers):
    """Setup a new mock interview session"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Extract user ID from Cognito authorizer
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Validate required fields
        required_fields = ['jobDescription', 'companyName', 'interviewType', 'difficulty', 'duration']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        timestamp = int(datetime.now().timestamp())
        
        # Create session record
        session = {
            'sessionId': session_id,
            'userId': user_id,
            'jobDescription': body['jobDescription'],
            'companyName': body['companyName'],
            'interviewType': body['interviewType'],
            'difficulty': body['difficulty'],
            'duration': body['duration'],
            'resume': body.get('resume', ''),
            'status': 'initialized',
            'createdAt': timestamp,
            'updatedAt': timestamp,
            'questions': [],
            'answers': [],
            'currentQuestionIndex': 0
        }
        
        # Save to DynamoDB
        sessions_table.put_item(Item=session)
        
        logger.info(f"Created interview session {session_id} for user {user_id}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'sessionId': session_id,
                'message': 'Interview session created successfully',
                'session': {
                    'sessionId': session_id,
                    'companyName': body['companyName'],
                    'interviewType': body['interviewType'],
                    'difficulty': body['difficulty'],
                    'duration': body['duration'],
                    'status': 'initialized'
                }
            })
        }
        
    except Exception as e:
        logger.error(f"Error creating interview session: {str(e)}")
        raise

def handle_company_research(event, headers):
    """Research company interview style and cache results"""
    try:
        body = json.loads(event.get('body', '{}'))
        company_name = body.get('companyName', '').strip()
        force_refresh = body.get('forceRefresh', False)
        
        if not company_name:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Company name is required'})
            }
        
        # Check cache first (unless force refresh)
        if not force_refresh:
            try:
                response = company_profiles_table.get_item(Key={'companyName': company_name})
                if 'Item' in response:
                    cached_profile = response['Item']
                    logger.info(f"Using cached profile for {company_name}")
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({
                            'companyName': company_name,
                            'profile': cached_profile.get('profile', {}),
                            'cached': True
                        })
                    }
            except Exception as e:
                logger.warning(f"Error checking cache: {str(e)}")
        
        # Research company using Bedrock
        logger.info(f"Researching company: {company_name}")
        profile = research_company(company_name)
        
        # Cache the result (TTL: 30 days)
        ttl = int((datetime.now() + timedelta(days=30)).timestamp())
        company_profiles_table.put_item(Item={
            'companyName': company_name,
            'profile': profile,
            'updatedAt': int(datetime.now().timestamp()),
            'ttl': ttl
        })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'companyName': company_name,
                'profile': profile,
                'cached': False
            })
        }
        
    except Exception as e:
        logger.error(f"Error researching company: {str(e)}")
        raise

def handle_conduct(event, headers):
    """Conduct interview - generate questions and handle Q&A"""
    try:
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('sessionId')
        action = body.get('action', 'start')
        
        if not session_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Session ID is required'})
            }
        
        # Get session from DynamoDB
        response = sessions_table.get_item(Key={'sessionId': session_id})
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Session not found'})
            }
        
        session = response['Item']
        
        # Handle different actions
        if action == 'start':
            return handle_start(session, headers)
        elif action == 'answer':
            answer = body.get('answer', '')
            return handle_answer(session, answer, headers)
        elif action == 'submit-answers':
            answers = body.get('answers', {})
            return handle_submit_answers(session, answers, headers)
        elif action == 'next':
            return handle_next(session, headers)
        elif action == 'complete':
            return handle_complete(session, headers)
        elif action == 'save-to-profile':
            return handle_save_to_profile(session, headers)
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': f'Invalid action: {action}'})
            }
        
    except Exception as e:
        logger.error(f"Error conducting interview: {str(e)}")
        raise

def handle_start(session, headers):
    """Generate initial questions for the interview"""
    try:
        # Get company profile
        company_profile = get_company_profile(session['companyName'])
        
        # Generate questions
        questions = generate_questions(session, company_profile)
        
        # Update session
        session['questions'] = questions
        session['status'] = 'in_progress'
        session['startedAt'] = int(datetime.now().timestamp())
        session['currentQuestionIndex'] = 0
        session['answers'] = []
        
        sessions_table.put_item(Item=session)
        
        # Return ALL questions
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Interview started',
                'questions': questions,  # Return all questions
                'totalQuestions': len(questions),
                'duration': int(session.get('duration', 30)),  # Return duration
                'sessionId': session['sessionId']
            })
        }
        
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise

def handle_answer(session, answer, headers):
    """Process user's answer and provide follow-up or next question"""
    try:
        # Convert Decimal to int for list indexing (DynamoDB returns Decimal)
        current_index = int(session.get('currentQuestionIndex', 0))
        questions = session.get('questions', [])
        
        if current_index >= len(questions):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'No more questions'})
            }
        
        current_question = questions[current_index]
        
        # Save answer
        answer_record = {
            'questionIndex': current_index,
            'question': current_question,
            'answer': answer,
            'timestamp': int(datetime.now().timestamp())
        }
        
        if 'answers' not in session:
            session['answers'] = []
        session['answers'].append(answer_record)
        
        # Decide if we need a follow-up or move to next question
        follow_up = generate_follow_up(current_question, answer, session)
        
        if follow_up:
            # Add follow-up question
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'type': 'follow_up',
                    'question': follow_up,
                    'questionNumber': current_index + 1,
                    'totalQuestions': len(questions),
                    'sessionId': session['sessionId']
                })
            }
        else:
            # Move to next question
            session['currentQuestionIndex'] = current_index + 1
            sessions_table.put_item(Item=session)
            
            if current_index + 1 < len(questions):
                next_question = questions[current_index + 1]
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'type': 'next_question',
                        'question': next_question,
                        'questionNumber': current_index + 2,
                        'totalQuestions': len(questions),
                        'sessionId': session['sessionId']
                    })
                }
            else:
                # Interview complete
                session['status'] = 'completed'
                session['completedAt'] = int(datetime.now().timestamp())
                sessions_table.put_item(Item=session)
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'type': 'complete',
                        'message': 'Interview completed',
                        'sessionId': session['sessionId']
                    })
                }
        
    except Exception as e:
        logger.error(f"Error handling answer: {str(e)}")
        raise

def handle_submit_answers(session, answers_dict, headers):
    """Submit all answers at once (for bulk submission at interview end)"""
    try:
        questions = session.get('questions', [])
        
        # Convert answers dict to list format
        answer_records = []
        for index_str, answer_text in answers_dict.items():
            index = int(index_str)
            if index < len(questions):
                answer_records.append({
                    'questionIndex': index,
                    'question': questions[index],
                    'answer': answer_text,
                    'timestamp': int(datetime.now().timestamp())
                })
        
        # Save all answers to session
        session['answers'] = answer_records
        session['updatedAt'] = int(datetime.now().timestamp())
        sessions_table.put_item(Item=session)
        
        logger.info(f"Submitted {len(answer_records)} answers for session {session['sessionId']}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Answers submitted successfully',
                'answersCount': len(answer_records),
                'sessionId': session['sessionId']
            })
        }
        
    except Exception as e:
        logger.error(f"Error submitting answers: {str(e)}")
        raise

def handle_next(session, headers):
    """Skip to next question"""
    # Convert Decimal to int for list indexing (DynamoDB returns Decimal)
    current_index = int(session.get('currentQuestionIndex', 0))
    questions = session.get('questions', [])
    
    session['currentQuestionIndex'] = current_index + 1
    sessions_table.put_item(Item=session)
    
    if current_index + 1 < len(questions):
        next_question = questions[current_index + 1]
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'question': next_question,
                'questionNumber': current_index + 2,
                'totalQuestions': len(questions),
                'sessionId': session['sessionId']
            })
        }
    else:
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'type': 'complete',
                'message': 'No more questions',
                'sessionId': session['sessionId']
            })
        }

def handle_complete(session, headers):
    """Mark interview as complete"""
    session['status'] = 'completed'
    session['completedAt'] = int(datetime.now().timestamp())
    sessions_table.put_item(Item=session)
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': 'Interview completed',
            'sessionId': session['sessionId']
        })
    }

def handle_save_to_profile(session, headers):
    """Mark interview as saved to profile"""
    session['savedToProfile'] = True
    session['savedAt'] = int(datetime.now().timestamp())
    sessions_table.put_item(Item=session)
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': 'Interview saved to profile',
            'sessionId': session['sessionId']
        })
    }

def handle_get_saved_sessions(event, headers):
    """Get all saved interview sessions for the current user"""
    try:
        # Extract user ID from Cognito authorizer
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Query DynamoDB for user's saved sessions
        # Note: This requires a GSI on userId if not using scan
        # For now, using scan with filter (not ideal for production with many records)
        response = sessions_table.scan(
            FilterExpression='userId = :uid AND savedToProfile = :saved',
            ExpressionAttributeValues={
                ':uid': user_id,
                ':saved': True
            }
        )
        
        sessions = response.get('Items', [])
        
        # Sort by savedAt timestamp (most recent first)
        sessions.sort(key=lambda x: x.get('savedAt', 0), reverse=True)
        
        # Return simplified session data (not full questions/answers)
        simplified_sessions = []
        for session in sessions:
            simplified_sessions.append({
                'sessionId': session.get('sessionId'),
                'companyName': session.get('companyName'),
                'interviewType': session.get('interviewType'),
                'duration': int(session.get('duration', 0)),
                'savedAt': int(session.get('savedAt', 0)),
                'completedAt': int(session.get('completedAt', 0)),
                'totalQuestions': len(session.get('questions', [])),
                'answeredQuestions': len([a for a in session.get('answers', []) if a.get('answer', '').strip()])
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'sessions': simplified_sessions,
                'count': len(simplified_sessions)
            })
        }
        
    except Exception as e:
        logger.error(f"Error fetching saved sessions: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Failed to fetch saved sessions', 'details': str(e)})
        }

def get_company_profile(company_name):
    """Get company profile from cache"""
    try:
        response = company_profiles_table.get_item(Key={'companyName': company_name})
        if 'Item' in response:
            return response['Item'].get('profile', {})
    except Exception as e:
        logger.warning(f"Error getting company profile: {str(e)}")
    
    return {}

def generate_questions(session, company_profile):
    """Generate interview questions using Bedrock"""
    
    job_description = session.get('jobDescription', '')
    company_name = session.get('companyName', '')
    interview_type = session.get('interviewType', 'mixed')
    difficulty = session.get('difficulty', 'mid')
    duration = int(session.get('duration', 30))  # Convert to int from Decimal
    resume = str(session.get('resume', ''))  # Convert to string
    
    # Calculate number of questions based on duration - exact mapping
    duration_to_questions = {
        5: 1,
        15: 3,
        30: 6,
        45: 7,
        60: 9,
        90: 12
    }
    num_questions = duration_to_questions.get(duration, max(1, duration // 5))  # Fallback for custom durations
    
    # Build detailed prompt based on interview type
    if interview_type == 'technical':
        type_instruction = """Generate ONLY PURE TECHNICAL questions that test knowledge and problem-solving:

ALLOWED TECHNICAL QUESTION TYPES:
✓ Coding problems: "Write a function to...", "Implement an algorithm that..."
✓ System design: "Design a distributed system for...", "How would you architect..."
✓ Technology deep-dive: "Explain how [technology] works internally", "What's the difference between X and Y?"
✓ Problem-solving: "Given this code, identify the bug", "Optimize this database query"
✓ Technical concepts: "What is [concept] and when would you use it?", "Compare approach A vs B"
✓ Code review: "What issues do you see in this code?", "How would you refactor this?"

STRICTLY FORBIDDEN:
✗ NO "Describe a time when..." questions
✗ NO "Tell me about a situation where..." questions
✗ NO behavioral or experience-based questions
✗ NO questions about teamwork, leadership, or soft skills

All questions must test TECHNICAL KNOWLEDGE, not past experiences."""
    elif interview_type == 'behavioral':
        type_instruction = """Generate ONLY VALUE-BASED BEHAVIORAL questions that assess culture fit and values:

ALLOWED BEHAVIORAL QUESTION TYPES:
✓ Company values: "Tell me about a time when you demonstrated [company value]"
✓ Leadership principles: Questions based on company's leadership framework
✓ STAR method: "Describe a situation where you...", "Give me an example of when you..."
✓ Cultural fit: "How do you handle...", "What would you do if..."
✓ Past experiences: "Walk me through a time when...", "Share an example of..."
✓ Conflict resolution: "Tell me about a disagreement you had with a teammate"

STRICTLY FORBIDDEN:
✗ NO coding questions
✗ NO system design questions
✗ NO technical knowledge questions
✗ NO "What is [technology]?" or "How does [system] work?"
✗ NO algorithm or data structure questions

All questions must assess VALUES, BEHAVIOR, and CULTURE FIT, not technical skills."""
    else:  # mixed
        type_instruction = """Generate a balanced mix of technical and behavioral questions:

TECHNICAL QUESTIONS (60%):
- Pure technical problems, coding challenges, system design
- NO "describe a time" format - only knowledge-based questions
- Test technical skills, not experiences

BEHAVIORAL QUESTIONS (40%):
- Value-based, culture fit, leadership principles
- Use "tell me about a time" or "describe a situation" format
- Test values and behavior, not technical knowledge

Keep categories STRICTLY SEPARATED - no overlap between technical and behavioral."""
    
    # Add company profile context if available
    company_context = ""
    if company_profile:
        company_context = f"""
COMPANY INTERVIEW INTELLIGENCE:
{json.dumps(company_profile, indent=2)}

CRITICAL: Use this research to make questions authentic to {company_name}'s actual interview process."""
    else:
        company_context = f"""
COMPANY RESEARCH REQUIRED:
You must research {company_name}'s actual interview practices before generating questions."""

    prompt = f"""You are an expert interviewer preparing questions for a {company_name} interview.

STEP 1 - RESEARCH {company_name.upper()}'S INTERVIEW PROCESS:

Before generating ANY questions, research and consider:

INTERVIEW FRAMEWORK:
- Does {company_name} use a specific interview framework? (e.g., Amazon's 14 Leadership Principles, Google's structured interviews, Meta's "Jedi" behavioral framework)
- What is their typical interview structure? (phone screen → technical rounds → behavioral rounds → system design)
- Do they have unique practices? (e.g., Amazon's bar raiser, Google's hiring committee)

COMPANY VALUES & CULTURE:
- What are {company_name}'s published core values?
- What traits define success at {company_name}?
- What is their company culture known for?
- What do they emphasize in their hiring process?

TECHNICAL STANDARDS:
- What technical bar does {company_name} set for this role?
- What technologies, frameworks, or methodologies do they emphasize?
- What level of technical depth do they expect?
- Are there specific technical areas they focus on?

{company_context}

STEP 2 - ANALYZE THE ROLE:
Job Description:
{job_description if job_description else "Software Engineering Position"}

Key requirements to focus on:
- Extract specific technologies, frameworks, and skills mentioned
- Identify the seniority level and expectations
- Note any unique requirements or preferences

STEP 3 - CANDIDATE BACKGROUND:
{resume[:500] if resume else "No resume provided - generate general questions"}

STEP 4 - GENERATE {num_questions} QUESTIONS:

Interview Parameters:
- Type: {interview_type}
- Difficulty: {difficulty}
- Duration: {duration} minutes

{type_instruction}

CRITICAL REQUIREMENTS:
1. Questions MUST reflect {company_name}'s ACTUAL interview style (not generic questions)
2. Questions MUST be specific to the job description and required skills
3. For technical: Focus on technologies/concepts from the job posting
4. For behavioral: Align with {company_name}'s values and culture
5. Progress from easier to harder questions
6. Make each question realistic for a {company_name} interview
7. Avoid generic questions - be company-specific and role-specific

OUTPUT FORMAT:
Return ONLY a valid JSON array of question strings.
No explanations, no thinking process, no additional text.
Just the JSON array: ["Question 1?", "Question 2?", ...]"""
    
    try:
        logger.info(f"Generating {num_questions} questions for {interview_type} interview")
        logger.info(f"Company: {company_name}, Difficulty: {difficulty}, Duration: {duration}")
        logger.info(f"Job description length: {len(job_description)}, Resume length: {len(resume)}")
        logger.info(f"Job description preview: {job_description[:200]}")
        logger.info(f"Prompt being sent to Bedrock: {prompt[:500]}")
        
        # Using Claude 3.5 Haiku for reliability and cost optimization
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-3-5-haiku-20241022-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
        )
        
        response_body = json.loads(response['body'].read())
        content = response_body['content'][0]['text']
        
        logger.info(f"Bedrock response (first 500 chars): {content[:500]}")
        logger.info(f"Full response length: {len(content)}")
        
        # DeepSeek-R1 may include thinking process - extract the JSON array
        import re
        
        # First, try to remove thinking tags if present
        content_cleaned = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
        
        # Try to parse as direct JSON
        try:
            questions = json.loads(content_cleaned.strip())
        except json.JSONDecodeError:
            # Try to extract JSON array from anywhere in the text
            json_match = re.search(r'\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]', content, re.DOTALL)
            if json_match:
                try:
                    questions = json.loads(json_match.group())
                except:
                    # Try more aggressive extraction
                    json_match = re.search(r'\[.*?\]', content, re.DOTALL)
                    if json_match:
                        questions = json.loads(json_match.group())
                    else:
                        logger.error(f"Could not find JSON array in response: {content[:1000]}")
                        raise ValueError("Could not parse questions from response")
            else:
                logger.error(f"Could not find JSON array in response: {content[:1000]}")
                raise ValueError("Could not parse questions from response")
        
        if not isinstance(questions, list):
            raise ValueError("Questions must be a list")
        
        logger.info(f"Successfully generated {len(questions)} questions")
        return questions[:num_questions]
        
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        logger.error(f"Full error details: {repr(e)}")
        # Fallback questions - make them more technical
        fallback = [
            "Tell me about yourself and your background.",
            "Why are you interested in this position?",
            "What are your key strengths for this role?",
            "Describe a challenging project you've worked on.",
            "Where do you see yourself in 5 years?",
            "What's your experience with the technologies mentioned in the job description?",
            "How do you approach debugging complex issues?",
            "Describe your development workflow and tools you use."
        ]
        logger.warning(f"Using fallback questions due to error")
        return fallback[:num_questions]

def generate_follow_up(question, answer, session):
    """Decide if a follow-up question is needed"""
    
    # Simple heuristic: if answer is too short, ask for more details
    if len(answer.split()) < 20:
        return "Could you elaborate on that a bit more?"
    
    # For now, no follow-ups to keep it simple
    return None

def research_company(company_name):
    """Use Bedrock to research company interview style"""
    
    prompt = f"""You are an expert recruiter with deep knowledge of tech company interview processes. Research {company_name}'s interview practices.

Provide comprehensive intelligence about {company_name}'s interview process:

1. INTERVIEW FRAMEWORK:
   - Do they use a specific framework? (e.g., Amazon's 14 Leadership Principles, Google's "Googleyness & Leadership", Meta's "Jedi" behavioral framework)
   - What is their interview structure? (number of rounds, types of interviews)
   - Any unique practices? (e.g., Amazon's bar raiser, Google's hiring committee, Meta's "ninja" interviews)

2. TECHNICAL INTERVIEW STYLE:
   - What technical topics do they emphasize?
   - What's their coding interview format? (LeetCode-style, practical problems, take-home projects)
   - Do they do system design interviews? At what level?
   - What technical depth do they expect?

3. BEHAVIORAL INTERVIEW APPROACH:
   - What behavioral framework do they use? (STAR method, leadership principles, etc.)
   - What values do they assess?
   - What traits are they looking for?
   - Common behavioral question themes?

4. COMPANY VALUES & CULTURE:
   - What are their published core values?
   - What defines success at {company_name}?
   - What is their culture known for?
   - What do they emphasize in hiring?

5. SPECIFIC QUESTION PATTERNS:
   - What types of questions are commonly asked?
   - Any signature questions they're known for?
   - What topics come up frequently?

6. INTERVIEW TIPS:
   - What should candidates emphasize?
   - What are common mistakes to avoid?
   - What impresses {company_name} interviewers?

Return ONLY a valid JSON object with these keys:
{{
  "interviewFramework": "description of framework",
  "technicalStyle": "description of technical interview approach",
  "behavioralApproach": "description of behavioral interview approach",
  "coreValues": ["value1", "value2", "value3"],
  "questionPatterns": ["pattern1", "pattern2"],
  "interviewTips": ["tip1", "tip2", "tip3"],
  "notablePractices": "unique practices or frameworks"
}}

Be specific to {company_name}. If you don't have specific information, indicate that clearly."""
    
    try:
        # Using Claude 3.5 Haiku for reliability and cost optimization
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-3-5-haiku-20241022-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 3000,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
        )
        
        response_body = json.loads(response['body'].read())
        content = response_body['content'][0]['text']
        
        logger.info(f"Company research response for {company_name}: {content[:500]}")
        
        # Try to parse as JSON, with better fallback handling
        try:
            # Try direct JSON parse
            profile = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                profile = json.loads(json_match.group(1))
            else:
                # Try to find any JSON object
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
                if json_match:
                    profile = json.loads(json_match.group())
                else:
                    # Create structured response from text
                    logger.warning(f"Could not parse JSON from company research, using fallback")
                    profile = {
                        'interviewFramework': f'{company_name} uses a structured interview process',
                        'technicalStyle': 'Technical interviews focus on problem-solving and system design',
                        'behavioralApproach': 'Behavioral interviews assess culture fit and past experiences',
                        'coreValues': ['Innovation', 'Collaboration', 'Excellence', 'Customer Focus'],
                        'questionPatterns': ['Technical problem-solving', 'System design', 'Behavioral STAR questions'],
                        'interviewTips': [
                            'Research the company culture and values',
                            'Prepare specific examples from your experience',
                            'Practice coding problems and system design'
                        ],
                        'notablePractices': 'Multi-round interview process with technical and behavioral components'
                    }
        
        return profile
        
    except Exception as e:
        logger.error(f"Error calling Bedrock for company research: {str(e)}")
        # Return generic profile on error
        return {
            'interviewFramework': 'Standard professional interview process',
            'technicalStyle': 'Technical interviews covering coding and system design',
            'behavioralApproach': 'Behavioral interviews using STAR method',
            'coreValues': ['Professionalism', 'Teamwork', 'Results-oriented', 'Innovation'],
            'questionPatterns': ['Behavioral', 'Technical', 'Situational'],
            'interviewTips': [
                'Be prepared to discuss your experience',
                'Ask thoughtful questions',
                'Show enthusiasm for the role'
            ],
            'notablePractices': 'Multi-round interview process'
        }
