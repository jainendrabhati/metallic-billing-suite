"""
Offline support utilities for the Flask backend.
This module provides database operations and local data management
when running in Electron mode without internet connectivity.
"""

import os
import sqlite3
import json
from datetime import datetime
from pathlib import Path

class OfflineDatabase:
    def __init__(self, db_path=None):
        if db_path is None:
            # Use the same database path as the main app
            db_path = os.path.join(os.path.dirname(__file__), 'instance', 'test.db')
        self.db_path = db_path
        self.ensure_database_exists()

    def ensure_database_exists(self):
        """Ensure the database file exists and create if necessary."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        if not os.path.exists(self.db_path):
            # Database will be created when first connection is made
            pass

    def get_connection(self):
        """Get a database connection."""
        return sqlite3.connect(self.db_path)

    def is_database_accessible(self):
        """Check if the database is accessible."""
        try:
            conn = self.get_connection()
            conn.execute('SELECT 1')
            conn.close()
            return True
        except Exception as e:
            return False

    def backup_data_to_json(self, backup_dir=None):
        """Backup all data to JSON files for offline access."""
        if backup_dir is None:
            backup_dir = os.path.join(os.path.dirname(__file__), 'offline_backup')
        
        os.makedirs(backup_dir, exist_ok=True)
        
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Tables to backup
            tables = ['customers', 'bills', 'transactions', 'employees', 'expenses', 'settings', 'stock']
            
            backup_data = {
                'timestamp': datetime.now().isoformat(),
                'tables': {}
            }
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT * FROM {table}")
                    columns = [description[0] for description in cursor.description]
                    rows = cursor.fetchall()
                    
                    table_data = []
                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        # Convert any datetime objects to strings
                        for key, value in row_dict.items():
                            if isinstance(value, datetime):
                                row_dict[key] = value.isoformat()
                        table_data.append(row_dict)
                    
                    backup_data['tables'][table] = table_data
                    
                    
                except sqlite3.OperationalError as e:
                    
                    backup_data['tables'][table] = []
            
            # Save backup data
            backup_file = os.path.join(backup_dir, 'offline_backup.json')
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2, default=str)
            
            conn.close()
            return backup_file
            
        except Exception as e:
            return None

    def load_backup_data(self, backup_dir=None):
        """Load backup data from JSON files."""
        if backup_dir is None:
            backup_dir = os.path.join(os.path.dirname(__file__), 'offline_backup')
        
        backup_file = os.path.join(backup_dir, 'offline_backup.json')
        
        if not os.path.exists(backup_file):
            return None
        
        try:
            with open(backup_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            return None

    def get_offline_dashboard_data(self):
        """Get dashboard data for offline mode."""
        backup_data = self.load_backup_data()
        if not backup_data:
            return self._get_empty_dashboard_data()
        
        try:
            bills = backup_data['tables'].get('bills', [])
            customers = backup_data['tables'].get('customers', [])
            transactions = backup_data['tables'].get('transactions', [])
            expenses = backup_data['tables'].get('expenses', [])
            
            # Calculate today's statistics
            today = datetime.now().date().isoformat()
            today_bills = [b for b in bills if b.get('date', '').startswith(today)]
            
            # Calculate statistics
            total_bills_today = len(today_bills)
            debit_bills_today = len([b for b in today_bills if b.get('payment_type') == 'debit'])
            credit_bills_today = len([b for b in today_bills if b.get('payment_type') == 'credit'])
            
            total_debit_amount_today = sum([b.get('total_amount', 0) for b in today_bills if b.get('payment_type') == 'debit'])
            total_credit_amount_today = sum([b.get('total_amount', 0) for b in today_bills if b.get('payment_type') == 'credit'])
            
            # Stock-wise statistics
            stock_statistics = {}
            for bill in bills:
                item = bill.get('item', 'Other')
                if item not in stock_statistics:
                    stock_statistics[item] = {
                        'total_debit_fine': 0,
                        'total_credit_fine': 0,
                        'total_debit_amount': 0,
                        'total_credit_amount': 0
                    }
                
                if bill.get('payment_type') == 'debit':
                    stock_statistics[item]['total_debit_fine'] += bill.get('total_fine', 0)
                    stock_statistics[item]['total_debit_amount'] += bill.get('total_amount', 0)
                else:
                    stock_statistics[item]['total_credit_fine'] += bill.get('total_fine', 0)
                    stock_statistics[item]['total_credit_amount'] += bill.get('total_amount', 0)
            
            # Today's stock statistics
            today_stock_statistics = {}
            for bill in today_bills:
                item = bill.get('item', 'Other')
                if item not in today_stock_statistics:
                    today_stock_statistics[item] = {
                        'total_debit_fine': 0,
                        'total_credit_fine': 0
                    }
                
                if bill.get('payment_type') == 'debit':
                    today_stock_statistics[item]['total_debit_fine'] += bill.get('total_fine', 0)
                else:
                    today_stock_statistics[item]['total_credit_fine'] += bill.get('total_fine', 0)
            
            return {
                'recent_transactions': transactions[:5],
                'pending_customers': [],  # Would need special calculation
                'current_stock': backup_data['tables'].get('stock', []),
                'recent_bills': bills[:5],
                'totals': {
                    'customers': len(customers),
                    'bills': len(bills),
                    'transactions': len(transactions),
                    'expenses': sum([e.get('amount', 0) for e in expenses])
                },
                'today_statistics': {
                    'total_bills': total_bills_today,
                    'debit_bills': debit_bills_today,
                    'credit_bills': credit_bills_today,
                    'total_debit_amount': total_debit_amount_today,
                    'total_credit_amount': total_credit_amount_today,
                    'stock_wise_fine': today_stock_statistics
                },
                'all_time_statistics': {
                    'stock_wise_statistics': stock_statistics
                },
                'offline_mode': True,
                'backup_timestamp': backup_data.get('timestamp')
            }
            
        except Exception as e:
            return self._get_empty_dashboard_data()

    def _get_empty_dashboard_data(self):
        """Return empty dashboard data structure."""
        return {
            'recent_transactions': [],
            'pending_customers': [],
            'current_stock': [],
            'recent_bills': [],
            'totals': {
                'customers': 0,
                'bills': 0,
                'transactions': 0,
                'expenses': 0
            },
            'today_statistics': {
                'total_bills': 0,
                'debit_bills': 0,
                'credit_bills': 0,
                'total_debit_amount': 0,
                'total_credit_amount': 0,
                'stock_wise_fine': {}
            },
            'all_time_statistics': {
                'stock_wise_statistics': {}
            },
            'offline_mode': True,
            'no_data': True
        }

# Global instance
offline_db = OfflineDatabase()

def setup_offline_support():
    """Setup offline support by creating backup data."""
    try:
        backup_file = offline_db.backup_data_to_json()
        if backup_file:
            return backup_file
        else:
            return None
    except Exception as e:
        return None

def get_offline_dashboard():
    """Get dashboard data for offline mode."""
    return offline_db.get_offline_dashboard_data()

if __name__ == "__main__":
    # Test the offline support
    setup_offline_support()
    data = get_offline_dashboard()