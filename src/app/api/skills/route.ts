import { NextResponse } from 'next/server';
import { getAllSkills } from '@/lib/skills/loader';

export async function GET() {
  try {
    const skills = getAllSkills();
    return NextResponse.json({ success: true, skills });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
