import sqlite3
from typing import List, Dict, Optional
from app.models import FormAnalysis

def init_db(db_path: str):
    """Initialize the database with required tables."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Form analysis results table with all 33 fields
    cursor.execute(\"""
        CREATE TABLE IF NOT EXISTS form_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            form_id TEXT,
            form_title TEXT,
            industry_vertical TEXT,
            industry_subvertical TEXT,
            complexity_score INTEGER,
            complexity_level TEXT,
            base_score INTEGER,
            industry_score INTEGER,
            multiplier REAL,
            signature_count INTEGER,
            page_count INTEGER,
            field_count INTEGER,
            attachment_count INTEGER,
            condition_count INTEGER,
            key_driver_1 TEXT,
            key_driver_2 TEXT,
            key_driver_3 TEXT,
            time_estimate_min INTEGER,
            time_estimate_max INTEGER,
            assistance_level TEXT,
            notarization_required TEXT,
            witnesses_required TEXT,
            third_party_count INTEGER,
            deadline_present TEXT,
            special_requirements TEXT,
            confidence_score INTEGER,
            analysis_date TEXT,
            notes TEXT,
            identification_required TEXT,
            data_validation_count INTEGER,
            conditional_field_logic TEXT,
            other_form_dependencies TEXT,
            entity_name TEXT,
            source_url TEXT,
            file_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    \""")
    
    conn.commit()
    conn.close()

def save_analysis(db_path: str, analysis: FormAnalysis) -> int:
    """Save a form analysis to the database."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    data = analysis.to_dict()
    columns = ', '.join(data.keys())
    placeholders = ', '.join(['?' for _ in data])
    
    cursor.execute(f\"""
        INSERT INTO form_analyses ({columns})
        VALUES ({placeholders})
    \""", list(data.values()))
    
    analysis_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return analysis_id

def get_analyses(db_path: str, filters: Optional[Dict] = None, 
                limit: int = 100, offset: int = 0) -> List[Dict]:
    """Retrieve form analyses with optional filtering."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM form_analyses ORDER BY created_at DESC LIMIT ? OFFSET ?"
    cursor.execute(query, (limit, offset))
    results = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return results

def get_analytics(db_path: str) -> Dict:
    """Get summary analytics for the dashboard."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Total forms analyzed
    cursor.execute("SELECT COUNT(*) FROM form_analyses")
    total_forms = cursor.fetchone()[0]
    
    # Complexity distribution
    cursor.execute(\"""
        SELECT complexity_level, COUNT(*) 
        FROM form_analyses 
        GROUP BY complexity_level
    \""")
    complexity_dist = dict(cursor.fetchall())
    
    # Industry distribution  
    cursor.execute(\"""
        SELECT industry_vertical, COUNT(*) 
        FROM form_analyses 
        GROUP BY industry_vertical
    \""")
    industry_dist = dict(cursor.fetchall())
    
    conn.close()
    
    return {
        'total_forms': total_forms,
        'complexity_distribution': complexity_dist,
        'industry_distribution': industry_dist
    }
