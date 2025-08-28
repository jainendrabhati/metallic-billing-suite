from flask import Blueprint, request, jsonify
from models import db, Customer, Bill, Transaction, Employee, Expense
from datetime import datetime, timedelta
import json

offline_bp = Blueprint('offline', __name__)

@offline_bp.route('/offline/sync', methods=['POST'])
def sync_operations():
    """Sync offline operations when coming back online"""
    try:
        data = request.get_json()
        operations = data.get('operations', [])
        
        results = []
        errors = []
        
        for operation in operations:
            try:
                result = process_operation(operation)
                results.append({
                    'operation_id': operation['id'],
                    'status': 'success',
                    'result': result
                })
            except Exception as e:
                errors.append({
                    'operation_id': operation['id'],
                    'status': 'error',
                    'error': str(e)
                })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'processed': len(results),
            'errors': len(errors),
            'results': results,
            'error_details': errors
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def process_operation(operation):
    """Process a single offline operation"""
    entity = operation['entity']
    op_type = operation['type']
    data = operation['data']
    
    if entity == 'customers':
        return process_customer_operation(op_type, data)
    elif entity == 'bills':
        return process_bill_operation(op_type, data)
    elif entity == 'transactions':
        return process_transaction_operation(op_type, data)
    elif entity == 'employees':
        return process_employee_operation(op_type, data)
    elif entity == 'expenses':
        return process_expense_operation(op_type, data)
    else:
        raise ValueError(f"Unknown entity: {entity}")

def process_customer_operation(op_type, data):
    """Process customer operations"""
    if op_type == 'CREATE':
        # Check if customer already exists (conflict resolution)
        existing = Customer.query.filter_by(
            name=data['name'], 
            mobile=data.get('mobile')
        ).first()
        
        if existing:
            # Update existing customer instead of creating duplicate
            for key, value in data.items():
                if hasattr(existing, key) and value is not None:
                    setattr(existing, key, value)
            db.session.add(existing)
            return existing.to_dict()
        else:
            customer = Customer(**data)
            db.session.add(customer)
            db.session.flush()  # Get the ID
            return customer.to_dict()
    
    elif op_type == 'UPDATE':
        customer = Customer.query.get(data['id'])
        if not customer:
            raise ValueError(f"Customer with id {data['id']} not found")
        
        for key, value in data.items():
            if hasattr(customer, key) and key != 'id':
                setattr(customer, key, value)
        
        db.session.add(customer)
        return customer.to_dict()
    
    elif op_type == 'DELETE':
        customer = Customer.query.get(data['id'])
        if customer:
            db.session.delete(customer)
        return {'deleted': True, 'id': data['id']}

def process_bill_operation(op_type, data):
    """Process bill operations"""
    if op_type == 'CREATE':
        # Check for duplicate bills (same customer, same date, similar amount)
        existing = Bill.query.filter_by(
            customer_id=data.get('customer_id'),
            date=data.get('date')
        ).filter(
            Bill.total_amount == data.get('total_amount', 0)
        ).first()
        
        if existing:
            # Update existing bill instead of creating duplicate
            for key, value in data.items():
                if hasattr(existing, key) and value is not None:
                    setattr(existing, key, value)
            db.session.add(existing)
            return existing.to_dict()
        else:
            bill = Bill(**data)
            db.session.add(bill)
            db.session.flush()
            return bill.to_dict()
    
    elif op_type == 'UPDATE':
        bill = Bill.query.get(data['id'])
        if not bill:
            raise ValueError(f"Bill with id {data['id']} not found")
        
        for key, value in data.items():
            if hasattr(bill, key) and key != 'id':
                setattr(bill, key, value)
        
        db.session.add(bill)
        return bill.to_dict()
    
    elif op_type == 'DELETE':
        bill = Bill.query.get(data['id'])
        if bill:
            db.session.delete(bill)
        return {'deleted': True, 'id': data['id']}

def process_transaction_operation(op_type, data):
    """Process transaction operations"""
    if op_type == 'CREATE':
        transaction = Transaction(**data)
        db.session.add(transaction)
        db.session.flush()
        return transaction.to_dict()
    
    elif op_type == 'UPDATE':
        transaction = Transaction.query.get(data['id'])
        if not transaction:
            raise ValueError(f"Transaction with id {data['id']} not found")
        
        for key, value in data.items():
            if hasattr(transaction, key) and key != 'id':
                setattr(transaction, key, value)
        
        db.session.add(transaction)
        return transaction.to_dict()
    
    elif op_type == 'DELETE':
        transaction = Transaction.query.get(data['id'])
        if transaction:
            db.session.delete(transaction)
        return {'deleted': True, 'id': data['id']}

def process_employee_operation(op_type, data):
    """Process employee operations"""
    if op_type == 'CREATE':
        employee = Employee(**data)
        db.session.add(employee)
        db.session.flush()
        return employee.to_dict()
    
    elif op_type == 'UPDATE':
        employee = Employee.query.get(data['id'])
        if not employee:
            raise ValueError(f"Employee with id {data['id']} not found")
        
        for key, value in data.items():
            if hasattr(employee, key) and key != 'id':
                setattr(employee, key, value)
        
        db.session.add(employee)
        return employee.to_dict()
    
    elif op_type == 'DELETE':
        employee = Employee.query.get(data['id'])
        if employee:
            db.session.delete(employee)
        return {'deleted': True, 'id': data['id']}

def process_expense_operation(op_type, data):
    """Process expense operations"""
    if op_type == 'CREATE':
        expense = Expense(**data)
        db.session.add(expense)
        db.session.flush()
        return expense.to_dict()
    
    elif op_type == 'UPDATE':
        expense = Expense.query.get(data['id'])
        if not expense:
            raise ValueError(f"Expense with id {data['id']} not found")
        
        for key, value in data.items():
            if hasattr(expense, key) and key != 'id':
                setattr(expense, key, value)
        
        db.session.add(expense)
        return expense.to_dict()
    
    elif op_type == 'DELETE':
        expense = Expense.query.get(data['id'])
        if expense:
            db.session.delete(expense)
        return {'deleted': True, 'id': data['id']}

@offline_bp.route('/offline/conflict-resolution', methods=['POST'])
def resolve_conflicts():
    """Handle data conflicts when syncing"""
    try:
        data = request.get_json()
        conflicts = data.get('conflicts', [])
        
        resolved = []
        for conflict in conflicts:
            # Simple conflict resolution: server wins by default
            # Can be enhanced with more sophisticated rules
            resolved_data = resolve_single_conflict(conflict)
            resolved.append(resolved_data)
        
        return jsonify({
            'success': True,
            'resolved_conflicts': resolved
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def resolve_single_conflict(conflict):
    """Resolve a single data conflict"""
    entity_type = conflict['entity']
    local_data = conflict['local_data']
    server_data = conflict['server_data']
    
    # Simple strategy: merge data, server data takes precedence for conflicts
    resolved_data = {**local_data, **server_data}
    
    # Add conflict resolution metadata
    resolved_data['_conflict_resolved'] = True
    resolved_data['_resolution_strategy'] = 'server_wins'
    resolved_data['_resolved_at'] = datetime.utcnow().isoformat()
    
    return resolved_data

@offline_bp.route('/offline/status', methods=['GET'])
def get_offline_status():
    """Get offline synchronization status"""
    try:
        # This could include last sync time, pending operations count, etc.
        return jsonify({
            'server_time': datetime.utcnow().isoformat(),
            'offline_support_enabled': True,
            'max_offline_duration': 7 * 24 * 60 * 60,  # 7 days in seconds
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500