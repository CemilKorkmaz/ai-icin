import { dashboard } from './dashboard.js';
import { setupView, modulesView } from './setup.js';
import { materialsView, ordersView, pricesView, suppliersView } from './purchasing.js';
import { stockView, receiptsView, crusherView, movementsView } from './inventory.js';
import { productionView, recipesView } from './production.js';
import { shipmentsView, archiveView } from './shipping.js';
import { reportsView } from './reports.js';
import { notificationsView, settingsView } from './system.js';
import {
  machinesView, pathsView, cuttingView, maintenanceView,
  batchesView, eventsView, plcView, vendorView
} from './engineering.js';
import {
  salesOrdersView, customersView, purchaseRequestsView, financeView,
  costingView, warehouseView, hrView, integrationView
} from './enterprise.js';

export const VIEWS = {
  dashboard,
  materials: materialsView,
  orders: ordersView,
  prices: pricesView,
  suppliers: suppliersView,
  requests: purchaseRequestsView,
  stock: stockView,
  receipts: receiptsView,
  crusher: crusherView,
  movements: movementsView,
  production: productionView,
  recipes: recipesView,
  batches: batchesView,
  events: eventsView,
  machines: machinesView,
  paths: pathsView,
  cutting: cuttingView,
  maintenance: maintenanceView,
  plc: plcView,
  sales: salesOrdersView,
  customers: customersView,
  finance: financeView,
  costing: costingView,
  warehouse: warehouseView,
  hr: hrView,
  shipments: shipmentsView,
  archive: archiveView,
  reports: reportsView,
  integration: integrationView,
  vendor: vendorView,
  notifications: notificationsView,
  settings: settingsView,
  setup: setupView,
  modules: modulesView
};

export { NAV, GROUP_OF } from './nav.js';
