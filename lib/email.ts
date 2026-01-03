import { Resend } from 'resend'
import {
  generateInviteEmailHtml,
  generateInviteEmailText,
} from './email-templates/invite'

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
