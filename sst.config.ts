export default $config({
	app(input) {
		return {
			name: 'luna-limon',
			removal: input?.stage === 'production' ? 'retain' : 'remove',
			protect: ['production'].includes(input?.stage),
			home: 'aws'
		};
	},
	async run({ stage }) {
		new sst.aws.SvelteKit('MyWeb', {
			customDomain: {
				domainName:
					stage === 'production'
						? 'lunalimon--production.grupovisual.org'
						: 'lunalimon--staging.grupovisual.org',
				hostedZone: 'grupovisual.org'
			}
		});
	}
});
