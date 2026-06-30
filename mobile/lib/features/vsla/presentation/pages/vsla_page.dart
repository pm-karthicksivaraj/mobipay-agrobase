import 'dart:convert';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/connectivity/connectivity_manager.dart';

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

class VslaPage extends StatefulWidget {
  const VslaPage({super.key});

  @override
  State<VslaPage> createState() => _VslaPageState();
}

class _VslaPageState extends State<VslaPage>
    with SingleTickerProviderStateMixin {
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  late TabController _tabController;

  List<Map<String, dynamic>> _groups = [];
  Map<String, dynamic>? _savingsData;
  bool _loading = true;

  static const List<String> _tabs = ['Groups', 'My Savings'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _refreshController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final api = ApiClient();

      final groupsRes = await api.get('/api/vsla/groups');
      if (groupsRes.statusCode == 200) {
        final data = jsonDecode(groupsRes.body);
        setState(() {
          _groups = List<Map<String, dynamic>>.from(data['groups'] ?? []);
        });
      }

      final savingsRes = await api.get('/api/vsla/savings');
      if (savingsRes.statusCode == 200) {
        setState(() {
          _savingsData = jsonDecode(savingsRes.body);
        });
      }
    } catch (e) {
      debugPrint('VSLA load error: $e');
    } finally {
      _loading = false;
      _refreshController.refreshCompleted();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: const Text(
          'VSLA',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
      ),
      floatingActionButton: _tabController.index == 1
          ? FloatingActionButton.extended(
              onPressed: () => _showRecordSavingsDialog(context),
              backgroundColor: AppTheme.primaryGreen,
              icon: const Icon(Icons.savings, color: Colors.white),
              label: const Text(
                'Record Savings',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            )
          : null,
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Color(0xFFE2E8F0)),
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
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
              unselectedLabelStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              padding: const EdgeInsets.all(4),
              tabs: const [
                Tab(text: 'Groups'),
                Tab(text: 'My Savings'),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? _buildShimmer()
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildGroupsTab(),
                      _buildSavingsTab(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildGroupsTab() {
    if (_groups.isEmpty) {
      return const EmptyState(
        icon: Icons.groups_outlined,
        title: 'No VSLA groups',
        subtitle: 'Groups will appear here once created',
      );
    }

    return SmartRefresher(
      controller: _refreshController,
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _groups.length,
        itemBuilder: (context, index) {
          return _buildGroupCard(_groups[index]);
        },
      ),
    );
  }

  Widget _buildGroupCard(Map<String, dynamic> group) {
    final name = group['name'] as String? ?? '';
    final members = group['memberCount'] as int? ?? 0;
    final totalSavings = group['totalSavings'] as num? ?? 0;
    final meetingDay = group['meetingDay'] as String? ?? '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showGroupDetails(context, group),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color:
                            AppTheme.accentAmber.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.groups_outlined,
                        color: AppTheme.accentAmber,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: AppTheme.textSecondary,
                      size: 20,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _buildGroupStat(
                      Icons.people_outline,
                      '$members members',
                    ),
                    const SizedBox(width: 16),
                    _buildGroupStat(
                      Icons.savings_outlined,
                      formatCurrency(totalSavings.toDouble()),
                    ),
                  ],
                ),
                if (meetingDay.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color:
                          AppTheme.primaryGreen.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.event_outlined,
                          size: 14,
                          color: AppTheme.primaryGreen,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Meets on $meetingDay',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.primaryGreen,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGroupStat(IconData icon, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 6),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }

  void _showGroupDetails(BuildContext context, Map<String, dynamic> group) {
    final members = group['members'] as List<dynamic>? ?? [];
    final savingsHistory =
        group['savingsHistory'] as List<dynamic>? ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (ctx, scrollController) {
            return Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius:
                    BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: ListView(
                controller: scrollController,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    group['name'] as String? ?? 'Group',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (members.isNotEmpty) ...[
                    const Text(
                      'Members',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...members.map((m) {
                      final member = m as Map<String, dynamic>;
                      final name = member['name'] as String? ?? '';
                      final role =
                          member['role'] as String? ?? 'Member';
                      final initials = name.isNotEmpty
                          ? name
                              .split(' ')
                              .take(2)
                              .map((w) => w[0])
                              .join()
                              .toUpperCase()
                          : '?';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: AppTheme.primaryGreen
                                  .withValues(alpha: 0.1),
                              child: Text(
                                initials,
                                style: const TextStyle(
                                  color: AppTheme.primaryGreen,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: role.toLowerCase() ==
                                        'chairperson'
                                    ? AppTheme.accentAmber
                                        .withValues(alpha: 0.1)
                                    : AppTheme.surfaceLight,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                role,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: role.toLowerCase() ==
                                          'chairperson'
                                      ? AppTheme.accentAmber
                                      : AppTheme.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],
                  if (savingsHistory.isNotEmpty) ...[
                    const Text(
                      'Savings History',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...savingsHistory.map((s) {
                      return _buildSavingsEntry(
                          s as Map<String, dynamic>);
                    }),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildSavingsTab() {
    final totalSavings = _savingsData?['totalSavings'] as num? ?? 0;
    final history = _savingsData?['history'] as List<dynamic>? ?? [];

    return SmartRefresher(
      controller: _refreshController,
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          _buildSavingsKpi(totalSavings),
          const SizedBox(height: 16),
          const Text(
            'Savings History',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          if (history.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: EmptyState(
                icon: Icons.savings_outlined,
                title: 'No savings recorded',
                subtitle: 'Tap the button below to record savings',
              ),
            )
          else
            ...history.map((s) {
              return _buildSavingsEntry(s as Map<String, dynamic>);
            }),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildSavingsKpi(num totalSavings) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryGreen,
            AppTheme.primaryGreen.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.savings_outlined, color: Colors.white70, size: 20),
              SizedBox(width: 8),
              Text(
                'Total Savings',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white70,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            formatCurrency(totalSavings.toDouble()),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSavingsEntry(Map<String, dynamic> entry) {
    final amount = entry['amount'] as num? ?? 0;
    final type = entry['type'] as String? ?? 'savings';
    final date = entry['date'] as String?;
    final description = entry['description'] as String? ?? '';

    final iconData = _getSavingsTypeData(type);

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
              color: iconData.$2.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(iconData.$1, color: iconData.$2, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  description.isNotEmpty
                      ? description
                      : iconData.$3,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color:
                            iconData.$2.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        iconData.$3,
                        style: TextStyle(
                          fontSize: 11,
                          color: iconData.$2,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    if (date != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        _formatDate(date),
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
          Text(
            formatCurrency(amount.toDouble()),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color, String) _getSavingsTypeData(String type) {
    switch (type.toLowerCase()) {
      case 'social fund':
        return (
          Icons.volunteer_activism_outlined,
          const Color(0xFFEC4899),
          'Social Fund'
        );
      case 'loan repayment':
        return (
          Icons.account_balance_wallet_outlined,
          AppTheme.accentAmber,
          'Loan Repayment'
        );
      default:
        return (
          Icons.savings_outlined,
          AppTheme.primaryGreen,
          'Savings'
        );
    }
  }

  void _showRecordSavingsDialog(BuildContext context) {
    final formKey = GlobalKey<FormState>();
    final amountController = TextEditingController();
    final descriptionController = TextEditingController();
    String selectedType = 'savings';
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius:
                    BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Record Savings',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Form(
                    key: formKey,
                    child: Column(
                      children: [
                        DropdownButtonFormField<String>(
                          initialValue: selectedType,
                          decoration:
                              _inputDecoration('Savings Type'),
                          items: const [
                            DropdownMenuItem(
                              value: 'savings',
                              child: Text('Savings'),
                            ),
                            DropdownMenuItem(
                              value: 'social fund',
                              child: Text('Social Fund'),
                            ),
                            DropdownMenuItem(
                              value: 'loan repayment',
                              child: Text('Loan Repayment'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              setModalState(
                                  () => selectedType = v);
                            }
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: amountController,
                          decoration: _inputDecoration(
                              'Amount (UGX)'),
                          keyboardType:
                              const TextInputType.numberWithOptions(
                                  decimal: true),
                          validator: (v) {
                            if (v?.isEmpty ?? true) return 'Required';
                            if (num.tryParse(v!) == null) {
                              return 'Invalid amount';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: descriptionController,
                          decoration: _inputDecoration(
                              'Description (optional)'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              if (formKey.currentState
                                      ?.validate() ??
                                  false) {
                                setModalState(
                                    () => isSubmitting = true);
                                try {
                                  final api = ApiClient();
                                  await api.post(
                                      '/api/vsla/savings',
                                      body: {
                                        'amount': num.parse(
                                            amountController
                                                .text),
                                        'type': selectedType,
                                        'description':
                                            descriptionController
                                                .text,
                                      });
                                  if (ctx.mounted) {
                                    Navigator.pop(ctx);
                                    _loadData();
                                    ScaffoldMessenger.of(
                                            context)
                                        .showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'Savings recorded successfully'),
                                        backgroundColor:
                                            AppTheme.successGreen,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (ctx.mounted) {
                                    ScaffoldMessenger.of(
                                            context)
                                        .showSnackBar(
                                      SnackBar(
                                        content: Text(
                                            'Failed to record: $e'),
                                        backgroundColor:
                                            AppTheme.errorRed,
                                      ),
                                    );
                                  }
                                } finally {
                                  setModalState(
                                      () => isSubmitting =
                                          false);
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryGreen,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child:
                                  CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Save',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
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

  Widget _buildShimmer() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        LoadingShimmer(height: 90),
        const SizedBox(height: 12),
        LoadingShimmer(height: 100),
        const SizedBox(height: 12),
        LoadingShimmer(height: 100),
        const SizedBox(height: 12),
        LoadingShimmer(height: 100),
      ],
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: AppTheme.textSecondary,
        fontSize: 14,
      ),
      filled: true,
      fillColor: AppTheme.surfaceLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(
            color: AppTheme.primaryGreen, width: 2),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }
}