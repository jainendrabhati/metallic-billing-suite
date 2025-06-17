
from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Stock, StockItem

stock_bp = Blueprint('stock', __name__)

@stock_bp.route('/stock', methods=['GET'])
def get_stock():
    try:
        stock = Stock.get_all()
        return jsonify([s.to_dict() for s in stock]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/stock/current', methods=['GET'])
def get_current_stock():
    try:
        current_stock = Stock.get_current_stock()
        return jsonify({'current_stock': current_stock}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/stock/history', methods=['GET'])
def get_stock_history():
    try:
        stock_history = Stock.get_all()
        return jsonify([s.to_dict() for s in stock_history]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/stock/transaction', methods=['POST'])
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

@stock_bp.route('/stock/add', methods=['POST'])
def add_stock():
    try:
        data = request.get_json()
        stock = Stock.add_stock(data['item_name'], data['amount'], data.get('description', "Stock added"))
        return jsonify(stock.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/stock/deduct', methods=['POST'])
def deduct_stock():
    try:
        data = request.get_json()
        stock = Stock.deduct_stock(data['item_name'], data['amount'], data.get('description', "Stock deducted"))
        return jsonify(stock.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Stock Items APIs
@stock_bp.route('/stock-items', methods=['GET'])
def get_stock_items():
    try:
        items = StockItem.get_all()
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stock_bp.route('/stock-items', methods=['POST'])
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

@stock_bp.route('/stock-items/<int:item_id>', methods=['PUT'])
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

@stock_bp.route('/stock-items/<int:item_id>', methods=['DELETE'])
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
