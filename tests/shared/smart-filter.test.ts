import { describe, it, expect } from 'vitest';
import { smartFilterPdfs, scorePdf } from '../../src/shared/smart-filter';
import type { PdfLink } from '../../src/types/pdf';

/** Helper to create a minimal PdfLink for testing. */
function makePdf(overrides: Partial<PdfLink> = {}): PdfLink {
  return {
    url: 'https://example.com/document.pdf',
    filename: 'document.pdf',
    text: 'Document',
    language_count: 1,
    is_english: true,
    is_implicit: false,
    variations: [],
    action: 'analyze',
    ...overrides,
  };
}

describe('scorePdf', () => {
  // ── Actionable forms (positive score → keep) ──────────────

  it('scores "Authorization to Mail Credit Card" as actionable', () => {
    const pdf = makePdf({
      text: 'Authorization to Mail Credit/Debit Card to Alternate Address (Print)',
      url: 'https://www.becu.org/-/media/Files/PDF/218.pdf',
      filename: '218.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThanOrEqual(0);
  });

  it('scores "Close Personal Accounts" as actionable', () => {
    const pdf = makePdf({
      text: 'Close Personal Accounts (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/6862-BECU-Close-Personal-Accounts.pdf',
      filename: '6862-BECU-Close-Personal-Accounts.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThan(0);
  });

  it('scores "Membership Enrollment Packet" as actionable', () => {
    const pdf = makePdf({
      text: 'Membership Enrollment Packet (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/P-6803.pdf',
      filename: 'P-6803.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThan(0);
  });

  it('scores "Cancel ACH Transfer" as actionable', () => {
    const pdf = makePdf({
      text: 'Cancel ACH Transfer from External Account (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/7983.pdf',
      filename: '7983.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThan(0);
  });

  it('scores "ID Theft Affidavit" as actionable', () => {
    const pdf = makePdf({
      text: 'ID Theft Affidavit (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/ID_Theft_Affidavit.pdf',
      filename: 'ID_Theft_Affidavit.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThan(0);
  });

  it('scores "Visa Automatic Payment Change Request" as actionable', () => {
    const pdf = makePdf({
      text: 'Visa Automatic Payment Change Request (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/AUTOVISAPAYMENT_WEB.pdf',
      filename: 'AUTOVISAPAYMENT_WEB.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThan(0);
  });

  it('scores "Member Due Diligence Questionnaire" as actionable', () => {
    const pdf = makePdf({
      text: 'Member Due Diligence Questionnaire (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/6994.pdf',
      filename: '6994.pdf',
    });
    expect(scorePdf(pdf)).toBeGreaterThan(0);
  });

  // ── Informational documents (negative score → deselect) ───

  it('scores "Cash Back Visa Rules Terms and Conditions" as informational', () => {
    const pdf = makePdf({
      text: 'BECU Cash Back Visa Program Rules, Terms and Conditions (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/BECU-Cash-Back-Visa-Program-Rules-Terms-Conditions.pdf',
      filename: 'BECU-Cash-Back-Visa-Program-Rules-Terms-Conditions.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "Account Agreements Booklet" as informational', () => {
    const pdf = makePdf({
      text: 'Account Agreements Booklet (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/6514.pdf',
      filename: '6514.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "Incoming Wiring Instructions" as informational', () => {
    const pdf = makePdf({
      text: 'Incoming Wiring Instructions (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/IncomingWireInstructions.pdf',
      filename: 'IncomingWireInstructions.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "U.S. Consumer Privacy Notice" as informational', () => {
    const pdf = makePdf({
      text: 'U.S. Consumer Privacy Notice (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/6524-BECU-US-Consumer-Privacy-Notice.pdf',
      filename: '6524-BECU-US-Consumer-Privacy-Notice.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "Financial Health Check Monthly Budget Worksheet" as informational', () => {
    const pdf = makePdf({
      text: 'Financial Health Check Monthly Budget Worksheet (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/Financial_Health_Check_Worksheet.pdf',
      filename: 'Financial_Health_Check_Worksheet.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "Visa Guide to Benefits" as informational', () => {
    const pdf = makePdf({
      text: 'Visa Guide to Benefits (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/VISAGTB.pdf',
      filename: 'VISAGTB.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "Lending Rates and Related Disclosures" as informational', () => {
    const pdf = makePdf({
      text: 'Lending Rates and Related Disclosures—Credit Cards (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/461.pdf',
      filename: '461.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  it('scores "NCUA Deposit Insurance Brochure" as informational', () => {
    const pdf = makePdf({
      text: 'NCUA Deposit Insurance Brochure (Print PDF)',
      url: 'https://www.becu.org/-/media/Files/PDF/ncua.pdf',
      filename: 'ncua.pdf',
    });
    expect(scorePdf(pdf)).toBeLessThan(0);
  });

  // ── Neutral / generic PDFs (score >= 0 → keep) ────────────

  it('keeps a generic PDF with no matching keywords (score 0)', () => {
    const pdf = makePdf({
      text: 'Some Document',
      url: 'https://example.com/some-doc.pdf',
      filename: 'some-doc.pdf',
    });
    expect(scorePdf(pdf)).toBe(0);
  });
});

describe('smartFilterPdfs', () => {
  it('returns correct kept/removed counts for a mixed list', () => {
    const pdfs = [
      makePdf({ text: 'Membership Enrollment Packet' }),                // actionable
      makePdf({ text: 'Account Agreements Booklet' }),                  // informational
      makePdf({ text: 'Close Personal Accounts' }),                     // actionable
      makePdf({ text: 'Visa Guide to Benefits' }),                      // informational
      makePdf({ text: 'Cancel ACH Transfer from External Account' }),   // actionable
    ];

    const result = smartFilterPdfs(pdfs);

    expect(result.kept).toBe(3);
    expect(result.removed).toBe(2);
    expect(result.decisions.get(0)).toBe(true);  // enrollment — keep
    expect(result.decisions.get(1)).toBe(false); // agreement booklet — deselect
    expect(result.decisions.get(2)).toBe(true);  // close — keep
    expect(result.decisions.get(3)).toBe(false); // guide — deselect
    expect(result.decisions.get(4)).toBe(true);  // cancel — keep
  });

  it('skips already-analyzed PDFs (preserves their state)', () => {
    const pdfs = [
      makePdf({ text: 'Account Agreements Booklet' }),   // informational
      makePdf({ text: 'Visa Guide to Benefits' }),        // informational
    ];

    const analyzed = new Set([0]); // index 0 is already analyzed
    const result = smartFilterPdfs(pdfs, analyzed);

    // Index 0 is skipped (decision = false meaning "don't change")
    expect(result.decisions.get(0)).toBe(false);
    // Index 1 is scored and deselected
    expect(result.decisions.get(1)).toBe(false);
    // Only index 1 counted toward removed (index 0 was skipped entirely)
    expect(result.removed).toBe(1);
    expect(result.kept).toBe(0);
  });

  it('keeps all PDFs when none match informational patterns', () => {
    const pdfs = [
      makePdf({ text: 'Authorization Form' }),
      makePdf({ text: 'Application Packet' }),
      makePdf({ text: 'Some Generic Form' }),
    ];

    const result = smartFilterPdfs(pdfs);
    expect(result.kept).toBe(3);
    expect(result.removed).toBe(0);
  });
});
