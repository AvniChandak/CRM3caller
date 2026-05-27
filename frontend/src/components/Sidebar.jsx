import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  LogOut, 
  Sun, 
  Moon, 
  Sparkles,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'caller']
    },
    {
      id: 'leads',
      label: 'Leads Directory',
      icon: PhoneCall,
      roles: ['admin', 'caller']
    },
    {
      id: 'callers',
      label: 'Caller Accounts',
      icon: Users,
      roles: ['admin'] // Only admin can access caller management
    }
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center">
            LeadFlow<span className="text-emerald-400 font-medium text-xs ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">CRM</span>
          </h1>
          <span className="text-3xs text-slate-400 uppercase tracking-widest block font-semibold mt-0.5">Coaching Pro</span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500/80 text-white shadow-md shadow-blue-600/10' 
                  : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile section */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        {/* Theme switcher */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
          <span className="text-xs font-medium text-slate-300 ml-2">Theme Mode</span>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-150 cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-400" />}
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-white border border-slate-800 uppercase">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">{user?.name}</h4>
            <span className="text-4xs font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
              {user?.role === 'admin' ? 'Administrator' : 'Sales Caller'}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 font-medium text-xs border border-slate-800/50 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (visible on click) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          ></div>

          {/* Drawer contents */}
          <div className="relative flex flex-col w-64 max-w-xs h-full bg-slate-900 shadow-xl transition-transform duration-300 transform translate-x-0">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
