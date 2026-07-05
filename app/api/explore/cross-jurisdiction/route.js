import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    label: 'peer-jurisdiction benchmark',
    reviewStatus: 'waiting for approved peer insight data',
    rows: [],
  });
}

