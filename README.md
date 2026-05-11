# Pulso - Red Social

Bienvenido a **Pulso**, una plataforma de red social moderna diseñada para conectar personas y potenciar la interacción.

## PulsAI: Tu Asistente de Inteligencia Social

Pulso integra **PulsAI**, una capa de inteligencia artificial diseñada para:
- **Analizar Tendencias**: Descubre qué está pasando en tiempo real con análisis profundo.
- **Asistencia en Contenido**: Ayuda a redactar y optimizar tus publicaciones para mayor impacto.
- **Moderación Inteligente**: Mantiene la comunidad segura y libre de spam.
- **Búsqueda Avanzada**: Encuentra información relevante mediante procesamiento de lenguaje natural.

## Características Principales

- **Feed Dinámico**: Interacción en tiempo real con un diseño fluido y moderno.
- **Mensajería Instantánea**: Conexión directa con tus amigos y seguidores.
- **Perfiles Personalizables**: Expresa tu identidad con herramientas de personalización premium.
- **Integración de Medios**: Comparte imágenes, videos y GIFs de forma sencilla.
- **Arquitectura Escalable**: Construido con las tecnologías más modernas para garantizar velocidad y estabilidad.

## Stack Tecnológico

- **Framework**: [Next.js 15+](https://nextjs.org/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) / Vanilla CSS
- **Base de Datos**: [Prisma](https://www.prisma.io/) (PostgreSQL/MySQL)
- **Autenticación**: [NextAuth.js](https://next-auth.js.org/)
- **IA**: Modelos LLM integrados mediante servicios de vanguardia.

## Instalación y Configuración

Sigue estos pasos para ejecutar el proyecto localmente:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/danielestebancanizalesmillan-cyber/Pulso.git
   cd Pulso
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example` (si existe) y añade tus credenciales.

4. **Ejecutar migraciones de base de datos:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---
Desarrollado con ❤️ por el equipo de Pulso.
