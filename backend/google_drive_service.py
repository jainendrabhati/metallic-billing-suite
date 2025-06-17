
import os
import pickle
import json
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
        
    def authenticate(self, email, credentials_json=None):
        """Authenticate with Google Drive using OAuth2"""
        try:
            creds = None
            token_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'gdrive_token.pickle')
            
            # Load existing credentials if available
            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    creds = pickle.load(token)
            
            # If no valid credentials, initiate OAuth flow
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    # You need to provide credentials.json file from Google Cloud Console
                    # This would typically be downloaded from Google Cloud Console
                    credentials_file = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'credentials.json')
                    
                    if not os.path.exists(credentials_file):
                        # Create a basic credentials structure - user needs to provide their own
                        raise Exception("Google Drive credentials not found. Please provide credentials.json file.")
                    
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save credentials for next run
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
            
            self.credentials = creds
            self.service = build('drive', 'v3', credentials=creds)
            return True
            
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return False
    
    def upload_backup(self, file_path, filename):
        """Upload backup file to Google Drive"""
        try:
            if not self.service:
                raise Exception("Google Drive not authenticated")
            
            # Create folder for backups if it doesn't exist
            folder_name = "Metalic Jewelry Backups"
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
            
            print(f"Backup uploaded to Google Drive: {file.get('id')}")
            return file.get('id')
            
        except Exception as e:
            print(f"Upload error: {str(e)}")
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
    try:
        print("Starting automatic backup...")
        
        # Get Google Drive settings
        settings = GoogleDriveSettings.query.first()
        if not settings or not settings.auto_backup_enabled:
            print("Auto backup not enabled")
            return
        
        # Authenticate with Google Drive
        if not google_drive_service.authenticate(settings.email):
            print("Failed to authenticate with Google Drive")
            return
        
        # Create backup
        zip_filename = backup_database()
        zip_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], zip_filename)
        
        # Upload to Google Drive
        file_id = google_drive_service.upload_backup(zip_filepath, zip_filename)
        
        # Clean up local file
        if os.path.exists(zip_filepath):
            os.remove(zip_filepath)
        
        print(f"Auto backup completed successfully: {file_id}")
        
    except Exception as e:
        print(f"Auto backup failed: {str(e)}")

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
