"""
Resume Optimization Prompt Template

This file contains the AI prompt template used for resume optimization.
Based on the proven methodology from the GitHub repository.
Edit this file to modify the AI's behavior and instructions.
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
    
    # Determine role type - Lead is senior-level technical, not management
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
            "Optimized workflows", "Facilitated", "Delegated", "Motivated", "Inspired"
        ],
        "sales": [
            "Generated", "Closed", "Negotiated", "Cultivated", "Built relationships",
            "Prospected", "Qualified", "Converted", "Exceeded targets", "Grew accounts",
            "Expanded territory", "Developed partnerships", "Secured contracts"
        ],
        "marketing": [
            "Launched", "Developed campaigns", "Increased brand awareness", "Generated leads",
            "Optimized conversion", "Analyzed performance", "Segmented audiences",
            "Created content", "Managed budgets", "Coordinated events", "Built brand"
        ],
        "product": [
            "Defined requirements", "Prioritized features", "Collaborated with engineering",
            "Conducted user research", "Analyzed metrics", "Optimized user experience",
            "Launched products", "Managed roadmap", "Gathered feedback", "Iterated"
        ],
        "analytical": [
            "Analyzed", "Investigated", "Researched", "Modeled", "Forecasted",
            "Identified trends", "Generated insights", "Recommended", "Optimized",
            "Measured", "Tracked", "Reported", "Visualized", "Interpreted"
        ],
        "technical": [
            "Developed", "Built", "Implemented", "Designed", "Architected",
            "Optimized", "Debugged", "Deployed", "Maintained", "Integrated",
            "Automated", "Scaled", "Refactored", "Tested", "Documented"
        ],
        "design": [
            "Designed", "Created", "Conceptualized", "Prototyped", "Wireframed",
            "Researched user needs", "Conducted usability testing", "Iterated",
            "Collaborated with stakeholders", "Presented concepts", "Refined"
        ],
        "hr": [
            "Recruited", "Hired", "Onboarded", "Developed talent", "Managed performance",
            "Facilitated training", "Implemented policies", "Resolved conflicts",
            "Built culture", "Improved retention", "Conducted interviews"
        ],
        "finance": [
            "Analyzed financial data", "Prepared reports", "Managed budgets",
            "Forecasted", "Modeled scenarios", "Assessed risks", "Optimized costs",
            "Ensured compliance", "Audited", "Reconciled", "Tracked performance"
        ],
        "operations": [
            "Streamlined processes", "Optimized workflows", "Managed supply chain",
            "Coordinated logistics", "Improved efficiency", "Reduced costs",
            "Ensured quality", "Managed vendors", "Implemented systems"
        ],
        "consulting": [
            "Advised", "Consulted", "Recommended", "Analyzed", "Assessed",
            "Developed strategies", "Implemented solutions", "Facilitated workshops",
            "Presented findings", "Guided clients", "Optimized processes"
        ]
    }
    
    # Combine seniority and role-specific verbs
    base_verbs = seniority_verbs.get(seniority_level, seniority_verbs["mid"])
    role_verbs = role_specific_verbs.get(role_type, role_specific_verbs["technical"])
    
    # Merge and deduplicate
    all_verbs = list(set(base_verbs + role_verbs))
    
    return all_verbs

def extract_job_keywords(job_desc):
    """Extract key technical skills, tools, and requirements from job description"""
    if not job_desc or not job_desc.strip():
        return []
        
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


def get_resume_optimization_prompt(resume_text, job_description, job_title, company_name, skills_text=None):
    """
    Resume optimization prompt with enhanced analysis features
    """
    
    # Calculate experience years with improved parsing
    experience_years = calculate_total_experience_years(resume_text)
    
    # Use enhanced role analysis
    seniority_level, role_type = analyze_role_seniority_and_type(job_title)
    
    # Get appropriate action verbs based on analysis
    appropriate_verbs = get_appropriate_action_verbs(seniority_level, role_type)
    
    # Extract keywords and requirements from job description
    job_keywords = extract_job_keywords(job_description) if job_description else []
    experience_requirements_data = extract_experience_requirements(job_description) if job_description else None
    
    # Build experience requirements text
    if job_description and job_description.strip():
        if experience_requirements_data:
            experience_requirements = f"{experience_requirements_data['required_years']}+ years of relevant experience in {job_title}"
        else:
            experience_requirements = job_description.strip()
    else:
        # Infer common requirements based on job title
        if 'engineer' in job_title.lower():
            experience_requirements = 'Software Development, System Design, Problem Solving, Technical Leadership'
        elif 'manager' in job_title.lower():
            experience_requirements = 'Team Leadership, Project Management, Strategic Planning, Cross-functional Collaboration'
        elif 'analyst' in job_title.lower():
            experience_requirements = 'Data Analysis, Research, Reporting, Business Intelligence'
        else:
            experience_requirements = 'Industry-standard skills and experience'

    # Print enhanced debug information
    print("=== ENHANCED PROMPT TEMPLATE VARIABLES DEBUG ===")
    print(f"Resume text length: {len(resume_text)} chars")
    print(f"Job description length: {len(job_description) if job_description else 0} chars")
    print(f"Job title: '{job_title}'")
    print(f"Company name: '{company_name}'")
    print(f"Skills text length: {len(skills_text) if skills_text else 0} chars")
    print(f"Experience years: {experience_years}")
    print(f"Analyzed seniority level: '{seniority_level}'")
    print(f"Analyzed role type: '{role_type}'")
    print(f"Appropriate action verbs (first 10): {appropriate_verbs[:10]}")
    print(f"Job keywords found: {job_keywords}")
    print(f"Experience requirements: {experience_requirements}")
    
    print("=== END ENHANCED PROMPT VARIABLES DEBUG ===")

    prompt = f"""# Resume Optimization Assistant
