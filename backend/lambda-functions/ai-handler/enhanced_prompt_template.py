"""
Enhanced Resume Optimization Prompt Template

This file combines the clean structure of the new template with the powerful
dynamic analysis functions from the existing implementation.
"""

import re
from datetime import datetime
from collections import Counter

def analyze_role_seniority_and_type(job_title):
    """Analyze the job title to determine seniority level and role type for appropriate action verbs."""
    job_title_lower = job_title.lower()
    
    # Determine seniority level
    seniority_level = "mid"  # default
    if any(term in job_title_lower for term in ['senior', 'sr.', 'lead', 'principal', 'staff', 'architect']):
        seniority_level = "senior"
    elif any(term in job_title_lower for term in ['junior', 'jr.', 'entry', 'associate', 'intern']):
        seniority_level = "junior"
    elif any(term in job_title_lower for term in ['manager', 'director', 'vp', 'vice president', 'head of', 'chief']):
        seniority_level = "management"
    elif any(term in job_title_lower for term in ['executive', 'ceo', 'cto', 'cfo', 'president']):
        seniority_level = "executive"
    
    # Determine role type
    role_type = "technical"  # default
    if any(term in job_title_lower for term in ['manager', 'director', 'supervisor', 'head']):
        role_type = "management"
    elif any(term in job_title_lower for term in ['sales', 'account', 'business development', 'customer success']):
        role_type = "sales"
    elif any(term in job_title_lower for term in ['marketing', 'brand', 'content', 'social media', 'campaign']):
        role_type = "marketing"
    elif any(term in job_title_lower for term in ['product', 'pm', 'product manager', 'product owner']):
        role_type = "product"
    elif any(term in job_title_lower for term in ['analyst', 'data', 'research', 'insights', 'analytics']):
        role_type = "analytical"
    elif any(term in job_title_lower for term in ['design', 'ux', 'ui', 'creative', 'visual']):
        role_type = "design"
    elif any(term in job_title_lower for term in ['hr', 'human resources', 'people', 'talent', 'recruiting']):
        role_type = "hr"
    elif any(term in job_title_lower for term in ['finance', 'accounting', 'financial', 'controller', 'treasurer']):
        role_type = "finance"
    elif any(term in job_title_lower for term in ['operations', 'ops', 'logistics', 'supply chain', 'process']):
        role_type = "operations"
    elif any(term in job_title_lower for term in ['consultant', 'consulting', 'advisory', 'strategy']):
        role_type = "consulting"
    
    return seniority_level, role_type

