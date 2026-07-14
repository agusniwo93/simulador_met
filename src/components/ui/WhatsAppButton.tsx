// Botón flotante de WhatsApp. El número y el mensaje se configuran por entorno:
//   NEXT_PUBLIC_WHATSAPP=51999888777   (solo dígitos, con código de país)
//   NEXT_PUBLIC_WHATSAPP_MSG=Hola, tengo una consulta sobre el simulador.
const NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP || "51936010697").replace(/\D/g, "");
const MSG =
  process.env.NEXT_PUBLIC_WHATSAPP_MSG || "Hola, tengo una consulta sobre el simulador MET.";

export default function WhatsAppButton() {
  if (!NUMBER) return null;
  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(MSG)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="WhatsApp"
      title="WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition hover:scale-105 active:scale-95"
    >
      <svg viewBox="0 0 32 32" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.8L.5 31.5l7.9-2c2.3 1.2 4.9 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.7 1.2 1.3-4.6-.3-.5c-1.3-2.1-2-4.5-2-7 0-7.1 5.8-12.9 12.9-12.9S28.9 8.9 28.9 16 23.1 28.8 16 28.8zm7.1-9.7c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.3-2.1-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.7.2-.2.2-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.2-1.3-3-.3-.8-.7-.7-.9-.7h-.8c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.4 3.6 1.5 3.9c.2.3 2.7 4.2 6.6 5.9.9.4 1.6.6 2.2.8.9.3 1.7.2 2.4.1.7-.1 2.3-.9 2.6-1.9.3-.9.3-1.7.2-1.9-.1-.1-.3-.2-.7-.4z" />
      </svg>
    </a>
  );
}
