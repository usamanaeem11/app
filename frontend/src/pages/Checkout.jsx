import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  CreditCard,
  Check,
  Shield,
  Loader2,
  ArrowLeft,
  Clock,
  Users,
  Zap,
  Star,
  Crown,
  ChevronRight,
  Lock,
} from 'lucide-react';
import api from '../lib/api';

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const planId = searchParams.get('plan') || 'pro';
  const billingCycle = searchParams.get('billing') || 'monthly';
  const numUsers = parseInt(searchParams.get('users') || '5');
  
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [autoRecurring, setAutoRecurring] = useState(true);

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      const res = await api.get(`/pricing/plan/${planId}`);
      setPlan(res.data);
    } catch (error) {
      toast.error('Failed to load plan details');
      navigate('/pricing');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = () => {
    if (!plan) return 0;
    return billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
  };

  const getTotalPrice = () => {
    return (getPrice() * numUsers).toFixed(2);
  };

  const getPlanIcon = () => {
    switch (planId) {
      case 'starter': return <Zap className="w-6 h-6" />;
      case 'pro': return <Star className="w-6 h-6" />;
      case 'business': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // Use Stripe checkout
      const res = await api.post('/payments/checkout/session', {
        plan: billingCycle,  // monthly, quarterly, yearly
        num_users: numUsers,
        origin_url: window.location.origin,
      });
      
      // Redirect to Stripe checkout
      if (res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      
      toast.error('Failed to create checkout session');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950" data-testid="checkout-loading">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4" data-testid="checkout-page">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 text-zinc-400 hover:text-zinc-100"
          onClick={() => navigate('/pricing')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to pricing
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Details */}
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                  >
                    {getPlanIcon()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-100">{plan.name} Plan</h3>
                    <p className="text-sm text-zinc-400">{plan.description}</p>
                  </div>
                  {plan.badge && (
                    <Badge className={`${
                      plan.badge === 'Most Popular' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {plan.badge}
                    </Badge>
                  )}
                </div>

                <Separator className="bg-zinc-800" />

                {/* Billing Details */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Billing cycle
                    </span>
                    <span className="text-zinc-100 capitalize">{billingCycle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Team size
                    </span>
                    <span className="text-zinc-100">{numUsers} users</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Price per user</span>
                    <span className="text-zinc-100">
                      ${billingCycle === 'yearly' 
                        ? (plan.yearly_price / 12).toFixed(2) 
                        : plan.monthly_price.toFixed(2)
                      }/mo
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Yearly discount</span>
                      <span className="text-emerald-400">-{plan.yearly_discount_percent}%</span>
                    </div>
                  )}
                </div>

                <Separator className="bg-zinc-800" />

                {/* Total */}
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-zinc-100">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-zinc-100">${getTotalPrice()}</span>
                    <span className="text-zinc-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                </div>

                {/* Key Features */}
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-zinc-300 mb-3">Included features:</p>
                  {planId === 'starter' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Automatic time tracking
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Screenshots (100/day)
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Basic reports
                      </div>
                    </>
                  )}
                  {planId === 'pro' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Unlimited screenshots
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Payroll & invoices
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Team chat
                      </div>
                    </>
                  )}
                  {planId === 'business' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> Video screenshots
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> SSO & API access
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-500" /> White-label branding
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Stripe Payment Info */}
                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Lock className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">Secure Card Payment</p>
                        <p className="text-xs text-zinc-400">Powered by Stripe</p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                      You'll be redirected to Stripe's secure checkout page to complete your payment. 
                      We accept Visa, Mastercard, American Express, and other major cards.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/100px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 opacity-70" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/100px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 opacity-70" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/100px-American_Express_logo_%282018%29.svg.png" alt="Amex" className="h-6 opacity-70" />
                    </div>
                  </div>

                  {/* Auto-recurring option */}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="auto-recurring"
                      checked={autoRecurring}
                      onCheckedChange={setAutoRecurring}
                    />
                    <Label 
                      htmlFor="auto-recurring" 
                      className="text-sm text-zinc-400 cursor-pointer"
                    >
                      Enable auto-recurring payments
                    </Label>
                  </div>

                  <Separator className="bg-zinc-800" />

                  {/* Security Badge */}
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Shield className="w-4 h-4" />
                    <span>Secured with 256-bit SSL encryption</span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                    disabled={processing}
                    data-testid="complete-purchase-btn"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Purchase
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-zinc-500 text-center">
                    By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
