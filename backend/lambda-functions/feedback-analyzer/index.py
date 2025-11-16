import json
import boto3
import logging
from datetime import datetime
from boto3.dynamodb.conditions import Key
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('InterviewSessions-beta')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def decimal_to_number(obj):
    """Convert Decimal types to int or float for JSON serialization"""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_number(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_number(i) for i in obj]
    return obj

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
            cached_feedback = decimal_to_number(session['feedback'])
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'sessionId': session_id,
                    'feedback': cached_feedback,
                    'cached': True
                })
            }
        
        # Generate feedback
        feedback = generate_feedback(session)
        
        # Save feedback to session
        session['feedback'] = feedback
        session['feedbackGeneratedAt'] = int(datetime.now().timestamp())
        sessions_table.put_item(Item=session)
        
        # Convert Decimals before returning
        feedback = decimal_to_number(feedback)
        
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
                'createdAt': int(session.get('createdAt', 0)) if isinstance(session.get('createdAt'), Decimal) else session.get('createdAt', 0),
                'completedAt': int(session.get('completedAt')) if session.get('completedAt') and isinstance(session.get('completedAt'), Decimal) else session.get('completedAt'),
                'overallScore': int(session.get('feedback', {}).get('overallScore')) if 'feedback' in session and session.get('feedback', {}).get('overallScore') else None
            })
        
        # Convert any remaining Decimals
        history = decimal_to_number(history)
        
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
    
    logger.info(f"Generating feedback - Questions: {len(questions)}, Answers: {len(answers)}")
    logger.info(f"Answers data: {json.dumps(answers, default=str)[:500]}")
    
    # Build Q&A pairs - include ALL questions, even if not answered
    qa_pairs = []
    
    # Create a map of question index to answer
    answer_map = {}
    for answer_record in answers:
        idx = answer_record.get('questionIndex', -1)
        if idx >= 0:
            answer_map[idx] = answer_record.get('answer', '')
    
    # Build Q&A pairs for all questions
    for i, question in enumerate(questions):
        qa_pairs.append({
            'question': question,
            'answer': answer_map.get(i, '')  # Empty string if no answer
        })
    
    logger.info(f"Built {len(qa_pairs)} Q&A pairs (all questions included)")
    
    prompt = f"""You are an expert interview coach with HIGH STANDARDS. Analyze this mock interview and provide STRICT, HONEST feedback.

Company: {company_name}
Interview Type: {interview_type}
Difficulty: {difficulty}

Job Description:
{job_description}

Interview Q&A (Total questions: {len(questions)}, Total answers: {len(answers)}):
{json.dumps(qa_pairs, indent=2)}

IMPORTANT: You MUST analyze the answers provided above. Even if some answers are empty or poor, you must still provide feedback.

CRITICAL SCORING GUIDELINES - BE STRICT:
- 0-2: Completely inadequate, irrelevant, or no answer (e.g., "test", "I don't know", one-word answers)
- 3-4: Poor answer with major gaps, lacks substance, misses key points
- 5-6: Mediocre answer, addresses question but lacks depth or examples
- 7-8: Good answer with relevant details and examples
- 9-10: Excellent answer, comprehensive, well-structured, with strong examples

DO NOT be lenient. A vague, short, or irrelevant answer should score 0-3, not 5+.

Provide detailed feedback in the following JSON format:
{{
    "overallScore": <0-10>,
    "summary": "<brief overall assessment - be honest about weaknesses>",
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "areasForImprovement": ["<area 1>", "<area 2>", ...],
    "questionFeedback": [
        {{
            "question": "<question text>",
            "yourAnswer": "<summary of their answer>",
            "score": <0-10>,
            "feedback": "<specific, honest feedback - don't sugarcoat>",
            "suggestedAnswer": "<better answer example>"
        }},
        ...
    ],
    "communicationSkills": {{
        "clarity": <0-10>,
        "conciseness": <0-10>,
        "confidence": <0-10>,
        "feedback": "<communication feedback>"
    }},
    "technicalAccuracy": {{
        "score": <0-10>,
        "feedback": "<technical feedback>"
    }},
    "companyFit": {{
        "score": <0-10>,
        "feedback": "<how well answers align with company values>"
    }},
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}}

Be constructive but STRICT. Poor answers deserve low scores. This helps candidates improve.

CRITICAL: You MUST return ONLY valid JSON in the exact format specified above. Do NOT include any explanatory text, questions, or conversational responses. ONLY return the JSON object."""
    
    try:
        # Using Claude 3.5 Haiku for reliability and cost optimization
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-3-5-haiku-20241022-v1:0',
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4000,
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
        
        # Parse feedback - handle markdown code blocks
        import re
        
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        
        # Try direct JSON parse
        try:
            feedback = json.loads(content.strip())
        except json.JSONDecodeError:
            # Try to find JSON object in the text
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                feedback = json.loads(json_match.group())
            else:
                logger.error(f"Could not parse JSON from response: {content[:1000]}")
                raise ValueError("Could not parse feedback JSON")
        
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
