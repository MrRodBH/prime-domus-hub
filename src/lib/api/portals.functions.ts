export {
  getPortalConnectorRegistry,
  listTenantPortalConnectors,
  getTenantPortalConnector,
  saveTenantPortalConnector,
  setTenantPortalConnectorState,
  rotateTenantPortalCredentialReference,
  listTenantPortalMappings,
  saveTenantPortalMapping,
  enqueueTenantPortalPublication,
  enqueueTenantPortalUnpublication,
  retryTenantPortalJob,
  cancelTenantPortalJob,
  reconcileTenantPortalPublication,
  listTenantPortalJobs,
  getTenantPortalJob,
  listTenantPortalAttempts,
  listTenantPortalLogs,
  generateTenantPortalManualExport,
  getTenantPortalDashboard,
  getTenantPortalDiagnostics,
  DEFAULT_PORTAL_MAPPING,
} from "@/lib/api/tenant-portal.functions";

// Read-only compatibility aliases. There is no parallel implementation.
export {
  getPortalConnectorRegistry as obterContratoPortais,
  listTenantPortalConnectors as listarPortais,
  getTenantPortalDashboard as dashboardPortais,
  listTenantPortalLogs as listarLogsPortal,
} from "@/lib/api/tenant-portal.functions";

// Direct connector/token mutations were intentionally removed. The canonical
// paths are saveTenantPortalConnector, setTenantPortalConnectorState and
// rotateTenantPortalCredentialReference. Plaintext feed_token/webhook_secret
// are prohibited and never returned to the client.
