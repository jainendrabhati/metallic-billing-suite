from flask import Blueprint, request, jsonify
from models import db, Transaction, Bill, Customer, StockItem, Stock, Employee, EmployeeSalary, EmployeePayment
from datetime import datetime

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

@api_bp.route('/employees', methods=['POST'])
def create_employee():
    try:
        data = request.get_json()
        employee = Employee.create(data['name'], data['position'])
        return jsonify(employee.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employees', methods=['GET'])
def get_employees():
    try:
        employees = Employee.get_all()
        return jsonify([employee.to_dict() for employee in employees]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    try:
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        return jsonify(employee.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-salaries', methods=['POST'])
def create_employee_salary():
    try:
        data = request.get_json()
        salary = EmployeeSalary.create(
            data['employee_id'],
            data['month'],
            data['year'],
            data['monthly_salary'],
            data['present_days'],
            data['total_days']
        )
        return jsonify(salary.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-salaries', methods=['GET'])
def get_employee_salaries():
    try:
        salaries = EmployeeSalary.get_all()
        return jsonify([salary.to_dict() for salary in salaries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-salaries/employee/<int:employee_id>', methods=['GET'])
def get_employee_salaries_by_employee(employee_id):
    try:
        salaries = EmployeeSalary.get_by_employee_id(employee_id)
        return jsonify([salary.to_dict() for salary in salaries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-salaries/<int:salary_id>', methods=['PUT'])
def update_employee_salary(salary_id):
    try:
        data = request.get_json()
        salary = EmployeeSalary.get_by_id(salary_id)
        if not salary:
            return jsonify({'error': 'Salary record not found'}), 404
        
        for key, value in data.items():
            if hasattr(salary, key):
                setattr(salary, key, value)
        
        # Recalculate salary if relevant fields changed
        if 'monthly_salary' in data or 'present_days' in data or 'total_days' in data:
            salary.calculated_salary = (salary.monthly_salary * salary.present_days) / salary.total_days
        
        salary.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(salary.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-salaries/<int:salary_id>', methods=['DELETE'])
def delete_employee_salary(salary_id):
    try:
        salary = EmployeeSalary.get_by_id(salary_id)
        if not salary:
            return jsonify({'error': 'Salary record not found'}), 404
        
        db.session.delete(salary)
        db.session.commit()
        return jsonify({'message': 'Salary record deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-payments', methods=['POST'])
def create_employee_payment():
    try:
        data = request.get_json()
        payment = EmployeePayment.create(**data)
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-payments', methods=['GET'])
def get_employee_payments():
    try:
        payments = EmployeePayment.get_all()
        return jsonify([payment.to_dict() for payment in payments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employee-payments/employee/<int:employee_id>', methods=['GET'])
def get_employee_payments_by_employee(employee_id):
    try:
        payments = EmployeePayment.get_by_employee_id(employee_id)
        return jsonify([payment.to_dict() for payment in payments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock', methods=['GET'])
def get_stock():
    try:
        stock = Stock.get_all()
        return jsonify([s.to_dict() for s in stock]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock/add', methods=['POST'])
def add_stock():
    try:
        data = request.get_json()
        stock = Stock.add_stock(data['item_name'], data['amount'], data.get('description', "Stock added"))
        return jsonify(stock.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock/deduct', methods=['POST'])
def deduct_stock():
    try:
        data = request.get_json()
        stock = Stock.deduct_stock(data['item_name'], data['amount'], data.get('description', "Stock deducted"))
        return jsonify(stock.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock/current', methods=['GET'])
def get_current_stock():
    try:
        current_stock = Stock.get_current_stock()
        return jsonify({'current_stock': current_stock}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses', methods=['POST'])
def create_expense():
    try:
        data = request.get_json()
        expense = Expense.create(**data)
        return jsonify(expense.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses', methods=['GET'])
def get_expenses():
    try:
        expenses = Expense.get_all()
        return jsonify([expense.to_dict() for expense in expenses]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    try:
        data = request.get_json()
        expense = Expense.update(expense_id, data)
        if expense:
            return jsonify(expense.to_dict()), 200
        else:
            return jsonify({'error': 'Expense not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/settings', methods=['GET'])
def get_settings():
    try:
        settings = FirmSettings.get_settings()
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/settings', methods=['PUT'])
def update_settings():
    try:
        data = request.get_json()
        settings = FirmSettings.update_settings(data)
        return jsonify(settings.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
