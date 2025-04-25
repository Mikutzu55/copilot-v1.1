import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Form,
  Alert,
  Spinner,
  Container,
  Row,
  Col,
} from 'react-bootstrap';
import {
  FaCheck,
  FaStar,
  FaBriefcase,
  FaCarCrash,
  FaIdCard,
  FaDollarSign,
  FaBrain,
  FaLightbulb,
  FaChartLine,
  FaQuestionCircle,
  FaSearch,
  FaShieldAlt,
  FaArrowRight,
  FaInfoCircle,
  FaCar,
  FaRobot,
  FaCommentAlt,
  FaExclamationCircle,
  FaRegClock,
  FaUser,
  FaArrowUp,
  FaLock,
  FaMedal,
  FaTimes,
} from 'react-icons/fa';
import { auth } from './firebase';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from './ThemeContext';
import { createCheckoutSession, hasActiveChatAccess } from './firebase'; // Make sure this is imported
import axios from 'axios';

const db = getFirestore();

const Home = ({ theme }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('premium');
  const [membership, setMembership] = useState('free');
  const [flippedCards, setFlippedCards] = useState({});
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const { toggleTheme } = useTheme();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [aiTip, setAiTip] = useState('');
  const [loadingTip, setLoadingTip] = useState(false);
  const [showAiDemo, setShowAiDemo] = useState(false);
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const [chatAccessEndTime, setChatAccessEndTime] = useState(null);
  const [demoMessages, setDemoMessages] = useState([
    {
      content:
        "Hello! I'm your automotive AI assistant. How can I help you today?",
      isUser: false,
    },
  ]);
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoDone, setDemoDone] = useState(false);
  const demoTimeout = useRef(null);

  const demoConversation = [
    {
      content: 'Is a 2018 Honda Accord with 50,000 miles a good buy?',
      isUser: true,
    },
    {
      content:
        'A 2018 Honda Accord with 50,000 miles is generally considered a good purchase. The 2018 model was part of the 10th generation redesign with improved features and reliability. Honda Accords are known for their longevity, often lasting 200,000+ miles with proper maintenance.\n\nSome key points to consider:\n\n1. The mileage (50,000) is lower than average for a 5-year-old car, which is positive\n2. Make sure to check for any recalls (there were a few for the 2018 model)\n3. Verify the vehicle history report for accidents or damage\n4. The 1.5L turbo engine in some models had oil dilution issues in early production\n\nWould you like me to explain what specific things you should inspect before purchasing?',
      isUser: false,
    },
    { content: 'Yes, what should I check before buying?', isUser: true },
    {
      content:
        'Before buying the 2018 Honda Accord, check these key items:\n\n1. **Vehicle History Report**: Verify accident history, service records, and title status\n\n2. **Engine & Transmission**: \n   - Test drive to ensure smooth acceleration and gear shifts\n   - Listen for unusual noises\n   - Check for oil leaks or blue exhaust smoke\n   - If it has the 1.5L turbo, check oil level and condition (some had oil dilution issues)\n\n3. **Electronics & Features**:\n   - Test all infotainment functions\n   - Verify all driver assistance features work (Honda Sensing)\n   - Check all lights, windows, and climate controls\n\n4. **Suspension & Steering**:\n   - Check for even tire wear\n   - Test brakes for responsiveness\n   - Ensure the car tracks straight when driving\n\n5. **Exterior & Interior**:\n   - Look for rust, especially underneath\n   - Check for panel gaps or mismatched paint\n   - Inspect interior for excessive wear\n\n6. **Maintenance Records**:\n   - Verify regular oil changes\n   - Check if timing belt service was done (if applicable)\n\n7. **Have a mechanic inspect it** before purchasing if possible',
      isUser: false,
    },
    { content: "That's really helpful, thanks!", isUser: true },
    {
      content:
        "You're welcome! I'm glad I could help. If you decide to move forward with purchasing the 2018 Honda Accord or have any other vehicle questions, feel free to ask. Good luck with your car search!",
      isUser: false,
    },
  ];

  // Auto-play demo conversation
  useEffect(() => {
    if (showAiDemo && demoIndex < demoConversation.length && !demoDone) {
      const delay = demoConversation[demoIndex].isUser ? 1500 : 2500;

      demoTimeout.current = setTimeout(() => {
        setDemoMessages((prevMessages) => [
          ...prevMessages,
          demoConversation[demoIndex],
        ]);
        setDemoIndex((prevIndex) => prevIndex + 1);

        // Check if we're at the end
        if (demoIndex === demoConversation.length - 1) {
          setDemoDone(true);
        }
      }, delay);

      return () => {
        if (demoTimeout.current) {
          clearTimeout(demoTimeout.current);
        }
      };
    }
  }, [showAiDemo, demoIndex, demoDone]);

  useEffect(() => {
    // Start testimonial rotation
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 8000);

    return () => clearInterval(testimonialInterval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          if (userData && userData.membership) {
            setMembership(userData.membership);

            // Check if user has active AI chat access
            if (userData.lastSearchTime) {
              const lastSearchTime = userData.lastSearchTime.toDate();
              const now = new Date();
              const endTime = new Date(
                lastSearchTime.getTime() + 24 * 60 * 60 * 1000
              );
              if (now < endTime) {
                setHasChatAccess(true);
                setChatAccessEndTime(endTime);
              }
            }
          } else {
            setMembership('free');
          }
        } catch (err) {
          console.error('Error fetching user data:', err.message);
          setMembership('free');
        }
      } else {
        setMembership('free');
        setHasChatAccess(false);
      }
    });

    // Get AI tip for the home page
    getAiSearchTip();

    return () => unsubscribe();
  }, []);

  // Get a search tip from the AI
  const getAiSearchTip = async () => {
    setLoadingTip(true);
    try {
      // This would call your backend endpoint for an AI tip
      // For now, we'll use a placeholder tip
      setTimeout(() => {
        setAiTip(
          "When searching for a vehicle's VIN, you can find it on the driver's side dashboard or on the driver's side door jamb. Enter all 17 characters for the most accurate results."
        );
        setLoadingTip(false);
      }, 1000);
    } catch (err) {
      console.error('Error getting AI tip:', err);
      setAiTip(
        'Enter a complete 17-character VIN to get the most accurate vehicle history report.'
      );
      setLoadingTip(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    // Validate VIN input
    if (!searchTerm.trim()) {
      setError('Please enter a valid VIN.');
      return;
    }
    if (searchTerm.length !== 17) {
      setError('VIN must be 17 characters long.');
      return;
    }

    // Navigate to VIN search
    navigate('/vin-search', { state: { searchTerm } });
  };

  const getSearchLimit = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().searchLimit || 0;
      }
    }
    return 0;
  };

  const getSearchesUsed = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().searchesUsed || 0;
      }
    }
    return 0;
  };

  // Direct checkout function
  const handleDirectCheckout = useCallback(
    async (plan) => {
      setCheckoutLoading(plan.id);

      try {
        if (!auth.currentUser) {
          // If user is not logged in, redirect to login with return destination
          navigate('/login', {
            state: {
              from: '/checkout',
              plan: plan,
            },
          });
          return;
        }

        // Create checkout session directly
        const result = await createCheckoutSession({
          price: plan.priceId, // This should be a valid Stripe price ID
          success_url: `${window.location.origin}/user-account?payment_success=true&plan=${plan.id}`,
          cancel_url: `${window.location.origin}/pricing?payment_canceled=true`,
          searchCredits: plan.searches.toString(),
          productName: `${plan.name} - ${plan.searches} Searches`,
        });

        // Redirect to checkout URL
        if (result && result.url) {
          window.location.href = result.url;
        } else if (result && result.data && result.data.url) {
          window.location.href = result.data.url;
        } else if (result && result.sessionId) {
          // If only sessionId is returned, handle accordingly
          console.log('Session ID obtained, redirecting...');
          // Implement additional redirect logic if needed
        } else {
          throw new Error('Invalid checkout response from server');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        setError(`Checkout failed: ${err.message || 'Unknown error'}`);
        setCheckoutLoading(null);
      }
    },
    [navigate]
  );

  const toggleCardFlip = (id) => {
    setFlippedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Format the chat access remaining time
  const formatChatAccessTime = () => {
    if (!chatAccessEndTime) return null;

    // Calculate hours and minutes remaining
    const now = new Date();
    const diffMs = chatAccessEndTime - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs <= 0 && diffMins <= 0) return null;

    return `${diffHrs}h ${diffMins}m`;
  };

  // Reset demo conversation
  const resetDemo = () => {
    setDemoMessages([
      {
        content:
          "Hello! I'm your automotive AI assistant. How can I help you today?",
        isUser: false,
      },
    ]);
    setDemoIndex(0);
    setDemoDone(false);
  };

  // Testimonials data
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Auto Industry Professional',
      text: 'This service saved me from buying a car with hidden accident history. The AI analysis pointed out inconsistencies in the mileage data that I would have missed!',
      image: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    {
      name: 'Michael Chen',
      role: 'Fleet Manager',
      text: "I've tried many vehicle history services, but this one provides the most comprehensive data. The AI chat feature helps me understand complex issues quickly.",
      image: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    {
      name: 'Emma Rodriguez',
      role: 'Used Car Dealer',
      text: 'We use this service for every vehicle that comes through our lot. The DeepSeek AI integration has streamlined our entire operation and helps us spot issues faster.',
      image: 'https://randomuser.me/api/portraits/women/68.jpg',
    },
  ];

  const plans = {
    premium: [
      {
        id: '1_search',
        name: 'Starter',
        price: 11.95,
        searches: 1,
        features: ['1 VIN search', 'Basic vehicle details', 'Email support'],
        aiFeatures: ['Limited AI analysis'],
        bestValue: false,
        comparison:
          'Our Starter plan offers more features than competitors at the same price point.',
        priceId: 'price_1RFgsEB084qIp5RaobF4Vcol', // This should match your Stripe price ID
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
        aiFeatures: [
          'Full AI analysis',
          '24-hour AI chat access',
          'Personalized recommendations',
        ],
        bestValue: true,
        comparison:
          'Explorer provides more searches, AI-powered insights, and better support than competitors.',
        priceId: 'price_2OsXXXXXXXXXXXXXXXXXXXXX', // This should match your Stripe price ID
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
        aiFeatures: [
          'Premium AI analysis',
          'Extended AI chat access',
          'Comparative insights',
        ],
        bestValue: false,
        comparison:
          'Pro offers unmatched value with full history and priority support plus advanced AI features.',
        priceId: 'price_3OsXXXXXXXXXXXXXXXXXXXXX', // This should match your Stripe price ID
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
        aiFeatures: [
          'Business AI insights',
          'Shared AI chat access',
          'Custom reports',
        ],
        bestValue: false,
        comparison:
          'Perfect for small businesses with API access, dedicated support, and AI-powered insights.',
        priceId: 'price_4OsXXXXXXXXXXXXXXXXXXXXX', // This should match your Stripe price ID
      },
      {
        id: '50_searches',
        name: 'Enterprise',
        price: 374.99,
        searches: 50,
        features: ['50 VIN searches', 'API access', '24/7 priority support'],
        aiFeatures: [
          'Advanced AI analytics',
          'Team AI chat access',
          'Predictive insights',
        ],
        bestValue: true,
        comparison:
          'Enterprise offers the best value for large-scale operations with sophisticated AI capabilities.',
        priceId: 'price_5OsXXXXXXXXXXXXXXXXXXXXX', // This should match your Stripe price ID
      },
      {
        id: '100_searches',
        name: 'Corporate',
        price: 589.99,
        searches: 100,
        features: ['100 VIN searches', 'API access', 'Custom integrations'],
        aiFeatures: [
          'Enterprise AI solutions',
          'Unlimited AI chat access',
          'Custom AI models',
        ],
        bestValue: false,
        comparison:
          'Corporate is ideal for large enterprises with custom needs and advanced AI requirements.',
        priceId: 'price_6OsXXXXXXXXXXXXXXXXXXXXX', // This should match your Stripe price ID
      },
    ],
  };

  // Check if the user is premium
  const isPremium = membership === 'premium' || membership === 'business';

  return (
    <div className="home-page" data-theme={theme}>
      {/* Professional Hero Section */}
      <div className="professional-hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} md={12} className="hero-content-col">
              <div className="hero-content">
                <h1 className="professional-hero-title">
                  AI-Powered Vehicle History <br />
                  <span className="text-primary">Reports You Can Trust</span>
                </h1>
                <p className="professional-hero-subtitle">
                  Access comprehensive vehicle history data with DeepSeek AI
                  analysis to make smarter, more informed decisions.
                </p>

                {/* Professional Search Bar with AI Tip */}
                <form onSubmit={handleSearch}>
                  <div className="professional-search-container">
                    <div className="input-group">
                      <div className="ai-tip-container">
                        <FaRobot className="ai-tip-icon" />
                        <span className="ai-tip-text">
                          {loadingTip ? 'Loading tip...' : aiTip}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter 17-Character VIN Number"
                        value={searchTerm}
                        onChange={(e) =>
                          setSearchTerm(e.target.value.toUpperCase())
                        }
                        className="form-control professional-search-input"
                        aria-label="Vehicle Identification Number"
                        maxLength={17}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary professional-search-button"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner size="sm" className="me-2" /> Searching...
                          </>
                        ) : (
                          <>
                            <FaSearch className="me-2" /> Search
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {error && (
                  <Alert variant="danger" className="mt-3 search-alert">
                    <FaInfoCircle className="me-2" /> {error}
                  </Alert>
                )}

                {/* Trust Indicators with AI Badge */}
                <div className="professional-trust-indicators">
                  <div className="trust-indicator">
                    <FaShieldAlt className="trust-icon" />
                    <span>256-bit Encryption</span>
                  </div>
                  <div className="trust-indicator">
                    <FaCar className="trust-icon" />
                    <span>350M+ Vehicles</span>
                  </div>
                  <div className="trust-indicator ai-badge">
                    <FaRobot className="trust-icon" />
                    <span>AI Powered</span>
                  </div>
                </div>

                {/* Chat Access Badge for Premium Users */}
                {isPremium && hasChatAccess && (
                  <div className="chat-access-badge">
                    <FaCommentAlt className="me-2" />
                    AI Chat Active: {formatChatAccessTime()} remaining
                  </div>
                )}
              </div>
            </Col>
            <Col lg={6} md={12} className="d-none d-lg-block">
              <div className="hero-image-container">
                <img
                  src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80"
                  alt="Vehicle Report"
                  className="hero-image img-fluid"
                />
                <div className="report-badge">
                  <div className="report-badge-content">
                    <FaRobot className="report-badge-icon" />
                    <div>
                      <strong>AI Analysis</strong>
                      <span>DeepSeek Powered</span>
                    </div>
                  </div>
                </div>
                <div className="ai-insight-badge">
                  <div className="ai-insight-content">
                    <FaLightbulb className="ai-insight-icon" />
                    <span>
                      Vehicle value trends suggest this is a good time to buy
                    </span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* AI Chat Demo Section */}
      <section className="ai-demo-section py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={5} md={12} className="mb-4 mb-lg-0">
              <div className="ai-demo-content">
                <Badge bg="primary" className="mb-3 px-3 py-2">
                  NEW FEATURE
                </Badge>
                <h2 className="ai-demo-title">Talk to Our AI Assistant</h2>
                <p className="ai-demo-description">
                  Our DeepSeek-powered AI assistant can answer your questions
                  about any vehicle, provide buying advice, and help you
                  interpret vehicle history data. Available exclusively to
                  premium subscribers.
                </p>
                <ul className="ai-feature-list">
                  <li>
                    <FaCheck className="text-success me-2" /> Ask about specific
                    vehicle models
                  </li>
                  <li>
                    <FaCheck className="text-success me-2" /> Get maintenance
                    recommendations
                  </li>
                  <li>
                    <FaCheck className="text-success me-2" /> Understand vehicle
                    history reports
                  </li>
                  <li>
                    <FaCheck className="text-success me-2" /> Compare different
                    vehicles
                  </li>
                </ul>
                <div className="ai-demo-actions">
                  <Button
                    variant="primary"
                    className="cta-button"
                    onClick={() => {
                      setShowAiDemo(!showAiDemo);
                      if (!showAiDemo) {
                        resetDemo();
                      }
                    }}
                  >
                    {showAiDemo ? (
                      <>Hide Demo</>
                    ) : (
                      <>
                        See AI in Action <FaArrowRight className="ms-2" />
                      </>
                    )}
                  </Button>

                  {!isPremium && (
                    <Button
                      variant="outline-primary"
                      onClick={() => navigate('/user-account?tab=membership')}
                      className="ms-3"
                    >
                      Upgrade for Access <FaArrowUp className="ms-2" />
                    </Button>
                  )}
                </div>
              </div>
            </Col>
            <Col lg={7} md={12}>
              {showAiDemo ? (
                <div className="ai-chat-demo">
                  <div className="chat-header">
                    <FaRobot className="me-2" /> AI Assistant Demo
                    <Button
                      variant="link"
                      className="reset-demo-btn"
                      onClick={resetDemo}
                      disabled={demoIndex === 0}
                    >
                      <FaRegClock /> Restart Demo
                    </Button>
                  </div>
                  <div className="chat-messages">
                    {demoMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`message ${msg.isUser ? 'user-message' : 'ai-message'}`}
                      >
                        <div className="message-avatar">
                          {msg.isUser ? <FaUser /> : <FaRobot />}
                        </div>
                        <div className="message-bubble">
                          {msg.content.split('\n').map((paragraph, i) => (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!demoDone && (
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                  </div>
                  <div className="chat-footer">
                    <div className="chat-input disabled">
                      <input
                        type="text"
                        placeholder="Ask our AI assistant..."
                        disabled
                      />
                      <Button variant="primary" disabled>
                        <FaArrowRight />
                      </Button>
                    </div>
                    <div className="chat-disclaimer">
                      <FaLock className="me-1" /> This is a demo. Upgrade to
                      premium for full access.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ai-feature-image">
                  <img
                    src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                    alt="AI Assistant Feature"
                    className="img-fluid rounded shadow"
                  />
                  <div className="ai-feature-overlay">
                    <FaRobot size={50} className="ai-robot-icon" />
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section py-5">
        <Container>
          <h2 className="section-title mb-5">Trusted by Professionals</h2>
          <div className="testimonial-carousel">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
              >
                <div className="testimonial-content">
                  <div className="testimonial-text">
                    <p className="quote">"{testimonial.text}"</p>
                  </div>
                  <div className="testimonial-author">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="testimonial-image"
                    />
                    <div className="testimonial-info">
                      <h5>{testimonial.name}</h5>
                      <p>{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="testimonial-indicators">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`testimonial-indicator ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                  aria-label={`Testimonial ${index + 1}`}
                ></button>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Enhanced Why Use Our Website Section */}
      <div className="why-section py-5">
        <Container>
          <h2 className="section-title text-center mb-2">
            Vehicle History That Matters
          </h2>
          <p className="section-subtitle text-center mb-5">
            Discover critical details about any vehicle before you buy
          </p>

          <Row className="features-row">
            {[
              {
                icon: <FaCarCrash />,
                title: 'Accident History',
                description:
                  'Get detailed records of all reported accidents including severity, damage, and repairs.',
              },
              {
                icon: <FaIdCard />,
                title: 'Ownership Records',
                description:
                  'See complete chronological history of owners, locations, and title transfers.',
              },
              {
                icon: <FaDollarSign />,
                title: 'True Market Value',
                description:
                  'Get accurate market valuation based on condition, history, and regional pricing data.',
              },
              {
                icon: <FaBrain />,
                title: 'AI Insights',
                description:
                  'Our DeepSeek AI analyzes vehicle history to highlight potential issues and opportunities that human eyes might miss.',
                isPremium: true,
              },
            ].map((feature, index) => (
              <Col key={index} lg={3} md={6} className="feature-col mb-4">
                <div className="feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="feature-title">
                    {feature.title}
                    {feature.isPremium && (
                      <Badge bg="primary" pill className="ms-2 premium-badge">
                        Premium
                      </Badge>
                    )}
                  </h3>
                  <p className="feature-description">{feature.description}</p>
                  <Button variant="link" className="feature-link">
                    Learn More <FaArrowRight className="ms-1" />
                  </Button>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Enhanced Pricing Section with AI Features */}
      <div className="pricing-section py-5">
        <Container>
          <h2 className="section-title text-center">Choose Your Plan</h2>
          <p className="section-subtitle text-center mb-5">
            Find the perfect package with AI-powered insights for your vehicle
            research needs
          </p>

          <div className="text-center mb-5">
            <div className="subscription-toggle">
              <Button
                variant={
                  subscriptionType === 'premium' ? 'primary' : 'outline-primary'
                }
                onClick={() => setSubscriptionType('premium')}
                className="toggle-button"
              >
                <FaStar className="me-2" /> Individual
              </Button>
              <Button
                variant={
                  subscriptionType === 'business'
                    ? 'primary'
                    : 'outline-primary'
                }
                onClick={() => setSubscriptionType('business')}
                className="toggle-button"
              >
                <FaBriefcase className="me-2" /> Business
              </Button>
            </div>
          </div>

          <Row className="pricing-cards">
            {plans[subscriptionType].map((plan) => (
              <Col key={plan.id} lg={4} md={6} className="mb-4">
                <div
                  className={`pricing-card ${flippedCards[plan.id] ? 'flipped' : ''} ${plan.bestValue ? 'best-value' : ''}`}
                  onClick={() => toggleCardFlip(plan.id)}
                >
                  <div className="pricing-card-inner">
                    <div className="pricing-card-front">
                      {plan.bestValue && (
                        <div className="best-value-badge">
                          <FaStar className="me-1" /> Most Popular
                        </div>
                      )}

                      <h3 className="plan-name">{plan.name}</h3>
                      <div className="plan-price">
                        <span className="currency">$</span>
                        <span className="amount">{plan.price}</span>
                      </div>
                      <p className="plan-searches">
                        {plan.searches} VIN search
                        {plan.searches > 1 ? 'es' : ''}
                      </p>

                      <div className="plan-features">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="feature-item">
                            <FaCheck className="feature-icon" />
                            <span>{feature}</span>
                          </div>
                        ))}

                        {/* AI Features with special highlighting */}
                        {plan.aiFeatures &&
                          plan.aiFeatures.map((feature, idx) => (
                            <div
                              key={`ai-${idx}`}
                              className="feature-item ai-feature-item"
                            >
                              <FaRobot className="feature-icon" />
                              <span>{feature}</span>
                            </div>
                          ))}
                      </div>

                      <Button
                        variant={plan.bestValue ? 'primary' : 'outline-primary'}
                        className="get-started-button"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card flip
                          handleDirectCheckout(plan);
                        }}
                        disabled={checkoutLoading === plan.id}
                      >
                        {checkoutLoading === plan.id ? (
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
                          <>
                            Get Started <FaArrowRight className="ms-2" />
                          </>
                        )}
                      </Button>

                      <p className="flip-hint">
                        Click to see comparison{' '}
                        <FaInfoCircle className="ms-1" />
                      </p>
                    </div>

                    <div className="pricing-card-back">
                      <h4 className="comparison-title">
                        Why Choose This Plan?
                      </h4>
                      <p className="comparison-text">{plan.comparison}</p>
                      <Button
                        variant="primary"
                        className="comparison-button"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card flip
                          handleDirectCheckout(plan);
                        }}
                        disabled={checkoutLoading === plan.id}
                      >
                        {checkoutLoading === plan.id ? (
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
                          'Select This Plan'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          <div className="pricing-guarantee text-center mt-5">
            <div className="guarantee-badge">
              <FaShieldAlt className="guarantee-icon" />
            </div>
            <h4>100% Satisfaction Guarantee</h4>
            <p>
              Not satisfied with your report? Contact us within 7 days for a
              full refund.
            </p>
          </div>
        </Container>
      </div>

      {/* Enhanced AI Section */}
      <div className="ai-section py-5">
        <Container>
          <div className="ai-content">
            <Row className="align-items-center">
              <Col lg={5} md={6}>
                <div className="ai-badge mb-3">
                  <FaRobot className="me-2" /> Powered by DeepSeek
                </div>
                <h2 className="ai-title">AI-Powered Vehicle Analysis</h2>
                <p className="ai-description">
                  Our advanced DeepSeek AI doesn't just show you data—it
                  analyzes it to provide clear, actionable insights about your
                  vehicle's history, condition, and value.
                </p>

                <div className="ai-features">
                  <div className="ai-feature">
                    <FaLightbulb className="ai-feature-icon" />
                    <div>
                      <h4>Smart Insights</h4>
                      <p>
                        AI identifies patterns in vehicle history that might
                        indicate hidden issues or exceptional value.
                      </p>
                    </div>
                  </div>

                  <div className="ai-feature">
                    <FaCommentAlt className="ai-feature-icon" />
                    <div>
                      <h4>Interactive AI Chat</h4>
                      <p>
                        Ask questions about any vehicle and get expert answers
                        tailored to your needs.
                      </p>
                    </div>
                  </div>

                  <div className="ai-feature">
                    <FaChartLine className="ai-feature-icon" />
                    <div>
                      <h4>Predictive Analysis</h4>
                      <p>
                        Get forecasts of future maintenance needs and potential
                        issues based on vehicle history.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="ai-cta-button"
                  onClick={() =>
                    navigate(
                      isPremium ? '/garage' : '/user-account?tab=membership'
                    )
                  }
                >
                  {isPremium
                    ? 'Try AI Analysis Now'
                    : 'Upgrade for AI Features'}{' '}
                  <FaArrowRight className="ms-2" />
                </Button>
              </Col>

              <Col lg={7} md={6} className="ai-visual-column">
                <div className="ai-visual">
                  <div className="ai-report-card">
                    <div className="ai-report-header">
                      <FaRobot className="me-2" /> AI Analysis Report
                    </div>
                    <div className="ai-report-content">
                      <div className="ai-data-point">
                        <span className="ai-data-label">
                          Vehicle Condition:
                        </span>
                        <Badge bg="success">Excellent</Badge>
                      </div>
                      <div className="ai-data-point">
                        <span className="ai-data-label">
                          Mileage Assessment:
                        </span>
                        <Badge bg="info">Below Average</Badge>
                      </div>
                      <div className="ai-data-point">
                        <span className="ai-data-label">Price Analysis:</span>
                        <Badge bg="warning" text="dark">
                          Slightly High
                        </Badge>
                      </div>
                      <div className="ai-insight-box">
                        <FaLightbulb className="ai-insight-icon" />
                        <div className="ai-insight-text">
                          This vehicle appears well-maintained with consistent
                          service history. The minor accident reported in 2021
                          was properly repaired with OEM parts. Considering the
                          low mileage, this vehicle should have 5-7 years of
                          reliable service remaining.
                        </div>
                      </div>
                      <div className="ai-tags">
                        <span className="ai-tag">Low Mileage</span>
                        <span className="ai-tag">Single Owner</span>
                        <span className="ai-tag">Dealer Maintained</span>
                      </div>
                    </div>
                  </div>

                  <div className="ai-chat-bubble">
                    <div className="ai-chat-header">
                      <FaRobot className="me-2" /> AI Assistant
                    </div>
                    <div className="ai-chat-message">
                      Based on this vehicle's history, I recommend checking the
                      timing belt as it will likely need replacement within the
                      next 5,000 miles.
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Enhanced Call to Action Section */}
      <div className="enhanced-cta-section">
        <div className="cta-bg-overlay"></div>
        <Container>
          <Row className="align-items-center">
            <Col lg={7} md={12}>
              <div className="enhanced-cta-content">
                <Badge bg="primary" pill className="mb-3 ai-badge-cta">
                  <FaRobot className="me-2" /> AI-Powered Analysis
                </Badge>
                <h2 className="enhanced-cta-title">
                  Get Complete Vehicle{' '}
                  <span className="text-highlight">History Reports</span> With
                  <span className="text-highlight"> AI Insights</span>
                </h2>
                <p className="enhanced-cta-text">
                  Our comprehensive reports provide everything you need to know
                  about a vehicle's past, plus AI-powered analysis to help you
                  identify issues and make confident decisions.
                </p>
                <div className="cta-actions">
                  <Button
                    variant="primary"
                    size="lg"
                    className="enhanced-cta-button"
                    onClick={() => navigate('/vin-search')}
                  >
                    Check Vehicle History <FaArrowRight className="ms-2" />
                  </Button>
                  <div className="d-none d-md-flex align-items-center cta-guarantee">
                    <div className="cta-guarantee-icon">
                      <FaShieldAlt />
                    </div>
                    <div className="cta-guarantee-text">
                      <strong>100% Satisfaction Guarantee</strong>
                      <span>7-day money back guarantee</span>
                    </div>
                  </div>
                </div>
                <div className="cta-stats">
                  <div className="cta-stat-item">
                    <span className="cta-stat-number">25M+</span>
                    <span className="cta-stat-label">Reports Generated</span>
                  </div>
                  <div className="cta-stat-item">
                    <span className="cta-stat-number">4.9/5</span>
                    <span className="cta-stat-label">Customer Rating</span>
                  </div>
                  <div className="cta-stat-item">
                    <FaMedal className="stat-icon" />
                    <span className="cta-stat-label">AI-Powered Insights</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={5} className="d-none d-lg-block">
              <div className="enhanced-cta-image-container">
                <img
                  src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80"
                  alt="Vehicle Report Example"
                  className="enhanced-cta-image"
                />
                <div className="cta-image-card">
                  <div className="cta-card-icon">
                    <FaRobot />
                  </div>
                  <div className="cta-card-content">
                    <span className="cta-card-title">
                      AI-Powered Reports Include:
                    </span>
                    <ul className="cta-card-list">
                      <li>• Vehicle Value Assessment</li>
                      <li>• Maintenance Predictions</li>
                      <li>• Risk Analysis</li>
                      <li>• Personalized Recommendations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <style jsx="true">{`
        /* AI Enhancements */
        .ai-tip-container {
          position: absolute;
          top: -40px;
          left: 0;
          right: 0;
          background-color: #f1f8ff;
          border-radius: 6px 6px 0 0;
          padding: 8px 15px;
          display: flex;
          align-items: center;
          font-size: 14px;
          color: #0056b3;
          border-bottom: 2px dashed #007bff;
          box-shadow: 0 -2px 6px rgba(0, 123, 255, 0.1);
          z-index: 1;
        }

        .ai-tip-icon {
          color: #007bff;
          font-size: 16px;
          margin-right: 8px;
          animation: pulse 2s infinite;
        }

        .professional-search-container {
          position: relative;
          margin-top: 45px;
          margin-bottom: 20px;
        }

        .ai-badge {
          background-color: #6a11cb;
          color: white;
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          margin-top: 5px;
        }

        .ai-badge-cta {
          font-size: 16px;
          padding: 8px 15px;
        }

        .trust-indicator.ai-badge {
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          box-shadow: 0 4px 8px rgba(106, 17, 203, 0.3);
          animation: softPulse 3s infinite;
        }

        @keyframes softPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        .chat-access-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          margin-top: 15px;
          box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
        }

        /* AI Demo Section */
        .ai-demo-section {
          background-color: #f8f9fa;
          position: relative;
        }

        .ai-demo-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #6a11cb, #2575fc);
        }

        .ai-demo-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .ai-demo-description {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #495057;
          margin-bottom: 25px;
        }

        .ai-feature-list {
          list-style: none;
          padding: 0;
          margin-bottom: 30px;
        }

        .ai-feature-list li {
          font-size: 1.05rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
        }

        .ai-chat-demo {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          height: 500px;
          display: flex;
          flex-direction: column;
          border: 1px solid #e9ecef;
        }

        .chat-header {
          background-color: #f8f9fa;
          padding: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9ecef;
        }

        .reset-demo-btn {
          color: #6c757d;
          font-size: 0.9rem;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .reset-demo-btn svg {
          margin-right: 5px;
        }

        .chat-messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .message {
          display: flex;
          gap: 10px;
          max-width: 85%;
        }

        .user-message {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #495057;
        }

        .user-message .message-avatar {
          background-color: #007bff;
          color: white;
        }

        .ai-message .message-avatar {
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
        }

        .message-bubble {
          padding: 12px 15px;
          border-radius: 18px;
          background-color: #f8f9fa;
        }

        .user-message .message-bubble {
          background-color: #007bff;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .ai-message .message-bubble {
          border-bottom-left-radius: 4px;
        }

        .message-bubble p {
          margin-bottom: 0;
        }

        .typing-indicator {
          display: inline-flex;
          align-items: center;
          background-color: #f8f9fa;
          padding: 12px 15px;
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          width: 60px;
          justify-content: center;
        }

        .typing-indicator span {
          width: 7px;
          height: 7px;
          background-color: #6c757d;
          border-radius: 50%;
          display: inline-block;
          margin: 0 2px;
          opacity: 0.6;
        }

        .typing-indicator span:nth-child(1) {
          animation: typing 1s infinite 0s;
        }

        .typing-indicator span:nth-child(2) {
          animation: typing 1s infinite 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation: typing 1s infinite 0.4s;
        }

        @keyframes typing {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
          100% {
            transform: translateY(0);
          }
        }

        .chat-footer {
          padding: 15px;
          border-top: 1px solid #e9ecef;
        }

        .chat-input {
          display: flex;
          position: relative;
        }

        .chat-input input {
          flex: 1;
          padding: 10px 15px;
          border: 1px solid #ced4da;
          border-radius: 25px;
          font-size: 1rem;
        }

        .chat-input.disabled input {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .chat-input button {
          position: absolute;
          right: 5px;
          top: 5px;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-disclaimer {
          font-size: 0.8rem;
          color: #6c757d;
          text-align: center;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* AI Feature Image */
        .ai-feature-image {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
        }

        .ai-feature-overlay {
          position: absolute;
          bottom: 30px;
          left: 30px;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 10px 20px rgba(106, 17, 203, 0.4);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0);
          }
        }

        /* AI Report Cards */
        .ai-report-card {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          border: 1px solid #e9ecef;
          max-width: 500px;
          margin-left: auto;
        }

        .ai-report-header {
          background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
          color: white;
          padding: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .ai-report-content {
          padding: 20px;
        }

        .ai-data-point {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f2f2f2;
        }

        .ai-data-point:last-child {
          border-bottom: none;
        }

        .ai-data-label {
          font-weight: 600;
          color: #495057;
        }

        .ai-insight-box {
          background-color: #f8f9ff;
          border-left: 4px solid #6a11cb;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
          position: relative;
        }

        .ai-insight-icon {
          color: #6a11cb;
          margin-right: 10px;
          float: left;
          margin-top: 2px;
        }

        .ai-insight-text {
          font-size: 0.9rem;
          color: #495057;
          line-height: 1.5;
        }

        .ai-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .ai-tag {
          background-color: #e9f2ff;
          color: #0056b3;
          padding: 4px 10px;
          border-radius: 15px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .ai-chat-bubble {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          max-width: 300px;
          position: absolute;
          bottom: 30px;
          left: 0;
          border: 1px solid #e9ecef;
        }

        .ai-chat-header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 10px 15px;
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
        }

        .ai-chat-message {
          padding: 15px;
          font-size: 0.9rem;
          color: #495057;
        }

        /* Enhanced Pricing Section */
        .ai-feature-item {
          color: #6a11cb !important;
          font-weight: 100;
        }

        .ai-feature-item .feature-icon {
          color: #6a11cb;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          20% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Premium badge */
        .premium-badge {
          font-size: 0.7rem;
          vertical-align: middle;
        }

        /* Make report badge AI-themed */
        .report-badge-icon {
          color: #6a11cb;
          font-size: 1.5rem !important;
        }

        /* Add AI insight badge to hero image */
        .ai-insight-badge {
          position: absolute;
          top: 30%;
          right: -20px;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border-radius: 8px 0 0 8px;
          padding: 12px 20px;
          color: white;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          max-width: 250px;
        }

        .ai-insight-content {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .ai-insight-icon {
          margin-top: 3px;
        }

        /* Other styles */
        .professional-hero-title {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default Home;

