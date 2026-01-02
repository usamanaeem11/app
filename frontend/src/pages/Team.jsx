import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamAPI, companyAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
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
  Users,
  UserPlus,
  Mail,
  Shield,
  Loader2,
  Search,
  MoreVertical,
  Edit2,
  Briefcase,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Team() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', role: 'employee', employment_type: 'freelancer' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeam(response.data);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('Please enter an email address');
      return;
    }

    setSending(true);
    try {
      await companyAPI.invite(inviteData);
      toast.success('Invitation sent successfully');
      setShowInviteDialog(false);
      setInviteData({ email: '', role: 'employee', employment_type: 'freelancer' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      await teamAPI.updateMember(selectedMember.user_id, {
        role: selectedMember.role,
        hourly_rate: selectedMember.hourly_rate,
        employment_type: selectedMember.employment_type,
      });
      toast.success('Team member updated');
      setShowEditDialog(false);
      fetchTeam();
    } catch (error) {
      toast.error('Failed to update team member');
    }
  };

  const openEditDialog = (member) => {
    setSelectedMember({ ...member });
    setShowEditDialog(true);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500/20 text-purple-400 border-0">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500/20 text-blue-400 border-0">Manager</Badge>;
      case 'hr':
        return <Badge className="bg-amber-500/20 text-amber-400 border-0">HR</Badge>;
      default:
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-0">Employee</Badge>;
    }
  };

  const getEmploymentTypeBadge = (employmentType) => {
    if (employmentType === 'full_time') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
          <Briefcase className="w-3 h-3 mr-1" />
          Full-time
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-0">
        <UserCircle className="w-3 h-3 mr-1" />
        Freelancer
      </Badge>
    );
  };

  const filteredTeam = team.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="team-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Team Management</h1>
          <p className="text-zinc-400 mt-1">Manage team members and roles</p>
        </div>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500" data-testid="invite-btn">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Email Address</label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  data-testid="invite-email-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Role</label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100" data-testid="invite-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    {user?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Employment Type</label>
                <Select
                  value={inviteData.employment_type}
                  onValueChange={(value) => setInviteData({ ...inviteData, employment_type: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="freelancer">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4" />
                        Freelancer
                      </div>
                    </SelectItem>
                    <SelectItem value="full_time">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Full-time Employee
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  {inviteData.employment_type === 'full_time'
                    ? 'Can have automatic timers with consent'
                    : 'Manual time tracking control'}
                </p>
              </div>
              <Button
                onClick={handleInvite}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                disabled={sending}
                data-testid="send-invite-btn"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Total Members</p>
              <p className="text-xl font-bold text-zinc-100">{team.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Admins</p>
              <p className="text-xl font-bold text-zinc-100">
                {team.filter((m) => m.role === 'admin').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Managers</p>
              <p className="text-xl font-bold text-zinc-100">
                {team.filter((m) => m.role === 'manager').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Employees</p>
              <p className="text-xl font-bold text-zinc-100">
                {team.filter((m) => m.role === 'employee').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100"
          data-testid="search-input"
        />
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeam.map((member) => (
          <Card
            key={member.user_id}
            className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
            data-testid={`member-${member.user_id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.picture} alt={member.name} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-200">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-zinc-100 font-medium">{member.name}</p>
                    <p className="text-sm text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(member)}
                  className="text-zinc-500 hover:text-zinc-100"
                  data-testid={`edit-${member.user_id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                {getRoleBadge(member.role)}
                <Badge
                  variant="outline"
                  className={
                    member.status === 'active'
                      ? 'status-active'
                      : 'border-zinc-700 text-zinc-500'
                  }
                >
                  {member.status || 'active'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getEmploymentTypeBadge(member.employment_type || 'freelancer')}
                {member.hourly_rate > 0 && (
                  <p className="text-xs text-zinc-500">
                    Rate: <span className="text-emerald-400">${member.hourly_rate}/hr</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeam.length === 0 && (
        <div className="empty-state py-16">
          <Users className="w-16 h-16 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No Team Members Found</h3>
          <p className="text-zinc-500">
            {searchQuery ? 'Try a different search term' : 'Invite team members to get started'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Team Member</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedMember.picture} />
                  <AvatarFallback className="bg-zinc-700 text-zinc-200">
                    {getInitials(selectedMember.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-zinc-100 font-medium">{selectedMember.name}</p>
                  <p className="text-sm text-zinc-500">{selectedMember.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Role</label>
                <Select
                  value={selectedMember.role}
                  onValueChange={(value) =>
                    setSelectedMember({ ...selectedMember, role: value })
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    {user?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Employment Type</label>
                <Select
                  value={selectedMember.employment_type || 'freelancer'}
                  onValueChange={(value) =>
                    setSelectedMember({ ...selectedMember, employment_type: value })
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="freelancer">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4" />
                        Freelancer
                      </div>
                    </SelectItem>
                    <SelectItem value="full_time">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Full-time Employee
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  {selectedMember.employment_type === 'full_time'
                    ? 'Full-time employees can have automatic timers and scheduled tracking with consent'
                    : 'Freelancers have full manual control over time tracking'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Hourly Rate ($)</label>
                <Input
                  type="number"
                  value={selectedMember.hourly_rate || 0}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>

              <Button
                onClick={handleUpdateMember}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
