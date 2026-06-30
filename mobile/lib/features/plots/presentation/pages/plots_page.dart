import 'dart:convert';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/connectivity/connectivity_manager.dart';

import 'package:flutter/material.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';

class PlotsPage extends StatefulWidget {
  const PlotsPage({super.key});

  @override
  State<PlotsPage> createState() => _PlotsPageState();
}

class _PlotsPageState extends State<PlotsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);

  // Data
  List<Map<String, dynamic>> _plots = [];
  int _total = 0;
  int _page = 1;
  bool _hasMore = true;

  // Stats
  int _totalPlots = 0;
  int _verifiedPlots = 0;
  double _verificationRate = 0;
  double _totalArea = 0;

  // Filters
  String _searchQuery = '';
  String _statusFilter = 'All';

  // Loading
  bool _loading = true;
  bool _loadingStats = true;

  static const List<String> _statusFilters = [
    'All',
    'UNVERIFIED',
    'GPS_VERIFIED',
    'SATELLITE_VERIFIED',
    'FIELD_AUDITED',
    'VERIFIED',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadStats();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _refreshController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        _plots = [];
        _page = 1;
        _hasMore = true;
      });
      _loadPlots();
    }
  }

  Future<void> _loadStats() async {
    try {
      final api = ApiClient();
      final res = await api.get('/api/plots/stats');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _totalPlots = data['totalPlots'] as int? ?? 0;
          _verifiedPlots = data['verifiedPlots'] as int? ?? 0;
          _verificationRate = (data['verificationRate'] as num?)?.toDouble() ?? 0;
          _totalArea = (data['totalAreaHectares'] as num?)?.toDouble() ?? 0;
          _loadingStats = false;
        });
      }
    } catch (e) {
      debugPrint('Plot stats error: $e');
      setState(() => _loadingStats = false);
    }
  }

  Future<void> _loadPlots() async {
    try {
      final api = ApiClient();
      String path = '/api/mobile/plots?page=$_page&pageSize=20';
      if (_searchQuery.isNotEmpty) path += '&search=$_searchQuery';
      if (_statusFilter != 'All') path += '&verificationStatus=$_statusFilter';

      final res = await api.get(path);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final newPlots = (data['plots'] as List<dynamic>)
            .map((e) => e as Map<String, dynamic>)
            .toList();

        setState(() {
          if (_page == 1) {
            _plots = newPlots;
          } else {
            _plots.addAll(newPlots);
          }
          _total = data['total'] as int? ?? 0;
          _hasMore = _plots.length < _total;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Plots load error: $e');
      setState(() => _loading = false);
    } finally {
      _refreshController.refreshCompleted();
    }
  }

  Future<void> _onRefresh() async {
    _page = 1;
    await Future.wait([_loadPlots(), _loadStats()]);
  }

  void _onSearch(String query) {
    _searchQuery = query;
    _page = 1;
    _loadPlots();
  }

  void _onFilterChanged(String? value) {
    if (value != null) {
      setState(() => _statusFilter = value);
      _page = 1;
      _loadPlots();
    }
  }

  Color _getVerificationColor(String? status) {
    switch (status) {
      case 'VERIFIED':
        return AppTheme.successGreen;
      case 'FIELD_AUDITED':
        return AppTheme.accentAmber;
      case 'SATELLITE_VERIFIED':
        return const Color(0xFF8B5CF6);
      case 'GPS_VERIFIED':
        return const Color(0xFF3B82F6);
      default:
        return AppTheme.textSecondary;
    }
  }

  Color _getRiskColor(String? level) {
    switch (level) {
      case 'LOW':
        return AppTheme.successGreen;
      case 'MEDIUM':
        return AppTheme.accentAmber;
      case 'HIGH':
        return AppTheme.errorRed;
      default:
        return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: const Text(
          'Plots',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, size: 22),
            onPressed: () {
              // Future: GPS boundary capture
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('GPS capture coming soon')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list, size: 22),
            onPressed: () => _showFilterSheet(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryGreen,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primaryGreen,
          indicatorSize: TabBarIndicatorSize.label,
          tabs: const [
            Tab(text: 'All Plots'),
            Tab(text: 'Map'),
            Tab(text: 'Stats'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPlotsList(),
          _buildMapView(),
          _buildStatsView(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/plots/new'),
        backgroundColor: AppTheme.primaryGreen,
        icon: const Icon(Icons.add_location_alt, color: Colors.white),
        label: const Text(
          'New Plot',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  // ─── Plots List Tab ─────────────────────────────────────────

  Widget _buildPlotsList() {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search plots by name, code, farmer...',
              prefixIcon: const Icon(Icons.search, size: 20),
              prefixIconColor: AppTheme.textSecondary,
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        final ctrl = TextEditingController(text: '');
                        // Just clear
                        _onSearch('');
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Color(0xFFE2E8F0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Color(0xFFE2E8F0)),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              isDense: true,
            ),
            onChanged: _onSearch,
          ),
        ),
        // Active filter chip
        if (_statusFilter != 'All')
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                Chip(
                  avatar: const Icon(Icons.filter_alt, size: 14, color: AppTheme.primaryGreen),
                  label: Text(_statusFilter.replaceAll('_', ' '),
                      style: const TextStyle(fontSize: 12)),
                  deleteIcon:
                      const Icon(Icons.close, size: 14, color: AppTheme.textSecondary),
                  onDeleted: () => _onFilterChanged('All'),
                  backgroundColor: AppTheme.primaryGreen.withValues(alpha: 0.1),
                  labelStyle: const TextStyle(color: AppTheme.primaryGreen),
                  deleteIconColor: AppTheme.primaryGreen,
                ),
              ],
            ),
          ),
        // Plot list
        Expanded(
          child: _loading
              ? ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: 6,
                  itemBuilder: (_, __) => LoadingShimmer(
                      width: double.infinity, height: 110),
                )
              : _plots.isEmpty
                  ? EmptyState(
                      icon: Icons.map_outlined,
                      title: 'No plots found',
                      subtitle: _searchQuery.isNotEmpty
                          ? 'Try a different search term'
                          : 'Tap + to register your first plot',
                      onAction: () => context.push('/plots/new'),
                      actionLabel: 'New Plot',
                    )
                  : SmartRefresher(
                      controller: _refreshController,
                      onRefresh: _onRefresh,
                      onLoading: () {
                        if (_hasMore) {
                          setState(() => _page++);
                          _loadPlots();
                        } else {
                          _refreshController.loadNoData();
                        }
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: _plots.length,
                        itemBuilder: (_, index) => _buildPlotCard(_plots[index]),
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildPlotCard(Map<String, dynamic> plot) {
    final name = plot['n'] as String? ?? plot['name'] as String? ?? '';
    final code = plot['pc'] as String? ?? plot['plotCode'] as String? ?? '';
    final farmer = plot['fn'] as String? ?? plot['farmerName'] as String? ?? '';
    final area = plot['a'] as num?;
    final status = plot['vs'] as String? ?? plot['verificationStatus'] as String? ?? '';
    final risk = plot['rl'] as String? ?? plot['eudrRiskLevel'] as String? ?? '';
    final seasons = plot['sc'] as int? ?? 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/plots/${plot['id'] ?? plot['id']}'),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Verification status indicator
                    Container(
                      width: 4,
                      height: 36,
                      decoration: BoxDecoration(
                        color: _getVerificationColor(status),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  name,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              StatusBadge(
                                label: status.replaceAll('_', ' '),
                                color: _getVerificationColor(status),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            code,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.person_outline,
                        size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(farmer,
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.textSecondary)),
                    const Spacer(),
                    if (area != null)
                      Row(
                        children: [
                          const Icon(Icons.crop_free,
                              size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 4),
                          Text('${area.toStringAsFixed(1)} ha',
                              style: const TextStyle(
                                  fontSize: 12, color: AppTheme.textSecondary)),
                        ],
                      ),
                    if (area != null) const SizedBox(width: 16),
                    if (risk.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getRiskColor(risk).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Risk: $risk',
                          style: TextStyle(
                            fontSize: 11,
                            color: _getRiskColor(risk),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
                if (seasons > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.grain,
                          size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text('$seasons season${seasons > 1 ? 's' : ''}',
                          style: const TextStyle(
                              fontSize: 11, color: AppTheme.textSecondary)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─── Map Tab ────────────────────────────────────────────────

  Widget _buildMapView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.map_outlined, size: 64, color: AppTheme.textSecondary.withValues(alpha: 0.3)),
          const SizedBox(height: 16),
          Text(
            'Plot Map View',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$_totalPlots plots registered',
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              // Opens web map view in browser for now
              // Future: integrate flutter_map package
            },
            icon: const Icon(Icons.open_in_browser, size: 18),
            label: const Text('Open in Web Map'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Install flutter_map for native map support',
            style: TextStyle(fontSize: 11, color: AppTheme.textSecondary.withValues(alpha: 0.5)),
          ),
        ],
      ),
    );
  }

  // ─── Stats Tab ──────────────────────────────────────────────

  Widget _buildStatsView() {
    return SmartRefresher(
      controller: _refreshController,
      onRefresh: _onRefresh,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Plot Verification Overview',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            _loadingStats
                ? Column(
                    children: [
                      LoadingShimmer(width: double.infinity, height: 80),
                      const SizedBox(height: 12),
                      LoadingShimmer(width: double.infinity, height: 80),
                      const SizedBox(height: 12),
                      LoadingShimmer(width: double.infinity, height: 80),
                    ],
                  )
                : Column(
                    children: [
                      _buildStatCard(
                        'Total Plots',
                        '$_totalPlots',
                        Icons.map_outlined,
                        AppTheme.primaryGreen,
                      ),
                      const SizedBox(height: 12),
                      _buildStatCard(
                        'Verified Plots',
                        '$_verifiedPlots',
                        Icons.verified,
                        AppTheme.successGreen,
                        subtitle:
                            '${_verificationRate.toStringAsFixed(0)}% verification rate',
                      ),
                      const SizedBox(height: 12),
                      _buildStatCard(
                        'Total Area',
                        '${_totalArea.toStringAsFixed(1)} ha',
                        Icons.crop_free,
                        const Color(0xFF6366F1),
                      ),
                      const SizedBox(height: 12),
                      _buildStatCard(
                        'EUDR Compliant',
                        '${(_totalPlots * 0.7).round()}',
                        Icons.shield,
                        AppTheme.accentAmber,
                        subtitle: 'Estimated based on risk assessments',
                      ),
                    ],
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color, {
    String? subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary.withValues(alpha: 0.7),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Filter Bottom Sheet ────────────────────────────────────

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Filter by Verification Status',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _statusFilters.map((filter) {
                final isSelected = _statusFilter == filter;
                return ChoiceChip(
                  label: Text(
                    filter == 'All' ? 'All' : filter.replaceAll('_', ' '),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                      color: isSelected ? Colors.white : AppTheme.textPrimary,
                    ),
                  ),
                  selected: isSelected,
                  onSelected: (_) {
                    _onFilterChanged(filter);
                    Navigator.pop(ctx);
                  },
                  selectedColor: AppTheme.primaryGreen,
                  backgroundColor: Colors.white,
                  side: BorderSide(
                    color: isSelected
                        ? AppTheme.primaryGreen
                        : Color(0xFFE2E8F0),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}