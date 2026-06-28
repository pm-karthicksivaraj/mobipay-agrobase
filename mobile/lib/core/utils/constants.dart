import 'package:flutter/material.dart';

class AppConstants {
  // API Paths
  static const String authLogin = '/api/auth/login';
  static const String authLogout = '/api/auth/logout';
  static const String authSession = '/api/auth/session';

  static const String farmersBase = '/api/farmers';
  static const String loansBase = '/api/loans';
  static const String vslaBase = '/api/vsla';
  static const String dashboardBase = '/api/dashboard';
  static const String savingsBase = '/api/savings';

  // Storage Keys
  static const String authTokenKey = 'auth_token';
  static const String userIdKey = 'user_id';
  static const String tenantIdKey = 'tenant_id';
  static const String userRoleKey = 'user_role';
  static const String userNameKey = 'user_name';

  // Pagination
  static const int defaultPageSize = 20;

  // Status Color Mapping
  static final Map<String, Color> statusColors = {
    'active': const Color(0xFF22C55E),
    'completed': const Color(0xFF22C55E),
    'approved': const Color(0xFF22C55E),
    'paid': const Color(0xFF22C55E),
    'pending': const Color(0xFFF59E0B),
    'in_review': const Color(0xFFF59E0B),
    'processing': const Color(0xFF3B82F6),
    'disbursed': const Color(0xFF3B82F6),
    'overdue': const Color(0xFFEF4444),
    'defaulted': const Color(0xFFEF4444),
    'rejected': const Color(0xFFEF4444),
    'cancelled': const Color(0xFF94A3B8),
    'inactive': const Color(0xFF94A3B8),
    'draft': const Color(0xFF94A3B8),
  };

  static final Map<String, Color> statusBackgroundColors = {
    'active': const Color(0xFFDCFCE7),
    'completed': const Color(0xFFDCFCE7),
    'approved': const Color(0xFFDCFCE7),
    'paid': const Color(0xFFDCFCE7),
    'pending': const Color(0xFFFEF3C7),
    'in_review': const Color(0xFFFEF3C7),
    'processing': const Color(0xFFDBEAFE),
    'disbursed': const Color(0xFFDBEAFE),
    'overdue': const Color(0xFFFEE2E2),
    'defaulted': const Color(0xFFFEE2E2),
    'rejected': const Color(0xFFFEE2E2),
    'cancelled': const Color(0xFFF1F5F9),
    'inactive': const Color(0xFFF1F5F9),
    'draft': const Color(0xFFF1F5F9),
  };

  // Currencies
  static const Map<String, String> currencySymbols = {
    'UGX': 'UGX',
    'KES': 'KES',
    'GHS': 'GHS',
    'TZS': 'TZS',
    'RWF': 'RWF',
    'USD': '\$',
  };

  // App Info
  static const String appName = 'Agrobase';
  static const String appVersion = '1.0.0';
}