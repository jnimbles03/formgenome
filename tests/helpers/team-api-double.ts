/**
 * In-memory stand-in for the team routes the extension calls.
 *
 * Field mapping follows the public Cloud Run handler that implements
 * POST /api/team/sync, POST /api/team/update, and GET /api/team/forms:
 * form_name is stored as the title column, entity_name as its column,
 * and the other free-text fields as JSON metadata. None of those writes
 * strip a leading formula character, and the list route returns the stored
 * strings.
 */

interface StoredForm {
  id: string;
  title: string;
  entity_name: string;
  url: string;
  complexity: number;
  analyzed_at: number;
  metadata: Record<string, unknown>;
}

interface StoredResult {
  status: number;
  body: Record<string, unknown>;
}

export class TeamApiDouble {
  private nextId = 1;
  private forms: StoredForm[] = [];

  list(limit: number): { ok: true; forms: Record<string, unknown>[]; count: number } {
    const rows = [...this.forms]
      .sort((a, b) => b.analyzed_at - a.analyzed_at)
      .slice(0, limit)
      .map(row => this.toRecord(row));
    return { ok: true, forms: rows, count: rows.length };
  }

  sync(body: { user_id?: string; form_data?: Record<string, unknown> }): StoredResult {
    const formData = body.form_data;
    if (!formData) return { status: 400, body: { ok: false, error: 'Missing form_data' } };

    const url = typeof formData.source_url === 'string' && formData.source_url
      ? formData.source_url
      : `unknown://missing-${this.nextId}`;
    const title = typeof formData.form_name === 'string' ? formData.form_name : 'Untitled';
    const entityName = typeof formData.entity_name === 'string' ? formData.entity_name : 'Unknown';
    const complexity = typeof formData.complexity_score === 'number' ? formData.complexity_score : 0;
    const metadata = JSON.parse(JSON.stringify(formData)) as Record<string, unknown>;
    metadata.user_id = body.user_id;

    const existing = this.forms.find(form => form.url === url);
    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      existing.title = title;
      existing.entity_name = entityName;
      existing.complexity = complexity;
      existing.analyzed_at = now;
      existing.metadata = metadata;
    } else {
      this.forms.push({
        id: String(this.nextId++),
        title,
        entity_name: entityName,
        url,
        complexity,
        analyzed_at: now,
        metadata,
      });
    }

