# CoperniGeo

Plataforma de monitoreo agrícola mediante imágenes satelitales.

## Tecnologías

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Firebase Authentication, Firestore, Storage**
- **Google Earth Engine** (imágenes satelitales Copernicus)
- **Google Maps** (visualización interactiva)
- **Resend** (envío de emails)
- **Stripe** (próximamente)

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

#### Firebase
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

Puedes obtener estos valores desde la consola de Firebase:
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a Configuración del proyecto > Tus aplicaciones
4. Selecciona la aplicación web y copia los valores de configuración

#### Google Earth Engine
```env
# Opción 1: Usar credenciales individuales (recomendado para Vercel)
EARTH_ENGINE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
EARTH_ENGINE_CLIENT_EMAIL=tu-service-account@project.iam.gserviceaccount.com

# Opción 2: Usar archivo de credenciales (solo desarrollo local)
GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json
```

Para configurar Google Earth Engine:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Google Earth Engine:
   - Ve a APIs & Services > Library
   - Busca "Google Earth Engine API" y habilítala
4. **Crea una cuenta de servicio:**
   - Ve a IAM & Admin > Service Accounts
   - Crea una nueva cuenta de servicio
   - **Asigna los siguientes roles:**
     - `Earth Engine Resource Writer` (roles/earthengine.writer) - **NECESARIO** para acceder y procesar datos
     - `Storage Object Viewer` (roles/storage.objectViewer) - para acceder a datos almacenados
   - Descarga la clave JSON haciendo clic en la cuenta de servicio > Keys > Add Key > Create new key > JSON
   - Para producción, usa las variables de entorno individuales (extrae `private_key` y `client_email` del JSON)
5. **Registra tu proyecto en Google Earth Engine:**
   - Ve al [Earth Engine Code Editor](https://code.earthengine.google.com/)
   - Inicia sesión con tu cuenta de Google (la misma que usaste para registrarte como no comercial/comercial)
   - Si es tu primera vez usando Earth Engine, puede que necesites aceptar los términos y condiciones
   - **Nota importante:** Para uso con la API de Earth Engine en servidores (Node.js), no necesitas registrar la cuenta de servicio manualmente en Earth Engine Code Editor. Solo necesitas:
     1. Crear la cuenta de servicio en Google Cloud Console (paso 4)
     2. Asignar los roles correctos
     3. Descargar la clave JSON
     4. Usar las credenciales en tu código
   - La cuenta de servicio funcionará automáticamente si tiene los permisos correctos en Google Cloud Console

#### Google Maps
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_maps_api_key
```

Para obtener la API key:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Habilita la API de Maps JavaScript
3. Crea una API key en Credentials
4. Restringe la API key a tu dominio en producción

#### Resend (Email)
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
```

Para configurar Resend:
1. Crea una cuenta en [Resend](https://resend.com/)
2. Obtén tu API key desde el dashboard
3. Verifica tu dominio para usar emails personalizados

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del proyecto

```
src/
├── app/                    # Páginas y rutas (App Router)
│   ├── api/               # API Routes
│   │   ├── satellite/     # Procesamiento de imágenes satelitales
│   │   ├── reports/       # Generación y gestión de reportes
│   │   └── cron/          # Tareas programadas
│   ├── page.tsx           # Landing page
│   ├── registrarte/       # Página de registro
│   ├── inicia-sesion/     # Página de login
│   └── dashboard/         # Dashboard protegido
│       ├── layout.tsx     # Layout con sidebar
│       ├── page.tsx       # Dashboard principal
│       ├── planes/        # Gestión de planes
│       ├── cuenta/        # Configuración de cuenta
│       ├── ayuda/         # FAQ y recursos
│       ├── imagenes/       # Imágenes satelitales (mapa interactivo)
│       └── automatizar-reportes/  # Configuración de reportes
├── components/            # Componentes reutilizables
│   ├── map/               # Componentes de mapa
│   ├── areas/             # Gestión de áreas
│   └── reports/           # Configuración de reportes
├── context/               # Contextos de React
│   └── AuthContext.tsx    # Contexto de autenticación
├── lib/                   # Utilidades y configuraciones
│   ├── firebase.ts        # Configuración de Firebase
│   ├── earthEngine.ts     # Inicialización de Google Earth Engine
│   ├── indices/           # Cálculos de índices (NDVI, NDRE, EVI)
│   ├── firestore/         # Funciones helper de Firestore
│   ├── storage/            # Funciones de Firebase Storage
│   └── email/             # Configuración de Resend
└── types/                 # Definiciones de tipos TypeScript
    ├── area.ts
    ├── report.ts
    └── satellite.ts
```

## Funcionalidades

### Implementadas

- ✅ Landing page con hero section
- ✅ Registro de usuarios (Firebase Auth)
- ✅ Inicio de sesión (Firebase Auth)
- ✅ Dashboard protegido con sidebar
- ✅ Páginas de dashboard (planes, cuenta, ayuda, imágenes, automatizar reportes)
- ✅ Validación de formularios
- ✅ Manejo de errores en español
- ✅ Protección de rutas
- ✅ **Integración con Google Earth Engine**
- ✅ **Visualización interactiva de mapas con Google Maps**
- ✅ **Gestión de áreas (crear, editar, eliminar polígonos)**
- ✅ **Procesamiento de imágenes satelitales Copernicus**
- ✅ **Cálculo de índices NDVI, NDRE y EVI**
- ✅ **Configuración de reportes automáticos**
- ✅ **Generación y envío de reportes por email**
- ✅ **Tareas programadas (cron jobs) para reportes automáticos**

### Próximas implementaciones

- 🔄 Integración con Stripe para pagos
- 🔄 Envío de reportes por WhatsApp
- 🔄 Exportación de reportes en PDF
- 🔄 Sistema de alertas basado en umbrales
- 🔄 Comparación de imágenes entre fechas

## Despliegue

El proyecto está preparado para desplegarse en Vercel:

1. Conecta tu repositorio a Vercel
2. Configura todas las variables de entorno en Vercel:
   - Firebase (Auth, Firestore, Storage)
   - Google Earth Engine (credenciales de cuenta de servicio)
   - Google Maps API key
   - Resend API key
3. Vercel detectará automáticamente Next.js y desplegará el proyecto
4. Los cron jobs se configuran automáticamente mediante `vercel.json`

### Notas importantes

- **Google Earth Engine**: Requiere solicitar acceso y configurar una cuenta de servicio
- **Firestore Security Rules**: **IMPORTANTE** - Debes configurar las reglas de seguridad en Firebase Console. Usa el archivo `firestore.rules.example` como referencia y cópialo a Firebase Console > Firestore > Rules
- **Firebase Storage Rules**: Configura reglas para el almacenamiento de reportes
- **Cron Jobs**: Se ejecutan diariamente a las 6 AM UTC para generar reportes automáticos

#### Configurar Firestore Security Rules

Si las áreas no se están guardando o cargando, probablemente necesitas configurar las reglas de seguridad de Firestore:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** > **Rules**
4. Copia el contenido de `firestore.rules.example` y pégalo en el editor de reglas
5. Haz clic en **Publish** para guardar las reglas

**⚠️ Sin estas reglas, las áreas no se guardarán ni cargarán correctamente.**

## Licencia

Privado - Todos los derechos reservados

