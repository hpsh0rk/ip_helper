import { NextRequest, NextResponse } from 'next/server';
import { getIPs, getIPById, saveIP, deleteIP, clearAllIPs } from '@/lib/db/fileDb.server';

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
    if (!body || !body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Character name is required' }, { status: 400 });
    }

    const cleanIP = {
      ...body,
      id: body.id || `ip-${Date.now()}`,
      name: body.name.trim(),
      archetype: body.archetype?.trim() || body.description?.trim() || body.name.trim(),
      description: body.description || '',
      stylePreset: body.stylePreset || '3D Clay',
      assets: Array.isArray(body.assets) ? body.assets : [],
      turnaroundSheets: body.turnaroundSheets || {},
      visualAnchors: body.visualAnchors || { hair: '', clothing: '', accessories: '', colorPalette: [], distinctiveFeatures: '' },
      personality: body.personality || { traits: [], tagline: '', catchphrase: '', flawOrConflict: '' },
      createdAt: body.createdAt || new Date().toISOString()
    };

    const saved = saveIP(cleanIP);
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

    if (id === 'all') {
      const confirm = req.headers.get('x-confirm-purge');
      if (confirm !== 'confirmed') {
        return NextResponse.json({ success: false, error: 'Mass deletion requires explicit confirmation header' }, { status: 403 });
      }
      clearAllIPs();
      return NextResponse.json({ success: true, message: 'All IPs cleared' });
    }

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
