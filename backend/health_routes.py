
from flask import Blueprint, jsonify
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify server availability"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'server': 'flask',
        'offline_support': True
    }), 200

@health_bp.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint"""
    return jsonify({'pong': True}), 200