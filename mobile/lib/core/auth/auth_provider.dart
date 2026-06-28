import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

class AuthState extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _token;
  String? _userId;
  String? _tenantId;
  String? _role;
  String? _userName;
  String? _error;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;
  String? get userName => _userName;
  String? get role => _role;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    _userId = prefs.getString('user_id');
    _tenantId = prefs.getString('tenant_id');
    _role = prefs.getString('user_role');
    _userName = prefs.getString('user_name');
    if (_token != null) {
      _isAuthenticated = true;
      _api.setAuth(_token!, _tenantId!);
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await _api.post('/api/auth/login', body: {
        'email': email,
        'password': password,
      });
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        // Parse from NextAuth response
        _token = data['token'] ?? data['accessToken'];
        _userId = data['user']?['id'] ?? data['userId'];
        _tenantId = data['user']?['tenantId'] ?? data['tenantId'];
        _role = data['user']?['role'] ?? data['role'];
        _userName = data['user']?['name'] ?? email;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);
        await prefs.setString('user_id', _userId!);
        await prefs.setString('tenant_id', _tenantId!);
        await prefs.setString('user_role', _role!);
        await prefs.setString('user_name', _userName!);

        _api.setAuth(_token!, _tenantId!);
        _isAuthenticated = true;
        notifyListeners();
        return true;
      } else {
        _error = 'Invalid email or password';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Connection error. Please try again.';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _token = null;
    _userId = null;
    _tenantId = null;
    _role = null;
    _userName = null;
    _isAuthenticated = false;
    _api.clearAuth();
    notifyListeners();
  }
}