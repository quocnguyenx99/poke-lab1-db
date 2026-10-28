import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/data-source';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(await getCatalog());
}
