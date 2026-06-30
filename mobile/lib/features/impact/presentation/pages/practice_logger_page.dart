import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../shared/widgets/status_badge.dart';

/// Practice Logger — log a Farm5x practice adoption in 30 seconds.
///
/// Flow: select crop → select practice → capture photo (optional) → submit.
/// Triggers a PRACTICE_ADOPTED event in the impact ledger.
class PracticeLoggerPage extends StatefulWidget {
  const PracticeLoggerPage({super.key});

  @override
  State<PracticeLoggerPage> createState() => _PracticeLoggerPageState();
}

class _PracticeLoggerPageState extends State<PracticeLoggerPage> {
  String? _selectedCrop;
  String? _selectedVariant;
  String? _selectedPractice;
  bool _isMandatory = false;
  final _notesController = TextEditingController();
  bool _submitting = false;

  // Farm5x variants by crop
  static const Map<String, Map<String, List<Map<String, String>>>> FARM5X = {
    'COFFEE': {
      'variant': '1M5C',
      'practices': [
        {'code': '1M5C_MUST', 'label': 'Shade tree integration (30% canopy)', 'mandatory': 'true'},
        {'code': '1M5C_R1', 'label': 'Organic mulch with coffee pulp compost', 'mandatory': 'false'},
        {'code': '1M5C_R2', 'label': 'Precision pruning (4-stem system)', 'mandatory': 'false'},
        {'code': '1M5C_R3', 'label': 'Integrated pest management', 'mandatory': 'false'},
        {'code': '1M5C_R4', 'label': 'Water harvesting trenches', 'mandatory': 'false'},
        {'code': '1M5C_R5', 'label': 'Annual soil testing + liming', 'mandatory': 'false'},
      ],
    },
    'MAIZE': {
      'variant': '1M5M',
      'practices': [
        {'code': '1M5M_MUST', 'label': 'Conservation agriculture: no-till', 'mandatory': 'true'},
        {'code': '1M5M_R1', 'label': 'Precision fertilisation (4R)', 'mandatory': 'false'},
        {'code': '1M5M_R2', 'label': 'Cover crops (mucuna, lablab)', 'mandatory': 'false'},
        {'code': '1M5M_R3', 'label': 'Crop rotation with legumes', 'mandatory': 'false'},
        {'code': '1M5M_R4', 'label': 'Drought-tolerant varieties (Longe 10H)', 'mandatory': 'false'},
        {'code': '1M5M_R5', 'label': 'Post-harvest hermetic storage', 'mandatory': 'false'},
      ],
    },
    'COCOA': {
      'variant': '1M5K',
      'practices': [
        {'code': '1M5K_MUST', 'label': 'Agroforestry shade system', 'mandatory': 'true'},
        {'code': '1M5K_R1', 'label': 'Organic pod-borer composting', 'mandatory': 'false'},
        {'code': '1M5K_R2', 'label': 'Phosphorus-efficient fertilisation', 'mandatory': 'false'},
        {'code': '1M5K_R3', 'label': 'Black pod disease management', 'mandatory': 'false'},
        {'code': '1M5K_R4', 'label': 'Pruning for aeration', 'mandatory': 'false'},
        {'code': '1M5K_R5', 'label': 'Youth participation in replanting', 'mandatory': 'false'},
      ],
    },
    'TEA': {
      'variant': '1M5T',
      'practices': [
        {'code': '1M5T_MUST', 'label': 'Soil conservation: contour + mulching', 'mandatory': 'true'},
        {'code': '1M5T_R1', 'label': 'Precision nitrogen (urea split-dose)', 'mandatory': 'false'},
        {'code': '1M5T_R2', 'label': 'IPM (red spider mite)', 'mandatory': 'false'},
        {'code': '1M5T_R3', 'label': 'Drought-resistant clones', 'mandatory': 'false'},
        {'code': '1M5T_R4', 'label': 'Pruning cycle optimisation', 'mandatory': 'false'},
        {'code': '1M5T_R5', 'label': 'Worker welfare programs', 'mandatory': 'false'},
      ],
    },
    'DAIRY': {
      'variant': '1M5D',
      'practices': [
        {'code': '1M5D_MUST', 'label': 'Improved forage (brachiaria + desmodium)', 'mandatory': 'true'},
        {'code': '1M5D_R1', 'label': 'Feed additive (3-NOP or tannin)', 'mandatory': 'false'},
        {'code': '1M5D_R2', 'label': 'Rotational grazing (8-paddock)', 'mandatory': 'false'},
        {'code': '1M5D_R3', 'label': 'Animal health + vaccination', 'mandatory': 'false'},
        {'code': '1M5D_R4', 'label': 'Breed improvement (Friesian crosses)', 'mandatory': 'false'},
        {'code': '1M5D_R5', 'label': 'Biogas capture from manure', 'mandatory': 'false'},
      ],
    },
  };

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Log a Practice'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Step 1: Select crop
          _buildSection('1. Select crop', Icons.grain),
          const SizedBox(height: 8),
          _buildCropSelector(),
          const SizedBox(height: 24),

