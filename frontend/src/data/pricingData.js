// Comprehensive Pricing Configuration for Working Tracker
// This file contains all pricing tiers, features, and configurations

export const PRICING_TIERS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'Small teams, remote or office',
    monthlyPrice: 2.99,
    yearlyPrice: 2.39, // 20% discount
    currency: 'USD',
    billingCycle: 'per user/month',
    popular: false,
    features: [
      {
        category: 'Time Tracking',
        items: [
          'Automatic & manual time tracking',
          'Offline time tracking with sync',
          'Idle & break time tracking',
          'Silent mode tracking'
        ]
      },
      {
        category: 'Screenshots',
        items: [
          'Periodic screenshots',
          'Blurred screenshots for privacy'
        ]
      },
      {
        category: 'Employee Monitoring',
        items: [
          'Real-time activity monitoring',
          'Activity level tracking',
          'Automated timesheets'
        ]
      },
      {
        category: 'Attendance & Shifts',
        items: [
          'Attendance tracking',
          'Leave management',
          'Shift scheduling'
        ]
      },
      {
        category: 'Projects & Tasks',
        items: [
          'Basic project & task creation',
          'Simple time logs',
          'Project time reports'
        ]
      },
      {
        category: 'Reports',
        items: [
          'Tracked hours reports',
          'Attendance reports',
          'Apps & web usage reports',
          'Timesheet summary'
        ]
      },
      {
        category: 'Platform Access',
        items: [
          'Desktop app (Windows, Mac, Linux)',
          'Web dashboard',
          'Mobile app (iOS & Android)',
          'Browser extensions'
        ]
      }
    ],
    limitations: [
      'Basic reporting only',
      'No AI insights',
      'No payroll automation',
      'No advanced integrations'
    ]
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Growing teams & managers',
    monthlyPrice: 4.99,
    yearlyPrice: 3.99, // 20% discount
    currency: 'USD',
    billingCycle: 'per user/month',
    popular: true,
    badge: 'Most Popular',
    features: [
      {
        category: 'Everything in Starter, plus:',
        items: []
      },
      {
        category: 'Advanced Monitoring',
        items: [
          'AI-powered productivity insights',
          'Unusual activity detection',
          'App & website usage tracking',
          'Chat & social media monitoring',
          'Productivity benchmarking'
        ]
      },
      {
        category: 'Payroll & Payments',
        items: [
          'Automated payroll processing',
          'Billable hours tracking',
          'Invoice generation',
          'Stripe, PayPal, Payoneer, Wise integration',
          'Multi-currency support'
        ]
      },
      {
        category: 'Project Management',
        items: [
          'Project budgeting & tracking',
          'Subtasks & dependencies',
          'Milestones & deadlines',
          'Resource allocation',
          'Time estimates vs actuals'
        ]
      },
      {
        category: 'AI Analytics',
        items: [
          'AI productivity metrics',
          'Activity summaries & insights',
          'Work-life balance metrics',
          'Burnout risk detection',
          'Executive dashboards'
        ]
      },
      {
        category: 'Integrations',
        items: [
          'Jira, Asana, ClickUp, Trello',
          'Slack, Microsoft Teams',
          'Google Workspace, Outlook',
          'GitHub, GitLab, Bitbucket',
          'QuickBooks, Xero'
        ]
      }
    ],
    limitations: [
      'No SSO or SAML',
      'No screen recording',
      'No white label branding'
    ]
  },

  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Large teams & enterprises',
    monthlyPrice: 6.99,
    yearlyPrice: 5.59, // 20% discount
    currency: 'USD',
    billingCycle: 'per user/month',
    popular: false,
    badge: 'Enterprise',
    features: [
      {
        category: 'Everything in Pro, plus:',
        items: []
      },
      {
        category: 'Advanced Security & Compliance',
        items: [
          'SSO (SAML 2.0) authentication',
          'SCIM user provisioning',
          'Data Loss Prevention (DLP)',
          'Insider threat prevention',
          'HIPAA, SOC2, ISO 27001 compliance',
          'Stealth mode monitoring'
        ]
      },
      {
        category: 'Screen Monitoring',
        items: [
          'Live screencasting',
          'Screen recording & playback',
          'Multi-monitor capture',
          'Recorded session exports'
        ]
      },
      {
        category: 'Custom Branding',
        items: [
          'White label platform',
          'Custom subdomain',
          'Organization branding',
          'Custom email templates'
        ]
      },
      {
        category: 'Advanced Reports & AI',
        items: [
          'Custom report builder',
          'Visual dashboards & widgets',
          'AI benchmarking across teams',
          'Office vs remote analytics',
          'Meeting cost & efficiency insights',
          'Predictive analytics'
        ]
      },
      {
        category: 'Enterprise Tools',
        items: [
          'Private cloud deployment option',
          'Dedicated success manager',
          'API access & webhooks',
          'Custom integrations',
          'Priority 24/7 support',
          'SLA guarantee (99.9% uptime)'
        ]
      }
    ],
    limitations: []
  }
};

