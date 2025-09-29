import { setupAPIdiagnostics } from './api-diagnostics';

export const initDiagnostics = () => {
  setupAPIdiagnostics();
  console.log('📊 API diagnostics enabled');
  
  // Environment diagnostics
  console.group('🔧 Environment Configuration Check');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL;
  
  console.log('Supabase URL:', supabaseUrl ? '✅ Configured' : '❌ Missing');
  console.log('Supabase Anon Key:', supabaseAnonKey ? '✅ Configured' : '❌ Missing');
  console.log('API URL:', apiUrl ? '✅ Configured' : '⚠️ Will auto-construct from Supabase URL');
  
  if (!supabaseUrl) {
    console.error('🚨 MISSING SUPABASE_URL - Create .env.local file with VITE_SUPABASE_URL');
  }
  
  if (!supabaseAnonKey) {
    console.error('🚨 MISSING SUPABASE_ANON_KEY - Create .env.local file with VITE_SUPABASE_ANON_KEY');
  }
  
  console.groupEnd();
  
  // Connection test
  if (supabaseUrl && supabaseAnonKey) {
    console.log('🔗 Environment configured - ready for API calls');
  } else {
    console.warn('⚠️ Incomplete environment configuration - some features may not work');
  }
};