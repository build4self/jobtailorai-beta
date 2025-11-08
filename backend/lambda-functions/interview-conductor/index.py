import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('InterviewSessions-beta')
company_profiles_table = dynamodb.Table('CompanyProfiles-beta')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    """
    Conduct the interview - handle question generation and answer processing
    Expected input:
    {
        "sessionId": "session-id",
        "action": "start|answer|next",
        "answer": "user's answer" (for answer action)
    }
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
        
        # Parse request body
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
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

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
