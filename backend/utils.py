
import csv
import pandas as pd
from flask import current_app
from datetime import datetime
import os
import zipfile
import tempfile
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from models import db, Customer, Bill, Transaction, Expense, Employee, EmployeePayment, StockItem, Stock, FirmSettings

def export_to_csv(data, data_type):
    """Export data to CSV format"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{data_type}_export_{timestamp}.csv"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    if data_type == 'transactions':
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Transaction ID', 'Bill Number', 'Customer Name', 'Amount', 'Type', 'Date', 'Description'])
            
            for transaction in data:
                writer.writerow([
                    transaction.id,
                    f"BILL-{transaction.bill_id:04d}" if transaction.bill_id else '',
                    transaction.customer.name if transaction.customer else '',
                    transaction.amount,
                    transaction.transaction_type,
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
        table_data = [['Transaction ID', 'Bill Number', 'Customer', 'Amount', 'Type', 'Date']]
        
        for transaction in data:
            table_data.append([
                str(transaction.id),
                f"BILL-{transaction.bill_id:04d}" if transaction.bill_id else '',
                transaction.customer.name if transaction.customer else '',
                f"₹{transaction.amount:,.2f}",
                transaction.transaction_type.title(),
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
    """Create a backup of the entire database as CSV files in a ZIP"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"metalic_backup_{timestamp}.zip"
    zip_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], zip_filename)
    
    # Create a temporary directory for CSV files
    with tempfile.TemporaryDirectory() as temp_dir:
        # Export each model to CSV
        models_data = {
            'customers': Customer.query.all(),
            'bills': Bill.query.all(),
            'transactions': Transaction.query.all(),
            'expenses': Expense.query.all(),
            'employees': Employee.query.all(),
            'employee_payments': EmployeePayment.query.all(),
            'stock_items': StockItem.query.all(),
            'stock': Stock.query.all(),
            'firm_settings': FirmSettings.query.all()
        }
        
        csv_files = []
        
        for model_name, data in models_data.items():
            csv_filename = f"{model_name}.csv"
            csv_filepath = os.path.join(temp_dir, csv_filename)
            csv_files.append((csv_filepath, csv_filename))
            
            if data:
                # Convert to DataFrame and save as CSV
                df_data = [item.to_dict() for item in data]
                pd.DataFrame(df_data).to_csv(csv_filepath, index=False)
            else:
                # Create empty CSV with headers
                if model_name == 'customers':
                    headers = ['id', 'name', 'mobile', 'address', 'total_bills', 'total_amount', 'status', 'created_at', 'updated_at']
                elif model_name == 'bills':
                    headers = ['id', 'bill_number', 'customer_id', 'item', 'weight', 'tunch', 'wages', 'wastage', 'silver_amount', 'total_fine', 'total_amount', 'payment_type', 'slip_no', 'description', 'date', 'created_at', 'updated_at']
                elif model_name == 'transactions':
                    headers = ['id', 'bill_id', 'customer_id', 'amount', 'transaction_type', 'description', 'created_at', 'updated_at']
                elif model_name == 'expenses':
                    headers = ['id', 'description', 'amount', 'category', 'status', 'date', 'created_at', 'updated_at']
                elif model_name == 'employees':
                    headers = ['id', 'name', 'position', 'monthly_salary', 'present_days', 'total_days', 'calculated_salary', 'paid_amount', 'remaining_amount', 'created_at', 'updated_at']
                elif model_name == 'employee_payments':
                    headers = ['id', 'employee_id', 'amount', 'payment_date', 'description', 'created_at', 'updated_at']
                elif model_name == 'stock_items':
                    headers = ['id', 'item_name', 'current_weight', 'description', 'created_at', 'updated_at']
                elif model_name == 'stock':
                    headers = ['id', 'amount', 'transaction_type', 'item_name', 'description', 'created_at']
                elif model_name == 'firm_settings':
                    headers = ['id', 'firm_name', 'gst_number', 'address', 'logo_path', 'created_at', 'updated_at']
                
                pd.DataFrame(columns=headers).to_csv(csv_filepath, index=False)
        
        # Create ZIP file
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for csv_filepath, csv_filename in csv_files:
                zipf.write(csv_filepath, csv_filename)
    
    return zip_filename

def restore_database(zip_file):
    """Restore database from uploaded ZIP file containing CSV files"""
    try:
        # Create temporary directory to extract ZIP
        with tempfile.TemporaryDirectory() as temp_dir:
            # Extract ZIP file
            with zipfile.ZipFile(zip_file, 'r') as zipf:
                zipf.extractall(temp_dir)
            
            # Clear existing data (be careful!)
            db.session.query(EmployeePayment).delete()
            db.session.query(Employee).delete()
            db.session.query(Stock).delete()
            db.session.query(StockItem).delete()
            db.session.query(Transaction).delete()
            db.session.query(Bill).delete()
            db.session.query(Expense).delete()
            db.session.query(Customer).delete()
            db.session.query(FirmSettings).delete()
            db.session.commit()
            
            # Restore data from CSV files
            csv_files = {
                'customers.csv': Customer,
                'bills.csv': Bill,
                'transactions.csv': Transaction,
                'expenses.csv': Expense,
                'employees.csv': Employee,
                'employee_payments.csv': EmployeePayment,
                'stock_items.csv': StockItem,
                'stock.csv': Stock,
                'firm_settings.csv': FirmSettings
            }
            
            for csv_filename, model_class in csv_files.items():
                csv_filepath = os.path.join(temp_dir, csv_filename)
                
                if os.path.exists(csv_filepath):
                    df = pd.read_csv(csv_filepath)
                    
                    if not df.empty:
                        for _, row in df.iterrows():
                            # Create model instance
                            data = row.to_dict()
                            
                            # Remove id and timestamps for new creation
                            if 'id' in data:
                                del data['id']
                            if 'created_at' in data:
                                del data['created_at']
                            if 'updated_at' in data:
                                del data['updated_at']
                            
                            # Handle date fields
                            if model_class == Bill and 'date' in data:
                                data['date'] = pd.to_datetime(data['date']).date()
                            elif model_class == Expense and 'date' in data:
                                data['date'] = pd.to_datetime(data['date']).date()
                            elif model_class == EmployeePayment and 'payment_date' in data:
                                data['payment_date'] = pd.to_datetime(data['payment_date']).date()
                            
                            # Create instance
                            instance = model_class(**data)
                            db.session.add(instance)
            
            db.session.commit()
            
    except Exception as e:
        db.session.rollback()
        raise e
