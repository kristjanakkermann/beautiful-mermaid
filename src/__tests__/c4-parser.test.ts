/**
 * Tests for the C4 diagram parser.
 *
 * Covers: diagram type detection, element parsing (all kinds + _Ext variants),
 * boundary nesting, relationship parsing (Rel, Rel_D/U/L/R, BiRel),
 * title extraction, and edge cases (empty boundaries, stray braces).
 */
import { describe, it, expect } from 'bun:test'
import { parseC4 } from '../c4/parser.ts'

/** Helper to parse — preprocesses text the same way index.ts does */
function parse(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('%%'))
  return parseC4(lines)
}

// ============================================================================
// Diagram type detection
// ============================================================================

describe('parseC4 – diagram types', () => {
  it('detects C4Context', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")`)
    expect(d.type).toBe('C4Context')
  })

  it('detects C4Container', () => {
    const d = parse(`C4Container
      Container(web, "Web App", "React", "Frontend")`)
    expect(d.type).toBe('C4Container')
  })

  it('detects C4Component', () => {
    const d = parse(`C4Component
      Component(api, "API", "Express", "REST API")`)
    expect(d.type).toBe('C4Component')
  })

  it('detects C4Dynamic', () => {
    const d = parse(`C4Dynamic
      Person(user, "User", "A user")`)
    expect(d.type).toBe('C4Dynamic')
  })

  it('detects C4Deployment', () => {
    const d = parse(`C4Deployment
      Person(user, "User", "A user")`)
    expect(d.type).toBe('C4Deployment')
  })

  it('defaults to C4Context for unknown header', () => {
    const d = parse(`UnknownType
      Person(user, "User", "A user")`)
    expect(d.type).toBe('C4Context')
  })
})

// ============================================================================
// Title
// ============================================================================

describe('parseC4 – title', () => {
  it('extracts title', () => {
    const d = parse(`C4Context
      title System Context Diagram`)
    expect(d.title).toBe('System Context Diagram')
  })

  it('extracts quoted title', () => {
    const d = parse(`C4Context
      title "My System"`)
    expect(d.title).toBe('My System')
  })

  it('title is undefined when not specified', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")`)
    expect(d.title).toBeUndefined()
  })
})

// ============================================================================
// Element parsing — Person variants
// ============================================================================

describe('parseC4 – Person elements', () => {
  it('parses Person(alias, label, description)', () => {
    const d = parse(`C4Context
      Person(user, "User", "A system user")`)
    expect(d.elements).toHaveLength(1)
    expect(d.elements[0]!.kind).toBe('Person')
    expect(d.elements[0]!.alias).toBe('user')
    expect(d.elements[0]!.label).toBe('User')
    expect(d.elements[0]!.description).toBe('A system user')
    expect(d.elements[0]!.external).toBe(false)
  })

  it('parses Person_Ext as external', () => {
    const d = parse(`C4Context
      Person_Ext(extUser, "External User", "An outside user")`)
    expect(d.elements).toHaveLength(1)
    expect(d.elements[0]!.kind).toBe('Person')
    expect(d.elements[0]!.external).toBe(true)
    expect(d.elements[0]!.alias).toBe('extUser')
    expect(d.elements[0]!.label).toBe('External User')
  })

  it('parses Person without description', () => {
    const d = parse(`C4Context
      Person(user, "User")`)
    expect(d.elements[0]!.description).toBeUndefined()
  })
})

// ============================================================================
// Element parsing — System variants
// ============================================================================

describe('parseC4 – System elements', () => {
  it('parses System(alias, label, description)', () => {
    const d = parse(`C4Context
      System(sys, "Banking System", "Handles transactions")`)
    expect(d.elements[0]!.kind).toBe('System')
    expect(d.elements[0]!.alias).toBe('sys')
    expect(d.elements[0]!.label).toBe('Banking System')
    expect(d.elements[0]!.description).toBe('Handles transactions')
    expect(d.elements[0]!.external).toBe(false)
  })

  it('parses System_Ext as external', () => {
    const d = parse(`C4Context
      System_Ext(mail, "Email System", "Sends emails")`)
    expect(d.elements[0]!.kind).toBe('System')
    expect(d.elements[0]!.external).toBe(true)
  })
})