def get_appropriate_action_verbs(seniority_level, role_type):
    """Get appropriate action verbs based on seniority level and role type."""
    
    # Base action verbs by seniority level
    seniority_verbs = {
        "junior": [
            "Assisted", "Supported", "Contributed", "Participated", "Collaborated", 
            "Helped", "Learned", "Developed", "Built", "Created", "Implemented",
            "Worked on", "Gained experience", "Applied", "Utilized", "Executed"
        ],
        "mid": [
            "Developed", "Built", "Implemented", "Created", "Designed", "Optimized",
            "Managed", "Coordinated", "Delivered", "Achieved", "Improved", "Enhanced",
            "Analyzed", "Resolved", "Maintained", "Collaborated", "Executed", "Performed"
        ],
        "senior": [
            "Led", "Architected", "Designed", "Spearheaded", "Drove", "Established",
            "Mentored", "Guided", "Optimized", "Transformed", "Innovated", "Pioneered",
            "Strategized", "Influenced", "Championed", "Delivered", "Scaled", "Advanced"
        ],
        "management": [
            "Led", "Managed", "Directed", "Oversaw", "Supervised", "Coordinated",
            "Mentored", "Coached", "Guided", "Developed", "Built", "Established",
            "Strategized", "Planned", "Organized", "Delegated", "Motivated", "Inspired",
            "Transformed", "Restructured", "Optimized", "Scaled", "Grew", "Expanded"
        ],
        "executive": [
            "Spearheaded", "Championed", "Transformed", "Revolutionized", "Pioneered",
            "Established", "Founded", "Launched", "Scaled", "Grew", "Expanded",
            "Strategized", "Envisioned", "Influenced", "Negotiated", "Acquired",
            "Divested", "Restructured", "Optimized", "Maximized", "Delivered"
        ]
    }
    
    # Role-specific action verbs
    role_specific_verbs = {
        "management": [
            "Led", "Managed", "Supervised", "Coordinated", "Mentored", "Coached",
            "Guided", "Developed", "Built teams", "Established processes", "Streamlined",
            "Optimized workflows", "Facilitated", "Delegated", "Motivated", "Inspired",
            "Aligned", "Collaborated across", "Drove initiatives", "Implemented strategies"
        ],
        "sales": [
            "Generated", "Closed", "Negotiated", "Cultivated", "Built relationships",
            "Prospected", "Qualified", "Converted", "Exceeded targets", "Grew accounts",
            "Expanded territory", "Developed partnerships", "Secured contracts",
            "Increased revenue", "Drove growth", "Managed pipeline", "Forecasted"
        ],
        "marketing": [
            "Launched", "Developed campaigns", "Increased brand awareness", "Generated leads",
            "Optimized conversion", "Analyzed performance", "Segmented audiences",
            "Created content", "Managed budgets", "Coordinated events", "Built brand",
            "Drove engagement", "Measured ROI", "A/B tested", "Personalized experiences"
        ],
        "product": [
            "Defined requirements", "Prioritized features", "Collaborated with engineering",
            "Conducted user research", "Analyzed metrics", "Optimized user experience",
            "Launched products", "Managed roadmap", "Gathered feedback", "Iterated",
            "Validated hypotheses", "Drove adoption", "Increased retention", "Reduced churn"
        ],
        "analytical": [
            "Analyzed", "Investigated", "Researched", "Modeled", "Forecasted",
            "Identified trends", "Generated insights", "Recommended", "Optimized",
            "Measured", "Tracked", "Reported", "Visualized", "Interpreted",
            "Validated", "Tested hypotheses", "Segmented", "Correlated"
        ],
        "technical": [
            "Developed", "Built", "Implemented", "Designed", "Architected",
            "Optimized", "Debugged", "Deployed", "Maintained", "Integrated",
            "Automated", "Scaled", "Refactored", "Tested", "Documented",
            "Configured", "Monitored", "Troubleshot", "Enhanced", "Migrated"
        ],
        "design": [
            "Designed", "Created", "Conceptualized", "Prototyped", "Wireframed",
            "Researched user needs", "Conducted usability testing", "Iterated",
            "Collaborated with stakeholders", "Presented concepts", "Refined",
            "Optimized user experience", "Established design systems", "Maintained brand consistency"
        ],
        "hr": [
            "Recruited", "Hired", "Onboarded", "Developed talent", "Managed performance",
            "Facilitated training", "Implemented policies", "Resolved conflicts",
            "Built culture", "Improved retention", "Conducted interviews",
            "Managed compensation", "Ensured compliance", "Supported employees"
        ],
        "finance": [
            "Analyzed financial data", "Prepared reports", "Managed budgets",
            "Forecasted", "Modeled scenarios", "Assessed risks", "Optimized costs",
            "Ensured compliance", "Audited", "Reconciled", "Tracked performance",
            "Advised stakeholders", "Improved processes", "Managed cash flow"
        ],
        "operations": [
            "Streamlined processes", "Optimized workflows", "Managed supply chain",
            "Coordinated logistics", "Improved efficiency", "Reduced costs",
            "Ensured quality", "Managed vendors", "Implemented systems",
            "Monitored performance", "Resolved issues", "Scaled operations"
        ],
        "consulting": [
            "Advised", "Consulted", "Recommended", "Analyzed", "Assessed",
            "Developed strategies", "Implemented solutions", "Facilitated workshops",
            "Presented findings", "Guided clients", "Optimized processes",
            "Transformed organizations", "Delivered value", "Built relationships"
        ]
    }
    
    # Combine seniority and role-specific verbs
    base_verbs = seniority_verbs.get(seniority_level, seniority_verbs["mid"])
    role_verbs = role_specific_verbs.get(role_type, role_specific_verbs["technical"])
    
    # Merge and deduplicate
    all_verbs = list(set(base_verbs + role_verbs))
    
    return all_verbs

