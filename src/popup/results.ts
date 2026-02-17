import type { CachedAnalysis } from '../types/analysis';
import { getFormDisplayName } from '../shared/form-display';

/**
 * Displays analysis results in the popup.
 */
export function displayResults(data: CachedAnalysis): void {
  const resultsEl = document.getElementById('results');
  const statusEl = document.getElementById('status');
  if (resultsEl) resultsEl.classList.remove('hidden');
  if (statusEl) statusEl.classList.add('hidden');

  // Auto-scroll to results
  setTimeout(() => {
    resultsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Title
  const titleEl = document.getElementById('formTitle');
  if (titleEl) titleEl.textContent = getFormDisplayName(data);

  // Stats — use "—" for null/undefined values (Gemini deep analysis may not have run)
  const fieldCount = data.total_field_count ?? data.field_count;
  setTextById('fieldCount', fieldCount != null ? String(fieldCount) : '\u2014');
  setTextById('pages', String(data.pages || '\u2014'));
  setTextById('complexity', String(data.complexity_score ?? data.complexity ?? '\u2014'));

  // Details
  setTextById('entity', data.entity_name || data.entity || 'Unknown');

  const actionDesc = data.action_type
    || (data.signature_required ? 'Signature Required' : 'Information Collection');
  setTextById('actionType', actionDesc);

  const sigCount = data.signature_analysis?.signature_count || 0;
  const sigText = data.signature_required
    ? `Yes (${sigCount} signature${sigCount !== 1 ? 's' : ''})`
    : 'No';
  setTextById('signatures', sigText);

  setTextById('confidence', data.confidence_tier || 'unknown');

  // Badges
  const badgesContainer = document.getElementById('badges');
  if (badgesContainer) {
    badgesContainer.innerHTML = '';

    if (data.gemini_analyzed) addBadge(badgesContainer, 'Gemini Analyzed', 'success');
    if (data.signature_required) addBadge(badgesContainer, 'Signature Required', 'warning');
    if (data.notarization_required) addBadge(badgesContainer, 'Notarization Required', 'warning');
    if (data.attachments_required) addBadge(badgesContainer, 'Attachments Required', 'warning');
    if (data.identification_required) addBadge(badgesContainer, 'ID Required', 'warning');
  }
}

function setTextById(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function addBadge(container: HTMLElement, text: string, type: string): void {
  const badge = document.createElement('span');
  badge.className = `badge ${type}`;
  badge.textContent = text;
  container.appendChild(badge);
}
