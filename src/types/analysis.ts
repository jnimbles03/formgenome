/** Signature analysis nested object from API */
export interface SignatureAnalysis {
  signature_count: number;
}

/** The result returned from the /api/analyze/upload endpoint */
export interface FormAnalysisResult {
  // Identity
  form_name: string;
  pretty_title: string | null;
  form_title: string | null;
  title: string | null;
  entity_name: string;
  entity: string;

  // Metrics
  pages: number;
  total_field_count: number;
  field_count: number;
  complexity_score: number;
  complexity: number;
  nigo_score: number;
  confidence_tier: 'High' | 'Medium' | 'Low';

  // Classification
  action_type: string;
  form_purpose: string;
  industry_vertical: string;
  industry_subvertical: string;

  // Requirements
  signature_required: boolean;
  notarization_required: boolean;
  attachments_required: boolean;
  payment_required: boolean;
  identification_required: boolean;
  conditional_logic: boolean;
  third_party_involved: boolean;
  witnesses_required: boolean;
  deadlines_present: boolean;

  // Nested
  signature_analysis: SignatureAnalysis | null;

  // Counts / Amounts
  attachment_count: number;
  payment_amount: string | null;

  // Time estimates
  estimated_signer_time: string | null;
  estimated_processing_time: string | null;

  // AI flags
  gemini_analyzed: boolean;

  // Internal extension flags
  _flags?: { pii_hits: number };

  // PDF metadata (from the PDF's internal metadata dictionary)
  metadata?: Record<string, string> | null;

  // API envelope fields
  ok?: boolean;
  success?: boolean;

  // API may include an internal error message alongside valid data
  // (e.g. "Deep analysis failed completely" when Gemini is unavailable)
  error?: string;
}

/** A cached analysis result with extension-specific metadata */
export interface CachedAnalysis extends FormAnalysisResult {
  _cached_at: number;
  _synced: boolean;
  _synced_at?: number;
  _storage_key?: string;
  was_peeked?: boolean;
  original_url?: string;
  error?: string;

  // Fields added during enrichment
  pdf_url?: string;
  pdf_name?: string;
  language_count?: number;
  source_url?: string;
  llm_model?: string;

  // Team fields
  user_id?: string;
  analysis_id?: string;
  analyzed_at?: number;
}
