import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Cost of Cultivation — Mobile Screen
/// Shows per-cultivation cost breakdown (seed cost, sowing cost, total, profit).

final cultivationsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  // TODO: Replace with API call to /api/cultivations
  return [
    {
      'crop': 'Coffee Arabica',
      'farm': 'Kibale Plot 1',
      'area': 1.5,
      'seedCost': 25000,
      'sowingCost': 75000,
      'total': 100000,
      'estYield': 750,
    },
    {
      'crop': 'Maize',
      'farm': 'Wakiso Maize Field',
      'area': 2.0,
      'seedCost': 15000,
      'sowingCost': 100000,
      'total': 115000,
      'estYield': 1000,
    },
  ];
});

class CostOfCultivationPage extends ConsumerWidget {
  const CostOfCultivationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cultivationsAsync = ref.watch(cultivationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Cost of Cultivation')),
      body: cultivationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed: $err')),
        data: (cultivations) {
          if (cultivations.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.calculate, size: 48, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No cultivations yet'),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/cultivations/new'),
                    child: const Text('Add Cultivation'),
                  ),
                ],
              ),
            );
          }

          final totalCost = cultivations.fold<double>(
            0, (sum, c) => sum + (c['total'] as num).toDouble(),
          );
          final totalArea = cultivations.fold<double>(
            0, (sum, c) => sum + (c['area'] as num).toDouble(),
          );

          return Column(
            children: [
              // Summary cards
              Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: _SummaryCard(
                        title: 'Total Cost',
                        value: 'UGX ${totalCost.toStringAsFixed(0)}',
                        icon: Icons.payments,
                        color: Colors.amber,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _SummaryCard(
                        title: 'Total Area',
                        value: '${totalArea.toStringAsFixed(1)} ha',
                        icon: Icons.landscape,
                        color: Colors.blue,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _SummaryCard(
                        title: 'Cost/ha',
                        value: 'UGX ${totalArea > 0 ? (totalCost / totalArea).toStringAsFixed(0) : '0'}',
                        icon: Icons.trending_up,
                        color: Colors.purple,
                      ),
                    ),
                  ],
                ),
              ),
              // List
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: cultivations.length,
                  itemBuilder: (context, index) {
                    final c = cultivations[index];
                    return Card(
                      child: ExpansionTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.green.shade50,
                          child: const Icon(Icons.sprout, color: Colors.green),
                        ),
                        title: Text(c['crop'] as String),
                        subtitle: Text('${c['farm']} · ${c['area']} ha'),
                        trailing: Text(
                          'UGX ${(c['total'] as num).toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                _CostRow(label: 'Seed Cost', amount: (c['seedCost'] as num).toDouble()),
                                _CostRow(label: 'Sowing Cost', amount: (c['sowingCost'] as num).toDouble()),
                                const Divider(),
                                _CostRow(
                                  label: 'Total Cost',
                                  amount: (c['total'] as num).toDouble(),
                                  isBold: true,
                                ),
                                _CostRow(
                                  label: 'Cost per ha',
                                  amount: (c['total'] as num).toDouble() / (c['area'] as num).toDouble(),
                                ),
                                _CostRow(
                                  label: 'Est. Yield',
                                  amount: (c['estYield'] as num).toDouble(),
                                  suffix: ' kg',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            Text(title, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _CostRow extends StatelessWidget {
  final String label;
  final double amount;
  final bool isBold;
  final String suffix;

  const _CostRow({
    required this.label,
    required this.amount,
    this.isBold = false,
    this.suffix = '',
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isBold ? null : Colors.grey,
            ),
          ),
          Text(
            'UGX ${amount.toStringAsFixed(0)}$suffix',
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
