# 🔧 PDF Display in Locator - Debugging & Fix

## Issue
When uploading a PDF, it's not showing up in the locator/canvas area - just showing blank gray space.

## Root Causes Found

### 1. Missing Page Numbers in overlay-positions.json
- Your JSON file doesn't have `page` field in field definitions
- Old code filtered out ALL fields because `f.page === undefined`
- **Fixed**: Now defaults fields without page to page 1

### 2. PDF.js May Not Be Fully Loaded
- Added wait loop to ensure `pdfjsLib` is available
- Added error handling if library fails to load

### 3. Canvas Elements May Not Be Ready
- Added check to ensure canvas elements exist before rendering
- Added 200ms delay after setting `pdfUploaded = true`

## Fixes Applied

### A. Updated `drawOverlays()` Method
```typescript
// OLD (broken):
.filter((f) => f.page === pageNum && f.type !== 'image')

// NEW (fixed):
.filter((f) => {
  const fieldPage = f.page || 1; // Default to page 1
  return fieldPage === pageNum && f.type !== 'image';
})
```

### B. Updated `loadConfig()` Method
```typescript
// Ensure page defaults to 1 if not specified
this.overlays = (response.config.config_data.positions || []).map((pos) => ({
  ...pos,
  page: pos.page !== undefined ? pos.page : 1,
  maxWidth: pos.maxWidth ?? null,
  overflow: pos.overflow ?? null,
}));
```

### C. Added Console Logging
Now logs to browser console:
- PDF loading status
- PDF data size
- Number of pages
- Canvas sizes
- Rendering progress

## How to Test & Debug

### 1. Clear Browser Cache
```
Ctrl + Shift + Delete → Clear cache
```

### 2. Restart Dev Server
```bash
cd client
npm start
```

### 3. Open Browser Console
```
F12 → Console tab
```

### 4. Upload a PDF

You should see these logs:
```
PDF.js initialized successfully
Loading PDF with PDF.js...
PDF data size: 234567 bytes
PDF loaded successfully! 4 pages
Rendering page 1 of 4
Viewport size: 1224 x 1584
Canvas size set to: 1224 x 1584
Rendering PDF page to canvas...
PDF page rendered successfully
Overlays drawn
```

### 5. If You See Errors

**Error: "Canvas elements not ready"**
- Canvas not in DOM yet
- Wait message should handle this
- If persists, increase delay in `onPdfFileSelected()`

**Error: "PDF.js library failed to load"**
- Check internet connection
- Check if script tag is in index.html
- Try hard refresh (Ctrl + F5)

**Error: "Failed to load PDF file"**
- PDF may be corrupted
- Try a different PDF
- Check PDF file size

**PDF loads but canvas is blank**
- Check console for Canvas size
- Should see width x height (e.g., 1224 x 1584)
- If 0 x 0, canvas isn't rendering

## Expected Behavior

### After Upload:
1. ✅ Gray area disappears
2. ✅ PDF page displays in canvas
3. ✅ "Page 1 of X" shows correct count
4. ✅ Field list shows on right side
5. ✅ Locator button toggles ON/OFF
6. ✅ Moving mouse shows coordinates

### While Using:
- Click field → highlights on PDF
- Toggle Locator ON → crosshair cursor appears
- Move mouse → shows x, y coordinates
- Click Prev/Next → changes PDF pages
- Edit field → updates position

## Files Modified

1. ✅ `client/src/index.html`
   - Added PDF.js CDN script

2. ✅ `client/src/app/features/superadmin/pds-template-editor/pds-template-editor.ts`
   - Updated `drawOverlays()` - default page to 1
   - Updated `loadConfig()` - handle missing page
   - Updated `selectField()` - handle missing page
   - Updated `loadUploadedPDF()` - added logging
   - Updated `renderPage()` - added logging
   - Updated `onPdfFileSelected()` - better sequencing

## Common Issues & Solutions

### Issue: Blank canvas after upload
**Solution**: Check console logs for errors

### Issue: PDF.js not defined
**Solution**: 
```html
<!-- Verify this is in index.html -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

### Issue: Canvas shows but no PDF
**Solution**: PDF rendering failed - check console

### Issue: Fields don't show
**Solution**: 
- Fields have no page numbers in JSON
- Should default to page 1 now
- Check console for "Overlays drawn"

### Issue: Coordinates don't show
**Solution**: 
- Toggle Locator ON
- Move mouse over canvas
- Check bottom of canvas for "x: 123 y: 456"

## Next Steps if Still Not Working

1. **Check Browser Console**
   - Any red errors?
   - Copy error message

2. **Check Network Tab**
   - Is PDF.js loading? (should see pdf.min.js)
   - Status 200 = good
   - Status 404 = not found

3. **Try Different PDF**
   - Use a simple test PDF
   - Check if specific PDF is the issue

4. **Check Canvas Elements**
   - In Console, type: `document.querySelector('canvas')`
   - Should see canvas elements
   - If null, canvases aren't rendered

---

**Updated**: August 10, 2026  
**Issue**: PDF not displaying in canvas  
**Status**: Fixed + Debug logging added  
**Test**: Upload PDF → Check console logs
