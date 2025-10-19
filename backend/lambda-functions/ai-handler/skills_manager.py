import boto3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Set, Optional
from decimal import Decimal
import re
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class SkillsManager:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
        
    def extract_skills_from_text(self, text: str) -> List[Dict]:
        """Extract potential skills from job description text"""
        try:
            from skill_extractor import SkillExtractor
            extractor = SkillExtractor()
            return extractor.extract_from_job_description(text)
        except ImportError:
            # Fallback: simple keyword extraction
            import re
            
            # Common technical skills patterns
            tech_skills = [
                'python', 'java', 'javascript', 'sql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
                'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
                'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'kafka', 'spark',
                'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'git', 'jenkins',
                'terraform', 'ansible', 'linux', 'bash', 'powershell', 'api', 'rest', 'graphql'
            ]
            
            found_skills = []
            text_lower = text.lower()
            
            for skill in tech_skills:
                if skill in text_lower:
                    found_skills.append({
                        'skill': skill.title(),
                        'category': 'technical',
                        'confidence': 0.8
                    })
            
            return found_skills
    
    def normalize_skill_name(self, skill: str) -> str:
        """Normalize skill names for consistency"""
        # Remove extra whitespace and convert to title case
        normalized = ' '.join(skill.strip().split())
        
        # Handle common variations
        skill_mappings = {
            'javascript': 'JavaScript',
            'js': 'JavaScript',
            'typescript': 'TypeScript',
            'ts': 'TypeScript',
            'python': 'Python',
            'py': 'Python',
            'java': 'Java',
            'c++': 'C++',
            'cpp': 'C++',
            'c#': 'C#',
            'csharp': 'C#',
            'html': 'HTML',
            'css': 'CSS',
            'sql': 'SQL',
            'mysql': 'MySQL',
            'postgresql': 'PostgreSQL',
            'postgres': 'PostgreSQL',
            'mongodb': 'MongoDB',
            'mongo': 'MongoDB',
            'aws': 'AWS',
            'amazon web services': 'AWS',
            'azure': 'Microsoft Azure',
            'gcp': 'Google Cloud Platform',
            'google cloud': 'Google Cloud Platform',
            'docker': 'Docker',
            'kubernetes': 'Kubernetes',
            'k8s': 'Kubernetes',
            'react': 'React',
            'reactjs': 'React',
            'vue': 'Vue.js',
            'vuejs': 'Vue.js',
            'angular': 'Angular',
            'angularjs': 'Angular',
            'node': 'Node.js',
            'nodejs': 'Node.js',
            'express': 'Express.js',
            'expressjs': 'Express.js',
            'django': 'Django',
            'flask': 'Flask',
            'spring': 'Spring Framework',
            'spring boot': 'Spring Boot',
            'git': 'Git',
            'github': 'GitHub',
            'gitlab': 'GitLab',
            'jenkins': 'Jenkins',
            'ci/cd': 'CI/CD',
            'devops': 'DevOps',
            'agile': 'Agile',
            'scrum': 'Scrum',
            'kanban': 'Kanban',
            'machine learning': 'Machine Learning',
            'ml': 'Machine Learning',
            'artificial intelligence': 'Artificial Intelligence',
            'ai': 'Artificial Intelligence',
            'data science': 'Data Science',
            'big data': 'Big Data',
            'tensorflow': 'TensorFlow',
            'pytorch': 'PyTorch',
            'pandas': 'Pandas',
            'numpy': 'NumPy',
            'scikit-learn': 'Scikit-learn',
            'sklearn': 'Scikit-learn'
        }
        
        normalized_lower = normalized.lower()
        return skill_mappings.get(normalized_lower, normalized)
    
    def check_existing_skills(self, skills: List[str]) -> Dict:
        """Check which skills already exist in database"""
        existing_skills = {}
        new_skills = []
        
        for skill in skills:
            normalized_skill = self.normalize_skill_name(skill)
            skill_name_lower = normalized_skill.lower()
            
            try:
                # Query by skill name using GSI
                response = self.table.query(
                    IndexName='skill-name-index',
                    KeyConditionExpression='skill_name_lower = :skill_name',
                    ExpressionAttributeValues={
                        ':skill_name': skill_name_lower
                    }
                )
                
                if response['Items']:
                    # Skill exists, add to existing skills
                    existing_skills[normalized_skill] = response['Items'][0]
                else:
                    # New skill
                    new_skills.append(normalized_skill)
                    
            except Exception as e:
                logger.error(f"Error checking skill {skill}: {str(e)}")
                new_skills.append(normalized_skill)
        
        return {
            'existing': existing_skills,
            'new': new_skills
        }
    
    def add_new_skills(self, skills: List[Dict]) -> None:
        """Add new skills to the database"""
        try:
            with self.table.batch_writer() as batch:
                for skill_data in skills:
                    skill_id = str(uuid.uuid4())
                    skill_name = skill_data.get('skill_name', '')
                    normalized_name = self.normalize_skill_name(skill_name)
                    
                    item = {
                        'skill_id': skill_id,
                        'skill_name': normalized_name,
                        'skill_name_lower': normalized_name.lower(),
                        'category': skill_data.get('category', 'general'),
                        'frequency': 1,
                        'first_seen': datetime.now().isoformat(),
                        'last_seen': datetime.now().isoformat(),
                        'aliases': skill_data.get('aliases', []),
                        'confidence_score': Decimal(str(skill_data.get('confidence_score', 0.8))),
                        'source': 'job_description',
                        'metadata': skill_data.get('metadata', {})
                    }
                    
                    batch.put_item(Item=item)
                    logger.info(f"Added new skill: {normalized_name}")
                    
        except Exception as e:
            logger.error(f"Error adding new skills: {str(e)}")
            raise
    
    def update_skill_frequency(self, skill_ids: List[str]) -> None:
        """Update frequency count for existing skills"""
        try:
            for skill_id in skill_ids:
                self.table.update_item(
                    Key={'skill_id': skill_id},
                    UpdateExpression='SET frequency = frequency + :inc, last_seen = :timestamp',
                    ExpressionAttributeValues={
                        ':inc': 1,
                        ':timestamp': datetime.now().isoformat()
                    }
                )
                logger.info(f"Updated frequency for skill ID: {skill_id}")
                
        except Exception as e:
            logger.error(f"Error updating skill frequencies: {str(e)}")
            raise
    
    def get_all_skills_by_category(self, category: str = None) -> List[Dict]:
        """Retrieve skills from database, optionally filtered by category"""
        try:
            if category:
                # Query by category using GSI
                response = self.table.query(
                    IndexName='category-index',
                    KeyConditionExpression='category = :category',
                    ExpressionAttributeValues={
                        ':category': category
                    }
                )
            else:
                # Scan all skills
                response = self.table.scan()
            
            skills = response.get('Items', [])
            
            # Sort by frequency (most common first)
            skills.sort(key=lambda x: x.get('frequency', 0), reverse=True)
            
            return skills
            
        except Exception as e:
            logger.error(f"Error retrieving skills: {str(e)}")
            return []
    
    def get_skills_for_optimization(self) -> Dict[str, List[str]]:
        """Get organized skills list for resume optimization"""
        try:
            all_skills = self.get_all_skills_by_category()
            
            organized_skills = {
                'technical': [],
                'soft': [],
                'industry': [],
                'tools': [],
                'frameworks': [],
                'languages': [],
                'certifications': [],
                'general': []
            }
            
            for skill in all_skills:
                category = skill.get('category', 'general')
                skill_name = skill.get('skill_name', '')
                
                if category in organized_skills:
                    organized_skills[category].append(skill_name)
                else:
                    organized_skills['general'].append(skill_name)
            
            return organized_skills
            
        except Exception as e:
            logger.error(f"Error organizing skills: {str(e)}")
            return {
                'technical': [],
                'soft': [],
                'industry': [],
                'tools': [],
                'frameworks': [],
                'languages': [],
                'certifications': [],
                'general': []
            }
    
    def process_extracted_skills(self, extracted_skills: List[Dict]) -> Dict:
        """Main method to process skills from job description"""
        try:
            # Extract skill names
            skill_names = [skill['skill_name'] for skill in extracted_skills]
            
            # Check existing vs new skills
            skill_check = self.check_existing_skills(skill_names)
            
            # Update frequency for existing skills
            existing_skill_ids = [
                skill['skill_id'] for skill in skill_check['existing'].values()
            ]
            if existing_skill_ids:
                self.update_skill_frequency(existing_skill_ids)
            
            # Add new skills
            new_skills_data = []
            for skill_name in skill_check['new']:
                # Find the original skill data
                original_skill = next(
                    (s for s in extracted_skills if self.normalize_skill_name(s['skill_name']) == skill_name),
                    {'skill_name': skill_name, 'category': 'general'}
                )
                new_skills_data.append(original_skill)
            
            if new_skills_data:
                self.add_new_skills(new_skills_data)
            
            return {
                'existing_skills_updated': len(existing_skill_ids),
                'new_skills_added': len(new_skills_data),
                'total_skills_processed': len(skill_names)
            }
            
        except Exception as e:
            logger.error(f"Error processing extracted skills: {str(e)}")
            return {
                'existing_skills_updated': 0,
                'new_skills_added': 0,
                'total_skills_processed': 0,
                'error': str(e)
            }
    
    def seed_initial_skills(self) -> None:
        """Seed the database with common initial skills"""
        initial_skills = [
            # Programming Languages
            {'skill_name': 'Python', 'category': 'languages', 'aliases': ['py', 'python3']},
            {'skill_name': 'JavaScript', 'category': 'languages', 'aliases': ['js', 'javascript']},
            {'skill_name': 'Java', 'category': 'languages', 'aliases': ['java']},
            {'skill_name': 'TypeScript', 'category': 'languages', 'aliases': ['ts', 'typescript']},
            {'skill_name': 'C++', 'category': 'languages', 'aliases': ['cpp', 'c++']},
            {'skill_name': 'C#', 'category': 'languages', 'aliases': ['csharp', 'c#']},
            {'skill_name': 'Go', 'category': 'languages', 'aliases': ['golang', 'go']},
            {'skill_name': 'Rust', 'category': 'languages', 'aliases': ['rust']},
            {'skill_name': 'PHP', 'category': 'languages', 'aliases': ['php']},
            {'skill_name': 'Ruby', 'category': 'languages', 'aliases': ['ruby']},
            
            # Web Technologies
            {'skill_name': 'HTML', 'category': 'technical', 'aliases': ['html', 'html5']},
            {'skill_name': 'CSS', 'category': 'technical', 'aliases': ['css', 'css3']},
            {'skill_name': 'React', 'category': 'frameworks', 'aliases': ['reactjs', 'react.js']},
            {'skill_name': 'Vue.js', 'category': 'frameworks', 'aliases': ['vue', 'vuejs']},
            {'skill_name': 'Angular', 'category': 'frameworks', 'aliases': ['angular', 'angularjs']},
            {'skill_name': 'Node.js', 'category': 'frameworks', 'aliases': ['node', 'nodejs']},
            {'skill_name': 'Express.js', 'category': 'frameworks', 'aliases': ['express', 'expressjs']},
            
            # Cloud Platforms
            {'skill_name': 'AWS', 'category': 'technical', 'aliases': ['amazon web services', 'aws']},
            {'skill_name': 'Microsoft Azure', 'category': 'technical', 'aliases': ['azure', 'microsoft azure']},
            {'skill_name': 'Google Cloud Platform', 'category': 'technical', 'aliases': ['gcp', 'google cloud']},
            
            # Databases
            {'skill_name': 'SQL', 'category': 'technical', 'aliases': ['sql']},
            {'skill_name': 'MySQL', 'category': 'technical', 'aliases': ['mysql']},
            {'skill_name': 'PostgreSQL', 'category': 'technical', 'aliases': ['postgres', 'postgresql']},
            {'skill_name': 'MongoDB', 'category': 'technical', 'aliases': ['mongo', 'mongodb']},
            {'skill_name': 'Redis', 'category': 'technical', 'aliases': ['redis']},
            
            # DevOps & Tools
            {'skill_name': 'Docker', 'category': 'tools', 'aliases': ['docker']},
            {'skill_name': 'Kubernetes', 'category': 'tools', 'aliases': ['k8s', 'kubernetes']},
            {'skill_name': 'Git', 'category': 'tools', 'aliases': ['git']},
            {'skill_name': 'Jenkins', 'category': 'tools', 'aliases': ['jenkins']},
            {'skill_name': 'CI/CD', 'category': 'technical', 'aliases': ['ci/cd', 'continuous integration']},
            
            # Soft Skills
            {'skill_name': 'Leadership', 'category': 'soft', 'aliases': ['leadership', 'team leadership']},
            {'skill_name': 'Communication', 'category': 'soft', 'aliases': ['communication', 'verbal communication']},
            {'skill_name': 'Problem Solving', 'category': 'soft', 'aliases': ['problem solving', 'analytical thinking']},
            {'skill_name': 'Team Collaboration', 'category': 'soft', 'aliases': ['teamwork', 'collaboration']},
            {'skill_name': 'Project Management', 'category': 'soft', 'aliases': ['project management', 'pm']},
            
            # Methodologies
            {'skill_name': 'Agile', 'category': 'industry', 'aliases': ['agile', 'agile methodology']},
            {'skill_name': 'Scrum', 'category': 'industry', 'aliases': ['scrum']},
            {'skill_name': 'DevOps', 'category': 'industry', 'aliases': ['devops']},
            
            # Data Science & AI
            {'skill_name': 'Machine Learning', 'category': 'technical', 'aliases': ['ml', 'machine learning']},
            {'skill_name': 'Artificial Intelligence', 'category': 'technical', 'aliases': ['ai', 'artificial intelligence']},
            {'skill_name': 'Data Science', 'category': 'technical', 'aliases': ['data science']},
            {'skill_name': 'TensorFlow', 'category': 'frameworks', 'aliases': ['tensorflow']},
            {'skill_name': 'PyTorch', 'category': 'frameworks', 'aliases': ['pytorch']},
            {'skill_name': 'Pandas', 'category': 'tools', 'aliases': ['pandas']},
            {'skill_name': 'NumPy', 'category': 'tools', 'aliases': ['numpy']},
        ]
        
        try:
            logger.info("Seeding initial skills...")
            self.add_new_skills(initial_skills)
            logger.info(f"Successfully seeded {len(initial_skills)} initial skills")
        except Exception as e:
            logger.error(f"Error seeding initial skills: {str(e)}")