          // Step 2: Select practice (only if crop selected)
          if (_selectedCrop != null) ...[
            _buildSection('2. Select practice ($_selectedVariant)', Icons.eco),
            const SizedBox(height: 8),
            _buildPracticeSelector(),
            const SizedBox(height: 24),
          ],

          // Step 3: Notes (optional)
          if (_selectedPractice != null) ...[
            _buildSection('3. Notes (optional)', Icons.note),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'e.g. Planted 12 banana shade trees on the north border...',
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Submit button
          if (_selectedPractice != null)
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryGreen,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Submit Practice Adoption'),
              ),
            ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSection(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryGreen),
        const SizedBox(width: 8),
        Text(title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildCropSelector() {
    return Wrap(
      spacing: 8,
      children: FARM5X.keys.map((crop) {
        final selected = _selectedCrop == crop;
        final emoji = crop == 'COFFEE' ? '☕' : crop == 'MAIZE' ? '🌽' : crop == 'COCOA' ? '🍫' : crop == 'TEA' ? '🍵' : '🐄';
        return ChoiceChip(
          label: Text('$emoji $crop'),
          selected: selected,
          onSelected: (_) {
            setState(() {
              _selectedCrop = crop;
              _selectedVariant = FARM5X[crop]!['variant'] as String;
              _selectedPractice = null;
            });
          },
          selectedColor: AppTheme.primaryGreen,
          labelStyle: TextStyle(color: selected ? Colors.white : Colors.black87),
        );
      }).toList(),
    );
  }

  Widget _buildPracticeSelector() {
    final practices = FARM5X[_selectedCrop]!['practices'] as List<Map<String, String>>;
    return Column(
      children: practices.map((p) {
        final selected = _selectedPractice == p['code'];
        final isMust = p['mandatory'] == 'true';
        return Card(
          margin: const EdgeInsets.only(bottom: 6),
          color: selected ? AppTheme.primaryGreen.withOpacity(0.1) : null,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: selected
                ? BorderSide(color: AppTheme.primaryGreen, width: 2)
                : BorderSide.none,
          ),
          child: ListTile(
            leading: Icon(
              isMust ? Icons.star : Icons.check_circle_outline,
              color: isMust ? Colors.amber : AppTheme.primaryGreen,
            ),
            title: Text(p['label']!,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            subtitle: isMust
                ? const Text('Mandatory (1 Must)', style: TextStyle(fontSize: 11, color: Colors.amber))
                : const Text('Reduce practice', style: TextStyle(fontSize: 11)),
            trailing: selected
                ? Icon(Icons.check_circle, color: AppTheme.primaryGreen)
                : null,
            onTap: () {
              setState(() {
                _selectedPractice = p['code'];
                _isMandatory = isMust;
              });
            },
          ),
        );
      }).toList(),
    );
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final res = await ApiClient().post('/api/practices/adopt', body: {
        'farmerId': 'me', // server resolves from auth context
        'practiceCode': _selectedPractice,
        'cropType': _selectedCrop,
        'frameworkVariant': _selectedVariant,
        'isMandatory': _isMandatory,
        'notes': _notesController.text.isEmpty ? null : _notesController.text,
      });
      if (res.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✓ Practice adopted! Impact score will update tonight.'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.of(context).pop();
        }
      } else {
        final err = jsonDecode(res.body);
        throw Exception(err['error'] ?? 'Failed to submit');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}
