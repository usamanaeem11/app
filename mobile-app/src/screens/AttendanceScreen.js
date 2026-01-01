import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../App';

export default function AttendanceScreen() {
  const { api, user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchHistory();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/attendance?start_date=${today}&end_date=${today}`);
      const records = response.data || [];
      const todayRecord = records.find(r => r.date?.startsWith(today));
      setAttendance(todayRecord);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/attendance');
      setHistory((response.data || []).slice(0, 7));
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const clockIn = async () => {
    setLoading(true);
    try {
      const response = await api.post('/attendance/clock-in');
      Alert.alert('Success', `Clocked in at ${new Date().toLocaleTimeString()}`);
      fetchTodayAttendance();
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail?.error === 'feature_not_available') {
        Alert.alert('Upgrade Required', detail.message);
      } else {
        Alert.alert('Error', detail || 'Failed to clock in');
      }
    } finally {
      setLoading(false);
    }
  };

  const clockOut = async () => {
    setLoading(true);
    try {
      const response = await api.post('/attendance/clock-out');
      Alert.alert('Success', `Clocked out. Worked ${response.data.work_hours} hours`);
      fetchTodayAttendance();
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail?.error === 'feature_not_available') {
        Alert.alert('Upgrade Required', detail.message);
      } else {
        Alert.alert('Error', detail || 'Failed to clock out');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#71717a';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Today's Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Today's Attendance</Text>
        
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Clock In</Text>
            <Text style={styles.timeValue}>{formatTime(attendance?.clock_in)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Clock Out</Text>
            <Text style={styles.timeValue}>{formatTime(attendance?.clock_out)}</Text>
          </View>
        </View>

        {attendance?.status && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(attendance.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(attendance.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(attendance.status) }]}>
              {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Clock In/Out Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.clockButton, styles.clockInButton, (attendance?.clock_in || loading) && styles.buttonDisabled]}
          onPress={clockIn}
          disabled={!!attendance?.clock_in || loading}
        >
          <Text style={styles.buttonIcon}>📍</Text>
          <Text style={styles.buttonText}>Clock In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.clockButton, styles.clockOutButton, (!attendance?.clock_in || attendance?.clock_out || loading) && styles.buttonDisabled]}
          onPress={clockOut}
          disabled={!attendance?.clock_in || !!attendance?.clock_out || loading}
        >
          <Text style={styles.buttonIcon}>🏠</Text>
          <Text style={styles.buttonText}>Clock Out</Text>
        </TouchableOpacity>
      </View>

      {/* Work Hours */}
      {attendance?.work_hours > 0 && (
        <View style={styles.hoursCard}>
          <Text style={styles.hoursValue}>{attendance.work_hours.toFixed(2)}</Text>
          <Text style={styles.hoursLabel}>Hours Worked Today</Text>
          {attendance.overtime > 0 && (
            <Text style={styles.overtimeText}>+{attendance.overtime.toFixed(2)}h overtime</Text>
          )}
        </View>
      )}

      {/* History */}
      <Text style={styles.sectionTitle}>Recent History</Text>
      <View style={styles.historyList}>
        {history.map((record, index) => (
          <View key={index} style={styles.historyItem}>
            <View>
              <Text style={styles.historyDate}>
                {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.historyTime}>
                {formatTime(record.clock_in)} - {formatTime(record.clock_out)}
              </Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={styles.historyHours}>{record.work_hours?.toFixed(1) || 0}h</Text>
              <View style={[styles.historyStatusDot, { backgroundColor: getStatusColor(record.status) }]} />
            </View>
          </View>
        ))}
        {history.length === 0 && (
          <Text style={styles.emptyText}>No attendance records yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    padding: 24,
  },
  statusCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fafafa',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#3f3f46',
  },
  timeLabel: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fafafa',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 16,
    alignSelf: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  clockButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  clockInButton: {
    backgroundColor: '#10b981',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hoursCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  hoursValue: {
    fontSize: 48,
    fontWeight: '200',
    color: '#10b981',
  },
  hoursLabel: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 4,
  },
  overtimeText: {
    fontSize: 14,
    color: '#f59e0b',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fafafa',
    marginTop: 32,
    marginBottom: 16,
  },
  historyList: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fafafa',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#71717a',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyHours: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fafafa',
    marginBottom: 4,
  },
  historyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#52525b',
    textAlign: 'center',
    padding: 24,
  },
});