// ============================================================================
// Element parsing — Container variants (with technology)
// ============================================================================

describe('parseC4 – Container elements', () => {
  it('parses Container(alias, label, technology, description)', () => {
    const d = parse(`C4Container
      Container(web, "Web App", "React", "User-facing frontend")`)
    expect(d.elements[0]!.kind).toBe('Container')
    expect(d.elements[0]!.alias).toBe('web')
    expect(d.elements[0]!.label).toBe('Web App')
    expect(d.elements[0]!.technology).toBe('React')
    expect(d.elements[0]!.description).toBe('User-facing frontend')
    expect(d.elements[0]!.external).toBe(false)
  })

  it('parses Container_Ext as external', () => {
    const d = parse(`C4Container
      Container_Ext(ext, "External API", "REST", "Third-party service")`)
    expect(d.elements[0]!.external).toBe(true)
  })

  it('parses ContainerDb', () => {
    const d = parse(`C4Container
      ContainerDb(db, "Database", "PostgreSQL", "Stores data")`)
    expect(d.elements[0]!.kind).toBe('ContainerDb')
    expect(d.elements[0]!.technology).toBe('PostgreSQL')
  })

  it('parses ContainerDb_Ext', () => {
    const d = parse(`C4Container
      ContainerDb_Ext(extdb, "External DB", "MySQL", "External storage")`)
    expect(d.elements[0]!.kind).toBe('ContainerDb')
    expect(d.elements[0]!.external).toBe(true)
  })

  it('parses ContainerQueue', () => {
    const d = parse(`C4Container
      ContainerQueue(mq, "Message Queue", "RabbitMQ", "Async messaging")`)
    expect(d.elements[0]!.kind).toBe('ContainerQueue')
  })

  it('parses ContainerQueue_Ext', () => {
    const d = parse(`C4Container
      ContainerQueue_Ext(extmq, "External Queue", "SQS", "Cloud queue")`)
    expect(d.elements[0]!.kind).toBe('ContainerQueue')
    expect(d.elements[0]!.external).toBe(true)
  })

  it('parses Container without technology and description', () => {
    const d = parse(`C4Container
      Container(web, "Web App")`)
    expect(d.elements[0]!.technology).toBeUndefined()
    expect(d.elements[0]!.description).toBeUndefined()
  })
})

// ============================================================================
// Element parsing — Component variants
// ============================================================================

describe('parseC4 – Component elements', () => {
  it('parses Component(alias, label, technology, description)', () => {
    const d = parse(`C4Component
      Component(ctrl, "Controller", "Spring MVC", "Handles HTTP")`)
    expect(d.elements[0]!.kind).toBe('Component')
    expect(d.elements[0]!.technology).toBe('Spring MVC')
  })

  it('parses Component_Ext as external', () => {
    const d = parse(`C4Component
      Component_Ext(lib, "Library", "npm", "External dependency")`)
    expect(d.elements[0]!.external).toBe(true)
  })

  it('parses ComponentDb', () => {
    const d = parse(`C4Component
      ComponentDb(repo, "Repository", "JPA", "Data access layer")`)
    expect(d.elements[0]!.kind).toBe('ComponentDb')
  })

  it('parses ComponentQueue', () => {
    const d = parse(`C4Component
      ComponentQueue(handler, "Event Handler", "Spring", "Processes events")`)
    expect(d.elements[0]!.kind).toBe('ComponentQueue')
  })
})

// ============================================================================
// Boundaries
// ============================================================================

