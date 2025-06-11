
from flask import Blueprint, request, jsonify
from models import db, Transaction, Customer, Stock, Bill, Employee, Expense, FirmSettings

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
        return jsonify({'message': 'Backup downloaded'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/backup/upload', methods=['POST'])
def upload_backup():
    try:
        return jsonify({'message': 'Backup uploaded'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
