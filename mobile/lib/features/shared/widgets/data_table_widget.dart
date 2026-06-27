import 'package:flutter/material.dart';

class DataTableWidget extends StatelessWidget {
  final List<String> columns;
  final List<List<String>> rows;
  final VoidCallback? onRowTap;

  const DataTableWidget({
    super.key,
    required this.columns,
    required this.rows,
    this.onRowTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columnSpacing: 24,
          headingRowHeight: 48,
          dataRowMinHeight: 52,
          dataRowMaxHeight: 52,
          headingRowColor: WidgetStateProperty.all(
            const Color(0xFFF8FAFC),
          ),
          columns: columns
              .map((col) => DataColumn(
                    label: Text(
                      col,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ))
              .toList(),
          rows: rows.asMap().entries.map((entry) {
            final row = entry.value;
            return DataRow(
              onSelectChanged: (_) => onRowTap?.call(),
              cells: row
                  .map((cell) => DataCell(
                        Text(
                          cell,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ))
                  .toList(),
            );
          }).toList(),
        ),
      ),
    );
  }
}