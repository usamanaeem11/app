import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Check,
  X,
  CreditCard,
  Users,
  Zap,
  Shield,
  BarChart3,
  Loader2,
  Crown,
  Star,
  Sparkles,
  Clock,
  Camera,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Bot,
  Globe,
  Lock,
  ChevronRight,
  TrendingUp,
  Heart,
  Bell,
  Target
} from 'lucide-react';
import api from '../lib/api';
import { PRICING_TIERS, AI_FEATURES, COMPETITIVE_ADVANTAGES, PRICING_FAQ, FEATURE_COMPARISON } from '../data/pricingData';

const PricingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [numUsers, setNumUsers] = useState(5);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [processing, setProcessing] = useState(false);
  const [showDetailedFeatures, setShowDetailedFeatures] = useState(false);

  const plans = Object.values(PRICING_TIERS);
  const trialDays = 14;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      if (user) {
        const subRes = await api.get(`/pricing/subscription/${user.company_id}`).catch(() => null);
        if (subRes?.data) {
          setCurrentSubscription(subRes.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      navigate('/signup?trial=true');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await api.post('/pricing/trial/start', {
        company_id: user.company_id
      });
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start trial');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectPlan = async (planId) => {
    if (!user) {
      navigate(`/signup?plan=${planId}`);
      return;
    }
    
    setSelectedPlan(planId);
    // Navigate to checkout
    navigate(`/checkout?plan=${planId}&billing=${isYearly ? 'yearly' : 'monthly'}&users=${numUsers}`);
  };

  const getPrice = (plan) => {
    if (isYearly) {
      return plan.yearlyPrice;
    }
    return plan.monthlyPrice;
  };

  const getTotalPrice = (plan) => {
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    return (price * numUsers).toFixed(2);
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

  const getFeatureIcon = (key) => {
    if (key.includes('time') || key.includes('timer')) return <Clock className="w-4 h-4" />;
    if (key.includes('screenshot') || key.includes('video')) return <Camera className="w-4 h-4" />;
    if (key.includes('report')) return <FileText className="w-4 h-4" />;
    if (key.includes('attendance') || key.includes('shift')) return <Calendar className="w-4 h-4" />;
    if (key.includes('payroll') || key.includes('invoice')) return <DollarSign className="w-4 h-4" />;
    if (key.includes('chat')) return <MessageSquare className="w-4 h-4" />;
    if (key.includes('ai')) return <Bot className="w-4 h-4" />;
    if (key.includes('integration') || key.includes('api')) return <Globe className="w-4 h-4" />;
    if (key.includes('sso') || key.includes('security')) return <Lock className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950" data-testid="pricing-loading">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4" data-testid="pricing-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            {trialDays}-Day Free Trial
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            All-in-one platform for time tracking, employee monitoring, and payroll. Start with a free trial, no credit card required.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm ${!isYearly ? 'text-zinc-100' : 'text-zinc-500'}`}>Monthly</span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-emerald-600"
          />
          <span className={`text-sm ${isYearly ? 'text-zinc-100' : 'text-zinc-500'}`}>
            Yearly
            <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 text-xs">Save 20%</Badge>
          </span>
        </div>

        {/* Number of Users */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label className="text-zinc-400">Team Size:</Label>
          <div className="flex items-center gap-2">
            {[1, 5, 10, 25, 50, 100].map(n => (
              <Button
                key={n}
                variant={numUsers === n ? "default" : "outline"}
                size="sm"
                onClick={() => setNumUsers(n)}
                className={numUsers === n ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {n}
              </Button>
            ))}
            <Input
              type="number"
              min={1}
              max={1000}
              value={numUsers}
              onChange={(e) => setNumUsers(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 bg-zinc-800 border-zinc-700 text-zinc-100"
            />
            <span className="text-zinc-500 text-sm">users</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative bg-zinc-900/50 border-zinc-800 transition-all hover:border-zinc-700 ${
                plan.popular ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105' : ''
              } ${selectedPlan === plan.id ? 'ring-2 ring-emerald-500' : ''}`}
              data-testid={`plan-card-${plan.id}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={`${
                    plan.popular
                      ? 'bg-blue-500 text-white'
                      : 'bg-purple-500 text-white'
                  }`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pt-8">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center ${
                  plan.id === 'pro' ? 'bg-blue-500/20 text-blue-500' :
                  plan.id === 'business' ? 'bg-purple-500/20 text-purple-500' :
                  'bg-emerald-500/20 text-emerald-500'
                }`}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-xl text-zinc-100">{plan.name}</CardTitle>
                <CardDescription className="text-zinc-500">{plan.tagline}</CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-zinc-100">${getPrice(plan).toFixed(2)}</span>
                    <span className="text-zinc-500 ml-1">/user/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-emerald-400 mt-1">
                      Save ${getYearlySavings(plan)}/user/year
                    </p>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">
                    {numUsers} users = <span className="text-zinc-300 font-semibold">${getTotalPrice(plan)}</span>/{isYearly ? 'year' : 'month'}
                  </p>
                </div>

                <Separator className="bg-zinc-800 mb-6" />

                {/* Key Features Summary */}
                <div className="text-left space-y-4 mb-6">
                  {plan.features.slice(0, showDetailedFeatures ? undefined : 4).map((category, idx) => (
                    <div key={idx}>
                      {category.category && (
                        <h4 className="text-xs font-semibold text-emerald-400 mb-2">
                          {category.category}
                        </h4>
                      )}
                      <ul className="space-y-2">
                        {category.items.slice(0, 3).map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2 text-xs text-zinc-400">
                            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {category.items.length > 3 && !showDetailedFeatures && (
                          <li className="text-xs text-blue-400 pl-5">
                            +{category.items.length - 3} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}

                  {!showDetailedFeatures && plan.features.length > 4 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                      onClick={() => setShowDetailedFeatures(true)}
                    >
                      View all features →
                    </Button>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  className={`w-full ${
                    plan.id === 'pro'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : plan.id === 'business'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  onClick={() => handleSelectPlan(plan.id)}
                  data-testid={`select-plan-${plan.id}`}
                >
                  {currentSubscription?.subscription?.plan === plan.id ? 'Current Plan' : 'Get Started'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                {!currentSubscription?.has_subscription && plan.popular && (
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={handleStartTrial}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Start Free Trial
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* AI Features Section */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
              <Bot className="w-3 h-3 mr-1" />
              Powered by AI
            </Badge>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">AI-Driven Differentiators</h2>
            <p className="text-zinc-400">Smart insights that set Working Tracker apart</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AI_FEATURES.map((feature, idx) => (
              <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 mb-3">{feature.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {feature.tier === 'pro' ? 'Pro & Business' : 'Business Only'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Competitive Advantages */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-zinc-100 text-center mb-8">Why Working Tracker is Better</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Other Tools</th>
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Working Tracker</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITIVE_ADVANTAGES.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-900/30 ${
                      item.highlight ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="py-4 px-4 text-zinc-100 font-medium">{item.feature}</td>
                    <td className="py-4 px-4 text-zinc-500 text-sm">{item.competitors}</td>
                    <td className="py-4 px-4 text-emerald-400 text-sm font-medium">{item.workingTracker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-zinc-100 text-center mb-8">Complete Feature Comparison</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                  {plans.map(plan => (
                    <th key={plan.id} className="text-center py-4 px-4 text-zinc-100 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((category, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-zinc-900/50">
                      <td colSpan={4} className="py-3 px-4 text-emerald-400 font-semibold text-sm">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, featIdx) => (
                      <tr key={`${catIdx}-${featIdx}`} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                        <td className="py-3 px-4 text-zinc-400 text-sm">
                          {feature.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof feature.starter === 'boolean' ? (
                            feature.starter ? (
                              <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-zinc-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-zinc-400 text-sm">{feature.starter}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof feature.pro === 'boolean' ? (
                            feature.pro ? (
                              <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-zinc-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-zinc-400 text-sm">{feature.pro}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof feature.business === 'boolean' ? (
                            feature.business ? (
                              <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-zinc-600 mx-auto" />
                            )
                          ) : (
                            <span className="text-zinc-400 text-sm">{feature.business}</span>
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

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-100 text-center mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {PRICING_FAQ.map((faq, idx) => (
              <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base text-zinc-100">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
