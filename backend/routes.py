
from flask import Blueprint
from customer_routes import customer_bp
from bill_routes import bill_bp
from transaction_routes import transaction_bp
from employee_routes import employee_bp
from stock_routes import stock_bp
from expense_routes import expense_bp
from dashboard_routes import dashboard_bp

# Create main API blueprint
api_bp = Blueprint('api', __name__)

# Register all sub-blueprints
api_bp.register_blueprint(customer_bp)
api_bp.register_blueprint(bill_bp)
api_bp.register_blueprint(transaction_bp)
api_bp.register_blueprint(employee_bp)
api_bp.register_blueprint(stock_bp)
api_bp.register_blueprint(expense_bp)
api_bp.register_blueprint(dashboard_bp)
