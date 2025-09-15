export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Scan {
  id: string;
  name: string;
  target_url: string;
  status: 'completed' | 'running' | 'failed' | 'queued';
  created_at: string;
  completed_at?: string;
}

export interface Issue {
  id: string;
  scan_id: string;
  name: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  confidence: 'certain' | 'firm' | 'tentative';
  url: string;
  description: string;
  remediation: string;
  created_at: string;
}

export interface Stats {
  total_scans: number;
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  info_severity: number;
  recent_scans: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
