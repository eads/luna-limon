/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};
