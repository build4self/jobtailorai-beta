import json
import boto3
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize SES client
ses_client = boto3.client('ses', region_name='us-east-1')

def lambda_handler(event, context):
    """
    Handle contact form submissions and send email notifications
    """
    
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    try:
        # Handle preflight OPTIONS request
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Parse the request body
        if 'body' not in event or not event['body']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Request body is required'})
            }
        
        body = json.loads(event['body'])
        
        # Extract contact form data
        from_name = body.get('fromName', 'Unknown User')
        from_email = body.get('fromEmail', 'unknown@example.com')
        subject = body.get('subject', 'No Subject')
        message = body.get('message', 'No Message')
        timestamp = body.get('timestamp', datetime.now().isoformat())
        
        # Validate required fields
        if not subject.strip() or not message.strip():
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Subject and message are required'})
            }
        
        # Prepare email content
        email_subject = f"JobFitResumeAI Contact: {subject}"
        email_body = f"""
Contact Form Submission from JobFitResumeAI

From: {from_name} ({from_email})
Subject: {subject}

Message:
{message}

---
Sent from JobFitResumeAI Contact Form
Time: {timestamp}
        """.strip()
        
        # Send email using SES
        try:
            response = ses_client.send_email(
                Source='noreply@jobfitresumeai.com',  # This needs to be a verified email in SES
                Destination={
                    'ToAddresses': ['abidshariff009@gmail.com']
                },
                Message={
                    'Subject': {
                        'Data': email_subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': email_body,
                            'Charset': 'UTF-8'
                        }
                    }
                },
                ReplyToAddresses=[from_email] if from_email != 'unknown@example.com' else []
            )
            
            logger.info(f"Email sent successfully. MessageId: {response['MessageId']}")
            
        except Exception as ses_error:
            logger.error(f"SES Error: {str(ses_error)}")
            # For now, we'll still return success to the user
            # In production, you might want to store the message in a database as backup
            pass
        
        # Log the contact form submission
        logger.info(f"Contact form submitted by {from_name} ({from_email}): {subject}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Contact form submitted successfully',
                'timestamp': timestamp
            })
        }
        
    except json.JSONDecodeError:
        logger.error("Invalid JSON in request body")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
