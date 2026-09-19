# Documentación Técnica de Pulso

Bienvenido a la documentación técnica de **Pulso**, una red social moderna y escalable. Este documento proporciona una visión general de la arquitectura, las tecnologías utilizadas y las instrucciones para configurar y ejecutar el proyecto localmente.

## 1. Visión General del Proyecto

Pulso es una plataforma social diseñada con un enfoque en la velocidad, seguridad, y una experiencia de usuario fluida (UX). Soporta características como autenticación avanzada, manejo multimedia, interacciones en tiempo real (Pusher) y está preparada para implementaciones móviles usando Capacitor.

- **URL de Producción**: [https://pulso-tdch.vercel.app](https://pulso-tdch.vercel.app)
- **Repositorio/Entorno**: Next.js (App Router)

## 2. Stack Tecnológico

El proyecto está construido sobre un stack moderno de JavaScript/TypeScript, garantizando alto rendimiento y escalabilidad:

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Estilos & Animaciones**: Framer Motion, con soporte de modo oscuro integrado.
- **Iconografía**: Lucide React.
- **PWA**: Soporte a través de `@ducanh2912/next-pwa`.

### Backend & Base de Datos
- **ORM**: Prisma Client.
- **Base de Datos**: PostgreSQL (deducido por el uso de Prisma y estándares de la industria).
- **Autenticación**: Auth.js (NextAuth) con `@auth/prisma-adapter` y Firebase.
- **Tiempo Real**: Pusher y Pusher-js (WebSockets).

### Almacenamiento y Servicios Externos
- **Imágenes/Media**: Vercel Blob y Cloudinary.
- **Emails**: Firebase.
- **Integración de IA**: `@google/generative-ai` (Gemini).

### Móvil
- **Framework Cross-Platform**: Capacitor (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`).

## 3. Estructura de Directorios (Principal)

- `/src/app`: Rutas principales de la aplicación usando el App Router de Next.js.
- `/src/components`: Componentes reutilizables de UI.
- `/src/lib`: Utilidades, configuraciones de bases de datos y servicios externos (ej. Prisma client).
- `/prisma`: Esquemas de la base de datos y migraciones.
- `/public`: Archivos estáticos e imágenes.
- `/android` y `/ios`: Proyectos nativos generados por Capacitor para el despliegue en tiendas de aplicaciones.

## 4. Instalación y Configuración Local

### Requisitos Previos
- Node.js (v20 o superior recomendado).
- Gestor de paquetes npm.
- Instancia de base de datos PostgreSQL.

### Pasos

1. **Instalar Dependencias**
   ```bash
   npm install
   ```

2. **Configurar Variables de Entorno**
   Copia el archivo de ejemplo (si existe) o crea un archivo `.env` en la raíz del proyecto. Asegúrate de incluir:
   - URL de la Base de Datos (Prisma).
   - Claves de Auth.js (Secret).
   - Credenciales de Vercel Blob / Cloudinary.
   - Claves de Pusher, Resend, Firebase y Google Generative AI.

3. **Generar el Cliente de Prisma y Sincronizar**
   ```bash
   npx prisma generate
   npx prisma db push # o npx prisma migrate dev
   ```

4. **Ejecutar el Servidor de Desarrollo**
   ```bash
   npm run dev
   ```
   El servidor estará disponible en `http://localhost:3000`.

## 5. Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo en la red local.
- `npm run build`: Genera los artefactos de Prisma y construye la aplicación optimizada para producción.
- `npm run start`: Inicia el servidor de producción (requiere haber ejecutado `build` previamente).
- `npm run lint`: Analiza el código buscando problemas de formato o errores usando ESLint.

## 6. Integración Móvil (Capacitor)

Pulso está preparado para compilarse como aplicación móvil. Para sincronizar los cambios web con los proyectos nativos:

1. Construye el proyecto web:
   ```bash
   npm run build
   ```
2. Sincroniza con Capacitor:
   ```bash
   npx cap sync
   ```
3. Abre el IDE nativo:
   ```bash
   npx cap open android  # Para Android Studio
   npx cap open ios      # Para Xcode
   ```

---
*Documentación generada automáticamente para Pulso.*
