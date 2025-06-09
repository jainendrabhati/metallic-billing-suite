from flask import Flask
from flask_cors import CORS
from models import db
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///test.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

    # Initialize firm settings if not exists
    from models import FirmSettings
    if not FirmSettings.query.first():
        settings = FirmSettings()
        db.session.add(settings)
        db.session.commit()

# Register blueprints
from routes import api_bp
app.register_blueprint(api_bp, url_prefix='/api')

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
