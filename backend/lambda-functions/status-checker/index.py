import json
import boto3
import os

s3 = boto3.client('s3')
bucket_name = os.environ.get('STORAGE_BUCKET')

# CORS headers for all responses
def get_cors_headers(origin=None):
    allowed_origins = [
        'https://main.d3tjpmlvy19b2l.amplifyapp.com',
        'https://jobtailorai.com',
        'http://localhost:3000'
    ]
    
    # If origin is provided and is in allowed list, use it; otherwise use wildcard for development
    if origin and origin in allowed_origins:
        cors_origin = origin
    else:
        cors_origin = '*'  # Allow all for development
    
    return {
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Access-Control-Allow-Credentials': 'true'
    }

def lambda_handler(event, context):
    # Get origin from headers for CORS
    origin = None
    if 'headers' in event:
        origin = event['headers'].get('Origin') or event['headers'].get('origin')
    
    cors_headers = get_cors_headers(origin)
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({})
        }
    
    try:
        # Get user ID from Cognito authorizer
        user_id = "anonymous"
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                user_id = event['requestContext']['authorizer']['claims'].get('sub', 'anonymous')
        
        # Get job ID from query parameters
        job_id = None
        if 'queryStringParameters' in event and event['queryStringParameters']:
            job_id = event['queryStringParameters'].get('jobId')
        
        if not job_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Job ID is required'
                })
            }
        
        # Get status from S3
        status_key = f"users/{user_id}/status/{job_id}/status.json"
        
        try:
            response = s3.get_object(Bucket=bucket_name, Key=status_key)
            status_data = json.loads(response['Body'].read().decode('utf-8'))
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(status_data)
            }
            
        except Exception as e:
            error_str = str(e)
            # Handle specific S3 exceptions
            if 'NoSuchKey' in error_str or 'Not Found' in error_str or '404' in error_str:
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Job not found'
                    })
                }
            else:
                # Log the actual error for debugging but return generic message
                print(f"S3 error for status check: {error_str}")
                return {
                    'statusCode': 500,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Error retrieving job status'
                    })
                }
            
    except Exception as e:
        print(f"Error checking job status: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'message': f'Error checking job status: {str(e)}'
            })
        }
