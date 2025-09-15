import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Clock, Target, Zap, Pause, Play, Square } from 'lucide-react';
import { Button } from './ui/button';

interface ActiveScan {
  id: string;
  name: string;
  targetUrl: string;
  status: 'running' | 'paused' | 'queued';
  progress: number;
  startTime: string;
  estimatedCompletion?: string;
  issuesFound: number;
  currentPhase: string;
}

interface ActiveScansProps {
  scans: ActiveScan[];
  onPauseScan: (scanId: string) => void;
  onResumeScan: (scanId: string) => void;
  onStopScan: (scanId: string) => void;
}

const ActiveScans: React.FC<ActiveScansProps> = ({ 
  scans, 
  onPauseScan, 
  onResumeScan, 
  onStopScan 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'queued': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Zap className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'queued': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (scans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active scans running</p>
            <p className="text-sm">Start a new scan to see progress here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Active Scans ({scans.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scans.map((scan, index) => (
          <motion.div
            key={scan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{scan.name}</h4>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(scan.status)} text-white border-0`}
                  >
                    <div className="flex items-center gap-1">
                      {getStatusIcon(scan.status)}
                      {scan.status.toUpperCase()}
                    </div>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {scan.targetUrl}
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1">
                {scan.status === 'running' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPauseScan(scan.id)}
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                )}
                {scan.status === 'paused' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResumeScan(scan.id)}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStopScan(scan.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Square className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {scan.currentPhase} • {scan.progress}% complete
                </span>
                <span className="text-muted-foreground">
                  {scan.issuesFound} issues found
                </span>
              </div>
              <Progress value={scan.progress} className="h-2" />
            </div>

            {/* Timing Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Running for {formatDuration(scan.startTime)}</span>
              {scan.estimatedCompletion && (
                <span>Est. completion: {scan.estimatedCompletion}</span>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ActiveScans;
