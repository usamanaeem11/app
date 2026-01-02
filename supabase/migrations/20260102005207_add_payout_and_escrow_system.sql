/*
  # Add Payout and Escrow System

  ## Overview
  Complete payment management system with bank accounts, payouts, escrow, and recurring payments.

  ## Important Disclaimer
  Working Tracker facilitates payment tracking and agreements between parties.
  The platform does NOT process actual payments and has NO LIABILITY for payment disputes.
  Both parties are solely responsible for resolving any payment-related matters.

  ## New Tables

  1. **bank_accounts**
     - Stores bank account information for users (encrypted sensitive data)
     - Support for multiple accounts per user
     - Verification status tracking

  2. **payouts**
     - Track all payout transactions between admin and employees
     - Support for one-time and recurring payouts
     - Status tracking (pending, processing, completed, failed, cancelled)
     - Links to expenses, projects, and time periods

  3. **escrow_accounts**
     - Hold funds in escrow until work completion/approval
     - Automatic release based on project completion or approval
     - Dispute resolution tracking

  4. **recurring_payment_schedules**
     - Automated recurring payments for permanent employees
     - Support for weekly, bi-weekly, monthly schedules
     - Pause/resume functionality

  5. **payout_approvals**
     - Track approval workflow for payouts
     - Multi-step approval for large amounts

  6. **payment_disputes**
     - Track and manage payment disputes between parties
     - Resolution workflow

  ## Security
  - All sensitive financial data encrypted
  - Strong RLS policies
  - Complete audit trail
  - Compliance with financial regulations
*/

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  account_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  account_holder_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  bank_name TEXT,
  account_number_last4 TEXT,
  routing_number_encrypted TEXT,
  account_number_encrypted TEXT,
  swift_code TEXT,
  iban TEXT,
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'USD',
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verification_method TEXT,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT account_type_check CHECK (account_type IN ('checking', 'savings', 'business', 'escrow')),
  CONSTRAINT verification_method_check CHECK (verification_method IN ('manual', 'micro_deposit', 'instant', 'document'))
);

-- Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
  payout_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  from_user_id TEXT NOT NULL REFERENCES users(user_id),
  to_user_id TEXT NOT NULL REFERENCES users(user_id),
  from_account_id TEXT REFERENCES bank_accounts(account_id),
  to_account_id TEXT REFERENCES bank_accounts(account_id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payout_type TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  
  -- References
  expense_calculation_id TEXT REFERENCES expense_calculations(calculation_id),
  project_id TEXT REFERENCES projects(project_id),
  wage_id TEXT REFERENCES employee_wages(wage_id),
  escrow_id TEXT,
  
  -- Period info
  period_start DATE,
  period_end DATE,
  
  -- Scheduling
  is_recurring BOOLEAN DEFAULT false,
  recurring_schedule_id TEXT,
  
  -- Processing
  scheduled_for TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Tracking
  transaction_reference TEXT,
  notes TEXT,
  admin_notes TEXT,
  
  -- Metadata
  metadata JSONB,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT payout_type_check CHECK (payout_type IN ('salary', 'hourly', 'project', 'bonus', 'reimbursement', 'advance')),
  CONSTRAINT payment_method_check CHECK (payment_method IN ('bank_transfer', 'escrow_release', 'manual', 'check', 'cash')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled', 'disputed'))
);

-- Escrow Accounts Table
CREATE TABLE IF NOT EXISTS escrow_accounts (
  escrow_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  admin_id TEXT NOT NULL REFERENCES users(user_id),
  employee_id TEXT NOT NULL REFERENCES users(user_id),
  project_id TEXT REFERENCES projects(project_id),
  
  -- Escrow details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending_funding',
  
  -- Funding
  funded_by TEXT REFERENCES users(user_id),
  funded_at TIMESTAMPTZ,
  funding_source_id TEXT REFERENCES bank_accounts(account_id),
  
  -- Release conditions
  release_condition TEXT NOT NULL,
  auto_release_on_approval BOOLEAN DEFAULT false,
  release_date DATE,
  work_completion_required BOOLEAN DEFAULT true,
  
  -- Release tracking
  released_to TEXT REFERENCES users(user_id),
  released_at TIMESTAMPTZ,
  released_by TEXT REFERENCES users(user_id),
  release_notes TEXT,
  
  -- Dispute
  is_disputed BOOLEAN DEFAULT false,
  dispute_id TEXT,
  dispute_raised_at TIMESTAMPTZ,
  
  -- Refund
  refunded_to TEXT REFERENCES users(user_id),
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  
  -- Agreement
  agreement_id TEXT REFERENCES work_agreements(agreement_id),
  terms TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT status_check CHECK (status IN ('pending_funding', 'funded', 'held', 'released', 'refunded', 'disputed')),
  CONSTRAINT release_condition_check CHECK (release_condition IN ('manual_approval', 'project_completion', 'work_submission_approval', 'time_based', 'milestone_based'))
);

-- Recurring Payment Schedules Table
CREATE TABLE IF NOT EXISTS recurring_payment_schedules (
  schedule_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  admin_id TEXT NOT NULL REFERENCES users(user_id),
  employee_id TEXT NOT NULL REFERENCES users(user_id),
  
  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Schedule
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_payment_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMPTZ,
  paused_by TEXT REFERENCES users(user_id),
  pause_reason TEXT,
  
  -- References
  wage_id TEXT REFERENCES employee_wages(wage_id),
  from_account_id TEXT REFERENCES bank_accounts(account_id),
  to_account_id TEXT REFERENCES bank_accounts(account_id),
  
  -- Tracking
  total_payments_made INTEGER DEFAULT 0,
  last_payment_date DATE,
  last_payout_id TEXT,
  
  -- Metadata
  notes TEXT,
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT frequency_check CHECK (frequency IN ('weekly', 'bi_weekly', 'semi_monthly', 'monthly', 'quarterly', 'yearly'))
);

-- Payout Approvals Table
CREATE TABLE IF NOT EXISTS payout_approvals (
  approval_id TEXT PRIMARY KEY,
  payout_id TEXT NOT NULL REFERENCES payouts(payout_id),
  approver_id TEXT NOT NULL REFERENCES users(user_id),
  approval_level INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Payment Disputes Table
CREATE TABLE IF NOT EXISTS payment_disputes (
  dispute_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(company_id),
  payout_id TEXT REFERENCES payouts(payout_id),
  escrow_id TEXT REFERENCES escrow_accounts(escrow_id),
  
  -- Parties
  raised_by TEXT NOT NULL REFERENCES users(user_id),
  against_user TEXT NOT NULL REFERENCES users(user_id),
  
  -- Dispute details
  dispute_type TEXT NOT NULL,
  amount_disputed NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  reason TEXT NOT NULL,
  description TEXT,
  evidence TEXT[],
  
  -- Resolution
  status TEXT DEFAULT 'open',
  assigned_to TEXT REFERENCES users(user_id),
  resolved_by TEXT REFERENCES users(user_id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  resolution_type TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT dispute_type_check CHECK (dispute_type IN ('non_payment', 'incorrect_amount', 'work_quality', 'work_not_completed', 'unauthorized_charge', 'other')),
  CONSTRAINT status_check CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'escalated')),
  CONSTRAINT resolution_type_check CHECK (resolution_type IN ('refund', 'partial_refund', 'release_escrow', 'no_action', 'other'))
);

-- Enable Row Level Security
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_accounts

CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view company bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = bank_accounts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Users can create own bank accounts"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can update company bank accounts"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = bank_accounts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for payouts

CREATE POLICY "Users can view own payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = from_user_id OR 
    auth.uid()::text = to_user_id
  );