describe('parseC4 – boundaries', () => {
  it('parses System_Boundary', () => {
    const d = parse(`C4Context
      System_Boundary(sb, "Banking System") {
        Container(web, "Web App", "React", "Frontend")
      }`)
    expect(d.boundaries).toHaveLength(1)
    expect(d.boundaries[0]!.alias).toBe('sb')
    expect(d.boundaries[0]!.label).toBe('Banking System')
    expect(d.boundaries[0]!.kind).toBe('System_Boundary')
    expect(d.boundaries[0]!.elements).toHaveLength(1)
    expect(d.boundaries[0]!.elements[0]!.alias).toBe('web')
  })

  it('parses Container_Boundary', () => {
    const d = parse(`C4Container
      Container_Boundary(cb, "API Layer") {
        Component(api, "REST API", "Express", "HTTP endpoints")
      }`)
    expect(d.boundaries[0]!.kind).toBe('Container_Boundary')
  })

  it('parses Enterprise_Boundary', () => {
    const d = parse(`C4Context
      Enterprise_Boundary(eb, "Corp") {
        System(sys, "Internal System", "Core system")
      }`)
    expect(d.boundaries[0]!.kind).toBe('Enterprise_Boundary')
  })

  it('parses generic Boundary', () => {
    const d = parse(`C4Context
      Boundary(b, "Zone") {
        System(sys, "System", "A system")
      }`)
    expect(d.boundaries[0]!.kind).toBe('Boundary')
  })

  it('parses nested boundaries', () => {
    const d = parse(`C4Context
      Enterprise_Boundary(eb, "Corp") {
        System_Boundary(sb, "Banking") {
          Container(web, "Web App", "React", "Frontend")
        }
      }`)
    expect(d.boundaries).toHaveLength(1)
    expect(d.boundaries[0]!.childBoundaries).toHaveLength(1)
    expect(d.boundaries[0]!.childBoundaries[0]!.alias).toBe('sb')
    expect(d.boundaries[0]!.childBoundaries[0]!.elements).toHaveLength(1)
  })

  it('sets parentBoundary on nested elements', () => {
    const d = parse(`C4Context
      System_Boundary(sb, "System") {
        Container(web, "Web App", "React", "Frontend")
      }`)
    const el = d.elements.find(e => e.alias === 'web')!
    expect(el.parentBoundary).toBe('sb')
  })

  it('elements outside boundaries have no parentBoundary', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")`)
    expect(d.elements[0]!.parentBoundary).toBeUndefined()
  })

  it('adds all elements to diagram.elements regardless of boundary', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      System_Boundary(sb, "System") {
        Container(web, "Web App", "React", "Frontend")
        Container(api, "API", "Node", "Backend")
      }`)
    expect(d.elements).toHaveLength(3)
  })

  it('handles empty boundary gracefully', () => {
    const d = parse(`C4Context
      System_Boundary(sb, "Empty") {
      }`)
    expect(d.boundaries).toHaveLength(1)
    expect(d.boundaries[0]!.elements).toHaveLength(0)
  })

  it('ignores stray closing braces (issue 4 fix)', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      }
      }`)
    expect(d.elements).toHaveLength(1)
    // Should not crash — stray braces are silently ignored
  })
})

// ============================================================================
// Relationships
// ============================================================================

