import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const ctx = await getTenantContext(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)

    const available = [
      { type: 'farmer-registrations', label: 'Farmer Registrations', description: 'List of all registered farmers with demographics' },
      { type: 'sales-summary', label: 'Sales Summary', description: 'Aggregated sales data by period, commodity, and buyer' },
      { type: 'loan-portfolio', label: 'Loan Portfolio', description: 'Outstanding loans, disbursements, and repayment status' },
      { type: 'inventory-stock', label: 'Inventory Stock', description: 'Current warehouse stock levels and movements' },
      { type: 'vsla-savings', label: 'VSLA Savings', description: 'VSLA group savings and loan activity' },
      { type: 'carbon-credits', label: 'Carbon Credits', description: 'Carbon credit portfolio and transaction history' },
      { type: 'compliance-cbam', label: 'CBAM Compliance', description: 'EU CBAM reporting data and emissions' },
      { type: 'compliance-eudr', label: 'EUDR Compliance', description: 'EUDR due diligence and risk assessments' },
      { type: 'traceability', label: 'Traceability', description: 'Supply chain traceability and farm passport data' },
      { type: 'trainings', label: 'Trainings', description: 'Training sessions, attendance, and impact' },
    ]

    const search = (searchParams.get('q') || '').toLowerCase()
    const filtered = search
      ? available.filter((r) => r.label.toLowerCase().includes(search) || r.type.includes(search))
      : available

    return NextResponse.json({ data: filtered })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list reports' }, { status: 500 })
  }
}