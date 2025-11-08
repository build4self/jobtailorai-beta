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
        
        if '/setup' in path:
            return handle_setup(event, headers)
        elif '/company-research' in path:
            return handle_company_research(event, headers)
        elif '/conduct' in path:
            return handle_conduct(event, headers)
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
        elif action == 'next':
            return handle_next(session, headers)
        elif action == 'complete':
            return handle_complete(session, headers)
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
        
        # Return first question
        first_question = questions[0] if questions else None
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Interview started',
                'question': first_question,
                'questionNumber': 1,
                'totalQuestions': len(questions),
                'sessionId': session['sessionId']
            })
        }
        
    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise

def handle_answer(session, answer, headers):
    """Process user's answer and provide follow-up or next question"""
    try:
        current_index = session.get('currentQuestionIndex', 0)
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

def handle_next(session, headers):
    """Skip to next question"""
    current_index = session.get('currentQuestionIndex', 0)
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
    duration = session.get('duration', 30)
    resume = session.get('resume', '')
    
    # Calculate number of questions based on duration
    num_questions = max(5, duration // 5)  # ~5 min per question
    
    prompt = f"""You are an expert interviewer for {company_name}. Generate {num_questions} interview questions for the following role:

Job Description:
{job_description}

Interview Type: {interview_type}
Difficulty Level: {difficulty}
Duration: {duration} minutes

Company Interview Style:
{json.dumps(company_profile, indent=2)}

{f"Candidate's Resume: {resume[:500]}" if resume else ""}

Generate {num_questions} questions that:
1. Match the interview type ({interview_type})
2. Are appropriate for {difficulty} level
3. Reflect {company_name}'s interview style and values
4. Are specific to the job requirements
5. Progress from easier to harder

Return ONLY a JSON array of question strings, no other text.
Example: ["Question 1?", "Question 2?", "Question 3?"]"""
    
    try:
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
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
        
        # Parse questions
        questions = json.loads(content)
        
        if not isinstance(questions, list):
            raise ValueError("Questions must be a list")
        
        return questions[:num_questions]
        
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        # Fallback questions
        return [
            "Tell me about yourself and your background.",
            "Why are you interested in this position?",
            "What are your key strengths for this role?",
            "Describe a challenging project you've worked on.",
            "Where do you see yourself in 5 years?"
        ][:num_questions]

def generate_follow_up(question, answer, session):
    """Decide if a follow-up question is needed"""
    
    # Simple heuristic: if answer is too short, ask for more details
    if len(answer.split()) < 20:
        return "Could you elaborate on that a bit more?"
    
    # For now, no follow-ups to keep it simple
    return None

def research_company(company_name):
    """Use Bedrock to research company interview style"""
    
    prompt = f"""Research and provide detailed information about {company_name}'s interview process and culture.

Please provide:
1. Interview Style: How does {company_name} typically conduct interviews?
2. Common Question Types: What types of questions do they commonly ask?
3. Company Values: What are their core values and culture?
4. Interview Tips: Specific tips for interviewing at {company_name}
5. Notable Practices: Any unique interview practices or frameworks they use (e.g., Amazon's Leadership Principles, Google's structured interviews)

Format your response as a JSON object with these keys: interviewStyle, questionTypes, values, tips, notablePractices"""
    
    try:
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
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
        
        # Try to parse as JSON, fallback to structured text
        try:
            profile = json.loads(content)
        except:
            # If not valid JSON, create structured response
            profile = {
                'interviewStyle': content[:500],
                'questionTypes': ['Behavioral', 'Technical', 'Problem-solving'],
                'values': ['Innovation', 'Collaboration', 'Excellence'],
                'tips': [content[500:1000]] if len(content) > 500 else [content],
                'notablePractices': 'Standard interview process'
            }
        
        return profile
        
    except Exception as e:
        logger.error(f"Error calling Bedrock: {str(e)}")
        # Return generic profile on error
        return {
            'interviewStyle': 'Standard professional interview process',
            'questionTypes': ['Behavioral', 'Technical', 'Situational'],
            'values': ['Professionalism', 'Teamwork', 'Results-oriented'],
            'tips': ['Be prepared to discuss your experience', 'Ask thoughtful questions', 'Show enthusiasm'],
            'notablePractices': 'Multi-round interview process'
        }
