import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-8">
            <span className="text-sm font-semibold text-blue-700">Trusted by 500+ businesses worldwide</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 leading-tight">
            Complete Employee Monitoring &
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Time Tracking</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Track time, monitor productivity, manage payroll, and optimize your workforce with AI-powered insights. Everything you need in one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-10 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/30 font-semibold" asChild>
              <Link to="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10 h-14 border-2 border-slate-300 hover:border-slate-400 font-semibold" asChild>
              <Link to="/demo">Book a Demo</Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-6 flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              14-day free trial
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-5xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">10K+</div>
            <div className="text-slate-600 mt-3 font-medium">Active Users</div>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-5xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">500+</div>
            <div className="text-slate-600 mt-3 font-medium">Companies</div>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-5xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">99.9%</div>
            <div className="text-slate-600 mt-3 font-medium">Uptime</div>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-5xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">24/7</div>
            <div className="text-slate-600 mt-3 font-medium">Support</div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Manage Your Workforce</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Time Tracking</h3>
              <p className="text-slate-600">
                Automatic and manual time tracking with screenshots, screen recording, and activity monitoring.
              </p>
              <Link to="/features/time-tracking" className="text-blue-600 hover:underline mt-4 inline-block">
                Learn more →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Productivity Analytics</h3>
              <p className="text-slate-600">
                AI-powered productivity scoring, app/website tracking, and burnout detection to optimize performance.
              </p>
              <Link to="/features/productivity-monitoring" className="text-blue-600 hover:underline mt-4 inline-block">
                Learn more →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">GPS Tracking</h3>
              <p className="text-slate-600">
                Real-time GPS tracking with geofencing, route tracking, and automatic clock-in/out for field teams.
              </p>
              <Link to="/features/gps-tracking" className="text-blue-600 hover:underline mt-4 inline-block">
                Learn more →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Payroll & Billing</h3>
              <p className="text-slate-600">
                Automated payroll processing, multi-currency support, timesheets, and instant payments to employees.
              </p>
              <Link to="/features/payroll-management" className="text-blue-600 hover:underline mt-4 inline-block">
                Learn more →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Security & Compliance</h3>
              <p className="text-slate-600">
                DLP, USB monitoring, audit logs, security alerts, and SOC 2 / HIPAA compliance features.
              </p>
              <Link to="/security-compliance" className="text-blue-600 hover:underline mt-4 inline-block">
                Learn more →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Integrations</h3>
              <p className="text-slate-600">
                Connect with Jira, Slack, GitHub, QuickBooks, and 20+ other tools your team already uses.
              </p>
              <Link to="/integrations" className="text-blue-600 hover:underline mt-4 inline-block">
                Learn more →
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Platforms */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Works Everywhere Your Team Does</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2m9 4h5v2h-5V7m0 4h5v2h-5v-2m0 4h5v2h-5v-2M5 7h7v10H5V7z"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Desktop Apps</h3>
              <p className="text-sm text-slate-600">Windows, macOS, Linux</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 19V5c0-1.11-.9-2-2-2H9c-1.11 0-2 .9-2 2v14c0 1.11.9 2 2 2h6c1.11 0 2-.9 2-2m-7 0v-1h4v1H10m-1-3V6h6v10H9z"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Mobile Apps</h3>
              <p className="text-sm text-slate-600">iOS & Android</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2m-5.15 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 01-4.33 3.56M14.34 14H9.66c-.1-.66-.16-1.32-.16-2 0-.68.06-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2M12 19.96c-.83-1.2-1.5-2.53-1.91-3.96h3.82c-.41 1.43-1.08 2.76-1.91 3.96M8 8H5.08A7.923 7.923 0 019.4 4.44C8.8 5.55 8.35 6.75 8 8m-2.92 8H8c.35 1.25.8 2.45 1.4 3.56A8.008 8.008 0 015.08 16m-.82-2C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2M12 4.03c.83 1.2 1.5 2.54 1.91 3.97h-3.82c.41-1.43 1.08-2.77 1.91-3.97M18.92 8h-2.95a15.65 15.65 0 00-1.38-3.56c1.84.63 3.37 1.9 4.33 3.56M12 2C6.47 2 2 6.5 2 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2z"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Web Dashboard</h3>
              <p className="text-sm text-slate-600">Any browser</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="font-semibold mb-1">Browser Extensions</h3>
              <p className="text-sm text-slate-600">Chrome, Firefox, Edge</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-16 text-white shadow-2xl shadow-blue-500/20">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Ready to Transform Your Workforce Management?</h2>
          <p className="text-xl md:text-2xl mb-10 text-blue-50 max-w-2xl mx-auto">
            Join thousands of companies using Working Tracker to boost productivity and streamline operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-10 h-14 bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-xl" asChild>
              <Link to="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10 h-14 border-2 border-white text-white hover:bg-white/10 font-semibold" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
          <p className="text-sm text-blue-100 mt-6">
            No credit card required • Setup in minutes • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
