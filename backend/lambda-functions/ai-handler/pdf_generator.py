"""
Professional PDF generator using fpdf2.
Creates beautifully formatted PDF documents from resume JSON data.
Lambda-compatible implementation with Times font, black formatting, and proper text wrapping.
"""

import io
import json
import re
import unicodedata
from datetime import datetime
from fpdf import FPDF

# Professional colors (RGB values)
ROYAL_BLUE = (65, 105, 225)  # Royal blue for headers
BLACK = (0, 0, 0)
DARK_GRAY = (64, 64, 64)

class ProfessionalPDF(FPDF):
    """Professional PDF class with clean formatting"""
    
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=10)
        self.set_margins(15, 15, 15)  # Smaller margins for more content
        
    def header(self):
        """Custom header - empty for resume"""
        pass
        
    def footer(self):
        """Custom footer - empty for resume"""
        pass
    
    def add_section_header(self, text):
        """Add a professional section header with long underline"""
        self.ln(3)  # Minimal space before header
        self.set_font('Times', 'B', 11)
        self.set_text_color(*BLACK)
        
        # Add the header text
        self.cell(0, 6, text, ln=True)
        
        # Add long underline starting from first letter
        current_y = self.get_y()
        self.set_draw_color(*BLACK)
        self.set_line_width(0.3)
        # Line from left margin to right margin
        self.line(15, current_y - 1, 195, current_y - 1)  # Full width underline
        
        # Minimal space after header
        self.ln(2)
    
    def add_name_header(self, name):
        """Add name as main header"""
        self.set_font('Times', 'B', 16)  # Smaller font
        self.set_text_color(*BLACK)
        self.cell(0, 8, name, ln=True, align='C')  # Smaller height
        self.ln(2)  # Less space
    
    def add_contact_info(self, contact):
        """Add contact information"""
        self.set_font('Times', '', 10)  # Smaller font
        self.set_text_color(*BLACK)
        self.cell(0, 5, contact, ln=True, align='C')  # Smaller height
        self.ln(3)  # Less space
    
    def add_body_text(self, text, bold=False):
        """Add body text with optional bold formatting and proper wrapping"""
        font_style = 'B' if bold else ''
        self.set_font('Times', font_style, 11)
        self.set_text_color(*BLACK)
        
        # Handle multi-line text with proper wrapping
        lines = text.split('\n')
        for line in lines:
            if line.strip():
                # Wrap long lines - use more of the page width
                wrapped_lines = self.wrap_text(line.strip(), 110)  # More chars per line
                for wrapped_line in wrapped_lines:
                    self.cell(0, 5, wrapped_line, ln=True)  # Smaller line height
        self.ln(1)  # Less space between sections
    
    def add_paragraph(self, text, spacing_after=4):
        """Add a paragraph with smart page break handling"""
        if not text or not text.strip():
            return
        
        paragraph_text = text.strip()
        
        # Estimate paragraph height
        wrapped_lines = self.wrap_text(paragraph_text, 110)
        paragraph_height = len(wrapped_lines) * 5 + spacing_after
        
        # Check if we need a new page
        if self.get_y() + paragraph_height > 270:
            self.add_page()
        
        # Add the paragraph
        self.set_font('Times', '', 11)
        self.set_text_color(*BLACK)
        
        for line in wrapped_lines:
            # Double-check for line-level page breaks
            if self.get_y() + 5 > 275:
                self.add_page()
            self.cell(0, 5, line, ln=True)
        
        # Add spacing after paragraph
        if spacing_after > 0:
            self.ln(spacing_after)
    
    def wrap_text(self, text, max_chars):
        """Wrap text to fit within specified character limit"""
        if len(text) <= max_chars:
            return [text]
        
        words = text.split()
        lines = []
        current_line = ""
        
        for word in words:
            # Check if adding this word would exceed the limit
            if len(current_line + " " + word) <= max_chars:
                current_line += (" " + word) if current_line else word
            else:
                # Start a new line
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        # Add the last line
        if current_line:
            lines.append(current_line)
        
        return lines
    
    def add_bullet_point(self, text):
        """Add a bullet point with proper text wrapping and filled dot"""
        self.set_font('Times', '', 11)
        self.set_text_color(*BLACK)
        
        # Wrap text properly
        wrapped_lines = self.wrap_text(text, 102)  # Slightly less for bullet space
        
        # Check if we have enough space for this bullet point
        lines_needed = len(wrapped_lines)
        space_needed = lines_needed * 5 + 2  # 5mm per line + small spacing
        
        if self.get_y() + space_needed > 275:  # Close to bottom of page
            self.add_page()
        
        # Add bullet to first line, indent subsequent lines
        for i, line in enumerate(wrapped_lines):
            if i == 0:
                # Draw a filled circle as bullet point
                current_x = self.get_x()
                current_y = self.get_y()
                
                # Draw filled circle (bullet)
                self.set_fill_color(*BLACK)
                self.circle(current_x + 2, current_y + 2.5, 0.8, style='F')  # Filled circle
                
                # Add text with proper indentation
                self.set_x(current_x + 6)  # Move text to the right of bullet
                self.cell(0, 5, line, ln=True)
            else:
                # Indent subsequent lines
                self.cell(6, 5, "", ln=False)  # Empty space for bullet alignment
                self.cell(0, 5, line, ln=True)
        
        self.ln(0.5)  # Minimal space between bullets
    
    def add_job_header(self, title, dates, company, location=""):
        """Add job header with title/dates on top, company/location underneath"""
        # Check if we have enough space for the job header + at least 2 bullet points
        # Estimate: header (12mm) + 2 bullets (10mm) = 22mm minimum
        if self.get_y() > 250:  # If we're too close to bottom (297mm page - 47mm margin)
            self.add_page()
        
        # Job title on left (bold), dates on right (not bold)
        self.set_font('Times', 'B', 10)
        self.set_text_color(*BLACK)
        self.cell(140, 5, title, ln=False)  # Title takes most of the width
        
        self.set_font('Times', '', 10)  # Regular font for dates
        self.cell(0, 5, dates, ln=True, align='R')  # Dates aligned right, not bold
        
        # Company on left (bold), location on right (not bold)
        self.set_font('Times', 'B', 10)  # Bold font for company
        self.cell(140, 5, company, ln=False)  # Company on left
        
        if location and location.strip():
            self.set_font('Times', '', 10)  # Regular font for location
            self.cell(0, 5, location, ln=True, align='R')  # Location right-aligned
        else:
            self.ln()  # Just move to next line if no location
        
        self.ln(1)  # Small space after job header

