from flask import Blueprint, request, jsonify
from models import db, License
from datetime import datetime
import requests

license_bp = Blueprint('license', __name__)

@license_bp.route('/license', methods=['POST'])
def save_license():
    try:
        data = request.get_json()
        name = data.get('name')
        activation_key = data.get('activation_key')
        
        if not name or not activation_key:
            return jsonify({'error': 'Name and activation key are required'}), 400
        
        # Check if license already exists
        existing_license = License.query.first()
        if existing_license:
            existing_license.name = name
            existing_license.activation_key = activation_key
            existing_license.updated_at = datetime.utcnow()
        else:
            license_entry = License(name=name, activation_key=activation_key)
            db.session.add(license_entry)
        
        db.session.commit()
        return jsonify({'message': 'License saved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@license_bp.route('/license', methods=['GET'])
def get_license():
    try:
        license_entry = License.query.first()
        if license_entry:
            return jsonify({
                'name': license_entry.name,
                'activation_key': license_entry.activation_key,
                'created_at': license_entry.created_at.isoformat()
            }), 200
        return jsonify({'message': 'No license found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@license_bp.route('/license/validate', methods=['POST'])
def validate_license():
    try:
        license_entry = License.query.first()
        if not license_entry:
            return jsonify({'error': 'No license found'}), 404
        
        # Make validation request to localhost:6000/validate with correct format
        validation_data = {
            'name': license_entry.name,
            'key': license_entry.activation_key
        }
        
        response = requests.post('http://localhost:6000/validate', json=validation_data, timeout=10)
        
        if response.status_code == 200:
            return jsonify({'message': 'License validated successfully'}), 200
        elif response.status_code == 401:
            return jsonify({'error': 'License validation failed'}), 401
        else:
            return jsonify({'error': 'Validation server error'}), 500
            
    except requests.exceptions.RequestException:
        return jsonify({'error': 'Could not connect to validation server'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
