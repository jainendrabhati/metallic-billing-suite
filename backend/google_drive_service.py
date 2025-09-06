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
from models import GoogleDriveAuth, db

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
            """Authenticate with Google Drive for a specific email"""
            auth_record = (GoogleDriveAuth.query.filter_by(email=email).order_by(GoogleDriveAuth.id.desc()).first())

            
            if auth_record and auth_record.credentials:
                try:
                    # Try to use stored credentials
                    self.creds = self._decrypt_credentials(auth_record.credentials)
                    
                    # Refresh if expired
                    if not self.creds.expired:
                        test_service = build('drive', 'v3', credentials=self.creds)
                        test_service.about().get(fields="user").execute()
                        self.service = test_service
                        return True
                    
                    # If expired, try to refresh
                    if self.creds.refresh_token:
                        self.creds.refresh(Request())
                        # Test refreshed credentials
                        test_service = build('drive', 'v3', credentials=self.creds)
                        test_service.about().get(fields="user").execute()
                        
                        # Update stored credentials
                        auth_record.credentials = self._encrypt_credentials(self.creds)
                        auth_record.authenticated = True
                        db.session.commit()
                        
                        self.service = test_service
                        return True
                    
                except Exception as stored_creds_error:
                    # Clear invalid credentials and force fresh authentication
                    if auth_record:
                        auth_record.credentials = None
                        auth_record.authenticated = False
                        db.session.commit()
                    # Fall through to re-authenticate
            
            # Fresh authentication
            credentials_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'credentials.json')
            if not os.path.exists(credentials_path):
                raise Exception(f"Google credentials.json file not found at {credentials_path}")
            
            # Use a specific port range to avoid conflicts
            import random
            port = random.randint(8080, 8090)
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
                # Add additional parameters for better OAuth flow
                flow.redirect_uri = f'http://localhost:{port}/'
                self.creds = flow.run_local_server(
                    port=port,
                    prompt='select_account',  # Always show account selection
                    access_type='offline',    # Get refresh token
                    include_granted_scopes='true'
                )
                
                # Test the new credentials
                test_service = build('drive', 'v3', credentials=self.creds)
                user_info = test_service.about().get(fields="user").execute()
                actual_email = user_info.get('user', {}).get('emailAddress', '')
                
                # Verify the authenticated email matches
                if actual_email.lower() != email.lower():
                    raise Exception(f"Authenticated with {actual_email} but expected {email}")
                
            except Exception as oauth_error:
                raise Exception(f"OAuth authentication failed: {str(oauth_error)}")
            
            # Store encrypted credentials in database
            encrypted_creds = self._encrypt_credentials(self.creds)
            
            if auth_record:
                auth_record.credentials = encrypted_creds
                auth_record.authenticated = True
                auth_record.updated_at = datetime.utcnow()
            else:
                auth_record = GoogleDriveAuth(
                    email=email,
                    credentials=encrypted_creds,
                    authenticated=True
                )
                db.session.add(auth_record)
            
            db.session.commit()
            self.service = build('drive', 'v3', credentials=self.creds)
            return True
            
        except Exception as e:
            error_msg = f"Authentication failed for {email}: {str(e)}"
            
            # Mark as not authenticated in database
            if auth_record:
                auth_record.authenticated = False
                auth_record.credentials = None
                db.session.commit()
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
            return


# Create shared instance
google_drive_service = None

  # adjust if backup_database is elsewhere

def perform_backup():
    """Perform backup and upload to Google Drive."""
    try:
        from flask import current_app
        with current_app.app_context():
        # Get the authenticated email from database
            auth_record = GoogleDriveAuth.query.order_by(GoogleDriveAuth.id.desc()).first()
            if not auth_record:
                return
                
            # Initialize service and authenticate with stored credentials
            backup_service = GoogleDriveService()
            success = backup_service.authenticate(auth_record.email)
            
            if not success:
                return
                
            # Create and upload backup
            zip_filename = backup_database()
            zip_filepath = os.path.join(
                current_app.config.get('UPLOAD_FOLDER', 'uploads'),
                zip_filename
            )
            backup_service.upload_backup(zip_filepath)
            
    except Exception as e:
        return


def schedule_daily_backup(scheduler, app, backup_time="20:00"):
    """Schedule daily backup at specified time"""
    try:
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
        
    except Exception as e:
        return

def setup_backup_scheduler():
    """Start the scheduler on app startup."""
    try:
        if not scheduler.running:
            scheduler.start()
            
        # Check if there's an authenticated user with auto backup enabled
        from models import GoogleDriveAuth
        auth_record = GoogleDriveAuth.query.filter_by(authenticated=True, auto_backup_enabled=True).order_by(GoogleDriveAuth.id.desc()).first()
        if auth_record and auth_record.backup_time:
            from flask import current_app
            schedule_daily_backup(scheduler, current_app, auth_record.backup_time)
            
    except Exception as e:
        return
