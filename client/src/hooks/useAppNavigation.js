import { useEffect, useState } from 'react';

export const DEFAULT_COMMUNITIES = [
  {
    slug: 'thekingdom',
    tag: 'THE KINGDOM',
    name: 'The Kingdom',
    theme: 'kingdom',
    subtitle: 'Comunidade oficial · Eventos, desafios, histórias e recompensas exclusivas',
  },
  {
    slug: 'heaven',
    tag: 'HEAVEN',
    name: 'Heaven',
    theme: 'ducks',
    subtitle: 'Comunidade oficial Heaven · Eventos, desafios e recompensas exclusivas',
  },
];

export function getFallbackMeta(slug) {
  if (slug === 'heaven') return DEFAULT_COMMUNITIES[1];
  return DEFAULT_COMMUNITIES[0];
}

export function useHash() {
  const get = () => location.hash.slice(1) || 'inicio';
  const [h, setH] = useState(get);
  useEffect(() => {
    const f = () => setH(get());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return h;
}

export function useWide() {
  const q = '(min-width:1180px)';
  const [w, setW] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = (e) => setW(e.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return w;
}