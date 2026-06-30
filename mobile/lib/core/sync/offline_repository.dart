import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../database/app_database.dart';
import '../api/api_client.dart';
import '../connectivity/connectivity_manager.dart';
import '../sync/sync_engine.dart';

/// OfflineRepository — the single data access layer for all screens.
///
/// Every screen uses this instead of calling ApiClient directly.
/// When online: fetches from server API + caches locally.
/// When offline: reads from local SQLite cache + queues writes for sync.
///
/// Usage:
///   final repo = OfflineRepository(db, api, connectivity, syncEngine);
///   final farmers = await repo.getFarmers(); // works online + offline
///   await repo.createFarmer({...}); // works online + offline
class OfflineRepository {
  final AppDatabase _db;
  final ApiClient _api;
  final ConnectivityManager _connectivity;
  final SyncEngine _syncEngine;

  OfflineRepository(this._db, this._api, this._connectivity, this._syncEngine);

  bool get _isOnline => _connectivity.isOnline;

  // ════════════════════════════════════════════════════════════
  // FARMERS
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getFarmers({String? search, int limit = 200}) async {
    if (_isOnline) {
      try {
        final res = await _api.get('/api/farmers?limit=$limit${search != null ? '&search=$search' : ''}');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final farmers = data['farmers'] as List<dynamic>? ?? [];
          // Cache for offline use
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
          return farmers.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Farmers API failed, falling back to cache: $e');
      }
    }

    // Offline: read from local cache
    final cached = await _db.getCachedFarmers();
    var results = cached.map((f) => {
      'id': f.id,
      'farmerCode': f.farmerCode,
      'firstName': f.firstName,
      'lastName': f.lastName,
      'phone': f.phone,
      'gender': f.gender,
      'email': f.email,
      'villageName': f.villageName,
      'district': f.district,
      'country': f.country,
      'isCertified': f.isCertified,
      'certificationType': f.certificationType,
      'farmSize': f.farmSize,
      'status': f.status,
      'photoUrl': f.photoUrl,
      'syncStatus': f.syncStatus,
    }).toList();

    // Filter by search
    if (search != null && search.isNotEmpty) {
      results = results.where((f) {
        final name = '${f['firstName']} ${f['lastName']}'.toLowerCase();
        return name.contains(search.toLowerCase()) ||
            (f['phone'] ?? '').contains(search) ||
            (f['farmerCode'] ?? '').toString().toLowerCase().contains(search.toLowerCase());
      }).toList();
    }

    return results;
  }

