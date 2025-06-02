from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from sqlalchemy import or_, and_

db = SQLAlchemy()

class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(15), nullable=False)
    address = db.Column(db.Text, nullable=False)
    total_bills = db.Column(db.Integer, default=0)
    total_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bills = db.relationship('Bill', backref='customer', lazy=True, cascade='all, delete-orphan')
    transactions = db.relationship('Transaction', backref='customer', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'mobile': self.mobile,
            'address': self.address,
            'total_bills': self.total_bills,
            'total_amount': self.total_amount,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def create(cls, name, mobile, address):
        customer = cls(name=name, mobile=mobile, address=address)
        db.session.add(customer)
        db.session.commit()
        return customer

    @classmethod
    def get_all(cls):
        return cls.query.all()

    @classmethod
    def get_by_id(cls, customer_id):
        return cls.query.get(customer_id)

    @classmethod
    def search_by_name(cls, name):
        return cls.query.filter(cls.name.contains(name)).all()

    def update_totals(self):
        bills = Bill.query.filter_by(customer_id=self.id).all()
        self.total_bills = len(bills)
        self.total_amount = sum(bill.total_amount for bill in bills)
        db.session.commit()

    @classmethod
    def get_pending_customers(cls):
        customers = cls.get_all()
        pending_list = []
        
        for customer in customers:
            credit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='credit').all()
            debit_bills = Bill.query.filter_by(customer_id=customer.id, payment_type='debit').all()
            
            total_credit_fine = sum(bill.total_fine for bill in credit_bills)
            total_credit_amount = sum(bill.total_amount for bill in credit_bills)
            
            total_debit_fine = sum(bill.total_fine for bill in debit_bills)
            total_debit_amount = sum(bill.total_amount for bill in debit_bills)
            
            pending_fine = total_credit_fine - total_debit_fine
            pending_amount = total_credit_amount - total_debit_amount
            
            if pending_fine != 0 or pending_amount != 0:
                pending_list.append({
                    'customer_id': customer.id,
                    'customer_name': customer.name,
                    'customer_mobile': customer.mobile,
                    'customer_address': customer.address,
                    'pending_fine': pending_fine,
                    'pending_amount': pending_amount,
                    'total_credit_fine': total_credit_fine,
                    'total_credit_amount': total_credit_amount,
                    'total_debit_fine': total_debit_fine,
                    'total_debit_amount': total_debit_amount
                })
        
        return pending_list

class Bill(db.Model):
    __tablename__ = 'bills'
    
    id = db.Column(db.Integer, primary_key=True)
    bill_number = db.Column(db.String(20), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    item = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Float, nullable=False)
    tunch = db.Column(db.Float, nullable=False)
    wages = db.Column(db.Float, nullable=False)
    wastage = db.Column(db.Float, nullable=False)
    silver_amount = db.Column(db.Float, default=0.0)
    total_fine = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    payment_type = db.Column(db.String(10), nullable=False)  # credit/debit
    slip_no = db.Column(db.String(50))
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = db.relationship('Transaction', backref='bill', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'bill_number': self.bill_number,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,
            'item': self.item,
            'weight': self.weight,
            'tunch': self.tunch,
            'wages': self.wages,
            'wastage': self.wastage,
            'silver_amount': self.silver_amount,
            'total_fine': self.total_fine,
            'total_amount': self.total_amount,
            'total_wages': self.wages * self.weight,
            'payment_type': self.payment_type,
            'slip_no': self.slip_no,
            'description': self.description,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def generate_bill_number(cls, date):
        date_str = date.strftime('%Y%m%d')
        last_bill = cls.query.filter(cls.bill_number.like(f'{date_str}%')).order_by(cls.bill_number.desc()).first()
        
        if last_bill:
            last_number = int(last_bill.bill_number[-4:])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{date_str}{new_number:04d}"

    @classmethod
    def create(cls, **kwargs):
        if 'date' in kwargs:
            bill_date = datetime.strptime(kwargs['date'], '%Y-%m-%d').date() if isinstance(kwargs['date'], str) else kwargs['date']
            kwargs['bill_number'] = cls.generate_bill_number(bill_date)
        
        bill = cls(**kwargs)
        db.session.add(bill)
        db.session.commit()
        
        # Update customer totals
        customer = Customer.get_by_id(bill.customer_id)
        if customer:
            customer.update_totals()
        
        return bill

    @classmethod
    def get_all(cls):
        return cls.query.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_id(cls, bill_id):
        return cls.query.get(bill_id)

    @classmethod
    def get_by_customer(cls, customer_id):
        return cls.query.filter_by(customer_id=customer_id).order_by(cls.created_at.desc()).all()

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)  # credit/debit
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        bill_details = {}
        if self.bill:
            bill_details = {
                'weight': self.bill.weight,
                'tunch': self.bill.tunch,
                'wages': self.bill.wages,
                'wastage': self.bill.wastage,
                'silver_amount': self.bill.silver_amount if self.bill.payment_type == 'credit' else 0,
                'total_wages': self.bill.wages * self.bill.weight,
                'item': self.bill.item
            }
        
        return {
            'id': self.id,
            'bill_id': self.bill_id,
            'bill_number': self.bill.bill_number if self.bill else None,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            **bill_details
        }

    @classmethod
    def create(cls, **kwargs):
        transaction = cls(**kwargs)
        db.session.add(transaction)
        db.session.commit()
        return transaction

    @classmethod
    def get_all(cls):
        return cls.query.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_id(cls, transaction_id):
        return cls.query.get(transaction_id)

    @classmethod
    def get_filtered(cls, start_date=None, end_date=None, customer_name=None):
        query = cls.query
        
        if start_date:
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(cls.created_at >= start_datetime)
        
        if end_date:
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(cls.created_at <= end_datetime)
        
        if customer_name:
            query = query.join(Customer).filter(Customer.name.contains(customer_name))
        
        return query.order_by(cls.created_at.desc()).all()

