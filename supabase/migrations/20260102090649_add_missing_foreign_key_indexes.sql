/*
  # Add Missing Foreign Key Indexes

  ## Performance Optimization
  
  Creates indexes on all foreign key columns that don't have covering indexes.
  This dramatically improves JOIN performance and query optimization.
  
  ## Tables Affected (90+ indexes)
  - activity_history, activity_logs, attendance, blocked_apps, blocked_websites
  - breaks, burnout_indicators, chat_channels, chat_messages, consent_audit_log
  - employee_assignment_requests, employee_wages, escrow_accounts, expense_calculations
  - focus_time, geofences, idle_periods, integrations, leave_requests
  - manager_assignments, manager_expense_access, meeting_insights, notifications
  - payment_disputes, payout_approvals, payouts, payroll, project_assignments
  - recurring_payment_schedules, routes, scheduled_timers, screen_recordings
  - screenshots, security_alerts, shift_assignments, shifts, tasks
  - time_entries, timer_execution_log, timesheets, wage_change_requests
  - work_agreements, work_submissions

  ## Impact
  - Dramatically improved JOIN performance
  - Better query planning by PostgreSQL
  - Reduced CPU usage on large datasets
  - Faster foreign key constraint checks
*/

-- activity_history
CREATE INDEX IF NOT EXISTS idx_activity_history_entry_id ON public.activity_history(entry_id);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id_fk ON public.activity_logs(company_id);

-- attendance
CREATE INDEX IF NOT EXISTS idx_attendance_company_id_fk ON public.attendance(company_id);

-- blocked_apps
CREATE INDEX IF NOT EXISTS idx_blocked_apps_created_by ON public.blocked_apps(created_by);

-- blocked_websites
CREATE INDEX IF NOT EXISTS idx_blocked_websites_created_by ON public.blocked_websites(created_by);

-- breaks
CREATE INDEX IF NOT EXISTS idx_breaks_company_id_fk ON public.breaks(company_id);

-- burnout_indicators
CREATE INDEX IF NOT EXISTS idx_burnout_indicators_company_id_fk ON public.burnout_indicators(company_id);

-- chat_channels
CREATE INDEX IF NOT EXISTS idx_chat_channels_company_id_fk ON public.chat_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_by_fk ON public.chat_channels(created_by);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_company_id_fk ON public.chat_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_fk ON public.chat_messages(user_id);

-- consent_audit_log
CREATE INDEX IF NOT EXISTS idx_consent_audit_log_given_by ON public.consent_audit_log(given_by);

-- employee_assignment_requests
CREATE INDEX IF NOT EXISTS idx_employee_assignment_requests_company_id ON public.employee_assignment_requests(company_id);

-- employee_wages
CREATE INDEX IF NOT EXISTS idx_employee_wages_created_by_fk ON public.employee_wages(created_by);

