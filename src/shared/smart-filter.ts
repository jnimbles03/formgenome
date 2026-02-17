/**
 * Smart filter heuristic for pre-selecting actionable forms
 * and deselecting informational / marketing documents.
 *
 * Runs entirely client-side — no API calls, instant results.
 * Scores each PDF by matching its URL, filename, and display text
 * against keyword lists.  Negative score → deselect.
 */

import type { PdfLink } from '../types/pdf';

// ────────────────────────────────────────────────────────────
// Keyword lists
// ────────────────────────────────────────────────────────────

/**
 * Patterns that indicate an **informational** document
 * (disclosures, T&Cs, brochures, guides, worksheets, etc.).
 * Each match subtracts 1 from the score.
 */
const INFORMATIONAL_PATTERNS: RegExp[] = [
  /terms\s*(and|&)\s*conditions/i,
  /terms[\s-]*of[\s-]*use/i,
  /disclosures?/i,
  /privacy\s*notice/i,
  /account\s*agreements?\s*booklet/i,
  /guide\s*to\s*benefits/i,
  /\bbrochure\b/i,
  /\bnewsletter\b/i,
  /\bwhitepaper\b/i,
  /\binfographic\b/i,
  /\bworksheet\b/i,
  /\bbudget\b/i,
  /\brate\s*sheet\b/i,
  /\blending\s*rates?\b/i,
  /\beula\b/i,
  /end\s*user\s*agreement/i,
  /wiring\s*instructions?/i,
  /program\s*rules/i,
  /loan\s*payment\s*protection/i,
  /rules,?\s*terms/i,
  /\bnotice\b(?!.*(?:cancel|request|authorization))/i,
];

/**
 * Patterns that indicate an **actionable** form
 * (collects data, requires a signature, or represents a commitment).
 * Each match adds 1 to the score.
 */
const ACTIONABLE_PATTERNS: RegExp[] = [
  /\bapplication\b/i,
  /\benrollment\b/i,
  /\benroll\b/i,
  /\bauthoriz(ation|e)\b/i,
  /\brequest\b/i,
  /\baffidavit\b/i,
  /\battestation\b/i,
  /\bdeclaration\b/i,
  /\belection\b/i,
  /\bdesignate\b/i,
  /\bcertificat(ion|e)\b/i,
  /\bcancel\b/i,
  /\bmodify\b/i,
  /\bset\s*up\b/i,
  /\bmanage\b/i,
  /\bclose\b.*\baccounts?\b/i,
  /\bupdate\b/i,
  /\badd\s*(or|&)\s*remove\b/i,
  /\bquestionnaire\b/i,
  /\bclaim\b/i,
  /\bstop\s*payment\b/i,
  /change\s*request/i,
  /\bpayment\s*(change|authorization)\b/i,
  /\bsuspend\b/i,
];

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

export interface SmartFilterResult {
  /** Number of PDFs kept selected. */
  kept: number;
  /** Number of PDFs deselected. */
  removed: number;
  /** Per-index decision: true = keep selected, false = deselect. */
  decisions: Map<number, boolean>;
}

/**
 * Scores each PDF and returns a per-index keep/deselect decision.
 *
 * @param pdfs       The list of detected PdfLinks.
 * @param analyzed   Optional set of indices that are already analyzed
 *                   (these are left untouched — their current state is preserved).
 */
export function smartFilterPdfs(
  pdfs: PdfLink[],
  analyzed?: Set<number>,
): SmartFilterResult {
  const decisions = new Map<number, boolean>();
  let kept = 0;
  let removed = 0;

  pdfs.forEach((pdf, index) => {
    // Skip already-analyzed PDFs — don't change their state
    if (analyzed?.has(index)) {
      decisions.set(index, false); // false = "don't change"
      return;
    }

    const shouldKeep = scorePdf(pdf) >= 0;
    decisions.set(index, shouldKeep);
    if (shouldKeep) kept++;
    else removed++;
  });

  return { kept, removed, decisions };
}

/**
 * Computes a score for a single PDF.
 * Positive → actionable, negative → informational.
 */
export function scorePdf(pdf: PdfLink): number {
  // Combine all text signals into one searchable string
  const haystack = [
    pdf.text,
    pdf.filename,
    decodeURIComponent(pdf.url),
  ].join(' ');

  let score = 0;

  for (const pattern of INFORMATIONAL_PATTERNS) {
    if (pattern.test(haystack)) score -= 1;
  }

  for (const pattern of ACTIONABLE_PATTERNS) {
    if (pattern.test(haystack)) score += 1;
  }

  return score;
}