def convert_abbreviated_years(text):
    """Convert abbreviated years like 'Dec '20' to 'Dec 2020'"""
    import re
    
    # Pattern to match abbreviated years like '20, '21, etc.
    pattern = r"'(\d{2})"
    
    def replace_year(match):
        year_suffix = match.group(1)
        year_int = int(year_suffix)
        
        # Assume years 00-30 are 2000s, 31-99 are 1900s
        if year_int <= 30:
            full_year = 2000 + year_int
        else:
            full_year = 1900 + year_int
        
        return str(full_year)
    
    return re.sub(pattern, replace_year, text)

def clean_text_for_pdf(text):
    """Clean text for PDF generation"""
    if not text:
        return ""
    
    # Convert to string if not already
    text = str(text)
    
    # Convert abbreviated years first
    text = convert_abbreviated_years(text)
    
    # Normalize unicode characters
    text = unicodedata.normalize('NFKD', text)
    
    # Remove or replace problematic characters
    text = text.replace('\u2019', "'")  # Right single quotation mark
    text = text.replace('\u2018', "'")  # Left single quotation mark
    text = text.replace('\u201c', '"')  # Left double quotation mark
    text = text.replace('\u201d', '"')  # Right double quotation mark
    text = text.replace('\u2013', '-')  # En dash
    text = text.replace('\u2014', '-')  # Em dash
    text = text.replace('\u2022', '*')  # Bullet point -> asterisk
    text = text.replace('\u00a0', ' ')  # Non-breaking space
    
    # Remove any remaining non-ASCII characters except bullet
    text = ''.join(char for char in text if ord(char) < 128 or char == '•')
    
    # Special handling for cover letters that come as one long string
    # Detect if this is a cover letter format (no existing line breaks but has structure)
    if '\n' not in text and ('Dear ' in text or 'Hiring Manager' in text):
        print("DEBUG: Detected cover letter format - adding proper line breaks for PDF")
        
        # Split on double spaces which indicate paragraph breaks
        text = text.replace('  ', '\n')
        
        # Clean up any triple+ spaces that might create empty lines
        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')
    
    # Clean up extra whitespace
    lines = text.split('\n')
    cleaned_lines = [' '.join(line.split()) for line in lines]
    
    return '\n'.join(cleaned_lines)

