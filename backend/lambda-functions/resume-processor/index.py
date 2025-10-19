import json
import boto3
import os
import uuid
import base64
import datetime

s3 = boto3.client('s3')
lambda_client = boto3.client('lambda')
bucket_name = os.environ.get('STORAGE_BUCKET')
ai_handler_function = os.environ.get('AI_HANDLER_FUNCTION')

# CORS headers for all responses
def get_cors_headers(origin=None):
    allowed_origins = [
        'https://main.d3tjpmlvy19b2l.amplifyapp.com',
        'https://jobtailorai.com',
        'http://localhost:3000'
    ]
    
    # If origin is provided and is in allowed list, use it; otherwise use the first one
    if origin and origin in allowed_origins:
        cors_origin = origin
    else:
        cors_origin = '*'  # Allow all for development
    
    return {
        'Access-Control-Allow-Origin': cors_origin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Credentials': 'true'
    }

def lambda_handler(event, context):
    # Print the event for debugging
    print("Received event:", json.dumps(event))
    
    # Get origin from headers for CORS
    origin = None
    if 'headers' in event:
        origin = event['headers'].get('Origin') or event['headers'].get('origin')
    
    cors_headers = get_cors_headers(origin)
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS' or event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        print("Handling OPTIONS request")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({})
        }
    
    # Handle GET request - check if it's for download or status
    if event.get('httpMethod') == 'GET':
        path = event.get('path', '')
        if '/download' in path:
            print("Handling GET request for file download")
            return handle_download_request(event, cors_headers)
        else:
            print("Handling GET request for status checking")
            return handle_status_request(event, cors_headers)
    
    # Handle POST request for job submission
    if event.get('httpMethod') == 'POST':
        print("Handling POST request for job submission")
        return handle_job_submission(event, cors_headers)
    
    # If we get here, it's an unsupported method
    return {
        'statusCode': 405,
        'headers': cors_headers,
        'body': json.dumps({
            'message': 'Method not allowed'
        })
    }

def handle_download_request(event, cors_headers):
    """Handle GET requests for file download"""
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
        
        # First check if the job is completed
        status_key = f"users/{user_id}/status/{job_id}/status.json"
        
        try:
            response = s3.get_object(Bucket=bucket_name, Key=status_key)
            status_data = json.loads(response['Body'].read().decode('utf-8'))
            
            if status_data.get('status') != 'COMPLETED':
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Job is not completed yet'
                    })
                }
                
        except Exception as e:
            return {
                'statusCode': 404,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Job not found'
                })
            }
        
        # Get the optimized resume file
        optimized_key = f"users/{user_id}/optimized/{job_id}/resume.docx"
        
        try:
            # Get the file from S3
            file_response = s3.get_object(Bucket=bucket_name, Key=optimized_key)
            file_content = file_response['Body'].read()
            
            # Get content type from status data or default
            content_type = status_data.get('contentType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            download_filename = status_data.get('downloadFilename', f'optimized_resume_{job_id[:8]}.docx')
            
            # For binary files, we need to base64 encode for API Gateway
            # but ensure we're handling it correctly
            file_base64 = base64.b64encode(file_content).decode('utf-8')
            
            print(f"File size: {len(file_content)} bytes")
            print(f"Base64 size: {len(file_base64)} characters")
            print(f"Content type: {content_type}")
            print(f"Download filename: {download_filename}")
            
            return {
                'statusCode': 200,
                'headers': {
                    **cors_headers,
                    'Content-Type': content_type,
                    'Content-Disposition': f'attachment; filename="{download_filename}"',
                    'Content-Length': str(len(file_content))
                },
                'body': file_base64,
                'isBase64Encoded': True
            }
            
        except Exception as e:
            error_str = str(e)
            if 'NoSuchKey' in error_str or 'Not Found' in error_str or '404' in error_str:
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Optimized resume file not found'
                    })
                }
            else:
                print(f"Error downloading file: {error_str}")
                return {
                    'statusCode': 500,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'message': 'Error downloading file'
                    })
                }
                
    except Exception as e:
        print(f"Error in download handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'message': 'Internal server error'
            })
        }

def handle_status_request(event, cors_headers):
    """Handle GET requests for job status"""
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

