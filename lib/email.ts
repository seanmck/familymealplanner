import { Resend } from 'resend'
import {
  generateInviteEmailHtml,
  generateInviteEmailText,
} from './email-templates/invite'
import {
  generateWeeklySummaryEmailHtml,
  generateWeeklySummaryEmailText,
} from './email-templates/weekly-summary'

// Initialize Resend client - will be null if API key not configured
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export interface SendInviteEmailParams {
  to: string
  inviterName: string
  householdName: string
  inviteToken: string
}

export async function sendInviteEmail({
  to,
  inviterName,
  householdName,
  inviteToken,
}: SendInviteEmailParams) {
  if (!resend) {
    console.warn(
      'RESEND_API_KEY is not configured. Email not sent to:',
      to
    )
    // In development, log the invite URL instead
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    console.log('Invite URL:', `${appUrl}/invite/${inviteToken}`)
    return { success: true, development: true }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${inviteToken}`

  // For email assets (images), use production URL even in dev so Gmail can fetch them
  const emailAssetsUrl = process.env.EMAIL_ASSETS_URL

  // Use Resend's test domain in development, or configure your own verified domain
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FamilyTable <onboarding@resend.dev>'

  console.log('Sending invite email to:', to)

  const result = await resend.emails.send({
    from: fromEmail,
    to,
    subject: `${inviterName} invited you to join ${householdName} on FamilyTable`,
    html: generateInviteEmailHtml({ inviterName, householdName, inviteUrl, emailAssetsUrl }),
    text: generateInviteEmailText({ inviterName, householdName, inviteUrl }),
  })

  if (result.error) {
    console.error('Resend error:', result.error)
  } else {
    console.log('Email sent successfully, ID:', result.data?.id)
  }

  return result
}

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

export interface SendWeeklySummaryEmailParams {
  recipients: string[]
  weekRange: string
  dinners: DinnerItem[]
  groceryItems: GroceryCategory[]
  householdName: string
  plannerUrl: string
}

export async function sendWeeklySummaryEmail({
  recipients,
  weekRange,
  dinners,
  groceryItems,
  householdName,
  plannerUrl,
}: SendWeeklySummaryEmailParams): Promise<{ success: boolean; error?: string }> {
  if (recipients.length === 0) {
    return { success: false, error: 'No recipients specified' }
  }

  if (!resend) {
    console.warn(
      'RESEND_API_KEY is not configured. Email not sent to:',
      recipients.join(', ')
    )
    // In development, log the details instead
    console.log('Weekly Summary Email:')
    console.log('  Recipients:', recipients)
    console.log('  Week:', weekRange)
    console.log('  Dinners:', dinners.length)
    console.log('  Grocery items:', groceryItems.reduce((sum, cat) => sum + cat.items.length, 0))
    console.log('  Planner URL:', plannerUrl)
    return { success: true }
  }

  const emailAssetsUrl = process.env.EMAIL_ASSETS_URL || process.env.NEXT_PUBLIC_APP_URL
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FamilyTable <onboarding@resend.dev>'

  console.log('Sending weekly summary email to:', recipients.join(', '))

  const result = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `${householdName} - Meal Plan for ${weekRange}`,
    html: generateWeeklySummaryEmailHtml({
      weekRange,
      dinners,
      groceryItems,
      householdName,
      plannerUrl,
      emailAssetsUrl,
    }),
    text: generateWeeklySummaryEmailText({
      weekRange,
      dinners,
      groceryItems,
      householdName,
      plannerUrl,
    }),
  })

  if (result.error) {
    console.error('Resend error:', result.error)
    return { success: false, error: result.error.message }
  }

  console.log('Weekly summary email sent successfully, ID:', result.data?.id)
  return { success: true }
}
