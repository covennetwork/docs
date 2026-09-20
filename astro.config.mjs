import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://docs.coven.network',
  integrations: [
    starlight({
      title: 'Coven',
      description: 'Swap, discover new pairs and bridge USDC on Arc.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/covennetwork' }],
      editLink: { baseUrl: 'https://github.com/covennetwork/docs/edit/main/' },
      logo:{src: './public/logo.svg'},
      favicon:'/favicon.ico',
      customCss: ['./src/styles/coven.css'],
      sidebar: [
        { label: 'Start here', items: ['quickstart', 'arc'] },
        {
          label: 'Using Coven',
          items: ['guides/swapping', 'guides/tokens', 'guides/new-pairs', 'guides/bridging', 'guides/gasless'],
        },
        {
          label: 'Integrating',
          items: ['guides/integrators', 'guides/fees', 'guides/production'],
        },
        {
          label: 'Reference',
          items: ['reference/sdk', 'reference/errors', 'reference/contracts', 'reference/chains'],
        },
      ],
    }),
  ],
})
