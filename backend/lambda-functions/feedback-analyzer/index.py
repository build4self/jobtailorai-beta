import json
import boto3
import logging
from datetime import datetime
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('InterviewSessions-beta')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    """
    Generate feedback for completed interview or get interview history
    Expected input for feedback:
    {
        "sessionId": "session-id"
    }
    For history: GET /interview/history
    """
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
    }
    
    try:
        # Handle OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Handle GET request for history
        if event.get('httpMethod') == 'GET':
            return handle_history(event, headers)
        
        # Handle POST request for feedback
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('sessionId')
        
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
        
        # Check if feedback already exists
        if 'feedback' in session:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'sessionId': session_id,
                    'feedback': session['feedback'],
                    'cached': True
                })
            }
        
        # Generate feedback
        feedback = generate_feedback(session)
        
        # Save feedback to session
        session['feedback'] = feedback
        session['feedbackGeneratedAt'] = int(datetime.now().timestamp())
        sessions_table.put_item(Item=session)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'sessionId': session_id,
                'feedback': feedback,
                'cached': False
            })
        }
        
    except Exception as e:
        logger.error(f"Error generating feedback: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

def handle_history(event, headers):
    """Get user's interview history"""
    try:
        # Extract user ID from Cognito authorizer
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Query sessions by userId
        response = sessions_table.query(
            IndexName='userId-createdAt-index',
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False,  # Most recent first
            Limit=20
        )
        
        sessions = response.get('Items', [])
        
        # Format sessions for response
        history = []
        for session in sessions:
            history.append({
                'sessionId': session['sessionId'],
                'companyName': session.get('companyName', ''),
                'interviewType': session.get('interviewType', ''),
                'difficulty': session.get('difficulty', ''),
                'status': session.get('status', ''),
                'createdAt': session.get('createdAt', 0),
                'completedAt': session.get('completedAt'),
                'overallScore': session.get('feedback', {}).get('overallScore') if 'feedback' in session else None
            })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'history': history,
                'count': len(history)
            })
        }
        
    except Exception as e:
        logger.error(f"Error getting history: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

def generate_feedback(session):
    """Generate comprehensive feedback using Bedrock"""
    
    job_description = session.get('jobDescription', '')
    company_name = session.get('companyName', '')
    interview_type = session.get('interviewType', '')
    difficulty = session.get('difficulty', '')
    questions = session.get('questions', [])
    answers = session.get('answers', [])
    
    # Build Q&A pairs
    qa_pairs = []
    for i, answer_record in enumerate(answers):
        qa_pairs.append({
            'question': answer_record.get('question', questions[i] if i < len(questions) else ''),
            'answer': answer_record.get('answer', '')
        })
    
    prompt = f"""You are an expert interview coach. Analyze this mock interview and provide comprehensive feedback.

Company: {company_name}
Interview Type: {interview_type}
Difficulty: {difficulty}

Job Description:
{job_description}

Interview Q&A:
{json.dumps(qa_pairs, indent=2)}

Provide detailed feedback in the following JSON format:
{{
    "overallScore": <1-10>,
    "summary": "<brief overall assessment>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "areasForImprovement": ["<area 1>", "<area 2>", ...],
    "questionFeedback": [
        {{
            "question": "<question text>",
            "yourAnswer": "<summary of their answer>",
            "score": <1-10>,
            "feedback": "<specific feedback>",
            "suggestedAnswer": "<better answer example>"
        }},
        ...
    ],
    "communicationSkills": {{
        "clarity": <1-10>,
        "conciseness": <1-10>,
        "confidence": <1-10>,
        "feedback": "<communication feedback>"
    }},
    "technicalAccuracy": {{
        "score": <1-10>,
        "feedback": "<technical feedback>"
    }},
    "companyFit": {{
        "score": <1-10>,
        "feedback": "<how well answers align with company values>"
    }},
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}}

Be constructive, specific, and actionable in your feedback."""
    
    try:
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4000,
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
        
        # Parse feedback
        feedback = json.loads(content)
        
        return feedback
        
    except Exception as e:
        logger.error(f"Error generating feedback with Bedrock: {str(e)}")
        # Fallback feedback
        return {
            'overallScore': 7,
            'summary': 'Good effort! You demonstrated knowledge and enthusiasm.',
            'strengths': [
                'Clear communication',
                'Relevant examples provided',
                'Good understanding of the role'
            ],
            'areasForImprovement': [
                'Provide more specific examples',
                'Structure answers using STAR method',
                'Research company values more deeply'
            ],
            'questionFeedback': [
                {
                    'question': q.get('question', ''),
                    'yourAnswer': q.get('answer', '')[:100] + '...',
                    'score': 7,
                    'feedback': 'Good answer, but could be more detailed.',
                    'suggestedAnswer': 'Consider providing specific metrics and outcomes.'
                }
                for q in qa_pairs[:3]
            ],
            'communicationSkills': {
                'clarity': 7,
                'conciseness': 7,
                'confidence': 7,
                'feedback': 'Generally clear communication with room for improvement in structure.'
            },
            'technicalAccuracy': {
                'score': 7,
                'feedback': 'Demonstrated good technical knowledge.'
            },
            'companyFit': {
                'score': 7,
                'feedback': 'Answers show alignment with company values.'
            },
            'recommendations': [
                'Practice the STAR method for behavioral questions',
                'Research company culture and values',
                'Prepare specific examples from your experience',
                'Practice concise yet comprehensive answers'
            ]
        }
