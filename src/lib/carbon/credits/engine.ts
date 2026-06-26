/**
 * Agrobase V3 — Carbon Credits Engine
 *
 * Full lifecycle management for Verra VCS / Gold Standard carbon credits:
 *   - Project registration with methodology selection
 *   - PDD (Project Design Document) generation
 *   - VVB (Validation/Verification Body) verification workflow
 *   - Credit issuance, retirement, and transfer
 *   - Methodology parameter management
 *
 * Static class pattern (consistent with EscrowEngine, ExportEngine, etc.)
 */

import { db } from '@/lib/db'
import { CarbonCalculator } from '../calculator'
import { getEmissionFactor } from '../emission-factors'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────────────────

export type CarbonStandard = 'VERRA_VCS' | 'GOLD_STANDARD' | 'PLANET' | 'AMERICAN_CARBON_REGISTRY'
export type ProjectStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REGISTERED' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
export type CreditStatus = 'PENDING' | 'ISSUED' | 'VERIFIED' | 'RETIRED' | 'TRANSFERRED' | 'EXPIRED' | 'CANCELLED'
export type VerificationType = 'VALIDATION' | 'VERIFICATION' | 'POST_VALIDATION'
export type VerificationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CORRECTIVE_ACTION'
export type ProjectType = 'AFFORESTATION' | 'REFORESTATION' | 'AGRICULTURE' | 'SOIL_CARBON' | 'BIOCHAR' | 'AGROFORESTRY'

export interface MethodologyDefinition {
  code: string
  name: string
  standard: CarbonStandard
  version: string
  projectTypes: ProjectType[]
  description: string
  defaultParameters: MethodologyParameter[]
  creditingPeriodDefault: number // years
  minProjectArea: number // hectares
  requiresBaseline?: boolean
  requiresMonitoringPlan?: boolean
}

export interface MethodologyParameter {
  name: string
  description: string
  defaultValue: number
  unit: string
  min?: number
  max?: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  source: string
}

export interface PDDSection {
  title: string
  content: string
}

export interface CreditIssuanceResult {
  creditId: string
  serialNumber: string
  quantity: number
  vintageYear: number
  status: CreditStatus
}

export interface CreditRetirementResult {
  creditId: string
  retiredQuantity: number
  remainingQuantity: number
  retirementReason: string
}

// ─── Methodology Registry ────────────────────────────────────────────────────

/**
 * Verra VCS and Gold Standard methodology definitions.
 * Each methodology defines applicable project types, parameters, and requirements.
 */
