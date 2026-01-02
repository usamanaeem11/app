import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = {
    monthly: {
      price: 2.00,
      discount: 0,
      label: 'Monthly'
    },
    quarterly: {
      price: 1.90,
      discount: 5,
      label: '3 Months (5% off)'
    },
    biannual: {
      price: 1.80,
      discount: 10,
      label: '6 Months (10% off)'
    },
    yearly: {
      price: 1.60,
      discount: 20,
      label: 'Yearly (20% off)'
    }
  };

  const selectedPlan = plans[billingCycle];

  const features = [
    'Unlimited time tracking',
    'Screenshot monitoring (customizable intervals)',
    'Screen recording & playback',
    'Activity tracking & productivity scoring',
    'GPS tracking & geofencing',
    'Route tracking for field workers',
    'App & website usage monitoring',
    'Idle time & break detection',
    'Attendance & shift scheduling',
    'Leave management',
    'Automated timesheets',
    'Timesheet approvals',
    'Payroll processing',
    'Multi-currency support',
    'Expense tracking',
    'Project & task management',
    'Team collaboration & chat',
    'Real-time dashboard',
    'Productivity analytics & AI insights',
    'Burnout detection',
    'Meeting cost analysis',
    'Custom reports & exports',
    'Role-based access control',
    'Security & compliance (DLP, USB monitoring)',
    'Audit logs',
    'Integration with 20+ tools',
    'API access & webhooks',
    'White-label branding',
    'SSO (SAML/OAuth)',
    'Desktop apps (Win, Mac, Linux)',
    'Mobile apps (iOS, Android)',
    'Browser extensions',
    '24/7 support',
    'Data security & encryption'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            One plan with all features included. Only $2 per user per month.
          </p>
        </div>
      </section>

      {/* Billing Cycle Selector */}
      <section className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-2 flex gap-2">
            {Object.entries(plans).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => setBillingCycle(key)}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  billingCycle === key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {plan.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-blue-600">
            <CardHeader className="text-center pb-8">
              <Badge className="w-fit mx-auto mb-4">All Features Included</Badge>
              <CardTitle className="text-3xl mb-4">Professional Plan</CardTitle>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-slate-900">
                  ${selectedPlan.price.toFixed(2)}
                </span>
                <span className="text-xl text-slate-600">/ user / month</span>
              </div>
              {selectedPlan.discount > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary">Save {selectedPlan.discount}%</Badge>
                </div>
              )}
              <p className="text-slate-600 mt-4">
                Billed {billingCycle === 'monthly' ? 'monthly' : billingCycle === 'quarterly' ? 'quarterly' : billingCycle === 'biannual' ? 'every 6 months' : 'annually'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center pb-4 border-b">
                <Button size="lg" className="w-full max-w-md" asChild>
                  <Link to="/signup">Start 14-Day Free Trial</Link>
                </Button>
                <p className="text-sm text-slate-500 mt-3">
                  No credit card required • Cancel anytime
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">Everything included:</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Calculate Your Cost</h2>
            <Card>
              <CardContent className="p-8">
                <PricingCalculator planPrice={selectedPlan.price} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FAQ
              question="Is there a free trial?"
              answer="Yes! We offer a 14-day free trial with full access to all features. No credit card required."
            />
            <FAQ
              question="Can I cancel anytime?"
              answer="Absolutely. You can cancel your subscription at any time with no penalties or cancellation fees."
            />
            <FAQ
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, AmEx), PayPal, and wire transfer for enterprise plans."
            />
            <FAQ
              question="Is there a minimum number of users?"
              answer="No minimum! You can start with as few as 1 user and scale up as your team grows."
            />
            <FAQ
              question="Do you offer discounts for nonprofits or educational institutions?"
              answer="Yes, we offer special pricing for nonprofits and educational institutions. Contact our sales team for details."
            />
            <FAQ
              question="What happens to my data if I cancel?"
              answer="You can export all your data at any time. After cancellation, we retain your data for 30 days before permanent deletion."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
            <Link to="/signup">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function PricingCalculator({ planPrice }) {
  const [users, setUsers] = useState(10);
  const monthlyTotal = (users * planPrice).toFixed(2);
  const yearlyTotal = (users * planPrice * 12).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Number of Users</label>
        <input
          type="range"
          min="1"
          max="500"
          value={users}
          onChange={(e) => setUsers(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-slate-600 mt-2">
          <span>1 user</span>
          <span className="font-semibold text-lg text-slate-900">{users} users</span>
          <span>500 users</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Price per user:</span>
          <span className="font-semibold">${planPrice.toFixed(2)}/month</span>
        </div>
        <div className="flex justify-between items-center text-lg">
          <span className="font-semibold">Monthly Total:</span>
          <span className="font-bold text-blue-600">${monthlyTotal}</span>
        </div>
        <div className="flex justify-between items-center text-lg pt-3 border-t">
          <span className="font-semibold">Yearly Total:</span>
          <span className="font-bold text-blue-600">${yearlyTotal}</span>
        </div>
      </div>

      <p className="text-sm text-slate-500 text-center">
        Prices exclude applicable taxes
      </p>
    </div>
  );
}

function FAQ({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardContent className="p-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center text-left"
        >
          <span className="font-semibold text-lg">{question}</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <p className="mt-4 text-slate-600">{answer}</p>
        )}
      </CardContent>
    </Card>
  );
}
