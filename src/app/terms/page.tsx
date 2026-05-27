import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Términos y Condiciones - Pulso",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-blue hover:underline mb-8">
                    <ArrowLeft size={20} />
                    Volver al inicio
                </Link>
                
                <h1 className="text-4xl font-bold mb-8">Términos y Condiciones de Uso</h1>
                
                <div className="prose prose-invert max-w-none text-text-secondary space-y-6">
                    <p className="text-sm">Última actualización: 26 de Mayo de 2026</p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">1. Aceptación de los Términos</h2>
                    <p>
                        Al acceder y utilizar Pulso (en adelante, "la Plataforma"), usted acepta estar sujeto a estos 
                        Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de los términos, no podrá 
                        acceder a la Plataforma.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">2. Creación y Uso de Cuentas</h2>
                    <p>
                        Para utilizar ciertas funciones de la Plataforma, debe registrarse y crear una cuenta. 
                        Usted es responsable de salvaguardar su contraseña y asume la responsabilidad de cualquier 
                        actividad o acción bajo su contraseña, ya sea que su cuenta esté con nuestro Servicio o un servicio 
                        de terceros (como Google).
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">3. Contenido Generado por el Usuario</h2>
                    <p>
                        Nuestra Plataforma le permite publicar, enlazar, almacenar, compartir y poner a disposición 
                        cierta información, texto, gráficos, videos u otro material ("Contenido"). Usted es responsable 
                        del Contenido que publica, incluyendo su legalidad, fiabilidad y adecuación.
                    </p>
                    <p>
                        Al publicar Contenido en Pulso, nos otorga el derecho y la licencia para usar, modificar, 
                        ejecutar públicamente, mostrar públicamente, reproducir y distribuir dicho Contenido en y a 
                        través de la Plataforma.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">4. Comportamiento y Restricciones</h2>
                    <p>
                        Se prohíbe el uso de la Plataforma para:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>Publicar contenido que sea ilegal, amenazante, difamatorio, obsceno o promueva el odio.</li>
                        <li>Acosar, abusar o dañar a otra persona.</li>
                        <li>Intentar interferir, comprometer la integridad del sistema o la seguridad de la plataforma.</li>
                        <li>Realizar actividades de spam, recolección de datos automatizada (scraping) o cualquier actividad comercial no autorizada.</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">5. Terminación</h2>
                    <p>
                        Podemos terminar o suspender su cuenta de inmediato, sin previo aviso o responsabilidad, por 
                        cualquier motivo, incluyendo, sin limitación, si usted incumple los Términos. Al momento de la 
                        terminación, su derecho a utilizar la Plataforma cesará inmediatamente.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">6. Limitación de Responsabilidad</h2>
                    <p>
                        En ningún caso Pulso, ni sus directores, empleados, socios o afiliados, serán responsables 
                        por cualquier daño indirecto, incidental, especial, consecuente o punitivo, incluyendo sin 
                        limitación, pérdida de beneficios, datos, uso, buena voluntad, u otras pérdidas intangibles, 
                        resultantes de su acceso o uso de la plataforma.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">7. Cambios en los Términos</h2>
                    <p>
                        Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos 
                        en cualquier momento. Lo que constituye un cambio material será determinado a nuestra sola discreción.
                    </p>
                </div>
                
                <footer className="mt-16 pt-8 border-t border-border text-center text-text-secondary text-sm">
                    &copy; {new Date().getFullYear()} Pulso. Todos los derechos reservados.
                </footer>
            </div>
        </div>
    );
}
