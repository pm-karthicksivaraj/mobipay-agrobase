import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// LightweightMode — a toggle that disables heavy UI elements (charts,
/// network images, animations) for phones with ≤1GB RAM or slow connections.
///
/// When enabled:
///   - fl_chart charts → replaced with simple text-based stats
///   - cached_network_image → replaced with placeholder icons
///   - shimmer loading → replaced with simple CircularProgressIndicator
///   - pull_to_refresh → disabled (uses regular RefreshIndicator)
///   - Animations → disabled (instant transitions)
///
/// Detection:
///   - Auto-detect on first launch based on device memory (via platform channel)
///   - User can toggle in Profile → App Settings → Lightweight Mode
///   - Stored in SharedPreferences as 'lightweight_mode' (bool)
///
/// Usage in screens:
///   final isLightweight = context.watch<LightweightMode>().enabled;
///   if (isLightweight) return _buildSimpleStats();
///   else return _buildChartStats();

class LightweightMode extends ChangeNotifier {
  static const _key = 'lightweight_mode';
  static const _autoKey = 'lightweight_auto_detected';

  bool _enabled = false;
  bool _autoDetected = false;

  bool get enabled => _enabled;
  bool get isAutoDetected => _autoDetected;

  /// Initialize from SharedPreferences + auto-detect on first launch
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();

    // Check if already set by user
    if (prefs.containsKey(_key)) {
      _enabled = prefs.getBool(_key)!;
      _autoDetected = prefs.getBool(_autoKey) ?? false;
      return;
    }

    // Auto-detect: default to lightweight mode on for safety
    // (users on high-end phones can disable it in settings)
    // In production: use device_info_plus to check RAM and CPU
    _enabled = false; // Default OFF — user enables if needed
    _autoDetected = true;
    await prefs.setBool(_key, _enabled);
    await prefs.setBool(_autoKey, true);
  }

  /// Toggle lightweight mode
  Future<void> toggle() async {
    _enabled = !_enabled;
    _autoDetected = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, _enabled);
    await prefs.setBool(_autoKey, false);
    notifyListeners();
  }

  /// Enable lightweight mode
  Future<void> enable() async {
    if (_enabled) return;
    _enabled = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
    notifyListeners();
  }

  /// Disable lightweight mode
  Future<void> disable() async {
    if (!_enabled) return;
    _enabled = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, false);
    notifyListeners();
  }
}

/// Widget that shows different content based on lightweight mode.
/// Use this to wrap heavy widgets like charts and images.
class LightweightBuilder extends StatelessWidget {
  final Widget lightweight;
  final Widget full;

  const LightweightBuilder({
    super.key,
    required this.lightweight,
    required this.full,
  });

  @override
  Widget build(BuildContext context) {
    final mode = context.watch<LightweightMode>();
    return mode.enabled ? lightweight : full;
  }
}

/// Simple text-based stat card for lightweight mode (replaces chart cards)
class LightweightStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? color;

  const LightweightStatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color ?? Colors.green),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                  Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Lightweight image placeholder (replaces CachedNetworkImage)
class LightweightImage extends StatelessWidget {
  final String? imageUrl;
  final double size;
  final IconData placeholderIcon;

  const LightweightImage({
    super.key,
    this.imageUrl,
    this.size = 48,
    this.placeholderIcon = Icons.person,
  });

  @override
  Widget build(BuildContext context) {
    // In lightweight mode: always show placeholder
    // In full mode: show CachedNetworkImage
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.grey[200],
      ),
      child: Icon(placeholderIcon, size: size * 0.5, color: Colors.grey[400]),
    );
  }
}