def calculate_total_experience_years(resume_text):
    """Calculate total years of work experience from the resume with improved date parsing."""
    lines = resume_text.split('\n')
    date_patterns = []
    current_year = datetime.now().year
    
    # Enhanced date patterns to catch more formats
    date_regex_patterns = [
        # Year ranges: "2020-2023", "2020 - 2023", "2020–2023", "2020—2023"
        r'(\d{4})\s*[-–—]\s*(\d{4}|present|current)',
        
        # Month Year ranges: "Jan 2020 - Dec 2023", "January 2020 - Present"
        r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+)?(\d{4}|present|current)',
        
        # Abbreviated month formats: "Jan '20 - Dec '23", "Jan '20 - Present"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*['\"]?(\d{2})\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*['\"]?)?(\d{2}|present|current)",
        
        # MM/YYYY format: "01/2020 - 12/2023", "01/2020 - Present"
        r'(\d{1,2})/(\d{4})\s*[-–—]\s*(?:\d{1,2}/)?(\d{4}|present|current)',
        
        # YYYY format with context: "2020 — Present", "Since 2020"
        r'(?:since\s+)?(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)',
        
        # Parenthetical dates: "(2020-2023)", "(Jan 2020 - Present)"
        r'\(.*?(\d{4})\s*[-–—]\s*(\d{4}|present|current).*?\)',
    ]
    
    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower:
            continue
            
        for pattern in date_regex_patterns:
            matches = re.findall(pattern, line_lower)
            if matches:
                for match in matches:
                    try:
                        if len(match) == 2:
                            # Standard year range format
                            start_year_str, end_year_str = match
                            
                            # Handle 2-digit years (convert to 4-digit)
                            if len(start_year_str) == 2:
                                start_year = 2000 + int(start_year_str)
                            else:
                                start_year = int(start_year_str)
                            
                            if end_year_str.lower() in ['present', 'current', 'now']:
                                end_year = current_year
                            elif len(end_year_str) == 2:
                                end_year = 2000 + int(end_year_str)
                            else:
                                end_year = int(end_year_str)
                                
                        elif len(match) == 3:
                            # MM/YYYY format
                            month_str, start_year_str, end_year_str = match
                            start_year = int(start_year_str)
                            
                            if end_year_str.lower() in ['present', 'current', 'now']:
                                end_year = current_year
                            else:
                                end_year = int(end_year_str)
                        else:
                            continue
                        
                        # Validate years are reasonable
                        if 1990 <= start_year <= current_year and 1990 <= end_year <= current_year + 1:
                            if start_year <= end_year:  # Start year should be before or equal to end year
                                date_patterns.append((start_year, end_year))
                            
                    except (ValueError, IndexError):
                        continue
    
    if not date_patterns:
        # Fallback: look for individual years and try to infer experience
        years = re.findall(r'\b(20\d{2})\b', resume_text)
        if years:
            years = [int(y) for y in years if 1990 <= int(y) <= current_year]
            if years:
                min_year = min(years)
                total_years = current_year - min_year
                return {
                    'total_years': total_years,
                    'analysis': f"Estimated {total_years} years based on year range {min_year}-{current_year}",
                    'confidence': 'medium'
                }
        
        return {
            'total_years': 5,  # Default
            'analysis': "Could not parse dates, defaulting to 5 years",
            'confidence': 'low'
        }
    
    # Calculate total experience from date ranges
    # Remove duplicates and overlaps
    unique_ranges = []
    for start, end in sorted(set(date_patterns)):
        # Merge overlapping ranges
        if unique_ranges and start <= unique_ranges[-1][1] + 1:
            # Extend the last range if there's overlap or they're adjacent
            unique_ranges[-1] = (unique_ranges[-1][0], max(unique_ranges[-1][1], end))
        else:
            unique_ranges.append((start, end))
    
    # Calculate total years from merged ranges
    total_years = sum(end - start for start, end in unique_ranges)
    
    # Alternative calculation: use the span from earliest to latest
    all_start_years = [start for start, end in unique_ranges]
    all_end_years = [end for start, end in unique_ranges]
    
    earliest_start = min(all_start_years)
    latest_end = max(all_end_years)
    span_years = latest_end - earliest_start
    
    # Use the more conservative estimate
    final_years = min(total_years, span_years)
    
    return {
        'total_years': final_years,
        'analysis': f"Calculated {final_years} years from {len(unique_ranges)} employment periods ({earliest_start} to {latest_end})",
        'confidence': 'high',
        'date_ranges': unique_ranges
    }

