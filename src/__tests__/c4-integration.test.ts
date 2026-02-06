/**
 * Integration tests for C4 diagrams — end-to-end parse → layout → render.
 */
import { describe, it, expect } from 'bun:test'
import { renderMermaid } from '../index.ts'

describe('renderMermaid – C4 diagrams', () => {
  it('renders a basic C4Context diagram to valid SVG', async () => {
    const svg = await renderMermaid(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel(user, sys, "Uses")`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('User')
    expect(svg).toContain('System')
    expect(svg).toContain('Uses')
  })

  it('renders Person elements with circle head', async () => {
    const svg = await renderMermaid(`C4Context
      Person(user, "Customer", "A banking customer")`)
    expect(svg).toContain('Customer')
    // Person elements have a circle head
    expect(svg).toContain('<circle')
  })

  it('renders external elements with muted fill', async () => {
    const svg = await renderMermaid(`C4Context
      System_Ext(mail, "Email System", "External email")`)
    expect(svg).toContain('Email System')
    expect(svg).toContain('var(--_text-muted)')
  })

  it('renders Container elements with technology in brackets', async () => {
    const svg = await renderMermaid(`C4Container
      Container(web, "Web App", "React", "Frontend UI")`)
    expect(svg).toContain('Web App')
    expect(svg).toContain('[React]')
    expect(svg).toContain('Frontend UI')
  })

  it('renders boundary boxes with dashed borders', async () => {
    const svg = await renderMermaid(`C4Context
      System_Boundary(sb, "Banking System") {
        Container(web, "Web App", "React", "Frontend")
      }`)
    expect(svg).toContain('stroke-dasharray="8 4"')
    expect(svg).toContain('Banking System')
    expect(svg).toContain('[System Boundary]')
  })

  it('renders relationship arrows with polylines', async () => {
    const svg = await renderMermaid(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel(user, sys, "Uses")`)
    expect(svg).toContain('<polyline')
    expect(svg).toContain('marker-end="url(#c4-arrow)"')
  })

  it('renders relationship labels', async () => {
    const svg = await renderMermaid(`C4Context
      Person(user, "User", "A user")
      System(sys, "System", "A system")
      Rel(user, sys, "Makes API calls", "HTTPS")`)
    expect(svg).toContain('Makes API calls')
    expect(svg).toContain('[HTTPS]')
  })

  it('renders title when present', async () => {
    const svg = await renderMermaid(`C4Context
      title System Overview
      Person(user, "User", "A user")`)
    expect(svg).toContain('System Overview')
  })

  it('renders with dark colors', async () => {
    const svg = await renderMermaid(`C4Context
      Person(user, "User", "A user")`, { bg: '#18181B', fg: '#FAFAFA' })
    expect(svg).toContain('--bg:#18181B')
  })

  it('renders a complete system context diagram', async () => {
    const svg = await renderMermaid(`C4Context
      title Internet Banking System
      Person(customer, "Banking Customer", "A customer of the bank")
      System(banking, "Internet Banking System", "Allows customers to manage accounts")
      System_Ext(email, "E-mail System", "Sends emails")
      System_Ext(mainframe, "Mainframe", "Core banking")
      Rel(customer, banking, "Uses", "HTTPS")
      Rel(banking, email, "Sends emails", "SMTP")
      Rel(banking, mainframe, "Gets data", "XML/HTTPS")`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Internet Banking System')
    expect(svg).toContain('Banking Customer')
    expect(svg).toContain('E-mail System')
    expect(svg).toContain('Mainframe')
    // Should have multiple relationship arrows
    const polylineCount = (svg.match(/<polyline/g) ?? []).length
    expect(polylineCount).toBeGreaterThanOrEqual(3)
  })

  it('renders container diagram with boundaries', async () => {
    const svg = await renderMermaid(`C4Container
      Person(customer, "Customer", "Banking customer")
      System_Boundary(sb, "Internet Banking") {
        Container(web, "Web App", "React", "Frontend")
        Container(api, "API", "Node.js", "Backend")
        ContainerDb(db, "Database", "PostgreSQL", "Storage")
      }
      Rel(customer, web, "Visits", "HTTPS")
      Rel(web, api, "Calls", "JSON")
      Rel(api, db, "Reads/writes", "SQL")`)
    expect(svg).toContain('Internet Banking')
    expect(svg).toContain('Web App')
    expect(svg).toContain('API')
    expect(svg).toContain('Database')
    expect(svg).toContain('stroke-dasharray="8 4"') // boundary dashed border
  })

  it('renders empty diagram without errors', async () => {
    const svg = await renderMermaid(`C4Context`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('renders with transparent background (no background style)', async () => {
    const svg = await renderMermaid(`C4Context
      Person(user, "User", "A user")`, { transparent: true })
    // When transparent, the background:var(--bg) style is omitted from the svg tag
    expect(svg).not.toContain('background:var(--bg)')
  })
})
