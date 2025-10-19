import re
from typing import List, Dict, Set
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class SkillExtractor:
    def __init__(self):
        # Technical skill patterns
        self.technical_patterns = [
            # Programming Languages
            r'\b(?:Python|Java|JavaScript|TypeScript|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Scala|R|MATLAB|Perl|Shell|Bash|PowerShell)\b',
            
            # Web Technologies
            r'\b(?:HTML5?|CSS3?|SASS|SCSS|Less|Bootstrap|Tailwind|jQuery|AJAX|JSON|XML|REST|GraphQL|WebSocket)\b',
            
            # Frameworks & Libraries
            r'\b(?:React|Vue\.?js|Angular|Node\.?js|Express\.?js|Django|Flask|Spring|Laravel|Rails|ASP\.NET|\.NET|Symfony|CodeIgniter)\b',
            r'\b(?:TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy|Matplotlib|Seaborn|OpenCV|NLTK|SpaCy)\b',
            
            # Databases
            r'\b(?:MySQL|PostgreSQL|MongoDB|Redis|Cassandra|DynamoDB|SQLite|Oracle|SQL Server|MariaDB|CouchDB|Neo4j|InfluxDB)\b',
            
            # Cloud Platforms & Services
            r'\b(?:AWS|Amazon Web Services|Microsoft Azure|Google Cloud Platform|GCP|Heroku|DigitalOcean|Linode|Vercel|Netlify)\b',
            r'\b(?:EC2|S3|Lambda|RDS|CloudFormation|Terraform|Ansible|Chef|Puppet)\b',
            
            # DevOps & Tools
            r'\b(?:Docker|Kubernetes|K8s|Jenkins|GitLab CI|GitHub Actions|CircleCI|Travis CI|TeamCity)\b',
            r'\b(?:Git|SVN|Mercurial|Bitbucket|GitHub|GitLab|Jira|Confluence|Slack|Teams)\b',
            
            # Operating Systems
            r'\b(?:Linux|Ubuntu|CentOS|RHEL|Windows|macOS|Unix|Debian|Fedora|SUSE)\b',
            
            # Mobile Development
            r'\b(?:iOS|Android|React Native|Flutter|Xamarin|Ionic|Cordova|PhoneGap)\b',
            
            # Data & Analytics
            r'\b(?:Tableau|Power BI|Looker|Qlik|D3\.js|Chart\.js|Apache Spark|Hadoop|Kafka|Elasticsearch|Kibana|Logstash)\b',
            
            # Testing
            r'\b(?:Jest|Mocha|Chai|Cypress|Selenium|JUnit|TestNG|PyTest|RSpec|Cucumber)\b',
            
            # Methodologies & Concepts
            r'\b(?:Agile|Scrum|Kanban|DevOps|CI/CD|TDD|BDD|Microservices|API|RESTful|SOAP|MVC|MVP|MVVM)\b',
            
            # Security
            r'\b(?:OAuth|JWT|SSL/TLS|HTTPS|Encryption|Penetration Testing|Vulnerability Assessment|OWASP)\b',
            
            # Version Control & Collaboration
            r'\b(?:Version Control|Source Control|Code Review|Pull Request|Merge Request)\b'
        ]
        
        # Soft skill patterns
        self.soft_skill_patterns = [
            r'\b(?:Leadership|Team Leadership|People Management|Staff Management|Cross-functional Leadership)\b',
            r'\b(?:Communication|Verbal Communication|Written Communication|Presentation|Public Speaking)\b',
            r'\b(?:Problem Solving|Critical Thinking|Analytical Thinking|Troubleshooting|Debugging)\b',
            r'\b(?:Project Management|Program Management|Product Management|Stakeholder Management)\b',
            r'\b(?:Team Collaboration|Teamwork|Cross-functional Collaboration|Remote Collaboration)\b',
            r'\b(?:Mentoring|Coaching|Training|Knowledge Transfer|Documentation)\b',
            r'\b(?:Strategic Planning|Strategic Thinking|Business Analysis|Requirements Gathering)\b',
            r'\b(?:Client Relations|Customer Service|Customer Success|Account Management)\b',
            r'\b(?:Innovation|Creative Thinking|Design Thinking|User Experience|UX|UI)\b',
            r'\b(?:Time Management|Prioritization|Multi-tasking|Deadline Management)\b',
            r'\b(?:Adaptability|Flexibility|Learning Agility|Continuous Learning)\b',
            r'\b(?:Attention to Detail|Quality Assurance|Code Review|Peer Review)\b'
        ]
        
        # Industry-specific patterns
        self.industry_patterns = [
            r'\b(?:Machine Learning|ML|Artificial Intelligence|AI|Deep Learning|Neural Networks|NLP|Computer Vision)\b',
            r'\b(?:Data Science|Data Analysis|Data Mining|Big Data|Data Visualization|Business Intelligence|BI)\b',
            r'\b(?:Cybersecurity|Information Security|Network Security|Application Security|Cloud Security)\b',
            r'\b(?:Blockchain|Cryptocurrency|Smart Contracts|DeFi|Web3|NFT)\b',
            r'\b(?:IoT|Internet of Things|Edge Computing|Embedded Systems|Firmware)\b',
            r'\b(?:Game Development|Unity|Unreal Engine|Game Design|3D Modeling|Animation)\b',
            r'\b(?:E-commerce|Payment Processing|Fintech|Healthcare IT|EdTech|PropTech)\b',
            r'\b(?:Compliance|GDPR|HIPAA|SOX|PCI DSS|ISO 27001|NIST)\b'
        ]
        
        # Certification patterns
        self.certification_patterns = [
            r'\b(?:AWS Certified|Azure Certified|Google Cloud Certified|Certified Kubernetes|CKA|CKAD)\b',
            r'\b(?:PMP|Scrum Master|Product Owner|SAFe|ITIL|Six Sigma|Lean)\b',
            r'\b(?:CISSP|CISM|CISA|CEH|OSCP|Security\+|Network\+|Cloud\+)\b',
            r'\b(?:Oracle Certified|Microsoft Certified|Salesforce Certified|Tableau Certified)\b'
        ]
        
        # Common skill indicators
        self.skill_indicators = [
            r'(?:experience with|proficient in|skilled in|expertise in|knowledge of|familiar with|working with)',
            r'(?:technologies|tools|frameworks|languages|platforms|systems|methodologies)',
            r'(?:requirements|qualifications|skills|competencies|abilities|capabilities)'
        ]
        
        # Words to exclude (not skills)
        self.exclude_words = {
            'experience', 'years', 'strong', 'excellent', 'good', 'basic', 'advanced',
            'senior', 'junior', 'mid', 'level', 'ability', 'knowledge', 'understanding',
            'skills', 'requirements', 'qualifications', 'preferred', 'required', 'must',
            'should', 'will', 'can', 'able', 'work', 'working', 'development', 'design',
            'implementation', 'management', 'analysis', 'testing', 'debugging', 'optimization',
            'integration', 'deployment', 'maintenance', 'support', 'documentation',
            'collaboration', 'communication', 'leadership', 'team', 'project', 'product',
            'business', 'technical', 'software', 'application', 'system', 'platform',
            'solution', 'service', 'tool', 'technology', 'framework', 'library',
            'database', 'server', 'client', 'web', 'mobile', 'cloud', 'data'
        }
    
    def extract_from_job_description(self, job_text: str) -> List[Dict]:
        """Extract skills from job description with categorization"""
        if not job_text or not job_text.strip():
            return []
        
        extracted_skills = []
        seen_skills = set()
        
        # Clean the text
        cleaned_text = self._clean_text(job_text)
        
        # Extract different categories of skills
        technical_skills = self._extract_by_patterns(cleaned_text, self.technical_patterns, 'technical')
        soft_skills = self._extract_by_patterns(cleaned_text, self.soft_skill_patterns, 'soft')
        industry_skills = self._extract_by_patterns(cleaned_text, self.industry_patterns, 'industry')
        certification_skills = self._extract_by_patterns(cleaned_text, self.certification_patterns, 'certifications')
        
        # Combine all skills
        all_skills = technical_skills + soft_skills + industry_skills + certification_skills
        
        # Additional extraction using context-based approach
        contextual_skills = self._extract_contextual_skills(cleaned_text)
        all_skills.extend(contextual_skills)
        
        # Deduplicate and validate
        for skill in all_skills:
            skill_name = skill['skill_name'].strip()
            skill_key = skill_name.lower()
            
            if (skill_key not in seen_skills and 
                self.validate_skill(skill_name) and 
                len(skill_name) >= 2):
                
                seen_skills.add(skill_key)
                extracted_skills.append(skill)
        
        # Sort by confidence score
        extracted_skills.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        
        logger.info(f"Extracted {len(extracted_skills)} skills from job description")
        return extracted_skills
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for better extraction"""
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common formatting artifacts
        text = re.sub(r'[•·▪▫◦‣⁃]', '', text)  # Remove bullet points
        text = re.sub(r'[\(\)\[\]{}]', ' ', text)  # Remove brackets
        text = re.sub(r'[^\w\s\.\+#/-]', ' ', text)  # Keep only alphanumeric, spaces, and common tech chars
        
        return text
    
    def _extract_by_patterns(self, text: str, patterns: List[str], category: str) -> List[Dict]:
        """Extract skills using regex patterns"""
        skills = []
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                skill_name = match.group(0)
                
                # Calculate confidence based on context
                confidence = self._calculate_confidence(text, match.start(), match.end())
                
                skills.append({
                    'skill_name': skill_name,
                    'category': category,
                    'confidence_score': confidence,
                    'extraction_method': 'pattern_matching',
                    'context': self._get_context(text, match.start(), match.end())
                })
        
        return skills
    
    def _extract_contextual_skills(self, text: str) -> List[Dict]:
        """Extract skills based on context indicators"""
        skills = []
        
        # Look for skill-indicating phrases
        for indicator_pattern in self.skill_indicators:
            pattern = f"{indicator_pattern}\\s+([\\w\\s\\.\\+#/-]+?)(?:\\s*(?:,|and|or|\\.|;|$))"
            matches = re.finditer(pattern, text, re.IGNORECASE)
            
            for match in matches:
                potential_skills = match.group(1).strip()
                
                # Split on common delimiters
                skill_candidates = re.split(r'[,;/&]|\sand\s|\sor\s', potential_skills)
                
                for candidate in skill_candidates:
                    candidate = candidate.strip()
                    if self._is_likely_skill(candidate):
                        category = self.categorize_skill(candidate)
                        confidence = 0.7  # Medium confidence for contextual extraction
                        
                        skills.append({
                            'skill_name': candidate,
                            'category': category,
                            'confidence_score': confidence,
                            'extraction_method': 'contextual',
                            'context': self._get_context(text, match.start(), match.end())
                        })
        
        return skills
    
    def _is_likely_skill(self, text: str) -> bool:
        """Determine if text is likely a skill"""
        text_lower = text.lower().strip()
        
        # Too short or too long
        if len(text_lower) < 2 or len(text_lower) > 50:
            return False
        
        # Contains only common words
        words = text_lower.split()
        if all(word in self.exclude_words for word in words):
            return False
        
        # Contains numbers (likely version numbers or years - could be skills)
        if re.search(r'\d', text) and not re.search(r'^\d+$', text):
            return True
        
        # Contains technical indicators
        if any(indicator in text_lower for indicator in ['.js', '.net', 'api', 'sdk', 'framework', 'library']):
            return True
        
        # Capitalized words (likely proper nouns/technologies)
        if any(word[0].isupper() for word in words if len(word) > 1):
            return True
        
        # Common skill word patterns
        skill_patterns = [
            r'\w+ing$',  # Programming, Testing, etc.
            r'\w+ment$',  # Management, Development, etc.
            r'\w+tion$',  # Integration, Implementation, etc.
            r'\w+ness$',  # Business, etc.
        ]
        
        for pattern in skill_patterns:
            if re.search(pattern, text_lower):
                return True
        
        return len(words) <= 3  # Short phrases are more likely to be skills
    
    def categorize_skill(self, skill: str) -> str:
        """Determine the category of a skill"""
        skill_lower = skill.lower()
        
        # Technical skills
        technical_keywords = [
            'programming', 'development', 'coding', 'software', 'web', 'mobile',
            'database', 'server', 'cloud', 'api', 'framework', 'library',
            'testing', 'debugging', 'deployment', 'integration', 'architecture',
            'security', 'network', 'system', 'platform', 'tool', 'technology'
        ]
        
        # Soft skills
        soft_keywords = [
            'leadership', 'management', 'communication', 'collaboration', 'teamwork',
            'problem', 'analytical', 'critical', 'creative', 'strategic', 'planning',
            'organization', 'time', 'presentation', 'negotiation', 'mentoring'
        ]
        
        # Industry skills
        industry_keywords = [
            'machine learning', 'artificial intelligence', 'data science', 'blockchain',
            'cybersecurity', 'fintech', 'healthcare', 'e-commerce', 'gaming',
            'iot', 'embedded', 'automotive', 'aerospace', 'manufacturing'
        ]
        
        # Check for matches
        if any(keyword in skill_lower for keyword in technical_keywords):
            return 'technical'
        elif any(keyword in skill_lower for keyword in soft_keywords):
            return 'soft'
        elif any(keyword in skill_lower for keyword in industry_keywords):
            return 'industry'
        elif 'certified' in skill_lower or 'certification' in skill_lower:
            return 'certifications'
        elif skill_lower in ['python', 'java', 'javascript', 'c++', 'c#', 'go', 'rust', 'php', 'ruby']:
            return 'languages'
        elif skill_lower in ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'express']:
            return 'frameworks'
        elif skill_lower in ['git', 'docker', 'kubernetes', 'jenkins', 'jira', 'slack']:
            return 'tools'
        else:
            return 'general'
    
    def validate_skill(self, skill: str) -> bool:
        """Validate if extracted text is actually a skill"""
        if not skill or not skill.strip():
            return False
        
        skill_clean = skill.strip().lower()
        
        # Too short or too long
        if len(skill_clean) < 2 or len(skill_clean) > 100:
            return False
        
        # Only numbers
        if skill_clean.isdigit():
            return False
        
        # Only common words
        words = skill_clean.split()
        if len(words) == 1 and skill_clean in self.exclude_words:
            return False
        
        # Contains only punctuation
        if re.match(r'^[^\w\s]+$', skill_clean):
            return False
        
        # Valid skill patterns
        valid_patterns = [
            r'^[a-zA-Z][a-zA-Z0-9\s\.\+#/-]*[a-zA-Z0-9]$',  # Starts and ends with alphanumeric
            r'^[a-zA-Z][a-zA-Z0-9\.\+#/-]*$',  # Single word with valid characters
        ]
        
        return any(re.match(pattern, skill.strip()) for pattern in valid_patterns)
    
    def _calculate_confidence(self, text: str, start: int, end: int) -> float:
        """Calculate confidence score based on context"""
        base_confidence = 0.8
        
        # Get surrounding context
        context_start = max(0, start - 50)
        context_end = min(len(text), end + 50)
        context = text[context_start:context_end].lower()
        
        # Boost confidence for certain contexts
        confidence_boosters = [
            ('experience with', 0.1),
            ('proficient in', 0.1),
            ('skilled in', 0.1),
            ('expertise in', 0.15),
            ('required', 0.05),
            ('must have', 0.1),
            ('years of', 0.05),
            ('strong', 0.05),
            ('advanced', 0.1),
            ('expert', 0.15)
        ]
        
        for phrase, boost in confidence_boosters:
            if phrase in context:
                base_confidence += boost
        
        # Cap at 1.0
        return min(base_confidence, 1.0)
    
    def _get_context(self, text: str, start: int, end: int, window: int = 30) -> str:
        """Get surrounding context for a skill match"""
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        
        context = text[context_start:context_end]
        
        # Highlight the matched skill
        skill = text[start:end]
        context = context.replace(skill, f"**{skill}**")
        
        return context.strip()
