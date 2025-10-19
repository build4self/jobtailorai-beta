import json
import boto3
import os
import uuid
import tempfile
import subprocess
import base64
import sys
import urllib.parse
import datetime
from datetime import datetime
from dateutil import parser as date_parser
from rtf_word_generator import create_rtf_word_resume
from prompt_template import get_resume_optimization_prompt
from skills_manager import SkillsManager

# Force complete reload of pdf_generator module
import importlib
import sys

def force_pdf_generator_reload():
    """Aggressively reload pdf_generator module"""
    module_name = 'pdf_generator'
    
    # Remove from sys.modules completely
    if module_name in sys.modules:
        del sys.modules[module_name]
        print(f"✅ Removed {module_name} from sys.modules")
    
    # Import fresh
    try:
        import pdf_generator
        print("✅ PDF generator imported successfully after cache clear")
        return pdf_generator
    except Exception as e:
        print(f"❌ PDF generator import failed: {e}")
        return None

# Execute the reload
pdf_generator = force_pdf_generator_reload()

def fix_common_json_issues(json_text):
    """Fix common JSON formatting issues that AI models sometimes produce"""
    if not json_text:
        return json_text
    
    import re
    
    # Fix trailing commas before closing braces/brackets
    json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
    
    # Fix common escape sequence issues
    json_text = json_text.replace('\\"', '"')  # Remove double escaping
    
    # Fix newlines and tabs in strings (but preserve them as escaped sequences)
    # This is more conservative - we don't want to break valid JSON
    
    # Remove any markdown code block markers
    json_text = re.sub(r'```json\s*', '', json_text)
    json_text = re.sub(r'```\s*$', '', json_text)
    
    # Fix control characters
    json_text = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', json_text)  # Replace control characters with spaces
    
    # Remove any leading/trailing whitespace
    json_text = json_text.strip()
    
    return json_text

def fix_malformed_json_aggressive(json_text):
    """Aggressively attempt to fix malformed JSON"""
    import re
    
    # Remove any text before the first {
    start_idx = json_text.find('{')
    if start_idx > 0:
        json_text = json_text[start_idx:]
    
    # Remove any text after the last }
    end_idx = json_text.rfind('}')
    if end_idx > 0:
        json_text = json_text[:end_idx + 1]
    
    # Fix control characters and invalid escape sequences
    json_text = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', json_text)  # Replace control characters with spaces
    
    # Fix unterminated strings by finding unmatched quotes
    lines = json_text.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Count quotes in the line (excluding escaped quotes)
        quote_count = len(re.findall(r'(?<!\\)"', line))
        
        # If odd number of quotes, the string is likely unterminated
        if quote_count % 2 == 1:
            # Find the last quote and see if we need to close the string
            last_quote_idx = line.rfind('"')
            if last_quote_idx > 0:
                # Check if this looks like an unterminated string value
                before_quote = line[:last_quote_idx]
                after_quote = line[last_quote_idx + 1:]
                
                # If there's content after the quote that looks like it should be in the string
                if after_quote.strip() and not after_quote.strip().startswith(',') and not after_quote.strip().startswith('}'):
                    # Move the content inside the string and close it
                    content_after = after_quote.rstrip().rstrip(',')
                    if line.rstrip().endswith(','):
                        line = before_quote + '"' + content_after + '",'
                    else:
                        line = before_quote + '"' + content_after + '"'
                else:
                    # Just close the string
                    if line.rstrip().endswith(','):
                        line = line.rstrip()[:-1] + '",'
                    else:
                        line = line.rstrip() + '"'
        
        fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

def extract_job_data_from_url(job_url):
    """
    Extract job data from URL using the job-url-extractor Lambda function.
    
    Args:
        job_url (str): The job posting URL
    
    Returns:
        dict: Extracted job data or None if extraction fails
    """
    try:
        print(f"Extracting job data from URL: {job_url}")
        
        # Get the job URL extractor function name from environment
        job_extractor_function = os.environ.get('JOB_URL_EXTRACTOR_FUNCTION')
        if not job_extractor_function:
            print("Error: JOB_URL_EXTRACTOR_FUNCTION environment variable not set")
            return None
        
        print(f"Using job extractor function: {job_extractor_function}")
        
        # Prepare payload for job URL extractor
        extractor_payload = {
            'jobUrl': job_url
        }
        
        print(f"Calling job extractor with payload: {extractor_payload}")
        
        # Invoke job URL extractor Lambda function
        lambda_client = boto3.client('lambda')
        response = lambda_client.invoke(
            FunctionName=job_extractor_function,
            InvocationType='RequestResponse',  # Synchronous call
            Payload=json.dumps(extractor_payload)
        )
        
        print(f"Lambda invoke response status: {response.get('StatusCode')}")
        
        # Read the response payload
        response_payload_raw = response['Payload'].read()
        print(f"Raw response payload (first 500 chars): {response_payload_raw[:500]}")
        
        # Try to parse as JSON
        try:
            response_payload = json.loads(response_payload_raw)
            print(f"Parsed job extractor response: {response_payload}")
        except json.JSONDecodeError as json_error:
            print(f"Failed to parse response as JSON: {json_error}")
            print(f"Response appears to be HTML or other format")
            return None
        
        if response_payload.get('success') and response_payload.get('data'):
            job_data = response_payload['data']
            print(f"Successfully extracted job data: {job_data.keys()}")
            return job_data
        else:
            error_msg = response_payload.get('error', 'Unknown error')
            print(f"Job extraction failed: {error_msg}")
            return None
            
    except Exception as e:
        print(f"Error calling job URL extractor: {str(e)}")
        print(f"Exception type: {type(e).__name__}")
        return None

def create_ats_resume_word_document(resume_json):
    """
    Create an ATS-friendly Word document from resume JSON data.
    Optimized for professional formatting and minimal page count.
    
    Args:
        resume_json (dict): Resume data in JSON format
    
    Returns:
        io.BytesIO: Word document buffer
    """
    import io
    import zipfile
    from datetime import datetime
    
    def escape_xml(text):
        """Escape XML special characters."""
        if not text:
            return ""
        return (text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace('"', "&quot;")
                   .replace("'", "&apos;"))
    
    def create_resume_document_xml(resume_data):
        """Create document.xml for ATS-friendly professional resume."""
        paragraphs_xml = ""
        
        # Header - Name (Arial 14, Bold, Centered)
        if resume_data.get('full_name'):
            name = escape_xml(resume_data['full_name'])
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="80"/>
                <w:spacing w:before="0"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="28"/>
                    <w:b/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{name}</w:t>
            </w:r>
        </w:p>'''
        
        # Contact Information (Centered, Arial 10)
        if resume_data.get('contact_info'):
            contact = escape_xml(resume_data['contact_info'])
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="160"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{contact}</w:t>
            </w:r>
        </w:p>'''
        
        # Horizontal line separator
        paragraphs_xml += '''
        <w:p>
            <w:pPr>
                <w:spacing w:after="120"/>
                <w:pBdr>
                    <w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/>
                </w:pBdr>
            </w:pPr>
        </w:p>'''
        
        # Professional Summary Section
        if resume_data.get('professional_summary'):
            # Section Header with underline (Arial 11, Light Blue)
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="80"/>
                <w:spacing w:before="0"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="22"/>
                    <w:b/>
                    <w:color w:val="4472C4"/>
                    <w:u w:val="single"/>
                </w:rPr>
                <w:t>PROFESSIONAL SUMMARY</w:t>
            </w:r>
        </w:p>'''
            
            # Summary Content with left alignment to prevent word spacing issues
            summary = escape_xml(resume_data['professional_summary'])
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="160"/>
                <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{summary}</w:t>
            </w:r>
        </w:p>'''
        
        # Core Competencies/Skills Section
        if resume_data.get('skills'):
            # Section Header with underline (Arial 11, Light Blue)
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="80"/>
                <w:spacing w:before="0"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="22"/>
                    <w:b/>
                    <w:color w:val="4472C4"/>
                    <w:u w:val="single"/>
                </w:rPr>
                <w:t>CORE COMPETENCIES</w:t>
            </w:r>
        </w:p>'''
            
            # Skills in a more professional table-like format (Arial 10)
            skills = resume_data['skills']
            if isinstance(skills, list):
                # Create a single paragraph with all skills separated by bullets
                all_skills = " • ".join([escape_xml(skill) for skill in skills])
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="160"/>
                <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{all_skills}</w:t>
            </w:r>
        </w:p>'''
        
        # Professional Experience Section
        if resume_data.get('experience'):
            # Section Header with underline (Arial 11, Light Blue)
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="80"/>
                <w:spacing w:before="0"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="22"/>
                    <w:b/>
                    <w:color w:val="4472C4"/>
                    <w:u w:val="single"/>
                </w:rPr>
                <w:t>PROFESSIONAL EXPERIENCE</w:t>
            </w:r>
        </w:p>'''
            
            for i, exp in enumerate(resume_data['experience']):
                # Extract data
                title = escape_xml(exp.get('title', ''))
                company = escape_xml(exp.get('company', ''))
                raw_dates = exp.get('dates', '')
                achievements = exp.get('achievements', [])
                
                # Enhanced date formatting - expand abbreviated years while keeping month names
                # Do this BEFORE XML escaping to avoid issues with apostrophes
                formatted_dates = raw_dates
                if raw_dates and raw_dates != 'Dates':
                    import re
                    # Handle abbreviated years with apostrophe, keeping month names
                    # "Dec '20 — Present" -> "Dec 2020 — Present"
                    # "Jun '15 — Dec '20" -> "Jun 2015 — Dec 2020"
                    # "Feb '13 — Jul '14" -> "Feb 2013 — Jul 2014"
                    # Convert abbreviated years like "Dec '20" to "Dec 2020"
                    formatted_dates = re.sub(r"([A-Za-z]{3,9})\s+'(\d{2})", lambda m: f"{m.group(1)} {'20' + m.group(2) if int(m.group(2)) <= 30 else '19' + m.group(2)}", raw_dates)
                
                # Now escape the formatted dates for XML
                dates = escape_xml(formatted_dates)
                
                # Only add page breaks in very specific cases to prevent orphaning
                # Don't add automatic page breaks - let Word handle natural flow
                # Only use keep-together properties to prevent splitting sections
                page_break_props = ""
                
                # Company name and dates on same line with professional formatting
                # Add minimal keep-together properties to prevent orphaning
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="0"/>
                <w:tabs>
                    <w:tab w:val="right" w:pos="8640"/>
                </w:tabs>
                {page_break_props}
                <w:keepNext/>
                <w:widowControl/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="22"/>
                    <w:b/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{company}</w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:tab/>
                <w:t>{dates}</w:t>
            </w:r>
        </w:p>'''
                
                # Job title (italic, Arial 10) - reduced spacing with minimal keep-together
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="20"/>
                <w:keepNext/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:i/>
                    <w:color w:val="333333"/>
                </w:rPr>
                <w:t>{title}</w:t>
            </w:r>
        </w:p>'''
                
                # Achievements with minimal spacing between bullets and keep-together properties
                if achievements:
                    for j, achievement in enumerate(achievements):
                        achievement_text = escape_xml(achievement)
                        # Add very small spacing after each bullet except the last one
                        spacing_after = "20" if j < len(achievements) - 1 else "0"
                        
                        # Only prevent orphaning of first achievement, don't force all together
                        keep_props = ""
                        if j == 0:
                            keep_props = "<w:widowControl/>"
                        
                        paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="{spacing_after}" w:line="220" w:lineRule="auto"/>
                <w:ind w:left="360" w:hanging="180"/>
                <w:jc w:val="left"/>
                {keep_props}
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>• {achievement_text}</w:t>
            </w:r>
        </w:p>'''
                
                # Minimal spacing between companies (only if not last company)
                if i < len(resume_data['experience']) - 1:
                    paragraphs_xml += '''
        <w:p>
            <w:pPr>
                <w:spacing w:after="40"/>
            </w:pPr>
        </w:p>'''
        
        # Education Section
        if resume_data.get('education'):
            # Section Header with underline (Arial 11, Light Blue)
            paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="80"/>
                <w:spacing w:before="160"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="22"/>
                    <w:b/>
                    <w:color w:val="4472C4"/>
                    <w:u w:val="single"/>
                </w:rPr>
                <w:t>EDUCATION</w:t>
            </w:r>
        </w:p>'''
            
            for edu in resume_data['education']:
                degree = escape_xml(edu.get('degree', ''))
                institution = escape_xml(edu.get('institution', ''))
                dates = escape_xml(edu.get('dates', ''))
                
                # Degree and dates on same line with tab alignment (Arial 11 for degree)
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="40"/>
                <w:tabs>
                    <w:tab w:val="right" w:pos="8640"/>
                </w:tabs>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="22"/>
                    <w:b/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{degree}</w:t>
            </w:r>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:tab/>
                <w:t>{dates}</w:t>
            </w:r>
        </w:p>'''
                
                # Institution name (italic, Arial 10)
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="80"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:i/>
                    <w:color w:val="333333"/>
                </w:rPr>
                <w:t>{institution}</w:t>
            </w:r>
        </w:p>'''
                
                if edu.get('details'):
                    details = escape_xml(edu['details'])
                    paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="120"/>
                <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
                    <w:sz w:val="20"/>
                    <w:color w:val="000000"/>
                </w:rPr>
                <w:t>{details}</w:t>
            </w:r>
        </w:p>'''
        
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        {paragraphs_xml}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
            <w:cols w:space="720"/>
        </w:sectPr>
    </w:body>
</w:document>'''
    
    def get_content_types_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>'''
    
    def get_rels_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''
    
    def get_document_rels_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''
    
    def get_styles_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
        <w:rPrDefault>
            <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="22"/>
            </w:rPr>
        </w:rPrDefault>
    </w:docDefaults>
</w:styles>'''
    
    def get_app_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
    <Application>JobTailorAI</Application>
    <DocSecurity>0</DocSecurity>
    <ScaleCrop>false</ScaleCrop>
    <SharedDoc>false</SharedDoc>
    <HyperlinksChanged>false</HyperlinksChanged>
    <AppVersion>1.0</AppVersion>
</Properties>'''
    
    def get_core_xml():
        now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>Professional Resume</dc:title>
    <dc:creator>JobTailorAI</dc:creator>
    <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''
    
    try:
        # Create the document XML content
        document_xml = create_resume_document_xml(resume_json)
        
        # Create the .docx file structure
        docx_buffer = io.BytesIO()
        
        with zipfile.ZipFile(docx_buffer, 'w', zipfile.ZIP_DEFLATED) as docx:
            # Add required files for a valid .docx
            docx.writestr('[Content_Types].xml', get_content_types_xml())
            docx.writestr('_rels/.rels', get_rels_xml())
            docx.writestr('word/_rels/document.xml.rels', get_document_rels_xml())
            docx.writestr('word/document.xml', document_xml)
            docx.writestr('word/styles.xml', get_styles_xml())
            docx.writestr('docProps/app.xml', get_app_xml())
            docx.writestr('docProps/core.xml', get_core_xml())
        
        docx_buffer.seek(0)
        return docx_buffer
        
    except Exception as e:
        print(f"Error creating ATS resume Word document: {str(e)}")
        raise e

