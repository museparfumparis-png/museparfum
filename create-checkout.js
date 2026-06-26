const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const {
      qty, promoCode,
      shippingLabel, shippingPrice,
      prenom, nom, email, tel,
      adresse, ville, region, cp, pays
    } = JSON.parse(event.body);

    const lineItems = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'MUSE — Extrait de Parfum 50ml',
            description: 'Fragrance florale, fruitée et sensuelle. Concentré à 30%. Tenue 12-16h.',
          },
          unit_amount: 3000,
        },
        quantity: parseInt(qty) || 1,
      }
    ];

    if (shippingPrice && parseFloat(shippingPrice) > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Livraison — ' + (shippingLabel || 'Standard') },
          unit_amount: Math.round(parseFloat(shippingPrice) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email || undefined,
      billing_address_collection: 'auto',
      success_url: process.env.URL + '/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.URL + '/',
      metadata: {
        client: (prenom || '') + ' ' + (nom || ''),
        email: email || '',
        tel: tel || '',
        adresse: [adresse, ville, region, cp, pays].filter(Boolean).join(', '),
        shipping: shippingLabel || '',
        promo: promoCode || '',
      },
      allow_promotion_codes: !promoCode,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
