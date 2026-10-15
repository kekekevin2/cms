# College-Based Centralized System - Data Flow Diagrams

---

## Context Diagram (Level 0)

```
┌──────────────┐                                                    ┌──────────────┐
│              │  Login Credentials                                 │              │
│              │  Profile Management                                │              │
│  SUPERADMIN  │─────────────────────────┐                         │   FACULTY    │
│              │                         │                         │              │
│              │  System Analytics      │                         │              │
└──────────────┘  User Management       │                         └──────────────┘
                                        │                                │
                                        │                                │
                                        ▼                                │
        ┌────────────────────────────────────────────────┐             │
        │                                                │             │
        │        COLLEGE-BASED CENTRALIZED               │             │
        │    SYSTEM FOR FACULTY AND STUDENT              │◄────────────┘
        │        ORGANIZATION MANAGEMENT                 │
        │                                                │
        │                 (Process 0)                    │
        │                                                │
        └────────────────────────────────────────────────┘
                         ▲                    ▲
                         │                    │
                         │                    │
      ┌──────────────────┘                    └────────────────────┐
      │                                                            │
      │                                                            │
┌──────────────┐                                            ┌──────────────┐
│              │  Login Credentials                         │              │
│              │  Department Data                           │              │
│  DEPARTMENT  │  Faculty Management                        │ ORGANIZATION │
│    (DEAN)    │  Organization Oversight                    │              │
│              │  Requirements Monitoring                   │              │
│              │  Analytics & Reports                       │              │
└──────────────┘                                            └──────────────┘
      │                                                            │
      │  Uploaded Documents                                        │
      │  PDS Records                                               │
      │  Credentials                                               │
      └────────────────────────────────────────────────────────────┘
         Event Reports
         Organization Population
         Officer Profiles
         Activity Plans
```

### External Entities

1. **SUPERADMIN** - System administrator managing all users, departments, and system configurations
2. **DEPARTMENT (DEAN)** - Department heads managing faculty and student organizations
3. **FACULTY** - Faculty members managing credentials, PDS, and documents
4. **ORGANIZATION** - Student organizations managing events, members, and activities

### Data Flows (Context Level)

#### SUPERADMIN ↔ System:
- **Input**: Login credentials, system configurations, user management actions
- **Output**: System analytics, user reports, dashboard data

#### DEPARTMENT (DEAN) ↔ System:
- **Input**: Login credentials, faculty/organization management, requirements configuration, approval/rejection actions
- **Output**: Analytics reports, faculty credentials, organization documents, PDS records, event monitoring data

#### FACULTY ↔ System:
- **Input**: Login credentials, PDS data, credentials (diplomas, certificates, seminars), document uploads
- **Output**: Profile information, requirement status, announcements, document records

#### ORGANIZATION ↔ System:
- **Input**: Login credentials, event plans, organization population, officer profiles, activity reports
- **Output**: Event analytics, organization dashboard, uploaded document records, notifications

---

## Data Flow Diagram - Level 1

