import 'dart:convert';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/connectivity/connectivity_manager.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

/// My Trainings — shows both group trainings and individual farm visits.
///
/// EKIBBO: "Farmers should be able to see information from group trainings
/// and individual visits."
///
/// Two tabs:
///   1. Group Trainings — attended sessions with topic, date, attendance status
///   2. Farm Visits — individual visits by extension officers
class MyTrainingsPage extends StatefulWidget {
  const MyTrainingsPage({super.key});

  @override
  State<MyTrainingsPage> createState() => _MyTrainingsPageState();
}

class _MyTrainingsPageState extends State<MyTrainingsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _trainings = [];
  List<dynamic> _visits = [];
  bool _loadingTrainings = true;
  bool _loadingVisits = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadTrainings();
    _loadVisits();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTrainings() async {
    try {
      final connectivity = context.read<ConnectivityManager>();
      if (connectivity.isOnline) {
        final res = await ApiClient().get('/api/trainings');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          setState(() {
            _trainings = data['trainings'] ?? data ?? [];
            _loadingTrainings = false;
          });
          return;
        }
      }
      // Offline: read from local cache
      final repo = context.read<OfflineRepository>();
      final trainings = await repo.getTrainings();
      setState(() { _trainings = trainings; _loadingTrainings = false; });
    } catch (_) {
      // Fallback to cache
      try {
        final repo = context.read<OfflineRepository>();
        final trainings = await repo.getTrainings();
        setState(() { _trainings = trainings; _loadingTrainings = false; });
      } catch (_) {
        setState(() => _loadingTrainings = false);
      }
    }
  }

  Future<void> _loadVisits() async {
    try {
      final res = await ApiClient().get('/api/farm-visits');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _visits = data['visits'] ?? data ?? [];
          _loadingVisits = false;
        });
      } else {
        setState(() => _loadingVisits = false);
      }
    } catch (_) {
      setState(() => _loadingVisits = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Trainings'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: const [SyncStatusWidget(), SizedBox(width: 12)],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.school, size: 18), text: 'Group Trainings'),
            Tab(icon: Icon(Icons.visibility, size: 18), text: 'Farm Visits'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTrainingsTab(),
          _buildVisitsTab(),
        ],
      ),
    );
  }

  // ─── Group Trainings Tab ───
  Widget _buildTrainingsTab() {
    if (_loadingTrainings) return const LoadingShimmer();

    if (_trainings.isEmpty) {
      return const EmptyState(
        icon: Icons.school_outlined,
        title: 'No Group Trainings Yet',
        description: 'Your attended group training sessions will appear here.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTrainings,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _trainings.length,
        itemBuilder: (context, index) {
          final t = _trainings[index] as Map<String, dynamic>;
          final topic = t['topic'] ?? 'Training';
          final date = _formatDate(t['date'] ?? t['createdAt']);
          final location = t['location'] ?? 'N/A';
          final trainer = t['trainerName'] ?? 'N/A';
          final attendance = t['attendance'] as List<dynamic>? ?? [];
          final attended = attendance.any((a) =>
              (a as Map<String, dynamic>)['attended'] == true);

          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ExpansionTile(
              leading: CircleAvatar(
                backgroundColor: attended ? Colors.green[50] : Colors.orange[50],
                child: Icon(
                  attended ? Icons.check_circle : Icons.schedule,
                  color: attended ? Colors.green : Colors.orange,
                  size: 20,
                ),
              ),
              title: Text(topic, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('$date · $location', style: const TextStyle(fontSize: 12)),
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Trainer', trainer),
                      _buildDetailRow('Date', date),
                      _buildDetailRow('Location', location),
                      _buildDetailRow('Attendance', attended ? 'Attended' : 'Absent'),
                      if (t['description'] != null)
                        _buildDetailRow('Notes', t['description']),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ─── Farm Visits Tab ───
  Widget _buildVisitsTab() {
    if (_loadingVisits) return const LoadingShimmer();

    if (_visits.isEmpty) {
      return const EmptyState(
        icon: Icons.visibility_outlined,
        title: 'No Farm Visits Yet',
        description: 'Individual visits by extension officers will appear here.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadVisits,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _visits.length,
        itemBuilder: (context, index) {
          final v = _visits[index] as Map<String, dynamic>;
          final topic = v['topic'] ?? 'Farm Visit';
          final date = _formatDate(v['visitDate'] ?? v['createdAt']);
          final status = v['status'] ?? 'SCHEDULED';
          final observations = v['observations'] ?? '';
          final recommendations = v['recommendations'] ?? '';

          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ExpansionTile(
              leading: CircleAvatar(
                backgroundColor: status == 'COMPLETED'
                    ? Colors.green[50]
                    : status == 'SCHEDULED'
                        ? Colors.blue[50]
                        : Colors.grey[50],
                child: Icon(
                  status == 'COMPLETED' ? Icons.check_circle : Icons.schedule,
                  color: status == 'COMPLETED'
                      ? Colors.green
                      : status == 'SCHEDULED'
                          ? Colors.blue
                          : Colors.grey,
                  size: 20,
                ),
              ),
              title: Text(topic, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('$date · $status', style: const TextStyle(fontSize: 12)),
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Date', date),
                      _buildDetailRow('Status', status),
                      if (observations.isNotEmpty)
                        _buildDetailRow('Observations', observations),
                      if (recommendations.isNotEmpty)
                        _buildDetailRow('Recommendations', recommendations),
                      if (v['followUpDate'] != null)
                        _buildDetailRow('Follow-up', _formatDate(v['followUpDate'])),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 13, color: Colors.black87)),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final d = DateTime.parse(dateStr.toString());
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return dateStr.toString();
    }
  }
}
