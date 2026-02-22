import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Cloudflare Pages：构建输出目录填 .svelte-kit/cloudflare
		adapter: adapter()
	}
};

export default config;
