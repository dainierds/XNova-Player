import { BRANDING } from '../config/branding';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes?: string;
  downloadUrl?: string;
  publishedAt?: string;
}

// Configuración del repositorio en GitHub (se actualiza con el usuario y repo del cliente)
export const GITHUB_REPO_CONFIG = {
  owner: 'xnova-tv', // Reemplazar con tu usuario u organización de GitHub
  repo: 'xnova-player', // Reemplazar con el nombre de tu repositorio
};

export const UpdateService = {
  /**
   * Comprueba si hay una nueva versión publicada en GitHub Releases
   */
  async checkForUpdates(customOwner?: string, customRepo?: string): Promise<AppUpdateInfo> {
    const owner = customOwner || GITHUB_REPO_CONFIG.owner;
    const repo = customRepo || GITHUB_REPO_CONFIG.repo;
    const currentVersion = BRANDING.version;

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseName: 'Sin actualizaciones',
        };
      }

      const data = await response.json();
      const rawTag = (data.tag_name || '').replace(/^v/, '');
      const downloadAsset = data.assets?.find((a: { name: string; browser_download_url: string }) =>
        a.name.endsWith('.apk')
      );

      const hasUpdate = this.compareVersions(rawTag, currentVersion) > 0;

      return {
        hasUpdate,
        currentVersion,
        latestVersion: rawTag || currentVersion,
        releaseName: data.name || `Versión ${rawTag}`,
        releaseNotes: data.body,
        downloadUrl: downloadAsset?.browser_download_url || data.html_url,
        publishedAt: data.published_at,
      };
    } catch {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: 'Conexión no disponible',
      };
    }
  },

  /**
   * Compara dos versiones semánticas (v1 > v2 => 1, v1 === v2 => 0, v1 < v2 => -1)
   */
  compareVersions(v1: string, v2: string): number {
    const clean1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const clean2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
      const num1 = clean1[i] || 0;
      const num2 = clean2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  },
};