def create_professional_resume_pdf(resume_data, title="Resume"):
    """Create a professional resume PDF using fpdf2"""
    print("DEBUG: Creating professional resume PDF with fpdf2...")
    
    # Parse resume data if it's a string
    if isinstance(resume_data, str):
        resume_data = json.loads(resume_data)
    
    # Create PDF
    pdf = ProfessionalPDF()
    pdf.add_page()
    
    # Name header
    if resume_data.get('name') or resume_data.get('full_name'):
        name = clean_text_for_pdf(resume_data.get('name') or resume_data.get('full_name'))
        pdf.add_name_header(name)
    
    # Contact information
    if resume_data.get('contact') or resume_data.get('contact_info'):
        contact = clean_text_for_pdf(resume_data.get('contact') or resume_data.get('contact_info'))
        pdf.add_contact_info(contact)
    
    # Professional Summary
    if resume_data.get('professional_summary'):
        pdf.add_section_header("PROFESSIONAL SUMMARY")
        summary = clean_text_for_pdf(resume_data['professional_summary'])
        pdf.add_body_text(summary)
    
    # Skills
    if resume_data.get('skills'):
        pdf.add_section_header("CORE COMPETENCIES")
        skills = [clean_text_for_pdf(skill) for skill in resume_data['skills']]
        skills_text = " | ".join(skills)
        pdf.add_body_text(skills_text)
    
    # Professional Experience
    if resume_data.get('experience'):
        pdf.add_section_header("PROFESSIONAL EXPERIENCE")
        
        for exp in resume_data['experience']:
            title = clean_text_for_pdf(exp.get('title', ''))
            company = clean_text_for_pdf(exp.get('company', ''))
            location = clean_text_for_pdf(exp.get('location', ''))
            dates = clean_text_for_pdf(exp.get('dates', ''))
            
            # Estimate space needed for this job entry
            achievements = exp.get('achievements', [])
            estimated_height = 12  # Job header height
            estimated_height += len(achievements) * 5  # Each bullet point ~5mm
            
            # If we don't have enough space, start a new page
            if pdf.get_y() + estimated_height > 270:  # Leave margin at bottom
                pdf.add_page()
            
            # Use new job header format: title + dates on top, company/location underneath
            pdf.add_job_header(title, dates, company, location)
            
            # Achievements
            if achievements:
                for achievement in achievements:
                    achievement_text = clean_text_for_pdf(achievement)
                    pdf.add_bullet_point(achievement_text)
            
            pdf.ln(1)  # Minimal space between jobs
    
    # Education
    if resume_data.get('education'):
        pdf.add_section_header("EDUCATION")
        
        for edu in resume_data['education']:
            degree = clean_text_for_pdf(edu.get('degree', ''))
            school = clean_text_for_pdf(edu.get('school') or edu.get('institution', ''))
            dates = clean_text_for_pdf(edu.get('dates', ''))
            
            # Use same format as jobs: school + dates on top, degree underneath
            pdf.add_job_header(school, dates, degree)
            
            if edu.get('details'):
                details = clean_text_for_pdf(edu.get('details'))
                pdf.add_body_text(details)
            
            pdf.ln(1)  # Minimal space between education entries
    
    # Get PDF content
    pdf_output = pdf.output(dest='S')
    
    print(f"DEBUG: Professional PDF created successfully! Size: {len(pdf_output)} bytes")
    return pdf_output

