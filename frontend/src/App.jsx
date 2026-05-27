import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, API_BASE_URL } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import AdminDashboard from './components/AdminDashboard';
import CallerDashboard from './components/CallerDashboard';
import LeadsView from './components/LeadsView';
import UsersView from './components/UsersView';
import LeadModal from './components/LeadModal';
import { Menu, Wifi, WifiOff, Loader } from 'lucide-react';

const DashboardApp = () => {
  const { user, token, loading, error: authError } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Data States
  const [leadsList, setLeadsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Real-time Connection State
  const [isLive, setIsLive] = useState(false);

  // Fetch Leads List (filtered on backend by Role)
  const fetchLeads = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLeadsList(data);
      }
    } catch (err) {
      console.error('Fetch leads error:', err);
    }
  };

  // Fetch User accounts (Admin only)
  const fetchUsers = async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const loadAllData = async () => {
    if (!token) return;
    setDataLoading(true);
    await Promise.all([fetchLeads(), fetchUsers()]);
    setDataLoading(false);
  };

  // Realtime Live Subscription via SSE (Server-Sent Events)
  useEffect(() => {
    if (!token || !user) return;

    // Load initial data first
    loadAllData();

    // Establish Server-Sent Events stream
    const sseUrl = `${API_BASE_URL.replace('/api', '')}/api/realtime?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('SSE Real-time connection established.');
      setIsLive(true);
    };

    eventSource.onerror = (err) => {
      console.warn('SSE Real-time connection error. Retrying...', err);
      setIsLive(false);
    };

    // Receive message
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        if (type === 'CONNECTED') {
          return;
        }

        console.log(`Real-time update received [${type}]:`, data);

        // Update leads list in-place instantly
        if (type === 'LEAD_CREATED') {
          // Verify if caller account can see it
          if (user.role === 'caller' && data.assigned_to !== user.id) return;
          
          setLeadsList(prev => {
            // Check if already in list
            if (prev.some(lead => lead.id === data.id)) return prev;
            return [data, ...prev];
          });
        } 
        else if (type === 'LEAD_UPDATED') {
          // If assigned to someone else and caller account, remove it
          if (user.role === 'caller' && data.assigned_to !== user.id) {
            setLeadsList(prev => prev.filter(lead => lead.id !== data.id));
            if (selectedLeadId === data.id) {
              setSelectedLeadId(null);
              alert('Lead assignment has changed. This file is no longer in your directory.');
            }
            return;
          }

          setLeadsList(prev => prev.map(lead => lead.id === data.id ? { ...lead, ...data } : lead));
        } 
        else if (type === 'LEAD_DELETED') {
          setLeadsList(prev => prev.filter(lead => lead.id !== data.id));
          if (selectedLeadId === data.id) {
            setSelectedLeadId(null);
            alert('Lead file has been deleted by an Administrator.');
          }
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    return () => {
      eventSource.close();
      setIsLive(false);
    };
  }, [token, user]);

  // If auth is loading, display spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin text-blue-500" size={36} />
          <span className="text-sm font-semibold tracking-wider uppercase text-slate-400">Restoring sessions...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, render login view
  if (!user) {
    return <Login />;
  }

  // Update lead list callback from modal updates
  const handleLeadUpdated = (updatedLead) => {
    // Update local list
    setLeadsList(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Operational Dashboard';
      case 'leads': return 'Leads Directory';
      case 'callers': return 'Caller Account Control';
      default: return 'CRM Leadflow';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 transition-colors duration-300 flex">
      
      {/* Sidebar (handles layout on desktop + drawer on mobile) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen">
        
        {/* Workspace Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white/75 dark:bg-slate-950/75 backdrop-blur-md border-b border-slate-150 dark:border-slate-850/60 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-950 dark:text-white tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          {/* Sync Connection Status indicator */}
          <div className="flex items-center gap-4">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-semibold uppercase tracking-wider border select-none transition-all duration-300 ${
              isLive 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20'
            }`}>
              {isLive ? (
                <>
                  <Wifi size={10} className="animate-pulse" />
                  Live Sync
                </>
              ) : (
                <>
                  <WifiOff size={10} />
                  Offline
                </>
              )}
            </div>
          </div>
        </header>

        {/* Workspace views content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {dataLoading && leadsList.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                user.role === 'admin' ? (
                  <AdminDashboard leadsList={leadsList} />
                ) : (
                  <CallerDashboard leadsList={leadsList} onSelectLead={(lead) => setSelectedLeadId(lead.id)} />
                )
              )}

              {activeTab === 'leads' && (
                <LeadsView 
                  leads={leadsList} 
                  callersList={usersList} 
                  onSelectLead={(lead) => setSelectedLeadId(lead.id)} 
                  onRefresh={loadAllData} 
                />
              )}

              {activeTab === 'callers' && user.role === 'admin' && (
                <UsersView users={usersList} onRefresh={loadAllData} />
              )}
            </>
          )}
        </div>

      </main>

      {/* LEAD DETAILS SLIDER MODAL */}
      <LeadModal 
        leadId={selectedLeadId} 
        isOpen={selectedLeadId !== null} 
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={handleLeadUpdated}
        callersList={usersList.filter(u => u.role === 'caller')}
      />

    </div>
  );
};

// Root orchestration wrapper
const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DashboardApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
