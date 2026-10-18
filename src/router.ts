// Roteamento por hash (#/modulo/m1?sec=volume): funciona abrindo o
// index.html direto do disco, sem servidor.
import { useEffect, useState } from 'react';

export interface Route {
  parts: string[];
  query: URLSearchParams;
  raw: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs), raw };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(href: string) {
  window.location.hash = href.replace(/^#/, '');
}

export const moduleHref = (id: string, sec?: string) => `#/modulo/${id}${sec ? `?sec=${sec}` : ''}`;