class Employee(db.Model):
    __tablename__ = 'employees'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    position = db.Column(db.String(100), nullable=False)
    monthly_salary = db.Column(db.Float, nullable=False)
    present_days = db.Column(db.Integer, nullable=False)
    total_days = db.Column(db.Integer, nullable=False)
    calculated_salary = db.Column(db.Float, nullable=False)
    paid_amount = db.Column(db.Float, default=0.0)
    remaining_amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payments = db.relationship('EmployeePayment', backref='employee', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'position': self.position,
            'monthly_salary': self.monthly_salary,
            'present_days': self.present_days,
            'total_days': self.total_days,
            'calculated_salary': self.calculated_salary,
            'paid_amount': self.paid_amount,
            'remaining_amount': self.remaining_amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def create(cls, name, position, monthly_salary, present_days, total_days):
        calculated_salary = (monthly_salary * present_days) / total_days
        employee = cls(
            name=name,
            position=position,
            monthly_salary=monthly_salary,
            present_days=present_days,
            total_days=total_days,
            calculated_salary=calculated_salary,
            remaining_amount=calculated_salary
        )
        db.session.add(employee)
        db.session.commit()
        return employee

    @classmethod
    def get_all(cls):
        return cls.query.all()

    @classmethod
    def get_by_id(cls, employee_id):
        return cls.query.get(employee_id)

    @classmethod
    def update(cls, employee_id, data):
        employee = cls.get_by_id(employee_id)
        if employee:
            for key, value in data.items():
                if hasattr(employee, key):
                    setattr(employee, key, value)
            
            # Recalculate salary if relevant fields changed
            if 'monthly_salary' in data or 'present_days' in data or 'total_days' in data:
                employee.calculated_salary = (employee.monthly_salary * employee.present_days) / employee.total_days
                employee.remaining_amount = employee.calculated_salary - employee.paid_amount
            
            employee.updated_at = datetime.utcnow()
            db.session.commit()
        return employee

    def update_payments(self):
        payments = EmployeePayment.query.filter_by(employee_id=self.id).all()
        self.paid_amount = sum(payment.amount for payment in payments)
        self.remaining_amount = self.calculated_salary - self.paid_amount
        db.session.commit()

class EmployeePayment(db.Model):
    __tablename__ = 'employee_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'amount': self.amount,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def create(cls, **kwargs):
        payment = cls(**kwargs)
        db.session.add(payment)
        db.session.commit()
        
        # Update employee payment totals
        employee = Employee.get_by_id(payment.employee_id)
        if employee:
            employee.update_payments()
        
        return payment

    @classmethod
    def get_all(cls):
        return cls.query.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_employee_id(cls, employee_id):
        return cls.query.filter_by(employee_id=employee_id).order_by(cls.created_at.desc()).all()

class StockItem(db.Model):
    __tablename__ = 'stock_items'
    
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False, unique=True)
    current_weight = db.Column(db.Float, default=0.0)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'item_name': self.item_name,
            'current_weight': self.current_weight,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def create(cls, item_name, current_weight=0.0, description=""):
        item = cls(item_name=item_name, current_weight=current_weight, description=description)
        db.session.add(item)
        db.session.commit()
        return item

    @classmethod
    def get_all(cls):
        return cls.query.all()

    @classmethod
    def get_by_id(cls, item_id):
        return cls.query.get(item_id)

    @classmethod
    def get_by_name(cls, item_name):
        return cls.query.filter_by(item_name=item_name).first()

    @classmethod
    def update_stock(cls, item_name, weight_change, transaction_type):
        item = cls.get_by_name(item_name)
        if not item:
            item = cls.create(item_name, 0.0, f"Auto-created for {item_name}")
        
        if transaction_type == 'add':
            item.current_weight += weight_change
        else:  # deduct
            item.current_weight -= weight_change
        
        item.updated_at = datetime.utcnow()
        db.session.commit()
        return item

