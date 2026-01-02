import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { payrollAPI, teamAPI, timeCardAPI, payrollCalculatorAPI } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DollarSign,
  FileText,
  Download,
  Loader2,
  Calculator,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function Payroll() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview Tab
  const [payroll, setPayroll] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // Time Cards Tab
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [timeCardData, setTimeCardData] = useState(null);
  const [timeCardPeriod, setTimeCardPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // Payroll Calculator Tab
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [calculatorPeriod, setCalculatorPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [calculations, setCalculations] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await fetchPayroll();
      } else if (activeTab === 'timecards') {
        await loadEmployees();
      } else if (activeTab === 'calculator') {
        await loadEmployees();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayroll = async () => {
    try {
      const response = await payrollAPI.getAll();
      setPayroll(response.data || []);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await teamAPI.getAll();
      const empList = response.data?.filter(u => ['employee', 'manager'].includes(u.role)) || [];
      setEmployees(empList);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await payrollAPI.generate(selectedPeriod.start, selectedPeriod.end);
      toast.success('Payroll generated successfully');
      setShowGenerateDialog(false);
      fetchPayroll();
    } catch (error) {
      toast.error('Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleProcess = async (payrollId) => {
    try {
      await payrollAPI.process(payrollId);
      toast.success('Payroll processed');
      fetchPayroll();
    } catch (error) {
      toast.error('Failed to process payroll');
    }
  };

  const loadTimeCard = async (employeeId) => {
    try {
      setLoading(true);
      const response = await timeCardAPI.getEmployeeTimeCard(employeeId, {
        start_date: timeCardPeriod.start,
        end_date: timeCardPeriod.end
      });
      setTimeCardData(response.data.data);
    } catch (error) {
      toast.error('Failed to load time card');
    } finally {
      setLoading(false);
    }
  };

  const approveTimeEntry = async (entryId, approved) => {
    try {
      await timeCardAPI.approveEntry(entryId, {
        approved,
        admin_notes: approved ? 'Approved' : 'Rejected'
      });
      toast.success(`Time entry ${approved ? 'approved' : 'rejected'}`);
      if (selectedEmployee) {
        loadTimeCard(selectedEmployee);
      }
    } catch (error) {
      toast.error('Failed to update time entry');
    }
  };

  const calculatePayroll = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setCalculating(true);
    try {
      const response = await payrollCalculatorAPI.calculateBulk({
        employee_ids: selectedEmployees,
        start_date: calculatorPeriod.start,
        end_date: calculatorPeriod.end,
        auto_deductions: true
      });
      setCalculations(response.data.data);
      toast.success('Payroll calculated successfully');
    } catch (error) {
      toast.error('Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const createPayrollRecords = async () => {
    if (!calculations) {
      toast.error('Please calculate payroll first');
      return;
    }

    try {
      const response = await payrollCalculatorAPI.previewAndCreate({
        employee_ids: selectedEmployees,
        start_date: calculatorPeriod.start,
        end_date: calculatorPeriod.end,
        auto_deductions: true
      });
      toast.success(`Created ${response.data.data.records.length} payroll records`);
      setCalculations(null);
      setSelectedEmployees([]);
      setActiveTab('overview');
      fetchPayroll();
    } catch (error) {
      toast.error('Failed to create payroll records');
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee', 'Period', 'Hours', 'Rate', 'Amount', 'Status'];
    const rows = payroll.map((p) => [
      p.user_name,
      p.period,
      p.hours,
      p.rate,
      p.amount,
      p.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Payroll exported');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <Badge className="badge-success">Processed</Badge>;
      case 'pending':
        return <Badge className="badge-warning">Pending</Badge>;
      default:
        return <Badge className="border-zinc-700 text-zinc-400">{status}</Badge>;
    }
  };

  const getTotalAmount = () => {
    return payroll.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const getTotalHours = () => {
    return payroll.reduce((sum, p) => sum + (p.hours || 0), 0);
  };

  if (loading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="payroll-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Payroll Management</h1>
          <p className="text-zinc-400 mt-1">Process and manage employee payments</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="border-zinc-700"
            disabled={payroll.length === 0}
            data-testid="export-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">
            Overview
          </TabsTrigger>
          <TabsTrigger value="timecards" className="data-[state=active]:bg-emerald-600">
            Time Cards
          </TabsTrigger>
          <TabsTrigger value="calculator" className="data-[state=active]:bg-emerald-600">
            Payroll Calculator
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Total Amount</p>
                  <p className="text-xl font-bold text-emerald-400 mono">
                    ${getTotalAmount().toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
                  <p className="text-xl font-bold text-zinc-100 mono">{getTotalHours().toFixed(1)}h</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Employees</p>
                  <p className="text-xl font-bold text-zinc-100">
                    {new Set(payroll.map((p) => p.user_id)).size}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Pending</p>
                  <p className="text-xl font-bold text-zinc-100">
                    {payroll.filter((p) => p.status === 'pending').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-zinc-100 text-base font-semibold">Payroll Records</CardTitle>
              <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-500" data-testid="generate-payroll-btn">
                    <Calculator className="w-4 h-4 mr-2" />
                    Generate Payroll
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-zinc-100">Generate Payroll</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-zinc-400">
                      Generate payroll for approved timesheets in the selected period.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Period Start</label>
                        <Input
                          type="date"
                          value={selectedPeriod.start}
                          onChange={(e) =>
                            setSelectedPeriod({ ...selectedPeriod, start: e.target.value })
                          }
                          className="bg-zinc-800 border-zinc-700 text-zinc-100"
                          data-testid="period-start-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Period End</label>
                        <Input
                          type="date"
                          value={selectedPeriod.end}
                          onChange={(e) =>
                            setSelectedPeriod({ ...selectedPeriod, end: e.target.value })
                          }
                          className="bg-zinc-800 border-zinc-700 text-zinc-100"
                          data-testid="period-end-input"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      className="w-full bg-emerald-600 hover:bg-emerald-500"
                      disabled={generating}
                      data-testid="confirm-generate-btn"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Generate Payroll'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {payroll.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500">Employee</TableHead>
                      <TableHead className="text-zinc-500">Period</TableHead>
                      <TableHead className="text-zinc-500">Hours</TableHead>
                      <TableHead className="text-zinc-500">Rate</TableHead>
                      <TableHead className="text-zinc-500">Amount</TableHead>
                      <TableHead className="text-zinc-500">Status</TableHead>
                      <TableHead className="text-zinc-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.map((record) => (
                      <TableRow
                        key={record.payroll_id}
                        className="border-zinc-800"
                        data-testid={`payroll-${record.payroll_id}`}
                      >
                        <TableCell>
                          <p className="text-zinc-100 font-medium">{record.user_name}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-zinc-300">{record.period}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-100 mono">{record.hours}h</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-400 mono">${record.rate}/hr</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-emerald-400 font-medium mono">
                            ${record.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          {record.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcess(record.payroll_id)}
                              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                              data-testid={`process-${record.payroll_id}`}
                            >
                              Process
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="empty-state py-16">
                  <DollarSign className="w-16 h-16 text-zinc-700 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-300 mb-2">No Payroll Records</h3>
                  <p className="text-zinc-500 mb-4">
                    Use the Payroll Calculator tab to generate new payroll records
                  </p>
                  <Button
                    onClick={() => setActiveTab('calculator')}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Go to Calculator
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Cards Tab */}
        <TabsContent value="timecards" className="space-y-4 mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Employee Time Cards</CardTitle>
              <CardDescription className="text-zinc-400">
                View detailed time entries and approve hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Select Employee</Label>
                  <Select
                    value={selectedEmployee || ''}
                    onValueChange={(value) => {
                      setSelectedEmployee(value);
                      loadTimeCard(value);
                    }}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Choose employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {employees.map((emp) => (
                        <SelectItem key={emp.user_id} value={emp.user_id} className="text-zinc-100">
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Start Date</Label>
                  <Input
                    type="date"
                    value={timeCardPeriod.start}
                    onChange={(e) => setTimeCardPeriod({ ...timeCardPeriod, start: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">End Date</Label>
                  <Input
                    type="date"
                    value={timeCardPeriod.end}
                    onChange={(e) => setTimeCardPeriod({ ...timeCardPeriod, end: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>

              {selectedEmployee && (
                <Button
                  onClick={() => loadTimeCard(selectedEmployee)}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Load Time Card
                </Button>
              )}

              {timeCardData && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Total Hours</p>
                        <p className="text-2xl font-bold text-zinc-100">{timeCardData.period.total_hours}h</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Days Worked</p>
                        <p className="text-2xl font-bold text-zinc-100">{timeCardData.period.days_worked}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Wage Rate</p>
                        <p className="text-2xl font-bold text-zinc-100">
                          {timeCardData.wage ? `$${timeCardData.wage.wage_amount}` : 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Estimated Pay</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          {timeCardData.wage
                            ? `$${(timeCardData.period.total_hours * timeCardData.wage.wage_amount).toFixed(2)}`
                            : 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardHeader>
                      <CardTitle className="text-zinc-100">Daily Time Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {timeCardData.daily_summaries.map((day) => (
                          <div key={day.date} className="border border-zinc-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold text-zinc-100">{day.date}</h4>
                              <Badge className="bg-emerald-600">{day.total_hours.toFixed(2)}h</Badge>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow className="border-zinc-700">
                                  <TableHead className="text-zinc-400">Clock In</TableHead>
                                  <TableHead className="text-zinc-400">Clock Out</TableHead>
                                  <TableHead className="text-zinc-400">Break (min)</TableHead>
                                  <TableHead className="text-zinc-400">Hours</TableHead>
                                  <TableHead className="text-zinc-400">Status</TableHead>
                                  <TableHead className="text-zinc-400">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {day.entries.map((entry) => (
                                  <TableRow key={entry.entry_id} className="border-zinc-700">
                                    <TableCell className="text-zinc-300">
                                      {entry.clock_in
                                        ? new Date(entry.clock_in).toLocaleTimeString()
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="text-zinc-300">
                                      {entry.clock_out
                                        ? new Date(entry.clock_out).toLocaleTimeString()
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="text-zinc-300">{entry.break_minutes || 0}</TableCell>
                                    <TableCell className="text-zinc-300">{entry.hours_worked?.toFixed(2) || 0}h</TableCell>
                                    <TableCell>
                                      {entry.approved ? (
                                        <Badge className="bg-emerald-600">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Approved
                                        </Badge>
                                      ) : (
                                        <Badge className="badge-warning">Pending</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {!entry.approved && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => approveTimeEntry(entry.entry_id, true)}
                                            className="bg-emerald-600 hover:bg-emerald-500"
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => approveTimeEntry(entry.entry_id, false)}
                                            className="border-zinc-600 text-zinc-300"
                                          >
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4 mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Payroll Calculator</CardTitle>
              <CardDescription className="text-zinc-400">
                Calculate payroll with automatic deductions for taxes and benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Start Date</Label>
                  <Input
                    type="date"
                    value={calculatorPeriod.start}
                    onChange={(e) =>
                      setCalculatorPeriod({ ...calculatorPeriod, start: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">End Date</Label>
                  <Input
                    type="date"
                    value={calculatorPeriod.end}
                    onChange={(e) =>
                      setCalculatorPeriod({ ...calculatorPeriod, end: e.target.value })
                    }
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Select Employees</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-zinc-700 rounded-lg p-4 bg-zinc-800">
                  {employees.map((emp) => (
                    <div key={emp.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={emp.user_id}
                        checked={selectedEmployees.includes(emp.user_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployees([...selectedEmployees, emp.user_id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter((id) => id !== emp.user_id));
                          }
                        }}
                        className="border-zinc-600"
                      />
                      <label htmlFor={emp.user_id} className="text-sm cursor-pointer text-zinc-300">
                        {emp.name} ({emp.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={calculatePayroll}
                  disabled={calculating || selectedEmployees.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  {calculating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4 mr-2" />
                  )}
                  Calculate Payroll
                </Button>

                {calculations && (
                  <Button
                    onClick={createPayrollRecords}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Create Payroll Records
                  </Button>
                )}
              </div>

              {calculations && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Total Employees</p>
                        <p className="text-2xl font-bold text-zinc-100">{calculations.summary.total_employees}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Total Hours</p>
                        <p className="text-2xl font-bold text-zinc-100">{calculations.summary.total_hours}h</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Gross Pay</p>
                        <p className="text-2xl font-bold text-zinc-100">${calculations.summary.total_gross_pay.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Net Pay</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          ${calculations.summary.total_net_pay.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardHeader>
                      <CardTitle className="text-zinc-100">Payroll Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-zinc-700">
                            <TableHead className="text-zinc-400">Employee</TableHead>
                            <TableHead className="text-zinc-400">Hours</TableHead>
                            <TableHead className="text-zinc-400">Gross Pay</TableHead>
                            <TableHead className="text-zinc-400">Deductions</TableHead>
                            <TableHead className="text-zinc-400">Net Pay</TableHead>
                            <TableHead className="text-zinc-400">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculations.calculations.map((calc) => (
                            <TableRow key={calc.employee_id} className="border-zinc-700">
                              <TableCell className="font-medium text-zinc-100">{calc.employee_name}</TableCell>
                              <TableCell className="text-zinc-300">
                                {calc.hours?.total_hours.toFixed(2)}h
                                {calc.hours?.overtime_hours > 0 && (
                                  <span className="text-xs text-amber-400 ml-1">
                                    (+{calc.hours.overtime_hours.toFixed(2)} OT)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-zinc-300">${calc.pay?.gross_pay.toLocaleString()}</TableCell>
                              <TableCell className="text-zinc-300">${calc.total_deductions.toLocaleString()}</TableCell>
                              <TableCell className="font-bold text-emerald-400">
                                ${calc.net_pay.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300">
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
                                    <DialogHeader>
                                      <DialogTitle className="text-zinc-100">
                                        {calc.employee_name} - Payroll Details
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-semibold mb-2 text-zinc-100">Hours Breakdown</h4>
                                        <div className="grid grid-cols-3 gap-2 text-sm text-zinc-300">
                                          <div>Base Hours: {calc.hours?.base_hours.toFixed(2)}</div>
                                          <div>Overtime: {calc.hours?.overtime_hours.toFixed(2)}</div>
                                          <div>Total: {calc.hours?.total_hours.toFixed(2)}</div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-semibold mb-2 text-zinc-100">Pay Breakdown</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300">
                                          <div>Base Pay: ${calc.pay?.base_pay.toLocaleString()}</div>
                                          <div>Overtime Pay: ${calc.pay?.overtime_pay.toLocaleString()}</div>
                                          <div className="font-bold">Gross Pay: ${calc.pay?.gross_pay.toLocaleString()}</div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-semibold mb-2 text-zinc-100">Deductions</h4>
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="border-zinc-700">
                                              <TableHead className="text-zinc-400">Item</TableHead>
                                              <TableHead className="text-zinc-400">Amount</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {calc.deductions?.map((ded, idx) => (
                                              <TableRow key={idx} className="border-zinc-700">
                                                <TableCell className="text-zinc-300">{ded.name}</TableCell>
                                                <TableCell className="text-zinc-300">${ded.amount.toLocaleString()}</TableCell>
                                              </TableRow>
                                            ))}
                                            <TableRow className="font-bold border-zinc-700">
                                              <TableCell className="text-zinc-100">Total Deductions</TableCell>
                                              <TableCell className="text-zinc-100">${calc.total_deductions.toLocaleString()}</TableCell>
                                            </TableRow>
                                          </TableBody>
                                        </Table>
                                      </div>

                                      <div className="border-t border-zinc-700 pt-4">
                                        <div className="flex justify-between items-center text-lg font-bold">
                                          <span className="text-zinc-100">Net Pay</span>
                                          <span className="text-emerald-400">${calc.net_pay.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