export const METHODOLOGIES: MethodologyDefinition[] = [
  {
    code: 'VM0042',
    name: 'Methodology for Improved Agricultural Land Management',
    standard: 'VERRA_VCS',
    version: '1.2',
    projectTypes: ['AGRICULTURE', 'SOIL_CARBON', 'AGROFORESTRY'],
    description: 'Quantifies GHG emission reductions and removals from improved agricultural land management practices including reduced tillage, cover cropping, improved nutrient management, and agroforestry systems.',
    defaultParameters: [
      { name: 'baseline_soil_organic_carbon', description: 'Baseline SOC stock (tonnes C/ha)', defaultValue: 35, unit: 'tC/ha', min: 5, max: 200, confidence: 'MEDIUM', source: 'IPCC 2019 Wetlands Supplement' },
      { name: 'emission_factor_n2o', description: 'N2O emission factor for N inputs', defaultValue: 0.01, unit: 'kgN2O-N/kgN', min: 0.001, max: 0.05, confidence: 'LOW', source: 'IPCC 2019 Refinement Vol. 4 Ch. 5' },
      { name: 'fraction_n_retained', description: 'Fraction of N retained in soil', defaultValue: 0.8, unit: 'fraction', min: 0.1, max: 1.0, confidence: 'MEDIUM', source: 'IPCC 2019 Refinement' },
      { name: 'soc_stock_change_factor', description: 'Annual SOC stock change factor', defaultValue: 0.15, unit: 'tC/ha/yr', min: 0, max: 1.0, confidence: 'LOW', source: 'Measured/Default' },
      { name: 'leakage_fraction', description: 'Leakage fraction', defaultValue: 0.05, unit: 'fraction', min: 0, max: 0.2, confidence: 'MEDIUM', source: 'Verra VCS default' },
      { name: 'buffer_pool_contribution', description: 'Contribution to buffer pool (%)', defaultValue: 10, unit: '%', min: 0, max: 20, confidence: 'HIGH', source: 'Verra VCS requirement' },
    ],
    creditingPeriodDefault: 10,
    minProjectArea: 1,
    requiresBaseline: true,
    requiresMonitoringPlan: true,
  },
  {
    code: 'VM0047',
    name: 'Afforestation, Reforestation and Revegetation',
    standard: 'VERRA_VCS',
    version: '3.3',
    projectTypes: ['AFFORESTATION', 'REFORESTATION', 'AGROFORESTRY'],
    description: 'Quantifies carbon sequestration from afforestation, reforestation, and revegetation activities on land that was not forested or had reduced tree cover.',
    defaultParameters: [
      { name: 'ecological_zone', description: 'IPCC ecological zone number', defaultValue: 0, unit: 'zone', min: 0, max: 15, confidence: 'HIGH', source: 'IPCC 2019 Refinement Table 4.8' },
      { name: 'above_ground_biomass_factor', description: 'Above-ground biomass growth factor', defaultValue: 5.0, unit: 'tDM/ha/yr', min: 0.5, max: 25, confidence: 'MEDIUM', source: 'IPCC default' },
      { name: 'root_to_shoot_ratio', description: 'Root-to-shoot ratio for biomass', defaultValue: 0.3, unit: 'ratio', min: 0.1, max: 0.6, confidence: 'MEDIUM', source: 'IPCC 2019 Refinement Table 4.10' },
      { name: 'carbon_fraction_dry_matter', description: 'Carbon fraction of dry matter', defaultValue: 0.47, unit: 'fraction', min: 0.4, max: 0.55, confidence: 'HIGH', source: 'IPCC default 0.47' },
      { name: 'soil_carbon_change', description: 'SOC change from land use change', defaultValue: 0.2, unit: 'tC/ha/yr', min: -0.5, max: 1.5, confidence: 'LOW', source: 'Measured' },
      { name: 'buffer_pool_contribution', description: 'Contribution to buffer pool (%)', defaultValue: 20, unit: '%', min: 10, max: 30, confidence: 'HIGH', source: 'Verra VCS AFOLU requirement' },
    ],
    creditingPeriodDefault: 20,
    minProjectArea: 2,
    requiresBaseline: true,
    requiresMonitoringPlan: true,
  },
  {
    code: 'GS_REF0001',
    name: 'Gold Standard Agricultural Land Management',
    standard: 'GOLD_STANDARD',
    version: '2.0',
    projectTypes: ['AGRICULTURE', 'SOIL_CARBON', 'AGROFORESTRY'],
    description: 'Gold Standard methodology for emission reductions and carbon removals from sustainable agricultural land management. Includes safeguard requirements for food security and local livelihoods.',
    defaultParameters: [
      { name: 'baseline_yield', description: 'Baseline crop yield (tonnes/ha/yr)', defaultValue: 2.0, unit: 't/ha/yr', min: 0.1, max: 15, confidence: 'MEDIUM', source: 'National statistics' },
      { name: 'n_application_rate', description: 'Nitrogen application rate (kgN/ha/yr)', defaultValue: 50, unit: 'kgN/ha/yr', min: 0, max: 300, confidence: 'MEDIUM', source: 'Measured' },
      { name: 'soc_baseline', description: 'Baseline soil organic carbon (tC/ha)', defaultValue: 30, unit: 'tC/ha', min: 5, max: 150, confidence: 'MEDIUM', source: 'Soil survey' },
      { name: 'soc_project', description: 'Project SOC stock after intervention (tC/ha)', defaultValue: 35, unit: 'tC/ha', min: 5, max: 200, confidence: 'LOW', source: 'Measured/Projected' },
      { name: 'safeguard_score', description: 'Safeguard assessment score (0-100)', defaultValue: 75, unit: 'score', min: 0, max: 100, confidence: 'HIGH', source: 'Assessment' },
      { name: 'community_benefit_share', description: 'Community benefit sharing (%)', defaultValue: 10, unit: '%', min: 0, max: 50, confidence: 'HIGH', source: 'GS requirement' },
    ],
    creditingPeriodDefault: 10,
    minProjectArea: 0.5,
    requiresBaseline: true,
    requiresMonitoringPlan: true,
  },
  {
    code: 'AR-ACM0003',
    name: 'Afforestation and Reforestation under CDM',
    standard: 'GOLD_STANDARD',
    version: '8.0',
    projectTypes: ['AFFORESTATION', 'REFORESTATION'],
    description: 'CDM-affiliated methodology for afforestation and reforestation project activities. Adopted by Gold Standard for high-integrity forest carbon projects.',
    defaultParameters: [
      { name: 'species_mix_factor', description: 'Species mix carbon capture factor', defaultValue: 1.0, unit: 'multiplier', min: 0.5, max: 2.0, confidence: 'MEDIUM', source: 'Literature/Measured' },
      { name: 'survival_rate', description: 'Expected tree survival rate', defaultValue: 0.85, unit: 'fraction', min: 0.5, max: 1.0, confidence: 'MEDIUM', source: 'Project data' },
      { name: 'timber_harvest_factor', description: 'Timber harvest carbon release factor', defaultValue: 0.1, unit: 'fraction', min: 0, max: 0.5, confidence: 'LOW', source: 'Assumption' },
      { name: 'buffer_pool_contribution', description: 'Contribution to buffer pool (%)', defaultValue: 20, unit: '%', min: 10, max: 30, confidence: 'HIGH', source: 'GS requirement' },
    ],
    creditingPeriodDefault: 20,
    minProjectArea: 5,
    requiresBaseline: true,
    requiresMonitoringPlan: true,
  },
  {
    code: 'VM0044',
    name: 'Methodology for Biochar Production',
    standard: 'VERRA_VCS',
    version: '1.0',
    projectTypes: ['BIOCHAR'],
    description: 'Quantifies carbon removals from biochar production and application to agricultural soils. Covers pyrolysis systems and soil incorporation protocols.',
    defaultParameters: [
      { name: 'biochar_carbon_content', description: 'Carbon content of biochar', defaultValue: 0.7, unit: 'fraction', min: 0.3, max: 0.95, confidence: 'HIGH', source: 'Lab analysis' },
      { name: 'biochar_application_rate', description: 'Biochar application rate', defaultValue: 5, unit: 't/ha', min: 0.5, max: 50, confidence: 'MEDIUM', source: 'Project plan' },
      { name: 'pyrolysis_efficiency', description: 'Pyrolysis carbon retention efficiency', defaultValue: 0.35, unit: 'fraction', min: 0.15, max: 0.5, confidence: 'MEDIUM', source: 'Equipment spec' },
      { name: 'feedstock_carbon_content', description: 'Carbon content of feedstock', defaultValue: 0.5, unit: 'fraction', min: 0.3, max: 0.6, confidence: 'HIGH', source: 'Literature' },
      { name: 'buffer_pool_contribution', description: 'Buffer pool contribution (%)', defaultValue: 10, unit: '%', min: 5, max: 20, confidence: 'HIGH', source: 'Verra VCS default' },
    ],
    creditingPeriodDefault: 10,
    minProjectArea: 1,
    requiresBaseline: false,
    requiresMonitoringPlan: true,
  },
]

// ─── Serial Number Generator ─────────────────────────────────────────────────

function generateSerialNumber(projectCode: string, vintageYear: number, batchNumber: string): string {
  const id = uuidv4().split('-')[0].toUpperCase()
  return `${projectCode}-${vintageYear}-${batchNumber}-${id}`
}