def convert_word_to_pdf(word_content, resume_json=None):
    """
    Convert Word document content to PDF format.
    This function attempts multiple conversion methods.
    """
    try:
        print("Attempting Word to PDF conversion...")
        
        # Method 1: Try using LibreOffice (if available in Lambda layer)
        try:
            import subprocess
            import tempfile
            import os
            
            print("Trying LibreOffice conversion...")
            
            # Check if LibreOffice is available
            libreoffice_paths = [
                '/opt/libreoffice/program/soffice',  # Common Lambda layer path
                '/usr/bin/libreoffice',              # Standard Linux path
                'libreoffice'                        # PATH lookup
            ]
            
            libreoffice_cmd = None
            for path in libreoffice_paths:
                try:
                    result = subprocess.run([path, '--version'], capture_output=True, timeout=5)
                    if result.returncode == 0:
                        libreoffice_cmd = path
                        print(f"Found LibreOffice at: {path}")
                        break
                except:
                    continue
            
            if not libreoffice_cmd:
                raise Exception("LibreOffice not found in Lambda environment")
            
            # Create temporary files
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as word_file:
                word_file.write(word_content)
                word_file_path = word_file.name
            
            # Output PDF path
            pdf_file_path = word_file_path.replace('.docx', '.pdf')
            
            # Try LibreOffice conversion
            result = subprocess.run([
                libreoffice_cmd, '--headless', '--convert-to', 'pdf',
                '--outdir', os.path.dirname(pdf_file_path),
                word_file_path
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and os.path.exists(pdf_file_path):
                with open(pdf_file_path, 'rb') as pdf_file:
                    pdf_content = pdf_file.read()
                
                # Clean up temporary files
                os.unlink(word_file_path)
                os.unlink(pdf_file_path)
                
                print("LibreOffice conversion successful!")
                return pdf_content
            else:
                print(f"LibreOffice conversion failed: {result.stderr}")
                os.unlink(word_file_path)
                
        except Exception as libreoffice_error:
            print(f"LibreOffice conversion error: {str(libreoffice_error)}")
        
        # Method 2: Try using python-docx2pdf (if available)
        try:
            print("Trying python-docx2pdf conversion...")
            import tempfile
            import os
            
            # Install docx2pdf if not available
            try:
                from docx2pdf import convert
            except ImportError:
                print("Installing docx2pdf...")
                subprocess.check_call(['pip', 'install', 'docx2pdf', '-t', '/tmp'])
                sys.path.append('/tmp')
                from docx2pdf import convert
            
            # Create temporary files
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as word_file:
                word_file.write(word_content)
                word_file_path = word_file.name
            
            pdf_file_path = word_file_path.replace('.docx', '.pdf')
            
            # Convert using docx2pdf
            convert(word_file_path, pdf_file_path)
            
            if os.path.exists(pdf_file_path):
                with open(pdf_file_path, 'rb') as pdf_file:
                    pdf_content = pdf_file.read()
                
                # Clean up
                os.unlink(word_file_path)
                os.unlink(pdf_file_path)
                
                print("docx2pdf conversion successful!")
                return pdf_content
            
        except Exception as docx2pdf_error:
            print(f"docx2pdf conversion error: {str(docx2pdf_error)}")
        
        # Method 3: Use HTML conversion approach
        try:
            print("Trying HTML-based conversion...")
            
            # Convert Word document structure to HTML
            html_content = convert_word_to_html(word_content)
            
            # Convert HTML to PDF using weasyprint or similar
            pdf_content = convert_html_to_pdf(html_content)
            
            if pdf_content:
                print("HTML-based conversion successful!")
                return pdf_content
                
        except Exception as html_error:
            print(f"HTML conversion error: {str(html_error)}")
        
        # Method 4: Create enhanced PDF using Word document data
        print("Creating enhanced PDF using Word document structure...")
        
        try:
            # Use the passed resume_json to create a high-quality PDF
            if resume_json:
                from pdf_generator import create_enhanced_pdf_from_word_structure
                pdf_content = create_enhanced_pdf_from_word_structure(resume_json)
                print("Created enhanced PDF matching Word document formatting")
                return pdf_content
            else:
                print("Resume JSON not available, using standard PDF generator")
                from pdf_generator import create_pdf_resume_matching_word
                pdf_content = create_pdf_resume_matching_word(resume_json)
                return pdf_content
                
        except Exception as pdf_error:
            print(f"Enhanced PDF creation failed: {str(pdf_error)}")
            
            # Try the standard PDF generator
            try:
                from pdf_generator import create_pdf_resume_matching_word
                pdf_content = create_pdf_resume_matching_word(resume_json)
                print("Created PDF using standard generator")
                return pdf_content
            except Exception as standard_error:
                print(f"Standard PDF creation also failed: {str(standard_error)}")
        
        # Final fallback - create a professional notice
        print("Creating professional PDF notice...")
        
        notice_content = {
            "full_name": "PDF Generation Notice",
            "contact_info": "JobTailorAI Professional Resume Service",
            "professional_summary": "Your resume has been successfully generated with professional formatting. For the best experience with light blue headings, perfect spacing, and optimal layout, please download the Word version. The PDF version provides the same content with standard formatting.",
            "skills": ["Professional Resume Formatting", "ATS Optimization", "Word Document Generation", "PDF Compatibility"],
            "experience": [{
                "title": "Resume Generation Status",
                "company": "JobTailorAI",
                "dates": "Current",
                "achievements": [
                    "Successfully generated your professional resume with all content preserved",
                    "Word document includes light blue headings and perfect formatting",
                    "PDF version provides standard formatting for universal compatibility",
                    "Both formats maintain professional structure and ATS optimization"
                ]
            }],
            "education": [{
                "degree": "Professional Resume Service",
                "institution": "JobTailorAI Platform",
                "dates": "2024",
                "details": "Providing high-quality resume generation with multiple format options"
            }]
        }
        
        from pdf_generator import create_pdf_resume_matching_word
        return create_pdf_resume_matching_word(notice_content)
        
    except Exception as e:
        print(f"Word to PDF conversion failed completely: {str(e)}")
        # Final fallback
        from pdf_generator import create_minimal_pdf
        return create_minimal_pdf(f"PDF conversion error: {str(e)}")

def convert_word_to_html(word_content):
    """
    Convert Word document to HTML for PDF conversion.
    This extracts the structure and applies similar styling.
    """
    # This is a simplified approach - in production you'd use a proper Word-to-HTML converter
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; margin: 0.5in; }
            .name { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 10pt; }
            .contact { font-size: 10pt; text-align: center; margin-bottom: 20pt; }
            .section-header { font-size: 11pt; font-weight: bold; color: #4472C4; text-decoration: underline; margin-top: 15pt; margin-bottom: 8pt; }
            .job-title { font-size: 11pt; font-weight: bold; margin-top: 10pt; }
            .company { font-size: 10pt; font-style: italic; color: #333; margin-bottom: 5pt; }
            .bullet { font-size: 10pt; margin: 0; padding: 0; }
            .dates { float: right; font-size: 10pt; }
        </style>
    </head>
    <body>
        <div class="name">RESUME CONTENT</div>
        <div class="contact">Professional formatting preserved</div>
        <div class="section-header">PROFESSIONAL SUMMARY</div>
        <p>Your professionally formatted resume content...</p>
    </body>
    </html>
    """
    return html

def convert_html_to_pdf(html_content):
    """
    Convert HTML to PDF using available libraries.
    """
    try:
        # Try weasyprint
        try:
            subprocess.check_call(['pip', 'install', 'weasyprint', '-t', '/tmp'])
            sys.path.append('/tmp')
            from weasyprint import HTML
            
            pdf_bytes = HTML(string=html_content).write_pdf()
            return pdf_bytes
            
        except Exception as weasy_error:
            print(f"WeasyPrint failed: {str(weasy_error)}")
        
        # Try pdfkit
        try:
            subprocess.check_call(['pip', 'install', 'pdfkit', '-t', '/tmp'])
            sys.path.append('/tmp')
            import pdfkit
            
            pdf_bytes = pdfkit.from_string(html_content, False)
            return pdf_bytes
            
        except Exception as pdfkit_error:
            print(f"PDFKit failed: {str(pdfkit_error)}")
        
        return None
        
    except Exception as e:
        print(f"HTML to PDF conversion failed: {str(e)}")
        return None

def create_cover_letter_word_document(cover_letter_text):
    """
    Create a Word document from cover letter text using minimal approach.
    
    Args:
        cover_letter_text (str): The cover letter content
    
    Returns:
        io.BytesIO: Word document buffer
    """
    import io
    import zipfile
    import xml.etree.ElementTree as ET
    from datetime import datetime
    
    def escape_xml(text):
        """Escape XML special characters."""
        if not text:
            return ""
        return (text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace('"', "&quot;")
                   .replace("'", "&apos;"))
    
    def create_cover_letter_document_xml(text):
        """Create document.xml for cover letter with simple format."""
        # Clean and format the text properly
        if '\n' not in text and ('Dear ' in text or 'Hiring Manager' in text):
            print("Word generator: Detected cover letter format - adding proper line breaks")
            # Split on double spaces which indicate paragraph breaks
            text = text.replace('  ', '\n')
            # Clean up any triple+ spaces that might create empty lines
            while '\n\n\n' in text:
                text = text.replace('\n\n\n', '\n\n')
        
        # Split text into paragraphs
        paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
        print(f"Word generator: Found {len(paragraphs)} paragraphs after formatting")
        
        # Build paragraphs XML with simple format structure
        paragraphs_xml = ""
        for i, para in enumerate(paragraphs):
            if not para:
                continue
                
            if i == 0:  # TITLE (CENTER ALIGNED) 14 font
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="120"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="28"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif i == 1:  # contact details (center aligned) font 12
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="24"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif any(month in para for month in ['January', 'February', 'March', 'April', 'May', 'June', 
                                               'July', 'August', 'September', 'October', 'November', 'December']):  # Date
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif ('LLC' in para or 'Inc' in para or 'Corp' in para or 'Company' in para) and ('Drive' in para or 'Street' in para or 'Ave' in para or 'Road' in para or 'TX' in para or 'CA' in para or 'NY' in para):  # Company address
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif para.startswith('Dear'):  # Dear Hiring Manager,
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif para.startswith('Thank you'):  # Thank you line
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif para.startswith('Regards') or para.startswith('Sincerely'):  # regards,
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            elif i == len(paragraphs) - 1:  # signature (last line)
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="0"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
            else:  # Regular paragraphs
                paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:after="240"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                </w:rPr>
                <w:t>{escape_xml(para)}</w:t>
            </w:r>
        </w:p>'''
        
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        {paragraphs_xml}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="576" w:right="576" w:bottom="576" w:left="576"/>
        </w:sectPr>
    </w:body>
</w:document>'''
    
    def get_content_types_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>'''
    
    def get_rels_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''
    
    def get_document_rels_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''
    
    def get_styles_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
        <w:rPrDefault>
            <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="22"/>
            </w:rPr>
        </w:rPrDefault>
    </w:docDefaults>
</w:styles>'''
    
    def get_app_xml():
        return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
    <Application>JobTailorAI</Application>
    <DocSecurity>0</DocSecurity>
    <ScaleCrop>false</ScaleCrop>
    <SharedDoc>false</SharedDoc>
    <HyperlinksChanged>false</HyperlinksChanged>
    <AppVersion>1.0</AppVersion>
</Properties>'''
    
    def get_core_xml():
        now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>Cover Letter</dc:title>
    <dc:creator>JobTailorAI</dc:creator>
    <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''
    
    try:
        # Create the document XML content
        document_xml = create_cover_letter_document_xml(cover_letter_text)
        
        # Create the .docx file structure
        docx_buffer = io.BytesIO()
        
        with zipfile.ZipFile(docx_buffer, 'w', zipfile.ZIP_DEFLATED) as docx:
            # Add required files for a valid .docx
            docx.writestr('[Content_Types].xml', get_content_types_xml())
            docx.writestr('_rels/.rels', get_rels_xml())
            docx.writestr('word/_rels/document.xml.rels', get_document_rels_xml())
            docx.writestr('word/document.xml', document_xml)
            docx.writestr('word/styles.xml', get_styles_xml())
            docx.writestr('docProps/app.xml', get_app_xml())
            docx.writestr('docProps/core.xml', get_core_xml())
        
        docx_buffer.seek(0)
        return docx_buffer
        
    except Exception as e:
        print(f"Error creating cover letter Word document: {str(e)}")
        raise e

# AI Model Configuration - Models are tried in order of preference
# DeepSeek R1 as primary model for advanced reasoning and resume optimization
AI_MODELS = [
    {
        'id': 'us.deepseek.r1-v1:0',
        'name': 'DeepSeek R1',
        'max_tokens': 4000,
        'cost_tier': 1,
        'cost_per_1m_input': 0.55,
        'cost_per_1m_output': 2.19,
        'description': 'Primary model - DeepSeek R1 for advanced reasoning and resume optimization'
    },
    {
        'id': 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        'name': 'Claude 3.5 Sonnet',
        'max_tokens': 4000,
        'cost_tier': 2,
        'cost_per_1m_input': 3.00,
        'cost_per_1m_output': 15.00,
        'description': 'Fallback model - latest Claude with excellent intelligence and performance for resume optimization'
    },
    {
        'id': 'anthropic.claude-3-haiku-20240307-v1:0',
        'name': 'Claude 3 Haiku',
        'max_tokens': 4000,
        'cost_tier': 3,
        'cost_per_1m_input': 0.25,
        'cost_per_1m_output': 1.25,
        'description': 'Budget fallback - Fast, efficient Claude model - excellent value fallback'
    }
]

# AWS service clients
s3 = boto3.client('s3')
bedrock_runtime = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')
bucket_name = os.environ.get('STORAGE_BUCKET')
table_name = os.environ.get('USER_HISTORY_TABLE')
skills_table_name = os.environ.get('SKILLS_TABLE')

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
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Credentials': 'true'
    }

def update_job_status(bucket, status_key, status, message, data=None):
    """Update the job status in S3"""
    try:
        status_data = {
            'status': status,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add any additional data
        if data:
            status_data.update(data)
            
        s3.put_object(
            Bucket=bucket,
            Key=status_key,
            Body=json.dumps(status_data).encode('utf-8'),
            ContentType='application/json'
        )
        print(f"Updated job status to {status}: {message}")
    except Exception as e:
        print(f"Error updating job status: {str(e)}")

# Function to extract text from PDF
def clean_ocr_text(text):
    """
    Clean common OCR errors in extracted text.
    """
    if not text:
        return text
    
    # Common OCR word fixes for educational and professional terms
    word_fixes = {
        'Informa9on': 'Information',
        'Informa0on': 'Information',
        'Informati0n': 'Information',
        'Ins0tute': 'Institute',
        'Ins1tute': 'Institute',
        'Institu1e': 'Institute',
        'Ins9tute': 'Institute',
        'Techno1ogy': 'Technology',
        'Techno10gy': 'Technology',
        'Technol0gy': 'Technology',
        'Universi1y': 'University',
        'Universi9y': 'University',
        'Univer5ity': 'University',
        'Compu1er': 'Computer',
        'Compu9er': 'Computer',
        'Compu0er': 'Computer',
        'Sc1ence': 'Science',
        'Sc9ence': 'Science',
        'Sci3nce': 'Science',
        'Eng1neering': 'Engineering',
        'Eng9neering': 'Engineering',
        'Engineer1ng': 'Engineering',
        'Managemen1': 'Management',
        'Managemen9': 'Management',
        'Manage0ent': 'Management',
        'Deve1opment': 'Development',
        'Deve10pment': 'Development',
        'Develop0ent': 'Development',
        'Sof1ware': 'Software',
        'Sof9ware': 'Software',
        'So1tware': 'Software',
        'Projec1': 'Project',
        'Projec9': 'Project',
        'Proj3ct': 'Project',
        'Sys1em': 'System',
        'Sys9em': 'System',
        'Sy5tem': 'System',
        'Sys1ems': 'Systems',
        'Sys9ems': 'Systems',
        'Sy5tems': 'Systems',
        'Applica1ion': 'Application',
        'Applica9ion': 'Application',
        'Applicati0n': 'Application',
        'Applica1ions': 'Applications',
        'Applica9ions': 'Applications',
        'Applicati0ns': 'Applications',
        'Busin3ss': 'Business',
        'Busine5s': 'Business',
        'Busines5': 'Business',
        'Analys1s': 'Analysis',
        'Analys9s': 'Analysis',
        'Analy5is': 'Analysis',
        'Marke1ing': 'Marketing',
        'Marke9ing': 'Marketing',
        'Market1ng': 'Marketing',
        'Oper4tions': 'Operations',
        'Opera1ions': 'Operations',
        'Opera9ions': 'Operations',
        'Administra1ion': 'Administration',
        'Administra9ion': 'Administration',
        'Administrati0n': 'Administration',
        'Organiza1ion': 'Organization',
        'Organiza9ion': 'Organization',
        'Organizati0n': 'Organization',
        'Communica1ion': 'Communication',
        'Communica9ion': 'Communication',
        'Communicati0n': 'Communication',
        'Educa1ion': 'Education',
        'Educa9ion': 'Education',
        'Educati0n': 'Education',
        'Gradua1e': 'Graduate',
        'Gradua9e': 'Graduate',
        'Graduat3': 'Graduate',
        'Undergradua1e': 'Undergraduate',
        'Undergradua9e': 'Undergraduate',
        'Undergraduat3': 'Undergraduate',
        'Bache1or': 'Bachelor',
        'Bache10r': 'Bachelor',
        'Bachel0r': 'Bachelor',
        'Mas1er': 'Master',
        'Mas9er': 'Master',
        'Mast3r': 'Master',
        'Mas1ers': 'Masters',
        'Mas9ers': 'Masters',
        'Mast3rs': 'Masters',
        'Doc1or': 'Doctor',
        'Doc9or': 'Doctor',
        'Doct0r': 'Doctor',
        'Doc1orate': 'Doctorate',
        'Doc9orate': 'Doctorate',
        'Doctorat3': 'Doctorate',
        'Cer1ificate': 'Certificate',
        'Cer9ificate': 'Certificate',
        'Certificat3': 'Certificate',
        'Cer1ification': 'Certification',
        'Cer9ification': 'Certification',
        'Certificati0n': 'Certification',
        'Professiona1': 'Professional',
        'Professiona9': 'Professional',
        'Technica1': 'Technical',
        'Technica9': 'Technical',
        'Technic4l': 'Technical',
        'Strateg1c': 'Strategic',
        'Strateg9c': 'Strategic',
        'Strat3gic': 'Strategic',
        'Financia1': 'Financial',
        'Financia9': 'Financial',
        'Financi4l': 'Financial',
        'Operationa1': 'Operational',
        'Operationa9': 'Operational',
        'Operati0nal': 'Operational',
    }
    
    # Apply word-level fixes
    import re
    cleaned_text = text
    for wrong, correct in word_fixes.items():
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(wrong) + r'\b'
        cleaned_text = re.sub(pattern, correct, cleaned_text, flags=re.IGNORECASE)
    
    # Apply character-level fixes for remaining issues
    # Fix common number/letter substitutions in the middle of words
    cleaned_text = re.sub(r'(?<=[a-zA-Z])0(?=[a-zA-Z])', 'o', cleaned_text)  # 0 to o
    cleaned_text = re.sub(r'(?<=[a-zA-Z])1(?=[a-zA-Z])', 'l', cleaned_text)  # 1 to l
    cleaned_text = re.sub(r'(?<=[a-zA-Z])9(?=[a-zA-Z])', 'g', cleaned_text)  # 9 to g
    
    return cleaned_text

def extract_text_with_pymupdf(pdf_content):
    """
    Extract text using PyMuPDF (fitz) - often better for complex PDFs.
    """
    try:
        import fitz  # PyMuPDF
        
        # Open PDF from bytes
        doc = fitz.open(stream=pdf_content, filetype="pdf")
        text = ""
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            page_text = page.get_text()
            if page_text:
                text += page_text + "\n"
        
        doc.close()
        
        if text.strip():
            return clean_ocr_text(text)
        
    except ImportError:
        pass
    except Exception as e:
        print(f"PyMuPDF extraction failed: {str(e)}")
    
    return None

def extract_text_with_pdfplumber(pdf_content):
    """
    Extract text using pdfplumber - good for structured PDFs with better formatting.
    """
    try:
        import pdfplumber
        import io
        
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            text = ""
            for page_num, page in enumerate(pdf.pages):
                # Try to extract text with better formatting preservation
                page_text = page.extract_text(
                    x_tolerance=3,  # Horizontal tolerance for character grouping
                    y_tolerance=3,  # Vertical tolerance for line grouping
                    layout=True,    # Preserve layout
                    x_density=7.25, # Character density
                    y_density=13    # Line density
                )
                
                if page_text:
                    # Clean up the text while preserving structure
                    lines = page_text.split('\n')
                    formatted_lines = []
                    
                    for line in lines:
                        line = line.strip()
                        if line:  # Only keep non-empty lines
                            # Fix common spacing issues
                            line = ' '.join(line.split())  # Normalize whitespace
                            formatted_lines.append(line)
                    
                    # Join with proper line breaks
                    if formatted_lines:
                        text += '\n'.join(formatted_lines) + "\n\n"
        
        if text.strip():
            return clean_ocr_text(text)
            
    except ImportError:
        pass
    except Exception as e:
        print(f"pdfplumber extraction failed: {str(e)}")
    
    return None

def extract_text_from_pdf(pdf_content):
    try:
        # Check if the file actually appears to be a PDF (starts with %PDF)
        if not pdf_content.startswith(b'%PDF'):
            print("File does not appear to be a valid PDF (missing PDF header)")
            return "Error: The uploaded file does not appear to be a valid PDF. Please check the file format and try again."
        
        # Try extraction methods in order of preference
        # 1. Try PyMuPDF first (often better for complex PDFs)
        result = extract_text_with_pymupdf(pdf_content)
        if result and result.strip():
            return result
        
        # 2. Try pdfplumber (good for structured PDFs)
        result = extract_text_with_pdfplumber(pdf_content)
        if result and result.strip():
            return result
        
        # 3. Try PyPDF2 (existing method)
        try:
            print("Attempting PDF extraction with PyPDF2")
            # Create a temporary file to store the PDF content
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file_path = temp_file.name
                temp_file.write(pdf_content)
            
            # Import PyPDF2 from the package
            sys.path.append('/tmp')
            import PyPDF2
            
            text = ""
            with open(temp_file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            # Clean up the temporary file
            os.unlink(temp_file_path)
            
            if text.strip():
                return clean_ocr_text(text)
            else:
                print("PyPDF2 extraction returned no text, trying Textract")
        except Exception as pypdf_error:
            print(f"PyPDF2 extraction failed: {str(pypdf_error)}")
            # Continue to next method
        
        # 4. Try using Amazon Textract as a fallback
        try:
            print("Attempting PDF extraction with Amazon Textract")
            textract = boto3.client('textract')
            
            response = textract.detect_document_text(
                Document={'Bytes': pdf_content}
            )
            
            # Extract text from the response
            text = ""
            for item in response["Blocks"]:
                if item["BlockType"] == "LINE":
                    text += item["Text"] + "\n"
            
            # Check if we actually got any text
            if not text.strip():
                print("Textract returned no text content")
                return "Unfortunately, no text content could be extracted from the PDF. The file might be scanned images or have security restrictions."
                
            return clean_ocr_text(text)
            
        except Exception as textract_error:
            print(f"Textract extraction failed: {str(textract_error)}")
            
            # If we get here, all methods failed
            # Try one more fallback - install PyPDF2 if it wasn't available
            try:
                print("Attempting to install and use PyPDF2 as final fallback")
                subprocess.check_call(['pip', 'install', 'PyPDF2', '-t', '/tmp'])
                sys.path.append('/tmp')
                import PyPDF2
                
                # Create a new temporary file
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                    temp_file_path = temp_file.name
                    temp_file.write(pdf_content)
                
                text = ""
                with open(temp_file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page_num in range(len(pdf_reader.pages)):
                        page = pdf_reader.pages[page_num]
                        text += page.extract_text() + "\n"
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
                if text.strip():
                    return clean_ocr_text(text)
                else:
                    return "Unfortunately, no text could be extracted from the PDF. The file might contain scanned images or have security restrictions."
            except Exception as final_error:
                print(f"Final PDF extraction attempt failed: {str(final_error)}")
                return "Unfortunately, the PDF format is not supported for text extraction. The file might be corrupted, password-protected, or in an unsupported format."
    
    except Exception as e:
        print(f"Error in PDF extraction process: {str(e)}")
        return f"Error extracting text from PDF: {str(e)}"

# Function to extract text from Word document
def extract_text_from_docx(docx_content):
    try:
        # Create a temporary file to store the docx content
        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(docx_content)
        
        # Use direct zipfile extraction as the primary method (more reliable in Lambda)
        import zipfile
        from xml.etree.ElementTree import XML
        
        document = zipfile.ZipFile(temp_file_path)
        
        # Check if document.xml exists in the zip file
        try:
            xml_content = document.read('word/document.xml')
            
            WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
            PARA = WORD_NAMESPACE + 'p'
            TEXT = WORD_NAMESPACE + 't'
            
            tree = XML(xml_content)
            
            paragraphs = []
            for paragraph in tree.iter(PARA):
                texts = [node.text for node in paragraph.iter(TEXT) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            
            document.close()
            
            # Clean up the temporary file
            os.unlink(temp_file_path)
            
            extracted_text = '\n'.join(paragraphs)
            
            # Verify we actually got content
            if not extracted_text.strip():
                raise ValueError("No text content extracted from DOCX file")
                
            return extracted_text
            
        except KeyError:
            # If word/document.xml doesn't exist, try alternative paths
            document.close()
            
            # Try using python-docx if available
            try:
                # In Lambda, we can install packages in /tmp
                subprocess.check_call(['pip', 'install', 'python-docx', '-t', '/tmp'])
                sys.path.append('/tmp')
                import docx
                
                doc = docx.Document(temp_file_path)
                full_text = []
                for para in doc.paragraphs:
                    full_text.append(para.text)
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
                return '\n'.join(full_text)
            except Exception as docx_error:
                print(f"python-docx extraction failed: {str(docx_error)}")
                raise
    
    except Exception as e:
        print(f"Error extracting text from Word document: {str(e)}")
        
        # Final fallback: Try to use textract package
        try:
            # Create a new temporary file
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as temp_file:
                temp_file_path = temp_file.name
                temp_file.write(docx_content)
            
            # Try to install and use textract
            try:
                subprocess.check_call(['pip', 'install', 'textract', '-t', '/tmp'])
                sys.path.append('/tmp')
                import textract as text_extractor
                
                # Extract text from the docx file
                text = text_extractor.process(temp_file_path).decode('utf-8')
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
                return text
            except Exception as textract_error:
                print(f"Textract extraction failed: {str(textract_error)}")
                os.unlink(temp_file_path)
                return "Unable to extract text from the Word document. Please try converting it to PDF format."
        except Exception as fallback_error:
            print(f"All extraction methods failed: {str(fallback_error)}")
            return "Unable to extract text from the Word document. Please try converting it to PDF format."

def format_original_resume_text(raw_text):
    """
    Format the raw extracted resume text to make it more readable for comparison.
    This function attempts to identify and structure common resume sections.
    """
    try:
        # First, try to detect if the text is already well-formatted
        lines = raw_text.split('\n')
        
        # Count how many lines have proper structure (not too long, reasonable breaks)
        well_formatted_lines = 0
        total_content_lines = 0
        
        for line in lines:
            line = line.strip()
            if line:
                total_content_lines += 1
                # Check if line looks well-formatted (reasonable length, proper capitalization)
                if len(line) < 120 and (line[0].isupper() or line.startswith('•')):
                    well_formatted_lines += 1
        
        # If more than 60% of lines look well-formatted, use minimal processing
        if total_content_lines > 0 and (well_formatted_lines / total_content_lines) > 0.6:
            print("Text appears well-formatted, using minimal processing")
            clean_lines = []
            for line in lines:
                cleaned = line.strip()
                if cleaned:  # Only keep non-empty lines
                    clean_lines.append(cleaned)
            return '\n'.join(clean_lines)
        
        # Otherwise, apply more aggressive formatting
        print("Text needs formatting, applying structure detection")
        
        # Clean up lines - remove excessive whitespace and empty lines
        clean_lines = []
        for line in lines:
            cleaned = line.strip()
            if cleaned:  # Only keep non-empty lines
                clean_lines.append(cleaned)
        
        if not clean_lines:
            return "No readable content found in the original resume."
        
        # Try to identify sections and format them
        i = 0
        current_section = None
        
        # Common section headers to look for
        section_keywords = {
            'contact': ['email', 'phone', 'linkedin', 'address', 'location'],
            'summary': ['summary', 'objective', 'profile', 'about'],
            'experience': ['experience', 'employment', 'work history', 'professional experience', 'career'],
            'education': ['education', 'academic', 'degree', 'university', 'college', 'school'],
            'skills': ['skills', 'technical skills', 'competencies', 'technologies', 'tools'],
            'projects': ['projects', 'portfolio'],
            'certifications': ['certifications', 'certificates', 'licenses'],
            'awards': ['awards', 'honors', 'achievements', 'recognition']
        }
        
        # First, try to identify the name (usually first few lines)
        name_found = False
        contact_info = []
        formatted_lines = []
        
        while i < len(clean_lines) and i < 5:  # Check first 5 lines for header info
            line = clean_lines[i].strip()
            
            # Check if this looks like a name (not too long, not containing common resume keywords)
            if not name_found and len(line) < 50 and not any(keyword in line.lower() for keyword_list in section_keywords.values() for keyword in keyword_list):
                # Check if it contains email, phone, or other contact info
                if '@' in line or any(char.isdigit() for char in line.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')):
                    contact_info.append(line)
                else:
                    # Likely a name
                    formatted_lines.append(line.upper())
                    formatted_lines.append("=" * len(line))
                    formatted_lines.append("")
                    name_found = True
            else:
                # Likely contact info
                contact_info.append(line)
            
            i += 1
        
        # Add contact information
        if contact_info:
            formatted_lines.extend(contact_info)
            formatted_lines.append("")
        
        # Process the rest of the resume
        current_section = None
        in_bullet_list = False
        
        while i < len(clean_lines):
            line = clean_lines[i].strip()
            
            # Check if this line is a section header
            section_detected = None
            for section_name, keywords in section_keywords.items():
                if any(keyword in line.lower() for keyword in keywords):
                    # Additional check: section headers are usually short and may be in caps
                    if len(line) < 100:
                        section_detected = section_name
                        break
            
            if section_detected:
                # Add section header
                if formatted_lines and formatted_lines[-1] != "":
                    formatted_lines.append("")
                
                section_title = line.upper()
                formatted_lines.append(section_title)
                formatted_lines.append("=" * len(section_title))
                formatted_lines.append("")
                current_section = section_detected
                in_bullet_list = False
                
            else:
                # Regular content line
                # Check if it looks like a bullet point
                if line.startswith(('•', '-', '*', '◦')) or (len(line) > 10 and line[0].isalpha() and current_section in ['experience', 'skills', 'projects']):
                    if not line.startswith(('•', '-', '*', '◦')):
                        line = f"• {line}"
                    formatted_lines.append(line)
                    in_bullet_list = True
                    
                # Check if it looks like a job title/company (for experience section)
                elif current_section == 'experience' and not in_bullet_list:
                    # Look ahead to see if next line might be dates or location
                    next_line = clean_lines[i + 1] if i + 1 < len(clean_lines) else ""
                    
                    # If this line is followed by something that looks like dates, treat as job header
                    if any(char.isdigit() for char in next_line) or any(word in next_line.lower() for word in ['present', 'current', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']):
                        formatted_lines.append(f"{line}")
                        in_bullet_list = False
                    else:
                        formatted_lines.append(f"• {line}")
                        in_bullet_list = True
                        
                # Check if it looks like education entry
                elif current_section == 'education':
                    formatted_lines.append(line)
                    
                # Default: add as regular line
                else:
                    formatted_lines.append(line)
                    in_bullet_list = False
            
            i += 1
        
        # Join all formatted lines
        result = '\n'.join(formatted_lines)
        
        # Clean up excessive blank lines
        while '\n\n\n' in result:
            result = result.replace('\n\n\n', '\n\n')
        
        return result.strip()
        
    except Exception as e:
        print(f"Error formatting original resume text: {str(e)}")
        # Fallback: return original text with basic cleanup
        lines = raw_text.split('\n')
        clean_lines = [line.strip() for line in lines if line.strip()]
        return '\n'.join(clean_lines)

# Function to determine file type and extract text
def extract_text_from_document(file_content, file_key):
    # First, try to detect file type by content (magic bytes)
    file_type = detect_file_type(file_content)
    file_extension = file_key.lower().split('.')[-1]
    
    print(f"File extension from key: {file_extension}")
    print(f"Detected file type from content: {file_type}")
    
    # If detected type doesn't match extension, log a warning
    if file_type and file_extension not in file_type:
        print(f"Warning: File extension ({file_extension}) doesn't match detected type ({file_type})")
    
    # Use detected type if available, otherwise fall back to extension
    actual_type = file_type if file_type else file_extension
    
    if 'pdf' in actual_type:
        result = extract_text_from_pdf(file_content)
        if result.startswith("Error") or result.startswith("The ") or result.startswith("No text"):
            return result
        return result
    elif any(ext in actual_type for ext in ['doc', 'docx', 'word']):
        result = extract_text_from_docx(file_content)
        if result.startswith("Unable to extract text"):
            return "Unfortunately, I could not extract any text from the provided Word document. Please try saving it as a PDF and uploading again."
        return result
    elif any(ext in actual_type for ext in ['txt', 'rtf', 'md', 'text', 'plain']):
        # Try to decode as plain text
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            return "Error decoding text file. Please check the encoding or try converting to PDF format."
    else:
        # Try to decode as plain text for unknown formats
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            return "Unsupported file format. Please upload a PDF, Word document, or plain text file."

# Function to detect file type based on content (magic bytes)
def detect_file_type(file_content):
    # Check for PDF signature
    if file_content.startswith(b'%PDF'):
        return 'pdf'
    
    # Check for DOC signature (DOC files start with D0CF11E0)
    if file_content.startswith(b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'):
        return 'doc'
    
    # Check for DOCX, which is a ZIP file containing specific XML files
    if file_content.startswith(b'PK\x03\x04'):
        # DOCX is a ZIP file, but so are many other formats
        # Try to check if it contains word/document.xml
        try:
            import io
            import zipfile
            with zipfile.ZipFile(io.BytesIO(file_content)) as zip_ref:
                file_list = zip_ref.namelist()
                if 'word/document.xml' in file_list:
                    return 'docx'
        except:
            pass
    
    # Check for RTF signature
    if file_content.startswith(b'{\\rtf'):
        return 'rtf'
    
    # Check for plain text (this is a bit of a guess)
    try:
        sample = file_content[:1000].decode('utf-8')
        # If we can decode it as UTF-8 and it contains mostly printable ASCII,
        # it's probably a text file
        printable_ratio = sum(c.isprintable() for c in sample) / len(sample)
        if printable_ratio > 0.95:
            return 'txt'
    except:
        pass
    
    # Unknown type
    return None

def simple_clean_resume_text(raw_text):
    """
    Simple text cleaning for optimization - fixes OCR errors without formatting.
    This ensures the optimization process gets clean text without parsing issues.
    """
    if not raw_text:
        return raw_text
    
    # Basic OCR error fixes
    text = raw_text
    
    # Common OCR fixes
    text = text.replace('Informa9on', 'Information')
    text = text.replace('Educa9on', 'Education')
    text = text.replace('Applica9on', 'Application')
    text = text.replace('Organiza9on', 'Organization')
    text = text.replace('Administra9on', 'Administration')
    text = text.replace('Communica9on', 'Communication')
    text = text.replace('Implementa9on', 'Implementation')
    
    # Fix common spacing issues
    text = text.replace('  ', ' ')  # Double spaces to single
    text = text.replace('\n\n\n', '\n\n')  # Triple newlines to double
    
    # Remove excessive whitespace
    lines = text.split('\n')
    cleaned_lines = [line.strip() for line in lines if line.strip()]
    
    return '\n'.join(cleaned_lines)

def extract_original_resume_content(raw_text):
    """
    Extract and structure the original resume content using the lowest cost LLM.
    This preserves the original content while organizing it into clear sections.
    """
    try:
        print("Extracting original resume content with Claude 3 Haiku...")
        
        # Simple prompt to extract and organize original content
        extraction_prompt = f"""Clean up the text below which was extracted from a PDF/document. Fix any OCR errors and organize it with clear sections and proper line breaks.

IMPORTANT: Include ALL sections from the resume - name, contact info, summary, skills, experience, education, etc.

Rules:
- Fix OCR errors (like "Informa9on" → "Information")
- Keep all original wording, dates, and details exactly as written
- Include the complete resume: name, contact info, summary, skills, experience, education
- Add proper line breaks between sections
- Add blank lines between major sections for readability
- Format section headers with underlines using "=" characters (e.g., "SUMMARY" followed by "=======")
- Add separator lines (-------------------------) between ALL different job experiences in the experience section
- Ensure proper spacing and paragraph breaks
- Do NOT add any introductory text or explanations
- Return only the cleaned resume content
- Add "====FORMATTED====" at the very beginning to mark this as pre-formatted

Expected structure:
====FORMATTED====
Name
Contact Information

SUMMARY
=======
Summary content...

SKILLS
======
Skills content...

EXPERIENCE
==========
Job 1 details...
-------------------------
Job 2 details...
-------------------------
Job 3 details...
-------------------------
Job 4 details...

EDUCATION
=========
Education content...

Original extracted text:
{raw_text}"""

        # Use Claude 3 Haiku (cheapest model)
        bedrock_runtime = boto3.client('bedrock-runtime')
        
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "temperature": 0.1,  # Very low temperature for consistent extraction
            "messages": [
                {
                    "role": "user",
                    "content": extraction_prompt
                }
            ]
        }
        
        # Make the API call to Claude 3 Haiku
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=json.dumps(request_body)
        )
        
        # Parse the response
        response_body = json.loads(response['body'].read())
        extracted_content = response_body['content'][0]['text']
        
        print("Original content extraction completed successfully")
        return extracted_content.strip()
        
    except Exception as e:
        print(f"Error extracting original resume content: {str(e)}")
        # Fallback to basic formatting
        return format_original_resume_text(raw_text)

def format_resume_for_comparison(resume_content):
    """
    Format resume content with proper lines, underlines, and spacing for comparison view.
    This creates a clean, structured format suitable for side-by-side comparison.
    """
    try:
        lines = resume_content.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if this looks like a section header
            # Section headers are typically short, may be in caps, and contain key words
            section_keywords = [
                'summary', 'objective', 'profile', 'about',
                'experience', 'work', 'employment', 'career',
                'education', 'academic', 'degree', 'university', 'college',
                'skills', 'competencies', 'abilities', 'expertise',
                'projects', 'portfolio', 'achievements',
                'certifications', 'licenses', 'awards',
                'contact', 'information', 'details'
            ]
            
            is_section_header = False
            if len(line) < 50:  # Section headers are usually short
                line_lower = line.lower()
                if any(keyword in line_lower for keyword in section_keywords):
                    is_section_header = True
                # Also check if it's mostly uppercase (common for headers)
                elif len(line) > 3 and sum(c.isupper() for c in line if c.isalpha()) / len([c for c in line if c.isalpha()]) > 0.7:
                    is_section_header = True
            
            if is_section_header:
                # Add spacing before section (except for first section)
                if formatted_lines:
                    formatted_lines.append("")
                
                # Format as section header with underline
                header_text = line.upper()
                formatted_lines.append(header_text)
                formatted_lines.append("=" * len(header_text))
                formatted_lines.append("")
                
            else:
                # Regular content line
                # Check if it's a name (likely first line, short, title case)
                if not formatted_lines and len(line) < 50 and line.replace(' ', '').replace('.', '').isalpha():
                    # This looks like a name - format specially
                    name_text = line.upper()
                    formatted_lines.append(name_text)
                    formatted_lines.append("=" * len(name_text))
                    formatted_lines.append("")
                else:
                    # Regular content
                    formatted_lines.append(line)
        
        # Join and clean up excessive blank lines
        result = '\n'.join(formatted_lines)
        while '\n\n\n' in result:
            result = result.replace('\n\n\n', '\n\n')
        
        return result.strip()
        
    except Exception as e:
        print(f"Error formatting resume for comparison: {str(e)}")
        # Fallback: return content with minimal formatting
        lines = resume_content.split('\n')
        clean_lines = [line.strip() for line in lines if line.strip()]
        return '\n'.join(clean_lines)

def create_text_resume(resume_json):
    """Create a text-based resume from the JSON data."""
    try:
        # Format the resume as text
        text_resume = f"{resume_json.get('full_name', 'Full Name')}\n"
        text_resume += f"{resume_json.get('contact_info', 'Contact Information')}\n\n"
        text_resume += "=" * 80 + "\n\n"
        
        # Professional Summary
        text_resume += "PROFESSIONAL SUMMARY\n"
        text_resume += "-" * 20 + "\n"
        text_resume += f"{resume_json.get('professional_summary', 'Professional Summary')}\n\n"
        
        # Skills
        text_resume += "SKILLS\n"
        text_resume += "-" * 6 + "\n"
        for skill in resume_json.get('skills', []):
            text_resume += f"• {skill}\n"
        text_resume += "\n"
        
        # Experience
        text_resume += "EXPERIENCE\n"
        text_resume += "-" * 10 + "\n"
        for job in resume_json.get('experience', []):
            # Title and dates on first line with spacing
            title = job.get('title', 'Job Title')
            dates = job.get('dates', 'Dates')
            spacing = max(1, 60 - len(title))  # Adjust spacing for alignment
            title_dates = f"{title}{' ' * spacing}{dates}"
            text_resume += f"{title_dates}\n"
            
            # Company and location on second line with spacing
            company = job.get('company', 'Company')
            if job.get('location'):
                location = job.get('location')
                spacing = max(1, 60 - len(company))  # Adjust spacing for alignment
                company_location = f"{company}{' ' * spacing}{location}"
            else:
                company_location = company
            text_resume += f"{company_location}\n"
            for achievement in job.get('achievements', []):
                text_resume += f"• {achievement}\n"
            text_resume += "\n"
        
        # Education
        text_resume += "EDUCATION\n"
        text_resume += "-" * 9 + "\n"
        for edu in resume_json.get('education', []):
            text_resume += f"{edu.get('degree', 'Degree')} | {edu.get('institution', 'Institution')}\n"
            text_resume += f"{edu.get('dates', 'Graduation Year')}\n"
            if 'details' in edu and edu['details']:
                text_resume += f"{edu['details']}\n"
            text_resume += "\n"
        
        return text_resume
    except Exception as e:
        print(f"Error creating text resume: {str(e)}")
        return None

def calculate_ats_score(optimized_resume, job_description, job_title):
    """Calculate ATS compatibility score using AI analysis"""
    try:
        ats_prompt = f"""
Analyze the following resume against the job requirements and provide ATS (Applicant Tracking System) compatibility scores.

JOB TITLE: {job_title}

JOB REQUIREMENTS:
{job_description}

RESUME TO ANALYZE:
{optimized_resume}

Provide scores (0-100) for each category and respond in this EXACT JSON format:
{{
  "overall": 85,
  "keywords": 90,
  "skills": 80,
  "experience": 85,
  "format": 95
}}

Evaluate:
- overall: Overall ATS compatibility
- keywords: Keyword matching with job description
- skills: Skills alignment with requirements
- experience: Experience relevance to role
- format: Resume format and structure compatibility
"""

        models = [
            {'id': 'anthropic.claude-3-sonnet-20240229-v1:0', 'max_tokens': 4096},
            {'id': 'anthropic.claude-3-haiku-20240307-v1:0', 'max_tokens': 4096}
        ]
        
        for model in models:
            try:
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 200,
                    "temperature": 0.1,
                    "system": "You are an ATS scoring expert. Respond only with valid JSON containing numeric scores 0-100.",
                    "messages": [{"role": "user", "content": ats_prompt}]
                }
                
                response = bedrock_runtime.invoke_model(
                    body=json.dumps(request_body),
                    modelId=model['id'],
                    accept='application/json',
                    contentType='application/json'
                )
                
                response_body = json.loads(response.get('body').read())
                score_text = response_body['content'][0]['text'].strip()
                print(f"ATS scoring AI response: {score_text}")
                
                # Try to parse JSON response
                import re
                json_match = re.search(r'\{[^}]+\}', score_text)
                if json_match:
                    json_str = json_match.group()
                    print(f"Extracted JSON for ATS scoring: {json_str}")
                    scores = json.loads(json_str)
                    print(f"Parsed ATS scores: {scores}")
                    
                    # Validate all scores are numbers between 0-100
                    for key, value in scores.items():
                        if not isinstance(value, (int, float)) or value < 0 or value > 100:
                            print(f"Invalid score for {key}: {value}, setting to 0")
                            scores[key] = 0
                    return scores
                else:
                    print(f"No JSON found in ATS response: {score_text}")
                    return {'overall': 0, 'keywords': 0, 'skills': 0, 'experience': 0, 'format': 0}
                    
            except Exception as e:
                print(f"Error with model {model['id']}: {str(e)}")
                continue
                
        print("All ATS scoring models failed, returning default scores")
        return {'overall': 0, 'keywords': 0, 'skills': 0, 'experience': 0, 'format': 0}
        
    except Exception as e:
        print(f"Error in ATS score calculation: {str(e)}")
        return None

def process_resume_optimization(event, context):
    """Main function to process resume optimization"""
    status_key = None
    try:
        print("Received event:", json.dumps(event))
        
        # Extract data from the event
        user_id = event.get('userId', 'anonymous')
        job_id = event.get('jobId')
        resume_key = event.get('resumeKey')
        job_desc_key = event.get('jobDescriptionKey')
        job_title_key = event.get('jobTitleKey')
        company_name_key = event.get('companyNameKey')
        job_url = event.get('jobUrl')  # New field for job URL extraction
        generate_cv = event.get('generateCV', False)  # Generate CV flag
        status_key = event.get('statusKey')
        output_format = event.get('outputFormat', 'pdf')  # Resume format - default to pdf
        cover_letter_format = event.get('coverLetterFormat', 'pdf')  # Cover letter format - default to pdf
        
        # WORKAROUND: If generateCV is true but coverLetterFormat is missing, 
        # this indicates API Gateway filtered out the parameter
        if generate_cv and cover_letter_format == 'pdf' and not event.get('coverLetterFormat'):
            print("⚠️  WORKAROUND: generateCV is true but coverLetterFormat is missing - API Gateway issue detected")
            print("⚠️  Defaulting to 'word' format for cover letter generation")
            cover_letter_format = 'word'  # Default to word when cover letter is requested but format is missing
        
        print(f"AI Handler received resume format: {output_format}")
        print(f"AI Handler received cover letter format: {cover_letter_format}")
        print(f"Generate CV flag: {generate_cv}")
        print(f"Job URL provided: {bool(job_url)}")
        print(f"Raw event outputFormat: {event.get('outputFormat')}")
        print(f"Raw event coverLetterFormat: {event.get('coverLetterFormat')}")
        
        # ENHANCED DEBUG - Print the entire event to see what's being received
        print("🔍 BACKEND DEBUG - Full Event Received:")
        print(json.dumps(event, indent=2, default=str))
        
        # ADDITIONAL DEBUG - Check if coverLetterFormat is in different locations
        print("🔍 ADDITIONAL DEBUG - Checking for coverLetterFormat in different locations:")
        print(f"  event.get('coverLetterFormat'): {event.get('coverLetterFormat')}")
        print(f"  event.get('body'): {event.get('body')}")
        print(f"  event.get('queryStringParameters'): {event.get('queryStringParameters')}")
        print(f"  event.get('pathParameters'): {event.get('pathParameters')}")
        
        # Try to parse body if it exists
        if event.get('body'):
            try:
                body = json.loads(event.get('body'))
                print(f"  Parsed body coverLetterFormat: {body.get('coverLetterFormat')}")
            except:
                print("  Could not parse body as JSON")
        
        # Map frontend format names to backend format names
        format_mapping = {
            'docx': 'word',
            'txt': 'text',
            'pdf': 'pdf',
            'dual': 'dual'
        }
        output_format = format_mapping.get(output_format, output_format)
        cover_letter_format = format_mapping.get(cover_letter_format, cover_letter_format)
        
        print(f"Mapped resume format: {output_format}")
        print(f"Mapped cover letter format: {cover_letter_format}")
        
        # Check if cover letter should be generated in dual format
        print(f"DEBUG: output_format = '{output_format}', generate_cv = {generate_cv}")
        print(f"DEBUG: cover_letter_format = '{cover_letter_format}'")
        print(f"DEBUG: output_format.lower() == 'dual': {output_format.lower() == 'dual'}")
        print(f"DEBUG: cover_letter_format.lower() == 'dual': {cover_letter_format.lower() == 'dual' if cover_letter_format else False}")
        print(f"DEBUG: generate_cv: {generate_cv}")
        
        # Cover letter dual format can be triggered by either outputFormat=dual OR coverLetterFormat=dual
        cover_letter_dual_format_mode = ((output_format.lower() == 'dual' or (cover_letter_format and cover_letter_format.lower() == 'dual')) and generate_cv)
        print(f"Cover letter dual format mode: {cover_letter_dual_format_mode}")
        
        # Initialize format variables with defaults based on user selection
        if output_format.lower() == 'dual':
            # New feature: Dual format - generate both PDF and Word
            output_extension = 'docx'  # Primary format for backward compatibility
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            is_binary = True
            dual_format_mode = True
            print("🎉 NEW FEATURE: Dual format mode enabled - will generate both PDF and Word")
        elif output_format.lower() == 'pdf':
            output_extension = 'pdf'
            content_type = 'application/pdf'
            is_binary = True
            dual_format_mode = False
        elif output_format.lower() == 'word':
            output_extension = 'docx'
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            is_binary = True
            dual_format_mode = False
        elif output_format.lower() in ['text', 'txt']:
            output_extension = 'txt'
            content_type = 'text/plain'
            is_binary = False
            dual_format_mode = False
        else:  # fallback to text format
            print(f"Unknown format '{output_format}', defaulting to text")
            output_extension = 'txt'
            content_type = 'text/plain'
            is_binary = False
            dual_format_mode = False
        
        print(f"Initialized format variables - extension: {output_extension}, content_type: {content_type}, is_binary: {is_binary}")
        
        # Validate inputs - now more flexible with job URL extraction
        if not job_id or not resume_key or not status_key:
            error_msg = 'Missing required parameters (jobId, resumeKey, statusKey)'
            if status_key:
                update_job_status(bucket_name, status_key, 'FAILED', error_msg)
            return {
                'error': error_msg,
                'headers': get_cors_headers()
            }
        
        # Either job URL or job title/description must be provided
        if not job_url and not job_title_key:
            error_msg = 'Either job URL or job title must be provided'
            update_job_status(bucket_name, status_key, 'FAILED', error_msg)
            return {
                'error': error_msg,
                'headers': get_cors_headers()
            }
        
        # Update status to processing
        update_job_status(bucket_name, status_key, 'PROCESSING', 'Processing resume and job description')
        
        # Get files from S3
        try:
            # Get resume file
            resume_obj = s3.get_object(Bucket=bucket_name, Key=resume_key)
            resume_content = resume_obj['Body'].read()
            
            # Extract text from resume document (PDF or Word)
            resume_text = extract_text_from_document(resume_content, resume_key)
            print(f"Extracted resume text length: {len(resume_text)}")
            
            # Clean the resume text for optimization (simple cleaning only)
            cleaned_resume_text = simple_clean_resume_text(resume_text)
            
            # Extract and format original resume content for comparison display only
            formatted_original_text = resume_text  # Default fallback
            try:
                # Step 1: Extract original content using LLM to organize it properly for display
                print("Extracting original resume content for comparison display...")
                extracted_original = extract_original_resume_content(resume_text)
                
                # Step 2: Format it with proper lines, underlines, and spacing for comparison
                print("Formatting original resume for comparison...")
                formatted_original_text = format_resume_for_comparison(extracted_original)
                
                # Store the formatted original text for comparison
                original_text_key = f"users/{user_id}/original/{job_id}/original_text.txt"
                s3.put_object(
                    Bucket=bucket_name,
                    Key=original_text_key,
                    Body=formatted_original_text.encode('utf-8'),
                    ContentType='text/plain'
                )
                print(f"Stored formatted original text for comparison at {original_text_key}")
                
            except Exception as e:
                print(f"Warning: Failed to process original text for comparison: {str(e)}")
                # Use raw text as fallback
                formatted_original_text = resume_text
            
            # Check if we got a valid extraction or an error message
            if resume_text.startswith("Unfortunately") or resume_text.startswith("Error") or resume_text.startswith("Unable"):
                print("Text extraction failed with error message")
                update_job_status(bucket_name, status_key, 'FAILED', resume_text)
                return {
                    'error': resume_text,
                    'headers': get_cors_headers()
                }
            
            # Verify we have enough text to process
            if len(cleaned_resume_text.strip()) < 50:  # Arbitrary minimum length
                error_msg = f"The extracted text from your resume is too short ({len(cleaned_resume_text.strip())} characters). Please check the file format and try again."
                print("Extracted text too short, likely failed extraction")
                update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                return {
                    'error': error_msg,
                    'headers': get_cors_headers()
                }
            
            # Initialize job data variables
            job_description = ""
            job_title = ""
            company_name = ""
            
            # Extract job data from URL if provided
            if job_url:
                update_job_status(bucket_name, status_key, 'PROCESSING', 'Extracting job information from URL...')
                
                extracted_data = extract_job_data_from_url(job_url)
                if extracted_data:
                    job_description = extracted_data.get('description', '')
                    extracted_job_title = extracted_data.get('job_title', '')
                    company_name = extracted_data.get('company', '')
                    
                    print(f"Extracted job title: {extracted_job_title}")
                    print(f"Extracted company: {company_name}")
                    print(f"Job description length: {len(job_description)}")
                    
                    # Use extracted job title if not provided manually
                    if extracted_job_title:
                        job_title = extracted_job_title
                else:
                    print("Job URL extraction failed, checking for manual data...")
            
            # Get manual job data from S3 if available (fallback or supplement)
            if job_title_key and not job_title:
                try:
                    job_title_obj = s3.get_object(Bucket=bucket_name, Key=job_title_key)
                    job_title = job_title_obj['Body'].read().decode('utf-8').strip()
                    print(f"Using manual job title: {job_title}")
                except Exception as e:
                    print(f"No manual job title found: {str(e)}")
            
            if job_desc_key and not job_description:
                try:
                    job_desc_obj = s3.get_object(Bucket=bucket_name, Key=job_desc_key)
                    job_description = job_desc_obj['Body'].read().decode('utf-8')
                    print(f"Using manual job description, length: {len(job_description)}")
                except Exception as e:
                    print(f"No manual job description found: {str(e)}")
            
            if company_name_key and not company_name:
                try:
                    company_name_obj = s3.get_object(Bucket=bucket_name, Key=company_name_key)
                    company_name = company_name_obj['Body'].read().decode('utf-8').strip()
                    print(f"Using manual company name: {company_name}")
                except Exception as e:
                    print(f"No manual company name found: {str(e)}")
            
            # Final validation
            if not job_title:
                error_msg = "Job title is required. Please provide a job title or a valid job URL."
                update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                return {
                    'error': error_msg,
                    'headers': get_cors_headers()
                }
            
            if generate_cv and not company_name:
                error_msg = "Company information is required for cover letter generation. Please provide a valid job URL with company information."
                update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                return {
                    'error': error_msg,
                    'headers': get_cors_headers()
                }
        except Exception as e:
            error_msg = f'Error retrieving or processing files: {str(e)}'
            print(f"Error retrieving or processing files from S3: {str(e)}")
            update_job_status(bucket_name, status_key, 'FAILED', error_msg)
            return {
                'error': error_msg,
                'headers': get_cors_headers()
            }
        
        # Process skills extraction and update database
        skills_processing_result = {}
        if skills_table_name:
            try:
                print("Starting adaptive skills processing...")
                update_job_status(bucket_name, status_key, 'PROCESSING', 'Extracting and updating skills database')
                
                # Initialize skills manager
                skills_manager = SkillsManager(skills_table_name)
                
                # Extract skills from job description (if provided)
                extracted_skills = []
                if job_description and job_description.strip():
                    extracted_skills = skills_manager.extract_skills_from_text(job_description)
                    print(f"Extracted {len(extracted_skills)} skills from job description")
                else:
                    print("No job description provided - skipping skills extraction")
                
                # Process the extracted skills (add new ones, update frequencies)
                skills_processing_result = None
                if extracted_skills:
                    skills_processing_result = skills_manager.process_extracted_skills(extracted_skills)
                    print(f"Skills processing result: {skills_processing_result}")
                else:
                    print("No skills to process")
                
                # Get updated skills for optimization
                organized_skills = skills_manager.get_skills_for_optimization()
                print(f"Retrieved organized skills: {sum(len(skills) for skills in organized_skills.values())} total skills")
                
            except Exception as e:
                print(f"Warning: Skills processing failed: {str(e)}")
                # Continue with empty skills if processing fails
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
                skills_processing_result = {'error': str(e)}
        else:
            print("Skills table not configured, skipping skills processing")
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
        
        # Update status to AI processing
        update_job_status(bucket_name, status_key, 'PROCESSING', 'Generating optimized resume with AI')
        
        # Estimate the page count of the original resume
        def estimate_page_count(text):
            """
            Estimate the number of pages based on text length and content structure.
            Assumes approximately 500-600 words per page for a typical resume.
            """
            words = len(text.split())
            lines = len(text.split('\n'))
            
            # Base estimation on word count (500-600 words per page)
            word_based_pages = max(1, words / 550)
            
            # Adjust based on line count (assuming 40-50 lines per page)
            line_based_pages = max(1, lines / 45)
            
            # Take the average and round up to nearest 0.5
            estimated_pages = (word_based_pages + line_based_pages) / 2
            
            # Round to nearest 0.5 and ensure minimum of 1 page
            if estimated_pages <= 1:
                return 1
            elif estimated_pages <= 1.5:
                return 1.5
            elif estimated_pages <= 2:
                return 2
            else:
                return min(3, round(estimated_pages * 2) / 2)  # Cap at 3 pages max
        
        original_page_count = estimate_page_count(resume_text)
        print(f"Estimated original resume page count: {original_page_count}")
        
        # Determine content preservation guidance based on page count
        if original_page_count <= 1:
            length_guidance = "Preserve all original content while optimizing for keywords. Maintain the same number of experience entries and bullet points as the original resume."
        elif original_page_count <= 1.5:
            length_guidance = "Preserve all original content while optimizing for keywords. Keep all experience entries and bullet points from the original resume."
        elif original_page_count <= 2:
            length_guidance = "Preserve all original content while optimizing for keywords. Include all experience entries and bullet points from the original resume."
        else:
            length_guidance = "Preserve all original content while optimizing for keywords. Include all experience entries and bullet points from the original resume, maintaining the same level of detail."

        # Generate the prompt using the external template with dynamic skills
        # Convert organized skills to a formatted string for the prompt
        skills_text = ""
        if organized_skills:
            skills_sections = []
            for category, skills_list in organized_skills.items():
                if skills_list:  # Only include categories that have skills
                    category_title = category.replace('_', ' ').title()
                    skills_sections.append(f"{category_title}: {', '.join(skills_list[:20])}")  # Limit to top 20 per category
            
            if skills_sections:
                skills_text = "Dynamic Skills Database (prioritize these skills when relevant):\n" + "\n".join(skills_sections)
                print(f"Generated skills text with {len(skills_sections)} categories")
        
        # Log all variables sent to prompt template
        print(f"=== PROMPT TEMPLATE VARIABLES ===")
        print(f"Resume text length: {len(cleaned_resume_text)} characters")
        print(f"Job description length: {len(job_description)} characters")
        print(f"Job title: {job_title}")
        print(f"Company name: {company_name}")
        print(f"Skills text length: {len(skills_text)} characters")
        print(f"Length guidance: {length_guidance}")
        print(f"=== END PROMPT VARIABLES ===")
        
        prompt = get_resume_optimization_prompt(cleaned_resume_text, job_description, job_title, company_name, skills_text)
        
        # Call Amazon Bedrock with automatic model fallback
        def call_bedrock_with_fallback(prompt):
            """
            Call Bedrock with automatic model fallback.
            Uses the AI_MODELS configuration with cost-optimized hierarchy.
            """
            
            print(f"Starting AI model fallback with {len(AI_MODELS)} models configured")
            print("Model hierarchy (most expensive to least expensive):")
            for i, model in enumerate(AI_MODELS):
                print(f"  {i+1}. {model['name']} - ${model['cost_per_1m_input']:.2f}/${model['cost_per_1m_output']:.2f} per 1M tokens")
            
            last_error = None
            
            # Try each model in order
            for i, model in enumerate(AI_MODELS):
                try:
                    print(f"Attempting to use {model['name']} (model {i+1}/{len(AI_MODELS)})")
                    print(f"  Model ID: {model['id']}")
                    print(f"  Cost Tier: {model['cost_tier']} - ${model['cost_per_1m_input']:.2f}/${model['cost_per_1m_output']:.2f} per 1M tokens")
                    print(f"  Description: {model['description']}")
                    
                    # Prepare the request body based on model type
                    if model['id'] == 'us.deepseek.r1-v1:0':
                        # DeepSeek R1 via Bedrock with special formatting
                        formatted_prompt = f"<｜begin▁of▁sentence｜><｜User｜>{prompt}<｜Assistant｜><think>"
                        request_body = {
                            "max_tokens": model['max_tokens'],
                            "temperature": 0.5,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": formatted_prompt
                                }
                            ]
                        }
                    elif model['id'].startswith('anthropic.'):
                        # Anthropic models use the messages format
                        request_body = {
                            "anthropic_version": "bedrock-2023-05-31",
                            "max_tokens": model['max_tokens'],
                            "temperature": 0.5,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ]
                        }
                    elif model['id'].startswith('amazon.'):
                        # Amazon models (Nova, Titan) use different formats
                        if 'nova' in model['id']:
                            # Nova models use messages format similar to Anthropic but without max_tokens
                            request_body = {
                                "temperature": 0.5,
                                "system": [{"text": "You are an expert ATS resume optimizer that preserves document formatting."}],
                                "messages": [
                                    {
                                        "role": "user",
                                        "content": [{"text": prompt}]
                                    }
                                ]
                            }
                        else:
                            # Titan models use a simpler format
                            request_body = {
                                "inputText": f"System: You are an expert ATS resume optimizer that preserves document formatting.\n\nHuman: {prompt}\n\nAssistant:",
                                "textGenerationConfig": {
                                    "maxTokenCount": model['max_tokens'],
                                    "temperature": 0.5,
                                    "topP": 0.9
                                }
                            }
                    elif model['id'].startswith('meta.'):
                        # Meta Llama models use messages format
                        request_body = {
                            "prompt": f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nYou are an expert ATS resume optimizer that preserves document formatting.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
                            "max_gen_len": model['max_tokens'],
                            "temperature": 0.5,
                            "top_p": 0.9
                        }
                    elif model['id'].startswith('mistral.'):
                        # Mistral models use a simple prompt format
                        request_body = {
                            "prompt": f"<s>[INST] You are an expert ATS resume optimizer that preserves document formatting.\n\n{prompt} [/INST]",
                            "max_tokens": model['max_tokens'],
                            "temperature": 0.5,
                            "top_p": 0.9,
                            "top_k": 50
                        }
                    else:
                        # Default format for unknown models
                        request_body = {
                            "prompt": prompt,
                            "max_tokens": model['max_tokens'],
                            "temperature": 0.5
                        }
                    
                    # Make the API call
                    response = bedrock_runtime.invoke_model(
                        modelId=model['id'],
                        body=json.dumps(request_body)
                    )
                    
                    # Parse the response based on model type
                    response_body = json.loads(response['body'].read())
                    
                    if model['id'] == 'us.deepseek.r1-v1:0':
                        # DeepSeek R1 response format - try multiple possible formats
                        if 'content' in response_body and response_body['content']:
                            optimized_resume = response_body['content'][0]['text']
                        elif 'output' in response_body:
                            optimized_resume = response_body['output']
                        else:
                            optimized_resume = str(response_body)
                    elif model['id'].startswith('anthropic.'):
                        optimized_resume = response_body['content'][0]['text']
                    elif model['id'].startswith('amazon.'):
                        if 'nova' in model['id']:
                            optimized_resume = response_body['output']['message']['content'][0]['text']
                        else:
                            # Titan models
                            optimized_resume = response_body['results'][0]['outputText']
                    elif model['id'].startswith('meta.'):
                        optimized_resume = response_body['generation']
                    elif model['id'].startswith('mistral.'):
                        optimized_resume = response_body['outputs'][0]['text']
                    else:
                        # Try to extract text from common response formats
                        if 'content' in response_body:
                            optimized_resume = response_body['content'][0]['text']
                        elif 'generation' in response_body:
                            optimized_resume = response_body['generation']
                        elif 'text' in response_body:
                            optimized_resume = response_body['text']
                        else:
                            optimized_resume = str(response_body)
                    
                    # Validate the response
                    if optimized_resume and len(optimized_resume.strip()) > 100:
                        print(f"[SUCCESS] Successfully used {model['name']}")
                        print(f"Response length: {len(optimized_resume)} characters")
                        
                        # Estimate cost for this request
                        estimated_input_tokens = len(prompt.split()) * 1.3  # Rough estimation
                        estimated_output_tokens = len(optimized_resume.split()) * 1.3
                        estimated_cost = (estimated_input_tokens / 1000000 * model['cost_per_1m_input']) + \
                                       (estimated_output_tokens / 1000000 * model['cost_per_1m_output'])
                        print(f"Estimated cost: ${estimated_cost:.4f} (Input: ~{estimated_input_tokens:.0f} tokens, Output: ~{estimated_output_tokens:.0f} tokens)")
                        
                        return optimized_resume, model['name']
                    else:
                        print(f"⚠️ {model['name']} returned empty/short response, trying next model...")
                        continue
                        
                except Exception as e:
                    error_msg = str(e)
                    print(f"❌ {model['name']} failed: {error_msg}")
                    last_error = e
                    
                    # Check if it's a recoverable error that should trigger fallback
                    recoverable_errors = [
                        "AccessDeniedException", 
                        "ThrottlingException", 
                        "ModelNotReadyException",
                        "ServiceUnavailableException",
                        "ValidationException",
                        "ResourceNotFoundException",
                        "ModelTimeoutException",
                        "ModelErrorException",
                        "InternalServerException",
                        "ModelStreamErrorException"
                    ]
                    
                    if any(error_type in error_msg for error_type in recoverable_errors):
                        print(f"   -> Recoverable error with {model['name']}, trying next model...")
                        continue
                    else:
                        print(f"   -> Unexpected error with {model['name']}: {error_msg}")
                        continue
            
            # If all models failed, raise the last error
            print(f"❌ All {len(AI_MODELS)} models failed. Last error: {last_error}")
            raise Exception(f"All Bedrock models failed. Last error: {str(last_error)}")
        
        try:
            print("Starting resume optimization with automatic model fallback...")
            optimized_resume, model_used = call_bedrock_with_fallback(prompt)
            print(f"Resume optimization completed successfully using {model_used}")
            
            # Check for truncated responses immediately after receiving AI response
            if optimized_resume and (
                'stop_reason": "length"' in optimized_resume or 
                ('reasoning_content' in optimized_resume and optimized_resume.count('{') != optimized_resume.count('}'))
            ):
                error_msg = "AI response was truncated due to length limits. Please try with a shorter resume or job description."
                print(f"AI Response Truncated: {error_msg}")
                update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                return {
                    'error': error_msg
                }
            
        except Exception as e:
            error_msg = f'AI service is temporarily unavailable. All models failed: {str(e)[:100]}'
            print(f"All Bedrock models failed: {str(e)}")
            
            # Instead of creating fallback resume, fail the job
            update_job_status(bucket_name, status_key, 'FAILED', error_msg)
            return {
                'error': error_msg
            }
            model_used = "Emergency Fallback"
        
        # Update status to finalizing
        update_job_status(bucket_name, status_key, 'PROCESSING', 'Finalizing optimized resume')
        
        # Parse the JSON response from Claude
        try:
            # Extract JSON from the response with multiple fallback strategies
            import re
            resume_json = None
            
            print(f"Raw AI response (first 500 chars): {optimized_resume[:500]}")
            
            # Fix ligature characters in the raw response before JSON parsing
            def fix_ligatures_in_text(text):
                if not isinstance(text, str):
                    return text
                ligature_fixes = {
                    'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'ft', 'ﬆ': 'st'
                }
                for ligature, replacement in ligature_fixes.items():
                    text = text.replace(ligature, replacement)
                return text
            
            # Apply ligature fixes to the raw response
            optimized_resume = fix_ligatures_in_text(optimized_resume)
            
            # Parse the AI response for JSON format
            actual_content = parse_ai_response(optimized_resume, "json")
            
            # Strategy 1: Look for JSON in code blocks (```json...``` or ```...```)
            json_patterns = [
                r'```json\s*(.*?)\s*```',
                r'```\s*(.*?)\s*```',
                r'```json\n(.*?)\n```',
                r'```\n(.*?)\n```'
            ]
            
            for pattern in json_patterns:
                json_match = re.search(pattern, actual_content, re.DOTALL)
                if json_match:
                    try:
                        json_content = json_match.group(1).strip()
                        # Apply ligature fixes to the extracted JSON content
                        json_content = fix_ligatures_in_text(json_content)
                        resume_json = json.loads(json_content)
                        print(f"Successfully parsed JSON from code block with pattern: {pattern}")
                        break
                    except json.JSONDecodeError as e:
                        print(f"Failed to parse JSON from pattern {pattern}: {str(e)}")
                        print(f"Problematic JSON content: {json_match.group(1).strip()[:200]}...")
                        continue
            
            # Strategy 2: Look for JSON between curly braces (entire object)
            if not resume_json:
                brace_match = re.search(r'\{.*\}', actual_content, re.DOTALL)
                if brace_match:
                    try:
                        json_content = brace_match.group(0)
                        # Apply ligature fixes to the extracted JSON content
                        json_content = fix_ligatures_in_text(json_content)
                        resume_json = json.loads(json_content)
                        print("Successfully parsed JSON from braces")
                    except json.JSONDecodeError as e:
                        print(f"Failed to parse JSON from braces: {str(e)}")
                        print(f"Problematic JSON content: {brace_match.group(0)[:200]}...")
            
            # Strategy 3: Try to parse the entire response as JSON
            if not resume_json:
                try:
                    content_to_parse = fix_ligatures_in_text(actual_content.strip())
                    resume_json = json.loads(content_to_parse)
                    print("Successfully parsed entire response as JSON")
                except json.JSONDecodeError as e:
                    print(f"Failed to parse entire response as JSON: {str(e)}")
                    print(f"Problematic content: {actual_content.strip()[:200]}...")
            
            # Strategy 4: Look for JSON-like structure and clean it
            if not resume_json:
                # Try to find and extract a JSON object more aggressively
                lines = actual_content.split('\n')
                json_lines = []
                in_json = False
                brace_count = 0
                
                for line in lines:
                    if '{' in line and not in_json:
                        in_json = True
                        brace_count = line.count('{') - line.count('}')
                        json_lines.append(line)
                    elif in_json:
                        json_lines.append(line)
                        brace_count += line.count('{') - line.count('}')
                        if brace_count <= 0:
                            break
                
                if json_lines:
                    try:
                        json_text = '\n'.join(json_lines)
                        # Apply additional cleaning for common JSON issues
                        json_text = fix_common_json_issues(json_text)
                        resume_json = json.loads(json_text)
                        print("Successfully parsed JSON using line-by-line extraction")
                    except json.JSONDecodeError as e:
                        print(f"Failed to parse extracted JSON: {str(e)}")
                        print(f"Problematic JSON text (first 500 chars): {json_text[:500]}")
                        
                        # Try one more aggressive fix
                        try:
                            fixed_json = fix_malformed_json_aggressive(json_text)
                            resume_json = json.loads(fixed_json)
                            print("Successfully parsed JSON after aggressive fixing")
                        except Exception as fix_error:
                            print(f"Aggressive JSON fix also failed: {str(fix_error)}")
            
            if not resume_json:
                print("All JSON parsing strategies failed, creating fallback structure")
                print(f"Full AI response for debugging: {optimized_resume}")
                
                # Log the specific issue for debugging
                print("=== DEBUGGING AI RESPONSE ===")
                print(f"Response length: {len(optimized_resume)}")
                print(f"Response type: {type(optimized_resume)}")
                print(f"First 1000 characters: {optimized_resume[:1000]}")
                print(f"Last 500 characters: {optimized_resume[-500:]}")
                print("=== END DEBUG ===")
                
                # Instead of creating fallback resume, fail the job
                error_msg = "AI service returned an invalid response format. Please try with a different resume or contact support."
                print(f"AI Response Parsing Failed: {error_msg}")
                update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                return {
                    'error': error_msg
                }
            else:
                print("Successfully prepared JSON response")
                
                # Fix ligature characters that AI sometimes returns in text fields
                def fix_ligatures(text):
                    if not isinstance(text, str):
                        return text
                    ligature_fixes = {
                        'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'ft', 'ﬆ': 'st'
                    }
                    for ligature, replacement in ligature_fixes.items():
                        text = text.replace(ligature, replacement)
                    return text
                
                # Apply ligature fixes to all text fields
                if 'contact_info' in resume_json:
                    resume_json['contact_info'] = fix_ligatures(resume_json['contact_info'])
                if 'professional_summary' in resume_json:
                    resume_json['professional_summary'] = fix_ligatures(resume_json['professional_summary'])
                if 'full_name' in resume_json:
                    resume_json['full_name'] = fix_ligatures(resume_json['full_name'])
                
                # Fix ligatures in experience and education sections
                for exp in resume_json.get('experience', []):
                    for key in ['title', 'company', 'dates']:
                        if key in exp:
                            exp[key] = fix_ligatures(exp[key])
                    if 'achievements' in exp:
                        exp['achievements'] = [fix_ligatures(ach) for ach in exp['achievements']]
                
                for edu in resume_json.get('education', []):
                    for key in ['degree', 'school', 'dates']:
                        if key in edu:
                            edu[key] = fix_ligatures(edu[key])
                
                print("Applied ligature fixes to resume JSON")
            
            # Debug: Check content preservation
            experience_count = len(resume_json.get('experience', []))
            print(f"Generated resume has {experience_count} experience entries")
            
            for i, exp in enumerate(resume_json.get('experience', [])):
                achievement_count = len(exp.get('achievements', []))
                print(f"Experience {i+1} ({exp.get('title', 'Unknown')}) has {achievement_count} achievements")
            
            # Generate output based on requested format
            print(f"Generating resume in format: {output_format}")
            print(f"Resume JSON keys: {list(resume_json.keys()) if resume_json else 'None'}")
            print(f"Resume JSON sample: {str(resume_json)[:200] if resume_json else 'None'}...")
            print(f"Dual format mode: {dual_format_mode}")
            
            if dual_format_mode:
                print("🎉 DUAL FORMAT: Generating both PDF and Word resumes...")
                
                # Generate PDF resume
                pdf_content = None
                try:
                    print("📄 Creating PDF resume...")
                    from pdf_generator import create_pdf_resume
                    pdf_content = create_pdf_resume(resume_json)
                    print(f"✅ PDF resume generated, size: {len(pdf_content)} bytes")
                except Exception as pdf_error:
                    print(f"❌ Error creating PDF resume: {str(pdf_error)}")
                
                # Generate Word resume
                word_content = None
                try:
                    print("📝 Creating Word resume...")
                    word_buffer = create_ats_resume_word_document(resume_json)
                    word_content = word_buffer.getvalue()
                    print(f"✅ Word resume generated, size: {len(word_content)} bytes")
                except Exception as word_error:
                    print(f"❌ Error creating Word resume: {str(word_error)}")
                    try:
                        # Fallback to RTF-based Word generator
                        print("Trying RTF-based Word generator...")
                        word_content = create_rtf_word_resume(resume_json)
                        print("✅ Word resume generated using RTF-based approach")
                    except Exception as rtf_error:
                        print(f"❌ RTF generator also failed: {str(rtf_error)}")
                
                # Use Word as primary format for backward compatibility
                if word_content:
                    optimized_resume = word_content
                    output_extension = 'docx'
                    content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    is_binary = True
                elif pdf_content:
                    optimized_resume = pdf_content
                    output_extension = 'pdf'
                    content_type = 'application/pdf'
                    is_binary = True
                else:
                    # Both formats failed - fail the job instead of creating error content
                    error_msg = "Dual format generation failed for both PDF and Word formats. Please contact support."
                    print(f"Dual Format Generation Failed: {error_msg}")
                    update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                    return {
                        'error': error_msg
                    }
                
                print(f"Dual format generation complete - primary format: {output_extension}")
                
            elif output_format.lower() == 'pdf':
                try:
                    print("Starting direct PDF generation...")
                    
                    # Generate PDF directly from resume JSON using fpdf2
                    from pdf_generator import create_pdf_resume
                    pdf_content = create_pdf_resume(resume_json)
                    print(f"PDF generation completed, size: {len(pdf_content)} bytes")
                    
                    output_extension = 'pdf'
                    content_type = 'application/pdf'
                    is_binary = True
                    optimized_resume = pdf_content
                    
                    print("Successfully generated PDF document with professional formatting")
                    
                except Exception as pdf_error:
                    print(f"Error generating PDF document: {str(pdf_error)}")
                    # PDF generation failed - fail the job instead of creating error resume
                    error_msg = f"PDF generation failed: {str(pdf_error)[:100]}. Please try Word format or contact support."
                    print(f"PDF Generation Failed: {error_msg}")
                    update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                    return {
                        'error': error_msg
                    }
            elif output_format.lower() == 'word':
                try:
                    print("Starting ATS-friendly Word document generation...")
                    print("Using professional ATS resume format...")
                    
                    # Create ATS-friendly Word document directly from JSON
                    word_buffer = create_ats_resume_word_document(resume_json)
                    word_content = word_buffer.getvalue()
                    print(f"ATS Word generation completed, content size: {len(word_content)} bytes")
                    
                    output_extension = 'docx'
                    content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    is_binary = True
                    optimized_resume = word_content
                    
                    print("Successfully generated ATS-friendly Word document")
                    
                except Exception as ats_error:
                    print(f"Error using ATS Word generator: {str(ats_error)}")
                    try:
                        # Fall back to RTF-based Word generator
                        print("Trying RTF-based Word generator...")
                        word_content = create_rtf_word_resume(resume_json)
                        
                        output_extension = 'docx'
                        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        is_binary = True
                        optimized_resume = word_content
                        
                        print("Successfully generated Word document using RTF-based approach")
                    except Exception as rtf_error:
                        print(f"RTF generator also failed: {str(rtf_error)}")
                        try:
                            # Final fallback: create simple Word document with text content
                            print("Trying simple Word document with text content...")
                            text_resume = create_text_resume(resume_json)
                            word_buffer = create_cover_letter_word_document(text_resume)
                            word_content = word_buffer.getvalue()
                            
                            output_extension = 'docx'
                            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                            is_binary = True
                            optimized_resume = word_content
                            
                            print("Successfully generated simple Word document with text content")
                        except Exception as final_error:
                            print(f"All Word generation methods failed: {str(final_error)}")
                            # Word generation failed - fail the job instead of creating error content
                            error_msg = f"Word generation failed: {str(final_error)[:100]}. Please try PDF format or contact support."
                            print(f"Word Generation Failed: {error_msg}")
                            update_job_status(bucket_name, status_key, 'FAILED', error_msg)
                            return {
                                'error': error_msg
                            }
            elif output_format.lower() in ['text', 'txt']:
                # Generate text format
                print("Generating text format resume...")
                text_resume = create_text_resume(resume_json)
            else:
                # Default fallback to text format
                print(f"Unknown format '{output_format}', defaulting to text format...")
                text_resume = create_text_resume(resume_json)
                
                if text_resume:
                    output_extension = 'txt'
                    content_type = 'text/plain'
                    is_binary = False
                    optimized_resume = text_resume
                else:
                    # Fall back to raw JSON
                    output_extension = 'txt'
                    content_type = 'text/plain'
                    is_binary = False
                    optimized_resume = f"Failed to create formatted resume. Here's the raw response:\n\n{optimized_resume}"
            
        except Exception as e:
            print(f"Error parsing JSON response: {str(e)}")
            print(f"Raw response that failed to parse: {optimized_resume[:500]}...")
            
            # Instead of creating fallback resume, fail the job
            error_msg = f"AI service returned invalid JSON format: {str(e)[:100]}. Please try with a different resume or contact support."
            print(f"JSON Parsing Failed: {error_msg}")
            update_job_status(bucket_name, status_key, 'FAILED', error_msg)
            return {
                'error': error_msg
            }
            
            if output_format.lower() == 'pdf':
                try:
                    from pdf_generator import create_minimal_pdf
                    optimized_resume = create_minimal_pdf(error_text)
                    print("Created error PDF for JSON parsing failure")
                except Exception as pdf_error:
                    print(f"Could not create error PDF: {str(pdf_error)}")
                    optimized_resume = error_text.encode('utf-8')
            elif output_format.lower() == 'word':
                try:
                    optimized_resume = create_cover_letter_word_document(error_text)
                    print("Created error Word document for JSON parsing failure")
                except Exception as word_error:
                    print(f"Could not create error Word document: {str(word_error)}")
                    optimized_resume = error_text.encode('utf-8')
            else:
                optimized_resume = error_text
        
        # Store the optimized resume(s)
        optimized_key = f"users/{user_id}/optimized/{job_id}/resume.{output_extension}"
        
        print(f"Final format variables - extension: {output_extension}, content_type: {content_type}, is_binary: {is_binary}")
        print(f"Storing resume with key: {optimized_key}")
        
        # Initialize dual format URLs
        pdf_url = None
        word_url = None
        pdf_filename = None
        word_filename = None
        
        if dual_format_mode and 'pdf_content' in locals() and 'word_content' in locals():
            print("🎉 DUAL FORMAT: Uploading both PDF and Word resumes...")
            
            # Upload PDF resume
            if pdf_content:
                try:
                    pdf_key = f"users/{user_id}/optimized/{job_id}/resume.pdf"
                    pdf_filename = f"optimized_resume_{job_id[:8]}.pdf"
                    
                    s3.put_object(
                        Bucket=bucket_name,
                        Key=pdf_key,
                        Body=pdf_content,
                        ContentType='application/pdf'
                    )
                    
                    pdf_url = s3.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': bucket_name,
                            'Key': pdf_key,
                            'ResponseContentDisposition': f'attachment; filename="{pdf_filename}"',
                            'ResponseContentType': 'application/pdf'
                        },
                        ExpiresIn=3600
                    )
                    print(f"✅ PDF resume uploaded: {pdf_filename}")
                except Exception as pdf_error:
                    print(f"❌ Error uploading PDF resume: {str(pdf_error)}")
            
            # Upload Word resume
            if word_content:
                try:
                    word_key = f"users/{user_id}/optimized/{job_id}/resume.docx"
                    word_filename = f"optimized_resume_{job_id[:8]}.docx"
                    
                    s3.put_object(
                        Bucket=bucket_name,
                        Key=word_key,
                        Body=word_content,
                        ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    )
                    
                    word_url = s3.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': bucket_name,
                            'Key': word_key,
                            'ResponseContentDisposition': f'attachment; filename="{word_filename}"',
                            'ResponseContentType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        },
                        ExpiresIn=3600
                    )
                    print(f"✅ Word resume uploaded: {word_filename}")
                except Exception as word_error:
                    print(f"❌ Error uploading Word resume: {str(word_error)}")
        
        # Upload primary resume (for backward compatibility and single format)
        if is_binary:
            # Store binary content directly
            s3.put_object(
                Bucket=bucket_name,
                Key=optimized_key,
                Body=optimized_resume,
                ContentType=content_type
            )
        else:
            # Store text content
            s3.put_object(
                Bucket=bucket_name,
                Key=optimized_key,
                Body=optimized_resume.encode('utf-8'),
                ContentType=content_type
            )
        
        # Also store a text version for preview (if we have the JSON data)
        preview_text = ""
        if 'resume_json' in locals() and resume_json:
            try:
                # Generate text preview that matches the exact AI-generated format
                preview_lines = []
                
                # Header - Full Name (prominently displayed)
                if resume_json.get('full_name'):
                    preview_lines.append(resume_json['full_name'].upper())
                    preview_lines.append("=" * len(resume_json['full_name']))
                    preview_lines.append("")
                
                # Contact Information
                if resume_json.get('contact_info'):
                    preview_lines.append(resume_json['contact_info'])
                    preview_lines.append("")
                
                # Professional Summary
                if resume_json.get('professional_summary'):
                    preview_lines.append("PROFESSIONAL SUMMARY")
                    preview_lines.append("=" * 20)
                    preview_lines.append(resume_json['professional_summary'])
                    preview_lines.append("")
                
                # Skills
                if resume_json.get('skills'):
                    preview_lines.append("CORE COMPETENCIES")
                    preview_lines.append("=" * 17)
                    skills_list = resume_json['skills']
                    if isinstance(skills_list, list):
                        # Display skills in a clean format, 3-4 per line
                        for i in range(0, len(skills_list), 4):
                            line_skills = skills_list[i:i+4]
                            preview_lines.append(" • ".join(line_skills))
                    else:
                        preview_lines.append(str(skills_list))
                    preview_lines.append("")
                
                # Professional Experience
                if resume_json.get('experience'):
                    preview_lines.append("PROFESSIONAL EXPERIENCE")
                    preview_lines.append("=" * 25)
                    preview_lines.append("")
                    
                    for i, exp in enumerate(resume_json['experience']):
                        # Job Title and Dates on first line (formatted for text display)
                        title_dates_line = ""
                        if exp.get('title') and exp.get('dates'):
                            # Format with spacing to simulate alignment
                            title = exp['title']
                            dates = exp['dates']
                            # Simple text formatting - title on left, dates on right
                            spacing = max(1, 60 - len(title))  # Adjust spacing based on title length
                            title_dates_line = f"{title}{' ' * spacing}{dates}"
                        elif exp.get('title'):
                            title_dates_line = exp['title']
                        elif exp.get('dates'):
                            title_dates_line = exp['dates']
                        
                        if title_dates_line:
                            preview_lines.append(title_dates_line)
                        
                        # Company and Location on second line (formatted for text display)
                        company_line = ""
                        if exp.get('company') and exp.get('location'):
                            # Format with spacing to simulate alignment
                            company = exp['company']
                            location = exp['location']
                            spacing = max(1, 60 - len(company))  # Adjust spacing based on company length
                            company_line = f"{company}{' ' * spacing}{location}"
                        elif exp.get('company'):
                            company_line = exp['company']
                        
                        if company_line:
                            preview_lines.append(company_line)
                        
                        preview_lines.append("")
                        
                        # Achievements (exactly as generated by AI)
                        if exp.get('achievements'):
                            for achievement in exp['achievements']:
                                preview_lines.append(f"• {achievement}")
                        
                        # Add spacing between positions (except for the last one)
                        if i < len(resume_json['experience']) - 1:
                            preview_lines.append("")
                            preview_lines.append("-" * 60)
                            preview_lines.append("")
                        else:
                            preview_lines.append("")
                
                # Education (exactly as preserved by AI)
                if resume_json.get('education'):
                    preview_lines.append("EDUCATION")
                    preview_lines.append("=" * 9)
                    preview_lines.append("")
                    
                    for edu in resume_json['education']:
                        # Degree and Institution
                        if edu.get('degree') and edu.get('institution'):
                            preview_lines.append(f"{edu['degree']} | {edu['institution']}")
                        elif edu.get('degree'):
                            preview_lines.append(edu['degree'])
                        elif edu.get('institution'):
                            preview_lines.append(edu['institution'])
                        
                        # Dates
                        if edu.get('dates'):
                            preview_lines.append(edu['dates'])
                        
                        # Details (if any were preserved from original)
                        if edu.get('details'):
                            preview_lines.append(edu['details'])
                        
                        preview_lines.append("")
                
                # Handle any additional sections that might be in the JSON
                # (The AI might include other sections based on the original resume)
                for key, value in resume_json.items():
                    if key not in ['full_name', 'contact_info', 'professional_summary', 'skills', 'experience', 'education']:
                        if value and isinstance(value, (list, str)):
                            section_title = key.replace('_', ' ').upper()
                            preview_lines.append(section_title)
                            preview_lines.append("=" * len(section_title))
                            
                            if isinstance(value, list):
                                for item in value:
                                    if isinstance(item, dict):
                                        # Handle complex objects
                                        for sub_key, sub_value in item.items():
                                            if sub_value:
                                                preview_lines.append(f"{sub_key.replace('_', ' ').title()}: {sub_value}")
                                    else:
                                        preview_lines.append(f"• {item}")
                            else:
                                preview_lines.append(str(value))
                            
                            preview_lines.append("")
                
                preview_text = "\n".join(preview_lines)
                
                # Store the text preview
                preview_key = f"users/{user_id}/optimized/{job_id}/preview.txt"
                s3.put_object(
                    Bucket=bucket_name,
                    Key=preview_key,
                    Body=preview_text.encode('utf-8'),
                    ContentType='text/plain'
                )
                
                print(f"Stored AI-format-matching text preview at {preview_key}")
                print(f"Preview text length: {len(preview_text)} characters")
                print(f"Resume JSON keys: {list(resume_json.keys())}")
                
            except Exception as e:
                print(f"Error generating text preview: {str(e)}")
                import traceback
                print(f"Full traceback: {traceback.format_exc()}")
                preview_text = "Preview generation failed. Please download the resume to view the complete content."
        
        # Generate pre-signed URL for download (valid for 1 hour)
        filename = f"optimized_resume.{output_extension}"
        
        try:
            optimized_url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': optimized_key,
                    'ResponseContentDisposition': f'attachment; filename="{filename}"',
                    'ResponseContentType': content_type
                },
                ExpiresIn=3600  # 1 hour
            )
        except Exception as e:
            print(f"Error generating presigned URL: {str(e)}")
            # Fallback to basic presigned URL without custom headers
            optimized_url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': optimized_key
                },
                ExpiresIn=3600
            )
        
        # Also generate a direct download URL for the frontend to use
        download_filename = f"optimized_resume_{job_id[:8]}.{output_extension}"
        
        # Generate cover letter if CV toggle is enabled
        cover_letter_text = None
        if generate_cv:
            try:
                print(f"CV toggle enabled: {generate_cv}")
                print(f"Company name key: {company_name_key}")
                print("Generating cover letter...")
                
                # Update status to cover letter generation
                update_job_status(bucket_name, status_key, 'PROCESSING', 'Generating cover letter')
                
                # Get company name from S3 if key is provided, otherwise use a default
                company_name = ""
                if company_name_key:
                    try:
                        company_name_obj = s3.get_object(Bucket=bucket_name, Key=company_name_key)
                        company_name = company_name_obj['Body'].read().decode('utf-8').strip()
                    except Exception as e:
                        print(f"Error retrieving company name from S3: {str(e)}")
                        company_name = "the company"  # Fallback
                else:
                    print("No company name key provided, using fallback")
                    company_name = "the company"  # Fallback when no company name is provided
                
                # Create cover letter prompt with your specified format
                job_desc_text = job_description if job_description and job_description.strip() else "No specific job description provided - focus on general qualifications for the role"
                
                # Get current date
                current_date = datetime.now().strftime("%B %d, %Y")
                
                cover_letter_prompt = f"""
                Create a professional cover letter using the provided information. You must research the company and provide actual, real information - NO PLACEHOLDERS allowed.

                CRITICAL OUTPUT REQUIREMENT: 
                - Provide ONLY the final cover letter text
                - Do NOT include any reasoning, thinking process, or explanations
                - Do NOT include phrases like "Let me think", "I need to", or any meta-commentary
                - Start directly with the candidate's contact information

                IMPORTANT REQUIREMENTS:
                1. Use the ACTUAL current date: {current_date}
                2. Research {company_name} and find their real headquarters/main office address
                3. Extract the candidate's actual name, email, phone, and location from the resume
                4. Write specific content about how the candidate aligns with {company_name}'s mission, values, and goals
                5. NO placeholders like [Current Date], [Company Address], [X years], [Candidate Name], etc.
                6. Make it highly personalized to {company_name} and the {job_title} role
                7. CRITICAL: When mentioning experience, be accurate about time spent in specific roles vs. total career experience
                8. Do NOT claim the candidate has X years in a specific title unless they actually held that exact title for that duration

                Job Title: {job_title}
                Company: {company_name}
                Job Description: {job_desc_text}
                
                Resume Content: {create_text_resume(resume_json)[:2000] if 'resume_json' in locals() and resume_json else resume_text[:2000]}...

                EXPERIENCE ACCURACY INSTRUCTIONS:
                - Calculate total years of professional experience across all roles
                - Identify the most relevant role/title for this position
                - Calculate years spent in that specific role (not total career)
                - Use phrases like "X years of experience in [field/industry]" for total experience
                - Use phrases like "including Y years as [specific title]" for role-specific experience
                - Example: "8 years of experience in data engineering, including 3 years as a Senior Data Engineer"
                - NEVER claim someone has X years as a specific title unless they held that exact title for that duration

                Format the cover letter EXACTLY like this structure, but with REAL information:

                [CANDIDATE NAME FROM RESUME]
                [CANDIDATE EMAIL] | [CANDIDATE PHONE] | [CANDIDATE LOCATION]

                {current_date}


                Hiring Manager
                {company_name}
                [RESEARCH AND PROVIDE ACTUAL COMPANY ADDRESS]

                Dear Hiring Manager,

                I am excited to apply for the {job_title} position at {company_name}. With [EXTRACT ACTUAL YEARS OF EXPERIENCE] years of experience in [ANALYZE RESUME TEXT AND EXTRACT BROAD TECHNICAL FIELD - e.g., software engineering, data engineering, product management, etc.], I am confident that I have the skills and expertise to make a significant contribution to your team.

                [Write a compelling paragraph highlighting the candidate's most relevant experience and achievements from their resume that directly match the job requirements. Use specific examples and quantifiable results.]

                [Write a second paragraph demonstrating specific skills and accomplishments that align with the job description. Include how the candidate's experience relates to {company_name}'s industry, products, or services. Research {company_name}'s mission and explain how the candidate's values and experience align with the company's goals.]

                Your posting for the {job_title} role aligns perfectly with my background and passion for [EXTRACT RELEVANT FIELD FROM RESUME]. Throughout my career progression from [MENTION EARLIER ROLES] to [CURRENT/RECENT ROLE], I have developed expertise in [EXTRACT RELEVANT SKILLS]. I am particularly drawn to {company_name}'s [RESEARCH AND MENTION SPECIFIC COMPANY VALUES, MISSION, OR RECENT INITIATIVES]. I am excited about the opportunity to leverage my skills in [EXTRACT RELEVANT SKILLS FROM RESUME THAT MATCH JOB DESCRIPTION] to drive impactful solutions at {company_name}.

                Thank you for considering my application. I welcome the opportunity to discuss my qualifications further and learn more about this exciting position. I look forward to hearing from you.

                Regards,
                [CANDIDATE NAME FROM RESUME]

                CRITICAL: Return ONLY the completed cover letter text. No JSON, no markdown, no code blocks, no explanations, no reasoning. Just the plain cover letter text starting with the candidate's name.
                """
                
                # Generate cover letter using the same AI model
                cover_letter_response, _ = call_bedrock_with_fallback(cover_letter_prompt)
                
                # Parse the cover letter response for text format
                cover_letter_text = parse_ai_response(cover_letter_response, "text")
                
                # DEBUG: Log the raw AI response and parsed content
                print(f"DEBUG: Raw AI response type: {type(cover_letter_response)}")
                print(f"DEBUG: Raw AI response length: {len(str(cover_letter_response))}")
                print(f"DEBUG: Raw AI response first 500 chars: {repr(str(cover_letter_response)[:500])}")
                print(f"DEBUG: Parsed cover letter text length: {len(cover_letter_text)}")
                print(f"DEBUG: Parsed cover letter first 500 chars: {repr(cover_letter_text[:500])}")
                print(f"DEBUG: Contains candidate name 'Abid Shaik': {'Abid Shaik' in cover_letter_text}")
                print(f"DEBUG: Contains company 'Netflix': {'Netflix' in cover_letter_text}")
                print(f"DEBUG: Contains placeholders [CANDIDATE: {'[CANDIDATE' in cover_letter_text}")
                print(f"DEBUG: Contains placeholders [EXTRACT: {'[EXTRACT' in cover_letter_text}")
                
                # DISABLED: Regex pattern cleaning - the AI response is already clean
                # These regex patterns were incorrectly removing header content from valid cover letters
                print("DEBUG: Skipping regex pattern cleaning - AI response is already clean")
                
                # Clean up excessive spacing while maintaining professional structure
                def clean_cover_letter_spacing(text):
                    """Remove only excessive spacing while preserving professional paragraph structure"""
                    if not text:
                        return text
                    
                    # Split into lines
                    lines = text.split('\n')
                    cleaned_lines = []
                    
                    # Remove only truly excessive empty lines (3+ consecutive)
                    empty_count = 0
                    for line in lines:
                        line = line.strip()
                        if not line:
                            empty_count += 1
                            # Keep up to 2 empty lines for professional spacing
                            if empty_count <= 2:
                                cleaned_lines.append('')
                        else:
                            empty_count = 0
                            cleaned_lines.append(line)
                    
                    # Remove trailing empty lines
                    while cleaned_lines and not cleaned_lines[-1]:
                        cleaned_lines.pop()
                    
                    return '\n'.join(cleaned_lines)
                
                cover_letter_text = clean_cover_letter_spacing(cover_letter_text)
                
                # DISABLED: AI reasoning detection - the AI response is already clean and perfect
                # Since the AI response is already properly formatted, we don't need to detect/remove AI reasoning
                print("DEBUG: Using AI response as-is - no reasoning detection needed")
                
                cover_letter_text = cover_letter_text.strip()
                
                print(f"Cover letter generated successfully (length: {len(cover_letter_text)})")
                print(f"Cover letter preview (first 200 chars): {cover_letter_text[:200]}...")
                print(f"Cover letter lines count: {len(cover_letter_text.split(chr(10)))}")
                
                # DEBUG: Final content analysis before PDF generation
                print(f"DEBUG: FINAL cover letter analysis:")
                print(f"DEBUG: - Length: {len(cover_letter_text)}")
                print(f"DEBUG: - Lines: {len(cover_letter_text.split(chr(10)))}")
                print(f"DEBUG: - First line: {repr(cover_letter_text.split(chr(10))[0] if cover_letter_text.split(chr(10)) else 'EMPTY')}")
                print(f"DEBUG: - Contains Netflix: {'Netflix' in cover_letter_text}")
                print(f"DEBUG: - Contains Abid Shaik: {'Abid Shaik' in cover_letter_text}")
                print(f"DEBUG: - Contains [CANDIDATE: {'[CANDIDATE' in cover_letter_text}")
                print(f"DEBUG: - Contains [EXTRACT: {'[EXTRACT' in cover_letter_text}")
                print(f"DEBUG: - Contains template text 'Your posting for the': {'Your posting for the' in cover_letter_text}")
                print(f"DEBUG: - Full content (first 1000 chars): {repr(cover_letter_text[:1000])}")
                
                # Generate cover letter file(s) and upload to S3
                cover_letter_url = None
                cover_letter_filename = None
                cover_letter_pdf_url = None
                cover_letter_word_url = None
                cover_letter_pdf_filename = None
                cover_letter_word_filename = None
                
                try:
                    print("Starting cover letter file creation...")
                    print(f"Cover letter dual format mode: {cover_letter_dual_format_mode}")
                    
                    if cover_letter_dual_format_mode:
                        print("🎉 DUAL FORMAT: Generating both PDF and Word cover letters...")
                        
                        # Generate PDF cover letter
                        try:
                            print("📄 Creating PDF cover letter...")
                            from pdf_generator import create_pdf_cover_letter
                            pdf_buffer = create_pdf_cover_letter(cover_letter_text, f"Cover Letter - {job_title}")
                            
                            # Upload PDF to S3
                            pdf_filename = f"cover_letter_{job_id}.pdf"
                            pdf_key = f"users/{user_id}/results/{job_id}/{pdf_filename}"
                            
                            s3.put_object(
                                Bucket=bucket_name,
                                Key=pdf_key,
                                Body=pdf_buffer,
                                ContentType='application/pdf'
                            )
                            
                            # Generate PDF pre-signed URL
                            cover_letter_pdf_url = s3.generate_presigned_url(
                                'get_object',
                                Params={
                                    'Bucket': bucket_name,
                                    'Key': pdf_key,
                                    'ResponseContentDisposition': f'attachment; filename="{pdf_filename}"',
                                    'ResponseContentType': 'application/pdf'
                                },
                                ExpiresIn=3600
                            )
                            cover_letter_pdf_filename = pdf_filename
                            print(f"✅ PDF cover letter uploaded: {pdf_filename}")
                            
                        except Exception as pdf_error:
                            print(f"❌ Error creating PDF cover letter: {str(pdf_error)}")
                        
                        # Generate Word cover letter
                        try:
                            print("📝 Creating Word cover letter...")
                            word_buffer = create_cover_letter_word_document(cover_letter_text)
                            
                            # Upload Word to S3
                            word_filename = f"cover_letter_{job_id}.docx"
                            word_key = f"users/{user_id}/results/{job_id}/{word_filename}"
                            
                            s3.put_object(
                                Bucket=bucket_name,
                                Key=word_key,
                                Body=word_buffer.getvalue(),
                                ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                            )
                            
                            # Generate Word pre-signed URL
                            cover_letter_word_url = s3.generate_presigned_url(
                                'get_object',
                                Params={
                                    'Bucket': bucket_name,
                                    'Key': word_key,
                                    'ResponseContentDisposition': f'attachment; filename="{word_filename}"',
                                    'ResponseContentType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                                },
                                ExpiresIn=3600
                            )
                            cover_letter_word_filename = word_filename
                            print(f"✅ Word cover letter uploaded: {word_filename}")
                            
                        except Exception as word_error:
                            print(f"❌ Error creating Word cover letter: {str(word_error)}")
                        
                        # Set legacy URL to PDF for backward compatibility
                        cover_letter_url = cover_letter_pdf_url
                        cover_letter_filename = cover_letter_pdf_filename
                        
                    else:
                        # Single format mode (legacy behavior)
                        print(f"Single format mode - generating {cover_letter_format} cover letter...")
                        
                        if cover_letter_format == 'word':
                            print("✅ Creating Word document for cover letter...")
                            cover_letter_buffer = create_cover_letter_word_document(cover_letter_text)
                            cover_letter_content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                            cover_letter_extension = 'docx'
                            print(f"✅ Word document created, buffer size: {len(cover_letter_buffer.getvalue())} bytes")
                        elif cover_letter_format == 'pdf':
                            print("📄 Creating PDF document for cover letter...")
                            from pdf_generator import create_pdf_cover_letter
                            cover_letter_buffer = create_pdf_cover_letter(cover_letter_text, f"Cover Letter - {job_title}")
                            cover_letter_content_type = 'application/pdf'
                            cover_letter_extension = 'pdf'
                            print(f"📄 PDF document created, buffer size: {len(cover_letter_buffer)} bytes")
                        else:  # text format
                            print(f"📝 Creating text file for cover letter (format was: '{cover_letter_format}')...")
                            import io
                            cover_letter_buffer = io.BytesIO(cover_letter_text.encode('utf-8'))
                            cover_letter_content_type = 'text/plain'
                            cover_letter_extension = 'txt'
                            print(f"📝 Text file created, buffer size: {len(cover_letter_buffer.getvalue())} bytes")
                        
                        # Upload single format file
                        cover_letter_filename = f"cover_letter_{job_id}.{cover_letter_extension}"
                        cover_letter_key = f"users/{user_id}/results/{job_id}/{cover_letter_filename}"
                        
                        # Handle different buffer types (bytearray for PDF, BytesIO for Word/text)
                        if hasattr(cover_letter_buffer, 'getvalue'):
                            cover_letter_body = cover_letter_buffer.getvalue()
                        else:
                            cover_letter_body = cover_letter_buffer
                        
                        s3.put_object(
                            Bucket=bucket_name,
                            Key=cover_letter_key,
                            Body=cover_letter_body,
                            ContentType=cover_letter_content_type
                        )
                        
                        # Generate pre-signed URL
                        cover_letter_url = s3.generate_presigned_url(
                            'get_object',
                            Params={
                                'Bucket': bucket_name,
                                'Key': cover_letter_key,
                                'ResponseContentDisposition': f'attachment; filename="{cover_letter_filename}"',
                                'ResponseContentType': cover_letter_content_type
                            },
                            ExpiresIn=3600
                        )
                        
                        print(f"Cover letter uploaded to S3 and download URL generated: {cover_letter_url[:50]}...")
                    
                except Exception as e:
                    print(f"Error creating cover letter file: {str(e)}")
                    print(f"Error type: {type(e).__name__}")
                    import traceback
                    print(f"Full traceback: {traceback.format_exc()}")
                    # Continue without cover letter file if generation fails
                    cover_letter_url = None
                    cover_letter_filename = None
                    cover_letter_pdf_url = None
                    cover_letter_word_url = None
                    cover_letter_pdf_filename = None
                    cover_letter_word_filename = None
                
            except Exception as e:
                print(f"Error generating cover letter: {str(e)}")
                # Continue without cover letter if generation fails
                cover_letter_text = None
        
        # Calculate ATS score for the optimized resume
        ats_score = None
        try:
            if job_description and job_description.strip() and resume_json:
                # Convert resume JSON to text for ATS scoring
                resume_text_for_ats = create_text_resume(resume_json)
                ats_score = calculate_ats_score(resume_text_for_ats, job_description, job_title)
                print(f"ATS Score calculated: {ats_score}")
        except Exception as e:
            print(f"Error calculating ATS score: {str(e)}")
            ats_score = None

        # Record in DynamoDB
        if table_name:
            table = dynamodb.Table(table_name)
            try:
                table.put_item(
                    Item={
                        'userId': user_id,
                        'jobId': job_id,
                        'timestamp': datetime.now().isoformat(),
                        'originalResumeKey': resume_key,
                        'jobDescriptionKey': job_desc_key,
                        'optimizedResumeKey': optimized_key
                    }
                )
            except Exception as e:
                print(f"Error recording to DynamoDB: {str(e)}")
                # Continue even if DynamoDB recording fails
        
        # Update status to completed
        skills_summary = ""
        if skills_processing_result:
            new_skills = skills_processing_result.get('new_skills_added', 0)
            updated_skills = skills_processing_result.get('existing_skills_updated', 0)
            if new_skills > 0 or updated_skills > 0:
                skills_summary = f" | Skills: +{new_skills} new, {updated_skills} updated"
        
        completion_message = f'Resume optimization complete using {model_used}{skills_summary}'
        
        # Prepare additional data for status update
        additional_data = {
            'optimizedResumeUrl': optimized_url,
            'fileType': output_extension,
            'contentType': content_type,
            'downloadFilename': download_filename,
            'aiModel': model_used,
            'skillsProcessing': skills_processing_result,
            'previewText': preview_text if 'preview_text' in locals() else None,
            'originalText': formatted_original_text if 'formatted_original_text' in locals() else (resume_text if 'resume_text' in locals() else None),
            # Dual format resume URLs
            'pdfUrl': pdf_url if 'pdf_url' in locals() and pdf_url else None,
            'wordUrl': word_url if 'word_url' in locals() and word_url else None,
            'pdfFilename': pdf_filename if 'pdf_filename' in locals() and pdf_filename else None,
            'wordFilename': word_filename if 'word_filename' in locals() and word_filename else None,
            'hasDualFormat': dual_format_mode if 'dual_format_mode' in locals() else False,
            # Cover letter data
            'coverLetterText': cover_letter_text if 'cover_letter_text' in locals() and cover_letter_text else None,
            'coverLetterUrl': cover_letter_url if 'cover_letter_url' in locals() and cover_letter_url else None,
            'coverLetterFilename': cover_letter_filename if 'cover_letter_filename' in locals() and cover_letter_filename else None,
            # Dual format cover letter URLs
            'coverLetterPdfUrl': cover_letter_pdf_url if 'cover_letter_pdf_url' in locals() and cover_letter_pdf_url else None,
            'coverLetterWordUrl': cover_letter_word_url if 'cover_letter_word_url' in locals() and cover_letter_word_url else None,
            'coverLetterPdfFilename': cover_letter_pdf_filename if 'cover_letter_pdf_filename' in locals() and cover_letter_pdf_filename else None,
            'coverLetterWordFilename': cover_letter_word_filename if 'cover_letter_word_filename' in locals() and cover_letter_word_filename else None,
            'hasCoverLetterDualFormat': cover_letter_dual_format_mode if 'cover_letter_dual_format_mode' in locals() else False,
            'atsScore': ats_score
        }
        
        print(f"Final status update data - Cover letter URL: {additional_data['coverLetterUrl']}")
        print(f"Final status update data - Cover letter PDF URL: {additional_data['coverLetterPdfUrl']}")
        print(f"Final status update data - Cover letter Word URL: {additional_data['coverLetterWordUrl']}")
        print(f"Final status update data - Cover letter dual format mode: {additional_data['hasCoverLetterDualFormat']}")
        

        print(f"Final status update data - Cover letter filename: {additional_data['coverLetterFilename']}")
        
        # Validate that the resume was processed successfully before marking as completed
        if (resume_json.get('full_name') == 'Resume Processing Error' or 
            resume_json.get('full_name') == 'PDF Generation Error' or
            'Processing Error' in str(resume_json.get('full_name', '')) or
            'Generation Error' in str(resume_json.get('full_name', '')) or
            resume_json.get('contact_info') == 'Unable to parse AI response' or
            resume_json.get('contact_info') == 'PDF creation failed'):
            
            error_msg = "AI service returned an invalid response format. Please try with a different resume or contact support."
            print(f"Processing Error Detected: {error_msg}")
            print(f"Resume full_name: {resume_json.get('full_name')}")
            print(f"Resume contact_info: {resume_json.get('contact_info')}")
            update_job_status(bucket_name, status_key, 'FAILED', error_msg)
            return {
                'error': error_msg
            }
        
        # Only mark as completed if validation passes
        update_job_status(bucket_name, status_key, 'COMPLETED', completion_message, additional_data)
        
        return {
            'optimizedResumeUrl': optimized_url,
            'jobId': job_id,
            'fileType': output_extension,
            'contentType': content_type,
            'downloadFilename': download_filename
        }
    except Exception as e:
        print(f"Error in AI Handler: {str(e)}")
        
        # Update status to failed
        if status_key:
            update_job_status(bucket_name, status_key, 'FAILED', f'Error: {str(e)}')
            
        return {
            'error': str(e)
        }

def parse_ai_response(response_text, expected_format="text"):
    """
    Simple AI response parser for enforced formats.
    expected_format: "json" for resume, "text" for cover letter
    """
    if not response_text:
        return "" if expected_format == "text" else "{}"
    
    content = response_text.strip()
    
    # Extract from Bedrock wrapper if present
    if content.startswith("{'choices':") or content.startswith('{"choices":'):
        try:
            import ast
            response_dict = ast.literal_eval(content)
            if 'choices' in response_dict and response_dict['choices']:
                message = response_dict['choices'][0]['message']
                content = message.get('content') or message.get('reasoning_content') or content
        except:
            pass
    
    # Remove markdown code blocks if present
    if expected_format == "json":
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        elif not content.strip().startswith('{'):
            brace_match = re.search(r'\{.*\}', content, re.DOTALL)
            if brace_match:
                content = brace_match.group(0)
    
    return content.strip()

def lambda_handler(event, context):
    """AWS Lambda handler function"""
    return process_resume_optimization(event, context)