def analyze_work_history_structure(resume_text):
    """Analyze the work history structure to count jobs and companies."""
    lines = resume_text.split('\n')
    
    # Common indicators of job entries
    job_indicators = [
        'experience', 'work history', 'employment', 'professional background',
        'career history', 'work experience', 'professional experience'
    ]
    
    # Look for company names and job titles
    potential_jobs = []
    in_experience_section = False
    current_job = {}
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        line_lower = line.lower()
        
        # Check if we're entering an experience section
        if any(indicator in line_lower for indicator in job_indicators):
            in_experience_section = True
            continue
            
        # Check if we're leaving experience section
        if in_experience_section and any(section in line_lower for section in ['education', 'skills', 'certifications', 'projects']):
            in_experience_section = False
            continue
            
        if in_experience_section and line_stripped:
            # Look for patterns that suggest job titles or company names
            if any(title_word in line_lower for title_word in [
                'engineer', 'manager', 'analyst', 'developer', 'designer', 
                'specialist', 'coordinator', 'director', 'lead', 'senior', 
                'junior', 'associate', 'consultant', 'administrator', 'officer'
            ]):
                if current_job:
                    potential_jobs.append(current_job)
                current_job = {'title': line_stripped, 'line_number': i}
            
            # Look for date patterns (likely employment dates)
            elif any(char.isdigit() for char in line_stripped) and any(month in line_lower for month in [
                'jan', 'feb', 'mar', 'apr', 'may', 'jun',
                'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                'present', 'current', '2020', '2021', '2022', '2023', '2024', '2025'
            ]):
                if current_job:
                    current_job['dates'] = line_stripped
            
            # Look for company names
            elif not line_stripped.startswith(('•', '-', '*')) and not any(char.isdigit() for char in line_stripped[:10]):
                if current_job and 'company' not in current_job:
                    current_job['company'] = line_stripped
    
    # Add the last job if it exists
    if current_job:
        potential_jobs.append(current_job)
    
    # Count distinct jobs
    unique_jobs = []
    seen_combinations = set()
    
    for job in potential_jobs:
        job_key = (job.get('title', ''), job.get('company', ''))
        if job_key not in seen_combinations and job_key != ('', ''):
            seen_combinations.add(job_key)
            unique_jobs.append(job)
    
    return {
        'total_jobs_found': len(unique_jobs),
        'job_details': unique_jobs,
        'analysis_summary': f"Found {len(unique_jobs)} distinct job entries in work history"
    }

def extract_experience_requirements(job_description):
    """Extract experience requirements from job description."""
    if not job_description or not job_description.strip():
        return None
    
    # Common patterns for experience requirements
    patterns = [
        r'(\d+)\+?\s*years?\s*of\s*experience',
        r'(\d+)\+?\s*years?\s*experience',
        r'minimum\s*of\s*(\d+)\+?\s*years?',
        r'at\s*least\s*(\d+)\+?\s*years?',
        r'(\d+)\+?\s*years?\s*in\s*\w+',
        r'(\d+)\+?\s*years?\s*of\s*\w+\s*experience',
        r'(\d+)\s*to\s*(\d+)\s*years?\s*experience',
        r'(\d+)-(\d+)\s*years?\s*experience'
    ]
    
    job_desc_lower = job_description.lower()
    found_requirements = []
    
    for pattern in patterns:
        matches = re.findall(pattern, job_desc_lower)
        for match in matches:
            if isinstance(match, tuple):
                # Handle range patterns like "5-7 years" or "5 to 7 years"
                found_requirements.extend([int(x) for x in match if x.isdigit()])
            else:
                # Handle single number patterns
                if match.isdigit():
                    found_requirements.append(int(match))
    
    if found_requirements:
        # Return the most commonly mentioned requirement, or the minimum if tied
        counter = Counter(found_requirements)
        most_common = counter.most_common(1)[0][0]
        
        return {
            'required_years': most_common,
            'all_found': found_requirements,
            'analysis': f"Found experience requirements: {found_requirements}, using {most_common} years"
        }
    
    return None

