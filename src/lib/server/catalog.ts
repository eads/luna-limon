import { base } from './airtable';

export interface Product {
	id: string;
	nombre: string;
	descripción: string;
	precio: number;
	imagen?: string;
}

import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';

export async function listProducts(): Promise<Product[]> {
	const records = await base(AIRTABLE_PRODUCTS_TABLE).select().all();
	return records.map((r) => ({
		id: r.id,
		nombre: (r.get('nombre') as string) || '',
		descripción: (r.get('descripción') as string) || '',
		precio: Number(r.get('precio') ?? 0),
		image: r.get('imagen') as string | undefined
	}));
}
