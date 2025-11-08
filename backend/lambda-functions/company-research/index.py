import json
import boto3
import logging
from datetime import datetime, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
company_profiles_table = dynamodb.Table('CompanyProfiles-beta')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

def lambda_handler(event, context):
    """
    Research company interview style and cache results
    Expected input:
    {
        "companyName": "Company Name",
        "forceRefresh": false (optional)
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
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

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
