#!/usr/bin/env python3

def create_rtf_word_resume(resume_json):
    """Create a Word document with clean RTF formatting"""
    
    # Extract data from JSON with safe defaults
    full_name = resume_json.get('full_name', 'Full Name')
    contact_info = resume_json.get('contact_info', 'Contact Information')
    professional_summary = resume_json.get('professional_summary', 'Professional Summary')
    skills = resume_json.get('skills', [])
    experience = resume_json.get('experience', [])
    education = resume_json.get('education', [])
    
    # Build RTF content with proper formatting
    rtf_content = r"""{\rtf1\ansi\deff0 {\fonttbl {\f0 Calibri;}}
\f0\fs22

{\pard\qc\b\fs26 """ + full_name.upper() + r"""\par}
{\pard\qc\fs20 """ + contact_info + r"""\par}

{\pard\sb120\b\fs22 PROFESSIONAL SUMMARY\par}
{\pard\sa60 """ + professional_summary + r"""\par}

{\pard\sb120\b\fs22 CORE COMPETENCIES\par}
{\pard\sa60 """ + " \\bullet  ".join(skills) + r"""\par}

{\pard\sb120\b\fs22 PROFESSIONAL EXPERIENCE\par}
"""

    # Add experience entries
    for exp in experience:
        title = exp.get('title', 'Job Title')
        company = exp.get('company', 'Company')
        dates = exp.get('dates', 'Dates')
        achievements = exp.get('achievements', [])
        
        rtf_content += r"""
{\pard\sb80\b\fs22 """ + title + r"""\par}
{\pard """ + company + r""" | """ + dates + r"""\par}"""
        
        for achievement in achievements:
            rtf_content += r"""
{\pard\fi-200\li200 \bullet  """ + achievement + r"""\par}"""

    # Add education section
    if education:
        rtf_content += r"""

{\pard\sb120\b\fs22 EDUCATION\par}"""
        
        for edu in education:
            degree = edu.get('degree', 'Degree')
            institution = edu.get('institution', 'Institution')
            dates = edu.get('dates', 'Year')
            details = edu.get('details', '')
            
            rtf_content += r"""
{\pard\b """ + degree + r"""\par}
{\pard """ + institution + r""" | """ + dates + r"""\par}"""
            
            if details:
                rtf_content += r"""
{\pard """ + details + r"""\par}"""

    # Close RTF document
    rtf_content += r"""
}"""

    # Convert RTF to bytes for Word document creation
    import io
    import zipfile
    from datetime import datetime
    
    def escape_xml(text):
        """Escape XML special characters and fix encoding issues."""
        if not text:
            return ""
        # Fix common encoding issues
        text = text.replace("ﬀ", "ff").replace("ﬁ", "fi").replace("ﬂ", "fl")
        return (text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace('"', "&quot;")
                   .replace("'", "&apos;"))
    
    def rtf_to_word_xml(rtf_text):
        """Convert RTF content to Word XML format"""
        # Parse RTF and convert to Word XML paragraphs
        paragraphs_xml = ""
        
        # Header - Name
        paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:jc w:val="center"/>
                <w:spacing w:after="60"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>{escape_xml(full_name.upper())}</w:t>
            </w:r>
        </w:p>'''
        
        # Contact Info - split into multiple lines for better readability
        contact_parts = contact_info.split('|') if '|' in contact_info else [contact_info]
        if len(contact_parts) > 1:
            # Format as separate lines
            for i, part in enumerate(contact_parts):
                paragraphs_xml += f'''
                <w:p>
                    <w:pPr>
                        <w:jc w:val="center"/>
                        <w:spacing w:after="{"120" if i == len(contact_parts)-1 else "30"}"/>
                    </w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:sz w:val="18"/>
                        </w:rPr>
                        <w:t>{escape_xml(part.strip())}</w:t>
                    </w:r>
                </w:p>'''
        else:
            # Single line format
            paragraphs_xml += f'''
            <w:p>
                <w:pPr>
                    <w:jc w:val="center"/>
                    <w:spacing w:after="240"/>
                </w:pPr>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                        <w:sz w:val="20"/>
                    </w:rPr>
                    <w:t>{escape_xml(contact_info)}</w:t>
                </w:r>
            </w:p>'''
        
        # Professional Summary Section
        paragraphs_xml += f'''
        <w:p>
            <w:pPr>
                <w:spacing w:before="60" w:after="30"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>PROFESSIONAL SUMMARY</w:t>
            </w:r>
        </w:p>
        <w:p>
            <w:pPr>
                <w:spacing w:after="60"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="20"/>
                </w:rPr>
                <w:t>{escape_xml(professional_summary)}</w:t>
            </w:r>
        </w:p>'''
        
        # Skills Section
        if skills:
            paragraphs_xml += f'''
            <w:p>
                <w:pPr>
                    <w:spacing w:before="80" w:after="40"/>
                </w:pPr>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                        <w:b/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>CORE COMPETENCIES</w:t>
                </w:r>
            </w:p>'''
            
            # Format skills as individual bullet points with tight spacing
            for skill in skills:
                paragraphs_xml += f'''
                <w:p>
                    <w:pPr>
                        <w:ind w:left="200" w:hanging="200"/>
                        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
                    </w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:sz w:val="18"/>
                        </w:rPr>
                        <w:t>• {escape_xml(skill.strip())}</w:t>
                    </w:r>
                </w:p>'''
        
        # Experience Section
        if experience:
            paragraphs_xml += f'''
            <w:p>
                <w:pPr>
                    <w:spacing w:before="80" w:after="40"/>
                </w:pPr>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                        <w:b/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>PROFESSIONAL EXPERIENCE</w:t>
                </w:r>
            </w:p>'''
            
            for i, exp in enumerate(experience):
                title = exp.get('title', 'Job Title')
                company = exp.get('company', 'Company')
                location = exp.get('location', '')
                dates = exp.get('dates', 'Dates')
                achievements = exp.get('achievements', [])
                
                # Format company with location if available
                company_location = company
                if location and location.strip():
                    company_location = f"{company}, {location}"
                
                # Format dates to show full years (e.g., "Dec 2020" instead of "Dec '20")
                formatted_dates = dates
                if dates and dates != 'Dates':
                    import re
                    # Convert abbreviated years like "Dec '20" to "Dec 2020"
                    formatted_dates = re.sub(r"([A-Za-z]{3,9})\s+'(\d{2})", r"\1 20\2", dates)
                    # Also handle cases like "Feb '13" -> "Feb 2013" (assuming 2000s)
                    formatted_dates = re.sub(r"([A-Za-z]{3,9})\s+'(\d{2})", lambda m: f"{m.group(1)} {'20' + m.group(2) if int(m.group(2)) <= 30 else '19' + m.group(2)}", formatted_dates)
                
                # Estimate content lines for this experience section
                estimated_lines = 2  # Company + title lines
                estimated_lines += len(achievements)  # Achievement bullets
                
                # Add page break logic for sections with multiple achievements or if it's likely to be orphaned
                page_break_props = ""
                if len(achievements) >= 3 or estimated_lines >= 4:
                    # Add page break before if this section is substantial
                    page_break_props = "<w:pageBreakBefore/>"
                
                # Job title and dates on same line with right alignment for dates
                # Add keep-together properties to prevent orphaning
                paragraphs_xml += f'''
                <w:p>
                    <w:pPr>
                        <w:spacing w:before="60" w:after="0"/>
                        <w:tabs>
                            <w:tab w:val="right" w:pos="8640"/>
                        </w:tabs>
                        {page_break_props}
                        <w:keepNext/>
                        <w:keepLines/>
                        <w:widowControl/>
                    </w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:b/>
                            <w:sz w:val="22"/>
                        </w:rPr>
                        <w:t>{escape_xml(title)}</w:t>
                    </w:r>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:sz w:val="20"/>
                        </w:rPr>
                        <w:tab/>
                        <w:t>{escape_xml(formatted_dates)}</w:t>
                    </w:r>
                </w:p>'''
                
                # Company and location on second line - company left, location right
                paragraphs_xml += f'''
                <w:p>
                    <w:pPr>
                        <w:spacing w:after="30"/>
                        <w:tabs>
                            <w:tab w:val="right" w:pos="8640"/>
                        </w:tabs>
                        <w:keepNext/>
                        <w:keepLines/>
                    </w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:b/>
                            <w:sz w:val="20"/>
                        </w:rPr>
                        <w:t>{escape_xml(company)}</w:t>
                    </w:r>'''
                
                # Add location on right if it exists
                if location and location.strip():
                    paragraphs_xml += f'''
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:sz w:val="20"/>
                        </w:rPr>
                        <w:tab/>
                        <w:t>{escape_xml(location)}</w:t>
                    </w:r>'''
                
                paragraphs_xml += '''
                </w:p>'''
                
                # Achievements with bullets and tighter spacing - keep together
                for j, achievement in enumerate(achievements):
                    # Keep first achievement with title, and keep achievements together
                    keep_props = ""
                    if j == 0:
                        keep_props = "<w:keepLines/><w:widowControl/>"
                    elif j < len(achievements) - 1:
                        keep_props = "<w:keepNext/><w:keepLines/>"
                    
                    paragraphs_xml += f'''
                    <w:p>
                        <w:pPr>
                            <w:ind w:left="200" w:hanging="200"/>
                            <w:spacing w:after="0" w:line="220" w:lineRule="auto"/>
                            {keep_props}
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                                <w:sz w:val="18"/>
                            </w:rPr>
                            <w:t>• {escape_xml(achievement)}</w:t>
                        </w:r>
                    </w:p>'''
        
        # Education Section
        if education:
            paragraphs_xml += f'''
            <w:p>
                <w:pPr>
                    <w:spacing w:before="80" w:after="40"/>
                </w:pPr>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                        <w:b/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>EDUCATION</w:t>
                </w:r>
            </w:p>'''
            
            for edu in education:
                degree = edu.get('degree', 'Degree')
                institution = edu.get('institution', 'Institution')
                dates = edu.get('dates', 'Year')
                details = edu.get('details', '')
                
                paragraphs_xml += f'''
                <w:p>
                    <w:pPr>
                        <w:spacing w:after="0"/>
                    </w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:b/>
                            <w:sz w:val="18"/>
                        </w:rPr>
                        <w:t>{escape_xml(degree)}</w:t>
                    </w:r>
                </w:p>
                <w:p>
                    <w:pPr>
                        <w:spacing w:after="60"/>
                    </w:pPr>
                    <w:r>
                        <w:rPr>
                            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                            <w:sz w:val="18"/>
                        </w:rPr>
                        <w:t>{escape_xml(institution)}{" | " + escape_xml(dates) if dates and dates != "N/A" else ""}</w:t>
                    </w:r>
                </w:p>'''
                
                if details:
                    paragraphs_xml += f'''
                    <w:p>
                        <w:pPr>
                            <w:spacing w:after="60"/>
                        </w:pPr>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                                <w:sz w:val="22"/>
                            </w:rPr>
                            <w:t>{escape_xml(details)}</w:t>
                        </w:r>
                    </w:p>'''
        
        return paragraphs_xml
    
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
        <w:pPrDefault>
            <w:pPr>
                <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
            </w:pPr>
        </w:pPrDefault>
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
    <dc:title>Resume</dc:title>
    <dc:creator>JobTailorAI</dc:creator>
    <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''
    
    # Create the document XML content
    paragraphs_xml = rtf_to_word_xml(rtf_content)
    
    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        {paragraphs_xml}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="360" w:bottom="720" w:left="360"/>
        </w:sectPr>
    </w:body>
</w:document>'''
    
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
    return docx_buffer.getvalue()
