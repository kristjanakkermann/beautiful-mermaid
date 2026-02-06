/**
 * Tests for the ArchiMate diagram parser.
 *
 * Covers: layer block headers, element declaration formats (simple alias,
 * quoted label, quoted label with alias), relationships (typed and default
 * association), multi-layer diagrams, and edge cases.
 */
import { describe, it, expect } from 'bun:test'
import { parseArchimate } from '../archimate/parser.ts'

/** Helper to parse — preprocesses text the same way index.ts does */
function parse(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('%%'))
  return parseArchimate(lines)
}

// ============================================================================
// Layer block headers
// ============================================================================

describe('parseArchimate – layer blocks', () => {
  it('parses a business layer block', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer`)
    expect(d.layers.has('business')).toBe(true)
    expect(d.layers.get('business')!).toHaveLength(1)
  })

  it('parses an application layer block', () => {
    const d = parse(`archimate-layered
      application:
        component WebApp`)
    expect(d.layers.has('application')).toBe(true)
    expect(d.layers.get('application')!).toHaveLength(1)
  })

  it('parses a technology layer block', () => {
    const d = parse(`archimate-layered
      technology:
        node Server`)
    expect(d.layers.has('technology')).toBe(true)
  })

  it('parses a strategy layer block', () => {
    const d = parse(`archimate-layered
      strategy:
        capability Innovation`)
    expect(d.layers.has('strategy')).toBe(true)
  })

  it('parses a motivation layer block', () => {
    const d = parse(`archimate-layered
      motivation:
        goal Profitability`)
    expect(d.layers.has('motivation')).toBe(true)
  })

  it('parses a physical layer block', () => {
    const d = parse(`archimate-layered
      physical:
        equipment Printer`)
    expect(d.layers.has('physical')).toBe(true)
  })

  it('parses an implementation layer block', () => {
    const d = parse(`archimate-layered
      implementation:
        workPackage Phase1`)
    expect(d.layers.has('implementation')).toBe(true)
  })

  it('parses multiple layers in order', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
      application:
        component WebApp
      technology:
        node Server`)
    expect(d.layers.size).toBe(3)
    expect(d.elements.size).toBe(3)
  })
})

// ============================================================================
// Element declaration formats
// ============================================================================

describe('parseArchimate – element formats', () => {
  it('parses simple format: elementType alias', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer`)
    const el = d.elements.get('Customer')!
    expect(el.id).toBe('Customer')
    expect(el.label).toBe('Customer')
    expect(el.type).toBe('actor')
    expect(el.layer).toBe('business')
  })

  it('parses quoted label with alias: elementType "Label" as alias', () => {
    const d = parse(`archimate-layered
      business:
        service "Online Banking" as OB`)
    const el = d.elements.get('OB')!
    expect(el.id).toBe('OB')
    expect(el.label).toBe('Online Banking')
    expect(el.type).toBe('service')
    expect(el.layer).toBe('business')
  })

  it('parses quoted label without alias: elementType "Label"', () => {
    const d = parse(`archimate-layered
      application:
        component "Web Application"`)
    const el = d.elements.get('Web_Application')!
    expect(el.id).toBe('Web_Application')
    expect(el.label).toBe('Web Application')
    expect(el.type).toBe('component')
  })

  it('replaces spaces with underscores for auto-generated IDs', () => {
    const d = parse(`archimate-layered
      business:
        process "Order Processing"`)
    expect(d.elements.has('Order_Processing')).toBe(true)
  })
})

// ============================================================================
// Element types per layer
// ============================================================================

describe('parseArchimate – element types', () => {
  it('parses business layer element types', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        role Manager
        process Ordering
        service Delivery
        object Invoice
        event OrderPlaced`)
    expect(d.elements.size).toBe(6)
  })

  it('parses application layer element types', () => {
    const d = parse(`archimate-layered
      application:
        component WebApp
        dataObject UserProfile`)
    expect(d.elements.size).toBe(2)
    expect(d.elements.get('WebApp')!.type).toBe('component')
    expect(d.elements.get('UserProfile')!.type).toBe('dataObject')
  })

  it('parses technology layer element types', () => {
    const d = parse(`archimate-layered
      technology:
        node AppServer
        device Firewall
        systemSoftware Linux
        artifact Deployment`)
    expect(d.elements.size).toBe(4)
  })

  it('parses strategy layer element types', () => {
    const d = parse(`archimate-layered
      strategy:
        resource Budget
        capability Innovation
        valueStream CustomerJourney
        courseOfAction ExpandMarket`)
    expect(d.elements.size).toBe(4)
  })

  it('parses motivation layer element types', () => {
    const d = parse(`archimate-layered
      motivation:
        stakeholder CTO
        driver Efficiency
        goal Profitability
        requirement Uptime`)
    expect(d.elements.size).toBe(4)
  })

  it('parses physical layer element types', () => {
    const d = parse(`archimate-layered
      physical:
        equipment Printer
        facility DataCenter`)
    expect(d.elements.size).toBe(2)
  })

  it('parses implementation layer element types', () => {
    const d = parse(`archimate-layered
      implementation:
        workPackage Phase1
        deliverable Report`)
    expect(d.elements.size).toBe(2)
  })

  it('accepts cross-layer element types (e.g., service in application)', () => {
    const d = parse(`archimate-layered
      application:
        service AuthService`)
    expect(d.elements.get('AuthService')!.type).toBe('service')
    expect(d.elements.get('AuthService')!.layer).toBe('application')
  })
})

