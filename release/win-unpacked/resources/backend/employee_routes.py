
from flask import Blueprint, request, jsonify
from models import db, Employee, EmployeeSalary, EmployeePayment, Expense
from datetime import datetime

employee_bp = Blueprint('employee', __name__)

@employee_bp.route('/employees', methods=['POST'])
def create_employee():
    try:
        
        data = request.get_json()
        print(data)
        employee = Employee.create(data['name'], data['position'])
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

@employee_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
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
    try:
        data = request.get_json()
        salary = EmployeeSalary.create(
            data['employee_id'],
            data['month'],
            data['year'],
            data['monthly_salary'],
            data['present_days'],
            data['total_days']
        )
        
        dataa =  {
            'id': data['employee_id'],
            'description': "Employee Salary for " + str(data['month']) + "/" + str(data['year']),
            'amount': salary.monthly_salary,
            'category': "Salary",
            'status': "Pending",
            'date': datetime.utcnow().isoformat(),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        expense = Expense.create(**dataa)
        if not expense:
            return jsonify({'error': 'Failed to create expense for salary'}), 500
        return jsonify(salary.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@employee_bp.route('/employee-salaries/<int:salary_id>', methods=['DELETE'])
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
        
        from models import Expense, Employee
        employee = Employee.query.get(data['employee_id'])
        expense_data = {
            'description': f"Salary payment to {employee.name if employee else 'Unknown Employee'}",
            'amount': data['amount'],
            'category': 'Salary',
            'status': 'paid',
            'date': data['payment_date']
        }
        Expense.create(**expense_data)
        return jsonify(payment.to_dict()), 201
    except Exception as e:
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

@employee_bp.route('/employee-payments/<int:payment_id>', methods=['DELETE'])
def delete_employee_payment(payment_id):
    try:
        payment = EmployeePayment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        
        db.session.delete(payment)
        db.session.commit()
        return jsonify({'message': 'Payment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
