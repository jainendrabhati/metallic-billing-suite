
from flask import Blueprint, request, jsonify, send_file, current_app

from models import db, Transaction, Customer, Stock, Bill, Employee, Expense, Settings, GoogleDriveSettings

from utils import backup_database, restore_database
from google_drive_service import google_drive_service, schedule_backup, setup_backup_scheduler
import os
from werkzeug.utils import secure_filename

dashboard_bp = Blueprint('dashboard', __name__)

# Initialize backup scheduler when module loads
setup_backup_scheduler()

# Settings APIs
@dashboard_bp.route('/settings', methods=['GET'])
def get_settings():
    try:
        settings = Settings.get_settings()
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/settings', methods=['PUT'])
def update_settings():
    try:
        data = request.get_json()
        settings = Settings.update_settings(**data)
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Google Drive Settings APIs
@dashboard_bp.route('/google-drive/settings', methods=['GET'])
def get_google_drive_settings():
    try:
        settings = GoogleDriveSettings.query.first()
        if not settings:
            settings = GoogleDriveSettings()
            db.session.add(settings)
            db.session.commit()
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/google-drive/settings', methods=['PUT'])
def update_google_drive_settings():
    try:
        data = request.get_json()
        settings = GoogleDriveSettings.query.first()
        
        if not settings:
            settings = GoogleDriveSettings()
            db.session.add(settings)
        
        if 'email' in data:
            settings.email = data['email']
        if 'backup_time' in data:
            settings.backup_time = data['backup_time']
        if 'auto_backup_enabled' in data:
            settings.auto_backup_enabled = data['auto_backup_enabled']
        
        db.session.commit()
        
        # Update backup schedule if enabled
        if settings.auto_backup_enabled and settings.backup_time:
            schedule_backup(settings.backup_time)
        
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/google-drive/authenticate', methods=['POST'])
def authenticate_google_drive():
    try:
        data = request.get_json()
        email = data.get('email')
        backup_time = data.get('backup_time', '20:00')
        auto_backup_enabled = data.get('auto_backup_enabled', False)
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        

        # Clear any existing authentication to force re-authentication with new email
        token_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'gdrive_token.pickle')
        if os.path.exists(token_path):
            os.remove(token_path)
        
        # Authenticate with Google Drive using the provided email

        success = google_drive_service.authenticate(email)
        
        if not success:
            return jsonify({'error': 'Failed to authenticate with Google Drive. Please ensure you have proper credentials setup.'}), 400
        

        # Save or update settings with the new email

        settings = GoogleDriveSettings.query.first()
        if not settings:
            settings = GoogleDriveSettings()
            db.session.add(settings)
        
        settings.email = email
        settings.backup_time = backup_time
        settings.auto_backup_enabled = auto_backup_enabled

        
        db.session.commit()
        
        # Setup backup schedule
        if auto_backup_enabled:

            schedule_backup(settings.backup_time)
        
        return jsonify({
            'message': f'Google Drive authenticated successfully for {email}',

            'settings': settings.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Backup APIs
@dashboard_bp.route('/backup/download', methods=['GET'])
def download_backup():
    try:
        print("Starting backup process...")
        
        # Create backup ZIP file
        zip_filename = backup_database()
        zip_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], zip_filename)
        
        print(f"Backup created: {zip_filepath}")
        
        # Check if file exists
        if not os.path.exists(zip_filepath):
            print(f"Backup file not found at: {zip_filepath}")
            return jsonify({'error': 'Backup file not found'}), 404
        
        print(f"Sending file: {zip_filepath}")
        
        # Send file for download with proper headers
        return send_file(
            zip_filepath,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
    except Exception as e:
        print(f"Backup error: {str(e)}")
        return jsonify({'error': f'Backup failed: {str(e)}'}), 500

@dashboard_bp.route('/backup/upload', methods=['POST'])
def upload_backup():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.zip'):
            return jsonify({'error': 'Please upload a valid ZIP file'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], f"temp_{filename}")
        file.save(temp_filepath)
        
        try:
            # Restore database from ZIP file
            restore_database(temp_filepath)
            
            # Clean up temporary file
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            
            return jsonify({'message': 'Database restored successfully'}), 200
        except Exception as restore_error:
            # Clean up temporary file if restore fails
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            return jsonify({'error': f'Restore failed: {str(restore_error)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

# Dashboard API
@dashboard_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        # Get recent transactions
        recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(5).all()
        
        # Get pending customers
        pending_customers = Customer.get_pending_customers()
        
        # Get current stock
        current_stock = Stock.get_all()
        
        # Get recent bills
        recent_bills = Bill.query.order_by(Bill.created_at.desc()).limit(5).all()
        
        # Calculate totals
        total_customers = Customer.query.count()
        total_bills = Bill.query.count()
        total_transactions = Transaction.query.count()
        total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
        
        dashboard_data = {
            'recent_transactions': [t.to_dict() for t in recent_transactions],
            'pending_customers': pending_customers[:5],  # Top 5 pending
            'current_stock': [s.to_dict() for s in current_stock],
            'recent_bills': [b.to_dict() for b in recent_bills],
            'totals': {
                'customers': total_customers,
                'bills': total_bills,
                'transactions': total_transactions,
                'expenses': total_expenses
            }
        }
        
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@dashboard_bp.route('/health', methods=['GET'])
def health_check():
    return 'OK', 200