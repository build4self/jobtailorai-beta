import json
import boto3
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito_client = boto3.client('cognito-idp')
ses_client = boto3.client('ses')

def lambda_handler(event, context):
    """
    Send newsletter to all Cognito users
    """
    try:
        user_pool_id = event.get('userPoolId')
        subject = event.get('subject', 'JobTailorAI Newsletter')
        html_content = event.get('htmlContent')
        text_content = event.get('textContent')
        sender_email = event.get('senderEmail')
        
        if not all([user_pool_id, html_content, sender_email]):
            return {
                'statusCode': 400,
                'body': json.dumps('Missing required parameters')
            }
        
        # Get all users from Cognito
        users = get_all_cognito_users(user_pool_id)
        
        # Send emails
        results = send_newsletter_emails(
            users, 
            subject, 
            html_content, 
            text_content, 
            sender_email
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Newsletter sent to {results["success"]} users',
                'success_count': results['success'],
                'failed_count': results['failed'],
                'failed_emails': results['failed_emails']
            })
        }
        
    except Exception as e:
        logger.error(f"Error sending newsletter: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }

def get_all_cognito_users(user_pool_id):
    """Get all users from Cognito User Pool"""
    users = []
    pagination_token = None
    
    while True:
        try:
            params = {
                'UserPoolId': user_pool_id,
                'Limit': 60  # Max allowed by Cognito
            }
            
            if pagination_token:
                params['PaginationToken'] = pagination_token
            
            response = cognito_client.list_users(**params)
            
            for user in response['Users']:
                # Extract email from user attributes
                email = None
                for attr in user.get('Attributes', []):
                    if attr['Name'] == 'email':
                        email = attr['Value']
                        break
                
                # Check if user is confirmed and subscribed to newsletter
                newsletter_subscribed = False
                for attr in user.get('Attributes', []):
                    if attr['Name'] == 'custom:newsletter':
                        newsletter_subscribed = attr['Value'].lower() == 'true'
                        break
                
                if email and user.get('UserStatus') == 'CONFIRMED' and newsletter_subscribed:
                    users.append({
                        'email': email,
                        'username': user['Username']
                    })
            
            pagination_token = response.get('PaginationToken')
            if not pagination_token:
                break
                
        except ClientError as e:
            logger.error(f"Error fetching users: {str(e)}")
            break
    
    return users

def send_newsletter_emails(users, subject, html_content, text_content, sender_email):
    """Send newsletter to all users"""
    success_count = 0
    failed_count = 0
    failed_emails = []
    
    for user in users:
        try:
            # Personalize content if needed
            personalized_html = html_content.replace('{{username}}', user.get('username', 'User'))
            personalized_text = text_content.replace('{{username}}', user.get('username', 'User')) if text_content else None
            
            # Send email via SES
            send_params = {
                'Source': sender_email,
                'ReplyToAddresses': ['support@jobtailorai.com'],  # Replies go here
                'Destination': {
                    'ToAddresses': [user['email']]
                },
                'Message': {
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Html': {
                            'Data': personalized_html,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            }
            
            if personalized_text:
                send_params['Message']['Body']['Text'] = {
                    'Data': personalized_text,
                    'Charset': 'UTF-8'
                }
            
            ses_client.send_email(**send_params)
            success_count += 1
            logger.info(f"Email sent successfully to {user['email']}")
            
        except ClientError as e:
            failed_count += 1
            failed_emails.append(user['email'])
            logger.error(f"Failed to send email to {user['email']}: {str(e)}")
    
    return {
        'success': success_count,
        'failed': failed_count,
        'failed_emails': failed_emails
    }