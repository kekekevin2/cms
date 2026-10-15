# PDS Template Editor - Testing Guide

## Overview
This guide will help you test the complete PDS Template Editor integration into the main CMS website.

## What Was Implemented

### Backend Components
1. **Database Model** (`backend/models/pds-template-config.model.js`)
   - Stores template configurations with JSON data
   - Tracks versions and active status
   - Auto-creates table on server start via Sequelize sync

2. **API Endpoints** (`backend/controllers/pds-template-config.controller.js`)
   - `GET /api/pds-template-config/active` - Get active config (public)
   - `POST /api/pds-template-config` - Save new config (Super Admin only)
   - `GET /api/pds-template-config/history` - Get config history (Super Admin only)
   - `GET /api/pds-template-config/:id` - Get specific config (Super Admin only)
   - `PUT /api/pds-template-config/:id/restore` - Restore previous config (Super Admin only)

3. **Routes** (`backend/routes/pds-template-config.routes.js`)
   - Integrated with `checkRole('admin')` middleware for Super Admin access

### Frontend Components
1. **Angular Service** (`client/src/app/services/core/pds-template-config.service.ts`)
   - All API methods with proper TypeScript interfaces

2. **PDS Template Editor Component** (`client/src/app/features/superadmin/pds-template-editor/`)
   - PDF viewer with pdf.js
   - Field list with search and grouping
   - Field editor panel with coordinate adjustment
   - Locator tool for finding coordinates on PDF
   - Save/reset functionality

3. **Integration with PDS Generation** (`client/src/app/services/core/pds-pdf.service.ts`)
   - Automatically loads saved configuration
   - Falls back to hardcoded defaults if no config exists
   - Caches configuration for performance

4. **Super Admin Dashboard Integration**
   - New "PDS Template Editor" tab in sidebar
   - Component embedded in dashboard

## Prerequisites

Before testing, ensure you have:

1. ✅ **Node.js** installed (v18 or higher)
2. ✅ **PostgreSQL** database running
3. ✅ **Environment variables** configured in `backend/.env`
4. ✅ **Dependencies installed** for both backend and client
5. ✅ **Super Admin account** credentials

## Setup Instructions

### 1. Resolve Git Conflicts (if any)

```bash
# Check git status
git status

# If you have uncommitted changes, stage them
git add .

# Commit your changes
git commit -m "feat: integrate PDS Template Editor with backend persistence"
```

### 2. Install Dependencies (if needed)

```bash
# Backend
cd backend
npm install

# Client
cd ../client
npm install
```

### 3. Database Setup

The `pds_template_config` table will be created automatically when the backend server starts (via Sequelize sync). No manual migration needed.

### 4. Start the Servers

#### Terminal 1: Backend Server
```bash
cd backend
npm start
```

Expected output:
```
Server running on port 5000
Database connected successfully
Table pds_template_config created or already exists
```

#### Terminal 2: Angular Client
```bash
cd client
npm start
# or
ng serve
```

Expected output:
```
Application bundle generation complete.
✔ Browser application bundle generation complete.
Local:   http://localhost:4200/
```

## Testing Workflow

### Test 1: Login as Super Admin

1. Navigate to `http://localhost:4200/login`
2. Enter Super Admin credentials
3. Verify redirection to Super Admin Dashboard

### Test 2: Access PDS Template Editor

1. In the Super Admin sidebar, look for **"PDS Template Editor"** tab (should be at the bottom of Settings section)
2. Click the "PDS Template Editor" tab
3. **Expected Result:**
   - Page title changes to "PDS Template Editor"
   - PDF viewer loads the PDS template (4 pages)
   - Field list appears on the right side
   - Page navigation controls (Previous/Next) are visible

### Test 3: View and Search Fields

1. Check the field list on the right
   - Fields should be grouped by category (Personal Information, Residential Address, etc.)
   - Each field shows: key name, page number, coordinates

2. Test the search functionality:
   - Type "surname" in the search box
   - **Expected:** Only fields with "surname" in the key should appear
   - Clear search to see all fields again

### Test 4: Edit Field Positions

1. Select a field from the list (e.g., "surname")
   - **Expected:** Field editor panel appears below the search
   - Current coordinates are displayed
   - Field is highlighted on the PDF (blue dashed border)

2. Modify the coordinates:
   - Change the X value (e.g., from 135 to 140)
   - Change the Y value (e.g., from 718 to 720)
   - Click "Apply Changes"
   - **Expected:** Success message appears, field position updates on PDF

