import re
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from app.models import FormAnalysis

class PDFFormAnalyzer:
    def __init__(self):
        pass
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF using multiple methods."""
        text = ""
        
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except:
            try:
                import PyPDF2
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
            except:
                text = "Could not extract text from PDF"
        
        return text
    
    def analyze_pdf(self, file_path: str, source_url: str = None) -> List[FormAnalysis]:
        """Analyze a PDF file and return analysis for all forms found."""
        text = self.extract_text_from_pdf(file_path)
        
        # Create analysis
        analysis = FormAnalysis()
        analysis.file_path = file_path
        analysis.source_url = source_url
        analysis.analysis_date = datetime.now().strftime('%Y-%m-%d')
        
        # Basic analysis
        analysis.form_id = "PDF-1"
        analysis.form_title = self._extract_title(text)
        analysis.entity_name = self._extract_entity(text)
        analysis.page_count = max(1, len(text) // 3000)
        analysis.signature_count = len(re.findall(r'(?i)signature', text))
        analysis.field_count = len(re.findall(r'_{3,}', text))
        
        # Scoring
        analysis.base_score = self._calculate_base_score(text)
        analysis.industry_vertical, analysis.industry_subvertical = self._classify_industry(text)
        analysis.industry_score = self._calculate_industry_score(text, analysis.industry_vertical)
        analysis.multiplier = 1.0
        analysis.complexity_score = analysis.base_score + analysis.industry_score
        analysis.complexity_level = self._determine_complexity_level(analysis.complexity_score)
        
        # Additional fields
        analysis.time_estimate_min, analysis.time_estimate_max = self._estimate_time(analysis.complexity_score)
        analysis.assistance_level = "Optional" if analysis.complexity_score > 30 else "None"
        analysis.key_driver_1 = "Form complexity"
        analysis.key_driver_2 = "Field count"
        analysis.key_driver_3 = "Industry requirements"
        analysis.notarization_required = "Yes" if re.search(r'(?i)notary', text) else "No"
        analysis.witnesses_required = "Yes" if re.search(r'(?i)witness', text) else "No"
        analysis.identification_required = "Yes" if re.search(r'(?i)id|identification', text) else "No"
        analysis.deadline_present = "Yes" if re.search(r'(?i)deadline', text) else "No"
        analysis.conditional_field_logic = "Yes" if re.search(r'(?i)if\s+', text) else "No"
        analysis.other_form_dependencies = "No"
        analysis.confidence_score = 85
        analysis.notes = f"Analyzed PDF with {analysis.page_count} pages"
        
        return [analysis]
    
    def _extract_title(self, text: str) -> str:
        lines = text.split('\n')[:5]
        for line in lines:
            if len(line.strip()) > 10:
                return line.strip()
        return "Untitled Form"
    
    def _extract_entity(self, text: str) -> str:
        # Simple entity extraction
        lines = text.split('\n')[:3]
        for line in lines:
            if any(word in line.lower() for word in ['bank', 'department', 'health', 'insurance']):
                return line.strip()
        return "Unknown"
    
    def _calculate_base_score(self, text: str) -> int:
        score = 0
        score += len(re.findall(r'(?i)signature', text)) * 5
        score += len(re.findall(r'_{3,}', text)) // 2
        score += len(re.findall(r'(?i)attach', text)) * 3
        return min(score, 100)
    
    def _classify_industry(self, text: str) -> Tuple[str, str]:
        text_lower = text.lower()
        if any(term in text_lower for term in ['bank', 'financial', 'investment']):
            return 'FINS', 'Banking'
        elif any(term in text_lower for term in ['health', 'medical', 'patient']):
            return 'HLS', 'Healthcare'
        elif any(term in text_lower for term in ['government', 'federal', 'state']):
            return 'PubSec', 'Government'
        return 'Unknown', 'Unknown'
    
    def _calculate_industry_score(self, text: str, industry: str) -> int:
        if industry == 'FINS':
            return 10 if 'kyc' in text.lower() else 5
        elif industry == 'HLS':
            return 12 if 'hipaa' in text.lower() else 6
        elif industry == 'PubSec':
            return 15 if 'veterans' in text.lower() else 8
        return 0
    
    def _determine_complexity_level(self, score: int) -> str:
        if score <= 15:
            return "Low"
        elif score <= 35:
            return "Medium"
        elif score <= 65:
            return "High"
        else:
            return "VeryHigh"
    
    def _estimate_time(self, score: int) -> Tuple[int, int]:
        if score <= 15:
            return (5, 15)
        elif score <= 35:
            return (15, 30)
        elif score <= 65:
            return (30, 60)
        else:
            return (60, 120)
