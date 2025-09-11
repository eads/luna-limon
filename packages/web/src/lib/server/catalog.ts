import { base } from './airtable';

export interface Product {
	id: string;
	nombre: string;
	descripción: string;
	precio: number;
	imagen?: string;
}

import { AIRTABLE_PRODUCTS_TABLE } from '$env/static/private';

export async function listProducts(locale: string = 'es', opts?: { tipo?: string }): Promise<Product[]> {
    const select: any = {};
    if (opts?.tipo) select.filterByFormula = `{tipo} = '${opts.tipo}'`;
    const records = await base(AIRTABLE_PRODUCTS_TABLE).select(select).all();
    return records.map((r) => {
		const raw = r.get('imagen') as unknown;
		let imagen: string | undefined;
		if (Array.isArray(raw) && raw.length) {
			const first = raw[0] as { url?: string } | string;
			imagen = typeof first === 'string' ? first : first.url;
		} else if (typeof raw === 'string') {
			imagen = raw;
		}
		return {
			id: r.id,
			nombre: (r.get(`nombre_${locale}`) as string) || '',
			descripción: (r.get(`descripción_${locale}`) as string) || '',
			precio: Number(r.get('precio') ?? 0),
			imagen
		};
	});
}
