import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, taskAPI, teamAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  FolderKanban,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  Users,
  Calendar,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PROJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const TASK_STATUSES = [
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-zinc-400' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-400' },
  { value: 'review', label: 'Review', icon: AlertCircle, color: 'text-amber-400' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-400' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-zinc-500/20 text-zinc-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-400' },
];

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_name: '',
    budget_hours: '',
    hourly_rate: '',
    color: PROJECT_COLORS[0],
  });

  const [newTask, setNewTask] = useState({
    project_id: '',
    name: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    estimated_hours: '',
  });

  const isManager = ['admin', 'manager'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes, teamRes] = await Promise.all([
        projectAPI.getAll(),
        taskAPI.getAll(),
        teamAPI.getAll(),
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setTeam(teamRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name) {
      toast.error('Project name is required');
      return;
    }

    try {
      await projectAPI.create({
        ...newProject,
        budget_hours: newProject.budget_hours ? parseFloat(newProject.budget_hours) : null,
        hourly_rate: newProject.hourly_rate ? parseFloat(newProject.hourly_rate) : null,
      });
      toast.success('Project created');
      setShowProjectDialog(false);
      setNewProject({ name: '', description: '', client_name: '', budget_hours: '', hourly_rate: '', color: PROJECT_COLORS[0] });
      fetchData();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    try {
      await projectAPI.update(editingProject.project_id, editingProject);
      toast.success('Project updated');
      setEditingProject(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await projectAPI.delete(projectId);
      toast.success('Project deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.project_id) {
      toast.error('Task name and project are required');
      return;
    }

    try {
      await taskAPI.create({
        ...newTask,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      });
      toast.success('Task created');
      setShowTaskDialog(false);
      setNewTask({ project_id: '', name: '', description: '', assigned_to: '', due_date: '', priority: 'medium', estimated_hours: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    try {
      await taskAPI.update(taskId, { status });
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskAPI.delete(taskId);
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProjectTasks = (projectId) => tasks.filter(t => t.project_id === projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="projects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Projects & Tasks</h1>
          <p className="text-zinc-400 mt-1">Manage projects and track task progress</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-zinc-700" data-testid="new-task-btn">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Create Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Project *</label>
                  <Select value={newTask.project_id} onValueChange={(v) => setNewTask({ ...newTask, project_id: v })}>
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
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Task Name *</label>
                  <Input
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    placeholder="Enter task name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Description</label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Assign To</label>
                    <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {team.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Priority</label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {PRIORITIES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Due Date</label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Est. Hours</label>
                    <Input
                      type="number"
                      value={newTask.estimated_hours}
                      onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateTask} className="w-full bg-emerald-600 hover:bg-emerald-500">
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isManager && (
            <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-500" data-testid="new-project-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-zinc-100">Create Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Project Name *</label>
                    <Input
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Description</label>
                    <Textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Client Name</label>
                    <Input
                      value={newProject.client_name}
                      onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Budget Hours</label>
                      <Input
                        type="number"
                        value={newProject.budget_hours}
                        onChange={(e) => setNewProject({ ...newProject, budget_hours: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Hourly Rate ($)</label>
                      <Input
                        type="number"
                        value={newProject.hourly_rate}
                        onChange={(e) => setNewProject({ ...newProject, hourly_rate: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Color</label>
                    <div className="flex gap-2">
                      {PROJECT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewProject({ ...newProject, color: c })}
                          className={`w-8 h-8 rounded-full transition-transform ${newProject.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateProject} className="w-full bg-emerald-600 hover:bg-emerald-500">
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FolderKanban className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Projects</p>
              <p className="text-xl font-bold text-zinc-100">{projects.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Total Tasks</p>
              <p className="text-xl font-bold text-zinc-100">{tasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">In Progress</p>
              <p className="text-xl font-bold text-zinc-100">
                {tasks.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Completed</p>
              <p className="text-xl font-bold text-zinc-100">
                {tasks.filter(t => t.status === 'done').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => {
          const projectTasks = getProjectTasks(project.project_id);
          const completedTasks = projectTasks.filter(t => t.status === 'done').length;
          const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

          return (
            <Card
              key={project.project_id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
              data-testid={`project-${project.project_id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <CardTitle className="text-zinc-100 text-base">{project.name}</CardTitle>
                      {project.client_name && (
                        <p className="text-xs text-zinc-500">{project.client_name}</p>
                      )}
                    </div>
                  </div>
                  {isManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-500">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                        <DropdownMenuItem onClick={() => setEditingProject(project)} className="text-zinc-300">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteProject(project.project_id)} className="text-red-400">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.description && (
                  <p className="text-sm text-zinc-400 line-clamp-2">{project.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Progress</span>
                    <span className="text-zinc-300">{completedTasks}/{projectTasks.length} tasks</span>
                  </div>
                  <Progress value={progress} className="h-1.5 bg-zinc-800" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">
                      {project.tracked_hours || 0}h
                      {project.budget_hours && (
                        <span className="text-zinc-600"> / {project.budget_hours}h</span>
                      )}
                    </span>
                  </div>
                  {project.hourly_rate > 0 && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                      ${project.hourly_rate}/hr
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="empty-state py-16">
          <FolderKanban className="w-16 h-16 text-zinc-700 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No Projects Yet</h3>
          <p className="text-zinc-500 mb-4">Create your first project to start tracking tasks</p>
          {isManager && (
            <Button onClick={() => setShowProjectDialog(true)} className="bg-emerald-600 hover:bg-emerald-500">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Tasks Section */}
      {tasks.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-zinc-100 text-base">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.slice(0, 10).map(task => {
                const statusInfo = TASK_STATUSES.find(s => s.value === task.status);
                const priorityInfo = PRIORITIES.find(p => p.value === task.priority);
                const project = projects.find(p => p.project_id === task.project_id);

                return (
                  <div
                    key={task.task_id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                    data-testid={`task-${task.task_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleUpdateTaskStatus(task.task_id, v)}
                      >
                        <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto">
                          {statusInfo && <statusInfo.icon className={`w-5 h-5 ${statusInfo.color}`} />}
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {TASK_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <div className="flex items-center gap-2">
                                <s.icon className={`w-4 h-4 ${s.color}`} />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <p className="text-zinc-100 font-medium">{task.name}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {project && (
                            <>
                              <span style={{ color: project.color }}>{project.name}</span>
                              <span>·</span>
                            </>
                          )}
                          {task.due_date && (
                            <span>{format(new Date(task.due_date), 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {priorityInfo && (
                        <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
                      )}
                      {task.assignee_name && (
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-zinc-700 text-zinc-200 text-xs">
                            {getInitials(task.assignee_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Project Name</label>
                <Input
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Status</label>
                <Select
                  value={editingProject.status}
                  onValueChange={(v) => setEditingProject({ ...editingProject, status: v })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateProject} className="w-full bg-emerald-600 hover:bg-emerald-500">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
