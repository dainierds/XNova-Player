# 📺 XNova Player - Reproductor IPTV Premium para Android TV & Fire TV

> **AVISO IMPORTANTE:** Esta aplicación es **únicamente un reproductor multimedia**. NO incluye canales, películas, series ni credenciales preconfiguradas. El usuario debe ingresar sus propias credenciales de proveedor IPTV (mediante Xtream Codes API o lista M3U/M3U8).

---

## 🌟 Características Principales

- **Diseño Estilo "Prime Black"**: Interfaz cinematográfica horizontal con Hero Banner de fondo dinámico, degradados oscuros, panel de información enriquecido y chips de género.
- **Navegación 100% Control Remoto (D-pad)**: Optimizado para televisores (1080p / 4K). Foco visual evidente, animaciones suaves a 60 FPS y retención de memoria de foco.
- **Gestión de hasta 3 Listas IPTV**: Soporte completo para Xtream Codes (`player_api.php`) y listas M3U/M3U8 con categorización automática. Puedes agregar, editar, alternar y borrar listas en cualquier momento.
- **Metadatos Enriquecidos (TMDb)**: Búsqueda automática de sinopsis en español, carátulas HD, año, duración y clasificación por edad.
- **Reproductor de Video Avanzado**: Soporte HLS adaptativo (`hls.js`), controles OSD con D-pad (adelantar/retroceder ±10s, selección de pistas de audio y subtítulos, zapping rápido de canales arriba/abajo).
- **Continuar Viendo**: Guarda el segundo exacto donde te quedaste para reanudar tus películas y series.
- **Favoritos**: Marcado rápido mediante pulsación prolongada del botón OK/Enter del control remoto.
- **Perfiles y Control Parental**: Perfiles "ADULTO" y "NIÑOS" protegidos por PIN de 4 dígitos (por defecto `0000`) para filtrar contenido no apto para menores.
- **Búsqueda TV con Teclado en Pantalla**: Teclado virtual diseñado para navegar letra por letra con el D-pad y filtrar resultados en tiempo real.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Estado Global**: Zustand.
- **Almacenamiento Local**: IndexedDB (`idb-keyval`) para guardar credenciales, progreso y caché sin saturar la memoria del televisor.
- **Reproducción HLS**: `hls.js`.
- **Empaquetado TV**: Capacitor Android con soporte para `LEANBACK_LAUNCHER` e intent de Fire TV.
- **CI/CD**: GitHub Actions para compilación automática de APKs firmados.

---

## 🚀 1. Cómo correr el proyecto en GitHub Codespaces

Si deseas editar y probar el reproductor en la nube sin instalar nada localmente:

1. Sube este repositorio a tu cuenta de **GitHub**.
2. Haz clic en el botón verde **Code** > pestaña **Codespaces** > **Create codespace on main**.
3. En la terminal integrada de Codespaces, instala las dependencias y arranca el servidor:
   ```bash
   npm install
   npm run dev
   ```
4. Se abrirá una notificación para abrir la vista previa en el puerto `5173`. Haz clic en **Open in Browser**.
5. ¡Listo! Puedes interactuar con la app usando las **flechas del teclado** (Arriba, Abajo, Izquierda, Derecha), la tecla **Enter** para seleccionar y **Escape / Retroceso** para volver atrás.

---

## 🔑 2. Cómo generar el Keystore y guardarlo como secretos en GitHub

Para que la compilación automática firme el APK con tu propia clave privada de distribución:

### Paso 2.1: Generar el archivo Keystore
En tu terminal (Linux/macOS o Git Bash en Windows):
```bash
keytool -genkey -v -keystore xnova-release.keystore -alias xnova -keyalg RSA -keysize 2048 -validity 10000
```
Te pedirá una contraseña (por ejemplo, `MiPasswordSegura123`) y datos de identificación.

