export interface ColumnDefinition {
  key: string;
  label: string;
  draggable: boolean;
}

/** Column keys used in dashboard tables */
export type DataColumnKey =
  | 'form_name' | 'entity_name' | 'source_url'
  | 'pages' | 'total_field_count' | 'complexity_score' | 'nigo_score'
  | 'confidence_tier' | 'action_type'
  | 'signature_required' | 'signature_count'
  | 'notarization_required'
  | 'attachments_required' | 'attachment_count'
  | 'payment_required' | 'payment_amount'
  | 'identification_required' | 'conditional_logic'
  | 'third_party_involved' | 'witnesses_required' | 'deadlines_present'
  | 'form_purpose' | 'industry_vertical' | 'industry_subvertical'
  | 'estimated_signer_time' | 'estimated_processing_time'
  | 'analyzed_at';

/** Team dashboard adds these non-data columns */
export type TeamColumnKey = 'checkbox' | 'actions' | 'llm_model';

export type SortDirection = 'asc' | 'desc';
