
from flask import Blueprint, request, jsonify
from models import db, Transaction, Bill, Customer, StockItem, Stock

api_bp = Blueprint('api', __name__)

@api_bp.route('/transactions/<int:transaction_id>', methods=['PUT'])
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

@api_bp.route('/transactions/<int:transaction_id>', methods=['DELETE'])
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

@api_bp.route('/bills/<int:bill_id>', methods=['PUT'])
def update_bill(bill_id):
    try:
        data = request.get_json()
        bill = Bill.get_by_id(bill_id)
        if not bill:
            return jsonify({'error': 'Bill not found'}), 404
        
        # Store old values for stock adjustment
        old_payment_type = bill.payment_type
        old_total_fine = bill.total_fine
        old_item = bill.item
        
        # Update bill fields
        for key, value in data.items():
            if hasattr(bill, key):
                setattr(bill, key, value)
        
        # Recalculate totals if weight/tunch/wastage/wages changed
        if 'weight' in data or 'tunch' in data or 'wastage' in data or 'wages' in data or 'silver_amount' in data:
            bill.total_fine = bill.weight * ((bill.tunch - bill.wastage) / 100)
            bill.total_amount = (bill.weight * (bill.wages / 1000)) + (bill.silver_amount if bill.payment_type == 'credit' else 0)
        
        # Update associated transaction
        transaction = Transaction.query.filter_by(bill_id=bill.id).first()
        if transaction:
            transaction.amount = bill.total_amount
            transaction.transaction_type = bill.payment_type
            if 'description' in data:
                transaction.description = data['description']
        
        # Adjust stock if item or fine changed
        if old_payment_type == 'credit':
            # Remove old stock
            Stock.deduct_stock(old_item, old_total_fine, f"Stock adjustment for bill update #{bill.bill_number}")
            # Add new stock
            Stock.add_stock(bill.item, bill.total_fine, f"Stock updated for bill #{bill.bill_number}")
        else:
            # Add back old stock
            Stock.add_stock(old_item, old_total_fine, f"Stock adjustment for bill update #{bill.bill_number}")
            # Remove new stock
            Stock.deduct_stock(bill.item, bill.total_fine, f"Stock updated for bill #{bill.bill_number}")
        
        db.session.commit()
        return jsonify(bill.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/bills/<int:bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
    try:
        bill = Bill.get_by_id(bill_id)
        if not bill:
            return jsonify({'error': 'Bill not found'}), 404
        
        # Adjust stock (reverse the original operation)
        if bill.payment_type == 'credit':
            Stock.deduct_stock(bill.item, bill.total_fine, f"Stock deducted due to bill deletion #{bill.bill_number}")
        else:
            Stock.add_stock(bill.item, bill.total_fine, f"Stock added due to bill deletion #{bill.bill_number}")
        
        # Update customer totals
        customer = Customer.get_by_id(bill.customer_id)
        if customer:
            customer.update_totals()
        
        # Delete bill (will cascade delete associated transactions)
        db.session.delete(bill)
        db.session.commit()
        
        return jsonify({'message': 'Bill deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