def detect_cover_letter_format(text_content):
    """Detect the format and structure of the cover letter"""
    lines = text_content.strip().split('\n')
    non_empty_lines = [line.strip() for line in lines if line.strip()]
    
    format_info = {
        'has_header': False,
        'has_date': False,
        'has_salutation': False,
        'has_closing': False,
        'paragraph_count': 0,
        'is_structured': False,
        'needs_formatting': False
    }
    
    # Check for header (name/contact info in first few lines)
    if len(non_empty_lines) > 0:
        first_line = non_empty_lines[0]
        # Look for typical header indicators: name patterns, email, phone
        has_email = '@' in first_line
        has_phone = any(char.isdigit() for char in first_line) and ('(' in first_line or '-' in first_line)
        has_name_pattern = len(first_line.split()) <= 3 and not first_line.startswith('Dear') and not first_line.startswith('I ')
        
        if (has_email or has_phone or has_name_pattern) and not first_line.startswith('Dear') and not any(month in first_line for month in 
            ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December']):
            format_info['has_header'] = True
    
    # Check for date
    for line in non_empty_lines[:5]:  # Check first 5 lines
        if any(month in line for month in ['January', 'February', 'March', 'April', 'May', 'June', 
                                         'July', 'August', 'September', 'October', 'November', 'December']):
            format_info['has_date'] = True
            break
    
    # Check for salutation
    for line in non_empty_lines:
        if line.startswith('Dear '):
            format_info['has_salutation'] = True
            break
    
    # Check for closing
    for line in non_empty_lines[-5:]:  # Check last 5 lines
        if line.lower().startswith(('sincerely', 'regards', 'best regards', 'yours truly', 'thank you')):
            format_info['has_closing'] = True
            break
    
    # Count paragraphs (groups of lines separated by empty lines)
    paragraph_count = 0
    in_paragraph = False
    for line in lines:
        if line.strip():
            if not in_paragraph:
                paragraph_count += 1
                in_paragraph = True
        else:
            in_paragraph = False
    
    format_info['paragraph_count'] = paragraph_count
    format_info['is_structured'] = format_info['has_salutation'] and format_info['has_closing']
    format_info['needs_formatting'] = paragraph_count < 3 or not format_info['is_structured']
    
    return format_info

def estimate_content_length(text_content):
    """Estimate how many lines the content will take in PDF format"""
    total_chars = len(text_content)
    lines = text_content.split('\n')
    non_empty_lines = len([line for line in lines if line.strip()])
    
    # Estimate wrapped lines (assuming ~80 chars per line)
    estimated_wrapped_lines = total_chars / 80
    
    # Factor in empty lines and spacing
    total_estimated_lines = estimated_wrapped_lines + (len(lines) - non_empty_lines) * 0.5
    
    return {
        'total_lines': len(lines),
        'non_empty_lines': non_empty_lines,
        'estimated_pdf_lines': total_estimated_lines,
        'total_chars': total_chars
    }

def get_scaling_level(content_stats):
    """Determine scaling level based on content length"""
    estimated_lines = content_stats['estimated_pdf_lines']
    
    if estimated_lines <= 30:
        return 0  # Normal formatting
    elif estimated_lines <= 35:
        return 1  # Reduce spacing
    elif estimated_lines <= 40:
        return 2  # Reduce font size to 10pt + minimal spacing
    else:
        return 3  # Reduce font size to 9pt + zero spacing

def create_adaptive_cover_letter_pdf(text_content, title="Cover Letter", layout_style="professional"):
    """Create an adaptive cover letter PDF that adjusts to different formats and styles"""
    print(f"DEBUG: Creating adaptive cover letter PDF with style: {layout_style}")
    print(f"DEBUG: Input text length: {len(text_content)}")
    
    # Estimate content length and determine scaling
    content_stats = estimate_content_length(text_content)
    scaling_level = get_scaling_level(content_stats)
    print(f"DEBUG: Content stats: {content_stats}")
    print(f"DEBUG: Scaling level: {scaling_level}")
    
    # Detect the format of the cover letter
    format_info = detect_cover_letter_format(text_content)
    format_info['scaling_level'] = scaling_level
    print(f"DEBUG: Detected format: {format_info}")
    
    # Clean the text content
    cleaned_content = clean_text_for_pdf(text_content)
    
    # Choose layout based on style and detected format
    if layout_style == "modern":
        return create_modern_cover_letter_pdf(cleaned_content, format_info, title)
    elif layout_style == "classic":
        return create_classic_cover_letter_pdf(cleaned_content, format_info, title)
    elif layout_style == "minimal":
        return create_minimal_cover_letter_pdf(cleaned_content, format_info, title)
    else:  # professional (default)
        return create_professional_cover_letter_pdf_adaptive(cleaned_content, format_info, title)

def create_professional_cover_letter_pdf_adaptive(text_content, format_info, title="Cover Letter"):
    """Create a professional cover letter PDF with adaptive formatting"""
    print("DEBUG: Creating professional adaptive cover letter PDF...")
    
    # Get scaling parameters based on content length
    scaling_level = format_info.get('scaling_level', 0)
    
    # Define scaling parameters
    if scaling_level == 0:  # Normal
        font_size = 11
        header_font_size = 14
        empty_line_spacing = 2
        paragraph_spacing = 4
        section_spacing = 4
    elif scaling_level == 1:  # Reduce spacing
        font_size = 11
        header_font_size = 14
        empty_line_spacing = 1
        paragraph_spacing = 2
        section_spacing = 2
    elif scaling_level == 2:  # Reduce font + minimal spacing
        font_size = 10
        header_font_size = 12
        empty_line_spacing = 1
        paragraph_spacing = 1
        section_spacing = 2
    else:  # scaling_level == 3: Minimal everything
        font_size = 9
        header_font_size = 11
        empty_line_spacing = 0.5
        paragraph_spacing = 0.5
        section_spacing = 1
    
    print(f"DEBUG: Using scaling level {scaling_level}: font={font_size}pt, spacing={paragraph_spacing}")
    
    # Create PDF with appropriate margins
    pdf = ProfessionalPDF()
    pdf.set_margins(15, 15, 15)  # Standard margins
    pdf.add_page()
    
    # Split content into lines
    lines = text_content.split('\n')
    
    # Process lines with adaptive formatting
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines but add minimal spacing
        if not line:
            pdf.ln(empty_line_spacing)
            i += 1
            continue
        
        # Adaptive formatting based on position and content
        if i == 0 and format_info['has_header']:
            # First line is likely the name - make it prominent
            pdf.set_font('Times', 'B', header_font_size)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 8, line, ln=True, align='C')
            pdf.ln(section_spacing)
        elif i == 1 and format_info['has_header'] and ('|' in line or '@' in line or 'phone' in line.lower()):
            # Contact information line
            pdf.set_font('Times', '', font_size - 1)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True, align='C')
            pdf.ln(section_spacing)
        elif any(month in line for month in ['January', 'February', 'March', 'April', 'May', 'June', 
                                           'July', 'August', 'September', 'October', 'November', 'December']):
            # Date line
            pdf.set_font('Times', '', font_size)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True)
            pdf.ln(section_spacing)
        elif line.startswith('Dear '):
            # Salutation
            pdf.set_font('Times', '', font_size)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True)
            pdf.ln(section_spacing)
        elif line.lower().startswith(('sincerely', 'regards', 'best regards', 'yours truly')):
            # Closing
            pdf.ln(section_spacing)  # Space before closing
            pdf.set_font('Times', '', font_size)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True)
        else:
            # Body paragraph - use smart paragraph handling with adaptive spacing
            pdf.set_font('Times', '', font_size)
            pdf.add_paragraph(line, spacing_after=paragraph_spacing)
        
        i += 1
    
    # Get PDF content
    pdf_output = pdf.output(dest='S')
    print(f"DEBUG: Professional adaptive cover letter PDF created! Size: {len(pdf_output)} bytes")
    return pdf_output

