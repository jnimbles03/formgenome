import type { ColumnDefinition } from '../types/columns';

/** Cache TTL: 7 days in milliseconds */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Sync interval: 60 seconds */
export const SYNC_INTERVAL_MS = 60_000;

/** Sync batch size */
export const SYNC_BATCH_SIZE = 10;

/** Analysis batch size for parallel processing */
export const ANALYSIS_BATCH_SIZE = 5;

/** Team forms fetch limit */
export const TEAM_FORMS_LIMIT = 1000;

/** Auto-dismiss timeout for success messages (ms) */
export const SUCCESS_DISMISS_MS = 3000;

/** Auto-dismiss timeout for error messages (ms) */
export const ERROR_DISMISS_MS = 5000;

/**
 * Base data columns shared by both personal and team dashboards.
 * This is the SINGLE source of truth for column definitions.
 */
export const BASE_DATA_COLUMNS: ColumnDefinition[] = [
  { key: 'form_name', label: 'Form Name', draggable: true },
  { key: 'entity_name', label: 'Entity', draggable: true },
  { key: 'source_url', label: 'URL', draggable: true },
  { key: 'pages', label: 'Pages', draggable: true },
  { key: 'total_field_count', label: 'Fields', draggable: true },
  { key: 'complexity_score', label: 'Complexity', draggable: true },
  { key: 'nigo_score', label: 'NIGO', draggable: true },
  { key: 'confidence_tier', label: 'Confidence', draggable: true },
  { key: 'action_type', label: 'Action Type', draggable: true },
  { key: 'signature_required', label: 'Signature', draggable: true },
  { key: 'signature_count', label: 'Sig Count', draggable: true },
  { key: 'notarization_required', label: 'Notary', draggable: true },
  { key: 'attachments_required', label: 'Attachments', draggable: true },
  { key: 'attachment_count', label: 'Att Count', draggable: true },
  { key: 'payment_required', label: 'Payment', draggable: true },
  { key: 'payment_amount', label: 'Payment Amt', draggable: true },
  { key: 'identification_required', label: 'ID Required', draggable: true },
  { key: 'conditional_logic', label: 'Conditional', draggable: true },
  { key: 'third_party_involved', label: '3rd Party', draggable: true },
  { key: 'witnesses_required', label: 'Witnesses', draggable: true },
  { key: 'deadlines_present', label: 'Deadlines', draggable: true },
  { key: 'form_purpose', label: 'Purpose', draggable: true },
  { key: 'industry_vertical', label: 'Vertical', draggable: true },
  { key: 'industry_subvertical', label: 'Subvertical', draggable: true },
  { key: 'estimated_signer_time', label: 'Signer Time', draggable: true },
  { key: 'estimated_processing_time', label: 'Proc Time', draggable: true },
  { key: 'analyzed_at', label: 'Analyzed', draggable: true },
];

/**
 * Extra columns for the team dashboard.
 */
export const TEAM_EXTRA_COLUMNS: ColumnDefinition[] = [
  { key: 'checkbox', label: '', draggable: false },
  { key: 'actions', label: 'Actions', draggable: false },
  { key: 'llm_model', label: 'LLM Model', draggable: true },
];

/**
 * Returns the full column list for the personal dashboard.
 */
export function getPersonalDashboardColumns(): ColumnDefinition[] {
  return [...BASE_DATA_COLUMNS];
}

/**
 * Returns the full column list for the team dashboard.
 * Team columns (checkbox, actions, llm_model) are prepended before data columns.
 */
export function getTeamDashboardColumns(): ColumnDefinition[] {
  return [
    TEAM_EXTRA_COLUMNS[0]!, // checkbox
    TEAM_EXTRA_COLUMNS[1]!, // actions
    { key: 'form_name', label: 'Form Name', draggable: true },
    { key: 'entity_name', label: 'Entity', draggable: true },
    TEAM_EXTRA_COLUMNS[2]!, // llm_model
    ...BASE_DATA_COLUMNS.filter(c => c.key !== 'form_name' && c.key !== 'entity_name'),
  ];
}
