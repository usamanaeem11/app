import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  FileText,
  Check,
  X,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Timesheets() {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isManager = ['admin', 'manager', 'hr'].includes(user?.role);

  useEffect(() => {
    fetchTimesheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const response = await timesheetAPI.getAll(params);
      setTimesheets(response.data);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await timesheetAPI.generate();
      toast.success(`Timesheet generated: ${response.data.total_hours}h logged`);
      fetchTimesheets();
    } catch (error) {
      toast.error('Failed to generate timesheet');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (timesheetId) => {
    try {
      await timesheetAPI.approve(timesheetId);
      toast.success('Timesheet approved');
      fetchTimesheets();
    } catch (error) {
      toast.error('Failed to approve timesheet');
    }
  };

  const handleReject = async (timesheetId) => {
    try {
      await timesheetAPI.reject(timesheetId, 'Needs revision');
      toast.success('Timesheet rejected');
      fetchTimesheets();
    } catch (error) {
      toast.error('Failed to reject timesheet');
    }
  };

  const viewDetails = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="badge-success">Approved</Badge>;
      case 'rejected':
        return <Badge className="badge-danger">Rejected</Badge>;
      case 'pending':
        return <Badge className="badge-warning">Pending</Badge>;
      default:
        return <Badge className="border-zinc-700 text-zinc-400">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="timesheets-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Timesheets</h1>
          <p className="text-zinc-400 mt-1">
            {isManager ? 'Review and approve team timesheets' : 'View and manage your timesheets'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchTimesheets}
            className="border-zinc-700"
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-emerald-600 hover:bg-emerald-500"
            disabled={generating}
            data-testid="generate-timesheet-btn"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Generate Timesheet
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {timesheets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500">Week</TableHead>
                      {isManager && <TableHead className="text-zinc-500">Employee</TableHead>}
                      <TableHead className="text-zinc-500">Hours</TableHead>
                      <TableHead className="text-zinc-500">Billable</TableHead>
                      <TableHead className="text-zinc-500">Status</TableHead>
                      <TableHead className="text-zinc-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets.map((ts) => (
                      <TableRow
                        key={ts.timesheet_id}
                        className="border-zinc-800"
                        data-testid={`timesheet-${ts.timesheet_id}`}
                      >
                        <TableCell>
                          <div>
                            <p className="text-zinc-100 font-medium">
                              {format(new Date(ts.week_start), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-zinc-500">Week Starting</p>
                          </div>
                        </TableCell>
                        {isManager && (
                          <TableCell>
                            <p className="text-zinc-100">{ts.user_name}</p>
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="text-zinc-100 font-medium mono">{ts.total_hours}h</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-emerald-400 mono">{ts.billable_hours}h</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(ts.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDetails(ts)}
                              className="text-zinc-400 hover:text-zinc-100"
                              data-testid={`view-${ts.timesheet_id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {isManager && ts.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(ts.timesheet_id)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                  data-testid={`approve-${ts.timesheet_id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(ts.timesheet_id)}
                                  className="text-red-400 hover:text-red-300"
                                  data-testid={`reject-${ts.timesheet_id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="empty-state py-16">
                  <FileText className="w-16 h-16 text-zinc-700 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-300 mb-2">No Timesheets</h3>
                  <p className="text-zinc-500 mb-4">
                    {activeTab === 'all'
                      ? 'Generate a timesheet to get started'
                      : `No ${activeTab} timesheets found`}
                  </p>
                  {activeTab === 'all' && (
                    <Button onClick={handleGenerate} className="bg-emerald-600 hover:bg-emerald-500">
                      Generate Timesheet
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Timesheet Details</DialogTitle>
          </DialogHeader>
          {selectedTimesheet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase">Week</p>
                  <p className="text-zinc-100 font-medium">
                    {format(new Date(selectedTimesheet.week_start), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase">Status</p>
                  {getStatusBadge(selectedTimesheet.status)}
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
                  <p className="text-2xl font-bold text-zinc-100 mono">
                    {selectedTimesheet.total_hours}h
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase">Billable Hours</p>
                  <p className="text-2xl font-bold text-emerald-400 mono">
                    {selectedTimesheet.billable_hours}h
                  </p>
                </div>
              </div>

              {selectedTimesheet.entries && selectedTimesheet.entries.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Time Entries ({selectedTimesheet.entries.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {selectedTimesheet.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-zinc-800/30 rounded">
                        <span className="text-sm text-zinc-300 mono">{entry.entry_id}</span>
                        <span className="text-sm text-zinc-400">
                          {Math.round(entry.duration / 3600)}h {Math.round((entry.duration % 3600) / 60)}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isManager && selectedTimesheet.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <Button
                    onClick={() => {
                      handleApprove(selectedTimesheet.timesheet_id);
                      setShowDetailModal(false);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      handleReject(selectedTimesheet.timesheet_id);
                      setShowDetailModal(false);
                    }}
                    variant="outline"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
