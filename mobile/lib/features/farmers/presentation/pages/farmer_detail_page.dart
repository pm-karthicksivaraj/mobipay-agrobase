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

class FarmerDetailPage extends StatefulWidget {
  final String id;

  const FarmerDetailPage({super.key, required this.id});

  @override
  State<FarmerDetailPage> createState() => _FarmerDetailPageState();
}

class _FarmerDetailPageState extends State<FarmerDetailPage> {
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);

  Map<String, dynamic>? _farmer;
  bool _loading = true;

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final api = ApiClient();
      final res = await api.get('/api/farmers/${widget.id}');
      if (res.statusCode == 200) {
        setState(() {
          _farmer = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Farmer detail load error: $e');
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
          'Farmer Details',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: _loading
          ? _buildShimmer()
          : _farmer == null
              ? const EmptyState(
                  icon: Icons.person_off_outlined,
                  title: 'Farmer not found',
                  subtitle: 'This farmer may have been removed',
                )
              : SmartRefresher(
                  controller: _refreshController,
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),
                        _buildProfileHeader(),
                        const SizedBox(height: 16),
                        _buildContactInfo(),
                        const SizedBox(height: 16),
                        _buildFarmInfo(),
                        const SizedBox(height: 16),
                        _buildLoansHistory(),
                        const SizedBox(height: 16),
                        _buildVslaMembership(),
                        const SizedBox(height: 16),
                        _buildTrainingAttendance(),
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
        children: [
          const SizedBox(height: 8),
          LoadingShimmer(height: 120),
          const SizedBox(height: 16),
          LoadingShimmer(height: 100),
          const SizedBox(height: 16),
          LoadingShimmer(height: 160),
          const SizedBox(height: 16),
          LoadingShimmer(height: 200),
        ],
      ),
    );
  }

  Widget _buildProfileHeader() {
    final farmer = _farmer!;
    final name = farmer['name'] as String? ?? 'Unknown';
    final initials = _getInitials(name);
    final status = farmer['status'] as String? ?? 'active';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: AppTheme.primaryGreen.withValues(alpha: 0.1),
            child: Text(
              initials,
              style: const TextStyle(
                color: AppTheme.primaryGreen,
                fontWeight: FontWeight.w700,
                fontSize: 24,
              ),
            ),
          ),
          const SizedBox(width: 16),
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
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    StatusBadge(status: status),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'ID: ${farmer['farmerId'] ?? widget.id}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Registered ${_formatDate(farmer['createdAt'] as String?)}',
                  style: const TextStyle(
                    fontSize: 13,
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

  Widget _buildContactInfo() {
    final farmer = _farmer!;
    final phone = farmer['phone'] as String? ?? '';
    final email = farmer['email'] as String? ?? '';
    final district = farmer['district'] as String? ?? '';
    final village = farmer['village'] as String? ?? '';
    final subcounty = farmer['subcounty'] as String? ?? '';

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
            'Contact Information',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (phone.isNotEmpty)
            _buildInfoRow(Icons.phone_outlined, 'Phone', phone),
          if (email.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoRow(Icons.email_outlined, 'Email', email),
          ],
          if (district.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoRow(Icons.location_on_outlined, 'District', district),
          ],
          if (subcounty.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoRow(
                Icons.location_city_outlined, 'Sub-county', subcounty),
          ],
          if (village.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoRow(Icons.home_outlined, 'Village', village),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.textSecondary),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildFarmInfo() {
    final farmer = _farmer!;
    final farmSize = farmer['farmSize'] as num?;
    final cropType = farmer['cropType'] as String? ?? '';
    final landOwnership = farmer['landOwnership'] as String? ?? '';
    final farmingExperience = farmer['farmingExperience'] as num?;

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
            'Farm Information',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          if (cropType.isNotEmpty)
            _buildInfoRow(Icons.grain_outlined, 'Primary Crop', cropType),
          if (farmSize != null) ...[
            const SizedBox(height: 10),
            _buildInfoRow(Icons.square_foot, 'Farm Size', '${farmSize} acres'),
          ],
          if (landOwnership.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildInfoRow(
                Icons.agriculture_outlined, 'Land Ownership', landOwnership),
          ],
          if (farmingExperience != null) ...[
            const SizedBox(height: 10),
            _buildInfoRow(
                Icons.history, 'Experience', '$farmingExperience years'),
          ],
        ],
      ),
    );
  }

  Widget _buildLoansHistory() {
    final loans = _farmer?['loans'] as List<dynamic>?;
    if (loans == null || loans.isEmpty) {
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
            'Loans History',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...loans.map((loan) {
            return _buildLoanHistoryItem(loan as Map<String, dynamic>);
          }),
        ],
      ),
    );
  }

  Widget _buildLoanHistoryItem(Map<String, dynamic> loan) {
    final amount = loan['amount'] as num? ?? 0;
    final status = loan['status'] as String? ?? 'pending';
    final product = loan['productName'] as String? ?? '';
    final disbursedAt = loan['disbursedAt'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.account_balance_wallet_outlined,
              color: AppTheme.primaryGreen,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  formatCurrency((amount as num).toDouble()),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primaryGreen,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusBadge(status: status),
              if (disbursedAt != null)
                Text(
                  _formatDate(disbursedAt),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVslaMembership() {
    final groups = _farmer?['vslaGroups'] as List<dynamic>?;
    if (groups == null || groups.isEmpty) {
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
            'VSLA Membership',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...groups.map((group) {
            final g = group as Map<String, dynamic>;
            final name = g['name'] as String? ?? '';
            final role = g['role'] as String? ?? 'Member';
            final savings = g['totalSavings'] as num? ?? 0;

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.accentAmber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.groups_outlined,
                      color: AppTheme.accentAmber,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        Text(
                          role,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    formatCurrency((savings as num).toDouble()),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryGreen,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTrainingAttendance() {
    final trainings = _farmer?['trainings'] as List<dynamic>?;
    if (trainings == null || trainings.isEmpty) {
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
            'Training Attendance',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ...trainings.map((training) {
            final t = training as Map<String, dynamic>;
            final name = t['name'] as String? ?? '';
            final date = t['date'] as String?;
            final attended = t['attended'] as bool? ?? false;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Icon(
                    attended
                        ? Icons.check_circle_outline
                        : Icons.cancel_outlined,
                    color:
                        attended ? AppTheme.successGreen : AppTheme.errorRed,
                    size: 18,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      name,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  if (date != null)
                    Text(
                      _formatDate(date),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
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