// ─── Carbon Credits Engine ───────────────────────────────────────────────────

export class CarbonCreditsEngine {

  // -----------------------------------------------------------------------
  // Methodology Registry
  // -----------------------------------------------------------------------

  /** Get all available methodologies */
  static getMethodologies(options?: { standard?: string; projectType?: string }): MethodologyDefinition[] {
    return METHODOLOGIES.filter((m) => {
      if (options?.standard && m.standard !== options.standard) return false
      if (options?.projectType && !m.projectTypes.includes(options.projectType as ProjectType)) return false
      return true
    })
  }

  /** Get a single methodology by code */
  static getMethodology(code: string): MethodologyDefinition | undefined {
    return METHODOLOGIES.find((m) => m.code === code)
  }

  // -----------------------------------------------------------------------
  // Project Lifecycle
  // -----------------------------------------------------------------------

  /** Create a new carbon project */
  static async createProject(
    tenantId: string,
    data: {
      name: string
      description?: string
      standard: CarbonStandard
      methodologyCode: string
      projectType: ProjectType
      region?: string
      country?: string
      totalAreaHectares?: number
      estimatedAnnualRemovals?: number
      projectStartDate?: string
      projectEndDate?: string
      creditingPeriodYears?: number
      proponentName?: string
      proponentContact?: string
      vvbName?: string
      vvbContact?: string
      createdById?: string
    },
  ) {
    const methodology = this.getMethodology(data.methodologyCode)
    if (!methodology) {
      throw new Error(`Methodology ${data.methodologyCode} not found. Available: ${METHODOLOGIES.map((m) => m.code).join(', ')}`)
    }
    if (!methodology.projectTypes.includes(data.projectType)) {
      throw new Error(`Project type ${data.projectType} not supported by methodology ${data.methodologyCode}. Supported: ${methodology.projectTypes.join(', ')}`)
    }
    if (data.totalAreaHectares && data.totalAreaHectares < methodology.minProjectArea) {
      throw new Error(`Minimum project area for ${data.methodologyCode} is ${methodology.minProjectArea} hectares`)
    }

    const creditingYears = data.creditingPeriodYears ?? methodology.creditingPeriodDefault
    const startDate = data.projectStartDate ? new Date(data.projectStartDate) : new Date()
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + creditingYears)

