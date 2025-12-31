import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Hướng dẫn',
      items: [
        'tutorial/getting-started',
        'tutorial/installation',
        'tutorial/configuration',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/endpoints',
        'api/authentication',
      ],
    },
  ],
};

export default sidebars;
