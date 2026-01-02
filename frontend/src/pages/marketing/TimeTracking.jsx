import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../../components/marketing/MarketingLayout';
import Breadcrumbs from '../../components/marketing/Breadcrumbs';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export default function TimeTracking() {
  const breadcrumbs = [
    { name: 'Product', href: '/product' },
    { name: 'Time Tracking' }
  ];

  const subFeatures = [
    {
      title: 'Automatic Time Tracking',
      description: 'Hands-free tracking that runs in the background',
      href: '/time-tracking/automatic',
      icon: '🤖'
    },
    {
      title: 'Screenshot Monitoring',
      description: 'Periodic screenshots at customizable intervals',
      href: '/time-tracking/screenshots',
      icon: '📸'
    },
    {
      title: 'App & URL Tracking',
      description: 'Track every application and website visited',
      href: '/time-tracking/apps-urls',
      icon: '🌐'
    },
    {
      title: 'Idle Time Detection',
      description: 'Automatically detect when employees are idle',
      href: '/time-tracking/idle-time',
      icon: '💤'
    }
  ];

  const relatedFeatures = [
    { name: 'Employee Monitoring', href: '/employee-monitoring', description: 'Complete monitoring suite' },
    { name: 'Timesheets', href: '/timesheets', description: 'Automated timesheet generation' },
    { name: 'Productivity Tracking', href: '/productivity-tracking', description: 'AI-powered productivity insights' },
    { name: 'Payroll', href: '/payroll', description: 'Automatic payroll from tracked time' }
  ];

  return (
    <MarketingLayout>
      <Breadcrumbs items={breadcrumbs} />

      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Time Tracking Software for Remote Teams
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Accurate, automatic time tracking with screenshots, activity monitoring, and productivity insights.
              Track every minute worked across all devices with our comprehensive employee time tracking solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/demo">Book a Demo</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              14-day free trial • No credit card required
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Key Benefits</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold mb-2">100% Accurate Tracking</h3>
              <p className="text-slate-600">
                Track time down to the second with automatic and manual options. Never lose a billable minute again.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Detailed Reports</h3>
              <p className="text-slate-600">
                Generate comprehensive time reports with activity breakdown, productivity scores, and project insights.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Boost Productivity</h3>
              <p className="text-slate-600">
                Identify time wasters, optimize workflows, and increase team productivity by up to 30%.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Complete Time Tracking Features</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {subFeatures.map((feature) => (
              <Link key={feature.href} to={feature.href}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-3">{feature.icon}</div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                    <div className="mt-4 text-blue-600 font-medium">
                      Learn more →
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Install & Configure</h3>
            <p className="text-slate-600">
              Download our desktop app, set your tracking preferences, and you're ready to go in under 2 minutes.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Time Automatically</h3>
            <p className="text-slate-600">
              Time tracking runs in the background capturing screenshots, activity levels, and apps used.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Review & Optimize</h3>
            <p className="text-slate-600">
              View reports, approve timesheets, process payroll, and identify areas for productivity improvement.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Works With Your Favorite Tools</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 max-w-4xl mx-auto">
            {['Jira', 'Slack', 'GitHub', 'Asana', 'Trello', 'QuickBooks'].map((tool) => (
              <div key={tool} className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="font-semibold text-sm">{tool}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/integrations" className="text-blue-600 hover:underline font-medium">
              View all integrations →
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Related Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {relatedFeatures.map((feature) => (
            <Link key={feature.href} to={feature.href}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{feature.name}</h3>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                  <div className="mt-4 text-blue-600 text-sm font-medium">
                    Learn more →
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <FAQ
              question="Does time tracking work offline?"
              answer="Yes! Our time tracking software works offline and automatically syncs when you're back online."
            />
            <FAQ
              question="Can employees see their own time data?"
              answer="Yes, employees can view their own time entries, screenshots, and activity levels through their dashboard."
            />
            <FAQ
              question="How accurate is automatic time tracking?"
              answer="Our automatic time tracking is accurate to the second and includes activity level detection to ensure precision."
            />
            <FAQ
              question="Can I track time across multiple devices?"
              answer="Yes, track time seamlessly across desktop, mobile, and web. All data syncs in real-time."
            />
            <FAQ
              question="Is there a limit on tracked time or employees?"
              answer="No limits! Track unlimited time for unlimited employees at the same low per-user price."
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Tracking Time?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join 10,000+ companies using our employee time tracking software. Start your 14-day free trial today.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
            <Link to="/signup">Start Free Trial</Link>
          </Button>
          <p className="text-sm text-blue-100 mt-4">
            No credit card required • Cancel anytime • Full support included
          </p>
        </div>
      </section>
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
          <span className="font-semibold text-lg">{question}</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''}`}
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
