import 'package:flutter/material.dart';

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final String? subtitle; // alias for message
  final String? actionLabel;
  final VoidCallback? onAction;
  final VoidCallback? onRetry; // alias for onAction

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final displayMessage = message ?? subtitle;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                icon,
                size: 40,
                color: const Color(0xFF94A3B8),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1E293B),
                  ),
              textAlign: TextAlign.center,
            ),
            if (displayMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                displayMessage,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && (onAction != null || onRetry != null)) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: 200,
                height: 44,
                child: ElevatedButton(
                  onPressed: onAction ?? onRetry,
                  child: Text(actionLabel!),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}