/**
 * Agrobase V3 — OpenAPI 3.0 Specification Generator
 */

import { ROUTE_DEFINITIONS } from './routes'

interface OpenAPIPath {
  [method: string]: Record<string, unknown> | undefined
}

export class OpenApiGenerator {
  private baseUrl: string

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  generate() {
    const paths: Record<string, OpenAPIPath> = {}
    const tagSet = new Set<string>()

    for (const route of ROUTE_DEFINITIONS) {
      tagSet.add(route.tag)
      const pathItem: OpenAPIPath = {}

      for (const m of route.methods) {
        const operation: Record<string, unknown> = {
          summary: m.summary,
          operationId: `${m.method}_${route.path.replace(/[{}\/]/g, '_')}`,
          tags: [route.tag],
          responses: m.responses,
          security: [{ bearerAuth: [] }, { apikeyAuth: [] }],
        }

        if (m.description) operation.description = m.description
        if (m.params && m.params.length > 0) operation.parameters = m.params
        if (m.requestBody) operation.requestBody = m.requestBody

        pathItem[m.method] = operation
      }

      paths[route.path] = pathItem
    }

    const tags = Array.from(tagSet).map((name) => ({
      name,
      description: `${name} API endpoints`,
    }))

    return {
      openapi: '3.0.3',
      info: {
        title: 'Agrobase V3 API',
        description: 'MobiPay AgroSys — Agricultural Management Platform API for Uganda, Ghana, and Kenya.',
        version: '3.0.0',
        contact: { name: 'MobiPay AgroSys', email: 'api@mobipay.co.ug' },
      },
      servers: [
        { url: this.baseUrl, description: 'Development' },
        { url: 'https://api.agrobase.mobipay.co.ug', description: 'Production (Uganda)' },
      ],
      tags,
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'JWT token from /api/auth/login',
          },
          apikeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key from /api/api-keys. Prefix: agk_...',
          },
        },
        schemas: this.getSchemas(),
      },
    }
  }

  private getSchemas() {
    return {
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 150 },
          pages: { type: 'integer', example: 8 },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Not found' },
        },
        required: ['error'],
      },
    }
  }

  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2)
  }

  getSummary() {
    let totalEndpoints = 0
    const byTag: Record<string, number> = {}

    for (const route of ROUTE_DEFINITIONS) {
      totalEndpoints += route.methods.length
      byTag[route.tag] = (byTag[route.tag] || 0) + route.methods.length
    }

    return { totalRoutes: ROUTE_DEFINITIONS.length, totalEndpoints, byTag }
  }
}

export const openApiGenerator = new OpenApiGenerator()