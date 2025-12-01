import React from 'react';
import { UserState, SystemLog, AgentType } from '../types';
import { ShieldCheck, Mail, Calendar, CheckSquare, Terminal, Activity, Wifi } from 'lucide-react';

interface SidebarProps {
  userState: UserState;
  logs: SystemLog[];
  onConnect: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userState, logs, onConnect }) => {
  return (
    <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-6 h-6 text-green-500" />
          Man Friday
        </h1>
        <p className="text-xs text-slate-500 mt-1">Full-Stack Agent Simulator</p>
      </div>

      {/* Connection Status */}
      <div className="p-6 border-b border-slate-800 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Integrations</h2>
        
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${userState.googleConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Google Workspace</p>
              <p className="text-xs text-slate-400">{userState.googleConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
          {!userState.googleConnected && (
            <button 
              onClick={onConnect}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
            >
              Auth
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
            <div className={`flex flex-col items-center justify-center p-2 rounded bg-slate-800/50 ${userState.googleConnected ? 'opacity-100' : 'opacity-40'}`}>
                <Mail size={16} className="mb-1 text-blue-400" />
                <span className="text-[10px]">Gmail</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-2 rounded bg-slate-800/50 ${userState.googleConnected ? 'opacity-100' : 'opacity-40'}`}>
                <Calendar size={16} className="mb-1 text-orange-400" />
                <span className="text-[10px]">Cal</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-2 rounded bg-slate-800/50 ${userState.googleConnected ? 'opacity-100' : 'opacity-40'}`}>
                <CheckSquare size={16} className="mb-1 text-purple-400" />
                <span className="text-[10px]">Tasks</span>
            </div>
        </div>
      </div>

      {/* System Logs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 sticky top-0 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Activity size={14} /> Live Agent Logs
            </h2>
            <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center text-slate-600 py-10">
                <Wifi className="mx-auto mb-2 opacity-50" />
                No activity yet.
            </div>
          ) : (
            logs.map((log, idx) => (
                <div key={idx} className="border-l-2 border-slate-700 pl-3 py-1 relative">
                    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-slate-700"></div>
                    <div className="flex justify-between text-slate-500 mb-1">
                        <span>{log.agent}</span>
                        <span>{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className={`font-medium ${log.status === 'error' ? 'text-red-400' : 'text-blue-300'}`}>
                        {log.action}
                    </p>
                    <p className="text-slate-400 mt-1 truncate opacity-80">{log.details}</p>
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;