import json
import boto3
import os
import tempfile
import base64
import sys
import urllib.parse
from datetime import datetime

# S3 client
s3 = boto3.client('s3')
bucket_name = os.environ.get('S3_BUCKET_NAME', 'resume-optimizer-storage-132851953852-prod')

def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }

def detect_file_type(file_content):
    """Detect file type based on content (magic bytes)"""
    if file_content.startswith(b'%PDF'):
        return 'pdf'
    elif file_content.startswith(b'PK\x03\x04') or file_content.startswith(b'PK\x05\x06') or file_content.startswith(b'PK\x07\x08'):
        # Check if it's a DOCX file (which is a ZIP archive)
        try:
            # DOCX files contain specific files in the ZIP
            import zipfile
            import io
            with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zip_file:
                file_list = zip_file.namelist()
                if 'word/document.xml' in file_list:
                    return 'docx'
                else:
                    return 'zip'  # Generic ZIP file
        except:
            return 'zip'
    elif file_content.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
        return 'doc'  # Old Word format
    else:
        return 'unknown'

def clean_ocr_text(text):
    """Clean common OCR errors in extracted text."""
    if not text:
        return text
    
    # Common OCR character replacements
    replacements = {
        '0': 'o',  # Zero to letter O in words
        '1': 'l',  # One to letter L in words
        '5': 'S',  # Five to letter S in words
        '8': 'B',  # Eight to letter B in words
        '9': 'g',  # Nine to letter g in words
    }
    
    # Apply replacements only in word contexts (not in numbers/dates)
    import re
    
    # Fix common OCR errors in words (not affecting numbers)
    text = re.sub(r'(?<=[a-zA-Z])0(?=[a-zA-Z])', 'o', text)  # 0 to o in words
    text = re.sub(r'(?<=[a-zA-Z])1(?=[a-zA-Z])', 'l', text)  # 1 to l in words
    text = re.sub(r'(?<=[a-zA-Z])5(?=[a-zA-Z])', 'S', text)  # 5 to S in words
    text = re.sub(r'(?<=[a-zA-Z])9(?=[a-zA-Z])', 'g', text)  # 9 to g in words
    
    # Fix spacing issues
    text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single space
    text = re.sub(r'\n\s*\n', '\n\n', text)  # Clean up line breaks
    
    # Remove excessive whitespace
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        cleaned_line = line.strip()
        if cleaned_line:  # Only add non-empty lines
            cleaned_lines.append(cleaned_line)
        elif cleaned_lines and cleaned_lines[-1]:  # Add empty line only if previous line wasn't empty
            cleaned_lines.append('')
    
    return '\n'.join(cleaned_lines)



def extract_text_from_pdf(pdf_content):
    """Extract text from PDF using Amazon Textract."""
    try:
        # Check if the file actually appears to be a PDF (starts with %PDF)
        if not pdf_content.startswith(b'%PDF'):
            return "File does not appear to be a valid PDF"
        
        print(f"Processing PDF file, size: {len(pdf_content)} bytes")
        
        # Use Amazon Textract (always available in Lambda)
        try:
            print("Extracting PDF text with Amazon Textract")
            textract = boto3.client('textract')
            
            # Check file size limit for Textract (10MB for synchronous)
            if len(pdf_content) > 10 * 1024 * 1024:
                return "PDF file is too large for processing. Please use a smaller file (under 10MB)."
            
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
                return "No text content could be extracted from the PDF. The file might be scanned images or have security restrictions."
            
            print(f"Successfully extracted text using Textract, length: {len(text)}")
            return clean_ocr_text(text)
            
        except Exception as textract_error:
            print(f"Textract extraction failed: {str(textract_error)}")
            
            # If we get here, extraction failed
            return "Unfortunately, we couldn't extract text from your PDF. This might be due to the file being password-protected, corrupted, or containing only images. Please try converting it to a Word document or contact support."
            
    except Exception as e:
        print(f"Error in PDF extraction process: {str(e)}")
        return f"Error extracting text from PDF: {str(e)}"

def extract_text_from_docx(docx_content):
    """Extract text from Word document."""
    try:
        import zipfile
        import xml.etree.ElementTree as ET
        import io
        
        # Create a temporary file to store the docx content
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as temp_file:
            temp_file.write(docx_content)
            temp_file_path = temp_file.name
        
        try:
            # Extract text using zipfile and XML parsing
            with zipfile.ZipFile(temp_file_path, 'r') as docx_zip:
                # Read the main document XML
                document_xml = docx_zip.read('word/document.xml')
                
                # Parse the XML
                root = ET.fromstring(document_xml)
                
                # Define namespace
                namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                
                # Extract text from all text nodes
                paragraphs = []
                for paragraph in root.findall('.//w:p', namespace):
                    para_text = ''
                    for text_node in paragraph.findall('.//w:t', namespace):
                        if text_node.text:
                            para_text += text_node.text
                    if para_text.strip():
                        paragraphs.append(para_text.strip())
            
            # Clean up the temporary file
            os.unlink(temp_file_path)
            
            extracted_text = '\n'.join(paragraphs)
            
            # Verify we actually got content
            if not extracted_text.strip():
                raise ValueError("No text content extracted from DOCX file")
                
            return extracted_text
            
        except KeyError:
            # Handle case where document.xml doesn't exist
            os.unlink(temp_file_path)
            return "Invalid Word document format - missing document content"
            
    except Exception as e:
        print(f"Error extracting text from Word document: {str(e)}")
        return f"Unable to extract text from the Word document: {str(e)}"