class Stock(db.Model):
    __tablename__ = 'stock'
    
    id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(10), nullable=False)  # add/deduct
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'item_name': self.item_name,
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def add_stock(cls, item_name, amount, description="Stock added from credit bill"):
        stock = cls(item_name=item_name, amount=amount, transaction_type='add', description=description)
        db.session.add(stock)
        db.session.commit()
        
        # Update stock item
        StockItem.update_stock(item_name, amount, 'add')
        return stock

    @classmethod
    def deduct_stock(cls, item_name, amount, description="Stock deducted from debit bill"):
        stock = cls(item_name=item_name, amount=amount, transaction_type='deduct', description=description)
        db.session.add(stock)
        db.session.commit()
        
        # Update stock item
        StockItem.update_stock(item_name, amount, 'deduct')
        return stock

    @classmethod
    def get_current_stock(cls):
        added = db.session.query(db.func.sum(cls.amount)).filter_by(transaction_type='add').scalar() or 0
        deducted = db.session.query(db.func.sum(cls.amount)).filter_by(transaction_type='deduct').scalar() or 0
        return added - deducted

    @classmethod
    def get_all(cls):
        return cls.query.order_by(cls.created_at.desc()).all()

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')  # paid/pending
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'amount': self.amount,
            'category': self.category,
            'status': self.status,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def create(cls, **kwargs):
        expense = cls(**kwargs)
        db.session.add(expense)
        db.session.commit()
        return expense

    @classmethod
    def get_all(cls):
        return cls.query.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_id(cls, expense_id):
        return cls.query.get(expense_id)

    @classmethod
    def update(cls, expense_id, data):
        expense = cls.get_by_id(expense_id)
        if expense:
            for key, value in data.items():
                if hasattr(expense, key):
                    setattr(expense, key, value)
            expense.updated_at = datetime.utcnow()
            db.session.commit()
        return expense

class BillItem(db.Model):
    __tablename__ = 'bill_items'
    
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Float, nullable=False)
    rate = db.Column(db.Float, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'bill_id': self.bill_id,
            'item_name': self.item_name,
            'weight': self.weight,
            'rate': self.rate,
            'amount': self.amount,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def create(cls, **kwargs):
        item = cls(**kwargs)
        db.session.add(item)
        db.session.commit()
        return item

class FirmSettings(db.Model):
    __tablename__ = 'firm_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    firm_name = db.Column(db.String(200), default="Metalic Jewelers")
    gst_number = db.Column(db.String(50), default="24ABCDE1234F1Z5")
    address = db.Column(db.Text, default="123 Business Street, City, State - 400001")
    logo_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'firm_name': self.firm_name,
            'gst_number': self.gst_number,
            'address': self.address,
            'logo_path': self.logo_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def get_settings(cls):
        settings = cls.query.first()
        if not settings:
            settings = cls()
            db.session.add(settings)
            db.session.commit()
        return settings

    @classmethod
    def update_settings(cls, data):
        settings = cls.get_settings()
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        settings.updated_at = datetime.utcnow()
        db.session.commit()
        return settings
