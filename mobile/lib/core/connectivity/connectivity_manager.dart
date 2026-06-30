import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// ConnectivityManager — detects online/offline state and broadcasts changes.
///
/// Usage:
///   final cm = ConnectivityManager();
///   cm.initialize();
///   cm.isOnline; // true/false
///   cm.stream.listen((online) => ...); // real-time updates
///
/// In the UI:
///   final isOnline = context.watch<ConnectivityManager>().isOnline;
///   // or use the SyncStatusWidget
class ConnectivityManager extends ChangeNotifier {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  bool _isOnline = true;
  String _connectionType = 'wifi'; // wifi | mobile | none
  DateTime? _lastOnlineAt;
  DateTime? _lastOfflineAt;

  bool get isOnline => _isOnline;
  String get connectionType => _connectionType;
  DateTime? get lastOnlineAt => _lastOnlineAt;
  DateTime? get lastOfflineAt => _lastOfflineAt;

  /// Stream of online/offline changes
  Stream<bool> get onlineStream {
    final controller = StreamController<bool>.broadcast();
    addListener(() {
      controller.add(_isOnline);
    });
    return controller.stream;
  }

  /// Initialize connectivity monitoring
  Future<void> initialize() async {
    // Check initial state
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);

    // Listen for changes
    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      _updateStatus(result);
    });
  }

  void _updateStatus(List<ConnectivityResult> result) {
    final wasOnline = _isOnline;

    // Consider online if any connection type is present (wifi, mobile, ethernet)
    _isOnline = result.any((r) =>
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.ethernet);

    if (_isOnline) {
      _connectionType = result.contains(ConnectivityResult.wifi)
          ? 'wifi'
          : result.contains(ConnectivityResult.mobile)
              ? 'mobile'
              : 'ethernet';
      _lastOnlineAt = DateTime.now();
    } else {
      _connectionType = 'none';
      _lastOfflineAt = DateTime.now();
    }

    // Only notify if state actually changed
    if (wasOnline != _isOnline) {
      debugPrint('[Connectivity] ${_isOnline ? "ONLINE ($_connectionType)" : "OFFLINE"}');
      notifyListeners();
    }
  }

  /// Force a connectivity check (e.g., before a critical operation)
  Future<bool> checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);
    return _isOnline;
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
