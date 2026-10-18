import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const hasKeys = url && key && !url.includes('placeholder');

function createChain(data: any[]) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => ({ data: data[0], error: null }),
    then: (resolve: any) => resolve({ data, error: null }),
  };
  // rende awaitable
  chain[Symbol.toStringTag] = 'Promise';
  return chain;
}

const mockProducts = [
  { id: '1', name: 'Dalla Prof Classic', category: 'BURGER', price: 8.5, available: true, description: 'Il nostro classico' },
  { id: '2', name: 'Piadina Crudo', category: 'PIADINE', price: 7, available: true },
  { id: '3', name: 'Schiacciata', category: 'SCHIACCIATE', price: 7.5, available: true },
  { id: '4', name: 'Toast', category: 'TOAST', price: 6, available: true },
  { id: '5', name: 'Hot Dog', category: 'HOT DOG', price: 5.5, available: true },
  { id: '6', name: 'Pan Porchetta', category: 'PAN PORCHETTA', price: 8, available: true },
];

export const supabase = hasKeys
  ? createClient(url, key)
  : {
      from: () => createChain(mockProducts),
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    } as any;
