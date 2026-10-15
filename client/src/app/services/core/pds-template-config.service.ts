import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FieldPosition {
  key: string;
  x: number;
  y: number;
  center: boolean;
  text: string;
  size: number;
  maxWidth: number | null;
  overflow: string | null;
  page?: number;
  type?: string;
  w?: number;
  h?: number;
  image?: string;
}

export interface PDSTemplateConfigData {
  positions: FieldPosition[];
  /** Storage key of the template PDF these positions were set against (see uploadTemplate). */
  template_key?: string;
  template_name?: string;
  rowHeights?: Record<string, number>;
}

export interface PDSTemplateConfig {
  config_id: number;
  config_data: PDSTemplateConfigData;
  /** Viewable URL of config_data.template_key; only set on the active-config response. */
  template_url?: string | null;
  version: number;
  is_active: boolean;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PDSTemplateFile {
  file_id: number;
  name: string;
  /** Storage key — what config_data.template_key holds */
  key: string;
  /** Viewable URL of the PDF */
  url: string | null;
  created_at: string;
}

export interface ActiveConfigResponse {
  message: string;
  config: PDSTemplateConfig | null;
}

export interface SaveConfigResponse {
  message: string;
  config: {
    config_id: number;
    version: number;
    created_at: string;
  };
}

export interface ConfigHistoryResponse {
  message: string;
  configs: Omit<PDSTemplateConfig, 'config_data'>[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface ConfigByIdResponse {
  message: string;
  config: PDSTemplateConfig;
}

export interface RestoreConfigResponse {
  message: string;
  config: {
    config_id: number;
    version: number;
    is_active: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PDSTemplateConfigService {
  private apiUrl = `${environment.apiUrl}/pds-template-config`;

  constructor(private http: HttpClient) {}

  /**
   * Get the active PDS template configuration
   * Public endpoint - accessible to all authenticated users
   */
  getActiveConfig(): Observable<ActiveConfigResponse> {
    return this.http.get<ActiveConfigResponse>(`${this.apiUrl}/active`);
  }

  /**
   * Upload a template PDF (kept on the server, so it survives logout and other browsers)
   * Super Admin only
   */
  uploadTemplate(file: Blob, filename: string): Observable<{ message: string; template: PDSTemplateFile }> {
    const form = new FormData();
    form.append('template', file, filename);
    return this.http.post<{ message: string; template: PDSTemplateFile }>(`${this.apiUrl}/template`, form);
  }

  /** Uploaded template PDFs, oldest first. Super Admin only */
  listTemplates(): Observable<{ templates: PDSTemplateFile[] }> {
    return this.http.get<{ templates: PDSTemplateFile[] }>(`${this.apiUrl}/templates`);
  }

  /** Delete an uploaded template PDF (refused while the active config uses it). Super Admin only */
  deleteTemplate(fileId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/templates/${fileId}`);
  }

  /**
   * Save a new PDS template configuration
   * Super Admin only
   */
  saveConfig(configData: PDSTemplateConfigData): Observable<SaveConfigResponse> {
    return this.http.post<SaveConfigResponse>(this.apiUrl, {
      config_data: configData,
    });
  }

  /**
   * Get configuration history with pagination
   * Super Admin only
   */
  getConfigHistory(
    page: number = 1,
    limit: number = 10,
  ): Observable<ConfigHistoryResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ConfigHistoryResponse>(`${this.apiUrl}/history`, { params });
  }

  /**
   * Get a specific configuration by ID
   * Super Admin only
   */
  getConfigById(id: number): Observable<ConfigByIdResponse> {
    return this.http.get<ConfigByIdResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Restore a previous configuration (make it active)
   * Super Admin only
   */
  restoreConfig(id: number): Observable<RestoreConfigResponse> {
    return this.http.put<RestoreConfigResponse>(`${this.apiUrl}/${id}/restore`, {});
  }
}
