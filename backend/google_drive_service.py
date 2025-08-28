import os
import pickle
import json
import base64
from datetime import datetime
from flask import current_app
from apscheduler.schedulers.background import BackgroundScheduler
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from googleapiclient.http import MediaFileUpload
from cryptography.fernet import Fernet

from utils import backup_database
from google_drive_models import GoogleDriveAuth, db

# Scheduler instance
scheduler = BackgroundScheduler()
scheduler.start()

# Scopes for Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class GoogleDriveService:
    def __init__(self):
        self.creds = None
        self.service = None
        self.encryption_key = self._get_or_create_encryption_key()

    def _get_or_create_encryption_key(self):
        """Get or create encryption key for storing credentials securely"""
        key_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'encryption.key')
        
        if os.path.exists(key_path):
            with open(key_path, 'rb') as key_file:
                return key_file.read()
        else:
            key = Fernet.generate_key()
            with open(key_path, 'wb') as key_file:
                key_file.write(key)
            return key

    def _encrypt_credentials(self, credentials):
        """Encrypt credentials for secure storage"""
        cipher_suite = Fernet(self.encryption_key)
        credentials_json = json.dumps({
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        })
        return cipher_suite.encrypt(credentials_json.encode()).decode()

    def _decrypt_credentials(self, encrypted_credentials):
        """Decrypt stored credentials"""
        from google.oauth2.credentials import Credentials
        
        cipher_suite = Fernet(self.encryption_key)
        decrypted_data = cipher_suite.decrypt(encrypted_credentials.encode())
        credentials_dict = json.loads(decrypted_data.decode())
        
        return Credentials(
            token=credentials_dict['token'],
            refresh_token=credentials_dict['refresh_token'],
            token_uri=credentials_dict['token_uri'],
            client_id=credentials_dict['client_id'],
            client_secret=credentials_dict['client_secret'],
            scopes=credentials_dict['scopes']
        )

    def authenticate(self, email):
        try:
            # Check if we have stored credentials for this email
            auth_record = GoogleDriveAuth.query.filter_by(email=email).first()
            
            if auth_record and auth_record.credentials:
                try:
                    # Try to use stored credentials
                    self.creds = self._decrypt_credentials(auth_record.credentials)
                    
                    # Refresh if expired
                    if self.creds.expired and self.creds.refresh_token:
                        self.creds.refresh(Request())
                        # Update stored credentials
                        auth_record.credentials = self._encrypt_credentials(self.creds)
                        auth_record.authenticated = True
                        auth_record.updated_at = datetime.utcnow()
                        db.session.commit()
                    
                    self.service = build('drive', 'v3', credentials=self.creds)
                    return True
                except Exception as decrypt_error:
                    print(f"Failed to decrypt stored credentials: {decrypt_error}")
                    # Fall through to re-authenticate
            
            # Fresh authentication
            credentials_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'credentials.json')
            if not os.path.exists(credentials_path):
                raise Exception("Google credentials.json file not found")
                
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            self.creds = flow.run_local_server(port=0)
            
            # Store encrypted credentials in database
            if auth_record:
                auth_record.credentials = self._encrypt_credentials(self.creds)
                auth_record.authenticated = True
                auth_record.updated_at = datetime.utcnow()
            else:
                auth_record = GoogleDriveAuth(
                    email=email,
                    credentials=self._encrypt_credentials(self.creds),
                    authenticated=True
                )
                db.session.add(auth_record)
            
            db.session.commit()
            self.service = build('drive', 'v3', credentials=self.creds)
            return True
            
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return False

    def get_auth_status(self, email):
        """Check if user is authenticated"""
        auth_record = GoogleDriveAuth.query.filter_by(email=email).first()
        return auth_record and auth_record.authenticated

    def upload_backup(self, zip_filepath):
        try:
            file_metadata = {
                'name': os.path.basename(zip_filepath),
                'mimeType': 'application/zip'
            }
            media = MediaFileUpload(zip_filepath, mimetype='application/zip')

            file = self.service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            
        except Exception as e:
            print(f"Upload failed: {str(e)}")


# Create shared instance
google_drive_service = None

def schedule_backup(backup_time):
    """Schedule daily backup at the given HH:MM time."""
    try:
        
        hour, minute = map(int, backup_time.split(':'))
        job_id = 'daily_backup'

        # Remove old job if exists
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        
        # Schedule new job
        scheduler.add_job(
            func=perform_backup,
            trigger='cron',
            hour=hour,
            minute=minute,
            id=job_id,
            replace_existing=True
        )
        
        
    except Exception as e:
        print(f"Error scheduling backup: {str(e)}")

  # adjust if backup_database is elsewhere

def perform_backup():
    """Perform backup and upload to Google Drive."""
    try:
        zip_filename = backup_database()
        zip_filepath = os.path.join(
            current_app.config.get('UPLOAD_FOLDER', 'uploads'),
            zip_filename
        )
        google_drive_service.upload_backup(zip_filepath)
    except Exception as e:
        print(f"Scheduled backup failed: {str(e)}")

def schedule_backup(scheduler, app, backup_time="20:00"):
    hour, minute = map(int, backup_time.split(":"))

    # clear old job if exists
    if scheduler.get_job("google_drive_backup"):
        scheduler.remove_job("google_drive_backup")

    # store the actual app instance (not LocalProxy)
    real_app = app._get_current_object()

    def job():
        with real_app.app_context():
            perform_backup()

    scheduler.add_job(
        job,
        trigger="cron",
        hour=hour,
        minute=minute,
        id="google_drive_backup",
        replace_existing=True
    )

def setup_backup_scheduler():
    """Start the scheduler on app startup."""
    try:
        if not scheduler.running:
            scheduler.start()
            
    except Exception as e:
        print(f"Error starting scheduler: {str(e)}")
        