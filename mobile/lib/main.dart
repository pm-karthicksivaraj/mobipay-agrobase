import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api/api_client.dart';
import 'core/auth/auth_provider.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/database/app_database.dart';
import 'core/connectivity/connectivity_manager.dart';
import 'core/sync/sync_engine.dart';
import 'core/sync/offline_repository.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ─── Initialize offline-first infrastructure ────────────────
  final db = AppDatabase();
  final apiClient = ApiClient();
  await apiClient.init();

  final connectivityManager = ConnectivityManager();
  await connectivityManager.initialize();

  final syncEngine = SyncEngine(db, apiClient, connectivityManager);
  await syncEngine.initialize();

  final offlineRepo = OfflineRepository(db, apiClient, connectivityManager, syncEngine);

  // ─── Auto-sync on app launch (if online) ────────────────────
  if (connectivityManager.isOnline) {
    syncEngine.syncNow();
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()..init()),
        ChangeNotifierProvider(create: (_) => connectivityManager),
        ChangeNotifierProvider(create: (_) => syncEngine),
        Provider(create: (_) => offlineRepo),
        Provider(create: (_) => db),
      ],
      child: const AgrobaseApp(),
    ),
  );
}

class AgrobaseApp extends StatelessWidget {
  const AgrobaseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Agrobase',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: AppRouter.router,
    );
  }
}
