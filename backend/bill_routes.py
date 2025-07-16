
from flask import Blueprint, request, jsonify
from models import db, Bill, Transaction, Stock, Customer
from datetime import datetime

bill_bp = Blueprint('bill', __name__)

@bill_bp.route('/bills', methods=['GET'])
def get_bills():
    try:
        bills = Bill.get_all()
        return jsonify([bill.to_dict() for bill in bills]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bill_bp.route('/bills/<int:bill_id>', methods=['GET'])
def get_bill(bill_id):
    try:
        bill = Bill.get_by_id(bill_id)
        if not bill:
            return jsonify({'error': 'Bill not found'}), 404
        return jsonify(bill.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bill_bp.route('/bills', methods=['POST'])
def create_bill():
    try:
        data = request.get_json()
        
        # Parse date if it's a string
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        # Calculate totals
        print(data)
        weight = float(data['weight'])
        tunch = float(data['tunch'])
        wastage = float(data['wastage'])
        wages = float(data['wages'])
        silver_amount = float(data.get('silver_amount', 0))
        
        total_fine = weight * ((tunch + wastage) / 100)
        total_amount = (weight * (wages / 1000)) + (silver_amount if data['payment_type'] == 'credit' else 0)
        debit_fine = weight * (tunch)/100
        
        data['total_fine'] = total_fine
        data['total_amount'] = total_amount
        
        bill = Bill.create(**data)
        
        # Create associated transaction
        transaction = Transaction.create(
            bill_id=bill.id,
            customer_id=bill.customer_id,
            amount=bill.total_amount,
            transaction_type=bill.payment_type,
            description=f"Bill #{bill.bill_number} - {bill.item_name}"
        )
        
        # Update stock
        if bill.payment_type == 'credit':
            Stock.add_stock(bill.item, bill.total_fine, f"Stock added from credit bill #{bill.bill_number}")
        else:
            Stock.deduct_stock(bill.item, debit_fine, f"Stock deducted from debit bill #{bill.bill_number}")
        
        return jsonify(bill.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bill_bp.route('/bills/<int:bill_id>', methods=['PUT'])
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
                if key == 'date' and isinstance(value, str):
                    setattr(bill, key, datetime.strptime(value, '%Y-%m-%d').date())
                else:
                    setattr(bill, key, value)
        
        # Recalculate totals if weight/tunch/wastage/wages changed
        if any(key in data for key in ['weight', 'tunch', 'wastage', 'wages', 'silver_amount']):
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
            Stock.deduct_stock(old_item, old_total_fine, f"Stock adjustment for bill update #{bill.bill_number}")
            Stock.add_stock(bill.item, bill.total_fine, f"Stock updated for bill #{bill.bill_number}")
        else:
            Stock.add_stock(old_item, old_total_fine, f"Stock adjustment for bill update #{bill.bill_number}")
            Stock.deduct_stock(bill.item, bill.total_fine, f"Stock updated for bill #{bill.bill_number}")
        
        bill.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(bill.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bill_bp.route('/bills/<int:bill_id>', methods=['DELETE'])
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
