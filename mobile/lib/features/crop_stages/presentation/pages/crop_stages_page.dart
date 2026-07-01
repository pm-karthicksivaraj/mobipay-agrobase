import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Crop Stage Library — Mobile Screen
/// Shows the 10 crop verticals (CoffeeCore, LiveCore, CropCore, etc.)
/// and their stage definitions.

final cropVerticalsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  // TODO: Replace with API call to /api/crop-stages/definitions
  return [
    {'id': 'coffeecore', 'name': 'CoffeeCore', 'label': 'Coffee & Cocoa', 'icon': '☕', 'stages': 12, 'fields': 80},
    {'id': 'livecore', 'name': 'LiveCore', 'label': 'Livestock & Dairy', 'icon': '🐄', 'stages': 20, 'fields': 120},
    {'id': 'cropcore', 'name': 'CropCore', 'label': 'Field Crops', 'icon': '🌽', 'stages': 11, 'fields': 60},
    {'id': 'orchardcore', 'name': 'OrchardCore', 'label': 'Orchard Fruits', 'icon': '🍎', 'stages': 12, 'fields': 70},
    {'id': 'vegcore', 'name': 'VegCore', 'label': 'Vegetables', 'icon': '🥬', 'stages': 10, 'fields': 50},
    {'id': 'floracore', 'name': 'FloraCore', 'label': 'Floriculture', 'icon': '🌺', 'stages': 9, 'fields': 40},
    {'id': 'aquacore', 'name': 'AquaCore', 'label': 'Aquaculture', 'icon': '🐟', 'stages': 15, 'fields': 90},
    {'id': 'forestcore', 'name': 'ForestCore', 'label': 'Forestry', 'icon': '🌳', 'stages': 11, 'fields': 55},
    {'id': 'timbercore', 'name': 'TimberCore', 'label': 'Timber Tracking', 'icon': '🌲', 'stages': 10, 'fields': 45},
    {'id': 'mangrovecore', 'name': 'MangroveCore', 'label': 'Mangrove Restoration', 'icon': '🌿', 'stages': 9, 'fields': 35},
  ];
});

class CropStagesPage extends ConsumerWidget {
  const CropStagesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final verticalsAsync = ref.watch(cropVerticalsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Crop Stage Library')),
      body: verticalsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed: $err')),
        data: (verticals) => GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.1,
          ),
          itemCount: verticals.length,
          itemBuilder: (context, index) {
            final v = verticals[index];
            return Card(
              child: InkWell(
                onTap: () {
                  Navigator.pushNamed(context, '/crop-stages/detail', arguments: v);
                },
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(v['icon'] as String, style: const TextStyle(fontSize: 32)),
                      const SizedBox(height: 8),
                      Text(
                        v['name'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Text(
                        v['label'] as String,
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Chip(
                            label: Text('${v['stages']} stages'),
                            padding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          ),
                          const SizedBox(width: 4),
                          Chip(
                            label: Text('${v['fields']} fields'),
                            padding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
