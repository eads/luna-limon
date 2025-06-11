import { base } from './airtable';

export interface Product {
	id: string;
	nombre: string;
	descripción: string;
	precio: number;
	imagen?: string;
}

import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';

export async function listProducts(locale: string = 'es'): Promise<Product[]> {
	const records = await base(AIRTABLE_PRODUCTS_TABLE).select().all();
	return records.map((r) => ({
		id: r.id,
		nombre: (r.get(`nombre_${locale}`) as string) || '',
		descripción: (r.get(`descripción_${locale}`) as string) || '',
		precio: Number(r.get('precio') ?? 0),
		imagen: r.get('imagen') as string | undefined
	}));
}
