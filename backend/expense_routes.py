
from flask import Blueprint, request, jsonify
from models import db, Expense, Bill
from datetime import datetime

expense_bp = Blueprint('expense', __name__)

@expense_bp.route('/expenses', methods=['POST'])
def create_expense():
    try:
        data = request.get_json()
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
        expense = Expense.create(**data)
        return jsonify(expense.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@expense_bp.route('/expenses', methods=['GET'])
def get_expenses():
    try:
        expenses = Expense.get_all()
        return jsonify([expense.to_dict() for expense in expenses]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@expense_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    try:
        data = request.get_json()
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
        expense = Expense.update(expense_id, data)
        if expense:
            return jsonify(expense.to_dict()), 200
        else:
            return jsonify({'error': 'Expense not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@expense_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    try:
        expense = Expense.get_by_id(expense_id)
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@expense_bp.route('/expenses/dashboard', methods=['GET'])
def get_expenses_dashboard():
    try:
        # Calculate dashboard data
        total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
        
        # Calculate net fine from bills
        credit_bills = Bill.query.filter_by(payment_type='credit').all()
        debit_bills = Bill.query.filter_by(payment_type='debit').all()
        
        total_credit_fine = sum(bill.total_fine for bill in credit_bills)
        total_debit_fine = sum(bill.total_fine for bill in debit_bills)
        net_fine = total_credit_fine - total_debit_fine
        
        # Calculate total bill amounts
        total_credit_amount = sum(bill.total_amount for bill in credit_bills)
        total_debit_amount = sum(bill.total_amount for bill in debit_bills)
        total_bill_amount = total_credit_amount - total_debit_amount
        
        # Calculate total silver amount
        total_silver_amount = sum(bill.silver_amount for bill in credit_bills)
        
        # Calculate total wages weight
        total_wages_weight = sum(bill.weight * bill.wages for bill in Bill.query.all())
        
        dashboard_data = {
            'total_expenses': total_expenses,
            'net_fine': net_fine,
            'total_bill_amount': total_bill_amount,
            'total_silver_amount': total_silver_amount,
            'total_wages_weight': total_wages_weight,
            'balance_sheet': {
                'silver_balance': net_fine,
                'rupee_balance': total_bill_amount - total_expenses
            }
        }
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
