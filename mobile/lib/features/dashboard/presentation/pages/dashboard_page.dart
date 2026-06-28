import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';
import 'package:intl/intl.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/auth/auth_provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/constants.dart';
import '../../../shared/widgets/kpi_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);

  Map<String, dynamic>? _dashboardData;
  bool _loading = true;

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final api = ApiClient();
      final res = await api.get('/api/dashboard');
      if (res.statusCode == 200) {
        setState(() {
          _dashboardData = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Dashboard load error: $e');
    } finally {
      _loading = false;
      _refreshController.refreshCompleted();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthState>();
    final user = authProvider.userName;

    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Agrobase',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 20,
              ),
            ),
            if (user != null)
              Text(
                'Welcome, $user',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.textSecondary,
                ),
              ),
          ],
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: _loading
          ? _buildShimmer()
          : SmartRefresher(
              controller: _refreshController,
              onRefresh: _loadData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    _buildKpiGrid(),
                    const SizedBox(height: 24),
                    _buildLoanPortfolioChart(),
                    const SizedBox(height: 24),
                    _buildRecentActivity(),
                    const SizedBox(height: 24),
                    _buildQuickActions(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildShimmer() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          LoadingShimmer(width: double.infinity, height: 90),
          const SizedBox(height: 12),
          LoadingShimmer(width: double.infinity, height: 90),
          const SizedBox(height: 12),
          LoadingShimmer(width: double.infinity, height: 200),
          const SizedBox(height: 24),
          LoadingShimmer(width: double.infinity, height: 60),
          const SizedBox(height: 8),
          LoadingShimmer(width: double.infinity, height: 60),
          const SizedBox(height: 8),
          LoadingShimmer(width: double.infinity, height: 60),
          const SizedBox(height: 24),
          LoadingShimmer(width: double.infinity, height: 100),
        ],
      ),
    );
  }

  Widget _buildKpiGrid() {
    final kpis = _dashboardData?['kpis'] as List<dynamic>?;
    if (kpis == null || kpis.isEmpty) {
      return const SizedBox.shrink();
    }

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.6,
      children: kpis.map<Widget>((kpi) {
        return _buildKpiCard(kpi as Map<String, dynamic>);
      }).toList(),
    );
  }

  Widget _buildKpiCard(Map<String, dynamic> kpi) {
    final icon = _getKpiIcon(kpi['key'] as String? ?? '');
    final label = kpi['label'] as String? ?? '';
    final value = kpi['value'];
    final trend = kpi['trend'] as double? ?? 0.0;
    final isPositive = trend >= 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: AppTheme.primaryGreen,
                  size: 20,
                ),
              ),
              const Spacer(),
              if (trend != 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isPositive
                        ? AppTheme.successGreen.withValues(alpha: 0.1)
                        : AppTheme.errorRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isPositive
                            ? Icons.trending_up
                            : Icons.trending_down,
                        size: 14,
                        color: isPositive
                            ? AppTheme.successGreen
                            : AppTheme.errorRed,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${isPositive ? '+' : ''}${trend.toStringAsFixed(1)}%',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isPositive
                              ? AppTheme.successGreen
                              : AppTheme.errorRed,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _formatKpiValue(kpi['key'] as String? ?? '', value),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatKpiValue(String key, dynamic value) {
    if (value == null) return '0';
    if (key == 'revenue') {
      return formatCurrency(value);
    }
    if (value is int) {
      return NumberFormat.compact().format(value);
    }
    return value.toString();
  }

  IconData _getKpiIcon(String key) {
    switch (key) {
      case 'total_farmers':
        return Icons.people_outline;
      case 'active_loans':
        return Icons.account_balance_wallet_outlined;
      case 'vsla_groups':
        return Icons.groups_outlined;
      case 'revenue':
        return Icons.attach_money_outlined;
      default:
        return Icons.analytics_outlined;
    }
  }

  Widget _buildLoanPortfolioChart() {
    final portfolio =
        _dashboardData?['loanPortfolio'] as Map<String, dynamic>?;
    if (portfolio == null) {
      return const SizedBox.shrink();
    }

    final activeCount = (portfolio['active'] as num?)?.toInt() ?? 0;
    final pendingCount = (portfolio['pending'] as num?)?.toInt() ?? 0;
    final overdueCount = (portfolio['overdue'] as num?)?.toInt() ?? 0;
    final completedCount = (portfolio['completed'] as num?)?.toInt() ?? 0;
    final total =
        activeCount + pendingCount + overdueCount + completedCount;

    if (total == 0) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Loan Portfolio',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: Row(
              children: [
                Expanded(
                  child: PieChart(
                    PieChartData(
                      sections: [
                        if (activeCount > 0)
                          PieChartSectionData(
                            value: activeCount.toDouble(),
                            color: AppTheme.primaryGreen,
                            title:
                                '${((activeCount / total) * 100).round()}%',
                            titleStyle: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                            radius: 60,
                          ),
                        if (pendingCount > 0)
                          PieChartSectionData(
                            value: pendingCount.toDouble(),
                            color: AppTheme.accentAmber,
                            title:
                                '${((pendingCount / total) * 100).round()}%',
                            titleStyle: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                            radius: 60,
                          ),
                        if (overdueCount > 0)
                          PieChartSectionData(
                            value: overdueCount.toDouble(),
                            color: AppTheme.errorRed,
                            title:
                                '${((overdueCount / total) * 100).round()}%',
                            titleStyle: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                            radius: 60,
                          ),
                        if (completedCount > 0)
                          PieChartSectionData(
                            value: completedCount.toDouble(),
                            color: AppTheme.textSecondary
                                .withValues(alpha: 0.5),
                            title:
                                '${((completedCount / total) * 100).round()}%',
                            titleStyle: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                            radius: 60,
                          ),
                      ],
                      sectionsSpace: 2,
                      centerSpaceRadius: 30,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildChartLegend(
                        AppTheme.primaryGreen, 'Active', activeCount),
                    const SizedBox(height: 8),
                    _buildChartLegend(
                        AppTheme.accentAmber, 'Pending', pendingCount),
                    const SizedBox(height: 8),
                    _buildChartLegend(
                        AppTheme.errorRed, 'Overdue', overdueCount),
                    const SizedBox(height: 8),
                    _buildChartLegend(
                        AppTheme.textSecondary.withValues(alpha: 0.5),
                        'Completed',
                        completedCount),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartLegend(Color color, String label, int count) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          '$label ($count)',
          style: const TextStyle(
            fontSize: 12,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildRecentActivity() {
    final activities =
        _dashboardData?['recentActivity'] as List<dynamic>?;
    if (activities == null || activities.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            TextButton(
              onPressed: () {},
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...activities.map((activity) {
          return _buildActivityItem(activity as Map<String, dynamic>);
        }),
      ],
    );
  }

  Widget _buildActivityItem(Map<String, dynamic> activity) {
    final type = activity['type'] as String? ?? '';
    final description = activity['description'] as String? ?? '';
    final timestamp = activity['timestamp'] as String?;
    final icon = _getActivityIcon(type);
    final color = _getActivityColor(type);

    String timeAgo = '';
    if (timestamp != null) {
      try {
        final dt = DateTime.parse(timestamp);
        final now = DateTime.now();
        final diff = now.difference(dt);
        if (diff.inMinutes < 60) {
          timeAgo = '${diff.inMinutes}m ago';
        } else if (diff.inHours < 24) {
          timeAgo = '${diff.inHours}h ago';
        } else {
          timeAgo = '${diff.inDays}d ago';
        }
      } catch (_) {
        timeAgo = '';
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (timeAgo.isNotEmpty)
                  Text(
                    timeAgo,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _getActivityIcon(String type) {
    switch (type) {
      case 'loan_disbursement':
        return Icons.account_balance_wallet_outlined;
      case 'farmer_registration':
        return Icons.person_add_outlined;
      case 'vsla_savings':
        return Icons.savings_outlined;
      case 'loan_repayment':
        return Icons.payment_outlined;
      default:
        return Icons.local_activity_outlined;
    }
  }

  Color _getActivityColor(String type) {
    switch (type) {
      case 'loan_disbursement':
        return AppTheme.primaryGreen;
      case 'farmer_registration':
        return AppTheme.accentAmber;
      case 'vsla_savings':
        return const Color(0xFF6366F1);
      case 'loan_repayment':
        return AppTheme.successGreen;
      default:
        return AppTheme.textSecondary;
    }
  }

  Widget _buildQuickActions() {
    final actions = [
      _QuickAction(
        icon: Icons.person_add_alt_1_outlined,
        label: 'Register Farmer',
        route: '/farmers/register',
        color: AppTheme.primaryGreen,
      ),
      _QuickAction(
        icon: Icons.add_card_outlined,
        label: 'New Loan',
        route: '/loans/new',
        color: AppTheme.accentAmber,
      ),
      _QuickAction(
        icon: Icons.savings_outlined,
        label: 'Record Savings',
        route: '/vsla/savings/new',
        color: const Color(0xFF6366F1),
      ),
      _QuickAction(
        icon: Icons.assessment_outlined,
        label: 'View Reports',
        route: '/reports',
        color: const Color(0xFFEC4899),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.8,
          children: actions.map((action) {
            return _buildQuickActionCard(action);
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildQuickActionCard(_QuickAction action) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push(action.route),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: action.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  action.icon,
                  color: action.color,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  action.label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AppTheme.textSecondary,
                size: 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final String route;
  final Color color;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.route,
    required this.color,
  });
}