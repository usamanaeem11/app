/*
  # Fix RLS Subquery Pattern - Correct Approach

  ## Changes
  
  1. Use exact subquery pattern without parentheses around auth.uid()
     - Pattern: (select auth.uid()::text) 
     - NOT: (SELECT (auth.uid())::text)
  
  ## Impact
  - Resolves Supabase analyzer warnings
  - Ensures optimal query performance
*/

-- =====================================================
-- SCREEN RECORDINGS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own recordings" ON public.screen_recordings;
CREATE POLICY "Users can view own recordings"
  ON public.screen_recordings FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Managers can view assigned employees' recordings" ON public.screen_recordings;
CREATE POLICY "Managers can view assigned employees' recordings"
  ON public.screen_recordings FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT ma.employee_id 
      FROM manager_assignments ma
      WHERE ma.manager_id = (select auth.uid()::text)
      AND ma.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all company recordings" ON public.screen_recordings;
CREATE POLICY "Admins can view all company recordings"
  ON public.screen_recordings FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- WORK SUBMISSIONS
-- =====================================================

DROP POLICY IF EXISTS "Employees can view own submissions" ON public.work_submissions;
CREATE POLICY "Employees can view own submissions"
  ON public.work_submissions FOR SELECT
  TO authenticated
  USING (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Managers can view assigned employees' submissions" ON public.work_submissions;
CREATE POLICY "Managers can view assigned employees' submissions"
  ON public.work_submissions FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT ma.employee_id 
      FROM manager_assignments ma
      WHERE ma.manager_id = (select auth.uid()::text)
      AND ma.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all company submissions" ON public.work_submissions;
CREATE POLICY "Admins can view all company submissions"
  ON public.work_submissions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can create submissions" ON public.work_submissions;
CREATE POLICY "Employees can create submissions"
  ON public.work_submissions FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Managers can update assigned employees' submissions" ON public.work_submissions;
CREATE POLICY "Managers can update assigned employees' submissions"
  ON public.work_submissions FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT ma.employee_id 
      FROM manager_assignments ma
      WHERE ma.manager_id = (select auth.uid()::text)
      AND ma.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can update all company submissions" ON public.work_submissions;
CREATE POLICY "Admins can update all company submissions"
  ON public.work_submissions FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

-- =====================================================
-- ACTIVITY HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_history;
CREATE POLICY "Users can view own activity"
  ON public.activity_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Managers can view assigned employees' activity" ON public.activity_history;
CREATE POLICY "Managers can view assigned employees' activity"
  ON public.activity_history FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT ma.employee_id 
      FROM manager_assignments ma
      WHERE ma.manager_id = (select auth.uid()::text)
      AND ma.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can view all company activity" ON public.activity_history;
CREATE POLICY "Admins can view all company activity"
  ON public.activity_history FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- EMPLOYEE WAGES
-- =====================================================

DROP POLICY IF EXISTS "Employees can view own wages" ON public.employee_wages;
CREATE POLICY "Employees can view own wages"
  ON public.employee_wages FOR SELECT
  TO authenticated
  USING (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view all company wages" ON public.employee_wages;
CREATE POLICY "Admins can view all company wages"
  ON public.employee_wages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create wages" ON public.employee_wages;
CREATE POLICY "Admins can create wages"
  ON public.employee_wages FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and employees can update wages" ON public.employee_wages;
CREATE POLICY "Admins and employees can update wages"
  ON public.employee_wages FOR UPDATE
  TO authenticated
  USING (
    employee_id = (select auth.uid()::text) OR
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- MANAGER EXPENSE ACCESS
-- =====================================================

DROP POLICY IF EXISTS "Managers can view own expense access" ON public.manager_expense_access;
CREATE POLICY "Managers can view own expense access"
  ON public.manager_expense_access FOR SELECT
  TO authenticated
  USING (manager_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view all manager expense access" ON public.manager_expense_access;
CREATE POLICY "Admins can view all manager expense access"
  ON public.manager_expense_access FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create manager expense access" ON public.manager_expense_access;
CREATE POLICY "Admins can create manager expense access"
  ON public.manager_expense_access FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update manager expense access" ON public.manager_expense_access;
CREATE POLICY "Admins can update manager expense access"
  ON public.manager_expense_access FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- WAGE CHANGE REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own wage change requests" ON public.wage_change_requests;
CREATE POLICY "Users can view own wage change requests"
  ON public.wage_change_requests FOR SELECT
  TO authenticated
  USING (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view all company wage requests" ON public.wage_change_requests;
CREATE POLICY "Admins can view all company wage requests"
  ON public.wage_change_requests FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and employees can create wage requests" ON public.wage_change_requests;
CREATE POLICY "Admins and employees can create wage requests"
  ON public.wage_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (select auth.uid()::text) OR
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins and employees can update wage requests" ON public.wage_change_requests;
CREATE POLICY "Admins and employees can update wage requests"
  ON public.wage_change_requests FOR UPDATE
  TO authenticated
  USING (
    employee_id = (select auth.uid()::text) OR
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- PROJECT ASSIGNMENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own project assignments" ON public.project_assignments;
CREATE POLICY "Users can view own project assignments"
  ON public.project_assignments FOR SELECT
  TO authenticated
  USING (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view all company project assignments" ON public.project_assignments;
CREATE POLICY "Admins can view all company project assignments"
  ON public.project_assignments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view assigned employees project assignments" ON public.project_assignments;
CREATE POLICY "Managers can view assigned employees project assignments"
  ON public.project_assignments FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT ma.employee_id 
      FROM manager_assignments ma
      WHERE ma.manager_id = (select auth.uid()::text)
      AND ma.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can create project assignments" ON public.project_assignments;
CREATE POLICY "Admins can create project assignments"
  ON public.project_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update project assignments" ON public.project_assignments;
CREATE POLICY "Admins can update project assignments"
  ON public.project_assignments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- EXPENSE CALCULATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own expense calculations" ON public.expense_calculations;
CREATE POLICY "Users can view own expense calculations"
  ON public.expense_calculations FOR SELECT
  TO authenticated
  USING (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view all company expense calculations" ON public.expense_calculations;
CREATE POLICY "Admins can view all company expense calculations"
  ON public.expense_calculations FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- BANK ACCOUNTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can view own bank accounts"
  ON public.bank_accounts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view company bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins can view company bank accounts"
  ON public.bank_accounts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can create own bank accounts"
  ON public.bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can update own bank accounts"
  ON public.bank_accounts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can update company bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins can update company bank accounts"
  ON public.bank_accounts FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- PAYOUTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payouts" ON public.payouts;
CREATE POLICY "Users can view own payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (to_user_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can view all company payouts" ON public.payouts;
CREATE POLICY "Admins can view all company payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create payouts" ON public.payouts;
CREATE POLICY "Admins can create payouts"
  ON public.payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update payouts" ON public.payouts;
CREATE POLICY "Admins can update payouts"
  ON public.payouts FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- ESCROW ACCOUNTS
-- =====================================================

DROP POLICY IF EXISTS "Parties can view own escrow accounts" ON public.escrow_accounts;
CREATE POLICY "Parties can view own escrow accounts"
  ON public.escrow_accounts FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid()::text) OR
    funded_by = (select auth.uid()::text) OR
    released_to = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Admins can view company escrow accounts" ON public.escrow_accounts;
CREATE POLICY "Admins can view company escrow accounts"
  ON public.escrow_accounts FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create escrow accounts" ON public.escrow_accounts;
CREATE POLICY "Admins can create escrow accounts"
  ON public.escrow_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update escrow accounts" ON public.escrow_accounts;
CREATE POLICY "Admins can update escrow accounts"
  ON public.escrow_accounts FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- RECURRING PAYMENT SCHEDULES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own recurring schedules" ON public.recurring_payment_schedules;
CREATE POLICY "Users can view own recurring schedules"
  ON public.recurring_payment_schedules FOR SELECT
  TO authenticated
  USING (employee_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can manage recurring schedules" ON public.recurring_payment_schedules;
CREATE POLICY "Admins can manage recurring schedules"
  ON public.recurring_payment_schedules FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- PAYOUT APPROVALS
-- =====================================================

DROP POLICY IF EXISTS "Users can view approvals they're involved in" ON public.payout_approvals;
CREATE POLICY "Users can view approvals they're involved in"
  ON public.payout_approvals FOR SELECT
  TO authenticated
  USING (approver_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Approvers can update their approvals" ON public.payout_approvals;
CREATE POLICY "Approvers can update their approvals"
  ON public.payout_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = (select auth.uid()::text));

-- =====================================================
-- PAYMENT DISPUTES
-- =====================================================

DROP POLICY IF EXISTS "Parties can view own disputes" ON public.payment_disputes;
CREATE POLICY "Parties can view own disputes"
  ON public.payment_disputes FOR SELECT
  TO authenticated
  USING (
    raised_by = (select auth.uid()::text) OR
    against_user = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Admins can view all company disputes" ON public.payment_disputes;
CREATE POLICY "Admins can view all company disputes"
  ON public.payment_disputes FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create disputes" ON public.payment_disputes;
CREATE POLICY "Users can create disputes"
  ON public.payment_disputes FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = (select auth.uid()::text));

DROP POLICY IF EXISTS "Admins can update disputes" ON public.payment_disputes;
CREATE POLICY "Admins can update disputes"
  ON public.payment_disputes FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT u.company_id 
      FROM users u
      WHERE u.user_id = (select auth.uid()::text)
      AND u.role = 'admin'
    )
  );
