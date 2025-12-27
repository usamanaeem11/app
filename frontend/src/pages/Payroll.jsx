import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { payrollAPI, teamAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function Payroll() {
  const { user } = useAuth();
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    try {
      const response = await payrollAPI.getAll();
      setPayroll(response.data);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="payroll-page">
      {/* Header */}
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
        </div>
      </div>

      {/* Stats */}
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

      {/* Payroll Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-zinc-100 text-base font-semibold">Payroll Records</CardTitle>
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
                Generate payroll from approved timesheets to get started
              </p>
              <Button
                onClick={() => setShowGenerateDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Generate Payroll
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
