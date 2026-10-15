# How to Upload PDS Template PDF

## 📤 Paano Mag-upload ng PDF Template

### Step-by-Step Guide

#### 1. Login as Super Admin
```
http://localhost:4200/login
```
- Enter your Super Admin credentials
- Click Login

#### 2. Navigate to PDS Template Editor
- Click "Super Admin" dashboard
- Look for "PDS Template Editor" tab sa sidebar (bottom of Settings section)
- Click the tab

#### 3. Upload Your PDF Template
Makikita mo ang upload screen:
```
┌─────────────────────────────────────┐
│  [PDF Icon]                         │
│                                      │
│  Upload PDS Template                │
│                                      │
│  Select the CS Form No. 212         │
│  (Revised 2017) PDF template        │
│                                      │
│  [ Choose PDF File ]                │
│                                      │
│  Supported file: PDF (Max 10MB)     │
└─────────────────────────────────────┘
```

**Click "Choose PDF File" button:**
- File picker will open
- Select your PDS template PDF
- Supported: Any PDF file (max 10MB)

#### 4. Wait for PDF to Load
- Loading indicator will appear
- PDF will be processed by pdf.js
- Success message will show when done

#### 5. Start Editing
Once uploaded, you can:
- ✅ View the PDF with page navigation
- ✅ See all fields in the right sidebar
- ✅ Search for specific fields
- ✅ Edit field positions
- ✅ Use locator tool
- ✅ Save your configuration

---

## 🎯 Features After Upload

### PDF Viewer
- **Navigation**: Previous/Next page buttons
- **Display**: Full PDF rendering with overlays
- **Pages**: Shows current page / total pages

### Field Editor
- **Select Field**: Click any field from the list
- **Edit Coordinates**: Adjust X and Y values
- **Text Alignment**: Center or left-align
- **Font Size**: Adjust text size
- **Apply Changes**: Update field on PDF

### Locator Tool
- **Toggle On**: Click "Toggle Locator" button
- **Move Mouse**: Hover over PDF to see coordinates
- **Live Display**: See x, y values in real-time
- **Click to Use**: Click on PDF to get exact coordinates

### Save Configuration
- **Save Button**: Click "Save Positions"
- **Database**: Configuration saved to PostgreSQL
- **Persistent**: Survives page refresh
- **Automatic**: PDS generation uses saved config

---

## 📋 Supported PDF Templates

### Recommended Template
- **CS Form No. 212** (Revised 2017)
- **Official PDS Form** from Civil Service Commission
- **4 Pages** standard format

### Where to Get the Template

**Option 1: Download from CSC**
```
https://www.csc.gov.ph/
```
- Navigate to Forms section
- Search for "CS Form No. 212"
- Download the PDF template

**Option 2: Use Your Own Template**
- Any PDF with similar layout
- 4-page format (recommended)
- Clear field positions

---

## ⚙️ Technical Details

### File Requirements
- **Format**: PDF (.pdf)
- **Max Size**: 10MB
- **Pages**: Any number (4 recommended)
- **Encoding**: Standard PDF encoding

### How It Works

```
1. User uploads PDF file
   ↓
2. FileReader reads file as ArrayBuffer
   ↓
3. pdf.js processes the PDF data
   ↓
4. PDFDocumentProxy loaded into memory
   ↓
5. Pages rendered on canvas
   ↓
6. Overlays drawn on top
   ↓
7. User edits positions
   ↓
8. Configuration saved to database
```

### PDF Processing
- **Library**: pdf.js (Mozilla)
- **Worker**: CDN-hosted worker script
- **Rendering**: Canvas-based rendering
- **Scale**: 1.5x for better quality

---

## 🐛 Troubleshooting

### PDF Won't Upload

**Problem**: Click "Choose PDF File" but nothing happens

**Solutions**:
1. Check file format (must be .pdf)
2. Check file size (must be under 10MB)
3. Try a different PDF file
4. Check browser console for errors

### PDF Loading Stuck

**Problem**: Loading spinner shows indefinitely

**Solutions**:
1. Refresh the page
2. Check network connection
3. Verify PDF file is not corrupted
4. Try smaller PDF file