3. Test the Locator Tool:
   - Click "Toggle Locator" button
   - **Expected:** Cursor changes, coordinate display appears
   - Move cursor over PDF
   - **Expected:** Live coordinates update (x: ##, y: ##)
   - Click "Toggle Locator" again to turn it off

### Test 5: Save Configuration

1. After making changes to field positions, click "Save Positions" button
2. **Expected:**
   - "Saving..." indicator appears briefly
   - Success message: "PDS template configuration saved successfully"
   - Configuration is now stored in database

3. Verify persistence:
   - Refresh the page
   - **Expected:** Your edited positions should still be visible (not reset)

### Test 6: Reset to Defaults

1. Click "Reset Positions" button
2. **Expected:** Confirmation dialog appears
3. Click "Yes, reset"
4. **Expected:**
   - All fields return to their default positions
   - Success message appears
5. **Note:** This resets to the original loaded positions, but doesn't save automatically

### Test 7: Verify PDS Generation Uses Saved Config

This is the most important test - ensuring the saved configuration is actually used when generating PDFs.

1. Navigate to Faculty or Dean section (whichever has PDS generation)
2. Find a faculty member with complete PDS data
3. Generate/Download their PDS
4. **Expected:**
   - PDF generates successfully
   - Console shows: "PDS Template Configuration loaded: [config data]"
   - Field positions match your saved configuration

5. To verify default fallback:
   - In a separate browser (or incognito), clear backend database table:
     ```sql
     DELETE FROM pds_template_config;
     ```
   - Generate PDS again
   - **Expected:** Console shows "No active PDS template configuration found, using defaults"
   - PDF uses hardcoded default positions

### Test 8: Configuration History (Optional)

If you saved multiple times:

1. Save several configurations with different positions
2. Check backend API directly:
   ```bash
   # Get config history
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:5000/api/pds-template-config/history
   ```

3. **Expected:** JSON response with list of all saved configurations

## Troubleshooting

### Issue: PDF Not Loading

**Symptoms:** Blank PDF viewer or error message

**Solutions:**
- Check that `/public/pds-template.pdf` exists
- Open browser console and check for errors
- Verify pdf.js CDN is accessible: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js

### Issue: "Save Failed" Error

**Symptoms:** Error when clicking "Save Positions"

**Solutions:**
- Check that you're logged in as Super Admin
- Verify backend server is running
- Check backend logs for errors
- Ensure database connection is working

### Issue: Fields Not Showing on Generated PDS

**Symptoms:** PDF generates but fields are missing or misaligned

**Solutions:**
- Check browser console for "PDS Template Configuration loaded" message
- Verify saved configuration has the correct field keys
- Ensure `pds-pdf.service.ts` buildPDSDataMap() includes all necessary fields
- Check that faculty has data for those fields

### Issue: Cannot Access PDS Template Editor Tab

**Symptoms:** Tab not visible or clicking does nothing

**Solutions:**
- Verify you're logged in as Super Admin (not Dean or Faculty)
- Check that `superadmin.ts` imports `PDSTemplateEditor` component
- Check browser console for Angular compilation errors
- Clear browser cache and refresh

### Issue: Database Table Not Created

**Symptoms:** Error about missing table `pds_template_config`

**Solutions:**
- Check backend logs for "Table pds_template_config created"
- Manually run migration:
  ```bash
  cd backend
  node migrations/create-pds-template-config-table.js
  ```
- Verify database connection in `backend/.env`

## API Testing with Postman/curl

### 1. Get Active Configuration
```bash
curl http://localhost:5000/api/pds-template-config/active
```

### 2. Save Configuration (requires Super Admin token)
```bash
curl -X POST http://localhost:5000/api/pds-template-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "config_data": {
      "positions": [
        {
          "key": "surname",
          "page": 1,
          "x": 135,
          "y": 718,
          "text": "SAMPLE",
          "size": 11,
          "center": false,
          "maxWidth": null,
          "overflow": null
        }
      ]
    }
  }'
```

### 3. Get Configuration History
```bash
curl -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
     http://localhost:5000/api/pds-template-config/history?page=1&limit=10
```

## Expected Database Schema

After server starts, check the database:

```sql
-- Connect to your database
\c your_database_name

-- View table structure
\d pds_template_config

-- Expected columns:
-- config_id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
-- config_data (JSONB)
-- version (INTEGER, DEFAULT 1)
-- is_active (BOOLEAN, DEFAULT false)
-- created_by (INTEGER, FOREIGN KEY to users)
-- updated_by (INTEGER, FOREIGN KEY to users)
-- created_at (TIMESTAMP)
-- updated_at (TIMESTAMP)

-- View saved configurations
SELECT config_id, version, is_active, created_at 
FROM pds_template_config 
ORDER BY created_at DESC;
```

## Success Criteria

The integration is successful if:

- ✅ Super Admin can access PDS Template Editor tab
- ✅ PDF template loads and displays correctly
- ✅ Fields can be searched and selected
- ✅ Field positions can be edited and applied
- ✅ Locator tool works for finding coordinates
- ✅ "Save Positions" stores configuration in database
- ✅ Saved configuration persists across page refreshes
- ✅ PDS generation automatically uses saved configuration
- ✅ PDS generation falls back to defaults when no config exists
- ✅ Only Super Admin can save configurations
- ✅ Anyone can view active configuration (for PDS generation)

## Next Steps

After successful testing:

1. **Populate Default Configuration**
   - Use the editor to set positions for all PDS fields
   - Save as the initial configuration

2. **Document Field Naming Conventions**
   - Create a reference guide for field keys
   - Document which keys map to which PDS data

3. **Consider Enhancements** (Optional)
   - Add configuration versioning UI
   - Add ability to restore previous configurations
   - Add configuration export/import
   - Add visual grid overlay on PDF
   - Add zoom controls for PDF viewer

## Files Modified Summary

### Backend
- `backend/models/pds-template-config.model.js` (new)
- `backend/models/index.js` (modified)
- `backend/migrations/create-pds-template-config-table.js` (new)
- `backend/controllers/pds-template-config.controller.js` (new)
- `backend/routes/pds-template-config.routes.js` (new)
- `backend/index.js` (modified)

### Frontend
- `client/src/app/services/core/pds-template-config.service.ts` (new)
- `client/src/app/services/core/pds-pdf.service.ts` (modified)
- `client/src/app/features/superadmin/pds-template-editor/` (new directory)
  - `pds-template-editor.ts`
  - `pds-template-editor.html`
  - `pds-template-editor.css`
- `client/src/app/features/dashboards/superadmin/superadmin.ts` (modified)
- `client/src/app/features/dashboards/superadmin/superadmin.html` (modified)

## Support

If you encounter issues not covered in this guide:

1. Check browser console for errors
2. Check backend server logs
3. Verify all files were created/modified correctly
4. Ensure database is accessible
5. Confirm you're using Super Admin credentials

---

**Testing completed successfully when all success criteria are met!**
