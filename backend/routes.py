
from flask import Blueprint, request, jsonify
from models import db, Transaction, Bill, Customer, StockItem, Stock, Employee, EmployeeSalary, EmployeePayment, Expense, FirmSettings
from datetime import datetime, date

api_bp = Blueprint('api', __name__)

# Customer APIs
@api_bp.route('/customers', methods=['GET'])
def get_customers():
    try:
        customers = Customer.get_all()
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        return jsonify(customer.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers', methods=['POST'])
def create_customer():
    try:
        data = request.get_json()
        customer = Customer.create(data['name'], data['mobile'], data['address'])
        return jsonify(customer.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/<int:customer_id>', methods=['PUT'])
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

@api_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
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

@api_bp.route('/customers/search', methods=['GET'])
def search_customers():
    try:
        name = request.args.get('name', '')
        customers = Customer.search_by_name(name)
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/pending', methods=['GET'])
def get_pending_customers():
    try:
        customers = Customer.get_pending_customers()
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/customers/<int:customer_id>/bills', methods=['GET'])
def get_customer_bills(customer_id):
    try:
        bills = Bill.get_by_customer(customer_id)
        return jsonify([bill.to_dict() for bill in bills]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Bill APIs
@api_bp.route('/bills', methods=['GET'])
def get_bills():
    try:
        bills = Bill.get_all()
        return jsonify([bill.to_dict() for bill in bills]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/bills/<int:bill_id>', methods=['GET'])
def get_bill(bill_id):
    try:
        bill = Bill.get_by_id(bill_id)
        if not bill:
            return jsonify({'error': 'Bill not found'}), 404
        return jsonify(bill.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/bills', methods=['POST'])
def create_bill():
    try:
        data = request.get_json()
        
        # Parse date if it's a string
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        # Calculate totals
        weight = float(data['weight'])
        tunch = float(data['tunch'])
        wastage = float(data['wastage'])
        wages = float(data['wages'])
        silver_amount = float(data.get('silver_amount', 0))
        
        total_fine = weight * ((tunch - wastage) / 100)
        total_amount = (weight * (wages / 1000)) + (silver_amount if data['payment_type'] == 'credit' else 0)
        
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
            Stock.deduct_stock(bill.item, bill.total_fine, f"Stock deducted from debit bill #{bill.bill_number}")
        
        return jsonify(bill.to_dict()), 201
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

# Transaction APIs
@api_bp.route('/transactions', methods=['GET'])
def get_transactions():
    try:
        transactions = Transaction.get_all()
        return jsonify([transaction.to_dict() for transaction in transactions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    try:
        transaction = Transaction.get_by_id(transaction_id)
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        return jsonify(transaction.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions', methods=['POST'])
def create_transaction():
    try:
        data = request.get_json()
        transaction = Transaction.create(**data)
        return jsonify(transaction.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/filtered', methods=['GET'])
def get_filtered_transactions():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        customer_name = request.args.get('customer_name')
        
        transactions = Transaction.get_filtered(start_date, end_date, customer_name)
        return jsonify([transaction.to_dict() for transaction in transactions]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/export/csv', methods=['GET'])
def export_transactions_csv():
    try:
        return jsonify({'message': 'CSV export functionality'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/export/pdf', methods=['GET'])
def export_transactions_pdf():
    try:
        return jsonify({'message': 'PDF export functionality'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

# Employee APIs
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

@api_bp.route('/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    try:
        data = request.get_json()
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        for key, value in data.items():
            if hasattr(employee, key):
                setattr(employee, key, value)
        
        employee.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(employee.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    try:
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        db.session.delete(employee)
        db.session.commit()
        return jsonify({'message': 'Employee deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Employee Salary APIs
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

# Employee Payment APIs
@api_bp.route('/employee-payments', methods=['POST'])
def create_employee_payment():
    try:
        data = request.get_json()
        if 'payment_date' in data and isinstance(data['payment_date'], str):
            data['payment_date'] = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
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

@api_bp.route('/employee-payments/<int:payment_id>', methods=['DELETE'])
def delete_employee_payment(payment_id):
    try:
        payment = EmployeePayment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Stock Management APIs
@api_bp.route('/stock', methods=['GET'])
def get_stock():
    try:
        stock = Stock.get_all()
        return jsonify([s.to_dict() for s in stock]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock/current', methods=['GET'])
def get_current_stock():
    try:
        current_stock = Stock.get_current_stock()
        return jsonify({'current_stock': current_stock}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock/history', methods=['GET'])
def get_stock_history():
    try:
        stock_history = Stock.get_all()
        return jsonify([s.to_dict() for s in stock_history]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock/transaction', methods=['POST'])
def add_stock_transaction():
    try:
        data = request.get_json()
        amount = data.get('amount')
        transaction_type = data.get('transaction_type')
        item_name = data.get('item_name', 'General Stock')
        description = data.get('description', '')
        
        if transaction_type == 'add':
            stock = Stock.add_stock(item_name, amount, description)
        elif transaction_type == 'deduct':
            stock = Stock.deduct_stock(item_name, amount, description)
        else:
            return jsonify({'error': 'Invalid transaction type'}), 400
        
        return jsonify(stock.to_dict()), 201
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

# Stock Items APIs
@api_bp.route('/stock-items', methods=['GET'])
def get_stock_items():
    try:
        items = StockItem.get_all()
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock-items', methods=['POST'])
def create_stock_item():
    try:
        data = request.get_json()
        item = StockItem.create(
            data['item_name'],
            data.get('current_weight', 0.0),
            data.get('description', '')
        )
        return jsonify(item.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock-items/<int:item_id>', methods=['PUT'])
def update_stock_item(item_id):
    try:
        data = request.get_json()
        item = StockItem.get_by_id(item_id)
        if not item:
            return jsonify({'error': 'Stock item not found'}), 404
        
        for key, value in data.items():
            if hasattr(item, key):
                setattr(item, key, value)
        
        item.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(item.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stock-items/<int:item_id>', methods=['DELETE'])
def delete_stock_item(item_id):
    try:
        item = StockItem.get_by_id(item_id)
        if not item:
            return jsonify({'error': 'Stock item not found'}), 404
        
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Stock item deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Expense APIs
@api_bp.route('/expenses', methods=['POST'])
def create_expense():
    try:
        data = request.get_json()
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
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
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], '%Y-%m-%d').date()
        expense = Expense.update(expense_id, data)
        if expense:
            return jsonify(expense.to_dict()), 200
        else:
            return jsonify({'error': 'Expense not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
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

@api_bp.route('/expenses/dashboard', methods=['GET'])
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

# Settings APIs
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

# Backup APIs
@api_bp.route('/backup/download', methods=['GET'])
def download_backup():
    try:
        return jsonify({'message': 'Backup downloaded'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/backup/upload', methods=['POST'])
def upload_backup():
    try:
        return jsonify({'message': 'Backup uploaded'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Dashboard API
@api_bp.route('/dashboard', methods=['GET'])
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
