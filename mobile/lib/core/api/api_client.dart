import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  /// Base URL resolved in priority order:
  /// 1. Compile-time: `flutter run --dart-define=API_BASE_URL=http://...`
  /// 2. Runtime: stored in SharedPreferences (for app settings screen)
  /// 3. Default: auto-detected per platform (Android emulator / iOS simulator / physical device)
  static const String _compiledBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '', // empty = use runtime detection
  );

  static String? _runtimeBaseUrl;

  /// Returns the effective base URL, performing platform detection on first call.
  /// Android emulator → http://10.0.2.2:3000
  /// iOS simulator  → http://localhost:3000
  /// Physical device → http://<host-lan-ip>:3000  (set via settings or --dart-define)
  static Future<String> getBaseUrl() async {
    // 1. Compile-time override (highest priority)
    if (_compiledBaseUrl.isNotEmpty) return _compiledBaseUrl;

    // 2. Runtime override (from SharedPreferences / app settings)
    if (_runtimeBaseUrl != null) return _runtimeBaseUrl!;
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('api_base_url');
    if (stored != null && stored.isNotEmpty) {
      _runtimeBaseUrl = stored;
      return stored;
    }

    // 3. Platform-aware defaults
    if (Platform.isAndroid) {
      // On Android emulator, 10.0.2.2 forwards to host localhost
      // On real devices, this won't work — user must set the URL in settings
      return 'http://10.0.2.2:3000';
    } else if (Platform.isIOS) {
      // iOS simulator can reach host localhost directly
      return 'http://localhost:3000';
    }

    // Fallback
    return 'http://10.0.2.2:3000';
  }

  /// Call this from a settings screen to let users configure the server URL.
  static Future<void> setBaseUrl(String url) async {
    _runtimeBaseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', url);
  }

  /// Clear the runtime override (revert to compile-time or platform default).
  static Future<void> clearBaseUrl() async {
    _runtimeBaseUrl = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('api_base_url');
  }

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
    final base = await getBaseUrl();
    final uri = Uri.parse('$base$path');
    return http.get(uri, headers: _headers);
  }

  Future<http.Response> post(String path, {Map<String, dynamic>? body}) async {
    final base = await getBaseUrl();
    final uri = Uri.parse('$base$path');
    return http.post(uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null);
  }

  Future<http.Response> put(String path, {Map<String, dynamic>? body}) async {
    final base = await getBaseUrl();
    final uri = Uri.parse('$base$path');
    return http.put(uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null);
  }

  Future<http.Response> patch(String path, {Map<String, dynamic>? body}) async {
    final base = await getBaseUrl();
    final uri = Uri.parse('$base$path');
    return http.patch(uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null);
  }

  Future<http.Response> delete(String path) async {
    final base = await getBaseUrl();
    final uri = Uri.parse('$base$path');
    return http.delete(uri, headers: _headers);
  }
}