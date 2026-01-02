import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ApiClient } from '../api-client.js'

export const familyTools: Tool[] = [
  {
    name: 'get_family_members',
    description:
      'List all family members in the household with their names and roles (ADULT or CHILD).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_family_preferences_summary',
    description:
      'Get a comprehensive summary of family food preferences including favorite recipes, recipes to avoid (especially those kids dislike), preferred tags, and recently made meals. This is ideal for generating meal plan suggestions.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

export async function handleFamilyTool(
  name: string,
  _args: Record<string, unknown>,
  api: ApiClient
): Promise<string> {
  switch (name) {
    case 'get_family_members': {
      const members = await api.getFamilyMembers()

      if (members.length === 0) {
        return 'No family members found. Add family members in the app to track individual preferences.'
      }

      const adults = members.filter((m) => m.role === 'ADULT')
      const children = members.filter((m) => m.role === 'CHILD')

      return JSON.stringify(
        {
          totalMembers: members.length,
          adults: adults.map((m) => ({ id: m.id, name: m.name })),
          children: children.map((m) => ({ id: m.id, name: m.name })),
        },
        null,
        2
      )
    }

    case 'get_family_preferences_summary': {
      const preferences = await api.getPreferencesSummary()

      return JSON.stringify(
        {
          familyComposition: {
            totalMembers: preferences.stats.totalFamilyMembers,
            adults: preferences.members
              .filter((m) => m.role === 'ADULT')
              .map((m) => m.name),
            children: preferences.members
              .filter((m) => m.role === 'CHILD')
              .map((m) => m.name),
          },
          recipeStats: {
            totalRecipes: preferences.stats.totalRecipes,
            recipesWithRatings: preferences.stats.recipesWithRatings,
          },
          favorites: preferences.favoriteRecipes.map((r) => ({
            title: r.title,
            upVotes: r.upVotes,
            universallyLiked: r.hasNoDownVotes,
            tags: r.tags,
          })),
          recipesToAvoid: preferences.avoidRecipes.map((r) => ({
            title: r.title,
            downVotes: r.downVotes,
            kidsDontLike: r.kidDownVotes > 0,
          })),
          preferredTags: preferences.preferredTags.slice(0, 5).map((t) => t.tag),
          recentlyMade: preferences.recentlyMade.map((r) => ({
            title: r.title,
            daysAgo: r.daysSinceUsed,
          })),
        },
        null,
        2
      )
    }

    default:
      throw new Error(`Unknown family tool: ${name}`)
  }
}
