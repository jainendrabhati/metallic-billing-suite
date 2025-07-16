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
from app import app

def export_to_csv(data, data_type):
    """Export data to CSV format"""
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{data_type}_export_{timestamp}.csv"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

    if data_type == 'transactions':
        # Unified - bills only, using the filtered queryset from Transaction
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            # Only the selected columns:
            writer.writerow([
                'Customer Name', 'Item Name', 'Weight', 'Silver Amount', 'Total Fine', 'Total Amount',
                'Bill Type', 'Date'
            ])

            for t in data:
                bill = getattr(t, "bill", None)
                customer = getattr(t, "customer", None)
                if bill:
                    writer.writerow([
                        customer.name if customer else "",
                        bill.item_name or "",
                        f"{bill.weight:.3f}" if bill.weight is not None else "",
                        f"{bill.silver_amount:.2f}" if bill.silver_amount is not None else "",
                        f"{bill.total_fine:.3f}" if bill.total_fine is not None else "",
                        f"{bill.total_amount:.2f}" if bill.total_amount is not None else "",
                        bill.payment_type.title() if bill.payment_type else "",
                        bill.date.strftime("%Y-%m-%d") if bill.date else ""
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
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{data_type}_export_{timestamp}.pdf"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4, rightMargin=inch/2, leftMargin=inch/2, topMargin=inch/2, bottomMargin=inch/2)
    elements = []
    styles = getSampleStyleSheet()

    if data_type == 'transactions':


        # Firm Settings for Header
        firm_settings = FirmSettings.query.first()
        elements = []
        styles = getSampleStyleSheet()

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

        title_style = ParagraphStyle("ReportTitle", parent=styles["h2"], alignment=1)
        elements.append(Paragraph("Transactions Report", title_style))
        elements.append(Spacer(1, 12))

        # New: Table with all bills (exclude address/mobile), only specific columns
        table_data = [
            [
                "Customer Name", "Item Name", "Weight", "Silver Amount",
                "Total Fine", "Total Amount", "Bill Type", "Date"
            ]
        ]
        total_amount_credit = 0
        total_amount_debit = 0
        total_fine_credit = 0
        total_fine_debit = 0

        for t in data:
            bill = getattr(t, "bill", None)
            customer = getattr(t, "customer", None)
            if bill:
                table_data.append([
                    customer.name if customer else "",
                    bill.item_name or "",
                    f"{bill.weight:.3f}" if bill.weight is not None else "",
                    f"₹{bill.silver_amount:,.2f}" if bill.silver_amount is not None else "",
                    f"{bill.total_fine:.3f}" if bill.total_fine is not None else "",
                    f"₹{bill.total_amount:,.2f}" if bill.total_amount is not None else "",
                    bill.payment_type.title() if bill.payment_type else "",
                    bill.date.strftime("%Y-%m-%d") if bill.date else ""
                ])
                fine_val = bill.total_fine if bill.total_fine is not None else 0
                if t.transaction_type == 'credit':
                    total_amount_credit += t.amount
                    total_fine_credit += fine_val
                elif t.transaction_type == 'debit':
                    total_amount_debit += t.amount
                    total_fine_debit += fine_val

        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), "CENTER"),
            ('FONTNAME', (0, 0), (-1, 0), "Helvetica-Bold"),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 24))

        # Summary Section
        net_total_amount = total_amount_credit - total_amount_debit
        net_total_fine = total_fine_credit - total_fine_debit
        summary_style = ParagraphStyle("Summary", parent=styles["Normal"], fontSize=12, spaceBefore=6)
        summary_title = Paragraph("<b>Summary</b>", styles["h3"])
        elements.append(summary_title)
        elements.append(Paragraph(f"<b>Net Total Amount:</b> ₹{net_total_amount:,.2f}", summary_style))
        elements.append(Paragraph(f"<b>Net Total Fine:</b> {net_total_fine:.3f} g", summary_style))

        doc = SimpleDocTemplate(filepath, pagesize=A4, rightMargin=inch/2, leftMargin=inch/2,
                               topMargin=inch/2, bottomMargin=inch/2)
        doc.build(elements)
        return filename

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
    with app.app_context():  # Ensure Flask app context is active during scheduled tasks

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"metalic_backup_{timestamp}.zip"
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'backups')
        os.makedirs(upload_folder, exist_ok=True)
        zip_filepath = os.path.join(upload_folder, zip_filename)

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

                with open(csv_filepath, 'w', newline='', encoding='utf-8') as csvfile:
                    fieldnames = get_model_database_fields(model_name)

                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()

                    for item in data:
                        item_dict = item.to_dict()  # Ensure your models have a correct to_dict()
                        filtered_dict = {key: item_dict.get(key, '') for key in fieldnames}

                        # Convert None and datetime
                        for key, value in filtered_dict.items():
                            if value is None:
                                filtered_dict[key] = ''
                            elif hasattr(value, 'isoformat'):
                                filtered_dict[key] = value.isoformat()

                        writer.writerow(filtered_dict)

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