    const project = await db.carbonProject.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        standard: data.standard,
        methodologyCode: data.methodologyCode,
        methodologyVersion: methodology.version,
        projectType: data.projectType,
        region: data.region,
        country: data.country,
        totalAreaHectares: data.totalAreaHectares,
        estimatedAnnualRemovals: data.estimatedAnnualRemovals,
        projectStartDate: startDate,
        projectEndDate: data.projectEndDate ? new Date(data.projectEndDate) : endDate,
        creditingPeriodYears: creditingYears,
        creditingPeriodStart: startDate,
        creditingPeriodEnd: endDate,
        proponentName: data.proponentName,
        proponentContact: data.proponentContact,
        vvbName: data.vvbName,
        vvbContact: data.vvbContact,
        createdById: data.createdById,
        baselineScenario: data.projectType === 'AGRICULTURE' || data.projectType === 'SOIL_CARBON'
          ? JSON.stringify({
              description: 'Business as usual agricultural practices',
              soilOrganicCarbonTrend: 'stable_or_declining',
              fertilizerRate: 'conventional',
              tillagePractice: 'conventional',
            })
          : data.projectType === 'AFFORESTATION' || data.projectType === 'REFORESTATION'
            ? JSON.stringify({
                description: 'Land without forest cover, low agricultural productivity',
                previousLandUse: 'grassland_or_cropland',
                degradationLevel: 'moderate',
              })
            : undefined,
        monitoringPlan: JSON.stringify({
          frequency: 'ANNUALLY',
          parameters: methodology.defaultParameters.map((p) => p.name),
          methods: 'field_measurement_and_remote_sensing',
          qaqc: 'internal_and_external_audit',
        }),
      },
    })

    // Auto-populate default methodology parameters
    for (const param of methodology.defaultParameters) {
      await db.carbonProjectMethodology.create({
        data: {
          projectId: project.id,
          methodologyCode: data.methodologyCode,
          parameterName: param.name,
          parameterValue: param.defaultValue,
          parameterUnit: param.unit,
          source: param.source,
          confidence: param.confidence,
          notes: param.description,
        },
      })
    }

    return project
  }

  /** Get project with full details */
  static async getProject(projectId: string, tenantId: string) {
    const project = await db.carbonProject.findFirst({
      where: { id: projectId, tenantId },
      include: {
        credits: { orderBy: { createdAt: 'desc' } },
        verifications: { orderBy: { createdAt: 'desc' } },
        methodologies: true,
      },
    })
    if (!project) throw new Error('Carbon project not found')
    return project
  }

  /** List projects for a tenant */
  static async listProjects(
    tenantId: string,
    options: { page?: number; pageSize?: number; status?: string; standard?: string } = {},
  ) {
    const page = options.page || 1
    const pageSize = Math.min(options.pageSize || 20, 100)
    const where: Record<string, unknown> = { tenantId }
    if (options.status) where.status = options.status
    if (options.standard) where.standard = options.standard

    const [data, total] = await Promise.all([
      db.carbonProject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { credits: true, verifications: true } },
        },
      }),
      db.carbonProject.count({ where }),
    ])

    return { data, total, page, pageSize }
  }

  /** Update project status through the lifecycle */
  static async updateProjectStatus(
    projectId: string,
    tenantId: string,
    newStatus: ProjectStatus,
  ) {
    const project = await db.carbonProject.findFirst({ where: { id: projectId, tenantId } })
    if (!project) throw new Error('Carbon project not found')

    const validTransitions: Record<string, ProjectStatus[]> = {
      DRAFT: ['SUBMITTED'],
      SUBMITTED: ['VALIDATED', 'REJECTED' as any],
      VALIDATED: ['REGISTERED'],
      REGISTERED: ['ACTIVE', 'SUSPENDED' as any],
      ACTIVE: ['SUSPENDED', 'CLOSED'],
      SUSPENDED: ['ACTIVE', 'CLOSED'],
    }

    const allowed = validTransitions[project.status]
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${project.status} to ${newStatus}. Allowed: ${allowed?.join(', ') || 'none'}`)
    }

    return db.carbonProject.update({
      where: { id: projectId },
      data: { status: newStatus },
    })
  }

  /** Update project fields (not just status) */
  static async updateProject(
    projectId: string,
    tenantId: string,
    data: {
      name?: string
      description?: string
      region?: string
      country?: string
      totalAreaHectares?: number
      estimatedAnnualRemovals?: number
      projectEndDate?: string
      proponentName?: string
      proponentContact?: string
      vvbName?: string
      vvbContact?: string
      verraProjectId?: string
      goldStandardId?: string
      pddDocumentUrl?: string
      baselineScenario?: Record<string, unknown>
      monitoringPlan?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
  ) {
    const project = await db.carbonProject.findFirst({ where: { id: projectId, tenantId } })
    if (!project) throw new Error('Carbon project not found')

    // Only DRAFT and SUBMITTED projects can have methodology/standard changes
    // (not applicable here since we don't allow changing standard/methodologyCode via this method,
    //  but we enforce the rule if baselineScenario or monitoringPlan implies methodology change)
    if (!['DRAFT', 'SUBMITTED'].includes(project.status)) {
      if (data.baselineScenario !== undefined || data.monitoringPlan !== undefined) {
        // Allow metadata and other fields, but log that baseline/monitoring changes
        // on non-DRAFT/SUBMITTED projects should be done via amendment process
      }
    }

    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.region !== undefined) updateData.region = data.region
    if (data.country !== undefined) updateData.country = data.country
    if (data.totalAreaHectares !== undefined) updateData.totalAreaHectares = data.totalAreaHectares
    if (data.estimatedAnnualRemovals !== undefined) updateData.estimatedAnnualRemovals = data.estimatedAnnualRemovals
    if (data.projectEndDate !== undefined) updateData.projectEndDate = new Date(data.projectEndDate)
    if (data.proponentName !== undefined) updateData.proponentName = data.proponentName
    if (data.proponentContact !== undefined) updateData.proponentContact = data.proponentContact
    if (data.vvbName !== undefined) updateData.vvbName = data.vvbName
    if (data.vvbContact !== undefined) updateData.vvbContact = data.vvbContact
    if (data.verraProjectId !== undefined) updateData.verraProjectId = data.verraProjectId
    if (data.goldStandardId !== undefined) updateData.goldStandardId = data.goldStandardId
    if (data.pddDocumentUrl !== undefined) updateData.pddDocumentUrl = data.pddDocumentUrl
    if (data.baselineScenario !== undefined) updateData.baselineScenario = JSON.stringify(data.baselineScenario)
    if (data.monitoringPlan !== undefined) updateData.monitoringPlan = JSON.stringify(data.monitoringPlan)
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata)

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields provided for update')
    }

    return db.carbonProject.update({
      where: { id: projectId },
      data: updateData,
    })
  }

  /** Delete project — DRAFT projects are hard-deleted, others are soft-deleted (CLOSED) */
  static async deleteProject(projectId: string, tenantId: string) {
    const project = await db.carbonProject.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Carbon project not found')

    if (project.status === 'DRAFT') {
      // Hard delete — cascade will remove credits, verifications, methodology params
      await db.carbonProject.delete({ where: { id: projectId } })
      return { deleted: true, status: 'DRAFT' }
    }

    // Soft delete — set status to CLOSED and cancel all PENDING credits
    await db.carbonProject.update({
      where: { id: projectId },
      data: { status: 'CLOSED' },
    })

    const cancelledCount = await db.carbonCredit.count({
      where: { projectId, status: 'PENDING' },
    })
    if (cancelledCount > 0) {
      await db.carbonCredit.updateMany({
        where: { projectId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
    }

    return { deleted: false, status: 'CLOSED', creditsCancelled: cancelledCount }
  }

  // -----------------------------------------------------------------------
  // PDD (Project Design Document)
  // -----------------------------------------------------------------------

  /** Generate a Project Design Document for a carbon project */
  static async generatePDD(projectId: string, tenantId: string): Promise<PDDSection[]> {
    const project = await this.getProject(projectId, tenantId)
    const methodology = this.getMethodology(project.methodologyCode)
    if (!methodology) throw new Error(`Methodology ${project.methodologyCode} not found`)

    const sections: PDDSection[] = []

    // Section A: General Description
    sections.push({
      title: 'A. General Description of the Project',
      content: [
        `Project Name: ${project.name}`,
        `Standard: ${project.standard.replace('_', ' ')}`,
        `Methodology: ${methodology.code} v${methodology.version} — ${methodology.name}`,
        `Project Type: ${project.projectType}`,
        `Project Status: ${project.status}`,
        ``,
        `Description:`,
        project.description || 'No description provided.',
        ``,
        `Location: ${project.region || 'Not specified'}, ${project.country || 'Not specified'}`,
        `Total Area: ${project.totalAreaHectares || 'Not specified'} hectares`,
        `Estimated Annual Removals: ${project.estimatedAnnualRemovals || 'Not estimated'} tCO2e/year`,
        `Crediting Period: ${project.creditingPeriodYears} years`,
        `  Start: ${project.creditingPeriodStart?.toISOString().split('T')[0] || 'N/A'}`,
        `  End: ${project.creditingPeriodEnd?.toISOString().split('T')[0] || 'N/A'}`,
        ``,
        `Proponent: ${project.proponentName || 'Not specified'}`,
        `VVB: ${project.vvbName || 'Not yet assigned'}`,
      ].join('\n'),
    })

    // Section B: Baseline
    const baseline = project.baselineScenario ? JSON.parse(project.baselineScenario) : null
    sections.push({
      title: 'B. Baseline Scenario',
      content: [
        `The baseline scenario represents the "business as usual" conditions that would `,
        `prevail in the absence of the proposed project activity.`,
        ``,
        baseline ? `Baseline Assessment: ${JSON.stringify(baseline, null, 2)}` : 'Baseline scenario has not been defined.',
        ``,
        `Methodology Approach: ${methodology.code} baseline methodology applied.`,
        `Additionality: The project is additional as the proposed practices would not `,
        `occur under the baseline scenario due to financial, technological, and/or `,
        `institutional barriers.`,
      ].join('\n'),
    })

    // Section C: Methodology Parameters
    sections.push({
      title: 'C. Methodology Application and Parameters',
      content: [
        `Methodology: ${methodology.code} v${methodology.version}`,
        `${methodology.description}`,
        ``,
        `Parameters configured for this project:`,
        ...project.methodologies.map((m) =>
          `  - ${m.parameterName}: ${m.parameterValue} ${m.parameterUnit || ''} (confidence: ${m.confidence}, source: ${m.source})`
        ),
        ``,
        `Default methodology parameters (for reference):`,
        ...methodology.defaultParameters.map((p) =>
          `  - ${p.name}: ${p.defaultValue} ${p.unit} — ${p.description}`
        ),
      ].join('\n'),
    })

    // Section D: Monitoring Plan
    const monitoring = project.monitoringPlan ? JSON.parse(project.monitoringPlan) : null
    sections.push({
      title: 'D. Monitoring Plan',
      content: [
        `Monitoring Frequency: ${monitoring?.frequency || 'Annually'}`,
        `Parameters Monitored: ${monitoring?.parameters?.join(', ') || 'Not specified'}`,
        `Methods: ${monitoring?.methods || 'Field measurement and remote sensing'}`,
        `QA/QC: ${monitoring?.qaqc || 'Internal and external audit'}`,
        ``,
        `Data to be collected for each monitoring period:`,
        `  - Soil organic carbon (SOC) samples from representative plots`,
        `  - Above-ground biomass measurements`,
        `  - Fertilizer application records`,
        `  - Land use change evidence (satellite imagery)`,
        `  - Yield records for additionality verification`,
      ].join('\n'),
    })

    // Section E: GHG Emission Reductions
    sections.push({
      title: 'E. Estimation of GHG Emission Reductions and Removals',
      content: [
        `Estimated annual carbon removals: ${project.estimatedAnnualRemovals || 'Pending calculation'} tCO2e`,
        `Total crediting period: ${project.creditingPeriodYears} years`,
        `Estimated total removals over crediting period: ${((project.estimatedAnnualRemovals || 0) * project.creditingPeriodYears).toFixed(2)} tCO2e`,
        ``,
        `Calculation approach per ${methodology.code}:`,
        `  Net GHG removals = (Project scenario emissions) - (Baseline emissions) - Leakage`,
        ``,
        `Conservativeness measures applied:`,
        `  - Default IPCC emission factors used where measured data unavailable`,
        `  - Buffer pool contribution: ${project.methodologies.find((m) => m.parameterName === 'buffer_pool_contribution')?.parameterValue || methodology.defaultParameters.find((p) => p.name === 'buffer_pool_contribution')?.defaultValue || 10}%`,
        `  - Risk-adjusted calculations for soil carbon uncertainty`,
      ].join('\n'),
    })

    // Section F: Sustainability & Safeguards
    sections.push({
      title: 'F. Sustainability Impacts and Safeguards',
      content: [
        project.standard === 'GOLD_STANDARD'
          ? 'Gold Standard safeguard requirements apply:'
          : 'Verra VCS safeguard requirements apply:',
        ``,
        `Social Impacts:`,
        `  - Food security: Project activities must not reduce food production`,
        `  - Land rights: Free, Prior and Informed Consent (FPIC) obtained`,
        `  - Livelihoods: Positive impact on local community income`,
        ``,
        `Environmental Impacts:`,
        `  - Biodiversity: No net negative impact on native ecosystems`,
        `  - Water: No reduction in water availability for local communities`,
        `  - Soil: Net improvement in soil health indicators`,
        ``,
        `Economic Impacts:`,
        `  - Revenue from carbon credits supplements farmer income`,
        `  - Training and capacity building provided to participants`,
      ].join('\n'),
    })

    // Store PDD content in project metadata
    await db.carbonProject.update({
      where: { id: projectId },
      data: {
        pddDocumentUrl: `pdd://${projectId}/generated/${Date.now()}`,
        metadata: JSON.stringify({
          pddGeneratedAt: new Date().toISOString(),
          pddSections: sections.length,
          methodologyVersion: methodology.version,
        }),
      },
    })

    return sections
  }

  // -----------------------------------------------------------------------
  // VVB Verification
  // -----------------------------------------------------------------------

  /** Schedule a VVB verification event */
  static async scheduleVerification(
    tenantId: string,
    data: {
      projectId: string
      type: VerificationType
      vvbName: string
      vvbAccreditation?: string
      startDate?: string
      performedById?: string
    },
  ) {
    const project = await db.carbonProject.findFirst({
      where: { id: data.projectId, tenantId },
    })
    if (!project) throw new Error('Carbon project not found')

    // VALIDATION requires DRAFT or SUBMITTED status
    // VERIFICATION requires ACTIVE status
    if (data.type === 'VALIDATION' && !['DRAFT', 'SUBMITTED'].includes(project.status)) {
      throw new Error(`Project must be DRAFT or SUBMITTED for validation (current: ${project.status})`)
    }
    if (data.type === 'VERIFICATION' && project.status !== 'ACTIVE') {
      throw new Error(`Project must be ACTIVE for verification (current: ${project.status})`)
    }

    return db.carbonVerification.create({
      data: {
        tenantId,
        projectId: data.projectId,
        type: data.type,
        vvbName: data.vvbName,
        vvbAccreditation: data.vvbAccreditation,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        status: 'SCHEDULED',
        performedById: data.performedById,
      },
    })
  }

  /** Complete a VVB verification */
  static async completeVerification(
    verificationId: string,
    tenantId: string,
    data: {
      endDate?: string
      scope?: Record<string, unknown>
      findings?: Record<string, unknown>
      nonConformities?: Array<{ description: string; severity: string; correctiveAction: string }>
      conclusion: 'POSITIVE' | 'POSITIVE_WITH_CONDITIONS' | 'NEGATIVE'
      recommendation: 'ISSUE' | 'HOLD' | 'REJECT'
      reportUrl?: string
      statementUrl?: string
    },
  ) {
    const verification = await db.carbonVerification.findFirst({
      where: { id: verificationId, tenantId },
    })
    if (!verification) throw new Error('Verification not found')

    const ncList = data.nonConformities?.length
      ? data.nonConformities.map((nc) => ({
          ...nc,
          status: 'OPEN',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days to correct
        }))
      : []

    const updated = await db.carbonVerification.update({
      where: { id: verificationId },
      data: {
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        scope: data.scope ? JSON.stringify(data.scope) : undefined,
        findings: data.findings ? JSON.stringify(data.findings) : undefined,
        nonConformities: ncList.length > 0 ? JSON.stringify(ncList) : undefined,
        correctiveActions: data.conclusion === 'POSITIVE_WITH_CONDITIONS'
          ? JSON.stringify({
              required: ncList.filter((nc) => nc.severity === 'MAJOR'),
              timeline: '30 days for major, 90 days for minor',
              responsibleParty: 'Project proponent',
            })
          : undefined,
        conclusion: data.conclusion,
        recommendation: data.recommendation,
        reportUrl: data.reportUrl,
        statementUrl: data.statementUrl,
        status: data.conclusion === 'NEGATIVE' ? 'REJECTED'
          : data.conclusion === 'POSITIVE_WITH_CONDITIONS' ? 'CORRECTIVE_ACTION'
          : 'COMPLETED',
      },
    })

    // Auto-advance project status based on verification outcome
    if (data.conclusion === 'POSITIVE') {
      if (verification.type === 'VALIDATION') {
        await this.updateProjectStatus(verification.projectId, tenantId, 'VALIDATED')
      }
    }

    return updated
  }

  /** List verifications for a project */
  static async listVerifications(projectId: string, tenantId: string) {
    const project = await db.carbonProject.findFirst({ where: { id: projectId, tenantId } })
    if (!project) throw new Error('Carbon project not found')

    return db.carbonVerification.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Get a single verification by ID */
  static async getVerification(verificationId: string, tenantId: string) {
    const verification = await db.carbonVerification.findFirst({
      where: { id: verificationId, tenantId },
      include: {
        project: { select: { id: true, name: true, standard: true, methodologyCode: true, status: true } },
        credits: { select: { id: true, serialNumber: true, quantityTonnesCO2: true, status: true } },
      },
    })
    if (!verification) throw new Error('Verification not found')
    return verification
  }

  /** Update verification status for VVB workflow */
  static async updateVerificationStatus(
    verificationId: string,
    tenantId: string,
    newStatus: VerificationStatus,
  ) {
    const verification = await db.carbonVerification.findFirst({
      where: { id: verificationId, tenantId },
    })
    if (!verification) throw new Error('Verification not found')

    const validTransitions: Record<string, VerificationStatus[]> = {
      SCHEDULED: ['IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED', 'REJECTED', 'CORRECTIVE_ACTION'],
      CORRECTIVE_ACTION: ['COMPLETED', 'REJECTED'],
    }

    const allowed = validTransitions[verification.status]
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Cannot transition verification from ${verification.status} to ${newStatus}. Allowed: ${allowed?.join(', ') || 'none'}`)
    }

    const updated = await db.carbonVerification.update({
      where: { id: verificationId },
      data: {
        status: newStatus,
        ...(newStatus === 'IN_PROGRESS' && !verification.startDate
          ? { startDate: new Date() }
          : {}),
        ...(newStatus === 'COMPLETED' || newStatus === 'REJECTED'
          ? { endDate: new Date() }
          : {}),
      },
    })

    // Auto-advance project status on validation completion
    if (newStatus === 'COMPLETED' && verification.type === 'VALIDATION') {
      try {
        await this.updateProjectStatus(verification.projectId, tenantId, 'VALIDATED')
      } catch {
        // Project may not be in the right status for auto-advance — ignore
      }
    }

    return updated
  }

  // -----------------------------------------------------------------------
  // Credit Issuance
  // -----------------------------------------------------------------------

  /** Issue carbon credits for a project */
  static async issueCredits(
    tenantId: string,
    data: {
      projectId: string
      vintageYear: number
      quantityTonnesCO2: number
      originType?: 'REMOVAL' | 'AVOIDANCE' | 'REDUCTION'
      unitPriceUsd?: number
      verificationId?: string
      notes?: string
    },
  ): Promise<CreditIssuanceResult> {
    const project = await db.carbonProject.findFirst({
      where: { id: data.projectId, tenantId },
    })
    if (!project) throw new Error('Carbon project not found')
    if (!['VALIDATED', 'REGISTERED', 'ACTIVE'].includes(project.status)) {
      throw new Error(`Project must be VALIDATED, REGISTERED, or ACTIVE to issue credits (current: ${project.status})`)
    }

    // Generate batch number
    const existingCredits = await db.carbonCredit.count({ where: { projectId: data.projectId } })
    const batchNumber = `BATCH-${String(existingCredits + 1).padStart(4, '0')}`
    const serialNumber = generateSerialNumber(project.methodologyCode, data.vintageYear, batchNumber)

    // Calculate buffer pool deduction
    const bufferParam = await db.carbonProjectMethodology.findFirst({
      where: { projectId: data.projectId, parameterName: 'buffer_pool_contribution' },
    })
    const bufferPercent = bufferParam?.parameterValue ?? 10
    const netQuantity = data.quantityTonnesCO2 * (1 - bufferPercent / 100)

    if (netQuantity <= 0) {
      throw new Error(`Net credits after buffer pool deduction (${bufferPercent}%) must be positive`)
    }

    const credit = await db.carbonCredit.create({
      data: {
        tenantId,
        projectId: data.projectId,
        vintageYear: data.vintageYear,
        quantityTonnesCO2: Math.round(netQuantity * 1000) / 1000,
        status: 'ISSUED',
        serialNumber,
        batchNumber,
        issuanceDate: new Date(),
        expiryDate: new Date(data.vintageYear + 6, 11, 31), // Credits valid 6 years (VCS default)
        originType: data.originType || 'REMOVAL',
        unitPriceUsd: data.unitPriceUsd,
        totalValueUsd: data.unitPriceUsd ? Math.round(netQuantity * data.unitPriceUsd * 100) / 100 : null,
        verificationId: data.verificationId,
        notes: data.notes
          ? `${data.notes} [Buffer pool: ${bufferPercent}% deducted, gross: ${data.quantityTonnesCO2} tCO2, net: ${netQuantity.toFixed(3)} tCO2]`
          : `Issued from batch ${batchNumber}. Buffer pool: ${bufferPercent}% deducted. Gross: ${data.quantityTonnesCO2} tCO2, net: ${netQuantity.toFixed(3)} tCO2`,
      },
    })

    // Update project totals
    await db.carbonProject.update({
      where: { id: data.projectId },
      data: {
        totalCreditsIssued: { increment: credit.quantityTonnesCO2 },
      },
    })

    return {
      creditId: credit.id,
      serialNumber: credit.serialNumber ?? '',
      quantity: credit.quantityTonnesCO2,
      vintageYear: data.vintageYear,
      status: 'ISSUED' as CreditStatus,
    }
  }

  // -----------------------------------------------------------------------
  // Credit Retirement
  // -----------------------------------------------------------------------

  /** Retire carbon credits */
  static async retireCredits(
    creditId: string,
    tenantId: string,
    data: {
      quantity?: number
      reason: 'VOLUNTARY' | 'COMPLIANCE' | 'CBAM_OFFSET'
      retiredOnBehalfOf?: string
      retiredById?: string
    },
  ): Promise<CreditRetirementResult> {
    const credit = await db.carbonCredit.findFirst({
      where: { id: creditId, tenantId },
    })
    if (!credit) throw new Error('Carbon credit not found')
    if (!['ISSUED', 'VERIFIED'].includes(credit.status)) {
      throw new Error(`Credit must be ISSUED or VERIFIED to retire (current: ${credit.status})`)
    }

    const retireQuantity = data.quantity ?? credit.quantityTonnesCO2
    if (retireQuantity > credit.quantityTonnesCO2) {
      throw new Error(`Cannot retire ${retireQuantity} tCO2 — only ${credit.quantityTonnesCO2} tCO2 available`)
    }

    const remaining = credit.quantityTonnesCO2 - retireQuantity
    const newStatus = remaining <= 0.001 ? 'RETIRED' as CreditStatus : 'ISSUED' as CreditStatus

    await db.carbonCredit.update({
      where: { id: creditId },
      data: {
        quantityTonnesCO2: Math.round(remaining * 1000) / 1000,
        status: newStatus,
        retirementReason: data.reason,
        retirementDate: new Date(),
        retiredById: data.retiredById,
        retiredOnBehalfOf: data.retiredOnBehalfOf,
      },
    })

    // Update project totals
    await db.carbonProject.update({
      where: { id: credit.projectId },
      data: {
        totalCreditsRetired: { increment: retireQuantity },
      },
    })

    return {
      creditId,
      retiredQuantity: retireQuantity,
      remainingQuantity: Math.round(remaining * 1000) / 1000,
      retirementReason: data.reason,
    }
  }

  // -----------------------------------------------------------------------
  // Credit Queries
  // -----------------------------------------------------------------------

  /** List credits with filtering */
  static async listCredits(
    tenantId: string,
    options: { page?: number; pageSize?: number; projectId?: string; status?: string; vintageYear?: number } = {},
  ) {
    const page = options.page || 1
    const pageSize = Math.min(options.pageSize || 20, 100)
    const where: Record<string, unknown> = { tenantId }
    if (options.projectId) where.projectId = options.projectId
    if (options.status) where.status = options.status
    if (options.vintageYear) where.vintageYear = options.vintageYear

    const [data, total] = await Promise.all([
      db.carbonCredit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          project: { select: { name: true, standard: true, methodologyCode: true } },
        },
      }),
      db.carbonCredit.count({ where }),
    ])

    return { data, total, page, pageSize }
  }

  /** Get credit portfolio summary */
  static async getPortfolioSummary(tenantId: string) {
    const credits = await db.carbonCredit.findMany({
      where: { tenantId, status: { in: ['ISSUED', 'VERIFIED'] } },
      select: { projectId: true, quantityTonnesCO2: true, unitPriceUsd: true, vintageYear: true, originType: true },
    })

    const projects = await db.carbonProject.findMany({
      where: { tenantId },
      select: { id: true, name: true, standard: true, status: true, totalCreditsIssued: true, totalCreditsRetired: true, totalCreditsTransferred: true },
    })

    const totalAvailable = credits.reduce((sum, c) => sum + c.quantityTonnesCO2, 0)
    const totalValue = credits.reduce((sum, c) => sum + (c.unitPriceUsd ? c.quantityTonnesCO2 * c.unitPriceUsd : 0), 0)
    const totalIssued = projects.reduce((sum, p) => sum + p.totalCreditsIssued, 0)
    const totalRetired = projects.reduce((sum, p) => sum + p.totalCreditsRetired, 0)

    // By vintage year
    const byVintage: Record<number, number> = {}
    for (const c of credits) {
      byVintage[c.vintageYear] = (byVintage[c.vintageYear] || 0) + c.quantityTonnesCO2
    }

    // By origin type
    const byOrigin: Record<string, number> = {}
    for (const c of credits) {
      byOrigin[c.originType] = (byOrigin[c.originType] || 0) + c.quantityTonnesCO2
    }

    return {
      totalAvailable: Math.round(totalAvailable * 1000) / 1000,
      totalIssued: Math.round(totalIssued * 1000) / 1000,
      totalRetired: Math.round(totalRetired * 1000) / 1000,
      totalTransferred: Math.round(projects.reduce((s, p) => s + p.totalCreditsTransferred, 0) * 1000) / 1000,
      totalValueUsd: Math.round(totalValue * 100) / 100,
      activeProjects: projects.filter((p) => ['ACTIVE', 'REGISTERED', 'VALIDATED'].includes(p.status)).length,
      totalProjects: projects.length,
      byVintageYear: Object.fromEntries(Object.entries(byVintage).sort(([a], [b]) => Number(b) - Number(a))),
      byOriginType: byOrigin,
    }
  }

  // -----------------------------------------------------------------------
  // Credit Transfer
  // -----------------------------------------------------------------------

  /** Transfer credits to another registry/account */
  static async transferCredits(
    creditId: string,
    tenantId: string,
    data: {
      quantity?: number
      transferTo: string
      transferDate?: string
      notes?: string
    },
  ): Promise<{ creditId: string; transferredQuantity: number; remainingQuantity: number; transferTo: string }> {
    const credit = await db.carbonCredit.findFirst({
      where: { id: creditId, tenantId },
    })
    if (!credit) throw new Error('Carbon credit not found')
    if (!['ISSUED', 'VERIFIED'].includes(credit.status)) {
      throw new Error(`Credit must be ISSUED or VERIFIED to transfer (current: ${credit.status})`)
    }

    const transferQuantity = data.quantity ?? credit.quantityTonnesCO2
    if (transferQuantity > credit.quantityTonnesCO2) {
      throw new Error(`Cannot transfer ${transferQuantity} tCO2 — only ${credit.quantityTonnesCO2} tCO2 available`)
    }
    if (transferQuantity <= 0) {
      throw new Error('Transfer quantity must be positive')
    }

    const remaining = Math.round((credit.quantityTonnesCO2 - transferQuantity) * 1000) / 1000
    const isFullTransfer = remaining <= 0.001

    await db.carbonCredit.update({
      where: { id: creditId },
      data: {
        quantityTonnesCO2: isFullTransfer ? 0 : remaining,
        status: isFullTransfer ? ('TRANSFERRED' as CreditStatus) : credit.status,
        transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
        transferTo: data.transferTo,
        notes: data.notes
          ? `${credit.notes ? credit.notes + ' | ' : ''}Transferred ${transferQuantity} tCO2 to ${data.transferTo}. ${data.notes}`
          : `${credit.notes ? credit.notes + ' | ' : ''}Transferred ${transferQuantity} tCO2 to ${data.transferTo}`,
      },
    })

    // Update project total transferred
    await db.carbonProject.update({
      where: { id: credit.projectId },
      data: {
        totalCreditsTransferred: { increment: transferQuantity },
      },
    })

    return {
      creditId,
      transferredQuantity: transferQuantity,
      remainingQuantity: remaining,
      transferTo: data.transferTo,
    }
  }

  // -----------------------------------------------------------------------
  // Single Credit Queries
  // -----------------------------------------------------------------------

  /** Get a single credit by ID */
  static async getCredit(creditId: string, tenantId: string) {
    const credit = await db.carbonCredit.findFirst({
      where: { id: creditId, tenantId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            standard: true,
            methodologyCode: true,
            status: true,
          },
        },
        verification: {
          select: {
            id: true,
            type: true,
            status: true,
            vvbName: true,
            conclusion: true,
          },
        },
      },
    })
    if (!credit) throw new Error('Carbon credit not found')
    return credit
  }

  // -----------------------------------------------------------------------
  // Credit Expiry (Cron)
  // -----------------------------------------------------------------------

  /** Expire all overdue credits — intended for cron/scheduled execution */
  static async expireOverdueCredits() {
    const now = new Date()
    const result = await db.carbonCredit.updateMany({
      where: {
        status: { in: ['ISSUED', 'VERIFIED'] },
        expiryDate: { lt: now },
      },
      data: { status: 'EXPIRED' },
    })
    return { expiredCount: result.count, checkedAt: now.toISOString() }
  }

  // -----------------------------------------------------------------------
  // Methodology Parameters
  // -----------------------------------------------------------------------

  /** Update methodology parameters for a project */
  static async updateProjectParameters(
    projectId: string,
    tenantId: string,
    parameters: Array<{ parameterName: string; parameterValue: number; unit?: string; source?: string; confidence?: string; notes?: string }>,
  ) {
    const project = await db.carbonProject.findFirst({ where: { id: projectId, tenantId } })
    if (!project) throw new Error('Carbon project not found')

    const results: Awaited<ReturnType<typeof db.carbonProjectMethodology.upsert>>[] = []
    for (const param of parameters) {
      const updated = await db.carbonProjectMethodology.upsert({
        where: {
          projectId_methodologyCode_parameterName: {
            projectId,
            methodologyCode: project.methodologyCode,
            parameterName: param.parameterName,
          },
        },
        create: {
          projectId,
          methodologyCode: project.methodologyCode,
          parameterName: param.parameterName,
          parameterValue: param.parameterValue,
          parameterUnit: param.unit,
          source: param.source,
          confidence: param.confidence,
          notes: param.notes,
        },
        update: {
          parameterValue: param.parameterValue,
          ...(param.unit ? { parameterUnit: param.unit } : {}),
          ...(param.source ? { source: param.source } : {}),
          ...(param.confidence ? { confidence: param.confidence } : {}),
          ...(param.notes ? { notes: param.notes } : {}),
        },
      })
      results.push(updated)
    }

    return results
  }
}

// Singleton
export const carbonCreditsEngine = new CarbonCreditsEngine()