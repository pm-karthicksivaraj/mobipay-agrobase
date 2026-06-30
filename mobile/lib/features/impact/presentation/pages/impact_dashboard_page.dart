import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/kpi_card.dart';

/// Impact Dashboard — the farmer's personal impact view.
///
/// Shows:
///   - Climate Resilience Score (0-100) with 4-factor breakdown
///   - 5 KPI pillar summary (Income, Yield, Climate, Inclusion, Compliance)
///   - Practice adoption count
///   - Quick links to Practice Logger + My Passport
class ImpactDashboardPage extends StatefulWidget {
  const ImpactDashboardPage({super.key});

  @override
  State<ImpactDashboardPage> createState() => _ImpactDashboardPageState();
}

class _ImpactDashboardPageState extends State<ImpactDashboardPage> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final period = DateTime.now().toIso8601String().substring(0, 7);
      final res = await ApiClient().get(
        '/api/impact/dashboard?tier=farmer&period=$period',
      );
      if (res.statusCode == 200) {
        setState(() {
          _data = jsonDecode(res.body);
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load impact data';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Connection error: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Impact'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _loading
          ? const LoadingShimmer()
          : _error != null
              ? EmptyState(
                  icon: Icons.error_outline,
                  title: 'Something went wrong',
                  description: _error!,
                  actionLabel: 'Retry',
                  onAction: _loadData,
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: _buildContent(),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/impact/practices'),
        icon: const Icon(Icons.eco),
        label: const Text('Log Practice'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildContent() {
    final data = _data!;
    final farmer = data['farmer'] as Map<String, dynamic>? ?? {};
    final climateScore = data['climateScore'] as Map<String, dynamic>?;
    final practiceCount = data['practiceCount'] as int? ?? 0;
    final kpis = data['kpis'] as Map<String, dynamic>? ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Farmer header
        _buildFarmerHeader(farmer),
        const SizedBox(height: 16),

        // Climate Resilience Score — the hero card
        _buildClimateScoreCard(climateScore),
        const SizedBox(height: 16),

        // Practice adoption quick stat
        _buildPracticeCard(practiceCount),
        const SizedBox(height: 16),

        // KPI Pillars
        Text(
          'Impact Pillars',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        ..._buildPillarCards(kpis),

        const SizedBox(height: 16),

        // My Passport link
        _buildPassportLink(data['passport']),
        const SizedBox(height: 80), // FAB spacing
      ],
    );
  }

  Widget _buildFarmerHeader(Map<String, dynamic> farmer) {
    final name = '${farmer['firstName'] ?? ''} ${farmer['lastName'] ?? ''}';
    final code = farmer['farmerCode'] ?? '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: AppTheme.primaryGreen,
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  if (code.isNotEmpty)
                    Text(code,
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey[600])),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClimateScoreCard(Map<String, dynamic>? score) {
    final scoreValue = score?['score'] as int? ?? 0;
    final risk = score?['riskCategory'] as String? ?? 'NOT_SCORED';
    final trend = score?['trend'] as String?;
    final practice = score?['practicePoints'] as int? ?? 0;
    final yieldPts = score?['yieldPoints'] as int? ?? 0;
    final training = score?['trainingPoints'] as int? ?? 0;
    final climate = score?['climatePoints'] as int? ?? 0;

    final riskColor = risk == 'LOW_RISK'
        ? Colors.green
        : risk == 'MEDIUM_RISK'
            ? Colors.orange
            : risk == 'HIGH_RISK'
                ? Colors.red
                : Colors.grey;

    return Card(
      elevation: 4,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTheme.primaryGreen, AppTheme.primaryGreen.withOpacity(0.7)],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Climate Resilience Score',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (trend != null) _buildTrendBadge(trend),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '$scoreValue',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    height: 1,
                  ),
                ),
                const Text(
                  '/100',
                  style: TextStyle(color: Colors.white70, fontSize: 16),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: riskColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    risk.replaceAll('_', ' '),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // 4-factor breakdown
            _buildFactorBar('Practices', practice, 40, Colors.white),
            _buildFactorBar('Yield stability', yieldPts, 20, Colors.white),
            _buildFactorBar('Training', training, 20, Colors.white),
            _buildFactorBar('Climate exposure', climate, 20, Colors.white),
          ],
        ),
      ),
    );
  }

  Widget _buildFactorBar(String label, int value, int max, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
              width: 100,
              child: Text(label,
                  style: TextStyle(color: color.withOpacity(0.9), fontSize: 11))),
          Expanded(
            child: LinearProgressIndicator(
              value: max > 0 ? value / max : 0,
              backgroundColor: Colors.white24,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
          SizedBox(
              width: 40,
              child: Text('$value/$max',
                  style: TextStyle(color: color, fontSize: 11),
                  textAlign: TextAlign.right)),
        ],
      ),
    );
  }

  Widget _buildTrendBadge(String trend) {
    final icon = trend == 'IMPROVING'
        ? Icons.trending_up
        : trend == 'DECLINING'
            ? Icons.trending_down
            : Icons.trending_flat;
    final color = trend == 'IMPROVING'
        ? Colors.lightGreenAccent
        : trend == 'DECLINING'
            ? Colors.red[200]
            : Colors.white70;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(width: 2),
        Text(trend, style: TextStyle(color: color, fontSize: 10)),
      ],
    );
  }

  Widget _buildPracticeCard(int count) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.brown[100],
          child: const Icon(Icons.eco, color: Colors.brown),
        ),
        title: Text('$count practices adopted',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: const Text('Farm5x framework · tap to log a new practice'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/impact/practices'),
      ),
    );
  }

  List<Widget> _buildPillarCards(Map<String, dynamic> kpis) {
    final pillars = [
      {'key': 'INCOME', 'label': 'Income', 'icon': Icons.trending_up, 'color': Colors.green},
      {'key': 'YIELD', 'label': 'Yield', 'icon': Icons.grain, 'color': Colors.blue},
      {'key': 'CLIMATE', 'label': 'Climate', 'icon': Icons.eco, 'color': Colors.brown},
      {'key': 'INCLUSION', 'label': 'Inclusion', 'icon': Icons.people, 'color': Colors.pink},
      {'key': 'COMPLIANCE', 'label': 'Compliance', 'icon': Icons.verified, 'color': Colors.indigo},
    ];
    return pillars.map((p) {
      final pillarKpis = kpis[p['key'] as String] as List<dynamic>? ?? [];
      return Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ExpansionTile(
          leading: CircleAvatar(
            backgroundColor: (p['color'] as Color).withOpacity(0.1),
            child: Icon(p['icon'] as IconData, color: p['color'] as Color, size: 20),
          ),
          title: Text(p['label'] as String,
              style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text('${pillarKpis.length} KPIs'),
          children: pillarKpis.isEmpty
              ? [const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No KPIs computed yet for this period',
                      style: TextStyle(color: Colors.grey, fontSize: 12)),
                )]
              : pillarKpis.map((kpi) {
                  final k = kpi as Map<String, dynamic>;
                  return ListTile(
                    dense: true,
                    title: Text(k['definition']?['name'] ?? k['code'],
                        style: const TextStyle(fontSize: 13)),
                    trailing: Text(
                      '${k['value']} ${k['unit'] ?? ''}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  );
                }).toList(),
        ),
      );
    }).toList();
  }

  Widget _buildPassportLink(Map<String, dynamic>? passport) {
    if (passport == null) {
      return Card(
        child: ListTile(
          leading: const CircleAvatar(
            backgroundColor: Colors.grey,
            child: Icon(Icons.fingerprint, color: Colors.white),
          ),
          title: const Text('Impact Passport'),
          subtitle: const Text('Not yet generated'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/impact/passport'),
        ),
      );
    }
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppTheme.primaryGreen,
          child: const Icon(Icons.fingerprint, color: Colors.white),
        ),
        title: const Text('My Impact Passport',
            style: TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('ID: ${passport['passportId']}'),
        trailing: const Icon(Icons.qr_code, color: AppTheme.primaryGreen),
        onTap: () => context.push('/impact/passport'),
      ),
    );
  }
}
