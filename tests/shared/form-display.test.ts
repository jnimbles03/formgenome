import { describe, it, expect } from 'vitest';
import { getFormDisplayName } from '../../src/shared/form-display';

describe('getFormDisplayName', () => {
  it('uses pretty_title when available', () => {
    expect(getFormDisplayName({ pretty_title: 'My Form' })).toBe('My Form');
  });

  it('falls back to form_title', () => {
    expect(getFormDisplayName({ form_title: 'Form Title' })).toBe('Form Title');
  });

  it('falls back to form_name', () => {
    expect(getFormDisplayName({ form_name: 'form_name_value' })).toBe('form_name_value');
  });

  it('falls back to title when not numeric', () => {
    expect(getFormDisplayName({ title: 'Just Title' })).toBe('Just Title');
  });

  it('skips numeric-only title and uses pdf_name', () => {
    expect(getFormDisplayName({ title: '6715', pdf_name: 'Add Code Word' })).toBe('Add Code Word');
  });

  it('skips numeric-only pretty_title', () => {
    expect(getFormDisplayName({ pretty_title: '218', title: 'Real Title' })).toBe('Real Title');
  });

  it('uses metadata /Title when title fields are numeric', () => {
    expect(getFormDisplayName({
      title: '218',
      metadata: { '/Title': '218-BECU-Authorization to Mail Credit Card' },
    })).toBe('BECU Authorization to Mail Credit Card');
  });

  it('strips numeric prefix from metadata title', () => {
    expect(getFormDisplayName({
      title: '6715',
      metadata: { '/Title': '6715-BECU Add, Change, or Remove Code Word' },
    })).toBe('BECU Add, Change, or Remove Code Word');
  });

  it('uses metadata /Title when all title fields are empty', () => {
    expect(getFormDisplayName({
      metadata: { '/Title': 'Important Application Form' },
    })).toBe('Important Application Form');
  });

  it('skips numeric-only metadata title', () => {
    expect(getFormDisplayName({
      title: '1234',
      metadata: { '/Title': '5678' },
      pdf_name: 'Real Form.pdf',
    })).toBe('Real Form');
  });

  it('uses pdf_name when no title fields are set', () => {
    expect(getFormDisplayName({ pdf_name: 'document.pdf' })).toBe('document');
  });

  it('removes duplicate .pdf.pdf extension', () => {
    expect(getFormDisplayName({ pdf_name: 'form.pdf.pdf' })).toBe('form');
  });

  it('strips Gform prefix from pdf_name', () => {
    expect(getFormDisplayName({ pdf_name: 'Gform_application.pdf' })).toBe('_application');
  });

  it('returns Untitled when nothing is available', () => {
    expect(getFormDisplayName({})).toBe('Untitled');
  });

  it('returns Untitled for empty strings', () => {
    expect(getFormDisplayName({ pretty_title: '', form_title: '', form_name: '' })).toBe('Untitled');
  });

  it('returns Untitled for whitespace-only names', () => {
    expect(getFormDisplayName({ pretty_title: '   ', form_title: '  ' })).toBe('Untitled');
  });

  it('prefers pretty_title over metadata title', () => {
    expect(getFormDisplayName({
      pretty_title: 'Nice Name',
      metadata: { '/Title': '218-BECU-Something Else' },
    })).toBe('Nice Name');
  });
});
