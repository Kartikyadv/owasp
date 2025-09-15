import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Search, Download, Shield, AlertTriangle, Info, Bug, Play, Eye, Plus, ChevronDown } from 'lucide-react';
import { scansApi, issuesApi, statsApi, exportApi, scanApi } from '../services/api';
import { Scan, Issue, Stats } from '../types';
import RunScanModal, { ScanConfig } from './RunScanModal';
import ActiveScans from './ActiveScans';
import CompletedScans from './CompletedScans';
import { useToast } from './ui/toast';

const Dashboard: React.FC = () => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [showRunScanModal, setShowRunScanModal] = useState(false);
  const [activeScans, setActiveScans] = useState<any[]>([]);
  const [completedScans, setCompletedScans] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'scans'>('dashboard');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [displayedIssuesCount, setDisplayedIssuesCount] = useState(20);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterIssues();
  }, [issues, searchTerm, severityFilter]);

  useEffect(() => {
    // Reset displayed count when filters change
    setDisplayedIssuesCount(20);
  }, [searchTerm, severityFilter]);

  const loadData = async () => {
    try {
      const [scansData, issuesData, statsData, activeScansData, completedScansData] = await Promise.all([
        scansApi.getAll(),
        issuesApi.getAll(),
        statsApi.get(),
        scanApi.getActiveScans(),
        scanApi.getCompletedScans()
      ]);
      setScans(scansData);
      setIssues(issuesData);
      setStats(statsData);
      setActiveScans(activeScansData);
      setCompletedScans(completedScansData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIssues = () => {
    let filtered = issues;

    if (searchTerm) {
      filtered = filtered.filter(issue =>
        issue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.severity === severityFilter);
    }

    if (targetFilter) {
      filtered = filtered.filter(issue =>
        issue.url.toLowerCase().includes(targetFilter.toLowerCase())
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(issue => new Date(issue.created_at) >= filterDate);
      }
    }

    // Sort issues
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'severity':
          const severityOrder = { 'high': 3, 'medium': 2, 'low': 1, 'info': 0 };
          aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0;
          bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'url':
          aValue = a.url.toLowerCase();
          bValue = b.url.toLowerCase();
          break;
        default: // date
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredIssues(filtered);
  };

  const handleLoadMore = () => {
    setDisplayedIssuesCount(prev => Math.min(prev + 20, filteredIssues.length));
  };

  const handleStartScan = async (config: ScanConfig) => {
    try {
      const response = await scanApi.startScan(config);
      // Refresh active scans
      const activeScansData = await scanApi.getActiveScans();
      setActiveScans(activeScansData);
      
      toast({
        title: 'Scan Started',
        description: `Security scan "${config.scanName}" has been initiated`,
        variant: 'default'
      });
      
      setShowRunScanModal(false);
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: 'Failed to start the security scan',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handlePauseScan = async (scanId: string) => {
    try {
      await scanApi.pauseScan(scanId);
      const activeScansData = await scanApi.getActiveScans();
      setActiveScans(activeScansData);
      toast({
        title: 'Scan Paused',
        description: 'The security scan has been paused',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause scan',
        variant: 'destructive'
      });
    }
  };

  const handleResumeScan = async (scanId: string) => {
    try {
      await scanApi.resumeScan(scanId);
      const activeScansData = await scanApi.getActiveScans();
      setActiveScans(activeScansData);
      toast({
        title: 'Scan Resumed',
        description: 'The security scan has been resumed',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resume scan',
        variant: 'destructive'
      });
    }
  };

  const handleStopScan = async (scanId: string) => {
    try {
      await scanApi.stopScan(scanId);
      const [activeScansData, completedScansData] = await Promise.all([
        scanApi.getActiveScans(),
        scanApi.getCompletedScans()
      ]);
      setActiveScans(activeScansData);
      setCompletedScans(completedScansData);
      toast({
        title: 'Scan Stopped',
        description: 'The security scan has been stopped',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop scan',
        variant: 'destructive'
      });
    }
  };

  const handleViewScan = (scanId: string) => {
    // Navigate to detailed scan view
    console.log('View scan:', scanId);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await exportApi.exportData(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `security_issues.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Successful',
        description: `Issues exported as ${format.toUpperCase()}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleHeaderClick = (filterType: string, value: string) => {
    setSelectedFilter(filterType);
    setFilterValue(value);
    
    // Apply the filter based on type
    switch (filterType) {
      case 'severity':
        setSeverityFilter(value);
        break;
      case 'status':
        // Filter by scan status
        break;
      case 'total':
        // Show all scans
        setSeverityFilter('all');
        setDateFilter('all');
        setTargetFilter('');
        break;
    }
    
    toast({
      title: 'Filter Applied',
      description: `Showing ${filterType}: ${value}`,
      variant: 'default'
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Shield className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'high' as const;
      case 'medium': return 'medium' as const;
      case 'low': return 'low' as const;
      default: return 'info' as const;
    }
  };

  const chartData = stats ? [
    { name: 'High', value: stats.high_severity, color: '#ef4444' },
    { name: 'Medium', value: stats.medium_severity, color: '#f97316' },
    { name: 'Low', value: stats.low_severity, color: '#eab308' },
    { name: 'Info', value: stats.info_severity, color: '#3b82f6' },
  ] : [];

  // Generate dynamic trend data from actual issues
  const generateTrendData = () => {
    if (!issues.length) return [];
    
    const now = new Date();
    const weeks = [];
    
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const weekIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= weekStart && issueDate < weekEnd;
      });
      
      weeks.push({
        name: `Week ${7-i}`,
        issues: weekIssues.length,
        date: weekStart.toISOString().split('T')[0]
      });
    }
    
    return weeks;
  };
  
  const trendData = generateTrendData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold">OWASP ZAP Security Dashboard</h1>
            <p className="text-muted-foreground">Monitor your application security with OWASP ZAP</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-2">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'ghost'}
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Dashboard
            </Button>
            
            {/* Active Scans Dropdown */}
            <div className="relative group">
              <Button
                variant={currentView === 'scans' ? 'default' : 'ghost'}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Active Scans ({activeScans.length})
                <ChevronDown className="h-3 w-3" />
              </Button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 mb-2 px-2">ACTIVE SCANS</div>
                  {activeScans.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-gray-500 text-center">
                      No active scans running
                    </div>
                  ) : (
                    activeScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="px-2 py-2 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setCurrentView('scans');
                          // Optional: scroll to specific scan
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {scan.name || 'Unnamed Scan'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {scan.targetUrl || scan.target_url}
                            </div>
                          </div>
                          <div className="ml-2 text-right">
                            <div className="text-xs font-medium text-blue-600">
                              {scan.progress || 0}%
                            </div>
                            <div className="text-xs text-gray-400">
                              {scan.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start text-xs"
                      onClick={() => setCurrentView('scans')}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      View All Scans
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowRunScanModal(true)}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Run Scan
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {currentView === 'dashboard' && (
        <>
          {/* Active & Completed Scans Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActiveScans
              scans={activeScans}
              onPauseScan={handlePauseScan}
              onResumeScan={handleResumeScan}
              onStopScan={handleStopScan}
            />
            <CompletedScans
              scans={completedScans}
              onViewScan={handleViewScan}
            />
          </div>
        </>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleHeaderClick('total', 'all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_scans || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.recent_scans || 0} in the last 7 days
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleHeaderClick('issues', 'all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_issues || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all scans
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleHeaderClick('severity', 'high')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.high_severity || 0}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleHeaderClick('severity', 'medium')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium Severity</CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats?.medium_severity || 0}</div>
              <p className="text-xs text-muted-foreground">
                Should be addressed soon
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Issue Distribution</CardTitle>
              <CardDescription>Breakdown by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    onClick={(data) => {
                      if (data && data.name) {
                        setSeverityFilter(data.name.toLowerCase());
                        setSelectedFilter('severity');
                        setFilterValue(data.name);
                        toast({
                          title: 'Filter Applied',
                          description: `Filtering by ${data.name} severity issues`,
                          variant: 'default'
                        });
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Issue Trends</CardTitle>
              <CardDescription>Issues discovered over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="issues" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filter Display */}
      {selectedFilter && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Active Filter</Badge>
                  <span className="text-sm font-medium">
                    {selectedFilter === 'severity' && `Showing ${filterValue} severity issues`}
                    {selectedFilter === 'total' && 'Showing all scans and issues'}
                    {selectedFilter === 'issues' && 'Showing all issues'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFilter('');
                    setFilterValue('');
                    setSeverityFilter('all');
                    setDateFilter('all');
                    setTargetFilter('');
                  }}
                >
                  Clear Filter
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Enhanced Issues Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>ZAP Security Alerts</CardTitle>
            <CardDescription>
              Detailed view of all discovered vulnerabilities and alerts from OWASP ZAP
            </CardDescription>
            
            {/* Enhanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>

              <Input
                placeholder="Filter by target..."
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
              />

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background flex-1"
                >
                  <option value="date">Sort by Date</option>
                  <option value="severity">Sort by Severity</option>
                  <option value="name">Sort by Name</option>
                  <option value="url">Sort by URL</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Remediation</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.slice(0, displayedIssuesCount).map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div>
                          <div className="font-semibold">{issue.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {issue.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={issue.url}>
                        {issue.url}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.confidence}</Badge>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <div className="text-sm line-clamp-2" title={issue.description}>
                        {issue.description}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <div className="text-sm line-clamp-2 text-blue-600" title={issue.remediation}>
                        {issue.remediation}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredIssues.length > displayedIssuesCount && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {displayedIssuesCount} of {filteredIssues.length} issues
                </p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={handleLoadMore}>
                  Load More Issues
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Run Scan Modal */}
      <RunScanModal
        open={showRunScanModal}
        onOpenChange={setShowRunScanModal}
        onStartScan={handleStartScan}
      />
    </motion.div>
  );
};

export default Dashboard;
