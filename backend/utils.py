import csv
import os
import zipfile
import tempfile
from flask import current_app
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
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
    
    doc = SimpleDocTemplate(filepath, pagesize=A4, rightMargin=inch/2, leftMargin=inch/2, topMargin=inch/2, bottomMargin=inch/2)
    elements = []
    
    styles = getSampleStyleSheet()

    if data_type == 'transactions':
        # Firm Settings for Header
        firm_settings = FirmSettings.query.first()
        if firm_settings:
            if firm_settings.logo_path and os.path.exists(firm_settings.logo_path):
                try:
                    logo = Image(firm_settings.logo_path, width=0.75*inch, height=0.75*inch)
                    logo.hAlign = 'LEFT'
                    elements.append(logo)
                except Exception as e:
                    print(f"Could not load logo: {e}")

            firm_name_style = ParagraphStyle('FirmName', parent=styles['h1'], alignment=1)
            elements.append(Paragraph(firm_settings.firm_name, firm_name_style))
            
            firm_details_style = ParagraphStyle('FirmDetails', parent=styles['Normal'], alignment=1, spaceBefore=6)
            elements.append(Paragraph(firm_settings.address, firm_details_style))
            elements.append(Paragraph(f"GST: {firm_settings.gst_number}", firm_details_style))
            elements.append(Spacer(1, 20))
        
        # Title
        title_style = ParagraphStyle('ReportTitle', parent=styles['h2'], alignment=1)
        title = Paragraph(f"{data_type.title()} Report", title_style)
        elements.append(title)
        elements.append(Spacer(1, 12))

        total_amount_credit = 0
        total_amount_debit = 0
        total_fine_credit = 0
        total_fine_debit = 0

        for idx, transaction in enumerate(data, 1):
            bill = getattr(transaction, 'bill', None)
            customer = getattr(transaction, 'customer', None)

            detail = []
            # Bill details (show all but address/mobile)
            if bill:
                bill_attrs = [
                    ("Bill No.", f"BILL-{bill.bill_number:04d}"),
                    ("Date", bill.date.strftime('%Y-%m-%d') if bill.date else "N/A"),
                    ("Payment Type", bill.payment_type.title() if bill.payment_type else ""),
                    ("Item Name", bill.item_name),
                    ("Item Type", bill.item),
                    ("Weight (g)", f"{bill.weight:.3f}"),
                    ("Tunch (%)", f"{bill.tunch:.2f}"),
                    ("Wastage (%)", f"{bill.wastage:.2f}"),
                    ("Wages (per 1000)", f"{bill.wages:.2f}"),
                    ("Silver Amount", f"₹{bill.silver_amount:,.2f}"),
                    ("Total Fine (g)", f"{bill.total_fine:.3f}"),
                    ("Total Amount", f"₹{bill.total_amount:,.2f}"),
                    ("Slip No.", bill.slip_no or ""),
                    ("Description", bill.description or ""),
                ]
                for key, value in bill_attrs:
                    if value not in (None, "", "N/A"):
                        detail.append([key, value])
                if customer:
                    detail.insert(1, ("Customer", customer.name))
            else:
                # No bill: show transaction-level summary
                detail = [
                    ("Transaction ID", transaction.id),
                    ("Type", transaction.transaction_type.title()),
                    ("Amount", f"₹{transaction.amount:,.2f}"),
                    ("Description", transaction.description or "")
                ]
                if customer:
                    detail.insert(1, ("Customer", customer.name))
                detail.insert(0, ("Date", transaction.created_at.strftime('%Y-%m-%d')))
            # Table for this transaction
            elements.append(Spacer(1, 6))
            elements.append(Paragraph(f"<b>Entry #{idx}</b>", styles['h4']))
            t = Table(detail, colWidths=[2*inch, 3.2*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black)
            ]))
            elements.append(t)
            elements.append(Spacer(1, 6))

            # accumulate sums for summary
            fine_val = bill.total_fine if bill and bill.total_fine is not None else 0
            if transaction.transaction_type == 'credit':
                total_amount_credit += transaction.amount
                total_fine_credit += fine_val
            elif transaction.transaction_type == 'debit':
                total_amount_debit += transaction.amount
                total_fine_debit += fine_val

        elements.append(Spacer(1, 24))
        # Summary Section
        net_total_amount = total_amount_credit - total_amount_debit
        net_total_fine = total_fine_credit - total_fine_debit
        summary_style = ParagraphStyle('Summary', parent=styles['Normal'], fontSize=12, spaceBefore=6)
        summary_title = Paragraph("<b>Summary</b>", styles['h3'])
        elements.append(summary_title)
        elements.append(Paragraph(f"<b>Net Total Amount:</b> ₹{net_total_amount:,.2f}", summary_style))
        elements.append(Paragraph(f"<b>Net Total Fine:</b> {net_total_fine:.3f} g", summary_style))

    elif data_type == 'expenses':
        # Original expenses PDF code
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
        
        # Title
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=16, spaceAfter=30, alignment=1)
        title = Paragraph(f"Metalic Jewelers - {data_type.title()} Report", title_style)
        elements.append(title)
        elements.append(Spacer(1, 12))
        
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
    
    doc.build(elements)
    
    return filename

