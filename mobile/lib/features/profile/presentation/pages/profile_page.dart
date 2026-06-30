import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';
import 'package:intl/intl.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/auth/auth_provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/constants.dart';
import '../../../shared/widgets/kpi_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _notificationsEnabled = true;

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorRed,
            ),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final authProvider = context.read<AuthState>();
      await authProvider.logout();
      if (mounted) {
        context.go('/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthState>();
    final name = authProvider.userName ?? 'User';
    final role = authProvider.role ?? 'Field Officer';
    final email = '';
    final initials = _getInitials(name);

    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: const Text(
          'Profile',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            _buildProfileHeader(name, role, email, initials),
            const SizedBox(height: 24),

            // ─── EKIBBO: Farmer ID Card + My Trainings ───
            _buildSectionTitle('My Card & Trainings'),
            const SizedBox(height: 8),
            _buildSettingsCard([
              _SettingsItem(
                icon: Icons.badge_outlined,
                label: 'Farmer ID Card (with QR)',
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary, size: 20),
                onTap: () => context.push('/profile/farmer-id-card'),
              ),
              const _SettingsDivider(),
              _SettingsItem(
                icon: Icons.school_outlined,
                label: 'My Trainings & Visits',
                trailing: const Icon(Icons.chevron_right, color: AppTheme.textSecondary, size: 20),
                onTap: () => context.push('/profile/trainings'),
              ),
            ]),
            const SizedBox(height: 24),

            _buildSectionTitle('Account Settings'),
            const SizedBox(height: 8),
            _buildSettingsCard([
              _SettingsItem(
                icon: Icons.person_outline,
                label: 'Edit Profile',
                onTap: () {},
              ),
              const _SettingsDivider(),
              _SettingsItem(
                icon: Icons.lock_outline,
                label: 'Change Password',
                onTap: () {},
              ),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle('App Settings'),
            const SizedBox(height: 8),
            _buildSettingsCard([
              _SettingsItem(
                icon: Icons.language_outlined,
                label: 'Language',
                trailing: const Text(
                  'English',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
                onTap: () {},
              ),
              const _SettingsDivider(),
              _SettingsItem(
                icon: Icons.currency_exchange_outlined,
                label: 'Currency',
                trailing: const Text(
                  'UGX',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
                onTap: () {},
              ),
              const _SettingsDivider(),
              _SettingsItem(
                icon: Icons.notifications_outlined,
                label: 'Notifications',
                trailing: Switch(
                  value: _notificationsEnabled,
                  activeColor: AppTheme.primaryGreen,
                  onChanged: (v) {
                    setState(() => _notificationsEnabled = v);
                  },
                ),
                onTap: () {
                  setState(
                      () => _notificationsEnabled = !_notificationsEnabled);
                },
              ),
            ]),
            const SizedBox(height: 24),
            _buildSectionTitle('Support'),
            const SizedBox(height: 8),
            _buildSettingsCard([
              _SettingsItem(
                icon: Icons.help_outline,
                label: 'Help Center',
                onTap: () {},
              ),
              const _SettingsDivider(),
              _SettingsItem(
                icon: Icons.info_outline,
                label: 'About',
                trailing: const Text(
                  'v1.0.0',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
                onTap: () {},
              ),
              const _SettingsDivider(),
              _SettingsItem(
                icon: Icons.logout,
                label: 'Log Out',
                iconColor: AppTheme.errorRed,
                labelColor: AppTheme.errorRed,
                onTap: _logout,
              ),
            ]),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(
      String name, String role, String email, String initials) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 42,
            backgroundColor: AppTheme.primaryGreen.withValues(alpha: 0.1),
            child: Text(
              initials,
              style: const TextStyle(
                color: AppTheme.primaryGreen,
                fontWeight: FontWeight.w700,
                fontSize: 28,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            name,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primaryGreen.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              role,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppTheme.primaryGreen,
              ),
            ),
          ),
          if (email.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.email_outlined,
                  size: 15,
                  color: AppTheme.textSecondary,
                ),
                const SizedBox(width: 6),
                Text(
                  email,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppTheme.textSecondary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Color(0xFFE2E8F0)),
      ),
      child: Column(children: children),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }
}

class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget? trailing;
  final Color? iconColor;
  final Color? labelColor;
  final VoidCallback? onTap;

  const _SettingsItem({
    required this.icon,
    required this.label,
    this.trailing,
    this.iconColor,
    this.labelColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveIconColor = iconColor ?? AppTheme.textSecondary;
    final effectiveLabelColor = labelColor ?? AppTheme.textPrimary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 22, color: effectiveIconColor),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: effectiveLabelColor,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
              if (trailing == null)
                Icon(
                  Icons.chevron_right,
                  color: AppTheme.textSecondary,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsDivider extends StatelessWidget {
  const _SettingsDivider();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Divider(
        height: 1,
        color: Color(0xFFE2E8F0),
      ),
    );
  }
}