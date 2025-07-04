import Airtable from 'airtable';

import { AIRTABLE_TOKEN, AIRTABLE_BASE } from '$env/static/private';

export const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE!);