// ============================================================================
// Relationships
// ============================================================================

describe('parseArchimate – relationships', () => {
  it('parses typed relationship: -->|type|', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        service Banking
      Customer -->|serving| Banking`)
    expect(d.relationships).toHaveLength(1)
    expect(d.relationships[0]!.source).toBe('Customer')
    expect(d.relationships[0]!.target).toBe('Banking')
    expect(d.relationships[0]!.type).toBe('serving')
  })

  it('parses default association: -->', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        service Banking
      Customer --> Banking`)
    expect(d.relationships).toHaveLength(1)
    expect(d.relationships[0]!.type).toBe('association')
  })

  it('parses all relationship types', () => {
    const types = [
      'composition', 'aggregation', 'assignment', 'realization',
      'serving', 'access', 'influence', 'triggering', 'flow',
      'specialization', 'association',
    ]
    for (const type of types) {
      const d = parse(`archimate-layered
        business:
          actor A
          actor B
        A -->|${type}| B`)
      expect(d.relationships).toHaveLength(1)
      expect(d.relationships[0]!.type).toBe(type)
    }
  })

  it('ignores invalid relationship types', () => {
    const d = parse(`archimate-layered
      business:
        actor A
        actor B
      A -->|invalidType| B`)
    expect(d.relationships).toHaveLength(0)
  })

  it('parses relationships between layers', () => {
    const d = parse(`archimate-layered
      business:
        service Banking
      application:
        component WebApp
      WebApp -->|realization| Banking`)
    expect(d.relationships).toHaveLength(1)
    expect(d.relationships[0]!.source).toBe('WebApp')
    expect(d.relationships[0]!.target).toBe('Banking')
  })

  it('parses multiple relationships', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        service Banking
        process Payment
      Customer -->|serving| Banking
      Banking -->|triggering| Payment`)
    expect(d.relationships).toHaveLength(2)
  })
})

// ============================================================================
// Edge cases
// ============================================================================

describe('parseArchimate – edge cases', () => {
  it('ignores empty lines and comments', () => {
    const d = parse(`archimate-layered
      %% This is a comment
      business:
        %% Another comment
        actor Customer`)
    expect(d.elements.size).toBe(1)
  })

  it('returns empty diagram for header-only input', () => {
    const d = parse(`archimate-layered`)
    expect(d.elements.size).toBe(0)
    expect(d.layers.size).toBe(0)
    expect(d.relationships).toHaveLength(0)
  })

  it('ignores unrecognized lines', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        this is not a valid line
        service Banking`)
    expect(d.elements.size).toBe(2)
  })

  it('layer context persists until next layer header (issue 3 fix)', () => {
    // After removing the dead indentation-based reset code,
    // layer context should only change on a new layer header.
    const d = parse(`archimate-layered
      business:
        actor Customer
        service Banking
      application:
        component WebApp`)
    // Customer and Banking should be in business layer
    expect(d.elements.get('Customer')!.layer).toBe('business')
    expect(d.elements.get('Banking')!.layer).toBe('business')
    // WebApp should be in application layer
    expect(d.elements.get('WebApp')!.layer).toBe('application')
  })

  it('relationships can appear within layer blocks', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        service Banking
        Customer -->|serving| Banking`)
    // Relationship should be parsed even inside a layer block
    expect(d.relationships).toHaveLength(1)
  })

  it('elements outside a layer block are ignored', () => {
    const d = parse(`archimate-layered
      actor Customer`)
    // No layer context — element should not be parsed
    expect(d.elements.size).toBe(0)
  })
})

// ============================================================================
// Full diagram
// ============================================================================

describe('parseArchimate – full diagram', () => {
  it('parses a complete multi-layer enterprise architecture', () => {
    const d = parse(`archimate-layered
      business:
        actor Customer
        service "Online Banking" as OB
        process "Order Processing" as OP
      application:
        component "Web Application" as WA
        component "API Gateway" as AG
        dataObject "User Profile" as UP
      technology:
        node "App Server" as AS
        artifact "Docker Image" as DI
      Customer -->|serving| OB
      OB -->|triggering| OP
      WA -->|realization| OB
      AG -->|serving| WA
      AS -->|assignment| WA
      DI -->|realization| WA`)

    // 3 layers
    expect(d.layers.size).toBe(3)

    // 8 elements total
    expect(d.elements.size).toBe(8)

    // Business layer has 3 elements
    expect(d.layers.get('business')!).toHaveLength(3)

    // Application layer has 3 elements
    expect(d.layers.get('application')!).toHaveLength(3)

    // Technology layer has 2 elements
    expect(d.layers.get('technology')!).toHaveLength(2)

    // 6 relationships
    expect(d.relationships).toHaveLength(6)

    // Verify specific elements
    const wa = d.elements.get('WA')!
    expect(wa.label).toBe('Web Application')
    expect(wa.type).toBe('component')
    expect(wa.layer).toBe('application')
  })
})
