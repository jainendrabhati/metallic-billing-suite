from flask import Blueprint, request, jsonify
from models import db, Employee, EmployeeSalary, EmployeePayment, Expense
from datetime import datetime

employee_bp = Blueprint('employee', __name__)

@employee_bp.route('/employees', methods=['POST'])
def create_employee():
    try:
        data = request.get_json()
        
        employee = Employee.create(
            name=data['name'], 
            position=data['position'],
        )
        
        db.session.commit()
        return jsonify(employee.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employees', methods=['GET'])
def get_employees():
    try:
        employees = Employee.get_all()
        return jsonify([employee.to_dict() for employee in employees]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    try:
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        return jsonify(employee.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    try:
        data = request.get_json()
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        for key, value in data.items():
            if hasattr(employee, key):
                setattr(employee, key, value)
        
        employee.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(employee.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employees/<int:employee_id>/delete', methods=['POST'])
def delete_employee(employee_id):
    try:
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        db.session.delete(employee)
        db.session.commit()
        return jsonify({'message': 'Employee deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Employee Salary APIs
@employee_bp.route('/employee-salaries', methods=['POST'])
def create_employee_salary():

    db.session.begin()
    try:
        data = request.get_json()
        
        
        # Handle employee creation if new employee
        employee_id = data.get('employee_id')
        if not employee_id:
            # Create new employee if employee_id is not provided
            employee_name = data.get('employee_name', '').strip()
            employee_position = data.get('employee_position', '').strip()
            
            if not employee_name or not employee_position:
                raise ValueError("Employee name and position are required for new employee")
            
            # Check for duplicate employee name
            existing_employee = Employee.query.filter_by(name=employee_name).first()
            if existing_employee:
                employee_id = existing_employee.id
            else:
                # Create new employee
                new_employee = Employee(name=employee_name, position=employee_position)
                db.session.add(new_employee)
                db.session.flush()  # Get the ID without committing
                employee_id = new_employee.id
        
        # Validate required fields for salary
        required_fields = ['month', 'year', 'monthly_salary', 'present_days', 'total_days']
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValueError(f"{field} is required")
        salary = EmployeeSalary.create(
            employee_id,
            data['month'],
            data['year'],
            data['monthly_salary'],
            data['present_days'],
            data['total_days']
        )
        
        db.session.commit()
        return jsonify(salary.to_dict()), 201
    except ValueError as ve:
        db.session.rollback()
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create salary: {str(e)}'}), 500


@employee_bp.route('/employee-salaries', methods=['GET'])
def get_employee_salaries():
    try:
        salaries = EmployeeSalary.get_all()
        return jsonify([salary.to_dict() for salary in salaries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employee-salaries/employee/<int:employee_id>', methods=['GET'])
def get_employee_salaries_by_employee(employee_id):
    try:
        salaries = EmployeeSalary.get_by_employee_id(employee_id)
        return jsonify([salary.to_dict() for salary in salaries]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employee-salaries/<int:salary_id>', methods=['PUT'])
def update_employee_salary(salary_id):
    try:
        data = request.get_json()
        salary = EmployeeSalary.get_by_id(salary_id)
        if not salary:
            return jsonify({'error': 'Salary record not found'}), 404
        
        for key, value in data.items():
            if hasattr(salary, key):
                setattr(salary, key, value)
        
        # Recalculate salary if relevant fields changed
        if 'monthly_salary' in data or 'present_days' in data or 'total_days' in data:
            salary.calculated_salary = (salary.monthly_salary * salary.present_days) / salary.total_days
        
        salary.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(salary.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employee-salaries/<int:salary_id>/delete', methods=['POST'])
def delete_employee_salary(salary_id):
    try:
        salary = EmployeeSalary.get_by_id(salary_id)
        if not salary:
            return jsonify({'error': 'Salary record not found'}), 404
        
        db.session.delete(salary)
        db.session.commit()
        return jsonify({'message': 'Salary record deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Employee Payment APIs
@employee_bp.route('/employee-payments', methods=['POST'])
def create_employee_payment():
    try:
        data = request.get_json()
        
        if 'payment_date' in data and isinstance(data['payment_date'], str):
            data['payment_date'] = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
        payment = EmployeePayment.create(**data)

        
        # Create expense record for payment

        employee = Employee.query.get(data['employee_id'])
        expense_data = {
            'description': f"Salary payment to {employee.name if employee else 'Unknown Employee'}",
            'amount': data['amount'],
            'category': 'Salary',

            'date': data['payment_date'] if 'payment_date' in data else datetime.utcnow().date()
        }
        
        Expense.create(**expense_data)

        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employee-payments', methods=['GET'])
def get_employee_payments():
    try:
        payments = EmployeePayment.get_all()
        return jsonify([payment.to_dict() for payment in payments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employee-payments/employee/<int:employee_id>', methods=['GET'])
def get_employee_payments_by_employee(employee_id):
    try:
        payments = EmployeePayment.get_by_employee_id(employee_id)
        return jsonify([payment.to_dict() for payment in payments]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@employee_bp.route('/employee-payments/<int:payment_id>/delete', methods=['POST'])
def delete_employee_payment(payment_id):
    try:
        payment = EmployeePayment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        # Create an expense entry to deduct the deleted payment amount
        expense = Expense(
            description=f"Deducted payment for Employee ID {payment.employee_id} - {payment.description}",
            amount=-payment.amount,  # Negative amount to deduct
            date=payment.payment_date,
            category="Employee Payment Reversal"
        )
        db.session.add(expense)
        
        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment deleted successfully and expense deducted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500