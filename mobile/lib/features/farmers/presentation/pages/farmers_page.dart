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

class FarmersPage extends StatefulWidget {
  const FarmersPage({super.key});

  @override
  State<FarmersPage> createState() => _FarmersPageState();
}

class _FarmersPageState extends State<FarmersPage> {
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Map<String, dynamic>> _farmers = [];
  bool _loading = true;
  bool _loadingMore = false;
  String _searchQuery = '';
  String _activeFilter = 'All';
  int _currentPage = 1;
  bool _hasMore = true;

  static const List<String> _filters = ['All', 'Active', 'Inactive', 'New'];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _refreshController.dispose();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _searchQuery = _searchController.text.toLowerCase();
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent * 0.8 &&
        !_loadingMore &&
        _hasMore) {
      _loadMore();
    }
  }

  Future<void> _loadData() async {
    try {
      final api = ApiClient();
      final res = await api.get('/api/farmers?page=1&limit=20');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _farmers = List<Map<String, dynamic>>.from(data['farmers'] ?? []);
          _hasMore = data['hasMore'] ?? false;
          _currentPage = 1;
        });
      }
    } catch (e) {
      debugPrint('Farmers load error: $e');
    } finally {
      _loading = false;
      _refreshController.refreshCompleted();
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);

    try {
      final nextPage = _currentPage + 1;
      final api = ApiClient();
      final res = await api.get('/api/farmers?page=$nextPage&limit=20');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final newFarmers =
            List<Map<String, dynamic>>.from(data['farmers'] ?? []);
        setState(() {
          _farmers.addAll(newFarmers);
          _hasMore = data['hasMore'] ?? false;
          _currentPage = nextPage;
        });
      }
    } catch (e) {
      debugPrint('Load more error: $e');
    } finally {
      setState(() => _loadingMore = false);
    }
  }

  List<Map<String, dynamic>> get _filteredFarmers {
    var filtered = _farmers;

    if (_activeFilter != 'All') {
      final filterLower = _activeFilter.toLowerCase();
      filtered = filtered
          .where((f) =>
              (f['status'] as String? ?? '').toLowerCase() == filterLower)
          .toList();
    }

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((f) {
        final name = (f['name'] as String? ?? '').toLowerCase();
        final phone = (f['phone'] as String? ?? '').toLowerCase();
        final district = (f['district'] as String? ?? '').toLowerCase();
        return name.contains(_searchQuery) ||
            phone.contains(_searchQuery) ||
            district.contains(_searchQuery);
      }).toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: const Text(
          'Farmers',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 20,
          ),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showRegisterDialog(context),
        backgroundColor: AppTheme.primaryGreen,
        icon: const Icon(Icons.person_add_alt_1, color: Colors.white),
        label: const Text(
          'Register Farmer',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildFilterChips(),
          Expanded(
            child: _loading
                ? _buildShimmerList()
                : _filteredFarmers.isEmpty
                    ? const EmptyState(
                        icon: Icons.people_outline,
                        title: 'No farmers found',
                        subtitle: 'Try adjusting your search or filters',
                      )
                    : SmartRefresher(
                        controller: _refreshController,
                        onRefresh: _loadData,
                        enablePullUp: false,
                        child: ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          itemCount:
                              _filteredFarmers.length + (_loadingMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index >= _filteredFarmers.length) {
                              return _buildLoadingMoreIndicator();
                            }
                            return _buildFarmerCard(_filteredFarmers[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Color(0xFFE2E8F0)),
        ),
        child: TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search farmers by name, phone, district...',
            hintStyle: const TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
            ),
            prefixIcon: const Icon(
              Icons.search,
              color: AppTheme.textSecondary,
              size: 20,
            ),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () => _searchController.clear(),
                  )
                : null,
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _filters.map((filter) {
            final isActive = _activeFilter == filter;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(
                  filter,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                    color:
                        isActive ? Colors.white : AppTheme.textSecondary,
                  ),
                ),
                selected: isActive,
                selectedColor: AppTheme.primaryGreen,
                backgroundColor: Colors.white,
                side: BorderSide(
                  color: isActive
                      ? AppTheme.primaryGreen
                      : Color(0xFFE2E8F0),
                ),
                showCheckmark: false,
                padding: const EdgeInsets.symmetric(
                  horizontal: 4,
                  vertical: 2,
                ),
                onSelected: (_) {
                  setState(() => _activeFilter = filter);
                },
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildFarmerCard(Map<String, dynamic> farmer) {
    final name = farmer['name'] as String? ?? 'Unknown';
    final phone = farmer['phone'] as String? ?? '';
    final district = farmer['district'] as String? ?? '';
    final cropType = farmer['cropType'] as String? ?? '';
    final status = farmer['status'] as String? ?? 'active';
    final initials = _getInitials(name);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/farmers/${farmer['id']}'),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor:
                      AppTheme.primaryGreen.withValues(alpha: 0.1),
                  child: Text(
                    initials,
                    style: const TextStyle(
                      color: AppTheme.primaryGreen,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          StatusBadge(status: status),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (phone.isNotEmpty)
                        Row(
                          children: [
                            const Icon(
                              Icons.phone_outlined,
                              size: 13,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              phone,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (district.isNotEmpty) ...[
                            const Icon(
                              Icons.location_on_outlined,
                              size: 13,
                              color: AppTheme.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              district,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                          if (district.isNotEmpty && cropType.isNotEmpty)
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 6),
                              child: Text(
                                '\u2022',
                                style: TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          if (cropType.isNotEmpty)
                            Text(
                              cropType,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.chevron_right,
                  color: AppTheme.textSecondary,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  Widget _buildShimmerList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: 6,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: LoadingShimmer(height: 88),
        );
      },
    );
  }

  Widget _buildLoadingMoreIndicator() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
    );
  }

  void _showRegisterDialog(BuildContext context) {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final districtController = TextEditingController();
    final cropController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Register New Farmer',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Form(
                    key: formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: nameController,
                          decoration: _inputDecoration('Full Name'),
                          validator: (v) =>
                              v?.isEmpty ?? true ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: phoneController,
                          decoration: _inputDecoration('Phone Number'),
                          keyboardType: TextInputType.phone,
                          validator: (v) =>
                              v?.isEmpty ?? true ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: districtController,
                          decoration: _inputDecoration('District'),
                          validator: (v) =>
                              v?.isEmpty ?? true ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: cropController,
                          decoration: _inputDecoration('Primary Crop Type'),
                          validator: (v) =>
                              v?.isEmpty ?? true ? 'Required' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              if (formKey.currentState?.validate() ??
                                  false) {
                                setModalState(() => isSubmitting = true);
                                try {
                                  final api = ApiClient();
                                  await api.post('/api/farmers', body: {
                                    'name': nameController.text,
                                    'phone': phoneController.text,
                                    'district': districtController.text,
                                    'cropType': cropController.text,
                                  });
                                  if (ctx.mounted) {
                                    Navigator.pop(ctx);
                                    _loadData();
                                    ScaffoldMessenger.of(context)
                                        .showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'Farmer registered successfully'),
                                        backgroundColor:
                                            AppTheme.successGreen,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (ctx.mounted) {
                                    ScaffoldMessenger.of(context)
                                        .showSnackBar(
                                      SnackBar(
                                        content: Text(
                                            'Failed to register: $e'),
                                        backgroundColor: AppTheme.errorRed,
                                      ),
                                    );
                                  }
                                } finally {
                                  setModalState(() => isSubmitting = false);
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryGreen,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Register Farmer',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: AppTheme.textSecondary,
        fontSize: 14,
      ),
      filled: true,
      fillColor: AppTheme.surfaceLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide:
            const BorderSide(color: AppTheme.primaryGreen, width: 2),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}