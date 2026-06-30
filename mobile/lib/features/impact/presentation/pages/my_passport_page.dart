import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

/// My Passport — the farmer's Impact Passport with QR code.
///
/// Shows:
///   - Passport ID + verification URL (QR-scannable by EU buyers)
///   - Impact event ledger (hash-chained, tamper-evident)
///   - Chain integrity verification status
class MyPassportPage extends StatefulWidget {
  const MyPassportPage({super.key});

  @override
  State<MyPassportPage> createState() => _MyPassportPageState();
}

class _MyPassportPageState extends State<MyPassportPage> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _passport;
  List<dynamic> _ledger = [];
  Map<String, dynamic>? _verification;
  bool _verifying = false;

  @override
  void initState() {
    super.initState();
    _loadPassport();
    _loadLedger();
  }

  Future<void> _loadPassport() async {
    try {
      final res = await ApiClient().get('/api/traceability/passport');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _passport = data is Map ? data : (data is List && data.isNotEmpty ? data[0] : null);
          _loading = false;
        });
      } else {
        setState(() {
          _passport = null;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadLedger() async {
    try {
      final res = await ApiClient().get('/api/impact/ledger?farmerId=me&limit=50');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _ledger = data['ledger'] as List<dynamic>? ?? [];
        });
      }
    } catch (e) {
      // Silent — ledger is secondary
    }
  }

  Future<void> _verifyChain() async {
    setState(() => _verifying = true);
    try {
      final res = await ApiClient().get('/api/impact/ledger?farmerId=me&verify=true');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _verification = data['verification'];
          _verifying = false;
        });
      }
    } catch (e) {
      setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Impact Passport'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _passport != null ? () => _sharePassport() : null,
          ),
        ],
      ),
      body: _loading
          ? const LoadingShimmer()
          : _error != null
              ? EmptyState(
                  icon: Icons.error_outline,
                  title: 'Error',
                  description: _error!,
                  actionLabel: 'Retry',
                  onAction: () {
                    setState(() => _loading = true);
                    _loadPassport();
                    _loadLedger();
                  },
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildPassportCard(),
                    const SizedBox(height: 16),
                    _buildVerificationCard(),
                    const SizedBox(height: 16),
                    _buildLedgerSection(),
                  ],
                ),
    );
  }

  Widget _buildPassportCard() {
    if (_passport == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.fingerprint, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('Passport not generated yet',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                'Your impact passport is auto-generated once you have a baseline + at least one impact event.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    final passportId = _passport!['passportId'] ?? '';
    final verificationUrl = _passport!['verificationUrl'] ?? '';

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // QR code (mock — in production, generate from verificationUrl)
            Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.primaryGreen, width: 2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.qr_code, size: 100, color: AppTheme.primaryGreen),
                  const Text('Scan to verify', style: TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              passportId,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              verificationUrl,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildStat('Events', '${_ledger.length}'),
                _buildStat('Verified', _verification != null
                    ? (_verification!['valid'] == true ? '✓' : '✗')
                    : '—'),
                _buildStat('Active', _passport!['isActive'] == true ? 'Yes' : 'No'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildVerificationCard() {
    return Card(
      child: ListTile(
        leading: Icon(
          _verification == null
              ? Icons.verified_user_outlined
              : _verification!['valid'] == true
                  ? Icons.verified
                  : Icons.warning,
          color: _verification == null
              ? Colors.grey
              : _verification!['valid'] == true
                  ? Colors.green
                  : Colors.red,
        ),
        title: const Text('Chain integrity'),
        subtitle: _verification == null
            ? const Text('Tap to verify the hash chain is intact')
            : Text(_verification!['valid'] == true
                ? 'Valid · ${_verification!['eventsChecked']} events verified'
                : 'Broken at event ${_verification!['brokenAt']}: ${_verification!['reason']}'),
        trailing: _verifying
            ? const SizedBox(
                width: 20, height: 20,
                child: CircularProgressIndicator(strokeWidth: 2))
            : ElevatedButton(
                onPressed: _verifyChain,
                child: const Text('Verify'),
              ),
      ),
    );
  }

  Widget _buildLedgerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Impact Event Ledger',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${_ledger.length} events',
                style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
        const SizedBox(height: 8),
        if (_ledger.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Text(
                  'No impact events yet. Log a practice or complete a baseline to start your ledger.',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          )
        else
          ..._ledger.map((e) => _buildEventTile(e as Map<String, dynamic>)),
      ],
    );
  }

  Widget _buildEventTile(Map<String, dynamic> event) {
    final type = event['eventType'] as String? ?? '';
    final timestamp = event['timestamp'] as String? ?? '';
    final hash = event['hash'] as String? ?? '';
    final actorName = event['actorName'] as String? ?? '';

    final icon = _getEventIcon(type);
    final color = _getEventColor(type);

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 18),
        ),
        title: Text(_formatEventType(type),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        subtitle: Text(_formatDate(timestamp),
            style: const TextStyle(fontSize: 11)),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (actorName.isNotEmpty)
                  _buildDetailRow('Actor', actorName),
                _buildDetailRow('Hash', hash.substring(0, 24) + '...'),
                if (event['prevHash'] != null)
                  _buildDetailRow('Previous', (event['prevHash'] as String).substring(0, 24) + '...'),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    const JsonEncoder.withIndent('  ').convert(event['eventData']),
                    style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 70,
            child: Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
          ),
        ],
      ),
    );
  }

  IconData _getEventIcon(String type) {
    switch (type) {
      case 'BASELINE_CAPTURED': return Icons.flag;
      case 'PRACTICE_ADOPTED': return Icons.eco;
      case 'HARVEST': return Icons.agriculture;
      case 'TRAINING_COMPLETED': return Icons.school;
      case 'PAYMENT_RECEIVED': return Icons.payment;
      case 'PLOT_VERIFIED': return Icons.verified;
      case 'CERTIFICATION_ISSUED': return Icons.card_membership;
      case 'LOAN_DISBURSED': return Icons.account_balance;
      case 'LOAN_REPAID': return Icons.check_circle;
      default: return Icons.history;
    }
  }

  Color _getEventColor(String type) {
    switch (type) {
      case 'BASELINE_CAPTURED': return Colors.blue;
      case 'PRACTICE_ADOPTED': return Colors.green;
      case 'HARVEST': return Colors.amber;
      case 'PAYMENT_RECEIVED': return Colors.teal;
      case 'LOAN_DISBURSED': return Colors.indigo;
      case 'CERTIFICATION_ISSUED': return Colors.purple;
      default: return Colors.grey;
    }
  }

  String _formatEventType(String type) {
    return type.split('_').map((w) =>
      w[0] + w.substring(1).toLowerCase()
    ).join(' ');
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) { return iso; }
  }

  void _sharePassport() {
    // In production, use share_plus package
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Share: ${_passport!['verificationUrl']}'),
      ),
    );
  }
}
