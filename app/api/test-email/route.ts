/**
 * Test Email API - Diagnose Resend configuration
 * DELETE THIS FILE after testing
 */

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not configured',
        env_check: {
          RESEND_API_KEY: 'NOT SET',
          RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'NOT SET'
        }
      })
    }

    // Try to initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Try to send a test email
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'trendyteeshirtco@gmail.com', // Send to your email
      subject: 'Test Email from WLPL',
      html: '<p>This is a test email. If you receive this, Resend is working!</p>'
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Resend API error',
        details: error,
        api_key_prefix: process.env.RESEND_API_KEY?.substring(0, 8) + '...'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      email_id: data?.id,
      api_key_prefix: process.env.RESEND_API_KEY?.substring(0, 8) + '...'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
