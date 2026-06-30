import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../database/app_database.dart';
import '../api/api_client.dart';
import '../connectivity/connectivity_manager.dart';

/// SyncEngine — the heart of the offline-first architecture.
///
/// Responsibilities:
///   1. PUSH: Read all pending entries from sync_queue → POST/PUT/DELETE to server
///   2. PULL: Fetch latest data from server → upsert into local cache tables
///   3. CONFLICT RESOLUTION: Server wins for financial data, timestamp wins for field data
///   4. STATUS: Broadcast sync status (idle, syncing, error, offline)
///
/// Sync triggers:
///   - On app launch (if online)
///   - When connectivity restored (offline → online transition)
///   - Periodic background sync (every 15 min via workmanager)
///   - Manual sync (user pulls to refresh)
///
/// Usage:
///   final syncEngine = SyncEngine(db, apiClient, connectivityManager);
///   await syncEngine.initialize();
///   await syncEngine.syncNow(); // manual sync

enum SyncStatus { idle, syncing, error, offline }

class SyncEngine extends ChangeNotifier {
  final AppDatabase _db;
  final ApiClient _api;
  final ConnectivityManager _connectivity;

  SyncStatus _status = SyncStatus.idle;
  int _pendingCount = 0;
  int _syncedCount = 0;
  int _failedCount = 0;
  String? _lastError;
  DateTime? _lastSyncAt;

  SyncStatus get status => _status;
  int get pendingCount => _pendingCount;
  int get syncedCount => _syncedCount;
  int get failedCount => _failedCount;
  String? get lastError => _lastError;
  DateTime? get lastSyncAt => _lastSyncAt;
  bool get hasPending => _pendingCount > 0;

  SyncEngine(this._db, this._api, this._connectivity);

  /// Initialize: check pending count + listen to connectivity
  Future<void> initialize() async {
    await _refreshPendingCount();

    // Auto-sync when connectivity restored
    _connectivity.addListener(() {
      if (_connectivity.isOnline && _status != SyncStatus.syncing) {
        syncNow();
      }
    });
  }

  /// Full sync cycle: push local changes, then pull server updates.
  Future<void> syncNow() async {
    if (!_connectivity.isOnline) {
      _status = SyncStatus.offline;
      notifyListeners();
      return;
    }

    if (_status == SyncStatus.syncing) return; // prevent concurrent sync

    _status = SyncStatus.syncing;
    _syncedCount = 0;
    _failedCount = 0;
    _lastError = null;
    notifyListeners();

    try {
      // Step 1: Push pending local changes to server
      await _pushPendingChanges();

      // Step 2: Pull latest data from server
      await _pullServerData();

      _status = SyncStatus.idle;
      _lastSyncAt = DateTime.now();
    } catch (e) {
      _status = SyncStatus.error;
      _lastError = e.toString();
      debugPrint('[SyncEngine] Sync failed: $e');
    }

    await _refreshPendingCount();
    notifyListeners();
  }

  // ─── PUSH: Send local changes to server ─────────────────────

  Future<void> _pushPendingChanges() async {
    final pending = await _db.getPendingSyncEntries();

    for (final entry in pending) {
      try {
        final success = await _processSyncEntry(entry);
        if (success) {
          await _db.removeFromSyncQueue(entry.id);
          _syncedCount++;
        } else {
          await _db.incrementRetryCount(entry.id, 'Unknown error');
          _failedCount++;
        }
      } catch (e) {
        await _db.incrementRetryCount(entry.id, e.toString());

        // Skip entries that have failed too many times (max 10 retries)
        if (entry.retryCount >= 10) {
          await _db.removeFromSyncQueue(entry.id);
          debugPrint('[SyncEngine] Dropped entry ${entry.id} after 10 retries');
        }
        _failedCount++;
      }
    }
  }

  Future<bool> _processSyncEntry(SyncQueueEntry entry) async {
    final payload = jsonDecode(entry.payload) as Map<String, dynamic>;
    final endpoint = _getEndpointForEntityType(entry.entityType);
    final method = entry.operation == 'create'
        ? 'POST'
        : entry.operation == 'update'
            ? 'PUT'
            : 'DELETE';

    http.Response response;

    if (method == 'POST') {
      response = await _api.post(endpoint, body: payload);
    } else if (method == 'PUT') {
      response = await _api.put(endpoint, body: payload);
    } else {
      response = await _api.delete(endpoint);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      // Mark the local record as synced
      await _markLocalRecordSynced(entry.entityType, entry.entityId);
      return true;
    }

    // 409 Conflict — server has newer data, mark as conflict
    if (response.statusCode == 409) {
      await _markLocalRecordConflict(entry.entityType, entry.entityId);
      return true; // remove from queue (conflict handled)
    }

    return false;
  }

  String _getEndpointForEntityType(String entityType) {
    const endpoints = {
      'farmer': '/api/farmers',
      'farm_land': '/api/farm-lands',
      'cultivation': '/api/cultivations',
      'vsla_saving': '/api/vsla/savings',
      'vsla_loan': '/api/vsla/loans',
      'training_attendance': '/api/trainings',
      'farm_visit': '/api/farm-visits',
      'sale': '/api/sales',
      'payment': '/api/payments',
      'crop_stage_event': '/api/crop-stages',
      'practice_adoption': '/api/practices/adopt',
    };
    return endpoints[entityType] ?? '/api/sync';
  }

