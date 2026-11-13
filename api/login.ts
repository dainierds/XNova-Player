// Vercel Serverless Function: Autenticación de Usuarios y Admin
// Soporta Vercel KV / Upstash Redis para base de datos en la nube

export default async function handler(req: any, res: any) {
  // Configuración de cabeceras CORS para permitir peticiones desde la App de Android TV y Web
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

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Método no permitido. Usa POST.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { username = '', password = '' } = body;

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    if (!cleanUser || !cleanPass) {
      res.status(400).json({ success: false, error: 'Ingresa usuario y contraseña.' });
      return;
    }

    // 1. Acceso de Administrador Maestro
    const isMasterUser = ['admin', 'master', 'administrador'].includes(cleanUser);
    const isMasterPass = ['8888', 'xnova2026', 'admin'].includes(cleanPass);

    if (isMasterUser && isMasterPass) {
      res.status(200).json({
        success: true,
        isAdmin: true,
        user: {
          id: 'admin_root',
          username: 'admin',
          displayName: 'Administrador Maestro',
          plan: 'premium',
          status: 'active',
          expDate: 'ILIMITADO',
          playlists: [],
          createdAt: new Date().toISOString(),
        },
      });
      return;
    }

    // 2. Consulta en la Base de Datos en la Nube (Vercel KV / Upstash Redis)
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) {
      res.status(200).json({
        success: false,
        error: 'Base de datos no conectada en Vercel. Ve a la pestaña "Storage" en Vercel y añade "KV".',
        needsDbSetup: true,
      });
      return;
    }

    // Obtener lista de usuarios desde KV
    const kvRes = await fetch(kvUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', 'xnova_managed_users']),
    });

    const kvData = await kvRes.json();
    let users: any[] = [];
    if (kvData && kvData.result) {
      try {
        users = typeof kvData.result === 'string' ? JSON.parse(kvData.result) : kvData.result;
      } catch {
        users = [];
      }
    }

    const found = users.find(
      (u: any) =>
        String(u.username || '').toLowerCase() === cleanUser &&
        String(u.password || '') === cleanPass
    );

    if (!found) {
      res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
      return;
    }

    if (found.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: 'Tu cuenta ha sido suspendida. Contacta a tu proveedor.',
      });
      return;
    }

    if (found.status === 'expired') {
      res.status(403).json({
        success: false,
        error: 'Tu suscripción ha vencido. Contacta para renovar tu plan.',
      });
      return;
    }

    // Actualizar último login en segundo plano
    found.lastLogin = new Date().toISOString();
    fetch(kvUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', 'xnova_managed_users', JSON.stringify(users)]),
    }).catch(() => {});

    res.status(200).json({
      success: true,
      isAdmin: false,
      user: found,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Error interno en el servidor de autenticación.',
      details: err?.message,
    });
  }
}
