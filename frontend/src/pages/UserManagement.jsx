import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamAPI, userManagementAPI } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Users,
  Crown,
  UserCog,
  User,
  Shield,
  Loader2,
  UserPlus,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const UserManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamRes, managersRes] = await Promise.all([
        teamAPI.getAll(),
        userManagementAPI.getManagers().catch(() => ({ data: [] }))
      ]);
      
      setTeam(teamRes.data);
      setManagers(managersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) return;
    
    setProcessing(true);
    try {
      await userManagementAPI.updateRole(selectedUser.user_id, selectedRole);
      toast.success(`${selectedUser.name}'s role updated to ${selectedRole}`);
      setShowRoleDialog(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignUsers = async () => {
    if (!selectedManager || selectedUserIds.length === 0) return;
    
    setProcessing(true);
    try {
      await userManagementAPI.assignUsersToManager(selectedManager.user_id, selectedUserIds);
      toast.success(`Assigned ${selectedUserIds.length} users to ${selectedManager.name}`);
      setShowAssignDialog(false);
      setSelectedUserIds([]);
      fetchData();
    } catch (error) {
      console.error('Failed to assign users:', error);
      toast.error('Failed to assign users');
    } finally {
      setProcessing(false);
    }
  };

  const openRoleDialog = (member) => {
    setSelectedUser(member);
    setSelectedRole(member.role);
    setShowRoleDialog(true);
  };

  const openAssignDialog = (manager) => {
    setSelectedManager(manager);
    setSelectedUserIds(manager.assigned_users || []);
    setShowAssignDialog(true);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'manager':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'hr':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'manager':
        return <Shield className="w-4 h-4" />;
      case 'hr':
        return <UserCog className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="bg-amber-500/10 border-amber-500/30 max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="w-12 h-12 text-amber-400" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-zinc-100">Access Restricted</h3>
              <p className="text-zinc-400 mt-1">Only administrators can access user management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="user-management-loading">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const admins = team.filter(m => m.role === 'admin');
  const managersList = team.filter(m => m.role === 'manager');
  const employees = team.filter(m => m.role === 'employee');
  const hrMembers = team.filter(m => m.role === 'hr');

  return (
    <div className="space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <UserCog className="w-8 h-8 text-blue-500" />
          User Management
        </h1>
        <p className="text-zinc-400 mt-1">Manage roles and assign team members to managers</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Total Users</p>
                <p className="text-3xl font-bold text-zinc-100">{team.length}</p>
              </div>
              <Users className="w-8 h-8 text-zinc-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Admins</p>
                <p className="text-3xl font-bold text-amber-400">{admins.length}</p>
              </div>
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Managers</p>
                <p className="text-3xl font-bold text-blue-400">{managersList.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Employees</p>
                <p className="text-3xl font-bold text-zinc-100">{employees.length}</p>
              </div>
              <User className="w-8 h-8 text-zinc-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-zinc-800/50 border border-zinc-700">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="managers">Managers & Assignments</TabsTrigger>
        </TabsList>

        {/* All Users Tab */}
        <TabsContent value="all" className="mt-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Team Members</CardTitle>
              <CardDescription>Click on a user to change their role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {team.map(member => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer group"
                    onClick={() => openRoleDialog(member)}
                    data-testid={`user-row-${member.user_id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.picture} alt={member.name} />
                        <AvatarFallback className="bg-zinc-700 text-zinc-200">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-zinc-100">{member.name}</p>
                        <p className="text-sm text-zinc-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {getRoleIcon(member.role)}
                        <span className="ml-1 capitalize">{member.role}</span>
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Managers Tab */}
        <TabsContent value="managers" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {managers.length > 0 ? managers.map(manager => (
              <Card key={manager.user_id} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={manager.picture} alt={manager.name} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-400">
                          {getInitials(manager.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg text-zinc-100">{manager.name}</CardTitle>
                        <CardDescription>{manager.email}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignDialog(manager)}
                      data-testid={`assign-users-btn-${manager.user_id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign Users
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-500">
                      Assigned Users ({manager.assigned_user_count || 0})
                    </p>
                    {manager.assigned_users?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {team
                          .filter(m => manager.assigned_users.includes(m.user_id))
                          .map(assignedUser => (
                            <Badge 
                              key={assignedUser.user_id}
                              variant="secondary"
                              className="bg-zinc-800"
                            >
                              {assignedUser.name}
                            </Badge>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-600 italic">No users assigned yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">No Managers Yet</h3>
                  <p className="text-zinc-500">
                    Promote team members to manager role from the "All Users" tab
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Change User Role</DialogTitle>
            <DialogDescription>
              Update role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
              <Avatar>
                <AvatarImage src={selectedUser?.picture} alt={selectedUser?.name} />
                <AvatarFallback className="bg-zinc-700 text-zinc-200">
                  {getInitials(selectedUser?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-zinc-100">{selectedUser?.name}</p>
                <p className="text-sm text-zinc-500">{selectedUser?.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-300">Select New Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Admin - Full access to all features
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      Manager - View assigned users data
                    </div>
                  </SelectItem>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-400" />
                      Employee - View only own data
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedUser?.user_id === user?.user_id && selectedRole !== 'admin' && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  You cannot demote yourself from admin
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRoleChange}
              disabled={processing || (selectedUser?.user_id === user?.user_id && selectedRole !== 'admin')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Users Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Assign Users to Manager</DialogTitle>
            <DialogDescription>
              Select users to assign to {selectedManager?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {team.filter(m => m.role === 'employee' || m.user_id === selectedManager?.user_id).map(member => (
                <div
                  key={member.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUserIds.includes(member.user_id)
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-zinc-800/50 hover:bg-zinc-800'
                  }`}
                  onClick={() => toggleUserSelection(member.user_id)}
                >
                  <Checkbox 
                    checked={selectedUserIds.includes(member.user_id)}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.picture} alt={member.name} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-200 text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-100">{member.name}</p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                  {selectedUserIds.includes(member.user_id) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-zinc-500">
                {selectedUserIds.length} user(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignUsers}
                  disabled={processing || selectedUserIds.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Users'
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
