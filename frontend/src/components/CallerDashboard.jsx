import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  CheckCircle2, 
  CalendarClock, 
  ChevronRight, 
  TrendingUp, 
  Clock,
  PhoneCall
} from 'lucide-react';

const CallerDashboard = ({ leadsList, onSelectLead }) => {
  const { user } = useAuth();

  // 1. Filter leads assigned only to this caller
  const myLeads = leadsList.filter(l => l.assigned_to?.id === user.id);
  const myConversions = myLeads.filter(l => l.status === 'Converted');
  const myPendingFollowUps = myLeads.filter(l => {
    // Lead is in follow-up status OR has an upcoming follow_up_date
    return l.status === 'Follow-up' || (l.follow_up_date && l.status !== 'Converted' && l.status !== 'Not Interested');
  });

  // Calculate personal conversion rate
  const conversionRate = myLeads.length > 0 ? ((myConversions.length / myLeads.length) * 100).toFixed(1) : 0;

  // Filter urgent upcoming follow-ups
  const upcomingFollowUps = myLeads
    .filter(l => l.follow_up_date && l.status !== 'Converted' && l.status !== 'Not Interested')
    .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date))
    .slice(0, 5); // top 5 immediate ones

  // Helper to format date strings cleanly
  const formatFollowUp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    
    // Check if same day
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Helper check if follow-up is overdue
  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Header */}
      <div className="glass-panel p-6 rounded-2xl border flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-slate-500 mt-1">Here is a summary of your sales portfolio and reminders.</p>
        </div>
        <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
          Sales Agent
        </div>
      </div>

      {/* Personal Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Assigned Leads */}
        <div className="glass-card p-6 rounded-2xl border flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Assigned Leads</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{myLeads.length}</h3>
            <span className="text-2xs text-slate-400 dark:text-slate-500">Leads assigned to your roster</span>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
        </div>

        {/* My Conversions */}
        <div className="glass-card p-6 rounded-2xl border flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">My Conversions</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{myConversions.length}</h3>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <TrendingUp size={10} />
              {conversionRate}% Conversion Rate
            </span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Pending Follow-ups */}
        <div className="glass-card p-6 rounded-2xl border flex items-center justify-between shadow-xs">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Pending Actions</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{myPendingFollowUps.length}</h3>
            <span className="text-2xs text-slate-400 dark:text-slate-500">Scheduled reminders & pipeline tasks</span>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CalendarClock size={24} />
          </div>
        </div>

      </div>

      {/* Main Layout: Reminders & Performance Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Urgent Follow-up Reminders */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs xl:col-span-2">
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Schedule Reminders</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">Upcoming scheduled callbacks</p>

          <div className="space-y-4">
            {upcomingFollowUps.map((lead) => {
              const overdue = isOverdue(lead.follow_up_date);
              return (
                <div 
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all duration-150 cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg text-white ${overdue ? 'bg-rose-500 shadow-rose-500/20 shadow-md animate-pulse' : 'bg-blue-600 shadow-blue-500/20 shadow-md'}`}>
                      <PhoneCall size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lead.name}
                      </h4>
                      <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">{lead.course} • {lead.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="text-right">
                      <span className={`text-xs font-bold block ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-300'}`}>
                        {formatFollowUp(lead.follow_up_date)}
                      </span>
                      <span className="text-4xs font-semibold uppercase tracking-wider text-slate-400">
                        {overdue ? 'OVERDUE CALLBACK' : 'UPCOMING'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}

            {upcomingFollowUps.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No active follow-ups scheduled. Good job!
              </div>
            )}
          </div>
        </div>

        {/* Sales Performance Index Widget */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs">
          <h3 className="font-bold text-slate-950 dark:text-white text-base">Conversion Progress</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-6">Target conversion indicators</p>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* SVG Ring Progress Bar */}
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="72" 
                  cy="72" 
                  r="60" 
                  className="stroke-slate-200 dark:stroke-slate-850" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="60" 
                  className="stroke-emerald-500" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={376.8}
                  strokeDashoffset={376.8 - (376.8 * conversionRate) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-extrabold text-slate-950 dark:text-white">{conversionRate}%</span>
                <span className="text-4xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Success Rate</span>
              </div>
            </div>
            
            <div className="w-full mt-6 space-y-2">
              <div className="flex justify-between text-2xs font-medium text-slate-500">
                <span>Leads Converted:</span>
                <span className="font-bold text-slate-900 dark:text-white">{myConversions.length} / {myLeads.length}</span>
              </div>
              <div className="flex justify-between text-2xs font-medium text-slate-500">
                <span>Leads Lost:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {myLeads.filter(l => l.status === 'Not Interested').length}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CallerDashboard;
