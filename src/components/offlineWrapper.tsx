import React, { useEffect, useState } from 'react';
import { useOfflineOperations } from '../hooks/useOfflineOperations';
import { toast } from 'sonner';

interface OfflineWrapperProps {
  children: React.ReactNode;
}

export const OfflineWrapper: React.FC<OfflineWrapperProps> = ({ children }) => {
  const { status, forceSync } = useOfflineOperations();
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    setShowOfflineBanner(!status.isOnline);
  }, [status.isOnline]);

  const handleSync = async () => {
    try {
      await forceSync();
      toast.success('Data synced successfully!');
    } catch (error) {
      toast.error('Failed to sync data');
    }
  };

  return (
    <div className="offline-wrapper">
      {showOfflineBanner && (
        <div className="offline-banner bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Offline Mode:</strong> You are currently offline. 
                  {status.pendingOperations > 0 && (
                    <span className="ml-2">
                      {status.pendingOperations} operation(s) pending sync.
                    </span>
                  )}
                </p>
              </div>
            </div>
            {status.isOnline && status.pendingOperations > 0 && (
              <button
                onClick={handleSync}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
                disabled={status.isSyncing}
              >
                {status.isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Status indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
          status.isOnline 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            status.isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {status.isOnline ? 'Online' : 'Offline'}
          {status.pendingOperations > 0 && (
            <span className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
              {status.pendingOperations}
            </span>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};