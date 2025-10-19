# Font Setup for Professional PDFs

## Adding Calibri Font

To use Calibri font in your PDFs, you need to add the font files to this directory:

### Required Files:
- `calibri.ttf` (regular weight)
- `calibrib.ttf` (bold weight)

### Where to Find Calibri:

**Windows:**
- Location: `C:\Windows\Fonts\`
- Files: `calibri.ttf`, `calibrib.ttf`

**macOS:**
- Location: `/System/Library/Fonts/` or `/Library/Fonts/`
- Files: `Calibri.ttc` (you may need to extract TTF from TTC)

**Office 365/Microsoft Office:**
- Calibri comes with Microsoft Office installations

### Legal Note:
Calibri is a Microsoft font. Make sure you have proper licensing to use it in your application.

### Alternative Fonts:
If you can't use Calibri, the system will automatically fall back to Arial, which is also professional and widely supported.

### Adding the Fonts:
1. Copy `calibri.ttf` and `calibrib.ttf` to this directory
2. Redeploy your Lambda function
3. The PDF generator will automatically detect and use Calibri

### Current Status:
- ❌ Calibri fonts not found
- ✅ Arial fallback available