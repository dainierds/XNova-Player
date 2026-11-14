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
    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    return res.json();
  }

  // Obtener información detallada de una película VOD (sinopsis, actores, director, backdrop, duración, etc.)
  public static async getVodInfo(
    serverUrl: string,
    username: string,
    password: string,
    vodId: number | string
  ): Promise<{
    info?: {
      name?: string;
      o_name?: string;
      cover_big?: string;
      movie_image?: string;
      releasedate?: string;
      episode_run_time?: string | number;
      youtube_trailer?: string;
      director?: string;
      actors?: string;
      cast?: string;
      description?: string;
      plot?: string;
      rating?: string;
      genre?: string;
      backdrop_path?: string[];
      duration_secs?: number;
      duration?: string;
      container_extension?: string;
    };
    movie_data?: {
      stream_id?: number | string;
      name?: string;
      container_extension?: string;
    };
  }> {
    const base = this.normalizeUrl(serverUrl);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_info&vod_id=${encodeURIComponent(vodId)}`;
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
    if (categoryId && categoryId !== 'all') {
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
    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }
    const res = await fetch(url);
    return res.json();
  }

  // Obtener información detallada y episodios de una serie
  public static async getSeriesInfo(
    serverUrl: string,
    username: string,
    password: string,
    seriesId: number | string
  ): Promise<{
    seasons?: Array<{ air_date?: string; episode_count?: number; id?: number; name?: string; season_number: number }>;
    info?: { name?: string; cover?: string; plot?: string; genre?: string; rating?: string; releaseDate?: string; backdrop_path?: string[] };
    episodes?: Record<string, Array<{
      id: string | number;
      episode_num: number;
      title: string;
      container_extension?: string;
      info?: { plot?: string; duration_secs?: number; movie_image?: string };
    }>>;
  }> {
    const base = this.normalizeUrl(serverUrl);
    const url = `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_info&series_id=${encodeURIComponent(seriesId)}`;
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
    const cleanExt = (containerExtension || 'mp4').toString().replace(/^\.+/, '').trim() || 'mp4';
    return `${base}/movie/${username}/${password}/${streamId}.${cleanExt}`;
  }

  public static buildSeriesStreamUrl(
    serverUrl: string,
    username: string,
    password: string,
    episodeId: number | string,
    containerExtension: string = 'mp4'
  ): string {
    const base = this.normalizeUrl(serverUrl);
    const cleanExt = (containerExtension || 'mp4').toString().replace(/^\.+/, '').trim() || 'mp4';
    return `${base}/series/${username}/${password}/${episodeId}.${cleanExt}`;
  }

  public static buildLiveStreamUrl(
    serverUrl: string,
    username: string,
    password: string,
    streamId: number | string,
    containerExtension: string = 'ts'
  ): string {
    const base = this.normalizeUrl(serverUrl);
    const cleanExt = (containerExtension || 'ts').toString().replace(/^\.+/, '').trim() || 'ts';
    return `${base}/live/${username}/${password}/${streamId}.${cleanExt}`;
  }
}
