
import uuid
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
    # Start a database transaction
    db.session.begin()
    # try:
    data = request.get_json()
    
    # Parse date if it's a string
    if 'date' in data and isinstance(data['date'], str):
        data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
    
    # Check if customer exists, if not create one
    customer_id = data.get('customer_id')
    if not customer_id:
        # Create new customer if customer_id is not provided
        customer_name = data.get('customer_name', '').strip()
        if not customer_name:
            raise ValueError("Customer name is required")
        
        # Check for duplicate customer name
        existing_customer = Customer.query.filter_by(name=customer_name).first()
        if existing_customer:
            customer_id = existing_customer.id
            data['customer_id'] = customer_id
        else:
            # Create new customer
            customer_data = {
                'name': customer_name,
                'mobile': data.get('customer_mobile', ''),
                'address': data.get('customer_address', '')
            }
            new_customer = Customer(**customer_data)
            db.session.add(new_customer)
            db.session.flush()  # Get the ID without committing
            customer_id = new_customer.id
            data['customer_id'] = customer_id
    
    # Calculate totals
    weight = float(data['weight'])
    tunch = float(data['tunch'])
    wastage = float(data['wastage'])
    wages = float(data.get('wages', 0))
    silver_amount = float(data.get('silver_amount', 0))
    description = data.get('description', '')
    return_type = data.get('return_product', False)
    
    raw_total_fine = weight * ((tunch + wastage) / 100)
    
    # Apply rounding logic
    # if raw_total_fine == 0:
    #     total_fine = 0
    # else:
    #     integer_part = int(raw_total_fine)
    #     decimal_part = raw_total_fine - integer_part
        
    #     if data['payment_type'] == 'debit':
    #         # For debit: if > 0.50, round up, otherwise round down
    #         total_fine = integer_part + 1 if decimal_part > 0.50 else integer_part
    #     else:
    #         # For credit: if > 0.70, round up, otherwise round down  
    #         total_fine = integer_part + 1 if decimal_part > 0.70 else integer_part
    total_fine = raw_total_fine
    if data['payment_type'] == 'debit':
        total_amount = (weight * (wages / 1000)) + silver_amount
    else:
        total_amount = silver_amount
        
    debit_fine = weight * (tunch)/100
    unique_suffix = str(uuid.uuid4())[:8]  # or use [:5] for shorter
    data["bill_number"] = f"{data['date'].strftime('%Y%m%d')}-{unique_suffix}-{data['customer_id']}"
    data['total_fine'] = total_fine
    data['total_amount'] = total_amount
    del data['return_product']

    allowed_fields = {
    'bill_number', 'customer_id', 'item_name', 'item', 'weight', 'tunch',
    'wages', 'wastage', 'silver_amount', 'total_fine', 'total_amount',
    'payment_type', 'slip_no', 'description', 'date'
    }

    filtered_data = {key: data[key] for key in data if key in allowed_fields}
    bill = Bill(**filtered_data)
        
    # Create bill
    # bill = Bill(**data)
    db.session.add(bill)
    db.session.flush()  # Get the ID without committing
    
    # Create associated transaction
    transaction = Transaction(
        bill_id=bill.id,
        customer_id=bill.customer_id,
        amount=bill.total_amount,
        transaction_type=bill.payment_type,
        description=description
    )
    db.session.add(transaction)
    
    # Update stock
    if bill.payment_type == 'credit':
        return_product = return_type
        
        if return_product:
            # For return product, add weight * tunch to stock
            stock_amount = weight * (tunch / 100)
            Stock.add_stock(bill.item, stock_amount, f"Stock added from return product credit bill #{bill.bill_number}")
        else:
            Stock.add_stock(bill.item, bill.total_fine, f"Stock added from credit bill #{bill.bill_number}")
    else:
        Stock.deduct_stock(bill.item, debit_fine, f"Stock deducted from debit bill #{bill.bill_number}")
    
    db.session.commit()
    return jsonify(bill.to_dict()), 201
    
    # except ValueError as ve:
    #     db.session.rollback()
    #     return jsonify({'error': str(ve)}), 400
    # except Exception as e:
    #     db.session.rollback()
    #     return jsonify({'error': f'Failed to create bill: {str(e)}'}), 500


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
            raw_total_fine = bill.weight * ((bill.tunch + bill.wastage) / 100)
            
            # Apply rounding logic
            # if raw_total_fine == 0:
            #     bill.total_fine = 0
            # else:
            #     integer_part = int(raw_total_fine)
            #     decimal_part = raw_total_fine - integer_part
                
            #     if bill.payment_type == 'debit':
            #         # For debit: if > 0.50, round up, otherwise round down
            #         bill.total_fine = integer_part + 1 if decimal_part > 0.50 else integer_part
            #     else:
            #         # For credit: if > 0.70, round up, otherwise round down
            #         bill.total_fine = integer_part + 1 if decimal_part > 0.70 else integer_part
            bill.total_fine = raw_total_fine
            if bill.payment_type == 'debit':
                bill.total_amount = (bill.weight * (bill.wages / 1000)) + bill.silver_amount
            else:
                bill.total_amount = bill.silver_amount
        
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

@bill_bp.route('/bills/<int:bill_id>/delete', methods=['POST'])
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
