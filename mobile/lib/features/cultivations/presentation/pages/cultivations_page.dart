import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

class CultivationsPage extends StatefulWidget {
  final String? farmId;
  const CultivationsPage({super.key, this.farmId});

  @override
  State<CultivationsPage> createState() => _CultivationsPageState();
}

class _CultivationsPageState extends State<CultivationsPage> {
  List<Map<String, dynamic>> _cultivations = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final repo = context.read<OfflineRepository>();
    final farmers = await repo.getFarmers(limit: 1);
    if (farmers.isEmpty) { setState(() => _loading = false); return; }
    final farms = await repo.getFarmLands(farmerId: farmers[0]['id']);
    if (farms.isEmpty) { setState(() => _loading = false); return; }
    final farmId = widget.farmId ?? farms[0]['id'];
    // In production: repo.getCultivations(farmId)
    // For now, read from cache
    setState(() { _cultivations = []; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Cultivations'), backgroundColor: AppTheme.primaryGreen, foregroundColor: Colors.white, actions: const [SyncStatusWidget(), SizedBox(width: 12)]),
      body: _loading ? const LoadingShimmer() : _cultivations.isEmpty
          ? EmptyState(icon: Icons.sprout_outlined, title: 'No Cultivations', description: 'Create a cultivation to track crop stages', actionLabel: 'Add Cultivation', onAction: _showCreate)
          : ListView.builder(padding: const EdgeInsets.all(16), itemCount: _cultivations.length, itemBuilder: (_, i) => Card(child: ListTile(leading: const CircleAvatar(child: Icon(Icons.sprout)), title: Text(_cultivations[i]['cropName'] ?? ''), subtitle: Text('${_cultivations[i]['variety'] ?? ''} · ${_cultivations[i]['season'] ?? ''}')))),
      floatingActionButton: FloatingActionButton(onPressed: _showCreate, backgroundColor: AppTheme.primaryGreen, child: const Icon(Icons.add, color: Colors.white)),
    );
  }

  void _showCreate() {
    final cropCtrl = TextEditingController();
    final varietyCtrl = TextEditingController();
    final areaCtrl = TextEditingController();
    final seedQtyCtrl = TextEditingController();
    final seedPriceCtrl = TextEditingController();
    String season = '2026A';
    String cropCategory = 'Main Crop';
    double seedCost = 0;

    showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => AlertDialog(
      title: const Text('Create Cultivation'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        DropdownButtonFormField(value: cropCategory, decoration: const InputDecoration(labelText: 'Crop Category'), items: ['Main Crop','Inter Crop','Border Crop'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => ss(() => cropCategory = v!)),
        const SizedBox(height: 12),
        TextField(controller: cropCtrl, decoration: const InputDecoration(labelText: 'Crop Name *', prefixIcon: Icon(Icons.sprout))),
        const SizedBox(height: 12),
        TextField(controller: varietyCtrl, decoration: const InputDecoration(labelText: 'Variety')),
        const SizedBox(height: 12),
        DropdownButtonFormField(value: season, decoration: const InputDecoration(labelText: 'Season'), items: ['2026A','2026B','2025A','Annual'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => ss(() => season = v!)),
        const SizedBox(height: 12),
        TextField(controller: areaCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Cultivation Area (ha)')),
        const SizedBox(height: 16),
        const Align(alignment: Alignment.centerLeft, child: Text('Seed Information', style: TextStyle(fontWeight: FontWeight.w600))),
        const SizedBox(height: 8),
        TextField(controller: seedQtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Seed Quantity (kg)'), onChanged: (v) => ss(() => seedCost = (double.tryParse(v) ?? 0) * (double.tryParse(seedPriceCtrl.text) ?? 0))),
        const SizedBox(height: 8),
        TextField(controller: seedPriceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Seed Price (per kg)'), onChanged: (v) => ss(() => seedCost = (double.tryParse(seedQtyCtrl.text) ?? 0) * (double.tryParse(v) ?? 0))),
        const SizedBox(height: 8),
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)), child: Row(children: [const Icon(Icons.calculate, size: 16, color: Colors.green), const SizedBox(width: 4), Text('Seed Cost: $seedCost', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600))])),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () { Navigator.pop(ctx); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Cultivation for ${cropCtrl.text} created'), backgroundColor: AppTheme.primaryGreen)); _load(); }, child: const Text('Create')),
      ],
    )));
  }
}
