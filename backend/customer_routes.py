from flask import Blueprint, request, jsonify
from models import db, Customer, Bill, Settings
from datetime import datetime
import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/customers', methods=['GET'])
def get_customers():
    try:
        customers = Customer.get_all()
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    try:
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        return jsonify(customer.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers', methods=['POST'])
def create_customer():
    try:
        data = request.get_json()
        customer = Customer.create(data['name'], data['mobile'], data['address'])
        return jsonify(customer.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>', methods=['PUT'])
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

@customer_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
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

@customer_bp.route('/customers/search', methods=['GET'])
def search_customers():
    try:
        name = request.args.get('name', '')
        customers = Customer.search_by_name(name)
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/pending', methods=['GET'])
def get_pending_customers():
    try:
        customers = Customer.get_pending_customers()
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/pending-list', methods=['GET'])
def get_pending_list():
    try:
        from models import StockItem
        customers = Customer.get_all()
        pending_list = []
        
        # Get all stock items for the columns
        stock_items = StockItem.get_all()
        
        for customer in customers:
            credit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='credit').all()
            debit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='debit').all()
            
            total_credit_fine = sum(bill.total_fine for bill in credit_bills)
            total_credit_amount = sum(bill.total_amount for bill in credit_bills)
            
            total_debit_fine = sum(bill.total_fine for bill in debit_bills)
            total_debit_amount = sum(bill.total_amount for bill in debit_bills)
            
            remaining_fine = total_credit_fine - total_debit_fine
            remaining_amount = total_credit_amount - total_debit_amount
            
            # Calculate remaining debit quantity for each stock item
            stock_balances = {}
            for stock_item in stock_items:
                item_credit_bills = [bill for bill in credit_bills if bill.item == stock_item.item_name]
                item_debit_bills = [bill for bill in debit_bills if bill.item == stock_item.item_name]
                
                item_credit_fine = sum(bill.total_fine for bill in item_credit_bills)
                item_debit_fine = sum(bill.total_fine for bill in item_debit_bills)
                
                stock_balances[stock_item.item_name] = item_credit_fine - item_debit_fine
            
            if remaining_fine != 0 or remaining_amount != 0:
                pending_list.append({
                    'customer_id': customer.id,
                    'customer_name': customer.name,
                    'customer_mobile': customer.mobile,
                    'customer_address': customer.address,
                    'remaining_fine': remaining_fine,
                    'remaining_amount': remaining_amount,
                    'stock_balances': stock_balances,
                    'total_credit_fine': total_credit_fine,
                    'total_credit_amount': total_credit_amount,
                    'total_debit_fine': total_debit_fine,
                    'total_debit_amount': total_debit_amount,
                    'bills': [bill.to_dict() for bill in credit_bills + debit_bills]

                })
        
        return jsonify(pending_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/<int:customer_id>/bills', methods=['GET'])
def get_customer_bills(customer_id):
    try:
        bills = Bill.get_by_customer(customer_id)
        return jsonify([bill.to_dict() for bill in bills]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customer_bp.route('/customers/pending-list/pdf', methods=['GET'])
def get_pending_list_pdf():
    try:
        from flask import make_response
        from models import StockItem
        
        # Get firm settings for header
        settings = Settings.get_settings()
        firm_name = settings.get('firm_name', 'Metalic App') if settings else 'Metalic App'
        address = settings.get('address', 'Default Address') if settings else 'Default Address'
        mobile = settings.get('mobile', 'Default Mobile') if settings else 'Default Mobile'
        
        customers = Customer.get_all()
        stock_items = StockItem.get_all()
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Header
        header_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=20,
            alignment=1  # Center alignment
        )
        
        elements.append(Paragraph(f"{firm_name}", header_style))
        elements.append(Paragraph(f"Address: {address}", styles['Normal']))
        elements.append(Paragraph(f"Mobile: {mobile}", styles['Normal']))
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("Pending List Report", styles['Heading2']))
        elements.append(Spacer(1, 20))
        
        # Create table data
        table_data = [['Customer Name', 'Mobile', 'Address', 'Remaining Amount']]
        
        # Add stock item columns
        for stock_item in stock_items:
            table_data[0].append(f'{stock_item.item_name} Balance')
        
        for customer in customers:
            credit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='credit').all()
            debit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='debit').all()
            
            total_credit_amount = sum(bill.total_amount for bill in credit_bills)
            total_debit_amount = sum(bill.total_amount for bill in debit_bills)
            remaining_amount = total_credit_amount - total_debit_amount
            
            if remaining_amount != 0:
                row = [
                    customer.name,
                    customer.mobile,
                    customer.address,
                    f'₹{remaining_amount:.2f}'
                ]
                
                # Add stock balances
                for stock_item in stock_items:
                    item_credit_bills = [bill for bill in credit_bills if bill.item == stock_item.item_name]
                    item_debit_bills = [bill for bill in debit_bills if bill.item == stock_item.item_name]
                    
                    item_credit_fine = sum(bill.total_fine for bill in item_credit_bills)
                    item_debit_fine = sum(bill.total_fine for bill in item_debit_bills)
                    balance = item_credit_fine - item_debit_fine
                    
                    row.append(f'{balance:.2f}g')
                
                table_data.append(row)
        
        if len(table_data) > 1:
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph("No pending customers found.", styles['Normal']))
        
        doc.build(elements)
        
        buffer.seek(0)
        response = make_response(buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename=pending_list.pdf'
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500