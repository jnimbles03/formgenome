import type { CachedAnalysis } from '../types/analysis';
import { getConfig } from '../shared/config';
import { SYNC_INTERVAL_MS, SYNC_BATCH_SIZE } from '../shared/constants';
import { log } from '../shared/logger';
import { getUnsyncedAnalyses, markAsSynced, resetAllSyncStatus } from '../storage/analysis-cache';
import { getUserId } from '../storage/preferences';
import { syncFormToTeam } from '../api/team';

let syncInProgress = false;

/**
 * Syncs all unsynced analysis results to the team backend.
 */
async function syncAnalysisResults(): Promise<void> {
  if (syncInProgress) {
    log.debug('Sync already in progress, skipping');
    return;
  }

  syncInProgress = true;

  try {
    const unsyncedForms = await getUnsyncedAnalyses();

    if (unsyncedForms.length === 0) {
      log.debug('No unsynced forms found');
      return;
    }

    log.info(`Found ${unsyncedForms.length} unsynced forms`);
    const userId = await getUserId();

    // Process in batches
    for (let i = 0; i < unsyncedForms.length; i += SYNC_BATCH_SIZE) {
      const batch = unsyncedForms.slice(i, i + SYNC_BATCH_SIZE);

      for (const { key, data } of batch) {
        const success = await syncFormToTeam({
          user_id: userId,
          analysis_id: key,
          form_data: {
            form_name: data.form_name || data.pretty_title || 'Untitled',
            entity_name: data.entity_name || data.entity || 'Unknown',
            source_url: data.source_url || data.pdf_url || '',
            complexity_score: data.complexity_score || 0,
            nigo_score: data.nigo_score || 0,
            pages: data.pages || 1,
            total_field_count: data.total_field_count || data.field_count || 0,
            confidence_tier: data.confidence_tier || '',
            action_type: data.action_type || '',
            signature_required: data.signature_required || false,
            signature_count: data.signature_analysis?.signature_count || 0,
            notarization_required: data.notarization_required || false,
            attachments_required: data.attachments_required || false,
            attachment_count: data.attachment_count || 0,
            payment_required: data.payment_required || false,
            payment_amount: data.payment_amount || null,
            identification_required: data.identification_required || false,
            conditional_logic: data.conditional_logic || false,
            third_party_involved: data.third_party_involved || false,
            witnesses_required: data.witnesses_required || false,
            deadlines_present: data.deadlines_present || false,
            form_purpose: data.form_purpose || '',
            industry_vertical: data.industry_vertical || '',
            industry_subvertical: data.industry_subvertical || '',
            estimated_signer_time: data.estimated_signer_time || null,
            estimated_processing_time: data.estimated_processing_time || null,
            analyzed_at: data._cached_at || Date.now(),
          },
        });

        if (success) {
          await markAsSynced(key, data);
          log.debug(`Synced: ${key}`);
        }
      }
    }

    log.info(`Sync complete: ${unsyncedForms.length} forms`);
  } catch (error) {
    log.error('Sync error:', error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Starts the periodic sync scheduler.
 */
export function startSyncScheduler(): void {
  log.info('Starting sync scheduler');

  // Sync immediately on startup
  syncAnalysisResults();

  // Then sync periodically
  setInterval(syncAnalysisResults, SYNC_INTERVAL_MS);

  // Listen for new analysis completions
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      for (const [key, change] of Object.entries(changes)) {
        if (key.startsWith('analysis_') && change.newValue && !change.oldValue) {
          log.debug('New analysis detected, triggering sync');
          syncAnalysisResults();
        }
      }
    }
  });
}

/**
 * Force syncs ALL cached forms (including already synced ones).
 */
export async function forceSyncAll(): Promise<void> {
  log.info('Force syncing all cached forms');
  const count = await resetAllSyncStatus();
  log.info(`Reset sync status on ${count} forms`);
  await syncAnalysisResults();
}
