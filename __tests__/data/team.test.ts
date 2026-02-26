import { team } from '../../src/data/team'

describe('Team data integrity', () => {
  it('should have exactly 5 team members', () => {
    expect(team).toHaveLength(5)
  })

  it.each(team)('team member "$name" should have required fields', (member) => {
    expect(member.name).toBeDefined()
    expect(typeof member.name).toBe('string')
    expect(member.name.trim().length).toBeGreaterThan(0)

    expect(member.title).toBeDefined()
    expect(typeof member.title).toBe('string')
    expect(member.title.trim().length).toBeGreaterThan(0)
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
