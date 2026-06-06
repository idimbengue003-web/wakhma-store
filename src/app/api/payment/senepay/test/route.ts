import { NextResponse } from 'next/server'

// SenePay Connection Test
// Tests the API credentials and returns exactly what SenePay responds
export async function GET() {
  const apiKey = process.env.SENEPAY_API_KEY
  const apiSecret = process.env.SENEPAY_API_SECRET
  const webhookSecret = process.env.SENEPAY_WEBHOOK_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  // Check if env vars are set
  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      status: 'missing_keys',
      message: 'Clés API SenePay non configurées',
      envCheck: {
        SENEPAY_API_KEY: apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-6)}` : 'NON DÉFINIE',
        SENEPAY_API_SECRET: apiSecret ? `${apiSecret.slice(0, 10)}...${apiSecret.slice(-6)}` : 'NON DÉFINIE',
        SENEPAY_WEBHOOK_SECRET: webhookSecret ? `${webhookSecret.slice(0, 8)}...` : 'NON DÉFINI',
        NEXT_PUBLIC_BASE_URL: baseUrl || 'NON DÉFINI',
      },
    })
  }

  // Try to create a minimal checkout session to test the API
  try {
    const testPayload = {
      amount: 200,
      currency: 'XOF',
      orderReference: `TEST-${Date.now()}`,
      description: 'Test connexion SenePay - WakhmaStore',
      successUrl: `${baseUrl || 'https://wakhmastore.com'}/payment-success`,
      cancelUrl: `${baseUrl || 'https://wakhmastore.com'}/recharge`,
      webhookUrl: `${baseUrl || 'https://wakhmastore.com'}/api/payment/senepay/webhook`,
      country: 'SN',
      expiresInMinutes: 5,
    }

    console.log('[SenePay Test] Sending test request with:', {
      url: 'https://api.sene-pay.com/api/v1/checkout/sessions',
      apiKeyPrefix: apiKey.slice(0, 10),
      apiSecretPrefix: apiSecret.slice(0, 10),
      payload: testPayload,
    })

    const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Api-Secret': apiSecret,
      },
      body: JSON.stringify(testPayload),
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.ok ? 'success' : 'error',
      httpStatus: response.status,
      httpStatusText: response.statusText,
      senepayResponse: data,
      requestPayload: testPayload,
      envCheck: {
        SENEPAY_API_KEY: `${apiKey.slice(0, 10)}...${apiKey.slice(-6)}`,
        SENEPAY_API_SECRET: `${apiSecret.slice(0, 10)}...${apiSecret.slice(-6)}`,
        SENEPAY_WEBHOOK_SECRET: webhookSecret ? `${webhookSecret.slice(0, 8)}...` : 'NON DÉFINI',
        NEXT_PUBLIC_BASE_URL: baseUrl || 'NON DÉFINI',
      },
    })
  } catch (error) {
    return NextResponse.json({
      status: 'network_error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
