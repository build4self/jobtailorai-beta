#!/usr/bin/env python3
"""
Font setup script for PDF generation.
This script helps set up fonts for professional PDF generation.
"""

import os
import urllib.request
import zipfile

def setup_fonts():
    """
    Set up fonts for PDF generation.
    Downloads open-source alternatives to Calibri.
    """
    fonts_dir = "fonts"
    if not os.path.exists(fonts_dir):
        os.makedirs(fonts_dir)
    
    print("Setting up fonts for PDF generation...")
    
    # For now, we'll use Carlito (open-source Calibri alternative)
    # or provide instructions for adding Calibri
    
    print("""
    FONT SETUP INSTRUCTIONS:
    
    Option 1: Use Calibri (if you have it legally):
    1. Copy calibri.ttf and calibrib.ttf to the fonts/ directory
    2. These files are typically found in:
       - Windows: C:\\Windows\\Fonts\\
       - macOS: /System/Library/Fonts/ or /Library/Fonts/
    
    Option 2: Use Carlito (open-source Calibri alternative):
    1. Download from Google Fonts or use the system Arial font
    2. The code will automatically fall back to Arial if Calibri is not found
    
    Current status: The code will use Arial as fallback, which looks professional.
    """)

if __name__ == "__main__":
    setup_fonts()