def extract_text_from_document(file_content, file_key):
    """Determine file type and extract text."""
    # First, try to detect file type by content (magic bytes)
    file_type = detect_file_type(file_content)
    
    # Also check file extension as backup
    file_extension = file_key.lower().split('.')[-1] if '.' in file_key else ''
    
    # Determine actual file type
    if file_type == 'pdf' or file_extension == 'pdf':
        actual_type = 'pdf'
    elif file_type == 'docx' or file_extension in ['docx', 'doc']:
        actual_type = 'docx'
    else:
        return f"Unsupported file type: {file_type}. Please upload a PDF or Word document."
    
    if 'pdf' in actual_type:
        result = extract_text_from_pdf(file_content)
    elif 'docx' in actual_type:
        result = extract_text_from_docx(file_content)
    else:
        return f"Unsupported file format: {actual_type}"
    
    return result

def parse_multipart_form_data(event):
    """Parse multipart form data from API Gateway event."""
    try:
        # Get headers (case-insensitive)
        headers = event.get('headers', {})
        content_type = None
        for key, value in headers.items():
            if key.lower() == 'content-type':
                content_type = value
                break
        
        if not content_type or 'multipart/form-data' not in content_type:
            raise ValueError(f"Content type is not multipart/form-data: {content_type}")
        
        # Extract boundary
        boundary = None
        for part in content_type.split(';'):
            if 'boundary=' in part:
                boundary = part.split('boundary=')[1].strip().strip('"')
                break
        
        if not boundary:
            raise ValueError("No boundary found in content type")
        
        print(f"Found boundary: {boundary}")
        
        # Get body content
        body = event.get('body', '')
        if event.get('isBase64Encoded', False):
            body = base64.b64decode(body)
        else:
            body = body.encode('utf-8')
        
        print(f"Body length: {len(body)}")
        
        # Parse multipart data
        boundary_bytes = ('--' + boundary).encode('utf-8')
        parts = body.split(boundary_bytes)
        
        print(f"Found {len(parts)} parts")
        
        for i, part in enumerate(parts):
            print(f"Part {i} length: {len(part)}")
            if b'Content-Disposition: form-data' in part:
                print(f"Part {i} has form-data")
                if b'filename=' in part:
                    print(f"Part {i} has filename")
                    # Extract file content
                    header_end = part.find(b'\r\n\r\n')
                    if header_end != -1:
                        file_content = part[header_end + 4:]
                        # Remove trailing boundary markers and CRLF
                        if file_content.endswith(b'\r\n--'):
                            file_content = file_content[:-4]
                        elif file_content.endswith(b'\r\n'):
                            file_content = file_content[:-2]
                        elif file_content.endswith(b'--'):
                            file_content = file_content[:-2]
                        
                        print(f"Extracted file content length: {len(file_content)}")
                        return file_content
        
        raise ValueError("No file found in multipart data")
        
    except Exception as e:
        print(f"Error parsing multipart data: {str(e)}")
        raise

def lambda_handler(event, context):
    """AWS Lambda handler for text extraction."""
    try:
        print("Text extraction request received")
        print(f"Event: {json.dumps(event, default=str)}")
        
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': get_cors_headers(),
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Get resume data (same as existing optimize flow)
        try:
            # Parse request body
            body = event.get('body', '{}')
            if isinstance(body, str):
                body_data = json.loads(body)
            else:
                body_data = body
            
            # Get resume data (base64 encoded file content)
            resume_data = body_data.get('resume')
            if not resume_data:
                return {
                    'statusCode': 400,
                    'headers': get_cors_headers(),
                    'body': json.dumps({
                        'error': 'No resume data provided'
                    })
                }
            
            print(f"Processing resume data, length: {len(resume_data)}")
            
            # Decode base64 resume data (same as existing flow)
            if resume_data.startswith('data:'):
                # Remove data URL prefix (e.g., "data:application/pdf;base64,")
                header, encoded = resume_data.split(',', 1)
                file_content = base64.b64decode(encoded)
            else:
                # Assume it's already base64 encoded
                file_content = base64.b64decode(resume_data)
            
            print(f"Decoded file content length: {len(file_content)}")
            
        except Exception as e:
            print(f"Error processing resume data: {str(e)}")
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': f'Failed to process resume data: {str(e)}'
                })
            }
        
        # Extract text
        try:
            extracted_text = extract_text_from_document(file_content, 'resume')
            print(f"Extracted text length: {len(extracted_text)}")
        except Exception as e:
            print(f"Error extracting text: {str(e)}")
            return {
                'statusCode': 500,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Failed to extract text from file'
                })
            }
        
        # Validate extraction
        if extracted_text.startswith("Unfortunately") or extracted_text.startswith("Error") or extracted_text.startswith("Unable"):
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': extracted_text  # Return the actual error message for debugging
                })
            }
        
        if len(extracted_text.strip()) < 50:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({
                    'error': 'Resume text too short. Please check your file and try again.'
                })
            }
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'extractedText': extracted_text,
                'textLength': len(extracted_text)
            })
        }
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }