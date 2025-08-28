
from flask import Blueprint, request, jsonify
from models import db, Expense, Bill, Stock
from datetime import datetime
from sqlalchemy import and_

expense_bp = Blueprint('expense', __name__)

@expense_bp.route('/expenses', methods=['GET'])
def get_expenses():
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        # Build query for expenses
        query = Expense.query
        
        # Apply date filters
        if from_date:
            query = query.filter(Expense.date >= from_date)
        if to_date:
            query = query.filter(Expense.date <= to_date)
            
        expenses = query.order_by(Expense.created_at.desc()).all()
        
        # Get dashboard data with same date filters
        dashboard_data = get_dashboard_data(from_date, to_date)
        
        return jsonify({
            'expenses': [expense.to_dict() for expense in expenses],
            'dashboard': dashboard_data
            
            
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_dashboard_data(from_date=None, to_date=None):
    """Get dashboard data with optional date filtering"""
    try:
        # Build base query for bills
        bill_query = Bill.query
        expense_query = Expense.query
        
        # Apply date filters
        if from_date:
            bill_query = bill_query.filter(Bill.date >= from_date)
            expense_query = expense_query.filter(Expense.date >= from_date)
        if to_date:
            bill_query = bill_query.filter(Bill.date <= to_date)
            expense_query = expense_query.filter(Expense.date <= to_date)
            
        bills = bill_query.all()
        expenses = expense_query.all()
        
        # Calculate totals
        total_expenses = sum(expense.amount for expense in expenses)
        
        # Separate credit and debit bill calculations
        credit_bill_total = 0  # Total revenue from credit bills
        debit_bill_total = 0   # Total amount from debit bills
        total_silver_amount = 0
        net_fine = 0
        
        # Calculate net fine by item type with separate credit and debit tracking
        net_fine_by_item = {}
        credit_fine_by_item = {}
        debit_fine_by_item = {}
        
        for bill in bills:
            item_name = bill.item or 'Other'
            
            if item_name not in net_fine_by_item:
                net_fine_by_item[item_name] = 0
                credit_fine_by_item[item_name] = 0
                debit_fine_by_item[item_name] = 0
            
            if bill.payment_type == 'credit':
                credit_bill_total += bill.total_amount
                total_silver_amount += bill.silver_amount or 0
                net_fine += bill.total_fine
                net_fine_by_item[item_name] += bill.total_fine
                credit_fine_by_item[item_name] += bill.total_fine
            else:  # debit
                debit_bill_total += bill.total_amount
                total_silver_amount -= bill.silver_amount or 0
                net_fine -= bill.total_fine
                net_fine_by_item[item_name] -= bill.total_fine
                debit_fine_by_item[item_name] += bill.total_fine
        
        # Calculate rupee balance: credit bills - debit bills - expenses
        rupee_balance = credit_bill_total - debit_bill_total - total_expenses
        
        return {
            'total_expenses': total_expenses,
            'total_bill_amount': debit_bill_total,  # Sum of debit bills
            'total_revenue': credit_bill_total,     # Sum of credit bills
            'total_silver_amount': total_silver_amount,
            'net_fine': net_fine,
            'net_fine_by_item': net_fine_by_item,
            'credit_fine_by_item': credit_fine_by_item,
            'debit_fine_by_item': debit_fine_by_item,
            'balance_sheet': {
                'rupee_balance': rupee_balance
            }
        }
    except Exception as e:
        return {}

@expense_bp.route('/expenses', methods=['POST'])
def create_expense():
    try:
        data = request.get_json()

        # ✅ Safely convert date string (if provided) to a Python date
        expense_date = None
        if "date" in data and data["date"]:
            if isinstance(data["date"], str):
                expense_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
            else:
                expense_date = data["date"]

        expense = Expense.create(
            description=data.get('description'),
            amount=data.get('amount'),
            category=data.get('category'),
            status=data.get('status', 'pending'),
            date=expense_date
        )

        return jsonify(expense.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@expense_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    try:
        data = request.get_json()
        expense = Expense.get_by_id(expense_id)
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        for key, value in data.items():
            if hasattr(expense, key):
                setattr(expense, key, value)
        
        expense.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(expense.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@expense_bp.route('/expenses/<int:expense_id>/delete', methods=['POST'])
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
def get_dashboard():
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        dashboard_data = get_dashboard_data(from_date, to_date)
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500