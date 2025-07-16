import os
import pickle
from datetime import datetime
from flask import current_app
from apscheduler.schedulers.background import BackgroundScheduler
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from googleapiclient.http import MediaFileUpload

from utils import backup_database

# Scheduler instance
scheduler = BackgroundScheduler()
scheduler.start()

# Scopes for Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class GoogleDriveService:
    def __init__(self):
        self.creds = None
        self.service = None

    def authenticate(self, email):
        try:
            credentials_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'credentials.json')
            token_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'gdrive_token.pickle')

            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    self.creds = pickle.load(token)

            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
                    self.creds = flow.run_local_server(port=0)

                # Save the credentials for future use
                with open(token_path, 'wb') as token:
                    pickle.dump(self.creds, token)

            self.service = build('drive', 'v3', credentials=self.creds)
            return True
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return False

    def upload_backup(self, zip_filepath):
        try:
            file_metadata = {
                'name': os.path.basename(zip_filepath),
                'mimeType': 'application/zip'
            }
            media = MediaFileUpload(zip_filepath, mimetype='application/zip')

            file = self.service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            print(f"Backup uploaded to Google Drive. File ID: {file.get('id')}")
        except Exception as e:
            print(f"Upload failed: {str(e)}")


# Create shared instance
google_drive_service = GoogleDriveService()

def schedule_backup(backup_time):
    """Schedule daily backup at the given HH:MM time."""
    try:
        print(1)
        hour, minute = map(int, backup_time.split(':'))
        job_id = 'daily_backup'

        # Remove old job if exists
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        print(2)
        # Schedule new job
        scheduler.add_job(
            func=perform_backup,
            trigger='cron',
            hour=hour,
            minute=minute,
            id=job_id,
            replace_existing=True
        )
        
        print(f"Backup scheduled daily at {backup_time}")
    except Exception as e:
        print(f"Error scheduling backup: {str(e)}")

def perform_backup():
    """Perform backup and upload to Google Drive."""
    try:
        print(3)
        zip_filename = backup_database()
        print(4)
        zip_filepath = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), zip_filename)
        print(5)
        google_drive_service.upload_backup(zip_filepath)
    except Exception as e:
        print(f"Scheduled backup failed: {str(e)}")

def setup_backup_scheduler():
    """Start the scheduler on app startup."""
    try:
        if not scheduler.running:
            scheduler.start()
            print("Backup scheduler started.")
    except Exception as e:
        print(f"Error starting scheduler: {str(e)}")
        
        

