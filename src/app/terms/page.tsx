import Link from "next/link";

export const metadata = {
    title: "Términos y Condiciones - Pulso",
};

export default function TermsPage() {
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
                    Términos y Condiciones de Uso
                </h1>

                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "32px" }}>
                    Última actualización: 26 de Mayo de 2026
                </p>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>1. Aceptación de los Términos</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Al acceder y utilizar Pulso (en adelante, &quot;la Plataforma&quot;), usted acepta estar sujeto a estos
                        Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de los términos, no podrá
                        acceder a la Plataforma.
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>2. Creación y Uso de Cuentas</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Para utilizar ciertas funciones de la Plataforma, debe registrarse y crear una cuenta.
                        Usted es responsable de salvaguardar su contraseña y asume la responsabilidad de cualquier
                        actividad o acción bajo su contraseña, ya sea que su cuenta esté con nuestro Servicio o un servicio
                        de terceros (como Google).
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>3. Contenido Generado por el Usuario</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
                        Nuestra Plataforma le permite publicar, enlazar, almacenar, compartir y poner a disposición
                        cierta información, texto, gráficos, videos u otro material (&quot;Contenido&quot;). Usted es responsable
                        del Contenido que publica, incluyendo su legalidad, fiabilidad y adecuación.
                    </p>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Al publicar Contenido en Pulso, nos otorga el derecho y la licencia para usar, modificar,
                        ejecutar públicamente, mostrar públicamente, reproducir y distribuir dicho Contenido en y a
                        través de la Plataforma.
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>4. Comportamiento y Restricciones</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
                        Se prohíbe el uso de la Plataforma para:
                    </p>
                    <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, paddingLeft: "24px" }}>
                        <li>Publicar contenido que sea ilegal, amenazante, difamatorio, obsceno o promueva el odio.</li>
                        <li>Acosar, abusar o dañar a otra persona.</li>
                        <li>Intentar interferir, comprometer la integridad del sistema o la seguridad de la plataforma.</li>
                        <li>Realizar actividades de spam, recolección de datos automatizada (scraping) o cualquier actividad comercial no autorizada.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>5. Terminación</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Podemos terminar o suspender su cuenta de inmediato, sin previo aviso o responsabilidad, por
                        cualquier motivo, incluyendo, sin limitación, si usted incumple los Términos. Al momento de la
                        terminación, su derecho a utilizar la Plataforma cesará inmediatamente.
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>6. Limitación de Responsabilidad</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        En ningún caso Pulso, ni sus directores, empleados, socios o afiliados, serán responsables
                        por cualquier daño indirecto, incidental, especial, consecuente o punitivo, incluyendo sin
                        limitación, pérdida de beneficios, datos, uso, buena voluntad, u otras pérdidas intangibles,
                        resultantes de su acceso o uso de la plataforma.
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>7. Cambios en los Términos</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos
                        en cualquier momento. Lo que constituye un cambio material será determinado a nuestra sola discreción.
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
