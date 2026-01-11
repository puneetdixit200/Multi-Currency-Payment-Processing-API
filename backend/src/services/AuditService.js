import AuditLog from '../models/AuditLog.js';

/**
 * Audit Service - Compliance-grade logging
 */

export const logAction = async (data) => AuditLog.log(data);

export const logSecurity = async (action, actor, details, severity = 'warning') => {
  return AuditLog.logSecurity(action, actor, details, severity);
};

export const searchAuditLogs = async (filters, options = {}) => {
  return AuditLog.search(filters, options);
};

export const getAuditLog = async (id) => AuditLog.findById(id).lean();

export const getResourceAuditTrail = async (resourceType, resourceId, options = {}) => {
  return searchAuditLogs({ resourceType, resourceId }, options);
};

export const getComplianceReport = async (dateRange = {}) => {
  const startDate = dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = dateRange.endDate || new Date();
  
  const [totalLogs, byCategory, bySeverity] = await Promise.all([
    AuditLog.countDocuments({ timestamp: { $gte: startDate, $lte: endDate } }),
    AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ])
  ]);
  
  return { period: { startDate, endDate }, totalLogs, byCategory, bySeverity };
};

export const logChange = async (action, category, actor, resource, before, after) => {
  const changedFields = [];
  if (before && after) {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    }
  }
  return logAction({ action, category, actor, resource, changes: { before, after, fields: changedFields } });
};

export default { logAction, logSecurity, searchAuditLogs, getAuditLog, getComplianceReport, logChange };
