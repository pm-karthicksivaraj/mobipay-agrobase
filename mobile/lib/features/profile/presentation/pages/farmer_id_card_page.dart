import 'dart:convert';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/theme/app_theme.dart';

/// Farmer ID Card — a printable/shareable card with QR code.
///
/// EKIBBO requirement: "Softcopy farmer IDs that can be printed and include a QR code."
///
/// Shows: farmer photo, name, farmer code, group, location, farm size,
/// certification type, and a QR code linking to the farmer's passport
/// verification URL.
class FarmerIdCardPage extends StatefulWidget {
  const FarmerIdCardPage({super.key});

  @override
  State<FarmerIdCardPage> createState() => _FarmerIdCardPageState();
}

class _FarmerIdCardPageState extends State<FarmerIdCardPage> {
  Map<String, dynamic>? _farmer;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadFarmer();
  }

  Future<void> _loadFarmer() async {
    try {
      final res = await ApiClient().get('/api/farmers?limit=1');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final farmers = data['farmers'] as List<dynamic>? ?? [];
        if (farmers.isNotEmpty) {
          setState(() {
            _farmer = farmers[0] as Map<String, dynamic>;
            _loading = false;
          });
          return;
        }
      }
      setState(() => _loading = false);
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Farmer ID Card'),
        backgroundColor: AppTheme.primaryGreen,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _farmer != null ? _shareCard : null,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _farmer == null
              ? const Center(child: Text('No farmer data found'))
              : Center(child: _buildIdCard()),
    );
  }

  Widget _buildIdCard() {
    final f = _farmer!;
    final name = '${f['firstName'] ?? ''} ${f['lastName'] ?? ''}';
    final code = f['farmerCode'] ?? 'N/A';
    final group = f['group']?['name'] ?? 'No group';
    final phone = f['phone'] ?? 'N/A';
    final village = f['villageName'] ?? f['district'] ?? 'N/A';
    final farmSize = f['farmSize']?.toString() ?? 'N/A';
    final cert = f['isCertified'] == true
        ? (f['certificationType'] ?? 'Certified')
        : 'Not Certified';
    final gender = f['gender'] ?? 'N/A';
    final verificationUrl = 'https://verify.agrobase.co/passport/${f['id'] ?? ''}';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: RepaintBoundary(
        key: const Key('farmer-id-card'),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.12),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              // Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGreen,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.eco, color: Colors.white, size: 28),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AGROBASE V3',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                            ),
                          ),
                          Text(
                            'Farmer Identification Card',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Body
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Photo + Name + Code
                    Row(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.lightGreen,
                            border: Border.all(color: AppTheme.primaryGreen, width: 2),
                          ),
                          child: f['photoUrl'] != null
                              ? ClipOval(child: Image.network(f['photoUrl'], fit: BoxFit.cover))
                              : Icon(Icons.person, size: 36, color: AppTheme.primaryGreen),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 4),
                              _buildInfoChip('Code', code),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Info grid
                    _buildInfoRow('Phone', phone),
                    _buildInfoRow('Group', group),
                    _buildInfoRow('Location', village),
                    _buildInfoRow('Farm Size', '$farmSize ha'),
                    _buildInfoRow('Gender', gender),
                    _buildInfoRow('Certification', cert),
                    const SizedBox(height: 20),

                    // QR Code section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Column(
                        children: [
                          // QR placeholder (in production: generate from verificationUrl)
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppTheme.primaryGreen, width: 2),
                            ),
                            child: Icon(Icons.qr_code, size: 80, color: AppTheme.primaryGreen),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Scan to verify farmer',
                            style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            verificationUrl,
                            style: TextStyle(fontSize: 9, color: AppTheme.primaryGreen),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Footer
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Issued: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
                            style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                          ),
                          Text(
                            'MobiPay AgroSys Limited',
                            style: TextStyle(fontSize: 10, color: Colors.grey[600], fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.lightGreen,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(fontSize: 11, color: AppTheme.primaryGreen, fontWeight: FontWeight.w600),
      ),
    );
  }

  void _shareCard() {
    // In production: capture the RepaintBoundary as image and share
    // For demo: share the verification URL
    final url = 'https://verify.agrobase.co/passport/${_farmer?['id'] ?? ''}';
    Share.share('Agrobase Farmer ID: ${_farmer?['firstName']} ${_farmer?['lastName']}\nVerify: $url');
  }
}
