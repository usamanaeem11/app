import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function Features() {
  const featureCategories = [
    {
      category: 'Time & Monitoring',
      features: [
        { name: 'Time Tracking', link: '/features/time-tracking', icon: '⏱️' },
        { name: 'Automatic Time Tracking', link: '/features/automatic-time-tracking', icon: '🤖' },
        { name: 'Screenshot Monitoring', link: '/features/screenshot-monitoring', icon: '📸' },
        { name: 'Screen Recording', link: '/features/screen-recording', icon: '🎥' },
        { name: 'Employee Monitoring', link: '/features/employee-monitoring', icon: '👁️' },
        { name: 'Activity Tracking', link: '/features/activity-tracking', icon: '📊' },
        { name: 'Idle Time Detection', link: '/features/idle-time-tracking', icon: '💤' }
      ]
    },
    {
      category: 'Productivity & Analytics',
      features: [
        { name: 'Productivity Monitoring', link: '/features/productivity-monitoring', icon: '📈' },
        { name: 'App & Website Tracking', link: '/features/app-website-tracking', icon: '🌐' },
        { name: 'Workforce Analytics', link: '/features/workforce-analytics', icon: '📊' },
        { name: 'Burnout Detection', link: '/features/burnout-detection', icon: '🔥' },
        { name: 'AI Insights', link: '/features/ai-insights', icon: '🤖' }
      ]
    },
    {
      category: 'Workforce Management',
      features: [
        { name: 'Attendance Tracking', link: '/features/attendance-tracking', icon: '📅' },
        { name: 'Shift Scheduling', link: '/features/shift-scheduling', icon: '🗓️' },
        { name: 'Leave Management', link: '/features/leave-management', icon: '✈️' },
        { name: 'GPS Tracking', link: '/features/gps-tracking', icon: '📍' },
        { name: 'Geofencing', link: '/features/geofencing', icon: '🌍' },
        { name: 'Field Workforce', link: '/features/field-workforce', icon: '🚗' }
      ]
    },
    {
      category: 'Finance & Payroll',
      features: [
        { name: 'Payroll Management', link: '/features/payroll-management', icon: '💰' },
        { name: 'Timesheet Management', link: '/features/timesheet-management', icon: '📋' },
        { name: 'Expense Tracking', link: '/features/expense-tracking', icon: '💳' },
        { name: 'Invoicing', link: '/features/invoicing', icon: '🧾' },
        { name: 'Multi-Currency', link: '/features/multi-currency', icon: '💱' }
      ]
    },
    {
      category: 'Collaboration',
      features: [
        { name: 'Project Management', link: '/features/project-management', icon: '📁' },
        { name: 'Task Management', link: '/features/task-management', icon: '✓' },
        { name: 'Team Chat', link: '/features/team-chat', icon: '💬' }
      ]
    },
    {
      category: 'Security & Compliance',
      features: [
        { name: 'Security & Compliance', link: '/security-compliance', icon: '🔒' },
        { name: 'Audit Logs', link: '/features/audit-logs', icon: '📝' },
        { name: 'DLP', link: '/features/dlp', icon: '🛡️' },
        { name: 'USB Monitoring', link: '/features/usb-monitoring', icon: '🔌' },
        { name: 'SSO', link: '/features/sso', icon: '🔐' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Complete Feature Set for Workforce Management
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Everything you need to track time, monitor productivity, manage payroll, and optimize your workforce.
          </p>
          <Button size="lg" asChild>
            <Link to="/signup">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, index) => (
        <section key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} py-16`}>
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">{category.category}</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {category.features.map((feature, idx) => (
                <Link key={idx} to={feature.link}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="text-4xl mb-3">{feature.icon}</div>
                      <h3 className="font-semibold">{feature.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Try All Features?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Start your 14-day free trial with full access to all features.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/signup">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
