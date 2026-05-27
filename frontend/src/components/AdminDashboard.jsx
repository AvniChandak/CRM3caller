import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  Users, 
  DollarSign, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  FolderSync,
  Activity,
  AlertCircle
} from 'lucide-react';

const AdminDashboard = ({ leadsList }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to retrieve analytics metrics.');
      }
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch analytics whenever the parent's leadsList changes (for real-time consistency)
  useEffect(() => {
    fetchAnalytics();
  }, [leadsList]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <FolderSync size={32} className="text-blue-500 animate-spin" />
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Computing analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-3 max-w-lg mx-auto my-10">
        <AlertCircle size={20} />
        <div>
          <h4 className="font-bold">Error loading analytics</h4>
          <p className="text-xs mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const {
    totalLeads = 0,
    totalConversions = 0,
    totalRevenue = 0,
    callerPerformance = [],
    leadsBySource = [],
    leadsByStatus = []
  } = analytics || {};

  // Formatter for currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Safe percentage helper
  const calcRate = (part, total) => {
    if (!total) return 0;
    return ((part / total) * 100).toFixed(1);
  };

  // Colors mapping for status badges
  const statusColors = {
    'New': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'Contacted': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Interested': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    'Follow-up': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    'Converted': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Not Interested': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Leads */}
        <div className="glass-card p-6 rounded-2xl border flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Leads</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalLeads}</h3>
            <span className="text-2xs text-slate-400 dark:text-slate-500">From all acquisition channels</span>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
        </div>

        {/* Conversions */}
        <div className="glass-card p-6 rounded-2xl border flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Conversions</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalConversions}</h3>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <TrendingUp size={10} />
              {calcRate(totalConversions, totalLeads)}% Conversion Rate
            </span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BarChart3 size={24} />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="glass-card p-6 rounded-2xl border flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Revenue</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</h3>
            <span className="text-2xs text-slate-400 dark:text-slate-500">Completed conversion receipts</span>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <DollarSign size={24} />
          </div>
        </div>

      </div>

      {/* Main Charts & Table Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Caller Performance Matrix */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white text-base">Caller Performance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Performance index of active team callers</p>
            </div>
            <button 
              onClick={fetchAnalytics}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Refresh Table
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 pr-4">Sales Caller</th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center">Converted</th>
                  <th className="py-3 px-4">Conversion Rate</th>
                  <th className="py-3 pl-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {callerPerformance.map((caller) => (
                  <tr key={caller.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs">
                          {caller.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white block">{caller.name}</span>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${caller.active ? 'bg-emerald-500' : 'bg-slate-400'} mr-1.5`}></span>
                          <span className="text-3xs text-slate-400 uppercase font-semibold">{caller.active ? 'Active' : 'Deactivated'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-900 dark:text-white">{caller.totalAssigned}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-900 dark:text-white">{caller.conversions}</td>
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full" 
                            style={{ width: `${Math.min(caller.conversionRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white w-8">{caller.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 pl-4 text-right font-extrabold text-slate-950 dark:text-white">
                      {formatCurrency(caller.revenue)}
                    </td>
                  </tr>
                ))}
                {callerPerformance.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No sales caller accounts created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Source Distribution (Pie Chart Style using SVG) */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs">
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Lead Channels</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">Distribution by acquisition source</p>

          <div className="flex flex-col items-center justify-center min-h-[180px]">
            {leadsBySource.length > 0 ? (
              <div className="w-full space-y-4">
                {leadsBySource.map((src, index) => {
                  const percent = ((src.count / totalLeads) * 100).toFixed(0);
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];
                  const colorClass = colors[index % colors.length];

                  return (
                    <div key={src.source} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
                          {src.source}
                        </span>
                        <span>{src.count} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${colorClass}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-slate-400">No source data available</span>
            )}
          </div>
        </div>

      </div>

      {/* Second Row: Leads by Status & Activities Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Leads by Status (Bar Chart Style using HTML/CSS) */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs xl:col-span-1">
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Pipeline Status</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">Leads mapped by pipeline stage</p>

          <div className="space-y-4.5">
            {leadsByStatus.map((stat) => {
              const maxCount = Math.max(...leadsByStatus.map(s => s.count), 1);
              const barWidth = ((stat.count / maxCount) * 100).toFixed(0);

              return (
                <div key={stat.status} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium text-slate-500 truncate">{stat.status}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 overflow-hidden relative">
                    <div 
                      className="bg-blue-500/10 dark:bg-blue-500/20 border-l-2 border-blue-500 h-full transition-all duration-500" 
                      style={{ width: `${barWidth}%` }}
                    ></div>
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-3xs font-bold text-slate-700 dark:text-slate-300">
                      {stat.count} leads
                    </span>
                  </div>
                </div>
              );
            })}
            {leadsByStatus.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No leads status data.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities Timeline Feed */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-white text-base">Activity Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time team audit logs</p>
            </div>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
              <Activity size={16} />
            </span>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[300px] pr-2">
            {analytics.recentActivities && analytics.recentActivities.length > 0 ? (
              analytics.recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-4 text-xs relative">
                  <div className="mt-1 flex items-center justify-center p-1.5 rounded-lg bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    <Clock size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 dark:text-slate-300">
                      <span className="font-semibold text-slate-950 dark:text-white">{act.userName}</span>: {act.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-3xs text-slate-400 font-medium">
                      <span>Lead: {act.leadName}</span>
                      <span>•</span>
                      <span>{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400">
                No active events logged in this session.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