  Future<Map<String, dynamic>?> getFarmerById(String id) async {
    if (_isOnline) {
      try {
        final res = await _api.get('/api/farmers?farmerId=$id');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          return data['farmer'] ?? data;
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Farmer detail API failed: $e');
      }
    }

    // Offline: read from cache
    final cached = await _db.getCachedFarmers();
    try {
      final farmer = cached.firstWhere((f) => f.id == id);
      return {
        'id': farmer.id,
        'farmerCode': farmer.farmerCode,
        'firstName': farmer.firstName,
        'lastName': farmer.lastName,
        'phone': farmer.phone,
        'gender': farmer.gender,
        'email': farmer.email,
        'villageName': farmer.villageName,
        'district': farmer.district,
        'country': farmer.country,
        'isCertified': farmer.isCertified,
        'certificationType': farmer.certificationType,
        'farmSize': farmer.farmSize,
        'status': farmer.status,
        'photoUrl': farmer.photoUrl,
      };
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> createFarmer(Map<String, dynamic> data) async {
    final localId = DateTime.now().millisecondsSinceEpoch.toString();
    data['id'] = localId;

    if (_isOnline) {
      try {
        final res = await _api.post('/api/farmers', body: data);
        if (res.statusCode == 201) {
          final farmer = jsonDecode(res.body);
          // Cache the server-created farmer
          await _db.upsertFarmer(FarmerCacheCompanion.insert(
            id: farmer['id'],
            tenantId: farmer['tenantId'] ?? '',
            firstName: farmer['firstName'] ?? '',
            lastName: farmer['lastName'] ?? '',
            phone: farmer['phone'] ?? '',
            syncStatus: const Value('synced'),
            lastSyncedAt: Value(DateTime.now()),
          ));
          return farmer;
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Create farmer API failed, queuing: $e');
      }
    }

    // Offline: save locally + queue for sync
    await _db.upsertFarmer(FarmerCacheCompanion.insert(
      id: localId,
      tenantId: data['tenantId'] ?? '',
      firstName: data['firstName'] ?? '',
      lastName: data['lastName'] ?? '',
      phone: data['phone'] ?? '',
      gender: Value(data['gender']),
      email: Value(data['email']),
      villageName: Value(data['villageName']),
      district: Value(data['district']),
      country: Value(data['country']),
      farmSize: Value(data['farmSize']?.toDouble()),
      syncStatus: const Value('pending'),
    ));

    await _syncEngine.queueWrite(
      entityType: 'farmer',
      entityId: localId,
      operation: 'create',
      payload: data,
    );

    return data;
  }

  // ════════════════════════════════════════════════════════════
  // FARM LANDS
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getFarmLands({String? farmerId}) async {
    if (_isOnline) {
      try {
        final res = await _api.get('/api/farm-lands${farmerId != null ? '?farmerId=$farmerId' : ''}');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final farms = data['farms'] as List<dynamic>? ?? [];
          for (final f in farms) {
            await _db.upsertFarmLand(FarmLandCacheCompanion.insert(
              id: f['id'],
              farmerId: f['farmerId'] ?? '',
              name: f['name'] ?? '',
              sizeHectares: Value(f['sizeHectares']?.toDouble()),
              latitude: Value(f['latitude']?.toDouble()),
              longitude: Value(f['longitude']?.toDouble()),
              landOwnership: Value(f['landOwnership']),
              waterSource: Value(f['waterSource']),
              soilFertility: Value(f['soilFertility']),
              boundaryGeoJson: Value(f['boundaryGeoJson']),
              syncStatus: const Value('synced'),
              lastSyncedAt: Value(DateTime.now()),
            ));
          }
          return farms.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Farm lands API failed: $e');
      }
    }

    // Offline
    final cached = await _db.getCachedFarmLands(farmerId: farmerId);
    return cached.map((f) => {
      'id': f.id,
      'farmerId': f.farmerId,
      'name': f.name,
      'sizeHectares': f.sizeHectares,
      'latitude': f.latitude,
      'longitude': f.longitude,
      'landOwnership': f.landOwnership,
      'waterSource': f.waterSource,
      'soilFertility': f.soilFertility,
      'boundaryGeoJson': f.boundaryGeoJson,
      'syncStatus': f.syncStatus,
    }).toList();
  }

  Future<Map<String, dynamic>?> createFarmLand(Map<String, dynamic> data) async {
    final localId = DateTime.now().millisecondsSinceEpoch.toString();
    data['id'] = localId;

    if (_isOnline) {
      try {
        final res = await _api.post('/api/farm-lands', body: data);
        if (res.statusCode == 201) {
          final farm = jsonDecode(res.body)['farm'];
          await _db.upsertFarmLand(FarmLandCacheCompanion.insert(
            id: farm['id'],
            farmerId: farm['farmerId'] ?? '',
            name: farm['name'] ?? '',
            syncStatus: const Value('synced'),
            lastSyncedAt: Value(DateTime.now()),
          ));
          return farm;
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Create farm land API failed, queuing: $e');
      }
    }

    // Offline
    await _db.upsertFarmLand(FarmLandCacheCompanion.insert(
      id: localId,
      farmerId: data['farmerId'] ?? '',
      name: data['name'] ?? '',
      sizeHectares: Value(data['sizeHectares']?.toDouble()),
      latitude: Value(data['latitude']?.toDouble()),
      longitude: Value(data['longitude']?.toDouble()),
      landOwnership: Value(data['landOwnership']),
      boundaryGeoJson: Value(data['boundaryGeoJson']),
      syncStatus: const Value('pending'),
    ));

    await _syncEngine.queueWrite(
      entityType: 'farm_land',
      entityId: localId,
      operation: 'create',
      payload: data,
    );

    return data;
  }

  // ════════════════════════════════════════════════════════════
  // VSLA GROUPS
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getVslaGroups() async {
    if (_isOnline) {
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
          return groups.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] VSLA groups API failed: $e');
      }
    }

    // Offline
    final cached = await _db.getCachedVslaGroups();
    return cached.map((g) => {
      'id': g.id,
      'name': g.name,
      'shareValue': g.shareValue,
      'loanRate': g.loanRate,
      'maxLoanAmount': g.maxLoanAmount,
      'isActive': g.isActive,
    }).toList();
  }

  // ════════════════════════════════════════════════════════════
  // TRAININGS
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getTrainings() async {
    if (_isOnline) {
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
          return trainings.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Trainings API failed: $e');
      }
    }

    // Offline
    final cached = await _db.getCachedTrainings();
    return cached.map((t) => {
      'id': t.id,
      'topic': t.topic,
      'date': t.date?.toIso8601String(),
      'location': t.location,
      'trainerName': t.trainerName,
      'description': t.description,
    }).toList();
  }

  // ════════════════════════════════════════════════════════════
  // FARM VISITS
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getFarmVisits({String? farmerId}) async {
    if (_isOnline) {
      try {
        final res = await _api.get('/api/farm-visits${farmerId != null ? '?farmerId=$farmerId' : ''}');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final visits = data['visits'] as List<dynamic>? ?? data as List? ?? [];
          return visits.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Farm visits API failed: $e');
      }
    }

    // Offline
    final cached = await _db.getCachedFarmVisits(farmerId: farmerId);
    return cached.map((v) => {
      'id': v.id,
      'farmerId': v.farmerId,
      'visitDate': v.visitDate.toIso8601String(),
      'topic': v.topic,
      'observations': v.observations,
      'recommendations': v.recommendations,
      'status': v.status,
      'syncStatus': v.syncStatus,
    }).toList();
  }

  Future<Map<String, dynamic>?> createFarmVisit(Map<String, dynamic> data) async {
    final localId = DateTime.now().millisecondsSinceEpoch.toString();
    data['id'] = localId;

    // Always save locally first (even if online — for instant UI feedback)
    await _db.insertFarmVisit(FarmVisitCacheCompanion.insert(
      id: localId,
      farmerId: data['farmerId'] ?? '',
      visitDate: data['visitDate'] != null ? DateTime.parse(data['visitDate']) : DateTime.now(),
      topic: data['topic'] ?? '',
      observations: Value(data['observations']),
      recommendations: Value(data['recommendations']),
      status: Value(data['status'] ?? 'SCHEDULED'),
      latitude: Value(data['latitude']?.toDouble()),
      longitude: Value(data['longitude']?.toDouble()),
      syncStatus: const Value('pending'),
    ));

    if (_isOnline) {
      try {
        final res = await _api.post('/api/farm-visits', body: data);
        if (res.statusCode == 201 || res.statusCode == 200) {
          return jsonDecode(res.body);
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Create farm visit API failed, queued: $e');
      }
    }

    // Queue for sync
    await _syncEngine.queueWrite(
      entityType: 'farm_visit',
      entityId: localId,
      operation: 'create',
      payload: data,
    );

    return data;
  }

  // ════════════════════════════════════════════════════════════
  // SALES
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getSales({String? farmerId}) async {
    if (_isOnline) {
      try {
        final res = await _api.get('/api/sales${farmerId != null ? '?farmerId=$farmerId' : ''}');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final sales = data['sales'] as List<dynamic>? ?? data as List? ?? [];
          return sales.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Sales API failed: $e');
      }
    }

    // Offline
    final cached = await _db.getCachedSales(farmerId: farmerId);
    return cached.map((s) => {
      'id': s.id,
      'farmerId': s.farmerId,
      'product': s.product,
      'category': s.category,
      'quantity': s.quantity,
      'unitPrice': s.unitPrice,
      'totalAmount': s.totalAmount,
      'status': s.status,
      'syncStatus': s.syncStatus,
    }).toList();
  }

  Future<Map<String, dynamic>?> createSale(Map<String, dynamic> data) async {
    final localId = DateTime.now().millisecondsSinceEpoch.toString();
    data['id'] = localId;

    // Auto-calc: totalAmount = quantity × unitPrice
    if (data['unitPrice'] != null && data['quantity'] != null) {
      final qty = double.tryParse(data['quantity'].toString()) ?? 0;
      final price = (data['unitPrice'] as num).toDouble();
      data['totalAmount'] = qty * price;

      // Auto-calc: netAmount = totalAmount - charges - taxAmount
      final charges = (data['charges'] as num?)?.toDouble() ?? 0;
      final tax = (data['taxAmount'] as num?)?.toDouble() ?? 0;
      data['netAmount'] = data['totalAmount'] - charges - tax;
    }

    // Save locally
    await _db.insertSale(SaleCacheCompanion.insert(
      id: localId,
      farmerId: Value(data['farmerId']),
      product: data['product'] ?? '',
      category: Value(data['category'] ?? 'PRODUCE'),
      quantity: data['quantity']?.toString() ?? '',
      unitPrice: Value((data['unitPrice'] as num?)?.toDouble()),
      totalAmount: Value((data['totalAmount'] as num?)?.toDouble()),
      charges: Value((data['charges'] as num?)?.toDouble()),
      taxAmount: Value((data['taxAmount'] as num?)?.toDouble()),
      netAmount: Value((data['netAmount'] as num?)?.toDouble()),
      status: Value(data['status'] ?? 'COMPLETED'),
      syncStatus: const Value('pending'),
    ));

    if (_isOnline) {
      try {
        final res = await _api.post('/api/sales', body: data);
        if (res.statusCode == 201 || res.statusCode == 200) {
          return jsonDecode(res.body);
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Create sale API failed, queued: $e');
      }
    }

    await _syncEngine.queueWrite(
      entityType: 'sale',
      entityId: localId,
      operation: 'create',
      payload: data,
    );

    return data;
  }

  // ════════════════════════════════════════════════════════════
  // CROP STAGE EVENTS
  // ════════════════════════════════════════════════════════════

  Future<List<Map<String, dynamic>>> getStageEvents(String cultivationId) async {
    if (_isOnline) {
      try {
        final res = await _api.get('/api/crop-stages?cultivationId=$cultivationId');
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final events = data['events'] as List<dynamic>? ?? [];
          return events.cast<Map<String, dynamic>>();
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Stage events API failed: $e');
      }
    }

    // Offline
    final cached = await _db.getCachedStageEvents(cultivationId: cultivationId);
    return cached.map((e) => {
      'id': e.id,
      'cultivationId': e.cultivationId,
      'cropVertical': e.cropVertical,
      'stageNumber': e.stageNumber,
      'stageName': e.stageName,
      'eventType': e.eventType,
      'eventData': e.eventData,
      'inputCostTotal': e.inputCostTotal,
      'carbonKgCO2e': e.carbonKgCO2e,
      'farm5xPractice': e.farm5xPractice,
      'syncStatus': e.syncStatus,
    }).toList();
  }

  Future<Map<String, dynamic>?> createStageEvent(Map<String, dynamic> data) async {
    final localId = DateTime.now().millisecondsSinceEpoch.toString();
    data['id'] = localId;

    // Save locally
    await _db.insertStageEvent(CropStageEventCacheCompanion.insert(
      id: localId,
      cultivationId: data['cultivationId'] ?? '',
      cropVertical: data['cropVertical'] ?? 'CROPCORE',
      stageNumber: data['stageNumber'] ?? 1,
      stageName: data['stageName'] ?? '',
      eventType: data['eventType'] ?? '',
      eventData: data['eventData'] != null ? jsonEncode(data['eventData']) : '{}',
      inputCostTotal: Value((data['inputCostTotal'] as num?)?.toDouble() ?? 0),
      carbonKgCO2e: Value((data['carbonKgCO2e'] as num?)?.toDouble() ?? 0),
      farm5xPractice: Value(data['farm5xPractice']),
      farm5xVariant: Value(data['farm5xVariant']),
      syncStatus: const Value('pending'),
    ));

    if (_isOnline) {
      try {
        final res = await _api.post('/api/crop-stages', body: data);
        if (res.statusCode == 201) {
          return jsonDecode(res.body)['event'];
        }
      } catch (e) {
        debugPrint('[OfflineRepo] Create stage event API failed, queued: $e');
      }
    }

    await _syncEngine.queueWrite(
      entityType: 'crop_stage_event',
      entityId: localId,
      operation: 'create',
      payload: data,
    );

    return data;
  }
}
