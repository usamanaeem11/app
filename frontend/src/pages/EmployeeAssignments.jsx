import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { UserPlus, Check, X, Clock, Loader2 } from 'lucide-react';

const EmployeeAssignments = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, teamRes] = await Promise.all([
        axios.get(`${API_URL}/api/employee-assignments`, {
          withCredentials: true
        }),
        user?.role !== 'employee' ? axios.get(`${API_URL}/api/team`, {
          withCredentials: true
        }) : Promise.resolve({ data: [] })
      ]);

      setRequests(requestsRes.data);
      setTeamMembers(teamRes.data.filter(m => m.role === 'employee'));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/employee-assignments`,
        {
          employee_id: selectedEmployee,
          message: message || undefined
        },
        { withCredentials: true }
      );

      toast.success('Assignment request sent successfully');
      setDialogOpen(false);
      setSelectedEmployee('');
      setMessage('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponseRequest = async (requestId, status) => {
    try {
      await axios.put(
        `${API_URL}/api/employee-assignments/${requestId}`,
        { status },
        { withCredentials: true }
      );

      toast.success(`Request ${status}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await axios.delete(
        `${API_URL}/api/employee-assignments/${requestId}`,
        { withCredentials: true }
      );

      toast.success('Request cancelled');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel request');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      accepted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    };

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      accepted: <Check className="w-3 h-3" />,
      rejected: <X className="w-3 h-3" />,
      cancelled: <X className="w-3 h-3" />
    };

    return (
      <Badge className={styles[status]}>
        {icons[status]}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Employee Assignments</h1>
          <p className="text-zinc-400 mt-1">
            {user?.role === 'employee'
              ? 'Review and respond to assignment requests'
              : 'Manage employee assignment requests'}
          </p>
        </div>

        {user?.role !== 'employee' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="w-4 h-4 mr-2" />
                New Assignment Request
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Create Assignment Request</DialogTitle>
                <DialogDescription>
                  Send an assignment request to an employee. They must accept before you can manage their time tracking.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee" className="text-zinc-300">Select Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {teamMembers.map(member => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-zinc-300">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message to the employee..."
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRequest}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-12 text-center">
              <UserPlus className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No assignment requests</p>
            </CardContent>
          </Card>
        ) : (
          requests.map(request => (
            <Card key={request.request_id} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-zinc-100 text-lg">
                      {user?.role === 'employee'
                        ? `Assignment request from ${request.manager?.name}`
                        : `Assignment request to ${request.employee?.name}`}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {user?.role === 'employee'
                        ? request.manager?.email
                        : request.employee?.email}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.message && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-300">{request.message}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>Requested: {new Date(request.requested_at).toLocaleDateString()}</span>
                    {request.responded_at && (
                      <span>Responded: {new Date(request.responded_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      {user?.role === 'employee' ? (
                        <>
                          <Button
                            onClick={() => handleResponseRequest(request.request_id, 'accepted')}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleResponseRequest(request.request_id, 'rejected')}
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleCancelRequest(request.request_id)}
                          variant="outline"
                          className="border-zinc-700"
                        >
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EmployeeAssignments;
