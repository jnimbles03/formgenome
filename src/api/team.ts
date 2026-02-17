import type { CachedAnalysis } from '../types/analysis';
import { apiClient } from './client';
import { log } from '../shared/logger';

interface SyncPayload {
  user_id: string;
  analysis_id: string;
  form_data: Record<string, unknown>;
}

interface TeamFormsResponse {
  ok?: boolean;
  success?: boolean;
  forms: CachedAnalysis[];
}

interface UpdatePayload {
  user_id: string;
  analysis_id: string;
  form_data: Record<string, unknown>;
}

interface DeletePayload {
  analysis_ids: string[];
}

interface DeleteResponse {
  ok: boolean;
  deleted_count: number;
  error?: string;
}

interface ReanalyzePayload {
  analysis_ids: string[];
}

interface ReanalyzeResponse {
  ok: boolean;
  queued_count: number;
  error?: string;
}

/**
 * Syncs a single form to the team backend.
 */
export async function syncFormToTeam(payload: SyncPayload): Promise<boolean> {
  try {
    const response = await apiClient.post<{ ok: boolean }>('/api/team/sync', payload);
    return response.ok;
  } catch (error) {
    log.error('Team sync failed', error);
    return false;
  }
}

/**
 * Fetches all team forms from the backend.
 */
export async function fetchTeamForms(limit = 1000): Promise<CachedAnalysis[]> {
  const data = await apiClient.get<TeamFormsResponse>('/api/team/forms', {
    limit: String(limit),
  });

  if (data.ok || data.success) {
    return data.forms;
  }

  throw new Error('Failed to fetch team forms');
}

/**
 * Updates a form on the team backend.
 */
export async function updateTeamForm(payload: UpdatePayload): Promise<boolean> {
  const response = await apiClient.post<{ ok: boolean }>('/api/team/update', payload);
  return response.ok;
}

/**
 * Bulk deletes forms from the team backend.
 */
export async function deleteTeamForms(analysisIds: string[]): Promise<DeleteResponse> {
  return apiClient.post<DeleteResponse>('/api/team/delete', { analysis_ids: analysisIds } as DeletePayload);
}

/**
 * Queues forms for re-analysis.
 */
export async function reanalyzeTeamForms(analysisIds: string[]): Promise<ReanalyzeResponse> {
  return apiClient.post<ReanalyzeResponse>('/api/team/reanalyze', { analysis_ids: analysisIds } as ReanalyzePayload);
}
