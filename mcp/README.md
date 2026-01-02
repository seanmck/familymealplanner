# FamilyTable MCP Server

An MCP (Model Context Protocol) server that enables Claude Code to interact with FamilyTable meal planning data for AI-assisted meal suggestions.

## Features

- **Recipe Management**: Search, import from URLs, and save new recipes
- **Family Preferences**: Get aggregated family ratings and preferences
- **Meal Planning**: View current and historical meal plans
- **Grocery Lists**: Access grocery lists and pantry staples
- **Web Search Integration**: Guidance for finding new recipes online

## Setup

### 1. Generate an API Token

First, create an API token through the FamilyTable API:

```bash
# Using curl (replace with your session cookie)
curl -X POST http://localhost:3000/api/settings/api-tokens \
  -H "Content-Type: application/json" \
  -d '{"name": "Claude MCP Access"}'
```

Or add token generation to your settings page in the app.

**Important**: Save the token immediately - it's only shown once!

### 2. Install Dependencies

```bash
cd mcp
npm install
```

### 3. Build the Server

```bash
npm run build
```

### 4. Configure Claude Code

Add to your Claude Code MCP configuration (`.claude/mcp.json` in your home directory or project):

```json
{
  "mcpServers": {
    "familytable": {
      "command": "node",
      "args": ["/path/to/familymealplanner/mcp/dist/index.js"],
      "env": {
        "FAMILYTABLE_API_URL": "http://localhost:3000",
        "FAMILYTABLE_API_TOKEN": "ft_your_token_here"
      }
    }
  }
}
```

For deployed apps, update `FAMILYTABLE_API_URL` to your production URL.

## Available Tools

### Recipe Tools

| Tool | Description |
|------|-------------|
| `get_recipes` | Search recipes with optional filters (search text, tag, type) |
| `get_recipe_suggestions` | Get AI-optimized suggestions based on family ratings |
| `import_recipe_from_url` | Parse a recipe from any supported recipe website |
| `save_recipe` | Add a new recipe to the household collection |

### Family Tools

| Tool | Description |
|------|-------------|
| `get_family_members` | List family members with their roles |
| `get_family_preferences_summary` | Aggregated preferences, favorites, and avoid list |

### Meal Planning Tools

| Tool | Description |
|------|-------------|
| `get_meal_plan` | Get the meal plan for a specific week |
| `get_recent_meal_plans` | View meal history to avoid repetition |

### Grocery Tools

| Tool | Description |
|------|-------------|
| `get_grocery_list` | Get grocery list for a meal plan |
| `get_pantry_staples` | List items always in stock |

### Discovery Tools

| Tool | Description |
|------|-------------|
| `search_recipes_web` | Get guidance for finding new recipes online |

## Usage Examples

### Get Meal Suggestions

```
User: Suggest dinners for this week based on what the family likes

Claude will:
1. Call get_family_preferences_summary to understand preferences
2. Call get_recent_meal_plans to see what's been made recently
3. Call get_recipe_suggestions to get scored suggestions
4. Synthesize a personalized meal plan recommendation
```

### Import a New Recipe

```
User: Find me a new pasta recipe the kids might like

Claude will:
1. Call search_recipes_web to get search guidance
2. Use web search to find suitable recipes
3. Call import_recipe_from_url with the chosen URL
4. Call save_recipe to add it to the collection
```

### Plan Around Ingredients

```
User: What can we make with the chicken in the fridge?

Claude will:
1. Call get_recipe_suggestions with ingredients="chicken"
2. Check get_family_preferences_summary to filter for family-approved recipes
3. Suggest recipes that use chicken and the family enjoys
```

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run the server (usually done by Claude Code)
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FAMILYTABLE_API_URL` | Base URL of the FamilyTable API | Yes |
| `FAMILYTABLE_API_TOKEN` | API token for authentication | Yes |

## Troubleshooting

### "Unauthorized" errors
- Verify your API token is correct
- Check that the token hasn't been revoked
- Ensure `FAMILYTABLE_API_TOKEN` is set correctly

### Connection errors
- Verify `FAMILYTABLE_API_URL` is correct
- For local development, ensure the Next.js server is running
- For production, check the URL is accessible

### Tool not found
- Restart Claude Code after modifying MCP configuration
- Verify the server built successfully with `npm run build`
