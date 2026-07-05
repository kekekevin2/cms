# Organization Adviser - Automatic Display Documentation

## Overview
The Officer Profile in the Organization portal **automatically displays** the adviser(s) assigned by the Dean. This is a read-only, system-managed feature that ensures data consistency across the application.

## How It Works

### 1. Adviser Assignment by Dean
**Location:** Dean Portal → Organization Management

When a Dean creates or updates an organization:
- Dean selects a faculty member to be the adviser
- System creates a record in `organization_advisers` table with `is_active = true`
- No manual input is required from the organization

**Backend:** `dean-organization.controller.js`
```javascript
// During org creation (line 127-131)
await db.OrganizationAdviser.create({
  organization_id: organization.organization_id,
  faculty_id: adviser_id_1,
  assigned_date: new Date(),
  is_active: true,
}, { transaction });

// When updating adviser (line 362-382)
// Step 1: Deactivate old adviser
await db.OrganizationAdviser.update(
  { is_active: false },
  { where: { organization_id: id, is_active: true } }
);

// Step 2: Create new active adviser
await db.OrganizationAdviser.create({
  organization_id: id,
  faculty_id,
  assigned_date: new Date(),
  is_active: true,
});
```

### 2. Automatic Retrieval in Officer Profile
**Location:** Organization Portal → Officer Profile Tab

When organization user switches to Officer Profile:
- `toggleViewMode('officers')` is called
- `loadAdvisers()` automatically fetches active adviser(s)
- Backend returns only records where `is_active = true`
- Frontend displays the adviser information

**Backend Endpoint:** `GET /api/organization/dashboard/advisers`
```javascript
// organization-adviser.controller.js - getAdvisers()
const advisers = await db.OrganizationAdviser.findAll({
  where: {
    organization_id: organization.organization_id,
    is_active: true  // Only active advisers
  },
  include: [{ 
    model: db.Faculty,
    as: "Faculty",
    attributes: [/* all faculty details */]
  }]
});
```

**Frontend Service:** `organization.service.ts`
```typescript
getAdvisers(): Observable<AdvisersResponse> {
  return this.http.get<AdvisersResponse>(`${this.apiUrl}/advisers`);
}
```

**Frontend Component:** `organization-members.ts`
```typescript
loadAdvisers() {
  // Automatically load the adviser(s) assigned by the Dean
  this.organizationService.getAdvisers().subscribe({
    next: (response) => {
      const activeAdvisers = response.advisers.filter((a) => a.is_active);
      this.advisers.set(activeAdvisers);
    }
  });
}
```

### 3. Display in UI
**Location:** `organization-members.html`

The adviser is displayed in a **blue-bordered card** with:
- Visual indicator: "Assigned by Dean"
- All faculty information (name, rank, contact, photo, etc.)
- Date assigned by Dean
- Edit button (for organization to update photo/contact only)

