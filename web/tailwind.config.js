/** @type {import('tailwindcss/tailwind-config').TailwindConfig} */
module.exports = {
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				'dela-gothic': ['Dela Gothic One', 'cursive'],
				'roboto': ['Roboto', 'sans-serif'],
  
			},
			width: {
				'250': '680px',
			  },
			height: {
				'250': '200px',
			}

		},
	},
	plugins: [],
}
