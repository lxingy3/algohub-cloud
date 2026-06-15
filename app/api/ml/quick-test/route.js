import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { analyzeNarrativeTextWithModels } from '../../../../lib/mlFullAnalysis';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const narrativeText = String(body.narrativeText || '').trim();
  if (!narrativeText) {
    return NextResponse.json({ error: 'Please enter narrative_text.' }, { status: 400 });
  }
  if (narrativeText.length > 8000) {
    return NextResponse.json({ error: 'Please keep narrative_text under 8000 characters.' }, { status: 400 });
  }

  try {
    return NextResponse.json({
      ok: true,
      result: await analyzeNarrativeTextWithModels(narrativeText),
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message || 'ML Quick Test failed.',
    }, { status: 502 });
  }
}
