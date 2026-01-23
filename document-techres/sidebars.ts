import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Kiến trúc hệ thống',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/business-models',
        'architecture/system-components',
        'architecture/data-flow',
        'architecture/monorepo-structure',
      ],
    },
    {
      type: 'category',
      label: 'Ứng dụng',
      collapsed: false,
      items: [
        'apps/local-server',
        'apps/web-admin',
        'apps/web-dashboard',
        'apps/ccb',
        'apps/order',
        'apps/customer',
      ],
    },
    {
      type: 'category',
      label: 'Database',
      items: [
        'database/overview',
        'database/web-dashboard-schema',
        'database/sqlite-local',
        'database/postgresql-server',
        'database/storage-strategy',
      ],
    },
    {
      type: 'category',
      label: 'Đồng bộ dữ liệu',
      items: [
        'sync/overview',
        'sync/ccb-order-sync',
        'sync/cloud-sync',
        'sync/conflict-resolution',
        'sync/offline-handling',
      ],
    },
    {
      type: 'category',
      label: 'Tích hợp Food Platform',
      items: [
        'food-platform/overview',
        'food-platform/account-linking',
        'food-platform/order-polling',
        'food-platform/order-sync',
        'food-platform/ccb-display',
        'food-platform/auto-confirm-print',
      ],
    },
    {
      type: 'category',
      label: 'Hệ thống in ấn',
      items: [
        'printing/overview',
        'printing/print-queue',
        'printing/printer-types',
        'printing/esc-pos',
      ],
    },
    {
      type: 'category',
      label: 'Hướng dẫn',
      items: [
        'guides/getting-started',
        'guides/setup-development',
        'guides/deployment',
        'guides/troubleshooting',
      ],
    },
  ],
  apiSidebar: [
    'api/overview',
    {
      type: 'category',
      label: 'REST API (Cloud)',
      items: [
        'api/rest/authentication',
        'api/rest/stores',
        'api/rest/menu',
        'api/rest/tables',
        'api/rest/orders',
        'api/rest/staff',
        'api/rest/sync',
      ],
    },
    {
      type: 'category',
      label: 'Local API (Server)',
      items: [
        'api/local/endpoints',
        'api/local/websocket-events',
        'api/local/discovery',
      ],
    },
  ],
};

export default sidebars;
