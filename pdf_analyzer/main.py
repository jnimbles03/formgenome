from flask import Flask
from app.database import init_db
from app.routes import main_bp
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['UPLOAD_FOLDER'] = 'uploads/temp'
    app.config['DATABASE_PATH'] = 'data/database.db'
    
    # Ensure directories exist
    os.makedirs('data', exist_ok=True)
    os.makedirs('uploads/temp', exist_ok=True)
    
    # Initialize database
    init_db(app.config['DATABASE_PATH'])
    
    # Register blueprints
    app.register_blueprint(main_bp)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
