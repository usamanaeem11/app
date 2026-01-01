import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../App';

export default function TimeTrackingScreen() {
  const { api } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [activeEntry, setActiveEntry] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchActiveEntry();
    fetchProjects();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTracking]);

  const fetchActiveEntry = async () => {
    try {
      const response = await api.get('/time-entries/active');
      if (response.data) {
        setActiveEntry(response.data);
        setIsTracking(true);
        // Calculate elapsed time
        const start = new Date(response.data.start_time);
        const now = new Date();
        setElapsed(Math.floor((now - start) / 1000));
      }
    } catch (error) {
      // No active entry
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTracking = async () => {
    try {
      const response = await api.post('/time-entries', {
        project_id: selectedProject?.project_id,
        description: 'Mobile tracking session'
      });
      setActiveEntry(response.data);
      setIsTracking(true);
      setElapsed(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to start tracking');
    }
  };

  const stopTracking = async () => {
    if (!activeEntry) return;
    
    try {
      await api.put(`/time-entries/${activeEntry.entry_id}`, {
        end_time: new Date().toISOString()
      });
      setIsTracking(false);
      setActiveEntry(null);
      setElapsed(0);
      Alert.alert('Success', `Tracked ${formatTime(elapsed)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop tracking');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        <Text style={styles.timerLabel}>
          {isTracking ? 'Tracking Time' : 'Not Tracking'}
        </Text>
      </View>

      {/* Control Button */}
      <TouchableOpacity
        style={[styles.controlButton, isTracking && styles.stopButton]}
        onPress={isTracking ? stopTracking : startTracking}
      >
        <Text style={styles.controlButtonText}>
          {isTracking ? '⏹ Stop' : '▶️ Start'}
        </Text>
      </TouchableOpacity>

      {/* Project Selection */}
      {!isTracking && (
        <View style={styles.projectSection}>
          <Text style={styles.sectionTitle}>Select Project (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.projectChip, !selectedProject && styles.projectChipActive]}
              onPress={() => setSelectedProject(null)}
            >
              <Text style={styles.projectChipText}>No Project</Text>
            </TouchableOpacity>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.project_id}
                style={[styles.projectChip, selectedProject?.project_id === project.project_id && styles.projectChipActive]}
                onPress={() => setSelectedProject(project)}
              >
                <Text style={styles.projectChipText}>{project.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active Entry Info */}
      {isTracking && activeEntry && (
        <View style={styles.activeInfo}>
          <Text style={styles.activeInfoTitle}>Currently Tracking</Text>
          <View style={styles.activeInfoRow}>
            <Text style={styles.activeInfoLabel}>Started:</Text>
            <Text style={styles.activeInfoValue}>
              {new Date(activeEntry.start_time).toLocaleTimeString()}
            </Text>
          </View>
          {selectedProject && (
            <View style={styles.activeInfoRow}>
              <Text style={styles.activeInfoLabel}>Project:</Text>
              <Text style={styles.activeInfoValue}>{selectedProject.name}</Text>
            </View>
          )}
        </View>
      )}

      {/* Tips */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 Tips</Text>
        <Text style={styles.tipsText}>• Timer syncs automatically with the web app</Text>
        <Text style={styles.tipsText}>• Screenshots are captured on desktop only</Text>
        <Text style={styles.tipsText}>• Don't forget to stop the timer when done!</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '200',
    color: '#fafafa',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 16,
    color: '#71717a',
    marginTop: 8,
  },
  controlButton: {
    backgroundColor: '#10b981',
    marginHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  projectSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 12,
  },
  projectChip: {
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  projectChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  projectChipText: {
    color: '#fafafa',
    fontSize: 14,
  },
  activeInfo: {
    backgroundColor: '#18181b',
    marginHorizontal: 24,
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  activeInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
  },
  activeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeInfoLabel: {
    fontSize: 14,
    color: '#71717a',
  },
  activeInfoValue: {
    fontSize: 14,
    color: '#fafafa',
  },
  tips: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 48,
    padding: 20,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fafafa',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
});
