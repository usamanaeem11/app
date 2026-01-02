import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Clock, AlertCircle, CheckCircle, XCircle, Shield, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_DISCLAIMER = `
IMPORTANT PAYMENT DISCLAIMER:

Working Tracker is a work tracking and management platform. We DO NOT process, hold, or transfer any actual money.

The payout system is for TRACKING PURPOSES ONLY. It helps both parties:
- Track agreed payment amounts
- Schedule payment dates
- Maintain payment records
- Monitor payment status

RESPONSIBILITY:
- Both parties are 100% responsible for completing actual money transfers through their banks or payment processors
- Working Tracker has NO LIABILITY for payment disputes, non-payment, or any payment-related issues
- Any disputes must be resolved directly between the parties or through appropriate legal channels
- We do not mediate, arbitrate, or intervene in payment matters

By using this payout system, both parties acknowledge they understand and accept these terms.
`;

export default function Expenses() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview data
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [allEmployeesExpenses, setAllEmployeesExpenses] = useState([]);

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showAddBankAccount, setShowAddBankAccount] = useState(false);

  // Payouts
  const [payouts, setPayouts] = useState([]);
  const [payoutStats, setPayoutStats] = useState(null);
  const [showCreatePayout, setShowCreatePayout] = useState(false);

  // Escrow
  const [escrowAccounts, setEscrowAccounts] = useState([]);
  const [showCreateEscrow, setShowCreateEscrow] = useState(false);

  // Recurring payments
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [showCreateRecurring, setShowCreateRecurring] = useState(false);

  // Employees list for selects
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  const isAdmin = ['admin', 'hr'].includes(user?.role);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await loadOverview();
      } else if (activeTab === 'bank-accounts') {
        await loadBankAccounts();
      } else if (activeTab === 'payouts') {
        await loadPayouts();
      } else if (activeTab === 'escrow') {
        await loadEscrow();
      } else if (activeTab === 'recurring') {
        await loadRecurring();
      }

      if (isAdmin) {
        await loadEmployees();
        await loadProjects();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      if (isAdmin) {
        const res = await api.get('/expenses/all-employees?period_type=monthly');
        setAllEmployeesExpenses(res.data.data);
      } else {
        const res = await api.get('/expenses/summary');
        setExpenseSummary(res.data.data);
      }

      const statsRes = await api.get('/payouts/summary/stats');
      setPayoutStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading overview:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const res = await api.get('/bank-accounts');
      setBankAccounts(res.data.data);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadPayouts = async () => {
    try {
      const res = await api.get('/payouts');
      setPayouts(res.data.data);
    } catch (error) {
      console.error('Error loading payouts:', error);
    }
  };

  const loadEscrow = async () => {
    try {
      const res = await api.get('/escrow');
      setEscrowAccounts(res.data.data);
    } catch (error) {
      console.error('Error loading escrow:', error);
    }
  };

  const loadRecurring = async () => {
    try {
      const res = await api.get('/recurring-payments');
      setRecurringSchedules(res.data.data);
    } catch (error) {
      console.error('Error loading recurring schedules:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get('/users');
      setEmployees(res.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const addBankAccount = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await api.post('/bank-accounts', {
        account_holder_name: formData.get('account_holder_name'),
        account_type: formData.get('account_type'),
        bank_name: formData.get('bank_name'),
        account_number: formData.get('account_number'),
        routing_number: formData.get('routing_number'),
        country: formData.get('country') || 'US',
        currency: formData.get('currency') || 'USD',
        is_primary: formData.get('is_primary') === 'on'
      });

      toast.success('Bank account added successfully');
      setShowAddBankAccount(false);
      loadBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add bank account');
    }
  };

  const createPayout = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await api.post('/payouts', {
        to_user_id: formData.get('to_user_id'),
        amount: parseFloat(formData.get('amount')),
        currency: formData.get('currency') || 'USD',
        payout_type: formData.get('payout_type'),
        payment_method: formData.get('payment_method') || 'bank_transfer',
        from_account_id: formData.get('from_account_id') || null,
        to_account_id: formData.get('to_account_id') || null,
        project_id: formData.get('project_id') || null,
        notes: formData.get('notes')
      });

      toast.success('Payout created successfully');
      setShowCreatePayout(false);
      loadPayouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payout');
    }
  };

  const createEscrow = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await api.post('/escrow', {
        employee_id: formData.get('employee_id'),
        project_id: formData.get('project_id') || null,
        amount: parseFloat(formData.get('amount')),
        currency: formData.get('currency') || 'USD',
        release_condition: formData.get('release_condition'),
        auto_release_on_approval: formData.get('auto_release_on_approval') === 'on',
        work_completion_required: formData.get('work_completion_required') !== 'off',
        terms: formData.get('terms')
      });

      toast.success('Escrow account created successfully');
      setShowCreateEscrow(false);
      loadEscrow();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create escrow');
    }
  };

  const createRecurringSchedule = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await api.post('/recurring-payments', {
        employee_id: formData.get('employee_id'),
        amount: parseFloat(formData.get('amount')),
        currency: formData.get('currency') || 'USD',
        frequency: formData.get('frequency'),
        start_date: formData.get('start_date'),
        from_account_id: formData.get('from_account_id') || null,
        to_account_id: formData.get('to_account_id') || null,
        notes: formData.get('notes')
      });

      toast.success('Recurring schedule created successfully');
      setShowCreateRecurring(false);
      loadRecurring();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create recurring schedule');
    }
  };

  const updatePayoutStatus = async (payoutId, status) => {
    try {
      await api.put(`/payouts/${payoutId}`, { status });
      toast.success('Payout status updated');
      loadPayouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update payout');
    }
  };

  const releaseEscrow = async (escrowId) => {
    if (!window.confirm('Are you sure you want to release this escrow to the employee?')) return;

    try {
      await api.post(`/escrow/${escrowId}/release`, {
        release_notes: 'Work completed and approved'
      });
      toast.success('Escrow released successfully');
      loadEscrow();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to release escrow');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      processing: 'default',
      completed: 'success',
      failed: 'destructive',
      cancelled: 'outline',
      funded: 'success',
      released: 'success',
      disputed: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses & Payouts</h1>
          <p className="text-muted-foreground">Manage expenses, wages, and payment tracking</p>
        </div>
      </div>

      {/* Disclaimer Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>IMPORTANT:</strong> Working Tracker does NOT process payments. You are responsible for completing
          actual money transfers. This system is for tracking purposes only.
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto ml-1">Read full disclaimer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Payment System Disclaimer</DialogTitle>
              </DialogHeader>
              <div className="whitespace-pre-wrap text-sm">{PAYMENT_DISCLAIMER}</div>
            </DialogContent>
          </Dialog>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="escrow">Escrow</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {payoutStats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payouts Sent</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${payoutStats.sent.total_amount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {payoutStats.sent.count} total | {payoutStats.sent.pending} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payouts Received</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${payoutStats.received.total_amount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {payoutStats.received.count} total | {payoutStats.received.pending} pending
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {isAdmin && allEmployeesExpenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Employees Expenses (Monthly)</CardTitle>
                <CardDescription>Overview of all employee costs and earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Wage Type</TableHead>
                      <TableHead>Wage Amount</TableHead>
                      <TableHead>Latest Calculation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEmployeesExpenses.map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell className="font-medium">{emp.employee_name}</TableCell>
                        <TableCell>{emp.employee_role}</TableCell>
                        <TableCell>
                          {emp.current_wage ? emp.current_wage.wage_type : 'Not set'}
                        </TableCell>
                        <TableCell>
                          {emp.current_wage ? `$${emp.current_wage.wage_amount}` : '-'}
                        </TableCell>
                        <TableCell>
                          {emp.latest_calculation ?
                            `$${emp.latest_calculation.calculated_amount} (${emp.latest_calculation.total_hours}h)`
                            : 'No calculation'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {!isAdmin && expenseSummary && (
            <Card>
              <CardHeader>
                <CardTitle>My Earnings Summary</CardTitle>
                <CardDescription>Your current month earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseSummary.current_wage && (
                  <div>
                    <Label>Current Wage</Label>
                    <div className="text-2xl font-bold">
                      ${expenseSummary.current_wage.wage_amount} / {expenseSummary.current_wage.wage_type}
                    </div>
                  </div>
                )}

                {expenseSummary.monthly_calculation && (
                  <div>
                    <Label>This Month</Label>
                    <div className="text-2xl font-bold">
                      ${expenseSummary.monthly_calculation.calculated_amount || expenseSummary.monthly_calculation.total_amount}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {expenseSummary.monthly_calculation.total_hours} hours worked
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank-accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Bank Accounts</h3>
              <p className="text-sm text-muted-foreground">Manage your bank accounts for payouts</p>
            </div>
            <Dialog open={showAddBankAccount} onOpenChange={setShowAddBankAccount}>
              <DialogTrigger asChild>
                <Button>Add Bank Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bank Account</DialogTitle>
                  <DialogDescription>
                    Add a bank account for receiving or sending payments
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={addBankAccount} className="space-y-4">
                  <div>
                    <Label>Account Holder Name</Label>
                    <Input name="account_holder_name" required />
                  </div>
                  <div>
                    <Label>Account Type</Label>
                    <Select name="account_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bank Name</Label>
                    <Input name="bank_name" />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input name="account_number" type="password" required />
                  </div>
                  <div>
                    <Label>Routing Number</Label>
                    <Input name="routing_number" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" name="is_primary" id="is_primary" />
                    <Label htmlFor="is_primary">Set as primary account</Label>
                  </div>
                  <Button type="submit">Add Account</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {bankAccounts.map((account) => (
              <Card key={account.account_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{account.account_holder_name}</CardTitle>
                      <CardDescription>
                        {account.bank_name} - {account.account_type}
                      </CardDescription>
                    </div>
                    {account.is_primary && <Badge>Primary</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account</span>
                      <span className="text-sm">****{account.account_number_last4}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {account.is_verified ? (
                        <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Payouts</h3>
              <p className="text-sm text-muted-foreground">Track and manage payment transactions</p>
            </div>
            {isAdmin && (
              <Dialog open={showCreatePayout} onOpenChange={setShowCreatePayout}>
                <DialogTrigger asChild>
                  <Button>Create Payout</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Payout</DialogTitle>
                    <DialogDescription>Create a payout record for tracking</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createPayout} className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <Select name="to_user_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.user_id} value={emp.user_id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input name="amount" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Payout Type</Label>
                      <Select name="payout_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salary">Salary</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="bonus">Bonus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input name="notes" />
                    </div>
                    <Button type="submit">Create Payout</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.payout_id}>
                      <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{payout.from_user_name}</TableCell>
                      <TableCell>{payout.to_user_name}</TableCell>
                      <TableCell className="font-bold">${payout.amount}</TableCell>
                      <TableCell>{payout.payout_type}</TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      {isAdmin && payout.status === 'pending' && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updatePayoutStatus(payout.payout_id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePayoutStatus(payout.payout_id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {!isAdmin && payout.to_user_id === user?.user_id && payout.status === 'approved' && (
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => updatePayoutStatus(payout.payout_id, 'completed')}
                          >
                            Mark Received
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escrow Tab */}
        <TabsContent value="escrow" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Escrow Accounts</h3>
              <p className="text-sm text-muted-foreground">Secure payment holds until work completion</p>
            </div>
            {isAdmin && (
              <Dialog open={showCreateEscrow} onOpenChange={setShowCreateEscrow}>
                <DialogTrigger asChild>
                  <Button><Shield className="w-4 h-4 mr-2" />Create Escrow</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Escrow Account</DialogTitle>
                    <DialogDescription>Hold funds until work completion</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createEscrow} className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <Select name="employee_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.user_id} value={emp.user_id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input name="amount" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Release Condition</Label>
                      <Select name="release_condition" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual_approval">Manual Approval</SelectItem>
                          <SelectItem value="project_completion">Project Completion</SelectItem>
                          <SelectItem value="work_submission_approval">Work Submission Approval</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Terms</Label>
                      <Input name="terms" placeholder="Payment terms..." />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" name="auto_release_on_approval" id="auto_release" />
                      <Label htmlFor="auto_release">Auto-release on approval</Label>
                    </div>
                    <Button type="submit">Create Escrow</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4">
            {escrowAccounts.map((escrow) => (
              <Card key={escrow.escrow_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>${escrow.amount} {escrow.currency}</CardTitle>
                      <CardDescription>
                        {escrow.employee_name} - {escrow.project_name || 'No project'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(escrow.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Release Condition</span>
                      <span className="text-sm">{escrow.release_condition.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{new Date(escrow.created_at).toLocaleDateString()}</span>
                    </div>
                    {isAdmin && escrow.status === 'funded' && (
                      <Button
                        className="w-full mt-4"
                        onClick={() => releaseEscrow(escrow.escrow_id)}
                      >
                        Release Escrow
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Recurring Payments</h3>
              <p className="text-sm text-muted-foreground">Automated payment schedules for permanent employees</p>
            </div>
            {isAdmin && (
              <Dialog open={showCreateRecurring} onOpenChange={setShowCreateRecurring}>
                <DialogTrigger asChild>
                  <Button><Calendar className="w-4 h-4 mr-2" />Create Schedule</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Recurring Schedule</DialogTitle>
                    <DialogDescription>Set up automated payment schedule</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createRecurringSchedule} className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <Select name="employee_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.user_id} value={emp.user_id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input name="amount" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Select name="frequency" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input name="start_date" type="date" required />
                    </div>
                    <Button type="submit">Create Schedule</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4">
            {recurringSchedules.map((schedule) => (
              <Card key={schedule.schedule_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>${schedule.amount} {schedule.currency}</CardTitle>
                      <CardDescription>
                        {schedule.employee_name} - {schedule.frequency.replace('_', ' ')}
                      </CardDescription>
                    </div>
                    <Badge variant={schedule.is_active ? 'success' : 'secondary'}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Next Payment</span>
                      <span className="text-sm">{schedule.next_payment_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Payments</span>
                      <span className="text-sm">{schedule.total_payments_made}</span>
                    </div>
                    {schedule.is_paused && (
                      <Badge variant="secondary" className="w-full">
                        <Clock className="w-3 h-3 mr-1" />Paused
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
