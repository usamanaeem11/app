import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Check, X, Zap, Star, Crown, Sparkles, Bot, TrendingUp } from 'lucide-react';
import { PRICING_TIERS, AI_FEATURES, COMPETITIVE_ADVANTAGES, PRICING_FAQ, FEATURE_COMPARISON } from '../../data/pricingData';
import MarketingLayout from '../../components/marketing/MarketingLayout';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const [numUsers, setNumUsers] = useState(10);

  const plans = Object.values(PRICING_TIERS);

  const getPrice = (plan) => {
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getTotal = (plan) => {
    const price = getPrice(plan);
    const multiplier = isYearly ? 12 : 1;
    return (price * numUsers * multiplier).toFixed(2);
  };

  const getYearlySavings = (plan) => {
    const monthlyTotal = plan.monthlyPrice * 12;
    const yearlyTotal = plan.yearlyPrice * 12;
    return (monthlyTotal - yearlyTotal).toFixed(2);
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'starter': return <Zap className="w-6 h-6" />;
      case 'pro': return <Star className="w-6 h-6" />;
      case 'business': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <Sparkles className="w-3 h-3 mr-1" />
              14-Day Free Trial
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-slate-600 mb-4">
              All-in-one platform for time tracking, employee monitoring, and payroll
            </p>
            <p className="text-lg text-slate-500">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>
        </section>

        {/* Billing Toggle */}
        <section className="container mx-auto px-4 pb-12">
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-emerald-600"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}>
              Yearly
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">
              Save 20%
            </Badge>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular
                    ? 'border-2 border-blue-600 shadow-xl scale-105'
                    : 'border border-slate-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className={`${
                      plan.popular ? 'bg-blue-600' : 'bg-purple-600'
                    } text-white px-4 py-1`}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    plan.id === 'pro' ? 'bg-blue-500/20 text-blue-600' :
                    plan.id === 'business' ? 'bg-purple-500/20 text-purple-600' :
                    'bg-emerald-500/20 text-emerald-600'
                  }`}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <p className="text-slate-600 text-sm">{plan.tagline}</p>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-5xl font-bold text-slate-900">
                        ${getPrice(plan).toFixed(2)}
                      </span>
                      <span className="text-slate-600">/user/mo</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-emerald-600 font-medium">
                        Save ${getYearlySavings(plan)}/user/year
                      </p>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className={`w-full mb-6 ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : plan.id === 'business'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    asChild
                  >
                    <Link to="/signup">Get Started</Link>
                  </Button>

                  <Separator className="mb-6" />

                  {/* Feature List */}
                  <div className="text-left space-y-4">
                    {plan.features.slice(0, 5).map((category, idx) => (
                      <div key={idx}>
                        {category.category && (
                          <h4 className="text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">
                            {category.category}
                          </h4>
                        )}
                        <ul className="space-y-2">
                          {category.items.slice(0, 3).map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2 text-sm text-slate-700">
                              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <p className="text-sm text-blue-600 font-medium">
                      + {plan.features.length - 5} more feature categories
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing Calculator */}
        <section className="bg-slate-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">Calculate Your Cost</h2>
              <Card>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Number of Users</label>
                      <input
                        type="range"
                        min="1"
                        max="500"
                        value={numUsers}
                        onChange={(e) => setNumUsers(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-slate-600 mt-2">
                        <span>1 user</span>
                        <span className="font-semibold text-lg text-slate-900">{numUsers} users</span>
                        <span>500 users</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mt-8">
                      {plans.map((plan) => (
                        <div key={plan.id} className="bg-slate-50 rounded-lg p-4 space-y-2">
                          <div className="font-semibold text-slate-900">{plan.name}</div>
                          <div className="text-2xl font-bold text-blue-600">
                            ${getTotal(plan)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {isYearly ? 'per year' : 'per month'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-slate-500 text-center mt-4">
                      Prices exclude applicable taxes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* AI Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-blue-500/20 text-blue-600 border-blue-500/30">
                <Bot className="w-3 h-3 mr-1" />
                Powered by AI
              </Badge>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                AI-Driven Differentiators
              </h2>
              <p className="text-xl text-slate-600">
                Smart insights that set Working Tracker apart
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AI_FEATURES.map((feature, idx) => (
                <Card key={idx} className="border border-slate-200">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-3">{feature.icon}</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      {feature.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {feature.tier === 'pro' ? 'Pro & Business' : 'Business Only'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Competitive Advantages */}
        <section className="bg-slate-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                Why Working Tracker is Better
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-4 px-6 font-semibold text-slate-900">Feature</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-500">Other Tools</th>
                      <th className="text-left py-4 px-6 font-semibold text-emerald-600">Working Tracker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPETITIVE_ADVANTAGES.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 ${
                          item.highlight ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="py-4 px-6 font-medium text-slate-900">{item.feature}</td>
                        <td className="py-4 px-6 text-sm text-slate-500">{item.competitors}</td>
                        <td className="py-4 px-6 text-sm text-emerald-600 font-medium">
                          {item.workingTracker}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">
              Complete Feature Comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-4 px-6 font-semibold text-slate-900">Feature</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center py-4 px-6 font-semibold text-slate-900">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((category, catIdx) => (
                    <React.Fragment key={catIdx}>
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="py-3 px-6 text-emerald-600 font-semibold text-sm uppercase tracking-wider">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, featIdx) => (
                        <tr key={`${catIdx}-${featIdx}`} className="border-b border-slate-100">
                          <td className="py-3 px-6 text-slate-700 text-sm">
                            {feature.name}
                          </td>
                          <td className="py-3 px-6 text-center">
                            {typeof feature.starter === 'boolean' ? (
                              feature.starter ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-slate-700 text-sm">{feature.starter}</span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-center">
                            {typeof feature.pro === 'boolean' ? (
                              feature.pro ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-slate-700 text-sm">{feature.pro}</span>
                            )}
                          </td>
                          <td className="py-3 px-6 text-center">
                            {typeof feature.business === 'boolean' ? (
                              feature.business ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-slate-700 text-sm">{feature.business}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-slate-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {PRICING_FAQ.map((faq, idx) => (
                  <FAQ key={idx} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
              <Link to="/signup">Start Free Trial</Link>
            </Button>
            <p className="text-sm text-blue-200 mt-4">
              Cancel anytime • No hidden fees • Full feature access
            </p>
          </div>
        </section>
      </div>
    </MarketingLayout>
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
          <span className="font-semibold text-lg text-slate-900">{question}</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-4 ${
              isOpen ? 'rotate-180' : ''
            }`}
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
