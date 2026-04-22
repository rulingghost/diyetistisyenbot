import { logs } from './logsStore.js';

export default function handler(req, res) {
  res.status(200).json({
    total_logs_saved: logs.length,
    recent_events: logs
  });
}
