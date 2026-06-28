import 'package:intl/intl.dart';

String formatCurrency(double amount, {String currencyCode = 'UGX'}) {
  final symbols = {
    'UGX': 'UGX',
    'KES': 'KES',
    'GHS': 'GHS',
    'TZS': 'TZS',
    'RWF': 'RWF',
    'USD': '\$',
  };
  final symbol = symbols[currencyCode] ?? currencyCode;
  final formatted = NumberFormat('#,##0', 'en_US').format(amount.round());
  return '$symbol $formatted';
}

String formatDate(DateTime date) {
  return DateFormat('dd MMM yyyy').format(date);
}

String formatDateFull(DateTime date) {
  return DateFormat('dd MMMM yyyy, HH:mm').format(date);
}

String formatRelativeTime(DateTime date) {
  final now = DateTime.now();
  final difference = now.difference(date);

  if (difference.inDays > 365) {
    final years = (difference.inDays / 365).floor();
    return '$years ${years == 1 ? 'year' : 'years'} ago';
  } else if (difference.inDays > 30) {
    final months = (difference.inDays / 30).floor();
    return '$months ${months == 1 ? 'month' : 'months'} ago';
  } else if (difference.inDays > 0) {
    return '${difference.inDays} ${difference.inDays == 1 ? 'day' : 'days'} ago';
  } else if (difference.inHours > 0) {
    return '${difference.inHours} ${difference.inHours == 1 ? 'hour' : 'hours'} ago';
  } else if (difference.inMinutes > 0) {
    return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'min' : 'mins'} ago';
  } else {
    return 'Just now';
  }
}

String formatCompactNumber(num number) {
  if (number >= 1000000) {
    return '${(number / 1000000).toStringAsFixed(1)}M';
  } else if (number >= 1000) {
    return '${(number / 1000).toStringAsFixed(1)}K';
  }
  return number.toString();
}

String? validateEmail(String? value) {
  if (value == null || value.isEmpty) {
    return 'Email is required';
  }
  final regex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
  if (!regex.hasMatch(value)) {
    return 'Enter a valid email address';
  }
  return null;
}

String? validatePassword(String? value) {
  if (value == null || value.isEmpty) {
    return 'Password is required';
  }
  if (value.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}