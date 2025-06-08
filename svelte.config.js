import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter({
			runtime: 'nodejs18.x',
			regions: ['iad1'],
			maxDuration: 60,
			memory: 1024
		})
	},
	extensions: ['.svelte', '.svx']
};

export default config;
