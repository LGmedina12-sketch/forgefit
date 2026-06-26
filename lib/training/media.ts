import { exerciseLibrary } from '@/lib/data/exercises';
import { stretchLibrary } from '@/lib/data/mobility';
import type { MediaFields } from '@/lib/training/types';

const placeholderHosts = new Set(['example.com', 'www.example.com', 'example.org', 'www.example.org', 'example.net', 'www.example.net']);

export type VideoValidationResult = {
  status: 'valid' | 'missing' | 'invalid' | 'placeholder';
  message: string;
};

export function createVideo(videoUrl = '', videoType: MediaFields['videoType'] = 'external', thumbnailUrl = ''): MediaFields {
  const validation = validateVideoUrl(videoUrl, Boolean(videoUrl));
  const videoAvailable = validation.status === 'valid';

  return {
    videoUrl: videoAvailable ? videoUrl : '',
    thumbnailUrl: videoAvailable ? thumbnailUrl : '',
    videoType,
    videoAvailable,
  };
}

export function validateVideoUrl(rawUrl: string, expectedAvailable = Boolean(rawUrl)): VideoValidationResult {
  const videoUrl = rawUrl.trim();
  if (!videoUrl) {
    return {
      status: expectedAvailable ? 'invalid' : 'missing',
      message: expectedAvailable ? 'Video is marked available but no URL is set.' : 'Video example coming soon.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    return { status: 'invalid', message: 'Video URL is not a valid URL.' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { status: 'invalid', message: 'Video URL must use http or https.' };
  }

  if (placeholderHosts.has(parsed.hostname.toLowerCase())) {
    return { status: 'placeholder', message: 'Placeholder video URLs are not allowed.' };
  }

  return { status: 'valid', message: 'Video is available.' };
}

export function getVideoEmbedUrl(rawUrl: string) {
  const validation = validateVideoUrl(rawUrl, true);
  if (validation.status !== 'valid') return '';

  const parsed = new URL(rawUrl);
  const host = parsed.hostname.toLowerCase();

  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    const id = getYouTubeId(parsed);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : '';
  }

  if (host.includes('vimeo.com')) {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : '';
  }

  return rawUrl;
}

export function validateVideoLibrary() {
  return [...exerciseLibrary, ...stretchLibrary].map((item) => {
    const validation = validateVideoUrl(item.videoUrl, item.videoAvailable);
    return {
      id: item.id,
      name: item.name,
      videoUrl: item.videoUrl,
      videoAvailable: item.videoAvailable,
      status: validation.status,
      message: validation.message,
    };
  });
}

function getYouTubeId(parsed: URL) {
  if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
  const watchId = parsed.searchParams.get('v');
  if (watchId) return watchId;
  const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
  if (shortsMatch) return shortsMatch[1];
  const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
  return embedMatch?.[1] ?? '';
}
