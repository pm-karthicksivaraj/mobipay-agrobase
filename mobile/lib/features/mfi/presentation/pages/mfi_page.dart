import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';
import 'package:intl/intl.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../shared/widgets/kpi_card.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';

class MfiPage extends StatefulWidget {
  const MfiPage({super.key});

  @override
  State<MfiPage> createState() => _MfiPageState();
}

class _MfiPageState extends State<MfiPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  int _currentTab = 0;

  // Loading & error states
  bool _loading = true;
  String _error = '';

  // Data
  Map<String, dynamic>? _portfolioData;
  List<Map<String, dynamic>> _loans = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _partners = [];
  int _loansTotal = 0;
  int _productsTotal = 0;
  int _partnersTotal = 0;

  // Loans tab
  String _loanStatusFilter = 'ALL';
  static const List<String> _loanStatuses = [
    'ALL',
    'PENDING',
    'APPROVED',
    'DISBURSED',
    'OVERDUE',
  ];

  // Schedule tab
  String? _selectedLoanId;
  List<Map<String, dynamic>> _schedule = [];
  Map<String, dynamic>? _scheduleSummary;
  bool _scheduleLoading = false;

  // Form controllers
  final TextEditingController _productInterestRateCtrl =
      TextEditingController();
  final TextEditingController _productMinAmountCtrl = TextEditingController();
  final TextEditingController _productMaxAmountCtrl = TextEditingController();
  final TextEditingController _productMaxDurationCtrl = TextEditingController();
  final TextEditingController _productGracePeriodCtrl = TextEditingController();
  final TextEditingController _partnerCommissionCtrl = TextEditingController();
  final TextEditingController _partnerPhoneCtrl = TextEditingController();

  String _productInterestMethod = 'FLAT';
  String _partnerType = 'MFI';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _currentTab = _tabController.index);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _refreshController.dispose();
    _productInterestRateCtrl.dispose();
    _productMinAmountCtrl.dispose();
    _productMaxAmountCtrl.dispose();
    _productMaxDurationCtrl.dispose();
    _productGracePeriodCtrl.dispose();
    _partnerCommissionCtrl.dispose();
    _partnerPhoneCtrl.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  Future<void> _loadData() async {
    try {
      final api = ApiClient();
      final responses = await Future.wait([
        api.get('/api/mfi/portfolio'),
        api.get('/api/mfi/loans?page=1&pageSize=50'),
        api.get('/api/mfi/products?page=1&pageSize=50'),
        api.get('/api/mfi/partners?page=1&pageSize=50'),
      ]);

      // Portfolio
      if (responses[0].statusCode == 200) {
        final body = jsonDecode(responses[0].body) as Map<String, dynamic>;
        _portfolioData = Map<String, dynamic>.from(body['data'] ?? body);
      }

      // Loans
      if (responses[1].statusCode == 200) {
        final body = jsonDecode(responses[1].body) as Map<String, dynamic>;
        _loans = List<Map<String, dynamic>>.from(
            (body['data'] ?? []) as List);
        _loansTotal = body['total'] ?? _loans.length;
      }

      // Products
      if (responses[2].statusCode == 200) {
        final body = jsonDecode(responses[2].body) as Map<String, dynamic>;
        _products = List<Map<String, dynamic>>.from(
            (body['data'] ?? []) as List);
        _productsTotal = body['total'] ?? _products.length;
      }

      // Partners
      if (responses[3].statusCode == 200) {
        final body = jsonDecode(responses[3].body) as Map<String, dynamic>;
        _partners = List<Map<String, dynamic>>.from(
            (body['data'] ?? []) as List);
        _partnersTotal = body['total'] ?? _partners.length;
      }

      setState(() => _error = '');
    } catch (e) {
      debugPrint('MFI load error: $e');
      setState(() => _error = 'Failed to load MFI data');
    } finally {
      _loading = false;
      _refreshController.refreshCompleted();
    }
  }

  Future<void> _loadLoansByStatus(String status) async {
    try {
      final api = ApiClient();
      final uri = status == 'ALL'
          ? '/api/mfi/loans?page=1&pageSize=50'
          : '/api/mfi/loans?status=$status&page=1&pageSize=20';
      final res = await api.get(uri);
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _loans = List<Map<String, dynamic>>.from(
              (body['data'] ?? []) as List);
          _loansTotal = body['total'] ?? _loans.length;
        });
      }
    } catch (e) {
      debugPrint('Filter loans error: $e');
    }
  }

  Future<void> _loadSchedule(String loanId) async {
    setState(() => _scheduleLoading = true);
    try {
      final api = ApiClient();
      final res = await api.get('/api/mfi/loans/$loanId/schedule');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _schedule = List<Map<String, dynamic>>.from(
              (body['schedule'] ?? []) as List);
          _scheduleSummary =
              Map<String, dynamic>.from(body['summary'] ?? {});
        });
      }
    } catch (e) {
      debugPrint('Schedule load error: $e');
    } finally {
      setState(() => _scheduleLoading = false);
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  Future<void> _handleLoanAction(
      Map<String, dynamic> loan, String action) async {
    final actionLabel = action[0].toUpperCase() + action.substring(1);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$actionLabel Loan'),
        content: Text(
          'Are you sure you want to $action the loan for ${loan['applicantName'] ?? 'this applicant'}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(
              foregroundColor: action == 'reject'
                  ? AppTheme.errorRed
                  : AppTheme.primaryGreen,
            ),
            child: Text(actionLabel),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final api = ApiClient();
      await api.patch('/api/mfi/loans/${loan['id']}',
          body: {'action': action});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Loan ${action}d successfully'),
            backgroundColor: AppTheme.successGreen,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to $action loan: $e'),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    }
  }

  Future<void> _showAddProductSheet() async {
    _productInterestRateCtrl.clear();
    _productMinAmountCtrl.clear();
    _productMaxAmountCtrl.clear();
    _productMaxDurationCtrl.clear();
    _productGracePeriodCtrl.clear();
    _productInterestMethod = 'FLAT';

    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 12,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.85,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Add Loan Product',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Product Name',
                      hintText: 'e.g. Agri-Input Loan',
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _productInterestMethod,
                    decoration: const InputDecoration(
                      labelText: 'Interest Method',
                    ),
                    items: const [
                      DropdownMenuItem(
                          value: 'FLAT', child: Text('Flat Rate')),
                      DropdownMenuItem(
                          value: 'DECLINING_BALANCE',
                          child: Text('Declining Balance')),
                      DropdownMenuItem(
                          value: 'AMORTIZED', child: Text('Amortized')),
                    ],
                    onChanged: (v) {
                      if (v != null) {
                        setSheetState(() => _productInterestMethod = v);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _productInterestRateCtrl,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Interest Rate (%)',
                      hintText: 'e.g. 12',
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _productMinAmountCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Min Amount',
                            hintText: '50000',
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _productMaxAmountCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Max Amount',
                            hintText: '5000000',
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _productMaxDurationCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Max Duration (months)',
                            hintText: '12',
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _productGracePeriodCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Grace Period (months)',
                            hintText: '0',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        if (formKey.currentState!.validate()) {
                          Navigator.pop(ctx, true);
                        }
                      },
                      child: const Text('Create Product'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    nameCtrl.dispose();

    if (result == true) {
      try {
        final api = ApiClient();
        await api.post('/api/mfi/products', body: {
          'name': nameCtrl.text,
          'interestRate':
              double.tryParse(_productInterestRateCtrl.text) ?? 0,
          'minAmount': int.tryParse(_productMinAmountCtrl.text) ?? 0,
          'maxAmount': int.tryParse(_productMaxAmountCtrl.text) ?? 0,
          'maxDuration': int.tryParse(_productMaxDurationCtrl.text) ?? 12,
          'gracePeriod': int.tryParse(_productGracePeriodCtrl.text) ?? 0,
          'interestMethod': _productInterestMethod,
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Product created successfully'),
              backgroundColor: AppTheme.successGreen,
            ),
          );
          _loadData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to create product: $e'),
              backgroundColor: AppTheme.errorRed,
            ),
          );
        }
      }
    }
  }

  Future<void> _showAddPartnerSheet() async {
    _partnerCommissionCtrl.clear();
    _partnerPhoneCtrl.clear();
    _partnerType = 'MFI';

    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final contactNameCtrl = TextEditingController();
    final contactEmailCtrl = TextEditingController();
    final addressCtrl = TextEditingController();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 12,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.9,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Add Partner',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Partner Name',
                      hintText: 'e.g. Pride Microfinance',
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _partnerType,
                    decoration: const InputDecoration(
                      labelText: 'Partner Type',
                    ),
                    items: const [
                      DropdownMenuItem(value: 'MFI', child: Text('MFI')),
                      DropdownMenuItem(value: 'BANK', child: Text('Bank')),
                      DropdownMenuItem(value: 'SACCO', child: Text('SACCO')),
                      DropdownMenuItem(
                          value: 'MICROFINANCE',
                          child: Text('Microfinance')),
                    ],
                    onChanged: (v) {
                      if (v != null) {
                        setSheetState(() => _partnerType = v);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: contactNameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Contact Name',
                      hintText: 'John Doe',
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: contactEmailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Contact Email',
                      hintText: 'john@example.com',
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _partnerPhoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Contact Phone',
                      hintText: '+256 700 000 000',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: addressCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Address',
                      hintText: 'Kampala, Uganda',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _partnerCommissionCtrl,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Commission Rate (%)',
                      hintText: '2.5',
                    ),
                    validator: (v) =>
                        (v == null || v.isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        if (formKey.currentState!.validate()) {
                          Navigator.pop(ctx, true);
                        }
                      },
                      child: const Text('Add Partner'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    nameCtrl.dispose();
    contactNameCtrl.dispose();
    contactEmailCtrl.dispose();
    addressCtrl.dispose();

    if (result == true) {
      try {
        final api = ApiClient();
        await api.post('/api/mfi/partners', body: {
          'name': nameCtrl.text,
          'type': _partnerType,
          'contactName': contactNameCtrl.text,
          'contactEmail': contactEmailCtrl.text,
          'contactPhone': _partnerPhoneCtrl.text,
          'address': addressCtrl.text,
          'commissionRate':
              double.tryParse(_partnerCommissionCtrl.text) ?? 0,
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Partner added successfully'),
              backgroundColor: AppTheme.successGreen,
            ),
          );
          _loadData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to add partner: $e'),
              backgroundColor: AppTheme.errorRed,
            ),
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceLight,
      appBar: AppBar(
        title: const Text(
          'MFI Portal',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
        ),
        backgroundColor: AppTheme.surfaceLight,
        elevation: 0,
        bottom: _buildTabBar(),
      ),
      floatingActionButton: _buildFAB(),
      body: _loading
          ? _buildMainShimmer()
          : _error.isNotEmpty
              ? EmptyState(
                  icon: Icons.error_outline,
                  title: 'Error',
                  subtitle: _error,
                  actionLabel: 'Retry',
                  onAction: _loadData,
                )
              : SmartRefresher(
                  controller: _refreshController,
                  onRefresh: _loadData,
                  child: _buildTabContent(),
                ),
    );
  }

  PreferredSizeWidget _buildTabBar() {
    const tabs = ['Overview', 'Loans', 'Products', 'Partners', 'Schedule'];
    return TabBar(
      controller: _tabController,
      labelColor: Colors.white,
      unselectedLabelColor: AppTheme.textSecondary,
      indicator: BoxDecoration(
        color: AppTheme.primaryGreen,
        borderRadius: BorderRadius.circular(8),
      ),
      indicatorSize: TabBarIndicatorSize.tab,
      dividerColor: Colors.transparent,
      labelStyle:
          const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      unselectedLabelStyle:
          const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      tabAlignment: TabAlignment.start,
      isScrollable: true,
      tabs: tabs.map((t) => Tab(text: t)).toList(),
    );
  }

  Widget? _buildFAB() {
    if (_currentTab == 2) {
      return FloatingActionButton(
        onPressed: _showAddProductSheet,
        backgroundColor: AppTheme.primaryGreen,
        child: const Icon(Icons.add, color: Colors.white),
      );
    }
    if (_currentTab == 3) {
      return FloatingActionButton(
        onPressed: _showAddPartnerSheet,
        backgroundColor: AppTheme.primaryGreen,
        child: const Icon(Icons.add, color: Colors.white),
      );
    }
    return null;
  }

  Widget _buildMainShimmer() {
    return const Padding(
      padding: EdgeInsets.all(16),
      child: LoadingShimmer(itemCount: 6, height: 120),
    );
  }

  Widget _buildTabContent() {
    switch (_currentTab) {
      case 0:
        return _buildOverviewTab();
      case 1:
        return _buildLoansTab();
      case 2:
        return _buildProductsTab();
      case 3:
        return _buildPartnersTab();
      case 4:
        return _buildScheduleTab();
      default:
        return const SizedBox.shrink();
    }
  }

  // ===========================================================================
  // Tab 1 — Overview
  // ===========================================================================

  Widget _buildOverviewTab() {
    final data = _portfolioData ?? {};
    final totalDisbursed = (data['totalDisbursed'] as num?)?.toDouble() ?? 0;
    final totalOutstanding =
        (data['totalOutstanding'] as num?)?.toDouble() ?? 0;
    final totalRepaid = (data['totalRepaid'] as num?)?.toDouble() ?? 0;
    final par30 = (data['par30'] as num?)?.toDouble() ?? 0;
    final activeLoans = (data['activeLoans'] as num?)?.toInt() ?? 0;
    final recentLoans =
        List<Map<String, dynamic>>.from(data['recentLoans'] ?? []);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Portfolio Summary',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              KpiCard(
                title: 'Total Disbursed',
                value: formatCurrency(totalDisbursed),
                icon: Icons.payments,
                color: AppTheme.primaryGreen,
              ),
              KpiCard(
                title: 'Outstanding',
                value: formatCurrency(totalOutstanding),
                icon: Icons.account_balance,
                color: Colors.orange,
              ),
              KpiCard(
                title: 'Total Repaid',
                value: formatCurrency(totalRepaid),
                icon: Icons.check_circle,
                color: AppTheme.successGreen,
              ),
              KpiCard(
                title: 'PAR30',
                value: '${par30.toStringAsFixed(1)}%',
                icon: Icons.warning,
                color: AppTheme.errorRed,
              ),
              KpiCard(
                title: 'Active Loans',
                value: '$activeLoans',
                icon: Icons.description,
                color: Colors.blue,
              ),
              KpiCard(
                title: 'Partners',
                value: '${_partnersTotal}',
                icon: Icons.handshake,
                color: Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Loans',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                '${recentLoans.length} loans',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (recentLoans.isEmpty)
            const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No recent loans',
              subtitle: 'New loan applications will appear here',
            )
          else
            ...recentLoans.map((loan) => _buildRecentLoanCard(loan)),
        ],
      ),
    );
  }

  Widget _buildRecentLoanCard(Map<String, dynamic> loan) {
    final applicant = loan['applicantName'] as String? ?? 'Unknown';
    final amount = (loan['amount'] as num?)?.toDouble() ?? 0;
    final status = loan['status'] as String? ?? 'PENDING';
    final product = loan['productName'] as String? ?? '';
    final dateStr = loan['createdAt'] as String?;
    final statusLower = status.toLowerCase();

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    applicant,
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
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  formatCurrency(amount),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primaryGreen,
                  ),
                ),
                const SizedBox(width: 8),
                if (product.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      product,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
            if (dateStr != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined,
                      size: 13, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    _parseDate(dateStr),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // Tab 2 — Loans
  // ===========================================================================

  Widget _buildLoansTab() {
    final filtered = _loanStatusFilter == 'ALL'
        ? _loans
        : _loans
            .where((l) =>
                (l['status'] as String? ?? '').toUpperCase() ==
                _loanStatusFilter)
            .toList();

    return Column(
      children: [
        _buildFilterChips(),
        Expanded(
          child: filtered.isEmpty
              ? const EmptyState(
                  icon: Icons.receipt_long_outlined,
                  title: 'No loans found',
                  subtitle: 'No loans match the selected filter',
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 8),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) =>
                      _buildLoanCard(filtered[index]),
                ),
        ),
      ],
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _loanStatuses.map((status) {
            final isSelected = _loanStatusFilter == status;
            final label =
                status == 'ALL' ? 'All' : status[0] + status.substring(1).toLowerCase();
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    setState(() => _loanStatusFilter = status);
                    _loadLoansByStatus(status);
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primaryGreen
                          : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.primaryGreen
                            : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? Colors.white
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildLoanCard(Map<String, dynamic> loan) {
    final applicant = loan['applicantName'] as String? ?? 'Unknown';
    final amount = (loan['amount'] as num?)?.toDouble() ?? 0;
    final product = loan['productName'] as String? ?? '';
    final status = (loan['status'] as String? ?? 'PENDING').toUpperCase();
    final dateStr = loan['createdAt'] as String?;
    final isPending = status == 'PENDING';
    final isApproved = status == 'APPROVED';
    final statusLower = status.toLowerCase();

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    applicant,
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
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  formatCurrency(amount),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primaryGreen,
                  ),
                ),
                const SizedBox(width: 8),
                if (product.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      product,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
            if (dateStr != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined,
                      size: 13, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    _parseDate(dateStr),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
            if (isPending) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildActionButton(
                      label: 'Approve',
                      color: AppTheme.successGreen,
                      icon: Icons.check_circle_outline,
                      onTap: () => _handleLoanAction(loan, 'approve'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionButton(
                      label: 'Reject',
                      color: AppTheme.errorRed,
                      icon: Icons.cancel_outlined,
                      onTap: () => _handleLoanAction(loan, 'reject'),
                    ),
                  ),
                ],
              ),
            ],
            if (isApproved) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: _buildActionButton(
                  label: 'Disburse',
                  color: Colors.blue,
                  icon: Icons.account_balance_wallet_outlined,
                  onTap: () => _handleLoanAction(loan, 'disburse'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required Color color,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // Tab 3 — Products
  // ===========================================================================

  Widget _buildProductsTab() {
    if (_products.isEmpty) {
      return const EmptyState(
        icon: Icons.inventory_2_outlined,
        title: 'No loan products',
        subtitle: 'Create your first loan product to get started',
        actionLabel: 'Add Product',
        onAction: null,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _products.length,
      itemBuilder: (context, index) => _buildProductCard(_products[index]),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final name = product['name'] as String? ?? 'Unnamed';
    final interestRate = (product['interestRate'] as num?)?.toDouble() ?? 0;
    final minAmount = (product['minAmount'] as num?)?.toDouble() ?? 0;
    final maxAmount = (product['maxAmount'] as num?)?.toDouble() ?? 0;
    final maxDuration = (product['maxDuration'] as int?) ?? 0;
    final gracePeriod = (product['gracePeriod'] as int?) ?? 0;
    final isActive = product['isActive'] as bool? ?? true;
    final interestMethod = product['interestMethod'] as String? ?? 'FLAT';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
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
                _buildActiveBadge(isActive),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                _buildInfoChip(
                  icon: Icons.percent,
                  label: '$interestRate% p.a.',
                  color: AppTheme.primaryGreen,
                ),
                _buildInfoChip(
                  icon: Icons.timer_outlined,
                  label: '$maxDuration mo',
                  color: Colors.blue,
                ),
                if (gracePeriod > 0)
                  _buildInfoChip(
                    icon: Icons.hourglass_top,
                    label: '${gracePeriod}mo grace',
                    color: AppTheme.accentAmber,
                  ),
                _buildInfoChip(
                  icon: Icons.trending_up,
                  label: _formatInterestMethod(interestMethod),
                  color: Colors.purple,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.payments_outlined,
                      size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 8),
                  Text(
                    '${formatCurrency(minAmount)} — ${formatCurrency(maxAmount)}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isActive
            ? const Color(0xFFDCFCE7)
            : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        isActive ? 'Active' : 'Inactive',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: isActive
              ? const Color(0xFF22C55E)
              : const Color(0xFF94A3B8),
        ),
      ),
    );
  }

  Widget _buildInfoChip({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  String _formatInterestMethod(String method) {
    switch (method.toUpperCase()) {
      case 'FLAT':
        return 'Flat';
      case 'DECLINING_BALANCE':
        return 'Declining';
      case 'AMORTIZED':
        return 'Amortized';
      default:
        return method;
    }
  }

  // ===========================================================================
  // Tab 4 — Partners
  // ===========================================================================

  Widget _buildPartnersTab() {
    if (_partners.isEmpty) {
      return const EmptyState(
        icon: Icons.handshake_outlined,
        title: 'No partners',
        subtitle: 'Add your first lending partner to get started',
        actionLabel: 'Add Partner',
        onAction: null,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _partners.length,
      itemBuilder: (context, index) => _buildPartnerCard(_partners[index]),
    );
  }

  Widget _buildPartnerCard(Map<String, dynamic> partner) {
    final name = partner['name'] as String? ?? 'Unknown';
    final type = partner['type'] as String? ?? 'MFI';
    final contactName = partner['contactName'] as String? ?? '';
    final phone = partner['contactPhone'] as String? ?? '';
    final email = partner['contactEmail'] as String? ?? '';
    final commissionRate =
        (partner['commissionRate'] as num?)?.toDouble() ?? 0;
    final isActive = partner['isActive'] as bool? ?? true;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.business,
                      color: AppTheme.primaryGreen, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          _buildTypeBadge(type),
                          const SizedBox(width: 8),
                          _buildActiveBadge(isActive),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildPartnerDetailRow(
              icon: Icons.person_outline,
              label: contactName.isNotEmpty ? contactName : 'No contact',
            ),
            if (phone.isNotEmpty) ...[
              const SizedBox(height: 6),
              _buildPartnerDetailRow(
                icon: Icons.phone_outlined,
                label: phone,
              ),
            ],
            if (email.isNotEmpty) ...[
              const SizedBox(height: 6),
              _buildPartnerDetailRow(
                icon: Icons.email_outlined,
                label: email,
              ),
            ],
            const SizedBox(height: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.percent,
                      size: 16, color: AppTheme.accentAmber),
                  const SizedBox(width: 8),
                  Text(
                    'Commission: ${commissionRate.toStringAsFixed(1)}%',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeBadge(String type) {
    final typeColors = {
      'MFI': AppTheme.primaryGreen,
      'BANK': Colors.blue,
      'SACCO': AppTheme.accentAmber,
      'MICROFINANCE': Colors.purple,
    };
    final color = typeColors[type.toUpperCase()] ?? AppTheme.textSecondary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        type,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildPartnerDetailRow({
    required IconData icon,
    required String label,
  }) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AppTheme.textSecondary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // Tab 5 — Schedule
  // ===========================================================================

  Widget _buildScheduleTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Loan Amortization Schedule',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String?>(
                value: _selectedLoanId,
                isExpanded: true,
                hint: const Text('Select a loan'),
                items: _loans.map((loan) {
                  final id = loan['id']?.toString();
                  final name = loan['applicantName'] as String? ?? 'Unknown';
                  final amount =
                      (loan['amount'] as num?)?.toDouble() ?? 0;
                  return DropdownMenuItem<String?>(
                    value: id,
                    child: Text(
                      '$name — ${formatCurrency(amount)}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14),
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedLoanId = value;
                    _schedule = [];
                    _scheduleSummary = null;
                  });
                  if (value != null) {
                    _loadSchedule(value);
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_scheduleLoading)
            const LoadingShimmer(itemCount: 5, height: 60)
          else if (_selectedLoanId == null)
            const EmptyState(
              icon: Icons.table_chart_outlined,
              title: 'Select a loan',
              subtitle: 'Choose a loan above to view its repayment schedule',
            )
          else if (_schedule.isEmpty)
            const EmptyState(
              icon: Icons.table_chart_outlined,
              title: 'No schedule available',
              subtitle: 'This loan does not have an amortization schedule',
            )
          else ...[
            if (_scheduleSummary != null) ...[
              _buildSummaryCards(),
              const SizedBox(height: 16),
            ],
            _buildScheduleTable(),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    final summary = _scheduleSummary!;
    final monthly =
        (summary['monthlyPayment'] as num?)?.toDouble() ?? 0;
    final totalInterest =
        (summary['totalInterest'] as num?)?.toDouble() ?? 0;
    final totalRepayable =
        (summary['totalRepayable'] as num?)?.toDouble() ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildSummaryItem(
              label: 'Monthly Payment',
              value: formatCurrency(monthly),
              color: AppTheme.primaryGreen,
            ),
          ),
          Container(width: 1, height: 40, color: const Color(0xFFE2E8F0)),
          Expanded(
            child: _buildSummaryItem(
              label: 'Total Interest',
              value: formatCurrency(totalInterest),
              color: AppTheme.accentAmber,
            ),
          ),
          Container(width: 1, height: 40, color: const Color(0xFFE2E8F0)),
          Expanded(
            child: _buildSummaryItem(
              label: 'Total Repayable',
              value: formatCurrency(totalRepayable),
              color: Colors.blue,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem({
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppTheme.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildScheduleTable() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.surfaceLight,
              borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16)),
            ),
            child: const Row(
              children: [
                SizedBox(width: 36, child: Text('#', style: _headerStyle)),
                SizedBox(width: 72, child: Text('Due Date', style: _headerStyle)),
                Expanded(child: Text('Principal', style: _headerStyle, textAlign: TextAlign.end)),
                SizedBox(width: 72, child: Text('Interest', style: _headerStyle, textAlign: TextAlign.end)),
                SizedBox(width: 72, child: Text('Total', style: _headerStyle, textAlign: TextAlign.end)),
                SizedBox(width: 76, child: Text('Balance', style: _headerStyle, textAlign: TextAlign.end)),
                SizedBox(width: 56, child: Text('Status', style: _headerStyle, textAlign: TextAlign.center)),
              ],
            ),
          ),
          // Rows
          ..._schedule.asMap().entries.map((entry) {
            final index = entry.key;
            final row = entry.value;
            final isLast = index == _schedule.length - 1;
            return _buildScheduleRow(row, isLast);
          }),
        ],
      ),
    );
  }

  Widget _buildScheduleRow(Map<String, dynamic> row, bool isLast) {
    final installment = row['installmentNumber'] ?? row['installment'] ?? 0;
    final dueDate = row['dueDate'] as String?;
    final principal = (row['principal'] as num?)?.toDouble() ?? 0;
    final interest = (row['interest'] as num?)?.toDouble() ?? 0;
    final total = (row['total'] as num?)?.toDouble() ?? 0;
    final balance = (row['balance'] as num?)?.toDouble() ?? 0;
    final status = (row['status'] as String? ?? 'PENDING').toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: Border(
          bottom: isLast
              ? BorderSide.none
              : const BorderSide(color: Color(0xFFF1F5F9)),
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(
              '$installment',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppTheme.textSecondary,
              ),
            ),
          ),
          SizedBox(
            width: 72,
            child: Text(
              dueDate != null ? _parseDateShort(dueDate) : '—',
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              formatCurrency(principal),
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textPrimary,
              ),
              textAlign: TextAlign.end,
            ),
          ),
          SizedBox(
            width: 72,
            child: Text(
              formatCurrency(interest),
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.end,
            ),
          ),
          SizedBox(
            width: 72,
            child: Text(
              formatCurrency(total),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryGreen,
              ),
              textAlign: TextAlign.end,
            ),
          ),
          SizedBox(
            width: 76,
            child: Text(
              formatCurrency(balance),
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textPrimary,
              ),
              textAlign: TextAlign.end,
            ),
          ),
          SizedBox(
            width: 56,
            child: Center(
              child: StatusBadge(status: status),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  String _parseDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }

  String _parseDateShort(String? dateStr) {
    if (dateStr == null) return '—';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM d').format(dt);
    } catch (_) {
      return '—';
    }
  }
}

// Table header text style
const _headerStyle = TextStyle(
  fontSize: 11,
  fontWeight: FontWeight.w700,
  color: AppTheme.textSecondary,
);