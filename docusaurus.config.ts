import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'FNB POS System',
  tagline: 'Hệ thống POS F&B Offline-First - Tài liệu kỹ thuật',
  favicon: 'img/favicon.ico',

  url: 'https://nghia201097123-tech.github.io',
  baseUrl: '/document-techres/',

  organizationName: 'nghia201097123-tech',
  projectName: 'document-techres',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/nghia201097123-tech/document-techres/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/nghia201097123-tech/document-techres/tree/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/fnb-pos-social-card.jpg',
    navbar: {
      title: 'FNB POS',
      logo: {
        alt: 'FNB POS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Tài liệu',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/nghia201097123-tech/document-techres',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Tài liệu',
          items: [
            {
              label: 'Giới thiệu',
              to: '/docs/',
            },
            {
              label: 'Kiến trúc',
              to: '/docs/architecture/overview',
            },
            {
              label: 'Hướng dẫn',
              to: '/docs/guides/getting-started',
            },
          ],
        },
        {
          title: 'Ứng dụng',
          items: [
            {
              label: 'CCB App',
              to: '/docs/apps/ccb',
            },
            {
              label: 'Order App',
              to: '/docs/apps/order',
            },
            {
              label: 'Web Dashboard',
              to: '/docs/apps/web-dashboard',
            },
          ],
        },
        {
          title: 'Thêm',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/nghia201097123-tech/document-techres',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} FNB POS System. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['sql', 'bash', 'json', 'typescript'],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
