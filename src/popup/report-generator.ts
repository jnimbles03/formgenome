import type { CachedAnalysis } from '../types/analysis';
import type { PdfLink } from '../types/pdf';
import { escapeHtml } from '../shared/sanitize';
import { escapeCsv } from '../shared/csv';
import { getFormDisplayName } from '../shared/form-display';
import { downloadViaAnchor } from '../shared/download';

/**
 * Generates and downloads an HTML batch report.
 */
export function generateBatchReport(
  analysisCache: Map<string, CachedAnalysis>,
  currentPdfs: PdfLink[],
  hashLookup: (url: string) => string | undefined,
): void {
  const analyzedForms = getAnalyzedForms(analysisCache, currentPdfs, hashLookup);
  if (analyzedForms.length === 0) {
    alert('No analyzed forms found. Please analyze some PDFs first.');
    return;
  }

  const stats = calculateStats(analyzedForms);
  const reportHTML = generateReportHTML(analyzedForms, stats);
  downloadViaAnchor(reportHTML, 'text/html', 'Form_Genome_Report_Latest.html');
}

/**
 * Generates and downloads a CSV report.
 */
export function generateCSVReport(
  analysisCache: Map<string, CachedAnalysis>,
  currentPdfs: PdfLink[],
  hashLookup: (url: string) => string | undefined,
): void {
  const analyzedForms = getAnalyzedForms(analysisCache, currentPdfs, hashLookup);
  if (analyzedForms.length === 0) {
    alert('No analyzed forms found. Please analyze some PDFs first.');
    return;
  }

  const csv = generateCSVContent(analyzedForms);
  downloadViaAnchor(csv, 'text/csv;charset=utf-8;', 'Form_Analysis_Latest.csv');
}

function getAnalyzedForms(
  cache: Map<string, CachedAnalysis>,
  pdfs: PdfLink[],
  hashLookup: (url: string) => string | undefined,
): CachedAnalysis[] {
  const results: CachedAnalysis[] = [];
  for (const pdf of pdfs) {
    const key = hashLookup(pdf.url);
    const data = key ? cache.get(key) : undefined;
    if (data && !data.error && (data.ok || data.success || data.complexity_score !== undefined)) {
      results.push({ ...data, pdf_url: pdf.url, pdf_name: pdf.text, language_count: pdf.language_count });
    }
  }
  return results;
}

function generateCSVContent(forms: CachedAnalysis[]): string {
  const headers = [
    'Form Name', 'Entity Name', 'PDF URL', 'Language Count', 'Pages',
    'Total Fields', 'Complexity Score', 'NIGO Score', 'Confidence Tier',
    'Action Type', 'Signature Required', 'Signature Count',
    'Notarization Required', 'Attachments Required', 'Attachment Count',
    'Payment Required', 'Payment Amount', 'Identification Required',
    'Conditional Logic', 'Third Party Involved', 'Witnesses Required',
    'Deadlines Present', 'Form Purpose', 'Industry Vertical',
    'Industry Subvertical', 'Estimated Signer Time', 'Estimated Processing Time',
  ];

  const rows = [headers.map(escapeCsv).join(',')];

  forms.forEach(form => {
    const row = [
      getFormDisplayName(form),
      form.entity_name || form.entity || '',
      form.pdf_url || '',
      form.language_count || 1,
      form.pages || 1,
      form.total_field_count || form.field_count || 0,
      form.complexity_score || 0,
      form.nigo_score || 0,
      form.confidence_tier || '',
      form.action_type || '',
      form.signature_required ? 'Yes' : 'No',
      form.signature_analysis?.signature_count || 0,
      form.notarization_required ? 'Yes' : 'No',
      form.attachments_required ? 'Yes' : 'No',
      form.attachment_count || 0,
      form.payment_required ? 'Yes' : 'No',
      form.payment_amount || '',
      form.identification_required ? 'Yes' : 'No',
      form.conditional_logic ? 'Yes' : 'No',
      form.third_party_involved ? 'Yes' : 'No',
      form.witnesses_required ? 'Yes' : 'No',
      form.deadlines_present ? 'Yes' : 'No',
      form.form_purpose || '',
      form.industry_vertical || '',
      form.industry_subvertical || '',
      form.estimated_signer_time || '',
      form.estimated_processing_time || '',
    ];
    rows.push(row.map(escapeCsv).join(','));
  });

  return rows.join('\n');
}

