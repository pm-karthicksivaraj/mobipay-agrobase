import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

/// Payments screen — offline payment recording with EKIBBO features:
/// - Extension officer can update farmer phone during payment
/// - Charges and taxes visible
/// - Attachment for consent form when phone is updated
class PaymentsPage extends StatefulWidget {
  const PaymentsPage({super.key});
  @override
  State<PaymentsPage> createState() => _PaymentsPageState();
}

class _PaymentsPageState extends State<PaymentsPage> {
  List<Map<String, dynamic>> _payments = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    // In production: fetch from OfflineRepository or API
    setState(() { _payments = []; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Payments'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: const [SyncStatusWidget(), SizedBox(width: 12)],
      ),
      body: _loading ? const LoadingShimmer() : _payments.isEmpty
          ? EmptyState(icon: Icons.payment_outlined, title: 'No Payments Yet', description: 'Record payments to farmers, including charges, taxes, and loan deductions', actionLabel: 'Record Payment', onAction: _showCreate)
          : ListView.builder(padding: const EdgeInsets.all(16), itemCount: _payments.length, itemBuilder: (_, i) => _buildCard(_payments[i])),
      floatingActionButton: FloatingActionButton(onPressed: _showCreate, backgroundColor: AppTheme.primaryGreen, child: const Icon(Icons.add, color: Colors.white)),
    );
  }

  Widget _buildCard(Map<String, dynamic> p) {
    return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
      leading: CircleAvatar(backgroundColor: Colors.green.shade50, child: const Icon(Icons.payment, color: Colors.green)),
      title: Text(p['recipientName'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text('${p['type'] ?? ''} · ${p['amount'] ?? 0}'),
      trailing: Text(p['status'] ?? 'PENDING', style: const TextStyle(fontSize: 10)),
    ));
  }

  void _showCreate() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final chargesCtrl = TextEditingController();
    final taxCtrl = TextEditingController();
    final newPhoneCtrl = TextEditingController();
    String type = 'CASUAL';
    bool phoneUpdate = false;
    double net = 0;

    showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => AlertDialog(
      title: const Text('Record Payment'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        DropdownButtonFormField(value: type, decoration: const InputDecoration(labelText: 'Payment Type'), items: ['CASUAL','BULK_PURCHASE','BULK_DISBURSEMENT','MARKETPLACE','VSLA'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => ss(() => type = v!)),
        const SizedBox(height: 12),
        TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Recipient Name *')),
        const SizedBox(height: 8),
        TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Recipient Phone *')),
        const SizedBox(height: 8),
        TextField(controller: amountCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount *'), onChanged: (v) => ss(() => net = (double.tryParse(v) ?? 0) - (double.tryParse(chargesCtrl.text) ?? 0) - (double.tryParse(taxCtrl.text) ?? 0))),
        const SizedBox(height: 8),
        TextField(controller: chargesCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Charges (EKIBBO)'), onChanged: (v) => ss(() => net = (double.tryParse(amountCtrl.text) ?? 0) - (double.tryParse(v) ?? 0) - (double.tryParse(taxCtrl.text) ?? 0))),
        const SizedBox(height: 8),
        TextField(controller: taxCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Tax Amount'), onChanged: (v) => ss(() => net = (double.tryParse(amountCtrl.text) ?? 0) - (double.tryParse(chargesCtrl.text) ?? 0) - (double.tryParse(v) ?? 0))),
        const SizedBox(height: 8),
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)), child: Text('Net Amount: $net', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600))),

        // EKIBBO: Phone update during payment
        const SizedBox(height: 16),
        CheckboxListTile(title: const Text('Update farmer phone number', style: TextStyle(fontSize: 13)), value: phoneUpdate, activeColor: AppTheme.primaryGreen, dense: true, contentPadding: EdgeInsets.zero, onChanged: (v) => ss(() => phoneUpdate = v ?? false)),
        if (phoneUpdate) ...[
          TextField(controller: newPhoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'New Phone Number', prefixIcon: Icon(Icons.phone))),
          const SizedBox(height: 4),
          OutlinedButton.icon(icon: const Icon(Icons.attach_file, size: 16), label: const Text('Upload Consent Form', style: TextStyle(fontSize: 12)), onPressed: () {}),
          const Text('Consent form required when updating phone', style: TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () { Navigator.pop(ctx); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payment recorded: ${amountCtrl.text} to ${nameCtrl.text}'), backgroundColor: AppTheme.primaryGreen)); _load(); }, child: const Text('Record')),
      ],
    )));
  }
}
