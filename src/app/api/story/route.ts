import { NextRequest, NextResponse } from 'next/server';
import { getStories, getStoryById, saveStory, getIPById } from '@/lib/db/fileDb.server';
import { generateStoryboardForIP } from '@/lib/agent/engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const story = getStoryById(id);
      if (!story) {
        return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, story });
    }

    const stories = getStories();
    return NextResponse.json({ success: true, stories });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ipId, topic, locale = 'zh' } = body;

    if (!ipId) {
      return NextResponse.json({ success: false, error: 'ipId is required' }, { status: 400 });
    }

    const ip = getIPById(ipId);
    if (!ip) {
      return NextResponse.json({ success: false, error: 'IP not found' }, { status: 404 });
    }

    const generated = generateStoryboardForIP(ip, topic || '小红书爆款日常', locale);
    saveStory(generated);

    return NextResponse.json({ success: true, story: generated });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Story ID is required' }, { status: 400 });
    }

    const updated = saveStory(body);
    return NextResponse.json({ success: true, story: updated });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
