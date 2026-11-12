export interface XtreamUserInfo {
  username: string;
  status: string;
  exp_date: string;
  expDateFormatted: string;
  is_trial: string;
  active_cons: string;
  max_connections: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  category_id: string;
  container_extension?: string;
  rating?: string;
  added?: string;
}

export interface XtreamSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  rating: string;
  category_id: string;
}

export class XtreamService {
  private static normalizeUrl(url: string): string {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    return clean.replace(/\/+$/, '');
  }

  public static formatExpDate(timestampStr?: string): string {
    if (!timestampStr || timestampStr === 'null' || timestampStr === '0') {
      return 'ILIMITADO';
    }
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return 'ILIMITADO';

    const date = new Date(timestamp * 1000);
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }

  public static async authenticate(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<{ userInfo: XtreamUserInfo; raw: unknown }> {
    const base = this.normalizeUrl(serverUrl);
    const endpoint = `${base}/player_api.php?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} al conectar al servidor`);
      }

      const data = await response.json();

      if (!data || !data.user_info) {
        throw new Error('Respuesta inválida del servidor Xtream Codes');
      }

      if (data.user_info.auth === 0) {
        throw new Error('Credenciales incorrectas (Usuario o contraseña inválidos)');
      }

      const userInfo: XtreamUserInfo = {
        username: data.user_info.username,
        status: data.user_info.status || 'Active',
        exp_date: data.user_info.exp_date,
        expDateFormatted: this.formatExpDate(data.user_info.exp_date),
        is_trial: data.user_info.is_trial || '0',
        active_cons: data.user_info.active_cons || '0',
        max_connections: data.user_info.max_connections || '1',
      };

      return { userInfo, raw: data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al validar credenciales';
      throw new Error(msg);
    }
  }

  public static async getVodCategories(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<XtreamCategory[]> {
    const base = this.normalizeUrl(serverUrl);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_categories`;
    const res = await fetch(url);
    return res.json();
  }

  public static async getVodStreams(
    serverUrl: string,
    username: string,
    password: string,
    categoryId?: string
  ): Promise<XtreamStream[]> {
    const base = this.normalizeUrl(serverUrl);
    let url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_streams`;
    if (categoryId) {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    return res.json();
  }

  public static async getLiveCategories(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<XtreamCategory[]> {
    const base = this.normalizeUrl(serverUrl);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;
    const res = await fetch(url);
    return res.json();
  }

  public static async getLiveStreams(
    serverUrl: string,
    username: string,
    password: string,
    categoryId?: string
  ): Promise<XtreamStream[]> {
    const base = this.normalizeUrl(serverUrl);
    let url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;
    if (categoryId) {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    return res.json();
  }

  public static async getSeriesCategories(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<XtreamCategory[]> {
    const base = this.normalizeUrl(serverUrl);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_categories`;
    const res = await fetch(url);
    return res.json();
  }

  public static async getSeries(
    serverUrl: string,
    username: string,
    password: string,
    categoryId?: string
  ): Promise<XtreamSeries[]> {
    const base = this.normalizeUrl(serverUrl);
    let url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series`;
    if (categoryId) {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    return res.json();
  }

  // Generador de enlaces de reproducción
  public static buildVodStreamUrl(
    serverUrl: string,
    username: string,
    password: string,
    streamId: number | string,
    containerExtension: string = 'mp4'
  ): string {
    const base = this.normalizeUrl(serverUrl);
    return `${base}/movie/${username}/${password}/${streamId}.${containerExtension}`;
  }

  public static buildLiveStreamUrl(
    serverUrl: string,
    username: string,
    password: string,
    streamId: number | string
  ): string {
    const base = this.normalizeUrl(serverUrl);
    return `${base}/live/${username}/${password}/${streamId}.m3u8`;
  }
}
