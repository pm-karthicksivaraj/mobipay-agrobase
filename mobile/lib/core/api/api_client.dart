import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://agrobase.mobipay.co.ug',
  );

  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  String? _token;
  String? _tenantId;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    _tenantId = prefs.getString('tenant_id');
  }

  void setAuth(String token, String tenantId) {
    _token = token;
    _tenantId = tenantId;
  }

  void clearAuth() {
    _token = null;
    _tenantId = null;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
        if (_tenantId != null) 'X-Tenant-ID': _tenantId!,
      };

  Future<http.Response> get(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    return http.get(uri, headers: _headers);
  }

  Future<http.Response> post(String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    return http.post(uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null);
  }

  Future<http.Response> put(String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    return http.put(uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null);
  }

  Future<http.Response> patch(String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    return http.patch(uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null);
  }

  Future<http.Response> delete(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    return http.delete(uri, headers: _headers);
  }
}