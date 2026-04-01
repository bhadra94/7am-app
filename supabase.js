import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fuqxompisecnoqrmrcau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cXhvbXBpc2Vjbm9xcm1yY2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMTIwNzYsImV4cCI6MjA5MDU4ODA3Nn0.q50AU8ULiBnmVhtOR2dEeDC2h2Ikxg8lBHb2bJ8fF2U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);