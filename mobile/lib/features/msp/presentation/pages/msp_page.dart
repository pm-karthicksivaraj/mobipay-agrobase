import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Mazao Safi Practices (MSP) — Mobile Screen
/// Shows the 10 crop verticals and their 1 Must + 5 Reduce practices.
/// Field officers can log practice adoptions for farmers.

final mspVariantsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  // TODO: Replace with actual API call to /api/farm5x/definitions
  return [
    {'variant': '1M5R', 'crop': 'Rice', 'icon': '🌾', 'target': '30-50% CH4'},
    {'variant': '1M5C', 'crop': 'Coffee', 'icon': '☕', 'target': '20-30% GHG'},
    {'variant': '1M5M', 'crop': 'Maize', 'icon': '🌽', 'target': '15-25% N2O'},
    {'variant': '1M5K', 'crop': 'Cocoa', 'icon': '🍫', 'target': '20-30% GHG'},
    {'variant': '1M5T', 'crop': 'Tea', 'icon': '🌱', 'target': '15-20% GHG'},
    {'variant': '1M5D', 'crop': 'Dairy', 'icon': '🐄', 'target': '10-20% CH4'},
    {'variant': '1M5V', 'crop': 'Vegetables', 'icon': '🥬', 'target': '15-25% N2O'},
    {'variant': '1M5O', 'crop': 'Orchard', 'icon': '🍎', 'target': '15-20% GHG'},
    {'variant': '1M5A', 'crop': 'Aquaculture', 'icon': '🐟', 'target': '10-15% GHG'},
    {'variant': '1M5F', 'crop': 'Forestry', 'icon': '🌳', 'target': '30-50% CO2'},
  ];
});

class MspPage extends ConsumerWidget {
  const MspPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final variantsAsync = ref.watch(mspVariantsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mazao Safi Practices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.pushNamed(context, '/msp/log');
            },
            tooltip: 'Log Practice Adoption',
          ),
        ],
      ),
      body: variantsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Failed to load: $err'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(mspVariantsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (variants) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: variants.length,
          itemBuilder: (context, index) {
            final v = variants[index];
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.green.shade50,
                  child: Text(v['icon'] as String, style: const TextStyle(fontSize: 20)),
                ),
                title: Text('${v['variant']} — ${v['crop']}'),
                subtitle: Text('Target: ${v['target']}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // Navigate to variant detail
                  Navigator.pushNamed(
                    context,
                    '/msp/detail',
                    arguments: v,
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

/// MSP Detail Page — shows 1 Must + 5 Reduce practices for a variant
class MspDetailPage extends ConsumerWidget {
  const MspDetailPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final variant = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;

    return Scaffold(
      appBar: AppBar(
        title: Text(variant?['variant'] ?? 'MSP Detail'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: Colors.green.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(variant?['icon'] ?? '', style: const TextStyle(fontSize: 32)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${variant?['variant']} — ${variant?['crop']}',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            Text('Target: ${variant?['target']}'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Practices',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          // TODO: Fetch practices from API
          _buildPracticeTile('⭐ MUST', 'Mandatory Practice', true),
          _buildPracticeTile('R1', 'Reduce Practice 1', false),
          _buildPracticeTile('R2', 'Reduce Practice 2', false),
          _buildPracticeTile('R3', 'Reduce Practice 3', false),
          _buildPracticeTile('R4', 'Reduce Practice 4', false),
          _buildPracticeTile('R5', 'Reduce Practice 5', false),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pushNamed(context, '/msp/log', arguments: variant);
            },
            icon: const Icon(Icons.add),
            label: const Text('Log Adoption'),
          ),
        ],
      ),
    );
  }

  Widget _buildPracticeTile(String code, String title, bool isMust) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isMust ? Colors.green : Colors.grey.shade200,
          child: Icon(
            isMust ? Icons.star : Icons.eco,
            color: isMust ? Colors.white : Colors.green,
          ),
        ),
        title: Text(title),
        subtitle: Text(code),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
