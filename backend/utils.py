
import csv
import pandas as pd
from flask import current_app
from datetime import datetime
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from models import db, Customer, Bill, Transaction, Expense

def export_to_csv(data, data_type):
    """Export data to CSV format"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{data_type}_export_{timestamp}.csv"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    if data_type == 'transactions':
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Transaction ID', 'Bill Number', 'Customer Name', 'Amount', 'Type', 'Status', 'Date', 'Description'])
            
            for transaction in data:
                writer.writerow([
                    transaction.id,
                    f"BILL-{transaction.bill_id:04d}" if transaction.bill_id else '',
                    transaction.customer.name if transaction.customer else '',
                    transaction.amount,
                    transaction.transaction_type,
                    transaction.status,
                    transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    transaction.description or ''
                ])
    
    elif data_type == 'expenses':
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['ID', 'Description', 'Amount', 'Category', 'Status', 'Date'])
            
            for expense in data:
                writer.writerow([
                    expense.id,
                    expense.description,
                    expense.amount,
                    expense.category,
                    expense.status,
                    expense.date.strftime('%Y-%m-%d')
                ])
    
    return filename

def export_to_pdf(data, data_type):
    """Export data to PDF format"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{data_type}_export_{timestamp}.pdf"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    # Title
    title = Paragraph(f"Metalic Jewelers - {data_type.title()} Report", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    if data_type == 'transactions':
        # Create table data
        table_data = [['Transaction ID', 'Bill Number', 'Customer', 'Amount', 'Type', 'Status', 'Date']]
        
        for transaction in data:
            table_data.append([
                str(transaction.id),
                f"BILL-{transaction.bill_id:04d}" if transaction.bill_id else '',
                transaction.customer.name if transaction.customer else '',
                f"₹{transaction.amount:,.2f}",
                transaction.transaction_type.title(),
                transaction.status.title(),
                transaction.created_at.strftime('%Y-%m-%d')
            ])
    
    elif data_type == 'expenses':
        table_data = [['ID', 'Description', 'Amount', 'Category', 'Status', 'Date']]
        
        for expense in data:
            table_data.append([
                str(expense.id),
                expense.description,
                f"₹{expense.amount:,.2f}",
                expense.category,
                expense.status.title(),
                expense.date.strftime('%Y-%m-%d')
            ])
    
    # Create table
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    
    return filename

def backup_database():
    """Create a backup of the entire database"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"metalic_backup_{timestamp}.xlsx"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # Export customers
        customers = Customer.query.all()
        customers_data = [customer.to_dict() for customer in customers]
        pd.DataFrame(customers_data).to_excel(writer, sheet_name='Customers', index=False)
        
        # Export bills
        bills = Bill.query.all()
        bills_data = [bill.to_dict() for bill in bills]
        pd.DataFrame(bills_data).to_excel(writer, sheet_name='Bills', index=False)
        
        # Export transactions
        transactions = Transaction.query.all()
        transactions_data = [transaction.to_dict() for transaction in transactions]
        pd.DataFrame(transactions_data).to_excel(writer, sheet_name='Transactions', index=False)
        
        # Export expenses
        expenses = Expense.query.all()
        expenses_data = [expense.to_dict() for expense in expenses]
        pd.DataFrame(expenses_data).to_excel(writer, sheet_name='Expenses', index=False)
    
    return filename

def restore_database(file):
    """Restore database from uploaded backup file"""
    try:
        # Read Excel file
        excel_data = pd.read_excel(file, sheet_name=None)
        
        # Clear existing data (be careful!)
        db.session.query(Transaction).delete()
        db.session.query(Bill).delete()
        db.session.query(Expense).delete()
        db.session.query(Customer).delete()
        db.session.commit()
        
        # Restore customers
        if 'Customers' in excel_data:
            for _, row in excel_data['Customers'].iterrows():
                customer = Customer(
                    name=row['name'],
                    mobile=row['mobile'],
                    address=row['address'],
                    total_bills=row.get('total_bills', 0),
                    total_amount=row.get('total_amount', 0.0),
                    status=row.get('status', 'active')
                )
                db.session.add(customer)
        
        # Restore bills
        if 'Bills' in excel_data:
            for _, row in excel_data['Bills'].iterrows():
                bill = Bill(
                    customer_id=row['customer_id'],
                    item=row['item'],
                    weight=row['weight'],
                    tunch=row['tunch'],
                    wages=row['wages'],
                    wastage=row['wastage'],
                    total_fine=row['total_fine'],
                    total_amount=row['total_amount'],
                    payment_type=row['payment_type'],
                    payment_status=row['payment_status'],
                    partial_amount=row.get('partial_amount', 0.0),
                    description=row.get('description', ''),
                    gst_number=row.get('gst_number', ''),
                    date=pd.to_datetime(row['date']).date()
                )
                db.session.add(bill)
        
        # Restore transactions
        if 'Transactions' in excel_data:
            for _, row in excel_data['Transactions'].iterrows():
                transaction = Transaction(
                    bill_id=row.get('bill_id'),
                    customer_id=row['customer_id'],
                    amount=row['amount'],
                    transaction_type=row['transaction_type'],
                    status=row['status'],
                    description=row.get('description', '')
                )
                db.session.add(transaction)
        
        # Restore expenses
        if 'Expenses' in excel_data:
            for _, row in excel_data['Expenses'].iterrows():
                expense = Expense(
                    description=row['description'],
                    amount=row['amount'],
                    category=row['category'],
                    status=row['status'],
                    date=pd.to_datetime(row['date']).date()
                )
                db.session.add(expense)
        
        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        raise e
