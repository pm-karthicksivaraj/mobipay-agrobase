import 'package:flutter/material.dart';
import '../sync/sync_engine.dart';
import '../connectivity/connectivity_manager.dart';

/// SyncStatusWidget — shows a small indicator in the app bar or bottom.
///
/// Green dot + "Synced"     → all data synced, online
/// Yellow dot + "Pending: N" → N items waiting to sync (offline or pending)
/// Red dot + "Offline"       → no internet connection
/// Spinner + "Syncing..."    → actively syncing
///
/// Usage:
///   SyncStatusWidget() // in the app bar or a floating position
class SyncStatusWidget extends StatelessWidget {
  const SyncStatusWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final syncEngine = context.watch<SyncEngine>();
    final connectivity = context.watch<ConnectivityManager>();

    Color color;
    String label;
    IconData icon;
    bool animate = false;

    if (!connectivity.isOnline) {
      color = Colors.red;
      label = 'Offline';
      icon = Icons.cloud_off;
    } else if (syncEngine.status == SyncStatus.syncing) {
      color = Colors.blue;
      label = 'Syncing...';
      icon = Icons.sync;
      animate = true;
    } else if (syncEngine.hasPending) {
      color = Colors.amber;
      label = 'Pending: ${syncEngine.pendingCount}';
      icon = Icons.sync_problem;
    } else if (syncEngine.status == SyncStatus.error) {
      color = Colors.red;
      label = 'Sync Error';
      icon = Icons.error_outline;
    } else {
      color = Colors.green;
      label = 'Synced';
      icon = Icons.cloud_done;
    }

    return GestureDetector(
      onTap: () {
        if (connectivity.isOnline) {
          syncEngine.syncNow();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No internet connection. Data will sync when online.'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            animate
                ? SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                    ),
                  )
                : Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