function calculateStats(forms: CachedAnalysis[]) {
  const total = forms.length;
  const bestForm = forms.find(f =>
    (f.entity_name || f.entity) &&
    f.entity_name !== 'Unknown' &&
    f.entity !== 'Unknown',
  );
  const entityName = bestForm?.entity_name || bestForm?.entity || forms[0]?.entity_name || forms[0]?.entity || 'Unknown Organization';

  const avgComplexity = (forms.reduce((sum, f) => sum + (f.complexity_score || 0), 0) / total).toFixed(1);

  const hardest = forms.reduce((max, f) =>
    (f.complexity_score || 0) > (max.complexity_score || 0) ? f : max,
    forms[0]!,
  );
  const hardestName = getFormDisplayName(hardest);

  const paymentTotal = forms.reduce((sum, f) => sum + (parseFloat(f.payment_amount || '0') || 0), 0);
  const paymentTotalFormatted = paymentTotal > 0 ? `$${paymentTotal.toLocaleString()}` : '\u2014';

  const frictionMetrics = buildFrictionMetrics(forms, total);

  return {
    total,
    entity_name: entityName,
    avg_complexity: avgComplexity,
    hardest_name: hardestName,
    hardest_complexity: hardest.complexity_score || 0,
    payment_total: paymentTotalFormatted,
    friction_metrics: frictionMetrics,
  };
}