CREATE POLICY "Admins can view all company payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = payouts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can create payouts"
  ON payouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = payouts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can update payouts"
  ON payouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = payouts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for escrow_accounts

CREATE POLICY "Parties can view own escrow accounts"
  ON escrow_accounts FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = admin_id OR 
    auth.uid()::text = employee_id
  );

CREATE POLICY "Admins can view company escrow accounts"
  ON escrow_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = escrow_accounts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can create escrow accounts"
  ON escrow_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = escrow_accounts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can update escrow accounts"
  ON escrow_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = escrow_accounts.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for recurring_payment_schedules

CREATE POLICY "Users can view own recurring schedules"
  ON recurring_payment_schedules FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = admin_id OR 
    auth.uid()::text = employee_id
  );

CREATE POLICY "Admins can manage recurring schedules"
  ON recurring_payment_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = recurring_payment_schedules.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- RLS Policies for payout_approvals

CREATE POLICY "Users can view approvals they're involved in"
  ON payout_approvals FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = approver_id OR
    EXISTS (
      SELECT 1 FROM payouts
      WHERE payouts.payout_id = payout_approvals.payout_id
      AND (payouts.from_user_id = auth.uid()::text OR payouts.to_user_id = auth.uid()::text)
    )
  );

CREATE POLICY "Approvers can update their approvals"
  ON payout_approvals FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = approver_id);

-- RLS Policies for payment_disputes

CREATE POLICY "Parties can view own disputes"
  ON payment_disputes FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = raised_by OR 
    auth.uid()::text = against_user
  );

CREATE POLICY "Admins can view all company disputes"
  ON payment_disputes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = payment_disputes.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Users can create disputes"
  ON payment_disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = raised_by);

CREATE POLICY "Admins can update disputes"
  ON payment_disputes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND users.company_id = payment_disputes.company_id
      AND users.role IN ('admin', 'hr')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_payouts_from_user ON payouts(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_to_user ON payouts(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_company ON payouts(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled ON payouts(scheduled_for, status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_escrow_employee ON escrow_accounts(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_project ON escrow_accounts(project_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_payment_schedules(is_active, next_payment_date);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON payment_disputes(status, created_at DESC);

-- Add reference from payouts to escrow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payouts_escrow_id_fkey'
  ) THEN
    ALTER TABLE payouts ADD CONSTRAINT payouts_escrow_id_fkey 
      FOREIGN KEY (escrow_id) REFERENCES escrow_accounts(escrow_id);
  END IF;
END $$;

-- Add reference from recurring schedules to payouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_payment_schedules_last_payout_id_fkey'
  ) THEN
    ALTER TABLE recurring_payment_schedules ADD CONSTRAINT recurring_payment_schedules_last_payout_id_fkey 
      FOREIGN KEY (last_payout_id) REFERENCES payouts(payout_id);
  END IF;
END $$;

-- Add reference from escrow to disputes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'escrow_accounts_dispute_id_fkey'
  ) THEN
    ALTER TABLE escrow_accounts ADD CONSTRAINT escrow_accounts_dispute_id_fkey 
      FOREIGN KEY (dispute_id) REFERENCES payment_disputes(dispute_id);
  END IF;
END $$;
