import json
import boto3
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse, parse_qs
import time
import random

def lambda_handler(event, context):
    """
    Extract job information from job posting URLs.
    Supports major job boards and company career pages.
    Handles both API Gateway calls and direct Lambda invocations.
    """
    
    # Test BeautifulSoup availability
    try:
        test_html = "<p>Test &#39;text&#39;</p>"
        test_soup = BeautifulSoup(test_html, 'html.parser')
        test_result = test_soup.get_text()
        print(f"DEBUG: BeautifulSoup test successful: '{test_result}'")
    except Exception as bs_test_error:
        print(f"ERROR: BeautifulSoup test failed: {str(bs_test_error)}")
    
    try:
        # Determine if this is an API Gateway call or direct Lambda invocation
        is_api_gateway_call = 'httpMethod' in event or 'requestContext' in event
        
        # Extract URL from event
        if is_api_gateway_call:
            # API Gateway call - parse from body
            if event.get('body'):
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
                job_url = body.get('jobUrl', '').strip()
            else:
                job_url = event.get('jobUrl', '').strip()
        else:
            # Direct Lambda invocation - get from event directly
            job_url = event.get('jobUrl', '').strip()
        
        print(f"Processing job URL: {job_url} (API Gateway: {is_api_gateway_call})")
        
        if not job_url:
            error_response = {'error': 'Job URL is required'}
            if is_api_gateway_call:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                    },
                    'body': json.dumps(error_response)
                }
            else:
                return error_response
        
        # Extract job information
        job_data = extract_job_data(job_url)
        
        if not job_data:
            error_response = {'error': 'Unable to extract job information from the provided URL'}
            if is_api_gateway_call:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                    },
                    'body': json.dumps(error_response)
                }
            else:
                return error_response
        
        # Return success response
        success_response = {
            'success': True,
            'data': job_data
        }
        
        if is_api_gateway_call:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps(success_response)
            }
        else:
            return success_response
        
    except Exception as e:
        print(f"Error processing job URL: {str(e)}")
        error_response = {'error': f'Internal server error: {str(e)}'}
        
        if is_api_gateway_call:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps(error_response)
            }
        else:
            return error_response

def normalize_job_url(url):
    """
    Convert various job URL formats to their canonical forms.
    """
    try:
        # Handle LinkedIn collections URLs
        if 'linkedin.com/jobs/collections' in url and 'currentJobId=' in url:
            # Extract job ID from currentJobId parameter
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(url)
            query_params = parse_qs(parsed.query)
            if 'currentJobId' in query_params:
                job_id = query_params['currentJobId'][0]
                # Convert to direct LinkedIn job URL
                return f"https://www.linkedin.com/jobs/view/{job_id}/"
        
        # Handle other LinkedIn URL variations
        if 'linkedin.com' in url and '/jobs/' in url:
            # Extract job ID from various LinkedIn URL formats
            import re
            job_id_match = re.search(r'/jobs/view/(\d+)', url)
            if not job_id_match:
                job_id_match = re.search(r'currentJobId=(\d+)', url)
            if job_id_match:
                job_id = job_id_match.group(1)
                return f"https://www.linkedin.com/jobs/view/{job_id}/"
        
        return url
    except Exception as e:
        print(f"Error normalizing URL: {str(e)}")
        return url

