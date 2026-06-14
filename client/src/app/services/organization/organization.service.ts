import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces
export interface OrganizationMember {
  member_id: number;
  organization_id: number;
  sr_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  contact_number?: string;
  gender?: 'Male' | 'Female';
  program?: string;
  section?: string;
  department?: string;
  year_level: '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | '5th Year';
  position: string;
  parent_member_id?: number;
  academic_year_id: number;
  is_active: boolean;
  term_start_date: string;
  term_end_date?: string;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
  supervisor?: OrganizationMember;
  subordinates?: OrganizationMember[];
  children?: OrganizationMember[]; // For hierarchy display
  AcademicYear?: {
    academic_year_id: number;
    year_start: number;
    year_end: number;
  };
}

export interface MembersResponse {
  members: OrganizationMember[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface MemberHistoryResponse {
  member: {
    sr_code: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email?: string;
    contact_number?: string;
  };
}

export interface HierarchyResponse {
  hierarchy: OrganizationMember[];
}

export interface PositionTemplate {
  position_id: number;
  position_name: string;
  hierarchy_level: number;
  max_allowed: number;
  description?: string;
}

export interface PositionTemplatesResponse {
  positions: PositionTemplate[];
}

export interface DocumentType {
  document_type_id: number;
  type_name: string;
  description?: string;
  required_per_semester: boolean;
  is_active: boolean;
}

export interface DocumentTypesResponse {
  documentTypes: DocumentType[];
}

export interface OrganizationDocument {
  document_id: number;
  organization_id: number;
  document_type_id: number;
  academic_year_id: number;
  semester: '1st Semester' | '2nd Semester' | 'Summer';
  document_title: string;
  activity_date?: string;
  venue?: string;
  participants?: number;
  sdgs?: number[];
  document_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  submitted_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  reviewed_by?: number;
  review_date?: string;
  review_comments?: string;
  created_at?: string;
  updated_at?: string;
  DocumentType?: DocumentType;
  AcademicYear?: {
    academic_year_id: number;
    year_start: number;
    year_end: number;
  };
  reviewer?: {
    user_id: number;
    email: string;
  };
  Organization?: {
    organization_id: number;
    organization_name: string;
    department: string;
  };
}

export interface DocumentsResponse {
  documents: OrganizationDocument[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface ChecklistItem {
  document_type_id: number;
  type_name: string;
  description?: string;
  required: boolean;
  submitted: boolean;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'revision_needed';
  document_id?: number;
  submitted_date?: string;
}

export interface ChecklistResponse {
  checklist: ChecklistItem[];
}

export interface OrganizationAdviser {
  adviser_id: number;
  organization_id: number;
  faculty_id: number;
  assigned_date: string;
  is_active: boolean;
  Faculty?: {
    faculty_id: number;
    employee_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    contact_number?: string;
  };
}

export interface AdvisersResponse {
  advisers: OrganizationAdviser[];
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/organization/dashboard`;

  // Member Management
  getMembers(
    page: number = 1,
    limit: number = 20,
    search: string = '',
    academicYearId?: number,
    position?: string,
    isActive?: boolean,
  ): Observable<MembersResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) params = params.set('search', search);
    if (academicYearId) params = params.set('academic_year_id', academicYearId.toString());
    if (position) params = params.set('position', position);
    if (isActive !== undefined) params = params.set('is_active', isActive.toString());

    return this.http.get<MembersResponse>(`${this.apiUrl}/members`, { params });
  }

  searchMemberHistory(srCode?: string, name?: string): Observable<MemberHistoryResponse> {
    let params = new HttpParams();
    if (srCode) params = params.set('sr_code', srCode);
    if (name) params = params.set('name', name);

    return this.http.get<MemberHistoryResponse>(`${this.apiUrl}/members/search-history`, {
      params,
    });
  }

  getHierarchy(academicYearId?: number): Observable<HierarchyResponse> {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academic_year_id', academicYearId.toString());

    return this.http.get<HierarchyResponse>(`${this.apiUrl}/members/hierarchy`, { params });
  }

  createMember(
    memberData: Partial<OrganizationMember>,
  ): Observable<{ message: string; member: OrganizationMember }> {
    return this.http.post<{ message: string; member: OrganizationMember }>(
      `${this.apiUrl}/members`,
      memberData,
    );
  }

  createMemberWithPhoto(
    formData: FormData,
  ): Observable<{ message: string; member: OrganizationMember }> {
    return this.http.post<{ message: string; member: OrganizationMember }>(
      `${this.apiUrl}/members`,
      formData,
    );
  }

  updateMember(
    memberId: number,
    memberData: Partial<OrganizationMember>,
  ): Observable<{ message: string; member: OrganizationMember }> {
    return this.http.put<{ message: string; member: OrganizationMember }>(
      `${this.apiUrl}/members/${memberId}`,
      memberData,
    );
  }

  updateMemberWithPhoto(
    memberId: number,
    formData: FormData,
  ): Observable<{ message: string; member: OrganizationMember }> {
    return this.http.put<{ message: string; member: OrganizationMember }>(
      `${this.apiUrl}/members/${memberId}`,
      formData,
    );
  }

  deleteMember(memberId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/members/${memberId}`);
  }

  getPositionTemplates(): Observable<PositionTemplatesResponse> {
    return this.http.get<PositionTemplatesResponse>(`${this.apiUrl}/positions`);
  }

  // Bulk upload
  downloadMembersTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/members/template/download`, {
      responseType: 'blob',
    });
  }

  bulkUploadMembers(formData: FormData): Observable<{ message: string; results: any }> {
    return this.http.post<{ message: string; results: any }>(
      `${this.apiUrl}/members/bulk-upload`,
      formData,
    );
  }

  // Document Management
  getDocuments(
    page: number = 1,
    limit: number = 10,
    academicYearId?: number,
    semester?: string,
    documentTypeId?: number,
    status?: string,
  ): Observable<DocumentsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (academicYearId) params = params.set('academic_year_id', academicYearId.toString());
    if (semester) params = params.set('semester', semester);
    if (documentTypeId) params = params.set('document_type_id', documentTypeId.toString());
    if (status) params = params.set('status', status);

    return this.http.get<DocumentsResponse>(`${this.apiUrl}/documents`, { params });
  }

  getDocumentTypes(): Observable<DocumentTypesResponse> {
    return this.http.get<DocumentTypesResponse>(`${this.apiUrl}/documents/types`);
  }

  getSubmissionChecklist(academicYearId: number, semester: string): Observable<ChecklistResponse> {
    const params = new HttpParams()
      .set('academic_year_id', academicYearId.toString())
      .set('semester', semester);

    return this.http.get<ChecklistResponse>(`${this.apiUrl}/documents/checklist`, {
      params,
    });
  }

  submitDocument(
    formData: FormData,
  ): Observable<{ message: string; document: OrganizationDocument }> {
    return this.http.post<{ message: string; document: OrganizationDocument }>(
      `${this.apiUrl}/documents`,
      formData,
    );
  }

  updateDocument(
    documentId: number,
    formData: FormData,
  ): Observable<{ message: string; document: OrganizationDocument }> {
    return this.http.put<{ message: string; document: OrganizationDocument }>(
      `${this.apiUrl}/documents/${documentId}`,
      formData,
    );
  }

  deleteDocument(documentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/documents/${documentId}`);
  }

  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
  }

  // Adviser Management
  getAdvisers(): Observable<AdvisersResponse> {
    return this.http.get<AdvisersResponse>(`${this.apiUrl}/advisers`);
  }

  updateAdviserPhoto(
    adviserId: number,
    formData: FormData,
  ): Observable<{ message: string; adviser: any }> {
    return this.http.put<{ message: string; adviser: any }>(
      `${this.apiUrl}/advisers/${adviserId}/photo`,
      formData,
    );
  }

  // Demographics
  getDemographics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/demographics`);
  }
}

// Dean Service for Organization Management
@Injectable({
  providedIn: 'root',
})
export class DeanOrganizationManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dean/organization-management`;

  // Adviser Management
  getOrganizationAdvisers(organizationId: number): Observable<AdvisersResponse> {
    return this.http.get<AdvisersResponse>(`${this.apiUrl}/${organizationId}/advisers`);
  }

  assignAdviser(
    organizationId: number,
    facultyId: number,
  ): Observable<{ message: string; adviser: OrganizationAdviser }> {
    return this.http.post<{ message: string; adviser: OrganizationAdviser }>(
      `${this.apiUrl}/${organizationId}/advisers`,
      { faculty_id: facultyId },
    );
  }

  removeAdviser(adviserId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/advisers/${adviserId}`);
  }

  // Document Review
  getOrganizationDocuments(
    page: number = 1,
    limit: number = 10,
    organizationId?: number,
    status?: string,
    semester?: string,
  ): Observable<DocumentsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (organizationId) params = params.set('organization_id', organizationId.toString());
    if (status) params = params.set('status', status);
    if (semester) params = params.set('semester', semester);

    return this.http.get<DocumentsResponse>(`${this.apiUrl}/documents`, { params });
  }

  reviewDocument(
    documentId: number,
    status: 'approved' | 'rejected' | 'revision_needed',
    reviewComments?: string,
  ): Observable<{ message: string; document: OrganizationDocument }> {
    return this.http.put<{ message: string; document: OrganizationDocument }>(
      `${this.apiUrl}/documents/${documentId}/review`,
      { status, review_comments: reviewComments },
    );
  }

  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
  }
}