    return { status: 200, body: { ok: true, message: 'Form synced successfully' } };
  }

  update(body: { analysis_id?: string; form_data?: Record<string, unknown> }): StoredResult {
    const analysisId = body.analysis_id;
    const formData = body.form_data;
    if (!analysisId || !formData) {
      return { status: 400, body: { ok: false, error: 'Missing analysis_id or form_data' } };
    }

    const row = this.forms.find(form => form.id === String(analysisId));
    if (!row) return { status: 404, body: { ok: false, error: 'Form not found' } };

    if ('form_name' in formData) row.title = String(formData.form_name);
    if ('entity_name' in formData) row.entity_name = String(formData.entity_name);
    if ('complexity_score' in formData) row.complexity = Number(formData.complexity_score);

    const metaUpdates: Record<string, unknown> = {
      title: formData.form_name,
      total_field_count: formData.total_field_count,
      nigo_score: formData.nigo_score,
      action_type: formData.action_type,
      signature_required: formData.signature_required,
      signature_count: formData.signature_count,
      notarization_required: formData.notarization_required,
      attachments_required: formData.attachments_required,
      attachment_count: formData.attachment_count,
      payment_required: formData.payment_required,
      payment_amount: formData.payment_amount,
      identification_required: formData.identification_required,
      conditional_logic: formData.conditional_logic,
      third_party_involved: formData.third_party_involved,
      witnesses_required: formData.witnesses_required,
      deadlines_present: formData.deadlines_present,
      form_purpose: formData.form_purpose,
      industry_vertical: formData.industry_vertical,
      industry_subvertical: formData.industry_subvertical,
      estimated_signer_time: formData.estimated_signer_time,
      estimated_processing_time: formData.estimated_processing_time,
    };

    for (const [key, value] of Object.entries(metaUpdates)) {
      if (value !== undefined && value !== null) row.metadata[key] = value;
    }

    return { status: 200, body: { ok: true, message: 'Form updated' } };
  }

  /** Test hook: change a flag only the list route consults when it rebuilds a row. */
  setGeminiAnalyzed(analysisId: string, analyzed: boolean): void {
    const row = this.forms.find(form => form.id === analysisId);
    if (!row) throw new Error(`no form ${analysisId}`);
    row.metadata.gemini_analyzed = analyzed;
  }

  private toRecord(row: StoredForm): Record<string, unknown> {
    const meta = row.metadata;
    const gemini = Object.prototype.hasOwnProperty.call(meta, 'gemini_analyzed')
      ? Boolean(meta.gemini_analyzed)
      : true;
    const signatureAnalysis = meta.signature_analysis;
    const nestedCount = signatureAnalysis && typeof signatureAnalysis === 'object'
      ? (signatureAnalysis as Record<string, unknown>).signature_count
      : undefined;

    return {
      analysis_id: row.id,
      user_id: meta.user_id ?? 'anonymous',
      form_name: row.title || meta.title || 'Untitled',
      entity_name: row.entity_name || 'Unknown',
      source_url: row.url,
      complexity_score: row.complexity,
      nigo_score: meta.nigo_score ?? 0,
      confidence_tier: meta.confidence_tier ?? 'High',
      action_type: meta.action_type ?? '',
      llm_model: gemini ? 'Gemini 2.5 Flash' : 'Claude 3 Opus',
      pages: meta.pages ?? 1,
      total_field_count: meta.total_field_count ?? 0,
      signature_required: Boolean(meta.signature_required ?? false),
      signature_count: nestedCount || meta.signature_count || 0,
      notarization_required: Boolean(meta.notarization_required ?? false),
      attachments_required: Boolean(meta.attachments_required ?? false),
      attachment_count: meta.attachment_count ?? 0,
      payment_required: Boolean(meta.payment_required ?? false),
      payment_amount: meta.payment_amount ?? '',
      identification_required: Boolean(meta.identification_required ?? false),
      conditional_logic: Boolean(meta.conditional_logic ?? false),
      third_party_involved: Boolean(meta.third_party_involved ?? false),
      witnesses_required: Boolean(meta.witnesses_required ?? false),
      deadlines_present: Boolean(meta.deadlines_present ?? false),
      form_purpose: meta.form_purpose ?? '',
      industry_vertical: meta.industry_vertical ?? '',
      industry_subvertical: meta.industry_subvertical ?? '',
      estimated_signer_time: meta.estimated_signer_time ?? '',
      estimated_processing_time: meta.estimated_processing_time ?? '',
      analyzed_at: row.analyzed_at ? row.analyzed_at * 1000 : null,
    };
  }
}

export function installTeamApi(store: TeamApiDouble): void {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';

    if (url.pathname === '/api/team/forms' && method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? '1000');
      return Response.json(store.list(limit));
    }

    const body = init?.body ? JSON.parse(String(init.body)) as {
      user_id?: string;
      analysis_id?: string;
      form_data?: Record<string, unknown>;
    } : {};

    const result = url.pathname === '/api/team/sync' && method === 'POST'
      ? store.sync(body)
      : url.pathname === '/api/team/update' && method === 'POST'
        ? store.update(body)
        : null;

    if (!result) throw new Error(`unexpected fetch ${method} ${url.href}`);
    return Response.json(result.body, { status: result.status });
  });
}

export async function syncForm(userId: string, form: Record<string, unknown>): Promise<void> {
  const { syncFormToTeam } = await import('../../src/api/team');
  const ok = await syncFormToTeam({
    user_id: userId,
    analysis_id: 'client-key',
    form_data: form,
  });
  if (!ok) throw new Error('sync was rejected');
}
