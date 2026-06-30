import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../core/sync/offline_repository.dart';
import '../../../../core/sync/sync_engine.dart';
import '../../../../core/sync/sync_status_widget.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';

/// Farm Lands screen — list + create farm lands with offline GPS polygon.
class FarmLandsPage extends StatefulWidget {
  const FarmLandsPage({super.key});

  @override
  State<FarmLandsPage> createState() => _FarmLandsPageState();
}

class _FarmLandsPageState extends State<FarmLandsPage> {
  List<Map<String, dynamic>> _farms = [];
  bool _loading = true;
  String? _farmerId;

  @override
  void initState() {
    super.initState();
    _loadFarms();
  }

  Future<void> _loadFarms() async {
    final repo = context.read<OfflineRepository>();
    try {
      final farmers = await repo.getFarmers(limit: 1);
      if (farmers.isNotEmpty) {
        _farmerId = farmers[0]['id'];
        final farms = await repo.getFarmLands(farmerId: _farmerId);
        setState(() { _farms = farms; _loading = false; });
      } else {
        setState(() { _loading = false; });
      }
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Farm Lands'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: const [SyncStatusWidget(), SizedBox(width: 12)],
      ),
      body: _loading
          ? const LoadingShimmer()
          : _farms.isEmpty
              ? EmptyState(
                  icon: Icons.landscape_outlined,
                  title: 'No Farm Lands Yet',
                  description: 'Create your first farm land with GPS boundary',
                  actionLabel: 'Create Farm Land',
                  onAction: _showCreateDialog,
                )
              : RefreshIndicator(
                  onRefresh: _loadFarms,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _farms.length,
                    itemBuilder: (context, index) => _buildFarmCard(_farms[index]),
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        backgroundColor: AppTheme.primaryGreen,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildFarmCard(Map<String, dynamic> farm) {
    final name = farm['name'] ?? 'Unnamed';
    final size = farm['sizeHectares'];
    final ownership = farm['landOwnership'] ?? 'Unknown';
    final water = farm['waterSource'] ?? 'N/A';
    final syncStatus = farm['syncStatus'] ?? 'synced';
    final hasPolygon = farm['boundaryGeoJson'] != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ExpansionTile(
        leading: CircleAvatar(backgroundColor: AppTheme.lightGreen, child: Icon(Icons.landscape, color: AppTheme.primaryGreen, size: 20)),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Row(children: [
          if (size != null) Padding(padding: const EdgeInsets.only(right: 8), child: Text('${size.toStringAsFixed(2)} ha', style: const TextStyle(fontSize: 12))),
          if (syncStatus == 'pending')
            Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(8)), child: const Text('Pending', style: TextStyle(fontSize: 10, color: Colors.amber)))
          else
            Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(8)), child: const Text('Synced', style: TextStyle(fontSize: 10, color: Colors.green))),
        ]),
        children: [
          Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _row('Ownership', ownership), _row('Water Source', water), _row('GPS Polygon', hasPolygon ? 'Captured' : 'Not captured'),
            const SizedBox(height: 8),
            OutlinedButton.icon(icon: const Icon(Icons.sprout, size: 16), label: const Text('Add Cultivation'), onPressed: () => context.push('/cultivations?farmId=${farm['id']}')),
          ])),
        ],
      ),
    );
  }

  Widget _row(String l, String v) => Padding(padding: const EdgeInsets.only(bottom: 4), child: Row(children: [SizedBox(width: 100, child: Text(l, style: TextStyle(fontSize: 12, color: Colors.grey[600]))), Expanded(child: Text(v, style: const TextStyle(fontSize: 13)))]));

  void _showCreateDialog() {
    final nameCtrl = TextEditingController();
    final sizeCtrl = TextEditingController();
    String ownership = 'Owned', water = 'Rainfed';
    List<Map<String, double>> pts = [];
    bool capturing = false;

    showDialog(context: context, builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => AlertDialog(
      title: const Text('Create Farm Land'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Farm/Plot Name *', prefixIcon: Icon(Icons.landscape))),
        const SizedBox(height: 12),
        TextField(controller: sizeCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Area (ha)', prefixIcon: Icon(Icons.straighten))),
        const SizedBox(height: 12),
        DropdownButtonFormField(value: ownership, decoration: const InputDecoration(labelText: 'Ownership'), items: ['Owned','Rent','Lease'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => ss(() => ownership = v!)),
        const SizedBox(height: 12),
        DropdownButtonFormField(value: water, decoration: const InputDecoration(labelText: 'Water Source'), items: ['Rainfed','Well','Bore Well','Pump','Canal'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) => ss(() => water = v!)),
        const SizedBox(height: 16),
        Row(children: [const Text('GPS Boundary', style: TextStyle(fontWeight: FontWeight.w600)), const Spacer(), if (capturing) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) else Text('${pts.length} pts', style: TextStyle(fontSize: 12, color: Colors.grey[600]))]),
        const SizedBox(height: 8),
        OutlinedButton.icon(icon: const Icon(Icons.my_location, size: 16), label: Text(pts.isEmpty ? 'Add GPS Point' : 'Add Another'), onPressed: () async {
          ss(() => capturing = true);
          final pos = await _getGPS();
          if (pos != null) ss(() => pts.add({'lat': pos.latitude, 'lng': pos.longitude}));
          ss(() => capturing = false);
        }),
        if (pts.length >= 3) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Area: ${_area(pts).toStringAsFixed(2)} ha', style: TextStyle(fontSize: 12, color: AppTheme.primaryGreen, fontWeight: FontWeight.w600)))),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ElevatedButton(onPressed: () async {
          if (nameCtrl.text.isEmpty) return;
          await context.read<OfflineRepository>().createFarmLand({'farmerId': _farmerId, 'name': nameCtrl.text, 'sizeHectares': double.tryParse(sizeCtrl.text), 'landOwnership': ownership, 'waterSource': water, 'polygonPoints': pts.isNotEmpty ? pts : null});
          if (ctx.mounted) Navigator.pop(ctx);
          _loadFarms();
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Farm "${nameCtrl.text}" created'), backgroundColor: AppTheme.primaryGreen));
        }, child: const Text('Create')),
      ],
    )));
  }

  Future<Position?> _getGPS() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return null;
      return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high, timeLimit: const Duration(seconds: 15));
    } catch (_) { return null; }
  }

  double _area(List<Map<String, double>> p) {
    if (p.length < 3) return 0;
    double a = 0;
    for (int i = 0; i < p.length; i++) { final j = (i + 1) % p.length; a += p[i]['lng']! * p[j]['lat']! - p[j]['lng']! * p[i]['lat']!; }
    return ((a / 2).abs() * 110.574 * 111.32 * 100).roundToDouble() / 100;
  }
}
