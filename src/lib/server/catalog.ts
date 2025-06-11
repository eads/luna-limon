import { base } from './airtable';

export interface Product {
	id: string;
	name: string;
	description: string;
	price: number;
	image?: string;
}

const TABLE = process.env.AIRTABLE_PRODUCTS_TABLE!;

export async function listProducts(): Promise<Product[]> {
	const records = await base(TABLE).select().all();
	return records.map((r) => ({
		id: r.id,
		name: (r.get('name') as string) || '',
		description: (r.get('description') as string) || '',
		price: Number(r.get('price') ?? 0),
		image: r.get('image') as string | undefined
	}));
}
