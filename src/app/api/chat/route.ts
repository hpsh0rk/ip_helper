import { NextRequest, NextResponse } from 'next/server';
import { processAgentChat } from '@/lib/agent/engine';
import { saveIP, saveStory } from '@/lib/db/fileDb.server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], currentIP, locale = 'zh', activeSkillIds = [] } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    const result = processAgentChat(message, history, currentIP, locale, activeSkillIds);

    // If IP was created or updated, persist it
    if (result.extractedIP && result.extractedIP.id && result.extractedIP.name && result.extractedIP.archetype) {
      saveIP(result.extractedIP as import('@/types').IPProfile);
    }

    // If Story was generated, persist it
    if (result.generatedStory && result.generatedStory.id) {
      saveStory(result.generatedStory);
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
