
import csv
import os
import zipfile
import tempfile
from flask import current_app
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from models import db, Customer, Bill, Transaction, Expense, Employee, EmployeePayment, StockItem, Stock, FirmSettings, EmployeeSalary

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
            'employee_salaries': EmployeeSalary.query.all(),
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
                # Write CSV with proper headers
                with open(csv_filepath, 'w', newline='', encoding='utf-8') as csvfile:
                    if data:
                        # Get field names from the first record
                        first_record = data[0].to_dict()
                        fieldnames = list(first_record.keys())
                        
                        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                        writer.writeheader()
                        
                        for item in data:
                            item_dict = item.to_dict()
                            # Convert None values to empty strings
                            item_dict = {k: (v if v is not None else '') for k, v in item_dict.items()}
                            writer.writerow(item_dict)
            else:
                # Create empty CSV with headers
                headers = get_model_headers(model_name)
                with open(csv_filepath, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow(headers)
        
        # Create ZIP file
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for csv_filepath, csv_filename in csv_files:
                zipf.write(csv_filepath, csv_filename)
    
    return zip_filename

def get_model_headers(model_name):
    """Get headers for each model"""
    headers_map = {
        'customers': ['id', 'name', 'mobile', 'address', 'total_bills', 'created_at', 'updated_at'],
        'bills': ['id', 'bill_number', 'customer_id', 'item_name', 'item', 'weight', 'tunch', 'wages', 'wastage', 'silver_amount', 'total_fine', 'total_amount', 'payment_type', 'slip_no', 'description', 'date', 'created_at', 'updated_at'],
        'transactions': ['id', 'bill_id', 'customer_id', 'amount', 'transaction_type', 'description', 'created_at', 'updated_at'],
        'expenses': ['id', 'description', 'amount', 'category', 'status', 'date', 'created_at', 'updated_at'],
        'employees': ['id', 'name', 'position', 'created_at', 'updated_at'],
        'employee_salaries': ['id', 'employee_id', 'month', 'year', 'monthly_salary', 'present_days', 'total_days', 'calculated_salary', 'created_at', 'updated_at'],
        'employee_payments': ['id', 'employee_id', 'amount', 'payment_date', 'description', 'created_at', 'updated_at'],
        'stock_items': ['id', 'item_name', 'current_weight', 'description', 'created_at', 'updated_at'],
        'stock': ['id', 'amount', 'transaction_type', 'item_name', 'description', 'created_at'],
        'firm_settings': ['id', 'firm_name', 'gst_number', 'address', 'logo_path', 'created_at', 'updated_at']
    }
    return headers_map.get(model_name, [])

def restore_database(zip_file_path):
    """Restore database from uploaded ZIP file containing CSV files"""
    try:
        # Create temporary directory to extract ZIP
        with tempfile.TemporaryDirectory() as temp_dir:
            # Extract ZIP file
            with zipfile.ZipFile(zip_file_path, 'r') as zipf:
                zipf.extractall(temp_dir)
            
            # Clear existing data (be careful!)
            try:
                db.session.query(EmployeePayment).delete()
                db.session.query(EmployeeSalary).delete()
                db.session.query(Employee).delete()
                db.session.query(Stock).delete()
                db.session.query(StockItem).delete()
                db.session.query(Transaction).delete()
                db.session.query(Bill).delete()
                db.session.query(Expense).delete()
                db.session.query(Customer).delete()
                db.session.query(FirmSettings).delete()
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                raise Exception(f"Failed to clear existing data: {str(e)}")
            
            # Restore data from CSV files in correct order
            csv_files_order = [
                ('customers.csv', Customer),
                ('employees.csv', Employee),
                ('bills.csv', Bill),
                ('transactions.csv', Transaction),
                ('expenses.csv', Expense),
                ('employee_salaries.csv', EmployeeSalary),
                ('employee_payments.csv', EmployeePayment),
                ('stock_items.csv', StockItem),
                ('stock.csv', Stock),
                ('firm_settings.csv', FirmSettings)
            ]
            
            for csv_filename, model_class in csv_files_order:
                csv_filepath = os.path.join(temp_dir, csv_filename)
                
                # Skip if CSV file doesn't exist
                if not os.path.exists(csv_filepath):
                    print(f"Warning: {csv_filename} not found in backup, skipping...")
                    continue
                
                try:
                    with open(csv_filepath, 'r', encoding='utf-8') as csvfile:
                        reader = csv.DictReader(csvfile)
                        
                        for row in reader:
                            # Remove empty values and convert types
                            data = {}
                            for key, value in row.items():
                                if value and value.strip():  # Skip empty values
                                    # Handle date fields
                                    if key in ['date', 'payment_date'] and value:
                                        try:
                                            # Try different date formats
                                            if 'T' in value:  # ISO format
                                                data[key] = datetime.fromisoformat(value.replace('Z', '+00:00')).date()
                                            else:  # Simple date format
                                                data[key] = datetime.strptime(value, '%Y-%m-%d').date()
                                        except:
                                            continue  # Skip invalid dates
                                    elif key in ['created_at', 'updated_at'] and value:
                                        try:
                                            if 'T' in value:  # ISO format
                                                data[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                                            else:
                                                data[key] = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                                        except:
                                            pass  # Skip timestamp fields if invalid
                                    elif key == 'id':
                                        continue  # Skip ID for auto-increment
                                    else:
                                        data[key] = value
                            
                            if data:  # Only create if we have valid data
                                try:
                                    instance = model_class(**data)
                                    db.session.add(instance)
                                except Exception as e:
                                    print(f"Error creating {model_class.__name__} instance: {str(e)}")
                                    continue
                
                except Exception as e:
                    print(f"Warning: Error processing {csv_filename}: {str(e)}")
                    continue
            
            db.session.commit()
            
    except Exception as e:
        db.session.rollback()
        raise Exception(f"Database restore failed: {str(e)}")
