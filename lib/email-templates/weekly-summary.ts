interface DinnerItem {
  day: string
  date: string
  title: string
  imageUrl: string | null
  description: string | null
  sourceUrl: string | null
  sides: string[]
}

interface GroceryCategory {
  category: string
  items: Array<{
    name: string
    quantity: number | null
    unit: string | null
  }>
}

interface WeeklySummaryEmailParams {
  weekRange: string
  dinners: DinnerItem[]
  groceryItems: GroceryCategory[]
  householdName: string
  plannerUrl: string
}

// FamilyTable brand colors (converted from oklch to hex for email compatibility)
const colors = {
  // Terracotta primary
  primary: '#B85C38',
  primaryForeground: '#FAF8F5',
  // Warm cream background
  background: '#FAF8F5',
  // Warm white card
  card: '#FFFEFB',
  // Dark warm brown text
  foreground: '#3D3830',
  // Muted text
  muted: '#7A7268',
  mutedLight: '#A09892',
  // Warm border
  border: '#E6E0D8',
  // Honey accent
  accent: '#E8C87C',
}

function generateDinnerRow(dinner: DinnerItem): string {
  const hasImage = dinner.imageUrl && dinner.imageUrl.trim() !== ''
  const hasMeal = dinner.title !== 'No dinner planned'

  const imageCell = hasImage
    ? `<td style="width: 80px; padding-right: 16px; vertical-align: top;">
        <img src="${dinner.imageUrl}" alt="${dinner.title}" width="80" height="80" style="display: block; border-radius: 8px; object-fit: cover;" />
      </td>`
    : hasMeal
      ? `<td style="width: 80px; padding-right: 16px; vertical-align: top;">
          <div style="width: 80px; height: 80px; background-color: ${colors.border}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px; color: ${colors.mutedLight};">&#127869;</span>
          </div>
        </td>`
      : ''

  const titleStyle = hasMeal
    ? `font-size: 16px; font-weight: 600; color: ${colors.foreground}; margin: 0 0 4px 0;`
    : `font-size: 15px; font-style: italic; color: ${colors.mutedLight}; margin: 0;`

  const sidesHtml =
    dinner.sides.length > 0
      ? `<p style="font-size: 13px; color: ${colors.muted}; margin: 4px 0 0 0;">with ${dinner.sides.join(', ')}</p>`
      : ''

  // Truncate description to ~160 chars for email
  const truncatedDescription = dinner.description
    ? dinner.description.length > 160
      ? dinner.description.substring(0, 160).trim() + '...'
      : dinner.description
    : null

  const descriptionHtml =
    truncatedDescription && hasMeal
      ? `<p style="font-size: 13px; color: ${colors.muted}; margin: 4px 0 0 0; line-height: 1.4;">${truncatedDescription}</p>`
      : ''

  const sourceHtml =
    dinner.sourceUrl && hasMeal
      ? `<p style="margin: 6px 0 0 0;"><a href="${dinner.sourceUrl}" style="font-size: 12px; color: ${colors.primary}; text-decoration: none;">View original recipe &rarr;</a></p>`
      : ''

  return `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid ${colors.border};">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            ${imageCell}
            <td style="vertical-align: top;">
              <p style="font-size: 12px; font-weight: 600; color: ${colors.primary}; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">
                ${dinner.day} <span style="color: ${colors.muted}; font-weight: 400;">${dinner.date}</span>
              </p>
              <p style="${titleStyle}">${dinner.title}</p>
              ${sidesHtml}
              ${descriptionHtml}
              ${sourceHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

function generateGrocerySection(categories: GroceryCategory[]): string {
  if (categories.length === 0) {
    return `
      <p style="color: ${colors.muted}; font-size: 15px; text-align: center; margin: 24px 0;">
        No items on your grocery list
      </p>
    `
  }

  const categoryHtml = categories
    .map(
      (cat) => `
      <div style="margin-bottom: 20px;">
        <p style="font-size: 13px; font-weight: 600; color: ${colors.primary}; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0; border-bottom: 1px solid ${colors.border}; padding-bottom: 6px;">
          ${cat.category}
        </p>
        <ul style="margin: 0; padding: 0 0 0 20px; color: ${colors.foreground};">
          ${cat.items
            .map((item) => {
              const qty =
                item.quantity && item.unit
                  ? `${item.quantity} ${item.unit} `
                  : item.quantity
                    ? `${item.quantity} `
                    : ''
              return `<li style="font-size: 15px; line-height: 1.6; margin: 0;">${qty}${item.name}</li>`
            })
            .join('')}
        </ul>
      </div>
    `
    )
    .join('')

  return categoryHtml
}

export function generateWeeklySummaryEmailHtml({
  weekRange,
  dinners,
  groceryItems,
  householdName,
  plannerUrl,
  emailAssetsUrl,
}: WeeklySummaryEmailParams & { emailAssetsUrl?: string }): string {
  const logoUrl = emailAssetsUrl ? `${emailAssetsUrl}/email-logo.png` : null

  const dinnerRows = dinners.map(generateDinnerRow).join('')
  const groceryHtml = generateGrocerySection(groceryItems)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Georgia, serif !important;}
  </style>
  <![endif]-->
</head>
<body style="font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${colors.background}; margin: 0; padding: 40px 20px;">
  <!-- Outer container -->
  <div style="max-width: 560px; margin: 0 auto;">

    <!-- Logo/Brand Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <table role="presentation" style="margin: 0 auto;" cellpadding="0" cellspacing="0">
        <tr>
          ${logoUrl ? `<td style="vertical-align: middle; padding-right: 10px;">
            <img src="${logoUrl}" alt="FamilyTable" width="40" height="40" style="display: block; border: 0; border-radius: 12px;" />
          </td>` : ''}
          <td style="vertical-align: middle;">
            <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 600; color: ${colors.foreground}; letter-spacing: -0.5px;">FamilyTable</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Card -->
    <div style="background: ${colors.card}; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04); border: 1px solid ${colors.border};">

      <!-- Week Heading -->
      <h1 style="font-family: Georgia, 'Times New Roman', serif; color: ${colors.foreground}; font-size: 26px; font-weight: 600; margin: 0 0 8px 0; text-align: center; letter-spacing: -0.5px;">
        Your Week
      </h1>
      <p style="color: ${colors.muted}; font-size: 16px; text-align: center; margin: 0 0 28px 0;">
        ${weekRange}
      </p>

      <!-- Dinner Section -->
      <h2 style="font-size: 14px; font-weight: 600; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">
        Dinner Plan
      </h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 32px;">
        ${dinnerRows}
      </table>

      <!-- Divider -->
      <div style="height: 2px; background: linear-gradient(to right, transparent, ${colors.border}, transparent); margin: 8px 0 28px 0;"></div>

      <!-- Grocery Section -->
      <h2 style="font-size: 14px; font-weight: 600; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;">
        Grocery List
      </h2>
      ${groceryHtml}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0 8px 0;">
        <a href="${plannerUrl}" style="display: inline-block; background-color: ${colors.primary}; color: ${colors.primaryForeground}; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(184, 92, 56, 0.2);">
          View in Planner
        </a>
      </div>
    </div>

    <!-- Email Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: ${colors.mutedLight}; font-size: 12px; margin: 0;">
        Sent from ${householdName} on FamilyTable
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

export function generateWeeklySummaryEmailText({
  weekRange,
  dinners,
  groceryItems,
  householdName,
}: WeeklySummaryEmailParams): string {
  const dinnerLines = dinners
    .map((d) => {
      const sidesText = d.sides.length > 0 ? `\n    with ${d.sides.join(', ')}` : ''
      const descText = d.description ? `\n    ${d.description.substring(0, 160)}${d.description.length > 160 ? '...' : ''}` : ''
      const sourceText = d.sourceUrl ? `\n    Recipe: ${d.sourceUrl}` : ''
      return `${d.day} ${d.date}: ${d.title}${sidesText}${descText}${sourceText}`
    })
    .join('\n\n')

  const groceryLines =
    groceryItems.length > 0
      ? groceryItems
          .map((cat) => {
            const items = cat.items
              .map((item) => {
                const qty =
                  item.quantity && item.unit
                    ? `${item.quantity} ${item.unit} `
                    : item.quantity
                      ? `${item.quantity} `
                      : ''
                return `  - ${qty}${item.name}`
              })
              .join('\n')
            return `${cat.category}:\n${items}`
          })
          .join('\n\n')
      : 'No items on your grocery list'

  return `
Your Week: ${weekRange}
${householdName}

DINNER PLAN
-----------
${dinnerLines}

GROCERY LIST
------------
${groceryLines}
  `.trim()
}
