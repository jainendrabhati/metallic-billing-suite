from flask import Blueprint, request, jsonify, send_file, current_app
from models import db, Transaction, Customer, Stock, Bill, Employee, Expense, Settings, GoogleDriveSettings, GoogleDriveAuth
from utils import backup_database, restore_database
from google_drive_service import google_drive_service, schedule_daily_backup, setup_backup_scheduler
from offline_support import setup_offline_support, get_offline_dashboard, offline_db
import os
from werkzeug.utils import secure_filename
from scheduler import scheduler
from flask import current_app
import datetime
from google_drive_service import schedule_daily_backup


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
        data = {}
        firm_logo_filename = None

        # Handle multipart/form-data
        if request.content_type and "multipart/form-data" in request.content_type:
            form = request.form
            files = request.files

            data = {
                "firm_name": form.get("firm_name"),
                "gst_number": form.get("gst_number"),
                "address": form.get("address"),
                "city": form.get("city"),
                "mobile": form.get("mobile"),
                "email": form.get("email"),
                "account_number": form.get("account_number"),
                "account_holder_name": form.get("account_holder_name"),
                "ifsc_code": form.get("ifsc_code"),
                "branch_address": form.get("branch_address"),
            }

            # Handle file upload
            firm_logo = files.get("firm_logo")
            if firm_logo and firm_logo.filename:
                # Create uploads directory if it doesn't exist
                uploads_dir = os.path.join(current_app.root_path, 'uploads')
                os.makedirs(uploads_dir, exist_ok=True)
                
                # Generate secure filename
                firm_logo_filename = secure_filename(firm_logo.filename)
                file_path = os.path.join(uploads_dir, firm_logo_filename)
                firm_logo.save(file_path)
                
                # Set the URL path for the frontend
                data['firm_logo_url'] = f"/uploads/{firm_logo_filename}"

        else:
            # Handle JSON payload
            data = request.get_json(force=True)
            firm_logo_filename = data.get("firm_logo_filename")

        # Remove None values to avoid overwriting DB with null
        data = {k: v for k, v in data.items() if v is not None}

        # Update settings
        settings = Settings.update_settings(**data, firm_logo_filename=firm_logo_filename)

        if not settings:
            return jsonify({"error": "No settings were updated"}), 400

        # Commit changes if your update method doesn't
        from app import db
        db.session.commit()

        return jsonify(settings.to_dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Google Drive Settings APIs
@dashboard_bp.route('/google-drive/settings', methods=['GET'])
def get_google_drive_settings():
    try:
        
        auth_record = GoogleDriveAuth.query.order_by(GoogleDriveAuth.id.desc()).first()
        if not auth_record:
            # Return default settings if no authenticated user
            return jsonify({
                'email': '',
                'backup_time': '20:00',
                'auto_backup_enabled': False,
                'authenticated': False
            }), 200
        return jsonify(auth_record.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/google-drive/settings', methods=['PUT'])
def update_google_drive_settings():
    try:
        data = request.get_json()
        settings = GoogleDriveSettings.query.order_by(GoogleDriveSettings.id.desc()).first()
        auth_record = GoogleDriveAuth.query.order_by(GoogleDriveAuth.id.desc()).first()
        
        if not settings:
            settings = GoogleDriveSettings()
            db.session.add(settings)
            
        if not auth_record:
            auth_record = GoogleDriveAuth()
            db.session.add(auth_record)

        if 'email' in data:
            settings.email = data['email']
            auth_record.email = data['email']
        if 'backup_time' in data:
            settings.backup_time = data['backup_time']
            auth_record.backup_time = data['backup_time']
        if 'auto_backup_enabled' in data:
            settings.auto_backup_enabled = data['auto_backup_enabled']
            auth_record.auto_backup_enabled = data['auto_backup_enabled']
        
        db.session.commit()
        
        # Update backup schedule if enabled
        if settings.auto_backup_enabled and settings.backup_time:
            schedule_daily_backup(scheduler, current_app, settings.backup_time)
        
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/google-drive/authenticate', methods=['POST'])
def authenticate_google_drive():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        backup_time = data.get('backup_time', '20:00')
        auto_backup_enabled = data.get('auto_backup_enabled', False)

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({'error': 'Invalid email format'}), 400

        # Clear any old token files that might conflict
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        old_files = ['gdrive_token.pickle', 'token.pickle', 'token.json']
        for old_file in old_files:
            old_path = os.path.join(upload_folder, old_file)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass

        # Initialize the service properly
        from google_drive_service import GoogleDriveService
        gdrive_service = GoogleDriveService()
        
        # Authenticate with Google Drive
        success = gdrive_service.authenticate(email)
        if not success:
            return jsonify({
                'error': 'Authentication failed. Please ensure you select the correct Google account and grant all required permissions.',
                'details': 'Make sure to complete the OAuth flow in your browser and allow access to Google Drive.'
            }), 400

        # Save or update settings in GoogleDriveAuth model
        from models import GoogleDriveAuth
        auth_record = GoogleDriveAuth.query.order_by(GoogleDriveAuth.id.desc()).first()
        if not auth_record:
            auth_record = GoogleDriveAuth(email=email)
            db.session.add(auth_record)
        # auth_record.email = email
        auth_record.backup_time = backup_time
        auth_record.auto_backup_enabled = auto_backup_enabled
        auth_record.authenticated = True
        db.session.commit()

        # Setup or disable backup schedule
        if auto_backup_enabled:
            schedule_daily_backup(scheduler, current_app, backup_time)
        else:
            # remove existing job if disabling auto-backup
            job = scheduler.get_job("google_drive_backup")
            if job:
                scheduler.remove_job("google_drive_backup")

        return jsonify({
            'message': f'Google Drive authenticated successfully for {email}',
            'settings': auth_record.to_dict(),
            'authenticated': True
        }), 200
        
    except Exception as e:
         # Log the full error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Google Drive authentication error: {error_details}")
        
        return jsonify({
            'error': f'Authentication failed: {str(e)}',
            'details': 'Please try again and ensure you complete the OAuth flow in your browser.'
        }), 500


# Backup APIs
@dashboard_bp.route('/backup/download', methods=['GET'])
def download_backup():
    try:
        
        
        # Create backup ZIP file
        zip_filename = backup_database()
        zip_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], zip_filename)
        
        
        
        # Check if file exists
        if not os.path.exists(zip_filepath):
            
            return jsonify({'error': 'Backup file not found'}), 404
        
        
        
        # Send file for download with proper headers
        return send_file(
            zip_filepath,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
    except Exception as e:
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
        from datetime import datetime
        from sqlalchemy import func, and_
        
        # Get today's date
        today = datetime.now().date()
        
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
        
        # Calculate today's statistics
        today_bills = Bill.query.filter(func.date(Bill.created_at) == today).all()
        
        # Total bills today
        total_bills_today = len(today_bills)
        
        # Debit and Credit bills today
        debit_bills_today = len([b for b in today_bills if b.payment_type == 'debit'])
        credit_bills_today = len([b for b in today_bills if b.payment_type == 'credit'])
        
        # Total amounts today
        total_debit_amount_today = sum([b.total_amount for b in today_bills if b.payment_type == 'debit'])
        total_credit_amount_today = sum([b.total_amount for b in today_bills if b.payment_type == 'credit'])
        
        # Stock-wise fine statistics (all time)
        all_bills = Bill.query.all()
        
        # Group by stock type and calculate totals
        stock_statistics = {}
        for bill in all_bills:
            item = bill.item or 'Other'
            if item not in stock_statistics:
                stock_statistics[item] = {
                    'total_debit_fine': 0,
                    'total_credit_fine': 0,
                    'total_debit_amount': 0,
                    'total_credit_amount': 0
                }
            
            if bill.payment_type == 'debit':
                stock_statistics[item]['total_debit_fine'] += bill.total_fine
                stock_statistics[item]['total_debit_amount'] += bill.total_amount
            else:
                stock_statistics[item]['total_credit_fine'] += bill.total_fine
                stock_statistics[item]['total_credit_amount'] += bill.total_amount
        
        # Today's stock-wise fine statistics
        today_stock_statistics = {}
        for bill in today_bills:
            item = bill.item or 'Other'
            if item not in today_stock_statistics:
                today_stock_statistics[item] = {
                    'total_debit_fine': 0,
                    'total_credit_fine': 0
                }
            
            if bill.payment_type == 'debit':
                today_stock_statistics[item]['total_debit_fine'] += bill.total_fine
            else:
                today_stock_statistics[item]['total_credit_fine'] += bill.total_fine
        
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
            },
            'today_statistics': {
                'total_bills': total_bills_today,
                'debit_bills': debit_bills_today,
                'credit_bills': credit_bills_today,
                'total_debit_amount': total_debit_amount_today,
                'total_credit_amount': total_credit_amount_today,
                'stock_wise_fine': today_stock_statistics
            },
            'all_time_statistics': {
                'stock_wise_statistics': stock_statistics
            }
        }
        
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@dashboard_bp.route('/health', methods=['GET'])
def health_check():
    return 'OK', 200

# Offline support endpoints
@dashboard_bp.route('/offline/setup', methods=['POST'])
def setup_offline_data():
    """Setup offline data backup for Electron app."""
    try:
        setup_offline_support()
        return jsonify({'message': 'Offline data backup created successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/offline/dashboard', methods=['GET'])
def get_offline_dashboard_data():
    """Get dashboard data for offline mode."""
    try:
        data = get_offline_dashboard()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/offline/check', methods=['GET'])
def check_offline_status():
    """Check if offline data is available."""
    try:
        backup_data = offline_db.load_backup_data()
        is_available = backup_data is not None
        timestamp = backup_data.get('timestamp') if backup_data else None
        
        return jsonify({
            'offline_data_available': is_available,
            'backup_timestamp': timestamp,
            'database_accessible': offline_db.is_database_accessible()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500