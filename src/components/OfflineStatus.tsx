import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHybridAPI } from '@/hooks/useHybridAPI';
import { Wifi, WifiOff, RefreshCw, Server, ServerOff } from 'lucide-react';

export const OfflineStatus = () => {
  const { isLocalServerAvailable, isCheckingServer, forceServerCheck } = useHybridAPI();
  const isOnline = navigator.onLine;

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Internet Status */}
      <Badge variant={isOnline ? "default" : "secondary"} className="flex items-center gap-1">
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isOnline ? 'Internet' : 'No Internet'}
      </Badge>

      {/* Local Server Status */}
      <Badge variant={isLocalServerAvailable ? "default" : "destructive"} className="flex items-center gap-1">
        {isLocalServerAvailable ? <Server className="h-3 w-3" /> : <ServerOff className="h-3 w-3" />}
        {isLocalServerAvailable ? 'Server' : 'Server Down'}
      </Badge>

      {/* Server Check Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={forceServerCheck}
        disabled={isCheckingServer}
        className="h-7 px-2"
      >
        <RefreshCw className={`h-3 w-3 ${isCheckingServer ? 'animate-spin' : ''}`} />
        {isCheckingServer ? 'Checking...' : 'Check Server'}
      </Button>

      {/* Status Message */}
      <span className="text-muted-foreground text-xs">
        {isLocalServerAvailable 
          ? '✅ Data synced with local database' 
          : '⚠️ Using cached data only'
        }
      </span>
    </div>
  );
};
