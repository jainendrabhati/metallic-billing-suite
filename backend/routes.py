
from flask import Blueprint, request, jsonify
from models import db, Transaction

api_bp = Blueprint('api', __name__)

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
