import sqlite3
from datetime import datetime
from typing import List, Dict, Optional

class FormAnalysis:
    def __init__(self):
        self.form_id = None
        self.form_title = None
        self.industry_vertical = None
        self.industry_subvertical = None
        self.complexity_score = None
        self.complexity_level = None
        self.base_score = None
        self.industry_score = None
        self.multiplier = None
        self.signature_count = None
        self.page_count = None
        self.field_count = None
        self.attachment_count = None
        self.condition_count = None
        self.key_driver_1 = None
        self.key_driver_2 = None
        self.key_driver_3 = None
        self.time_estimate_min = None
        self.time_estimate_max = None
        self.assistance_level = None
        self.notarization_required = None
        self.witnesses_required = None
        self.third_party_count = None
        self.deadline_present = None
        self.special_requirements = None
        self.confidence_score = None
        self.analysis_date = None
        self.notes = None
        self.identification_required = None
        self.data_validation_count = None
        self.conditional_field_logic = None
        self.other_form_dependencies = None
        self.entity_name = None
        self.source_url = None
        self.file_path = None
        self.created_at = datetime.now()

    def to_dict(self) -> Dict:
        return {
            'form_id': self.form_id,
            'form_title': self.form_title,
            'industry_vertical': self.industry_vertical,
            'industry_subvertical': self.industry_subvertical,
            'complexity_score': self.complexity_score,
            'complexity_level': self.complexity_level,
            'base_score': self.base_score,
            'industry_score': self.industry_score,
            'multiplier': self.multiplier,
            'signature_count': self.signature_count,
            'page_count': self.page_count,
            'field_count': self.field_count,
            'attachment_count': self.attachment_count,
            'condition_count': self.condition_count,
            'key_driver_1': self.key_driver_1,
            'key_driver_2': self.key_driver_2,
            'key_driver_3': self.key_driver_3,
            'time_estimate_min': self.time_estimate_min,
            'time_estimate_max': self.time_estimate_max,
            'assistance_level': self.assistance_level,
            'notarization_required': self.notarization_required,
            'witnesses_required': self.witnesses_required,
            'third_party_count': self.third_party_count,
            'deadline_present': self.deadline_present,
            'special_requirements': self.special_requirements,
            'confidence_score': self.confidence_score,
            'analysis_date': self.analysis_date,
            'notes': self.notes,
            'identification_required': self.identification_required,
            'data_validation_count': self.data_validation_count,
            'conditional_field_logic': self.conditional_field_logic,
            'other_form_dependencies': self.other_form_dependencies,
            'entity_name': self.entity_name,
            'source_url': self.source_url,
            'file_path': self.file_path,
            'created_at': self.created_at
        }
