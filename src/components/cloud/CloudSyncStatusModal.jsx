import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Cloud, Upload, Download, RefreshCw } from "lucide-react";

/**
 * CloudSyncStatusModal
 * 
 * Props:
 *   open: bool
 *   onClose: fn
 *   status: 'loading' | 'success' | 'error'
 *   action: 'uploaded' | 'restored' | 'syncing' | null
 *   timestamp: number | null  (unix ms)
 *   error: string | null
 *   detail: string | null     (extra info line)
 */
export default function CloudSyncStatusModal({ open, onClose, status, action, timestamp, error, detail }) {
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const actionIcon = () => {
    if (isLoading) return <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />;
    if (isError) return <XCircle className="w-8 h-8 text-red-400" />;
    if (action === 'restored') return <Download className="w-8 h-8 text-emerald-400" />;
    if (action === 'uploaded') return <Upload className="w-8 h-8 text-cyan-400" />;
    return <Cloud className="w-8 h-8 text-cyan-400" />;
  };

  const actionLabel = () => {
    if (isLoading) return "Syncing with Cloud...";
    if (isError) return "Cloud Sync Failed";
    if (action === 'restored') return "Data Restored from Cloud";
    if (action === 'uploaded') return "Data Saved to Cloud";
    return "Cloud Sync Complete";
  };

  const formattedTimestamp = timestamp
    ? new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-cyan-900/40 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 flex items-center gap-2">
            <Cloud className="w-4 h-4" /> Cloud Data Sync
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          {actionIcon()}
          <div className="text-sm font-semibold text-slate-200 text-center">{actionLabel()}</div>
        </div>

        {isLoading && (
          <div className="bg-slate-900/60 rounded-lg p-3 text-xs text-slate-400 text-center animate-pulse">
            Communicating with server...
          </div>
        )}

        {isSuccess && (
          <div className="space-y-2">
            <div className="bg-slate-900/60 border border-cyan-900/30 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Success
                </span>
              </div>
              {formattedTimestamp && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">Timestamp:</span>
                  <span className="text-slate-200 text-right font-mono">{formattedTimestamp}</span>
                </div>
              )}
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Action:</span>
                <span className="text-cyan-300">{action === 'restored' ? 'Cloud → Device' : 'Device → Cloud'}</span>
              </div>
              {detail && (
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">Detail:</span>
                  <span className="text-slate-400 text-right">{detail}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {isError && (
          <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-500 shrink-0">Status:</span>
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Failed
              </span>
            </div>
            {error && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 shrink-0">Reason:</span>
                <span className="text-red-300 text-right">{error}</span>
              </div>
            )}
            <p className="text-slate-500 pt-1">Check your internet connection and try again.</p>
          </div>
        )}

        {!isLoading && (
          <Button
            onClick={onClose}
            className="w-full bg-cyan-700 hover:bg-cyan-600 mt-1"
          >
            OK
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}