### PDF Shows Blank

**Problem**: PDF loads but canvas is blank

**Solutions**:
1. Check browser console for errors
2. Verify pdf.js worker is loading
3. Check if PDF has valid content
4. Try different browser

### Upload Button Disabled

**Problem**: Cannot click upload button

**Solutions**:
1. Check if already uploaded (button hidden after upload)
2. Refresh page to start over
3. Clear browser cache
4. Check console for JavaScript errors

---

## 💡 Best Practices

### Before Uploading

1. **Verify PDF File**
   - Open in Adobe Reader to confirm it's valid
   - Check that all pages render correctly
   - Ensure file size is reasonable

2. **Prepare Your Template**
   - Use clean, high-quality PDF
   - Remove any password protection
   - Flatten any form fields if present

3. **Backup Existing Config**
   - Save current configuration before uploading new template
   - Export overlay positions if needed

### During Editing

1. **Start with Known Fields**
   - Edit common fields first (name, address)
   - Test position accuracy
   - Save frequently

2. **Use Locator Tool**
   - More accurate than manual entry
   - Verify coordinates visually
   - Double-check alignment

3. **Test Before Final Save**
   - Generate sample PDS
   - Verify all fields align correctly
   - Adjust as needed

### After Saving

1. **Generate Test PDS**
   - Use real faculty data
   - Check all pages
   - Verify field positions

2. **Document Changes**
   - Note any significant adjustments
   - Keep record of version changes
   - Communicate to users if needed

---

## 🔒 Security Notes

### File Upload Security
- Only PDF files accepted
- Max size limit enforced (10MB)
- Files processed in browser memory
- No server-side storage of uploaded PDF

### Access Control
- Only Super Admin can upload
- Only Super Admin can edit positions
- Only Super Admin can save configuration
- All users can use saved configuration

### Data Privacy
- PDF stays in browser memory
- Only coordinates saved to database
- No PDF content stored in backend
- Configuration is position data only

---

## 📊 File Size Guidelines

### Optimal Sizes
- **Small**: < 1MB (Fast loading)
- **Medium**: 1-5MB (Normal loading)
- **Large**: 5-10MB (Slow loading)
- **Too Large**: > 10MB (Not supported)

### Reducing PDF Size

If your PDF is too large:

1. **Use PDF Optimizer**
   - Adobe Acrobat: File > Save as Other > Optimized PDF
   - Online tools: Smallpdf, ILovePDF

2. **Reduce Image Quality**
   - Lower DPI for embedded images
   - Convert color to grayscale if acceptable
   - Remove unnecessary images

3. **Remove Metadata**
   - Strip document properties
   - Remove comments and annotations
   - Clear form data

---

## 🎨 UI Features

### Upload Screen
- Large, friendly upload area
- Clear instructions
- PDF icon indicator
- File size limit shown

### After Upload
- PDF viewer with navigation
- Field list with search
- Position editor panel
- Locator tool overlay

### Responsive Design
- Works on desktop browsers
- Optimized for large screens
- Touch-friendly controls
- Accessible keyboard navigation

---

## 🚀 Quick Reference

| Action | Steps |
|--------|-------|
| Upload PDF | Click "Choose PDF File" → Select file → Wait for load |
| View Page | Use Previous/Next buttons |
| Select Field | Click field name in right sidebar |
| Edit Position | Change X/Y values → Click "Apply Changes" |
| Use Locator | Click "Toggle Locator" → Move mouse → Click on PDF |
| Save Config | Click "Save Positions" button |
| Reset | Click "Reset Positions" → Confirm |

---

## ✅ Success Checklist

Before considering the upload complete:

- [ ] PDF file uploaded successfully
- [ ] All pages visible in viewer
- [ ] Can navigate between pages
- [ ] Field list populated
- [ ] Can select fields
- [ ] Can edit field positions
- [ ] Locator tool works
- [ ] Can save configuration
- [ ] Configuration persists after refresh

---

**Last Updated**: December 2024  
**Feature Version**: 1.0  
**Status**: Production Ready