def extract_job_keywords(job_desc):
    """Extract key technical skills, tools, and requirements from job description"""
    tech_patterns = [
        'Python', 'Java', 'JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
        'SQL', 'MongoDB', 'PostgreSQL', 'Git', 'CI/CD', 'Agile', 'Scrum', 'REST API',
        'GraphQL', 'TypeScript', 'Vue.js', 'Angular', 'Spring', 'Django', 'Flask',
        'Microservices', 'DevOps', 'Jenkins', 'Terraform', 'Linux', 'Machine Learning',
        'Data Science', 'Analytics', 'Tableau', 'Power BI', 'Spark', 'Hadoop',
        'Azure', 'GCP', 'Redis', 'Elasticsearch', 'Kafka', 'RabbitMQ', 'Nginx',
        'Apache', 'Tomcat', 'Maven', 'Gradle', 'Webpack', 'Babel', 'Jest',
        'Cypress', 'Selenium', 'JUnit', 'Mockito', 'Pandas', 'NumPy', 'TensorFlow',
        'PyTorch', 'Scikit-learn', 'Jupyter', 'R', 'Scala', 'Go', 'Rust',
        'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Rails', 'Laravel', 'Express',
        'FastAPI', 'Celery', 'Airflow', 'Snowflake', 'BigQuery', 'Redshift',
        'DynamoDB', 'Cassandra', 'Neo4j', 'Prometheus', 'Grafana', 'Splunk',
        'New Relic', 'Datadog', 'CloudFormation', 'CDK', 'Ansible', 'Puppet',
        'Chef', 'Vagrant', 'Helm', 'Istio', 'OpenShift', 'EKS', 'ECS',
        'Lambda', 'S3', 'EC2', 'RDS', 'CloudWatch', 'IAM', 'VPC', 'API Gateway'
    ]
    
    found_keywords = []
    job_lower = job_desc.lower()
    
    for keyword in tech_patterns:
        if keyword.lower() in job_lower:
            found_keywords.append(keyword)
    
    return found_keywords

def extract_current_role(resume_text):
    """Extract the most recent/current role from the resume."""
    lines = resume_text.split('\n')
    
    for line in lines:
        line_stripped = line.strip()
        # Look for job titles (usually after company names or in experience sections)
        if any(indicator in line.lower() for indicator in [
            'engineer', 'manager', 'analyst', 'developer', 'designer', 
            'specialist', 'coordinator', 'director', 'lead', 'senior', 
            'junior', 'associate', 'consultant', 'administrator', 'officer'
        ]):
            return line_stripped
    
    return "Professional"  # Default fallback

