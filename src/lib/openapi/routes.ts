/**
 * Agrobase V3 — OpenAPI Route Definitions
 */

export interface RouteMethod {
  method: string
  summary: string
  description?: string
  params?: Array<{ name: string; in: string; required: boolean; schema: Record<string, string> }>
  requestBody?: { required: boolean; content: Record<string, unknown> }
  responses: Record<string, { description: string; content?: Record<string, unknown> }>
}

export interface RouteDef {
  path: string
  tag: string
  methods: RouteMethod[]
}

const ok = (desc: string) => ({ '200': { description: desc } })
const created = (desc: string) => ({ '201': { description: desc } })

export const ROUTE_DEFINITIONS: RouteDef[] = [
  // AUTH
  { path: '/api/auth/login', tag: 'Authentication', methods: [{ method: 'post', summary: 'Login', responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } } }] },
  { path: '/api/auth/register', tag: 'Authentication', methods: [{ method: 'post', summary: 'Register new user', responses: created('User registered') }] },

  // FARMERS
  { path: '/api/farmers', tag: 'Farmers', methods: [
    { method: 'get', summary: 'List farmers', responses: ok('Paginated farmer list') },
    { method: 'post', summary: 'Create farmer', responses: created('Farmer created') },
  ] },
  { path: '/api/farmers/{id}', tag: 'Farmers', methods: [
    { method: 'get', summary: 'Get farmer by ID', responses: ok('Farmer details') },
    { method: 'put', summary: 'Update farmer', responses: ok('Farmer updated') },
  ] },

  // PURCHASES
  { path: '/api/purchases', tag: 'Purchases', methods: [
    { method: 'get', summary: 'List purchases', responses: ok('Paginated purchase list') },
    { method: 'post', summary: 'Create purchase', responses: created('Purchase created') },
  ] },

  // VSLA
  { path: '/api/vsla/groups', tag: 'VSLA', methods: [
    { method: 'get', summary: 'List VSLA groups', responses: ok('Group list') },
    { method: 'post', summary: 'Create VSLA group', responses: created('Group created') },
  ] },

  // MARKETPLACE
  { path: '/api/marketplace/listings', tag: 'Marketplace', methods: [
    { method: 'get', summary: 'List marketplace listings', responses: ok('Listings') },
    { method: 'post', summary: 'Create listing', responses: created('Listing created') },
  ] },

  // INVENTORY
  { path: '/api/inventory/warehouses', tag: 'Inventory', methods: [
    { method: 'get', summary: 'List warehouses', responses: ok('Warehouse list') },
    { method: 'post', summary: 'Create warehouse', responses: created('Warehouse created') },
  ] },
  { path: '/api/inventory/stock', tag: 'Inventory', methods: [
    { method: 'get', summary: 'List stock items', responses: ok('Stock list') },
    { method: 'post', summary: 'Add stock item', responses: created('Stock item added') },
  ] },
  { path: '/api/inventory/stock/receive', tag: 'Inventory', methods: [{ method: 'post', summary: 'Receive stock', responses: created('Stock received') }] },
  { path: '/api/inventory/stock/dispatch', tag: 'Inventory', methods: [{ method: 'post', summary: 'Dispatch stock', responses: created('Stock dispatched') }] },
  { path: '/api/inventory/stock/movements', tag: 'Inventory', methods: [{ method: 'get', summary: 'Stock movement history', responses: ok('Movement history') }] },

  // QUALITY
  { path: '/api/quality/grades', tag: 'Quality', methods: [
    { method: 'get', summary: 'List grade definitions', responses: ok('Grade list') },
    { method: 'post', summary: 'Create grade definition', responses: created('Grade created') },
  ] },
  { path: '/api/quality/inspections', tag: 'Quality', methods: [
    { method: 'get', summary: 'List quality inspections', responses: ok('Inspection list') },
    { method: 'post', summary: 'Create inspection', responses: created('Inspection created') },
  ] },

  // CONTRACTS
  { path: '/api/contracts', tag: 'Contracts', methods: [
    { method: 'get', summary: 'List contracts', responses: ok('Contract list') },
    { method: 'post', summary: 'Create contract', responses: created('Contract created') },
  ] },
  { path: '/api/contracts/{id}', tag: 'Contracts', methods: [
    { method: 'get', summary: 'Get contract details', responses: ok('Contract details') },
    { method: 'put', summary: 'Update contract', responses: ok('Contract updated') },
    { method: 'delete', summary: 'Cancel contract', responses: ok('Contract cancelled') },
  ] },
  { path: '/api/contracts/{id}/milestones', tag: 'Contracts', methods: [
    { method: 'get', summary: 'List milestones', responses: ok('Milestones') },
    { method: 'post', summary: 'Add milestone', responses: created('Milestone added') },
  ] },
  { path: '/api/contracts/{id}/performance', tag: 'Contracts', methods: [{ method: 'get', summary: 'Performance metrics', responses: ok('Performance data') }] },

  // LOGISTICS
  { path: '/api/logistics/vehicles', tag: 'Logistics', methods: [
    { method: 'get', summary: 'List vehicles', responses: ok('Vehicle list') },
    { method: 'post', summary: 'Register vehicle', responses: created('Vehicle registered') },
  ] },
  { path: '/api/logistics/shipments', tag: 'Logistics', methods: [
    { method: 'get', summary: 'List shipments', responses: ok('Shipment list') },
    { method: 'post', summary: 'Create shipment', responses: created('Shipment created') },
  ] },

  // PARTNERS
  { path: '/api/partners', tag: 'Partners', methods: [
    { method: 'get', summary: 'List partners', responses: ok('Partner list') },
    { method: 'post', summary: 'Register partner', responses: created('Partner registered') },
  ] },
  { path: '/api/partners/{id}', tag: 'Partners', methods: [
    { method: 'get', summary: 'Get partner', responses: ok('Partner details') },
    { method: 'put', summary: 'Update partner', responses: ok('Partner updated') },
    { method: 'delete', summary: 'Deactivate partner', responses: ok('Partner deactivated') },
  ] },
  { path: '/api/partners/{id}/commissions', tag: 'Partners', methods: [
    { method: 'get', summary: 'List commission rules', responses: ok('Commission rules') },
    { method: 'post', summary: 'Create commission rule', responses: created('Rule created') },
  ] },
  { path: '/api/partners/commissions/settlements', tag: 'Partners', methods: [
    { method: 'get', summary: 'List settlements', responses: ok('Settlements') },
    { method: 'post', summary: 'Approve settlement', responses: ok('Settlement approved') },
  ] },

  // NOTIFICATIONS
  { path: '/api/notifications', tag: 'Notifications', methods: [
    { method: 'get', summary: 'List notifications', responses: ok('Notification list') },
    { method: 'post', summary: 'Send notification', responses: created('Notification sent') },
  ] },
  { path: '/api/notifications/templates', tag: 'Notifications', methods: [
    { method: 'get', summary: 'List templates', responses: ok('Template list') },
    { method: 'post', summary: 'Create template', responses: created('Template created') },
  ] },

  // WEBHOOKS
  { path: '/api/webhooks', tag: 'Webhooks', methods: [
    { method: 'get', summary: 'List webhook endpoints', responses: ok('Endpoint list') },
    { method: 'post', summary: 'Register endpoint', responses: created('Endpoint registered') },
  ] },
  { path: '/api/webhooks/{id}', tag: 'Webhooks', methods: [
    { method: 'get', summary: 'Get endpoint', responses: ok('Endpoint details') },
    { method: 'put', summary: 'Update endpoint', responses: ok('Webhook updated') },
    { method: 'delete', summary: 'Delete endpoint', responses: ok('Webhook deleted') },
  ] },
  { path: '/api/webhooks/{id}/ping', tag: 'Webhooks', methods: [{ method: 'post', summary: 'Ping endpoint', responses: ok('Ping result') }] },

  // ANALYTICS
  { path: '/api/analytics/dashboard', tag: 'Analytics', methods: [{ method: 'get', summary: 'Dashboard data', responses: ok('Dashboard summary') }] },
  { path: '/api/analytics/kpis', tag: 'Analytics', methods: [{ method: 'get', summary: 'KPI metrics', responses: ok('KPI data') }] },
  { path: '/api/analytics/trends', tag: 'Analytics', methods: [{ method: 'get', summary: 'Trend data', responses: ok('Trend data') }] },

  // REPORTS
  { path: '/api/reports/templates', tag: 'Reports', methods: [{ method: 'get', summary: 'List report templates', responses: ok('Template list') }] },
  { path: '/api/reports/generate', tag: 'Reports', methods: [{ method: 'post', summary: 'Generate report', responses: ok('Generated report') }] },
  { path: '/api/reports/{type}', tag: 'Reports', methods: [{ method: 'get', summary: 'Report by type', responses: ok('Report data') }] },

  // BULK OPERATIONS
  { path: '/api/bulk/operations', tag: 'Bulk Operations', methods: [
    { method: 'get', summary: 'List operations', responses: ok('Operations list') },
    { method: 'post', summary: 'Create operation', responses: created('Operation created') },
  ] },
  { path: '/api/bulk/operations/{id}', tag: 'Bulk Operations', methods: [{ method: 'get', summary: 'Operation status', responses: ok('Operation status') }] },

  // API KEYS
  { path: '/api/api-keys', tag: 'API Keys', methods: [
    { method: 'get', summary: 'List API keys', responses: ok('Key list (masked)') },
    { method: 'post', summary: 'Create API key', responses: created('API key created (shown once)') },
  ] },
  { path: '/api/api-keys/{id}', tag: 'API Keys', methods: [
    { method: 'get', summary: 'Key usage stats', responses: ok('Usage statistics') },
    { method: 'delete', summary: 'Revoke API key', responses: ok('Key revoked') },
  ] },
  { path: '/api/api-keys/{id}/rotate', tag: 'API Keys', methods: [{ method: 'post', summary: 'Rotate API key', responses: ok('New key generated') }] },

  // i18n
  { path: '/api/i18n', tag: 'i18n', methods: [
    { method: 'get', summary: 'Get translations', responses: ok('Translation map') },
    { method: 'post', summary: 'Upsert translations', responses: ok('Translations saved') },
  ] },
]