def handle_job_submission(event, cors_headers):
    """Handle POST requests for job submission"""
    try:
        # Parse the request body
        if 'body' in event:
            # Handle base64-encoded body
            if event.get('isBase64Encoded', False):
                body_str = base64.b64decode(event['body']).decode('utf-8')
                body = json.loads(body_str)
            else:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        # Extract data from the request
        resume_content_base64 = body.get('resume')
        job_description = body.get('jobDescription', '')  # May be empty if using URL extraction
        job_title = body.get('jobTitle', '')  # May be empty if using URL extraction
        company_name = body.get('companyName', '')  # May be empty if using URL extraction
        job_url = body.get('jobUrl', '')  # New field for job URL
        generate_cv = body.get('generateCV', False)  # Generate CV flag
        output_format = body.get('outputFormat', 'docx')  # Default to docx format to match frontend
        cover_letter_format = body.get('coverLetterFormat', 'pdf')  # Cover letter format
        
        print(f"Resume processor received output format: {output_format}")
        print(f"Resume processor received cover letter format: {cover_letter_format}")
        print(f"Full body outputFormat value: {body.get('outputFormat')}")
        print(f"Full body coverLetterFormat value: {body.get('coverLetterFormat')}")
        print(f"Job URL provided: {bool(job_url)}")
        print(f"Job description provided: {bool(job_description)}")
        print(f"Job title provided: {bool(job_title)}")
        print(f"Company name provided: {bool(company_name)}")
        
        # Get user ID from Cognito authorizer if available
        user_id = "anonymous"
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                user_id = event['requestContext']['authorizer']['claims'].get('sub', 'anonymous')
        
        # Validate inputs
        if not resume_content_base64:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Resume content is required'
                })
            }
        
        # Job Title is required (Job URL is optional for convenience)
        if not job_title.strip():
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Job Title is required'
                })
            }
        
        # If cover letter is enabled, company name is required (can be filled manually or extracted from Job URL)
        if generate_cv and not company_name.strip():
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Company Name is required for cover letter generation'
                })
            }
        
        if len(job_title.strip()) > 100:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Job title must be 100 characters or less'
                })
            }
        
        # Validate company name length if provided
        if company_name and len(company_name.strip()) > 100:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Company name must be 100 characters or less'
                })
            }
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Decode the base64 resume content
        try:
            # Handle data URL format (data:type;base64,content)
            if resume_content_base64.startswith('data:'):
                # Extract the base64 content after the comma
                base64_content = resume_content_base64.split(',')[1]
            else:
                base64_content = resume_content_base64
            
            resume_content = base64.b64decode(base64_content)
        except Exception as e:
            print(f"Error decoding resume content: {str(e)}")
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'message': 'Invalid resume content encoding'
                })
            }
        
        # Store files in S3
        resume_key = f"users/{user_id}/original/{job_id}/resume.pdf"
        job_desc_key = f"users/{user_id}/original/{job_id}/job_description.txt"
        job_title_key = f"users/{user_id}/original/{job_id}/job_title.txt"
        company_name_key = f"users/{user_id}/original/{job_id}/company_name.txt"
        
        # Upload resume file to S3
        s3.put_object(
            Bucket=bucket_name,
            Key=resume_key,
            Body=resume_content,
            ContentType='application/pdf'
        )
        
        # Upload job description to S3
        s3.put_object(
            Bucket=bucket_name,
            Key=job_desc_key,
            Body=job_description.encode('utf-8'),
            ContentType='text/plain'
        )
        
        # Upload job title to S3
        s3.put_object(
            Bucket=bucket_name,
            Key=job_title_key,
            Body=job_title.strip().encode('utf-8'),
            ContentType='text/plain'
        )
        
        # Upload company name to S3 (if provided)
        if company_name and company_name.strip():
            s3.put_object(
                Bucket=bucket_name,
                Key=company_name_key,
                Body=company_name.strip().encode('utf-8'),
                ContentType='text/plain'
            )
        
        print(f"Stored original files in S3: {resume_key}, {job_desc_key}, {job_title_key}" + 
              (f", and {company_name_key}" if company_name and company_name.strip() else ""))
        
        # Store initial job status
        status_key = f"users/{user_id}/status/{job_id}/status.json"
        status_data = {
            'status': 'PROCESSING',
            'message': 'Job submitted and processing started',
            'timestamp': datetime.datetime.now().isoformat(),
            'jobId': job_id
        }
        
        s3.put_object(
            Bucket=bucket_name,
            Key=status_key,
            Body=json.dumps(status_data).encode('utf-8'),
            ContentType='application/json'
        )
        
        # Prepare payload for AI handler
        ai_payload = {
            'userId': user_id,
            'jobId': job_id,
            'resumeKey': resume_key,
            'jobDescriptionKey': job_desc_key if job_description else None,
            'jobTitleKey': job_title_key if job_title else None,
            'companyNameKey': company_name_key if company_name and company_name.strip() else None,
            'jobUrl': job_url if job_url else None,  # Pass job URL for extraction
            'generateCV': generate_cv,  # Include Generate CV flag
            'statusKey': status_key,
            'outputFormat': output_format,
            'coverLetterFormat': cover_letter_format  # Pass cover letter format to AI handler
        }
        
        # Invoke AI handler Lambda asynchronously
        lambda_client.invoke(
            FunctionName=ai_handler_function,
            InvocationType='Event',  # Asynchronous invocation
            Payload=json.dumps(ai_payload)
        )
        
        print(f"Invoked AI handler for job {job_id}")
        
        # Return job ID immediately
        return {
            'statusCode': 202,  # Accepted
            'headers': cors_headers,
            'body': json.dumps({
                'message': 'Resume optimization job submitted',
                'jobId': job_id,
                'status': 'PROCESSING'
            })
        }
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'message': f'Internal server error: {str(e)}'
            })
        }