```
┌──────────┐  Login           ┌──────────────────┐  Login           ┌──────────┐
│ FACULTY  │  Credentials     │                  │  Credentials     │  DEPT    │
│          │─────────────────►│   1.0            │◄─────────────────│ (DEAN)   │
└──────────┘                  │                  │                  └──────────┘
     │                        │  AUTHENTICATE    │                       │
     │                        │  & AUTHORIZE     │                       │
     │                        │                  │                       │
     │                        └──────────────────┘                       │
     │                                │                                  │
     │                                │ Auth Token                       │
     │                                ▼                                  │
     │                    ┌──────────────────────┐                      │
     │                    │   D1: User Database  │                      │
     │                    │   (Authentication)   │                      │
     │                    └──────────────────────┘                      │
     │                                                                   │
     │                                                                   │
     │  PDS Data                                                         │
     │  Credentials        ┌──────────────────┐                         │
     │────────────────────►│                  │                         │
     │                     │      2.0         │                         │
     │                     │                  │                         │
     │                     │  MANAGE FACULTY  │                         │
     │                     │  CREDENTIALS &   │◄────────────────────────┤
     │                     │  PDS             │   Review/Approve        │
     │                     │                  │   Requirements          │
     │  Profile            └──────────────────┘                         │
     │  Document Records           │                                    │
     │◄────────────────────────────┘                                    │
     │                             │                                    │
     │                             ▼                                    │
     │                 ┌───────────────────────┐                        │
     │                 │  D2: Faculty Database │                        │
     │                 │  (PDS, Credentials,   │                        │
     │                 │   Requirements)       │                        │
     │                 └───────────────────────┘                        │
     │                             │                                    │
     │                             │ Faculty Info                       │
     │                             ▼                                    │
     │                 ┌──────────────────┐                             │
     │                 │                  │  Analytics Data             │
     │                 │      3.0         │─────────────────────────────┤
     │                 │                  │                             │
     │                 │  MONITOR &       │                             │
     │                 │  GENERATE        │                             │
     │  Announcements  │  ANALYTICS       │                             │
     │◄────────────────│                  │                             │
     │                 └──────────────────┘                             │
     │                                                                   │
     │                                                                   │
     │                                                         Dashboard │
     │                                                         Reports   │
     │                                                         Analytics │
     │                                                                   │
┌──────────┐  Event Plans      ┌──────────────────┐                    │
│   ORG    │  Officer Data     │                  │                    │
│          │──────────────────►│      4.0         │                    │
└──────────┘                   │                  │                    │
     │                         │  MANAGE          │                    │
     │                         │  ORGANIZATION    │◄───────────────────┘
     │                         │  EVENTS &        │  Monitor Events
     │  Event                  │  MEMBERS         │  View Org Data
     │  Records                │                  │  Approve Advisers
     │◄────────────────────────│                  │
     │                         └──────────────────┘
     │                                 │
     │                                 │
     │                                 ▼
     │                    ┌─────────────────────────┐
     │                    │  D3: Organization DB    │
     │                    │  (Events, Members,      │
     │                    │   Officers, Documents)  │
     │                    └─────────────────────────┘
     │                                 │
     │                                 │ Org Data
     │                                 ▼
     │                    ┌──────────────────┐
     │                    │                  │
     │                    │      5.0         │
     │                    │                  │
     │                    │  MANAGE          │
     │  Population        │  REQUIREMENTS &  │
     │  Records           │  DOCUMENTS       │◄──────────────────────┐
     │◄───────────────────│                  │                       │
     │                    │                  │                       │
     │                    └──────────────────┘                       │
     │                             │                                 │
     │                             │                                 │
     │                             ▼                                 │
     │                 ┌───────────────────────┐                     │
     │                 │  D4: Requirements &   │                     │
     │                 │  Documents Database   │                     │
     │                 └───────────────────────┘                     │
     │                             │                                 │
     │                             │ Requirement Status              │
     │                             ▼                                 │
     │                 ┌──────────────────┐                          │
     │                 │                  │  Requirement Config      │
     │                 │      6.0         │  Document Types          │
     │                 │                  │                          │
     │                 │  CONFIGURE       │                          │
     │                 │  SYSTEM          │◄─────────────────────────┤
     │                 │  SETTINGS        │                          │
     │                 │                  │                          │
     │                 └──────────────────┘                          │
     │                             │                                 │
     │                             │                                 │
     │                             ▼                                 │
     │                 ┌───────────────────────┐                     │
     │                 │  D5: System Config DB │                     │
     │                 │  (Academic Years,     │                     │
     │                 │   Campuses, Depts)    │                     │
     │                 └───────────────────────┘                     │
     │                             │                                 │
     │                             │ Config Data                     │
     │                             └─────────────────────────────────┤
     │                                                                │
     │                 ┌──────────────────┐                          │
     │                 │                  │  User Management         │
     │                 │      7.0         │  System Reports          │
┌──────────┐          │                  │◄─────────────────────────┘
│SUPERADMIN│          │  SUPERADMIN      │
│          │─────────►│  MANAGEMENT      │
└──────────┘  Login   │                  │
    │                 │                  │
    │                 └──────────────────┘
    │                          │
    │                          │
    │                          ▼
    │              ┌───────────────────────┐
    │              │  D6: Admin Database   │
    │  Analytics   │  (All Users, Logs,    │
    │  Dashboard   │   System Activity)    │
    │◄─────────────│                       │
    │              └───────────────────────┘
    │
    └───────────────────────────────────────────────────────────┐
                                                                 │
                                                                 │
                                                    System       │
                                                    Configuration│
                                                    Changes      │
                                                                 │
                                                                 ▼
                                                      ┌──────────────────┐
                                                      │   D1, D2, D3,    │
                                                      │   D4, D5, D6     │
                                                      │  (All Databases) │
                                                      └──────────────────┘
```