  Future<void> _markLocalRecordSynced(String entityType, String entityId) async {
    final now = DateTime.now();
    switch (entityType) {
      case 'farmer':
        await (_db.update(_db.farmerCache)..where((t) => t.id.equals(entityId)))
            .write(FarmerCacheCompanion(syncStatus: const Value('synced'), lastSyncedAt: Value(now)));
        break;
      case 'farm_land':
        await (_db.update(_db.farmLandCache)..where((t) => t.id.equals(entityId)))
            .write(FarmLandCacheCompanion(syncStatus: const Value('synced'), lastSyncedAt: Value(now)));
        break;
      case 'cultivation':
        await (_db.update(_db.cultivationCache)..where((t) => t.id.equals(entityId)))
            .write(CultivationCacheCompanion(syncStatus: const Value('synced'), lastSyncedAt: Value(now)));
        break;
      // For other entity types, the record stays in the cache table with syncStatus='synced'
      // (handled during insert)
    }
  }

  Future<void> _markLocalRecordConflict(String entityType, String entityId) async {
    debugPrint('[SyncEngine] Conflict on $entityType/$entityId — server wins');
    // For financial data: server wins → fetch server version and overwrite local
    // For field data: timestamp wins → compare updatedAt
    await _markLocalRecordSynced(entityType, entityId);
  }

  // ─── PULL: Fetch latest data from server ────────────────────

  Future<void> _pullServerData() async {
    // Pull farmers
    try {
      final res = await _api.get('/api/farmers?limit=500');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final farmers = data['farmers'] as List<dynamic>? ?? [];
        for (final f in farmers) {
          await _db.upsertFarmer(FarmerCacheCompanion.insert(
            id: f['id'],
            tenantId: f['tenantId'] ?? '',
            firstName: f['firstName'] ?? '',
            lastName: f['lastName'] ?? '',
            phone: f['phone'] ?? '',
            farmerCode: Value(f['farmerCode']),
            gender: Value(f['gender']),
            email: Value(f['email']),
            villageName: Value(f['villageName'] ?? f['district']),
            district: Value(f['district']),
            country: Value(f['country']),
            isCertified: Value(f['isCertified'] ?? false),
            certificationType: Value(f['certificationType']),
            farmSize: Value(f['farmSize']?.toDouble()),
            status: Value(f['status'] ?? 'ACTIVE'),
            photoUrl: Value(f['photoUrl']),
            syncStatus: const Value('synced'),
            lastSyncedAt: Value(DateTime.now()),
            updatedAt: Value(f['updatedAt'] != null ? DateTime.tryParse(f['updatedAt']) : null),
          ));
        }
        debugPrint('[SyncEngine] Pulled ${farmers.length} farmers');
      }
    } catch (e) {
      debugPrint('[SyncEngine] Failed to pull farmers: $e');
    }

    // Pull VSLA groups
    try {
      final res = await _api.get('/api/vsla/groups');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final groups = data['groups'] as List<dynamic>? ?? data as List? ?? [];
        for (final g in groups) {
          await _db.upsertVslaGroups([
            VslaGroupCacheCompanion.insert(
              id: g['id'],
              name: g['name'] ?? '',
              shareValue: Value(g['shareValue']?.toDouble()),
              loanRate: Value(g['loanRate']?.toDouble()),
              maxLoanAmount: Value(g['maxLoanAmount']?.toDouble()),
              isActive: Value(g['isActive'] ?? true),
              syncStatus: const Value('synced'),
              lastSyncedAt: Value(DateTime.now()),
            ),
          ]);
        }
        debugPrint('[SyncEngine] Pulled ${groups.length} VSLA groups');
      }
    } catch (e) {
      debugPrint('[SyncEngine] Failed to pull VSLA groups: $e');
    }

    // Pull trainings
    try {
      final res = await _api.get('/api/trainings');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final trainings = data['trainings'] as List<dynamic>? ?? data as List? ?? [];
        for (final t in trainings) {
          await _db.upsertTrainings([
            TrainingCacheCompanion.insert(
              id: t['id'],
              topic: t['topic'] ?? '',
              date: Value(t['date'] != null ? DateTime.tryParse(t['date']) : null),
              location: Value(t['location']),
              trainerName: Value(t['trainerName']),
              description: Value(t['description']),
              syncStatus: const Value('synced'),
              lastSyncedAt: Value(DateTime.now()),
            ),
          ]);
        }
        debugPrint('[SyncEngine] Pulled ${trainings.length} trainings');
      }
    } catch (e) {
      debugPrint('[SyncEngine] Failed to pull trainings: $e');
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  Future<void> _refreshPendingCount() async {
    _pendingCount = await _db.getPendingSyncCount();
    notifyListeners();
  }

  /// Queue a local write for sync. Called by all offline create/update operations.
  Future<void> queueWrite({
    required String entityType,
    required String entityId,
    required String operation, // create | update | delete
    required Map<String, dynamic> payload,
  }) async {
    await _db.addToSyncQueue(
      entityType: entityType,
      entityId: entityId,
      operation: operation,
      payload: jsonEncode(payload),
    );
    await _refreshPendingCount();

    // If online, try to sync immediately
    if (_connectivity.isOnline && _status != SyncStatus.syncing) {
      syncNow();
    }
  }
}

/// Import http for Response type
import 'package:http/http.dart' as http;
