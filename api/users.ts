// Vercel Serverless Function: Gestión de Usuarios (CRUD)
// Permite leer, crear, actualizar y eliminar usuarios desde el panel web o la app

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

  // Función auxiliar para leer usuarios de la nube
  const getCloudUsers = async (): Promise<any[]> => {
    try {
      const resp = await fetch(kvUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', 'xnova_managed_users']),
      });
      const data = await resp.json();
      if (!data || !data.result) return [];
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    } catch {
      return [];
    }
  };

  // Función auxiliar para guardar usuarios en la nube
  const saveCloudUsers = async (users: any[]) => {
    await fetch(kvUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', 'xnova_managed_users', JSON.stringify(users)]),
    });
  };

  try {
    // ── 1. GET: Obtener todos los usuarios ──
    if (req.method === 'GET') {
      const users = await getCloudUsers();
      res.status(200).json({ success: true, users });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    // ── 2. POST: Crear un nuevo usuario ──
    if (req.method === 'POST') {
      const { username, password, displayName, plan = 'basic', expDate = '2027-12-31', playlists = [] } = body;

      if (!username || !password) {
        res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos.' });
        return;
      }

      const users = await getCloudUsers();
      const cleanUser = String(username).trim();

      const exists = users.some((u: any) => u.username.toLowerCase() === cleanUser.toLowerCase());
      if (exists) {
        res.status(400).json({ success: false, error: 'El nombre de usuario ya está registrado.' });
        return;
      }

      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        username: cleanUser,
        password: String(password).trim(),
        displayName: (displayName || cleanUser).trim(),
        plan,
        status: 'active',
        expDate,
        playlists: playlists.map((pl: any, idx: number) => ({ ...pl, isActive: idx === 0 })),
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await saveCloudUsers(users);

      res.status(201).json({ success: true, user: newUser });
      return;
    }

    // ── 3. PUT: Actualizar un usuario existente ──
    if (req.method === 'PUT') {
      const { id, updates } = body;
      if (!id || !updates) {
        res.status(400).json({ success: false, error: 'Se requiere ID y datos a actualizar.' });
        return;
      }

      const users = await getCloudUsers();
      const index = users.findIndex((u: any) => u.id === id);
      if (index === -1) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
        return;
      }

      users[index] = { ...users[index], ...updates };
      await saveCloudUsers(users);

      res.status(200).json({ success: true, user: users[index] });
      return;
    }

    // ── 4. DELETE: Eliminar un usuario ──
    if (req.method === 'DELETE') {
      const id = req.query?.id || body?.id;
      if (!id) {
        res.status(400).json({ success: false, error: 'Se requiere el ID del usuario.' });
        return;
      }

      let users = await getCloudUsers();
      users = users.filter((u: any) => u.id !== id);
      await saveCloudUsers(users);

      res.status(200).json({ success: true, message: 'Usuario eliminado.' });
      return;
    }

    res.status(405).json({ success: false, error: 'Método no soportado.' });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud en el servidor.',
      details: err?.message,
    });
  }
}
