from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
import os
import uuid
from app.downloader import PDFDownloader
from app.analyzer import PDFFormAnalyzer
from app.database import save_analysis, get_analyses, get_analytics
import threading

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Dashboard with analytics and recent analyses."""
    analytics = get_analytics('data/database.db')
    recent_analyses = get_analyses('data/database.db', limit=10)
    return render_template('index.html', analytics=analytics, recent_analyses=recent_analyses)

@main_bp.route('/upload')
def upload_page():
    """Upload page for URL lists."""
    return render_template('upload.html')

@main_bp.route('/process_urls', methods=['POST'])
def process_urls():
    """Process uploaded URL list and start analysis."""
    if 'url_file' not in request.files:
        flash('No file uploaded', 'error')
        return redirect(url_for('main.upload_page'))
    
    file = request.files['url_file']
    if file.filename == '':
        flash('No file selected', 'error')
        return redirect(url_for('main.upload_page'))
    
    # Read URL list
    content = file.read().decode('utf-8')
    downloader = PDFDownloader()
    urls = downloader.parse_url_list(content)
    
    if not urls:
        flash('No valid URLs found in file', 'error')
        return redirect(url_for('main.upload_page'))
    
    # Start background processing
    batch_id = str(uuid.uuid4())
    thread = threading.Thread(target=process_batch, args=(batch_id, urls))
    thread.daemon = True
    thread.start()
    
    flash(f'Started processing {len(urls)} URLs. Batch ID: {batch_id}', 'success')
    return redirect(url_for('main.batch_status', batch_id=batch_id))

@main_bp.route('/batch/<batch_id>')
def batch_status(batch_id):
    """Show batch processing status."""
    return render_template('batch_status.html', batch_id=batch_id)

@main_bp.route('/results')
def results():
    """View and filter analysis results."""
    analyses = get_analyses('data/database.db', limit=50)
    return render_template('results.html', analyses=analyses, filters={})

@main_bp.route('/admin')
def admin():
    """Admin page for managing knowledge sources."""
    return render_template('admin.html')

@main_bp.route('/api/export')
def export_data():
    """Export analysis data as JSON."""
    analyses = get_analyses('data/database.db', limit=10000)
    return jsonify(analyses)

def process_batch(batch_id: str, urls: list):
    """Background function to process a batch of URLs."""
    try:
        downloader = PDFDownloader()
        analyzer = PDFFormAnalyzer()
        
        for url in urls:
            try:
                # Download PDF
                success, message, file_path = downloader.download_pdf(url)
                
                if success and file_path:
                    # Analyze PDF
                    analyses = analyzer.analyze_pdf(file_path, url)
                    
                    # Save to database
                    for analysis in analyses:
                        save_analysis('data/database.db', analysis)
                    
                    # Clean up
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        
            except Exception as e:
                print(f"Error processing {url}: {str(e)}")
        
        print(f"Batch {batch_id} completed")
        
    except Exception as e:
        print(f"Error in batch processing: {str(e)}")
