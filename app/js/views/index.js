import { dashboard } from './dashboard.js';
import { materialsView, ordersView, pricesView, suppliersView } from './purchasing.js';
import { stockView, receiptsView, crusherView, movementsView } from './inventory.js';
import { productionView, recipesView } from './production.js';
import { shipmentsView, archiveView } from './shipping.js';
import { reportsView } from './reports.js';
import { notificationsView, settingsView } from './system.js';

export const VIEWS = {
  dashboard,
  materials: materialsView,
  orders: ordersView,
  prices: pricesView,
  suppliers: suppliersView,
  stock: stockView,
  receipts: receiptsView,
  crusher: crusherView,
  movements: movementsView,
  production: productionView,
  recipes: recipesView,
  shipments: shipmentsView,
  archive: archiveView,
  reports: reportsView,
  notifications: notificationsView,
  settings: settingsView
};

export const NAV = [
  { group: 'GENEL', items: [{ id: 'dashboard', label: 'Panel', icon: 'grid' }] },
  { group: 'SATIN ALMA', items: [
    { id: 'materials', label: 'Malzeme Tanımları', icon: 'tag' },
    { id: 'orders', label: 'Satın Alma Emirleri', icon: 'cart' },
    { id: 'prices', label: 'Fiyat Takibi', icon: 'trend' },
    { id: 'suppliers', label: 'Tedarikçiler', icon: 'users' }
  ] },
  { group: 'HAMMADDE & STOK', items: [
    { id: 'stock', label: 'Stok Durumu', icon: 'warehouse' },
    { id: 'receipts', label: 'Mal Kabul', icon: 'clipboard' },
    { id: 'crusher', label: 'Kırıcı & Fire', icon: 'recycle' },
    { id: 'movements', label: 'Stok Hareketleri', icon: 'activity' }
  ] },
  { group: 'ÜRETİM', items: [
    { id: 'production', label: 'Üretim Akışı', icon: 'flame' },
    { id: 'recipes', label: 'Reçeteler', icon: 'sliders' }
  ] },
  { group: 'SEVKİYAT', items: [
    { id: 'shipments', label: 'Sevkiyat & Onaylar', icon: 'truck' },
    { id: 'archive', label: 'Arşiv', icon: 'archive' }
  ] },
  { group: 'RAPORLAMA', items: [{ id: 'reports', label: 'Raporlar & İstatistik', icon: 'chart' }] },
  { group: 'SİSTEM', items: [
    { id: 'notifications', label: 'Bildirimler & Kuyruk', icon: 'bell' },
    { id: 'settings', label: 'Ayarlar', icon: 'settings' }
  ] }
];

export const GROUP_OF = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, g.group])));
