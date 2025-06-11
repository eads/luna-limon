import Airtable from 'airtable';

const { AIRTABLE_TOKEN, AIRTABLE_BASE } = process.env;

export const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE!);
