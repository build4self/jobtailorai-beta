import json
import boto3
import os
from datetime import datetime
import uuid

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('ANALYTICS_TABLE_NAME', 'JobTailorAI-ClickAnalytics')

def lambda_handler(event, context):
    """
    Simple analytics handler for click stream data
    Stores: sessionId, userId, timestamp, buttonClicked, metadata
    """
    
    # CORS headers for all responses
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Credentials': 'true'
    }
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({})
        }
    
    try:
        # Parse request body
        if 'body' in event:
            if event.get('isBase64Encoded', False):
                import base64
                body_str = base64.b64decode(event['body']).decode('utf-8')
                body = json.loads(body_str)
            else:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        # Extract analytics data
        session_id = body.get('sessionId')
        user_id = body.get('userId')  # Can be null for anonymous users
        username = body.get('username')  # Can be null for anonymous users
        button_clicked = body.get('buttonClicked')
        metadata = body.get('metadata', {})
        
        # Validate required fields
        if not session_id or not button_clicked:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'sessionId and buttonClicked are required'
                })
            }
        
        # Generate timestamp and date
        now = datetime.utcnow()
        timestamp = now.isoformat() + 'Z'
        date_key = now.strftime('%Y-%m-%d')
        
        # Create sort key for DynamoDB
        sort_key = f"{timestamp}#{session_id}"
        
        # Prepare item for DynamoDB
        item = {
            'date': date_key,
            'timestamp_session': sort_key,
            'sessionId': session_id,
            'buttonClicked': button_clicked,
            'timestamp': timestamp,
            'metadata': metadata
        }
        
        # Add userId if provided
        if user_id:
            item['userId'] = user_id
        
        # Add username if provided
        if username:
            item['username'] = username
        
        # Store in DynamoDB
        table = dynamodb.Table(table_name)
        table.put_item(Item=item)
        
        print(f"Analytics event stored: {button_clicked} for session {session_id}, user: {username or 'anonymous'}")
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': 'Analytics event recorded'
            })
        }
        
    except Exception as e:
        print(f"Error storing analytics event: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': f'Failed to store analytics event: {str(e)}'
            })
        }