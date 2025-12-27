import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { invoiceAPI, projectAPI, pdfAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
import {
  FileText,
  Plus,
  Download,
  Send,
  DollarSign,
  Loader2,
  Trash2,
  Eye,
  Check,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [newInvoice, setNewInvoice] = useState({
    client_name: '',
    project_id: '',
    items: [{ description: '', hours: '', rate: '', amount: 0 }],
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    notes: '',
    tax_rate: 0,
  });

  const isManager = ['admin', 'hr'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const [invoicesRes, projectsRes] = await Promise.all([
        invoiceAPI.getAll(params),
        projectAPI.getAll(),
      ]);
      setInvoices(invoicesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.client_name) {
      toast.error('Client name is required');
      return;
    }

    // Filter out empty items and calculate amounts
    const validItems = newInvoice.items
      .filter(item => item.description && item.hours && item.rate)
      .map(item => ({
        ...item,
        hours: parseFloat(item.hours),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.hours) * parseFloat(item.rate),
      }));

    if (validItems.length === 0) {
      toast.error('At least one line item is required');
      return;
    }

    try {
      await invoiceAPI.create({
        ...newInvoice,
        items: validItems,
        due_date: new Date(newInvoice.due_date).toISOString(),
      });
      toast.success('Invoice created');
      setShowCreateDialog(false);
      setNewInvoice({
        client_name: '',
        project_id: '',
        items: [{ description: '', hours: '', rate: '', amount: 0 }],
        due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        notes: '',
        tax_rate: 0,
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const handleUpdateStatus = async (invoiceId, status) => {
    try {
      await invoiceAPI.update(invoiceId, { status });
      toast.success(`Invoice marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoiceAPI.delete(invoiceId);
      toast.success('Invoice deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const viewInvoice = async (invoice) => {
    try {
      const response = await invoiceAPI.get(invoice.invoice_id);
      setSelectedInvoice(response.data);
      setShowViewDialog(true);
    } catch (error) {
      toast.error('Failed to load invoice');
    }
  };

  const addLineItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', hours: '', rate: '', amount: 0 }],
    }));
  };

  const updateLineItem = (index, field, value) => {
    setNewInvoice(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'hours' || field === 'rate') {
        const hours = parseFloat(items[index].hours) || 0;
        const rate = parseFloat(items[index].rate) || 0;
        items[index].amount = hours * rate;
      }
      return { ...prev, items };
    });
  };

  const removeLineItem = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * (newInvoice.tax_rate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="badge-success">Paid</Badge>;
      case 'sent':
        return <Badge className="badge-info">Sent</Badge>;
      case 'draft':
        return <Badge className="border-zinc-700 text-zinc-400">Draft</Badge>;
      case 'overdue':
        return <Badge className="badge-danger">Overdue</Badge>;
      case 'cancelled':
        return <Badge className="bg-zinc-500/20 text-zinc-400">Cancelled</Badge>;
      default:
        return <Badge className="border-zinc-700 text-zinc-400">{status}</Badge>;
    }
  };

  const exportInvoicePDF = (invoice) => {
    // Create a simple text-based invoice for download
    const content = `
INVOICE
========================================
Invoice #: ${invoice.invoice_number}
Date: ${format(new Date(invoice.created_at), 'MMM d, yyyy')}
Due Date: ${format(new Date(invoice.due_date), 'MMM d, yyyy')}

Bill To: ${invoice.client_name}

----------------------------------------
ITEMS
----------------------------------------
${invoice.items.map(item => `${item.description}\n  ${item.hours}h × $${item.rate}/hr = $${item.amount.toFixed(2)}`).join('\n\n')}

----------------------------------------
Subtotal: $${invoice.subtotal.toFixed(2)}
Tax (${invoice.tax_rate}%): $${invoice.tax_amount.toFixed(2)}
----------------------------------------
TOTAL: $${invoice.total.toFixed(2)}
========================================
${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Invoice exported');
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="invoices-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Invoices</h1>
          <p className="text-zinc-400 mt-1">Create and manage client invoices</p>
        </div>

        {isManager && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-500" data-testid="create-invoice-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Create Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Client Name *</label>
                    <Input
                      value={newInvoice.client_name}
                      onChange={(e) => setNewInvoice({ ...newInvoice, client_name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      placeholder="Client or company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Project (Optional)</label>
                    <Select
                      value={newInvoice.project_id}
                      onValueChange={(v) => setNewInvoice({ ...newInvoice, project_id: v })}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {projects.map(p => (
                          <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-400">Line Items</label>
                    <Button variant="ghost" size="sm" onClick={addLineItem} className="text-emerald-400">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {newInvoice.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="col-span-5 bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                        <Input
                          type="number"
                          placeholder="Hours"
                          value={item.hours}
                          onChange={(e) => updateLineItem(index, 'hours', e.target.value)}
                          className="col-span-2 bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                        <Input
                          type="number"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                          className="col-span-2 bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                        <div className="col-span-2 text-right text-zinc-300 mono">
                          ${(item.amount || 0).toFixed(2)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="col-span-1 text-zinc-500 hover:text-red-400 h-9 w-9"
                          disabled={newInvoice.items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Due Date</label>
                    <Input
                      type="date"
                      value={newInvoice.due_date}
                      onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Tax Rate (%)</label>
                    <Input
                      type="number"
                      value={newInvoice.tax_rate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Notes</label>
                  <Textarea
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                    rows={2}
                    placeholder="Payment terms, thank you note, etc."
                  />
                </div>

                <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="text-zinc-100 mono">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Tax ({newInvoice.tax_rate}%)</span>
                    <span className="text-zinc-100 mono">${totals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-700">
                    <span className="text-zinc-100">Total</span>
                    <span className="text-emerald-400 mono">${totals.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={handleCreateInvoice} className="w-full bg-emerald-600 hover:bg-emerald-500">
                  Create Invoice
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Total Revenue</p>
              <p className="text-xl font-bold text-emerald-400 mono">
                ${invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Outstanding</p>
              <p className="text-xl font-bold text-zinc-100 mono">
                ${invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Drafts</p>
              <p className="text-xl font-bold text-zinc-100">
                {invoices.filter(i => i.status === 'draft').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Overdue</p>
              <p className="text-xl font-bold text-zinc-100">
                {invoices.filter(i => i.status === 'overdue').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Drafts</TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500">Invoice #</TableHead>
                      <TableHead className="text-zinc-500">Client</TableHead>
                      <TableHead className="text-zinc-500">Amount</TableHead>
                      <TableHead className="text-zinc-500">Due Date</TableHead>
                      <TableHead className="text-zinc-500">Status</TableHead>
                      <TableHead className="text-zinc-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.invoice_id} className="border-zinc-800" data-testid={`invoice-${invoice.invoice_id}`}>
                        <TableCell>
                          <p className="text-zinc-100 font-medium mono">{invoice.invoice_number}</p>
                          <p className="text-xs text-zinc-500">
                            {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-zinc-100">{invoice.client_name}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-emerald-400 font-medium mono">
                            ${invoice.total.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-zinc-300">
                            {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewInvoice(invoice)}
                              className="text-zinc-400 hover:text-zinc-100"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportInvoicePDF(invoice)}
                              className="text-zinc-400 hover:text-zinc-100"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {invoice.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(invoice.invoice_id, 'sent')}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            {invoice.status === 'sent' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(invoice.invoice_id, 'paid')}
                                className="text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {isManager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteInvoice(invoice.invoice_id)}
                                className="text-zinc-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
                  <h3 className="text-lg font-medium text-zinc-300 mb-2">No Invoices</h3>
                  <p className="text-zinc-500 mb-4">
                    {activeTab === 'all' ? 'Create your first invoice to get started' : `No ${activeTab} invoices`}
                  </p>
                  {isManager && activeTab === 'all' && (
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-500">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Invoice Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-zinc-100 mono">{selectedInvoice.invoice_number}</p>
                  <p className="text-zinc-500">Created {format(new Date(selectedInvoice.created_at), 'MMM d, yyyy')}</p>
                </div>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Bill To</p>
                  <p className="text-zinc-100 font-medium">{selectedInvoice.client_name}</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Due Date</p>
                  <p className="text-zinc-100 font-medium">
                    {format(new Date(selectedInvoice.due_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500">Description</TableHead>
                      <TableHead className="text-zinc-500 text-right">Hours</TableHead>
                      <TableHead className="text-zinc-500 text-right">Rate</TableHead>
                      <TableHead className="text-zinc-500 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, idx) => (
                      <TableRow key={idx} className="border-zinc-800">
                        <TableCell className="text-zinc-100">{item.description}</TableCell>
                        <TableCell className="text-zinc-300 text-right mono">{item.hours}</TableCell>
                        <TableCell className="text-zinc-300 text-right mono">${item.rate}</TableCell>
                        <TableCell className="text-zinc-100 text-right mono">${item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-zinc-100 mono">${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tax ({selectedInvoice.tax_rate}%)</span>
                  <span className="text-zinc-100 mono">${selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t border-zinc-700">
                  <span className="text-zinc-100">Total</span>
                  <span className="text-emerald-400 mono">${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Notes</p>
                  <p className="text-zinc-300 text-sm">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => exportInvoicePDF(selectedInvoice)}
                  className="flex-1 border-zinc-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                {selectedInvoice.status === 'draft' && (
                  <Button
                    onClick={() => {
                      handleUpdateStatus(selectedInvoice.invoice_id, 'sent');
                      setShowViewDialog(false);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </Button>
                )}
                {selectedInvoice.status === 'sent' && (
                  <Button
                    onClick={() => {
                      handleUpdateStatus(selectedInvoice.invoice_id, 'paid');
                      setShowViewDialog(false);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
