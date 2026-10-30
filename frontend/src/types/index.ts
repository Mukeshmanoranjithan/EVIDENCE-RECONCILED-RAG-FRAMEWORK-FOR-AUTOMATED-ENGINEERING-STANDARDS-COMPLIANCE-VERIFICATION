export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'CONFLICT' | 'UNVERIFIABLE' | 'NEEDS_REVIEW';
export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type DocumentType = 'specification' | 'design' | 'test_report';

export interface Project {
  id: string;
  name: string;
  description?: string;
  domain: string;
  version: string;
  preset: string;
  is_archived: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  filename: string;
  doc_type: DocumentType;
  file_hash: string;
  file_size: number;
  page_count: number;
  created_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  req_id: string;
  parent_req_id?: string;
  statement: string;
  category: string;
  parameter: string;
  operator: string;
  threshold: string;
  unit?: string;
  condition_context?: string;
  priority: string;
  page: number;
  bbox?: [number, number, number, number];
  extraction_confidence: number;
  created_at: string;
}

export interface EvidenceRecord {
  id: string;
  project_id: string;
  evidence_id: string;
  statement_type: 'design_claim' | 'measured_result';
  raw_statement?: string;
  parameter: string;
  operator: string;
  value: string;
  unit?: string;
  condition_context?: string;
  configuration_id?: string;
  revision?: string;
  measurement_uncertainty?: number;
  page: number;
  bbox?: [number, number, number, number];
  created_at: string;
}

export interface EvidenceMapping {
  id: string;
  project_id: string;
  requirement_id: string;
  evidence_id: string;
  score_composite: number;
  score_semantic: number;
  score_keyword: number;
  score_parameter: number;
  score_context: number;
  status: 'auto_accepted' | 'in_review' | 'rejected' | 'manual';
  reviewer_id?: string;
  review_comment?: string;
}

export interface ReconciliationResult {
  id: string;
  project_id: string;
  requirement_id: string;
  req_code: string;
  spec_limit: string;
  design_claim?: string;
  test_measurement?: string;
  unit?: string;
  difference?: number;
  percentage_deviation?: number;
  status: ComplianceStatus;
  reason: string;
  rule_id_fired: string;
  is_marginal: boolean;
  calculation_formula?: string;
  margin_to_limit?: number;
  created_at: string;
}

export interface DecisionDetail {
  requirement_id: string;
  req_code: string;
  statement: string;
  category: string;
  priority: string;
  status: ComplianceStatus;
  spec_limit: string;
  design_claim?: string;
  test_measurement?: string;
  difference?: number;
  percentage_deviation?: number;
  unit?: string;
  rule_id_fired: string;
  reason: string;
  calculation_formula?: string;
  margin_to_limit?: number;
  is_marginal: boolean;
  risk_level: RiskLevel;
  risk_score: number;
  risk_rationale?: string;
  recommended_action?: string;
  source_page: number;
  source_doc_name: string;
  highlight_bbox?: [number, number, number, number];
}

export interface RiskAssessment {
  id: string;
  req_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  rationale?: string;
  recommended_action?: string;
}

export interface ReviewTask {
  id: string;
  project_id: string;
  requirement_id: string;
  evidence_id?: string;
  priority: string;
  status: string;
  reason: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  project_id: string;
  record_index: number;
  timestamp: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: Record<string, any>;
  prev_record_hash?: string;
  record_hash: string;
}

export interface SimulationResult {
  requirement_id: string;
  original_status: string;
  hypothetical_status: string;
  original_risk_score: number;
  hypothetical_risk_score: number;
  original_risk_level: string;
  hypothetical_risk_level: string;
  reconciliation_details: Record<string, any>;
  impacted_dependencies: Array<{ requirement_id: string; status: string; distance: number }>;
  is_hypothetical: boolean;
}

