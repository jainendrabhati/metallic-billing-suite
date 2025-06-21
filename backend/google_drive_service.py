import os
import pickle
import json
from app import app
from datetime import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from models import db, GoogleDriveSettings
from utils import backup_database
from flask import current_app
import schedule
import time
import threading

# Scopes for Google Drive API
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class GoogleDriveService:
    def __init__(self):
        self.service = None
        self.credentials = None
        self.current_email = None
        
    def authenticate(self, email, credentials_json=None):
        """Authenticate with Google Drive using OAuth2 for specific email"""
        try:
            creds = None
            # Use email-specific token file
            token_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), f'gdrive_token_{email}.pickle')
            
            # Load existing credentials if available for this email
            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    creds = pickle.load(token)
            
            # If no valid credentials, initiate OAuth flow
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    # You need to provide credentials.json file from Google Cloud Console
                    credentials_file = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'credentials.json')
                    
                    if not os.path.exists(credentials_file):
                        raise Exception("Google Drive credentials not found. Please provide credentials.json file.")
                    
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save credentials for this email
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
            
            self.credentials = creds
            self.current_email = email
            self.service = build('drive', 'v3', credentials=creds)
            
            print(f"Google Drive authenticated successfully for {email}")
            return True
            
        except Exception as e:
            print(f"Authentication error for {email}: {str(e)}")
            return False
    
    def upload_backup(self, file_path, filename):
        """Upload backup file to Google Drive for current authenticated user"""
        try:
            if not self.service:
                raise Exception("Google Drive not authenticated")
            
            if not self.current_email:
                raise Exception("No authenticated email found")
            
            # Create folder for backups if it doesn't exist
            folder_name = f"Metalic Jewelry Backups - {self.current_email}"
            folder_id = self._get_or_create_folder(folder_name)
            
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }
            
            media = MediaFileUpload(file_path, resumable=True)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            print(f"Backup uploaded to Google Drive for {self.current_email}: {file.get('id')}")
            return file.get('id')
            
        except Exception as e:
            print(f"Upload error for {self.current_email}: {str(e)}")
            raise e
    
    def _get_or_create_folder(self, folder_name):
        """Get existing folder or create new one"""
        try:
            # Search for existing folder
            results = self.service.files().list(
                q=f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder'",
                spaces='drive'
            ).execute()
            
            folders = results.get('files', [])
            
            if folders:
                return folders[0]['id']
            else:
                # Create new folder
                file_metadata = {
                    'name': folder_name,
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                folder = self.service.files().create(body=file_metadata, fields='id').execute()
                return folder.get('id')
                
        except Exception as e:
            print(f"Folder creation error: {str(e)}")
            raise e

# Global Google Drive service instance
google_drive_service = GoogleDriveService()

def perform_auto_backup():
    """Perform automatic backup to Google Drive"""
    
    with app.app_context():
    
        print("Starting automatic backup...")
        
        # Get Google Drive settings
        settings = GoogleDriveSettings.query.first()
        if not settings or not settings.auto_backup_enabled or not settings.email:
            print("Auto backup not enabled or email not configured")
            return
        
        # Authenticate with Google Drive for the configured email
        if not google_drive_service.authenticate(settings.email):
            print(f"Failed to authenticate with Google Drive for {settings.email}")
            return
        
        # Create backup
        zip_filename = backup_database()
        zip_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], zip_filename)
        
        # Upload to Google Drive
        file_id = google_drive_service.upload_backup(zip_filepath, zip_filename)
        
        # Update last backup time
        settings.last_backup = datetime.utcnow()
        db.session.commit()
        
        # Clean up local file
        if os.path.exists(zip_filepath):
            os.remove(zip_filepath)
        
        print(f"Auto backup completed successfully for {settings.email}: {file_id}")
        
    

def setup_backup_scheduler():
    """Setup the backup scheduler"""
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    # Start scheduler in a separate thread
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

def schedule_backup(backup_time):
    """Schedule daily backup at specified time"""
    schedule.clear()  # Clear existing schedules
    schedule.every().day.at(backup_time).do(perform_auto_backup)
    print(f"Backup scheduled daily at {backup_time}")