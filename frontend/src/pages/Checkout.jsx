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

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // For card payments, use Stripe checkout
      if (paymentMethod === 'card') {
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
      } else {
        // For other payment methods, create a pending subscription
        const res = await api.post('/pricing/subscribe', {
          plan: planId,
          billing_cycle: billingCycle,
          num_users: numUsers,
          payment_method: paymentMethod,
          auto_recurring: autoRecurring,
        });
        
        // Show instructions for alternative payment methods
        toast.success(`Subscription initiated. Please complete ${paymentMethod} payment.`);
        navigate('/subscription');
      }
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
                <CardTitle className="text-zinc-100">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Payment Method Selection */}
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label
                      htmlFor="card"
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'card' 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <RadioGroupItem value="card" id="card" className="sr-only" />
                      <CreditCard className="w-5 h-5 text-zinc-400" />
                      <span className="text-sm text-zinc-100">Card</span>
                    </Label>
                    
                    <Label
                      htmlFor="paypal"
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'paypal' 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <RadioGroupItem value="paypal" id="paypal" className="sr-only" />
                      <Wallet className="w-5 h-5 text-zinc-400" />
                      <span className="text-sm text-zinc-100">PayPal</span>
                    </Label>
                    
                    <Label
                      htmlFor="payoneer"
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'payoneer' 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <RadioGroupItem value="payoneer" id="payoneer" className="sr-only" />
                      <Building2 className="w-5 h-5 text-zinc-400" />
                      <span className="text-sm text-zinc-100">Payoneer</span>
                    </Label>
                    
                    <Label
                      htmlFor="wise"
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentMethod === 'wise' 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <RadioGroupItem value="wise" id="wise" className="sr-only" />
                      <Building2 className="w-5 h-5 text-zinc-400" />
                      <span className="text-sm text-zinc-100">Wise</span>
                    </Label>
                  </RadioGroup>

                  {/* Card Form (only show for card payment) */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-zinc-400">Card number</Label>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                          className="mt-1.5 bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-zinc-400">Expiry date</Label>
                          <Input
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            maxLength={5}
                            className="mt-1.5 bg-zinc-800 border-zinc-700 text-zinc-100"
                          />
                        </div>
                        <div>
                          <Label className="text-zinc-400">CVC</Label>
                          <Input
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            maxLength={4}
                            className="mt-1.5 bg-zinc-800 border-zinc-700 text-zinc-100"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-zinc-400">Cardholder name</Label>
                        <Input
                          placeholder="John Doe"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="mt-1.5 bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                      </div>
                    </div>
                  )}

                  {/* Alternative Payment Instructions */}
                  {paymentMethod !== 'card' && (
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400">
                        After clicking "Complete Purchase", you'll receive instructions to complete your {paymentMethod} payment. 
                        Your subscription will be activated once payment is confirmed.
                      </p>
                    </div>
                  )}

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