def create_modern_cover_letter_pdf(text_content, format_info, title="Cover Letter"):
    """Create a modern-styled cover letter PDF with accent colors and clean layout"""
    print("DEBUG: Creating modern cover letter PDF...")
    
    pdf = ProfessionalPDF()
    pdf.set_margins(12, 12, 12)  # Tighter margins for modern look
    pdf.add_page()
    
    # Add subtle accent line at top
    pdf.set_draw_color(*ROYAL_BLUE)
    pdf.set_line_width(2)
    pdf.line(12, 20, 198, 20)
    pdf.ln(8)
    
    lines = text_content.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            pdf.ln(2)
            continue
        
        if i == 0 and format_info['has_header']:
            # Modern name styling with accent color
            pdf.set_font('Times', 'B', 16)
            pdf.set_text_color(*ROYAL_BLUE)
            pdf.cell(0, 8, line, ln=True, align='L')  # Left align for modern look
            pdf.ln(2)
        elif i == 1 and format_info['has_header'] and ('|' in line or '@' in line):
            # Contact info in smaller, gray text
            pdf.set_font('Times', '', 9)
            pdf.set_text_color(*DARK_GRAY)
            pdf.cell(0, 5, line, ln=True, align='L')
            pdf.ln(6)
        else:
            # Regular content in black
            pdf.set_font('Times', '', 11)
            pdf.set_text_color(*BLACK)
            pdf.add_paragraph(line, spacing_after=3)
    
    pdf_output = pdf.output(dest='S')
    print(f"DEBUG: Modern cover letter PDF created! Size: {len(pdf_output)} bytes")
    return pdf_output

