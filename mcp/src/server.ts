import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ApiClient } from './api-client.js'
import { recipeTools, handleRecipeTool } from './tools/recipes.js'
import { familyTools, handleFamilyTool } from './tools/family.js'
import { mealPlanTools, handleMealPlanTool } from './tools/meal-plans.js'
import { groceryTools, handleGroceryTool } from './tools/grocery.js'
import { webSearchTools, handleWebSearchTool } from './tools/web-search.js'

export async function createServer(): Promise<Server> {
  const apiUrl = process.env.FAMILYTABLE_API_URL
  const apiToken = process.env.FAMILYTABLE_API_TOKEN

  if (!apiUrl) {
    throw new Error('FAMILYTABLE_API_URL environment variable is required')
  }

  if (!apiToken) {
    throw new Error('FAMILYTABLE_API_TOKEN environment variable is required')
  }

  const apiClient = new ApiClient({
    baseUrl: apiUrl,
    apiToken: apiToken,
  })

  const server = new Server(
    {
      name: 'familytable-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Combine all tools
  const allTools = [
    ...recipeTools,
    ...familyTools,
    ...mealPlanTools,
    ...groceryTools,
    ...webSearchTools,
  ]

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }))

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      // Route to appropriate tool handler
      const recipeToolNames = recipeTools.map((t) => t.name)
      const familyToolNames = familyTools.map((t) => t.name)
      const mealPlanToolNames = mealPlanTools.map((t) => t.name)
      const groceryToolNames = groceryTools.map((t) => t.name)
      const webSearchToolNames = webSearchTools.map((t) => t.name)

      let result: string

      if (recipeToolNames.includes(name)) {
        result = await handleRecipeTool(name, args ?? {}, apiClient)
      } else if (familyToolNames.includes(name)) {
        result = await handleFamilyTool(name, args ?? {}, apiClient)
      } else if (mealPlanToolNames.includes(name)) {
        result = await handleMealPlanTool(name, args ?? {}, apiClient)
      } else if (groceryToolNames.includes(name)) {
        result = await handleGroceryTool(name, args ?? {}, apiClient)
      } else if (webSearchToolNames.includes(name)) {
        result = await handleWebSearchTool(name, args ?? {}, apiClient)
      } else {
        throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      }
    }
  })

  return server
}

export async function runServer(): Promise<void> {
  const server = await createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
