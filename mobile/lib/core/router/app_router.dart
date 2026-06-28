import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/farmers/presentation/pages/farmers_page.dart';
import '../../features/farmers/presentation/pages/farmer_detail_page.dart';
import '../../features/loans/presentation/pages/loans_page.dart';
import '../../features/vsla/presentation/pages/vsla_page.dart';
import '../../features/mfi/presentation/pages/mfi_page.dart';
import '../../features/carbon/presentation/pages/carbon_page.dart';
import '../../features/compliance/presentation/pages/compliance_page.dart';
import '../../features/plots/presentation/pages/plots_page.dart';
import '../../features/plots/presentation/pages/plot_detail_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';

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
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}