def create_classic_cover_letter_pdf(text_content, format_info, title="Cover Letter"):
    """Create a classic formal cover letter PDF with traditional business letter formatting"""
    print("DEBUG: Creating classic cover letter PDF...")
    
    pdf = ProfessionalPDF()
    pdf.set_margins(20, 20, 20)  # Wider margins for classic look
    pdf.add_page()
    
    lines = text_content.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            pdf.ln(3)  # More spacing for classic look
            continue
        
        if i == 0 and format_info['has_header']:
            # Classic centered name
            pdf.set_font('Times', 'B', 14)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 8, line, ln=True, align='C')
            pdf.ln(2)
        elif i == 1 and format_info['has_header'] and ('|' in line or '@' in line):
            # Centered contact info
            pdf.set_font('Times', '', 10)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True, align='C')
            pdf.ln(8)  # More space in classic format
        elif any(month in line for month in ['January', 'February', 'March', 'April', 'May', 'June', 
                                           'July', 'August', 'September', 'October', 'November', 'December']):
            # Right-aligned date in classic format
            pdf.set_font('Times', '', 11)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True, align='R')
            pdf.ln(6)
        else:
            pdf.set_font('Times', '', 11)
            pdf.set_text_color(*BLACK)
            pdf.add_paragraph(line, spacing_after=5)  # More spacing between paragraphs
    
    pdf_output = pdf.output(dest='S')
    print(f"DEBUG: Classic cover letter PDF created! Size: {len(pdf_output)} bytes")
    return pdf_output

def create_minimal_cover_letter_pdf(text_content, format_info, title="Cover Letter"):
    """Create a minimal cover letter PDF with clean, simple formatting"""
    print("DEBUG: Creating minimal cover letter PDF...")
    
    pdf = ProfessionalPDF()
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    
    lines = text_content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            pdf.ln(1)  # Minimal spacing
            continue
        
        # Simple, consistent formatting throughout
        pdf.set_font('Times', '', 11)
        pdf.set_text_color(*BLACK)
        pdf.add_paragraph(line, spacing_after=2)
    
    pdf_output = pdf.output(dest='S')
    print(f"DEBUG: Minimal cover letter PDF created! Size: {len(pdf_output)} bytes")
    return pdf_output

