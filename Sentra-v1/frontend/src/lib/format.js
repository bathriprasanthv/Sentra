export const fmtRisk = (n) => Math.round(n).toString();
export const fmtDrift = (n) => n.toFixed(3);
export const fmtML = (n) => n.toFixed(3);
export const fmtRPM = (n) => n.toFixed(0);

export const fmtTime = (epochSec) =>
  new Date(epochSec * 1000).toLocaleTimeString('en-GB', { hour12: false });

export const fmtTimeShort = (epochSec) =>
  new Date(epochSec * 1000).toLocaleTimeString('en-GB', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export const fmtRelative = (epochSec) => {
  const sec = Math.floor(Date.now() / 1000 - epochSec);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

export const fmtDuration = (sec) => {
  if (sec < 60) return `${sec.toFixed(0)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
};

export const shortId = (id, len = 16) =>
  id && id.length > len ? id.slice(0, len) + '…' : id;

export const statusLower = (status) =>
  (status || '').toLowerCase();

export const responseLabel = {
  ALLOW: 'Allow',
  MONITOR: 'Monitor',
  VERIFY: 'Re-verify',
  RESTRICT: 'Restrict',
};