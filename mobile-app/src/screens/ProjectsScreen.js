import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../App';

export default function ProjectsScreen() {
  const { api } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'on_hold': return '#f59e0b';
      default: return '#71717a';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor="#10b981" />}
    >
      {projects.map((project, index) => (
        <TouchableOpacity key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.projectName}>{project.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
          </View>
          {project.description && (
            <Text style={styles.description} numberOfLines={2}>{project.description}</Text>
          )}
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>Budget: ${project.budget || 0}</Text>
            <Text style={styles.footerText}>{project.members?.length || 0} members</Text>
          </View>
        </TouchableOpacity>
      ))}
      {projects.length === 0 && !loading && (
        <Text style={styles.emptyText}>No projects found</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', padding: 16 },
  card: { backgroundColor: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  projectName: { fontSize: 16, fontWeight: '600', color: '#fafafa', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  description: { fontSize: 14, color: '#71717a', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: '#52525b' },
  emptyText: { fontSize: 14, color: '#52525b', textAlign: 'center', marginTop: 48 },
});
