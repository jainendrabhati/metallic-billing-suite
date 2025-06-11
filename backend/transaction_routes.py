
from flask import Blueprint, request, jsonify
from models import db, Transaction, Bill, Stock

transaction_bp = Blueprint('transaction', __name__)

@transaction_bp.route('/transactions', methods=['GET'])
def get_transactions():
    try:
        transactions = Transaction.get_all()
        return jsonify([transaction.to_dict() for transaction in transactions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        return jsonify(transaction.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions', methods=['POST'])
def create_transaction():
    try:
        data = request.get_json()
        transaction = Transaction.create(**data)
        return jsonify(transaction.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions/filtered', methods=['GET'])
def get_filtered_transactions():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        customer_name = request.args.get('customer_name')
        
        transactions = Transaction.get_filtered(start_date, end_date, customer_name)
        return jsonify([transaction.to_dict() for transaction in transactions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions/export/csv', methods=['GET'])
def export_transactions_csv():
    try:
        return jsonify({'message': 'CSV export functionality'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions/export/pdf', methods=['GET'])
def export_transactions_pdf():
    try:
        return jsonify({'message': 'PDF export functionality'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    try:
        data = request.get_json()
        transaction = Transaction.update(transaction_id, data)
        if transaction:
            return jsonify(transaction.to_dict()), 200
        else:
            return jsonify({'error': 'Transaction not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        # If transaction has associated bill, delete the bill instead
        if transaction.bill_id:
            bill = Bill.get_by_id(transaction.bill_id)
            if bill:
                # Update stock based on bill type (reverse the original operation)
                if bill.payment_type == 'credit':
                    Stock.deduct_stock(bill.item, bill.total_fine, f"Stock deducted due to bill deletion #{bill.bill_number}")
                else:
                    Stock.add_stock(bill.item, bill.total_fine, f"Stock added due to bill deletion #{bill.bill_number}")
                
                # Delete the bill (which will cascade delete the transaction)
                db.session.delete(bill)
        else:
            # Delete standalone transaction
            db.session.delete(transaction)
        
        db.session.commit()
        return jsonify({'message': 'Transaction deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
