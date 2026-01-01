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
  ChevronRight
} from 'lucide-react';
import api from '../lib/api';

const PricingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [trialConfig, setTrialConfig] = useState(null);
  const [featureCategories, setFeatureCategories] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [numUsers, setNumUsers] = useState(5);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        api.get('/pricing/plans'),
        user ? api.get(`/pricing/subscription/${user.company_id}`).catch(() => null) : null
      ]);
      
      setPlans(plansRes.data.plans);
      setTrialConfig(plansRes.data.trial);
      setFeatureCategories(plansRes.data.feature_categories);
      
      if (subRes?.data) {
        setCurrentSubscription(subRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
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
      return (plan.yearly_price / 12).toFixed(2);
    }
    return plan.monthly_price.toFixed(2);
  };

  const getTotalPrice = (plan) => {
    const price = isYearly ? plan.yearly_price : plan.monthly_price;
    return (price * numUsers).toFixed(2);
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
            {trialConfig?.duration_days}-Day Free Trial
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Choose the plan that fits your team. Start with a free trial, no credit card required.
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
                plan.badge === 'Most Popular' ? 'border-blue-500 ring-1 ring-blue-500/50' : ''
              } ${selectedPlan === plan.id ? 'ring-2 ring-emerald-500' : ''}`}
              data-testid={`plan-card-${plan.id}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={`${
                    plan.badge === 'Most Popular' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-purple-500 text-white'
                  }`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pt-8">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center`}
                     style={{ backgroundColor: `${plan.color}20`, color: plan.color }}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-xl text-zinc-100">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-zinc-100">${getPrice(plan)}</span>
                    <span className="text-zinc-500 ml-1">/user/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-emerald-400 mt-1">
                      ${plan.yearly_price}/user/year
                    </p>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">
                    {numUsers} users = <span className="text-zinc-300 font-semibold">${getTotalPrice(plan)}</span>/{isYearly ? 'year' : 'month'}
                  </p>
                </div>
                
                <Separator className="bg-zinc-800 mb-6" />
                
                {/* Key Features */}
                <ul className="space-y-3 text-left mb-6">
                  {plan.id === 'starter' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Automatic time tracking
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Screenshots (limited)
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Basic reports
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Projects & tasks
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <X className="w-4 h-4 text-zinc-600" /> <span className="text-zinc-600">Payroll & invoices</span>
                      </li>
                    </>
                  )}
                  {plan.id === 'pro' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Everything in Starter
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Unlimited screenshots
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Payroll & invoices
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Shift scheduling
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Team chat
                      </li>
                    </>
                  )}
                  {plan.id === 'business' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Everything in Pro
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Video screenshots
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> SSO & API access
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> White-label branding
                      </li>
                      <li className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> AI support chatbot
                      </li>
                    </>
                  )}
                </ul>
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
                
                {!currentSubscription?.has_subscription && plan.id === 'pro' && (
                  <Button
                    variant="outline"
                    className="w-full"
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

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-zinc-100 text-center mb-8">Compare All Features</h2>
          
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
                {featureCategories.map((category, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-zinc-900/50">
                      <td colSpan={4} className="py-3 px-4 text-emerald-400 font-semibold text-sm">
                        {category.name}
                      </td>
                    </tr>
                    {category.features.map((feature, featIdx) => (
                      <tr key={`${catIdx}-${featIdx}`} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                        <td className="py-3 px-4 text-zinc-400 text-sm flex items-center gap-2">
                          {getFeatureIcon(feature.key)}
                          {feature.label}
                        </td>
                        {plans.map(plan => {
                          const value = plan.features[feature.key];
                          return (
                            <td key={plan.id} className="py-3 px-4 text-center">
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-zinc-600 mx-auto" />
                                )
                              ) : value === -1 ? (
                                <span className="text-emerald-400 text-sm">Unlimited</span>
                              ) : (
                                <span className="text-zinc-400 text-sm">{value}</span>
                              )}
                            </td>
                          );
                        })}
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
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base text-zinc-100">What happens after my free trial ends?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm">
                  After your 14-day trial, you'll automatically be moved to the Starter plan (free). 
                  No credit card required, no automatic charges. Upgrade anytime to unlock more features.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base text-zinc-100">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm">
                  Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged 
                  the prorated difference. When downgrading, the change takes effect at the end of your billing period.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base text-zinc-100">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm">
                  We accept credit/debit cards (Visa, Mastercard, Amex), PayPal, Payoneer, and Wise. 
                  You can also set up auto-recurring payments or pay manually each billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
