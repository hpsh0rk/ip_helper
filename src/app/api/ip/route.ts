import { NextRequest, NextResponse } from 'next/server';
import { getIPs, getIPById, saveIP, deleteIP } from '@/lib/db/fileDb.server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const ip = getIPById(id);
      if (!ip) {
        return NextResponse.json({ success: false, error: 'IP not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, ip });
    }

    const ips = getIPs();
    return NextResponse.json({ success: true, ips });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.archetype) {
      return NextResponse.json({ success: false, error: 'Name and archetype are required' }, { status: 400 });
    }

    const saved = saveIP(body);
    return NextResponse.json({ success: true, ip: saved });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    deleteIP(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