def backup_database():
    """Create a backup of the entire database as CSV files in a ZIP"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"metalic_backup_{timestamp}.zip"
    zip_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], zip_filename)
    
    print(f"Creating backup ZIP at: {zip_filepath}")
    
    # Create a temporary directory for CSV files
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Using temp directory: {temp_dir}")
        
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
            
            print(f"Creating CSV for {model_name} with {len(data)} records")
            
            # Write CSV with proper headers (only actual database columns)
            with open(csv_filepath, 'w', newline='', encoding='utf-8') as csvfile:
                if data:
                    # Get only the database column fields
                    fieldnames = get_model_database_fields(model_name)
                    
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    
                    for item in data:
                        item_dict = item.to_dict()
                        # Filter to only include database fields
                        filtered_dict = {key: value for key, value in item_dict.items() if key in fieldnames}
                        
                        # Convert None values to empty strings and handle dates
                        for key, value in filtered_dict.items():
                            if value is None:
                                filtered_dict[key] = ''
                            elif hasattr(value, 'isoformat'):  # Handle datetime/date objects
                                filtered_dict[key] = value.isoformat()
                        writer.writerow(filtered_dict)
                else:
                    # Create empty CSV with headers
                    headers = get_model_database_fields(model_name)
                    writer = csv.writer(csvfile)
                    writer.writerow(headers)
        
        # Create ZIP file
        print(f"Creating ZIP file with {len(csv_files)} CSV files")
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for csv_filepath, csv_filename in csv_files:
                if os.path.exists(csv_filepath):
                    zipf.write(csv_filepath, csv_filename)
                    print(f"Added {csv_filename} to ZIP")
    
    print(f"Backup created successfully: {zip_filename}")
    return zip_filename

def get_model_database_fields(model_name):
    """Get only the actual database fields for each model (not computed fields from to_dict)"""
    fields_map = {
        'customers': ['id', 'name', 'mobile', 'address', 'total_bills', 'created_at', 'updated_at'],
        'bills': ['id', 'bill_number', 'customer_id', 'item_name', 'item', 'weight', 'tunch', 'wages', 'wastage', 'silver_amount', 'total_fine', 'total_amount', 'payment_type', 'slip_no', 'description', 'date', 'created_at', 'updated_at'],
        'transactions': ['id', 'bill_id', 'customer_id', 'amount', 'transaction_type', 'description', 'created_at', 'updated_at'],
        'expenses': ['id', 'description', 'amount', 'category', 'status', 'date', 'created_at', 'updated_at'],
        'employees': ['id', 'name', 'position', 'created_at', 'updated_at'],
        'employee_salaries': ['id', 'employee_id', 'month', 'year', 'monthly_salary', 'present_days', 'total_days', 'calculated_salary', 'created_at', 'updated_at'],
        'employee_payments': ['id', 'employee_id', 'amount', 'payment_date', 'description', 'created_at', 'updated_at'],
        'stock_items': ['id', 'item_name', 'current_weight', 'description', 'created_at', 'updated_at'],
        'stock': ['id', 'item_name', 'amount', 'transaction_type', 'description', 'created_at'],
        'firm_settings': ['id', 'firm_name', 'gst_number', 'address', 'logo_path', 'created_at', 'updated_at']
    }
    return fields_map.get(model_name, [])

def get_model_headers(model_name):
    """Get headers for each model (legacy function, use get_model_database_fields instead)"""
    return get_model_database_fields(model_name)

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
                        
                        # Get only valid database fields for this model
                        model_name = csv_filename.replace('.csv', '')
                        valid_fields = get_model_database_fields(model_name)
                        
                        for row in reader:
                            # Filter to only include valid database fields and non-empty values
                            data = {}
                            for key, value in row.items():
                                if key in valid_fields and value and value.strip():  # Only valid fields with non-empty values
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
                                            else:  # Simple date format
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
