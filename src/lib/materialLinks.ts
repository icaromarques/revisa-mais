export function detectMaterialProvider(url: string): 'google_drive' | 'youtube' | 'external' | null {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com')) {
    return 'google_drive';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  return 'external';
}

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // docs.google.com/document/d/ID/edit
    // drive.google.com/file/d/ID/view
    const pathMatch = urlObj.pathname.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

    // drive.google.com/open?id=ID
    // drive.google.com/uc?id=ID
    const idParam = urlObj.searchParams.get('id');
    if (idParam) return idParam;
    
  } catch (e) {
    // try rudimentary regex fallback
    const match = url.match(/id=([a-zA-Z0-9-_]+)/) || url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function buildGoogleDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function buildGoogleDriveOpenUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function normalizeExternalUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

export function prepareMaterialLinkMetadata(url: string) {
  if (!url || !url.trim()) return null;
  const normalizedUrl = normalizeExternalUrl(url);
  const provider = detectMaterialProvider(normalizedUrl);
  
  let source_kind: 'external_url' | 'google_drive' | 'youtube' | 'text' | 'manual' = 'external_url';
  let drive_file_id: string | null = null;
  let drive_preview_url: string | null = null;
  let drive_open_url: string | null = null;

  if (provider === 'google_drive') {
    source_kind = 'google_drive';
    drive_file_id = extractGoogleDriveFileId(normalizedUrl);
    if (drive_file_id) {
      drive_preview_url = buildGoogleDrivePreviewUrl(drive_file_id);
      // For docs/slides, the original url might be better to open.
      // But if it's drive.google.com file, view is better.
      drive_open_url = normalizedUrl.includes('docs.google.com') ? normalizedUrl : buildGoogleDriveOpenUrl(drive_file_id);
    }
  } else if (provider === 'youtube') {
    source_kind = 'youtube';
  }

  return {
    url: normalizedUrl,
    provider,
    source_kind,
    drive_file_id,
    drive_preview_url,
    drive_open_url
  };
}
