import fs from 'fs';
import path from 'path';
import { IPProfile, StoryScript, StoryboardFrame } from '@/types';
import { initialIPProfiles, initialStoryScript } from '@/lib/db/mockDb';

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

const DATA_DIR = isTestEnv 
  ? path.join(process.cwd(), 'data', '.test_data')
  : path.join(process.cwd(), 'data');

const IP_FILE = path.join(DATA_DIR, 'ip_profiles.json');
const STORY_FILE = path.join(DATA_DIR, 'stories.json');

function initDbFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(IP_FILE)) {
      fs.writeFileSync(IP_FILE, JSON.stringify(initialIPProfiles, null, 2), 'utf-8');
    }
    if (!fs.existsSync(STORY_FILE)) {
      fs.writeFileSync(STORY_FILE, JSON.stringify([initialStoryScript], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to init db files:', err);
  }
}

// Auto-init files on first server load
initDbFiles();

export function getIPs(): IPProfile[] {
  try {
    if (!fs.existsSync(IP_FILE)) {
      initDbFiles();
    }
    if (fs.existsSync(IP_FILE)) {
      const content = fs.readFileSync(IP_FILE, 'utf-8').trim();
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.error('Failed to read IP file:', err);
  }
  return [];
}

export function getIPById(id: string): IPProfile | undefined {
  const ips = getIPs();
  return ips.find(ip => ip.id === id);
}

function createBackup(filename: string, content: string) {
  try {
    const backupDir = path.join(DATA_DIR, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, `${filename}.backup.json`), content, 'utf-8');
  } catch {
    // skip
  }
}

export function saveIP(ip: IPProfile): IPProfile {
  const ips = getIPs();
  const existingIdx = ips.findIndex(item => item.id === ip.id);
  if (existingIdx >= 0) {
    ips[existingIdx] = ip;
  } else {
    ips.unshift(ip);
  }

  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const content = JSON.stringify(ips, null, 2);
    fs.writeFileSync(IP_FILE, content, 'utf-8');
    createBackup('ip_profiles', content);
  } catch (err) {
    console.error('Failed to save IP file:', err);
  }
  return ip;
}

export function deleteIP(id: string): boolean {
  const ips = getIPs().filter(item => item.id !== id);
  const stories = getStories().filter(item => item.ipId !== id);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const ipContent = JSON.stringify(ips, null, 2);
    const storyContent = JSON.stringify(stories, null, 2);
    fs.writeFileSync(IP_FILE, ipContent, 'utf-8');
    fs.writeFileSync(STORY_FILE, storyContent, 'utf-8');
    createBackup('ip_profiles', ipContent);
    createBackup('stories', storyContent);
  } catch (err) {
    console.error('Failed to write IP and story files on delete:', err);
  }
  return true;
}

export function clearAllIPs(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(IP_FILE)) createBackup('ip_profiles_before_clear', fs.readFileSync(IP_FILE, 'utf-8'));
    fs.writeFileSync(IP_FILE, JSON.stringify([], null, 2), 'utf-8');
    fs.writeFileSync(STORY_FILE, JSON.stringify([], null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to clear IP and story files:', err);
    return false;
  }
  return true;
}

export function getStories(): StoryScript[] {
  try {
    if (!fs.existsSync(STORY_FILE)) {
      initDbFiles();
    }
    if (fs.existsSync(STORY_FILE)) {
      const content = fs.readFileSync(STORY_FILE, 'utf-8').trim();
      if (content) {
        const stories: StoryScript[] = JSON.parse(content);
        const ips = getIPs();
        const ipIds = new Set(ips.map(ip => ip.id));
        const validStories = stories.filter(s => ipIds.has(s.ipId));
        if (validStories.length !== stories.length) {
          fs.writeFileSync(STORY_FILE, JSON.stringify(validStories, null, 2), 'utf-8');
        }
        return validStories;
      }
    }
  } catch (err) {
    console.error('Failed to read story file:', err);
  }
  return [];
}

export function clearAllStories(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    createBackup('stories_before_clear', fs.readFileSync(STORY_FILE, 'utf-8'));
    fs.writeFileSync(STORY_FILE, JSON.stringify([], null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to clear story file:', err);
    return false;
  }
  return true;
}

export function getStoryById(id: string): StoryScript | undefined {
  const stories = getStories();
  return stories.find(s => s.id === id);
}

export function saveStory(story: StoryScript): StoryScript {
  const stories = getStories();
  const existingIdx = stories.findIndex(s => s.id === story.id);
  if (existingIdx >= 0) {
    stories[existingIdx] = story;
  } else {
    stories.unshift(story);
  }

  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const content = JSON.stringify(stories, null, 2);
    fs.writeFileSync(STORY_FILE, content, 'utf-8');
    createBackup('stories', content);
  } catch (err) {
    console.error('Failed to save story file:', err);
  }
  return story;
}

export function updateStoryFrameOnServer(
  storyIdOrNull: string | undefined | null,
  frameId: string,
  updates: Partial<StoryboardFrame>
): StoryScript | null {
  const stories = getStories();
  let targetStory: StoryScript | undefined;
  
  if (storyIdOrNull) {
    targetStory = stories.find(s => s.id === storyIdOrNull);
  }
  if (!targetStory) {
    targetStory = stories.find(s => s.frames && s.frames.some(f => f.id === frameId));
  }
  if (!targetStory && stories.length > 0) {
    targetStory = stories[0];
  }

  if (targetStory && targetStory.frames) {
    const fIdx = targetStory.frames.findIndex(f => f.id === frameId);
    if (fIdx >= 0) {
      targetStory.frames[fIdx] = {
        ...targetStory.frames[fIdx],
        ...updates
      };
      saveStory(targetStory);
      return targetStory;
    }
  }
  return null;
}

export function deleteStory(id: string): boolean {
  const stories = getStories().filter(item => item.id !== id);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const content = JSON.stringify(stories, null, 2);
    fs.writeFileSync(STORY_FILE, content, 'utf-8');
    createBackup('stories', content);
  } catch (err) {
    console.error('Failed to write story file on delete:', err);
  }
  return true;
}