def get_enhanced_resume_optimization_prompt(resume_text, job_description, job_title, company_name, keywords_text, length_guidance):
    """
    Enhanced resume optimization prompt combining clean structure with dynamic analysis.
    
    Args:
        resume_text (str): The original resume content
        job_description (str): The job description to optimize for (optional)
        job_title (str): The specific job title to target
        company_name (str): The company name (optional)
        keywords_text (str): Extracted keywords from the job description (legacy parameter)
        length_guidance (str): Content preservation guidance
    
    Returns:
        str: The complete formatted prompt
    """
    
    # Perform dynamic analysis
    work_history_analysis = analyze_work_history_structure(resume_text)
    experience_years = calculate_total_experience_years(resume_text)
    current_role = extract_current_role(resume_text)
    
    # Analyze target role for appropriate action verbs
    seniority_level, role_type = analyze_role_seniority_and_type(job_title)
    appropriate_verbs = get_appropriate_action_verbs(seniority_level, role_type)
    
    # Extract job keywords and experience requirements
    job_keywords = []
    experience_requirements = None
    experience_requirements_text = ""
    
    if job_description and job_description.strip():
        job_keywords = extract_job_keywords(job_description)
        experience_requirements = extract_experience_requirements(job_description)
        if experience_requirements:
            experience_requirements_text = f"{experience_requirements['required_years']}+ years of relevant experience"
        else:
            experience_requirements_text = "Experience level not specified in job description"
    else:
        experience_requirements_text = "No job description provided"
    
    prompt = f"""# Resume Optimization Assistant

## TASK OVERVIEW
You are an expert resume editor tasked with optimizing a resume's bullet points to target a specific job while preserving the original structure and factual content. Your goal is to transform the content to highlight relevant skills and experiences without fabricating information and also ensure that the candidate resume passes through ATS easily.

## CORE PRINCIPLES
<preservation_rules>
- PRESERVE all job entries (companies, titles, dates) exactly as in the original resume
- MAINTAIN the exact number of bullet points per job
- KEEP all education entries (degrees, institutions, dates, GPA, honors) unchanged
- TRANSFORM only the content of bullet points to align with the target role
</preservation_rules>

## PROHIBITED ACTIONS
<forbidden_actions>
- DO NOT remove any company from work history
- DO NOT omit any job experience
- DO NOT skip any employment entry
- DO NOT combine multiple jobs into one
- DO NOT delete any work experience regardless of relevance
- DO NOT modify any education entries
</forbidden_actions>

## PROCESS

### STEP 1: ANALYZE ORIGINAL RESUME
<analysis_instructions>
1. Count all achievement statements in the experience section (bullets, numbered lists, paragraphs)
2. Count all job entries in work history
3. Document the structure per job (number of bullets/achievements per position)
</analysis_instructions>

### STEP 2: VERIFY STRUCTURE PRESERVATION
<verification_checklist>
- Ensure output has EXACTLY the same number of job entries as original
- Maintain EXACTLY the same number of achievement statements per job
- Preserve the overall structure pattern across all entries
</verification_checklist>

### STEP 3: OPTIMIZE JOB ROLES
For each job entry:

If you need to edit or optimize a job title, you must first research the company.
Update the job title to reflect a realistic, role-appropriate title that is commonly used at that specific company for similar positions.

Ensure the title is:
- Aligned with the candidate's actual responsibilities in that job
- True to the original scope and level (e.g., don't promote or demote unless it aligns with industry norms)
- Reflective of how that company typically labels similar roles (e.g., "Customer Success Manager" vs. "Client Relationship Lead")

🔍 Example: 
Original: "Software Developer" at Google 
Researched and optimized: "Software Engineer II" (based on Google's known job ladder)

### STEP 4: OPTIMIZE BULLET POINTS
<optimization_strategy>
When job description is provided:
- Modify each bullet to highlight skills and responsibilities from the job keywords: {', '.join(job_keywords) if job_keywords else 'N/A'} and job requirements: {experience_requirements_text}
- Reframe actual experience to show alignment with target role
- Ensure bullets remain authentic and specific to the candidate
- Avoid repetition; each bullet should add distinct value

When job description is not provided:
- Use industry standards for the {job_title} to guide optimization
- Modify bullets to reflect commonly required skills and impact areas
- Keep content grounded in the candidate's original experience
</optimization_strategy>

### STEP 5: CAREER TRANSITION ASSESSMENT
<transition_guidance>
Analyze if this is a career advancement or major transition:
- Current: {current_role}
- Target: {job_title}

For career advancements (same domain, higher level):
- Emphasize progression of skills and increasing responsibility
- Highlight leadership, strategic thinking, and broader impact

For major career transitions (different domains/fields):
- Focus on transferable skills relevant to the target role
- Emphasize projects or responsibilities that align with new field
- Translate domain-specific achievements into universal competencies
</transition_guidance>

## INPUT DATA
<resume_data>
Original Resume: {resume_text}

Current Role: {current_role}
Target Job: {job_title}
{f"Target Company: {company_name}" if company_name else "Target Company: Not specified"}
Seniority Level: {seniority_level}
Role Type: {role_type}
Appropriate Action Verbs: {', '.join(appropriate_verbs[:15])}
Total Work Experience: {experience_years['total_years']} years
Job Requirements: {experience_requirements_text}
Total Job Entries: {work_history_analysis['total_jobs_found']}
</resume_data>

## DYNAMIC ANALYSIS RESULTS
<analysis_results>
Experience Analysis: {experience_years['analysis']}
Work History Structure: {work_history_analysis['analysis_summary']}
Detected Jobs: {chr(10).join([f"- {job.get('title', 'Unknown Title')} at {job.get('company', 'Unknown Company')}" for job in work_history_analysis['job_details']])}
Target Role Analysis: {job_title} -> Seniority: {seniority_level}, Type: {role_type}
{f"Job Keywords Found: {', '.join(job_keywords)}" if job_keywords else "Job Keywords: None extracted (no job description provided)"}
{f"Experience Requirements: {experience_requirements['analysis']}" if experience_requirements else "Experience Requirements: Not specified in job description"}
</analysis_results>

## OUTPUT FORMAT
Return ONLY a JSON object with the following structure:

```json
{{
  "full_name": "Name from resume",
  "contact_info": "Email | Phone | Location",
  "professional_summary": "Brief summary positioning candidate for {job_title} with {experience_years['total_years']}+ years of experience and {experience_requirements_text} in {job_title}",
  "skills": ["Technologies relevant to {job_title}"],
  "experience": [
    {{
      "title": "Research-based title appropriate for this company and {job_title} progression",
      "company": "Exact company name from original",
      "dates": "Exact dates from original",
      "achievements": [
        "Optimized bullet 1 using appropriate action verbs for {job_title}",
        "Optimized bullet 2 highlighting relevant skills and impact",
        "Exact same number of bullets as original with fully optimized content"
      ]
    }}
  ],
  "education": [
    {{
      "degree": "Exact degree from original",
      "institution": "Exact institution from original",
      "dates": "Exact dates from original",
      "details": "Exact details from original (GPA, honors, etc.)"
    }}
  ]
}}
```

Do not include any explanations, analysis text, or verification notes in your response - return ONLY the JSON object.
"""

    return prompt