from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class GoogleDriveAuth(db.Model):
    __tablename__ = 'google_drive_auth'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    credentials = db.Column(db.Text, nullable=False)  # Encrypted credentials
    backup_time = db.Column(db.String(5), default="20:00")  # HH:MM format
    auto_backup_enabled = db.Column(db.Boolean, default=False)
    authenticated = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'backup_time': self.backup_time,
            'auto_backup_enabled': self.auto_backup_enabled,
            'authenticated': self.authenticated,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }