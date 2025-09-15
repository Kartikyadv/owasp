import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Play, Settings, Globe, Layers } from 'lucide-react';
import { useToast } from './ui/toast';

interface RunScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartScan: (scanConfig: ScanConfig) => void;
}

export interface ScanConfig {
  targetUrl: string;
  scanName: string;
  depth: number;
  scope: 'domain' | 'subdomain' | 'path';
  scanTypes: string[];
}

const RunScanModal: React.FC<RunScanModalProps> = ({ open, onOpenChange, onStartScan }) => {
  const [config, setConfig] = useState<ScanConfig>({
    targetUrl: '',
    scanName: '',
    depth: 3,
    scope: 'domain',
    scanTypes: ['crawl', 'audit']
  });
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.targetUrl || !config.scanName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsStarting(true);
    try {
      await onStartScan(config);
      toast({
        title: 'Scan Started',
        description: `Security scan "${config.scanName}" has been initiated`,
        variant: 'success'
      });
      onOpenChange(false);
      setConfig({
        targetUrl: '',
        scanName: '',
        depth: 3,
        scope: 'domain',
        scanTypes: ['crawl', 'audit']
      });
    } catch (error: any) {
      // Handle specific error responses from backend
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to start scan. Please try again.';
      
      toast({
        title: 'Scan Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleScanTypeToggle = (type: string) => {
    setConfig(prev => ({
      ...prev,
      scanTypes: prev.scanTypes.includes(type)
        ? prev.scanTypes.filter(t => t !== type)
        : [...prev.scanTypes, type]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Run Security Scan
          </DialogTitle>
          <DialogDescription>
            Configure and start a new security scan on your target application
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Configuration */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Target Configuration
              </h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Target URL *</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={config.targetUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, targetUrl: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Scan Name *</label>
                <Input
                  placeholder="My Security Scan"
                  value={config.scanName}
                  onChange={(e) => setConfig(prev => ({ ...prev, scanName: e.target.value }))}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Scan Options */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Scan Options
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Crawl Depth</label>
                  <select
                    value={config.depth}
                    onChange={(e) => setConfig(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value={1}>Shallow (1 level)</option>
                    <option value={3}>Medium (3 levels)</option>
                    <option value={5}>Deep (5 levels)</option>
                    <option value={10}>Extensive (10 levels)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Scope</label>
                  <select
                    value={config.scope}
                    onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="path">Current path only</option>
                    <option value="domain">Entire domain</option>
                    <option value="subdomain">Domain + subdomains</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Scan Types</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'crawl', label: 'Content Discovery', icon: Layers },
                    { id: 'audit', label: 'Vulnerability Audit', icon: Settings },
                    { id: 'passive', label: 'Passive Analysis', icon: Globe }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleScanTypeToggle(id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                        config.scanTypes.includes(id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isStarting}
              className="flex items-center gap-2"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Starting Scan...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Scan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RunScanModal;