// AI Differentiators - Key selling points
export const AI_FEATURES = [
  {
    icon: '🎯',
    title: 'Unusual Activity Detection',
    description: 'AI flags atypical keyboard/mouse activity, idle patterns, or high-risk behaviors automatically',
    tier: 'pro'
  },
  {
    icon: '📊',
    title: 'Productivity Benchmarking AI',
    description: 'Compares employee performance vs peer groups automatically with actionable insights',
    tier: 'pro'
  },
  {
    icon: '🤝',
    title: 'Meeting Insights AI',
    description: 'Calculates meeting cost, idle time, team efficiency and suggests improvements',
    tier: 'business'
  },
  {
    icon: '💚',
    title: 'Work-Life Balance Metrics',
    description: 'Detects burnout risk, excessive overtime, insufficient breaks with AI recommendations',
    tier: 'pro'
  },
  {
    icon: '🔔',
    title: 'Smart Monitoring & Alerts',
    description: 'AI prioritizes alerts for managers to reduce manual oversight and noise',
    tier: 'pro'
  },
  {
    icon: '💰',
    title: 'Payroll Automation AI',
    description: 'Suggests payroll adjustments based on billable hours, overtime, and leave patterns',
    tier: 'pro'
  }
];

// Competitive advantages
export const COMPETITIVE_ADVANTAGES = [
  {
    feature: 'All-in-One Platform',
    competitors: 'Split across multiple tools (time tracking, payroll, projects)',
    workingTracker: 'One unified platform for time, payroll, projects, analytics, and chat',
    highlight: true
  },
  {
    feature: 'AI Insights',
    competitors: 'Basic reports, few have actionable AI',
    workingTracker: 'AI flags unusual activity, burnout risk, productivity benchmarks, meeting insights'
  },
  {
    feature: 'Flexibility',
    competitors: 'Limited offline & multi-device support',
    workingTracker: 'Full offline sync, desktop/web/mobile/extension, multi-monitor screenshots'
  },
  {
    feature: 'Compliance Ready',
    competitors: 'Optional in enterprise tiers only',
    workingTracker: 'Built-in HIPAA/SOC2/ISO compliance even in Business tier',
    highlight: true
  },
  {
    feature: 'Cost Efficiency',
    competitors: 'High cost per feature ($10-15/user)',
    workingTracker: 'Starter tier gives 90% core functionality at <$3/user'
  },
  {
    feature: 'Integrations',
    competitors: 'Limited to 10-20 apps',
    workingTracker: '35+ integrations including Stripe, PayPal, Jira, Slack, GitHub, Gusto'
  }
];

// Frequently asked questions
export const PRICING_FAQ = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'Start with any plan free for 14 days. No credit card required. Full access to all features. Cancel anytime during the trial with no charges.'
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes! Upgrade or downgrade anytime. When you upgrade, you get immediate access to new features. Downgrades take effect at the next billing cycle.'
  },
  {
    question: 'What happens if I exceed my user limit?',
    answer: 'You can easily add more users at the same per-user rate. Billing is prorated based on when you add new team members during your billing cycle.'
  },
  {
    question: 'Do you offer discounts for yearly subscriptions?',
    answer: 'Yes! Save 20% with annual billing. For example, Pro costs $3.99/user/month when billed yearly instead of $4.99 monthly.'
  },
  {
    question: 'Is there a discount for non-profits or educational institutions?',
    answer: 'Yes, we offer special pricing for qualifying non-profits and educational institutions. Contact our sales team for details.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual plans. Enterprise customers can also pay via invoice.'
  },
  {
    question: 'Can I get a refund if I\'m not satisfied?',
    answer: 'Yes! We offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, contact us for a full refund within 30 days of purchase.'
  },
  {
    question: 'What kind of support is included?',
    answer: 'Starter and Pro plans include email support (24-48hr response). Business plans include priority 24/7 support via email, chat, and phone, plus a dedicated success manager.'
  }
];

