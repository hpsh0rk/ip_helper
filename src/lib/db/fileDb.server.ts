import fs from 'fs';
import path from 'path';
import { IPProfile, StoryScript } from '@/types';
import { initialIPProfiles, initialStoryScript } from './mockDb';

const DATA_DIR = process.env.IP_HELPER_DATA_DIR || path.join(process.cwd(), 'data');
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
    if (fs.existsSync(IP_FILE)) {
      const content = fs.readFileSync(IP_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read IP file:', err);
  }
  return initialIPProfiles;
}

export function getIPById(id: string): IPProfile | undefined {
  const ips = getIPs();
  return ips.find(ip => ip.id === id);
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
    fs.writeFileSync(IP_FILE, JSON.stringify(ips, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save IP file:', err);
  }
  return ip;
}

export function deleteIP(id: string): boolean {
  const ips = getIPs().filter(item => item.id !== id);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(IP_FILE, JSON.stringify(ips, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write IP file on delete:', err);
  }
  return true;
}

export function getStories(): StoryScript[] {
  try {
    if (fs.existsSync(STORY_FILE)) {
      const content = fs.readFileSync(STORY_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read story file:', err);
  }
  return [initialStoryScript];
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
    fs.writeFileSync(STORY_FILE, JSON.stringify(stories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save story file:', err);
  }
  return story;
}

export function deleteStory(id: string): boolean {
  const stories = getStories().filter(item => item.id !== id);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORY_FILE, JSON.stringify(stories, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write story file on delete:', err);
  }
  return true;
}
