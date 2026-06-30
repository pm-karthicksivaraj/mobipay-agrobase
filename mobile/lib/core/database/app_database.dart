import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'app_database.g.dart';

/// ─── Offline Database Tables ─────────────────────────────────
/// Mirrors key server-side Prisma models for offline-first operation.
/// Every table has a `syncStatus` field: 'synced' | 'pending' | 'conflict'
/// and `lastSyncedAt` for incremental sync.

// ─── Sync Queue (pending writes to push to server) ────────────
class SyncQueueEntries extends Table {
  TextColumn get id => text()(); // UUID generated locally
  TextColumn get entityType => text()(); // 'farmer', 'farm_land', 'cultivation', 'vsla_saving', 'vsla_loan', 'training_attendance', 'farm_visit', 'sale', 'payment', 'crop_stage_event', 'practice_adoption'
  TextColumn get entityId => text()(); // local ID
  TextColumn get operation => text()(); // 'create', 'update', 'delete'
  TextColumn get payload => text()(); // JSON body to send
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime);
  IntColumn get retryCount => integer().withDefault(const Constant(0));
  TextColumn get lastError => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Farmers (cached from server) ─────────────────────────────
class FarmerCache extends Table {
  TextColumn get id => text()();
  TextColumn get tenantId => text()();
  TextColumn get farmerCode => text().nullable()();
  TextColumn get firstName => text()();
  TextColumn get lastName => text()();
  TextColumn get phone => text()();
  TextColumn get gender => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get villageName => text().nullable()();
  TextColumn get district => text().nullable()();
  TextColumn get country => text().nullable()();
  TextColumn get isCertified => boolean().withDefault(const Constant(false))();
  TextColumn get certificationType => text().nullable()();
  TextColumn get farmSize => real().nullable()();
  TextColumn get status => text().withDefault(const Constant('ACTIVE'))();
  TextColumn get photoUrl => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('synced'))(); // synced | pending | conflict
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Farm Lands (cached + offline-created) ────────────────────
class FarmLandCache extends Table {
  TextColumn get id => text()();
  TextColumn get farmerId => text()();
  TextColumn get name => text()();
  RealColumn get sizeHectares => real().nullable()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  TextColumn get landOwnership => text().nullable()();
  TextColumn get waterSource => text().nullable()();
  TextColumn get soilFertility => text().nullable()();
  TextColumn get boundaryGeoJson => text().nullable()(); // polygon points as JSON
  TextColumn get syncStatus => text().withDefault(const Constant('synced'))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Cultivations (cached + offline-created) ──────────────────
class CultivationCache extends Table {
  TextColumn get id => text()();
  TextColumn get farmId => text()();
  TextColumn get cropName => text()();
  TextColumn get variety => text().nullable()();
  TextColumn get season => text().nullable()();
  RealColumn get cultivationAreaHa => real().nullable()();
  DateTimeColumn get sowingDate => dateTime().nullable()();
  RealColumn get estimatedYield => real().nullable()();
  RealColumn get actualYield => real().nullable()();
  RealColumn get seedCost => real().nullable()();
  RealColumn get sowingCost => real().nullable()();
  TextColumn get status => text().withDefault(const Constant('ACTIVE'))();
  TextColumn get syncStatus => text().withDefault(const Constant('synced'))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── VSLA Groups ──────────────────────────────────────────────
class VslaGroupCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  RealColumn get shareValue => real().nullable()();
  RealColumn get loanRate => real().nullable()();
  RealColumn get maxLoanAmount => real().nullable()();
  BooleanColumn get isActive => boolean().withDefault(const Constant(true))();
  TextColumn get syncStatus => text().withDefault(const Constant('synced'))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── VSLA Savings (offline-created) ───────────────────────────
class VslaSavingCache extends Table {
  TextColumn get id => text()();
  TextColumn get vslaGroupId => text()();
  TextColumn get farmerId => text()();
  RealColumn get amount => real()();
  TextColumn get savingType => text().nullable()(); // SAVINGS, WELFARE, SHARES
  DateTimeColumn get savingDate => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── VSLA Loans (offline-created) ─────────────────────────────
class VslaLoanCache extends Table {
  TextColumn get id => text()();
  TextColumn get vslaGroupId => text()();
  TextColumn get farmerId => text()();
  RealColumn get amount => real()();
  RealColumn get interestRate => real().nullable()();
  RealColumn get repaidAmount => real().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  DateTimeColumn get loanDate => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Trainings (cached from server) ───────────────────────────
class TrainingCache extends Table {
  TextColumn get id => text()();
  TextColumn get topic => text()();
  DateTimeColumn get date => dateTime().nullable()();
  TextColumn get location => text().nullable()();
  TextColumn get trainerName => text().nullable()();
  TextColumn get description => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('synced'))();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Training Attendance (offline-created) ────────────────────
class TrainingAttendanceCache extends Table {
  TextColumn get id => text()();
  TextColumn get trainingId => text()();
  TextColumn get farmerId => text()();
  BooleanColumn get attended => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Farm Visits (offline-created) ────────────────────────────
class FarmVisitCache extends Table {
  TextColumn get id => text()();
  TextColumn get farmerId => text()();
  DateTimeColumn get visitDate => dateTime()();
  TextColumn get topic => text()();
  TextColumn get observations => text().nullable()();
  TextColumn get recommendations => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('SCHEDULED'))();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Sales (offline-created) ──────────────────────────────────
class SaleCache extends Table {
  TextColumn get id => text()();
  TextColumn get farmerId => text().nullable()();
  TextColumn get product => text()();
  TextColumn get category => text().withDefault(const Constant('PRODUCE'))(); // PRODUCE | INPUT
  TextColumn get quantity => text()();
  RealColumn get unitPrice => real().nullable()();
  RealColumn get totalAmount => real().nullable()();
  RealColumn get charges => real().nullable()();
  RealColumn get taxAmount => real().nullable()();
  RealColumn get netAmount => real().nullable()();
  TextColumn get status => text().withDefault(const Constant('COMPLETED'))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Crop Stage Events (offline-created) ──────────────────────
class CropStageEventCache extends Table {
  TextColumn get id => text()();
  TextColumn get cultivationId => text()();
  TextColumn get cropVertical => text()();
  IntColumn get stageNumber => integer()();
  TextColumn get stageName => text()();
  TextColumn get eventType => text()();
  TextColumn get eventData => text()(); // JSON
  RealColumn get inputCostTotal => real().withDefault(const Constant(0))();
  RealColumn get carbonKgCO2e => real().withDefault(const Constant(0))();
  DateTimeColumn get eventDate => dateTime().withDefault(currentDateAndTime)();
  TextColumn get farm5xPractice => text().nullable()();
  TextColumn get farm5xVariant => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── Practice Adoptions (offline-created) ─────────────────────
class PracticeAdoptionCache extends Table {
  TextColumn get id => text()();
  TextColumn get farmerId => text()();
  TextColumn get practiceCode => text()();
  TextColumn get cropType => text()();
  TextColumn get frameworkVariant => text()();
  BooleanColumn get isMandatory => boolean().withDefault(const Constant(false))();
  DateTimeColumn get adoptedAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get verificationStatus => text().withDefault(const Constant('PENDING'))();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

// ─── App Settings (sync config, lightweight mode, etc.) ───────
class AppSettingsCache extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

/// ─── Database Definition ─────────────────────────────────────
@DriftDatabase(tables: [
  SyncQueueEntries,
  FarmerCache,
  FarmLandCache,
  CultivationCache,
  VslaGroupCache,
  VslaSavingCache,
  VslaLoanCache,
  TrainingCache,
  TrainingAttendanceCache,
  FarmVisitCache,
  SaleCache,
  CropStageEventCache,
  PracticeAdoptionCache,
  AppSettingsCache,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // ─── Sync Queue Operations ──────────────────────────────────

  Future<List<SyncQueueEntry>> getPendingSyncEntries() {
    return (select(syncQueueEntries)..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<void> addToSyncQueue({
    required String entityType,
    required String entityId,
    required String operation,
    required String payload,
  }) async {
    await into(syncQueueEntries).insert(SyncQueueEntriesCompanion.insert(
      id: _uuid(),
      entityType: entityType,
      entityId: entityId,
      operation: operation,
      payload: payload,
    ));
  }

  Future<void> removeFromSyncQueue(String id) async {
    await (delete(syncQueueEntries)..where((t) => t.id.equals(id))).go();
  }

  Future<int> getPendingSyncCount() async {
    final count = await syncQueueEntries.count().getSingle();
    return count;
  }

  Future<void> incrementRetryCount(String id, String error) async {
    await (update(syncQueueEntries)..where((t) => t.id.equals(id)))
        .write(SyncQueueEntriesCompanion(
      retryCount: const CustomExpression('retry_count + 1'),
      lastError: Value(error),
    ));
  }

  // ─── Farmer Operations ──────────────────────────────────────

  Future<List<FarmerCacheData>> getCachedFarmers() {
    return select(farmerCache).get();
  }

  Future<void> upsertFarmer(FarmerCacheCompanion farmer) async {
    await into(farmerCache).insertOnConflictUpdate(farmer);
  }

  Future<void> upsertFarmers(List<FarmerCacheCompanion> farmers) async {
    await batch((b) {
      b.insertAll(farmerCache, farmers, mode: InsertMode.insertOrReplace);
    });
  }

  // ─── Farm Land Operations ───────────────────────────────────

  Future<List<FarmLandCacheData>> getCachedFarmLands({String? farmerId}) {
    final query = select(farmLandCache);
    if (farmerId != null) {
      query.where((t) => t.farmerId.equals(farmerId));
    }
    return query.get();
  }

  Future<void> upsertFarmLand(FarmLandCacheCompanion farm) async {
    await into(farmLandCache).insertOnConflictUpdate(farm);
  }

  // ─── Cultivation Operations ─────────────────────────────────

  Future<List<CultivationCacheData>> getCachedCultivations({String? farmId}) {
    final query = select(cultivationCache);
    if (farmId != null) {
      query.where((t) => t.farmId.equals(farmId));
    }
    return query.get();
  }

  Future<void> upsertCultivation(CultivationCacheCompanion cultivation) async {
    await into(cultivationCache).insertOnConflictUpdate(cultivation);
  }

  // ─── VSLA Operations ────────────────────────────────────────

  Future<List<VslaGroupCacheData>> getCachedVslaGroups() {
    return select(vslaGroupCache).get();
  }

  Future<void> upsertVslaGroups(List<VslaGroupCacheCompanion> groups) async {
    await batch((b) {
      b.insertAll(vslaGroupCache, groups, mode: InsertMode.insertOrReplace);
    });
  }

  Future<List<VslaSavingCacheData>> getCachedSavings({String? farmerId}) {
    final query = select(vslaSavingCache);
    if (farmerId != null) {
      query.where((t) => t.farmerId.equals(farmerId));
    }
    return query.get();
  }

  Future<void> insertSaving(VslaSavingCacheCompanion saving) async {
    await into(vslaSavingCache).insert(saving);
  }

  Future<List<VslaLoanCacheData>> getCachedLoans({String? farmerId}) {
    final query = select(vslaLoanCache);
    if (farmerId != null) {
      query.where((t) => t.farmerId.equals(farmerId));
    }
    return query.get();
  }

  Future<void> insertLoan(VslaLoanCacheCompanion loan) async {
    await into(vslaLoanCache).insert(loan);
  }

  // ─── Training Operations ────────────────────────────────────

  Future<List<TrainingCacheData>> getCachedTrainings() {
    return select(trainingCache).get();
  }

  Future<void> upsertTrainings(List<TrainingCacheCompanion> trainings) async {
    await batch((b) {
      b.insertAll(trainingCache, trainings, mode: InsertMode.insertOrReplace);
    });
  }

  Future<void> insertAttendance(TrainingAttendanceCacheCompanion attendance) async {
    await into(trainingAttendanceCache).insert(attendance);
  }

  // ─── Farm Visit Operations ──────────────────────────────────

  Future<List<FarmVisitCacheData>> getCachedFarmVisits({String? farmerId}) {
    final query = select(farmVisitCache);
    if (farmerId != null) {
      query.where((t) => t.farmerId.equals(farmerId));
    }
    return query.get();
  }

  Future<void> insertFarmVisit(FarmVisitCacheCompanion visit) async {
    await into(farmVisitCache).insert(visit);
  }

  // ─── Sale Operations ────────────────────────────────────────

  Future<List<SaleCacheData>> getCachedSales({String? farmerId}) {
    final query = select(saleCache);
    if (farmerId != null) {
      query.where((t) => t.farmerId.equals(farmerId));
    }
    return query.get();
  }

  Future<void> insertSale(SaleCacheCompanion sale) async {
    await into(saleCache).insert(sale);
  }

  // ─── Crop Stage Event Operations ────────────────────────────

  Future<List<CropStageEventCacheData>> getCachedStageEvents({String? cultivationId}) {
    final query = select(cropStageEventCache);
    if (cultivationId != null) {
      query.where((t) => t.cultivationId.equals(cultivationId));
    }
    return query.get();
  }

  Future<void> insertStageEvent(CropStageEventCacheCompanion event) async {
    await into(cropStageEventCache).insert(event);
  }

  // ─── Practice Adoption Operations ───────────────────────────

  Future<List<PracticeAdoptionCacheData>> getCachedAdoptions({String? farmerId}) {
    final query = select(practiceAdoptionCache);
    if (farmerId != null) {
      query.where((t) => t.farmerId.equals(farmerId));
    }
    return query.get();
  }

  Future<void> insertAdoption(PracticeAdoptionCacheCompanion adoption) async {
    await into(practiceAdoptionCache).insert(adoption);
  }

  // ─── Settings Operations ────────────────────────────────────

  Future<String?> getSetting(String key) async {
    final result = await (select(appSettingsCache)..where((t) => t.key.equals(key))).getSingleOrNull();
    return result?.value;
  }

  Future<void> setSetting(String key, String value) async {
    await into(appSettingsCache).insertOnConflictUpdate(
      AppSettingsCacheCompanion.insert(key: key, value: value),
    );
  }

  // ─── Utility: clear all cache ───────────────────────────────

  Future<void> clearAllCache() async {
    await transaction(() async {
      await delete(farmerCache).go();
      await delete(farmLandCache).go();
      await delete(cultivationCache).go();
      await delete(vslaGroupCache).go();
      await delete(vslaSavingCache).go();
      await delete(vslaLoanCache).go();
      await delete(trainingCache).go();
      await delete(trainingAttendanceCache).go();
      await delete(farmVisitCache).go();
      await delete(saleCache).go();
      await delete(cropStageEventCache).go();
      await delete(practiceAdoptionCache).go();
    });
  }
}

/// ─── Database Connection ──────────────────────────────────────
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'agrobase_offline.db'));
    return NativeDatabase.createInBackground(file);
  });
}

/// Generate a UUID v4 locally (for offline-created records)
String _uuid() {
  return DateTime.now().millisecondsSinceEpoch.toString() +
      DateTime.now().microsecond.toString().padLeft(6, '0');
}
