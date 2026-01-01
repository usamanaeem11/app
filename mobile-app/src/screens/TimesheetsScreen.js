import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../App';

export default function TimesheetsScreen() {
  const { api } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchTimesheets(); }, []);

  const fetchTimesheets = async () => {
    try {
      const response = await api.get('/timesheets');
      setTimesheets(response.data || []);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#71717a';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTimesheets(); }} tintColor="#10b981" />}
    >
      {timesheets.map((ts, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.weekText}>{ts.week_start?.split('T')[0]} - {ts.week_end?.split('T')[0]}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ts.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(ts.status) }]}>{ts.status}</Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(ts.total_hours || 0).toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(ts.billable_hours || 0).toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Billable</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{ts.entries_count || 0}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
          </View>
        </View>
      ))}
      {timesheets.length === 0 && !loading && (
        <Text style={styles.emptyText}>No timesheets found</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 16 },
  card: { backgroundColor: '#18181b', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  weekText: { fontSize: 14, fontWeight: '600', color: '#fafafa' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  cardBody: { flexDirection: 'row', padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600', color: '#fafafa' },
  statLabel: { fontSize: 12, color: '#71717a', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#52525b', textAlign: 'center', marginTop: 48 },
});
