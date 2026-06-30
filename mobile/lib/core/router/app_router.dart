import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/farmers/presentation/pages/farmers_page.dart';
import '../../features/farmers/presentation/pages/farmer_detail_page.dart';
import '../../features/farm_lands/presentation/pages/farm_lands_page.dart';
import '../../features/cultivations/presentation/pages/cultivations_page.dart';
import '../../features/sales/presentation/pages/sales_page.dart';
import '../../features/payments/presentation/pages/payments_page.dart';
import '../../features/loans/presentation/pages/loans_page.dart';
import '../../features/vsla/presentation/pages/vsla_page.dart';
import '../../features/mfi/presentation/pages/mfi_page.dart';
import '../../features/carbon/presentation/pages/carbon_page.dart';
import '../../features/compliance/presentation/pages/compliance_page.dart';
import '../../features/plots/presentation/pages/plots_page.dart';
import '../../features/plots/presentation/pages/plot_detail_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/farmer_id_card_page.dart';
import '../../features/trainings/presentation/pages/my_trainings_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/impact/presentation/pages/impact_dashboard_page.dart';
import '../../features/impact/presentation/pages/practice_logger_page.dart';
import '../../features/impact/presentation/pages/my_passport_page.dart';

class AppRouter {
  static final _rootNavigatorKey = GlobalKey<NavigatorState>();

  static GoRouter get router => GoRouter(
        navigatorKey: _rootNavigatorKey,
        initialLocation: '/splash',
        routes: [
          GoRoute(
            path: '/splash',
            builder: (_, __) => const SplashPage(),
          ),
          GoRoute(
            path: '/login',
            builder: (_, __) => const LoginPage(),
          ),
          GoRoute(
            path: '/farmers/:id',
            builder: (_, state) =>
                FarmerDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/plots/:id',
            builder: (_, state) =>
                PlotDetailPage(id: state.pathParameters['id']!),
          ),
          // ─── Impact Engine routes (6-week sprint) ───
          GoRoute(
            path: '/impact',
            builder: (_, __) => const ImpactDashboardPage(),
          ),
          GoRoute(
            path: '/impact/practices',
            builder: (_, __) => const PracticeLoggerPage(),
          ),
          GoRoute(
            path: '/impact/passport',
            builder: (_, __) => const MyPassportPage(),
          ),
          // ─── EKIBBO: Farmer ID Card + My Trainings ───
          GoRoute(
            path: '/profile/farmer-id-card',
            builder: (_, __) => const FarmerIdCardPage(),
          ),
          GoRoute(
            path: '/profile/trainings',
            builder: (_, __) => const MyTrainingsPage(),
          ),
          // ─── Phase 2: Farm Lands, Cultivations, Sales, Payments ───
          GoRoute(
            path: '/farm-lands',
            builder: (_, __) => const FarmLandsPage(),
          ),
          GoRoute(
            path: '/cultivations',
            builder: (_, state) => CultivationsPage(farmId: state.uri.queryParameters['farmId']),
          ),
          GoRoute(
            path: '/sales',
            builder: (_, __) => const SalesPage(),
          ),
          GoRoute(
            path: '/payments',
            builder: (_, __) => const PaymentsPage(),
          ),
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) {
              return ScaffoldWithNavBar(navigationShell: navigationShell);
            },
            branches: [
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/',
                  builder: (_, __) => const DashboardPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/plots',
                  builder: (_, __) => const PlotsPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/farmers',
                  builder: (_, __) => const FarmersPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/farm-lands',
                  builder: (_, __) => const FarmLandsPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/sales',
                  builder: (_, __) => const SalesPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/payments',
                  builder: (_, __) => const PaymentsPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/loans',
                  builder: (_, __) => const LoansPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/vsla',
                  builder: (_, __) => const VslaPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/mfi',
                  builder: (_, __) => const MfiPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/carbon',
                  builder: (_, __) => const CarbonPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/compliance',
                  builder: (_, __) => const CompliancePage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/impact',
                  builder: (_, __) => const ImpactDashboardPage(),
                ),
              ]),
              StatefulShellBranch(routes: [
                GoRoute(
                  path: '/profile',
                  builder: (_, __) => const ProfilePage(),
                ),
              ]),
            ],
          ),
        ],
      );
}

class ScaffoldWithNavBar extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const ScaffoldWithNavBar({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(index),
        height: 68,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map),
            label: 'Plots',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Farmers',
          ),
          NavigationDestination(
            icon: Icon(Icons.landscape_outlined),
            selectedIcon: Icon(Icons.landscape),
            label: 'Farms',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_outlined),
            selectedIcon: Icon(Icons.receipt),
            label: 'Sales',
          ),
          NavigationDestination(
            icon: Icon(Icons.payment_outlined),
            selectedIcon: Icon(Icons.payment),
            label: 'Pay',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Loans',
          ),
          NavigationDestination(
            icon: Icon(Icons.savings_outlined),
            selectedIcon: Icon(Icons.savings),
            label: 'VSLA',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_outlined),
            selectedIcon: Icon(Icons.account_balance),
            label: 'MFI',
          ),
          NavigationDestination(
            icon: Icon(Icons.eco_outlined),
            selectedIcon: Icon(Icons.eco),
            label: 'Carbon',
          ),
          NavigationDestination(
            icon: Icon(Icons.verified_user_outlined),
            selectedIcon: Icon(Icons.verified_user),
            label: 'Comply',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'Impact',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}