## TASK OVERVIEW
You are an expert resume editor tasked with optimizing a resume to target a specific job while preserving the original structure and factual accuracy. Your goal is to:
- Transform job titles, bullet points and summaries to highlight the most relevant skills and achievements for the target job
- Ensure the candidate appears as an established, experienced professional in the target role
- Optimize for ATS keyword alignment using job description keywords.

## CORE PRINCIPLES
<preservation_rules>
- PRESERVE all job entries (companies, dates, locations) exactly as in the original resume unless.
- MAINTAIN the exact number of bullet points per job
- KEEP all education entries (degrees, institutions, dates, GPA, honors) unchanged
- TRANSFORM only bullet point and summary content to align with the target role
- PRESENT the candidate as an established professional already in the target field — avoid any wording implying transition, change, or shift
</preservation_rules>

## PROHIBITED ACTIONS
<forbidden_actions>
- DO NOT remove or combine any jobs
- DO NOT omit any employment entry regardless of relevance
- DO NOT alter employment dates
- DO NOT fabricate achievements or skills
- DO NOT modify education details
- DO NOT add phrases like "transitioning into" or "seeking to move into"
</forbidden_actions>

## PROCESS
### STEP 1: ANALYZE ORIGINAL RESUME
<analysis_instructions>
1. Count all bullet points/achievement statements in each job
2. Count total job entries
3. Record the number of bullets per job to replicate exactly
4. Extract location information (City, State/Country) for each position if available
</analysis_instructions>

### STEP 2: VERIFY STRUCTURE PRESERVATION
<verification_checklist>
- EXACT same number of job entries
- EXACT same number of bullets per job
- SAME order of jobs
</verification_checklist>

### STEP 3: JOB TITLE OPTIMIZATION (If Needed)
If the target role ({job_title}) has a known equivalent at the company in that time period, replace the original title with the equivalent title that aligns with both the target role and the company's actual naming conventions. If not, then replace it with a company title that suits the target role. Ensure that job title you replace in the latest experience matches to {seniority_level} level and {role_type} role type. Titles must remain factually plausible based on the candidate's described responsibilities and seniority. When possible, adapt generic engineering titles into the target role if the responsibilities clearly overlap (e.g., "Senior Data Engineer" → "Senior Business Intelligence Engineer" if target is BI and work involved BI-related tasks).

