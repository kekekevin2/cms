# 📄 Multiple PDF Upload Feature

## New Feature: Upload Multiple PDF Templates

You can now upload MULTIPLE PDF templates and switch between them to compare coordinates and test different PDS form versions!

## What's New

### ✅ Multiple PDF Support
- Upload as many PDF templates as you need
- Each PDF is stored separately with its name and upload time
- Switch between PDFs instantly
- Delete PDFs you no longer need

### ✅ Visual PDF Manager
- **Grid View**: All uploaded PDFs shown in a card layout
- **Active Indicator**: Selected PDF highlighted with red border and checkmark
- **Quick Actions**: 
  - Click to select/view a PDF
  - Hover to see delete button
  - Add more PDFs with "+ Add PDF" button

### ✅ Template Comparison
- Compare different PDS form versions
- Test field positions across multiple templates
- Keep reference templates loaded while working

## How It Works

### 1. Upload First PDF
- Click "Choose PDF File" button
- Select your first PDS template
- PDF loads and displays in editor

### 2. Upload More PDFs
- Click "+ Add PDF" button (top right of uploaded PDFs section)
- Select another PDF template
- Both PDFs now available

### 3. Switch Between PDFs
- Click on any PDF card to view it
- Active PDF shows with:
  - ✅ Red border
  - ✅ Checkmark icon
  - ✅ Red background tint

### 4. Delete PDFs
- Hover over any PDF card
- Click trash icon that appears
- Confirm deletion
- If deleted PDF was active, automatically switches to next PDF

## UI Screenshots (Text Description)

### Uploaded Templates Section:
```
┌─────────────────────────────────────────────────┐
│ Uploaded Templates (3)              [+ Add PDF] │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 📄       │  │ 📄  ✓   │  │ 📄       │      │
│  │ PDS-2017 │  │ PDS-2024│  │ PDS-test │      │
│  │ 1/10/26  │  │ 1/10/26 │  │ 1/10/26  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                 (selected)                       │
└─────────────────────────────────────────────────┘
```

## Code Changes

### TypeScript Changes

**File**: `client/src/app/features/superadmin/pds-template-editor/pds-template-editor.ts`

#### 1. New Interface:
```typescript
interface UploadedPDF {
  id: string;
  name: string;
  data: Uint8Array;
  uploadedAt: Date;
}
```

#### 2. New Properties:
```typescript
uploadedPDFs = signal<UploadedPDF[]>([]);
selectedPdfId = signal<string | null>(null);
```

#### 3. New Methods:
```typescript
async selectPDF(pdfId: string)  // Switch to a different PDF
deletePDF(pdfId: string)         // Remove a PDF from the list
```

#### 4. Updated Method:
```typescript
onPdfFileSelected(event: Event) // Now adds to array instead of replacing
```

### HTML Changes

**File**: `client/src/app/features/superadmin/pds-template-editor/pds-template-editor.html`

#### 1. PDF Manager Section:
- Grid of uploaded PDF cards
- "+ Add PDF" button
- Visual indicators for selected PDF
- Delete buttons on hover

#### 2. Updated Instructions:
- Added step about selecting PDFs
- Explains multiple template workflow

## Benefits

### For Users:
✅ **Compare Templates**: Test positions across different form versions  
✅ **Keep References**: Load multiple reference PDFs at once  
✅ **Version Testing**: Verify coordinates work on old and new forms  
✅ **Easy Management**: Add, select, and delete PDFs easily  

### For Workflow:
✅ **No Re-uploading**: Upload once, switch anytime  
✅ **Fast Switching**: Instant PDF changes  
✅ **Clean Interface**: See all templates at a glance  
✅ **Memory Efficient**: PDFs stored in browser memory  

## Usage Example

**Scenario**: Testing 2017 vs 2024 PDS forms

1. Upload PDS-2017.pdf
2. Note coordinates for "surname" field
3. Click "+ Add PDF"
4. Upload PDS-2024.pdf
5. Compare coordinates
6. Click on PDS-2017 card to switch back
7. Adjust positions as needed
8. Save when done

## Technical Details

### Storage:
- PDFs stored in component memory (browser RAM)
- Not saved to database (too large)
- Lost on page refresh (intentional)
- Each PDF kept as Uint8Array

### Performance:
- Instant switching between loaded PDFs
- No re-download or re-upload
- Canvas re-renders only when switching
- Memory cleared when PDF deleted

### Limits:
- No file size limit per PDF
- No limit on number of PDFs
- Limited only by browser memory
- Typical: 10-20 PDFs easily handled

## Files Modified

1. ✅ `client/src/app/features/superadmin/pds-template-editor/pds-template-editor.ts`
   - Added UploadedPDF interface
   - Added uploadedPDFs and selectedPdfId signals
   - Added selectPDF() and deletePDF() methods
   - Updated onPdfFileSelected() to add to array

2. ✅ `client/src/app/features/superadmin/pds-template-editor/pds-template-editor.html`
   - Added PDF manager section with grid view
   - Added "+ Add PDF" button
   - Added PDF selection/deletion UI
   - Updated instructions

## Testing

1. Start the application
2. Navigate to PDS Template Editor
3. Upload first PDF - should display
4. Click "+ Add PDF" - upload second PDF
5. Both PDFs should appear in grid
6. Click first PDF - should switch view
7. Click second PDF - should switch view
8. Hover over PDF - trash icon appears
9. Click trash - confirms and deletes
10. If last PDF deleted - returns to upload screen

---

**Added**: August 10, 2026  
**Feature**: Multiple PDF Template Management  
**Purpose**: Compare and test different PDS form versions
