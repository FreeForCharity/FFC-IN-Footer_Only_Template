import { team } from '../../src/data/team'

describe('Team data integrity', () => {
  it('should have exactly 5 team members', () => {
    expect(team).toHaveLength(5)
  })

  it.each(team)('team member "$name" should have required fields', (member) => {
    expect(member.name).toBeDefined()
    expect(typeof member.name).toBe('string')
    expect(member.name.trim().length).toBeGreaterThan(0)

    expect(member.role).toBeDefined()
    expect(typeof member.role).toBe('string')
    expect(member.role.trim().length).toBeGreaterThan(0)

    // Photos were removed in favor of initials monograms — no imageUrl field.
    expect('imageUrl' in member).toBe(false)

    // linkedinUrl is optional; when set it must be an https:// URL on
    // linkedin.com (or a subdomain) — the only shape TeamMemberCard turns into
    // a link (safeLinkedInUrl). Enforcing the host here means bad data fails
    // the suite instead of silently rendering as a non-link.
    if (member.linkedinUrl !== undefined) {
      expect(member.linkedinUrl).toMatch(/^https:\/\/([a-z0-9-]+\.)*linkedin\.com(\/|$)/i)
    }
  })

  it('should have no duplicate names', () => {
    const names = team.map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('should contain expected team members', () => {
    const names = team.map((m) => m.name)
    expect(names).toContain('Clarke Moyer')
    expect(names).toContain('Chris Rae')
    expect(names).toContain('Tyler Carlotto')
    expect(names).toContain('Brennan Darling')
    expect(names).toContain('Rebecca Cook')
  })
})
