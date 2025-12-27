import React, { useState, useEffect } from 'react';
import { screenshotAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import {
  Camera,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Monitor,
  Clock,
} from 'lucide-react';
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns';

// Demo screenshots for MVP (simulated data)
const demoScreenshots = [
  {
    screenshot_id: 'demo_1',
    s3_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop',
    taken_at: new Date().toISOString(),
    app_name: 'VS Code',
    window_title: 'server.py - WorkMonitor',
    blurred: false,
  },
  {
    screenshot_id: 'demo_2',
    s3_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=300&fit=crop',
    taken_at: new Date(Date.now() - 30000).toISOString(),
    app_name: 'Chrome',
    window_title: 'GitHub - Pull Request Review',
    blurred: false,
  },
  {
    screenshot_id: 'demo_3',
    s3_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    taken_at: new Date(Date.now() - 60000).toISOString(),
    app_name: 'Slack',
    window_title: 'Team Channel - DevOps',
    blurred: false,
  },
  {
    screenshot_id: 'demo_4',
    s3_url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=300&fit=crop',
    taken_at: new Date(Date.now() - 90000).toISOString(),
    app_name: 'Terminal',
    window_title: 'bash - deployment script',
    blurred: false,
  },
];

export default function Screenshots() {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchScreenshots();
  }, [selectedDate]);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const response = await screenshotAPI.getAll({
        start_date: format(startOfDay(selectedDate), 'yyyy-MM-dd'),
        end_date: format(endOfDay(selectedDate), 'yyyy-MM-dd'),
      });
      
      // Use demo data if no real screenshots
      if (response.data.length === 0) {
        setScreenshots(demoScreenshots);
      } else {
        setScreenshots(response.data);
      }
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      setScreenshots(demoScreenshots);
    } finally {
      setLoading(false);
    }
  };

  const openScreenshot = (screenshot) => {
    setSelectedScreenshot(screenshot);
    setShowModal(true);
  };

  const navigateDay = (direction) => {
    setSelectedDate((prev) => (direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)));
  };

  const groupByHour = () => {
    const groups = {};
    screenshots.forEach((ss) => {
      const hour = format(new Date(ss.taken_at), 'HH:00');
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(ss);
    });
    return groups;
  };

  const hourlyGroups = groupByHour();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="screenshots-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Screenshots</h1>
          <p className="text-zinc-400 mt-1">View captured screenshots and activity</p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay('prev')}
            className="text-zinc-400"
            data-testid="prev-day-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-100 font-medium">
              {format(selectedDate, 'MMM d, yyyy')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay('next')}
            className="text-zinc-400"
            disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
            data-testid="next-day-btn"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Total Screenshots</p>
              <p className="text-xl font-bold text-zinc-100 mono">{screenshots.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Monitor className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Apps Tracked</p>
              <p className="text-xl font-bold text-zinc-100 mono">
                {new Set(screenshots.map((s) => s.app_name)).size}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Capture Interval</p>
              <p className="text-xl font-bold text-zinc-100 mono">30s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screenshots by Hour */}
      {screenshots.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(hourlyGroups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([hour, hourScreenshots]) => (
              <Card key={hour} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-zinc-100 text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    {hour}
                    <Badge variant="outline" className="ml-2 text-zinc-400 border-zinc-700">
                      {hourScreenshots.length} captures
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="screenshot-grid">
                    {hourScreenshots.map((screenshot) => (
                      <button
                        key={screenshot.screenshot_id}
                        onClick={() => openScreenshot(screenshot)}
                        className="relative group overflow-hidden rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all"
                        data-testid={`screenshot-${screenshot.screenshot_id}`}
                      >
                        <img
                          src={screenshot.s3_url}
                          alt={screenshot.window_title || 'Screenshot'}
                          className="w-full h-36 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                          <p className="text-xs text-zinc-100 font-medium truncate">
                            {screenshot.app_name}
                          </p>
                          <p className="text-xs text-zinc-400 mono">
                            {format(new Date(screenshot.taken_at), 'HH:mm:ss')}
                          </p>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-1.5 bg-black/50 rounded-md">
                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        {screenshot.blurred && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-amber-500/80 text-xs">Blurred</Badge>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-16">
            <div className="empty-state">
              <Camera className="w-16 h-16 text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No Screenshots</h3>
              <p className="text-zinc-500 max-w-md">
                Screenshots will appear here once the desktop tracker starts capturing your activity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshot Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {selectedScreenshot?.app_name}
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="space-y-4">
              <img
                src={selectedScreenshot.s3_url}
                alt={selectedScreenshot.window_title || 'Screenshot'}
                className="w-full rounded-lg"
              />
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <div className="flex items-center gap-4">
                  <span className="mono">
                    {format(new Date(selectedScreenshot.taken_at), 'HH:mm:ss')}
                  </span>
                  <span>{selectedScreenshot.window_title}</span>
                </div>
                {selectedScreenshot.blurred && (
                  <Badge className="bg-amber-500/80">Blurred</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
