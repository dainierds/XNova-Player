// Vercel Serverless Function: Gestión de Portada y Pantalla Principal (Featured Items)
// Sincroniza en tiempo real los títulos fijados por el Administrador entre la PC y las TV Android

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const DEFAULT_KV_URL = "https://striking-monitor-200404.upstash.io";
  const DEFAULT_KV_TOKEN = "gQAAAAAAAw7UAAIgcDJlODRmNjMxZWNmYzk0N2MzYWJhOWY2ZmEwN2Q4ODcyOA";

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || DEFAULT_KV_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || DEFAULT_KV_TOKEN;

  const getCloudFeatured = async (): Promise<any[]> => {
    try {
      const resp = await fetch(kvUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', 'xnova_admin_featured_items']),
      });
      const data = await resp.json();
      if (!data || !data.result) return [];
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    } catch {
      return [];
    }
  };

  const saveCloudFeatured = async (items: any[]) => {
    await fetch(kvUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', 'xnova_admin_featured_items', JSON.stringify(items)]),
    });
  };

  try {
    if (req.method === 'GET') {
      const items = await getCloudFeatured();
      res.status(200).json({ success: true, items });
      return;
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const items = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [];
      await saveCloudFeatured(items);
      res.status(200).json({ success: true, items });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Error en API featured:', err);
    res.status(500).json({ success: false, error: err.message || 'Error del servidor en la nube' });
  }
}