---

## Process Descriptions (Level 1)

### 1.0 - AUTHENTICATE & AUTHORIZE
**Description**: Handles user login, password reset, and session management for all user roles.

**Inputs**:
- Login credentials (email, password) from all entities
- Password reset requests
- Session tokens

**Outputs**:
- Authentication tokens
- User profile data
- Access permissions

**Data Stores**:
- D1: User Database (Authentication)

---

### 2.0 - MANAGE FACULTY CREDENTIALS & PDS
**Description**: Processes faculty Personal Data Sheet (PDS) submissions, manages credentials (diplomas, certificates, seminars/training), and handles document uploads.

**Inputs from Faculty**:
- Personal Data Sheet information
- Educational attainment (diplomas)
- Certificates and awards
- Seminars/training attendance records
- Document uploads

**Inputs from Department (Dean)**:
- Review requests
- Approval/rejection actions
- Feedback/comments

**Outputs to Faculty**:
- Profile information
- Document submission status
- Requirement completion status

**Outputs to Department**:
- Faculty credential reports
- PDS records
- Compliance analytics

**Data Stores**:
- D2: Faculty Database (PDS, Credentials, Requirements)

---

### 3.0 - MONITOR & GENERATE ANALYTICS
**Description**: Generates analytics, dashboards, and reports for faculty performance, organization activities, and system-wide statistics.

**Inputs**:
- Faculty credential data from D2
- Organization event data from D3
- Requirement completion data from D4
- System activity logs

**Outputs**:
- Dashboard analytics for Dean
- Faculty performance reports
- Organization activity reports
- Requirement compliance statistics
- Data visualizations

**Data Stores**:
- Reads from D2, D3, D4, D6

---

### 4.0 - MANAGE ORGANIZATION EVENTS & MEMBERS
**Description**: Handles student organization event planning, officer management, member population tracking, and activity reporting.

**Inputs from Organization**:
- Event plans (narrative reports, activity plans)
- Officer profiles (with photos and signatures)
- Organization population data (bulk uploads)
- Event attendance records
- Activity reports

**Inputs from Department (Dean)**:
- Event approval/monitoring
- Adviser assignments
- Organization oversight

**Outputs to Organization**:
- Event records
- Officer profiles
- Population records
- Event analytics

**Outputs to Department**:
- Event monitoring dashboards
- Organization activity reports
- Event analytics
- Compliance tracking

**Data Stores**:
- D3: Organization Database (Events, Members, Officers, Documents)

---

### 5.0 - MANAGE REQUIREMENTS & DOCUMENTS
**Description**: Manages document requirements, submission tracking, approval workflows, and document storage for both faculty and organizations.

**Inputs from Faculty**:
- Credential documents
- PDS attachments
- CVL (Credential Verification List) attachments

**Inputs from Organization**:
- Organizational documents
- Event-related documents
- Officer documents

**Inputs from Department**:
- Requirement configurations
- Document type definitions
- Approval/rejection actions

**Outputs**:
- Document records
- Requirement status
- Submission confirmations
- File download links

**Data Stores**:
- D4: Requirements & Documents Database

---

### 6.0 - CONFIGURE SYSTEM SETTINGS
**Description**: Manages system-wide configurations including academic years, campuses, departments, college departments, and document types.

**Inputs from Superadmin**:
- Academic year definitions
- Campus information
- Department structures
- College department data

**Inputs from Department**:
- Requirement type configurations
- Document type definitions
- Semester settings

