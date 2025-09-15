import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, AlertTriangle, Shield, Info, Clock, Target, Eye } from 'lucide-react';
import { Button } from './ui/button';

interface CompletedScan {
  id: string;
  name: string;
  targetUrl: string;
  completedAt: string;
  duration: string;
  totalIssues: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

interface CompletedScansProps {
  scans: CompletedScan[];
  onViewScan: (scanId: string) => void;
}

const CompletedScans: React.FC<CompletedScansProps> = ({ scans, onViewScan }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <Shield className="h-3 w-3" />;
      case 'low': return <Info className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-orange-500 bg-orange-50';
      case 'low': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getOverallRisk = (counts: CompletedScan['severityCounts']) => {
    if (counts.critical > 0) return { level: 'Critical', color: 'bg-red-500' };
    if (counts.high > 0) return { level: 'High', color: 'bg-red-400' };
    if (counts.medium > 0) return { level: 'Medium', color: 'bg-orange-400' };
    if (counts.low > 0) return { level: 'Low', color: 'bg-yellow-400' };
    return { level: 'Clean', color: 'bg-green-500' };
  };

  if (scans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Latest Completed Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No completed scans yet</p>
            <p className="text-sm">Run your first scan to see results here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Latest Completed Scans
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scans.slice(0, 5).map((scan, index) => {
          const risk = getOverallRisk(scan.severityCounts);
          
          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{scan.name}</h4>
                    <Badge className={`${risk.color} text-white border-0`}>
                      {risk.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {scan.targetUrl}
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewScan(scan.id)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  View
                </Button>
              </div>

              {/* Severity Summary */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {Object.entries(scan.severityCounts).map(([severity, count]) => (
                  <div
                    key={severity}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-xs ${getSeverityColor(severity)}`}
                  >
                    {getSeverityIcon(severity)}
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {scan.duration}
                  </span>
                  <span>{scan.totalIssues} total issues</span>
                </div>
                <span>{formatTimeAgo(scan.completedAt)}</span>
              </div>
            </motion.div>
          );
        })}
        
        {scans.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm">
              View All Completed Scans ({scans.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompletedScans;
