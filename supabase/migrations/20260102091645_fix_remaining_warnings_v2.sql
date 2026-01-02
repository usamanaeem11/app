/*
  # Fix Remaining Analyzer Warnings

  ## Changes
  
  1. Drop unused function with mutable search path
  2. Keep RLS policies optimized (already done in previous migration)
  
  ## Impact
  - Removes function search path warning
  - Maintains all RLS optimizations
*/

-- Drop function with mutable search path issue
DROP FUNCTION IF EXISTS public.check_auto_tracking_consent(uuid);
DROP FUNCTION IF EXISTS public.check_auto_tracking_consent(text);