// Tier comparison table data
export const FEATURE_COMPARISON = [
  {
    category: 'Time Tracking',
    features: [
      { name: 'Automatic time tracking', starter: true, pro: true, business: true },
      { name: 'Manual time entry', starter: true, pro: true, business: true },
      { name: 'Offline tracking', starter: true, pro: true, business: true },
      { name: 'Idle & break tracking', starter: true, pro: true, business: true },
      { name: 'Silent mode', starter: true, pro: true, business: true },
      { name: 'Billable hours tracking', starter: false, pro: true, business: true }
    ]
  },
  {
    category: 'Monitoring',
    features: [
      { name: 'Activity level tracking', starter: true, pro: true, business: true },
      { name: 'Periodic screenshots', starter: true, pro: true, business: true },
      { name: 'App & website tracking', starter: false, pro: true, business: true },
      { name: 'Live screencasting', starter: false, pro: false, business: true },
      { name: 'Screen recording', starter: false, pro: false, business: true },
      { name: 'Multi-monitor capture', starter: false, pro: false, business: true }
    ]
  },
  {
    category: 'AI & Analytics',
    features: [
      { name: 'Basic reports', starter: true, pro: true, business: true },
      { name: 'AI productivity insights', starter: false, pro: true, business: true },
      { name: 'Unusual activity detection', starter: false, pro: true, business: true },
      { name: 'Work-life balance metrics', starter: false, pro: true, business: true },
      { name: 'AI benchmarking', starter: false, pro: false, business: true },
      { name: 'Meeting insights AI', starter: false, pro: false, business: true }
    ]
  },
  {
    category: 'Payroll & Payments',
    features: [
      { name: 'Timesheet generation', starter: true, pro: true, business: true },
      { name: 'Payroll automation', starter: false, pro: true, business: true },
      { name: 'Invoice generation', starter: false, pro: true, business: true },
      { name: 'Payment integrations', starter: false, pro: true, business: true },
      { name: 'Multi-currency support', starter: false, pro: true, business: true }
    ]
  },
  {
    category: 'Security & Compliance',
    features: [
      { name: 'Basic security', starter: true, pro: true, business: true },
      { name: 'SSO (SAML)', starter: false, pro: false, business: true },
      { name: 'SCIM provisioning', starter: false, pro: false, business: true },
      { name: 'HIPAA/SOC2/ISO compliance', starter: false, pro: false, business: true },
      { name: 'Data Loss Prevention', starter: false, pro: false, business: true }
    ]
  },
  {
    category: 'Customization',
    features: [
      { name: 'Basic branding', starter: true, pro: true, business: true },
      { name: 'White label', starter: false, pro: false, business: true },
      { name: 'Custom subdomain', starter: false, pro: false, business: true },
      { name: 'Custom reports', starter: false, pro: false, business: true },
      { name: 'API & webhooks', starter: false, pro: false, business: true }
    ]
  },
  {
    category: 'Support',
    features: [
      { name: 'Email support', starter: '24-48hr', pro: '12-24hr', business: '24/7' },
      { name: 'Live chat', starter: false, pro: true, business: true },
      { name: 'Phone support', starter: false, pro: false, business: true },
      { name: 'Dedicated success manager', starter: false, pro: false, business: true },
      { name: 'SLA guarantee', starter: false, pro: false, business: '99.9%' }
    ]
  }
];

// Helper functions
export const calculateYearlyPrice = (monthlyPrice) => {
  return (monthlyPrice * 12 * 0.8).toFixed(2); // 20% discount
};

export const calculateYearlySavings = (monthlyPrice) => {
  const monthlyTotal = monthlyPrice * 12;
  const yearlyTotal = monthlyTotal * 0.8;
  return (monthlyTotal - yearlyTotal).toFixed(2);
};

export const getTierByPrice = (price) => {
  return Object.values(PRICING_TIERS).find(
    tier => tier.monthlyPrice === price || tier.yearlyPrice === price
  );
};

export const getAllFeaturesList = (tierId) => {
  const tier = PRICING_TIERS[tierId];
  if (!tier) return [];

  const allFeatures = [];
  tier.features.forEach(category => {
    category.items.forEach(item => {
      allFeatures.push(item);
    });
  });

  return allFeatures;
};

export const getAIFeaturesForTier = (tierId) => {
  if (tierId === 'starter') return [];
  if (tierId === 'pro') {
    return AI_FEATURES.filter(f => f.tier === 'pro');
  }
  return AI_FEATURES; // Business gets all
};

export default PRICING_TIERS;
