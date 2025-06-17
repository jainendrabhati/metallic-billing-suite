from flask import Blueprint, request, jsonify, send_file, current_app
from models import db, Transaction, Customer, Stock, Bill, Employee, Expense, FirmSettings
from utils import backup_database, restore_database
import os
from werkzeug.utils import secure_filename

dashboard_bp = Blueprint('dashboard', __name__)

# Settings APIs
@dashboard_bp.route('/settings', methods=['GET'])
def get_settings():
    try:
        settings = FirmSettings.get_settings()
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/settings', methods=['PUT'])
def update_settings():
    try:
        data = request.get_json()
        settings = FirmSettings.update_settings(data)
        return jsonify(settings.to_dict()), 200
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
        current_stock = Stock.get_current_stock()
        
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
            'current_stock': current_stock,
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