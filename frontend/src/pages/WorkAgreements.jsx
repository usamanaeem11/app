import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, Plus, Trash2, Loader2, PenTool, CheckCircle2, Calendar } from 'lucide-react';

const WorkAgreements = () => {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    features: [
      { name: 'Time Tracking', enabled: true, description: 'Track work hours automatically' },
      { name: 'Screenshot Monitoring', enabled: true, description: 'Periodic screenshot capture' },
      { name: 'Activity Tracking', enabled: true, description: 'Monitor app and website usage' },
      { name: 'Automatic Timer', enabled: false, description: 'Schedule automatic timer start/stop' },
    ],
    clauses: []
  });

  const [newClause, setNewClause] = useState({ title: '', content: '', is_mandatory: false });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agreementsRes, teamRes] = await Promise.all([
        axios.get(`${API_URL}/api/work-agreements`, {
          withCredentials: true
        }),
        user?.role !== 'employee' ? axios.get(`${API_URL}/api/team`, {
          withCredentials: true
        }) : Promise.resolve({ data: [] })
      ]);

      setAgreements(agreementsRes.data);
      setTeamMembers(teamRes.data.filter(m => m.role === 'employee'));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgreement = async () => {
    if (!formData.employee_id || !formData.title || !formData.start_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/work-agreements`,
        formData,
        { withCredentials: true }
      );

      toast.success('Work agreement created successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddClause = () => {
    if (!newClause.title || !newClause.content) {
      toast.error('Please fill in clause title and content');
      return;
    }

    setFormData({
      ...formData,
      clauses: [...formData.clauses, { ...newClause }]
    });
    setNewClause({ title: '', content: '', is_mandatory: false });
  };

  const handleRemoveClause = (index) => {
    setFormData({
      ...formData,
      clauses: formData.clauses.filter((_, i) => i !== index)
    });
  };

  const handleViewAgreement = async (agreement) => {
    setSelectedAgreement(agreement);
    setViewDialogOpen(true);
  };

  const handleSignAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setSignDialogOpen(true);
    // Setup canvas for signature
    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }, 100);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/work-agreements/${selectedAgreement.agreement_id}/sign`,
        { signature: signatureData },
        { withCredentials: true }
      );

      toast.success('Agreement signed successfully');
      setSignDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sign agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      features: [
        { name: 'Time Tracking', enabled: true, description: 'Track work hours automatically' },
        { name: 'Screenshot Monitoring', enabled: true, description: 'Periodic screenshot capture' },
        { name: 'Activity Tracking', enabled: true, description: 'Monitor app and website usage' },
        { name: 'Automatic Timer', enabled: false, description: 'Schedule automatic timer start/stop' },
      ],
      clauses: []
    });
    setNewClause({ title: '', content: '', is_mandatory: false });
  };

  const getStatusBadge = (agreement) => {
    const status = agreement.status;
    const styles = {
      draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      signed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      completed: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      terminated: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
      <Badge className={styles[status]}>
        <span className="capitalize">{status}</span>
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
          <h1 className="text-3xl font-bold text-zinc-100">Work Agreements</h1>
          <p className="text-zinc-400 mt-1">
            {user?.role === 'employee'
              ? 'View and sign your work agreements'
              : 'Create and manage employee work agreements'}
          </p>
        </div>

        {user?.role !== 'employee' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <FileText className="w-4 h-4 mr-2" />
                Create Agreement
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Create Work Agreement</DialogTitle>
                <DialogDescription>
                  Create a new work agreement with an employee
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Employee *</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {teamMembers.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Agreement Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Full-time Employment Agreement"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the agreement..."
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="space-y-3">
                  <Label className="text-zinc-300 text-base">Features Checklist</Label>
                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <Checkbox
                          checked={feature.enabled}
                          onCheckedChange={(checked) => {
                            const newFeatures = [...formData.features];
                            newFeatures[index].enabled = checked;
                            setFormData({ ...formData, features: newFeatures });
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-200">{feature.name}</p>
                          <p className="text-xs text-zinc-500">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="space-y-3">
                  <Label className="text-zinc-300 text-base">Agreement Clauses</Label>

                  {formData.clauses.map((clause, index) => (
                    <div key={index} className="p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-zinc-200">{clause.title}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveClause(index)}
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-400">{clause.content}</p>
                      {clause.is_mandatory && (
                        <Badge className="mt-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                  ))}

                  <div className="p-4 border border-dashed border-zinc-700 rounded-lg space-y-3">
                    <Input
                      placeholder="Clause title..."
                      value={newClause.title}
                      onChange={(e) => setNewClause({ ...newClause, title: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                    <Textarea
                      placeholder="Clause content..."
                      value={newClause.content}
                      onChange={(e) => setNewClause({ ...newClause, content: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      rows={2}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={newClause.is_mandatory}
                          onCheckedChange={(checked) => setNewClause({ ...newClause, is_mandatory: checked })}
                        />
                        <Label className="text-sm text-zinc-400">Mandatory clause</Label>
                      </div>
                      <Button
                        onClick={handleAddClause}
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Clause
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAgreement}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Agreement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {agreements.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No work agreements found</p>
            </CardContent>
          </Card>
        ) : (
          agreements.map(agreement => (
            <Card key={agreement.agreement_id} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-zinc-100">{agreement.title}</CardTitle>
                    <CardDescription className="mt-2">
                      Employee: {agreement.employee?.name} • Created by: {agreement.admin?.name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(agreement)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agreement.description && (
                    <p className="text-sm text-zinc-400">{agreement.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span>Start: {new Date(agreement.start_date).toLocaleDateString()}</span>
                    </div>
                    {agreement.end_date && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="w-4 h-4" />
                        <span>End: {new Date(agreement.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {agreement.admin_signed && (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">Admin signed</span>
                      </div>
                    )}
                    {agreement.employee_signed && (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm">Employee signed</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleViewAgreement(agreement)}
                      variant="outline"
                      className="border-zinc-700"
                    >
                      View Details
                    </Button>

                    {((user?.role !== 'employee' && !agreement.admin_signed) ||
                      (user?.role === 'employee' && agreement.employee_id === user?.user_id && !agreement.employee_signed)) && (
                      <Button
                        onClick={() => handleSignAgreement(agreement)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <PenTool className="w-4 h-4 mr-2" />
                        Sign Agreement
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Agreement Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedAgreement && (
            <>
              <DialogHeader>
                <DialogTitle className="text-zinc-100">{selectedAgreement.title}</DialogTitle>
                <DialogDescription>{selectedAgreement.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div>
                  <h4 className="font-medium text-zinc-200 mb-3">Agreement Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Employee</p>
                      <p className="text-zinc-100">{selectedAgreement.employee?.name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Admin</p>
                      <p className="text-zinc-100">{selectedAgreement.admin?.name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Start Date</p>
                      <p className="text-zinc-100">{new Date(selectedAgreement.start_date).toLocaleDateString()}</p>
                    </div>
                    {selectedAgreement.end_date && (
                      <div>
                        <p className="text-zinc-500">End Date</p>
                        <p className="text-zinc-100">{new Date(selectedAgreement.end_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                <div>
                  <h4 className="font-medium text-zinc-200 mb-3">Enabled Features</h4>
                  <div className="space-y-2">
                    {selectedAgreement.features?.map((feature, idx) => (
                      feature.enabled && (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-zinc-300">{feature.name}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {selectedAgreement.clauses && selectedAgreement.clauses.length > 0 && (
                  <>
                    <Separator className="bg-zinc-800" />
                    <div>
                      <h4 className="font-medium text-zinc-200 mb-3">Agreement Clauses</h4>
                      <div className="space-y-3">
                        {selectedAgreement.clauses.map((clause, idx) => (
                          <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg">
                            <p className="font-medium text-zinc-200 mb-1">{clause.title}</p>
                            <p className="text-sm text-zinc-400">{clause.content}</p>
                            {clause.is_mandatory && (
                              <Badge className="mt-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Mandatory
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Agreement Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Sign Agreement</DialogTitle>
            <DialogDescription>
              Draw your signature below to sign this agreement
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-2 bg-zinc-800/30">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full cursor-crosshair bg-white rounded"
              />
            </div>
            <Button
              onClick={clearSignature}
              variant="ghost"
              size="sm"
              className="mt-2 text-zinc-400"
            >
              Clear Signature
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button
              onClick={saveSignature}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkAgreements;
