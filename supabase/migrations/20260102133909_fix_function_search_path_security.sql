/*
  # Fix Function Search Path Security Issue

  ## Changes
  
  1. Recreate `check_auto_tracking_consent` function with immutable search_path
     - Sets search_path explicitly to prevent search_path injection attacks
     - Uses SECURITY INVOKER for proper privilege handling
  
  ## Security Impact
  - Prevents search_path manipulation attacks
  - Ensures function always references correct schema objects
*/

CREATE OR REPLACE FUNCTION public.check_auto_tracking_consent(p_user_id text, p_consent_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_employment_type TEXT;
  v_has_consent BOOLEAN := false;
BEGIN
  -- Get user employment type
  SELECT employment_type INTO v_employment_type
  FROM public.users WHERE user_id = p_user_id;

  -- Freelancers don't need consent (they control their own tracking)
  IF v_employment_type = 'freelancer' THEN
    RETURN true;
  END IF;

  -- Full-time employees need active agreement with consent
  IF p_consent_type = 'auto_timer' THEN
    SELECT auto_timer_consent INTO v_has_consent
    FROM public.work_agreements
    WHERE employee_id = p_user_id
    AND status = 'active'
    AND auto_timer_consent = true
    LIMIT 1;
  ELSIF p_consent_type = 'screenshot' THEN
    SELECT screenshot_consent INTO v_has_consent
    FROM public.work_agreements
    WHERE employee_id = p_user_id
    AND status = 'active'
    AND screenshot_consent = true
    LIMIT 1;
  ELSIF p_consent_type = 'activity_tracking' THEN
    SELECT activity_tracking_consent INTO v_has_consent
    FROM public.work_agreements
    WHERE employee_id = p_user_id
    AND status = 'active'
    AND activity_tracking_consent = true
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_has_consent, false);
END;
$function$;