describe('parseC4 – relationships', () => {
  it('parses Rel(from, to, label)', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel(user, sys, "Uses")`)
    expect(d.relationships).toHaveLength(1)
    expect(d.relationships[0]!.from).toBe('user')
    expect(d.relationships[0]!.to).toBe('sys')
    expect(d.relationships[0]!.label).toBe('Uses')
    expect(d.relationships[0]!.technology).toBeUndefined()
  })

  it('parses Rel with technology', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel(user, sys, "Uses", "HTTPS")`)
    expect(d.relationships[0]!.technology).toBe('HTTPS')
  })

  it('parses Rel_D (down direction)', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel_D(user, sys, "Uses")`)
    expect(d.relationships[0]!.direction).toBe('D')
  })

  it('parses Rel_U (up direction)', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel_U(sys, user, "Reports to")`)
    expect(d.relationships[0]!.direction).toBe('U')
  })

  it('parses Rel_L (left direction)', () => {
    const d = parse(`C4Context
      System(a, "A", "")
      System(b, "B", "")
      Rel_L(a, b, "Left")`)
    expect(d.relationships[0]!.direction).toBe('L')
  })

  it('parses Rel_R (right direction)', () => {
    const d = parse(`C4Context
      System(a, "A", "")
      System(b, "B", "")
      Rel_R(a, b, "Right")`)
    expect(d.relationships[0]!.direction).toBe('R')
  })

  it('parses Rel_Back', () => {
    const d = parse(`C4Context
      System(a, "A", "")
      System(b, "B", "")
      Rel_Back(a, b, "Callback")`)
    expect(d.relationships[0]!.direction).toBe('Back')
  })

  it('parses BiRel (bidirectional)', () => {
    const d = parse(`C4Context
      System(a, "A", "")
      System(b, "B", "")
      BiRel(a, b, "Syncs with")`)
    expect(d.relationships).toHaveLength(1)
    expect(d.relationships[0]!.from).toBe('a')
    expect(d.relationships[0]!.to).toBe('b')
    expect(d.relationships[0]!.label).toBe('Syncs with')
  })

  it('parses multiple relationships', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      System(web, "Web", "Frontend")
      System(api, "API", "Backend")
      Rel(user, web, "Uses")
      Rel(web, api, "Calls", "HTTPS")
      Rel_D(api, web, "Returns data")`)
    expect(d.relationships).toHaveLength(3)
  })

  it('ignores relationship with less than 3 args', () => {
    const d = parse(`C4Context
      Person(user, "User", "A user")
      Rel(user, sys)`)
    expect(d.relationships).toHaveLength(0)
  })
})

// ============================================================================
// Full diagram
// ============================================================================

describe('parseC4 – full diagram', () => {
  it('parses a complete system context diagram', () => {
    const d = parse(`C4Context
      title Internet Banking System
      Person(customer, "Banking Customer", "A customer of the bank")
      System(banking, "Internet Banking System", "Allows customers to manage accounts")
      System_Ext(email, "E-mail System", "Sends emails to customers")
      System_Ext(mainframe, "Mainframe Banking System", "Core banking")
      Rel(customer, banking, "Uses", "HTTPS")
      Rel(banking, email, "Sends emails", "SMTP")
      Rel(banking, mainframe, "Gets account info", "XML/HTTPS")`)

    expect(d.type).toBe('C4Context')
    expect(d.title).toBe('Internet Banking System')
    expect(d.elements).toHaveLength(4)
    expect(d.relationships).toHaveLength(3)

    const customer = d.elements.find(e => e.alias === 'customer')!
    expect(customer.kind).toBe('Person')
    expect(customer.external).toBe(false)

    const email = d.elements.find(e => e.alias === 'email')!
    expect(email.kind).toBe('System')
    expect(email.external).toBe(true)
  })

  it('parses container diagram with boundaries', () => {
    const d = parse(`C4Container
      Person(customer, "Customer", "A banking customer")
      System_Boundary(sb, "Internet Banking System") {
        Container(web, "Web Application", "React", "Provides banking UI")
        Container(api, "API Application", "Node.js", "Provides banking API")
        ContainerDb(db, "Database", "PostgreSQL", "Stores user data")
      }
      Rel(customer, web, "Visits", "HTTPS")
      Rel(web, api, "Makes API calls", "JSON/HTTPS")
      Rel(api, db, "Reads/writes", "SQL")`)

    expect(d.elements).toHaveLength(4) // customer + 3 in boundary
    expect(d.boundaries).toHaveLength(1)
    expect(d.boundaries[0]!.elements).toHaveLength(3)
    expect(d.relationships).toHaveLength(3)
  })

  it('handles comments', () => {
    const d = parse(`C4Context
      %% This is a comment
      Person(user, "User", "A user")
      %% Another comment
      System(sys, "System", "A system")`)
    expect(d.elements).toHaveLength(2)
  })
})
