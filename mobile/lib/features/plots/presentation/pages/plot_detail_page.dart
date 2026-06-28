import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';

class PlotDetailPage extends StatefulWidget {
  final String id;
  const PlotDetailPage({super.key, required this.id});

  @override
  State<PlotDetailPage> createState() => _PlotDetailPageState();
}

class _PlotDetailPageState extends State<PlotDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  Map<String, dynamic>? _plot;
  bool _loading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPlot();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPlot() async {
    try {
      final api = ApiClient();
      final res = await api.get('/api/plots/${widget.id}');
      if (res.statusCode == 200) {
        setState(() {
          _plot = jsonDecode(res.body) as Map<String, dynamic>;
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load plot: ${res.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
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
        title: Text(
          _plot?['name'] as String? ?? 'Plot Detail',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 17),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
        actions: [
          if (_plot != null)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) {
                if (value == 'verify') {
                  context.push('/plots/${widget.id}/verify');
                } else if (value == 'evidence') {
                  context.push('/plots/${widget.id}/evidence');
                } else if (value == 'trace') {
                  context.push('/plots/${widget.id}/trace');
                }
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'verify', child: Text('Verify Plot')),
                const PopupMenuItem(value: 'evidence', child: Text('EUDR Evidence')),
                const PopupMenuItem(value: 'trace', child: Text('Traceability')),
              ],
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryGreen,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primaryGreen,
          indicatorSize: TabBarIndicatorSize.label,
          tabs: const [
            Tab(text: 'Details'),
            Tab(text: 'Seasons'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: _loading
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: [
                LoadingShimmer(width: double.infinity, height: 200),
                const SizedBox(height: 16),
                LoadingShimmer(width: double.infinity, height: 120),
                const SizedBox(height: 16),
                LoadingShimmer(width: double.infinity, height: 120),
              ],
            )
          : _error.isNotEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 48, color: AppTheme.errorRed),
                      const SizedBox(height: 12),
                      Text(_error, style: const TextStyle(color: AppTheme.textSecondary)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadPlot,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildDetailsTab(),
                    _buildSeasonsTab(),
                    _buildHistoryTab(),
                  ],
                ),
    );
  }

  // ─── Details Tab ────────────────────────────────────────────

  Widget _buildDetailsTab() {
    final p = _plot!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Verification & Risk badges
          Container(
            padding: const EdgeInsets.all(16),
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
                    StatusBadge(
                      label: (p['verificationStatus'] as String?)?.replaceAll('_', ' ') ?? 'Unknown',
                      color: _getVerificationColor(p['verificationStatus'] as String?),
                    ),
                    const SizedBox(width: 8),
                    StatusBadge(
                      label: 'Risk: ${p['eudrRiskLevel'] as String? ?? 'UNKNOWN'}',
                      color: _getRiskColor(p['eudrRiskLevel'] as String?),
                    ),
                  ],
                ),
                if (p['deforestationFree'] == true) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.check_circle, size: 16, color: AppTheme.successGreen),
                      const SizedBox(width: 4),
                      const Text(
                        'Deforestation Free',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.successGreen,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Info grid
          _buildInfoSection('Plot Information', [
            _InfoRow('Plot Code', p['plotCode'] as String? ?? '-'),
            _InfoRow('Area', '${(p['areaHectares'] as num?)?.toStringAsFixed(1) ?? '-'} hectares'),
            _InfoRow('Plot Type', (p['plotType'] as String?) ?? '-'),
            _InfoRow('Soil Type', (p['soilType'] as String?)?.replaceAll('_', ' ') ?? '-'),
            _InfoRow('Irrigation', (p['irrigationType'] as String?)?.replaceAll('_', ' ') ?? '-'),
            _InfoRow('Ownership', (p['landOwnership'] as String?)?.replaceAll('_', ' ') ?? '-'),
          ]),
          const SizedBox(height: 16),

          // Location
          _buildInfoSection('Location', [
            if (p['centroidLat'] != null && p['centroidLng'] != null)
              _InfoRow('GPS Center',
                  '${(p['centroidLat'] as num).toStringAsFixed(4)}, ${(p['centroidLng'] as num).toStringAsFixed(4)}'),
            if (p['elevationM'] != null)
              _InfoRow('Elevation', '${p['elevationM']}m'),
            if (p['slopePercent'] != null)
              _InfoRow('Slope', '${p['slopePercent']}%'),
          ]),
          const SizedBox(height: 16),

          // Farmer
          if (p['farmerName'] != null)
            _buildInfoSection('Farmer', [
              _InfoRow('Name', p['farmerName'] as String),
            ]),
          const SizedBox(height: 16),

          // Quick actions
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  icon: Icons.gps_fixed,
                  label: 'GPS Verify',
                  color: const Color(0xFF3B82F6),
                  onTap: () => context.push('/plots/${widget.id}/verify'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildActionButton(
                  icon: Icons.shield,
                  label: 'EUDR Evidence',
                  color: AppTheme.primaryGreen,
                  onTap: () => context.push('/plots/${widget.id}/evidence'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(String title, List<_InfoRow> rows) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
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
          ),
          const SizedBox(height: 12),
          ...rows.map((row) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 100,
                      child: Text(
                        row.label,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        row.value,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Seasons Tab ────────────────────────────────────────────

  Widget _buildSeasonsTab() {
    final seasons = _plot?['seasons'] as List<dynamic>?;
    if (seasons == null || seasons.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.grain, size: 48, color: AppTheme.textSecondary),
            SizedBox(height: 12),
            Text('No seasons recorded',
                style: TextStyle(color: AppTheme.textSecondary)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: seasons.length,
      itemBuilder: (_, index) {
        final s = seasons[index] as Map<String, dynamic>;
        return _buildSeasonCard(s);
      },
    );
  }

  Widget _buildSeasonCard(Map<String, dynamic> s) {
    final status = s['status'] as String? ?? 'PLANNED';
    Color statusColor;
    switch (status) {
      case 'GROWING':
      case 'PLANTED':
        statusColor = AppTheme.primaryGreen;
        break;
      case 'HARVESTED':
      case 'COMPLETED':
        statusColor = const Color(0xFF3B82F6);
        break;
      default:
        statusColor = AppTheme.textSecondary;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
              Expanded(
                child: Text(
                  '${s['season']} - ${s['cropType'] as String? ?? ''}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              StatusBadge(label: status.replaceAll('_', ' '), color: statusColor),
            ],
          ),
          if (s['variety'] != null) ...[
            const SizedBox(height: 6),
            Text('Variety: ${s['variety']}',
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              if (s['plantingDate'] != null) ...[
                const Icon(Icons.calendar_today, size: 12, color: AppTheme.textSecondary),
                const SizedBox(width: 4),
                Text(
                  'Planted: ${_formatDate(s['plantingDate'])}',
                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
                const SizedBox(width: 12),
              ],
              if (s['yieldKg'] != null)
                Text(
                  '${(s['yieldKg'] as num).toStringAsFixed(0)} kg',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
            ],
          ),
          if (s['eudrCompliant'] == true) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.verified, size: 14, color: AppTheme.successGreen),
                const SizedBox(width: 4),
                Text('EUDR Compliant',
                    style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.successGreen,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ─── History Tab (Verifications + Documents) ────────────────

  Widget _buildHistoryTab() {
    final verifications = _plot?['recentVerifications'] as List<dynamic>?;
    final documents = _plot?['recentDocuments'] as List<dynamic>?;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Verification History',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        if (verifications == null || verifications.isEmpty)
          const Text('No verifications recorded',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        ...?verifications?.map((v) {
          final vm = v as Map<String, dynamic>;
          final isPassed = vm['result'] == 'PASSED';
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Icon(
                  isPassed ? Icons.check_circle : Icons.cancel,
                  color: isPassed ? AppTheme.successGreen : AppTheme.errorRed,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vm['verificationType'] as String? ?? '',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      if (vm['notes'] != null)
                        Text(
                          vm['notes'] as String,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      const SizedBox(height: 2),
                      Text(
                        vm['verifiedAt'] != null
                            ? _formatDate(vm['verifiedAt'])
                            : '',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppTheme.textSecondary.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ),
                if (vm['boundaryMatchPercent'] != null)
                  Text(
                    '${(vm['boundaryMatchPercent'] as num).toStringAsFixed(0)}%',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: (vm['boundaryMatchPercent'] as num) >= 90
                          ? AppTheme.successGreen
                          : AppTheme.accentAmber,
                    ),
                  ),
              ],
            ),
          );
        }),

        const SizedBox(height: 24),
        const Text(
          'Documents',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        if (documents == null || documents.isEmpty)
          const Text('No documents uploaded',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        ...?documents?.map((d) {
          final dm = d as Map<String, dynamic>;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Icon(
                  dm['isVerified'] == true
                      ? Icons.verified_user
                      : Icons.description_outlined,
                  color: dm['isVerified'] == true
                      ? AppTheme.successGreen
                      : AppTheme.textSecondary,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dm['title'] as String? ?? dm['docType'] as String? ?? 'Document',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      if (dm['issuedBy'] != null)
                        Text(
                          dm['issuedBy'] as String,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
                StatusBadge(
                  label: (dm['docType'] as String?)?.replaceAll('_', ' ') ?? '',
                  color: AppTheme.textSecondary,
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final dt = date is String ? DateTime.parse(date) : date as DateTime;
      return DateFormat('dd MMM yyyy').format(dt);
    } catch (_) {
      return date.toString();
    }
  }
}

class _InfoRow {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
}