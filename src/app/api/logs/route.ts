import { NextRequest, NextResponse } from 'next/server';
import { getDiagnosticLog } from '@/lib/render/serverCliGenerator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get('id');

    if (!logId) {
      return NextResponse.json({ error: 'Missing id query parameter (e.g. ?id=LOG-20260825-XXXXX)' }, { status: 400 });
    }

    const logData = getDiagnosticLog(logId);
    if (!logData) {
      return NextResponse.json({ error: `Diagnostic log for ID ${logId} not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, log: logData });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
