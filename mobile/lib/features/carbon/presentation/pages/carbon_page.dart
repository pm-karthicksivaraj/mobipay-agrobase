import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../shared/widgets/kpi_card.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';

class CarbonPage extends StatefulWidget {
  const CarbonPage({super.key});

  @override
  State<CarbonPage> createState() => _CarbonPageState();
}

class _CarbonPageState extends State<CarbonPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  int _currentTab = 0;

  List<dynamic> _credits = [];
  List<dynamic> _footprints = [];
  Map<String, dynamic>? _portfolioSummary;

  String _creditsFilter = '';
  double? _totalFootprint;

  bool _loading = true;
  bool _creditsLoading = false;
  bool _footprintLoading = false;
  String _error = '';

  int _creditsPage = 1;
  int _creditsTotal = 0;
  bool _creditsHasMore = false;

  static const List<String> _tabs = ['Overview', 'Credits', 'Footprint', 'Projects'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(_onTabChanged);
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
      setState(() => _currentTab = _tabController.index);
    }
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  Future<void> _loadData() async {
    try {
      await Future.wait([
        _loadPortfolio(),
        _loadCredits(reset: true),
        _loadFootprint(),
      ]);
      _error = '';
    } catch (e) {
      debugPrint('Carbon load error: $e');
      setState(() => _error = 'Failed to load carbon data');
    } finally {
      _loading = false;
      _refreshController.refreshCompleted();
    }
  }

  Future<void> _loadPortfolio() async {
    try {
      final api = ApiClient();
      final res = await api.get('/api/carbon/portfolio');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() => _portfolioSummary =
            data is Map<String, dynamic> ? data : null);
      }
    } catch (e) {
      debugPrint('Portfolio load error: $e');
    }
  }

  Future<void> _loadCredits({bool reset = false}) async {
    setState(() {
      if (reset) {
        _creditsPage = 1;
        _credits.clear();
      }
      _creditsLoading = true;
    });

    try {
      final api = ApiClient();
      String url = '/api/carbon/credits?page=$_creditsPage&pageSize=20';
      if (_creditsFilter.isNotEmpty) {
        url += '&status=$_creditsFilter';
      }
      final res = await api.get(url);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final items = List<dynamic>.from(data['data'] ?? []);
        final total = data['total'] as int? ?? 0;
        setState(() {
          _credits.addAll(items);
          _creditsTotal = total;
          _creditsHasMore = _credits.length < total;
          _creditsPage++;
        });
      }
    } catch (e) {
      debugPrint('Credits load error: $e');
    } finally {
      setState(() => _creditsLoading = false);
      _refreshController.loadComplete();
    }
  }

  Future<void> _loadFootprint() async {
    setState(() => _footprintLoading = true);
    try {
      final api = ApiClient();
      final res = await api.get('/api/carbon/footprint');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final items = List<dynamic>.from(data['data'] ?? []);
        double total = 0;
        for (final item in items) {
          total += (item['value'] as num?)?.toDouble() ?? 0;
        }
        setState(() {
          _footprints = items;
          _totalFootprint = total;
        });
      }
    } catch (e) {
      debugPrint('Footprint load error: $e');
    } finally {
      setState(() => _footprintLoading = false);
    }
  }

  // ---------------------------------------------------------------------------
  // Date helper
  // ---------------------------------------------------------------------------

  String _formatDateStr(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final dt = DateTime.parse(dateStr);
      return formatDate(dt);
    } catch (_) {
      return dateStr;
    }
  }

  String _formatRelativeTimeStr(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final dt = DateTime.parse(dateStr);
      return formatRelativeTime(dt);
    } catch (_) {
      return dateStr;
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.eco, color: AppTheme.primaryGreen, size: 24),
            const SizedBox(width: 10),
            const Text(
              'Carbon Credits',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
            ),
          ],
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
      ),
      floatingActionButton: _currentTab == 2
          ? FloatingActionButton.extended(
              onPressed: () => _showRecordFootprintSheet(context),
              backgroundColor: AppTheme.primaryGreen,
              icon: const Icon(Icons.add_circle_outline, color: Colors.white),
              label: const Text(
                'Record Footprint',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            )
          : null,
      body: Column(
        children: [
          _buildTabBar(),
          Expanded(
            child: _loading
                ? _buildShimmerForTab()
                : _error.isNotEmpty
                    ? EmptyState(
                        icon: Icons.error_outline,
                        title: 'Error',
                        subtitle: _error,
                        onRetry: _loadData,
                      )
                    : _buildCurrentTab(),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: Colors.white,
        unselectedLabelColor: AppTheme.textSecondary,
        indicator: BoxDecoration(
          color: AppTheme.primaryGreen,
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
        padding: const EdgeInsets.all(4),
        tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentTab) {
      case 0:
        return _buildOverviewTab();
      case 1:
        return _buildCreditsTab();
      case 2:
        return _buildFootprintTab();
      case 3:
        return _buildProjectsTab();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildShimmerForTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: LoadingShimmer(itemCount: 5),
    );
  }

  // ===========================================================================
  // Tab 1: Overview
  // ===========================================================================

  Widget _buildOverviewTab() {
    return SmartRefresher(
      controller: _refreshController,
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // KPI cards 2x2
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.15,
            children: [
              KpiCard(
                title: 'Total Credits',
                value: '${_portfolioSummary?['totalCredits'] ?? _credits.length} tCO2e',
                icon: Icons.co2,
                color: AppTheme.primaryGreen,
              ),
              KpiCard(
                title: 'Portfolio Value',
                value: formatCurrency(
                  (_portfolioSummary?['portfolioValue'] ?? 0).toDouble(),
                ),
                icon: Icons.attach_money,
                color: Colors.blue,
              ),
              KpiCard(
                title: 'Verified',
                value: '${_portfolioSummary?['verified'] ?? _countByStatus('VERIFIED')}',
                icon: Icons.verified,
                color: AppTheme.successGreen,
              ),
              KpiCard(
                title: 'Pending',
                value: '${_portfolioSummary?['pending'] ?? _countByStatus('PENDING')}',
                icon: Icons.hourglass_empty,
                color: AppTheme.accentAmber,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Pie chart section
          _buildPieChartSection(),
          const SizedBox(height: 20),

          // Recent credits section
          _buildRecentCreditsSection(),
        ],
      ),
    );
  }

  int _countByStatus(String status) {
    return _credits.where((c) {
      final s = (c['status'] as String? ?? '').toUpperCase();
      return s == status;
    }).length;
  }

  Widget _buildPieChartSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Credit Distribution',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          if (_credits.isEmpty)
            const Center(
              child: Text(
                'No credits data available',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
              ),
            )
          else
            Row(
              children: [
                SizedBox(
                  width: 180,
                  height: 180,
                  child: _buildPieChart(),
                ),
                const SizedBox(width: 16),
                Expanded(child: _buildPieLegend()),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildPieChart() {
    final statusCounts = <String, int>{};
    for (final c in _credits) {
      final status = (c['status'] as String? ?? 'UNKNOWN').toUpperCase();
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    if (statusCounts.isEmpty) return const SizedBox.shrink();

    final colors = <String, Color>{
      'VERIFIED': AppTheme.successGreen,
      'PENDING': AppTheme.accentAmber,
      'REJECTED': AppTheme.errorRed,
      'RETIRED': Colors.blue,
      'ISSUED': const Color(0xFF6366F1),
    };

    return PieChart(
      PieChartData(
        sections: statusCounts.entries.map((e) {
          return PieChartSectionData(
            value: e.value.toDouble(),
            color: colors[e.key] ?? Colors.grey,
            title: '${e.value}',
            radius: 60,
            titleStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          );
        }).toList(),
        sectionsSpace: 2,
        centerSpaceRadius: 40,
      ),
    );
  }

  Widget _buildPieLegend() {
    final statusCounts = <String, int>{};
    for (final c in _credits) {
      final status = (c['status'] as String? ?? 'UNKNOWN').toUpperCase();
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    final colors = <String, Color>{
      'VERIFIED': AppTheme.successGreen,
      'PENDING': AppTheme.accentAmber,
      'REJECTED': AppTheme.errorRed,
      'RETIRED': Colors.blue,
      'ISSUED': const Color(0xFF6366F1),
    };

    final labels = <String, String>{
      'VERIFIED': 'Verified',
      'PENDING': 'Pending',
      'REJECTED': 'Rejected',
      'RETIRED': 'Retired',
      'ISSUED': 'Issued',
    };

    final total = statusCounts.values.fold(0, (a, b) => a + b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: statusCounts.entries.map((e) {
        final color = colors[e.key] ?? Colors.grey;
        final label = labels[e.key] ?? e.key;
        final pct = total > 0 ? ((e.value / total) * 100).toStringAsFixed(0) : '0';
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
              Text(
                '$pct%',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRecentCreditsSection() {
    final recent = _credits.length > 8
        ? _credits.sublist(0, 8)
        : _credits;

    if (recent.isEmpty) {
      return const EmptyState(
        icon: Icons.eco_outlined,
        title: 'No credits yet',
        subtitle: 'Carbon credit entries will appear here',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent Credits',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        ...recent.map((credit) => _buildRecentCreditItem(credit)),
      ],
    );
  }

  Widget _buildRecentCreditItem(Map<String, dynamic> credit) {
    final projectName = credit['projectName'] as String? ?? 'Unknown Project';
    final vintage = credit['vintageYear'] as int? ?? 0;
    final quantity = (credit['quantity'] as num?)?.toDouble() ?? 0;
    final status = credit['status'] as String? ?? 'PENDING';
    final createdAt = credit['createdAt'] as String?;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppTheme.lightGreen,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.eco,
                color: AppTheme.primaryGreen,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    projectName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (vintage > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceLight,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '$vintage',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      const SizedBox(width: 6),
                      Text(
                        '${quantity.toStringAsFixed(1)} tCO2e',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      if (createdAt != null) ...[
                        const SizedBox(width: 6),
                        Text(
                          _formatRelativeTimeStr(createdAt),
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            StatusBadge(status: status),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Tab 2: Credits
  // ===========================================================================

  static const List<Map<String, String>> _creditFilters = [
    {'label': 'All', 'value': ''},
    {'label': 'Verified', 'value': 'VERIFIED'},
    {'label': 'Pending', 'value': 'PENDING'},
    {'label': 'Issued', 'value': 'ISSUED'},
    {'label': 'Retired', 'value': 'RETIRED'},
  ];

  Widget _buildCreditsTab() {
    return Column(
      children: [
        // Filter chips
        _buildFilterChips(),
        Expanded(
          child: _creditsLoading && _credits.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(16),
                  child: LoadingShimmer(itemCount: 5),
                )
              : _credits.isEmpty
                  ? const EmptyState(
                      icon: Icons.eco_outlined,
                      title: 'No credits found',
                      subtitle: 'There are no credits matching this filter',
                    )
                  : SmartRefresher(
                      controller: _refreshController,
                      enablePullUp: _creditsHasMore,
                      onRefresh: () async {
                        await _loadCredits(reset: true);
                        _refreshController.refreshCompleted();
                      },
                      onLoading: _loadCredits,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        itemCount: _credits.length,
                        itemBuilder: (context, index) {
                          return _buildCreditCard(_credits[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _creditFilters.map((filter) {
            final isActive = _creditsFilter == filter['value'];
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    setState(() => _creditsFilter = filter['value']!);
                    _loadCredits(reset: true);
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppTheme.primaryGreen
                          : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive
                            ? AppTheme.primaryGreen
                            : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Text(
                      filter['label']!,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isActive ? Colors.white : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCreditCard(Map<String, dynamic> credit) {
    final projectName = credit['projectName'] as String? ?? 'Unknown Project';
    final vintage = credit['vintageYear'] as int? ?? 0;
    final quantity = (credit['quantity'] as num?)?.toDouble() ?? 0;
    final status = credit['status'] as String? ?? 'PENDING';
    final methodology = credit['methodology'] as String? ?? '';
    final issuedDate = credit['issuedDate'] as String? ?? credit['createdAt'] as String?;
    final value = (credit['value'] as num?)?.toDouble();

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row: project name + status
            Row(
              children: [
                Expanded(
                  child: Text(
                    projectName,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 10),

            // Vintage year badge + quantity
            Row(
              children: [
                if (vintage > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.lightGreen,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Vintage $vintage',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.darkGreen,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                Text(
                  '${quantity.toStringAsFixed(1)} tCO2e',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primaryGreen,
                  ),
                ),
                if (value != null && value > 0) ...[
                  const Spacer(),
                  Text(
                    formatCurrency(value),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ],
            ),

            // Methodology + issuance date
            if (methodology.isNotEmpty || issuedDate != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  if (methodology.isNotEmpty)
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(
                            Icons.science_outlined,
                            size: 14,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              methodology,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (issuedDate != null) ...[
                    if (methodology.isNotEmpty) const SizedBox(width: 12),
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 13,
                          color: AppTheme.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatDateStr(issuedDate),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Tab 3: Footprint
  // ===========================================================================

  Widget _buildFootprintTab() {
    return SmartRefresher(
      controller: _refreshController,
      onRefresh: () async {
        await _loadFootprint();
        _refreshController.refreshCompleted();
      },
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // Total footprint KPI card with gradient
          _buildTotalFootprintCard(),
          const SizedBox(height: 16),

          // Footprint history header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Footprint History',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                '${_footprints.length} records',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Footprint entries
          if (_footprints.isEmpty)
            const EmptyState(
              icon: Icons.track_changes_outlined,
              title: 'No footprint records',
              subtitle: 'Tap the button below to record your first footprint entry',
            )
          else
            ..._footprints.map((fp) => _buildFootprintItem(fp)),
        ],
      ),
    );
  }

  Widget _buildTotalFootprintCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.darkGreen,
            AppTheme.primaryGreen,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.co2,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Total Carbon Footprint',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '${(_totalFootprint ?? 0).toStringAsFixed(1)} tCO2e',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Across ${_footprints.length} recorded activities',
            style: const TextStyle(
              fontSize: 13,
              color: Colors.white60,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFootprintItem(Map<String, dynamic> footprint) {
    final activityType = footprint['activityType'] as String? ?? 'Other';
    final value = (footprint['value'] as num?)?.toDouble() ?? 0;
    final date = footprint['date'] as String? ?? footprint['createdAt'] as String?;
    final notes = footprint['notes'] as String? ?? '';

    final activityMeta = _activityTypeMeta(activityType);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: activityMeta.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                activityMeta.icon,
                color: activityMeta.color,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activityType,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  if (notes.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      notes,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (date != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      _formatDateStr(date),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${value.toStringAsFixed(2)} tCO2e',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: activityMeta.color,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  _ActivityMeta _activityTypeMeta(String type) {
    switch (type.toLowerCase()) {
      case 'transport':
        return _ActivityMeta(
          icon: Icons.directions_car,
          color: const Color(0xFF3B82F6),
        );
      case 'electricity':
        return _ActivityMeta(
          icon: Icons.bolt,
          color: AppTheme.accentAmber,
        );
      case 'fuel':
        return _ActivityMeta(
          icon: Icons.local_fire_department,
          color: AppTheme.errorRed,
        );
      case 'processing':
        return _ActivityMeta(
          icon: Icons.precision_manufacturing,
          color: const Color(0xFF8B5CF6),
        );
      default:
        return _ActivityMeta(
          icon: Icons.category,
          color: AppTheme.textSecondary,
        );
    }
  }

  // ===========================================================================
  // Tab 4: Projects (grouped from credits)
  // ===========================================================================

  Widget _buildProjectsTab() {
    final projects = _groupCreditsByProject();

    return SmartRefresher(
      controller: _refreshController,
      onRefresh: _loadData,
      child: projects.isEmpty
          ? const EmptyState(
              icon: Icons.eco_outlined,
              title: 'No projects found',
              subtitle: 'Projects will appear as credits are added',
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: projects.length,
              itemBuilder: (context, index) {
                return _buildProjectCard(projects[index]);
              },
            ),
    );
  }

  List<Map<String, dynamic>> _groupCreditsByProject() {
    final Map<String, List<Map<String, dynamic>>> grouped = {};
    for (final c in _credits) {
      final name = c['projectName'] as String? ?? 'Unknown Project';
      grouped.putIfAbsent(name, () => []).add(c as Map<String, dynamic>);
    }

    return grouped.entries.map((entry) {
      final credits = entry.value;
      double totalQty = 0;
      String? methodology;
      String? location;
      String? startDate;
      String? endDate;
      String? latestStatus;
      String? latestStatusStr;

      for (final credit in credits) {
        totalQty += (credit['quantity'] as num?)?.toDouble() ?? 0;
        methodology = methodology ?? credit['methodology'] as String?;
        location = location ?? credit['location'] as String?;
        startDate = startDate ?? credit['startDate'] as String?;
        endDate = endDate ?? credit['endDate'] as String?;
        // Determine project status from most recent credit
        if (latestStatusStr == null) {
          latestStatusStr = credit['status'] as String?;
        }
      }

      // Determine overall project status
      final statuses = credits
          .map((c) => (c['status'] as String? ?? '').toUpperCase())
          .toSet();
      String projectStatus = 'ACTIVE';
      if (statuses.contains('VERIFIED') && statuses.length == 1) {
        projectStatus = 'ACTIVE';
      } else if (statuses.contains('PENDING')) {
        projectStatus = 'REGISTERED';
      } else if (statuses.every((s) => s == 'RETIRED')) {
        projectStatus = 'COMPLETED';
      }

      return <String, dynamic>{
        'projectName': entry.key,
        'totalCredits': totalQty,
        'creditCount': credits.length,
        'methodology': methodology,
        'location': location,
        'startDate': startDate,
        'endDate': endDate,
        'status': projectStatus,
      };
    }).toList();
  }

  Widget _buildProjectCard(Map<String, dynamic> project) {
    final name = project['projectName'] as String? ?? 'Unknown Project';
    final totalCredits = (project['totalCredits'] as num?)?.toDouble() ?? 0;
    final creditCount = project['creditCount'] as int? ?? 0;
    final methodology = project['methodology'] as String? ?? '';
    final location = project['location'] as String? ?? '';
    final startDate = project['startDate'] as String?;
    final endDate = project['endDate'] as String?;
    final status = project['status'] as String? ?? 'ACTIVE';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.lightGreen,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.park_outlined,
                    color: AppTheme.primaryGreen,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 12),

            // Methodology badge + location
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (methodology.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE9FE),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      methodology,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF7C3AED),
                      ),
                    ),
                  ),
                if (location.isNotEmpty)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 13,
                        color: AppTheme.textSecondary,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        location,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Stats row
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Total Credits',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${totalCredits.toStringAsFixed(1)} tCO2e',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryGreen,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 24),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Entries',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$creditCount',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
                if (startDate != null || endDate != null) ...[
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'Period',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_formatDateStr(startDate)}${endDate != null ? ' - ${_formatDateStr(endDate)}' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Record Footprint Bottom Sheet
  // ===========================================================================

  void _showRecordFootprintSheet(BuildContext context) {
    final formKey = GlobalKey<FormState>();
    String activityType = 'Transport';
    String valueStr = '';
    String? selectedDate;
    String notes = '';
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 12,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(ctx).size.height * 0.80,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title
                  const Text(
                    'Record Carbon Footprint',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Form
                  Form(
                    key: formKey,
                    child: Column(
                      children: [
                        // Activity type dropdown
                        DropdownButtonFormField<String>(
                          value: activityType,
                          decoration: const InputDecoration(
                            labelText: 'Activity Type',
                            prefixIcon: Icon(Icons.category_outlined),
                          ),
                          items: const [
                            DropdownMenuItem(
                                value: 'Transport', child: Text('Transport')),
                            DropdownMenuItem(
                                value: 'Electricity', child: Text('Electricity')),
                            DropdownMenuItem(
                                value: 'Fuel', child: Text('Fuel')),
                            DropdownMenuItem(
                                value: 'Processing', child: Text('Processing')),
                            DropdownMenuItem(
                                value: 'Other', child: Text('Other')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setSheetState(() => activityType = val);
                            }
                          },
                        ),
                        const SizedBox(height: 12),

                        // Value input
                        TextFormField(
                          decoration: const InputDecoration(
                            labelText: 'Value (tCO2e)',
                            prefixIcon: Icon(Icons.co2),
                            suffixText: 'tCO2e',
                          ),
                          keyboardType:
                              const TextInputType.numberWithOptions(decimal: true),
                          validator: (val) {
                            if (val == null || val.isEmpty) {
                              return 'Value is required';
                            }
                            if (double.tryParse(val) == null) {
                              return 'Enter a valid number';
                            }
                            return null;
                          },
                          onChanged: (val) => valueStr = val,
                        ),
                        const SizedBox(height: 12),

                        // Date picker
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: ctx,
                              initialDate: DateTime.now(),
                              firstDate: DateTime(2020),
                              lastDate: DateTime.now().add(const Duration(days: 1)),
                            );
                            if (picked != null) {
                              setSheetState(() {
                                selectedDate = picked.toIso8601String();
                              });
                            }
                          },
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'Date',
                              prefixIcon: Icon(Icons.calendar_today_outlined),
                            ),
                            child: Text(
                              selectedDate != null
                                  ? _formatDateStr(selectedDate)
                                  : 'Select a date',
                              style: TextStyle(
                                color: selectedDate != null
                                    ? AppTheme.textPrimary
                                    : AppTheme.textSecondary,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Notes
                        TextFormField(
                          decoration: const InputDecoration(
                            labelText: 'Notes (optional)',
                            prefixIcon: Icon(Icons.notes_outlined),
                          ),
                          maxLines: 2,
                          onChanged: (val) => notes = val,
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: submitting
                          ? null
                          : () {
                              if (formKey.currentState!.validate()) {
                                _submitFootprint(
                                  activityType: activityType,
                                  value: double.parse(valueStr),
                                  date: selectedDate,
                                  notes: notes,
                                  onLoading: () =>
                                      setSheetState(() => submitting = true),
                                  onSuccess: () {
                                    Navigator.pop(ctx);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'Footprint recorded successfully'),
                                        backgroundColor: AppTheme.successGreen,
                                      ),
                                    );
                                    _loadFootprint();
                                  },
                                  onError: (e) {
                                    setSheetState(() => submitting = false);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Failed: $e'),
                                        backgroundColor: AppTheme.errorRed,
                                      ),
                                    );
                                  },
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryGreen,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: submitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation(Colors.white),
                              ),
                            )
                          : const Text(
                              'Submit Record',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submitFootprint({
    required String activityType,
    required double value,
    String? date,
    required String notes,
    required VoidCallback onLoading,
    required VoidCallback onSuccess,
    required void Function(String) onError,
  }) async {
    onLoading();
    try {
      final api = ApiClient();
      final body = <String, dynamic>{
        'activityType': activityType,
        'value': value,
        'notes': notes,
      };
      if (date != null) {
        body['date'] = date;
      }
      await api.post(
        '/api/carbon/footprint',
        body: body,
      );
      onSuccess();
    } catch (e) {
      onError(e.toString());
    }
  }
}

// ---------------------------------------------------------------------------
// Helper class
// ---------------------------------------------------------------------------

class _ActivityMeta {
  final IconData icon;
  final Color color;
  const _ActivityMeta({required this.icon, required this.color});
}