Example: Original: "Software Developer" at Google
Optimized: "Software Engineer II" (if verified as realistic for that role at Google)

### STEP 4: BULLET POINT OPTIMIZATION
<optimization_strategy>
When job description is provided:
- Use {experience_requirements} as the foundation
- Rewrite bullets to align with target role requirements and incorporate key technologies: {', '.join(job_keywords) if job_keywords else 'N/A'}
- Integrate action verbs from {', '.join(appropriate_verbs[:15])}
- Ensure each bullet adds unique value, avoids repetition, and reflects measurable impact

{f'''
### DYNAMIC SKILLS PRIORITIZATION
{skills_text}

Use the above skills database to prioritize relevant technologies and competencies when rewriting bullet points. Focus on skills that appear in both the job requirements and the dynamic skills database.
''' if skills_text and skills_text.strip() else ''}

When job description is not provided:
- Use industry standards for {job_title} to guide bullet rewrites
- Ensure all bullets sound like they come from a seasoned professional already in that role
</optimization_strategy>

### STEP 5: PROFESSIONAL SUMMARY OPTIMIZATION
- Portray candidate as a proven, highly skilled {job_title} with {experience_years['total_years']}+ years of directly relevant experience
- Highlight mastery in {experience_requirements}
- Avoid all transition language
- Include ATS-friendly keywords naturally including: {', '.join(job_keywords) if job_keywords else 'industry-standard technologies'}
{f'- Prioritize skills from the dynamic skills database when crafting the summary' if skills_text and skills_text.strip() else ''}

---

## INPUT DATA
<resume_data>
Original Resume: {resume_text}

Current Role: [Extract from resume]
Target Job: {job_title}
Target Company: {company_name if company_name else 'Not specified'}
Seniority Level: {seniority_level}
Role Type: {role_type}
Appropriate Action Verbs: {', '.join(appropriate_verbs[:15])}
Total Work Experience: {experience_years['total_years']} years
Job Requirements: {experience_requirements}
Key Technologies/Skills: {', '.join(job_keywords) if job_keywords else 'Not specified'}
</resume_data>

## OUTPUT FORMAT
Return ONLY a JSON object in the exact structure below — no extra commentary or notes:

{{
  "full_name": "Exact name from resume",
  "contact_info": "Email | Phone | Location",
  "professional_summary": "Confident, ATS-optimized summary presenting candidate as an established, highly skilled {job_title} with {experience_years['total_years']}+ years of directly relevant experience, demonstrating mastery in {experience_requirements} and delivering measurable results in the field.",
  "skills": ["Technologies and competencies relevant to {job_title} including {', '.join(job_keywords[:8]) if job_keywords else 'industry-standard technologies'}{', prioritizing skills from the dynamic skills database when available' if skills_text and skills_text.strip() else ''}"],
  "experience": [
    {{
      "title": "Research-based or original title, optimized only if it increases realism",
      "company": "Exact company name from original",
      "location": "City, State from original resume, or leave empty if not provided",
      "dates": "Use exact dates from original resume, or leave empty if no dates were provided",
      "achievements": [
        "Optimized bullet 1 with strong action verbs and target role alignment",
        "Optimized bullet 2 with unique skill or achievement relevant to {job_title}",
        "Same total number of bullets as original"
      ]
    }}
  ],
  "education": [
    {{
      "degree": "Exact degree from original",
      "institution": "Exact institution from original",
      "dates": "Use exact dates from original resume, or leave empty if no dates were provided",
      "details": "Exact details from original (GPA, honors, etc.)"
    }}
  ]
}}

CRITICAL: Return ONLY the JSON object. No explanations, no reasoning, no markdown formatting, no code blocks. Just the raw JSON starting with {{ and ending with }}.
"""

    return prompt
