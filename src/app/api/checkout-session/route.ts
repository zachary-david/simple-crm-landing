import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy initialization to avoid build-time issues
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY environment variable is not set');
    throw new Error('Stripe secret key is required');
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  });
}

export async function POST(request: NextRequest) {
  try {
    const { productId, amount } = await request.json();
    
    // Debug: Check if environment variables are set
    console.log('Environment check:', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      nodeEnv: process.env.NODE_ENV
    });
    
    // Get the origin from the request headers
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    
    // Initialize Stripe
    const stripe = getStripe();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ClickTricks DB Setup',
              description: 'Custom Airtable CRM setup for your business',
              images: [`${origin}/api/og-image`], // Optional: Add your product image
            },
            unit_amount: amount, // $497.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      customer_creation: 'always',
      payment_intent_data: {
        metadata: {
          productId: productId,
          source: 'website',
        },
      },
      metadata: {
        productId: productId,
        source: 'website',
      },
      // Collect customer information
      billing_address_collection: 'required',
      // Custom fields for business information
      custom_fields: [
        {
          key: 'business_name',
          label: {
            type: 'custom',
            custom: 'Business/Company Name',
          },
          type: 'text',
          optional: true,
        },
        {
          key: 'business_type',
          label: {
            type: 'custom',
            custom: 'Business Type',
          },
          type: 'dropdown',
          dropdown: {
            options: [
              { label: 'Freelancer', value: 'freelancer' },
              { label: 'Solopreneur', value: 'solopreneur' },
              { label: 'Small Team (2-10 people)', value: 'smallteam' },
              { label: 'Agency', value: 'agency' },
              { label: 'Other', value: 'other' },
            ],
          },
        },
      ],
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}