**Outputs**:
- Configuration data for all processes
- Dropdown options
- System settings

**Data Stores**:
- D5: System Config Database (Academic Years, Campuses, Departments)

---

### 7.0 - SUPERADMIN MANAGEMENT
**Description**: Provides superadmin with system-wide user management, dashboard analytics, and administrative control over all entities.

**Inputs from Superadmin**:
- User creation requests (Dean, Faculty, Organization)
- User management actions
- System configuration changes
- Report generation requests

**Outputs to Superadmin**:
- System-wide analytics
- User management dashboard
- Activity logs
- System health reports

**Data Stores**:
- D6: Admin Database (All Users, Logs, System Activity)
- Reads from all other data stores (D1-D5)

---

## Data Stores

### D1: User Database (Authentication)
**Contains**: User accounts, credentials, roles, authentication tokens, session data

**Used by**: Process 1.0 (Authentication)

---

### D2: Faculty Database
**Contains**: 
- Personal Data Sheet (PDS) records
- Faculty profiles
- Educational attainment
- Credentials (diplomas, certificates)
- Seminars/training records
- Employment profiles
- Awards and recognitions
- Research activities
- Extension activities

**Used by**: Process 2.0 (Faculty Credentials), Process 3.0 (Analytics)

---

### D3: Organization Database
**Contains**:
- Organization profiles
- Events and activities
- Organization officers
- Member population data
- Event attendance records
- Activity reports
- Organization advisers
- Bulk upload records

**Used by**: Process 4.0 (Organization Management), Process 3.0 (Analytics)

---

### D4: Requirements & Documents Database
**Contains**:
- Document requirements configuration
- Document type definitions
- Uploaded documents and files
- Requirement submission tracking
- Approval status
- CVL attachments
- Organization documents

**Used by**: Process 5.0 (Requirements & Documents)

---

### D5: System Config Database
**Contains**:
- Academic years
- Campuses
- Departments
- College departments
- Semester definitions
- System-wide settings

**Used by**: Process 6.0 (System Configuration), used by all processes for reference data

---

### D6: Admin Database
**Contains**:
- All user records (Superadmin, Dean, Faculty, Organization)
- System activity logs
- Audit trails
- System health metrics
- Cross-entity analytics data

**Used by**: Process 7.0 (Superadmin Management), consolidates data from all other stores

---

## Key Data Flow Characteristics

### 1. **Authentication Flow**
All entities must authenticate through Process 1.0 before accessing any system features. Authentication tokens are validated for each request.

### 2. **Faculty Workflow**
Faculty → Submit PDS/Credentials → Process 2.0 → Store in D2 → Dean Reviews → Process 3.0 generates analytics

### 3. **Organization Workflow**
Organization → Create Events/Officers → Process 4.0 → Store in D3 → Dean Monitors → Process 3.0 generates analytics

### 4. **Approval Workflow**
Faculty/Organization → Submit Documents → Process 5.0 → Dean Reviews → Approval/Rejection → Notification back to submitter

### 5. **Analytics Flow**
Data from D2, D3, D4 → Process 3.0 → Generate Reports → Display to Dean dashboard

### 6. **Superadmin Control**
Superadmin → Process 7.0 → Manages all users via D6 → Can access all data stores D1-D5

---

## System Boundaries

The system boundaries include:
- User authentication and authorization
- Faculty credential management
- Organization event management
- Requirements and document tracking
- Analytics and reporting
- System configuration management
- Superadmin oversight

External to the system (future integrations):
- Email notification services (currently managed within system)
- External credential verification services
- File storage services (currently local storage)
- Third-party analytics tools

---

## Notes

- All data flows are secured with role-based access control
- The system uses RESTful API architecture
- File uploads are stored in local server storage
- Database uses Sequelize ORM with MySQL
- Real-time updates use HTTP polling (no WebSockets currently)
- All sensitive operations require authentication token validation

---

**Legend**:
- **Rectangle with rounded corners**: Process
- **Rectangle**: External Entity
- **Open rectangle**: Data Store
- **Arrow**: Data Flow
- **D#**: Data Store identifier
