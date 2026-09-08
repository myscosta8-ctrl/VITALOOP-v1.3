import { useId } from 'react';

/**
 * Marca Vitaloop — infinito vital (loop mint + loop branco) cruzado por um
 * traço de ECG, sobre fundo azul-petróleo. Reconstrução vetorial do emblema
 * oficial do produto, usada como identidade visual em toda a aplicação
 * (tela de login, casca de navegação) em vez de um <h1> de texto solto.
 *
 * IDs de gradiente são gerados por instância (useId) porque o AppShell
 * renderiza esta marca duas vezes na mesma página (sidebar + topbar) — IDs
 * fixos duplicariam no DOM.
 */
export const VitaloopMark = ({ size = 32 }: { size?: number }): JSX.Element => {
  const uid = useId();
  const bgId = `${uid}-bg`;
  const loopLId = `${uid}-loop-l`;
  const loopRId = `${uid}-loop-r`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Vitaloop">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#164a5c" />
          <stop offset="1" stopColor="#0a1f28" />
        </linearGradient>
        <linearGradient id={loopLId} x1="17" y1="33" x2="51" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#cdf3e6" />
          <stop offset="1" stopColor="#5fc9b8" />
        </linearGradient>
        <linearGradient id={loopRId} x1="49" y1="33" x2="83" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d7e6e4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill={`url(#${bgId})`} />
      <circle cx="34" cy="50" r="17" fill="none" stroke={`url(#${loopLId})`} strokeWidth="7" />
      <circle cx="66" cy="50" r="17" fill="none" stroke={`url(#${loopRId})`} strokeWidth="7" />
      <path
        d="M15 50 H25 L30.5 40 L38 61 L44.5 50 H58"
        fill="none"
        stroke="#d1262c"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
