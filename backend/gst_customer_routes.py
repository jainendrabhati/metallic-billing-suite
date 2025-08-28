from flask import Blueprint, request, jsonify
from models import db, GSTCustomer
from datetime import datetime

gst_customer_bp = Blueprint('gst_customer', __name__)

@gst_customer_bp.route('/gst-customers/search', methods=['GET'])
def search_gst_customers():
    """Search GST customers by name for autocomplete"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify([]), 200
            
        customers = GSTCustomer.search_by_name(query)
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gst_customer_bp.route('/gst-customers', methods=['POST'])
def create_or_update_gst_customer():
    """Create or update GST customer"""
    try:
        data = request.get_json()
        customer = GSTCustomer.create_or_update(
            customer_name=data['customer_name'],
            customer_address=data.get('customer_address'),
            customer_gstin=data.get('customer_gstin')
        )
        return jsonify(customer.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gst_customer_bp.route('/gst-customers', methods=['GET'])
def get_all_gst_customers():
    """Get all GST customers"""
    try:
        customers = GSTCustomer.query.order_by(GSTCustomer.customer_name).all()
        return jsonify([customer.to_dict() for customer in customers]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500