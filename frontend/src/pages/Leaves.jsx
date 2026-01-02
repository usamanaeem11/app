import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaveAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import {
  Calendar as CalendarIcon,
  Plus,
  Check,
  X,
  Loader2,
  Plane,
  Heart,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, addDays } from 'date-fns';

const leaveTypes = [
  { value: 'vacation', label: 'Vacation', icon: Plane, color: 'text-blue-400' },
  { value: 'sick', label: 'Sick Leave', icon: Heart, color: 'text-red-400' },
  { value: 'personal', label: 'Personal', icon: User, color: 'text-purple-400' },
  { value: 'wfh', label: 'Work From Home', icon: Clock, color: 'text-emerald-400' },
];

export default function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_type: 'vacation',
    start_date: new Date(),
    end_date: addDays(new Date(), 1),
    reason: '',
  });

  const isManager = ['admin', 'manager', 'hr'].includes(user?.role);

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const response = await leaveAPI.getAll(params);
      setLeaves(response.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLeave = async () => {
    if (!newLeave.start_date || !newLeave.end_date) {
      toast.error('Please select dates');
      return;
    }

    setSubmitting(true);
    try {
      await leaveAPI.create({
        leave_type: newLeave.leave_type,
        start_date: newLeave.start_date.toISOString(),
        end_date: newLeave.end_date.toISOString(),
        reason: newLeave.reason,
      });
      toast.success('Leave request submitted');
      setShowRequestDialog(false);
      setNewLeave({
        leave_type: 'vacation',
        start_date: new Date(),
        end_date: addDays(new Date(), 1),
        reason: '',
      });
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      await leaveAPI.approve(leaveId);
      toast.success('Leave approved');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to approve leave');
    }
  };

  const handleReject = async (leaveId) => {
    try {
      await leaveAPI.reject(leaveId);
      toast.success('Leave rejected');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to reject leave');
    }
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

  const getLeaveTypeInfo = (type) => {
    return leaveTypes.find((t) => t.value === type) || leaveTypes[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="leaves-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Leave Management</h1>
          <p className="text-zinc-400 mt-1">
            {isManager ? 'Review and approve leave requests' : 'Request and track your time off'}
          </p>
        </div>

        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500" data-testid="request-leave-btn">
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Request Time Off</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Leave Type</label>
                <Select
                  value={newLeave.leave_type}
                  onValueChange={(value) => setNewLeave({ ...newLeave, leave_type: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="leave-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`w-4 h-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Start Date</label>
                  <Input
                    type="date"
                    value={format(newLeave.start_date, 'yyyy-MM-dd')}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, start_date: new Date(e.target.value) })
                    }
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    data-testid="start-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">End Date</label>
                  <Input
                    type="date"
                    value={format(newLeave.end_date, 'yyyy-MM-dd')}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, end_date: new Date(e.target.value) })
                    }
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    data-testid="end-date-input"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-400">
                  Duration:{' '}
                  <span className="text-zinc-100 font-medium">
                    {differenceInDays(newLeave.end_date, newLeave.start_date) + 1} day(s)
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Reason (Optional)</label>
                <Textarea
                  placeholder="Brief reason for leave..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                  rows={3}
                  data-testid="reason-input"
                />
              </div>

              <Button
                onClick={handleRequestLeave}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                disabled={submitting}
                data-testid="submit-leave-btn"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {leaveTypes.map((type) => {
          const count = leaves.filter(
            (l) => l.leave_type === type.value && l.status === 'approved'
          ).length;
          return (
            <Card key={type.value} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-zinc-800`}>
                  <type.icon className={`w-5 h-5 ${type.color}`} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">{type.label}</p>
                  <p className="text-xl font-bold text-zinc-100">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
            <CardContent className="p-4">
              {leaves.length > 0 ? (
                <div className="space-y-3">
                  {leaves.map((leave) => {
                    const typeInfo = getLeaveTypeInfo(leave.leave_type);
                    const days = differenceInDays(
                      new Date(leave.end_date),
                      new Date(leave.start_date)
                    ) + 1;

                    return (
                      <div
                        key={leave.leave_id}
                        className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-800"
                        data-testid={`leave-${leave.leave_id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-zinc-700/50">
                            <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-zinc-100 font-medium">{typeInfo.label}</p>
                              {isManager && leave.user_id !== user?.user_id && (
                                <span className="text-sm text-zinc-500">by {leave.user_name}</span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-400">
                              {format(new Date(leave.start_date), 'MMM d')} -{' '}
                              {format(new Date(leave.end_date), 'MMM d, yyyy')}
                              <span className="text-zinc-500 ml-2">({days} day{days > 1 ? 's' : ''})</span>
                            </p>
                            {leave.reason && (
                              <p className="text-xs text-zinc-500 mt-1">{leave.reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(leave.status)}
                          {isManager && leave.status === 'pending' && leave.user_id !== user?.user_id && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(leave.leave_id)}
                                className="text-emerald-400 hover:text-emerald-300"
                                data-testid={`approve-${leave.leave_id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(leave.leave_id)}
                                className="text-red-400 hover:text-red-300"
                                data-testid={`reject-${leave.leave_id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state py-16">
                  <CalendarIcon className="w-16 h-16 text-zinc-700 mb-4" />
                  <h3 className="text-lg font-medium text-zinc-300 mb-2">No Leave Requests</h3>
                  <p className="text-zinc-500">
                    {activeTab === 'all'
                      ? 'No leave requests yet'
                      : `No ${activeTab} leave requests`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
