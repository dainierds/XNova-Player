export interface M3uEntry {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  type: 'live' | 'movie' | 'series';
}

export class M3uParserService {
  public static async parseFromUrl(url: string): Promise<M3uEntry[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al descargar lista M3U: HTTP ${response.status}`);
    }
    const text = await response.text();
    return this.parseContent(text);
  }

  public static parseContent(content: string): M3uEntry[] {
    const lines = content.split(/\r?\n/);
    const entries: M3uEntry[] = [];
    let currentEntry: Partial<M3uEntry> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        currentEntry = {};

        // Extraer atributos estándar
        const groupMatch = line.match(/group-title="([^"]+)"/i);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        const nameMatch = line.match(/tvg-name="([^"]+)"/i);

        // Extraer nombre que va después de la última coma
        const commaIndex = line.lastIndexOf(',');
        const rawTitle = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : '';

        currentEntry.group = groupMatch ? groupMatch[1].trim() : 'General';
        currentEntry.logo = logoMatch ? logoMatch[1].trim() : '';
        currentEntry.name = rawTitle || (nameMatch ? nameMatch[1].trim() : 'Canal sin nombre');
      } else if (line.length > 0 && !line.startsWith('#')) {
        // Esta línea es la URL del stream
        if (currentEntry.name) {
          const streamUrl = line;
          const lower = streamUrl.toLowerCase();
          
          let type: 'live' | 'movie' | 'series' = 'live';
          if (lower.includes('/movie/') || lower.endsWith('.mp4') || lower.endsWith('.mkv')) {
            type = 'movie';
          } else if (lower.includes('/series/')) {
            type = 'series';
          }

          entries.push({
            id: `m3u_${entries.length + 1}`,
            name: currentEntry.name,
            logo: currentEntry.logo || '',
            group: currentEntry.group || 'General',
            url: streamUrl,
            type,
          });

          currentEntry = {};
        }
      }
    }

    return entries;
  }
}
