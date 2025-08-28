import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useOfflineOperations } from '@/hooks/useOfflineOperations';

export const OfflineStatus = () => {
  const { status, forceSync } = useOfflineOperations();

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Connection Status */}
      <Badge variant={status.isOnline ? "default" : "destructive"} className="flex items-center gap-1">
        {status.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {status.isOnline ? 'Online' : 'Offline'}
      </Badge>

      {/* Pending Operations */}
      {status.pendingOperations > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {status.pendingOperations} pending
        </Badge>
      )}

      {/* Sync Button */}
      {status.isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={forceSync}
          disabled={status.isSyncing}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${status.isSyncing ? 'animate-spin' : ''}`} />
          {status.isSyncing ? 'Syncing...' : 'Sync'}
        </Button>
      )}

      {/* Last Sync Time */}
      {status.lastSync && (
        <span className="text-muted-foreground text-xs">
          Last sync: {status.lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};