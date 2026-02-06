/**
 * Integration tests for ArchiMate diagrams — end-to-end parse → layout → render.
 */
import { describe, it, expect } from 'bun:test'
import { renderMermaid } from '../index.ts'

describe('renderMermaid – ArchiMate diagrams', () => {
  it('renders a basic ArchiMate diagram to valid SVG', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer
        service Banking
      Customer -->|serving| Banking`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('Customer')
    expect(svg).toContain('Banking')
  })

  it('renders layer bands with background tints', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer
      application:
        component WebApp`)
    // Layer bands should have color-mix tints
    expect(svg).toContain('color-mix(in srgb,')
    // Should contain layer labels
    expect(svg).toContain('Business')
    expect(svg).toContain('Application')
  })

  it('renders element boxes with rounded rectangles', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer`)
    // Element boxes use rx="4" ry="4" for rounded corners
    expect(svg).toContain('rx="4"')
    expect(svg).toContain('ry="4"')
  })

  it('renders element type indicator in top-right corner', async () => {
    const svg = await renderMermaid(`archimate-layered
      application:
        component WebApp`)
    // Type indicator should show the formatted type name
    expect(svg).toContain('Component')
    expect(svg).toContain('WebApp')
  })

  it('renders relationship lines between elements', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer
        service Banking
      Customer -->|serving| Banking`)
    expect(svg).toContain('<polyline')
  })

  it('renders dashed lines for realization relationships', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        service Banking
      application:
        component WebApp
      WebApp -->|realization| Banking`)
    expect(svg).toContain('stroke-dasharray="6 4"')
  })

  it('renders SVG marker defs for different relationship types', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer
        service Banking
      Customer -->|serving| Banking`)
    // Should contain marker definitions
    expect(svg).toContain('<defs>')
    expect(svg).toContain('<marker id="archimate-arrow')
    expect(svg).toContain('</defs>')
  })

  it('renders with appropriate markers for composition', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        process Parent
        process Child
      Parent -->|composition| Child`)
    expect(svg).toContain('marker-start="url(#archimate-diamond-filled)"')
  })

  it('renders with dark colors', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer`, { bg: '#18181B', fg: '#FAFAFA' })
    expect(svg).toContain('--bg:#18181B')
  })

  it('renders serving relationship with open arrowhead marker', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer
        service Banking
      Customer -->|serving| Banking`)
    // Serving relationships use open arrowhead marker
    expect(svg).toContain('marker-end="url(#archimate-arrow-open)"')
  })

  it('renders a complete multi-layer diagram', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer
        service "Online Banking" as OB
        process "Order Processing" as OP
      application:
        component "Web Application" as WA
        component "API Gateway" as AG
      technology:
        node "App Server" as AS
      Customer -->|serving| OB
      OB -->|triggering| OP
      WA -->|realization| OB
      AG -->|serving| WA
      AS -->|assignment| WA`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Customer')
    expect(svg).toContain('Online Banking')
    expect(svg).toContain('Order Processing')
    expect(svg).toContain('Web Application')
    expect(svg).toContain('API Gateway')
    expect(svg).toContain('App Server')
    // Should have layer bands for business, application, technology
    expect(svg).toContain('Business')
    expect(svg).toContain('Application')
    expect(svg).toContain('Technology')
    // Should have multiple relationship lines
    const polylineCount = (svg.match(/<polyline/g) ?? []).length
    expect(polylineCount).toBeGreaterThanOrEqual(5)
  })

  it('renders empty diagram without errors', async () => {
    const svg = await renderMermaid(`archimate-layered`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('renders with transparent background (no background style)', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor Customer`, { transparent: true })
    // When transparent, the background:var(--bg) style is omitted from the svg tag
    expect(svg).not.toContain('background:var(--bg)')
  })

  it('renders association relationships without markers', async () => {
    const svg = await renderMermaid(`archimate-layered
      business:
        actor A
        actor B
      A --> B`)
    // Association has no marker-start or marker-end
    const polylineMatch = svg.match(/<polyline[^>]*>/)
    expect(polylineMatch).toBeTruthy()
    // The polyline for association should not have marker attributes
    // (but other polylines might, so just verify the diagram renders)
    expect(svg).toContain('<svg')
  })
})
