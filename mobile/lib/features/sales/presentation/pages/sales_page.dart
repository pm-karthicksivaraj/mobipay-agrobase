import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

class SalesPage extends StatefulWidget {
  const SalesPage({super.key});
  @override
  State<SalesPage> createState() => _SalesPageState();
}

class _SalesPageState extends State<SalesPage> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _sales = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _tabCtrl = TabController(length: 2, vsync: this); _load(); }
  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    final repo = context.read<OfflineRepository>();
    final sales = await repo.getSales();
    setState(() { _sales = sales; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    final produceSales = _sales.where((s) => (s['category'] ?? 'PRODUCE') == 'PRODUCE').toList();
    final inputSales = _sales.where((s) => s['category'] == 'INPUT').toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Sales'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: const [SyncStatusWidget(), SizedBox(width: 12)],
        bottom: TabBar(controller: _tabCtrl, indicatorColor: Colors.white, labelColor: Colors.white, unselectedLabelColor: Colors.white70, tabs: const [
          Tab(icon: Icon(Icons.grain, size: 18), text: 'Produce'),
          Tab(icon: Icon(Icons.shopping_bag, size: 18), text: 'Inputs'),
        ]),
      ),
      body: _loading ? const LoadingShimmer() : TabBarView(controller: _tabCtrl, children: [
        _buildList(produceSales, 'produce'),
        _buildList(inputSales, 'input'),
      ]),
      floatingActionButton: FloatingActionButton(onPressed: _showCreate, backgroundColor: AppTheme.primaryGreen, child: const Icon(Icons.add, color: Colors.white)),
    );
  }

  Widget _buildList(List<Map<String, dynamic>> sales, String type) {
    if (sales.isEmpty) return EmptyState(icon: Icons.receipt_outlined, title: 'No ${type == 'produce' ? 'Produce' : 'Input'} Sales', description: 'Record your first sale');
    return RefreshIndicator(onRefresh: _load, child: ListView.builder(padding: const EdgeInsets.all(16), itemCount: sales.length, itemBuilder: (_, i) {
      final s = sales[i];
      final total = s['totalAmount'] ?? 0;
      final net = s['netAmount'] ?? total;
      final syncStatus = s['syncStatus'] ?? 'synced';
      return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
        leading: CircleAvatar(backgroundColor: type == 'produce' ? Colors.green.shade50 : Colors.blue.shade50, child: Icon(type == 'produce' ? Icons.grain : Icons.shopping_bag, color: type == 'produce' ? Colors.green : Colors.blue)),
        title: Text(s['product'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('Qty: ${s['quantity'] ?? ''} · ${s['unitPrice'] != null ? '@ ${s['unitPrice']}/unit' : ''}'),
        trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('$total', style: const TextStyle(fontWeight: FontWeight.bold)),
          if (net != total) Text('Net: $net', style: const TextStyle(fontSize: 10, color: Colors.grey)),
          if (syncStatus == 'pending') Container(padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1), decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(4)), child: const Text('Pending', style: TextStyle(fontSize: 9, color: Colors.amber))),
        ]),
      ));
    }));
  }

  void _showCreate() {
    final productCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final chargesCtrl = TextEditingController();
    final taxCtrl = TextEditingController();
    String category = 'PRODUCE';
    double total = 0, net = 0;

    final produceOptions = ['Hulled Coffee', 'Cocoa', 'Cassava', 'Avocado', 'Vanilla', 'Jackfruit', 'Maize', 'Beans', 'Rice'];
    final inputOptions = ['Fertilizer', 'Tarpaulin', 'Seedlings', 'Pruning Saw', 'Pesticide', 'Tools'];

    showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => AlertDialog(
      title: const Text('Record Sale'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        DropdownButtonFormField(value: category, decoration: const InputDecoration(labelText: 'Category'), items: ['PRODUCE','INPUT'].map((e) => DropdownMenuItem(value: e, child: Text(e == 'PRODUCE' ? 'Produce' : 'Input'))).toList(), onChanged: (v) => ss(() { category = v!; productCtrl.clear(); })),
        const SizedBox(height: 12),
        DropdownButtonFormField(value: null, decoration: const InputDecoration(labelText: 'Product *'), items: (category == 'PRODUCE' ? produceOptions : inputOptions).map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => ss(() => productCtrl.text = v ?? '')),
        const SizedBox(height: 12),
        TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity (kg)'), onChanged: (v) => ss(() => total = (double.tryParse(v) ?? 0) * (double.tryParse(priceCtrl.text) ?? 0))),
        const SizedBox(height: 8),
        TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Unit Price'), onChanged: (v) => ss(() => total = (double.tryParse(qtyCtrl.text) ?? 0) * (double.tryParse(v) ?? 0))),
        const SizedBox(height: 8),
        TextField(controller: chargesCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Charges (optional)'), onChanged: (v) => ss(() => net = total - (double.tryParse(v) ?? 0) - (double.tryParse(taxCtrl.text) ?? 0))),
        const SizedBox(height: 8),
        TextField(controller: taxCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Tax (optional)'), onChanged: (v) => ss(() => net = total - (double.tryParse(chargesCtrl.text) ?? 0) - (double.tryParse(v) ?? 0))),
        const SizedBox(height: 12),
        Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)), child: Column(children: [
          Row(children: [const Icon(Icons.calculate, size: 14, color: Colors.green), const SizedBox(width: 4), Text('Total: $total', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600))]),
          if (net != total && net > 0) Row(children: [const Icon(Icons.calculate, size: 14, color: Colors.green), const SizedBox(width: 4), Text('Net: $net', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600))]),
        ])),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () async {
          if (productCtrl.text.isEmpty) return;
          await context.read<OfflineRepository>().createSale({
            'product': productCtrl.text, 'category': category,
            'quantity': qtyCtrl.text, 'unitPrice': double.tryParse(priceCtrl.text),
            'charges': double.tryParse(chargesCtrl.text), 'taxAmount': double.tryParse(taxCtrl.text),
          });
          if (ctx.mounted) Navigator.pop(ctx);
          _load();
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Sale recorded: ${productCtrl.text}'), backgroundColor: AppTheme.primaryGreen));
        }, child: const Text('Record Sale')),
      ],
    )));
  }
}
