import React, { useState } from 'react';
import { Card, Button, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import { FaCheck, FaStar, FaBriefcase, FaRocket } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { auth, createCheckoutSession } from './firebase'; // Import from your firebase.js
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Pricing = () => {
  const navigate = useNavigate();
  const [subscriptionType, setSubscriptionType] = useState('premium');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const user = auth.currentUser; // Get current user from Firebase Auth

  const plans = {
    premium: [
      {
        id: '1_search',
        name: 'Starter',
        price: 11.95,
        searches: 1,
        features: ['1 VIN search', 'Basic vehicle details', 'Email support'],
        bestValue: false,
        // Replace with actual Stripe price ID (not product ID)
        priceId: 'price_1RFgsEB084qIp5RaobF4Vcol',
      },
      {
        id: '5_searches',
        name: 'Explorer',
        price: 40.95,
        searches: 5,
        features: [
          '5 VIN searches',
          'Detailed vehicle history',
          'Email support',
        ],
        bestValue: true,
        // Replace with actual Stripe price ID (not product ID)
        priceId: 'price_2OsXXXXXXXXXXXXXXXXXXXXX',
      },
      {
        id: '8_searches',
        name: 'Pro',
        price: 59.95,
        searches: 8,
        features: [
          '8 VIN searches',
          'Full vehicle history',
          'Priority email support',
        ],
        bestValue: false,
        priceId: 'price_3OsXXXXXXXXXXXXXXXXXXXXX',
      },
    ],
    business: [
      {
        id: '20_searches',
        name: 'Small Business',
        price: 149.99,
        searches: 20,
        features: [
          '20 VIN searches',
          'API access',
          'Dedicated account manager',
        ],
        bestValue: false,
        priceId: 'price_4OsXXXXXXXXXXXXXXXXXXXXX',
      },
      {
        id: '50_searches',
        name: 'Enterprise',
        price: 374.99,
        searches: 50,
        features: ['50 VIN searches', 'API access', '24/7 priority support'],
        bestValue: true,
        priceId: 'price_5OsXXXXXXXXXXXXXXXXXXXXX',
      },
      {
        id: '100_searches',
        name: 'Corporate',
        price: 589.99,
        searches: 100,
        features: ['100 VIN searches', 'API access', 'Custom integrations'],
        bestValue: false,
        priceId: 'price_6OsXXXXXXXXXXXXXXXXXXXXX',
      },
    ],
  };

  const handleCheckout = async (plan) => {
    if (!user) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    setLoadingPlan(plan.id);
    setError(null);

    try {
      console.log(
        `Initiating checkout for plan ${plan.id} with priceId ${plan.priceId}`
      );

      // Create checkout session
      const result = await createCheckoutSession({
        price: plan.priceId, // This should be a valid Stripe price ID
        success_url: `${window.location.origin}/user-account?payment_success=true&plan=${plan.id}`,
        cancel_url: `${window.location.origin}/pricing?payment_canceled=true`,
        searchCredits: plan.searches.toString(),
        productName: `${plan.name} - ${plan.searches} Searches`,
      });

      console.log('Checkout session result:', result);

      // Check if we have a valid result and URL property
      if (result && result.url) {
        // Use the URL from the result
        window.location.href = result.url;
      } else if (result && result.data && result.data.url) {
        // Alternative: sometimes Firebase functions return nested data
        window.location.href = result.data.url;
      } else if (result && result.sessionId) {
        // If only sessionId is returned, redirect to Stripe directly
        const stripe = await stripePromise;
        await stripe.redirectToCheckout({
          sessionId: result.sessionId,
        });
      } else {
        // No valid response format found
        console.error('Invalid checkout response:', result);
        throw new Error('Checkout failed: Invalid response from server');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(`Payment error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Choose Your Plan</h2>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <div className="text-center mb-4">
        <Form>
          <Form.Check
            type="switch"
            id="subscription-toggle"
            label={
              subscriptionType === 'premium' ? (
                <span>
                  <FaStar className="me-2" /> Premium Plans
                </span>
              ) : (
                <span>
                  <FaBriefcase className="me-2" /> Business Plans
                </span>
              )
            }
            checked={subscriptionType === 'business'}
            onChange={() => {
              setSubscriptionType(
                subscriptionType === 'premium' ? 'business' : 'premium'
              );
              setError(null);
            }}
          />
        </Form>
      </div>

      <div className="row">
        {plans[subscriptionType].map((plan) => (
          <div key={plan.id} className="col-md-4 mb-4">
            <Card
              className={`h-100 shadow-sm ${plan.bestValue ? 'border-primary' : ''}`}
            >
              <Card.Body className="d-flex flex-column">
                <div className="text-center">
                  {plan.bestValue && (
                    <Badge bg="primary" className="mb-3">
                      Best Value
                    </Badge>
                  )}
                  <h4 className="mb-3">{plan.name}</h4>
                  <h2 className="mb-3">${plan.price}</h2>
                  <p className="text-muted mb-4">
                    {plan.searches} VIN search{plan.searches > 1 ? 'es' : ''}
                  </p>
                </div>

                <ul className="list-unstyled mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="mb-2">
                      <FaCheck className="text-success me-2" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.bestValue ? 'primary' : 'outline-primary'}
                  className="mt-auto"
                  onClick={() => handleCheckout(plan)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Processing...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>

      <div className="text-center mt-5">
        <h4>Why Choose Us?</h4>
        <p className="text-muted">
          Get instant access to comprehensive vehicle history reports.
        </p>
        {!user && (
          <Button
            variant="success"
            size="lg"
            onClick={() => navigate('/signup')}
          >
            <FaRocket className="me-2" />
            Sign Up for Free
          </Button>
        )}
      </div>
    </div>
  );
};

export default Pricing;
