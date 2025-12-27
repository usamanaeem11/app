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
  AlertCircle
} from 'lucide-react';

const Subscription = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [numUsers, setNumUsers] = useState(5);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    fetchData();
    handleReturnFromStripe();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subscriptionRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.get().catch(() => null)
      ]);
      
      setPlans(plansRes.data.plans);
      setServices(plansRes.data.services);
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
  
  const calculateTotal = () => {
    const plan = getSelectedPlan();
    if (!plan) return 0;
    return (plan.price_per_user_monthly * plan.duration_months * numUsers).toFixed(2);
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
        <p className="text-zinc-400 mt-1">Manage your WorkMonitor subscription and billing</p>
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

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Choose Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`cursor-pointer transition-all ${
                selectedPlan === plan.id 
                  ? 'bg-emerald-500/10 border-emerald-500' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
              data-testid={`plan-${plan.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-zinc-100">{plan.name}</CardTitle>
                  {plan.discount_percent > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {plan.discount_percent}% OFF
                    </Badge>
                  )}
                </div>
                <CardDescription>{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-100">${plan.price_per_user_monthly.toFixed(2)}</span>
                    <span className="text-zinc-500">/user/month</span>
                  </div>
                  {plan.discount_percent > 0 && (
                    <p className="text-sm text-zinc-500 line-through">
                      ${plan.base_price_per_user.toFixed(2)}/user/month
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === plan.id 
                    ? 'border-emerald-500 bg-emerald-500' 
                    : 'border-zinc-600'
                }`}>
                  {selectedPlan === plan.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </CardFooter>
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
                <h4 className="font-medium text-zinc-100">All Plans Include:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {services.slice(0, 12).map((service, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {service}
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
                  <span>Duration</span>
                  <span className="text-zinc-100">{getSelectedPlan()?.duration_months} month(s)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Users</span>
                  <span className="text-zinc-100">{numUsers}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Price per user</span>
                  <span className="text-zinc-100">${getSelectedPlan()?.price_per_user_monthly.toFixed(2)}/mo</span>
                </div>
                {getSelectedPlan()?.discount_percent > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-{getSelectedPlan()?.discount_percent}%</span>
                  </div>
                )}
              </div>
              
              <Separator className="bg-zinc-800" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-zinc-100">Total</span>
                <span className="text-emerald-400" data-testid="total-price">${calculateTotal()}</span>
              </div>
              
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
