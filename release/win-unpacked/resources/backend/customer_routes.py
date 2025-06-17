from flask import Blueprint, request, jsonify
from models import db, Customer, Bill
from datetime import datetime

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/customers', methods=['GET'])
def get_customers():
    try:
        customers = Customer.get_all()
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        return jsonify(customer.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers', methods=['POST'])
def create_customer():
    try:
        data = request.get_json()
        customer = Customer.create(data['name'], data['mobile'], data['address'])
        return jsonify(customer.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    try:
        data = request.get_json()
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        for key, value in data.items():
            if hasattr(customer, key):
                setattr(customer, key, value)
        
        customer.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(customer.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        db.session.delete(customer)
        db.session.commit()
        return jsonify({'message': 'Customer deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/search', methods=['GET'])
def search_customers():
    try:
        name = request.args.get('name', '')
        customers = Customer.search_by_name(name)
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/pending', methods=['GET'])
def get_pending_customers():
    try:
        customers = Customer.get_pending_customers()
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/pending-list', methods=['GET'])
def get_pending_list():
    try:
        customers = Customer.get_all()
        pending_list = []
        
        for customer in customers:
            credit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='credit').all()
            debit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='debit').all()
            
            total_credit_fine = sum(bill.total_fine for bill in credit_bills)
            total_credit_amount = sum(bill.total_amount for bill in credit_bills)
            
            total_debit_fine = sum(bill.total_fine for bill in debit_bills)
            total_debit_amount = sum(bill.total_amount for bill in debit_bills)
            
            remaining_fine = total_credit_fine - total_debit_fine
            remaining_amount = total_credit_amount - total_debit_amount
            
            if remaining_fine != 0 or remaining_amount != 0:
                pending_list.append({
                    'customer_id': customer.id,
                    'customer_name': customer.name,
                    'customer_mobile': customer.mobile,
                    'customer_address': customer.address,
                    'remaining_fine': remaining_fine,
                    'remaining_amount': remaining_amount,
                    'total_credit_fine': total_credit_fine,
                    'total_credit_amount': total_credit_amount,
                    'total_debit_fine': total_debit_fine,
                    'total_debit_amount': total_debit_amount
                })
        
        return jsonify(pending_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>/bills', methods=['GET'])
def get_customer_bills(customer_id):
    try:
        bills = Bill.get_by_customer(customer_id)
        return jsonify([bill.to_dict() for bill in bills]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500