```html
<div class="bg-white rounded-lg shadow-lg border-2 border-blue-600">
  <div class="bg-blue-600 text-white px-6 py-3">
    <h3>Organization Adviser</h3>
    <p class="text-xs">
      <i class="pi pi-shield"></i>
      Assigned by Dean
    </p>
  </div>
  <!-- Adviser details displayed here -->
</div>
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DEAN PORTAL                               │
│  Creates/Updates Organization → Assigns Adviser             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE: organization_advisers                 │
│  { organization_id, faculty_id, is_active: true, ... }      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         BACKEND: GET /api/organization/dashboard/advisers   │
│  Fetches active advisers for logged-in organization         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND: Officer Profile View                  │
│  Automatically displays adviser info (READ-ONLY)            │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### ✅ Automatic Synchronization
- When Dean assigns a new adviser → Organization sees new adviser immediately
- When Dean removes an adviser → Adviser disappears from Officer Profile
- No caching issues - data fetched fresh on each view

### ✅ No Manual Selection
- Organization users **cannot** manually select or add advisers
- Only Dean has permission to assign/update advisers
- Maintains single source of truth

### ✅ Data Consistency
- Adviser info in Officer Profile **always matches** the Dean's assignment
- Historical records preserved (old advisers have `is_active = false`)
- Active adviser always has `is_active = true`

### ✅ Visual Indicators
- "Assigned by Dean" badge in card header
- Blue border distinguishes adviser from other officers
- Date showing when adviser was assigned

## User Experience

### For Organization Users:
1. Navigate to Members → Officer Profile tab
2. Adviser card appears automatically (if assigned by Dean)
3. View all adviser information
4. Can edit adviser photo/contact info only
5. Cannot add/remove/change the adviser

### For Dean:
1. Navigate to Organizations → Select Organization
2. Assign/Update adviser using dropdown
3. Changes reflect immediately in organization's Officer Profile
4. Can view assignment history

## Database Schema

### Table: `organization_advisers`
```sql
CREATE TABLE organization_advisers (
  adviser_id INT PRIMARY KEY AUTO_INCREMENT,
  organization_id INT NOT NULL,
  faculty_id INT NOT NULL,
  assigned_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  length_of_service VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id)
);
```

### Key Columns:
- `is_active`: TRUE = current adviser, FALSE = previous adviser
- `assigned_date`: When Dean assigned this adviser
- `organization_id`: Links to organization
- `faculty_id`: Links to faculty member

## Error Handling

### Scenario 1: No Adviser Assigned
**Display:**
```
┌──────────────────────────────────────┐
│  Organization Adviser                │
│  Assigned by Dean                    │
├──────────────────────────────────────┤
│  👤 No adviser assigned yet          │
│                                      │
│  Your organization's adviser is      │
│  assigned by the Dean during setup.  │
│                                      │
│  Please contact your Dean.           │
│                                      │
│  ℹ️ Note: Advisers cannot be         │
│  manually selected in Officer        │
│  Profile. Only the Dean can assign   │
│  or update your adviser.             │
└──────────────────────────────────────┘
```

### Scenario 2: Adviser Data Missing
- System gracefully handles missing Faculty data
- Shows "N/A" for missing fields
- Still displays available information

### Scenario 3: Multiple Advisers
- System supports up to 2 active advisers
- Both are displayed in Officer Profile
- Sorted by `assigned_date` (oldest first)

## API Endpoints

### 1. Get Advisers (Organization)
```
GET /api/organization/dashboard/advisers
Headers: Authorization: Bearer <token>
Response: { advisers: [...] }
```

### 2. Assign Adviser (Dean Only)
```
POST /api/dean/organizations/:id/advisers
Body: { faculty_id: number }
Response: { message: "...", adviser: {...} }
```

### 3. Update Adviser Info (Organization - Limited)
```
PUT /api/organization/dashboard/advisers/:id/photo
Body: FormData with photo, contact info
Response: { message: "...", adviser: {...} }
```

## Security & Permissions

### Organization Role:
- ✅ Can view adviser information
- ✅ Can update adviser photo/contact/personal info
- ❌ Cannot assign/remove advisers
- ❌ Cannot change which faculty is the adviser

### Dean Role:
- ✅ Can assign advisers to organizations in their department
- ✅ Can update adviser assignments
- ✅ Can remove advisers
- ✅ Can view all adviser assignments

### Data Isolation:
- Organizations can only see their own adviser
- Deans can only manage advisers in their department
- SQL queries include `department` filtering

## Testing Checklist

### ✅ Create Organization with Adviser
1. Dean creates organization with adviser
2. Organization logs in
3. Navigate to Officer Profile
4. Verify adviser is displayed

### ✅ Update Adviser
1. Dean changes organization's adviser
2. Organization refreshes Officer Profile
3. Verify new adviser is displayed
4. Verify old adviser is NOT displayed

### ✅ No Adviser Scenario
1. Dean creates organization without adviser (or removes adviser)
2. Organization views Officer Profile
3. Verify helpful message is displayed

### ✅ Multiple Advisers
1. Dean assigns 2 advisers to organization
2. Organization views Officer Profile
3. Verify both advisers are displayed

### ✅ Data Consistency
1. Compare adviser in Dean's view vs Organization's view
2. Verify data matches exactly
3. Check timestamps are correct

## Maintenance Notes

### Adding New Adviser Fields:
1. Add column to `organization_advisers` or `faculties` table
2. Update `OrganizationAdviser` interface in `organization.service.ts`
3. Update backend `getAdvisers()` to include field in query
4. Update HTML template to display new field

### Modifying Permissions:
- Edit `assignAdviser()` in `dean-organization.controller.js`
- Update role checks in `role.middleware.js`
- Test with different user roles

## Troubleshooting

### Issue: Adviser not displaying
**Check:**
1. Is `is_active = true` in database?
2. Is organization_id correct in `organization_advisers` table?
3. Are there any console errors in browser/backend?
4. Is `loadAdvisers()` being called when switching to Officer Profile?

### Issue: Wrong adviser displaying
**Check:**
1. Are there multiple active advisers for this org?
2. Run: `SELECT * FROM organization_advisers WHERE organization_id = X AND is_active = true`
3. Verify Dean properly deactivated old adviser before creating new one

### Issue: Adviser info not updating
**Check:**
1. Clear browser cache
2. Check if backend is returning updated data
3. Verify signal reactivity in Angular component
4. Check console logs for API response

## Future Enhancements

### Potential Improvements:
- [ ] Show adviser change history timeline
- [ ] Email notification when adviser is changed
- [ ] Adviser dashboard showing all assigned organizations
- [ ] Bulk adviser assignment for multiple organizations
- [ ] Adviser performance/activity tracking

---

**Last Updated:** 2026-07-01  
**Version:** 1.0  
**Maintained by:** Development Team