def extract_job_data(url):
    """
    Extract job data from various job posting URLs.
    """
    
    try:
        # Normalize the URL first
        normalized_url = normalize_job_url(url)
        print(f"Original URL: {url}")
        print(f"Normalized URL: {normalized_url}")
        
        # Add random delay to avoid rate limiting
        time.sleep(random.uniform(1, 3))
        
        # Set up headers to mimic a real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Make request with timeout
        response = requests.get(normalized_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Log response details for debugging
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response content length: {len(response.content)}")
        print(f"Response content preview: {response.text[:500]}")
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Determine job board and extract accordingly
        domain = urlparse(normalized_url).netloc.lower()
        
        if 'linkedin.com' in domain:
            return extract_linkedin_job(soup, normalized_url)
        elif 'indeed.com' in domain:
            return extract_indeed_job(soup, normalized_url)
        elif 'glassdoor.com' in domain:
            return extract_glassdoor_job(soup, normalized_url)
        elif 'naukri.com' in domain:
            return extract_naukri_job(soup, normalized_url)
        elif 'seek.co.nz' in domain or 'seek.com.au' in domain:
            return extract_seek_job(soup, normalized_url)
        elif 'careers.mastercard.com' in domain:
            return extract_mastercard_job(soup, normalized_url)
        elif 'jobs.lever.co' in domain:
            return extract_lever_job(soup, normalized_url)
        elif 'greenhouse.io' in domain:
            return extract_greenhouse_job(soup, normalized_url)
        elif 'netflix.net' in domain or 'netflix.com' in domain or 'jobs.netflix.com' in domain:
            print(f"DEBUG: Routing to Netflix extraction for domain: {domain}")
            return extract_netflix_job(soup, normalized_url)
        else:
            # Generic extraction for company career pages
            return extract_generic_job(soup, normalized_url)
            
    except requests.RequestException as e:
        print(f"Request error: {str(e)}")
        return None
    except Exception as e:
        print(f"Extraction error: {str(e)}")
        return None

def extract_linkedin_job(soup, url):
    """Extract job data from LinkedIn job postings."""
    
    try:
        # Check if we're getting a login page or authentication challenge
        if soup.find('form', {'name': 'login'}) or 'Sign in to LinkedIn' in soup.get_text():
            print("LinkedIn returned login page - authentication required")
            return None
            
        # Check for CAPTCHA or bot detection
        if 'captcha' in soup.get_text().lower() or 'unusual activity' in soup.get_text().lower():
            print("LinkedIn detected bot activity - CAPTCHA required")
            return None
        
        job_data = {
            'source': 'LinkedIn',
            'url': url
        }
        
        # Try multiple selectors for job title
        title_selectors = [
            'h1.top-card-layout__title',
            'h1.t-24.t-bold.inline',
            'h1[data-test-id="job-title"]',
            'h1.jobs-unified-top-card__job-title',
            'h1'
        ]
        
        title_elem = None
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                break
        
        job_data['job_title'] = clean_job_title(clean_job_title(clean_text(title_elem.get_text()))) if title_elem else ''
        company_selectors = [
            'a.topcard__org-name-link',
            'span.topcard__flavor',
            'a[data-test-id="job-poster-name"]',
            '.jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name'
        ]
        
        company_elem = None
        for selector in company_selectors:
            company_elem = soup.select_one(selector)
            if company_elem:
                break
        
        job_data['company'] = clean_text(company_elem.get_text()) if company_elem else ''
        
        # Try multiple selectors for location
        location_selectors = [
            'span.topcard__flavor.topcard__flavor--bullet',
            '.jobs-unified-top-card__bullet',
            '[data-test-id="job-location"]'
        ]
        
        location_elem = None
        for selector in location_selectors:
            location_elem = soup.select_one(selector)
            if location_elem:
                break
        
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Try multiple selectors for job description
        desc_selectors = [
            'div.show-more-less-html__markup',
            'div.description__text',
            '.jobs-box__html-content',
            '.jobs-description-content__text'
        ]
        
        desc_elem = None
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                break
        
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        # Employment type
        employment_elem = soup.find('span', string=re.compile(r'Full-time|Part-time|Contract|Temporary'))
        job_data['employment_type'] = clean_text(employment_elem.get_text()) if employment_elem else 'Full-time'
        
        # Experience level
        exp_elem = soup.find('span', string=re.compile(r'Entry level|Associate|Mid-Senior level|Director|Executive'))
        job_data['experience_level'] = clean_text(exp_elem.get_text()) if exp_elem else ''
        
        # If we didn't get basic info, try JSON-LD structured data
        if not job_data['job_title'] or not job_data['company']:
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    if data.get('@type') == 'JobPosting':
                        if not job_data['job_title'] and 'title' in data:
                            job_data['job_title'] = clean_job_title(data['title'])
                        if not job_data['company'] and 'hiringOrganization' in data:
                            org = data['hiringOrganization']
                            if isinstance(org, dict) and 'name' in org:
                                job_data['company'] = org['name']
                        if not job_data['description'] and 'description' in data:
                            job_data['description'] = clean_text(data['description'])
                        break
                except (json.JSONDecodeError, KeyError):
                    continue
        
        return job_data if job_data['job_title'] or job_data['company'] else None
        
    except Exception as e:
        print(f"LinkedIn extraction error: {str(e)}")
        return None

def extract_indeed_job(soup, url):
    """Extract job data from Indeed job postings."""
    
    try:
        job_data = {
            'source': 'Indeed',
            'url': url
        }
        
        # Job title
        title_elem = soup.find('h1', class_='jobsearch-JobInfoHeader-title') or soup.find('h1')
        job_data['job_title'] = clean_job_title(clean_job_title(clean_text(title_elem.get_text()))) if title_elem else ''
        
        # Company name
        company_elem = soup.find('div', class_='jobsearch-InlineCompanyRating') or soup.find('span', class_='jobsearch-JobInfoHeader-subtitle-item')
        if company_elem:
            company_link = company_elem.find('a')
            job_data['company'] = clean_text(company_link.get_text()) if company_link else clean_text(company_elem.get_text())
        else:
            job_data['company'] = ''
        
        # Location
        location_elem = soup.find('div', {'data-testid': 'job-location'})
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Job description
        desc_elem = soup.find('div', class_='jobsearch-jobDescriptionText') or soup.find('div', id='jobDescriptionText')
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        # Salary (if available)
        salary_elem = soup.find('span', class_='jobsearch-JobMetadataHeader-item')
        job_data['salary'] = clean_text(salary_elem.get_text()) if salary_elem else ''
        
        return job_data
        
    except Exception as e:
        print(f"Indeed extraction error: {str(e)}")
        return None

def extract_glassdoor_job(soup, url):
    """Extract job data from Glassdoor job postings."""
    
    try:
        job_data = {
            'source': 'Glassdoor',
            'url': url
        }
        
        # Job title
        title_elem = soup.find('div', {'data-test': 'job-title'}) or soup.find('h1')
        job_data['job_title'] = clean_job_title(clean_text(title_elem.get_text())) if title_elem else ''
        
        # Company name
        company_elem = soup.find('div', {'data-test': 'employer-name'})
        job_data['company'] = clean_text(company_elem.get_text()) if company_elem else ''
        
        # Location
        location_elem = soup.find('div', {'data-test': 'job-location'})
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Job description
        desc_elem = soup.find('div', {'data-test': 'jobDescriptionContent'})
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        # Salary
        salary_elem = soup.find('div', {'data-test': 'detailSalary'})
        job_data['salary'] = clean_text(salary_elem.get_text()) if salary_elem else ''
        
        return job_data
        
    except Exception as e:
        print(f"Glassdoor extraction error: {str(e)}")
        return None

def extract_mastercard_job(soup, url):
    """Extract job data from Mastercard careers page using multiple strategies."""
    
    try:
        job_data = {
            'source': 'Mastercard Careers',
            'url': url,
            'company': 'Mastercard',
            'employment_type': 'Full-time',
            'industry': 'Financial Services - Payments Technology',
            'company_size': 'Large Enterprise (10,000+ employees)',
            'company_type': 'Public Company'
        }
        
        # Strategy 1: Extract from JSON-LD structured data
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                if data.get('@type') == 'JobPosting':
                    # Extract job title
                    if 'title' in data:
                        job_data['job_title'] = clean_job_title(data['title'])
                    
                    # Extract location
                    if 'jobLocation' in data:
                        location_data = data['jobLocation']
                        if isinstance(location_data, dict) and 'address' in location_data:
                            address = location_data['address']
                            location_parts = []
                            if 'addressLocality' in address:
                                location_parts.append(address['addressLocality'])
                            if 'addressRegion' in address:
                                location_parts.append(address['addressRegion'])
                            if 'addressCountry' in address:
                                location_parts.append(address['addressCountry'])
                            job_data['location'] = ', '.join(location_parts)
                    
                    # Extract description
                    if 'description' in data:
                        job_data['description'] = clean_text(data['description'])
                    
                    # Extract employment type
                    if 'employmentType' in data:
                        emp_types = data['employmentType']
                        if isinstance(emp_types, list) and emp_types:
                            job_data['employment_type'] = emp_types[0].replace('_', '-').title()
                    
                    # Extract job ID
                    if 'identifier' in data and isinstance(data['identifier'], dict):
                        job_data['job_id'] = data['identifier'].get('value', '')
                    
                    break
            except (json.JSONDecodeError, KeyError) as e:
                continue
        
        # Strategy 2: Extract from meta tags if JSON-LD didn't work
        if not job_data.get('job_title'):
            # Try page title
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text()
                # Parse title like "Manager, Data Engineering in O Fallon, United States of America, 63368-7263 | R-252285 | Other Jobs at Mastercard"
                if ' in ' in title_text and ' | ' in title_text:
                    parts = title_text.split(' | ')
                    if len(parts) >= 2:
                        job_location_part = parts[0]  # "Manager, Data Engineering in O Fallon, United States of America, 63368-7263"
                        if ' in ' in job_location_part:
                            job_title, location = job_location_part.split(' in ', 1)
                            job_data['job_title'] = clean_job_title(job_title.strip())
                            job_data['location'] = location.strip()
        
        # Strategy 3: Extract from Twitter/OG meta tags
        if not job_data.get('job_title'):
            twitter_title = soup.find('meta', {'name': 'twitter:title'})
            if twitter_title:
                title_content = twitter_title.get('content', '')
                if ' in ' in title_content:
                    job_title = title_content.split(' in ')[0]
                    job_data['job_title'] = clean_job_title(job_title.strip())
        
        if not job_data.get('description'):
            twitter_desc = soup.find('meta', {'name': 'twitter:description'})
            if twitter_desc:
                job_data['description'] = clean_text(twitter_desc.get('content', ''))
        
        # Strategy 4: Extract from page content (fallback)
        if not job_data.get('description'):
            desc_elem = soup.find('div', class_='description') or soup.find('div', class_='content')
            if desc_elem:
                job_data['description'] = clean_text(desc_elem.get_text())
        
        # Extract job ID from URL if not found in structured data
        if not job_data.get('job_id'):
            job_id_match = re.search(r'/job/([^/]+)/', url)
            if job_id_match:
                job_data['job_id'] = job_id_match.group(1)
        
        return job_data
        
    except Exception as e:
        print(f"Mastercard extraction error: {str(e)}")
        return None

def extract_lever_job(soup, url):
    """Extract job data from Lever-powered career pages."""
    
    try:
        job_data = {
            'source': 'Lever',
            'url': url
        }
        
        # Job title
        title_elem = soup.find('h2', class_='posting-headline') or soup.find('h1')
        job_data['job_title'] = clean_job_title(clean_text(title_elem.get_text())) if title_elem else ''
        
        # Company name (extract from URL or page)
        company_match = re.search(r'jobs\.lever\.co/([^/]+)', url)
        job_data['company'] = company_match.group(1).replace('-', ' ').title() if company_match else ''
        
        # Location
        location_elem = soup.find('div', class_='posting-categories')
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Job description
        desc_elem = soup.find('div', class_='section-wrapper page-full-width')
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        return job_data
        
    except Exception as e:
        print(f"Lever extraction error: {str(e)}")
        return None

def extract_greenhouse_job(soup, url):
    """Extract job data from Greenhouse-powered career pages."""
    
    try:
        job_data = {
            'source': 'Greenhouse',
            'url': url
        }
        
        # Job title
        title_elem = soup.find('h1', class_='app-title') or soup.find('h1')
        job_data['job_title'] = clean_job_title(clean_text(title_elem.get_text())) if title_elem else ''
        
        # Company name (usually in the page title or header)
        company_elem = soup.find('div', class_='company-name') or soup.find('title')
        if company_elem:
            company_text = clean_text(company_elem.get_text())
            # Extract company name from title like "Job Title - Company Name"
            if ' - ' in company_text:
                job_data['company'] = company_text.split(' - ')[-1]
            else:
                job_data['company'] = company_text
        else:
            job_data['company'] = ''
        
        # Location
        location_elem = soup.find('div', class_='location')
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Job description
        desc_elem = soup.find('div', id='content') or soup.find('div', class_='content')
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        return job_data
        
    except Exception as e:
        print(f"Greenhouse extraction error: {str(e)}")
        return None

def extract_naukri_job(soup, url):
    """Extract job data from Naukri.com job postings."""
    
    try:
        # Check if this is a 404 page
        if '404' in soup.get_text() or 'This page could not be found' in soup.get_text():
            print("Naukri job page not found (404)")
            return None
            
        # Check if this is a loading/splash screen
        if 'splashscreen-container' in str(soup) or len(soup.get_text().strip()) < 100:
            print("Naukri page appears to be loading or empty")
            return None
        
        job_data = {
            'source': 'Naukri.com',
            'url': url
        }
        
        # Try to extract job ID from URL for debugging
        import re
        job_id_match = re.search(r'-(\d+)(?:\?|$)', url)
        if job_id_match:
            job_data['job_id'] = job_id_match.group(1)
            print(f"Extracted job ID: {job_data['job_id']}")
        
        # Job title - Naukri specific selectors
        title_selectors = [
            'h1.jd-header-title',
            'h1[data-automation="job-title"]',
            '.job-title h1',
            'h1.job-title',
            'h1'
        ]
        
        title_elem = None
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                break
        
        job_data['job_title'] = clean_job_title(clean_text(title_elem.get_text())) if title_elem else ''
        
        # Company name - Naukri specific selectors
        company_selectors = [
            '.jd-header-comp-name a',
            '.jd-header-comp-name',
            '[data-automation="company-name"]',
            '.company-name',
            '.comp-name'
        ]
        
        company_elem = None
        for selector in company_selectors:
            company_elem = soup.select_one(selector)
            if company_elem:
                break
        
        job_data['company'] = clean_text(company_elem.get_text()) if company_elem else ''
        
        # Location - Naukri specific selectors
        location_selectors = [
            '.jd-header-comp-loc',
            '[data-automation="job-location"]',
            '.location',
            '.job-location'
        ]
        
        location_elem = None
        for selector in location_selectors:
            location_elem = soup.select_one(selector)
            if location_elem:
                break
        
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Experience - Naukri specific
        exp_selectors = [
            '.jd-header-exp',
            '[data-automation="experience"]',
            '.experience'
        ]
        
        exp_elem = None
        for selector in exp_selectors:
            exp_elem = soup.select_one(selector)
            if exp_elem:
                break
        
        job_data['experience'] = clean_text(exp_elem.get_text()) if exp_elem else ''
        
        # Salary - Naukri specific
        salary_selectors = [
            '.jd-header-sal',
            '[data-automation="salary"]',
            '.salary'
        ]
        
        salary_elem = None
        for selector in salary_selectors:
            salary_elem = soup.select_one(selector)
            if salary_elem:
                break
        
        job_data['salary'] = clean_text(salary_elem.get_text()) if salary_elem else ''
        
        # Job description - Naukri specific selectors
        desc_selectors = [
            '.jd-desc',
            '.job-description',
            '[data-automation="job-description"]',
            '.description',
            '.jd-content'
        ]
        
        desc_elem = None
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                break
        
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        # Skills - Naukri specific
        skills_selectors = [
            '.jd-skills',
            '.skills',
            '[data-automation="skills"]'
        ]
        
        skills_elem = None
        for selector in skills_selectors:
            skills_elem = soup.select_one(selector)
            if skills_elem:
                break
        
        job_data['skills'] = clean_text(skills_elem.get_text()) if skills_elem else ''
        
        # If we didn't extract any meaningful data, return None
        if not any([job_data.get('job_title'), job_data.get('company'), job_data.get('description')]):
            print("No meaningful job data extracted from Naukri page")
            return None
        
        print(f"Extracted Naukri job data: {job_data}")
        return job_data
        
    except Exception as e:
        print(f"Naukri extraction error: {str(e)}")
        return None

def extract_seek_job(soup, url):
    """Extract job data from Seek.co.nz and Seek.com.au job postings."""
    
    try:
        job_data = {
            'source': 'Seek',
            'url': url
        }
        
        # Job title - Seek specific selectors
        title_selectors = [
            'h1[data-automation="job-detail-title"]',
            'h1.job-title',
            'h1'
        ]
        
        title_elem = None
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                break
        
        job_data['job_title'] = clean_job_title(clean_text(title_elem.get_text())) if title_elem else ''
        
        # Company name - Seek specific selectors
        company_selectors = [
            '[data-automation="advertiser-name"]',
            '.advertiser-name',
            '.company-name'
        ]
        
        company_elem = None
        for selector in company_selectors:
            company_elem = soup.select_one(selector)
            if company_elem:
                break
        
        job_data['company'] = clean_text(company_elem.get_text()) if company_elem else ''
        
        # Location - Seek specific selectors
        location_selectors = [
            '[data-automation="job-detail-location"]',
            '.location',
            '.job-location'
        ]
        
        location_elem = None
        for selector in location_selectors:
            location_elem = soup.select_one(selector)
            if location_elem:
                break
        
        job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        # Job description - Seek specific selectors
        desc_selectors = [
            '[data-automation="jobAdDetails"]',
            '.job-description',
            '.description',
            '.job-content'
        ]
        
        desc_elem = None
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                break
        
        job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        # Salary - Seek specific
        salary_selectors = [
            '[data-automation="job-detail-salary"]',
            '.salary',
            '.job-salary'
        ]
        
        salary_elem = None
        for selector in salary_selectors:
            salary_elem = soup.select_one(selector)
            if salary_elem:
                break
        
        job_data['salary'] = clean_text(salary_elem.get_text()) if salary_elem else ''
        
        print(f"Extracted Seek job data: {job_data}")
        return job_data
        
    except Exception as e:
        print(f"Seek extraction error: {str(e)}")
        return None

def extract_netflix_job(soup, url):
    """Extract job data from Netflix career pages."""
    
    try:
        job_data = {
            'source': 'Netflix Careers',
            'url': url,
            'company': 'Netflix',
            'employment_type': 'Full-time',
            'industry': 'Entertainment - Streaming Technology',
            'company_size': 'Large Enterprise (10,000+ employees)',
            'company_type': 'Public Company'
        }
        
        print(f"DEBUG: Starting Netflix extraction for URL: {url}")
        print(f"DEBUG: Page title: {soup.find('title').get_text() if soup.find('title') else 'No title found'}")
        
        # Strategy 1: Extract from JSON-LD structured data (most reliable)
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        print(f"DEBUG: Found {len(json_ld_scripts)} JSON-LD scripts")
        
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                print(f"DEBUG: JSON-LD data type: {data.get('@type', 'No @type')}")
                if data.get('@type') == 'JobPosting':
                    # Extract job title
                    if 'title' in data:
                        import html
                        job_data['job_title'] = clean_job_title(html.unescape(data['title']))
                    
                    # Extract location
                    if 'jobLocation' in data:
                        location_data = data['jobLocation']
                        if isinstance(location_data, list) and location_data:
                            # Handle array of locations
                            location_data = location_data[0]
                        
                        if isinstance(location_data, dict):
                            if 'address' in location_data:
                                address = location_data['address']
                                location_parts = []
                                if isinstance(address, dict):
                                    for field in ['addressLocality', 'addressRegion', 'addressCountry']:
                                        if field in address:
                                            value = address[field]
                                            # Ensure the value is a string and not empty
                                            if isinstance(value, str) and value.strip():
                                                location_parts.append(value.strip())
                                            elif isinstance(value, dict) and 'name' in value and value['name'].strip():
                                                location_parts.append(value['name'].strip())
                                    if location_parts:
                                        job_data['location'] = ', '.join(location_parts)
                                elif isinstance(address, str):
                                    job_data['location'] = address
                            elif 'name' in location_data:
                                job_data['location'] = location_data['name']
                        elif isinstance(location_data, str):
                            job_data['location'] = location_data
                    
                    # Extract description
                    if 'description' in data:
                        print(f"DEBUG: Found description in JSON-LD, length: {len(data['description'])}")
                        print(f"DEBUG: Raw description preview: {data['description'][:200]}...")
                        # First decode HTML entities, then clean HTML tags
                        import html
                        decoded_description = html.unescape(data['description'])
                        print(f"DEBUG: After HTML entity decoding: {decoded_description[:200]}...")
                        # Now use the enhanced clean_text function for HTML tag removal
                        job_data['description'] = clean_text(decoded_description)
                        print(f"DEBUG: Cleaned description preview: {job_data['description'][:200]}...")
                    
                    # Extract employment type
                    if 'employmentType' in data:
                        emp_types = data['employmentType']
                        if isinstance(emp_types, list) and emp_types:
                            job_data['employment_type'] = emp_types[0].replace('_', '-').title()
                        elif isinstance(emp_types, str):
                            job_data['employment_type'] = emp_types.replace('_', '-').title()
                    
                    # Extract salary if available
                    if 'baseSalary' in data:
                        salary_data = data['baseSalary']
                        if isinstance(salary_data, dict) and 'value' in salary_data:
                            value = salary_data['value']
                            if isinstance(value, dict):
                                min_val = value.get('minValue', '')
                                max_val = value.get('maxValue', '')
                                currency = salary_data.get('currency', 'USD')
                                if min_val and max_val:
                                    job_data['salary'] = f"{currency} {min_val} - {max_val}"
                                elif min_val:
                                    job_data['salary'] = f"{currency} {min_val}+"
                    
                    # Extract job ID from identifier
                    if 'identifier' in data:
                        if isinstance(data['identifier'], dict) and 'value' in data['identifier']:
                            job_data['job_id'] = data['identifier']['value']
                        elif isinstance(data['identifier'], str):
                            job_data['job_id'] = data['identifier']
                    
                    break
            except (json.JSONDecodeError, KeyError) as e:
                continue
        
        # Strategy 2: Extract from page title if JSON-LD didn't work
        if not job_data.get('job_title'):
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text()
                # Parse title like "Software Engineer (L5), Content & Business Products | USA - Remote | Netflix"
                if ' | ' in title_text:
                    parts = title_text.split(' | ')
                    if len(parts) >= 2:
                        job_title = parts[0].strip()
                        location = parts[1].strip() if len(parts) > 1 else ''
                        job_data['job_title'] = clean_job_title(job_title)
                        if not job_data.get('location') and location:
                            job_data['location'] = location
        
        # Strategy 3: Extract from meta tags
        if not job_data.get('job_title'):
            og_title = soup.find('meta', {'property': 'og:title'})
            if og_title:
                title_content = og_title.get('content', '')
                print(f"DEBUG: Found og:title: {title_content}")
                if ' | ' in title_content:
                    job_title = title_content.split(' | ')[0]
                    job_data['job_title'] = clean_job_title(job_title.strip())
                elif title_content and title_content.lower() != 'explore':
                    job_data['job_title'] = clean_job_title(title_content.strip())
        
        if not job_data.get('description'):
            print("DEBUG: No description found in JSON-LD, trying og:description")
            og_desc = soup.find('meta', {'property': 'og:description'})
            if og_desc:
                desc_text = og_desc.get('content', '').strip()
                print(f"DEBUG: Raw og:description: {desc_text[:200]}...")
                job_data['description'] = clean_text(desc_text)
                print(f"DEBUG: Cleaned og:description: {job_data['description'][:100]}...")
        
        # Strategy 4: Extract from common HTML elements
        if not job_data.get('job_title'):
            # Try common job title selectors
            title_selectors = [
                'h1',
                '.job-title',
                '[data-testid="job-title"]',
                '.position-title',
                '.role-title'
            ]
            
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem:
                    title_text = title_elem.get_text().strip()
                    print(f"DEBUG: Found title with selector {selector}: {title_text}")
                    if title_text and title_text.lower() not in ['explore', 'netflix', 'careers']:
                        job_data['job_title'] = clean_job_title(title_text)
                        break
        
        if not job_data.get('description'):
            print("DEBUG: No description found in JSON-LD or og:description, trying HTML selectors")
            # Try common description selectors
            desc_selectors = [
                '.job-description',
                '.position-description',
                '.role-description',
                '[data-testid="job-description"]',
                '.description',
                '.content'
            ]
            
            for selector in desc_selectors:
                desc_elem = soup.select_one(selector)
                if desc_elem:
                    desc_text = desc_elem.get_text().strip()
                    print(f"DEBUG: Found description with selector {selector}: {desc_text[:100]}...")
                    if desc_text and len(desc_text) > 50:  # Ensure it's substantial content
                        print(f"DEBUG: Raw HTML description: {desc_text[:200]}...")
                        job_data['description'] = clean_text(desc_text)
                        print(f"DEBUG: Cleaned HTML description: {job_data['description'][:200]}...")
                        break
        
        # Extract job ID from URL if not found in structured data
        if not job_data.get('job_id'):
            job_id_match = re.search(r'/job/(\d+)', url)
            if job_id_match:
                job_data['job_id'] = job_id_match.group(1)
        
        # Debug: Print all extracted data
        print(f"DEBUG: Final extracted data:")
        for key, value in job_data.items():
            if isinstance(value, str) and len(value) > 100:
                print(f"  {key}: {value[:100]}...")
            else:
                print(f"  {key}: {value}")
        
        # Validate we have essential data
        if not job_data.get('job_title') and not job_data.get('description'):
            print("Netflix extraction failed - no essential data found")
            return None
        
        print(f"Successfully extracted Netflix job data: {job_data.get('job_title', 'No title')} at {job_data.get('location', 'No location')}")
        return job_data
        
    except Exception as e:
        print(f"Netflix extraction error: {str(e)}")
        return None

def extract_generic_job(soup, url):
    """Generic extraction for company career pages."""
    
    try:
        job_data = {
            'source': 'Company Career Page',
            'url': url
        }
        
        # Try to extract company name from domain
        domain = urlparse(url).netloc
        company_name = domain.replace('www.', '').replace('careers.', '').replace('jobs.', '').split('.')[0]
        job_data['company'] = company_name.title()
        
        # Strategy 1: Try JSON-LD structured data first (most reliable)
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                if data.get('@type') == 'JobPosting':
                    if 'title' in data:
                        job_data['job_title'] = clean_job_title(data['title'])
                    if 'hiringOrganization' in data:
                        org = data['hiringOrganization']
                        if isinstance(org, dict) and 'name' in org:
                            job_data['company'] = org['name']
                    if 'jobLocation' in data:
                        location_data = data['jobLocation']
                        if isinstance(location_data, dict) and 'address' in location_data:
                            address = location_data['address']
                            if isinstance(address, dict):
                                location_parts = []
                                for key in ['addressLocality', 'addressRegion', 'addressCountry']:
                                    if key in address:
                                        value = address[key]
                                        # Ensure the value is a string and not empty
                                        if isinstance(value, str) and value.strip():
                                            location_parts.append(value.strip())
                                        elif isinstance(value, dict) and 'name' in value and value['name'].strip():
                                            location_parts.append(value['name'].strip())
                                if location_parts:
                                    job_data['location'] = ', '.join(location_parts)
                    if 'description' in data:
                        job_data['description'] = clean_text(data['description'])
                    break
            except (json.JSONDecodeError, KeyError):
                continue
        
        # Strategy 2: Extract from page title
        if not job_data.get('job_title'):
            title_tag = soup.find('title')
            if title_tag:
                title_text = title_tag.get_text()
                # Try to parse structured titles
                if ' | ' in title_text or ' - ' in title_text:
                    separator = ' | ' if ' | ' in title_text else ' - '
                    parts = title_text.split(separator)
                    if len(parts) >= 2:
                        job_data['job_title'] = clean_job_title(parts[0].strip())
                        # Try to extract location from title
                        for part in parts[1:]:
                            if any(keyword in part.lower() for keyword in ['remote', 'usa', 'uk', 'canada', 'location']):
                                job_data['location'] = part.strip()
                                break
                else:
                    job_data['job_title'] = clean_job_title(title_text)
        
        # Strategy 3: Extract from meta tags
        if not job_data.get('job_title'):
            og_title = soup.find('meta', {'property': 'og:title'})
            if og_title:
                job_data['job_title'] = clean_job_title(og_title.get('content', ''))
        
        if not job_data.get('description'):
            og_desc = soup.find('meta', {'property': 'og:description'})
            if og_desc:
                job_data['description'] = clean_text(og_desc.get('content', ''))
        
        # Strategy 4: Extract from HTML elements (fallback)
        if not job_data.get('job_title'):
            title_selectors = ['h1', '.job-title', '.title', '[class*="title"]', '[class*="job"]']
            title_elem = None
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem and title_elem.get_text().strip():
                    break
            job_data['job_title'] = clean_job_title(clean_text(title_elem.get_text())) if title_elem else ''
        
        if not job_data.get('location'):
            location_selectors = ['.location', '[class*="location"]', '[class*="city"]', '[data-test*="location"]']
            location_elem = None
            for selector in location_selectors:
                location_elem = soup.select_one(selector)
                if location_elem and location_elem.get_text().strip():
                    break
            job_data['location'] = clean_text(location_elem.get_text()) if location_elem else ''
        
        if not job_data.get('description'):
            desc_selectors = ['.job-description', '.description', '.content', 'main', 'article', '[class*="description"]']
            desc_elem = None
            for selector in desc_selectors:
                desc_elem = soup.select_one(selector)
                if desc_elem and len(desc_elem.get_text().strip()) > 100:  # Ensure meaningful content
                    break
            job_data['description'] = clean_text(desc_elem.get_text()) if desc_elem else ''
        
        # Validate we have essential data
        if not job_data.get('job_title') and not job_data.get('description'):
            print("Generic extraction failed - no essential data found")
            return None
        
        return job_data
        
    except Exception as e:
        print(f"Generic extraction error: {str(e)}")
        return None

def clean_text(text):
    """Clean and normalize text content with enhanced HTML handling."""
    if not text:
        return ''
    
    import html
    import re
    
    print(f"DEBUG: clean_text called with text length: {len(text)}")
    print(f"DEBUG: clean_text input preview: {text[:200]}...")
    
    try:
        # First, decode HTML entities (like &lt; &gt; &#39; &amp; etc.)
        original_text = text
        text = html.unescape(text)
        if original_text != text:
            print(f"DEBUG: HTML entities decoded: {text[:200]}...")
        
        # Now check for HTML tags and clean them aggressively
        if '<' in text and '>' in text:
            print("DEBUG: HTML detected, cleaning HTML tags")
            try:
                # Use BeautifulSoup to extract clean text
                soup = BeautifulSoup(text, 'html.parser')
                
                # Simply get all text content, stripping HTML tags completely
                text = soup.get_text(separator=' ', strip=True)
                print(f"DEBUG: After BeautifulSoup cleaning: {text[:200]}...")
                
                # Double-check: if we still have HTML tags, use regex fallback
                if '<' in text and '>' in text:
                    print("DEBUG: Still found HTML tags, applying regex cleanup")
                    text = re.sub(r'<[^>]*>', '', text)
                    
            except Exception as bs_error:
                print(f"ERROR: BeautifulSoup failed: {str(bs_error)}")
                # Fallback: aggressive regex HTML tag removal
                text = re.sub(r'<[^>]*>', '', text)
                print(f"DEBUG: Using regex fallback for HTML removal")
        
        # Additional cleanup for any remaining HTML entities or fragments
        if '<' in text or '>' in text:
            print("DEBUG: Additional HTML cleanup needed")
            # Remove any remaining HTML-like content
            text = re.sub(r'<[^>]*>', '', text)  # Remove any remaining tags
            text = re.sub(r'[<>]', '', text)  # Remove stray < or > characters
        
        # Clean up whitespace - replace multiple spaces/newlines with single space
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common unwanted phrases
        unwanted_phrases = [
            'Apply now', 'Apply for this job', 'Save job', 'Share job',
            'Report job', 'Easy Apply', 'Quick Apply'
        ]
        
        for phrase in unwanted_phrases:
            text = text.replace(phrase, '')
        
        result = text.strip()
        print(f"DEBUG: clean_text final result length: {len(result)}")
        print(f"DEBUG: clean_text final preview: {result[:200]}...")
        return result
        
    except Exception as e:
        print(f"ERROR: clean_text failed: {str(e)}")
        # Fallback: just decode HTML entities and basic cleanup
        try:
            text = html.unescape(text)
            text = re.sub(r'<[^>]+>', '', text)  # Remove HTML tags
            text = re.sub(r'\s+', ' ', text.strip())
            print(f"DEBUG: Using fallback cleaning method")
            return text
        except Exception as fallback_error:
            print(f"ERROR: Even fallback cleaning failed: {str(fallback_error)}")
            return text  # Return original text as last resort

def clean_job_title(title):
    """Clean job title by extracting the core role and removing specializations."""
    if not title:
        return ''
    
    import re
    cleaned = title.strip()
    
    # First, remove common patterns like location, remote info, etc.
    patterns_to_remove = [
        r'\s*\(Remote.*?\)',  # (Remote - United States)
        r'\s*\(.*?Remote.*?\)',  # (Remote)
        r'\s*-\s*Remote.*',  # - Remote
        r'\s*\|\s*.*',  # | anything after pipe
        r'\s*-\s*\d+.*',  # - numbers (job IDs)
        r'\s*\(.*?\)\s*$',  # (anything) at end
        r'\s*-\s*.*\s+\w{2,3}\s*$',  # - Location State
    ]
    
    for pattern in patterns_to_remove:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # Also remove level indicators and other parenthetical info anywhere in the title
    # This handles cases like "Senior Engineer (L5), Platform Team"
    cleaned = re.sub(r'\s*\([^)]*\)', '', cleaned)  # Remove any remaining parentheses
    
    # Extract core job title by handling comma-separated specializations
    # Examples:
    # "Product Manager, Member Spaces and Inputs" -> "Product Manager"
    # "Software Engineer, Backend" -> "Software Engineer"
    # "Data Scientist, Machine Learning" -> "Data Scientist"
    # "Senior Software Engineer, Full Stack" -> "Senior Software Engineer"
    
    # Split by comma and take the first part (core title)
    if ',' in cleaned:
        core_title = cleaned.split(',')[0].strip()
        
        # However, keep certain comma patterns that are part of the core title
        # Like "Director, Engineering" or "VP, Product"
        core_title_lower = core_title.lower()
        
        # Only keep department specializations for executive/management titles
        executive_titles = [
            'director', 'vp', 'vice president', 'head', 'chief', 'manager'
        ]
        
        specialization = cleaned.split(',')[1].strip() if ',' in cleaned else ''
        specialization_lower = specialization.lower()
        
        # Common department/area specializations to keep
        important_departments = [
            'engineering', 'product', 'marketing', 'sales', 'operations', 
            'finance', 'hr', 'human resources', 'design', 'analytics',
            'security', 'infrastructure', 'platform', 'strategy'
        ]
        
        # Only keep specialization for executive/management titles with department names
        if (any(exec_title in core_title_lower for exec_title in executive_titles) and
            any(dept in specialization_lower for dept in important_departments)):
            cleaned = f"{core_title}, {specialization}"
        else:
            # Otherwise, just use the core title
            cleaned = core_title
    
    # Handle dash-separated specializations similarly
    # "Senior Software Engineer - Backend" -> "Senior Software Engineer"
    elif ' - ' in cleaned and not any(word in cleaned.lower() for word in ['remote', 'location']):
        parts = cleaned.split(' - ')
        core_title = parts[0].strip()
        
        # Apply same logic for dash-separated titles
        core_title_lower = core_title.lower()
        specialization = parts[1].strip() if len(parts) > 1 else ''
        specialization_lower = specialization.lower()
        
        # Only keep department specializations for executive/management titles
        executive_titles = [
            'director', 'vp', 'vice president', 'head', 'chief'
        ]
        
        important_departments = [
            'engineering', 'product', 'marketing', 'sales', 'operations',
            'finance', 'hr', 'human resources', 'design', 'data', 'analytics',
            'security', 'infrastructure', 'platform', 'strategy'
        ]
        
        # Only keep specialization for executive titles with department names
        if (any(exec_title in core_title_lower for exec_title in executive_titles) and
            any(dept in specialization_lower for dept in important_departments)):
            cleaned = f"{core_title} - {specialization}"
        else:
            cleaned = core_title
    
    # Clean up extra spaces
    cleaned = ' '.join(cleaned.split())
    
    return cleaned.strip()

def clean_text_old(text):
    """Clean and normalize extracted text."""
    if not text:
        return ''
    
    # Remove extra whitespace and normalize
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove common unwanted phrases
    unwanted_phrases = [
        'Apply now', 'Apply for this job', 'Save job', 'Share job',
        'Report job', 'Easy Apply', 'Quick Apply'
    ]
    
    for phrase in unwanted_phrases:
        text = text.replace(phrase, '')
    
    return text.strip()

def extract_keywords_from_description(description):
    """Extract technical keywords and skills from job description."""
    
    # Common technical keywords to look for
    tech_keywords = [
        # Programming Languages
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'Scala', 'R',
        'SQL', 'NoSQL', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart',
        
        # Frameworks & Libraries
        'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
        'Laravel', 'Rails', 'ASP.NET', 'jQuery', 'Bootstrap',
        
        # Databases
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
        'DynamoDB', 'Oracle', 'SQL Server', 'SQLite',
        
        # Cloud & DevOps
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI',
        'Terraform', 'Ansible', 'Chef', 'Puppet',
        
        # Data & Analytics
        'Spark', 'Hadoop', 'Kafka', 'Airflow', 'Tableau', 'Power BI', 'Looker',
        'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-learn',
        
        # Methodologies
        'Agile', 'Scrum', 'Kanban', 'DevOps', 'CI/CD', 'TDD', 'BDD'
    ]
    
    found_keywords = []
    description_lower = description.lower()
    
    for keyword in tech_keywords:
        if keyword.lower() in description_lower:
            found_keywords.append(keyword)
    
    return found_keywords
