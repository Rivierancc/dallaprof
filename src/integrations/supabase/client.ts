import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Se le chiavi mancano su Vercel, usa i dati finti così non rimane nero
const isConfigured = url && key && !url.includes('placeholder');

export const supabase = isConfigured 
  ? createClient(url, key)
  : {
      from: () => ({
        select: async () => ({
          data: [
            { id: '1', name: 'BURGER', category: 'BURGER', price: 8.5, available: true },
            { id: '2', name: 'PIADINE', category: 'PIADINE', price: 7, available: true },
            { id: '3', name: 'SCHIACCIATE', category: 'SCHIACCIATE', price: 7.5, available: true },
            { id: '4', name: 'TOAST', category: 'TOAST', price: 6, available: true },
            { id: '5', name: 'HOT DOG', category: 'HOT DOG', price: 5.5, available: true },
            { id: '6', name: 'PAN PORCHETTA', category: 'PAN PORCHETTA', price: 8, available: true },
          ],
          error: null
        })
      })
    } as any;