function buildFrictionMetrics(forms: CachedAnalysis[], total: number) {
  const metrics = [
    { id: 'attachments', title: 'Attachment hunting', count: forms.filter(f => f.attachments_required).length, badge: '% of forms', description: 'Chasing proofs (certificates, letters, IDs) across offices is a common derail.' },
    { id: 'notary', title: 'Notary bottlenecks', count: forms.filter(f => f.notarization_required).length, badge: '% require in-person steps', description: 'Even small percentages create friction for citizens without easy access to notaries.' },
    { id: 'conditional', title: 'Conditional confusion', count: forms.filter(f => f.conditional_logic).length, badge: '% include branching', description: '"If this, then that" logic raises error risk and NIGO returns.' },
    { id: 'pii', title: 'High identification burden', count: forms.filter(f => f.identification_required).length, badge: '% request ID/PII', description: 'Sensitive details create pause and slow completion.' },
    { id: 'signatures', title: 'Signature requirements', count: forms.filter(f => f.signature_required).length, badge: '% require signatures', description: 'Manual signatures add friction and delay when not digital-first.' },
    { id: 'payment', title: 'Payment friction', count: forms.filter(f => f.payment_required).length, badge: '% require payment', description: 'Payment requirements add complexity and abandon risk.' },
    { id: 'complexity', title: 'High field density', count: forms.filter(f => (f.total_field_count || f.field_count || 0) > 20).length, badge: '% have 20+ fields', description: 'Forms with many fields increase abandonment.' },
    { id: 'pages', title: 'Multi-page complexity', count: forms.filter(f => (f.pages || 1) > 3).length, badge: '% have 4+ pages', description: 'Lengthy forms create cognitive load.' },
  ];

  return metrics
    .map(m => ({ ...m, percentage: ((m.count / total) * 100).toFixed(0) }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
    .slice(0, 4);
}

function generateReportHTML(forms: CachedAnalysis[], stats: ReturnType<typeof calculateStats>): string {
  const getComplexityClass = (score: number) => {
    if (score >= 75) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  // All interpolated values are escaped to prevent XSS
  const tableRows = forms.map(form => `
    <tr>
      <td class="primary">
        <div class="form-name">${escapeHtml(getFormDisplayName(form))}</div>
        <div class="form-meta">
          ${form.pages || 1} pages &bull; ${form.total_field_count || form.field_count || 0} fields
          ${(form.language_count ?? 0) > 1 ? ` &bull; <span class="lang-tag">+${(form.language_count ?? 0) - 1} Langs</span>` : ''}
        </div>
      </td>
      <td>
        <div class="complexity-badge ${getComplexityClass(form.complexity_score || 0)}">
          ${form.complexity_score || 0}
        </div>
      </td>
      <td>
        ${form.signature_required ? '<span class="tag tag-warn">Sign</span>' : ''}
        ${form.notarization_required ? '<span class="tag tag-warn">Notary</span>' : ''}
        ${form.payment_required ? '<span class="tag tag-warn">Pay</span>' : ''}
        ${!form.signature_required && !form.notarization_required && !form.payment_required ?
      ((form.total_field_count || form.field_count || 0) > 0 ? '<span class="tag tag-ok" style="background:#eef2ff; color:#4338ca; border-color:#e0e7ff">Data Entry</span>' : '<span class="tag tag-ok">Info Only</span>')
      : ''}
      </td>
      <td>
        <a href="${escapeHtml(form.pdf_url || '')}" target="_blank" class="action-link">View PDF &rarr;</a>
      </td>
    </tr>
  `).join('');

  const frictionCards = stats.friction_metrics.map(metric => `
    <div class="hard">
      <div>
        <strong>${escapeHtml(metric.title)}</strong><span class="badge">${escapeHtml(metric.percentage)}${escapeHtml(metric.badge)}</span>
        <div class="note">${escapeHtml(metric.description)}</div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Form Analysis Report - ${escapeHtml(stats.entity_name)}</title>
  <style>
    :root { --bg:#f8fafc; --card:#ffffff; --text:#0f172a; --sub:#64748b; --border:#e2e8f0; --primary:#4f46e5; }
    body { font-family:'Inter',system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; padding:40px; margin:0; }
    .container { max-width:900px; margin:0 auto; }
    h1 { font-size:28px; font-weight:700; letter-spacing:-0.02em; margin-bottom:8px; }
    p.sub { color:var(--sub); margin-top:0; margin-bottom:32px; font-size:16px; }
    .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
    .stat-card { background:var(--card); border:1px solid var(--border); padding:24px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
    .stat-val { font-size:32px; font-weight:700; color:var(--primary); letter-spacing:-0.02em; }
    .stat-label { font-size:13px; font-weight:600; color:var(--sub); text-transform:uppercase; letter-spacing:0.05em; margin-top:4px; }
    .hero-card { background:linear-gradient(135deg,#4f46e5,#7c3aed); color:white; border-radius:16px; padding:32px; margin-bottom:32px; }
    .hero-card h2 { margin-top:0; font-size:20px; opacity:0.9; }
    .hards { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px; }
    .hard { background:rgba(255,255,255,0.1); padding:16px; border-radius:8px; }
    .hard strong { display:block; font-size:15px; margin-bottom:2px; }
    .hard .badge { font-size:11px; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px; margin-left:6px; }
    .hard .note { font-size:13px; opacity:0.8; margin-top:4px; }
    .table-wrap { background:var(--card); border-radius:12px; border:1px solid var(--border); overflow:hidden; }
    table { width:100%; border-collapse:collapse; }
    th { text-align:left; background:#f1f5f9; padding:12px 24px; font-size:12px; font-weight:600; color:var(--sub); text-transform:uppercase; }
    td { padding:16px 24px; border-bottom:1px solid var(--border); vertical-align:top; }
    tr:last-child td { border-bottom:none; }
    .form-name { font-weight:600; }
    .form-meta { font-size:12px; color:var(--sub); margin-top:4px; }
    .complexity-badge { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; font-weight:700; font-size:14px; }
    .complexity-badge.low { background:#dcfce7; color:#166534; }
    .complexity-badge.medium { background:#fef9c3; color:#854d0e; }
    .complexity-badge.high { background:#fee2e2; color:#991b1b; }
    .tag { display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; margin-right:4px; }
    .tag-warn { background:#fff7ed; color:#c2410c; border:1px solid #ffedd5; }
    .tag-ok { background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
    .action-link { color:var(--primary); text-decoration:none; font-size:13px; font-weight:500; }
    .footer { text-align:center; margin-top:48px; color:var(--sub); font-size:13px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Where customers feel the friction</h1>
    <p class="sub">This report spotlights the moments that make <strong>${escapeHtml(stats.entity_name)}</strong> forms hard to complete.</p>
    <div class="stats">
      <div class="stat-card"><div class="stat-val">${escapeHtml(stats.avg_complexity)}</div><div class="stat-label">Avg. Complexity Score</div></div>
      <div class="stat-card"><div class="stat-val">${escapeHtml(stats.hardest_name)}</div><div class="stat-label">Hardest Form</div></div>
      <div class="stat-card"><div class="stat-val">${escapeHtml(stats.payment_total)}</div><div class="stat-label">Total Payment Requests</div></div>
    </div>
    <div class="hero-card">
      <h2>What makes this hard for people</h2>
      <div class="hards">${frictionCards}</div>
    </div>
    <h3>Detailed Form Analysis</h3>
    <div class="table-wrap">
      <table><thead><tr><th>Form Name</th><th>Complexity</th><th>Friction Points</th><th>Action</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
    </div>
    <div class="footer">Generated by Form Genome AI on ${new Date().toLocaleDateString()}</div>
  </div>
</body>
</html>`;
}
