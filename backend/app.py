from flask import Flask, send_file
from flask_cors import CORS
from flask_migrate import Migrate
from models import db
import os
import logging
from google_drive_service import GoogleDriveService, google_drive_service
from gst_bill_routes import gst_bill_bp
from gst_customer_routes import gst_customer_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 'sqlite:///test.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = 'uploads'

    # Serve uploaded files
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        uploads_dir = os.path.join(app.root_path, 'uploads')
        return send_file(os.path.join(uploads_dir, filename))

    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)

    # Logging configuration
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[logging.FileHandler("flask_log.txt"), logging.StreamHandler()]
    )

    # Register blueprints
    from routes import api_bp
    from license_routes import license_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(license_bp, url_prefix='/api')
    app.register_blueprint(gst_bill_bp, url_prefix='/api')
    app.register_blueprint(gst_customer_bp, url_prefix='/api')
    with app.app_context():
        global google_drive_service
        google_drive_service = GoogleDriveService()

    return app


app = create_app()

# import scheduler AFTER app is created
from scheduler import scheduler
from google_drive_service import schedule_backup

# if you want a default job:
# schedule_backup(scheduler, app, "20:00")

if __name__ == '__main__':
    app.run(debug=True)
