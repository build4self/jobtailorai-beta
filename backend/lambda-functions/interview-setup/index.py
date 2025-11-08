import json
import boto3
import uuid
import logging
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('InterviewSessions-beta')
company_profiles_table = dynamodb.Table('CompanyProfiles-beta')

def lambda_handler(event, context):
    """
    Setup a new mock interview session
    Expected input:
    {
        "userId": "user-id",
        "jobDescription": "job description text",
        "companyName": "Company Name",
        "interviewType": "technical|behavioral|mixed",
        "difficulty": "entry|mid|senior",
        "duration": 15|30|45|60,
        "resume": "resume text (optional)"
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
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
