"use client";

import React, { useState } from 'react';
import { UserState, SystemLog, AgentType } from '../types';
import { ShieldCheck, Mail, Calendar, CheckSquare, Terminal, Activity, Wifi, Database, Cloud, Code } from 'lucide-react';
import { checkSupabaseConnection } from '../lib/supabase';
import { SCHEMA_SQL } from '../lib/db/schema';

interface SidebarProps {
  userState: UserState;
  logs: SystemLog[];
  onConnect: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userState, logs, onConnect }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code'>('dashboard');
  const [dbStatus, setDbStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  React.useEffect(() => {
    checkSupabaseConnection().then(res => {
        setDbStatus(res.ok ? 'connected' : 'error');
    });
  }, []);

  return (
    <div className="w-full md:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full text-slate-300 font-sans">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900 z-10">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="w-6 h-6 text-green-500" />
                Man Friday
                </h1>
                <p className="text-xs text-slate-500">Cloud-Native Architect</p>
            </div>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`p-1.5 rounded ${activeTab === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Activity size={16} />
                </button>
                <button 
                    onClick={() => setActiveTab('code')}
                    className={`p-1.5 rounded ${activeTab === 'code' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    <Code size={16} />
                </button>
            </div>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
            {/* Cloud Status */}
            <div className="p-5 border-b border-slate-800 space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Infrastructure</h2>
                
                {/* Database */}
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            <Database size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Supabase DB</p>
                            <p className="text-xs text-slate-400">
                                {dbStatus === 'connected' ? 'Connected (ascoyvax...)' : 'Connection Failed'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Google Auth */}
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${userState.googleConnected ? 'bg-blue-500/20 text-blue-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                    <Cloud size={16} />
                    </div>
                    <div>
                    <p className="text-sm font-medium text-white">Google Cloud</p>
                    <p className="text-xs text-slate-400">{userState.googleConnected ? 'OAuth Token Active' : 'No Token Found'}</p>
                    </div>
                </div>
                {!userState.googleConnected && (
                    <button 
                    onClick={onConnect}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors font-medium"
                    >
                    Connect
                    </button>
                )}
                </div>
            </div>

            {/* System Logs */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/30">
                <div className="p-4 bg-slate-900 sticky top-0 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Activity size={14} /> Live Traces
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Mainnet</span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
                {logs.length === 0 ? (
                    <div className="text-center text-slate-600 py-10 flex flex-col items-center">
                        <Wifi className="mb-2 opacity-20" size={32} />
                        Waiting for webhook events...
                    </div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="group flex gap-3 opacity-90 hover:opacity-100 transition-opacity">
                            <div className="flex flex-col items-center">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${log.status === 'error' ? 'bg-red-500' : log.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                {idx !== logs.length - 1 && <div className="w-px h-full bg-slate-800 my-1"></div>}
                            </div>
                            <div className="pb-2">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="font-bold text-slate-300">{log.agent}</span>
                                    <span className="text-[10px] text-slate-600">{log.timestamp.toLocaleTimeString()}</span>
                                </div>
                                <p className={`font-medium mb-1 ${log.status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                                    {log.action}
                                </p>
                                <p className="text-slate-500 break-all bg-slate-900/50 p-1.5 rounded border border-slate-800/50">
                                    {log.details}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                </div>
            </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-0 bg-[#1e1e1e]">
            <div className="p-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white mb-2">Backend Schema (Drizzle)</h3>
                <p className="text-xs text-slate-400">Deploy this SQL to Supabase to initialize the database.</p>
            </div>
            <pre className="p-4 text-[10px] font-mono text-blue-300 overflow-x-auto whitespace-pre">
                {SCHEMA_SQL}
            </pre>
            <div className="p-4 border-t border-b border-white/10 bg-slate-800">
                <h3 className="text-sm font-semibold text-white">API Routes</h3>
            </div>
            <div className="p-4">
                <p className="text-xs text-slate-400 mb-2">/app/api/webhook/route.ts</p>
                <div className="text-[10px] font-mono text-green-300">
                    // Handles Twilio POST requests<br/>
                    // Verifies Signature<br/>
                    // Orchestrates Gemini Agent<br/>
                    // (See file app/api/webhook/route.ts)
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;