def create_professional_cover_letter_pdf(text_content, title="Cover Letter"):
    """Create a cover letter PDF with adaptive scaling (legacy function)"""
    print("DEBUG: Creating cover letter PDF with adaptive scaling...")
    print(f"DEBUG: Input text length: {len(text_content)}")
    print(f"DEBUG: Input text first 200 chars: {repr(text_content[:200])}")
    
    # Clean the text content but preserve AI structure
    cleaned_content = clean_text_for_pdf(text_content)
    print(f"DEBUG: Cleaned content length: {len(cleaned_content)}")
    print(f"DEBUG: Cleaned content first 200 chars: {repr(cleaned_content[:200])}")
    
    # Estimate content length and determine scaling
    content_stats = estimate_content_length(cleaned_content)
    scaling_level = get_scaling_level(content_stats)
    print(f"DEBUG: Content stats: {content_stats}")
    print(f"DEBUG: Scaling level: {scaling_level}")
    
    # Define scaling parameters
    if scaling_level == 0:  # Normal
        font_size = 11
        header_font_size = 14
        empty_line_spacing = 1
        paragraph_spacing = 1
    elif scaling_level == 1:  # Reduce spacing
        font_size = 11
        header_font_size = 14
        empty_line_spacing = 0.5
        paragraph_spacing = 0.5
    elif scaling_level == 2:  # Reduce font + minimal spacing
        font_size = 10
        header_font_size = 12
        empty_line_spacing = 0.5
        paragraph_spacing = 0.5
    else:  # scaling_level == 3: Minimal everything
        font_size = 9
        header_font_size = 11
        empty_line_spacing = 0.2
        paragraph_spacing = 0.2
    
    print(f"DEBUG: Using scaling level {scaling_level}: font={font_size}pt, spacing={paragraph_spacing}")
    
    # Create PDF with tighter margins for more space
    pdf = ProfessionalPDF()
    pdf.set_margins(12, 12, 12)  # Tighter margins
    pdf.add_page()
    
    # Add a nice border outline around the entire document
    pdf.set_draw_color(0, 0, 0)  # Black border
    pdf.set_line_width(0.5)
    # Draw border with 8mm margin from page edges
    pdf.rect(8, 8, 194, 281)  # x, y, width, height (A4 is 210x297mm)
    
    # Split content into lines - keep AI structure as-is
    lines = cleaned_content.split('\n')
    print(f"DEBUG: Total lines: {len(lines)}")
    
    # Process each line with adaptive spacing
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Handle empty lines with adaptive spacing
        if not line:
            pdf.ln(empty_line_spacing)
            continue
        
        print(f"DEBUG: Processing line {i}: {repr(line[:50])}")
        
        # Set font and color with adaptive sizing
        pdf.set_font('Times', '', font_size)
        pdf.set_text_color(*BLACK)
        
        # Special formatting for specific lines with adaptive sizing
        if i == 0:  # First line (candidate name) - make it bold and larger
            pdf.set_font('Times', 'B', header_font_size)
            pdf.cell(0, 6, line, ln=True, align='C')
            pdf.ln(paragraph_spacing)
        elif i == 1 and ('|' in line or '@' in line):  # Contact info line - center align
            pdf.set_font('Times', '', font_size)
            pdf.cell(0, 5, line, ln=True, align='C')
            pdf.ln(paragraph_spacing)
        elif any(month in line for month in ['January', 'February', 'March', 'April', 'May', 'June', 
                                           'July', 'August', 'September', 'October', 'November', 'December']):
            # Date line
            pdf.cell(0, 5, line, ln=True)
            pdf.ln(paragraph_spacing)
        elif line.startswith('Dear '):
            # Salutation
            pdf.cell(0, 5, line, ln=True)
            pdf.ln(paragraph_spacing)
        elif line.lower().startswith(('sincerely', 'regards', 'best regards', 'yours truly')):
            # Closing
            pdf.cell(0, 5, line, ln=True)
        else:
            # Regular content - handle text wrapping with adaptive spacing
            chars_per_line = 115 if font_size >= 11 else 125  # More chars for smaller font
            wrapped_lines = pdf.wrap_text(line, chars_per_line)
            for j, wrapped_line in enumerate(wrapped_lines):
                # Check if we need a new page
                if pdf.get_y() + 5 > 280:  # Adjusted for tighter margins
                    pdf.add_page()
                    # Add border to new page as well
                    pdf.set_draw_color(0, 0, 0)
                    pdf.set_line_width(0.5)
                    pdf.rect(8, 8, 194, 281)
                line_height = 4.5 if font_size >= 11 else 4  # Smaller line height for smaller font
                pdf.cell(0, line_height, wrapped_line, ln=True)
                # Only add spacing after the last wrapped line of a paragraph
                if j == len(wrapped_lines) - 1:
                    pdf.ln(paragraph_spacing)
    
    # Get PDF content
    pdf_output = pdf.output(dest='S')
    
    print(f"DEBUG: Cover letter PDF with adaptive scaling (level {scaling_level}) created successfully! Size: {len(pdf_output)} bytes")
    return pdf_output

# Main functions for compatibility
def create_pdf_resume(resume_data, title="Resume"):
    """Main function to create PDF resume"""
    return create_professional_resume_pdf(resume_data, title)

def create_pdf_cover_letter(text_content, title="Cover Letter", layout_style="professional"):
    """Main function to create PDF cover letter with adaptive formatting"""
    return create_adaptive_cover_letter_pdf(text_content, title, layout_style)

def create_pdf_resume_matching_word(resume_data, title="Resume"):
    """Create PDF that matches Word document formatting"""
    return create_professional_resume_pdf(resume_data, title)

def create_enhanced_pdf_from_word_structure(resume_data, title="Resume"):
    """Create enhanced PDF from Word document structure"""
    return create_professional_resume_pdf(resume_data, title)

def create_minimal_pdf(text_content, title="Document"):
    """Create a minimal PDF from text content"""
    return create_professional_cover_letter_pdf(text_content, title)

def create_pdf_from_text(text_content, title="Document"):
    """Create PDF from text content"""
    return create_professional_cover_letter_pdf(text_content, title)

def create_pdf_from_text_fallback(text_content, title="Document"):
    """Create PDF from text content (fallback function)"""
    return create_professional_cover_letter_pdf(text_content, title)