-- escrow_accounts (10 foreign keys!)
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_admin_id ON public.escrow_accounts(admin_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_agreement_id ON public.escrow_accounts(agreement_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_company_id_fk ON public.escrow_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_dispute_id ON public.escrow_accounts(dispute_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_funded_by ON public.escrow_accounts(funded_by);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_funding_source_id ON public.escrow_accounts(funding_source_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_refunded_to ON public.escrow_accounts(refunded_to);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_released_by ON public.escrow_accounts(released_by);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_released_to ON public.escrow_accounts(released_to);

-- expense_calculations
CREATE INDEX IF NOT EXISTS idx_expense_calculations_project_id_fk ON public.expense_calculations(project_id);

-- focus_time
CREATE INDEX IF NOT EXISTS idx_focus_time_company_id_fk ON public.focus_time(company_id);

-- geofences
CREATE INDEX IF NOT EXISTS idx_geofences_created_by_fk ON public.geofences(created_by);

-- idle_periods
CREATE INDEX IF NOT EXISTS idx_idle_periods_approved_by ON public.idle_periods(approved_by);
CREATE INDEX IF NOT EXISTS idx_idle_periods_company_id_fk ON public.idle_periods(company_id);

-- integrations
CREATE INDEX IF NOT EXISTS idx_integrations_created_by_fk ON public.integrations(created_by);

-- leave_requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id_fk ON public.leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by_fk ON public.leave_requests(reviewed_by);

-- manager_assignments
CREATE INDEX IF NOT EXISTS idx_manager_assignments_assigned_by ON public.manager_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_company_id_fk ON public.manager_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_employee_id_fk ON public.manager_assignments(employee_id);

-- manager_expense_access
CREATE INDEX IF NOT EXISTS idx_manager_expense_access_company_id_fk ON public.manager_expense_access(company_id);
CREATE INDEX IF NOT EXISTS idx_manager_expense_access_granted_by ON public.manager_expense_access(granted_by);

-- meeting_insights
CREATE INDEX IF NOT EXISTS idx_meeting_insights_organizer_id ON public.meeting_insights(organizer_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_company_id_fk ON public.notifications(company_id);

-- payment_disputes
CREATE INDEX IF NOT EXISTS idx_payment_disputes_against_user ON public.payment_disputes(against_user);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_assigned_to ON public.payment_disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_company_id_fk ON public.payment_disputes(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_escrow_id_fk ON public.payment_disputes(escrow_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_payout_id_fk ON public.payment_disputes(payout_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_raised_by ON public.payment_disputes(raised_by);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_resolved_by ON public.payment_disputes(resolved_by);

-- payout_approvals
CREATE INDEX IF NOT EXISTS idx_payout_approvals_approver_id_fk ON public.payout_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_payout_approvals_payout_id_fk ON public.payout_approvals(payout_id);

-- payouts
CREATE INDEX IF NOT EXISTS idx_payouts_created_by_fk ON public.payouts(created_by);
CREATE INDEX IF NOT EXISTS idx_payouts_escrow_id_fk ON public.payouts(escrow_id);
CREATE INDEX IF NOT EXISTS idx_payouts_expense_calculation_id ON public.payouts(expense_calculation_id);
CREATE INDEX IF NOT EXISTS idx_payouts_from_account_id_fk ON public.payouts(from_account_id);
CREATE INDEX IF NOT EXISTS idx_payouts_project_id_fk ON public.payouts(project_id);
CREATE INDEX IF NOT EXISTS idx_payouts_to_account_id_fk ON public.payouts(to_account_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wage_id_fk ON public.payouts(wage_id);

-- payroll
CREATE INDEX IF NOT EXISTS idx_payroll_company_id_fk ON public.payroll(company_id);

-- project_assignments
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_by_fk ON public.project_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_project_assignments_company_id_fk ON public.project_assignments(company_id);

-- recurring_payment_schedules
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_admin_id ON public.recurring_payment_schedules(admin_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_company_id_fk ON public.recurring_payment_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_created_by_fk ON public.recurring_payment_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_employee_id_fk ON public.recurring_payment_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_from_account_id ON public.recurring_payment_schedules(from_account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_last_payout_id ON public.recurring_payment_schedules(last_payout_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_paused_by ON public.recurring_payment_schedules(paused_by);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_to_account_id ON public.recurring_payment_schedules(to_account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_schedules_wage_id_fk ON public.recurring_payment_schedules(wage_id);

-- routes
CREATE INDEX IF NOT EXISTS idx_routes_company_id_fk ON public.routes(company_id);

-- scheduled_timers
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_company_id_fk ON public.scheduled_timers(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_created_by_fk ON public.scheduled_timers(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_project_id_fk ON public.scheduled_timers(project_id);

-- screen_recordings
CREATE INDEX IF NOT EXISTS idx_screen_recordings_entry_id_fk ON public.screen_recordings(entry_id);

-- screenshots
CREATE INDEX IF NOT EXISTS idx_screenshots_company_id_fk ON public.screenshots(company_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_time_entry_id_fk ON public.screenshots(time_entry_id);

-- security_alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_assigned_to_fk ON public.security_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved_by_fk ON public.security_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id_fk ON public.security_alerts(user_id);

-- shift_assignments
CREATE INDEX IF NOT EXISTS idx_shift_assignments_company_id_fk ON public.shift_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift_id_fk ON public.shift_assignments(shift_id);

-- shifts
CREATE INDEX IF NOT EXISTS idx_shifts_company_id_fk ON public.shifts(company_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_company_id_fk ON public.tasks(company_id);

-- time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id_fk ON public.time_entries(project_id);

-- timer_execution_log
CREATE INDEX IF NOT EXISTS idx_timer_execution_log_time_entry_id_fk ON public.timer_execution_log(time_entry_id);

-- timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_company_id_fk ON public.timesheets(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_reviewed_by_fk ON public.timesheets(reviewed_by);

-- wage_change_requests
CREATE INDEX IF NOT EXISTS idx_wage_change_requests_company_id_fk ON public.wage_change_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_wage_change_requests_requested_by ON public.wage_change_requests(requested_by);

-- work_agreements
CREATE INDEX IF NOT EXISTS idx_work_agreements_admin_id_fk ON public.work_agreements(admin_id);

-- work_submissions
CREATE INDEX IF NOT EXISTS idx_work_submissions_company_id_fk ON public.work_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_project_id_fk ON public.work_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_work_submissions_task_id_fk ON public.work_submissions(task_id);
