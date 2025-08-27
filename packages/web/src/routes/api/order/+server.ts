import { json } from '@sveltejs/kit';
import { base } from '$lib/server/airtable';

const ORDERS_TABLE = process.env.AIRTABLE_ORDERS_TABLE!;
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
const WOMPI_REDIRECT_URL = process.env.WOMPI_REDIRECT_URL;

export async function POST({ request, setHeaders }) {
  // Do not cache order responses
  setHeaders({ 'Cache-Control': 'no-store' });
	const { phone, items } = await request.json();
	await base(ORDERS_TABLE).create({
		phone,
		items: JSON.stringify(items)
	});

	if (WOMPI_PUBLIC_KEY) {
		const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${WOMPI_PUBLIC_KEY}&redirect-url=${encodeURIComponent(
			WOMPI_REDIRECT_URL ?? ''
		)}`;
		return json({ checkoutUrl });
	}

	return json({ ok: true });
}
