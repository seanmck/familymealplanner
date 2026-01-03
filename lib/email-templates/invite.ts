interface InviteEmailParams {
  inviterName: string
  householdName: string
  inviteUrl: string
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

export function generateInviteEmailHtml({
  inviterName,
  householdName,
  inviteUrl,
  emailAssetsUrl,
}: InviteEmailParams & { emailAssetsUrl?: string }): string {
  // Use dedicated email assets URL, or fall back to extracting from invite URL
  // For local dev, set EMAIL_ASSETS_URL to your production URL so images load in email clients
  const appUrl = inviteUrl.split('/invite/')[0]
  const assetsBase = emailAssetsUrl || appUrl
  const logoUrl = `${assetsBase}/email-logo.png`

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
  <div style="max-width: 520px; margin: 0 auto;">

    <!-- Logo/Brand Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <table role="presentation" style="margin: 0 auto;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: middle; padding-right: 10px;">
            <img src="${logoUrl}" alt="FamilyTable" width="40" height="40" style="display: block; border: 0; border-radius: 12px;" />
          </td>
          <td style="vertical-align: middle;">
            <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 600; color: ${colors.foreground}; letter-spacing: -0.5px;">FamilyTable</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Card -->
    <div style="background: ${colors.card}; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04); border: 1px solid ${colors.border};">

      <!-- Heading -->
      <h1 style="font-family: Georgia, 'Times New Roman', serif; color: ${colors.foreground}; font-size: 28px; font-weight: 600; margin: 0 0 24px 0; text-align: center; letter-spacing: -0.5px;">
        You're Invited!
      </h1>

      <!-- Main Message -->
      <p style="color: ${colors.foreground}; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0; text-align: center;">
        <strong>${inviterName}</strong> has invited you to join<br>
        <strong style="color: ${colors.primary};">${householdName}</strong> on FamilyTable.
      </p>

      <!-- Description -->
      <p style="color: ${colors.muted}; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
        Plan meals together, track family preferences, and create grocery lists — all in one place.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: ${colors.primary}; color: ${colors.primaryForeground}; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(184, 92, 56, 0.2);">
          Accept Invitation
        </a>
      </div>

      <!-- Divider -->
      <div style="height: 1px; background-color: ${colors.border}; margin: 32px 0;"></div>

      <!-- Footer Note -->
      <p style="color: ${colors.mutedLight}; font-size: 13px; text-align: center; margin: 0; line-height: 1.5;">
        This invitation expires in 7 days.<br>
        If you didn't expect this email, you can safely ignore it.
      </p>
    </div>

    <!-- Email Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: ${colors.mutedLight}; font-size: 12px; margin: 0;">
        Sent with ❤️ from FamilyTable
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

export function generateInviteEmailText({
  inviterName,
  householdName,
  inviteUrl,
}: InviteEmailParams): string {
  return `
You're Invited to FamilyTable!

${inviterName} has invited you to join ${householdName} on FamilyTable.

FamilyTable helps families plan meals, track preferences, and create grocery lists together.

Accept your invitation: ${inviteUrl}

This invitation expires in 7 days.
  `.trim()
}
