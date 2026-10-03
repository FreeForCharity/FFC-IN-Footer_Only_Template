import React from 'react'
import TeamMemberCard from '@/components/ui/TeamMemberCard'
import { team } from '@/data/team'
import { PENDING_TEXT, isPending, siteConfig } from '@/lib/site.config'

// Team members are sourced from src/data/team/*.json (aggregated in
// src/data/team.ts). To change the team, edit those JSON files — no need to
// touch this component. Each card renders an initials monogram (no photos) and
// links to the member's LinkedIn when one is provided. The first three members
// render in the top row and the remaining members in a second row.
/**
 * The section heading, "The <name> Team". A name that already starts with the
 * article keeps its own ("The Brain Injury Research Foundation Team", not
 * "The The Brain Injury ... Team"). Case-insensitive, and only the whole word:
 * "Theatre Guild" still becomes "The Theatre Guild Team".
 */
export function teamHeading(name: string): string {
  const trimmed = name.trim()
  return /^the\s/i.test(trimmed) ? `${trimmed} Team` : `The ${trimmed} Team`
}

const index = () => {
  // Safety guard: with no members there is nothing to show (a pre-501(c)(3)
  // application supplies at least three, so this is normally populated).
  // A pending team is shown as a visible placeholder instead (see
  // PendingField in site.config.ts).
  if (team.length === 0 && !isPending('team')) return null

  const topRow = team.slice(0, 3)
  const bottomRow = team.slice(3)

  return (
    <div id="team" className="py-[50px]">
      <h1
        className="font-[400] text-[40px] lg:text-[48px]  tracking-[0] text-center mx-auto mb-[50px]"
        id="faustina-font"
      >
        {teamHeading(siteConfig.name)}
      </h1>

      {isPending('team') && team.length === 0 && (
        <p className="text-center italic text-gray-600">{PENDING_TEXT}</p>
      )}
      <div className="w-[90%] mx-auto py-[40px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  items-stretch justify-center mb-[50px] gap-[30px]">
          {topRow.map((member) => (
            <TeamMemberCard
              key={member.name}
              name={member.name}
              role={member.role}
              linkedinUrl={member.linkedinUrl}
            />
          ))}
        </div>
        {bottomRow.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 items-center justify-center mt-[40px] gap-[30px]">
            {bottomRow.map((member) => (
              <TeamMemberCard
                key={member.name}
                name={member.name}
                role={member.role}
                linkedinUrl={member.linkedinUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default index
