
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from models import db, Customer, Bill, Transaction, Expense, BillItem
from utils import export_to_csv, export_to_pdf, backup_database, restore_database

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///metalic.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

# Enable CORS for frontend communication
CORS(app)

# Initialize database
db.init_app(app)

# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.before_first_request
def create_tables():
    db.create_all()

# Customer APIs
@app.route('/api/customers', methods=['GET'])
def get_customers():
    customers = Customer.get_all()
    return jsonify([customer.to_dict() for customer in customers])

@app.route('/api/customers', methods=['POST'])
def create_customer():
    data = request.json
    customer = Customer.create(
        name=data['name'],
        mobile=data['mobile'],
        address=data['address']
    )
    return jsonify(customer.to_dict()), 201

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    customer = Customer.get_by_id(customer_id)
    if customer:
        return jsonify(customer.to_dict())
    return jsonify({'error': 'Customer not found'}), 404

@app.route('/api/customers/search', methods=['GET'])
def search_customers():
    query = request.args.get('q', '')
    customers = Customer.search_by_name(query)
    return jsonify([customer.to_dict() for customer in customers])

# Bill APIs
@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = Bill.get_all()
    return jsonify([bill.to_dict() for bill in bills])

@app.route('/api/bills', methods=['POST'])
def create_bill():
    data = request.json
    
    # Calculate totals
    weight = float(data['weight'])
    tunch = float(data['tunch'])
    wastage = float(data['wastage'])
    wages = float(data['wages'])
    
    total_fine = weight * ((tunch - wastage) / 100)
    total_amount = weight * (wages / 1000)
    
    bill = Bill.create(
        customer_id=data['customer_id'],
        item=data['item'],
        weight=weight,
        tunch=tunch,
        wages=wages,
        wastage=wastage,
        total_fine=total_fine,
        total_amount=total_amount,
        payment_type=data['payment_type'],
        payment_status=data['payment_status'],
        partial_amount=data.get('partial_amount', 0),
        description=data.get('description', ''),
        gst_number=data.get('gst_number', ''),
        date=datetime.strptime(data['date'], '%Y-%m-%d').date()
    )
    
    # Create transaction
    Transaction.create(
        bill_id=bill.id,
        customer_id=data['customer_id'],
        amount=total_amount,
        transaction_type=data['payment_type'],
        status=data['payment_status'],
        description=f"Bill #{bill.id} - {data['item']}"
    )
    
    return jsonify(bill.to_dict()), 201

@app.route('/api/bills/<int:bill_id>', methods=['GET'])
def get_bill(bill_id):
    bill = Bill.get_by_id(bill_id)
    if bill:
        return jsonify(bill.to_dict())
    return jsonify({'error': 'Bill not found'}), 404

# Transaction APIs
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    return jsonify([transaction.to_dict() for transaction in transactions])

@app.route('/api/transactions/export/csv', methods=['GET'])
def export_transactions_csv():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    filename = export_to_csv(transactions, 'transactions')
    
    return jsonify({'filename': filename, 'message': 'Export successful'})

@app.route('/api/transactions/export/pdf', methods=['GET'])
def export_transactions_pdf():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    customer_name = request.args.get('customer_name')
    
    transactions = Transaction.get_filtered(start_date, end_date, customer_name)
    filename = export_to_pdf(transactions, 'transactions')
    
    return jsonify({'filename': filename, 'message': 'Export successful'})

# Expense APIs
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    expenses = Expense.get_all()
    return jsonify([expense.to_dict() for expense in expenses])

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    data = request.json
    expense = Expense.create(
        description=data['description'],
        amount=float(data['amount']),
        category=data['category'],
        status=data['status'],
        date=datetime.strptime(data['date'], '%Y-%m-%d').date()
    )
    return jsonify(expense.to_dict()), 201

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.json
    expense = Expense.update(expense_id, data)
    if expense:
        return jsonify(expense.to_dict())
    return jsonify({'error': 'Expense not found'}), 404

# Settings APIs
@app.route('/api/settings/backup', methods=['GET'])
def download_backup():
    filename = backup_database()
    return jsonify({'filename': filename, 'message': 'Backup created successfully'})

@app.route('/api/settings/restore', methods=['POST'])
def upload_backup():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        restore_database(file)
        return jsonify({'message': 'Database restored successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/firm', methods=['GET'])
def get_firm_settings():
    # Return default firm settings or from database
    return jsonify({
        'firm_name': 'Metalic Jewelers',
        'gst_number': '24ABCDE1234F1Z5',
        'address': '123 Business Street, City, State - 400001',
        'logo_path': None
    })

@app.route('/api/settings/firm', methods=['POST'])
def update_firm_settings():
    data = request.json
    # Save firm settings to database or config file
    return jsonify({'message': 'Settings updated successfully'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
