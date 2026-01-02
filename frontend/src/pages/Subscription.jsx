import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscriptionAPI, paymentAPI } from '../lib/api';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import {
  Check,
  CreditCard,
  Users,
  Calendar,
  Clock,
  Zap,
  Shield,
  BarChart3,
  FileText,
  Loader2,
  Crown,
  AlertCircle,
  Star,
  Bot
} from 'lucide-react';
import { PRICING_TIERS } from '../data/pricingData';

const Subscription = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [isYearly, setIsYearly] = useState(false);
  const [numUsers, setNumUsers] = useState(5);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const plans = Object.values(PRICING_TIERS);

  useEffect(() => {
    fetchData();
    handleReturnFromStripe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const subscriptionRes = await subscriptionAPI.get().catch(() => null);
      setCurrentSubscription(subscriptionRes?.data);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnFromStripe = async () => {
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');

    if (cancelled) {
      toast.error('Payment was cancelled');
      window.history.replaceState({}, '', '/subscription');
      return;
    }

    if (sessionId && success) {
      setCheckingPayment(true);
      try {
        // Poll for payment status
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const statusRes = await paymentAPI.getCheckoutStatus(sessionId);
          
          if (statusRes.data.payment_status === 'paid') {
            // Activate subscription
            const activateRes = await subscriptionAPI.activate(sessionId);
            toast.success('Subscription activated successfully!');
            setCurrentSubscription(activateRes.data);
            fetchData();
            break;
          } else if (statusRes.data.payment_status === 'unpaid') {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            break;
          }
        }
        
        if (attempts >= maxAttempts) {
          toast.error('Payment verification timed out. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error('Failed to verify payment. Please contact support.');
      } finally {
        setCheckingPayment(false);
        window.history.replaceState({}, '', '/subscription');
      }
    }
  };

  const handleSubscribe = async () => {
    if (user?.role !== 'admin') {
      toast.error('Only admins can manage subscriptions');
      return;
    }

    setProcessing(true);
    try {
      const res = await paymentAPI.createCheckoutSession({
        plan: selectedPlan,
        billing_cycle: isYearly ? 'yearly' : 'monthly',
        num_users: numUsers,
        origin_url: window.location.origin
      });

      // Redirect to Stripe Checkout
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setProcessing(false);
    }
  };

  const getSelectedPlan = () => plans.find(p => p.id === selectedPlan);

  const getPrice = (plan) => {
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const calculateTotal = () => {
    const plan = getSelectedPlan();
    if (!plan) return 0;
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const multiplier = isYearly ? 12 : 1;
    return (price * numUsers * multiplier).toFixed(2);
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'starter': return <Zap className="w-6 h-6" />;
      case 'pro': return <Star className="w-6 h-6" />;
      case 'business': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading || checkingPayment) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="subscription-loading">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-400">
            {checkingPayment ? 'Verifying payment...' : 'Loading subscription plans...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="subscription-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Subscription</h1>
        <p className="text-zinc-400 mt-1">Manage your Working Tracker subscription and billing</p>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-amber-400" />
                <div>
                  <CardTitle className="text-zinc-100">Current Subscription</CardTitle>
                  <CardDescription>Your active plan details</CardDescription>
                </div>
              </div>
              <Badge 
                className={currentSubscription.status === 'active' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border-red-500/30'}
                data-testid="subscription-status"
              >
                {currentSubscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-500">Plan</p>
                <p className="text-lg font-semibold text-zinc-100">{currentSubscription.plan_name}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-500">Users</p>
                <p className="text-lg font-semibold text-zinc-100">{currentSubscription.num_users}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-500">Started</p>
                <p className="text-lg font-semibold text-zinc-100">{formatDate(currentSubscription.starts_at)}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-sm text-zinc-500">Expires</p>
                <p className="text-lg font-semibold text-zinc-100">{formatDate(currentSubscription.expires_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-admin warning */}
      {user?.role !== 'admin' && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <p className="text-amber-200">Only administrators can manage subscriptions. Contact your admin to make changes.</p>
          </CardContent>
        </Card>
      )}

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-4">
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

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
              } ${plan.popular ? 'border-blue-500/50' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
              data-testid={`plan-${plan.id}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className={plan.popular ? 'bg-blue-500' : 'bg-purple-500'}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      plan.id === 'pro' ? 'bg-blue-500/20 text-blue-500' :
                      plan.id === 'business' ? 'bg-purple-500/20 text-purple-500' :
                      'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {getPlanIcon(plan.id)}
                    </div>
                    <CardTitle className="text-lg text-zinc-100">{plan.name}</CardTitle>
                  </div>
                  {selectedPlan === plan.id && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <CardDescription className="mt-2">{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-100">${getPrice(plan).toFixed(2)}</span>
                    <span className="text-zinc-500">/user/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-emerald-400">
                      Save ${((plan.monthlyPrice - plan.yearlyPrice) * 12).toFixed(2)}/user/year
                    </p>
                  )}

                  <Separator className="bg-zinc-800 my-3" />

                  <div className="space-y-2">
                    {plan.features.slice(0, 2).map((category, idx) => (
                      <div key={idx}>
                        {category.category && (
                          <p className="text-xs font-semibold text-emerald-400 mb-1">
                            {category.category}
                          </p>
                        )}
                        <ul className="space-y-1">
                          {category.items.slice(0, 2).map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2 text-xs text-zinc-400">
                              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <p className="text-xs text-blue-400 pl-5">+many more features</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Number of Users & Checkout */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Configure Your Plan</CardTitle>
              <CardDescription>Select the number of users for your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="numUsers" className="text-zinc-300">Number of Users</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="numUsers"
                    type="number"
                    min={1}
                    max={1000}
                    value={numUsers}
                    onChange={(e) => setNumUsers(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 bg-zinc-800 border-zinc-700 text-zinc-100"
                    data-testid="num-users-input"
                  />
                  <div className="flex gap-2">
                    {[5, 10, 25, 50, 100].map(n => (
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
                  </div>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div className="space-y-3">
                <h4 className="font-medium text-zinc-100">Key Features:</h4>
                <div className="space-y-2">
                  {getSelectedPlan()?.features.slice(0, 3).map((category, idx) => (
                    <div key={idx}>
                      {category.category && (
                        <p className="text-xs font-semibold text-emerald-400 mb-1">
                          {category.category}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {category.items.slice(0, 3).map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2 text-xs text-zinc-400">
                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Plan</span>
                  <span className="text-zinc-100">{getSelectedPlan()?.name}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Billing</span>
                  <span className="text-zinc-100">{isYearly ? 'Yearly' : 'Monthly'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Users</span>
                  <span className="text-zinc-100">{numUsers}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Price per user</span>
                  <span className="text-zinc-100">${getPrice(getSelectedPlan()).toFixed(2)}/mo</span>
                </div>
                {isYearly && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Yearly Discount</span>
                    <span>-20%</span>
                  </div>
                )}
              </div>

              <Separator className="bg-zinc-800" />

              <div className="flex justify-between text-lg font-semibold">
                <span className="text-zinc-100">Total</span>
                <span className="text-emerald-400" data-testid="total-price">${calculateTotal()}</span>
              </div>
              <p className="text-xs text-zinc-500 text-center">
                {isYearly ? 'Billed annually' : 'Billed monthly'}
              </p>

              <Button
                onClick={handleSubscribe}
                disabled={processing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="subscribe-btn"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {currentSubscription ? 'Upgrade Plan' : 'Subscribe Now'}
                  </>
                )}
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                Secure payment powered by Stripe
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <Clock className="w-8 h-8 text-emerald-500 mb-3" />
            <h3 className="font-semibold text-zinc-100 mb-1">Time Tracking</h3>
            <p className="text-sm text-zinc-400">Automatic and manual time tracking with detailed reports</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <Shield className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold text-zinc-100 mb-1">Screenshot Monitoring</h3>
            <p className="text-sm text-zinc-400">Configurable screenshot intervals with blur options</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <BarChart3 className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-semibold text-zinc-100 mb-1">AI Analytics</h3>
            <p className="text-sm text-zinc-400">AI-powered productivity insights and recommendations</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <Users className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold text-zinc-100 mb-1">Team Management</h3>
            <p className="text-sm text-zinc-400">Role-based access with admin, manager, and employee roles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscription;
