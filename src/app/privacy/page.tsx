import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Política de Privacidad - Pulso",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-blue hover:underline mb-8">
                    <ArrowLeft size={20} />
                    Volver al inicio
                </Link>
                
                <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>
                
                <div className="prose prose-invert max-w-none text-text-secondary space-y-6">
                    <p className="text-sm">Última actualización: 26 de Mayo de 2026</p>

                    <p>
                        En Pulso, valoramos y respetamos su privacidad. Esta Política de Privacidad describe cómo 
                        recopilamos, usamos, protegemos y compartimos su información personal cuando utiliza 
                        nuestra plataforma y servicios.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">1. Información que Recopilamos</h2>
                    <p>
                        Podemos recopilar los siguientes tipos de información:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li><strong>Información de la Cuenta:</strong> Nombre de usuario, dirección de correo electrónico, contraseña, foto de perfil y otra información proporcionada al registrarse.</li>
                        <li><strong>Contenido:</strong> Tweets, comentarios, me gusta, mensajes y cualquier otro contenido que publique o comparta en la plataforma.</li>
                        <li><strong>Datos de Uso:</strong> Información sobre cómo interactúa con nuestra plataforma, como enlaces en los que hace clic, tiempo de uso y páginas visitadas.</li>
                        <li><strong>Información del Dispositivo:</strong> Dirección IP, tipo de navegador, sistema operativo y otra información técnica de su dispositivo.</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">2. Cómo Usamos Su Información</h2>
                    <p>
                        Utilizamos la información recopilada para:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>Proporcionar, mantener y mejorar nuestros servicios.</li>
                        <li>Personalizar su experiencia y ofrecerle contenido y anuncios relevantes.</li>
                        <li>Analizar tendencias y comportamientos de los usuarios para mejorar la plataforma.</li>
                        <li>Comunicarnos con usted respecto a actualizaciones, soporte y ofertas promocionales.</li>
                        <li>Proteger la seguridad y la integridad de nuestra plataforma y prevenir fraudes.</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">3. Compartir Información</h2>
                    <p>
                        No vendemos su información personal a terceros. Podemos compartir su información en las siguientes circunstancias:
                    </p>
                    <ul className="list-disc pl-6 mt-2 space-y-2">
                        <li>Con proveedores de servicios que nos ayudan a operar la plataforma (bajo acuerdos de confidencialidad).</li>
                        <li>Si es requerido por la ley o para responder a un proceso legal válido.</li>
                        <li>Para proteger los derechos, la propiedad y la seguridad de Pulso, nuestros usuarios u otras personas.</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">4. Cookies y Tecnologías Similares</h2>
                    <p>
                        Utilizamos cookies para personalizar el contenido, proporcionar funciones de redes sociales 
                        y analizar nuestro tráfico. Puede configurar su navegador para rechazar las cookies, pero esto 
                        puede afectar el funcionamiento de algunas partes de la plataforma.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">5. Sus Derechos</h2>
                    <p>
                        Dependiendo de su ubicación, puede tener derecho a acceder, corregir, actualizar o eliminar 
                        su información personal. Si desea ejercer alguno de estos derechos, póngase en contacto con 
                        nosotros a través de las herramientas de configuración de su cuenta o por correo electrónico.
                    </p>

                    <h2 className="text-2xl font-bold text-text-primary mt-8">6. Cambios en esta Política</h2>
                    <p>
                        Podemos actualizar esta Política de Privacidad de vez en cuando. Le notificaremos cualquier 
                        cambio importante publicando la nueva Política en esta página y actualizando la fecha de 
                        "Última actualización".
                    </p>
                </div>
                
                <footer className="mt-16 pt-8 border-t border-border text-center text-text-secondary text-sm">
                    &copy; {new Date().getFullYear()} Pulso. Todos los derechos reservados.
                </footer>
            </div>
        </div>
    );
}
