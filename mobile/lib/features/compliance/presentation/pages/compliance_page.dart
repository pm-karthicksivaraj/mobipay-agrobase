import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/kpi_card.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

class CompliancePage extends StatefulWidget {
  const CompliancePage({super.key});

  @override
  State<CompliancePage> createState() => _CompliancePageState();
}

class _CompliancePageState extends State<CompliancePage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  int _currentTab = 0;

  // Data
  List<Map<String, dynamic>> _eudrItems = [];
  List<Map<String, dynamic>> _cbamReports = [];
  List<Map<String, dynamic>> _gapCerts = [];
  List<Map<String, dynamic>> _alerts = [];
  int _eudrTotal = 0;
  int _cbamTotal = 0;
  int _gapTotal = 0;

  // KPI values
  int _complianceRate = 0;
  int _cbamCount = 0;
  int _highRisk = 0;
  int _certified = 0;

  // Filters
  String _eudrFilter = 'All';
  String _cbamFilter = 'All';
  String _gapFilter = 'All';

  // Loading
  bool _loading = true;
  String _error = '';
  bool _loadingOverview = true;
  bool _loadingEudr = true;
  bool _loadingCbam = true;
  bool _loadingGap = true;

  static const List<String> _tabs = ['Overview', 'EUDR', 'CBAM', 'GAP'];

  static const List<String> _eudrFilters = [
    'All',
    'Verified',
    'Pending',
    'Expired',
    'Non-Compliant',
  ];
  static const List<String> _cbamFilters = [
    'All',
    'Pending',
    'Submitted',
    'Approved',
  ];
  static const List<String> _gapFilters = [
    'All',
    'Active',
    'Expired',
    'Suspended',
  ];

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

  // ─── API Calls ───────────────────────────────────────────────────────

  Future<void> _loadAllData() async {
    _loading = true;
    _error = '';
    setState(() {});

    try {
      await Future.wait([
        _loadOverviewData(),
        _loadEudrData(),
        _loadCbamData(),
        _loadGapData(),
      ]);
    } catch (e) {
      debugPrint('Compliance load error: $e');
      if (mounted) setState(() => _error = 'Failed to load compliance data');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
      _refreshController.refreshCompleted();
    }
  }

  Future<void> _loadOverviewData() async {
    try {
      final api = ApiClient();
      final expiringRes = await api.get('/api/compliance/eudr?action=expiring');
      final cbamRes = await api.get('/api/compliance/cbam?limit=5');

      List<Map<String, dynamic>> expiringItems = [];
      List<Map<String, dynamic>> recentCbam = [];

      if (expiringRes.statusCode == 200) {
        final data = jsonDecode(expiringRes.body);
        expiringItems = List<Map<String, dynamic>>.from(data['data'] ?? []);
      }
      if (cbamRes.statusCode == 200) {
        final data = jsonDecode(cbamRes.body);
        recentCbam = List<Map<String, dynamic>>.from(data['data'] ?? []);
      }

      // Build alerts list from expiring EUDR items and recent CBAM
      final combinedAlerts = <Map<String, dynamic>>[];
      for (final item in expiringItems) {
        combinedAlerts.add({
          'type': 'eudr',
          'title': item['farmerName'] as String? ?? 'EUDR Compliance',
          'description':
              '${item['commodity'] as String? ?? "Commodity"} - near expiry',
          'date': item['expiresAt'] as String?,
          'status': 'warning',
          'icon': Icons.eco,
        });
      }
      for (final item in recentCbam) {
        combinedAlerts.add({
          'type': 'cbam',
          'title':
              'CBAM Report ${item['id'] != null ? "#${(item['id'].toString().length > 8 ? item['id'].toString().substring(0, 8) : item['id'])}" : ""}',
          'description': item['period'] as String? ?? 'Carbon report',
          'date': item['createdAt'] as String?,
          'status': item['status'] as String? ?? 'pending',
          'icon': Icons.description,
        });
      }

      // Derive KPIs
      final rate = expiringRes.statusCode == 200
          ? (jsonDecode(expiringRes.body)['complianceRate'] as num? ?? 0)
              .toInt()
          : 0;
      final highRiskCount = expiringItems
          .where((i) =>
              (i['riskLevel'] as String? ?? '').toUpperCase() == 'HIGH')
          .length;
      final certifiedCount = expiringItems
          .where((i) =>
              (i['status'] as String? ?? '').toUpperCase() == 'VERIFIED')
          .length;

      if (mounted) {
        setState(() {
          _alerts = combinedAlerts;
          _complianceRate = rate;
          _highRisk = highRiskCount;
          _certified = certifiedCount;
          _cbamCount = recentCbam.length;
          _loadingOverview = false;
        });
      }
    } catch (e) {
      debugPrint('Overview load error: $e');
      if (mounted) setState(() => _loadingOverview = false);
    }
  }

  Future<void> _loadEudrData() async {
    try {
      final api = ApiClient();
      String endpoint = '/api/compliance/eudr?page=1&limit=20';
      if (_eudrFilter.isNotEmpty && _eudrFilter != 'All') {
        endpoint = '/api/compliance/eudr?status=${_eudrFilter.toLowerCase()}&page=1&limit=20';
      }
      final res = await api.get(endpoint);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _eudrItems = List<Map<String, dynamic>>.from(data['data'] ?? []);
            _eudrTotal = (data['total'] as num? ?? 0).toInt();
            _loadingEudr = false;
          });
        }
      } else {
        if (mounted) setState(() => _loadingEudr = false);
      }
    } catch (e) {
      debugPrint('EUDR load error: $e');
      if (mounted) setState(() => _loadingEudr = false);
    }
  }

  Future<void> _loadCbamData() async {
    try {
      final api = ApiClient();
      String endpoint = '/api/compliance/cbam?page=1&limit=20';
      if (_cbamFilter.isNotEmpty && _cbamFilter != 'All') {
        endpoint += '&status=${_cbamFilter.toLowerCase()}';
      }
      final res = await api.get(endpoint);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _cbamReports = List<Map<String, dynamic>>.from(data['data'] ?? []);
            _cbamTotal = (data['total'] as num? ?? 0).toInt();
            _loadingCbam = false;
          });
        }
      } else {
        if (mounted) setState(() => _loadingCbam = false);
      }
    } catch (e) {
      debugPrint('CBAM load error: $e');
      if (mounted) setState(() => _loadingCbam = false);
    }
  }

  Future<void> _loadGapData() async {
    try {
      final api = ApiClient();
      String endpoint = '/api/compliance/globalgap?page=1&limit=20';
      if (_gapFilter.isNotEmpty && _gapFilter != 'All') {
        endpoint += '&status=${_gapFilter.toLowerCase()}';
      }
      final res = await api.get(endpoint);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _gapCerts = List<Map<String, dynamic>>.from(data['data'] ?? []);
            _gapTotal = (data['total'] as num? ?? 0).toInt();
            _loadingGap = false;
          });
        }
      } else {
        if (mounted) setState(() => _loadingGap = false);
      }
    } catch (e) {
      debugPrint('GAP load error: $e');
      if (mounted) setState(() => _loadingGap = false);
    }
  }

  // ─── Date Helpers ────────────────────────────────────────────────────

  String _formatDateStr(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.day} ${_monthAbbrev(dt.month)} ${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }

  String _monthAbbrev(int month) {
    const months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month] ?? '';
  }

  // ─── Build ───────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: const Text(
          'Compliance Hub',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
      ),
      body: Column(
        children: [
          _buildTabBar(),
          Expanded(
            child: _loading
                ? _buildShimmerList()
                : _error.isNotEmpty
                    ? EmptyState(
                        icon: Icons.error_outline,
                        title: 'Error',
                        subtitle: _error,
                        onRetry: _loadAllData,
                      )
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildOverviewTab(),
                          _buildEudrTab(),
                          _buildCbamTab(),
                          _buildGapTab(),
                        ],
                      ),
          ),
        ],
      ),
      // FAB for CBAM tab
      floatingActionButton: _currentTab == 2
          ? FloatingActionButton(
              onPressed: _showGenerateReportSheet,
              backgroundColor: AppTheme.primaryGreen,
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  // ─── Tab Bar ─────────────────────────────────────────────────────────

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
        labelStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        unselectedLabelStyle:
            const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        padding: const EdgeInsets.all(4),
        tabs: _tabs
            .map((tab) => Tab(
                  child: Text(tab),
                ))
            .toList(),
      ),
    );
  }

  // ─── Overview Tab ────────────────────────────────────────────────────

  Widget _buildOverviewTab() {
    return SmartRefresher(
      controller: _refreshController,
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // KPI Grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.15,
            children: [
              KpiCard(
                title: 'EUDR Compliance',
                value: '$_complianceRate%',
                icon: Icons.eco,
                color: AppTheme.primaryGreen,
              ),
              KpiCard(
                title: 'CBAM Reports',
                value: '$_cbamCount',
                icon: Icons.description,
                color: Colors.blue,
              ),
              KpiCard(
                title: 'High Risk Items',
                value: '$_highRisk',
                icon: Icons.warning,
                color: AppTheme.errorRed,
              ),
              KpiCard(
                title: 'Certified Farms',
                value: '$_certified',
                icon: Icons.verified,
                color: Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Compliance Alerts
          const Text(
            'Compliance Alerts',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),

          if (_loadingOverview)
            const LoadingShimmer(itemCount: 3, itemHeight: 88)
          else if (_alerts.isEmpty)
            const EmptyState(
              icon: Icons.check_circle_outline,
              title: 'All clear',
              subtitle: 'No compliance alerts at this time',
            )
          else
            ..._alerts.map((alert) => _buildAlertCard(alert)),
        ],
      ),
    );
  }

  Widget _buildAlertCard(Map<String, dynamic> alert) {
    final title = alert['title'] as String? ?? '';
    final description = alert['description'] as String? ?? '';
    final date = alert['date'] as String?;
    final status = (alert['status'] as String? ?? '').toLowerCase();
    final icon = alert['icon'] as IconData? ?? Icons.info_outline;

    Color statusColor;
    if (status == 'compliant' || status == 'approved' || status == 'verified') {
      statusColor = AppTheme.successGreen;
    } else if (status == 'pending' || status == 'warning') {
      statusColor = AppTheme.accentAmber;
    } else {
      statusColor = AppTheme.errorRed;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: statusColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (date != null) ...[
                      const SizedBox(height: 4),
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
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── EUDR Tab ────────────────────────────────────────────────────────

  Widget _buildEudrTab() {
    return Column(
      children: [
        _buildFilterChips(
          filters: _eudrFilters,
          selected: _eudrFilter,
          onSelected: (filter) {
            setState(() => _eudrFilter = filter);
            _loadingEudr = true;
            _loadEudrData();
          },
        ),
        Expanded(
          child: _loadingEudr
              ? ListView.builder(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  itemCount: 4,
                  itemBuilder: (_, __) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: LoadingShimmer(height: 140),
                  ),
                )
              : _eudrItems.isEmpty
                  ? const EmptyState(
                      icon: Icons.eco_outlined,
                      title: 'No EUDR records',
                      subtitle: 'No compliance items match this filter',
                    )
                  : SmartRefresher(
                      controller: _refreshController,
                      onRefresh: () {
                        _loadingEudr = true;
                        setState(() {});
                        _loadEudrData();
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        itemCount: _eudrItems.length,
                        itemBuilder: (context, index) {
                          return _buildEudrCard(_eudrItems[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildEudrCard(Map<String, dynamic> item) {
    final farmerName = item['farmerName'] as String? ??
        item['communityName'] as String? ??
        'Unknown';
    final commodity = item['commodity'] as String? ?? '';
    final riskLevel =
        (item['riskLevel'] as String? ?? '').toUpperCase();
    final status = (item['status'] as String? ?? '').toUpperCase();
    final verifiedAt = item['verifiedAt'] as String?;
    final hasGeolocation = item['latitude'] != null ||
        item['geolocation'] != null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Name + Status
              Row(
                children: [
                  Expanded(
                    child: Text(
                      farmerName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusBadge(status),
                ],
              ),
              const SizedBox(height: 10),

              // Badges row: Commodity + Risk Level
              Row(
                children: [
                  if (commodity.isNotEmpty) ...[
                    _buildSmallBadge(
                      label: commodity,
                      color: AppTheme.primaryGreen,
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (riskLevel.isNotEmpty) ...[
                    _buildRiskBadge(riskLevel),
                  ],
                  const Spacer(),
                  if (hasGeolocation)
                    const Icon(
                      Icons.location_on,
                      size: 16,
                      color: AppTheme.textSecondary,
                    ),
                ],
              ),

              // Verification date
              if (verifiedAt != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 13,
                      color: AppTheme.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Verified: ${_formatDateStr(verifiedAt)}',
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
        ),
      ),
    );
  }

  // ─── CBAM Tab ────────────────────────────────────────────────────────

  Widget _buildCbamTab() {
    return Column(
      children: [
        _buildFilterChips(
          filters: _cbamFilters,
          selected: _cbamFilter,
          onSelected: (filter) {
            setState(() => _cbamFilter = filter);
            _loadingCbam = true;
            _loadCbamData();
          },
        ),
        Expanded(
          child: _loadingCbam
              ? ListView.builder(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  itemCount: 4,
                  itemBuilder: (_, __) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: LoadingShimmer(height: 130),
                  ),
                )
              : _cbamReports.isEmpty
                  ? const EmptyState(
                      icon: Icons.description_outlined,
                      title: 'No CBAM reports',
                      subtitle: 'No carbon reports match this filter',
                    )
                  : SmartRefresher(
                      controller: _refreshController,
                      onRefresh: () {
                        _loadingCbam = true;
                        setState(() {});
                        _loadCbamData();
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        itemCount: _cbamReports.length,
                        itemBuilder: (context, index) {
                          return _buildCbamCard(_cbamReports[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildCbamCard(Map<String, dynamic> item) {
    final id = item['id'] as String? ?? '';
    final truncatedId = id.length > 8 ? '${id.substring(0, 8)}...' : id;
    final period = item['period'] as String? ?? '';
    final status = (item['status'] as String? ?? '').toUpperCase();
    final emissions = item['emissionsTotal'] as num? ?? 0;
    final farmerName = item['farmerName'] as String?;
    final createdAt = item['createdAt'] as String?;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Report ID + Status
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Report $truncatedId',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusBadge(status),
                ],
              ),
              const SizedBox(height: 10),

              // Period + Emissions
              Row(
                children: [
                  if (period.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        period,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.blue,
                        ),
                      ),
                    ),
                  const SizedBox(width: 8),
                  Text(
                    '${emissions.toDouble().toStringAsFixed(2)} tCO2e',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),

              // Farmer name + Date
              if (farmerName != null || createdAt != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (farmerName != null) ...[
                      const Icon(Icons.person_outline,
                          size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          farmerName,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                    if (createdAt != null) ...[
                      const Icon(Icons.calendar_today_outlined,
                          size: 13, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        _formatDateStr(createdAt),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ─── GAP Tab ─────────────────────────────────────────────────────────

  Widget _buildGapTab() {
    return Column(
      children: [
        _buildFilterChips(
          filters: _gapFilters,
          selected: _gapFilter,
          onSelected: (filter) {
            setState(() => _gapFilter = filter);
            _loadingGap = true;
            _loadGapData();
          },
        ),
        Expanded(
          child: _loadingGap
              ? ListView.builder(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  itemCount: 4,
                  itemBuilder: (_, __) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: LoadingShimmer(height: 140),
                  ),
                )
              : _gapCerts.isEmpty
                  ? const EmptyState(
                      icon: Icons.verified_outlined,
                      title: 'No GAP certifications',
                      subtitle: 'No certifications match this filter',
                    )
                  : SmartRefresher(
                      controller: _refreshController,
                      onRefresh: () {
                        _loadingGap = true;
                        setState(() {});
                        _loadGapData();
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        itemCount: _gapCerts.length,
                        itemBuilder: (context, index) {
                          return _buildGapCard(_gapCerts[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildGapCard(Map<String, dynamic> item) {
    final farmName = item['farmName'] as String? ??
        item['farmerName'] as String? ??
        'Unknown';
    final certNumber = item['certificateNumber'] as String? ?? '';
    final version = item['standardVersion'] as String? ?? '';
    final status = (item['status'] as String? ?? '').toUpperCase();
    final expiresAt = item['expiresAt'] as String?;
    final scope = item['scope'] as String? ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Farm name + Status
              Row(
                children: [
                  Expanded(
                    child: Text(
                      farmName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusBadge(status),
                ],
              ),
              const SizedBox(height: 10),

              // Certificate number + Version
              Row(
                children: [
                  if (certNumber.isNotEmpty) ...[
                    const Icon(Icons.fingerprint,
                        size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      certNumber,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                  if (version.isNotEmpty) ...[
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        version,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.purple,
                        ),
                      ),
                    ),
                  ],
                ],
              ),

              // Scope + Expiry
              const SizedBox(height: 10),
              Row(
                children: [
                  if (scope.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        scope,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (expiresAt != null) ...[
                    const Icon(Icons.event_outlined,
                        size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      'Exp: ${_formatDateStr(expiresAt)}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Shared Widgets ──────────────────────────────────────────────────

  Widget _buildFilterChips({
    required List<String> filters,
    required String selected,
    required ValueChanged<String> onSelected,
  }) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = filter == selected;
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onSelected(filter),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppTheme.primaryGreen
                      : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? AppTheme.primaryGreen
                        : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Text(
                  filter,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? Colors.white
                        : AppTheme.textSecondary,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;

    switch (status.toUpperCase()) {
      case 'VERIFIED':
      case 'ACTIVE':
      case 'APPROVED':
        bgColor = AppTheme.successGreen.withValues(alpha: 0.12);
        textColor = AppTheme.successGreen;
        break;
      case 'PENDING':
      case 'SUBMITTED':
        bgColor = AppTheme.accentAmber.withValues(alpha: 0.12);
        textColor = AppTheme.accentAmber;
        break;
      case 'EXPIRED':
      case 'NON_COMPLIANT':
      case 'SUSPENDED':
      case 'NON-COMPLIANT':
        bgColor = AppTheme.errorRed.withValues(alpha: 0.12);
        textColor = AppTheme.errorRed;
        break;
      default:
        bgColor = const Color(0xFFF1F5F9);
        textColor = const Color(0xFF64748B);
    }

    final displayStatus = status
        .replaceAll('_', ' ')
        .replaceAll('-', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
        .join(' ');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        displayStatus,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildRiskBadge(String riskLevel) {
    Color bgColor;
    Color textColor;

    switch (riskLevel.toUpperCase()) {
      case 'LOW':
        bgColor = AppTheme.successGreen.withValues(alpha: 0.12);
        textColor = AppTheme.successGreen;
        break;
      case 'MEDIUM':
        bgColor = AppTheme.accentAmber.withValues(alpha: 0.12);
        textColor = AppTheme.accentAmber;
        break;
      case 'HIGH':
        bgColor = AppTheme.errorRed.withValues(alpha: 0.12);
        textColor = AppTheme.errorRed;
        break;
      default:
        bgColor = const Color(0xFFF1F5F9);
        textColor = const Color(0xFF64748B);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            riskLevel.toUpperCase() == 'HIGH'
                ? Icons.error
                : riskLevel.toUpperCase() == 'MEDIUM'
                    ? Icons.warning
                    : Icons.check_circle,
            size: 14,
            color: textColor,
          ),
          const SizedBox(width: 4),
          Text(
            riskLevel,
            style: TextStyle(
              color: textColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSmallBadge({
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  // ─── Generate Report Bottom Sheet ────────────────────────────────────

  void _showGenerateReportSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return _GenerateReportSheet();
      },
    );
  }

  // ─── Shimmer ─────────────────────────────────────────────────────────

  Widget _buildShimmerList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: LoadingShimmer(height: 120),
        );
      },
    );
  }
}

// ─── Generate Report Bottom Sheet Widget ──────────────────────────────

class _GenerateReportSheet extends StatefulWidget {
  @override
  State<_GenerateReportSheet> createState() => _GenerateReportSheetState();
}

class _GenerateReportSheetState extends State<_GenerateReportSheet> {
  String _selectedQuarter = 'Q1';
  int _selectedYear = DateTime.now().year;

  static const List<String> _quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
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
            'Generate CBAM Report',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 20),

          // Quarter Selector
          const Text(
            'Quarter',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.surfaceLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: _quarters.map((q) {
                final isSelected = q == _selectedQuarter;
                return Expanded(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => setState(() => _selectedQuarter = q),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primaryGreen
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          q,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : AppTheme.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // Year Picker
          const Text(
            'Year',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppTheme.surfaceLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.remove, color: AppTheme.textSecondary),
                  onPressed: () => setState(() => _selectedYear--),
                ),
                Text(
                  '$_selectedYear',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add, color: AppTheme.textSecondary),
                  onPressed: () => setState(() => _selectedYear++),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Generate Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Generating $_selectedQuarter $_selectedYear report...',
                    ),
                    backgroundColor: AppTheme.primaryGreen,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryGreen,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Generate Report',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}