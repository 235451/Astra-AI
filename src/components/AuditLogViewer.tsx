/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Search, HelpCircle } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    const term = search.toLowerCase();
    return (
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-4 gap-3 shadow-xl overflow-hidden max-h-[360px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Institutional Compliance Logs
            </h3>
            <p className="text-[9px] font-mono text-slate-500 mt-0.5">
              Secure Audit Trail Records for ASTRA-X
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Filter audit logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
        />
        <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2.5" />
      </div>

      {/* Actual Logs display feed */}
      <div className="flex flex-col gap-1.5 grow overflow-y-auto pr-1 scrollbar-thin max-h-[220px]">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 bg-slate-950 border border-slate-850/80 rounded font-mono text-[9px] text-slate-400 flex flex-col gap-1 transition hover:border-slate-800"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300 uppercase">{log.action}</span>
                <span className="text-[8px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-tight font-sans">{log.details}</p>
              <div className="flex justify-between items-center text-[8px] text-slate-600 pt-0.5 mt-0.5 border-t border-slate-900/50">
                <span>Actor: {log.user}</span>
                <span>Node: {log.ip}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 text-[10px] font-mono">
            No audit records found matching query.
          </div>
        )}
      </div>
    </div>
  );
};
