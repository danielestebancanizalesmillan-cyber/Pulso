import Link from "next/link";

export const metadata = {
    title: "Política de Privacidad - Pulso",
};

export default function PrivacyPage() {
    return (
        <div style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            padding: "40px 24px",
        }}>
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
                <Link href="/" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--blue)",
                    textDecoration: "none",
                    marginBottom: "32px",
                    fontWeight: 600,
                }}>
                    ← Volver al inicio
                </Link>

                <h1 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "32px" }}>
                    Política de Privacidad
                </h1>

                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
                    Última actualización: 26 de Mayo de 2026
                </p>

                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "32px" }}>
                    En Pulso, valoramos y respetamos su privacidad. Esta Política de Privacidad describe cómo
                    recopilamos, usamos, protegemos y compartimos su información personal cuando utiliza
                    nuestra plataforma y servicios.
                </p>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>1. Información que Recopilamos</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
                        Podemos recopilar los siguientes tipos de información:
                    </p>
                    <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, paddingLeft: "24px" }}>
                        <li><strong style={{ color: "var(--text-primary)" }}>Información de la Cuenta:</strong> Nombre de usuario, dirección de correo electrónico, contraseña, foto de perfil y otra información proporcionada al registrarse.</li>
                        <li><strong style={{ color: "var(--text-primary)" }}>Contenido:</strong> Tweets, comentarios, me gusta, mensajes y cualquier otro contenido que publique o comparta en la plataforma.</li>
                        <li><strong style={{ color: "var(--text-primary)" }}>Datos de Uso:</strong> Información sobre cómo interactúa con nuestra plataforma, como enlaces en los que hace clic, tiempo de uso y páginas visitadas.</li>
                        <li><strong style={{ color: "var(--text-primary)" }}>Información del Dispositivo:</strong> Dirección IP, tipo de navegador, sistema operativo y otra información técnica de su dispositivo.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>2. Cómo Usamos Su Información</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
                        Utilizamos la información recopilada para:
                    </p>
                    <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, paddingLeft: "24px" }}>
                        <li>Proporcionar, mantener y mejorar nuestros servicios.</li>
                        <li>Personalizar su experiencia y ofrecerle contenido y anuncios relevantes.</li>
                        <li>Analizar tendencias y comportamientos de los usuarios para mejorar la plataforma.</li>
                        <li>Comunicarnos con usted respecto a actualizaciones, soporte y ofertas promocionales.</li>
                        <li>Proteger la seguridad y la integridad de nuestra plataforma y prevenir fraudes.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>3. Compartir Información</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
                        No vendemos su información personal a terceros. Podemos compartir su información en las siguientes circunstancias:
                    </p>
                    <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, paddingLeft: "24px" }}>
                        <li>Con proveedores de servicios que nos ayudan a operar la plataforma (bajo acuerdos de confidencialidad).</li>
                        <li>Si es requerido por la ley o para responder a un proceso legal válido.</li>
                        <li>Para proteger los derechos, la propiedad y la seguridad de Pulso, nuestros usuarios u otras personas.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>4. Cookies y Tecnologías Similares</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Utilizamos cookies para personalizar el contenido, proporcionar funciones de redes sociales
                        y analizar nuestro tráfico. Puede configurar su navegador para rechazar las cookies, pero esto
                        puede afectar el funcionamiento de algunas partes de la plataforma.
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>5. Sus Derechos</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Dependiendo de su ubicación, puede tener derecho a acceder, corregir, actualizar o eliminar
                        su información personal. Si desea ejercer alguno de estos derechos, póngase en contacto con
                        nosotros a través de las herramientas de configuración de su cuenta o por correo electrónico.
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>6. Cambios en esta Política</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Podemos actualizar esta Política de Privacidad de vez en cuando. Le notificaremos cualquier
                        cambio importante publicando la nueva Política en esta página y actualizando la fecha de
                        &quot;Última actualización&quot;.
                    </p>
                </section>

                <footer style={{
                    marginTop: "64px",
                    paddingTop: "24px",
                    borderTop: "1px solid var(--border)",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                }}>
                    © {new Date().getFullYear()} Pulso. Todos los derechos reservados.
                </footer>
            </div>
        </div>
    );
}
