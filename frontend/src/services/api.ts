const API_BASE = 'http://localhost:8000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error [${response.status}] ${path}: ${errorBody}`);
  }
  return response.json();
}

export const api = {
  // System Health
  getHealth: () => request<any>('/health'),

  // Projects
  getProjects: () => request<any[]>('/projects'),
  createProject: (data: { name: string; description?: string; domain: string; version: string; preset: string }) => 
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  analyzeWizard: (formData: FormData) => {
    return fetch('http://localhost:8000/api/projects/analyze_wizard', {
      method: 'POST',
      body: formData,
    }).then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Analysis failed [${res.status}]: ${errText}`);
      }
      return res.json();
    });
  },
  getProject: (id: string) => request<any>(`/projects/${id}`),
  deleteProject: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),

  // Documents
  getDocuments: (projectId: string) => request<any[]>(`/projects/${projectId}/documents`),
  uploadDocument: (projectId: string, formData: FormData) => {
    return fetch(`http://localhost:8000/api/projects/${projectId}/documents`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed [${res.status}]: ${errText}`);
      }
      return res.json();
    });
  },
  deleteDocument: (projectId: string, docId: string) => 
    request<any>(`/projects/${projectId}/documents/${docId}`, { method: 'DELETE' }),

  // Run Pipeline Analysis
  runAnalysis: (projectId: string) => 
    request<any>(`/projects/${projectId}/analyze`, { method: 'POST' }),

  // Requirements
  getRequirements: (projectId: string) => request<any[]>(`/projects/${projectId}/requirements`),
  updateRequirement: (projectId: string, reqId: string, data: any) =>
    request<any>(`/projects/${projectId}/requirements/${reqId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Evidence & Mappings
  getEvidence: (projectId: string) => request<any[]>(`/projects/${projectId}/evidence`),
  getMappings: (projectId: string) => request<any[]>(`/projects/${projectId}/mappings`),
  updateMappingStatus: (projectId: string, mappingId: string, status: string) =>
    request<any>(`/projects/${projectId}/mappings/${mappingId}?status=${status}`, { method: 'PATCH' }),

  // Reconciliation & Decision Detail
  getReconciliation: (projectId: string) => request<any[]>(`/projects/${projectId}/reconciliation`),
  getDecisionDetail: (projectId: string, reqCode: string) => request<any>(`/projects/${projectId}/reconciliation/${reqCode}`),

  // Review Queue
  getReviewQueue: (projectId: string) => request<any[]>(`/projects/${projectId}/review-queue`),
  updateReviewTask: (projectId: string, taskId: string, data: { status: string; assigned_to?: string }) =>
    request<any>(`/projects/${projectId}/review-queue/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Graph, Risks, Revisions & Standards
  getGraph: (projectId: string) => request<any>(`/projects/${projectId}/graph`),
  getDependencies: (projectId: string) => request<any[]>(`/projects/${projectId}/dependencies`),
  createDependency: (projectId: string, data: { source_req_id: string; target_req_id: string; dependency_type?: string }) =>
    request<any>(`/projects/${projectId}/dependencies`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDependency: (projectId: string, depId: string) =>
    request<any>(`/projects/${projectId}/dependencies/${depId}`, { method: 'DELETE' }),
  getRisks: (projectId: string) => request<any[]>(`/projects/${projectId}/risks`),
  getRevisions: (projectId: string) => request<any[]>(`/projects/${projectId}/revisions`),
  getStandards: (projectId: string) => request<any[]>(`/projects/${projectId}/standards`),

  // Audit
  getAuditRecords: (projectId: string) => request<any[]>(`/projects/${projectId}/audit`),
  verifyAuditChain: (projectId: string) => request<any>(`/projects/${projectId}/audit/verify`, { method: 'POST' }),

  // Simulation
  runSimulation: (projectId: string, data: any) => request<any>(`/projects/${projectId}/simulation`, { method: 'POST', body: JSON.stringify(data) }),

  // Assistant
  askAssistant: (projectId: string, query: string) => request<any>(`/projects/${projectId}/assistant`, { method: 'POST', body: JSON.stringify({ query }) }),

  // Reports
  generateReport: (projectId: string, template: string = 'technical') => 
    request<any>(`/projects/${projectId}/reports/generate?template=${template}`, { method: 'POST' }),
};