### Paso 2.2: Convertir el keystore a formato Base64
- En **Windows (PowerShell)**:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("xnova-release.keystore")) | Out-File -Encoding ascii keystore_base64.txt
  ```
- En **Linux / macOS**:
  ```bash
  base64 -w 0 xnova-release.keystore > keystore_base64.txt
  ```

### Paso 2.3: Configurar Secretos en GitHub
1. En tu repositorio de GitHub, dirígete a **Settings** > **Secrets and variables** > **Actions**.
2. Haz clic en **New repository secret** y añade las siguientes 4 variables:
   - `ANDROID_KEYSTORE_BASE64`: Copia y pega el contenido completo de `keystore_base64.txt`.
   - `KEYSTORE_PASSWORD`: La contraseña de tu keystore.
   - `KEY_ALIAS`: `xnova` (o el alias que usaste en `keytool`).
   - `KEY_PASSWORD`: La contraseña de la clave (generalmente la misma que la del keystore).

*(Nota: Si no configuras estos secretos, el workflow generará automáticamente un keystore auto-firmado de respaldo para que la compilación nunca falle).*

---

## 📦 3. Compilación y Publicación del APK

1. Haz un **push** a la rama `main` de tu repositorio:
   ```bash
   git add .
   git commit -m "Compilar nueva versión TV"
   git push origin main
   ```
2. Ve a la pestaña **Actions** en GitHub. Verás el flujo `Compilar APK Android TV / Fire TV` ejecutándose.
3. Cuando termine (tarda aproximadamente 3 minutos):
   - Ve a la sección **Releases** a la derecha de tu repositorio.
   - Encontrarás la última versión con el archivo listo para descargar: **`XNova-Player-AndroidTV.apk`**.

---

## 📺 4. Instalación en Fire TV / Android TV con la app Downloader (AFTVnews)

Para instalar el APK directamente en tu televisor sin cables ni pendrives:

### Paso 4.1: Obtener el enlace directo del APK
1. En tu ordenador o teléfono, ve a la sección **Releases** de tu repositorio.
2. Haz clic derecho sobre el archivo `XNova-Player-AndroidTV.apk` y selecciona **Copiar dirección del enlace**.

### Paso 4.2: Crear un Código Corto en AFTVnews
1. Entra en tu navegador a: **[go.aftvnews.com](https://go.aftvnews.com)** o un acortador similar.
2. Pega el enlace directo de tu APK copiado en el paso anterior.
3. El sistema te generará un **código numérico corto de 5 o 6 dígitos** (ejemplo: `842915`).

### Paso 4.3: Descargar e Instalar en tu TV / Fire Stick
1. En tu Fire Stick o Android TV, abre la app **Downloader**.
2. En la casilla de URL, escribe el **código de 5 o 6 dígitos** y presiona **Go**.
3. Downloader descargará el archivo e iniciará inmediatamente el asistente de instalación.
4. Presiona **Instalar** y luego **Abrir**. ¡A disfrutar de tu reproductor con experiencia cinematográfica!

---

## 🎮 Controles del Mando a Distancia (D-pad)

| Tecla / Control | Acción en Pantalla Principal | Acción en Reproductor |
| :--- | :--- | :--- |
| **Flecha Izquierda / Derecha** | Cambiar película en el carrusel de pósters | Adelantar o retroceder 10 segundos |
| **Flecha Abajo** | Bajar al menú inferior (Películas, Series, Canales TV...) | En canales en vivo: Canal siguiente |
| **Flecha Arriba** | Subir del menú inferior al carrusel de pósters | En canales en vivo: Canal anterior |
| **OK / Enter** | Reproducir película o abrir sección | Play / Pausa (mostrar barra de controles) |
| **Pulsación Larga en OK** | Añadir/Quitar contenido de Favoritos | Alternar pistas de audio |
| **Atrás (Back / Esc)** | Confirmar salida de la aplicación | Cerrar reproductor y guardar progreso |