# Additional adaptive cover letter functions
def create_cover_letter_with_letterhead(text_content, letterhead_info=None, title="Cover Letter"):
    """Create a cover letter PDF with custom letterhead"""
    print("DEBUG: Creating cover letter with letterhead...")
    
    pdf = ProfessionalPDF()
    pdf.set_margins(15, 25, 15)  # Extra top margin for letterhead
    pdf.add_page()
    
    # Add letterhead if provided
    if letterhead_info:
        pdf.set_font('Times', 'B', 12)
        pdf.set_text_color(*ROYAL_BLUE)
        if letterhead_info.get('company_name'):
            pdf.cell(0, 6, letterhead_info['company_name'], ln=True, align='C')
        if letterhead_info.get('address'):
            pdf.set_font('Times', '', 10)
            pdf.set_text_color(*DARK_GRAY)
            pdf.cell(0, 5, letterhead_info['address'], ln=True, align='C')
        pdf.ln(5)
        
        # Add separator line
        pdf.set_draw_color(*ROYAL_BLUE)
        pdf.set_line_width(0.5)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(8)
    
    # Process the cover letter content
    format_info = detect_cover_letter_format(text_content)
    cleaned_content = clean_text_for_pdf(text_content)
    
    lines = cleaned_content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            pdf.ln(2)
            continue
        
        pdf.set_font('Times', '', 11)
        pdf.set_text_color(*BLACK)
        pdf.add_paragraph(line, spacing_after=3)
    
    pdf_output = pdf.output(dest='S')
    print(f"DEBUG: Cover letter with letterhead created! Size: {len(pdf_output)} bytes")
    return pdf_output

def create_cover_letter_with_signature_space(text_content, signature_space_lines=4, title="Cover Letter"):
    """Create a cover letter PDF with designated signature space"""
    print(f"DEBUG: Creating cover letter with {signature_space_lines} lines of signature space...")
    
    # Use the adaptive generator first
    format_info = detect_cover_letter_format(text_content)
    cleaned_content = clean_text_for_pdf(text_content)
    
    pdf = ProfessionalPDF()
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    
    lines = cleaned_content.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            pdf.ln(2)
            continue
        
        # Check if this is a closing line
        if line.lower().startswith(('sincerely', 'regards', 'best regards', 'yours truly')):
            pdf.set_font('Times', '', 11)
            pdf.set_text_color(*BLACK)
            pdf.cell(0, 5, line, ln=True)
            
            # Add signature space
            for _ in range(signature_space_lines):
                pdf.ln(4)
            
            # Add typed name line
            pdf.cell(0, 5, "[Your Name]", ln=True)
        else:
            pdf.set_font('Times', '', 11)
            pdf.set_text_color(*BLACK)
            pdf.add_paragraph(line, spacing_after=3)
    
    pdf_output = pdf.output(dest='S')
    print(f"DEBUG: Cover letter with signature space created! Size: {len(pdf_output)} bytes")
    return pdf_output

def analyze_cover_letter_content(text_content):
    """Analyze cover letter content and suggest optimal formatting"""
    format_info = detect_cover_letter_format(text_content)
    
    analysis = {
        'recommended_style': 'professional',
        'estimated_pages': 1,
        'formatting_suggestions': [],
        'detected_issues': []
    }
    
    # Estimate page count
    word_count = len(text_content.split())
    analysis['estimated_pages'] = max(1, (word_count // 400) + 1)
    
    # Recommend style based on content
    if 'innovative' in text_content.lower() or 'creative' in text_content.lower():
        analysis['recommended_style'] = 'modern'
    elif 'traditional' in text_content.lower() or 'formal' in text_content.lower():
        analysis['recommended_style'] = 'classic'
    elif word_count < 200:
        analysis['recommended_style'] = 'minimal'
    
    # Add formatting suggestions
    if not format_info['has_date']:
        analysis['formatting_suggestions'].append('Consider adding a date')
    if not format_info['has_salutation']:
        analysis['formatting_suggestions'].append('Consider adding a proper salutation (Dear...)')
    if not format_info['has_closing']:
        analysis['formatting_suggestions'].append('Consider adding a professional closing')
    if format_info['paragraph_count'] < 3:
        analysis['formatting_suggestions'].append('Consider expanding to 3-4 paragraphs for better structure')
    
    # Detect potential issues
    if word_count > 500:
        analysis['detected_issues'].append('Cover letter may be too long (>500 words)')
    if word_count < 150:
        analysis['detected_issues'].append('Cover letter may be too short (<150 words)')
    
    return analysis